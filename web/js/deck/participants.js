window.afficherInvites = function() {
    const zoneInvitesContainer = document.getElementById('zone-invites-container');
    const invitesListeEl = document.getElementById('invites-liste');
    const userId = pb.authStore.model.id;
    const estCreateur = (userId === createurAventureId);

    if (!estCreateur) { if (zoneInvitesContainer) zoneInvitesContainer.style.display = 'none'; return; } 
    else { if (zoneInvitesContainer) zoneInvitesContainer.style.display = 'block'; }

    if (!invitesListeEl) return;
    invitesListeEl.innerHTML = '';

    if (participantsAventure.length === 0) {
        invitesListeEl.innerHTML = '<p style="text-align: center; font-size: 0.75rem; font-style: italic; color: #888;">Aucun autre compagnon invité.</p>';
        return;
    }

    participantsAventure.forEach(part => {
        if (part.utilisateur === createurAventureId) return;
        const nom = part.expand?.utilisateur?.username || part.expand?.utilisateur?.name || 'Inconnu';
        
        let htmlDroits = `<select onchange="changerDroitParticipant('${part.id}', this.value)" style="font-size: 0.7rem; padding: 0.2rem; width: 100%; margin-bottom: 0.3rem; border: 1px solid var(--encre-noire);">
            <option value="spectateur" ${part.permission === 'spectateur' ? 'selected' : ''}>👁️ Juste regarder</option>
            <option value="deck" ${part.permission === 'deck' ? 'selected' : ''}>🃏 Modifier les decks</option>
            <option value="admin" ${part.permission === 'admin' ? 'selected' : ''}>👑 Gérer les héros (Admin)</option>
        </select>
        <button class="btn-action btn-danger" onclick="expulserParticipant('${part.id}', '${nom}')" style="font-size: 0.7rem; padding: 0.4rem; width: 100% !important; margin: 0;">Expulser</button>`;

        const div = document.createElement('div');
        div.className = 'player-item';
        div.style.cssText = 'display: flex !important; flex-direction: column !important; align-items: stretch !important; gap: 0.4rem;';
        div.innerHTML = `<div style="font-weight: bold; font-size: 0.85rem;">👤 ${nom}</div><div style="width: 100%;">${htmlDroits}</div>`;
        invitesListeEl.appendChild(div);
    });
};

window.chargerParticipants = async function() {
    const userId = pb.authStore.model.id;
    if (userId === createurAventureId) mesDroits = "createur";

    try {
        participantsAventure = await pb.collection('participants').getFullList({ filter: `aventures = "${aventureId}"`, expand: 'utilisateur', requestKey: null });
        if (userId !== createurAventureId) {
            const monAcces = participantsAventure.find(p => normaliserIdUtilisateur(p.utilisateur) === userId);
            monParticipantId = monAcces ? monAcces.id : null;
            mesDroits = monAcces ? monAcces.permission : "spectateur";
        }
        afficherInvites();
    } catch(e) { participantsAventure = []; afficherInvites(); }
};

window.changerDroitParticipant = async function(id, nouvellePermission) {
    try { await pb.collection('participants').update(id, { permission: nouvellePermission }, { requestKey: null }); } 
    catch(e) { alert("Erreur modification des droits."); }
};

window.expulserParticipant = async function(id, nom) {
    const part = participantsAventure.find(p => p.id === id);
    if (!part) return;

    if (part.permission === 'spectateur') {
        if (!confirm(`Exclure DÉFINITIVEMENT ${nom} ?`)) return;
        try {
            await pb.collection('participants').delete(id, { requestKey: null });
            participantsAventure = participantsAventure.filter(p => p.id !== id);
            await chargerParticipants(); afficherInvites();
        } catch(e) { alert("Erreur d'exclusion."); }
    } else {
        if (!confirm(`Passer ${nom} en mode Spectateur (perte du héros) ?`)) return;
        try {
            const targetUserId = normaliserIdUtilisateur(part.utilisateur || part.expand?.utilisateur);
            if (targetUserId) {
                const joueursAssocies = await pb.collection('joueurs').getFullList({ filter: `aventure = "${aventureId}" && utilisateur = "${targetUserId}"`, requestKey: null });
                for (const j of joueursAssocies) {
                    const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${j.id}"`, requestKey: null });
                    for (const d of decks) await pb.collection('decks').delete(d.id, { requestKey: null });
                    await pb.collection('joueurs').delete(j.id, { requestKey: null });
                    if (joueurActif && joueurActif.id === j.id) joueurActif = null;
                }
            }
            try { await pb.collection('participants').update(id, { permission: 'spectateur' }, { requestKey: null }); } catch(eUpdate) {}
            await chargerParticipants(); await chargerJoueurs(pb.authStore.model.id); afficherInvites();
        } catch(e) { console.error(e); alert("Erreur d'exclusion."); }
    }
};