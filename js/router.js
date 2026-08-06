import { supabase } from "./supabaseClient.js";
import { initMenu } from "./menu.js?v=35";
window.initMenu = initMenu;

/* =========================================================
   VERSIONE APP (cache-busting)
   Bumpare APP_V a ogni deploy: tutti i moduli vengono
   riscaricati subito dai browser, senza aspettare la cache.
========================================================= */
const APP_V = "20260806-10";
window.APP_V = APP_V;
function imp(p) { return import(p + (p.includes("?") ? "&" : "?") + "v=" + APP_V); }
// Footer rimosso — import commentato
// import { renderFooter, initFooter } from "./components/footer.js";
/* =========================================================
   SUPABASE EMAIL LINK HANDLER
========================================================= */

(function fixSupabaseEmailLink() {
  const hash = window.location.hash || "";

  if (hash.startsWith("#access_token=")) {
    const tokens = hash.substring(1);
    window.location.hash = "#/set-password?" + tokens;
  }
})();

/* =========================================================
   FIX SUPABASE HASH
========================================================= */

(function fixSupabaseHash() {
  const h = window.location.hash || "";

  if (h.startsWith("#/set-password#")) {
    const tokens = h.split("#")[2];
    window.location.hash = "#/set-password?" + tokens;
    return;
  }

  if (h.startsWith("#/activate#")) {
    const tokens = h.split("#")[2];
    window.location.hash = "#/activate?" + tokens;
  }
})();

let app = null;

/* =========================================================
   ROUTES (PULITO + CAMPAGNE)
========================================================= */

const routes = {
  login: () => imp("./views/login.js"),
  home: () => imp("./views/home.js"),
  "accessi-app": () => imp("./views/accessi-app.js"),

  "s": () => imp("./views/short-link-redirect.js"),
  "evento-serata": () => imp("./views/evento-serata.js"),
  "recensione": () => imp("./views/recensione.js"),
  "preventivo": () => imp("./views/preventivo-cliente.js"),
  "invito": () => imp("./views/invito.js"),
  "spazio": () => imp("./views/spazio-sposi.js"),
  "recensioni": () => imp("./views/recensioni.js"),
  "evento-prenotazione": () => imp("./views/evento-prenotazione.js"),
  "bo-evento": () => imp("./views/bo/bo-evento.js"),
  "bo-shortlink": () => imp("./views/bo/bo-shortlink.js"),

  "home-admin": () => imp("./views/home-admin.js"),
  "dashboard-dettaglio": () => imp("./views/home-admin-dettaglio.js"),
  "home-manager": () => imp("./views/home-manager.js"),
  "home-operatore": () => imp("./views/home-operatore.js"),

  homePiattaforma: () => imp("./views/home-piattaforma.js"),
  "home-agente": () => imp("./views/home-agente.js"),
  "social-utenti": () => imp("./views/social-utenti.js"),

  creaAzienda: () => imp("./views/crea-azienda.js"),
  gestioneAziende: () => imp("./views/gestione-aziende.js"),
  gestioneWeddingPlanner: () => imp("./views/gestione-wedding-planner.js"),
  modificaAzienda: () => imp("./views/modifica-azienda.js"),
  gestionePiani: () => imp("./views/gestione-piani.js"),

  activate: () => imp("./views/activate.js"),

  cliente: () => imp("./views/cliente.js"),

  setPassword: () => imp("./views/set-password.js"),
  "set-password": () => imp("./views/set-password.js"),

  sceltaAzienda: () => imp("./views/scelta-azienda.js"),

  "gestione-sedi": () => imp("./views/gestione-sedi.js"),

  operativo: () => imp("./views/operativo.js"),
  amministrazione: () => imp("./views/amministrazione.js"),
  gestione: () => imp("./views/gestione.js"),
  "ricette-semplici": () =>
    imp("./views/crea-ricetta.js"),
  "permessi-operatore": () =>
    imp("./views/permessi-operatore/index.js"),

  // =========================
  // MARKETING (globale - lettura)
  // =========================
  "bo-marketing": () => imp("./views/bo/bo-marketing.js"),
  "bo-presenze": () => imp("./views/bo/bo-presenze.js"),
  "bo-analytics": () => imp("./views/bo/bo-analytics.js"),
  "bo-onboarding": () => imp("./views/bo/bo-onboarding.js"),
  "bo-promo": () => imp("./views/bo/bo-promo.js"),
  "bo-promo-analisi": () => imp("./views/bo/bo-promo-analisi.js"),
  "ticket-vendite": () => imp("./views/bo/ticket-vendite.js"),
  "ticket-checkin": () => imp("./views/bo/ticket-checkin.js"),
  "bo-catenarie": () => imp("./views/bo/bo-catenarie.js"),
  "bo-calendario": () => imp("./views/bo/bo-calendario.js"),
  "bo-crediti": () => imp("./views/bo/bo-crediti.js"),
  consumiAI: () => imp("./views/piattaforma/consumiAI.js"),
  "bo-whatsapp": () => imp("./views/bo/bo-whatsapp.js"),
  "bo-chatbot": () => imp("./views/bo/bo-chatbot.js"),
  "bo-media": () => imp("./views/bo/bo-media.js"),
  "bo-sito": () => imp("./views/bo/bo-sito.js"),

  dipendenti: () => imp("./views/dipendenti.js"),
  dipendente: () => imp("./views/dipendente.js"),
  "crea-dipendente": () => imp("./views/crea-dipendente.js"),
"organizzazione": () => imp("./views/organizzazione.js"),
"persone": () => imp("./views/persone.js"),
"manuale-operativo": () => imp("./views/manuale-operativo.js"),
  "bo-agenzie": () => imp("./views/bo/bo-agenzie.js"),
  "bo-location-ricevimenti": () => imp("./views/bo/bo-location-ricevimenti.js"),
  timbrature: () => imp("./views/timbrature.js"),
  "planning-lavoro": () => imp("./views/planning-lavoro.js"),

  completaProfilo: () => imp("./views/completa-profilo.js"),
  profilo: () => imp("./views/completa-profilo.js"),
  completaAzienda: () => imp("./views/completa-azienda.js"),
"scegli-sede": () => imp("./views/scegli-sede.js"),
  acquisti: () => imp("./views/acquisti/index.js"),
  "menu-giorno": () => imp("./views/menu-giorno.js"),
  "menu-componibile": () => imp("./views/menu-componibile.js"),
  magazzino: () => imp("./views/magazzino/magazzino.js"),
  ordini: () => imp("./views/ordini.js"),
  ordine: () => imp("./views/ordine.js"),

  produzione: () => imp("./views/produzione.js"),
  "produzioni-aperte": () => imp("./views/produzioni-aperte.js"),
  "registro-lotti": () => imp("./views/registro-lotti.js"),
  "produttivita-produzione": () => imp("./views/produttivita-produzione.js"),
  "registro-messaggi": () => imp("./views/registro-messaggi.js"),
  storicoLotto: () => imp("./views/storico-lotto.js"),
  ricettario: () => imp("./views/ricettario.js"),
  "planner-produzione": () => imp("./views/planner-produzione.js"),
  // Editor ricette UNICO: modalità semplice/avanzata dentro crea-ricetta.js
  creaRicetta: () => imp("./views/crea-ricetta.js"),
  "crea-ricetta":          () => imp("./views/crea-ricetta.js"),
  "crea-ricetta-avanzata": () => imp("./views/crea-ricetta.js"),
  "abbina-articoli": () => imp("./views/abbina-articoli.js"),
  "menu-engineering": () => imp("./views/menu-engineering.js"),
  "super-tony": () => imp("./views/super-tony.js"),
  preparazioni: () => imp("./views/preparazioni.js"),
  reparti: () => imp("./views/reparti.js"),
  venduto: () => imp("./views/venduto.js"),
  margini: () => imp("./views/margini.js"),
  "food-cost-mancanti": () => imp("./views/food-cost-mancanti.js"),
  "spese-fisse": () => imp("./views/spese-fisse.js"),
  "menu-intelligence": () => imp("./views/menu-engineering.js"),
  "cassa-libera": () => imp("./views/cassa/cassa-libera.js"),

  preventivi: () => imp("./views/preventivi.js"),
  creaPreventivo: () => imp("./views/crea-preventivo.js"),
  "preventivo-vecchio": () => imp("./views/crea-preventivo-vecchio.js"),
  ai: () => imp("./views/ai.js"),

  permessi: () => imp("./views/permessi-ferie.js"),

  // ── HR — Gestione personale ──
  "hr-richieste":    () => imp("./views/hr-richieste.js"),
  "hr-admin":        () => imp("./views/hr-admin.js"),
  "hr-buste-paga":   () => imp("./views/hr-buste-paga.js"),
  "hr-costi":        () => imp("./views/hr-costi.js"),
  "ricette-da-verificare": () => imp("./views/ricette-da-verificare.js"),
  "servizi-eventi": () => imp("./views/servizi-eventi.js"),
  "hr-fascicolo":    () => imp("./views/hr-fascicolo.js"),
  "hr-documenti":    () => imp("./views/hr-documenti.js"),
  "hr-documenti-me": () => imp("./views/hr-documenti.js"),
  manuale: () => imp("./views/manuale.js"),

  sala: () => imp("./views/sala.js"),
  "mansionario-sala":      () => imp("./views/bo-sala-mansionario.js"),
  "mansionario-cucina":    () => imp("./views/bo-sala-mansionario.js"),
  "mansionario-tasting":   () => imp("./views/bo-sala-mansionario.js"),
  "mansionario-operatore": () => imp("./views/mansionario-operatore.js"),
  "mansionario-controllo": () => imp("./views/mansionario-controllo.js"),

  "prenotazione-online": () => imp("./views/prenotazioni/prenotazione-online.js"),
  "prenotazioni-tavoli": () => imp("./views/prenotazioni-tavoli.js"),
  "prenotazione-tavolo-form": () => imp("./views/prenotazioni/form.js"),
  "prenotazioni-form": () => imp("./views/prenotazioni/form.js"),
  "prenotazioni-rifiutate": () => imp("./views/prenotazioni/rifiutate.js"),

  prenotazioni: () => imp("./views/prenotazioni/index.js"),
  "prenotazioni-dettaglio": () => imp("./views/prenotazioni/scheda-prenotazione.js"),

  campagne: () => imp("./views/campagne/index.js"),
  "booking-form-builder": () => imp("./views/booking/booking-form-builder.js"),

  comanda: () => imp("./views/comanda.js"),

  // =========================
  // BACK OFFICE (COSTRUZIONE)
  // =========================
  "bo-dashboard": () => imp("./views/bo/bo-dashboard.js"),
  "bo-tag": () => imp("./views/bo/bo-tag.js"),
  "bo-template": () => imp("./views/bo/bo-template.js"),
  "bo-candidature": () => imp("./views/bo/bo-candidature.js"),
  "bo-bilancio":     () => imp("./views/bo/bo-bilancio.js"),
  "bo-survey":      () => imp("./views/bo/bo-survey.js"),

  // MENU
  "bo-menu": () => imp("./views/bo/bo-menu-builder.js"),
  "bo-fidelity": () => imp("./views/bo/bo-fidelity.js"),
  "bo-categorie": () => imp("./views/bo/categorie.js"),
  "bo-prodotti": () => imp("./views/bo/prodotti.js"),

  // PRODUZIONE
  "bo-magazzino": () => imp("./views/bo/bo-magazzino.js"),
  "bo-comande": () => imp("./views/bo/bo-comande.js"),
  "bo-configurazione": () => imp("./views/bo/bo-configurazione.js"),
  "alert-haccp-config": () => imp("./views/bo/alert-haccp-config.js"),
  "bo-dispositivi": () => imp("./views/bo/bo-dispositivi.js"),
  "bo-consulenti": () => imp("./views/bo/bo-consulenti.js"),
  "home-consulente": () => imp("./views/home-consulente.js"),
  "home-commercialista": () => imp("./views/home-commercialista.js"),


    // =========================================================
  // APP (OPERATIVO)
  // =========================================================
  "app-produzione": () => imp("./views/app/app-produzione.js"),

  // =========================
  // DISPLAY (tablet fissi)
  // =========================
  "display-cucina": () => imp("./views/display/display-cucina.js"),
  "kds": () => imp("./views/display/kds.js"),
  "kds-produzioni": () => imp("./views/display/kds-produzioni.js"),

}; // 

