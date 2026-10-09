// On réutilise l'instance 'pb' créée dans auth.js
const aventuresContainer = document.getElementById('aventures-liste');
const createForm = document.getElementById('create-aventure-form');

// 1. Charger et afficher les aventures du joueur connecté
async function chargerAventures() {
    if (!pb.authStore.isValid) return;

    try {
        const userId = pb.authStore.model.id;
        
        // On récupère les aventures créées par l'utilisateur connecté
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
            card.style.padding = '1rem';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.borderRadius = '3px';
            card.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';

            card.innerHTML = `
                <div>
                    <h3 style="font-family: 'Cinzel', serif; font-size: 1.1rem; margin: 0 0 0.3rem 0;">${av.titre}</h3>
                    <small style="color: var(--gris-dessin);">Créée le ${new Date(av.created).toLocaleDateString('fr-FR')}</small>
                </div>
                <button type="button" onclick="ouvrirAventure('${av.id}')" style="width: auto; padding: 0.5rem 1.2rem; font-size: 0.85rem; margin-top: 0;">
                    Voir mon deck
                </button>
            `;
            aventuresContainer.appendChild(card);
        });

    } catch (err) {
        console.error('Erreur chargement aventures :', err);
        aventuresContainer.innerHTML = '<p style="color: var(--bordeaux); text-align: center;">Impossible de charger les aventures.</p>';
    }
}

// 2. Créer une aventure + l'entrée joueur + le deck initial vide
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titreInput = document.getElementById('aventure-nom');
        const titre = titreInput.value.trim();
        if (!titre) return;

        try {
            const userId = pb.authStore.model.id;

            // a. Créer l'aventure
            const nouvelleAventure = await pb.collection('aventures').create({
                titre: titre,
                createur: userId
            });

            // b. Créer le joueur associé
            const joueur = await pb.collection('joueurs').create({
                aventure: nouvelleAventure.id,
                utilisateur: userId,
                nom_provisoire: pb.authStore.model.name || 'Héros'
            });

            // c. Créer le deck rattaché à ce joueur
            await pb.collection('decks').create({
                joueur: joueur.id,
                cartes: [] // deck vide au départ
            });

            titreInput.value = '';
            await chargerAventures();

        } catch (err) {
            console.error('Erreur création aventure :', err);
            alert("Erreur lors de la création de l'aventure.");
        }
    });
}

// 3. Redirection vers la future page de deck
function ouvrirAventure(aventureId) {
    window.location.href = `deck.html?aventure=${aventureId}`;
}

// Lancement au chargement de la page
chargerAventures();