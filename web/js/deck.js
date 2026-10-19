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
let compteCartesUtilisees = {};
let invitationsAventure = [];
let participantsAventure = [];
let mesDroits = "spectateur";
let createurAventureId = null;
let monParticipantId = null;

function normaliserIdUtilisateur(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val.id) return val.id;
    return String(val);
}

function redirigerExpulsion() {
    sessionStorage.setItem('message_expulsion', "Vous avez été exclu de cette aventure.");
    window.location.href = "accueil.html";
}

const DECKS_DE_BASE = {
    1: ["D1B01", "D1B02", "D1B03", "D1B04", "D1B04", "D1B05", "D1B06", "D1B07", "D1B08", "D1B09", "D1B10", "D1B11", "D1B11", "D1B12", "D1B12"],
    2: ["D2B01", "D2B02", "D2B03", "D2B04", "D2B04", "D2B05", "D2B06", "D2B07", "D2B08", "D2B09", "D2B10", "D2B11", "D2B11", "D2B12", "D2B12"],
    3: ["D3B01", "D3B02", "D3B03", "D3B04", "D3B04", "D3B05", "D3B06", "D3B07", "D3B08", "D3B09", "D3B10", "D3B11", "D3B11", "D3B12", "D3B12"],
    4: ["D4B01", "D4B02", "D4B03", "D4B04", "D4B04", "D4B05", "D4B06", "D4B07", "D4B08", "D4B09", "D4B10", "D4B11", "D4B11", "D4B12", "D4B12"]
};
let slotInvitationEnCours = null;
const MAX_JOUEURS = 4;

// 3. Éléments DOM
const titreAventureEl = document.getElementById('aventure-titre');
const joueursListeEl = document.getElementById('joueurs-liste');
const deckTitreJoueurEl = document.getElementById('deck-titre-joueur');
const deckListeEl = document.getElementById('deck-cartes-liste');
const deckCountEl = document.getElementById('deck-count');
const catalogueListeEl = document.getElementById('catalogue-cartes-liste');
const searchInput = document.getElementById('search-input');
const modalInvitation = document.getElementById('modal-invitation');
const listeAmisInvitation = document.getElementById('liste-amis-invitation');
const btnFermerModal = document.getElementById('fermer-modal-invitation');

// ==========================================
// FONCTIONS D'AFFICHAGE DES PARTICIPANTS
// ==========================================

function afficherInvites() {
    const zoneInvitesContainer = document.getElementById('zone-invites-container');
    const invitesListeEl = document.getElementById('invites-liste');
    
    const userId = pb.authStore.model.id;
    const estCreateur = (userId === createurAventureId);

    if (!estCreateur) {
        if (zoneInvitesContainer) zoneInvitesContainer.style.display = 'none';
        return; 
    } else {
        if (zoneInvitesContainer) zoneInvitesContainer.style.display = 'block';
    }

    if (!invitesListeEl) return;
    invitesListeEl.innerHTML = '';

    if (participantsAventure.length === 0) {
        invitesListeEl.innerHTML = '<p style="text-align: center; font-size: 0.75rem; font-style: italic; color: #888;">Aucun autre compagnon invité.</p>';
        return;
    }

    participantsAventure.forEach(part => {
        if (part.utilisateur === createurAventureId) return;

        const nom = part.expand?.utilisateur?.username || part.expand?.utilisateur?.name || 'Inconnu';
        
        let htmlDroits = '<select onchange="changerDroitParticipant(\'' + part.id + '\', this.value)" style="font-size: 0.7rem; padding: 0.2rem; width: 100%; margin-bottom: 0.3rem; border: 1px solid var(--encre-noire);">' +
            '<option value="spectateur" ' + (part.permission === 'spectateur' ? 'selected' : '') + '>👁️ Juste regarder</option>' +
            '<option value="deck" ' + (part.permission === 'deck' ? 'selected' : '') + '>🃏 Modifier les decks</option>' +
            '<option value="admin" ' + (part.permission === 'admin' ? 'selected' : '') + '>👑 Gérer les héros (Admin)</option>' +
        '</select>' +
        '<button class="btn-action btn-danger" onclick="expulserParticipant(\'' + part.id + '\', \'' + nom + '\')" style="font-size: 0.7rem; padding: 0.4rem; width: 100% !important; margin: 0;">Expulser</button>';

        const div = document.createElement('div');
        div.className = 'player-item';
        div.style.cssText = 'display: flex !important; flex-direction: column !important; align-items: stretch !important; gap: 0.4rem;';

        div.innerHTML = '<div style="font-weight: bold; font-size: 0.85rem;">👤 ' + nom + '</div>' +
                        '<div style="width: 100%;">' + htmlDroits + '</div>';
        invitesListeEl.appendChild(div);
    });
}

async function chargerParticipants() {
    const userId = pb.authStore.model.id;
    if (userId === createurAventureId) {
        mesDroits = "createur";
    }

    try {
        participantsAventure = await pb.collection('participants').getFullList({
            filter: `aventures = "${aventureId}"`, 
            expand: 'utilisateur',
            requestKey: null
        });

        if (userId !== createurAventureId) {
            const monAcces = participantsAventure.find(p => normaliserIdUtilisateur(p.utilisateur) === userId);
            monParticipantId = monAcces ? monAcces.id : null;
            mesDroits = monAcces ? monAcces.permission : "spectateur";
        }

        afficherInvites();
    } catch(e) {
        participantsAventure = [];
        afficherInvites();
    }
}