/* =========================================================
   ROUTE SCOPE
========================================================= */

const PUBLIC_ROUTES = new Set([
  "login",
  "activate",
  "setPassword",
  "set-password",
  "prenota",
  "booking",
  "prenotazione-online",
  "prenotazione",
  "s",
  "evento-serata",
  "evento-prenotazione",
  "recensione",
  "preventivo",
  "invito",
  "spazio"
]);

const PLATFORM_ROUTES = new Set([
  "homePiattaforma",
  "consumiAI",
  "gestioneAziende",
  "gestioneWeddingPlanner",
  "creaAzienda",
  "modificaAzienda",
  "gestionePiani",
  "bo-evento",
]);

const PREHOME_ROUTES = new Set([
  "sceltaAzienda",
  "gestione-sedi",
  "scegli-sede",
  "completaProfilo",
  "completaAzienda",
]);

const ROOT_ROUTES = new Set(["home", "homePiattaforma", "home-consulente", "home-commercialista", "home-agente"]);

const BO_ROUTES = new Set([
  "bo-dashboard",
  "bo-analytics",

  // MARKETING
  "bo-tag",
  "bo-template",
  "bo-candidature",
  "bo-bilancio",
  "bo-survey",

  // MENU
  "bo-menu",
  "bo-categorie",
  "bo-prodotti",

  // PRODUZIONE
  "bo-magazzino",
  "ordini",
  "ordine",
  "acquisti",
  "food-cost-mancanti",
  "spese-fisse",
  "menu-giorno",
  "menu-componibile",
  "bo-comande",
  "bo-configurazione",
  "bo-promo",
  "bo-promo-analisi",
  "bo-catenarie",
  "bo-calendario",
  "bo-crediti",
  "bo-dispositivi",
  "bo-whatsapp",
  "bo-chatbot",
  "bo-media",
  "bo-sito",
]);

// Display tablet — bypassano auth contesto operativo, hanno PIN proprio
const DISPLAY_ROUTES = new Set([
  "display-cucina",
]);

