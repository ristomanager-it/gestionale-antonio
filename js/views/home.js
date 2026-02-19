// js/views/home.js
// =======================================
// Home – stabile e minimale
// Nessuna colonna inesistente
// Nessun crash RLS
// Nessun loop
// =======================================

export async function render(container) {
  const supa = window.supabaseClient;

  if (!supa) {
    container.innerHTML = `<div class="view">Supabase non inizializzato</div>`;
    return;
  }

  // Recupero utente
  let { data } = await supa.auth.getUser();
  const user = data?.user;

  if (!user) {
    container.innerHTML = `
      <div class="view">
        <h2>Sessione non valida</h2>
        <button class="app-button small" id="go-login">Vai al login</button>
      </div>
    `;
    document.getElementById("go-login").onclick = () => {
      window.location.hash = "#/login";
    };
    return;
  }

  // Logout
  container.innerHTML = `
    <div class="view">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="margin:0;">Dashboard</h2>
        <button class="app-button small gray" id="logout">Esci</button>
      </div>
      <div id="home-body" style="margin-top:20px;"></div>
    </div>
  `;

  document.getElementById("logout").onclick = async () => {
    await supa.auth.signOut();
    window.location.hash = "#/login";
  };

  const host = document.getElementById("home-body");

  // 🔥 Query SICURA – nessuna colonna specifica
  const { data: uaRows, error } = await supa
    .from("utenti_aziende")
    .select("*")
    .eq("user_id", user.id)
    .eq("attivo", true);

  if (error) {
    console.error(error);
    host.innerHTML = `
      <div class="view">
        <h3>Errore lettura aziende</h3>
      </div>
    `;
    return;
  }

  if (!uaRows || uaRows.length === 0) {
    host.innerHTML = `
      <div class="view">
        <h3>Nessuna azienda associata</h3>
        <p class="small-muted">
          Questo utente non è collegato a nessuna azienda.
        </p>
      </div>
    `;
    return;
  }

  const aziendaIds = uaRows.map(r => r.azienda_id);

  const { data: aziende, error: azErr } = await supa
    .from("aziende")
    .select("*")
    .in("id", aziendaIds);

  if (azErr) {
    console.error(azErr);
    host.innerHTML = `<div class="view">Errore caricamento aziende</div>`;
    return;
  }

  if (!aziende || aziende.length === 0) {
    host.innerHTML = `<div class="view">Nessuna azienda trovata</div>`;
    return;
  }

  // Imposta prima azienda come attiva
  window.state = window.state || {};
  window.state.azienda = aziende[0];

  host.innerHTML = `
    <div class="view">
      <h3>Azienda attiva</h3>
      <p><strong>${escapeHtml(aziende[0].nome)}</strong></p>
      <button class="app-button small" id="entra">Entra</button>
    </div>
  `;

  document.getElementById("entra").onclick = () => {
    if (aziende[0].stato === "piattaforma") {
      window.location.hash = "#/home-piattaforma";
    } else {
      window.location.hash = "#/home";
    }
  };
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
