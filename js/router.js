import { supabase } from "./supabaseClient.js";
import { initMenu } from "./menu.js";
import { renderFooter, initFooter } from "./components/footer.js";

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
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  "home-admin": () => import("./views/home-admin.js"),
  "home-manager": () => import("./views/home-manager.js"),
  "home-operatore": () => import("./views/home-operatore.js"),
  homePiattaforma: () => import("./views/home-piattaforma.js"),
  creaAzienda: () => import("./views/crea-azienda.js"),
  gestioneAziende: () => import("./views/gestione-aziende.js"),
  modificaAzienda: () => import("./views/modifica-azienda.js"),
  gestionePiani: () => import("./views/gestione-piani.js"),
  activate: () => import("./views/activate.js"),
  cliente: () => import("./views/cliente.js"),
  setPassword: () => import("./views/set-password.js"),
  "set-password": () => import("./views/set-password.js"),

  sceltaAzienda: () => import("./views/scelta-azienda.js"),
  "gestione-sedi": () => import("./views/gestione-sedi.js"),

  operativo: () => import("./views/operativo.js"),
  amministrazione: () => import("./views/amministrazione.js"),
  gestione: () => import("./views/gestione.js"),

  // =========================
  // MARKETING (globale - lettura)
  // =========================
  "bo-marketing": () => import("./views/bo/bo-marketing.js"),

  dipendenti: () => import("./views/dipendenti.js"),
  dipendente: () => import("./views/dipendente.js"),
  "crea-dipendente": () => import("./views/crea-dipendente.js"),
  timbrature: () => import("./views/timbrature.js"),

  "completa-profilo": () => import("./views/completa-profilo.js"),
  completaProfilo: () => import("./views/completa-profilo.js"),
  completaAzienda: () => import("./views/completa-azienda.js"),
  "scegli-sede": () => import("./views/scegli-sede.js"),

  acquisti: () => import("./views/acquisti/index.js"),
  magazzino: () => import("./views/magazzino/magazzino.js"),

  produzione: () => import("./views/produzione.js"),
  storicoLotto: () => import("./views/storico-lotto.js"),
  ricettario: () => import("./views/ricettario.js"),
  "planner-produzione": () => import("./views/planner-produzione.js"),
  creaRicetta: () => import("./views/crea-ricetta.js"),
  preparazioni: () => import("./views/preparazioni.js"),
  reparti: () => import("./views/reparti.js"),
  venduto: () => import("./views/venduto.js"),
  margini: () => import("./views/margini.js"),

  preventivi: () => import("./views/preventivi.js"),
  creaPreventivo: () => import("./views/crea-preventivo.js"),
  ai: () => import("./views/ai.js"),

  permessi: () => import("./views/permessi-ferie.js"),
  manuale: () => import("./views/manuale.js"),

  sala: () => import("./views/sala.js"),

  "prenotazioni-tavoli": () => import("./views/prenotazioni-tavoli.js"),
  "prenotazione-tavolo-form": () => import("./views/prenotazione-tavolo-form.js"),
  "prenotazioni-form": () => import("./views/prenotazioni/form.js"),
  "prenotazioni-rifiutate": () => import("./views/prenotazioni/rifiutate.js"),

  prenotazioni: () => import("./views/prenotazioni/index.js"),
  "prenotazioni-dettaglio": () => import("./views/prenotazioni/scheda-prenotazione.js"),

  campagne: () => import("./views/campagne/index.js"),
  "booking-form-builder": () => import("./views/booking/booking-form-builder.js"),

  comanda: () => import("./views/comanda.js"),

  // =========================
  // BACK OFFICE
  // =========================
  "bo-dashboard": () => import("./views/bo/bo-dashboard.js"),
  "bo-tag": () => import("./views/bo/bo-tag.js"),
  "bo-template": () => import("./views/bo/bo-template.js"),

  // MENU
  "bo-menu": () => import("./views/bo/bo-menu-builder.js"),
  "bo-categorie": () => import("./views/bo/categorie.js"),
  "bo-prodotti": () => import("./views/bo/prodotti.js"),

  // PRODUZIONE
  "bo-magazzino": () => import("./views/bo/bo-magazzino.js"),
  "bo-produzione": () => import("./views/bo/bo-produzione.js"),
  "bo-comande": () => import("./views/bo/bo-comande.js"),
  "bo-ricette": () => import("./views/bo/ricette-editor.js"),

  // APP
  "app-produzione": () => import("./views/app/app-produzione.js"),
};

/* =========================================================
   ROUTE SCOPE
========================================================= */

const PUBLIC_ROUTES = new Set([
  "login",
  "activate",
  "setPassword",
  "set-password",
  "prenota",
  "booking"
]);

const PLATFORM_ROUTES = new Set([
  "homePiattaforma",
  "gestioneAziende",
  "creaAzienda",
  "modificaAzienda",
  "gestionePiani",
]);

