let timerRafraichirAmis = null;
function rafraichirListesAmis() {
    clearTimeout(timerRafraichirAmis);
    timerRafraichirAmis = setTimeout(async () => {
        if (window.chargerAmis) await window.chargerAmis();
        if (window.chargerDemandes) await window.chargerDemandes();
    }, 120);
}

async function abonnerTempsReelAmis() {
    try {
        await pb.collection('amis').subscribe('*', (e) => {
            const userId = window.getUserId();
            if (!e.record || e.record.demandeur === userId || e.record.receveur === userId) {
                rafraichirListesAmis();
            }
        });
    } catch (err) { console.error("Erreur d'abonnement temps réel (amis) :", err); }
}

window.addEventListener('beforeunload', () => {
    pb.collection('amis').unsubscribe('*').catch(() => {});
});

async function initialiserPage() {
    if (!pb.authStore.isValid || !window.getUserId()) {
        pb.authStore.clear();
        window.location.href = "connexion.html";
        return;
    }

    const userGreetingEl = document.getElementById('user-greeting');
    const userModel = pb.authStore.record || pb.authStore.model;
    if (userGreetingEl && userModel) {
        const nomJoueur = userModel.username || userModel.name || 'Héros';
        userGreetingEl.innerHTML = `👤 ${nomJoueur}`;
    }

    if (window.chargerAmis) await window.chargerAmis();
    if (window.chargerDemandes) await window.chargerDemandes();

    abonnerTempsReelAmis();
}

// Lancement de la page
initialiserPage();