window.changerDroitParticipant = async function(id, nouvellePermission) {
    try {
        await pb.collection('participants').update(id, { permission: nouvellePermission }, { requestKey: null });
    } catch(e) {
        alert("Erreur lors de la modification des droits. Avez-vous bien appliqué l'astuce de l'espace pour la règle Update de la table 'participants' ?");
    }
};

window.expulserParticipant = async function(id, nom) {
    const part = participantsAventure.find(p => p.id === id);
    if (!part) return;

    const estDejaSpectateur = (part.permission === 'spectateur');

    if (estDejaSpectateur) {
        if (!confirm(`Ce joueur est déjà en mode Lecture Seule. Veux-tu l'exclure DÉFINITIVEMENT de l'aventure ?`)) return;
        try {
            await pb.collection('participants').delete(id, { requestKey: null });
            participantsAventure = participantsAventure.filter(p => p.id !== id);
            await chargerParticipants();
            afficherInvites();
        } catch(e) {
            alert("Erreur d'exclusion. Débloquez la règle Delete de la table 'participants'.");
        }
    } else {
        if (!confirm(`Veux-tu retirer le héros de ${nom} et le passer en mode Spectateur (Lecture Seule) ?`)) return;
        try {
            const targetUserId = normaliserIdUtilisateur(part.utilisateur || part.expand?.utilisateur);
            if (targetUserId) {
                const joueursAssocies = await pb.collection('joueurs').getFullList({
                    filter: `aventure = "${aventureId}" && utilisateur = "${targetUserId}"`,
                    requestKey: null
                });
                for (const j of joueursAssocies) {
                    const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${j.id}"`, requestKey: null });
                    for (const d of decks) { await pb.collection('decks').delete(d.id, { requestKey: null }); }
                    await pb.collection('joueurs').delete(j.id, { requestKey: null });
                    
                    if (joueurActif && joueurActif.id === j.id) {
                        joueurActif = null;
                    }
                }
            }
            
            try {
                await pb.collection('participants').update(id, { permission: 'spectateur' }, { requestKey: null });
            } catch(eUpdate) {
                console.warn(eUpdate);
            }
            
            await chargerParticipants();
            await chargerJoueurs(pb.authStore.model.id);
            afficherInvites();
        } catch(e) {
            console.error(e);
            alert("Erreur (403 Forbidden). Avez-vous bien débloqué l'Update et le Delete pour les tables 'joueurs' et 'decks' ?");
        }
    }
};

// ==========================================
// INITIALISATION DE LA PAGE
// ==========================================

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

        const aventure = await pb.collection('aventures').getOne(aventureId, { requestKey: null });
        if (titreAventureEl) titreAventureEl.textContent = aventure.titre;

        createurAventureId = aventure.createur; 
        const estCreateur = (userId === createurAventureId);

        if (estCreateur) {
            try {
                const dejaParticipant = await pb.collection('participants').getFirstListItem(`aventures = "${aventureId}" && utilisateur = "${userId}"`, { requestKey: null });
                if (!dejaParticipant) {
                    await pb.collection('participants').create({
                        aventures: aventureId,
                        utilisateur: userId,
                        permission: 'admin'
                    });
                }
            } catch (err) {
                await pb.collection('participants').create({
                    aventures: aventureId,
                    utilisateur: userId,
                    permission: 'admin'
                }).catch(e => console.warn("Création participant créateur ignorée :", e));
            }
        } else {
            let monParticipant = null;
            try {
                monParticipant = await pb.collection('participants').getFirstListItem(`aventures = "${aventureId}" && utilisateur = "${userId}"`, { requestKey: null });
            } catch (e) {
                monParticipant = null;
            }

            if (!monParticipant) {
                redirigerExpulsion();
                return;
            }
        }

        await chargerParticipants(); 

        toutesLesCartes = await pb.collection('cartes_butins').getFullList({
            sort: 'cote',
            requestKey: null
        });

        await chargerJoueurs(userId);
        await majCompteCartes();
        afficherCatalogue(toutesLesCartes);
        
        afficherInvites();
        abonnerTempsReelDeck();

    } catch (err) {
        console.error("Erreur d'initialisation :", err);
        alert(`Erreur de chargement : ${err.message || err.status}`);
    }
}

// ==========================================
// GESTION DES INVITATIONS D'AMIS
// ==========================================

