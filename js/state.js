// js/state.js
// ===============================
// Stato globale applicazione SaaS
// ===============================

const state = {
  // Utente autenticato (auth.users)
  user: null,

  // Aziende collegate all'utente
  aziende: [],

  // Azienda attualmente selezionata
  azienda: null,

  // Locale attivo (opzionale)
  locale: null,

  // Ruolo dell'utente nell'azienda
  ruolo: null,
};

/**
 * Imposta utente autenticato
 */
function setUser(user) {
  state.user = user;
}

/**
 * Imposta aziende disponibili
 */
function setAziende(aziende) {
  state.aziende = aziende || [];
}

/**
 * Seleziona azienda attiva
 */
function setAzienda(azienda) {
  state.azienda = azienda;
}

/**
 * Imposta ruolo utente nell'azienda
 */
function setRuolo(ruolo) {
  state.ruolo = ruolo;
}

/**
 * Reset completo stato (logout)
 */
function resetState() {
  state.user = null;
  state.aziende = [];
  state.azienda = null;
  state.locale = null;
  state.ruolo = null;
}

// Espone stato e mutatori in modo controllato
window.state = state;
window.stateActions = {
  setUser,
  setAziende,
  setAzienda,
  setRuolo,
  resetState,
};