// Addetto marketing: ruolo con accesso limitato all'area marketing + prenotazioni
const ADDETTO_MARKETING_ROUTES = new Set([
  // Marketing core
  "bo-template", "bo-tag", "bo-marketing", "bo-catenarie", "bo-promo", "bo-promo-analisi",
  "bo-calendario",
  // Fidelity
  "bo-fidelity",
  // Sito / Media
  "bo-sito", "bo-media",
  // Prenotazioni / clienti
  "prenotazioni", "prenotazioni-tavoli",
  // Essenziali
  "home", "profilo", "completaProfilo", "scegli-sede",
]);
/* =========================================================
   STORAGE KEYS
========================================================= */

const LS_KEYS = {
  ACTIVE_AZIENDA_ID: "active_azienda_id",
  ACTIVE_SEDE_ID: "active_sede_id",
};

/* =========================================================
   PARSE HASH
========================================================= */

function parseHash() {
  const raw = window.location.hash || "#/login";
  const cleaned = raw.replace("#/", "");
  const [path, queryString] = cleaned.split("?");

  const params = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
  }

  const segments = path.split("/").filter(Boolean);

  return {
    route: segments[0] || "login",
    segments,
    params,
  };
}

/* =========================================================
   RENDER VIEW
========================================================= */

async function renderView(routeName) {

  if (!routes[routeName]) {
    routeName = "home";
  }

  if (!app) return;

  app.innerHTML = "";

  const sub =
    document.getElementById("page-subheader");

  const foot =
    document.getElementById("footer-root");

  if (sub) sub.innerHTML = "";
  if (foot) foot.innerHTML = "";

  const module =
    await routes[routeName]();

  if (!module.render) {

    throw new Error(
      `La view ${routeName} non esporta render()`
    );

  }

  await module.render(app);

  // Registro accessi (admin): una riga per ogni pagina aperta da utente loggato.
  // Fire-and-forget: non rallenta e non blocca mai la navigazione.
  try {
    const u = window.state?.user;
    if (u && routeName !== "login") {
      const chiave = routeName + "|" + u.id;
      if (window.__lastAccessLog !== chiave || (Date.now() - (window.__lastAccessLogTs || 0)) > 60000) {
        window.__lastAccessLog = chiave;
        window.__lastAccessLogTs = Date.now();
        const d = window.state?.dipendente;
        const sb = window.supabaseClient || supabase;
        sb.from("app_accessi").insert({
          azienda_id: window.state?.azienda?.id || null,
          user_id: u.id,
          dipendente_id: d?.id || null,
          nome: d ? ((d.nome || "") + " " + (d.cognome || "")).trim() : (u.email || ""),
          route: routeName,
          hash: String(window.location.hash || "").slice(0, 200),
          user_agent: String(navigator.userAgent || "").slice(0, 250),
          schermo: (window.screen?.width || 0) + "x" + (window.screen?.height || 0)
        }).then(() => {}, () => {});
      }
    }
  } catch (e) { /* no-op */ }

  // Deep-link generico alle tab: se l'hash contiene ?tab=X, seleziona quella tab
  // cliccando il bottone [data-tab="X"] (convenzione comune a tutte le view, con
  // classi diverse: tab-btn, cb-tab, disp-tab, sw-tab, sv-nav, rf-nav-btn...).
  // Se il bottone è già attivo (active/attiva/att) si salta: niente doppio render
  // per le view che gestiscono già ?tab= internamente (Acquisti, Sito).
  try {
    const _q = (window.location.hash.split("?")[1] || "");
    const _tab = new URLSearchParams(_q).get("tab");
    if (_tab) {
      setTimeout(() => {
        const _btn = app.querySelector('button[data-tab="' + _tab + '"]')
                  || app.querySelector('[data-tab="' + _tab + '"]');
        if (_btn) {
          const cl = _btn.classList;
          const giaAttivo = cl.contains("active") || cl.contains("attiva") || cl.contains("att");
          if (!giaAttivo) _btn.click();
        }
      }, 0);
    }
  } catch (e) { /* no-op */ }

  // Footer rimosso intenzionalmente

}

/* =========================================================
   SUPERADMIN
========================================================= */

function isSuperadmin() {

  return (

    !window.state?.viewAs &&

    (

      window.state?.isSuperadmin === true ||

      (

        window.normalizeRuolo
          ? window.normalizeRuolo(
              window.state?.ruolo
            )
          : window.state?.ruolo

      ) === "superadmin"

    )

  );

}

