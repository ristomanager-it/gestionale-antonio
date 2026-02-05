// js/router.js
// =======================================
// Router SPA – login SEMPRE separato
// =======================================

import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  "crea-azienda": () => import("./views/crea-azienda.js"),
  "gestione-aziende": () => import("./views/gestione-aziende.js"),
  "select-azienda": () => import("./views/select-azienda.js"),
};

const appRoot = document.getElementById("app");

async function renderView(routeName) {
  appRoot.innerHTML = "";

  const loader = routes[routeName];
  if (!loader) {
    appRoot.innerHTML = `<p>Vista non trovata</p>`;
    return;
  }

  const view = await loader();
  await view.render(appRoot);
}

function getRoute() {
  return window.location.hash.replace("#/", "") || "login";
}

async function bootstrapSession() {
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
  await bootstrapSession();

  const route = getRoute();
  const user = window.state.user;

  // 🔐 NON LOGGATO → SEMPRE LOGIN
  if (!user) {
    if (route !== "login") {
      window.location.hash = "#/login";
      return;
    }
    await renderView("login");
    return;
  }

  // ✅ LOGGATO
  if (route === "login") {
    window.location.hash = "#/home";
    return;
  }

  // auto-set azienda (piattaforma o singola)
  window.stateActions.autoSetAzienda();

  // se ancora nessuna azienda → select
  if (!window.state.azienda) {
    window.location.hash = "#/select-azienda";
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
