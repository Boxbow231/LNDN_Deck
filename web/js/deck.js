const deckValeurTotaleEl = document.getElementById('deck-valeur-totale');
const searchDeckInput = document.getElementById('search-deck-input');
// 1. Récupération des paramètres d'URL
const urlParams = new URLSearchParams(window.location.search);
const aventureId = urlParams.get('aventure');

// 2. Variables d'état
let toutesLesCartes = [];
let listeJoueurs = [];
let joueurActif = null;
let deckRecordActif = null;
let cartesDuDeck = [];

const DECK_DE_BASE = [
    "D1B10", "D1B03", "D1B12", "D1B12", "D1B01", 
    "D1B06", "D1B05", "D1B08", "D1B07", "D1B04", 
    "D1B04", "D1B11", "D1B11", "D1B02", "D1B09"
];

// 3. Éléments DOM classiques
const titreAventureEl = document.getElementById('aventure-titre');
const joueursListeEl = document.getElementById('joueurs-liste');
const formAjoutJoueur = document.getElementById('form-ajout-joueur');
const nouveauJoueurInput = document.getElementById('nouveau-joueur-nom');

const deckTitreJoueurEl = document.getElementById('deck-titre-joueur');
const deckListeEl = document.getElementById('deck-cartes-liste');
const deckCountEl = document.getElementById('deck-count');

const catalogueListeEl = document.getElementById('catalogue-cartes-liste');
const searchInput = document.getElementById('search-input');

// Éléments DOM pour l'invitation d'amis
const btnInviter = document.getElementById('btn-inviter-ami');
const modalInvitation = document.getElementById('modal-invitation');
const listeAmisInvitation = document.getElementById('liste-amis-invitation');
const btnFermerModal = document.getElementById('fermer-modal-invitation');

async function initialiserPage() {
    if (!pb.authStore.isValid) {
        window.location.href = "connexion.html";
        return;
    }

    if (!aventureId) {
        alert("Aucun identifiant d'aventure spécifié.");
        window.location.href = "accueil.html";
        return;
    }

    try {
        const userId = pb.authStore.model.id;

        // Étape 1 : Charger l'aventure
        const aventure = await pb.collection('aventures').getOne(aventureId);
        if (titreAventureEl) titreAventureEl.textContent = aventure.titre;

        // Étape 2 : Charger le catalogue complet
        toutesLesCartes = await pb.collection('cartes_butins').getFullList({
            sort: 'cote'
        });
        afficherCatalogue(toutesLesCartes);

        // Étape 3 : Charger tous les joueurs
        await chargerJoueurs(userId);

    } catch (err) {
        console.error("Erreur d'initialisation :", err);
        alert(`Erreur de chargement : ${err.message || err.status}`);
    }
}

// ==========================================
// GESTION DES INVITATIONS D'AMIS
// ==========================================
if (btnInviter) {
    btnInviter.addEventListener('click', async () => {
        modalInvitation.style.display = 'flex';
        await chargerAmisPourInvitation();
    });
}

if (btnFermerModal) {
    btnFermerModal.addEventListener('click', () => {
        modalInvitation.style.display = 'none';
    });
}

