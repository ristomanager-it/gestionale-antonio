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
  } = await window.supabaseClient.auth.getSession();

  // NON LOGGATO → LOGIN
  if (!session) {
    await renderView("login");
    return;
  }

  // LOGGATO
  window.stateActions.setUser(session.user);

  // carico aziende
  const { data } = await window.supabaseClient
    .from("utenti_aziende")
    .select(
      `ruolo, aziende:azienda_id (
        id, nome, codice, stato, features
      )`
    )
    .eq("user_id", session.user.id)
    .eq("attivo", true);

  window.stateActions.setAziende(data || []);
  window.stateActions.autoSetAzienda();

  // SEMPRE HOME
  await renderView("home");
}

function init() {
  window.addEventListener("hashchange", resolve);
  resolve();
}

window.router = { init };
window.router.init();
