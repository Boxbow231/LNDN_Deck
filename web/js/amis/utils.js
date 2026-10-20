// === ÉLÉMENTS DOM GLOBAUX ===
const inputRecherche = document.getElementById('recherche-pseudo');
const btnRechercher = document.getElementById('btn-rechercher');
const resultatsRecherche = document.getElementById('resultats-recherche');
const demandesListe = document.getElementById('demandes-liste');
const amisListe = document.getElementById('amis-liste');

// === UTILITAIRES ===
// Récupération de l'ID compatible avec TOUTES les versions de PocketBase
window.getUserId = function() {
    if (pb.authStore.record) return pb.authStore.record.id;
    if (pb.authStore.model) return pb.authStore.model.id;
    return null;
};