function hasPermission(area) {

  if (!area || area === "home") {
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

  const extra =
    window.state?.permessiExtra || [];

  // =====================================
  // ROTTE PIATTAFORMA
  // =====================================

  if (PLATFORM_ROUTES.has(area)) {
    return isSuperadmin();
  }

  // =====================================
  // PREHOME
  // =====================================

  if (PREHOME_ROUTES.has(area)) {
    return true;
  }

  // =====================================
  // SUPERADMIN
  // =====================================

  if (isSuperadmin()) {
    return true;
  }

  // =====================================
  // ADDETTO MARKETING (scope limitato)
  // =====================================

  if (ruolo === "addetto_marketing") {
    return ADDETTO_MARKETING_ROUTES.has(String(area).split("?")[0]);
  }

  // =====================================
  // TIMBRATURE GLOBALI
  // =====================================

  if (
    area === "timbrature" &&
    (
      ruolo === "admin" ||
      ruolo === "manager" ||
      ruolo === "superadmin"
    )
  ) {

    return true;

  }

  // =====================================
  // SOLO ADMIN (non manager, non operatore)
  // =====================================

  const ADMIN_ONLY_ROUTES = new Set([
    // Marketing & CRM
    "bo-tag",
    "bo-template",
    "bo-marketing",
    "bo-catenarie",
    // Personale — selezione e ascolto
    "bo-candidature",
  "bo-bilancio",
    "bo-survey",
    // Produzione — dati di controllo/produttività (solo admin)
    "produttivita-produzione",
  ]);

  if (ADMIN_ONLY_ROUTES.has(area)) {
    return ruolo === "admin";
  }

  // =====================================
  // ADMIN / MANAGER
  // =====================================

  if (
    ruolo === "admin" ||
    ruolo === "manager"
  ) {

    return true;

  }

  // =====================================
  // AGENZIA (wedding planner e simili)
  // Non e' personale interno: vede solo la parte eventi, e nel database
  // le regole la limitano ai preventivi della sua agenzia.
  // =====================================

  if (ruolo === "agenzia") {

    const permesse = [
      "home",
      "preventivi",
      "creaPreventivo",
      "crea-preventivo",
      "bo-location-ricevimenti",
      "profilo",
      "completa-profilo",
    ];

    return permesse.includes(area);

  }

  // =====================================
  // OPERATORE BASE
  // =====================================

  if (ruolo === "operatore") {

    const allowed = [

      "home",
      "home-operatore",

      "sala",
      "comanda",
      "bo-comande",

      // Cucina
      "ricettario",
      "crea-ricetta-avanzata",
      "preparazioni",
      "app-produzione",
      "produzione",
      "produzioni-aperte",
      "registro-lotti",
      "registro-messaggi",
      "recensioni",
      "display-cucina",
      "kds",
      "kds-produzioni",

      // Timbrature e profilo
      "timbrature",
      "planning-lavoro",
      "profilo",
      "completa-profilo",

      // Prenotazioni
      "prenotazioni",
      "prenotazioni-dettaglio",
      "prenotazioni-tavoli",

      // HR personale: solo le SUE cose, non i costi ne' le buste degli altri
      "hr-richieste",
      "hr-documenti-me",

      "mansionario-operatore",

      "ai"

    ];

    if (allowed.includes(area)) {
      return true;
    }

  }

  // =====================================
  // PERMESSI EXTRA
  // =====================================

const routePermissions = {

  "menu-intelligence":
    "margini.read",

  "planner-produzione":
    "planning.write",

  "acquisti":
    "acquisti.write",

  "magazzino":
    "magazzino.write",

  "ricettario":
    "ricette.write",

  "mansionario-sala":
    "sala.read",

  "creaRicetta":
    "ricette.write",

  "crea-ricetta-avanzata":
    "ricette.write",

  "dipendenti":
    "dipendenti.read",

  "dipendente":
    "dipendenti.read",

  "crea-dipendente":
    "dipendenti.write",

  "bo-agenzie":
    "dipendenti.write",

  "bo-location-ricevimenti":
    "prenotazioni.write",

  "timbrature-consulente":
    "dipendenti.read",

  "hr-admin":
    "dipendenti.read",

  "hr-fascicolo":
    "dipendenti.read",

  "hr-documenti":
    "dipendenti.read",

  "hr-richieste":
    "dipendenti.read",

  "bo-bilancio-consulente":
    "bilancio.read",

  "acquisti-consulente":
    "bilancio.read",

  "ricette-semplici":
    "ricette.write",

  "abbina-articoli":
    "ricette.write",

  "menu-engineering":
    "bilancio.read",

};

  const neededPermission =
    routePermissions[area];

  if (
    neededPermission &&
    extra.includes(neededPermission)
  ) {

    return true;

  }

  // =====================================
  // CONSULENTE DEL LAVORO
  // =====================================

  if (ruolo === "consulente_lavoro") {
    const allowed_consulente = [
      "home",
      "dipendenti",
      "dipendente",
      "crea-dipendente",
      "timbrature",
      "hr-admin",
      "hr-fascicolo",
      "hr-documenti",
      "hr-documenti-me",
      "hr-richieste",
      "completa-profilo",
      "profilo",
    ];
    return allowed_consulente.includes(area);
  }

  // =====================================
  // COMMERCIALISTA
  // =====================================

  if (ruolo === "commercialista") {
    const allowed_comm = [
      "home",
      "bo-bilancio",
      "acquisti",
      "completa-profilo",
      "profilo",
    ];
    return allowed_comm.includes(area);
  }

  // =====================================
  // FALLBACK LEGACY
  // =====================================

  const permessi =
    window.state?.permessi || {};

  return (
    permessi[`${area}.read`] === true
  );

}
  
/* =========================================================
   UI HELPERS
========================================================= */

function setHeaderVisible(visible) {
  const header = document.querySelector(".app-header");
  if (header) header.style.display = visible ? "flex" : "none";

  const topbar = document.getElementById("topbar-info");
  if (topbar) topbar.style.display = visible ? "flex" : "none";
}

function getStoredAziendaId() {
  return localStorage.getItem(LS_KEYS.ACTIVE_AZIENDA_ID);
}

function setStoredAziendaId(id) {
  if (!id) return;
  localStorage.setItem(LS_KEYS.ACTIVE_AZIENDA_ID, String(id));
}

function clearStoredAziendaId() {
  localStorage.removeItem(LS_KEYS.ACTIVE_AZIENDA_ID);
}

function getStoredSedeId() {
  return localStorage.getItem(LS_KEYS.ACTIVE_SEDE_ID);
}

function setStoredSedeId(id) {
  if (!id) return;
  localStorage.setItem(LS_KEYS.ACTIVE_SEDE_ID, String(id));
}

function clearStoredSedeId() {
  localStorage.removeItem(LS_KEYS.ACTIVE_SEDE_ID);
}

/* =========================================================
   AUTH + CONTEXT HELPERS
========================================================= */

async function getValidSession() {
  const { data } = await supabase.auth.getSession();
  let session = data?.session || null;

  if (!session) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed?.session || null;
  }

  return session;
}

async function loadAziendeForUser(userId) {
  const { data: aziende, error } = await supabase
    .from("utenti_aziende")
    .select(
      `
      ruolo,
      permessi_override,
      aziende:azienda_id (
        id,
        nome,
        codice,
        stato,
        attiva,
        data_scadenza,
        features,
        logo_path,
        logo_url,
        piano_id,
        stato_attivazione,
        profilo_completato
      )
    `
    )
    .eq("user_id", userId)
    .eq("attivo", true);

  if (error) {
    console.error("Errore caricamento aziende:", error);
    return [];
  }

  return (aziende || []).filter((a) => a.aziende);
}

function pickActiveAzienda(aziendePulite, preferBozza = false) {
  // Se cerchiamo la bozza (es. route completaAzienda), priorità assoluta
  if (preferBozza) {
    const bozza = aziendePulite.find(
      (a) => a.aziende && (!a.aziende.profilo_completato || a.aziende.stato_attivazione === "bozza")
    );
    if (bozza?.aziende) return bozza.aziende;
  }

  const storedId = getStoredAziendaId();

  // PRIORITÀ MASSIMA: la sede ATTIVA in memoria (quella mostrata nell'header)
  // conosce la propria azienda. Se sono già dentro una sede, l'azienda è la sua,
  // anche quando window.state.sedi non è ancora caricato entrando in una rotta BO
  // (es. Acquisti) e getStoredSedeId() in localStorage non è allineato.
  try {
    const sedeAtt = window.state?.sedeAttiva;
    if (sedeAtt?.azienda_id) {
      const matchAttiva = aziendePulite.find(
        a => String(a.aziende?.id) === String(sedeAtt.azienda_id)
      );
      if (matchAttiva?.aziende) return matchAttiva.aziende;
    }
  } catch (e) { /* prosegue con la logica standard sotto */ }

  // La sede attiva (quella mostrata nell'header) è la verità: se punta a
  // un'azienda diversa da quella salvata, la sede vince. Evita che, avendo
  // più aziende (es. superadmin), si venga rimandati a un'azienda vecchia
  // salvata in localStorage mentre si sta operando su un'altra sede.
  try {
    const storedSedeId = getStoredSedeId();
    if (storedSedeId && window.state?.sedi?.length) {
      const sede = window.state.sedi.find(s => String(s.id) === String(storedSedeId));
      if (sede?.azienda_id) {
        const matchSede = aziendePulite.find(a => String(a.aziende.id) === String(sede.azienda_id));
        if (matchSede?.aziende) return matchSede.aziende;
      }
    }
  } catch (e) { /* prosegue con la logica standard sotto */ }

  if (storedId) {
    const match = aziendePulite.find(
      (a) => String(a.aziende.id) === String(storedId)
    );
    if (match?.aziende) return match.aziende;
  }

  if (aziendePulite.length === 1) {
    return aziendePulite[0].aziende;
  }

  // Più aziende, nessun match da localStorage: provo a dedurre l'azienda
  // dalla sede attiva salvata (una sede appartiene a una sola azienda).
  try {
    const storedSedeId = getStoredSedeId();
    if (storedSedeId && window.state?.sedi?.length) {
      const sede = window.state.sedi.find(s => String(s.id) === String(storedSedeId));
      if (sede?.azienda_id) {
        const match = aziendePulite.find(a => String(a.aziende.id) === String(sede.azienda_id));
        if (match?.aziende) return match.aziende;
      }
    }
  } catch (e) { /* fallback sotto */ }

  // Fallback: se un'azienda è GIÀ attiva ed è tra quelle dell'utente, mantienila.
  // Evita di perdere il contesto azienda navigando verso rotte BO (Acquisti, ecc.)
  // prima che le sedi siano caricate, quando il superadmin ha più aziende.
  if (window.state?.azienda?.id) {
    const corrente = aziendePulite.find(a => String(a.aziende?.id) === String(window.state.azienda.id));
    if (corrente?.aziende) return corrente.aziende;
  }

  return null;
}

