// js/router.js
// =======================================
// Router SPA basato su location.hash
// (auto-start + fallback UI anti-schermo-nero)
// =======================================

import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

// Mappa viste (solo quelle che esistono davvero)
const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  "crea-azienda": () => import("./views/crea-azienda.js"),
  "gestione-aziende": () => import("./views/gestione-aziende.js"),
  "carica-azienda": () => import("./views/carica-azienda.js"),
  "select-azienda": () => import("./views/select-azienda.js"),
};

const appRoot = document.getElementById("app");

function showFallback(html) {
  appRoot.innerHTML = `
    <div style="padding:20px; max-width:900px; margin:0 auto;">
      ${html}
    </div>
  `;
}

async function renderView(routeName) {
  appRoot.innerHTML = "";

  const loadView = routes[routeName];
  if (!loadView) {
    showFallback(`
      <h2>Vista non trovata</h2>
      <p>Route: <code>${routeName}</code></p>
      <button class="app-button" onclick="window.location.hash='#/home'">Vai Home</button>
    `);
    return;
  }

  try {
    const viewModule = await loadView();
    if (typeof viewModule.render !== "function") {
      throw new Error(`La view "${routeName}" non esporta render()`);
    }
    await viewModule.render(appRoot);
  } catch (err) {
    console.error("Errore caricamento view:", err);
    showFallback(`
      <h2>Errore caricamento vista</h2>
      <p><strong>${routeName}</strong></p>
      <pre style="white-space:pre-wrap; font-size:12px; opacity:.8;">${String(err?.message || err)}</pre>
      <button class="app-button" onclick="window.location.hash='#/login'">Vai al Login</button>
    `);
  }
}

function getHashRoute() {
  return window.location.hash.replace("#/", "") || "login";
}

async function bootstrapSession() {
  // se la key è sbagliata non blocchiamo: mostriamo login
  try {
    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) throw error;
    const session = data?.session || null;

    window.stateActions.setUser(session?.user || null);

    // Se loggato, carica aziende da utenti_aziende
    if (session?.user) {
      const { data: rel, error: e2 } = await window.supabaseClient
        .from("utenti_aziende")
        .select(
          `ruolo, attivo, aziende:azienda_id ( id, codice, nome, attiva, features, stato, data_scadenza, created_at )`
        )
        .eq("user_id", session.user.id)
        .eq("attivo", true);

      if (e2) throw e2;

      // normalizza: salva array come arriva (compatibile col tuo home.js)
      window.stateActions.setAziende(rel || []);
    } else {
      window.stateActions.setAziende([]);
      window.stateActions.resetAzienda();
    }
  } catch (err) {
    console.error("Bootstrap session error:", err);
    window.stateActions.setUser(null);
    window.stateActions.setAziende([]);
    window.stateActions.resetAzienda();
  }
}

async function resolveRoute() {
  // assicura sempre sessione prima di decidere
  await bootstrapSession();

  const hash = getHashRoute();

  // 🔒 NON LOGGATO → solo login
  if (!window.state.user) {
    if (hash !== "login") {
      window.location.hash = "#/login";
      return;
    }
    await renderView("login");
    return;
  }

  // ✅ LOGGATO → auto-set azienda
  window.stateActions.autoSetAzienda();

  // se non ho azienda selezionata e non sono piattaforma
  if (!window.state.azienda) {
    window.location.hash = "#/select-azienda";
    return;
  }

  // se prova a tornare a login da loggato → home
  if (hash === "login") {
    window.location.hash = "#/home";
    return;
  }

  await renderView(hash);
}

function init() {
  window.addEventListener("hashchange", resolveRoute);
  resolveRoute();
}

window.router = { init };

// ✅ AUTO-START: così non resta mai nero
window.router.init();
