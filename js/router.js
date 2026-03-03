// js/router.js

import { supabase } from "./supabaseClient.js";
import { initMenu } from "./menu.js";

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

  // 🔹 REPARTI
  operativo: () => import("./views/operativo.js"),
  amministrazione: () => import("./views/amministrazione.js"),
  gestione: () => import("./views/gestione.js"),
  marketing: () => import("./views/marketing.js"),

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
   ROUTE SCOPE
========================================================= */

const PUBLIC_ROUTES = new Set(["login", "setPassword"]);

const PLATFORM_ROUTES = new Set([
  "homePiattaforma",
  "gestioneAziende",
  "creaAzienda",
  "modificaAzienda",
]);

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
   PERMISSION CHECK
========================================================= */

function isSuperadmin() {
  return window.state?.isSuperadmin === true;
}

function hasPermission(area) {
  if (isSuperadmin()) return true;

  const ruolo = window.state?.ruolo;
  if (ruolo === "admin") return true;

  const azienda = window.state?.azienda;
  if (!azienda) return false;

  const permessi = window.state?.permessi || {};
  const override = window.state?.permessiOverride || {};

  if (Object.prototype.hasOwnProperty.call(override, area)) {
    return override[area] === true;
  }

  return permessi[`${area}.read`] === true;
}

window.hasPermesso = hasPermission;

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

  if (!session) {
    window.stateActions.setUser(null);
    window.stateActions.setAziende([]);
    window.stateActions.resetAzienda();

    const header = document.querySelector(".app-header");
    if (header) header.style.display = "none";

    const target = PUBLIC_ROUTES.has(route) ? route : "login";
    await renderView(target);
    return;
  }

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

  window.state.isSuperadmin = aziendePulite.some(a => a.ruolo === "superadmin");

  window.stateActions.autoSetAzienda();

  const azienda = window.state.azienda;

  if (!azienda) {
    app.innerHTML = "<h3>Nessuna azienda associata</h3>";
    return;
  }

  const recordAttivo = aziendePulite.find(
    a => a.aziende.id === azienda.id
  );

  const ruoloEffettivo = window.state.isSuperadmin
    ? "superadmin"
    : (recordAttivo?.ruolo || null);

  window.stateActions.setRuolo(ruoloEffettivo);
  window.state.permessiOverride = recordAttivo?.permessi_override || {};

  await window.stateActions.caricaPermessiEffettivi();
  await window.stateActions.caricaRuoloEReparti();

  const nomeAziendaEl = document.getElementById("header-azienda-nome");
  const logoEl = document.getElementById("header-logo");
  const avatarEl = document.getElementById("header-avatar");
  const userNameEl = document.getElementById("header-user-name");
  const logoutBtn = document.getElementById("logout-btn");

  if (nomeAziendaEl) nomeAziendaEl.textContent = azienda.nome || "";

  if (logoEl) {
    if (azienda.logo_url) {
      logoEl.src = azienda.logo_url;
      logoEl.style.display = "block";
    } else {
      logoEl.style.display = "none";
    }
  }

  if (userNameEl && avatarEl) {
    const email = session.user.email || "";
    const nome = email.split("@")[0] || "";
    userNameEl.textContent = nome;
    avatarEl.textContent = (nome.substring(0, 2) || "U").toUpperCase();
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      window.location.hash = "#/login";
    };
  }

  // 🔒 BLOCCO OPERATIVITÀ SE AZIENDA SOSPESA
  if (
    azienda.stato === "sospesa" &&
    !isSuperadmin() &&
    !PLATFORM_ROUTES.has(route)
  ) {
    app.innerHTML = `
      <div class="view" style="padding:40px; text-align:center;">
        <h2 style="color:#dc2626;">Azienda sospesa</h2>
        <p style="margin-top:12px;">
          L'operatività di questa azienda è stata sospesa dalla piattaforma.
        </p>
        <p style="margin-top:6px; opacity:0.7;">
          Contatta l'amministratore per maggiori informazioni.
        </p>
      </div>
    `;
    return;
  }

  if (route === "login") {
    window.location.hash =
      azienda.stato === "piattaforma" || isSuperadmin()
        ? "#/homePiattaforma"
        : "#/home";
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

  if (routes[route] && !PUBLIC_ROUTES.has(route)) {
    if (!hasPermission(route)) {
      window.location.hash = "#/home";
      return;
    }
  }

  await renderView(route);
}

/* =========================================================
   INIT
========================================================= */

window.router = {
  reloadCurrentRoute() {
    resolve();
  },
};

window.addEventListener("hashchange", resolve);

window.addEventListener("DOMContentLoaded", () => {
  app = document.getElementById("app");
  initMenu();
  resolve();
});
