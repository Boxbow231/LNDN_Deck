// 1. Récupération des paramètres d'URL
const urlParams = new URLSearchParams(window.location.search);
const aventureId = urlParams.get('aventure');

// 2. Variables d'état
let toutesLesCartes = [];
let listeJoueurs = [];
let joueurActif = null;
let deckRecordActif = null;
let cartesDuDeck = [];

// 3. Éléments DOM
const titreAventureEl = document.getElementById('aventure-titre');
const joueursListeEl = document.getElementById('joueurs-liste');
const formAjoutJoueur = document.getElementById('form-ajout-joueur');
const nouveauJoueurInput = document.getElementById('nouveau-joueur-nom');

const deckTitreJoueurEl = document.getElementById('deck-titre-joueur');
const deckListeEl = document.getElementById('deck-cartes-liste');
const deckCountEl = document.getElementById('deck-count');

const catalogueListeEl = document.getElementById('catalogue-cartes-liste');
const searchInput = document.getElementById('search-input');

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

        // Étape 2 : Charger le catalogue complet des butins (309 cartes)
        toutesLesCartes = await pb.collection('cartes_butins').getFullList({
            sort: 'cote'
        });
        afficherCatalogue(toutesLesCartes);

        // Étape 3 : Charger tous les joueurs de cette aventure
        await chargerJoueurs(userId);

    } catch (err) {
        console.error("Erreur d'initialisation :", err);
        alert(`Erreur de chargement : ${err.message || err.status}`);
    }
}

// Charger la liste des joueurs liés à l'aventure
async function chargerJoueurs(userId) {
    try {
        listeJoueurs = await pb.collection('joueurs').getFullList({
            filter: `aventure = "${aventureId}"`,
            sort: 'created'
        });

        // Si aucun joueur n'existe dans cette aventure, on crée le joueur par défaut de l'utilisateur
        if (listeJoueurs.length === 0) {
            const nomParDefaut = pb.authStore.model.name || 'Héros Principal';
            const nouveauJoueur = await pb.collection('joueurs').create({
                aventure: aventureId,
                utilisateur: userId,
                nom_provisoire: nomParDefaut
            });

            await pb.collection('decks').create({
                joueur: nouveauJoueur.id,
                cartes: []
            });

            listeJoueurs = [nouveauJoueur];
        }

        // Par défaut, sélectionner le premier joueur (ou garder le joueur actif s'il existe toujours)
        if (!joueurActif || !listeJoueurs.some(j => j.id === joueurActif.id)) {
            joueurActif = listeJoueurs[0];
        }

        afficherJoueurs();
        await selectionnerJoueur(joueurActif.id);

    } catch (err) {
        console.error("Erreur chargement joueurs :", err);
    }
}

// Affichage de la liste des joueurs dans la sidebar
function afficherJoueurs() {
    if (!joueursListeEl) return;
    joueursListeEl.innerHTML = '';

    listeJoueurs.forEach(joueur => {
        const div = document.createElement('div');
        const estActif = joueurActif && joueurActif.id === joueur.id;
        div.className = `player-item ${estActif ? 'active' : ''}`;
        div.onclick = () => selectionnerJoueur(joueur.id);

        const nom = joueur.nom_provisoire || 'Héros sans nom';
        div.innerHTML = `
            <div>
                <div>${nom}</div>
                <small style="font-size: 0.75rem;">${estActif ? '▶ Deck actif' : 'Cliquer pour gérer'}</small>
            </div>
        `;
        joueursListeEl.appendChild(div);
    });
}

