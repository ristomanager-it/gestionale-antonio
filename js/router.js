// js/router.js

import { supabase } from "./supabaseClient.js";

let app = null;

/* =========================================================
   ROUTES
========================================================= */

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  homePiattaforma: () => import("./views/home-piattaforma.js"),
  creaAzienda: () => import("./views/crea-azienda.js"),
  gestioneAziende: () => import("./views/gestione-aziende.js"),
  modificaAzienda: () => import("./views/modifica-azienda.js"),
  setPassword: () => import("./views/set-password.js"),

  dipendenti: () => import("./views/dipendenti.js"),
  timbrature: () => import("./views/timbrature.js"),

  acquisti: () => import("./views/acquisti.js"),
  magazzino: () => import("./views/magazzino.js"),
  produzione: () => import("./views/produzione.js"),
  ricettario: () => import("./views/ricettario.js"),
  creaRicetta: () => import("./views/crea-ricetta.js"),
  preparazioni: () => import("./views/preparazioni.js"),

  venduto: () => import("./views/venduto.js"),
  margini: () => import("./views/margini.js"),

  preventivi: () => import("./views/preventivi.js"),
  creaPreventivo: () => import("./views/crea-preventivo.js"),
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
  if (!routes[routeName]) routeName = "home";

  if (!app) return;

  app.innerHTML = "";

  const module = await routes[routeName]();

  if (!module.render) {
    throw new Error(`La view ${routeName} non esporta render()`);
  }

  await module.render(app);
}

/* =========================================================
   PERMESSI
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

  const permessi = window.state?.permessi || {};
  const override = window.state?.permessiOverride || {};

  if (!hasFeature(area)) return false;

  if (override.hasOwnProperty(area)) {
    return override[area] === true;
  }

  return permessi[`${area}.read`] === true;
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
  window.routeParams = params || {};
  window.routeSegments = segments || [];

  let { data } = await supabase.auth.getSession();
  let session = data.session;

  if (!session) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed?.session;
  }

  // ❌ NON LOGGATO
  if (!session) {
    window.stateActions.setUser(null);
    window.stateActions.setAziende([]);
    window.stateActions.resetAzienda();

    const header = document.querySelector(".app-header");
    if (header) header.style.display = "none";

    await renderView("login");
    return;
  }

  // ✅ LOGGATO
  const header = document.querySelector(".app-header");
  if (header) header.style.display = "flex";

  window.stateActions.setUser(session.user);

  const { data: aziende } = await supabase
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

  const aziendePulite = (aziende || []).filter(a => a.aziende);

  window.stateActions.setAziende(aziendePulite);
  window.stateActions.autoSetAzienda();

  const azienda = window.state.azienda;

  if (!azienda) {
    app.innerHTML = "<h3>Nessuna azienda associata</h3>";
    return;
  }

  const recordAttivo = aziendePulite.find(
    a => a.aziende.id === azienda.id
  );

  window.stateActions.setRuolo(recordAttivo?.ruolo || null);
  window.state.permessiOverride = recordAttivo?.permessi_override || {};

  await window.stateActions.caricaPermessiEffettivi();
  await window.stateActions.caricaRuoloEReparti();

  if (routes[route] && route !== "home" && route !== "homePiattaforma") {
    if (!hasPermission(route)) {
      window.location.hash = "#/home";
      return;
    }
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

/* =========================================================
   INIT
========================================================= */

window.addEventListener("hashchange", resolve);

window.addEventListener("DOMContentLoaded", () => {
  app = document.getElementById("app");
  resolve();
});
