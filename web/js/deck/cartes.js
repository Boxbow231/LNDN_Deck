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
        rafraichirCatalogueAffichage(); 
        afficherBannissement(); 
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
        rafraichirCatalogueAffichage(); 
        afficherBannissement(); 
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

    let listeAffichee = [...cartesDuDeck];
    
    listeAffichee.sort((a, b) => {
        const zoneA = (a.zone || '').toLowerCase();
        const zoneB = (b.zone || '').toLowerCase();
        if (zoneA < zoneB) return -1;
        if (zoneA > zoneB) return 1;
        
        const nomA = (a.nom || '').toLowerCase();
        const nomB = (b.nom || '').toLowerCase();
        if (nomA < nomB) return -1;
        if (nomA > nomB) return 1;
        return 0;
    });

    const requeteRecherche = searchDeckInput && searchDeckInput.value ? searchDeckInput.value.toLowerCase().trim() : '';

    if (requeteRecherche) {
        const regexDeck = /^deck\s*(i|ii|iii|iv)$/;
        const matchStrict = requeteRecherche.match(regexDeck);
        
        if (matchStrict) {
            const zoneCible = "deck " + matchStrict[1];
            listeAffichee = listeAffichee.filter(c => (c.zone || '').toLowerCase().trim() === zoneCible);
        } else {
            listeAffichee = listeAffichee.filter(c => (c.nom || '').toLowerCase().includes(requeteRecherche) || (c.effet || '').toLowerCase().includes(requeteRecherche) || (c.zone || '').toLowerCase().includes(requeteRecherche) || (c.cote || '').toLowerCase().includes(requeteRecherche));
        }
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
            ${isSpectateur ? '' : `
            <div style="display: flex; gap: 0.4rem;">
                <button type="button" class="btn-action btn-danger" onclick="bannirDepuisDeck(${indexReel}, '${carte.cote}')" title="Bannir cette carte" style="padding: 0.4rem; background-color: transparent; color: #8b0000; border: 1px solid #8b0000;">✖</button>
                <button type="button" class="btn-action btn-danger" onclick="retirerDuDeck(${indexReel})">Retirer</button>
            </div>`}`;
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
        const nbBannies = cartesBannies.filter(c => c === carte.cote).length;
        
        const dispo = limite - utilisees - nbBannies;
        
        let isRestricted = false;
        const matchDeck = carte.cote.match(/^D(\d)/i);
        if (matchDeck && joueurActif) {
            if (parseInt(joueurActif.emplacement) !== parseInt(matchDeck[1])) isRestricted = true;
        }

        const item = document.createElement('div');
        item.className = 'card-item';
        
        let texteDispo = '';
        let texteBoutonHtml = '';
        let titleStyle = '';
        
        if (nbBannies >= limite) {
            item.style.opacity = '0.6';
            item.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            titleStyle = 'text-decoration: line-through;';
            texteDispo = `<span style="color: #8b0000; font-weight: bold; font-size: 0.75rem;">Carte bannie</span>`;
            texteBoutonHtml = `<button type="button" class="btn-action" disabled style="opacity:0.6; cursor:not-allowed; background-color: #555; color: #fff; border-color: #333;">🚫 BANNIE</button>`;
        } else {
            let btnDisabled = '';
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
            if (nbBannies > 0) {
                texteBoutonHtml = `
                    <div style="display: flex; gap: 0.4rem; width: 100%;">
                        <button type="button" class="btn-action" disabled style="opacity:0.8; background-color: #555; color: #fff; border-color: #333; flex: 0 0 auto; padding: 0.4rem 0.6rem;" title="${nbBannies} copie(s) bannie(s)">🚫 ${nbBannies}</button>
                        <button type="button" class="btn-action" onclick="ajouterAuDeck('${carte.cote}')" ${btnDisabled} style="flex: 1;">+ Ajouter</button>
                    </div>`;
            } else {
                texteBoutonHtml = `<button type="button" class="btn-action" onclick="ajouterAuDeck('${carte.cote}')" ${btnDisabled}>+ Ajouter</button>`;
            }
        }

        item.innerHTML = `
            <div class="card-details" style="width: 100%;">
                <h4><span class="card-badge">${carte.cote}</span> <span style="${titleStyle}">${carte.nom}</span></h4>
                <p><strong>Effet :</strong> ${carte.effet || 'Aucun'}</p>
                <p style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
                    <small style="color: #666;">Zone : ${carte.zone || 'Inconnue'}</small>
                    <small>${texteDispo}</small>
                </p>
            </div>
            ${texteBoutonHtml}`;
        
        catalogueListeEl.appendChild(item);
    });
};

window.rafraichirCatalogueAffichage = function() {
    const query = searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : '';
    if (query) searchInput.dispatchEvent(new Event('input'));
    else afficherCatalogue(toutesLesCartes);
};

// === LOGIQUE DE BANNISSEMENT (DEPUIS LE DECK) ===

window.bannirDepuisDeck = async function(index, cote) {
    if (mesDroits === 'spectateur') { alert("Mode lecture seule."); return; }
    if (!deckRecordActif) return;
    
    const carteRetiree = cartesDuDeck[index];
    cartesDuDeck.splice(index, 1);
    if (carteRetiree && compteCartesUtilisees[carteRetiree.cote]) {
        compteCartesUtilisees[carteRetiree.cote]--;
    }

    if (!window.cartesBannies) window.cartesBannies = [];
    window.cartesBannies.push(cote);
    
    try { 
        await pb.collection('aventures').update(aventureId, { bannissement: window.cartesBannies }, { requestKey: null }); 
    } catch (e) { console.error("Erreur sauvegarde ban:", e); }

    afficherDeck();
    rafraichirCatalogueAffichage();
    window.afficherBannissement();
    sauvegarderDeck();
};

window.debannirCarte = async function(cote) {
    if (mesDroits === 'spectateur') return;
    if (!window.cartesBannies) return;
    
    const index = window.cartesBannies.indexOf(cote);
    if (index > -1) {
        window.cartesBannies.splice(index, 1);
        rafraichirCatalogueAffichage();
        window.afficherBannissement();
        try { await pb.collection('aventures').update(aventureId, { bannissement: window.cartesBannies }, { requestKey: null }); } catch (e) { console.error("Erreur sauvegarde deban:", e); }
    }
};

window.afficherBannissement = function() {
    const bannissementListeElLocal = document.getElementById('bannissement-liste');
    if (!bannissementListeElLocal) return;
    bannissementListeElLocal.innerHTML = '';
    
    if (!window.cartesBannies || window.cartesBannies.length === 0) {
        bannissementListeElLocal.innerHTML = '<p style="text-align: center; color: var(--gris-dessin); font-style: italic;">Aucune carte bannie.</p>';
        return;
    }

    const isSpectateur = (mesDroits === 'spectateur');
    let cartesAffichees = [];

    // 1. Récupérer et filtrer les cartes bannies visibles pour ce joueur
    window.cartesBannies.forEach(cote => {
        const carte = toutesLesCartes.find(c => c.cote === cote);
        if (!carte) return;

        const matchDeck = carte.cote.match(/^D(\d)/i);
        if (matchDeck) {
            const numeroDeck = parseInt(matchDeck[1]);
            if (!joueurActif || parseInt(joueurActif.emplacement) !== numeroDeck) return;
        }
        cartesAffichees.push(carte);
    });

    // 2. Trier par Zone puis Ordre Alphabétique
    cartesAffichees.sort((a, b) => {
        const zoneA = (a.zone || '').toLowerCase();
        const zoneB = (b.zone || '').toLowerCase();
        if (zoneA < zoneB) return -1;
        if (zoneA > zoneB) return 1;
        
        const nomA = (a.nom || '').toLowerCase();
        const nomB = (b.nom || '').toLowerCase();
        if (nomA < nomB) return -1;
        if (nomA > nomB) return 1;
        return 0;
    });

    // 3. Appliquer le filtre de la barre de recherche
    const searchBanInput = document.getElementById('search-bannissement-input');
    const requeteRechercheBan = searchBanInput && searchBanInput.value ? searchBanInput.value.toLowerCase().trim() : '';

    if (requeteRechercheBan) {
        cartesAffichees = cartesAffichees.filter(c => 
            (c.nom || '').toLowerCase().includes(requeteRechercheBan) || 
            (c.effet || '').toLowerCase().includes(requeteRechercheBan) || 
            (c.zone || '').toLowerCase().includes(requeteRechercheBan) || 
            (c.cote || '').toLowerCase().includes(requeteRechercheBan)
        );
    }

    // 4. Gérer l'affichage si aucun résultat ou liste vide
    if (cartesAffichees.length === 0) {
        if (requeteRechercheBan) {
            bannissementListeElLocal.innerHTML = '<p style="text-align: center; color: var(--gris-dessin); font-style: italic; font-size: 0.8rem;">Aucune carte bannie ne correspond à cette recherche.</p>';
        } else {
            bannissementListeElLocal.innerHTML = '<p style="text-align: center; color: var(--gris-dessin); font-style: italic; font-size: 0.8rem;">Les cartes bannies de ce héros apparaîtront ici.</p>';
        }
        return;
    }

    // 5. Affichage final
    cartesAffichees.forEach(carte => {
        const item = document.createElement('div');
        item.className = 'card-item';
        item.style.backgroundColor = 'rgba(139, 0, 0, 0.05)';
        item.style.borderColor = 'rgba(139, 0, 0, 0.3)';
        
        item.innerHTML = `
            <div class="card-details" style="width: 100%;">
                <h4><span class="card-badge" style="background-color: #8b0000;">${carte.cote}</span> ${carte.nom}</h4>
            </div>
            ${isSpectateur ? '' : `<button type="button" class="btn-action" onclick="debannirCarte('${carte.cote}')" style="padding: 0.3rem 0.5rem; font-size: 0.75rem; background-color: transparent; color: #2e8b57; border: 1px solid #2e8b57;">♻️ Restaurer</button>`}`;
        
        bannissementListeElLocal.appendChild(item);
    });
};

// ================================

window.ajouterAuDeck = async function(cote) {
    if (mesDroits === 'spectateur') { alert("Mode lecture seule."); return false; }
    if (!deckRecordActif || !joueurActif) { alert("Sélectionnez un joueur d'abord."); return false; }

    const carteTrouvee = toutesLesCartes.find(c => c.cote === cote);
    if (!carteTrouvee) return false;
    
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

// ================================
// ÉCOUTEURS D'ÉVÉNEMENTS (Recherche)
// ================================

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) { afficherCatalogue(toutesLesCartes); return; }
        
        const regexDeck = /^deck\s*(i|ii|iii|iv)$/;
        const matchStrict = query.match(regexDeck);
        
        let filtrees;
        if (matchStrict) {
            const zoneCible = "deck " + matchStrict[1];
            filtrees = toutesLesCartes.filter(c => (c.zone || '').toLowerCase().trim() === zoneCible);
        } else {
            filtrees = toutesLesCartes.filter(c => (c.nom || '').toLowerCase().includes(query) || (c.effet || '').toLowerCase().includes(query) || (c.zone || '').toLowerCase().includes(query) || (c.cote || '').toLowerCase().includes(query));
        }
        
        afficherCatalogue(filtrees);
    });
}
if (searchDeckInput) searchDeckInput.addEventListener('input', () => afficherDeck());

const searchBanInput = document.getElementById('search-bannissement-input');
if (searchBanInput) {
    searchBanInput.addEventListener('input', () => window.afficherBannissement());
}