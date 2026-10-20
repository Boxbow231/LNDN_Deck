const formBug = document.getElementById('form-bug');
const listeBugsEl = document.getElementById('liste-bugs');

// 1. Envoyer un nouveau bug
if (formBug) {
    formBug.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const titre = document.getElementById('bug-titre').value.trim();
        const description = document.getElementById('bug-desc').value.trim();
        const nomJoueur = pb.authStore.model?.username || pb.authStore.model?.name || 'Aventurier Anonyme';

        try {
            const bouton = formBug.querySelector('button');
            bouton.disabled = true;
            bouton.innerText = "Inscription...";

            await pb.collection('maledictions').create({
                titre: titre,
                description: description,
                auteur: nomJoueur,
                resolu: false // Par défaut, le problème est "En cours"
            });
            document.getElementById('bug-titre').value = '';
            document.getElementById('bug-desc').value = '';
            
            bouton.innerText = "Inscrire dans le Grimoire";
            bouton.disabled = false;
            
            alert("Merci ! Le problème a été noté, j'y jetterai un œil dès que possible.");
            chargerBugs();

        } catch (err) {
            console.error(err);
            alert("Erreur. La base de données refuse d'écrire la malédiction.");
        }
    });
}

// 2. Afficher la liste des bugs
async function chargerBugs() {
    try {
        const anomalies = await pb.collection('maledictions').getFullList({
            sort: '-created',
        });

        listeBugsEl.innerHTML = '';

        if (anomalies.length === 0) {
            listeBugsEl.innerHTML = '<p style="text-align: center; color: #2e8b57; font-style: italic;">Le grimoire est vide. Tout semble fonctionner parfaitement... pour l\'instant !</p>';
            return;
        }

        // VÉRIFICATION DE L'IDENTITÉ : Est-ce que le joueur connecté est Boxbow ?
        const estAdmin = pb.authStore.isValid && (pb.authStore.model.username === 'Boxbow' || pb.authStore.model.name === 'Boxbow');

        anomalies.forEach(bug => {
            const div = document.createElement('div');
            div.className = 'bug-card';
            
            // Gestion des couleurs si résolu
            if (bug.resolu) {
                div.style.backgroundColor = 'rgba(46, 139, 87, 0.15)';
                div.style.borderLeft = '4px solid #2e8b57';
            }

            // Affichage de la réponse
            let htmlReponse = '';
            if (bug.reponse) {
                htmlReponse = `
                    <div style="margin-top: 1rem; padding: 0.6rem; background: rgba(0, 0, 0, 0.05); border-left: 3px solid #b8860b; border-radius: 0 3px 3px 0;">
                        <strong style="font-size: 0.8rem; color: #b8860b; font-family: 'Cinzel', serif;">Réponse du Développeur :</strong>
                        <p style="font-size: 0.85rem; margin: 0.3rem 0 0 0; white-space: pre-wrap;">${bug.reponse}</p>
                    </div>
                `;
            }

            // --- ON N'AFFICHE LES BOUTONS QUE POUR BOXBOW ---
            let htmlBoutonsAdmin = '';
            if (estAdmin) {
                const texteBoutonResolu = bug.resolu ? "❌ Rouvrir le ticket" : "✔ Marquer comme terminé";
                const couleurBoutonResolu = bug.resolu ? "btn-danger" : "";
                const styleBoutonResolu = !bug.resolu ? "background-color: #2e8b57; border-color: #2e8b57;" : "";

                htmlBoutonsAdmin = `
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-action" onclick="repondreBug('${bug.id}')" style="padding: 0.2rem 0.6rem; font-size: 0.75rem; width: auto;">💬 Répondre</button>
                        <button class="btn-action ${couleurBoutonResolu}" onclick="toggleBugResolu('${bug.id}', ${bug.resolu})" style="padding: 0.2rem 0.6rem; font-size: 0.75rem; width: auto; ${styleBoutonResolu}">${texteBoutonResolu}</button>
                    </div>
                `;
            }

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <strong style="font-family: 'Cinzel', serif; font-size: 1.1rem; ${bug.resolu ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${bug.titre}</strong>
                    <small style="color: #666;">Par ${bug.auteur}</small>
                </div>
                <p style="font-size: 0.85rem; margin-top: 0.5rem; margin-bottom: 0; white-space: pre-wrap; font-family: 'Special Elite', monospace;">${bug.description}</p>
                
                ${htmlReponse}

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; border-top: 1px dashed var(--encre-noire); padding-top: 0.6rem;">
                    ${htmlBoutonsAdmin}
                    <div style="font-size: 0.7rem; color: #888; text-align: right; margin-left: auto;">
                        Signalé le ${new Date(bug.created).toLocaleDateString('fr-FR')}
                    </div>
                </div>
            `;
            listeBugsEl.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        listeBugsEl.innerHTML = '<p style="color: red; text-align: center;">Impossible de lire le grimoire.</p>';
    }
}

// 3. Actions sur les bugs (avec double sécurité)
window.repondreBug = async function(id) {
    const estAdmin = pb.authStore.isValid && (pb.authStore.model.username === 'Boxbow' || pb.authStore.model.name === 'Boxbow');
    if (!estAdmin) {
        alert("Seul le développeur peut répondre aux requêtes !");
        return;
    }

    const reponse = prompt("Entrez votre réponse (elle sera visible par tout le monde) :");
    if (reponse === null) return;

    try {
        await pb.collection('maledictions').update(id, { reponse: reponse.trim() });
        chargerBugs();
    } catch (err) {
        console.error(err);
        alert("Erreur lors de la réponse.");
    }
}

window.toggleBugResolu = async function(id, etatActuel) {
    const estAdmin = pb.authStore.isValid && (pb.authStore.model.username === 'Boxbow' || pb.authStore.model.name === 'Boxbow');
    if (!estAdmin) return;

    try {
        await pb.collection('maledictions').update(id, { resolu: !etatActuel });
        chargerBugs();
    } catch (err) {
        console.error(err);
        alert("Erreur lors du changement d'état.");
    }
}

chargerBugs();