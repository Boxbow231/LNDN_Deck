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
        
        // A. On récupère TOUS les joueurs
        const tousLesUsers = await pb.collection('users').getFullList();
        
        // B. NOUVEAU : On récupère toutes nos relations (amis + demandes en attente)
        const mesRelations = await pb.collection('amis').getFullList({
            filter: `demandeur = "${userId}" || receveur = "${userId}"`
        });

        // C. On filtre les joueurs
        const joueursTrouves = tousLesUsers.filter(user => {
            if (user.id === userId) return false; // On s'exclut soi-même
            
            // On vérifie si le texte tapé correspond
            const pseudo = (user.username || '').toLowerCase();
            const nom = (user.name || '').toLowerCase();
            if (!pseudo.includes(query) && !nom.includes(query)) return false;

            // NOUVEAU : On vérifie si on est déjà en relation avec ce joueur
            const dejaEnRelation = mesRelations.find(rel => 
                rel.demandeur === user.id || rel.receveur === user.id
            );
            
            // Si on est déjà en relation (ami ou en attente), on le cache de la recherche !
            if (dejaEnRelation) return false;

            return true; // Si tout est bon, on le garde
        });

        resultatsRecherche.innerHTML = '';

        if (joueursTrouves.length === 0) {
            resultatsRecherche.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucun nouveau joueur trouvé ou vous êtes déjà amis.</p>';
            return;
        }

        // D. On affiche les résultats filtrés
        joueursTrouves.slice(0, 10).forEach(user => {
            const div = document.createElement('div');
            div.className = 'player-item';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.marginTop = '0.5rem';
            
            div.innerHTML = `
                <strong style="font-size: 1.2rem; font-family: 'Cinzel', serif;">${user.username || user.name || 'Héros anonyme'}</strong>
                <button type="button" class="btn-action" onclick="ajouterAmi('${user.id}')" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; width: auto; min-width: 100px;">+ Ajouter</button>
            `;
            resultatsRecherche.appendChild(div);
        });

    } catch (err) {
        console.error("Erreur détaillée :", err);
        resultatsRecherche.innerHTML = '<p style="color: red; text-align: center;">Erreur de recherche.</p>';
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

        const mesDemandes = toutesRelations.filter(rel => rel.receveur === userId && rel.statut === 'attente');

        demandesListe.innerHTML = '';

        if (mesDemandes.length === 0) {
            demandesListe.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucune demande en attente.</p>';
            return;
        }

        mesDemandes.forEach(demande => {
            const demandeur = demande.expand?.demandeur;
            if (!demandeur) return; 

            const div = document.createElement('div');
            // NOUVEAU : On donne un ID unique à cette ligne pour pouvoir la cibler et la supprimer instantanément
            div.id = `demande-${demande.id}`;
            div.className = 'player-item';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.marginTop = '0.5rem';

            div.innerHTML = `
                <strong style="font-size: 1.2rem; font-family: 'Cinzel', serif;">${demandeur.username || demandeur.name || 'Héros inconnu'}</strong>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-action" onclick="accepterDemande('${demande.id}')" style="padding: 0.3rem 0.6rem; background-color: #2e8b57; border-color: #2e8b57; font-size: 0.8rem; width: auto;">✔</button>
                    <button class="btn-action btn-danger" onclick="refuserDemande('${demande.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; width: auto;">✖</button>
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
                <strong style="font-size: 1.2rem; font-family: 'Cinzel', serif;">${ami.username || ami.name || 'Héros inconnu'}</strong>
                <button class="btn-action btn-danger" onclick="supprimerAmi('${rel.id}')" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; width: auto; min-width: 100px;">Retirer</button>
            `;
            amisListe.appendChild(div);
        });
    } catch (err) {
        console.error("Erreur chargement amis :", err);
    }
}

// 5. Actions : Accepter, Refuser, Supprimer
window.accepterDemande = async function(idAmiTable) {
    // 1. EFFET VISUEL IMMÉDIAT : on supprime la ligne de l'écran instantanément
    const ligne = document.getElementById(`demande-${idAmiTable}`);
    if (ligne) ligne.remove();

    // S'il n'y a plus de demandes affichées, on remet le texte par défaut
    if (demandesListe.children.length === 0) {
        demandesListe.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucune demande en attente.</p>';
    }

    // 2. Traitement en arrière-plan
    try {
        await pb.collection('amis').update(idAmiTable, { statut: 'accepte' });
        // On rafraîchit la liste d'amis à droite pour voir le nouveau compagnon apparaître
        chargerAmis();
    } catch (err) {
        console.error(err);
        chargerDemandes(); // Si erreur réseau, on recharge la liste pour annuler l'effet visuel
    }
}

window.refuserDemande = async function(idAmiTable) {
    // EFFET VISUEL IMMÉDIAT
    const ligne = document.getElementById(`demande-${idAmiTable}`);
    if (ligne) ligne.remove();

    if (demandesListe.children.length === 0) {
        demandesListe.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucune demande en attente.</p>';
    }

    try {
        await pb.collection('amis').delete(idAmiTable);
    } catch (err) {
        console.error(err);
        chargerDemandes();
    }
}

window.supprimerAmi = async function(idAmiTable) {
    const confirmation = confirm("Êtes-vous sûr de vouloir retirer ce compagnon de votre liste d'amis ?");
    if (!confirmation) return;

    try {
        // On supprime la relation d'amitié dans la base de données
        await pb.collection('amis').delete(idAmiTable);
        
        // On recharge la liste pour faire disparaître l'ami de l'écran
        chargerAmis();
    } catch (err) {
        console.error("Erreur lors de la suppression de l'ami :", err);
        alert("Impossible de retirer cet ami.");
    }
}

initialiserPage();