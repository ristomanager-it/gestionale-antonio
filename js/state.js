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

  // Reparti assegnati all’utente
  // - admin/superadmin: tutti i reparti azienda
  // - manager/operatore: solo quelli in utenti_reparti
  reparti: [],

  // 🔥 Reparto attivo nel contesto corrente
  // Viene impostato automaticamente:
  // - se 1 solo reparto → auto
  // - se >1 → selezionato da header
  repartoAttivo: null,
};
