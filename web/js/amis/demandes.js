window.chargerDemandes = async function() {
    try {
        const userId = window.getUserId();
        const toutesRelations = await pb.collection('amis').getFullList({ expand: 'demandeur' });
        const mesDemandes = toutesRelations.filter(rel => rel.receveur === userId && rel.statut === 'attente');

        mesDemandes.sort((a, b) => new Date(a.created) - new Date(b.created));
        demandesListe.innerHTML = '';

        if (mesDemandes.length === 0) {
            demandesListe.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucune demande en attente.</p>';
            return;
        }

        mesDemandes.forEach(demande => {
            const demandeur = demande.expand?.demandeur;
            if (!demandeur) return; 

            const div = document.createElement('div');
            div.id = `demande-${demande.id}`;
            div.className = 'player-item';
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;';
            div.innerHTML = `
                <strong style="font-size: 1.2rem; font-family: 'Cinzel', serif;">${demandeur.username || demandeur.name || 'Héros inconnu'}</strong>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-action" onclick="accepterDemande('${demande.id}')" style="padding: 0.3rem 0.6rem; background-color: #2e8b57; border-color: #2e8b57; font-size: 0.8rem; width: auto;">✔</button>
                    <button class="btn-action btn-danger" onclick="refuserDemande('${demande.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; width: auto;">✖</button>
                </div>
            `;
            demandesListe.appendChild(div);
        });
    } catch (err) { console.error("Erreur chargement demandes :", err); }
};

window.accepterDemande = async function(idAmiTable) {
    const ligne = document.getElementById(`demande-${idAmiTable}`);
    if (ligne) ligne.remove();
    if (demandesListe.children.length === 0) {
        demandesListe.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucune demande en attente.</p>';
    }

    try {
        await pb.collection('amis').update(idAmiTable, { statut: 'accepte' });
        if (window.chargerAmis) window.chargerAmis();
    } catch (err) {
        console.error(err);
        window.chargerDemandes(); 
    }
};

window.refuserDemande = async function(idAmiTable) {
    const ligne = document.getElementById(`demande-${idAmiTable}`);
    if (ligne) ligne.remove();
    if (demandesListe.children.length === 0) {
        demandesListe.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucune demande en attente.</p>';
    }

    try {
        await pb.collection('amis').delete(idAmiTable);
    } catch (err) {
        console.error(err);
        window.chargerDemandes();
    }
};