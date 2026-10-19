const aventuresContainer = document.getElementById('aventures-liste');
const createForm = document.getElementById('create-aventure-form');
const zoneInvitations = document.getElementById('zone-invitations-aventure');
const listeInvitations = document.getElementById('invitations-aventure-liste');

function normaliserIdUtilisateur(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val.id) return val.id;
    return String(val);
}

// 1. On intègre les vrais decks de base selon l'emplacement
const DECKS_DE_BASE = {
    1: ["D1B01", "D1B02", "D1B03", "D1B04", "D1B04", "D1B05", "D1B06", "D1B07", "D1B08", "D1B09", "D1B10", "D1B11", "D1B11", "D1B12", "D1B12"],
    2: ["D2B01", "D2B02", "D2B03", "D2B04", "D2B04", "D2B05", "D2B06", "D2B07", "D2B08", "D2B09", "D2B10", "D2B11", "D2B11", "D2B12", "D2B12"],
    3: ["D3B01", "D3B02", "D3B03", "D3B04", "D3B04", "D3B05", "D3B06", "D3B07", "D3B08", "D3B09", "D3B10", "D3B11", "D3B11", "D3B12", "D3B12"],
    4: ["D4B01", "D4B02", "D4B03", "D4B04", "D4B04", "D4B05", "D4B06", "D4B07", "D4B08", "D4B09", "D4B10", "D4B11", "D4B11", "D4B12", "D4B12"]
};

// ==========================================
// 1. CHARGEMENT DES AVENTURES (Créateur + Invité)
// ==========================================
async function chargerAventures() {
    const spanPseudo = document.getElementById('compte-pseudo');
    if (spanPseudo && pb.authStore.model) {
        spanPseudo.textContent = pb.authStore.model.username || pb.authStore.model.name || 'Héros';
    }
    if (!pb.authStore.isValid) return;

    const userGreetingEl = document.getElementById('user-greeting');
    if (userGreetingEl && pb.authStore.model) {
        const nomJoueur = pb.authStore.model.username || pb.authStore.model.name || 'Héros';
        userGreetingEl.innerHTML = `👤 ${nomJoueur}`;
    }

    try {
        const userId = pb.authStore.model.id;

        const mesAventures = await pb.collection('aventures').getFullList({
            filter: `createur = "${userId}"`,
            sort: '-created'
        });

        const mesParticipations = await pb.collection('joueurs').getFullList({
            filter: `utilisateur = "${userId}"`,
            expand: 'aventure'
        });

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
            const estCreateur = (av.createur === userId);

            const card = document.createElement('div');
            card.style.border = '1px solid var(--encre-noire)';
            card.style.padding = '0.9rem 1rem';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.borderRadius = '3px';
            card.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';

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

window.accepterInvitationAventure = async function (invitationId, aventureId) {
    const ligne = document.getElementById(`invit-av-${invitationId}`);
    if (ligne) ligne.remove();

    if (listeInvitations.children.length === 0) {
        zoneInvitations.style.display = 'none';
    }

    try {
        const userId = pb.authStore.model.id;

        const invitation = await pb.collection('invitations_aventures').getOne(invitationId);
        const emplacementId = invitation.emplacement || 1;

        const nouveauJoueur = await pb.collection('joueurs').create({
            aventure: aventureId,
            utilisateur: userId,
            nom_provisoire: pb.authStore.model.username || pb.authStore.model.name || 'Héros invité',
            emplacement: emplacementId
        });

        const deckDeDepart = DECKS_DE_BASE[emplacementId] || DECKS_DE_BASE[1];
        await pb.collection('decks').create({
            joueur: nouveauJoueur.id,
            cartes: deckDeDepart
        });

        try {
            await pb.collection('participants').create({
                aventures: aventureId,
                utilisateur: userId,
                permission: 'deck'
            });
        } catch (e) {
            console.log("Déjà participant.", e);
        }

        await pb.collection('invitations_aventures').delete(invitationId);

        chargerAventures();
        chargerInvitationsAventures();
    } catch (err) {
        console.error(err);
        chargerInvitationsAventures();
    }
}

window.refuserInvitationAventure = async function (invitationId) {
    const ligne = document.getElementById(`invit-av-${invitationId}`);
    if (ligne) ligne.remove();

    if (listeInvitations.children.length === 0) {
        zoneInvitations.style.display = 'none';
    }

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

window.modifierAventure = async function (aventureId, ancienTitre) {
    const nouveauTitre = prompt("Entrez le nouveau nom de l'aventure :", ancienTitre);
    if (!nouveauTitre || nouveauTitre.trim() === "" || nouveauTitre.trim() === ancienTitre) return;
    try {
        await pb.collection('aventures').update(aventureId, { titre: nouveauTitre.trim() });
        await chargerAventures();
    } catch (err) {
        alert("Impossible de renommer l'aventure.");
    }
}

window.supprimerAventure = async function (aventureId, titre) {
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

window.quitterAventure = async function (aventureId, titre) {
    const confirmation = confirm(`Es-tu sûr de vouloir quitter l'aventure "${titre}" ? Ton héros et ton deck seront supprimés de cette quête.`);
    if (!confirmation) return;

    try {
        const userId = pb.authStore.model.id;

        const joueur = await pb.collection('joueurs').getFirstListItem(`aventure = "${aventureId}" && utilisateur = "${userId}"`);

        const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${joueur.id}"` });
        for (const deck of decks) { await pb.collection('decks').delete(deck.id); }

        await pb.collection('joueurs').delete(joueur.id);

        try {
            const participant = await pb.collection('participants').getFirstListItem(`aventures = "${aventureId}" && utilisateur = "${userId}"`);
            if (participant) {
                await pb.collection('participants').delete(participant.id);
            }
        } catch (e) {
            console.log("Déjà retiré de la table participants.");
        }

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
                nom_provisoire: pb.authStore.model.username || pb.authStore.model.name || 'Héros Principal',
                emplacement: 1
            });

            await pb.collection('decks').create({
                joueur: joueur.id,
                cartes: DECKS_DE_BASE[1]
            });

            titreInput.value = '';
            await chargerAventures();

        } catch (err) {
            console.error('Erreur création aventure :', err);
            alert("Erreur lors de la création de l'aventure.");
        }
    });
}