const PREHOME_ROUTES = new Set([
  "sceltaAzienda",
  "gestione-sedi",
  "completaProfilo",
  "completaAzienda",
]);

const ROOT_ROUTES = new Set([
  "home",
  "homePiattaforma"
]);

const BO_ROUTES = new Set([
  "bo-dashboard",
  "bo-tag",
  "bo-template",
  "bo-menu",
  "bo-categorie",
  "bo-prodotti",
  "bo-magazzino",
  "bo-produzione",
  "bo-comande",
  "bo-ricette",
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

  const sub = document.getElementById("page-subheader");
  const foot = document.getElementById("footer-root");

  if (sub) sub.innerHTML = "";
  if (foot) foot.innerHTML = "";

  const module = await routes[routeName]();

  if (!module.render) {
    throw new Error(`La view ${routeName} non esporta render()`);
  }

  await module.render(app);

  try {
    if (foot) {
      const footerHTML = await renderFooter();
      foot.innerHTML = footerHTML;
      initFooter();
    }
  } catch (e) {
    console.error("Errore render footer:", e);
  }
}

/* =========================================================
   PERMISSION CHECK
========================================================= */

function isSuperadmin() {

  if (window.state?.isSuperadmin === true) {
    return true;
  }

  const aziende =
    window.state?.aziende || [];

  return aziende.some(
    (a) => a.ruolo === "superadmin"
  );
}

function hasPermission(area) {

  // =====================================================
  // HOME SEMPRE ACCESSIBILE
  // =====================================================

  if (area === "home") {
    return true;
  }

  const viewAs =
    window.state?.viewAs;

  const ruolo =
    viewAs || window.state?.ruolo;

  // =====================================================
  // FULL ACCESS
  // =====================================================

  if (
    !viewAs &&
    window.state?._allAccess === true
  ) {
    return true;
  }

  if (isSuperadmin()) {
    return true;
  }

  // =====================================================
  // BACKOFFICE
  // =====================================================

  if (BO_ROUTES.has(area)) {

    return (
      ruolo === "admin" ||
      ruolo === "superadmin"
    );
  }

  // =====================================================
  // ADMIN
  // =====================================================

  if (ruolo === "admin") {
    return true;
  }

  // =====================================================
  // MANAGER
  // =====================================================

  if (ruolo === "manager") {

    const reparti =
      window.state?.reparti || [];

    const isCucina = reparti.some(
      r =>
        String(r.nome)
          .toLowerCase()
          .trim() === "cucina"
    );

    const isSala = reparti.some(
      r =>
        String(r.nome)
          .toLowerCase()
          .trim() === "sala"
    );

    let allowed = [

      // GENERICI
      "home",
      "operativo",
      "timbrature",
      "permessi",

      // PRENOTAZIONI
      "prenotazioni",
      "prenotazioni-dettaglio",
      "prenotazioni-form"
    ];

    // =================================================
    // MANAGER CUCINA
    // =================================================

    if (isCucina) {

      allowed = [

        ...allowed,

        // PRODUZIONE
        "produzione",
        "planner-produzione",
        "preparazioni",
        "storicoLotto",

        // RICETTE
        "ricettario",
        "creaRicetta",

        // MAGAZZINO
        "magazzino",
        "acquisti",

        // STAFF
        "dipendenti",
        "dipendente"
      ];
    }

    // =================================================
    // MANAGER SALA
    // =================================================

    if (isSala) {

      allowed = [

        ...allowed,

        "sala",
        "comanda",
        "prenotazioni-tavoli"
      ];
    }

    // =================================================
    // AREE BLOCCATE
    // =================================================

    if (
      [
        "venduto",
        "margini"
      ].includes(area)
    ) {
      return false;
    }

    return allowed.includes(area);
  }

  // =====================================================
  // OPERATORE
  // =====================================================

  if (ruolo === "operatore") {

    const reparti =
      window.state?.reparti || [];

    const isCucina = reparti.some(
      r =>
        String(r.nome)
          .toLowerCase()
          .trim() === "cucina"
    );

    const isSala = reparti.some(
      r =>
        String(r.nome)
          .toLowerCase()
          .trim() === "sala"
    );

    let allowed = [

      "home",
      "operativo",
      "timbrature"
    ];

    // =================================================
    // OPERATORE CUCINA
    // =================================================

    if (isCucina) {

      allowed = [

        ...allowed,

        "produzione",
        "planner-produzione",
        "preparazioni",
        "ricettario",
        "magazzino"
      ];
    }

    // =================================================
    // OPERATORE SALA
    // =================================================

    if (isSala) {

      allowed = [

        ...allowed,

        "sala",
        "comanda",

        "prenotazioni",
        "prenotazioni-dettaglio",
        "prenotazioni-form",
        "prenotazioni-tavoli",

        "ricettario"
      ];
    }

    // =================================================
    // AREE BLOCCATE
    // =================================================

    if (
      [
        "venduto",
        "margini",
        "acquisti",
        "dipendenti",
        "creaRicetta"
      ].includes(area)
    ) {
      return false;
    }

    return allowed.includes(area);
  }

  // =====================================================
  // FALLBACK PERMESSI DB
  // =====================================================

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

  if (header) {
    header.style.display = visible ? "flex" : "none";
  }

  const topbar = document.getElementById("topbar-info");

  if (topbar) {
    topbar.style.display = visible ? "flex" : "none";
  }
}

function getStoredAziendaId() {
  return localStorage.getItem(LS_KEYS.ACTIVE_AZIENDA_ID);
}

function setStoredAziendaId(id) {
  if (!id) return;

  localStorage.setItem(
    LS_KEYS.ACTIVE_AZIENDA_ID,
    String(id)
  );
}

function clearStoredAziendaId() {
  localStorage.removeItem(LS_KEYS.ACTIVE_AZIENDA_ID);
}

function getStoredSedeId() {
  return localStorage.getItem(LS_KEYS.ACTIVE_SEDE_ID);
}

function setStoredSedeId(id) {
  if (!id) return;

  localStorage.setItem(
    LS_KEYS.ACTIVE_SEDE_ID,
    String(id)
  );
}

function clearStoredSedeId() {
  localStorage.removeItem(LS_KEYS.ACTIVE_SEDE_ID);
}

/* =========================================================
   AUTH HELPERS
========================================================= */

async function getValidSession() {

  const { data } = await supabase.auth.getSession();

  let session = data?.session || null;

  if (!session) {

    const { data: refreshed } =
      await supabase.auth.refreshSession();

    session = refreshed?.session || null;
  }

  return session;
}

async function loadAziendeForUser(userId) {

  const { data: aziende, error } = await supabase
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
    console.error("Errore caricamento aziende:", error);
    return [];
  }

  return (aziende || []).filter((a) => a.aziende);
}

