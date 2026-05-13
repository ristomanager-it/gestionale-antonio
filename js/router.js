import { supabase } from "./supabaseClient.js";
import { initMenu } from "./menu.js";
import { renderFooter, initFooter } from "./components/footer.js";

/* =========================================================
   SUPABASE HASH FIX
========================================================= */

(function fixSupabaseEmailLink() {

  const hash =
    window.location.hash || "";

  if (
    hash.startsWith("#access_token=")
  ) {

    const tokens =
      hash.substring(1);

    window.location.hash =
      "#/set-password?" + tokens;
  }
})();

(function fixSupabaseHash() {

  const h =
    window.location.hash || "";

  if (
    h.startsWith("#/set-password#")
  ) {

    const tokens =
      h.split("#")[2];

    window.location.hash =
      "#/set-password?" + tokens;

    return;
  }

  if (
    h.startsWith("#/activate#")
  ) {

    const tokens =
      h.split("#")[2];

    window.location.hash =
      "#/activate?" + tokens;
  }
})();

/* =========================================================
   APP
========================================================= */

let app = null;

let resolving = false;
let pendingResolve = false;

/* =========================================================
   ROUTES
========================================================= */

const routes = {

  // AUTH
  login: () => import("./views/login.js"),
  activate: () => import("./views/activate.js"),
  setPassword: () => import("./views/set-password.js"),
  "set-password": () => import("./views/set-password.js"),

  // HOME
  home: () => import("./views/home.js"),
  "home-admin": () => import("./views/home-admin.js"),
  "home-manager": () => import("./views/home-manager.js"),
  "home-operatore": () => import("./views/home-operatore.js"),
  homePiattaforma: () => import("./views/home-piattaforma.js"),

  // AZIENDE
  sceltaAzienda: () => import("./views/scelta-azienda.js"),
  creaAzienda: () => import("./views/crea-azienda.js"),
  gestioneAziende: () => import("./views/gestione-aziende.js"),
  modificaAzienda: () => import("./views/modifica-azienda.js"),
  gestionePiani: () => import("./views/gestione-piani.js"),

  // PROFILO
  "completa-profilo": () => import("./views/completa-profilo.js"),
  completaProfilo: () => import("./views/completa-profilo.js"),
  completaAzienda: () => import("./views/completa-azienda.js"),

  // SEDI
  "scegli-sede": () => import("./views/scegli-sede.js"),
  "gestione-sedi": () => import("./views/gestione-sedi.js"),

  // GENERALE
  cliente: () => import("./views/cliente.js"),
  operativo: () => import("./views/operativo.js"),
  amministrazione: () => import("./views/amministrazione.js"),
  gestione: () => import("./views/gestione.js"),
  ai: () => import("./views/ai.js"),
  manuale: () => import("./views/manuale.js"),

  // STAFF
  dipendenti: () => import("./views/dipendenti.js"),
  dipendente: () => import("./views/dipendente.js"),
  "crea-dipendente": () => import("./views/crea-dipendente.js"),
  timbrature: () => import("./views/timbrature.js"),
  permessi: () => import("./views/permessi-ferie.js"),

  // PRODUZIONE
  produzione: () => import("./views/produzione.js"),
  preparazioni: () => import("./views/preparazioni.js"),
  storicoLotto: () => import("./views/storico-lotto.js"),
  ricettario: () => import("./views/ricettario.js"),
  creaRicetta: () => import("./views/crea-ricetta.js"),
  "planner-produzione": () => import("./views/planner-produzione.js"),

  // MAGAZZINO
  magazzino: () => import("./views/magazzino/magazzino.js"),
  acquisti: () => import("./views/acquisti/index.js"),

  // ANALISI
  reparti: () => import("./views/reparti.js"),
  venduto: () => import("./views/venduto.js"),
  margini: () => import("./views/margini.js"),

  // PREVENTIVI
  preventivi: () => import("./views/preventivi.js"),
  creaPreventivo: () => import("./views/crea-preventivo.js"),

  // SALA
  sala: () => import("./views/sala.js"),
  comanda: () => import("./views/comanda.js"),

  // PRENOTAZIONI
  prenotazioni: () => import("./views/prenotazioni/index.js"),
  "prenotazioni-dettaglio": () => import("./views/prenotazioni/scheda-prenotazione.js"),
  "prenotazioni-form": () => import("./views/prenotazioni/form.js"),
  "prenotazioni-rifiutate": () => import("./views/prenotazioni/rifiutate.js"),
  "prenotazioni-tavoli": () => import("./views/prenotazioni-tavoli.js"),
  "prenotazione-tavolo-form": () => import("./views/prenotazione-tavolo-form.js"),

  // CAMPAGNE
  campagne: () => import("./views/campagne/index.js"),
  "booking-form-builder": () => import("./views/booking/booking-form-builder.js"),

  // BO
  "bo-dashboard": () => import("./views/bo/bo-dashboard.js"),
  "bo-marketing": () => import("./views/bo/bo-marketing.js"),
  "bo-tag": () => import("./views/bo/bo-tag.js"),
  "bo-template": () => import("./views/bo/bo-template.js"),

  // MENU
  "bo-menu": () => import("./views/bo/bo-menu-builder.js"),
  "bo-categorie": () => import("./views/bo/categorie.js"),
  "bo-prodotti": () => import("./views/bo/prodotti.js"),

  // PRODUZIONE BO
  "bo-magazzino": () => import("./views/bo/bo-magazzino.js"),
  "bo-produzione": () => import("./views/bo/bo-produzione.js"),
  "bo-comande": () => import("./views/bo/bo-comande.js"),
  "bo-ricette": () => import("./views/bo/ricette-editor.js"),

  // APP
  "app-produzione": () => import("./views/app/app-produzione.js"),
};

