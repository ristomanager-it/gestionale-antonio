// js/router.js
// =======================================
// ROUTER SPA – VERSIONE ANTI-SCHERMO BIANCO
// =======================================

import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const appRoot = document.getElementById("app");

// fallback IMMEDIATO (mai più schermo vuoto)
appRoot.innerHTML = "<p style='padding:20px'>Caricamento...</p>";

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  "crea-azienda": () => import("./views/crea-azienda.js"),
  "gestione-aziende": () => import("./views/gestione-aziende.js"),
};

function getRoute() {
  return window.location.hash.replace("#/", "") || "login";
}

async function renderView(name) {
  appRoot.innerHTML = "<p style='padding:20px'>Caricamento vista...</p>";

  const loader = routes[name];
  if (!loader) {
    appRoot.innerHTML = "<p>Vista non trovata</p>";
    return;
  }

  const view = await loader();
  await view.render(appRoot);
}

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

async function resolveRoute() {
  // MOSTRA SEMPRE QUALCOSA
  appRoot.innerHTML = "<p style='padding:20px'>Verifica accesso...</p>";

  await loadSessionAndAziende();

  const route = getRoute();
  const user = window.state.user;

  // 🔐 NON LOGGATO → LOGIN (SEMPRE)
  if (!user) {
    await renderView("login");
    return;
  }

  // auto-set azienda
  window.stateActions.autoSetAzienda();

  // se non c'è azienda → fallback login (mai vuoto)
  if (!window.state.azienda) {
    await renderView("login");
    return;
  }

  // se è loggato e chiede login → home
  if (route === "login") {
    window.location.hash = "#/home";
    return;
  }

  // protezione viste piattaforma
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
