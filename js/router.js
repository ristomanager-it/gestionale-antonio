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

  // 🔹 MODULO DIPENDENTI (NUOVO)
  dipendenti: () => import("./views/dipendenti.js"),

  // Moduli operativi
  acquisti: () => import("./views/acquisti.js"),
  magazzino: () => import("./views/magazzino.js"),

  // 🔥 CENTRO PRODUZIONE
  produzione: () => import("./views/produzione.js"),

  // 🔹 Ricettario (solo ricerca + viewer)
  ricettario: () => import("./views/ricettario.js"),

  // 🔹 Editor completo ricetta
  creaRicetta: () => import("./views/crea-ricetta.js"),

  // 🔹 Preparazioni / Lotti
  preparazioni: () => import("./views/preparazioni.js"),
};

function parseHash() {
  const raw = window.location.hash || "#/login";
  const cleaned = raw.replace("#/", "");
  const [path, queryString] = cleaned.split("?");

  const params = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
  }

  const segments = path.split("/").filter(Boolean);

  return {
    route: segments[0] || "login",
    segments,
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
  const { route, segments, params } = parseHash();
  window.routeParams = params || {};
  window.routeSegments = segments || [];

  let { data } = await window.supabaseClient.auth.getSession();
  let session = data.session;

  if (!session) {
    const { data: refreshed } =
      await window.supabaseClient.auth.refreshSession();
    session = refreshed?.session;
  }

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

  if (azienda.stato === "piattaforma" && (route === "login" || route === "")) {
    window.location.hash = "#/homePiattaforma";
    return;
  }

  if (azienda.stato !== "piattaforma" && route === "homePiattaforma") {
    window.location.hash = "#/home";
    return;
  }

  if (route === "login") {
    if (azienda.stato === "piattaforma") {
      window.location.hash = "#/homePiattaforma";
    } else {
      window.location.hash = "#/home";
    }
    return;
  }

  await renderView(route);
}

window.addEventListener("hashchange", resolve);
resolve();