/* =========================================================
   ROUTE GROUPS
========================================================= */

const PUBLIC_ROUTES = new Set([
  "login",
  "activate",
  "setPassword",
  "set-password",
  "prenota",
  "booking"
]);

const PREHOME_ROUTES = new Set([
  "sceltaAzienda",
  "completaProfilo",
  "completaAzienda",
  "completa-profilo",
  "gestione-sedi",
  "scegli-sede"
]);

const ROOT_ROUTES = new Set([
  "home",
  "homePiattaforma"
]);

const PLATFORM_ROUTES = new Set([
  "homePiattaforma",
  "gestioneAziende",
  "creaAzienda",
  "modificaAzienda",
  "gestionePiani"
]);

const BO_ROUTES = new Set([
  "bo-dashboard",
  "bo-marketing",
  "bo-tag",
  "bo-template",
  "bo-menu",
  "bo-categorie",
  "bo-prodotti",
  "bo-magazzino",
  "bo-produzione",
  "bo-comande",
  "bo-ricette"
]);

/* =========================================================
   STORAGE
========================================================= */

const LS_KEYS = {
  ACTIVE_AZIENDA_ID: "active_azienda_id",
  ACTIVE_SEDE_ID: "active_sede_id",
};

/* =========================================================
   HASH PARSER
========================================================= */

function parseHash() {

  const raw =
    window.location.hash || "#/login";

  const cleaned =
    raw.replace("#/", "");

  const [path, queryString] =
    cleaned.split("?");

  const params = {};

  if (queryString) {

    const searchParams =
      new URLSearchParams(queryString);

    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
  }

  const segments =
    path.split("/").filter(Boolean);

  return {
    route: segments[0] || "login",
    segments,
    params,
  };
}

/* =========================================================
   VIEW RENDER
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

  try {

    if (foot) {

      const footerHTML =
        await renderFooter();

      foot.innerHTML =
        footerHTML;

      initFooter();
    }

  } catch (e) {

    console.error(
      "Errore footer:",
      e
    );
  }
}

/* =========================================================
   HELPERS
========================================================= */

function redirectTo(hash) {

  if (
    window.location.hash === hash
  ) {
    return false;
  }

  window.location.hash = hash;

  return true;
}

function normalizeRole(role) {

  const value =
    String(role || "")
      .toLowerCase()
      .trim();

  if (
    value === "manager_cucina" ||
    value === "manager_sala"
  ) {
    return "manager";
  }

  if (
    value === "operatore_cucina" ||
    value === "operatore_sala"
  ) {
    return "operatore";
  }

  return value;
}

function getCurrentRole() {

  return normalizeRole(
    window.state?.viewAs ||
    window.state?.ruolo
  );
}

