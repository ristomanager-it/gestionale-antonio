// js/router.js
import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const app = document.getElementById("app");

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
};

function routeName() {
  return window.location.hash.replace("#/", "") || "login";
}

async function renderView(name) {
  app.innerHTML = "";
  const view = await routes[name]();
  await view.render(app);
}

async function resolve() {
  const {
    data: { session },
    error,
  } = await window.supabaseClient.auth.getSession();

  if (error) {
    console.error("Errore sessione:", error.message);
  }

  // 🔐 NON LOGGATO → LOGIN
  if (!session) {
    await renderView("login");
    return;
  }

  // 👤 LOGGATO
  window.stateActions.setUser(session.user);

  // 🏢 CARICO AZIENDE (JOIN SAFE)
  const { data, error: aziendeError } = await window.supabaseClient
    .from("utenti_aziende")
    .select(
      `
      ruolo,
      aziende:azienda_id (
        id,
        nome,
        codice,
        stato,
        features,
        logo_path
      )
    `
    )
    .eq("user_id", session.user.id)
    .eq("attivo", true);

  if (aziendeError) {
    console.error("Errore caricamento aziende:", aziendeError.message);
  }

  // 🧠 STATE
  window.stateActions.setAziende(data || []);
  window.stateActions.autoSetAzienda();

  // 🏠 SEMPRE HOME
  await renderView("home");
}

function init() {
  window.addEventListener("hashchange", resolve);
  resolve();
}

window.router = { init };
window.router.init();
