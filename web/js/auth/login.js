const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            
            // 3. VÉRIFICATION : Est-ce que l'e-mail a été validé ?
            if (!pb.authStore.model.verified) {
                pb.authStore.clear(); // On le déconnecte immédiatement
                alert("Halte ! Tu dois d'abord valider ton adresse e-mail en cliquant sur le lien que nous t'avons envoyé.");
                return;
            }

            window.location.href = 'accueil.html';
            
        } catch (error) {
            pb.authStore.clear();
            console.error("Erreur PocketBase :", error);
            alert("Identifiants incorrects. Ce mail n'existe pas ou le mot de passe est faux. Les Ombres vous bloquent le passage.");
        }
    });
}