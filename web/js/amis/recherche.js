if (btnRechercher) {
    btnRechercher.addEventListener('click', async () => {
        const query = inputRecherche.value.trim().toLowerCase();
        if (!query) return;

        resultatsRecherche.innerHTML = '<p style="text-align: center;">Recherche...</p>';

        try {
            const userId = window.getUserId();
            const tousLesUsers = await pb.collection('users').getFullList();
            const mesRelations = await pb.collection('amis').getFullList({
                filter: `demandeur = "${userId}" || receveur = "${userId}"`
            });

            const joueursTrouves = tousLesUsers.filter(user => {
                if (user.id === userId) return false; 
                
                const pseudo = (user.username || '').toLowerCase();
                const nom = (user.name || '').toLowerCase();
                if (!pseudo.includes(query) && !nom.includes(query)) return false;

                const dejaEnRelation = mesRelations.find(rel => rel.demandeur === user.id || rel.receveur === user.id);
                if (dejaEnRelation) return false;

                return true; 
            });

            resultatsRecherche.innerHTML = '';

            if (joueursTrouves.length === 0) {
                resultatsRecherche.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucun nouveau joueur trouvé ou vous êtes déjà amis.</p>';
                return;
            }

            joueursTrouves.slice(0, 10).forEach(user => {
                const div = document.createElement('div');
                div.className = 'player-item';
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;';
                div.innerHTML = `
                    <strong style="font-size: 1.2rem; font-family: 'Cinzel', serif;">${user.username || user.name || 'Héros anonyme'}</strong>
                    <button type="button" class="btn-action" onclick="ajouterAmi('${user.id}')" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; width: auto; min-width: 100px;">+ Ajouter</button>
                `;
                resultatsRecherche.appendChild(div);
            });

        } catch (err) {
            console.error("Erreur détaillée :", err);
            resultatsRecherche.innerHTML = '<p style="color: red; text-align: center;">Erreur de recherche.</p>';
        }
    });
}

window.ajouterAmi = async function(receveurId) {
    try {
        const userId = window.getUserId();
        const toutesRelations = await pb.collection('amis').getFullList();
        
        const dejaAmi = toutesRelations.find(rel => 
            (rel.demandeur === userId && rel.receveur === receveurId) ||
            (rel.demandeur === receveurId && rel.receveur === userId)
        );

        if (dejaAmi) {
            alert("Une demande a déjà été envoyée ou vous êtes déjà amis avec ce joueur.");
            return; 
        }

        await pb.collection('amis').create({ demandeur: userId, receveur: receveurId, statut: "attente" });
        alert("Demande d'ami envoyée !");
        
        document.getElementById('resultats-recherche').innerHTML = '';
        document.getElementById('recherche-pseudo').value = '';
        
        if (window.chargerDemandes) window.chargerDemandes();
        if (window.chargerAmis) window.chargerAmis();

    } catch (err) {
        console.error(err);
        alert("Erreur lors de l'envoi de la demande.");
    }
};