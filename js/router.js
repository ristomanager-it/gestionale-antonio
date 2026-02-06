// js/router.js
// =======================================
// Router SPA – VERSIONE STABILE DEFINITIVA
// =======================================

import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const appRoot = document.getElementById("app");

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  "crea-azienda": () => import("./views/crea-azienda.js"),
  "gestione-aziende": () => import("./views/gestione-aziende.js"),
};

// --- util ---
function getRoute() {
  return window.location.hash.replace("#/", "") || "login";
}

async function renderView(name) {
  appRoot.innerHTML = "";
  const loader = routes[name];
  if (!loader) {
    appRoot.innerHTML = "<p>Vista non trovata</p>";
    return;
  }
  const view = await loader();
  await view.render(appRoot);
}

// --- session + aziende ---
async function loadSessionAndAziende() {
  const { data } = await window.supabaseClient.auth.getSession();
  const session = data?.session || null;

  window.stateActions.setUser(session?.user || null);

  if (!session?.user) {
    window.stateActions.setAziende([]);
    window.stateActions.resetAzienda();
    return;
  }

  const { data: rel } = await window.supabaseClient
    .from("utenti_aziende")
    .select(
      `ruolo, attivo, aziende:azienda_id (
        id, nome, codice, stato, attiva, features
      )`
    )
    .eq("user_id", session.user.id)
    .eq("attivo", true);

  window.stateActions.setAziende(rel || []);
}

// --- router core ---
async function resolveRoute() {
  await loadSessionAndAziende();

  const route = getRoute();
  const user = window.state.user;

  // 🔐 NON LOGGATO → SOLO LOGIN
  if (!user) {
    await renderView("login");
    return;
  }

  // 🔥 AUTO-SET AZIENDA (piattaforma prioritaria)
  window.stateActions.autoSetAzienda();

  // sicurezza: se ancora nulla
  if (!window.state.azienda) {
    appRoot.innerHTML = "<p>Nessuna azienda associata</p>";
    return;
  }

  // LOGIN non serve più da loggato
  if (route === "login") {
    window.location.hash = "#/home";
    return;
  }

  // BLOCCO viste piattaforma se non piattaforma
  const piattaformaOnly = ["crea-azienda", "gestione-aziende"];
  if (
    piattaformaOnly.includes(route) &&
    window.state.azienda.stato !== "piattaforma"
  ) {
    window.location.hash = "#/home";
    return;
  }

  await renderView(route);
}

function init() {
  window.addEventListener("hashchange", resolveRoute);
  resolveRoute();
}

window.router = { init };
window.router.init();
