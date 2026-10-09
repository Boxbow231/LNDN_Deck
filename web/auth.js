// 1. Initialisation de la connexion à ton serveur PocketBase local
const pb = new PocketBase('http://127.0.0.1:8090');

// Récupération du nom de la page actuelle pour adapter le comportement
const currentPage = window.location.pathname;

// 2. GESTION DES REDIRECTIONS AUTOMATIQUES (Persistance de session)
// Si le joueur est connecté et tente d'aller sur connexion/inscription -> on le force vers l'accueil
if (pb.authStore.isValid && (currentPage.includes('connexion.html') || currentPage.includes('inscription.html'))) {
    window.location.href = 'accueil.html';
}
// Si le joueur N'EST PAS connecté et tente d'aller sur l'accueil -> on le force vers la connexion
if (!pb.authStore.isValid && currentPage.includes('accueil.html')) {
    window.location.href = 'connexion.html';
}

// 3. GESTION DE L'INSCRIPTION
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Empêche la page de se recharger (comportement HTML par défaut)

        // On récupère les valeurs tapées par le joueur
        const pseudo = document.getElementById('reg-pseudo').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-passwordConfirm').value;

        // Petite vérification de base
        if (password !== passwordConfirm) {
            alert("Les mots de passe ne correspondent pas !");
            return;
        }

        try {
            // Création de l'utilisateur dans la base de données PocketBase
            const data = {
                "name": pseudo,
                "email": email,
                "emailVisibility": true,
                "password": password,
                "passwordConfirm": passwordConfirm
            };
            
            await pb.collection('users').create(data);
            
            alert('Aventure créée avec succès ! Tu peux maintenant te connecter.');
            window.location.href = 'connexion.html'; // Redirection vers la connexion
            
        } catch (error) {
            console.error("Erreur PocketBase :", error);
            alert("Erreur lors de l'inscription. L'email est peut-être déjà utilisé.");
        }
    });
}

// 4. GESTION DE LA CONNEXION
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            // Authentification auprès de PocketBase
            const authData = await pb.collection('users').authWithPassword(email, password);
            
            // Si le code arrive ici, c'est que la connexion a réussi !
            window.location.href = 'accueil.html';
            
        } catch (error) {
            console.error("Erreur PocketBase :", error);
            alert("Identifiants incorrects. Les Ombres vous bloquent le passage.");
        }
    });
}

// 5. GESTION DE LA DÉCONNEXION
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        pb.authStore.clear(); // Supprime le jeton de sécurité du navigateur
        window.location.href = 'connexion.html'; // Renvoie à la page de connexion
    });
}