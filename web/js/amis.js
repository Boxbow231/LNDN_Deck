const pb = new PocketBase('http://127.0.0.1:8090');

// Récupération de l'ID compatible avec TOUTES les versions de PocketBase
function getUserId() {
    if (pb.authStore.record) return pb.authStore.record.id;
    if (pb.authStore.model) return pb.authStore.model.id;
    return null;
}

const inputRecherche = document.getElementById('recherche-pseudo');
const btnRechercher = document.getElementById('btn-rechercher');
const resultatsRecherche = document.getElementById('resultats-recherche');
const demandesListe = document.getElementById('demandes-liste');
const amisListe = document.getElementById('amis-liste');

async function initialiserPage() {
    if (!pb.authStore.isValid || !getUserId()) {
        pb.authStore.clear();
        window.location.href = "connexion.html";
        return;
    }

    // NOUVEAU : Afficher le nom de l'utilisateur
    const userGreetingEl = document.getElementById('user-greeting');
    const userModel = pb.authStore.record || pb.authStore.model;
    if (userGreetingEl && userModel) {
        const nomJoueur = userModel.username || userModel.name || 'Héros';
        userGreetingEl.innerHTML = `👤 ${nomJoueur}`;
    }

    await chargerAmis();
    await chargerDemandes();
}

// 1. Rechercher un joueur dans la base
btnRechercher.addEventListener('click', async () => {
    const query = inputRecherche.value.trim().toLowerCase();
    if (!query) return;

    resultatsRecherche.innerHTML = '<p style="text-align: center;">Recherche...</p>';

    try {
        const userId = getUserId();
        
        // 1. On récupère TOUS les joueurs sans aucun filtre (PocketBase ne peut pas refuser ça)
        const tousLesUsers = await pb.collection('users').getFullList();
        
        // 2. On filtre nous-mêmes en JavaScript
        const joueursTrouves = tousLesUsers.filter(user => {
            if (user.id === userId) return false; // On s'exclut soi-même
            
            // On vérifie si le texte tapé correspond au username ou au name
            const pseudo = (user.username || '').toLowerCase();
            const nom = (user.name || '').toLowerCase();
            
            return pseudo.includes(query) || nom.includes(query);
        });

        resultatsRecherche.innerHTML = '';

        if (joueursTrouves.length === 0) {
            resultatsRecherche.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucun joueur trouvé.</p>';
            return;
        }

        // 3. On affiche les résultats (limité aux 10 premiers pour ne pas surcharger la page)
        joueursTrouves.slice(0, 10).forEach(user => {
            const div = document.createElement('div');
            div.className = 'player-item';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.marginTop = '0.5rem';
            
            div.innerHTML = `
                <strong>${user.username || user.name || 'Héros anonyme'}</strong>
                <button type="button" class="btn-action" onclick="ajouterAmi('${user.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;">+ Ajouter</button>
            `;
            resultatsRecherche.appendChild(div);
        });

    } catch (err) {
        console.error("Erreur détaillée :", err);
        resultatsRecherche.innerHTML = '<p style="color: red; text-align: center;">Erreur de connexion à la base.</p>';
    }
});

// 2. Envoyer une demande d'ami
window.ajouterAmi = async function(receveurId) {
    try {
        const userId = getUserId();
        
        // On récupère TOUTES les relations et on vérifie en JavaScript
        const toutesRelations = await pb.collection('amis').getFullList();
        
        const dejaAmi = toutesRelations.find(rel => 
            (rel.demandeur === userId && rel.receveur === receveurId) ||
            (rel.demandeur === receveurId && rel.receveur === userId)
        );

        if (dejaAmi) {
            alert("Une demande a déjà été envoyée ou vous êtes déjà amis avec ce joueur.");
            return; // Bloque la création de doublons !
        }

        await pb.collection('amis').create({
            demandeur: userId,
            receveur: receveurId,
            statut: "attente"
        });

        alert("Demande d'ami envoyée !");
        
        // On vide la recherche pour éviter de recliquer
        document.getElementById('resultats-recherche').innerHTML = '';
        document.getElementById('recherche-pseudo').value = '';
        
        chargerDemandes();
        chargerAmis();

    } catch (err) {
        console.error(err);
        alert("Erreur lors de l'envoi de la demande.");
    }
}

