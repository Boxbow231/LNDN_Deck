const logoutBtn = document.getElementById('logout-btn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        pb.authStore.clear(); 
        window.location.href = 'connexion.html'; 
    });
}