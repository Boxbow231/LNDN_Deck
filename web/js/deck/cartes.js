let timerSauvegardeDeck = null;
let sauvegardeEnCours = false;

window.selectionnerJoueur = async function(joueurId) {
    if (timerSauvegardeDeck) { clearTimeout(timerSauvegardeDeck); await executerSauvegardeDeck(); }
    joueurActif = listeJoueurs.find(j => j.id === joueurId);
    
    if (!joueurActif) {
        cartesDuDeck = []; deckRecordActif = null;
        if (deckTitreJoueurEl) deckTitreJoueurEl.textContent = 'Aucun héros sélectionné';
        afficherDeck(); 
        afficherJoueurs(); 
        rafraichirCatalogueAffichage(); // Met à jour le catalogue
        return;
    }
    afficherJoueurs();
    if (deckTitreJoueurEl) deckTitreJoueurEl.textContent = 'Deck : ' + (joueurActif.nom_provisoire || 'Héros');
    if (searchDeckInput) searchDeckInput.value = ''; 

    try {
        try { deckRecordActif = await pb.collection('decks').getFirstListItem(`joueur = "${joueurActif.id}"`, { requestKey: null }); } 
        catch (e) { deckRecordActif = await pb.collection('decks').create({ joueur: joueurActif.id, cartes: DECKS_DE_BASE[joueurActif.emplacement] || DECKS_DE_BASE[1] }); }
        
        const cotesEnregistrees = Array.isArray(deckRecordActif.cartes) ? deckRecordActif.cartes : [];
        cartesDuDeck = cotesEnregistrees.map(cote => toutesLesCartes.find(c => c.cote === cote)).filter(Boolean);
        afficherDeck();
        rafraichirCatalogueAffichage(); // Met à jour les boutons grisés selon le héros
    } catch (err) { console.error(err); }
};

window.afficherDeck = function() {
    if (!deckListeEl) return;
    deckListeEl.innerHTML = '';
    deckCountEl.textContent = cartesDuDeck.length + ' carte' + (cartesDuDeck.length > 1 ? 's' : '');
    
    let valeurTotale = 0;
    cartesDuDeck.forEach(c => valeurTotale += parseInt(c.valeur) || 0);
    if (deckValeurTotaleEl) deckValeurTotaleEl.textContent = valeurTotale;

    if (cartesDuDeck.length === 0) { deckListeEl.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Ce héros n\'a aucune carte dans son deck.</p>'; return; }

    let listeAffichee = cartesDuDeck;
    const requeteRecherche = searchDeckInput && searchDeckInput.value ? searchDeckInput.value.toLowerCase().trim() : '';

    if (requeteRecherche) {
        listeAffichee = cartesDuDeck.filter(c => (c.nom || '').toLowerCase().includes(requeteRecherche) || (c.effet || '').toLowerCase().includes(requeteRecherche) || (c.zone || '').toLowerCase().includes(requeteRecherche) || (c.cote || '').toLowerCase().includes(requeteRecherche));
    }
    if (listeAffichee.length === 0) { deckListeEl.innerHTML = '<p style="text-align: center; font-style: italic; color: #666;">Aucune carte ne correspond.</p>'; return; }

    const isSpectateur = (mesDroits === 'spectateur');
    listeAffichee.forEach((carte) => {
        const indexReel = cartesDuDeck.indexOf(carte);
        const item = document.createElement('div');
        item.className = 'card-item';
        item.innerHTML = `
            <div class="card-details">
                <h4><span class="card-badge">${carte.cote}</span> ${carte.nom}</h4>
                <p><strong>Effet :</strong> ${carte.effet || 'Aucun'}</p>
                <p style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
                    <small style="color: #666;">Zone : ${carte.zone || 'Inconnue'} | Type : ${carte.type || '-'}</small>
                    <strong style="color: #8b0000; font-size: 0.9rem;">Val: ${carte.valeur || 0}</strong>
                </p>
            </div>
            ${isSpectateur ? '' : `<button type="button" class="btn-action btn-danger" onclick="retirerDuDeck(${indexReel})">Retirer</button>`}`;
        deckListeEl.appendChild(item);
    });
};

