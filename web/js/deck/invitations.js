window.ouvrirModalInvitation = async function(slotId) {
    slotInvitationEnCours = slotId;
    modalInvitation.style.display = 'flex';
    await chargerAmisPourInvitation();
};

if (btnFermerModal) btnFermerModal.addEventListener('click', () => modalInvitation.style.display = 'none');

window.chargerAmisPourInvitation = async function() {
    try {
        const userId = pb.authStore.model.id;
        const toutesRelations = await pb.collection('amis').getFullList({ filter: `(demandeur = "${userId}" || receveur = "${userId}") && statut = "accepte"`, expand: 'demandeur,receveur', requestKey: null });
        const idsDejaPresents = listeJoueurs.map(j => j.utilisateur); 
        const invitationsEnAttente = await pb.collection('invitations_aventures').getFullList({ filter: `aventure = "${aventureId}"`, requestKey: null });
        const idsInvites = invitationsEnAttente.map(inv => inv.receveur);

        listeAmisInvitation.innerHTML = '';
        if (toutesRelations.length === 0) { listeAmisInvitation.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Vous n\'avez pas encore de compagnons.</p>'; return; }

        toutesRelations.sort((a, b) => new Date(a.created) - new Date(b.created));

        toutesRelations.forEach(rel => {
            const ami = rel.demandeur === userId ? rel.expand?.receveur : rel.expand?.demandeur;
            if (!ami) return;
            const estDejaDansLaventure = idsDejaPresents.includes(ami.id);
            const estDejaInvite = idsInvites.includes(ami.id);

            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px dashed var(--encre-noire);';

            if (estDejaDansLaventure) {
                div.innerHTML = `<strong style="font-family: 'Cinzel', serif;">${ami.username || ami.name}</strong><span style="color: #666; font-style: italic; font-size: 0.85rem;">Déjà présent</span>`;
            } else if (estDejaInvite) {
                div.innerHTML = `<strong style="font-family: 'Cinzel', serif;">${ami.username || ami.name}</strong><span style="color: #b8860b; font-style: italic; font-size: 0.85rem;">En attente...</span>`;
            } else {
                div.innerHTML = `<strong style="font-family: 'Cinzel', serif;">${ami.username || ami.name}</strong><button class="btn-action" onclick="ajouterAmiAventure('${ami.id}', this)" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; width: auto;">Inviter</button>`;
            }
            listeAmisInvitation.appendChild(div);
        });
    } catch (err) { listeAmisInvitation.innerHTML = '<p style="color:red; text-align:center;">Erreur.</p>'; }
};

window.ajouterAmiAventure = async function(amiId, btnElement) {
    btnElement.disabled = true; btnElement.innerText = 'Envoi...';
    try {
        const userId = pb.authStore.model.id;
        await pb.collection('invitations_aventures').create({ aventure: aventureId, demandeur: userId, receveur: amiId, emplacement: parseInt(slotInvitationEnCours) });
        btnElement.innerText = 'Envoyé !'; btnElement.style.backgroundColor = '#2e8b57'; btnElement.style.borderColor = '#2e8b57';
        await chargerJoueurs(userId);
    } catch (err) { alert("Erreur d'invitation."); btnElement.disabled = false; btnElement.innerText = 'Inviter'; }
};

window.annulerInvitationSlot = async function(invitationId) {
    if (!confirm("Voulez-vous vraiment annuler cette invitation ?")) return;
    try {
        await pb.collection('invitations_aventures').delete(invitationId);
        invitationsAventure = invitationsAventure.filter(inv => inv.id !== invitationId);
        afficherJoueurs();
    } catch (err) { console.error(err); }
};