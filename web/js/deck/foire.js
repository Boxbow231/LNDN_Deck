window.extraireFoireDeAventure = function(aventureRecord) {
    let f = aventureRecord.foire;
    if (!Array.isArray(f)) return [null, null, null];
    while (f.length < 3) f.push(null);
    return f.slice(0, 3);
};

window.afficherFoire = function() {
    if (!foireSlotsContainer) return;
    foireSlotsContainer.innerHTML = '';

    for (let i = 0; i < 3; i++) {
        const cote = foireCartes[i];
        if (!cote) {
            const div = document.createElement('div');
            div.className = 'foire-slot';
            div.innerHTML = '<div class="foire-slot-plus">+</div>';
            if (mesDroits !== 'spectateur') div.onclick = () => ouvrirModalFoire(i);
            else { div.style.cursor = 'not-allowed'; div.title = "Mode Spectateur"; }
            foireSlotsContainer.appendChild(div);
        } else {
            const carte = toutesLesCartes.find(c => c.cote === cote);
            if (!carte) continue;
            const div = document.createElement('div');
            div.className = 'card-item';
            div.style.cssText = 'flex-direction: column; align-items: stretch; border-color: #b8860b; background-color: rgba(255, 255, 255, 0.9);';
            
            let boutonsHtml = `<button class="btn-action" onclick="ajouterAuDeckDepuisFoire('${carte.cote}', ${i})" style="flex: 1; padding: 0.3rem;">Ajouter au deck</button>`;
            if (mesDroits !== 'spectateur') boutonsHtml += `<button class="btn-action btn-danger" onclick="retirerCarteFoire(${i})" style="padding: 0.3rem;" title="Retirer de la Foire">✖</button>`;

            div.innerHTML = `
                <div class="card-details" style="width: 100%;">
                    <h4><span class="card-badge" style="background-color: #b8860b;">${carte.cote}</span> ${carte.nom}</h4>
                    <p><strong>Effet :</strong> ${carte.effet || 'Aucun'}</p>
                    <p style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
                        <small style="color: #666;">Zone : ${carte.zone || 'Inconnue'}</small>
                        <strong style="color: #8b0000; font-size: 0.9rem;">Val: ${carte.valeur || 0}</strong>
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">${mesDroits === 'spectateur' ? '' : boutonsHtml}</div>
            `;
            foireSlotsContainer.appendChild(div);
        }
    }
};

window.ouvrirModalFoire = function(index) {
    slotFoireEnCours = index;
    modalFoire.style.display = 'flex';
    if (searchFoireInput) searchFoireInput.value = '';
    const cartesDeLaFoire = toutesLesCartes.filter(c => c.zone && c.zone.toLowerCase().includes('foire'));
    afficherCartesFoireModal(cartesDeLaFoire);
};

if (fermerModalFoireBtn) fermerModalFoireBtn.addEventListener('click', () => modalFoire.style.display = 'none');

if (searchFoireInput) {
    searchFoireInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cartesDeLaFoire = toutesLesCartes.filter(c => c.zone && c.zone.toLowerCase().includes('foire'));
        if (!query) { afficherCartesFoireModal(cartesDeLaFoire); return; }
        const filtrees = cartesDeLaFoire.filter(c => (c.nom || '').toLowerCase().includes(query) || (c.effet || '').toLowerCase().includes(query) || (c.cote || '').toLowerCase().includes(query));
        afficherCartesFoireModal(filtrees);
    });
}

function afficherCartesFoireModal(liste) {
    if (!listeCartesFoireEl) return;
    listeCartesFoireEl.innerHTML = '';
    if(liste.length === 0) { listeCartesFoireEl.innerHTML = '<p style="text-align:center; font-style:italic;">Aucune carte trouvée.</p>'; return; }

    liste.forEach(carte => {
        const div = document.createElement('div');
        div.className = 'card-item';
        div.style.borderColor = '#b8860b';
        div.innerHTML = `
            <div class="card-details" style="width: 100%;">
                <h4 style="color: #b8860b;"><span class="card-badge" style="background-color: #b8860b;">${carte.cote}</span> ${carte.nom}</h4>
                <p style="font-size: 0.75rem;"><strong>Effet:</strong> ${carte.effet || 'Aucun'}</p>
            </div>
            <button class="btn-action" onclick="choisirCarteFoire('${carte.cote}')" style="padding: 0.3rem 0.6rem; background-color: #b8860b; border-color: #8b6508;">Choisir</button>
        `;
        listeCartesFoireEl.appendChild(div);
    });
}

window.choisirCarteFoire = async function(cote) {
    if(slotFoireEnCours === null) return;
    foireCartes[slotFoireEnCours] = cote;
    modalFoire.style.display = 'none';
    afficherFoire();
    try { await pb.collection('aventures').update(aventureId, { foire: foireCartes }, { requestKey: null }); } 
    catch(e) { console.error(e); alert("Erreur."); }
};

window.retirerCarteFoire = async function(index) {
    if(!confirm("Retirer cette carte commune de la Foire de Farciminis ?")) return;
    foireCartes[index] = null;
    afficherFoire();
    try { await pb.collection('aventures').update(aventureId, { foire: foireCartes }, { requestKey: null }); } 
    catch(e) { console.error(e); }
};

window.ajouterAuDeckDepuisFoire = async function(cote, indexFoire) {
    const ajoutReussi = await window.ajouterAuDeck(cote);
    if (ajoutReussi) {
        foireCartes[indexFoire] = null; 
        afficherFoire(); 
        try { await pb.collection('aventures').update(aventureId, { foire: foireCartes }, { requestKey: null }); } 
        catch(e) { console.error("Erreur mise à jour foire :", e); }
    }
};