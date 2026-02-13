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

  // 👤 SET UTENTE
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

  // ⛔ Nessuna azienda associata
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

  // 🔴 Azienda disattivata
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

  // 🔴 Azienda sospesa
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

  // 🔴 Azienda scaduta
  if (aziendaCorrente.data_scadenza) {
    const oggi = new Date();
    const scadenza = new Date(aziendaCorrente.data_scadenza);

    // azzeriamo ore per confronto corretto
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

  // ✅ Tutto ok → renderizza
  await renderView(routes[route] ? route : "home");
}

window.addEventListener("hashchange", resolve);
resolve();
