const currentPage = window.location.pathname;

// Persistance de session et sécurité
if (pb.authStore.isValid && (currentPage.includes('connexion.html') || currentPage.includes('inscription.html'))) {
    window.location.href = 'accueil.html';
}
if (!pb.authStore.isValid && currentPage.includes('accueil.html')) {
    window.location.href = 'connexion.html';
}