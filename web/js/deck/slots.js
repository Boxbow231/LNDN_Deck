window.chargerJoueurs = async function(userId) {
    try {
        listeJoueurs = await pb.collection('joueurs').getFullList({ filter: `aventure = "${aventureId}"`, sort: 'created', requestKey: null });
        invitationsAventure = await pb.collection('invitations_aventures').getFullList({ filter: `aventure = "${aventureId}"`, expand: 'receveur', requestKey: null });

        let slotsOccupes = listeJoueurs.map(j => j.emplacement).filter(e => e);
        for (let j of listeJoueurs) {
            if (!j.emplacement) {
                for (let i = 1; i <= 4; i++) {
                    if (!slotsOccupes.includes(i)) {
                        j.emplacement = i; slotsOccupes.push(i);
                        await pb.collection('joueurs').update(j.id, { emplacement: i }, { requestKey: null }).catch(e => console.warn(e));
                        break;
                    }
                }
            }
        }
        if (!joueurActif && listeJoueurs.length > 0) joueurActif = listeJoueurs[0];
        afficherJoueurs();
        if (joueurActif) await selectionnerJoueur(joueurActif.id);
    } catch (err) { console.error(err); }
};

window.afficherJoueurs = function() {
    if (!joueursListeEl) return;
    joueursListeEl.innerHTML = '';

    for (let i = 1; i <= 4; i++) {
        const joueurSlot = listeJoueurs.find(j => parseInt(j.emplacement) === i);
        const invitationEnAttente = invitationsAventure.find(inv => parseInt(inv.emplacement) === i);
        const div = document.createElement('div');
        
        if (joueurSlot) {
            const estActif = joueurActif && joueurActif.id === joueurSlot.id;
            div.className = 'player-item ' + (estActif ? 'active' : '');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
            div.onclick = () => selectionnerJoueur(joueurSlot.id);

            const nom = joueurSlot.nom_provisoire || ('Héros ' + i);
            const nomSafe = nom.replace(/'/g, "\\'"); 
            const btnColor = estActif ? '#f4ecd8' : 'var(--encre-noire)';
            
            const joueurUtilisateurId = normaliserIdUtilisateur(joueurSlot.utilisateur);
            const estCreateurMainSlot = (joueurUtilisateurId === createurAventureId && parseInt(joueurSlot.emplacement) === 1);
            const estSansCompte = (joueurUtilisateurId === createurAventureId && parseInt(joueurSlot.emplacement) !== 1);
            const estMonSlot = (joueurUtilisateurId === pb.authStore.model.id);

            let afficherBoutonRenommer = false, afficherBoutonRetirer = false;
            if (mesDroits === 'createur') { afficherBoutonRenommer = true; if (!estCreateurMainSlot) afficherBoutonRetirer = true; } 
            else if (mesDroits === 'admin') { afficherBoutonRenommer = true; if (estSansCompte) afficherBoutonRetirer = true; } 
            else if (mesDroits === 'deck') { if (estMonSlot) afficherBoutonRenommer = true; }

            let menuHtml = '';
            if (afficherBoutonRenommer || afficherBoutonRetirer) {
                menuHtml += `<div class="action-menu-container" style="margin-left: auto;">
                    <button type="button" class="btn-dots" style="color: ${btnColor}; padding: 0.2rem 0.5rem;" onclick="toggleMenuJoueur(event, '${joueurSlot.id}')">⋮</button>
                    <div id="menu-joueur-${joueurSlot.id}" class="dropdown-menu">`;
                if (afficherBoutonRenommer) menuHtml += `<button type="button" class="dropdown-item" onclick="renommerJoueur(event, '${joueurSlot.id}', '${nomSafe}')">✏️ Renommer</button>`;
                if (afficherBoutonRetirer) menuHtml += `<button type="button" class="dropdown-item danger" onclick="supprimerJoueur(event, '${joueurSlot.id}', '${nomSafe}')">🗑️ Retirer</button>`;
                menuHtml += '</div></div>';
            }

            div.innerHTML = `<div><div style="font-size: 0.65rem; color: ${estActif ? '#dcd0b8' : '#888'};">Emplacement ${i}</div><div>${nom}</div><small style="font-size: 0.75rem;">${estActif ? '▶ Deck actif' : 'Cliquer pour voir'}</small></div>${menuHtml}`;
        } else if (invitationEnAttente) {
            const nomInvite = invitationEnAttente.expand?.receveur?.username || invitationEnAttente.expand?.receveur?.name || 'un ami';
            div.className = 'player-item';
            div.style.cssText = 'display: flex !important; flex-direction: column !important; align-items: stretch !important; gap: 0.5rem; cursor: default; background-color: rgba(218, 165, 32, 0.15); border: 1px dashed #daa520;';
            const btnAnnuler = (mesDroits === 'createur' || mesDroits === 'admin') ? `<button class="btn-action btn-danger" onclick="annulerInvitationSlot('${invitationEnAttente.id}')" style="font-size: 0.75rem; padding: 0.4rem; width: 100% !important; margin: 0;">Annuler l'invitation</button>` : '';
            div.innerHTML = `<div style="font-size: 0.8rem; font-weight: bold; color: #b8860b; text-align: center;">Emplacement ${i} (Réservé)</div><div style="font-size: 0.75rem; text-align: center; color: #666; font-style: italic;">En attente de ${nomInvite}...</div>${btnAnnuler}`;
        } else {
            div.className = 'player-item';
            div.style.cssText = 'display: flex !important; flex-direction: column !important; align-items: stretch !important; gap: 0.5rem; cursor: default; background-color: rgba(255, 255, 255, 0.2);';
            let inputHtml = '', boutonsCreationHtml = '';
            if (mesDroits !== 'spectateur') { 
                inputHtml = `<input type="text" id="input-slot-${i}" placeholder="Nom du héros ${i}..." style="width: 100%; box-sizing: border-box; padding: 0.4rem; font-size: 0.8rem; text-align: center; border: 1px solid var(--encre-noire); margin: 0;">`;
                const boutonInviterHtml = (mesDroits === 'createur' || mesDroits === 'admin') ? `<button class="btn-action" onclick="ouvrirModalInvitation(${i})" style="flex: 1 !important; width: 100% !important; font-size: 0.75rem; padding: 0.4rem; margin: 0;">+ Inviter</button>` : '';
                boutonsCreationHtml = `<div style="display: flex; gap: 0.3rem; width: 100%;"><button class="btn-action" onclick="creerJoueurSlot(${i})" style="flex: 1 !important; width: 100% !important; font-size: 0.75rem; padding: 0.4rem; margin: 0;">+ Créer</button>${boutonInviterHtml}</div>`;
            }
            div.innerHTML = `<div style="font-size: 0.8rem; font-weight: bold; color: #666; text-align: center;">Emplacement ${i} (Libre)</div>${inputHtml}${boutonsCreationHtml}`;
        }
        joueursListeEl.appendChild(div);
    }
};

window.creerJoueurSlot = async function(slotId) {
    const input = document.getElementById('input-slot-' + slotId);
    const nom = input ? input.value.trim() : '';
    if (!nom) { alert("Veuillez entrer un nom pour ce héros."); return; }
    try {
        const nouveauJoueur = await pb.collection('joueurs').create({ aventure: aventureId, utilisateur: createurAventureId, nom_provisoire: nom, emplacement: parseInt(slotId) });
        await pb.collection('decks').create({ joueur: nouveauJoueur.id, cartes: DECKS_DE_BASE[slotId] || DECKS_DE_BASE[1] });
        listeJoueurs.push(nouveauJoueur); joueurActif = nouveauJoueur; 
        afficherJoueurs(); await selectionnerJoueur(nouveauJoueur.id); await majCompteCartes(); rafraichirCatalogueAffichage();
    } catch (err) { alert("Erreur de création."); }
};

window.toggleMenuJoueur = function(event, joueurId) {
    event.stopPropagation(); 
    document.querySelectorAll('.dropdown-menu').forEach(m => { if (m.id !== 'menu-joueur-' + joueurId) m.classList.remove('show'); });
    const menu = document.getElementById('menu-joueur-' + joueurId);
    if (menu) menu.classList.toggle('show');
};
window.addEventListener('click', () => document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show')));

window.renommerJoueur = async function(event, joueurId, ancienNom) {
    event.stopPropagation(); document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    const nouveauNom = prompt("Nouveau nom du héros :", ancienNom);
    if (!nouveauNom || nouveauNom.trim() === "" || nouveauNom.trim() === ancienNom) return;
    try {
        await pb.collection('joueurs').update(joueurId, { nom_provisoire: nouveauNom.trim() }, { requestKey: null });
        const j = listeJoueurs.find(j => j.id === joueurId);
        if (j) j.nom_provisoire = nouveauNom.trim();
        if (joueurActif && joueurActif.id === joueurId) deckTitreJoueurEl.textContent = 'Deck : ' + nouveauNom.trim();
        afficherJoueurs();
    } catch (err) { alert("Impossible de renommer ce héros."); }
};

window.supprimerJoueur = async function(event, joueurId, nom) {
    event.stopPropagation(); document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    if (!confirm(`Es-tu sûr de vouloir retirer "${nom}" ?`)) return;
    try {
        const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${joueurId}"`, requestKey: null });
        for (const d of decks) await pb.collection('decks').delete(d.id, { requestKey: null });
        await pb.collection('joueurs').delete(joueurId, { requestKey: null });
        if (joueurActif && joueurActif.id === joueurId) joueurActif = null;
        await chargerParticipants(); await chargerJoueurs(pb.authStore.model.id);
    } catch (err) { alert("Erreur (403)."); }
};