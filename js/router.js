import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const app = document.getElementById("app");

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  homePiattaforma: () => import("./views/home-piattaforma.js"),
  creaAzienda: () => import("./views/crea-azienda.js"),
  gestioneAziende: () => import("./views/gestione-aziende.js"),
  modificaAzienda: () => import("./views/modifica-azienda.js"),
  setPassword: () => import("./views/set-password.js"),

  dipendenti: () => import("./views/dipendenti.js"),

  acquisti: () => import("./views/acquisti.js"),
  magazzino: () => import("./views/magazzino.js"),
  produzione: () => import("./views/produzione.js"),
  ricettario: () => import("./views/ricettario.js"),
  creaRicetta: () => import("./views/crea-ricetta.js"),
  preparazioni: () => import("./views/preparazioni.js"),
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

async function renderView(routeName) {
  if (!routes[routeName]) {
    routeName = "home";
  }

  app.innerHTML = "";

  const module = await routes[routeName]();

  if (!module.render) {
    throw new Error(`La view ${routeName} non esporta render()`);
  }

  await module.render(app);
}

/* =========================================================
   🔐 PERMESSI DEFINITIVI
========================================================= */

function hasFeature(area) {
  const azienda = window.state?.azienda;

  if (azienda?.stato === "piattaforma") return true;

  const features = azienda?.features || {};
  return features[area] === true;
}

function hasPermission(area) {
  const azienda = window.state?.azienda;

  if (azienda?.stato === "piattaforma") return true;

  const permessiEffettivi = window.state?.permessi || {};
  const override = window.state?.permessiOverride || {};

  if (!hasFeature(area)) return false;

  if (override.hasOwnProperty(area)) {
    return override[area] === true;
  }

  if (permessiEffettivi[`${area}.read`] === true) {
    return true;
  }

  return false;
}

/* =========================================================
   RESOLVE ROUTER
========================================================= */

async function resolve() {

  if (!window.location.hash) {
    window.location.hash = "#/login";
    return;
  }

  const { route, segments, params } = parseHash();
  window.routeParams = params || {};
  window.routeSegments = segments || [];

  let { data } = await window.supabaseClient.auth.getSession();
  let session = data.session;

  if (!session) {
    const { data: refreshed } =
      await window.supabaseClient.auth.refreshSession();
    session = refreshed?.session;
  }

  /* =====================================
     🔒 NESSUNA SESSIONE → LOGIN
  ===================================== */

  if (!session) {
    window.stateActions.setUser(null);
    window.stateActions.setAziende([]);
    window.stateActions.resetAzienda();

    // 🔥 NASCONDI HEADER
    const header = document.querySelector(".app-header");
    if (header) header.style.display = "none";

    await renderView("login");
    return;
  }

  // 🔥 SESSIONE VALIDA → MOSTRA HEADER
  const header = document.querySelector(".app-header");
  if (header) header.style.display = "block";

  window.stateActions.setUser(session.user);

  /* =====================================
     🔎 CARICAMENTO AZIENDE
  ===================================== */

  const { data: aziende } = await window.supabaseClient
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
        logo_url
      )
    `)
    .eq("user_id", session.user.id)
    .eq("attivo", true);

  const aziendePulite = (aziende || []).filter(a => a.aziende !== null);

  window.stateActions.setAziende(aziendePulite);
  window.stateActions.autoSetAzienda();

  const azienda = window.state.azienda;

  if (!azienda) {
    app.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Nessuna azienda associata</h3>
        </div>
      </div>
    `;
    return;
  }

  /* =====================================
     🔥 SALVA RUOLO + OVERRIDE
  ===================================== */

  const recordAttivo = aziendePulite.find(
    a => a.aziende.id === azienda.id
  );

  window.stateActions.setRuolo(recordAttivo?.ruolo || null);
  window.state.permessiOverride = recordAttivo?.permessi_override || {};

  /* =====================================
     🔥 CARICA PERMESSI + REPARTI
  ===================================== */

  await window.stateActions.caricaPermessiEffettivi();
  await window.stateActions.caricaRuoloEReparti();

  /* =====================================
     🔒 BLOCCO ROUTE
  ===================================== */

  if (routes[route] && route !== "home" && route !== "homePiattaforma") {
    if (!hasPermission(route)) {
      window.location.hash = "#/home";
      return;
    }
  }

  /* =====================================
     🔁 REDIRECT COERENTI
  ===================================== */

  if (azienda.stato === "piattaforma" && route === "login") {
    window.location.hash = "#/homePiattaforma";
    return;
  }

  if (azienda.stato !== "piattaforma" && route === "homePiattaforma") {
    window.location.hash = "#/home";
    return;
  }

  if (route === "login") {
    window.location.hash =
      azienda.stato === "piattaforma"
        ? "#/homePiattaforma"
        : "#/home";
    return;
  }

  await renderView(route);
}

window.addEventListener("hashchange", resolve);
resolve();
