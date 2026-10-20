window.chargerAmis = async function() {
    try {
        const userId = window.getUserId();
        const toutesRelations = await pb.collection('amis').getFullList({ expand: 'demandeur,receveur' });

        const mesAmis = toutesRelations.filter(rel => 
            (rel.demandeur === userId || rel.receveur === userId) && rel.statut === 'accepte'
        );

        mesAmis.sort((a, b) => {
            const amiA = a.demandeur === userId ? a.expand?.receveur : a.expand?.demandeur;
            const amiB = b.demandeur === userId ? b.expand?.receveur : b.expand?.demandeur;
            
            const nomA = (amiA?.username || amiA?.name || 'zzzz').toLowerCase();
            const nomB = (amiB?.username || amiB?.name || 'zzzz').toLowerCase();
            
            if (nomA < nomB) return -1;
            if (nomA > nomB) return 1;
            return new Date(a.created) - new Date(b.created);
        });

        amisListe.innerHTML = '';

        if (mesAmis.length === 0) {
            amisListe.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Vous n\'avez pas encore d\'amis.</p>';
            return;
        }

        mesAmis.forEach(rel => {
            const ami = rel.demandeur === userId ? rel.expand?.receveur : rel.expand?.demandeur;
            if (!ami) return; 

            const div = document.createElement('div');
            div.className = 'player-item';
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;';
            div.innerHTML = `
                <strong style="font-size: 1.2rem; font-family: 'Cinzel', serif;">${ami.username || ami.name || 'Héros inconnu'}</strong>
                <button class="btn-action btn-danger" onclick="supprimerAmi('${rel.id}')" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; width: auto; min-width: 100px;">Retirer</button>
            `;
            amisListe.appendChild(div);
        });
    } catch (err) { console.error("Erreur chargement amis :", err); }
};

window.supprimerAmi = async function(idAmiTable) {
    if (!confirm("Êtes-vous sûr de vouloir retirer ce compagnon de votre liste d'amis ?")) return;
    try {
        await pb.collection('amis').delete(idAmiTable);
        window.chargerAmis();
    } catch (err) {
        console.error("Erreur lors de la suppression de l'ami :", err);
        alert("Impossible de retirer cet ami.");
    }
};