// ==========================================
// 5. GESTION DU PROFIL (MON COMPTE)
// ==========================================
const btnMonCompte = document.getElementById('btn-mon-compte');
const modalCompte = document.getElementById('modal-compte');
const fermerModalCompte = document.getElementById('fermer-modal-compte');
const formMonCompte = document.getElementById('form-mon-compte');

if (btnMonCompte) {
    btnMonCompte.addEventListener('click', () => {
        document.getElementById('compte-new-pseudo').value = pb.authStore.model.username || pb.authStore.model.name || '';
        document.getElementById('compte-new-email').value = pb.authStore.model.email || '';
        document.getElementById('compte-new-mdp').value = '';
        document.getElementById('compte-new-mdp-confirm').value = '';
        document.getElementById('compte-old-mdp').value = '';

        modalCompte.style.display = 'flex';
    });
}

if (fermerModalCompte) {
    fermerModalCompte.addEventListener('click', () => {
        modalCompte.style.display = 'none';
    });
}

if (formMonCompte) {
    formMonCompte.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPseudo = document.getElementById('compte-new-pseudo').value.trim();
        const newMdp = document.getElementById('compte-new-mdp').value;
        const newMdpConfirm = document.getElementById('compte-new-mdp-confirm').value;
        const oldMdp = document.getElementById('compte-old-mdp').value;

        let updateData = {
            "username": newPseudo,
            "name": newPseudo
        };

        if (newMdp) {
            if (newMdp !== newMdpConfirm) {
                alert("Les nouveaux mots de passe ne correspondent pas !");
                return;
            }
            if (!oldMdp) {
                alert("Vous devez renseigner votre ancien mot de passe pour le modifier !");
                return;
            }
            updateData.oldPassword = oldMdp;
            updateData.password = newMdp;
            updateData.passwordConfirm = newMdpConfirm;
        }

        try {
            if (newPseudo !== pb.authStore.model.username) {
                try {
                    const verification = await pb.collection('users').getFirstListItem(`(username = "${newPseudo}" || name = "${newPseudo}") && id != "${pb.authStore.model.id}"`);
                    if (verification) {
                        alert("Ce pseudo est déjà pris par un autre joueur.");
                        return;
                    }
                } catch (err) { }
            }

            await pb.collection('users').update(pb.authStore.model.id, updateData);

            alert("Profil mis à jour avec succès !");

            const spanPseudo = document.getElementById('compte-pseudo');
            if (spanPseudo) spanPseudo.textContent = newPseudo;
            pb.authStore.model.username = newPseudo;
            pb.authStore.model.name = newPseudo;

            document.getElementById('compte-new-mdp').value = '';
            document.getElementById('compte-new-mdp-confirm').value = '';
            document.getElementById('compte-old-mdp').value = '';

            modalCompte.style.display = 'none';

        } catch (err) {
            console.error("Erreur détaillée de PocketBase :", err);
            let messageErreur = "Erreur lors de la mise à jour.";
            if (err.response && err.response.message) messageErreur += " " + err.response.message;
            else if (err.message) messageErreur += " " + err.message;
            alert(messageErreur);
        }
    });
}

