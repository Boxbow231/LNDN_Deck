// === ÉLÉMENTS DOM GLOBAUX ===
const deckValeurTotaleEl = document.getElementById('deck-valeur-totale');
const searchDeckInput = document.getElementById('search-deck-input');
const titreAventureEl = document.getElementById('aventure-titre');
const joueursListeEl = document.getElementById('joueurs-liste');
const deckTitreJoueurEl = document.getElementById('deck-titre-joueur');
const deckListeEl = document.getElementById('deck-cartes-liste');
const deckCountEl = document.getElementById('deck-count');
const catalogueListeEl = document.getElementById('catalogue-cartes-liste');
const searchInput = document.getElementById('search-input');

// DOM Modales
const modalInvitation = document.getElementById('modal-invitation');
const listeAmisInvitation = document.getElementById('liste-amis-invitation');
const btnFermerModal = document.getElementById('fermer-modal-invitation');
const foireSlotsContainer = document.getElementById('foire-slots');
const modalFoire = document.getElementById('modal-foire');
const searchFoireInput = document.getElementById('search-foire-input');
const listeCartesFoireEl = document.getElementById('liste-cartes-foire');
const fermerModalFoireBtn = document.getElementById('fermer-modal-foire');

// === VARIABLES D'ÉTAT ===
const urlParams = new URLSearchParams(window.location.search);
window.aventureId = urlParams.get('aventure');

window.toutesLesCartes = [];
window.listeJoueurs = [];
window.joueurActif = null;
window.deckRecordActif = null;
window.cartesDuDeck = [];
window.compteCartesUtilisees = {};
window.invitationsAventure = [];
window.participantsAventure = [];
window.mesDroits = "spectateur";
window.createurAventureId = null;
window.monParticipantId = null;

window.foireCartes = [null, null, null];
window.cartesBannies = [];
window.slotFoireEnCours = null;
window.slotInvitationEnCours = null;
window.bannissementListeEl = document.getElementById('bannissement-liste');

const MAX_JOUEURS = 4;
const DECKS_DE_BASE = {
    1: ["D1B01", "D1B02", "D1B03", "D1B04", "D1B04", "D1B05", "D1B06", "D1B07", "D1B08", "D1B09", "D1B10", "D1B11", "D1B11", "D1B12", "D1B12"],
    2: ["D2B01", "D2B02", "D2B03", "D2B04", "D2B04", "D2B05", "D2B06", "D2B07", "D2B08", "D2B09", "D2B10", "D2B11", "D2B11", "D2B12", "D2B12"],
    3: ["D3B01", "D3B02", "D3B03", "D3B04", "D3B04", "D3B05", "D3B06", "D3B07", "D3B08", "D3B09", "D3B10", "D3B11", "D3B11", "D3B12", "D3B12"],
    4: ["D4B01", "D4B02", "D4B03", "D4B04", "D4B04", "D4B05", "D4B06", "D4B07", "D4B08", "D4B09", "D4B10", "D4B11", "D4B11", "D4B12", "D4B12"]
};

// === UTILITAIRES ===
window.normaliserIdUtilisateur = function(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val.id) return val.id;
    return String(val);
};

window.redirigerExpulsion = function() {
    sessionStorage.setItem('message_expulsion', "Vous avez été exclu de cette aventure.");
    window.location.href = "accueil.html";
};