// js/router.js
// =======================================
// Router SPA basato su location.hash
// =======================================

// Mappa delle viste disponibili
const routes = {
  login: () => import("./views/login.js"),
  "select-azienda": () => import("./views/select-azienda.js"),
  home: () => import("./views/home.js"),
};

// Root dell'app
const appRoot = document.getElementById("app");

/**
 * Rende una view nel DOM
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
      throw new Error("La view non esporta render()");
    }
    viewModule.render(appRoot);
  } catch (err) {
    console.error("Errore caricamento view:", err);
    appRoot.innerHTML = `<p>Errore nel caricamento della vista</p>`;
  }
}

/**
 * Decide la rotta corretta in base allo stato
 */
function resolveRoute() {
  const hash = window.location.hash.replace("#/", "") || "login";

  // NON loggato → solo login
  if (!state.user && hash !== "login") {
    window.location.hash = "#/login";
    return;
  }

  // Loggato ma senza azienda → selezione azienda
  if (state.user && !state.azienda && hash !== "select-azienda") {
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