// ==========================================
// 6. GESTION DU TEMPS RÉEL (SANS RECHARGER LA PAGE)
// ==========================================
let timerAventures = null;
function debouncedChargerAventures() {
    clearTimeout(timerAventures);
    timerAventures = setTimeout(async () => {
        await chargerAventures();
    }, 150);
}

let timerInvitations = null;
function debouncedChargerInvitations() {
    clearTimeout(timerInvitations);
    timerInvitations = setTimeout(async () => {
        await chargerInvitationsAventures();
    }, 150);
}

async function abonnerTempsReelAccueil() {
    try {
        const userId = pb.authStore.model?.id;

        await pb.collection('invitations_aventures').subscribe('*', (e) => {
            if (!e.record || e.record.receveur === userId || e.record.demandeur === userId) {
                debouncedChargerInvitations();
            }
        });

        await pb.collection('aventures').subscribe('*', () => {
            debouncedChargerAventures();
        });

        await pb.collection('joueurs').subscribe('*', (e) => {
            const recUserId = normaliserIdUtilisateur(e.record?.utilisateur);
            if (!e.record || recUserId === userId) {
                debouncedChargerAventures();
            }
        });

        await pb.collection('participants').subscribe('*', (e) => {
            const recUserId = normaliserIdUtilisateur(e.record?.utilisateur);
            if (!e.record || recUserId === userId) {
                debouncedChargerAventures();
            }
        });
    } catch (err) {
        console.error("Erreur d'abonnement temps réel (accueil) :", err);
    }
}

window.addEventListener('beforeunload', () => {
    pb.collection('invitations_aventures').unsubscribe('*').catch(() => { });
    pb.collection('aventures').unsubscribe('*').catch(() => { });
    pb.collection('joueurs').unsubscribe('*').catch(() => { });
    pb.collection('participants').unsubscribe('*').catch(() => { });
});

// Initialisation au chargement de la page
async function initialiserAccueil() {
    const msgExpulsion = sessionStorage.getItem('message_expulsion');
    if (msgExpulsion) {
        sessionStorage.removeItem('message_expulsion');
        setTimeout(() => alert(msgExpulsion), 50);
    }

    await chargerInvitationsAventures();
    await chargerAventures();
    abonnerTempsReelAccueil();
}

// ==========================================
// 7. SUPPRESSION DU COMPTE
// ==========================================
const btnSupprimerCompte = document.getElementById('btn-supprimer-compte');
if (btnSupprimerCompte) {
    btnSupprimerCompte.addEventListener('click', async () => {
        const conf1 = confirm("⚠️ Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT votre compte ? Cette action est irréversible.");
        if (!conf1) return;

        const conf2 = prompt("Pour confirmer, tapez 'SUPPRIMER' en majuscules :");
        if (conf2 !== "SUPPRIMER") {
            alert("Suppression annulée.");
            return;
        }

        try {
            const userId = pb.authStore.model.id;

            // 1. Transformer les héros en "sans compte" (les confier au créateur de l'aventure)
            const mesJoueurs = await pb.collection('joueurs').getFullList({
                filter: `utilisateur = "${userId}"`,
                expand: 'aventure'
            });

            for (const j of mesJoueurs) {
                if (j.expand && j.expand.aventure) {
                    const createurId = j.expand.aventure.createur;
                    if (createurId !== userId) {
                        await pb.collection('joueurs').update(j.id, { utilisateur: createurId });
                    }
                }
            }

            // 2. Supprimer les relations d'amis
            const mesAmis = await pb.collection('amis').getFullList({
                filter: `demandeur = "${userId}" || receveur = "${userId}"`
            });
            for (const ami of mesAmis) {
                await pb.collection('amis').delete(ami.id);
            }

            // 3. Me retirer de la table participants
            const mesParticipations = await pb.collection('participants').getFullList({
                filter: `utilisateur = "${userId}"`
            });
            for (const p of mesParticipations) {
                await pb.collection('participants').delete(p.id);
            }

            // 4. Supprimer les invitations en attente
            const mesInvitations = await pb.collection('invitations_aventures').getFullList({
                filter: `demandeur = "${userId}" || receveur = "${userId}"`
            });
            for (const inv of mesInvitations) {
                await pb.collection('invitations_aventures').delete(inv.id);
            }

            // 5. Supprimer le compte utilisateur
            await pb.collection('users').delete(userId);

            alert("Votre compte a été supprimé avec succès. Au revoir !");
            pb.authStore.clear();
            window.location.href = "connexion.html";

        } catch (err) {
            console.error("Erreur suppression compte :", err);
            alert("Erreur lors de la suppression. Veuillez vous assurer que la règle 'Delete' de la table 'users' est bien débloquée (ouverte avec la technique de l'espace) dans l'onglet API Rules de PocketBase.");
        }
    });
}

initialiserAccueil();