window.afficherCatalogue = function(liste) {
    if (!catalogueListeEl) return;
    catalogueListeEl.innerHTML = '';
    if (liste.length === 0) { catalogueListeEl.innerHTML = '<p style="text-align: center; font-style: italic;">Aucune carte trouvée.</p>'; return; }
    
    const isSpectateur = (mesDroits === 'spectateur');
    
    liste.forEach(carte => {
        const limite = parseInt(carte.exemplaire) || 1;
        const utilisees = compteCartesUtilisees[carte.cote] || 0;
        const dispo = limite - utilisees;
        
        // --- NOUVEAU : VÉRIFICATION DU PROPRIÉTAIRE DU DECK ---
        let isRestricted = false;
        const matchDeck = carte.cote.match(/^D(\d)/i); // Cherche D1, D2, D3, D4 au début de la cote
        if (matchDeck && joueurActif) {
            const numeroDeckAutorise = parseInt(matchDeck[1]);
            if (parseInt(joueurActif.emplacement) !== numeroDeckAutorise) {
                isRestricted = true; // Ce n'est pas le bon joueur pour cette carte
            }
        }

        let btnDisabled = '';
        let texteDispo = '';

        if (isRestricted) {
            btnDisabled = 'disabled style="opacity:0.4; cursor:not-allowed; background-color: #555;"';
            texteDispo = `<span style="color: #8b0000; font-weight: bold; font-size: 0.75rem;">Mauvais Emplacement</span>`;
        } else if (dispo <= 0) {
            btnDisabled = 'disabled style="opacity:0.5; cursor:not-allowed;"';
            texteDispo = `<span style="color: #8b0000; font-weight: bold;">0/${limite} dispo</span>`;
        } else if (isSpectateur) {
            btnDisabled = 'disabled style="opacity:0.5; cursor:not-allowed;"';
            texteDispo = `<span style="color: #2e8b57; font-weight: bold;">${dispo}/${limite} dispo</span>`;
        } else {
            texteDispo = `<span style="color: #2e8b57; font-weight: bold;">${dispo}/${limite} dispo</span>`;
        }

        const item = document.createElement('div');
        item.className = 'card-item';
        item.innerHTML = `
            <div class="card-details" style="width: 100%;">
                <h4><span class="card-badge">${carte.cote}</span> ${carte.nom}</h4>
                <p><strong>Effet :</strong> ${carte.effet || 'Aucun'}</p>
                <p style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
                    <small style="color: #666;">Zone : ${carte.zone || 'Inconnue'} | Type : ${carte.type || '-'}</small>
                    <small>${texteDispo}</small>
                </p>
            </div>
            <button type="button" class="btn-action" onclick="ajouterAuDeck('${carte.cote}')" ${btnDisabled}>+ Ajouter</button>`;
        catalogueListeEl.appendChild(item);
    });
};

window.rafraichirCatalogueAffichage = function() {
    const query = searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : '';
    if (query) searchInput.dispatchEvent(new Event('input'));
    else afficherCatalogue(toutesLesCartes);
};

window.ajouterAuDeck = async function(cote) {
    if (mesDroits === 'spectateur') { alert("Mode lecture seule."); return false; }
    if (!deckRecordActif || !joueurActif) { alert("Sélectionnez un joueur d'abord."); return false; }

    const carteTrouvee = toutesLesCartes.find(c => c.cote === cote);
    if (!carteTrouvee) return false;
    
    // --- NOUVEAU : SÉCURITÉ SUPPLÉMENTAIRE AU CLIC ---
    const matchDeck = cote.match(/^D(\d)/i);
    if (matchDeck) {
        const numeroDeckAutorise = parseInt(matchDeck[1]);
        if (parseInt(joueurActif.emplacement) !== numeroDeckAutorise) {
            alert(`Sortilège instable ! Cette carte appartient au Deck ${numeroDeckAutorise}. Le héros actuel est sur l'emplacement ${joueurActif.emplacement}.`);
            return false;
        }
    }

    const limite = parseInt(carteTrouvee.exemplaire) || 1;
    const utilisees = compteCartesUtilisees[cote] || 0;

    if (utilisees >= limite) { alert(`Limite atteinte pour "${carteTrouvee.nom}" !`); return false; }

    cartesDuDeck.push(carteTrouvee); compteCartesUtilisees[cote] = utilisees + 1;
    afficherDeck(); rafraichirCatalogueAffichage(); sauvegarderDeck();
    return true; 
};

window.retirerDuDeck = async function(index) {
    if (mesDroits === 'spectateur') { alert("Mode lecture seule."); return; }
    if (!deckRecordActif) return;
    
    const carteRetiree = cartesDuDeck[index];
    cartesDuDeck.splice(index, 1);
    if (carteRetiree && compteCartesUtilisees[carteRetiree.cote]) compteCartesUtilisees[carteRetiree.cote]--;

    afficherDeck(); rafraichirCatalogueAffichage(); sauvegarderDeck();
};

async function executerSauvegardeDeck() {
    if (!deckRecordActif) return;
    try {
        sauvegardeEnCours = true;
        deckRecordActif = await pb.collection('decks').update(deckRecordActif.id, { cartes: cartesDuDeck.map(c => c.cote) }, { requestKey: null });
    } catch (err) { console.error("Erreur de sauvegarde :", err); } 
    finally { sauvegardeEnCours = false; timerSauvegardeDeck = null; }
}

window.sauvegarderDeck = function() {
    clearTimeout(timerSauvegardeDeck);
    timerSauvegardeDeck = setTimeout(async () => { await executerSauvegardeDeck(); }, 250);
};

window.majCompteCartes = async function() {
    compteCartesUtilisees = {};
    if (listeJoueurs.length === 0) return;
    const filtres = listeJoueurs.map(j => `joueur = "${j.id}"`).join(' || ');
    try {
        const decks = await pb.collection('decks').getFullList({ filter: filtres, requestKey: null });
        decks.forEach(d => { if (Array.isArray(d.cartes)) d.cartes.forEach(cote => compteCartesUtilisees[cote] = (compteCartesUtilisees[cote] || 0) + 1); });
    } catch(err) {}
};

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) { afficherCatalogue(toutesLesCartes); return; }
        const filtrees = toutesLesCartes.filter(c => (c.nom || '').toLowerCase().includes(query) || (c.effet || '').toLowerCase().includes(query) || (c.zone || '').toLowerCase().includes(query) || (c.cote || '').toLowerCase().includes(query));
        afficherCatalogue(filtrees);
    });
}
if (searchDeckInput) searchDeckInput.addEventListener('input', () => afficherDeck());