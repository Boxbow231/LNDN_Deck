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
                auteur: nomJoueur
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

        anomalies.forEach(bug => {
            const div = document.createElement('div');
            div.className = 'bug-card';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <strong style="font-family: 'Cinzel', serif; font-size: 1.1rem;">${bug.titre}</strong>
                    <small style="color: #666;">Par ${bug.auteur}</small>
                </div>
                <p style="font-size: 0.85rem; margin-top: 0.5rem; margin-bottom: 0; white-space: pre-wrap; font-family: 'Special Elite', monospace;">${bug.description}</p>
                <div style="font-size: 0.7rem; color: #888; margin-top: 0.5rem; text-align: right;">
                    Signalé le ${new Date(bug.created).toLocaleDateString('fr-FR')}
                </div>
            `;
            listeBugsEl.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        listeBugsEl.innerHTML = '<p style="color: red; text-align: center;">Impossible de lire le grimoire.</p>';
    }
}
chargerBugs();