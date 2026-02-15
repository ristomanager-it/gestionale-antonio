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
  app.innerHTML = "";
  const view = await routes[routeName]();
  await view.render(app);
}

function isScaduta(dataScadenza) {
  if (!dataScadenza) return false;
  const today = new Date();
  const scadenza = new Date(dataScadenza);
  today.setHours(0, 0, 0, 0);
  scadenza.setHours(0, 0, 0, 0);
  return scadenza < today;
}

async function resolve() {
  const currentUrl = window.location.href;

  // 🔥 Gestione INVITE / RECOVERY (fondamentale per onboarding SaaS)
  if (currentUrl.includes("code=")) {
    const { error } =
      await window.supabaseClient.auth.exchangeCodeForSession(
        window.location.href
      );

    if (!error) {
      // Pulizia URL dopo creazione sessione
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.hash
      );
    }
  }

  const { route, params } = parseHash();
  window.routeParams = params || {};

  const { data } = await window.supabaseClient.auth.getSession();
  const session = data.session;

  if (!session) {
    await renderView("login");
    return;
  }

  window.stateActions.setUser(session.user);

  // 🔐 Forza impostazione password al primo accesso
  if (session.user.user_metadata?.must_set_password === true) {
    await renderView("setPassword");
    return;
  }

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
        </div>
      </div>
    `;
    return;
  }

  const azienda = window.state.azienda.aziende;

  // 🚫 Azienda sospesa o disattivata
  if (azienda.attiva === false || azienda.stato === "sospesa") {
    app.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Azienda sospesa</h3>
          <p>Contatta l’amministrazione.</p>
        </div>
      </div>
    `;
    return;
  }

  // ⛔ Abbonamento scaduto
  if (isScaduta(azienda.data_scadenza)) {
    app.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Abbonamento scaduto</h3>
          <p>Rinnova per continuare ad utilizzare Ristoflow.</p>
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
