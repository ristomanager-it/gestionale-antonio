import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const app = document.getElementById("app");

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  homePiattaforma: () => import("./views/home-piattaforma.js"),
  creaAzienda: () => import("./views/crea-azienda.js"),
  gestioneAziende: () => import("./views/gestione-aziende.js"),
  modificaAzienda: () => import("./views/modifica-azienda.js"),
  setPassword: () => import("./views/set-password.js"),
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
  if (!routes[routeName]) {
    routeName = "home";
  }

  app.innerHTML = "";

  const module = await routes[routeName]();

  if (!module.render) {
    throw new Error(`La view ${routeName} non esporta render()`);
  }

  await module.render(app);
}

async function resolve() {
  const { route, params } = parseHash();
  window.routeParams = params || {};

  // 🔐 Recupero sessione
  let { data } = await window.supabaseClient.auth.getSession();
  let session = data.session;

  // Tentativo refresh automatico
  if (!session) {
    const { data: refreshed } =
      await window.supabaseClient.auth.refreshSession();
    session = refreshed?.session;
  }

  // ❌ Nessuna sessione → login
  if (!session) {
    await renderView("login");
    return;
  }

  window.stateActions.setUser(session.user);

  // 🔐 Recupero aziende associate
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

  const aziendePulite = (aziende || []).filter(a => a.aziende !== null);

  window.stateActions.setAziende(aziendePulite);
  window.stateActions.autoSetAzienda();

  const azienda = window.state.azienda;

  if (!azienda) {
    app.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Nessuna azienda associata</h3>
        </div>
      </div>
    `;
    return;
  }

  // 🔵 Regole di navigazione

  // Se piattaforma e non specifica route → home piattaforma
  if (azienda.stato === "piattaforma" && (route === "login" || route === "")) {
    window.location.hash = "#/homePiattaforma";
    return;
  }

  // Se azienda normale prova ad andare su homePiattaforma → riportala a home
  if (azienda.stato !== "piattaforma" && route === "homePiattaforma") {
    window.location.hash = "#/home";
    return;
  }

  await renderView(route);
}

window.addEventListener("hashchange", resolve);
resolve();
