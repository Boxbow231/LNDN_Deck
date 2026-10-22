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
        if (!confirm(`Exclure ${nom} de l'aventure ?\n\nSon héros restera sauvegardé sur la table en tant que "Joueur Invité" (sans compte). Vous pourrez le donner à un autre ami plus tard.`)) return;
        
        try {
            const targetUserId = normaliserIdUtilisateur(part.utilisateur || part.expand?.utilisateur);
            if (targetUserId) {
                // 1. On cherche tous les héros (joueurs) que possédait cet utilisateur dans cette aventure
                const joueursAssocies = await pb.collection('joueurs').getFullList({ filter: `aventure = "${aventureId}" && utilisateur = "${targetUserId}"`, requestKey: null });
                
                // 2. On change le propriétaire de ces héros : ils redeviennent la propriété du créateur de l'aventure
                for (const j of joueursAssocies) {
                    await pb.collection('joueurs').update(j.id, { utilisateur: createurAventureId }, { requestKey: null });
                }
            }
            // 3. On passe l'ami en spectateur (ou on peut le supprimer totalement, mais on le garde en spectateur par sécurité)
            try { await pb.collection('participants').update(id, { permission: 'spectateur' }, { requestKey: null }); } catch(eUpdate) {}
            
            // 4. On rafraîchit l'affichage
            await chargerParticipants(); 
            await chargerJoueurs(pb.authStore.model.id); 
            afficherInvites();
        } catch(e) { console.error(e); alert("Erreur d'exclusion."); }
    }
};