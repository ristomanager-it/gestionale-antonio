// js/state.js
// ================================
// Stato globale applicazione
// ================================

window.state = {
  user: null,

  // 🔥 Profilo applicativo (tabella profili)
  profilo: null,

  // Multi-azienda (piattaforma / SaaS)
  aziende: [],
  azienda: null,

  // 🔥 Multi-sede
  sedi: [],              // elenco sedi dell’azienda attiva
  sedeAttiva: null,      // sede attualmente selezionata

  // Identità applicativa
  ruolo: null,

  // Permessi effettivi (merge base + override)
  permessi: null,

  // Reparti assegnati all’utente
  reparti: [],

  // Reparto attivo nel contesto corrente
  repartoAttivo: null,
};
