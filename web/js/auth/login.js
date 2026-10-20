const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            await pb.collection('users').authWithPassword(email, password);
            window.location.href = 'accueil.html';
        } catch (error) {
            // Efface la session cassée pour ne pas être redirigé à tort
            pb.authStore.clear();
            console.error("Erreur PocketBase :", error);
            alert("Identifiants incorrects. Ce mail n'existe pas ou le mot de passe est faux. Les Ombres vous bloquent le passage.");
        }
    });
}