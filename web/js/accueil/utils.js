// === ÉLÉMENTS DOM GLOBAUX ===
const aventuresContainer = document.getElementById('aventures-liste');
const createForm = document.getElementById('create-aventure-form');
const zoneInvitations = document.getElementById('zone-invitations-aventure');
const listeInvitations = document.getElementById('invitations-aventure-liste');

// === UTILITAIRES ===
function normaliserIdUtilisateur(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val.id) return val.id;
    return String(val);
}

// === CONSTANTES ===
const DECKS_DE_BASE = {
    1: ["D1B01", "D1B02", "D1B03", "D1B04", "D1B04", "D1B05", "D1B06", "D1B07", "D1B08", "D1B09", "D1B10", "D1B11", "D1B11", "D1B12", "D1B12"],
    2: ["D2B01", "D2B02", "D2B03", "D2B04", "D2B04", "D2B05", "D2B06", "D2B07", "D2B08", "D2B09", "D2B10", "D2B11", "D2B11", "D2B12", "D2B12"],
    3: ["D3B01", "D3B02", "D3B03", "D3B04", "D3B04", "D3B05", "D3B06", "D3B07", "D3B08", "D3B09", "D3B10", "D3B11", "D3B11", "D3B12", "D3B12"],
    4: ["D4B01", "D4B02", "D4B03", "D4B04", "D4B04", "D4B05", "D4B06", "D4B07", "D4B08", "D4B09", "D4B10", "D4B11", "D4B11", "D4B12", "D4B12"]
};

// === GESTION DES MENUS DÉROULANTS ===
window.toggleMenu = function(event, aventureId) {
    event.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `menu-${aventureId}`) m.classList.remove('show');
    });
    const menu = document.getElementById(`menu-${aventureId}`);
    if (menu) menu.classList.toggle('show');
};

window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
});

window.ouvrirAventure = function(aventureId) {
    window.location.href = `deck.html?aventure=${aventureId}`;
};