window.ouvrirModalInvitation = async function(slotId) {
    slotInvitationEnCours = slotId;
    modalInvitation.style.display = 'flex';
    await chargerAmisPourInvitation();
};

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
            expand: 'demandeur,receveur',
            requestKey: null
        });

        const idsDejaPresents = listeJoueurs.map(j => j.utilisateur); 

        const invitationsEnAttente = await pb.collection('invitations_aventures').getFullList({
            filter: `aventure = "${aventureId}"`,
            requestKey: null
        });
        const idsInvites = invitationsEnAttente.map(inv => inv.receveur);

        listeAmisInvitation.innerHTML = '';

        if (toutesRelations.length === 0) {
            listeAmisInvitation.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Vous n\'avez pas encore de compagnons.</p>';
            return;
        }

        toutesRelations.sort((a, b) => {
            const amiA = a.demandeur === userId ? a.expand?.receveur : a.expand?.demandeur;
            const amiB = b.demandeur === userId ? b.expand?.receveur : b.expand?.demandeur;
            
            const nomA = (amiA?.username || amiA?.name || 'zzzz').toLowerCase();
            const nomB = (amiB?.username || amiB?.name || 'zzzz').toLowerCase();
            
            if (nomA < nomB) return -1;
            if (nomA > nomB) return 1;
            
            return new Date(a.created) - new Date(b.created);
        });

        toutesRelations.forEach(rel => {
            const ami = rel.demandeur === userId ? rel.expand?.receveur : rel.expand?.demandeur;
            if (!ami) return;

            const estDejaDansLaventure = idsDejaPresents.includes(ami.id);
            const estDejaInvite = idsInvites.includes(ami.id);

            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '0.5rem 0';
            div.style.borderBottom = '1px dashed var(--encre-noire)';

            if (estDejaDansLaventure) {
                div.innerHTML = '<strong style="font-family: \'Cinzel\', serif;">' + (ami.username || ami.name) + '</strong><span style="color: #666; font-style: italic; font-size: 0.85rem;">Déjà présent</span>';
            } else if (estDejaInvite) {
                div.innerHTML = '<strong style="font-family: \'Cinzel\', serif;">' + (ami.username || ami.name) + '</strong><span style="color: #b8860b; font-style: italic; font-size: 0.85rem;">En attente...</span>';
            } else {
                div.innerHTML = '<strong style="font-family: \'Cinzel\', serif;">' + (ami.username || ami.name) + '</strong>' +
                                '<button class="btn-action" onclick="ajouterAmiAventure(\'' + ami.id + '\', this)" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; width: auto;">Inviter</button>';
            }
            listeAmisInvitation.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        listeAmisInvitation.innerHTML = '<p style="color:red; text-align:center;">Erreur de chargement.</p>';
    }
}

window.ajouterAmiAventure = async function(amiId, btnElement) {
    btnElement.disabled = true;
    btnElement.innerText = 'Envoi...';
    
    try {
        const userId = pb.authStore.model.id;
        await pb.collection('invitations_aventures').create({
            aventure: aventureId,
            demandeur: userId,
            receveur: amiId,
            emplacement: parseInt(slotInvitationEnCours)
        });

        btnElement.innerText = 'Envoyé !';
        btnElement.style.backgroundColor = '#2e8b57';
        btnElement.style.borderColor = '#2e8b57';
        
        await chargerJoueurs(userId);
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
        listeJoueurs = await pb.collection('joueurs').getFullList({ filter: `aventure = "${aventureId}"`, sort: 'created', requestKey: null });
        
        invitationsAventure = await pb.collection('invitations_aventures').getFullList({
            filter: `aventure = "${aventureId}"`,
            expand: 'receveur',
            requestKey: null
        });

        let slotsOccupes = listeJoueurs.map(j => j.emplacement).filter(e => e);
        for (let j of listeJoueurs) {
            if (!j.emplacement) {
                for (let i = 1; i <= MAX_JOUEURS; i++) {
                    if (!slotsOccupes.includes(i)) {
                        j.emplacement = i;
                        slotsOccupes.push(i);
                        await pb.collection('joueurs').update(j.id, { emplacement: i }, { requestKey: null }).catch(e => console.warn(e));
                        break;
                    }
                }
            }
        }

        if (!joueurActif && listeJoueurs.length > 0) joueurActif = listeJoueurs[0];
        
        afficherJoueurs();
        if (joueurActif) await selectionnerJoueur(joueurActif.id);

    } catch (err) { console.error("Erreur chargement joueurs :", err); }
}

