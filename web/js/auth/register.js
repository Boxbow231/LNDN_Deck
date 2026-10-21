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