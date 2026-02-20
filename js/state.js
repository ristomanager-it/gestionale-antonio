// js/state.js
// ================================
// Stato globale applicazione
// ================================

window.state = {
  user: null,

  // Multi-azienda (piattaforma / SaaS)
  aziende: [],
  azienda: null,

  // Identità applicativa
  ruolo: null,

  // Permessi effettivi (merge base + override)
  permessi: null,

  // Reparti (nuova dimensione organizzativa)
  // - admin/superadmin: tutti i reparti dell'azienda
  // - manager/operatore: solo reparti assegnati (utenti_reparti)
  reparti: [],
};
