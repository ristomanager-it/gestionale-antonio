// js/config/permessi.js
// ======================================================
// Sistema Permessi Centralizzato – Gestionale Antonio
// ======================================================

window.PERM = Object.freeze({
  DIPENDENTI: Object.freeze({
    READ: "dipendenti.read",
    CREATE: "dipendenti.create",
    UPDATE: "dipendenti.update",
    DELETE: "dipendenti.delete",
  }),

  RICETTE: Object.freeze({
    READ: "ricette.read",
    CREATE: "ricette.create",
    UPDATE: "ricette.update",
    DELETE: "ricette.delete",
  }),

  MAGAZZINO: Object.freeze({
    READ: "magazzino.read",
    CREATE: "magazzino.create",
    UPDATE: "magazzino.update",
    DELETE: "magazzino.delete",
  }),

  ACQUISTI: Object.freeze({
    READ: "acquisti.read",
    CREATE: "acquisti.create",
    UPDATE: "acquisti.update",
    DELETE: "acquisti.delete",
  }),

  VENDUTO: Object.freeze({
    READ: "venduto.read",
    CREATE: "venduto.create",
    UPDATE: "venduto.update",
    DELETE: "venduto.delete",
  }),

  REPORT: Object.freeze({
    READ: "report.read",
  }),

  AZIENDE: Object.freeze({
    READ: "aziende.read",
    CREATE: "aziende.create",
    UPDATE: "aziende.update",
    DELETE: "aziende.delete",
  })
});

const PLATFORM_ONLY_ROUTES = new Set([
  "homePiattaforma",
  "gestioneAziende",
  "creaAzienda",
  "modificaAzienda",
  "gestionePiani",
  "billing",
  "abbonamento",
  "superadmin",
  "saas",
  "logs",
  "audit",
  "ruoli-globali"
]);

function getRuoloPermessi() {
  const raw = window.state?.viewAs || window.state?.ruolo;
  return window.normalizeRuolo ? window.normalizeRuolo(raw) : raw;
}

function isSuperadminPermessi() {
  return (
    window.state?.isSuperadmin === true ||
    getRuoloPermessi() === "superadmin"
  );
}

// ======================================================
// Funzione centrale permessi CRUD
// ======================================================

window.hasPermesso = function (permesso) {
  const ruolo = getRuoloPermessi();

  if (isSuperadminPermessi()) return true;

  // Admin, manager e operatore hanno accesso completo ai permessi azienda.
  // Le rotte piattaforma vengono bloccate da hasPermission().
  if (["admin", "manager", "operatore"].includes(ruolo)) {
    return true;
  }

  if (!window.state || !window.state.permessi) return false;

  return !!window.state.permessi[permesso];
};

window.can = function (permKey) {
  return window.hasPermesso(permKey) === true;
};

// ======================================================
// Compatibilità route → permessi centralizzati
// ======================================================

window.hasPermission = function (route) {
  if (!route || route === "home") return true;

  const ruolo = getRuoloPermessi();

  // Piattaforma SaaS: solo superadmin.
  if (PLATFORM_ONLY_ROUTES.has(route)) {
    return isSuperadminPermessi();
  }

  if (isSuperadminPermessi()) return true;

  // Admin/manager/operatore vedono e usano tutta l'area azienda.
  if (["admin", "manager", "operatore"].includes(ruolo)) {
    return true;
  }

  return window.hasPermesso(`${route}.read`) === true;
};


const RESTRICTED_SEDI_ROUTES = new Set(["gestione-sedi"]);

const originalHasPermission = window.hasPermission;
window.hasPermission = function(route){
  const ruolo = getRuoloPermessi();
  const cleanRoute = String(route || "").split("?")[0];
  if (RESTRICTED_SEDI_ROUTES.has(cleanRoute) && ["manager","operatore"].includes(ruolo)) {
    return false;
  }
  return originalHasPermission(route);
};
