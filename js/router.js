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

function getRoute() {
  return window.location.hash.replace("#/", "") || "login";
}

async function renderView(name) {
  app.innerHTML = "";
  const view = await routes[name]();
  await view.render(app);
}

async function resolve() {
  const route = getRoute();

  const { data } = await window.supabaseClient.auth.getSession();
  const session = data.session;

  // 🔐 NON LOGGATO → LOGIN
  if (!session) {
    await renderView("login");
    return;
  }

  // 👤 UTENTE
  window.stateActions.setUser(session.user);

  // 🏢 CARICA AZIENDE
  const { data: aziende } = await window.supabaseClient
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

  window.stateActions.setAziende(aziende || []);
  window.stateActions.autoSetAzienda();

  // ⛔ SE NON ESISTE AZIENDA → NON RENDERIZZARE HOME
  if (!window.state.azienda) {
    app.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Nessuna azienda associata</h3>
          <p>L’utente non è collegato a nessuna azienda.</p>
        </div>
      </div>
    `;
    return;
  }

  // 🏠 OK, ORA POSSIAMO RENDERIZZARE
  await renderView(routes[route] ? route : "home");
}

window.addEventListener("hashchange", resolve);
resolve();
