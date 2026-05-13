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
// 🔥 FUNZIONE CENTRALE PERMESSI
// ======================================================

window.hasPermesso = function (permesso) {

  if (window.state?._allAccess === true) return true;

  if (!window.state || !window.state.permessi) return false;

  return !!window.state.permessi[permesso];
};


// ======================================================
// Helper globale
// ======================================================

window.can = function (permKey) {
  return window.hasPermesso(permKey) === true;
};


// ======================================================
// Compatibilità route → permessi centralizzati
// ======================================================

if (!window.hasPermission) {

  window.hasPermission = function (route) {

    if (!route || route === "home") {
      return true;
    }

    const ruolo = window.normalizeRuolo
      ? window.normalizeRuolo(
          window.state?.viewAs ||
          window.state?.ruolo
        )
      : (
          window.state?.viewAs ||
          window.state?.ruolo
        );

    // ==================================================
    // SUPERADMIN
    // ==================================================

    if (
      window.state?.isSuperadmin === true ||
      ruolo === "superadmin"
    ) {
      return true;
    }

    // ==================================================
    // ADMIN
    // ==================================================

    if (
      !window.state?.viewAs &&
      (
        window.state?._allAccess === true ||
        ruolo === "admin"
      )
    ) {
      return true;
    }

    // ==================================================
    // ROUTE BLOCCATE SOLO A ADMIN/SUPERADMIN
    // ==================================================

    const gestioneOnly = [
      "aziende",
      "azienda",
      "gestione-azienda",
      "billing",
      "abbonamento",
      "utenti-aziende",
      "superadmin",
      "saas",
      "logs",
      "audit",
      "ruoli-globali",
    ];

    if (
      ruolo === "manager" &&
      gestioneOnly.includes(route)
    ) {
      return false;
    }

    // ==================================================
    // MANAGER = quasi tutto operativo
    // ==================================================

    if (ruolo === "manager") {
      return true;
    }

    // ==================================================
    // OPERATORE
    // ==================================================

    const operatoreAllowed = [

      // cucina
      "ricettario",
      "produzione",
      "app-produzione",
      "preparazioni",
      "magazzino",

      // sala
      "sala",
      "comanda",
      "prenotazioni",
      "prenotazioni-dettaglio",
      "prenotazioni-form",
      "prenotazioni-tavoli",
      "prenotazione-tavolo-form",

      // comuni
      "home",
      "timbrature",
      "profilo",
      "notifiche",

    ];

    const operatoreDenied = [
      "dipendenti",
      "dipendente",
      "creaRicetta",
      "acquisti",
      "fatture",
      "aziende",
      "billing",
      "superadmin",
      "utenti-aziende",
    ];

    if (ruolo === "operatore") {

      if (operatoreDenied.includes(route)) {
        return false;
      }

      return operatoreAllowed.includes(route);

    }

    // ==================================================
    // FALLBACK PERMESSI DB
    // ==================================================

    return window.hasPermesso(`${route}.read`) === true;

  };

}