function applyAziendaContextFromLink(aziendePulite, azienda) {
  if (!azienda) return;

  const recordAttivo = aziendePulite.find((a) => a.aziende?.id === azienda.id);

  window.state.isSuperadmin = aziendePulite.some((a) => a.ruolo === "superadmin");

  const ruoloEffettivoRaw = window.state.isSuperadmin
    ? "superadmin"
    : recordAttivo?.ruolo || "admin";

  window.stateActions.setRuolo(ruoloEffettivoRaw);
  window.state.ruoloRaw = ruoloEffettivoRaw;
  window.state.ruolo = window.normalizeRuolo ? window.normalizeRuolo(ruoloEffettivoRaw) : ruoloEffettivoRaw;
  window.state.permessiOverride = recordAttivo?.permessi_override || {};
}

function isAziendaBlockedForUser(azienda, routeName) {
  if (!azienda) return true;
  if (isSuperadmin()) return false;

  if (PLATFORM_ROUTES.has(routeName)) return false;
  if (routeName === "completaAzienda") return false;

  if (azienda.stato === "piattaforma") return false;

  if (azienda.stato !== "attiva") return true;

  if (azienda.attiva === false) return true;

  return false;
}

async function ensureAziendaContext(routeName) {
  const user = window.state?.user;
  if (!user) return { ok: false, reason: "no_user" };

  const aziendePulite = await loadAziendeForUser(user.id);

  window.stateActions.setAziende(aziendePulite);

  if (aziendePulite.length === 0) {
    window.stateActions.resetAzienda();
    return { ok: false, reason: "no_aziende" };
  }

  const preferBozza = routeName === "completaAzienda";
  let activeAzienda = pickActiveAzienda(aziendePulite, preferBozza);

  // Fallback robusto: se non l'abbiamo trovata ma c'è una sede salvata, deduci
  // l'azienda dalla sede leggendola dal DB (window.state.sedi può non essere
  // ancora caricato quando si entra in una rotta BO come Acquisti).
  if (!activeAzienda) {
    const storedSedeId = getStoredSedeId();
    if (storedSedeId) {
      try {
        const { data: sedeRow } = await window.supabase
          .from("sedi").select("azienda_id").eq("id", storedSedeId).maybeSingle();
        if (sedeRow?.azienda_id) {
          const match = aziendePulite.find(a => String(a.aziende?.id) === String(sedeRow.azienda_id));
          if (match?.aziende) activeAzienda = match.aziende;
        }
      } catch (e) { /* prosegue con il reset sotto */ }
    }
  }

  // Se abbiamo trovato una bozza, aggiorna il localStorage così i resolve() successivi la mantengono
  if (preferBozza && activeAzienda) {
    setStoredAziendaId(activeAzienda.id);
  }

  if (!activeAzienda) {
    window.stateActions.resetAzienda();
    if (routeName !== "sceltaAzienda") {
      window.location.hash = "#/sceltaAzienda";
      return { ok: false, redirected: true };
    }
    return { ok: false, reason: "need_choice" };
  }

  setStoredAziendaId(activeAzienda.id);

  if (!window.state.azienda || window.state.azienda.id !== activeAzienda.id) {
    window.stateActions.setAzienda(activeAzienda);
  } else {
    window.state.azienda = activeAzienda;
  }

  applyAziendaContextFromLink(aziendePulite, activeAzienda);

  return { ok: true, azienda: activeAzienda, aziendePulite };
}

async function loadPianoForAzienda(azienda) {
  if (!azienda) {
    window.state.piano = null;
    return;
  }

  if (azienda.piano_id) {
    const { data: piano, error } = await supabase
      .from("piani_abbonamento")
      .select("*")
      .eq("id", azienda.piano_id)
      .single();

    if (error) {
      console.error("Errore caricamento piano:", error);
      window.state.piano = null;
      return;
    }

    window.state.piano = piano || null;
  } else {
    window.state.piano = null;
  }

  const pianoFeatures = window.state.piano?.features || {};
  const aziendaOverride = azienda.features || {};

  window.state.featuresEffettive = {
    ...pianoFeatures,
    ...aziendaOverride,
  };
}

async function loadSediForAzienda(aziendaId) {
  const { data, error } = await supabase
    .from("sedi")
    .select("id, nome, indirizzo, latitudine, longitudine")
    .eq("azienda_id", aziendaId)
    .order("nome", { ascending: true });

  if (error) {
    console.error("Errore caricamento sedi:", error);
    return [];
  }

  return data || [];
}

function pickActiveSede(sedi) {
  // 1. Ultima sede usata (localStorage)
  const storedId = getStoredSedeId();
  if (storedId) {
    const match = sedi.find((s) => String(s.id) === String(storedId));
    if (match) return match;
  }

  // 2. Sede principale del dipendente
  const sedePrincipale = window.state?.dipendente?.sede_principale
    || window.state?.dipendente?.sede_id;
  if (sedePrincipale) {
    const match = sedi.find((s) => String(s.id) === String(sedePrincipale));
    if (match) {
      setStoredSedeId(match.id);
      return match;
    }
  }

  // 3. Unica sede disponibile
  if (sedi.length === 1) return sedi[0];

  return null;
}

async function ensureSedeContext(routeName) {
  const azienda = window.state?.azienda;
  if (!azienda?.id) return { ok: false, reason: "no_azienda" };

  const sedi = await loadSediForAzienda(azienda.id);

  if (window.stateActions?.setSedi) {
    window.stateActions.setSedi(sedi);
  } else {
    window.state.sedi = sedi;
  }

  if (sedi.length === 0) {
    clearStoredSedeId();
    window.state.sedeAttiva = null;

    if (routeName !== "gestione-sedi") {
      window.location.hash = "#/gestione-sedi?mode=first";
      return { ok: false, redirected: true };
    }
    return { ok: false, reason: "no_sedi" };
  }

  const sede = pickActiveSede(sedi);

  if (!sede) {
    window.state.sedeAttiva = null;
    clearStoredSedeId();

    if (routeName !== "gestione-sedi") {
      window.location.hash = "#/gestione-sedi?mode=select";
      return { ok: false, redirected: true };
    }
    return { ok: false, reason: "need_sede_choice" };
  }

  window.state.sedeAttiva = sede;
  setStoredSedeId(sede.id);

  // Allinea l'azienda salvata a quella della sede scelta (evita disallineamenti multi-azienda)
  if (sede.azienda_id) {
    setStoredAziendaId(sede.azienda_id);
    if (!window.state.azienda || String(window.state.azienda.id) !== String(sede.azienda_id)) {
      const rec = (window.state?.aziende || []).find(
        a => String(a.aziende?.id || a.id) === String(sede.azienda_id)
      );
      const az = rec?.aziende || rec;
      if (az?.id && window.stateActions?.setAzienda) window.stateActions.setAzienda(az);
    }
  }

  return { ok: true, sede };
}