function pickActiveAzienda(aziendePulite) {

  const storedId = getStoredAziendaId();

  if (storedId) {

    const match = aziendePulite.find(
      (a) => String(a.aziende.id) === String(storedId)
    );

    if (match?.aziende) {
      return match.aziende;
    }
  }

  if (aziendePulite.length === 1) {
    return aziendePulite[0].aziende;
  }

  return null;
}

function applyAziendaContextFromLink(
  aziendePulite,
  azienda
) {

  if (!azienda) return;

  const recordAttivo = aziendePulite.find(
    (a) => a.aziende?.id === azienda.id
  );

  window.state.isSuperadmin = aziendePulite.some(
    (a) => a.ruolo === "superadmin"
  );

  const ruoloEffettivo =
    window.state.isSuperadmin
      ? "superadmin"
      : recordAttivo?.ruolo || "admin";

  window.stateActions.setRuolo(ruoloEffettivo);

  window.state.ruolo = ruoloEffettivo;

  window.state.permessiOverride =
    recordAttivo?.permessi_override || {};
}

function isAziendaBlockedForUser(
  azienda,
  routeName
) {

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

  if (!user) {
    return {
      ok: false,
      reason: "no_user"
    };
  }

  const aziendePulite =
    await loadAziendeForUser(user.id);

  window.stateActions.setAziende(aziendePulite);

  if (aziendePulite.length === 0) {

    window.stateActions.resetAzienda();

    return {
      ok: false,
      reason: "no_aziende"
    };
  }

  const activeAzienda =
    pickActiveAzienda(aziendePulite);

  if (!activeAzienda) {

    window.stateActions.resetAzienda();

    if (routeName !== "sceltaAzienda") {

      window.location.hash = "#/sceltaAzienda";

      return {
        ok: false,
        redirected: true
      };
    }

    return {
      ok: false,
      reason: "need_choice"
    };
  }

  setStoredAziendaId(activeAzienda.id);

  if (
    !window.state.azienda ||
    window.state.azienda.id !== activeAzienda.id
  ) {
    window.stateActions.setAzienda(activeAzienda);
  } else {
    window.state.azienda = activeAzienda;
  }

  applyAziendaContextFromLink(
    aziendePulite,
    activeAzienda
  );

  return {
    ok: true,
    azienda: activeAzienda,
    aziendePulite
  };
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

  if (window.stateActions?.setUser) {
    window.stateActions.setUser(null);
  }

  if (window.stateActions?.setAziende) {
    window.stateActions.setAziende([]);
  }

  if (window.stateActions?.resetAzienda) {
    window.stateActions.resetAzienda();
  }

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

  const { route, segments, params } =
    parseHash();

  console.log("ROUTE:", route);

  window.routeParams = params || {};
  window.routeSegments = segments || [];

  const session = await getValidSession();

  if (!session) {

    if (window.stateActions?.setUser) {
      window.stateActions.setUser(null);
    }

    if (window.stateActions?.setAziende) {
      window.stateActions.setAziende([]);
    }

    if (window.stateActions?.resetAzienda) {
      window.stateActions.resetAzienda();
    }

    window.state.piano = null;
    window.state.featuresEffettive = {};
    window.state.sedi = [];
    window.state.sedeAttiva = null;
    window.state.permessiOverride = {};
    window.state.isSuperadmin = false;

    setHeaderVisible(false);

    const target =
      PUBLIC_ROUTES.has(route)
        ? route
        : "login";

    await renderView(target);

    return;
  }

  window.stateActions.setUser(session.user);

  const aziendaRes =
    await ensureAziendaContext(route);

  if (!aziendaRes.ok) {
    return;
  }

  await window.stateActions.caricaPermessiEffettivi();
  await window.stateActions.caricaRuoloEReparti();

  const ruoloCorrente =
    window.state?.viewAs ||
    window.state?.ruolo;

 /* =========================================================
   FIX CRITICO:
   bootstrap sede SOLO operatori
========================================================= */

const isOperatore =
  ruoloCorrente === "operatore";

if (isOperatore) {

  try {

    const { data: dip } = await supabase
      .from("dipendenti")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (dip?.id) {

      const { data: link } = await supabase
        .from("dipendenti_sedi")
        .select(`
          sede_id,
          sedi(
            id,
            nome,
            logo_url
          )
        `)
        .eq("dipendente_id", dip.id)
        .eq("is_default", true)
        .maybeSingle();

      if (link?.sedi) {

        window.state.sedeAttiva =
          link.sedi;

        localStorage.setItem(
          "active_sede_id",
          String(link.sedi.id)
        );
      }
    }

  } catch (e) {

    console.warn(
      "Errore load sede dipendente:",
      e
    );
  }
}

  /* =========================================================
     CONTESTO OPERATIVO SOLO OPERATORI
  ========================================================= */

  if (
    isOperatore &&
    !PLATFORM_ROUTES.has(route) &&
    !BO_ROUTES.has(route) &&
    route !== "completaProfilo" &&
    route !== "completaAzienda" &&
    route !== "home" &&
    route !== "booking-form-builder"
  ) {

    const contesto =
      await window.stateActions.caricaContestoOperativo();

    console.log(
      "CONTESTO OPERATIVO:",
      contesto
    );

    if (!contesto.ok) {

      if (
        contesto.motivo ===
        "Dipendente non trovato"
      ) {

        app.innerHTML = `
          <div class="view" style="padding:40px;text-align:center;">
            <h2 style="color:#dc2626;">Errore accesso</h2>
            <p>Dipendente non associato.</p>
          </div>
        `;

        return;
      }

      if (
        contesto.motivo ===
        "Nessuna sede assegnata"
      ) {

        window.location.hash =
          "#/gestione-sedi?mode=first";

        return;
      }

      return;
    }

    if (
      contesto.tipo ===
      "dipendente_multi_sede"
    ) {

      if (route !== "scegli-sede") {

        window.location.hash =
          "#/scegli-sede";

        return;
      }
    }
  }

  if (route === "home") {

    if (ruoloCorrente === "admin") {
      await renderView("home-admin");
      return;
    }

    if (ruoloCorrente === "manager") {
      await renderView("home-manager");
      return;
    }

    if (ruoloCorrente === "operatore") {
      await renderView("home-operatore");
      return;
    }

    await renderView("home");

    return;
  }

  if (
    routes[route]
  ) {

    if (
      !PUBLIC_ROUTES.has(route) &&
      !PREHOME_ROUTES.has(route) &&
      !ROOT_ROUTES.has(route)
    ) {

      if (
        !hasPermission(route) &&
        !isSuperadmin()
      ) {

        window.location.hash = "#/home";

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

window.router = {
  reloadCurrentRoute() {
    resolve();
  },

  logout() {
    doLogout();
  },
};

window.addEventListener(
  "hashchange",
  resolve
);

window.addEventListener(
  "DOMContentLoaded",
  () => {

    app = document.getElementById("app");

    initMenu();

    supabase.auth.onAuthStateChange(
      (event, session) => {

        console.log(
          "AUTH CHANGE:",
          event,
          session
        );

        if (session?.user) {

          if (window.stateActions?.setUser) {
            window.stateActions.setUser(
              session.user
            );
          }

        } else {

          if (window.stateActions?.setUser) {
            window.stateActions.setUser(null);
          }
        }
      }
    );

    const logoutBtn =
      document.getElementById("logout-btn");

    if (logoutBtn) {
      logoutBtn.onclick = () => doLogout();
    }

    resolve();
  }
);