function getCurrentReparti() {

  return Array.isArray(
    window.state?.reparti
  )
    ? window.state.reparti
    : [];
}

function hasReparto(nome) {

  return getCurrentReparti().some(
    r =>
      String(r.nome)
        .toLowerCase()
        .trim() ===
      String(nome)
        .toLowerCase()
        .trim()
  );
}

function setHeaderVisible(visible) {

  const header =
    document.querySelector(".app-header");

  if (header) {
    header.style.display =
      visible ? "flex" : "none";
  }

  const topbar =
    document.getElementById("topbar-info");

  if (topbar) {
    topbar.style.display =
      visible ? "flex" : "none";
  }
}

function getStoredAziendaId() {
  return localStorage.getItem(
    LS_KEYS.ACTIVE_AZIENDA_ID
  );
}

function setStoredAziendaId(id) {

  if (!id) return;

  localStorage.setItem(
    LS_KEYS.ACTIVE_AZIENDA_ID,
    String(id)
  );
}

function clearStoredAziendaId() {

  localStorage.removeItem(
    LS_KEYS.ACTIVE_AZIENDA_ID
  );
}

function getStoredSedeId() {

  return localStorage.getItem(
    LS_KEYS.ACTIVE_SEDE_ID
  );
}

function setStoredSedeId(id) {

  if (!id) return;

  localStorage.setItem(
    LS_KEYS.ACTIVE_SEDE_ID,
    String(id)
  );
}

function clearStoredSedeId() {

  localStorage.removeItem(
    LS_KEYS.ACTIVE_SEDE_ID
  );
}

function safeSetSedi(sedi) {

  const clean =
    Array.isArray(sedi)
      ? sedi
      : [];

  if (
    window.stateActions?.setSedi
  ) {

    window.stateActions.setSedi(
      clean
    );

  } else {

    window.state.sedi = clean;
  }
}

function safeSetSedeAttiva(sede) {

  if (
    window.stateActions?.setSedeAttiva
  ) {

    window.stateActions.setSedeAttiva(
      sede || null
    );

  } else {

    window.state.sedeAttiva =
      sede || null;
  }
}

function isSuperadmin() {

  if (
    window.state?.isSuperadmin === true
  ) {
    return true;
  }

  const aziende =
    window.state?.aziende || [];

  return aziende.some(
    a =>
      normalizeRole(a.ruolo) ===
      "superadmin"
  );
}

/* =========================================================
   PERMISSIONS
========================================================= */

function hasPermission(area) {

  if (area === "home") {
    return true;
  }

  if (isSuperadmin()) {
    return true;
  }

  const ruolo =
    getCurrentRole();

  if (
    !window.state?.viewAs &&
    window.state?._allAccess === true
  ) {
    return true;
  }

  if (BO_ROUTES.has(area)) {

    return (
      ruolo === "admin" ||
      ruolo === "superadmin"
    );
  }

  if (ruolo === "admin") {
    return true;
  }

  const isCucina =
    hasReparto("cucina");

  const isSala =
    hasReparto("sala");

  /* =====================================================
     MANAGER
  ===================================================== */

  if (ruolo === "manager") {

    const allowed = new Set([
      "home",
      "home-manager",
      "operativo",
      "timbrature",
      "manuale",
      "permessi"
    ]);

    if (isCucina) {

      [
        "ricettario",
        "creaRicetta",
        "planner-produzione",
        "produzione",
        "preparazioni",
        "storicoLotto",
        "magazzino",
        "acquisti",
        "dipendenti",
        "dipendente",
        "crea-dipendente"
      ].forEach(
        r => allowed.add(r)
      );
    }

    if (isSala) {

      [
        "sala",
        "comanda",
        "prenotazioni",
        "prenotazioni-dettaglio",
        "prenotazioni-form",
        "prenotazioni-rifiutate",
        "prenotazioni-tavoli",
        "prenotazione-tavolo-form"
      ].forEach(
        r => allowed.add(r)
      );
    }

    return allowed.has(area);
  }

  /* =====================================================
     OPERATORE
  ===================================================== */

  if (ruolo === "operatore") {

    const allowed = new Set([
      "home",
      "home-operatore",
      "operativo",
      "timbrature",
      "manuale"
    ]);

    if (isCucina) {

      [
        "produzione",
        "preparazioni",
        "ricettario",
        "magazzino"
      ].forEach(
        r => allowed.add(r)
      );
    }

    if (isSala) {

      [
        "sala",
        "comanda",
        "prenotazioni",
        "prenotazioni-dettaglio",
        "prenotazioni-form",
        "prenotazioni-rifiutate",
        "prenotazioni-tavoli",
        "prenotazione-tavolo-form"
      ].forEach(
        r => allowed.add(r)
      );
    }

    return allowed.has(area);
  }

  /* =====================================================
     FALLBACK
  ===================================================== */

  const permessi =
    window.state?.permessi || {};

  return (
    permessi[`${area}.read`] === true
  );
}

