const aventuresContainer = document.getElementById('aventures-liste');
const createForm = document.getElementById('create-aventure-form');
const zoneInvitations = document.getElementById('zone-invitations-aventure');
const listeInvitations = document.getElementById('invitations-aventure-liste');

const DECK_DE_BASE = [
    "D1B10", "D1B03", "D1B12", "D1B12", "D1B01", 
    "D1B06", "D1B05", "D1B08", "D1B07", "D1B04", 
    "D1B04", "D1B11", "D1B11", "D1B02", "D1B09"
];

// ==========================================
// 1. CHARGEMENT DES AVENTURES (Créateur + Invité)
// ==========================================
async function chargerAventures() {
    if (!pb.authStore.isValid) return;

    const userGreetingEl = document.getElementById('user-greeting');
    if (userGreetingEl && pb.authStore.model) {
        const nomJoueur = pb.authStore.model.username || pb.authStore.model.name || 'Héros';
        userGreetingEl.innerHTML = `👤 ${nomJoueur}`;
    }
    
    try {
        const userId = pb.authStore.model.id;
        
        // A. Aventures dont on est le créateur
        const mesAventures = await pb.collection('aventures').getFullList({
            filter: `createur = "${userId}"`,
            sort: '-created'
        });

        // B. Aventures qu'on a rejointes (en tant que joueur)
        const mesParticipations = await pb.collection('joueurs').getFullList({
            filter: `utilisateur = "${userId}"`,
            expand: 'aventure'
        });

        // Fusion des deux listes sans doublons
        const aventuresAffichees = [];
        const idsAjoutes = new Set();

        mesAventures.forEach(av => {
            aventuresAffichees.push(av);
            idsAjoutes.add(av.id);
        });

        mesParticipations.forEach(participation => {
            if (participation.expand?.aventure && !idsAjoutes.has(participation.expand.aventure.id)) {
                aventuresAffichees.push(participation.expand.aventure);
                idsAjoutes.add(participation.expand.aventure.id);
            }
        });

        aventuresContainer.innerHTML = '';

        if (aventuresAffichees.length === 0) {
            aventuresContainer.innerHTML = '<p style="text-align: center; font-style: italic; color: var(--gris-dessin);">Aucune aventure en cours. Lancez votre première quête ci-dessus.</p>';
            return;
        }

        aventuresAffichees.forEach(av => {
            // PERMISSIONS : Est-ce qu'on est le créateur de cette aventure ?
            const estCreateur = (av.createur === userId);

            const card = document.createElement('div');
            card.style.border = '1px solid var(--encre-noire)';
            card.style.padding = '0.9rem 1rem';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.borderRadius = '3px';
            card.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';

            // Construction du menu d'action selon le rôle
            let menuActions = '';
            if (estCreateur) {
                menuActions = `
                    <button type="button" class="dropdown-item" onclick="modifierAventure('${av.id}', '${av.titre.replace(/'/g, "\\'")}')">✏️ Renommer</button>
                    <button type="button" class="dropdown-item danger" onclick="supprimerAventure('${av.id}', '${av.titre.replace(/'/g, "\\'")}')">🗑️ Supprimer l'aventure</button>
                `;
            } else {
                menuActions = `
                    <button type="button" class="dropdown-item danger" onclick="quitterAventure('${av.id}', '${av.titre.replace(/'/g, "\\'")}')">🚪 Quitter l'aventure</button>
                `;
            }

            card.innerHTML = `
                <div style="flex-grow: 1; cursor: pointer;" onclick="ouvrirAventure('${av.id}')">
                    <h3 style="font-family: 'Cinzel', serif; font-size: 1.1rem; margin: 0 0 0.3rem 0;">
                        ${av.titre} ${estCreateur ? '' : '<span style="font-size: 0.8rem; color: #666; font-weight: normal;">(Invité)</span>'}
                    </h3>
                    <small style="color: var(--gris-dessin);">Créée le ${new Date(av.created).toLocaleDateString('fr-FR')}</small>
                </div>

                <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <button type="button" onclick="ouvrirAventure('${av.id}')" style="width: auto; padding: 0.45rem 1rem; font-size: 0.85rem; margin-top: 0;">Voir mon deck</button>
                    <div class="action-menu-container">
                        <button type="button" class="btn-dots" onclick="toggleMenu(event, '${av.id}')">⋮</button>
                        <div id="menu-${av.id}" class="dropdown-menu">
                            ${menuActions}
                        </div>
                    </div>
                </div>
            `;
            aventuresContainer.appendChild(card);
        });

    } catch (err) {
        console.error('Erreur chargement aventures :', err);
    }
}