/* =========================================================
   LOGOUT
========================================================= */

async function doLogout() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("Errore logout:", e);
  }

  clearStoredAziendaId();
  clearStoredSedeId();

  if (window.stateActions?.setUser) window.stateActions.setUser(null);
  if (window.stateActions?.setAziende) window.stateActions.setAziende([]);
  if (window.stateActions?.resetAzienda) window.stateActions.resetAzienda();

  window.state.piano = null;
  window.state.featuresEffettive = {};
  window.state.sedi = [];
  window.state.sedeAttiva = null;
  window.state.permessiOverride = {};
  window.state.isSuperadmin = false;

  setHeaderVisible(false);

  window.location.hash = "#/login";
}

/* =========================================================
   ROUTER CORE
========================================================= */

async function resolve() {
  if (!app) return;

  if (!window.location.hash) {
    window.location.hash = "#/login";
    return;
  }

  const { route, segments, params } = parseHash();
  console.log("ROUTE:", route);
  window.routeParams = params || {};
  window.routeSegments = segments || [];

  if (route === "booking") {

    const slug = segments[1];

    if (!slug) {
      app.innerHTML = "Link non valido";
      return;
    }

    try {

      const { data: link, error } = await supabase
        .from("booking_links")
        .select("form_id")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !link) {
        app.innerHTML = "Link non trovato";
        return;
      }

      // Passa UTM + fbclid al form per il tracking
      const utmParams = new URLSearchParams(window.location.search);
      // Aggiunge anche utm dal hash se presenti (Meta ads li mette nell'URL base)
      const hashSearch = window.location.href.split('?')[1] || '';
      const hashParams = new URLSearchParams(hashSearch);
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(k => {
        if (hashParams.get(k) && !utmParams.get(k)) utmParams.set(k, hashParams.get(k));
      });
      const utmString = utmParams.toString();
      window.location.href = `/form-prenotazione.html?form_id=${link.form_id}${utmString ? '&' + utmString : ''}`;
      return;

    } catch (e) {
      console.error("Errore booking route:", e);
      app.innerHTML = "Errore";
      return;
    }
  }

  // ── Route menu pubblico (senza login) ──
  if (route === "menu") {
    const slug = segments[1];
    if (!slug) { app.innerHTML = "Link non valido"; return; }
    try {
      const { renderMenuPubblico } = await imp("./views/menu-pubblico.js");
      await renderMenuPubblico(app, slug);
      return;
    } catch(e) {
      console.error("Errore menu pubblico:", e);
      app.innerHTML = "Menu non trovato";
      return;
    }
  }

  const session = await getValidSession();

  if (!session) {
    if (window.stateActions?.setUser) window.stateActions.setUser(null);
    if (window.stateActions?.setAziende) window.stateActions.setAziende([]);
    if (window.stateActions?.resetAzienda) window.stateActions.resetAzienda();

    window.state.piano = null;
    window.state.featuresEffettive = {};
    window.state.sedi = [];
    window.state.sedeAttiva = null;
    window.state.permessiOverride = {};
    window.state.isSuperadmin = false;

    setHeaderVisible(false);

    const target = PUBLIC_ROUTES.has(route) ? route : "login";
    await renderView(target);
    return;
  }

  window.stateActions.setUser(session.user);

  if (
    PUBLIC_ROUTES.has(route) &&
    route !== "activate" &&
    route !== "setPassword" &&
    route !== "set-password"
  ) {
    const tmpAziende = await loadAziendeForUser(session.user.id);
    const hasPlatform = tmpAziende.some((a) => a.aziende?.stato === "piattaforma");
    const isSa = tmpAziende.some((a) => a.ruolo === "superadmin");

    if (route === "login") {
      if (hasPlatform || isSa) {
        window.location.hash = "#/homePiattaforma";
        return;
      }
      // Redirect consulenti alla loro home dedicata
      const ruoloAttivo = tmpAziende.find(a => a.aziende?.id === window.state?.azienda?.id)?.ruolo
                       || tmpAziende[0]?.ruolo || "";
      if (ruoloAttivo === "consulente_lavoro") {
        window.location.hash = "#/home-consulente";
        return;
      }
      if (ruoloAttivo === "commercialista") {
        window.location.hash = "#/home-commercialista";
        return;
      }
      window.location.hash = "#/home";
      return;
    }

    setHeaderVisible(false);
    await renderView(route);
    return;
  }

  // ── AGENTE VENDITA: home dedicata, non servono aziende associate ──
  if (route === "home-agente") {
    try {
      const { data: agAttivo } = await supabase
        .from("agenti")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("stato", "attivo")
        .maybeSingle();
      if (agAttivo) {
        setHeaderVisible(true);
        await renderView("home-agente");
        return;
      }
    } catch (e) { console.warn("Check agente:", e); }
  }

  try {
    const { data: dipCheck, error: dipCheckErr } = await supabase
      .from("dipendenti")
      .select("profilo_completato")
      .eq("user_id", session.user.id)
      .maybeSingle();

    // Superadmin bypassa sempre il completamento profilo
    const isSuperadmin = window.state?.isSuperadmin
      || window.state?.ruolo === "superadmin"
      || window.state?.ruoloRaw === "superadmin";

    if (!isSuperadmin && !dipCheckErr && dipCheck && dipCheck.profilo_completato === false) {
      if (route !== "completaProfilo") {
        window.location.hash = "#/completaProfilo";
        return;
      }
    }
  } catch (e) {
    console.warn("Check profilo dipendente fallito:", e);
  }

  setHeaderVisible(true);

  const aziendaRes = await ensureAziendaContext(route);
  if (!aziendaRes.ok) {
    if (aziendaRes.redirected) return;

    if (aziendaRes.reason === "no_aziende") {
      // Agente vendita "puro" (nessuna azienda): va alla sua home dedicata
      try {
        const { data: agSolo } = await supabase
          .from("agenti")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("stato", "attivo")
          .maybeSingle();
        if (agSolo) {
          window.location.hash = "#/home-agente";
          return;
        }
      } catch (e) { console.warn("Check agente no_aziende:", e); }

      app.innerHTML = `
        <div class="view" style="padding:40px; text-align:center;">
          <h2 style="color:#dc2626;">Accesso non consentito</h2>
          <p>Nessuna azienda associata al tuo utente.</p>
          <button id="btn-logout-force" style="margin-top:18px; padding:10px 14px; border-radius:12px; border:none; background:#0E5A7A; color:white; font-weight:600; cursor:pointer;">
            Torna al login
          </button>
        </div>
      `;
      const b = document.getElementById("btn-logout-force");
      if (b) b.onclick = doLogout;
      return;
    }

    if (route !== "sceltaAzienda") {
      window.location.hash = "#/sceltaAzienda";
      return;
    }

    await renderView("sceltaAzienda");
    return;
  }

  const azienda = window.state.azienda;

  try {
    // Superadmin bypassa il completamento azienda
    const _isSa = window.state?.isSuperadmin
      || window.state?.ruolo === "superadmin"
      || window.state?.ruoloRaw === "superadmin";

    if (
      !_isSa &&
      azienda &&
      azienda.stato !== "piattaforma" &&
      (azienda.profilo_completato === false || azienda.stato_attivazione === "bozza")
    ) {
      if (route !== "completaAzienda") {
        window.location.hash = "#/completaAzienda";
        return;
      }
    }
  } catch (e) {
    console.warn("Check profilo azienda fallito:", e);
  }

  await loadPianoForAzienda(azienda);

  // ── Carica sede per BO_ROUTES (che saltano caricaContestoOperativo) ──
  if (!window.state?.sedeAttiva?.id) {
    let sedi = window.state?.sedi || [];
    if (!sedi.length) {
      sedi = await loadSediForAzienda(azienda.id);
      if (window.stateActions?.setSedi) {
        window.stateActions.setSedi(sedi);
      } else {
        window.state.sedi = sedi;
      }
    }
    const storedSedeId = getStoredSedeId();
    if (storedSedeId) {
      const sede = sedi.find(s => String(s.id) === String(storedSedeId));
      if (sede) {
        window.state.sedeAttiva = sede;
      }
    }
    if (!window.state?.sedeAttiva?.id && sedi.length === 1) {
      window.state.sedeAttiva = sedi[0];
      setStoredSedeId(sedi[0].id);
    }
    // Rete di sicurezza: se ancora nessuna sede (es. sede salvata di un'altra azienda),
    // prendi la prima della sede corrente cosi le rotte BO non chiedono mai di sceglierla.
    if (!window.state?.sedeAttiva?.id && sedi.length > 1) {
      window.state.sedeAttiva = sedi[0];
      setStoredSedeId(sedi[0].id);
    }
  }

  await window.stateActions.caricaPermessiEffettivi();
  await window.stateActions.caricaRuoloEReparti();

  if (window.menuController?.refresh) {
    window.menuController.refresh();
  }

  if (isAziendaBlockedForUser(azienda, route)) {
    app.innerHTML = `
      <div class="view" style="padding:40px; text-align:center;">
        <h2 style="color:#dc2626;">Azienda non attiva</h2>
        <p>L'accesso a questa azienda è bloccato (stato/stato_attivazione).</p>
        <div style="margin-top:18px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
          <button id="btn-change-company" style="padding:10px 14px; border-radius:12px; border:none; background:#0E5A7A; color:white; font-weight:600; cursor:pointer;">
            Cambia azienda
          </button>
          <button id="btn-logout" style="padding:10px 14px; border-radius:12px; border:1px solid #e5e7eb; background:white; color:#111827; font-weight:600; cursor:pointer;">
            Logout
          </button>
        </div>
      </div>
    `;

    const bc = document.getElementById("btn-change-company");
    if (bc) {
      bc.onclick = () => {
        clearStoredAziendaId();
        clearStoredSedeId();
        window.stateActions.resetAzienda();
        window.location.hash = "#/sceltaAzienda";
      };
    }

    const bl = document.getElementById("btn-logout");
    if (bl) bl.onclick = doLogout;

    return;
  }

  if (
    !PLATFORM_ROUTES.has(route) &&
    !BO_ROUTES.has(route) &&
    !DISPLAY_ROUTES.has(route) &&
    (!PREHOME_ROUTES.has(route) || route === "scegli-sede") &&
    route !== "home" &&
    route !== "booking-form-builder"
  ) {
   const contesto = await window.stateActions.caricaContestoOperativo();

console.log("CONTESTO OPERATIVO:", contesto);

/* =========================================
   CARICA PERMESSI EXTRA
========================================= */

try {

  const dipendenteId =
    window.state?.dipendente?.id;

  const aziendaId =
    window.state?.azienda?.id;

  if (dipendenteId && aziendaId) {

    const { data: permessiData } =
      await supabase
        .from("permessi_utenti")
        .select("permesso")
        .eq("azienda_id", aziendaId)
        .eq("dipendente_id", dipendenteId)
        .eq("attivo", true);

    window.state.permessiExtra =
      (permessiData || [])
        .map(p => p.permesso);

  } else {

    window.state.permessiExtra = [];

  }

} catch (e) {

  console.error(
    "Errore caricamento permessi extra:",
    e
  );

  window.state.permessiExtra = [];

}

if (!contesto.ok) {

  if (contesto.motivo === "Dipendente non trovato") {
    app.innerHTML = `
      <div class="view" style="padding:40px;text-align:center;">
        <h2 style="color:#dc2626;">Errore accesso</h2>
        <p>Dipendente non associato.</p>
      </div>
    `;
    return;
  }

  if (contesto.motivo === "Nessuna sede assegnata") {
    if (route !== "scegli-sede") {
      window.location.hash = "#/scegli-sede";
      return;
    }
  } else {
    return;
  }
}

// 👉 MULTI SEDE → seleziona automaticamente se c'è sede principale o una sola sede
if (contesto.tipo === "dipendente_multi_sede") {
  const sedePrincipale = window.state?.dipendente?.sede_principale
    || window.state?.dipendente?.sede_id;
  const haSedeAttiva = window.state?.sedeAttiva?.id;
  const sedi = window.state?.sedi || [];

  if (!haSedeAttiva) {
    if (sedePrincipale) {
      // Seleziona sede principale automaticamente
      const sede = sedi.find(s => String(s.id) === String(sedePrincipale));
      if (sede) {
        window.state.sedeAttiva = sede;
        localStorage.setItem("active_sede_id", sede.id);
      } else if (route !== "scegli-sede") {
        window.location.hash = "#/scegli-sede";
        return;
      }
    } else if (sedi.length === 1) {
      // Una sola sede — seleziona automaticamente senza chiedere
      window.state.sedeAttiva = sedi[0];
      localStorage.setItem("active_sede_id", sedi[0].id);
    } else if (sedi.length > 1) {
      // Più sedi senza principale — chiedi
      if (route !== "scegli-sede") {
        window.location.hash = "#/scegli-sede";
        return;
      }
    }
  }
}

// Admin senza dipendente — recupera sede da localStorage o seleziona automaticamente se unica
if (!window.state?.sedeAttiva?.id) {
  const storedSedeId = localStorage.getItem("active_sede_id");
  const sedi = window.state?.sedi || [];
  if (storedSedeId && Array.isArray(sedi)) {
    const sede = sedi.find(s => String(s.id) === String(storedSedeId));
    if (sede) {
      window.state.sedeAttiva = sede;
    }
  }
  // Se c'è una sola sede disponibile selezionala automaticamente senza chiedere
  if (!window.state?.sedeAttiva?.id && sedi.length === 1) {
    window.state.sedeAttiva = sedi[0];
    localStorage.setItem("active_sede_id", sedi[0].id);
  }
}
  }
  // sede già gestita da caricaContestoOperativo sopra

  if (route === "homePiattaforma") {
    if (!isSuperadmin()) {
      window.location.hash = "#/home";
      return;
    }
    await renderView("homePiattaforma");
    return;
  }

 if (route === "home") {

const ruolo = window.normalizeRuolo
    ? window.normalizeRuolo(window.state?.viewAs || window.state?.ruolo)
    : (window.state?.viewAs || window.state?.ruolo);

  if (ruolo === "admin" || ruolo === "superadmin") {
    await renderView("home-admin");
    return;
  }

  if (ruolo === "manager") {
    await renderView("home-manager");
    return;
  }

  await renderView("home-operatore");
  return;
}

  if (PLATFORM_ROUTES.has(route)) {
    if (!isSuperadmin()) {
      window.location.hash = "#/home";
      return;
    }
    await renderView(route);
    return;
  }

  if (route === "sceltaAzienda") {
    await renderView("sceltaAzienda");
    return;
  }

  if (route === "gestione-sedi") {
    const ruoloSedi = window.normalizeRuolo
      ? window.normalizeRuolo(window.state?.viewAs || window.state?.ruolo)
      : (window.state?.viewAs || window.state?.ruolo);

    if (["manager", "operatore"].includes(ruoloSedi)) {
      const modeSedi = window.routeParams?.mode || "select";
      if (modeSedi !== "select") {
        window.location.hash = "#/gestione-sedi";
        return;
      }
    }

    await renderView("gestione-sedi");
    return;
  }

