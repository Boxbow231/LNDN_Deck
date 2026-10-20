let timerMajCatalogue = null;
window.debouncedMajCartesCatalogue = function() {
    clearTimeout(timerMajCatalogue);
    timerMajCatalogue = setTimeout(async () => { await window.majCompteCartes(); window.rafraichirCatalogueAffichage(); }, 150);
};

let timerActualiserJoueurs = null;
window.debouncedActualiserJoueurs = function() {
    clearTimeout(timerActualiserJoueurs);
    timerActualiserJoueurs = setTimeout(async () => { await window.actualiserJoueursEtSlots(); }, 150);
};

window.actualiserJoueursEtSlots = async function() {
    try {
        listeJoueurs = await pb.collection('joueurs').getFullList({ filter: `aventure = "${aventureId}"`, sort: 'created', requestKey: null });
        invitationsAventure = await pb.collection('invitations_aventures').getFullList({ filter: `aventure = "${aventureId}"`, expand: 'receveur', requestKey: null });
        await window.chargerParticipants();

        const userId = pb.authStore.model?.id;
        if (userId && userId !== createurAventureId && !participantsAventure.some(p => window.normaliserIdUtilisateur(p.utilisateur) === userId)) { window.redirigerExpulsion(); return; }

        if (joueurActif) {
            const joueurExiste = listeJoueurs.find(j => j.id === joueurActif.id);
            if (joueurExiste) {
                joueurActif = joueurExiste;
                if (deckTitreJoueurEl) deckTitreJoueurEl.textContent = 'Deck : ' + (joueurActif.nom_provisoire || 'Héros');
            } else {
                joueurActif = listeJoueurs.length > 0 ? listeJoueurs[0] : null;
                if (joueurActif) await window.selectionnerJoueur(joueurActif.id);
                else { cartesDuDeck = []; deckRecordActif = null; if (deckTitreJoueurEl) deckTitreJoueurEl.textContent = 'Aucun héros sélectionné'; window.afficherDeck(); }
            }
        } else if (listeJoueurs.length > 0) { joueurActif = listeJoueurs[0]; await window.selectionnerJoueur(joueurActif.id); }

        window.afficherJoueurs(); window.debouncedMajCartesCatalogue();
        if (modalInvitation && modalInvitation.style.display === 'flex') await window.chargerAmisPourInvitation();
    } catch (err) { console.error(err); }
};

async function abonnerTempsReelDeck() {
    try {
        const userId = pb.authStore.model?.id;

        await pb.collection('decks').subscribe('*', async (e) => {
            const joueurAssocie = listeJoueurs.find(j => j.id === e.record.joueur);
            if (!joueurAssocie) return;
            window.debouncedMajCartesCatalogue();
            if (joueurActif && e.record.joueur === joueurActif.id) {
                const serverCotes = Array.isArray(e.record.cartes) ? e.record.cartes : [];
                const localCotes = cartesDuDeck.map(c => c.cote);
                const estIdentique = serverCotes.length === localCotes.length && serverCotes.every((val, idx) => val === localCotes[idx]);
                if (!estIdentique) {
                    deckRecordActif = e.record;
                    cartesDuDeck = serverCotes.map(cote => toutesLesCartes.find(c => c.cote === cote)).filter(Boolean);
                    window.afficherDeck();
                } else if (estIdentique) { deckRecordActif = e.record; }
            }
        });

        await pb.collection('invitations_aventures').subscribe('*', async (e) => {
            if (e.record && e.record.aventure && e.record.aventure !== aventureId) return;
            try {
                invitationsAventure = await pb.collection('invitations_aventures').getFullList({ filter: `aventure = "${aventureId}"`, expand: 'receveur', requestKey: null });
                window.afficherJoueurs(); if (modalInvitation && modalInvitation.style.display === 'flex') await window.chargerAmisPourInvitation();
            } catch (err) {}
        });

        await pb.collection('joueurs').subscribe('*', (e) => {
            if (e.record && e.record.aventure && e.record.aventure !== aventureId) return;
            window.debouncedActualiserJoueurs();
        });

        await pb.collection('participants').subscribe('*', async (e) => {
            const currentUserId = pb.authStore.model?.id;
            const recUserId = window.normaliserIdUtilisateur(e.record?.utilisateur);
            if (e.action === 'delete' && (recUserId === currentUserId || e.record?.id === monParticipantId)) { window.redirigerExpulsion(); return; }
            if (e.record && e.record.aventures && e.record.aventures !== aventureId) return;
            await window.chargerParticipants();
            if (currentUserId && currentUserId !== createurAventureId && !participantsAventure.some(p => window.normaliserIdUtilisateur(p.utilisateur) === currentUserId)) { window.redirigerExpulsion(); return; }
            window.afficherJoueurs(); window.afficherDeck(); window.rafraichirCatalogueAffichage();
        });

        await pb.collection('aventures').subscribe('*', (e) => {
            if (!e.record || e.record.id !== aventureId) return;
            if (e.action === 'delete') { alert("Aventure supprimée."); window.location.href = "accueil.html"; return; }
            if (e.action === 'update') {
                if (e.record.titre && titreAventureEl) titreAventureEl.textContent = e.record.titre;
                if (e.record.foire !== undefined) { foireCartes = window.extraireFoireDeAventure(e.record); window.afficherFoire(); }
            }
        });
    } catch (err) {}
}

window.addEventListener('beforeunload', () => {
    pb.collection('decks').unsubscribe('*').catch(() => {});
    pb.collection('invitations_aventures').unsubscribe('*').catch(() => {});
    pb.collection('joueurs').unsubscribe('*').catch(() => {});
    pb.collection('participants').unsubscribe('*').catch(() => {});
    pb.collection('aventures').unsubscribe('*').catch(() => {});
});

async function initialiserPage() {
    if (!pb.authStore.isValid) { window.location.href = "connexion.html"; return; }
    if (!aventureId) { alert("Aucun identifiant d'aventure."); window.location.href = "accueil.html"; return; }

    try {
        const userId = pb.authStore.model.id;
        const aventure = await pb.collection('aventures').getOne(aventureId, { requestKey: null });
        if (titreAventureEl) titreAventureEl.textContent = aventure.titre;
        foireCartes = window.extraireFoireDeAventure(aventure);
        createurAventureId = aventure.createur; 
        const estCreateur = (userId === createurAventureId);

        if (estCreateur) {
            try {
                const dejaParticipant = await pb.collection('participants').getFirstListItem(`aventures = "${aventureId}" && utilisateur = "${userId}"`, { requestKey: null });
                if (!dejaParticipant) await pb.collection('participants').create({ aventures: aventureId, utilisateur: userId, permission: 'admin' });
            } catch (err) { await pb.collection('participants').create({ aventures: aventureId, utilisateur: userId, permission: 'admin' }).catch(e => {}); }
        } else {
            let monParticipant = null;
            try { monParticipant = await pb.collection('participants').getFirstListItem(`aventures = "${aventureId}" && utilisateur = "${userId}"`, { requestKey: null }); } catch (e) { monParticipant = null; }
            if (!monParticipant) { window.redirigerExpulsion(); return; }
        }

        await window.chargerParticipants(); 
        toutesLesCartes = await pb.collection('cartes_butins').getFullList({ sort: 'cote', requestKey: null });
        await window.chargerJoueurs(userId);
        await window.majCompteCartes();
        window.afficherCatalogue(toutesLesCartes);
        
        window.afficherInvites();
        window.afficherFoire();
        abonnerTempsReelDeck();

    } catch (err) { alert(`Erreur: ${err.message}`); }
}

initialiserPage();