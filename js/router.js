// js/router.js
import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const app = document.getElementById("app");

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),

  creaAzienda: () => import("./views/crea-azienda.js"),

  // ✅ route nuove “definitive”
  gestioneAziende: () => import("./views/gestione-aziende.js"),
  modificaAzienda: () => import("./views/modifica-azienda.js"),

  // ✅ alias compatibilità (se in giro avevi ancora listaAziende)
  listaAziende: () => import("./views/gestione-aziende.js"),
};

function parseHash() {
  // es: "#/modificaAzienda?id=xxx"
  const raw = window.location.hash || "#/login";
  const cleaned = raw.replace("#/", "");
  const [name, qs] = cleaned.split("?");

  const params = {};
  if (qs) {
    const sp = new URLSearchParams(qs);
    for (const [k, v] of sp.entries()) params[k] = v;
  }

  return { name: name || "login", params };
}

async function renderView(name) {
  app.innerHTML = "";
  const view = await routes[name]();
  await view.render(app);
}

async function resolve() {
  const { name: routeName, params } = parseHash();
  window.routeParams = params || {};

  const { data } = await window.supabaseClient.auth.getSession();
  const session = data.session;

  // 🔐 NON LOGGATO → LOGIN
  if (!session) {
    await renderView("login");
    return;
  }

  // 👤 UTENTE
  window.stateActions.setUser(session.user);

  // 🏢 CARICA AZIENDE COLLEGATE
  const { data: aziende, error } = await window.supabaseClient
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
        logo_path
      )
    `)
    .eq("user_id", session.user.id)
    .eq("attivo", true);

  if (error) {
    console.error("Errore caricamento aziende:", error);
  }

  window.stateActions.setAziende(aziende || []);
  window.stateActions.autoSetAzienda();

  const aziendaCorrente = window.state.azienda;

  // ⛔ SE NON ESISTE AZIENDA
  if (!aziendaCorrente) {
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

  // 🔴 BLOCCO AZIENDA (non blocchiamo la piattaforma)
  if (aziendaCorrente.stato !== "piattaforma") {
    if (aziendaCorrente.attiva === false) {
      app.innerHTML = `
        <div class="login-wrapper">
          <div class="login-card">
            <h3>Azienda disattivata</h3>
            <p>Contatta la piattaforma.</p>
          </div>
        </div>
      `;
      return;
    }

    if (aziendaCorrente.stato === "sospesa") {
      app.innerHTML = `
        <div class="login-wrapper">
          <div class="login-card">
            <h3>Azienda sospesa</h3>
            <p>Accesso temporaneamente bloccato.</p>
          </div>
        </div>
      `;
      return;
    }

    if (aziendaCorrente.data_scadenza) {
      const oggi = new Date();
      const scadenza = new Date(aziendaCorrente.data_scadenza);
      oggi.setHours(0, 0, 0, 0);
      scadenza.setHours(0, 0, 0, 0);

      if (scadenza < oggi) {
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
    }
  }

  // ✅ Render
  const safeRoute = routes[routeName] ? routeName : "home";
  await renderView(safeRoute);
}

window.addEventListener("hashchange", resolve);
resolve();