/* =========================================================
   SESSION
========================================================= */

async function getValidSession() {

  const { data } =
    await supabase.auth.getSession();

  let session =
    data?.session || null;

  if (!session) {

    const { data: refreshed } =
      await supabase.auth.refreshSession();

    session =
      refreshed?.session || null;
  }

  return session;
}

/* =========================================================
   AZIENDE
========================================================= */

async function loadAziendeForUser(userId) {

  const { data, error } =
    await supabase
      .from("utenti_aziende")
      .select(`
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
      `)
      .eq("user_id", userId)
      .eq("attivo", true);

  if (error) {

    console.error(
      "Errore aziende:",
      error
    );

    return [];
  }

  return (data || [])
    .filter(a => a.aziende)
    .map(a => ({
      ...a,
      ruolo: normalizeRole(a.ruolo)
    }));
}

function pickActiveAzienda(aziende) {

  const storedId =
    getStoredAziendaId();

  if (storedId) {

    const found =
      aziende.find(
        a =>
          String(a.aziende.id) ===
          String(storedId)
      );

    if (found?.aziende) {
      return found.aziende;
    }
  }

  if (aziende.length === 1) {
    return aziende[0].aziende;
  }

  return null;
}

function applyAziendaContext(
  aziende,
  azienda
) {

  if (!azienda) return;

  const activeRecord =
    aziende.find(
      a =>
        String(a.aziende?.id) ===
        String(azienda.id)
    );

  window.state.isSuperadmin =
    aziende.some(
      a =>
        normalizeRole(a.ruolo) ===
        "superadmin"
    );

  const ruoloEffettivo =
    window.state.isSuperadmin
      ? "superadmin"
      : normalizeRole(
          activeRecord?.ruolo || "admin"
        );

  if (
    window.stateActions?.setRuolo
  ) {

    window.stateActions.setRuolo(
      ruoloEffettivo
    );
  }

  window.state.ruolo =
    ruoloEffettivo;

  window.state.permessiOverride =
    activeRecord?.permessi_override || {};
}

async function ensureAziendaContext(route) {

  const user =
    window.state?.user;

  if (!user) {

    return {
      ok: false
    };
  }

  const aziende =
    await loadAziendeForUser(user.id);

  if (
    window.stateActions?.setAziende
  ) {

    window.stateActions.setAziende(
      aziende
    );

  } else {

    window.state.aziende =
      aziende;
  }

  if (aziende.length === 0) {

    if (
      window.stateActions?.resetAzienda
    ) {

      window.stateActions.resetAzienda();
    }

    return {
      ok: false
    };
  }

  const activeAzienda =
    pickActiveAzienda(aziende);

  if (!activeAzienda) {

    if (
      route !== "sceltaAzienda"
    ) {

      redirectTo(
        "#/sceltaAzienda"
      );

      return {
        ok: false,
        redirected: true
      };
    }

    return {
      ok: false
    };
  }

  setStoredAziendaId(
    activeAzienda.id
  );

  if (
    window.stateActions?.setAzienda
  ) {

    window.stateActions.setAzienda(
      activeAzienda
    );

  } else {

    window.state.azienda =
      activeAzienda;
  }

  applyAziendaContext(
    aziende,
    activeAzienda
  );

  return {
    ok: true,
    azienda: activeAzienda
  };
}

/* =========================================================
   RUOLI
========================================================= */

async function normalizeRuntimeRole() {

  const ruolo =
    normalizeRole(
      window.state?.ruolo
    );

  if (
    ruolo &&
    ruolo !== window.state?.ruolo
  ) {

    if (
      window.stateActions?.setRuolo
    ) {

      window.stateActions.setRuolo(
        ruolo
      );
    }

    window.state.ruolo =
      ruolo;
  }

  if (
    !Array.isArray(
      window.state.reparti
    )
  ) {

    window.state.reparti = [];
  }
}

