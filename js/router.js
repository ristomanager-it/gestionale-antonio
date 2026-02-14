import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const app = document.getElementById("app");

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  creaAzienda: () => import("./views/crea-azienda.js"),
  gestioneAziende: () => import("./views/gestione-aziende.js"),
  modificaAzienda: () => import("./views/modifica-azienda.js"),
};

function parseHash() {
  const raw = window.location.hash || "#/login";
  const cleaned = raw.replace("#/", "");
  const [routeName, queryString] = cleaned.split("?");

  const params = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
  }

  return {
    route: routeName || "login",
    params,
  };
}

async function renderView(routeName) {
  app.innerHTML = "";
  const view = await routes[routeName]();
  await view.render(app);
}

async function resolve() {
  const { route, params } = parseHash();

  window.routeParams = params || {};

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

  window.stateActions.setAziende(aziende || []);
  window.stateActions.autoSetAzienda();

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

  const safeRoute = routes[route] ? route : "home";
  await renderView(safeRoute);
}

window.addEventListener("hashchange", resolve);
resolve();
