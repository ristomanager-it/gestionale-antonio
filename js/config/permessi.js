// js/config/permessi.js
// ======================================================
// Sistema Permessi Centralizzato – Gestionale Antonio
// ======================================================

// Namespace unico globale
window.PERM = Object.freeze({

  // =========================
  // DIPENDENTI
  // =========================
  DIPENDENTI: Object.freeze({
    READ: "dipendenti.read",
    CREATE: "dipendenti.create",
    UPDATE: "dipendenti.update",
    DELETE: "dipendenti.delete",
  }),

  // =========================
  // RICETTE
  // =========================
  RICETTE: Object.freeze({
    READ: "ricette.read",
    CREATE: "ricette.create",
    UPDATE: "ricette.update",
    DELETE: "ricette.delete",
  }),

  // =========================
  // MAGAZZINO
  // =========================
  MAGAZZINO: Object.freeze({
    READ: "magazzino.read",
    CREATE: "magazzino.create",
    UPDATE: "magazzino.update",
    DELETE: "magazzino.delete",
  }),

  // =========================
  // ACQUISTI / FATTURE
  // =========================
  ACQUISTI: Object.freeze({
    READ: "acquisti.read",
    CREATE: "acquisti.create",
    UPDATE: "acquisti.update",
    DELETE: "acquisti.delete",
  }),

  // =========================
  // VENDUTO
  // =========================
  VENDUTO: Object.freeze({
    READ: "venduto.read",
    CREATE: "venduto.create",
    UPDATE: "venduto.update",
    DELETE: "venduto.delete",
  }),

  // =========================
  // REPORT
  // =========================
  REPORT: Object.freeze({
    READ: "report.read",
  }),

  // =========================
  // AZIENDE (SaaS piattaforma)
  // =========================
  AZIENDE: Object.freeze({
    READ: "aziende.read",
    CREATE: "aziende.create",
    UPDATE: "aziende.update",
    DELETE: "aziende.delete",
  })

});


// ======================================================
// 🔥 FUNZIONE CENTRALE PERMESSI (FIX)
// ======================================================

window.hasPermesso = function (permesso) {

  // 🔥 bypass totale per admin / superadmin
  if (window.state?._allAccess === true) return true;

  // sicurezza
  if (!window.state || !window.state.permessi) return false;

  return !!window.state.permessi[permesso];
};


// ======================================================
// Helper globale compatibile con hasPermesso()
// ======================================================

window.can = function (permKey) {
  return window.hasPermesso(permKey) === true;
};