/* =========================================================
   SEDI
========================================================= */

async function loadSediForCurrentUser(userId) {

  const aziendaId =
    window.state?.azienda?.id;

  if (!userId || !aziendaId) {
    return [];
  }

  const { data: dip, error } =
    await supabase
      .from("dipendenti")
      .select(`
        id,
        sede_id,
        sedi (
          id,
          nome,
          logo_url,
          azienda_id
        )
      `)
      .eq("user_id", userId)
      .eq("azienda_id", aziendaId)
      .maybeSingle();

  if (error) {

    console.warn(
      "Errore caricamento sedi:",
      error
    );

    return [];
  }

  if (!dip?.sedi) {
    return [];
  }

  return [
    {
      ...dip.sedi,
      is_default: true
    }
  ];
}

async function ensureSedeContext(
  route,
  userId
) {

  if (
    PUBLIC_ROUTES.has(route)
  ) {

    return {
      ok: true
    };
  }

  if (
    PLATFORM_ROUTES.has(route)
  ) {

    return {
      ok: true
    };
  }

  if (
    route === "gestione-sedi"
  ) {

    return {
      ok: true
    };
  }

  if (
    isSuperadmin() ||
    getCurrentRole() === "admin"
  ) {

    return {
      ok: true
    };
  }

  const sedi =
    await loadSediForCurrentUser(
      userId
    );

  safeSetSedi(sedi);

  /* =====================================================
     NESSUNA SEDE
  ===================================================== */

  if (sedi.length === 0) {

    safeSetSedeAttiva(null);

    clearStoredSedeId();

    return {
      ok: true
    };
  }

  /* =====================================================
     UNA SEDE
  ===================================================== */

  if (sedi.length === 1) {

    const sede = sedi[0];

    safeSetSedeAttiva(sede);

    setStoredSedeId(
      sede.id
    );

    if (
      route === "scegli-sede"
    ) {

      redirectTo("#/home");

      return {
        ok: false,
        redirected: true
      };
    }

    return {
      ok: true
    };
  }

  /* =====================================================
     MULTI SEDE
  ===================================================== */

  const storedSedeId =
    getStoredSedeId();

  const activeSede =
    sedi.find(
      s =>
        String(s.id) ===
        String(storedSedeId)
    );

  if (activeSede) {

    safeSetSedeAttiva(
      activeSede
    );

    return {
      ok: true
    };
  }

  safeSetSedeAttiva(null);

  clearStoredSedeId();

  if (
    route !== "scegli-sede"
  ) {

    redirectTo(
      "#/scegli-sede"
    );

    return {
      ok: false,
      redirected: true
    };
  }

  return {
    ok: true
  };
}

/* =========================================================
   RESET
========================================================= */

function resetRuntimeState() {

  if (
    window.stateActions?.setUser
  ) {

    window.stateActions.setUser(
      null
    );
  }

  if (
    window.stateActions?.setAziende
  ) {

    window.stateActions.setAziende(
      []
    );
  }

  if (
    window.stateActions?.resetAzienda
  ) {

    window.stateActions.resetAzienda();
  }

  window.state.piano = null;
  window.state.featuresEffettive = {};
  window.state.sedi = [];
  window.state.sedeAttiva = null;
  window.state.permessiOverride = {};
  window.state.isSuperadmin = false;
  window.state.reparti = [];
}

/* =========================================================
   LOGOUT
========================================================= */

async function doLogout() {

  try {

    await supabase.auth.signOut();

  } catch (e) {

    console.error(
      "Errore logout:",
      e
    );
  }

  clearStoredAziendaId();
  clearStoredSedeId();

  resetRuntimeState();

  setHeaderVisible(false);

  redirectTo("#/login");
}

/* =========================================================
   CORE
========================================================= */