// ── Feature gating — mappa route → feature richiesta ──────────────────────
const ROUTE_FEATURES = {
  // Marketing & CRM
  "bo-promo":        "promo",
  "bo-promo-analisi":"promo",
  "bo-catenarie":    "promo",
  "bo-marketing":    "marketing",
  "bo-chatbot":      "chatbot_whatsapp",
  "bo-fidelity":     "fidelity",
  "bo-tag":          "marketing",

  // Gestione
  "bo-bilancio":     "report_kpi",
  "bo-acquisti":     "acquisti",
  "bo-venduto":      "report_kpi",
  "bo-margini":      "food_cost",
  "bo-magazzino":    "magazzino",

  // Cucina & Ricette
  "ricette":         "ricettario",
  "planner-produzione": "ricettario",

  // Personale
  "bo-presenze":     "hr_timbrature",
  "dipendenti":      "dipendenti",
  "crea-dipendente": "dipendenti",
  "bo-agenzie":      "dipendenti",
  "hr-admin":        "dipendenti",
  "fascicolo-hr":    "dipendenti",

  // Prenotazioni avanzate
  "booking-form-builder": "prenotazioni_avanzate",
  "bo-location-ricevimenti": "prenotazioni_avanzate",

  // Multi-sede
  "gestione-aziende": null, // solo superadmin, già gestito
  "super-tony": null,       // solo superadmin, verificato lato server (Edge Function)
};

