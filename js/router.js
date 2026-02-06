// js/router.js
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

function getRoute() {
  return window.location.hash.replace("#/", "") || "login";
}

async function renderView(name) {
  appRoot.innerHTML = "<p style='padding:20px'>Caricamento…</p>";

  const loader = routes[name];
  if (!loader) {
    appRoot.innerHTML = "<p>Vista non trovata</p>";
    return;
  }

  const view = await loader();
  await view.render(appRoot);
}

async function loadAziende(user) {
  if (!user) {
    window.stateActions.setAziende([]);
    window.stateActions.resetAzienda();
    return;
  }

  const { data } = await window.supabaseClient
    .from("utenti_aziende")
    .select(
      `ruolo, attivo, aziende:azienda_id (
        id, nome, codice, stato, attiva, features
      )`
    )
    .eq("user_id", user.id)
    .eq("attivo", true);

  window.stateActions.setAziende(data || []);
}

async function resolve() {
  const route = getRoute();
  const user = window.state.user;

  if (!user) {
    await renderView("login");
    return;
  }

  window.stateActions.autoSetAzienda();

  if (!window.state.azienda) {
    appRoot.innerHTML = "<p>Nessuna azienda associata</p>";
    return;
  }

  if (route === "login") {
    window.location.hash = "#/home";
    return;
  }

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
  // 🔔 LISTENER UFFICIALE SUPABASE
  window.supabaseClient.auth.onAuthStateChange(
    async (_event, session) => {
      const user = session?.user || null;

      window.stateActions.setUser(user);
      await loadAziende(user);
      await resolve();
    }
  );

  resolve();
}

window.router = { init };
window.router.init();