async function chargerAmisPourInvitation() {
    try {
        const userId = pb.authStore.model.id;
        
        const toutesRelations = await pb.collection('amis').getFullList({
            filter: `(demandeur = "${userId}" || receveur = "${userId}") && statut = "accepte"`,
            expand: 'demandeur,receveur'
        });

        const idsDejaPresents = listeJoueurs.map(j => j.utilisateur); 

        // NOUVEAU : Récupérer les invitations déjà envoyées pour ne pas spammer
        const invitationsEnAttente = await pb.collection('invitations_aventures').getFullList({
            filter: `aventure = "${aventureId}"`
        });
        const idsInvites = invitationsEnAttente.map(inv => inv.receveur);

        listeAmisInvitation.innerHTML = '';

        if (toutesRelations.length === 0) {
            listeAmisInvitation.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Vous n\'avez pas encore de compagnons.</p>';
            return;
        }

        toutesRelations.forEach(rel => {
            const ami = rel.demandeur === userId ? rel.expand?.receveur : rel.expand?.demandeur;
            if (!ami) return;

            const estDejaDansLaventure = idsDejaPresents.includes(ami.id);
            const estDejaInvite = idsInvites.includes(ami.id);
            const nomAmiSafe = (ami.username || ami.name || 'Héros').replace(/'/g, "\\'");

            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '0.5rem 0';
            div.style.borderBottom = '1px dashed var(--encre-noire)';

            if (estDejaDansLaventure) {
                div.innerHTML = `
                    <strong style="font-family: 'Cinzel', serif;">${ami.username || ami.name}</strong>
                    <span style="color: #666; font-style: italic; font-size: 0.85rem;">Déjà présent</span>
                `;
            } else if (estDejaInvite) {
                div.innerHTML = `
                    <strong style="font-family: 'Cinzel', serif;">${ami.username || ami.name}</strong>
                    <span style="color: #b8860b; font-style: italic; font-size: 0.85rem;">En attente...</span>
                `;
            } else {
                div.innerHTML = `
                    <strong style="font-family: 'Cinzel', serif;">${ami.username || ami.name}</strong>
                    <button class="btn-action" onclick="ajouterAmiAventure('${ami.id}', this)" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; width: auto;">Inviter</button>
                `;
            }
            listeAmisInvitation.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        listeAmisInvitation.innerHTML = '<p style="color:red; text-align:center;">Erreur de chargement.</p>';
    }
}

// Fonction appelée quand on clique sur "Inviter"
window.ajouterAmiAventure = async function(amiId, btnElement) {
    btnElement.disabled = true;
    btnElement.innerText = 'Envoi...';
    
    try {
        const userId = pb.authStore.model.id;

        // On crée une invitation d'aventure (et non plus un joueur direct)
        await pb.collection('invitations_aventures').create({
            aventure: aventureId,
            demandeur: userId,
            receveur: amiId
        });

        btnElement.innerText = 'Envoyé !';
        btnElement.style.backgroundColor = '#2e8b57';
        btnElement.style.borderColor = '#2e8b57';
        
    } catch (err) {
        console.error("Erreur lors de l'invitation :", err);
        alert("Erreur lors de l'invitation.");
        btnElement.disabled = false;
        btnElement.innerText = 'Inviter';
    }
}

// ==========================================
// GESTION DES JOUEURS (SIDEBAR)
// ==========================================

async function chargerJoueurs(userId) {
    try {
        listeJoueurs = await pb.collection('joueurs').getFullList({
            filter: `aventure = "${aventureId}"`,
            sort: 'created'
        });

        if (listeJoueurs.length === 0) {
            const nomParDefaut = pb.authStore.model.name || 'Héros Principal';
            const nouveauJoueur = await pb.collection('joueurs').create({
                aventure: aventureId,
                utilisateur: userId,
                nom_provisoire: nomParDefaut
            });

            await pb.collection('decks').create({
                joueur: nouveauJoueur.id,
                cartes: DECK_DE_BASE
            });

            listeJoueurs = [nouveauJoueur];
        }

        if (!joueurActif || !listeJoueurs.some(j => j.id === joueurActif.id)) {
            joueurActif = listeJoueurs[0];
        }

        afficherJoueurs();
        await selectionnerJoueur(joueurActif.id);

    } catch (err) {
        console.error("Erreur chargement joueurs :", err);
    }
}

function afficherJoueurs() {
    if (!joueursListeEl) return;
    joueursListeEl.innerHTML = '';

    listeJoueurs.forEach(joueur => {
        const div = document.createElement('div');
        const estActif = joueurActif && joueurActif.id === joueur.id;
        
        div.className = `player-item ${estActif ? 'active' : ''}`;
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        
        div.onclick = () => selectionnerJoueur(joueur.id);

        const nom = joueur.nom_provisoire || 'Héros sans nom';
        const nomSafe = nom.replace(/'/g, "\\'"); 
        
        const btnColor = estActif ? '#f4ecd8' : 'var(--encre-noire)';
        const sousTexte = estActif ? '▶ Deck actif' : 'Cliquer pour gérer';

        div.innerHTML = `
            <div>
                <div>${nom}</div>
                <small style="font-size: 0.75rem;">${sousTexte}</small>
            </div>
            
            <div class="action-menu-container" style="margin-left: auto;">
                <button type="button" class="btn-dots" style="color: ${btnColor}; padding: 0.2rem 0.5rem;" onclick="toggleMenuJoueur(event, '${joueur.id}')">⋮</button>
                <div id="menu-joueur-${joueur.id}" class="dropdown-menu">
                    <button type="button" class="dropdown-item" onclick="renommerJoueur(event, '${joueur.id}', '${nomSafe}')">
                        ✏️ Renommer
                    </button>
                    <button type="button" class="dropdown-item danger" onclick="supprimerJoueur(event, '${joueur.id}', '${nomSafe}')">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;
        joueursListeEl.appendChild(div);
    });
}

function toggleMenuJoueur(event, joueurId) {
    event.stopPropagation(); 
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `menu-joueur-${joueurId}`) m.classList.remove('show');
    });
    const menu = document.getElementById(`menu-joueur-${joueurId}`);
    if (menu) menu.classList.toggle('show');
}

window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
});

async function renommerJoueur(event, joueurId, ancienNom) {
    event.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));

    const nouveauNom = prompt("Entrez le nouveau nom du héros :", ancienNom);
    if (!nouveauNom || nouveauNom.trim() === "" || nouveauNom.trim() === ancienNom) return;

    try {
        await pb.collection('joueurs').update(joueurId, { nom_provisoire: nouveauNom.trim() });
        const j = listeJoueurs.find(j => j.id === joueurId);
        if (j) j.nom_provisoire = nouveauNom.trim();

        if (joueurActif && joueurActif.id === joueurId) {
            deckTitreJoueurEl.textContent = `Deck : ${nouveauNom.trim()}`;
        }
        afficherJoueurs();
    } catch (err) {
        console.error("Erreur renommage :", err);
        alert("Impossible de renommer ce héros.");
    }
}

async function supprimerJoueur(event, joueurId, nom) {
    event.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));

    const conf = confirm(`Es-tu sûr de vouloir retirer "${nom}" de l'aventure ? Son deck sera supprimé définitivement.`);
    if (!conf) return;

    try {
        const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${joueurId}"` });
        for (const d of decks) { await pb.collection('decks').delete(d.id); }
        await pb.collection('joueurs').delete(joueurId);

        const userId = pb.authStore.model.id;
        await chargerJoueurs(userId);
    } catch (err) {
        console.error("Erreur suppression :", err);
        alert("Erreur lors de la suppression du héros.");
    }
}

if (formAjoutJoueur) {
    formAjoutJoueur.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nom = nouveauJoueurInput.value.trim();
        if (!nom) return;

        try {
            const userId = pb.authStore.model.id;
            const nouveauJoueur = await pb.collection('joueurs').create({
                aventure: aventureId,
                utilisateur: userId,
                nom_provisoire: nom
            });

            await pb.collection('decks').create({ joueur: nouveauJoueur.id, cartes: DECK_DE_BASE });
            nouveauJoueurInput.value = '';
            listeJoueurs.push(nouveauJoueur);
            afficherJoueurs();
            await selectionnerJoueur(nouveauJoueur.id);
        } catch (err) {
            console.error("Erreur ajout joueur :", err);
            alert("Impossible de créer ce joueur.");
        }
    });
}

// ==========================================
// GESTION DU DECK (PANNEAU CENTRAL)
// ==========================================

async function selectionnerJoueur(joueurId) {
    joueurActif = listeJoueurs.find(j => j.id === joueurId);
    afficherJoueurs();

    if (deckTitreJoueurEl && joueurActif) {
        deckTitreJoueurEl.textContent = `Deck : ${joueurActif.nom_provisoire || 'Héros'}`;
    }
    if (searchDeckInput) searchDeckInput.value = ''; 

    try {
        try {
            deckRecordActif = await pb.collection('decks').getFirstListItem(`joueur = "${joueurActif.id}"`);
        } catch (e) {
            deckRecordActif = await pb.collection('decks').create({
                joueur: joueurActif.id,
                cartes: DECK_DE_BASE
            });
        }

        const cotesEnregistrees = Array.isArray(deckRecordActif.cartes) ? deckRecordActif.cartes : [];
        cartesDuDeck = cotesEnregistrees
            .map(cote => toutesLesCartes.find(c => c.cote === cote))
            .filter(Boolean);

        afficherDeck();
    } catch (err) {
        console.error("Erreur sélection joueur :", err);
    }
}

function afficherDeck() {
    if (!deckListeEl) return;
    deckListeEl.innerHTML = '';
    
    deckCountEl.textContent = `${cartesDuDeck.length} carte${cartesDuDeck.length > 1 ? 's' : ''}`;
    
    let valeurTotale = 0;
    cartesDuDeck.forEach(c => valeurTotale += parseInt(c.valeur) || 0);
    if (deckValeurTotaleEl) deckValeurTotaleEl.textContent = valeurTotale;

    if (cartesDuDeck.length === 0) {
        deckListeEl.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Ce héros n\'a aucune carte dans son deck.</p>';
        return;
    }

    let listeAffichee = cartesDuDeck;
    const requeteRecherche = searchDeckInput && searchDeckInput.value ? searchDeckInput.value.toLowerCase().trim() : '';

    if (requeteRecherche) {
        listeAffichee = cartesDuDeck.filter(c => {
            const nom = (c.nom || '').toLowerCase();
            const effet = (c.effet || '').toLowerCase();
            const zone = (c.zone || '').toLowerCase();
            const cote = (c.cote || '').toLowerCase();
            return nom.includes(requeteRecherche) || effet.includes(requeteRecherche) || zone.includes(requeteRecherche) || cote.includes(requeteRecherche);
        });
    }

    if (listeAffichee.length === 0) {
        deckListeEl.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucune carte du deck ne correspond à votre recherche.</p>';
        return;
    }

    listeAffichee.forEach((carte) => {
        const indexReel = cartesDuDeck.indexOf(carte);
        const item = document.createElement('div');
        item.className = 'card-item';
        item.innerHTML = `
            <div class="card-details">
                <h4><span class="card-badge">${carte.cote}</span> ${carte.nom}</h4>
                <p><strong>Effet :</strong> ${carte.effet || 'Aucun'}</p>
                <p style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
                    <small style="color: #666;">Zone : ${carte.zone || 'Inconnue'} | Type : ${carte.type || '-'}</small>
                    <strong style="color: #8b0000; font-size: 0.9rem;">Val: ${carte.valeur || 0}</strong>
                </p>
            </div>
            <button type="button" class="btn-action btn-danger" onclick="retirerDuDeck(${indexReel})">
                Retirer
            </button>
        `;
        deckListeEl.appendChild(item);
    });
}

// ==========================================
// GESTION DU CATALOGUE (PANNEAU DROIT)
// ==========================================

function afficherCatalogue(liste) {
    if (!catalogueListeEl) return;
    catalogueListeEl.innerHTML = '';

    if (liste.length === 0) {
        catalogueListeEl.innerHTML = '<p style="text-align: center; font-style: italic;">Aucune carte trouvée.</p>';
        return;
    }

    liste.forEach(carte => {
        const item = document.createElement('div');
        item.className = 'card-item';
        item.innerHTML = `
            <div class="card-details">
                <h4><span class="card-badge">${carte.cote}</span> ${carte.nom}</h4>
                <p><strong>Effet :</strong> ${carte.effet || 'Aucun'}</p>
                <p><small style="color: #666;">Zone : ${carte.zone || 'Inconnue'} | Type : ${carte.type || '-'}</small></p>
            </div>
            <button type="button" class="btn-action" onclick="ajouterAuDeck('${carte.cote}')">
                + Ajouter
            </button>
        `;
        catalogueListeEl.appendChild(item);
    });
}

// ==========================================
// ACTIONS D'AJOUT ET SAUVEGARDE
// ==========================================

async function ajouterAuDeck(cote) {
    if (!deckRecordActif) {
        alert("Veuillez sélectionner un joueur d'abord.");
        return;
    }

    const carteTrouvee = toutesLesCartes.find(c => c.cote === cote);
    if (!carteTrouvee) return;

    const limite = parseInt(carteTrouvee.exemplaire) || 1;

    try {
        const filtres = listeJoueurs.map(j => `joueur = "${j.id}"`).join(' || ');
        let totalEnJeu = 0;
        
        if (filtres) {
            const tousLesDecks = await pb.collection('decks').getFullList({ filter: filtres });
            tousLesDecks.forEach(d => {
                if (d.cartes && Array.isArray(d.cartes)) {
                    totalEnJeu += d.cartes.filter(c => c === cote).length;
                }
            });
        }

        if (totalEnJeu >= limite) {
            alert(`Limite atteinte pour "${carteTrouvee.nom}" !\n\nCette carte est limitée à ${limite} exemplaire(s) partagé(s) entre tous les héros de cette aventure.`);
            return; 
        }
    } catch (err) {
        console.error("Erreur lors de la vérification de la limite :", err);
        return; 
    }

    cartesDuDeck.push(carteTrouvee);
    afficherDeck();
    await sauvegarderDeck();
}

async function retirerDuDeck(index) {
    if (!deckRecordActif) return;
    cartesDuDeck.splice(index, 1);
    afficherDeck();
    await sauvegarderDeck();
}

async function sauvegarderDeck() {
    try {
        const listeCotes = cartesDuDeck.map(c => c.cote);
        await pb.collection('decks').update(deckRecordActif.id, { cartes: listeCotes });
    } catch (err) {
        console.error("Erreur de sauvegarde :", err);
    }
}

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            afficherCatalogue(toutesLesCartes);
            return;
        }

        const filtrees = toutesLesCartes.filter(c => {
            const nom = (c.nom || '').toLowerCase();
            const effet = (c.effet || '').toLowerCase();
            const zone = (c.zone || '').toLowerCase();
            const cote = (c.cote || '').toLowerCase();
            return nom.includes(query) || effet.includes(query) || zone.includes(query) || cote.includes(query);
        });

        afficherCatalogue(filtrees);
    });
}

if (searchDeckInput) {
    searchDeckInput.addEventListener('input', () => {
        afficherDeck();
    });
}

initialiserPage();