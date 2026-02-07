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
  const { data } = await window.supabaseClient.auth.getSession();
  const session = data.session;

  if (!session) {
    await renderView("login");
    return;
  }

  window.stateActions.setUser(session.user);

  const { data: aziende } = await window.supabaseClient
    .from("utenti_aziende")
    .select(`
      ruolo,
      aziende:azienda_id (
        id, nome, codice, stato, features, logo_path
      )
    `)
    .eq("user_id", session.user.id)
    .eq("attivo", true);

  window.stateActions.setAziende(aziende || []);
  window.stateActions.autoSetAzienda();

  const route =
    window.location.hash.replace("#/", "") || "home";

  await renderView(routes[route] ? route : "home");
}

window.addEventListener("hashchange", resolve);
resolve();
