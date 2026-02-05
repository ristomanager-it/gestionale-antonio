// js/router.js
// =======================================
// Router SPA basato su location.hash
// =======================================

// Importa stato e azioni (una sola volta, globali)
import "./state.js";
import "./stateActions.js";

// Mappa delle viste disponibili
const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  "crea-azienda": () => import("./views/crea-azienda.js"),
  "gestione-aziende": () => import("./views/gestione-aziende.js"),
  "carica-azienda": () => import("./views/carica-azienda.js"),
  "select-azienda": () => import("./views/select-azienda.js"),

  // placeholder moduli futuri
  timbrature: () => import("./views/timbrature.js"),
  dipendenti: () => import("./views/dipendenti.js"),
  magazzino: () => import("./views/magazzino.js"),
  acquisti: () => import("./views/acquisti.js"),
  ricette: () => import("./views/ricette.js"),
  venduto: () => import("./views/venduto.js"),
  report: () => import("./views/report.js"),
};

// Root dell'app
const appRoot = document.getElementById("app");

/**
 * Renderizza una view nel DOM
 */
async function renderView(routeName) {
  appRoot.innerHTML = "";

  const loadView = routes[routeName];
  if (!loadView) {
    appRoot.innerHTML = `<p>Vista non trovata</p>`;
    return;
  }

  try {
    const viewModule = await loadView();

    if (typeof viewModule.render !== "function") {
      throw new Error(`La view "${routeName}" non esporta render()`);
    }

    viewModule.render(appRoot);
  } catch (err) {
    console.error("Errore caricamento view:", err);
    appRoot.innerHTML = `
      <div style="padding:20px;">
        <h3>Errore</h3>
        <p>Errore nel caricamento della vista <strong>${routeName}</strong></p>
      </div>
    `;
  }
}

/**
 * Risolve la rotta in base allo stato globale
 */
function resolveRoute() {
  const hash = window.location.hash.replace("#/", "") || "login";

  // 🔒 NON LOGGATO → solo login
  if (!window.state.user) {
    if (hash !== "login") {
      window.location.hash = "#/login";
      return;
    }
    renderView("login");
    return;
  }

  // ✅ LOGGATO → garantisco auto-set azienda
  if (!window.state.azienda && window.state.aziende?.length > 0) {
    window.stateActions.autoSetAzienda();
  }

  // 🏢 SUPERADMIN / PIATTAFORMA
  if (window.state.azienda?.stato === "piattaforma") {
    // se prova ad andare su login → home
    if (hash === "login") {
      window.location.hash = "#/home";
      return;
    }

    renderView(hash);
    return;
  }

  // 🧑‍🍳 AZIENDA CLIENTE
  if (!window.state.azienda) {
    // nessuna azienda selezionata → fallback
    window.location.hash = "#/select-azienda";
    return;
  }

  renderView(hash);
}

/**
 * Inizializza router
 */
function init() {
  window.addEventListener("hashchange", resolveRoute);
  resolveRoute();
}

// Espone router globalmente
window.router = {
  init,
};