function checkFeatureGating(route) {
  if (isSuperadmin()) return null; // superadmin bypassa tutto
  const feature = ROUTE_FEATURES[route];
  if (!feature) return null; // nessuna feature richiesta
  const features = window.state?.featuresEffettive || {};
  if (features[feature]) return null; // feature disponibile
  return feature; // feature mancante
}

function renderUpgradeWall(app, feature, route) {
  const piano = window.state?.piano;
  const nomePiano = piano?.nome || "piano attuale";

  const featureLabels = {
    promo:                 "Promo & Landing Page",
    marketing:             "Marketing & CRM",
    chatbot_whatsapp:      "Chatbot WhatsApp",
    fidelity:              "Fidelity & Network",
    report_kpi:            "Report & KPI",
    acquisti:              "Gestione Acquisti",
    food_cost:             "Food Cost & Margini",
    magazzino:             "Magazzino",
    ricettario:            "Ricettario & Produzione",
    hr_timbrature:         "Presenze & Timbrature",
    dipendenti:            "Gestione Dipendenti",
    prenotazioni_avanzate: "Prenotazioni Avanzate",
    multi_sede:            "Multi-Sede",
    booking_online:        "Booking Online",
  };

  const featureLabel = featureLabels[feature] || feature;

  app.innerHTML = `
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:60vh;padding:40px 20px;text-align:center;font-family:-apple-system,sans-serif;">
    <div style="font-size:56px;margin-bottom:16px;">🔒</div>
    <h2 style="font-size:22px;font-weight:800;color:#111827;margin-bottom:8px;">
      Funzione non disponibile
    </h2>
    <p style="font-size:15px;color:#64748b;max-width:400px;line-height:1.6;margin-bottom:6px;">
      <strong>${featureLabel}</strong> non è incluso nel tuo piano <em>${nomePiano}</em>.
    </p>
    <p style="font-size:13px;color:#94a3b8;margin-bottom:28px;">
      Fai l'upgrade per sbloccare questa funzione e molte altre.
    </p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
      <a href="#/portale-cliente" style="padding:13px 24px;background:#0E5A7A;color:#fff;
        border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
        🚀 Upgrade piano
      </a>
      <a href="#/home" style="padding:13px 24px;background:#f1f5f9;color:#374151;
        border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
        ← Torna alla home
      </a>
    </div>
    ${piano ? `
    <div style="margin-top:32px;padding:16px 24px;background:#f8fafc;border-radius:12px;
      border:1px solid #e2e8f0;max-width:360px;text-align:left;">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;
        letter-spacing:.5px;margin-bottom:10px;">Piano attuale: ${nomePiano}</div>
      <div style="font-size:13px;color:#374151;">
        ${Object.keys(window.state?.featuresEffettive || {}).filter(k => window.state.featuresEffettive[k])
          .map(k => `<span style="display:inline-block;padding:3px 8px;margin:2px;background:#dbeafe;
            color:#1d4ed8;border-radius:20px;font-size:11px;font-weight:600;">${featureLabels[k]||k}</span>`)
          .join('') || 'Nessuna feature attiva'}
      </div>
    </div>` : ''}
  </div>`;
}

  if (routes[route]) {
    if (!PUBLIC_ROUTES.has(route) && !PREHOME_ROUTES.has(route) && !ROOT_ROUTES.has(route)) {
      if (!hasPermission(route) && !isSuperadmin()) {
        window.location.hash = "#/home";
        return;
      }
      // ── Feature gating ──
      const missingFeature = checkFeatureGating(route);
      if (missingFeature) {
        renderUpgradeWall(app, missingFeature, route);
        return;
      }
    }
    await renderView(route);
    return;
  }

  await renderView("home");
}

/* =========================================================
   INIT
========================================================= */

window.hasPermission = hasPermission;
window.hasFeature = function(feature) {
  if (isSuperadmin()) return true;
  return !!(window.state?.featuresEffettive?.[feature]);
};

window.router = {
  reloadCurrentRoute() {
    resolve();
  },
  logout() {
    doLogout();
  },
};

window.addEventListener("hashchange", resolve);

window.addEventListener("DOMContentLoaded", () => {
  app = document.getElementById("app");
  initMenu();

  // ✅ FIX: sync sessione Supabase
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("AUTH CHANGE:", event, session);

    if (session?.user) {
      if (window.stateActions?.setUser) {
        window.stateActions.setUser(session.user);
      }
      // Check se l'utente è un agente vendita attivo (per voce menu condizionale)
      (async () => {
        try {
          const { data: agenteCheck } = await supabase
            .from("agenti")
            .select("id")
            .or(`user_id.eq.${session.user.id},email.eq.${session.user.email}`)
            .eq("stato", "attivo")
            .maybeSingle();
          window.state._isAgenteAttivo = !!agenteCheck;
          if (window.state._isAgenteAttivo && window.initMenu) window.initMenu();
        } catch {
          window.state._isAgenteAttivo = false;
        }
      })();
    } else {
      if (window.stateActions?.setUser) {
        window.stateActions.setUser(null);
      }
      window.state._isAgenteAttivo = false;
    }
  });

  try {
    const saved = localStorage.getItem("reparto_attivo");
    if (saved) {
      window.state.repartoAttivo = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Errore restore reparto:", e);
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = () => doLogout();
  }

  resolve();
});