// Sélectionner un joueur et charger son deck
async function selectionnerJoueur(joueurId) {
    joueurActif = listeJoueurs.find(j => j.id === joueurId);
    afficherJoueurs();

    if (deckTitreJoueurEl && joueurActif) {
        deckTitreJoueurEl.textContent = `Deck : ${joueurActif.nom_provisoire || 'Héros'}`;
    }

    try {
        // Trouver ou créer le deck de ce joueur
        try {
            deckRecordActif = await pb.collection('decks').getFirstListItem(`joueur = "${joueurActif.id}"`);
        } catch (e) {
            deckRecordActif = await pb.collection('decks').create({
                joueur: joueurActif.id,
                cartes: []
            });
        }

        // Charger les cartes de ce deck
        const cotesEnregistrees = Array.isArray(deckRecordActif.cartes) ? deckRecordActif.cartes : [];
        cartesDuDeck = cotesEnregistrees
            .map(cote => toutesLesCartes.find(c => c.cote === cote))
            .filter(Boolean);

        afficherDeck();

    } catch (err) {
        console.error("Erreur sélection joueur :", err);
        alert("Impossible de charger le deck de ce joueur.");
    }
}

// Ajout d'un nouveau joueur via le formulaire
if (formAjoutJoueur) {
    formAjoutJoueur.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nom = nouveauJoueurInput.value.trim();
        if (!nom) return;

        try {
            const userId = pb.authStore.model.id;

            // 1. Créer le nouveau joueur
            const nouveauJoueur = await pb.collection('joueurs').create({
                aventure: aventureId,
                utilisateur: userId,
                nom_provisoire: nom
            });

            // 2. Créer son deck vierge
            await pb.collection('decks').create({
                joueur: nouveauJoueur.id,
                cartes: []
            });

            nouveauJoueurInput.value = '';
            
            // Recharger et basculer sur ce nouveau joueur
            listeJoueurs.push(nouveauJoueur);
            joueurActif = nouveauJoueur;
            afficherJoueurs();
            await selectionnerJoueur(nouveauJoueur.id);

        } catch (err) {
            console.error("Erreur ajout joueur :", err);
            alert("Impossible de créer ce joueur.");
        }
    });
}

// Affichage du deck du joueur actif
function afficherDeck() {
    if (!deckListeEl) return;
    deckListeEl.innerHTML = '';
    deckCountEl.textContent = `${cartesDuDeck.length} carte${cartesDuDeck.length > 1 ? 's' : ''}`;

    if (cartesDuDeck.length === 0) {
        deckListeEl.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Ce héros n\'a aucune carte dans son deck.</p>';
        return;
    }

    cartesDuDeck.forEach((carte, index) => {
        const item = document.createElement('div');
        item.className = 'card-item';
        item.innerHTML = `
            <div class="card-details">
                <h4><span class="card-badge">${carte.cote}</span> ${carte.nom}</h4>
                <p><strong>Effet :</strong> ${carte.effet || 'Aucun'}</p>
                <p><small style="color: #666;">Zone : ${carte.zone || 'Inconnue'} | Type : ${carte.type || '-'}</small></p>
            </div>
            <button type="button" class="btn-action btn-danger" onclick="retirerDuDeck(${index})">
                Retirer
            </button>
        `;
        deckListeEl.appendChild(item);
    });
}

// Affichage du catalogue
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

// Ajouter une carte au deck du joueur actif
async function ajouterAuDeck(cote) {
    if (!deckRecordActif) {
        alert("Veuillez sélectionner un joueur d'abord.");
        return;
    }

    const carteTrouvee = toutesLesCartes.find(c => c.cote === cote);
    if (!carteTrouvee) return;

    cartesDuDeck.push(carteTrouvee);
    afficherDeck();
    await sauvegarderDeck();
}

// Retirer une carte du deck du joueur actif
async function retirerDuDeck(index) {
    if (!deckRecordActif) return;

    cartesDuDeck.splice(index, 1);
    afficherDeck();
    await sauvegarderDeck();
}

// Enregistrer les modifications dans PocketBase
async function sauvegarderDeck() {
    try {
        const listeCotes = cartesDuDeck.map(c => c.cote);
        await pb.collection('decks').update(deckRecordActif.id, {
            cartes: listeCotes
        });
    } catch (err) {
        console.error("Erreur de sauvegarde :", err);
    }
}

// Recherche instantanée
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

// Lancement
initialiserPage();