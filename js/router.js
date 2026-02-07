// js/router.js
import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const app = document.getElementById("app");

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  creaAzienda: () => import("./views/crea-azienda.js"),
  listaAziende: () => import("./views/lista-aziende.js"),
};

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

  if (error) console.error(error);

  if (!session) {
    await renderView("login");
    return;
  }

  window.stateActions.setUser(session.user);

  const { data, error: aziendeError } = await window.supabaseClient
    .from("utenti_aziende")
    .select(`
      ruolo,
      aziende:azienda_id (
        id,
        nome,
        codice,
        stato,
        features,
        logo_path
      )
    `)
    .eq("user_id", session.user.id)
    .eq("attivo", true);

  if (aziendeError) console.error(aziendeError);

  window.stateActions.setAziende(data || []);
  window.stateActions.autoSetAzienda();

  const route =
    window.location.hash.replace("#/", "") || "home";

  await renderView(routes[route] ? route : "home");
}

function init() {
  window.addEventListener("hashchange", resolve);
  resolve();
}

window.router = { init };
window.router.init();