// ==========================================
// 2. GESTION DES INVITATIONS REÇUES
// ==========================================
async function chargerInvitationsAventures() {
    try {
        const userId = pb.authStore.model.id;
        const invitations = await pb.collection('invitations_aventures').getFullList({
            filter: `receveur = "${userId}"`,
            expand: 'aventure,demandeur'
        });

        if (invitations.length > 0) {
            zoneInvitations.style.display = 'block';
            listeInvitations.innerHTML = '';
            
            invitations.forEach(inv => {
                const av = inv.expand?.aventure;
                const demandeur = inv.expand?.demandeur;
                if (!av || !demandeur) return;

                const div = document.createElement('div');
                div.id = `invit-av-${inv.id}`;
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';
                div.style.padding = '0.5rem';
                div.style.backgroundColor = '#fff';
                div.style.border = '1px solid #ddd';

                div.innerHTML = `
                    <div>
                        <strong style="font-family: 'Cinzel', serif;">${av.titre}</strong><br>
                        <small>Invité(e) par ${demandeur.username || demandeur.name}</small>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-action" onclick="accepterInvitationAventure('${inv.id}', '${av.id}')" style="padding: 0.3rem 0.6rem; background-color: #2e8b57; border-color: #2e8b57; font-size: 0.8rem; width: auto;">Rejoindre</button>
                        <button class="btn-action btn-danger" onclick="refuserInvitationAventure('${inv.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; width: auto;">Refuser</button>
                    </div>
                `;
                listeInvitations.appendChild(div);
            });
        } else {
            zoneInvitations.style.display = 'none';
        }
    } catch (err) {
        console.error("Erreur chargement invitations d'aventure :", err);
    }
}

window.accepterInvitationAventure = async function(invitationId, aventureId) {
    const ligne = document.getElementById(`invit-av-${invitationId}`);
    if (ligne) ligne.remove();

    try {
        const userId = pb.authStore.model.id;
        
        // 1. On crée le joueur
        const nouveauJoueur = await pb.collection('joueurs').create({
            aventure: aventureId,
            utilisateur: userId,
            nom_provisoire: pb.authStore.model.username || pb.authStore.model.name || 'Héros invité'
        });

        // 2. On lui donne son deck de base
        await pb.collection('decks').create({
            joueur: nouveauJoueur.id,
            cartes: DECK_DE_BASE
        });

        // 3. On détruit l'invitation
        await pb.collection('invitations_aventures').delete(invitationId);
        
        // On rafraîchit l'affichage
        chargerAventures();
        chargerInvitationsAventures();
    } catch (err) {
        console.error(err);
        chargerInvitationsAventures(); // Rétablit l'erreur visuelle
    }
}

window.refuserInvitationAventure = async function(invitationId) {
    const ligne = document.getElementById(`invit-av-${invitationId}`);
    if (ligne) ligne.remove();

    try {
        await pb.collection('invitations_aventures').delete(invitationId);
        chargerInvitationsAventures();
    } catch (err) {
        console.error(err);
    }
}

// ==========================================
// 3. ACTIONS DE L'AVENTURE
// ==========================================
function toggleMenu(event, aventureId) {
    event.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `menu-${aventureId}`) m.classList.remove('show');
    });
    const menu = document.getElementById(`menu-${aventureId}`);
    if (menu) menu.classList.toggle('show');
}

window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
});

// Action exclusive au créateur
window.modifierAventure = async function(aventureId, ancienTitre) {
    const nouveauTitre = prompt("Entrez le nouveau nom de l'aventure :", ancienTitre);
    if (!nouveauTitre || nouveauTitre.trim() === "" || nouveauTitre.trim() === ancienTitre) return;
    try {
        await pb.collection('aventures').update(aventureId, { titre: nouveauTitre.trim() });
        await chargerAventures();
    } catch (err) {
        alert("Impossible de renommer l'aventure.");
    }
}

// Action exclusive au créateur
window.supprimerAventure = async function(aventureId, titre) {
    const confirmation = confirm(`Es-tu sûr de vouloir supprimer définitivement l'aventure "${titre}" ainsi que tous les joueurs et decks associés ?`);
    if (!confirmation) return;
    try {
        const joueurs = await pb.collection('joueurs').getFullList({ filter: `aventure = "${aventureId}"` });
        for (const joueur of joueurs) {
            const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${joueur.id}"` });
            for (const deck of decks) { await pb.collection('decks').delete(deck.id); }
            await pb.collection('joueurs').delete(joueur.id);
        }
        await pb.collection('aventures').delete(aventureId);
        await chargerAventures();
    } catch (err) {
        alert(`Erreur lors de la suppression.`);
    }
}

// Action exclusive à l'invité
window.quitterAventure = async function(aventureId, titre) {
    const confirmation = confirm(`Es-tu sûr de vouloir quitter l'aventure "${titre}" ? Ton héros et ton deck seront supprimés de cette quête.`);
    if (!confirmation) return;
    
    try {
        const userId = pb.authStore.model.id;
        
        // 1. Trouver MON instance de joueur dans cette aventure
        const joueur = await pb.collection('joueurs').getFirstListItem(`aventure = "${aventureId}" && utilisateur = "${userId}"`);
        
        // 2. Supprimer MES decks
        const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${joueur.id}"` });
        for (const deck of decks) { await pb.collection('decks').delete(deck.id); }
        
        // 3. Me supprimer de l'aventure
        await pb.collection('joueurs').delete(joueur.id);
        
        await chargerAventures();
    } catch (err) {
        console.error("Erreur lors de l'abandon de l'aventure :", err);
        alert(`Erreur : Impossible de quitter l'aventure.`);
    }
}

function ouvrirAventure(aventureId) {
    window.location.href = `deck.html?aventure=${aventureId}`;
}

// ==========================================
// 4. CREATION DE NOUVELLE AVENTURE
// ==========================================
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
                nom_provisoire: pb.authStore.model.username || pb.authStore.model.name || 'Héros Principal'
            });

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

// Initialisation au chargement de la page
chargerInvitationsAventures();
chargerAventures();