function afficherJoueurs() {
    if (!joueursListeEl) return;
    joueursListeEl.innerHTML = '';

    for (let i = 1; i <= MAX_JOUEURS; i++) {
        const joueurSlot = listeJoueurs.find(j => parseInt(j.emplacement) === i);
        const invitationEnAttente = invitationsAventure.find(inv => parseInt(inv.emplacement) === i);
        
        const div = document.createElement('div');
        
        if (joueurSlot) {
            const estActif = joueurActif && joueurActif.id === joueurSlot.id;
            div.className = 'player-item ' + (estActif ? 'active' : '');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.onclick = () => selectionnerJoueur(joueurSlot.id);

            const nom = joueurSlot.nom_provisoire || ('Héros ' + i);
            const nomSafe = nom.replace(/'/g, "\\'"); 
            const btnColor = estActif ? '#f4ecd8' : 'var(--encre-noire)';
            const sousTexte = estActif ? '▶ Deck actif' : 'Cliquer pour voir';

            const joueurUtilisateurId = normaliserIdUtilisateur(joueurSlot.utilisateur);
            const estCreateurMainSlot = (joueurUtilisateurId === createurAventureId && parseInt(joueurSlot.emplacement) === 1);
            const estSansCompte = (joueurUtilisateurId === createurAventureId && parseInt(joueurSlot.emplacement) !== 1);
            const estMonSlot = (joueurUtilisateurId === pb.authStore.model.id);

            let afficherBoutonRenommer = false;
            let afficherBoutonRetirer = false;

            if (mesDroits === 'createur') {
                afficherBoutonRenommer = true;
                if (!estCreateurMainSlot) afficherBoutonRetirer = true; 
            } else if (mesDroits === 'admin') {
                afficherBoutonRenommer = true;
                if (estSansCompte) afficherBoutonRetirer = true; 
            } else if (mesDroits === 'deck') {
                if (estMonSlot) afficherBoutonRenommer = true; 
            }

            let menuHtml = '';
            if (afficherBoutonRenommer || afficherBoutonRetirer) {
                menuHtml += '<div class="action-menu-container" style="margin-left: auto;">' +
                    '<button type="button" class="btn-dots" style="color: ' + btnColor + '; padding: 0.2rem 0.5rem;" onclick="toggleMenuJoueur(event, \'' + joueurSlot.id + '\')">⋮</button>' +
                    '<div id="menu-joueur-' + joueurSlot.id + '" class="dropdown-menu">';
                    
                if (afficherBoutonRenommer) {
                    menuHtml += '<button type="button" class="dropdown-item" onclick="renommerJoueur(event, \'' + joueurSlot.id + '\', \'' + nomSafe + '\')">✏️ Renommer</button>';
                }
                if (afficherBoutonRetirer) {
                    menuHtml += '<button type="button" class="dropdown-item danger" onclick="supprimerJoueur(event, \'' + joueurSlot.id + '\', \'' + nomSafe + '\')">🗑️ Retirer</button>';
                }
                
                menuHtml += '</div></div>';
            }

            div.innerHTML = '<div>' +
                    '<div style="font-size: 0.65rem; color: ' + (estActif ? '#dcd0b8' : '#888') + ';">Emplacement ' + i + '</div>' +
                    '<div>' + nom + '</div>' +
                    '<small style="font-size: 0.75rem;">' + sousTexte + '</small>' +
                '</div>' +
                menuHtml;
        } else if (invitationEnAttente) {
            const nomInvite = invitationEnAttente.expand?.receveur?.username || invitationEnAttente.expand?.receveur?.name || 'un ami';
            
            div.className = 'player-item';
            div.style.cssText = 'display: flex !important; flex-direction: column !important; align-items: stretch !important; gap: 0.5rem; cursor: default; background-color: rgba(218, 165, 32, 0.15); border: 1px dashed #daa520;';

            const peutInviter = (mesDroits === 'createur' || mesDroits === 'admin');
            let btnAnnuler = '';
            if (peutInviter) {
                btnAnnuler = '<button class="btn-action btn-danger" onclick="annulerInvitationSlot(\'' + invitationEnAttente.id + '\')" style="font-size: 0.75rem; padding: 0.4rem; width: 100% !important; margin: 0;">Annuler l\'invitation</button>';
            }

            div.innerHTML = '<div style="font-size: 0.8rem; font-weight: bold; color: #b8860b; text-align: center;">Emplacement ' + i + ' (Réservé)</div>' +
                            '<div style="font-size: 0.75rem; text-align: center; color: #666; font-style: italic;">En attente de ' + nomInvite + '...</div>' +
                            btnAnnuler;
        } else {
            div.className = 'player-item';
            div.style.cssText = 'display: flex !important; flex-direction: column !important; align-items: stretch !important; gap: 0.5rem; cursor: default; background-color: rgba(255, 255, 255, 0.2);';

            const peutCreer = (mesDroits !== 'spectateur');
            const peutInviter = (mesDroits === 'createur' || mesDroits === 'admin');
            
            let inputHtml = '';
            let boutonsCreationHtml = '';
            
            if (peutCreer) { 
                inputHtml = '<input type="text" id="input-slot-' + i + '" placeholder="Nom du héros ' + i + '..." style="width: 100%; box-sizing: border-box; padding: 0.4rem; font-size: 0.8rem; text-align: center; border: 1px solid var(--encre-noire); margin: 0;">';
                
                let boutonInviterHtml = '';
                if (peutInviter) {
                    boutonInviterHtml = '<button class="btn-action" onclick="ouvrirModalInvitation(' + i + ')" style="flex: 1 !important; width: 100% !important; font-size: 0.75rem; padding: 0.4rem; margin: 0;">+ Inviter</button>';
                }

                boutonsCreationHtml = '<div style="display: flex; gap: 0.3rem; width: 100%;">' +
                    '<button class="btn-action" onclick="creerJoueurSlot(' + i + ')" style="flex: 1 !important; width: 100% !important; font-size: 0.75rem; padding: 0.4rem; margin: 0;">+ Créer</button>' +
                    boutonInviterHtml +
                '</div>';
            }

            div.innerHTML = '<div style="font-size: 0.8rem; font-weight: bold; color: #666; text-align: center;">Emplacement ' + i + ' (Libre)</div>' + 
                            inputHtml + 
                            boutonsCreationHtml;
        }
        
        joueursListeEl.appendChild(div);
    }
}

window.creerJoueurSlot = async function(slotId) {
    const input = document.getElementById('input-slot-' + slotId);
    const nom = input ? input.value.trim() : '';
    if (!nom) { alert("Veuillez entrer un nom pour ce héros."); return; }

    try {
        const nouveauJoueur = await pb.collection('joueurs').create({
            aventure: aventureId,
            utilisateur: createurAventureId, 
            nom_provisoire: nom,
            emplacement: parseInt(slotId) 
        });

        const deckDeDepart = DECKS_DE_BASE[slotId] || DECKS_DE_BASE[1];
        await pb.collection('decks').create({ joueur: nouveauJoueur.id, cartes: deckDeDepart });
        
        listeJoueurs.push(nouveauJoueur);
        joueurActif = nouveauJoueur; 
        
        afficherJoueurs();
        await selectionnerJoueur(nouveauJoueur.id); 
        await majCompteCartes(); 
        rafraichirCatalogueAffichage();

    } catch (err) {
        console.error("Erreur ajout joueur :", err);
        alert("Erreur de création.");
    }
};

window.annulerInvitationSlot = async function(invitationId) {
    if (!confirm("Voulez-vous vraiment annuler cette invitation et libérer l'emplacement ?")) return;
    try {
        await pb.collection('invitations_aventures').delete(invitationId);
        invitationsAventure = invitationsAventure.filter(inv => inv.id !== invitationId);
        afficherJoueurs();
    } catch (err) {
        console.error("Erreur annulation invitation :", err);
    }
};

function toggleMenuJoueur(event, joueurId) {
    event.stopPropagation(); 
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== 'menu-joueur-' + joueurId) m.classList.remove('show');
    });
    const menu = document.getElementById('menu-joueur-' + joueurId);
    if (menu) menu.classList.toggle('show');
}

