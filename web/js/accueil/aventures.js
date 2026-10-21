async function chargerAventures() {
    const spanPseudo = document.getElementById('compte-pseudo');
    if (spanPseudo && pb.authStore.model) spanPseudo.textContent = pb.authStore.model.username || pb.authStore.model.name || 'Héros';
    if (!pb.authStore.isValid) return;

    const userGreetingEl = document.getElementById('user-greeting');
    if (userGreetingEl && pb.authStore.model) userGreetingEl.innerHTML = `👤 ${pb.authStore.model.username || pb.authStore.model.name || 'Héros'}`;
    
    try {
        const userId = pb.authStore.model.id;
        const mesAventures = await pb.collection('aventures').getFullList({ filter: `createur = "${userId}"`, sort: '-created' });
        const mesParticipations = await pb.collection('joueurs').getFullList({ filter: `utilisateur = "${userId}"`, expand: 'aventure' });

        const aventuresAffichees = [];
        const idsAjoutes = new Set();

        mesAventures.forEach(av => { aventuresAffichees.push(av); idsAjoutes.add(av.id); });
        mesParticipations.forEach(participation => {
            if (participation.expand?.aventure && !idsAjoutes.has(participation.expand.aventure.id)) {
                aventuresAffichees.push(participation.expand.aventure);
                idsAjoutes.add(participation.expand.aventure.id);
            }
        });

        aventuresContainer.innerHTML = '';
        if (aventuresAffichees.length === 0) {
            aventuresContainer.innerHTML = '<p style="text-align: center; font-style: italic; color: var(--gris-dessin);">Aucune aventure en cours. Lancez votre première quête ci-dessus.</p>';
            return;
        }

        aventuresAffichees.forEach(av => {
            const estCreateur = (av.createur === userId);
            const card = document.createElement('div');
            card.style.cssText = 'border: 1px solid var(--encre-noire); padding: 0.9rem 1rem; display: flex; justify-content: space-between; align-items: center; border-radius: 3px; background-color: rgba(0, 0, 0, 0.02);';

            let menuActions = estCreateur 
                ? `<button type="button" class="dropdown-item" onclick="modifierAventure('${av.id}', '${av.titre.replace(/'/g, "\\'")}')">✏️ Renommer</button>
                   <button type="button" class="dropdown-item danger" onclick="supprimerAventure('${av.id}', '${av.titre.replace(/'/g, "\\'")}')">🗑️ Supprimer l'aventure</button>`
                : `<button type="button" class="dropdown-item danger" onclick="quitterAventure('${av.id}', '${av.titre.replace(/'/g, "\\'")}')">🚪 Quitter l'aventure</button>`;

            card.innerHTML = `
                <div style="flex: 1; min-width: 0; padding-right: 1rem; cursor: pointer;" onclick="ouvrirAventure('${av.id}')">
                    <h3 style="font-family: 'Cinzel', serif; font-size: 1.1rem; margin: 0 0 0.3rem 0; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">
                        ${av.titre} ${estCreateur ? '' : '<span style="font-size: 0.8rem; color: #666; font-weight: normal;">(Invité)</span>'}
                    </h3>
                    <small style="color: var(--gris-dessin);">Créée le ${new Date(av.created).toLocaleDateString('fr-FR')}</small>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
                    <!-- LE BOUTON A ÉTÉ MODIFIÉ ICI -->
                    <button type="button" onclick="ouvrirAventure('${av.id}')" style="width: auto; padding: 0.4rem 0.6rem; font-size: 0.75rem; margin-top: 0; line-height: 1.3; letter-spacing: 0.5px; text-align: center;">VOIR<br>MON<br>DECK</button>
                    <div class="action-menu-container">
                        <button type="button" class="btn-dots" onclick="toggleMenu(event, '${av.id}')">⋮</button>
                        <div id="menu-${av.id}" class="dropdown-menu">${menuActions}</div>
                    </div>
                </div>`;
            aventuresContainer.appendChild(card);
        });
    } catch (err) { console.error('Erreur chargement aventures :', err); }
}

window.modifierAventure = async function(aventureId, ancienTitre) {
    const nouveauTitre = prompt("Entrez le nouveau nom de l'aventure (36 caractères max) :", ancienTitre);
    if (!nouveauTitre || nouveauTitre.trim() === "" || nouveauTitre.trim() === ancienTitre) return;
    
    if (nouveauTitre.trim().length > 36) {
        alert("Le nom est trop long ! (Maximum 36 caractères)");
        return;
    }

    try {
        await pb.collection('aventures').update(aventureId, { titre: nouveauTitre.trim() });
        await chargerAventures();
    } catch (err) { alert("Impossible de renommer l'aventure."); }
}

window.supprimerAventure = async function(aventureId, titre) {
    if (!confirm(`Es-tu sûr de vouloir supprimer définitivement l'aventure "${titre}" ainsi que tous les joueurs et decks associés ?`)) return;
    try {
        const joueurs = await pb.collection('joueurs').getFullList({ filter: `aventure = "${aventureId}"` });
        for (const joueur of joueurs) {
            const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${joueur.id}"` });
            for (const deck of decks) { await pb.collection('decks').delete(deck.id); }
            await pb.collection('joueurs').delete(joueur.id);
        }
        await pb.collection('aventures').delete(aventureId);
        await chargerAventures();
    } catch (err) { alert(`Erreur lors de la suppression.`); }
}

window.quitterAventure = async function(aventureId, titre) {
    if (!confirm(`Es-tu sûr de vouloir quitter l'aventure "${titre}" ? Ton héros et ton deck seront supprimés de cette quête.`)) return;
    try {
        const userId = pb.authStore.model.id;
        const joueur = await pb.collection('joueurs').getFirstListItem(`aventure = "${aventureId}" && utilisateur = "${userId}"`);
        const decks = await pb.collection('decks').getFullList({ filter: `joueur = "${joueur.id}"` });
        for (const deck of decks) { await pb.collection('decks').delete(deck.id); }
        await pb.collection('joueurs').delete(joueur.id);
        try {
            const participant = await pb.collection('participants').getFirstListItem(`aventures = "${aventureId}" && utilisateur = "${userId}"`);
            if (participant) await pb.collection('participants').delete(participant.id);
        } catch(e) {}
        await chargerAventures();
    } catch (err) { alert(`Erreur : Impossible de quitter l'aventure.`); }
}

if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titreInput = document.getElementById('aventure-nom');
        const titre = titreInput.value.trim();
        if (!titre) return;
        
        if (titre.length > 36) {
            alert("Le nom de l'aventure est trop long (maximum 36 caractères).");
            return;
        }

        try {
            const userId = pb.authStore.model.id;
            const nouvelleAventure = await pb.collection('aventures').create({ titre: titre, createur: userId });
            const joueur = await pb.collection('joueurs').create({ aventure: nouvelleAventure.id, utilisateur: userId, nom_provisoire: pb.authStore.model.username || pb.authStore.model.name || 'Héros Principal', emplacement: 1 });
            await pb.collection('decks').create({ joueur: joueur.id, cartes: DECKS_DE_BASE[1] });
            titreInput.value = '';
            await chargerAventures();
        } catch (err) { alert("Erreur lors de la création de l'aventure."); }
    });
}