async function resolveCore() {

  if (!app) return;

  if (!window.location.hash) {

    redirectTo("#/login");

    return;
  }

  const {
    route,
    segments,
    params
  } = parseHash();

  window.routeParams =
    params || {};

  window.routeSegments =
    segments || [];

  const session =
    await getValidSession();

  /* =====================================================
     NO SESSION
  ===================================================== */

  if (!session) {

    resetRuntimeState();

    setHeaderVisible(false);

    const target =
      PUBLIC_ROUTES.has(route)
        ? route
        : "login";

    await renderView(target);

    return;
  }

  /* =====================================================
     USER
  ===================================================== */

  if (
    window.stateActions?.setUser
  ) {

    window.stateActions.setUser(
      session.user
    );

  } else {

    window.state.user =
      session.user;
  }

  /* =====================================================
     AZIENDA
  ===================================================== */

  const aziendaRes =
    await ensureAziendaContext(
      route
    );

  if (!aziendaRes.ok) {
    return;
  }

  /* =====================================================
     PERMESSI
  ===================================================== */

  if (
    window.stateActions?.caricaPermessiEffettivi
  ) {

    await window.stateActions.caricaPermessiEffettivi();
  }

  if (
    window.stateActions?.caricaRuoloEReparti
  ) {

    await window.stateActions.caricaRuoloEReparti();
  }

  await normalizeRuntimeRole();

  /* =====================================================
     SEDE
  ===================================================== */

  const sedeRes =
    await ensureSedeContext(
      route,
      session.user.id
    );

  if (!sedeRes.ok) {
    return;
  }

  /* =====================================================
     HEADER
  ===================================================== */

  setHeaderVisible(
    !PUBLIC_ROUTES.has(route)
  );

  /* =====================================================
     HOME
  ===================================================== */

  if (route === "home") {

    const ruolo =
      getCurrentRole();

    if (ruolo === "admin") {

      await renderView(
        "home-admin"
      );

      return;
    }

    if (ruolo === "manager") {

      await renderView(
        "home-manager"
      );

      return;
    }

    if (ruolo === "operatore") {

      await renderView(
        "home-operatore"
      );

      return;
    }

    if (ruolo === "superadmin") {

      await renderView(
        "homePiattaforma"
      );

      return;
    }

    await renderView("home");

    return;
  }

  /* =====================================================
     PERMISSIONS
  ===================================================== */

  if (routes[route]) {

    const needsPermission =
      !PUBLIC_ROUTES.has(route) &&
      !PREHOME_ROUTES.has(route) &&
      !ROOT_ROUTES.has(route);

    if (
      needsPermission &&
      !hasPermission(route)
    ) {

      redirectTo("#/home");

      return;
    }

    await renderView(route);

    return;
  }

  /* =====================================================
     FALLBACK
  ===================================================== */

  redirectTo("#/home");
}

/* =========================================================
   SAFE RESOLVE
========================================================= */

async function resolve() {

  if (resolving) {

    pendingResolve = true;

    return;
  }

  resolving = true;

  try {

    await resolveCore();

  } catch (e) {

    console.error(
      "Errore router:",
      e
    );

    if (app) {

      app.innerHTML = `
        <div class="view" style="padding:40px;text-align:center;">
          <h2 style="color:#dc2626;">
            Errore caricamento pagina
          </h2>

          <p>
            Si è verificato un errore.
          </p>
        </div>
      `;
    }

  } finally {

    resolving = false;

    if (pendingResolve) {

      pendingResolve = false;

      resolve();
    }
  }
}

/* =========================================================
   ROUTER API
========================================================= */

window.router = {

  reloadCurrentRoute() {
    resolve();
  },

  logout() {
    doLogout();
  },
};

/* =========================================================
   EVENTS
========================================================= */

window.addEventListener(
  "hashchange",
  resolve
);

window.addEventListener(
  "DOMContentLoaded",
  () => {

    app =
      document.getElementById("app");

    initMenu();

    supabase.auth.onAuthStateChange(
      (event, session) => {

        console.log(
          "AUTH CHANGE:",
          event
        );

        if (session?.user) {

          if (
            window.stateActions?.setUser
          ) {

            window.stateActions.setUser(
              session.user
            );
          }

        } else {

          if (
            window.stateActions?.setUser
          ) {

            window.stateActions.setUser(
              null
            );
          }
        }
      }
    );

    const logoutBtn =
      document.getElementById(
        "logout-btn"
      );

    if (logoutBtn) {

      logoutBtn.onclick =
        () => doLogout();
    }

    resolve();
  }
);
