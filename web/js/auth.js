const isLocal = !window.location.hostname || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const pbUrl = isLocal ? 'http://127.0.0.1:8090' : '/';
const pb = new PocketBase(pbUrl);

// 1. Initialisation (savoir sur quelle page on est)
const currentPage = window.location.pathname;

// 2. GESTION DES REDIRECTIONS AUTOMATIQUES (Persistance de session)
if (pb.authStore.isValid && (currentPage.includes('connexion.html') || currentPage.includes('inscription.html'))) {
    window.location.href = 'accueil.html';
}
if (!pb.authStore.isValid && currentPage.includes('accueil.html')) {
    window.location.href = 'connexion.html';
}

// 3. GESTION DE L'INSCRIPTION
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const pseudo = document.getElementById('reg-pseudo').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-passwordConfirm').value;

        if (password !== passwordConfirm) {
            alert("Les mots de passe ne correspondent pas !");
            return;
        }

        try {
            // Création du compte (on met le pseudo dans 'username' et 'name')
            const data = {
                "username": pseudo,
                "name": pseudo,
                "email": email,
                "emailVisibility": true,
                "password": password,
                "passwordConfirm": passwordConfirm
            };
            
            await pb.collection('users').create(data);
            
            alert('Aventure créée avec succès ! Tu peux maintenant te connecter.');
            window.location.href = 'connexion.html';
            
        } catch (error) {
            console.error("Erreur PocketBase :", error);
            const msg = error?.response?.message || error?.message || "";
            let detailStr = "";
            if (error?.response?.data) {
                detailStr = Object.entries(error.response.data).map(([k, v]) => k + ": " + (v.message || v)).join(", ");
            }
            alert("Impossible de créer l'aventure : " + (detailStr || msg || "Erreur de connexion à la base de données."));
        }
    });
}

// 4. GESTION DE LA CONNEXION
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            window.location.href = 'accueil.html';
            
        } catch (error) {
            // ---> ON EFFACE LA SESSION CASSÉE ICI POUR NE PAS ÊTRE REDIRIGÉ À TORT <---
            pb.authStore.clear();
            
            console.error("Erreur PocketBase :", error);
            alert("Identifiants incorrects. Ce mail n'existe pas ou le mot de passe est faux. Les Ombres vous bloquent le passage.");
        }
    });
}

// 5. GESTION DE LA DÉCONNEXION
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        pb.authStore.clear(); 
        window.location.href = 'connexion.html'; 
    });
}