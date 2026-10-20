const btnMonCompte = document.getElementById('btn-mon-compte');
const modalCompte = document.getElementById('modal-compte');
const fermerModalCompte = document.getElementById('fermer-modal-compte');
const formMonCompte = document.getElementById('form-mon-compte');
const btnSupprimerCompte = document.getElementById('btn-supprimer-compte');

if (btnMonCompte) {
    btnMonCompte.addEventListener('click', () => {
        document.getElementById('compte-new-pseudo').value = pb.authStore.model.username || pb.authStore.model.name || '';
        document.getElementById('compte-new-email').value = pb.authStore.model.email || '';
        document.getElementById('compte-new-mdp').value = '';
        document.getElementById('compte-new-mdp-confirm').value = '';
        document.getElementById('compte-old-mdp').value = '';
        modalCompte.style.display = 'flex';
    });
}

if (fermerModalCompte) {
    fermerModalCompte.addEventListener('click', () => { modalCompte.style.display = 'none'; });
}

if (formMonCompte) {
    formMonCompte.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPseudo = document.getElementById('compte-new-pseudo').value.trim();
        const newMdp = document.getElementById('compte-new-mdp').value;
        const newMdpConfirm = document.getElementById('compte-new-mdp-confirm').value;
        const oldMdp = document.getElementById('compte-old-mdp').value;

        let updateData = { "username": newPseudo, "name": newPseudo };

        if (newMdp) {
            if (newMdp !== newMdpConfirm) { alert("Les nouveaux mots de passe ne correspondent pas !"); return; }
            if (!oldMdp) { alert("Vous devez renseigner votre ancien mot de passe pour le modifier !"); return; }
            updateData.oldPassword = oldMdp; updateData.password = newMdp; updateData.passwordConfirm = newMdpConfirm;
        }

        try {
            if (newPseudo !== pb.authStore.model.username) {
                try {
                    const verification = await pb.collection('users').getFirstListItem(`(username = "${newPseudo}" || name = "${newPseudo}") && id != "${pb.authStore.model.id}"`);
                    if (verification) { alert("Ce pseudo est déjà pris par un autre joueur."); return; }
                } catch (err) { }
            }
            await pb.collection('users').update(pb.authStore.model.id, updateData);
            alert("Profil mis à jour avec succès !");
            
            const spanPseudo = document.getElementById('compte-pseudo');
            if (spanPseudo) spanPseudo.textContent = newPseudo;
            pb.authStore.model.username = newPseudo; pb.authStore.model.name = newPseudo;
            modalCompte.style.display = 'none';
        } catch (err) { alert("Erreur lors de la mise à jour."); }
    });
}

if (btnSupprimerCompte) {
    btnSupprimerCompte.addEventListener('click', async () => {
        if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT votre compte ? Cette action est irréversible.")) return;
        if (prompt("Pour confirmer, tapez 'SUPPRIMER' en majuscules :") !== "SUPPRIMER") { alert("Suppression annulée."); return; }
        
        try {
            const userId = pb.authStore.model.id;
            const mesJoueurs = await pb.collection('joueurs').getFullList({ filter: `utilisateur = "${userId}"`, expand: 'aventure' });
            for (const j of mesJoueurs) {
                if (j.expand?.aventure?.createur && j.expand.aventure.createur !== userId) {
                    await pb.collection('joueurs').update(j.id, { utilisateur: j.expand.aventure.createur });
                }
            }
            const mesAmis = await pb.collection('amis').getFullList({ filter: `demandeur = "${userId}" || receveur = "${userId}"` });
            for (const ami of mesAmis) await pb.collection('amis').delete(ami.id);
            
            const mesParticipations = await pb.collection('participants').getFullList({ filter: `utilisateur = "${userId}"` });
            for (const p of mesParticipations) await pb.collection('participants').delete(p.id);
            
            const mesInvitations = await pb.collection('invitations_aventures').getFullList({ filter: `demandeur = "${userId}" || receveur = "${userId}"` });
            for (const inv of mesInvitations) await pb.collection('invitations_aventures').delete(inv.id);

            await pb.collection('users').delete(userId);
            alert("Votre compte a été supprimé avec succès. Au revoir !");
            pb.authStore.clear();
            window.location.href = "connexion.html";
        } catch (err) { alert("Erreur lors de la suppression."); }
    });
}