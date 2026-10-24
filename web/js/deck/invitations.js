let amisDisponiblesData = []; // Stocke les données pour la recherche

window.ouvrirModalInvitation = async function(slotId) {
    slotInvitationEnCours = slotId;
    modalInvitation.style.display = 'flex';
    if (document.getElementById('search-amis-input')) {
        document.getElementById('search-amis-input').value = '';
    }
    await chargerAmisPourInvitation();
};

if (btnFermerModal) btnFermerModal.addEventListener('click', () => modalInvitation.style.display = 'none');

// Écouteur de la barre de recherche
const searchAmisInput = document.getElementById('search-amis-input');
if (searchAmisInput) {
    searchAmisInput.addEventListener('input', () => {
        afficherAmisInvitation();
    });
}

window.chargerAmisPourInvitation = async function() {
    try {
        const userId = pb.authStore.model.id;
        const toutesRelations = await pb.collection('amis').getFullList({ filter: `(demandeur = "${userId}" || receveur = "${userId}") && statut = "accepte"`, expand: 'demandeur,receveur', requestKey: null });
        const idsDejaPresents = listeJoueurs.map(j => j.utilisateur); 
        const invitationsEnAttente = await pb.collection('invitations_aventures').getFullList({ filter: `aventure = "${aventureId}"`, requestKey: null });
        const idsInvites = invitationsEnAttente.map(inv => inv.receveur);

        if (toutesRelations.length === 0) { 
            listeAmisInvitation.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Vous n\'avez pas encore de compagnons.</p>'; 
            amisDisponiblesData = [];
            return; 
        }

        // Préparation et Tri alphabétique
        amisDisponiblesData = toutesRelations.map(rel => {
            const ami = rel.demandeur === userId ? rel.expand?.receveur : rel.expand?.demandeur;
            return {
                ami: ami,
                estDejaDansLaventure: idsDejaPresents.includes(ami?.id),
                estDejaInvite: idsInvites.includes(ami?.id),
                nomBrut: ami?.username || ami?.name || '',
                nomRecherche: (ami?.username || ami?.name || '').toLowerCase()
            };
        }).filter(d => d.ami);

        amisDisponiblesData.sort((a, b) => a.nomBrut.localeCompare(b.nomBrut));

        afficherAmisInvitation();
    } catch (err) { listeAmisInvitation.innerHTML = '<p style="color:red; text-align:center;">Erreur.</p>'; }
};

window.afficherAmisInvitation = function() {
    if (!listeAmisInvitation) return;
    listeAmisInvitation.innerHTML = '';
    
    const query = (document.getElementById('search-amis-input')?.value || '').toLowerCase().trim();
    const amisFiltres = amisDisponiblesData.filter(d => d.nomRecherche.includes(query));

    if (amisFiltres.length === 0) {
        listeAmisInvitation.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucun compagnon trouvé.</p>';
        return;
    }

    amisFiltres.forEach(data => {
        const ami = data.ami;
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px dashed var(--encre-noire);';

        if (data.estDejaDansLaventure) {
            div.innerHTML = `<strong style="font-family: 'Cinzel', serif;">${data.nomBrut}</strong><span style="color: #666; font-style: italic; font-size: 0.85rem;">Déjà présent</span>`;
        } else if (data.estDejaInvite) {
            div.innerHTML = `<strong style="font-family: 'Cinzel', serif;">${data.nomBrut}</strong><span style="color: #b8860b; font-style: italic; font-size: 0.85rem;">En attente...</span>`;
        } else {
            div.innerHTML = `<strong style="font-family: 'Cinzel', serif;">${data.nomBrut}</strong><button class="btn-action" onclick="ajouterAmiAventure('${ami.id}', this)" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; width: auto;">Inviter</button>`;
        }
        listeAmisInvitation.appendChild(div);
    });
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