window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
});

async function renommerJoueur(event, joueurId, ancienNom) {
    event.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));

    const joueurARenommer = listeJoueurs.find(j => j.id === joueurId);
    if (joueurARenommer && mesDroits === 'deck' && normaliserIdUtilisateur(joueurARenommer.utilisateur) !== pb.authStore.model.id) {
        alert("Vous ne pouvez renommer que votre propre héros.");
        return;
    }

    const nouveauNom = prompt("Entrez le nouveau nom du héros :", ancienNom);
    if (!nouveauNom || nouveauNom.trim() === "" || nouveauNom.trim() === ancienNom) return;

    try {
        await pb.collection('joueurs').update(joueurId, { nom_provisoire: nouveauNom.trim() }, { requestKey: null });
        const j = listeJoueurs.find(j => j.id === joueurId);
        if (j) j.nom_provisoire = nouveauNom.trim();

        if (joueurActif && joueurActif.id === joueurId) {
            deckTitreJoueurEl.textContent = 'Deck : ' + nouveauNom.trim();
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

    const joueurASupprimer = listeJoueurs.find(j => j.id === joueurId);
    if (!joueurASupprimer) return;

    const joueurUtilisateurId = normaliserIdUtilisateur(joueurASupprimer.utilisateur);
    const estCreateurMainSlot = (joueurUtilisateurId === createurAventureId && parseInt(joueurASupprimer.emplacement) === 1);
    const estSansCompte = (joueurUtilisateurId === createurAventureId && parseInt(joueurASupprimer.emplacement) !== 1);

    if (mesDroits === 'spectateur' || mesDroits === 'deck') {
        alert("Vous n'avez pas les droits pour supprimer un héros.");
        return;
    }
    if (mesDroits === 'admin' && !estSansCompte) {
        alert("En tant qu'Admin, vous ne pouvez retirer que les héros créés localement (sans compte).");
        return;
    }
    if (estCreateurMainSlot) {
        alert("Le héros principal du créateur ne peut pas être supprimé. Si vous souhaitez arrêter, supprimez l'aventure depuis l'accueil.");
        return;
    }

    const conf = confirm('Es-tu sûr de vouloir retirer "' + nom + '" de l\'aventure ? Son deck sera supprimé définitivement.');
    if (!conf) return;

    try {
        if (!estSansCompte && joueurUtilisateurId && joueurUtilisateurId !== createurAventureId) {
            try {
                const participantsRecords = await pb.collection('participants').getFullList({
                    filter: `aventures = "${aventureId}" && utilisateur = "${joueurUtilisateurId}"`,
                    requestKey: null
                });
                for (const p of participantsRecords) {
                    await pb.collection('participants').update(p.id, { permission: 'spectateur' }, { requestKey: null });
                }
            } catch (errPart) {
                console.warn("Erreur mise à jour participant associé :", errPart);
            }
        }

        const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${joueurId}"`, requestKey: null });
        for (const d of decks) { await pb.collection('decks').delete(d.id, { requestKey: null }); }
        await pb.collection('joueurs').delete(joueurId, { requestKey: null });

        if (joueurActif && joueurActif.id === joueurId) {
            joueurActif = null;
        }

        const userId = pb.authStore.model.id;
        await chargerParticipants();
        await chargerJoueurs(userId);
    } catch (err) {
        console.error("Erreur suppression :", err);
        alert("Erreur (403). Avez-vous débloqué l'Update et le Delete pour 'joueurs' et 'decks' dans PocketBase ?");
    }
}

// ==========================================
// GESTION DU DECK & CATALOGUE
// ==========================================

async function selectionnerJoueur(joueurId) {
    if (timerSauvegardeDeck) {
        clearTimeout(timerSauvegardeDeck);
        await executerSauvegardeDeck();
    }
    joueurActif = listeJoueurs.find(j => j.id === joueurId);
    
    if (!joueurActif) {
        cartesDuDeck = [];
        deckRecordActif = null;
        if (deckTitreJoueurEl) deckTitreJoueurEl.textContent = 'Aucun héros sélectionné';
        afficherDeck();
        afficherJoueurs();
        return;
    }

    afficherJoueurs();

    if (deckTitreJoueurEl && joueurActif) {
        deckTitreJoueurEl.textContent = 'Deck : ' + (joueurActif.nom_provisoire || 'Héros');
    }
    if (searchDeckInput) searchDeckInput.value = ''; 

    try {
        try {
            deckRecordActif = await pb.collection('decks').getFirstListItem(`joueur = "${joueurActif.id}"`, { requestKey: null });
        } catch (e) {
            const deckDeDepart = DECKS_DE_BASE[joueurActif.emplacement] || DECKS_DE_BASE[1];
            deckRecordActif = await pb.collection('decks').create({
                joueur: joueurActif.id,
                cartes: deckDeDepart
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
    
    deckCountEl.textContent = cartesDuDeck.length + ' carte' + (cartesDuDeck.length > 1 ? 's' : '');
    
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

    const isSpectateur = (mesDroits === 'spectateur');

    listeAffichee.forEach((carte) => {
        const indexReel = cartesDuDeck.indexOf(carte);
        const item = document.createElement('div');
        item.className = 'card-item';
        item.innerHTML = '<div class="card-details">' +
                '<h4><span class="card-badge">' + carte.cote + '</span> ' + carte.nom + '</h4>' +
                '<p><strong>Effet :</strong> ' + (carte.effet || 'Aucun') + '</p>' +
                '<p style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">' +
                    '<small style="color: #666;">Zone : ' + (carte.zone || 'Inconnue') + ' | Type : ' + (carte.type || '-') + '</small>' +
                    '<strong style="color: #8b0000; font-size: 0.9rem;">Val: ' + (carte.valeur || 0) + '</strong>' +
                '</p>' +
            '</div>' +
            (isSpectateur ? '' : '<button type="button" class="btn-action btn-danger" onclick="retirerDuDeck(' + indexReel + ')">Retirer</button>');
        deckListeEl.appendChild(item);
    });
}

function afficherCatalogue(liste) {
    if (!catalogueListeEl) return;
    catalogueListeEl.innerHTML = '';

    if (liste.length === 0) {
        catalogueListeEl.innerHTML = '<p style="text-align: center; font-style: italic;">Aucune carte trouvée.</p>';
        return;
    }
    
    const isSpectateur = (mesDroits === 'spectateur');

    liste.forEach(carte => {
        const limite = parseInt(carte.exemplaire) || 1;
        const utilisees = compteCartesUtilisees[carte.cote] || 0;
        const dispo = limite - utilisees;
        
        const btnDisabled = (dispo <= 0 || isSpectateur) ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';
        const texteDispo = dispo > 0 
            ? '<span style="color: #2e8b57; font-weight: bold;">' + dispo + '/' + limite + ' dispo</span>' 
            : '<span style="color: #8b0000; font-weight: bold;">0/' + limite + ' dispo</span>';

        const item = document.createElement('div');
        item.className = 'card-item';
        item.innerHTML = '<div class="card-details" style="width: 100%;">' +
                '<h4><span class="card-badge">' + carte.cote + '</span> ' + carte.nom + '</h4>' +
                '<p><strong>Effet :</strong> ' + (carte.effet || 'Aucun') + '</p>' +
                '<p style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">' +
                    '<small style="color: #666;">Zone : ' + (carte.zone || 'Inconnue') + ' | Type : ' + (carte.type || '-') + '</small>' +
                    '<small>' + texteDispo + '</small>' +
                '</p>' +
            '</div>' +
            '<button type="button" class="btn-action" onclick="ajouterAuDeck(\'' + carte.cote + '\')" ' + btnDisabled + '>+ Ajouter</button>';
        catalogueListeEl.appendChild(item);
    });
}

function rafraichirCatalogueAffichage() {
    const query = searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : '';
    if (query) {
        searchInput.dispatchEvent(new Event('input'));
    } else {
        afficherCatalogue(toutesLesCartes);
    }
}

async function ajouterAuDeck(cote) {
    const currentUserId = pb.authStore.model?.id;
    if (currentUserId && currentUserId !== createurAventureId) {
        const monAcces = participantsAventure.find(p => normaliserIdUtilisateur(p.utilisateur) === currentUserId);
        if (!monAcces) {
            redirigerExpulsion();
            return;
        }
    }
    if (mesDroits === 'spectateur') {
        alert("Mode lecture seule : vous n'avez pas l'autorisation de modifier ce deck.");
        return;
    }
    if (!deckRecordActif) {
        alert("Veuillez sélectionner un joueur d'abord.");
        return;
    }

    const carteTrouvee = toutesLesCartes.find(c => c.cote === cote);
    if (!carteTrouvee) return;

    const limite = parseInt(carteTrouvee.exemplaire) || 1;
    const utilisees = compteCartesUtilisees[cote] || 0;

    if (utilisees >= limite) {
        alert('Limite atteinte pour "' + carteTrouvee.nom + '" !\n\nCette carte est limitée à ' + limite + ' exemplaire(s) partagé(s) entre tous les héros de cette aventure.');
        return; 
    }

    cartesDuDeck.push(carteTrouvee);
    compteCartesUtilisees[cote] = utilisees + 1;
    afficherDeck();
    rafraichirCatalogueAffichage();
    sauvegarderDeck();
}

async function retirerDuDeck(index) {
    const currentUserId = pb.authStore.model?.id;
    if (currentUserId && currentUserId !== createurAventureId) {
        const monAcces = participantsAventure.find(p => normaliserIdUtilisateur(p.utilisateur) === currentUserId);
        if (!monAcces) {
            redirigerExpulsion();
            return;
        }
    }
    if (mesDroits === 'spectateur') {
        alert("Mode lecture seule : vous n'avez pas l'autorisation de modifier ce deck.");
        return;
    }
    if (!deckRecordActif) return;
    
    const carteRetiree = cartesDuDeck[index];
    cartesDuDeck.splice(index, 1);
    
    if (carteRetiree && compteCartesUtilisees[carteRetiree.cote]) {
        compteCartesUtilisees[carteRetiree.cote]--;
    }

    afficherDeck();
    rafraichirCatalogueAffichage();
    sauvegarderDeck();
}

let timerSauvegardeDeck = null;
let sauvegardeEnCours = false;

async function executerSauvegardeDeck() {
    if (!deckRecordActif) return;
    try {
        sauvegardeEnCours = true;
        const listeCotes = cartesDuDeck.map(c => c.cote);
        const updated = await pb.collection('decks').update(deckRecordActif.id, { cartes: listeCotes }, { requestKey: null });
        deckRecordActif = updated;
    } catch (err) {
        console.error("Erreur de sauvegarde :", err);
    } finally {
        sauvegardeEnCours = false;
        // CORRECTION DU BUG DE SYNCHRONISATION
        timerSauvegardeDeck = null; 
    }
}

function sauvegarderDeck() {
    clearTimeout(timerSauvegardeDeck);
    timerSauvegardeDeck = setTimeout(async () => {
        await executerSauvegardeDeck();
    }, 250);
}

async function majCompteCartes() {
    compteCartesUtilisees = {};
    if (listeJoueurs.length === 0) return;
    
    const filtres = listeJoueurs.map(j => 'joueur = "' + j.id + '"').join(' || ');
    try {
        const decks = await pb.collection('decks').getFullList({ filter: filtres, requestKey: null });
        decks.forEach(d => {
            if (d.cartes && Array.isArray(d.cartes)) {
                d.cartes.forEach(cote => {
                    compteCartesUtilisees[cote] = (compteCartesUtilisees[cote] || 0) + 1;
                });
            }
        });
    } catch(err) {
        console.error("Erreur lors du calcul des cartes disponibles :", err);
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

// ==========================================
// GESTION DU TEMPS RÉEL (SYNCHRONISATION EN DIRECT SANS RECHARGER)
// ==========================================
let timerMajCatalogue = null;
function debouncedMajCartesCatalogue() {
    clearTimeout(timerMajCatalogue);
    timerMajCatalogue = setTimeout(async () => {
        await majCompteCartes();
        rafraichirCatalogueAffichage();
    }, 150);
}

let timerActualiserJoueurs = null;
function debouncedActualiserJoueurs() {
    clearTimeout(timerActualiserJoueurs);
    timerActualiserJoueurs = setTimeout(async () => {
        await actualiserJoueursEtSlots();
    }, 150);
}

async function actualiserJoueursEtSlots() {
    try {
        listeJoueurs = await pb.collection('joueurs').getFullList({
            filter: `aventure = "${aventureId}"`,
            sort: 'created',
            requestKey: null
        });

        invitationsAventure = await pb.collection('invitations_aventures').getFullList({
            filter: `aventure = "${aventureId}"`,
            expand: 'receveur',
            requestKey: null
        });

        await chargerParticipants();

        const userId = pb.authStore.model?.id;
        if (userId && userId !== createurAventureId) {
            const encoreParticipant = participantsAventure.some(p => normaliserIdUtilisateur(p.utilisateur) === userId);

            if (!encoreParticipant) {
                redirigerExpulsion();
                return;
            }
        }

        if (joueurActif) {
            const joueurExiste = listeJoueurs.find(j => j.id === joueurActif.id);
            if (joueurExiste) {
                if (joueurExiste.nom_provisoire !== joueurActif.nom_provisoire) {
                    joueurActif = joueurExiste;
                    if (deckTitreJoueurEl) {
                        deckTitreJoueurEl.textContent = 'Deck : ' + (joueurActif.nom_provisoire || 'Héros');
                    }
                } else {
                    joueurActif = joueurExiste;
                }
            } else {
                joueurActif = listeJoueurs.length > 0 ? listeJoueurs[0] : null;
                if (joueurActif) {
                    await selectionnerJoueur(joueurActif.id);
                } else {
                    cartesDuDeck = [];
                    deckRecordActif = null;
                    if (deckTitreJoueurEl) deckTitreJoueurEl.textContent = 'Aucun héros sélectionné';
                    afficherDeck();
                }
            }
        } else if (listeJoueurs.length > 0) {
            joueurActif = listeJoueurs[0];
            await selectionnerJoueur(joueurActif.id);
        }

        afficherJoueurs();
        debouncedMajCartesCatalogue();

        if (modalInvitation && modalInvitation.style.display === 'flex') {
            await chargerAmisPourInvitation();
        }
    } catch (err) {
        console.error("Erreur actualisation joueurs et slots :", err);
    }
}

async function abonnerTempsReelDeck() {
    try {
        const userId = pb.authStore.model?.id;

        await pb.collection('decks').subscribe('*', async (e) => {
            const joueurAssocie = listeJoueurs.find(j => j.id === e.record.joueur);
            if (!joueurAssocie) return;

            debouncedMajCartesCatalogue();

            if (joueurActif && e.record.joueur === joueurActif.id) {
                const serverCotes = Array.isArray(e.record.cartes) ? e.record.cartes : [];
                const localCotes = cartesDuDeck.map(c => c.cote);
                const estIdentique = serverCotes.length === localCotes.length &&
                    serverCotes.every((val, idx) => val === localCotes[idx]);

                if (!estIdentique && !timerSauvegardeDeck && !sauvegardeEnCours) {
                    deckRecordActif = e.record;
                    cartesDuDeck = serverCotes
                        .map(cote => toutesLesCartes.find(c => c.cote === cote))
                        .filter(Boolean);
                    afficherDeck();
                } else if (estIdentique) {
                    deckRecordActif = e.record;
                }
            }
        });

        await pb.collection('invitations_aventures').subscribe('*', async (e) => {
            if (e.record && e.record.aventure && e.record.aventure !== aventureId) return;

            try {
                invitationsAventure = await pb.collection('invitations_aventures').getFullList({
                    filter: `aventure = "${aventureId}"`,
                    expand: 'receveur',
                    requestKey: null
                });
                afficherJoueurs();
                if (modalInvitation && modalInvitation.style.display === 'flex') {
                    await chargerAmisPourInvitation();
                }
            } catch (err) {
                console.error("Erreur rafraîchissement invitations :", err);
            }
        });

        await pb.collection('joueurs').subscribe('*', (e) => {
            if (e.record && e.record.aventure && e.record.aventure !== aventureId) return;
            debouncedActualiserJoueurs();
        });

        await pb.collection('participants').subscribe('*', async (e) => {
            const currentUserId = pb.authStore.model?.id;
            const recUserId = normaliserIdUtilisateur(e.record?.utilisateur);

            if (e.action === 'delete' && (recUserId === currentUserId || e.record?.id === monParticipantId)) {
                redirigerExpulsion();
                return;
            }

            if (e.record && e.record.aventures && e.record.aventures !== aventureId) return;

            await chargerParticipants();

            if (currentUserId && currentUserId !== createurAventureId) {
                const estToujoursParticipant = participantsAventure.some(p => normaliserIdUtilisateur(p.utilisateur) === currentUserId);
                if (!estToujoursParticipant) {
                    redirigerExpulsion();
                    return;
                }
            }

            afficherJoueurs();
            afficherDeck();
            rafraichirCatalogueAffichage();
        });

        await pb.collection('aventures').subscribe('*', (e) => {
            if (!e.record || e.record.id !== aventureId) return;

            if (e.action === 'delete') {
                alert("Cette aventure a été supprimée par son créateur.");
                window.location.href = "accueil.html";
                return;
            }

            if (e.action === 'update' && e.record.titre) {
                if (titreAventureEl) titreAventureEl.textContent = e.record.titre;
            }
        });

        await pb.collection('amis').subscribe('*', (e) => {
            if (modalInvitation && modalInvitation.style.display === 'flex') {
                if (!e.record || e.record.demandeur === userId || e.record.receveur === userId) {
                    chargerAmisPourInvitation();
                }
            }
        });

    } catch (err) {
        console.error("Erreur initialisation temps réel (deck) :", err);
    }
}

function desabonnerTempsReelDeck() {
    pb.collection('decks').unsubscribe('*').catch(() => {});
    pb.collection('invitations_aventures').unsubscribe('*').catch(() => {});
    pb.collection('joueurs').unsubscribe('*').catch(() => {});
    pb.collection('participants').unsubscribe('*').catch(() => {});
    pb.collection('aventures').unsubscribe('*').catch(() => {});
    pb.collection('amis').unsubscribe('*').catch(() => {});
}

window.addEventListener('beforeunload', () => {
    if (timerSauvegardeDeck) {
        clearTimeout(timerSauvegardeDeck);
        executerSauvegardeDeck();
    }
    desabonnerTempsReelDeck();
});

initialiserPage();