let timerAventures = null;
function debouncedChargerAventures() {
    clearTimeout(timerAventures);
    timerAventures = setTimeout(async () => { await chargerAventures(); }, 150);
}

let timerInvitations = null;
function debouncedChargerInvitations() {
    clearTimeout(timerInvitations);
    timerInvitations = setTimeout(async () => { await chargerInvitationsAventures(); }, 150);
}

async function abonnerTempsReelAccueil() {
    try {
        const userId = pb.authStore.model?.id;
        await pb.collection('invitations_aventures').subscribe('*', (e) => {
            if (!e.record || e.record.receveur === userId || e.record.demandeur === userId) debouncedChargerInvitations();
        });
        await pb.collection('aventures').subscribe('*', () => debouncedChargerAventures());
        await pb.collection('joueurs').subscribe('*', (e) => {
            if (!e.record || normaliserIdUtilisateur(e.record?.utilisateur) === userId) debouncedChargerAventures();
        });
        await pb.collection('participants').subscribe('*', (e) => {
            if (!e.record || normaliserIdUtilisateur(e.record?.utilisateur) === userId) debouncedChargerAventures();
        });
    } catch (err) { console.error("Erreur d'abonnement temps réel (accueil) :", err); }
}

window.addEventListener('beforeunload', () => {
    pb.collection('invitations_aventures').unsubscribe('*').catch(() => { });
    pb.collection('aventures').unsubscribe('*').catch(() => { });
    pb.collection('joueurs').unsubscribe('*').catch(() => { });
    pb.collection('participants').unsubscribe('*').catch(() => { });
});

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

// Lancement au démarrage de la page
initialiserAccueil();