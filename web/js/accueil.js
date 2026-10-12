// On réutilise l'instance 'pb' créée dans auth.js
const aventuresContainer = document.getElementById('aventures-liste');
const createForm = document.getElementById('create-aventure-form');

const DECK_DE_BASE = [
    "D1B10", "D1B03", "D1B12", "D1B12", "D1B01", 
    "D1B06", "D1B05", "D1B08", "D1B07", "D1B04", 
    "D1B04", "D1B11", "D1B11", "D1B02", "D1B09"
];

// 1. Charger et afficher les aventures du joueur connecté
async function chargerAventures() {
    if (!pb.authStore.isValid) return;

    // Afficher le nom de l'utilisateur en haut à gauche
    const userGreetingEl = document.getElementById('user-greeting');
    if (userGreetingEl && pb.authStore.model) {
        const nomJoueur = pb.authStore.model.username || pb.authStore.model.name || 'Héros';
        userGreetingEl.innerHTML = `👤 ${nomJoueur}`;
    }
    
    try {
        const userId = pb.authStore.model.id;
        
        const aventures = await pb.collection('aventures').getFullList({
            filter: `createur = "${userId}"`,
            sort: '-created'
        });

        aventuresContainer.innerHTML = '';

        if (aventures.length === 0) {
            aventuresContainer.innerHTML = '<p style="text-align: center; font-style: italic; color: var(--gris-dessin);">Aucune aventure en cours. Lancez votre première quête ci-dessus.</p>';
            return;
        }

        aventures.forEach(av => {
            const card = document.createElement('div');
            card.style.border = '1px solid var(--encre-noire)';
            card.style.padding = '0.9rem 1rem';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.borderRadius = '3px';
            card.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';

            card.innerHTML = `
                <div style="flex-grow: 1; cursor: pointer;" onclick="ouvrirAventure('${av.id}')">
                    <h3 style="font-family: 'Cinzel', serif; font-size: 1.1rem; margin: 0 0 0.3rem 0;">${av.titre}</h3>
                    <small style="color: var(--gris-dessin);">Créée le ${new Date(av.created).toLocaleDateString('fr-FR')}</small>
                </div>

                <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <button type="button" onclick="ouvrirAventure('${av.id}')" style="width: auto; padding: 0.45rem 1rem; font-size: 0.85rem; margin-top: 0;">
                        Voir mon deck
                    </button>

                    <!-- Menu à 3 points -->
                    <div class="action-menu-container">
                        <button type="button" class="btn-dots" onclick="toggleMenu(event, '${av.id}')">⋮</button>
                        <div id="menu-${av.id}" class="dropdown-menu">
                            <button type="button" class="dropdown-item" onclick="modifierAventure('${av.id}', '${av.titre.replace(/'/g, "\\'")}')">
                                ✏️ Renommer
                            </button>
                            <button type="button" class="dropdown-item danger" onclick="supprimerAventure('${av.id}', '${av.titre.replace(/'/g, "\\'")}')">
                                🗑️ Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            `;
            aventuresContainer.appendChild(card);
        });

    } catch (err) {
        console.error('Erreur chargement aventures :', err);
        aventuresContainer.innerHTML = '<p style="color: var(--bordeaux); text-align: center;">Impossible de charger les aventures.</p>';
    }
}

// 2. Gestion de l'affichage du menu déroulant
function toggleMenu(event, aventureId) {
    event.stopPropagation();
    // Fermer les autres menus ouverts
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `menu-${aventureId}`) m.classList.remove('show');
    });

    const menu = document.getElementById(`menu-${aventureId}`);
    if (menu) {
        menu.classList.toggle('show');
    }
}

// Ferme les menus au clic ailleurs sur la page
window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
});

// 3. Modifier (renommer) une aventure
async function modifierAventure(aventureId, ancienTitre) {
    const nouveauTitre = prompt("Entrez le nouveau nom de l'aventure :", ancienTitre);
    if (!nouveauTitre || nouveauTitre.trim() === "" || nouveauTitre.trim() === ancienTitre) return;

    try {
        await pb.collection('aventures').update(aventureId, {
            titre: nouveauTitre.trim()
        });
        await chargerAventures();
    } catch (err) {
        console.error("Erreur modification aventure :", err);
        alert("Impossible de renommer l'aventure.");
    }
}

// 4. Supprimer une aventure en cascade (Aventure -> Joueurs -> Decks)
async function supprimerAventure(aventureId, titre) {
    const confirmation = confirm(`Es-tu sûr de vouloir supprimer définitivement l'aventure "${titre}" ainsi que tous les joueurs et decks associés ?`);
    if (!confirmation) return;

    try {
        // a. Récupérer tous les joueurs liés à cette aventure
        const joueurs = await pb.collection('joueurs').getFullList({
            filter: `aventure = "${aventureId}"`
        });

        // b. Pour chaque joueur, supprimer son/ses deck(s)
        for (const joueur of joueurs) {
            const decks = await pb.collection('decks').getFullList({
                filter: `joueur = "${joueur.id}"`
            });
            for (const deck of decks) {
                await pb.collection('decks').delete(deck.id);
            }
            // c. Supprimer le joueur
            await pb.collection('joueurs').delete(joueur.id);
        }

        // d. Supprimer l'aventure elle-même
        await pb.collection('aventures').delete(aventureId);

        // Recharger la liste
        await chargerAventures();

    } catch (err) {
        console.error("Erreur suppression aventure :", err);
        alert(`Erreur lors de la suppression : ${err.message || 'Action refusée'}`);
    }
}

// 5. Créer une aventure + joueur + deck initial
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titreInput = document.getElementById('aventure-nom');
        const titre = titreInput.value.trim();
        if (!titre) return;

        try {
            const userId = pb.authStore.model.id;

            const nouvelleAventure = await pb.collection('aventures').create({
                titre: titre,
                createur: userId
            });

            const joueur = await pb.collection('joueurs').create({
                aventure: nouvelleAventure.id,
                utilisateur: userId,
                nom_provisoire: pb.authStore.model.name || 'Héros Principal'
            });

            // Création du deck avec les cartes de base
            await pb.collection('decks').create({
                joueur: joueur.id,
                cartes: DECK_DE_BASE
            });

            titreInput.value = '';
            await chargerAventures();

        } catch (err) {
            console.error('Erreur création aventure :', err);
            alert("Erreur lors de la création de l'aventure.");
        }
    });
}

function ouvrirAventure(aventureId) {
    window.location.href = `deck.html?aventure=${aventureId}`;
}

// Initialisation
chargerAventures();