// 3. Afficher les demandes reçues
async function chargerDemandes() {
    try {
        const userId = getUserId();
        const toutesRelations = await pb.collection('amis').getFullList({
            expand: 'demandeur'
        });

        // On filtre manuellement les requêtes en attente nous concernant
        const mesDemandes = toutesRelations.filter(rel => rel.receveur === userId && rel.statut === 'attente');

        demandesListe.innerHTML = '';

        if (mesDemandes.length === 0) {
            demandesListe.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucune demande en attente.</p>';
            return;
        }

        mesDemandes.forEach(demande => {
            const demandeur = demande.expand?.demandeur;
            if (!demandeur) return; // Sécurité anti-crash

            const div = document.createElement('div');
            div.className = 'player-item';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.marginTop = '0.5rem';

            div.innerHTML = `
                <strong>${demandeur.username || demandeur.name || 'Héros inconnu'}</strong>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-action" onclick="accepterDemande('${demande.id}')" style="padding: 0.3rem 0.5rem; background-color: #2e8b57; border-color: #2e8b57; font-size: 0.85rem;">✔</button>
                    <button class="btn-action btn-danger" onclick="refuserDemande('${demande.id}')" style="padding: 0.3rem 0.5rem; font-size: 0.85rem;">✖</button>
                </div>
            `;
            demandesListe.appendChild(div);
        });
    } catch (err) {
        console.error("Erreur chargement demandes :", err);
    }
}

// 4. Afficher la liste d'amis validés
async function chargerAmis() {
    try {
        const userId = getUserId();
        const toutesRelations = await pb.collection('amis').getFullList({
            expand: 'demandeur,receveur'
        });

        // On filtre manuellement les amitiés acceptées
        const mesAmis = toutesRelations.filter(rel => 
            (rel.demandeur === userId || rel.receveur === userId) && 
            rel.statut === 'accepte'
        );

        amisListe.innerHTML = '';

        if (mesAmis.length === 0) {
            amisListe.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Vous n\'avez pas encore d\'amis.</p>';
            return;
        }

        mesAmis.forEach(rel => {
            // Identifier qui est l'ami (pour ne pas afficher son propre pseudo)
            const ami = rel.demandeur === userId ? rel.expand?.receveur : rel.expand?.demandeur;
            
            if (!ami) return; // Sécurité anti-crash

            const div = document.createElement('div');
            div.className = 'player-item';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.marginTop = '0.5rem';

            div.innerHTML = `
                <strong>${ami.username || ami.name || 'Héros inconnu'}</strong>
                <button class="btn-action btn-danger" onclick="supprimerAmi('${rel.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;">Retirer</button>
            `;
            amisListe.appendChild(div);
        });
    } catch (err) {
        console.error("Erreur chargement amis :", err);
    }
}

// 5. Actions : Accepter, Refuser, Supprimer
window.accepterDemande = async function(idAmiTable) {
    try {
        await pb.collection('amis').update(idAmiTable, { statut: 'accepte' });
        chargerDemandes();
        chargerAmis();
    } catch (err) {
        console.error(err);
    }
}

window.refuserDemande = async function(idAmiTable) {
    try {
        await pb.collection('amis').delete(idAmiTable);
        chargerDemandes();
    } catch (err) {
        console.error(err);
    }
}

window.supprimerAmi = async function(idAmiTable) {
    if(confirm("Es-tu sûr de vouloir retirer ce joueur de tes amis ?")) {
        try {
            await pb.collection('amis').delete(idAmiTable);
            chargerAmis();
        } catch (err) {
            console.error(err);
        }
    }
}

initialiserPage();