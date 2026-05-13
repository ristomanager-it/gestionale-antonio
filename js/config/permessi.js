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


// ======================================================
// Compatibilità route → permessi centralizzati
// ======================================================
if (!window.hasPermission) {
  window.hasPermission = function (route) {
    if (!route || route === "home") return true;

    const ruolo = window.normalizeRuolo
      ? window.normalizeRuolo(window.state?.viewAs || window.state?.ruolo)
      : (window.state?.viewAs || window.state?.ruolo);

    if (!window.state?.viewAs && window.state?._allAccess === true) return true;
    if (window.state?.isSuperadmin === true || ruolo === "superadmin") return true;
    if (ruolo === "admin") return true;

    const hasRep = (nome) => {
      if (typeof window.hasRepartoNome === "function") return window.hasRepartoNome(nome);
      return (window.state?.reparti || []).some(
        (r) => String(r?.nome || "").toLowerCase().trim() === String(nome).toLowerCase().trim()
      );
    };

    const managerCucina = [
      "ricettario",
      "creaRicetta",
      "planner-produzione",
      "produzione",
      "app-produzione",
      "preparazioni",
      "magazzino",
      "acquisti",
      "dipendenti",
      "dipendente",
      "timbrature",
    ];

    const managerSala = [
      "sala",
      "comanda",
      "prenotazioni",
      "prenotazioni-dettaglio",
      "prenotazioni-form",
      "prenotazioni-tavoli",
      "prenotazione-tavolo-form",
      "timbrature",
    ];

    const operatoreCucina = [
      "produzione",
      "app-produzione",
      "preparazioni",
      "ricettario",
      "magazzino",
      "timbrature",
    ];

    const operatoreSala = [
      "sala",
      "comanda",
      "prenotazioni",
      "prenotazioni-dettaglio",
      "prenotazioni-form",
      "prenotazioni-tavoli",
      "prenotazione-tavolo-form",
      "timbrature",
    ];

    if (ruolo === "manager") {
      if (["venduto", "margini"].includes(route)) return false;
      if (hasRep("cucina") && managerCucina.includes(route)) return true;
      if (hasRep("sala") && managerSala.includes(route)) return true;
    }

    if (ruolo === "operatore") {
      if (["venduto", "margini", "fatture", "dipendenti", "acquisti", "creaRicetta"].includes(route)) return false;
      if (hasRep("cucina") && operatoreCucina.includes(route)) return true;
      if (hasRep("sala") && operatoreSala.includes(route)) return true;
    }

    return window.hasPermesso(`${route}.read`) === true;
  };
}
