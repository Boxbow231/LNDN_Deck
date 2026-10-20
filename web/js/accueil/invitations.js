async function chargerInvitationsAventures() {
    try {
        const userId = pb.authStore.model.id;
        const invitations = await pb.collection('invitations_aventures').getFullList({ filter: `receveur = "${userId}"`, expand: 'aventure,demandeur' });
        
        if (invitations.length > 0) {
            zoneInvitations.style.display = 'block';
            listeInvitations.innerHTML = '';
            invitations.forEach(inv => {
                const av = inv.expand?.aventure;
                const demandeur = inv.expand?.demandeur;
                if (!av || !demandeur) return;
                
                const div = document.createElement('div');
                div.id = `invit-av-${inv.id}`;
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background-color: #fff; border: 1px solid #ddd;';
                div.innerHTML = `
                    <div>
                        <strong style="font-family: 'Cinzel', serif;">${av.titre}</strong><br>
                        <small>Invité(e) par ${demandeur.username || demandeur.name}</small>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-action" onclick="accepterInvitationAventure('${inv.id}', '${av.id}')" style="padding: 0.3rem 0.6rem; background-color: #2e8b57; border-color: #2e8b57; font-size: 0.8rem; width: auto;">Rejoindre</button>
                        <button class="btn-action btn-danger" onclick="refuserInvitationAventure('${inv.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; width: auto;">Refuser</button>
                    </div>`;
                listeInvitations.appendChild(div);
            });
        } else { zoneInvitations.style.display = 'none'; }
    } catch (err) { console.error("Erreur chargement invitations d'aventure :", err); }
}

window.accepterInvitationAventure = async function (invitationId, aventureId) {
    const ligne = document.getElementById(`invit-av-${invitationId}`);
    if (ligne) ligne.remove();
    if (listeInvitations.children.length === 0) zoneInvitations.style.display = 'none';

    try {
        const userId = pb.authStore.model.id;
        const invitation = await pb.collection('invitations_aventures').getOne(invitationId);
        const emplacementId = invitation.emplacement || 1;

        const nouveauJoueur = await pb.collection('joueurs').create({ aventure: aventureId, utilisateur: userId, nom_provisoire: pb.authStore.model.username || pb.authStore.model.name || 'Héros invité', emplacement: emplacementId });
        await pb.collection('decks').create({ joueur: nouveauJoueur.id, cartes: DECKS_DE_BASE[emplacementId] || DECKS_DE_BASE[1] });
        
        try { await pb.collection('participants').create({ aventures: aventureId, utilisateur: userId, permission: 'deck' }); } catch (e) {}
        await pb.collection('invitations_aventures').delete(invitationId);

        chargerAventures();
        chargerInvitationsAventures();
    } catch (err) { chargerInvitationsAventures(); }
}

window.refuserInvitationAventure = async function (invitationId) {
    const ligne = document.getElementById(`invit-av-${invitationId}`);
    if (ligne) ligne.remove();
    if (listeInvitations.children.length === 0) zoneInvitations.style.display = 'none';

    try {
        await pb.collection('invitations_aventures').delete(invitationId);
        chargerInvitationsAventures();
    } catch (err) { console.error(err); }
}