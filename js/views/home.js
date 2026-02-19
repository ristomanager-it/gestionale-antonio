// js/views/home.js
// =======================================
// Home – gestione contesto azienda (fix definitivo)
// - Rimosso campo "id" da select utenti_aziende
// - Nessun 400/500
// - Nessun crash se non ci sono associazioni
// =======================================

export async function render(container) {
  const supa = window.supabaseClient;
  const user = window.state?.user;

  if (!supa) {
    container.innerHTML = `<div class="view">Errore: Supabase client non inizializzato</div>`;
    return;
  }

  let currentUser = user;
  if (!currentUser) {
    const { data } = await supa.auth.getUser();
    currentUser = data?.user || null;
    if (!window.state) window.state = {};
    window.state.user = currentUser;
  }

  if (!currentUser) {
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Sessione non valida</h2>
        <p class="small-muted">Fai login per accedere.</p>
        <button class="app-button small" id="go-login">Vai al login</button>
      </div>
    `;
    document.getElementById("go-login").onclick = () => {
      window.location.hash = "#/login";
    };
    return;
  }

  container.innerHTML = `
    <div class="view">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">Dashboard</h2>
          <p class="small-muted" style="margin-top:6px;">
            Seleziona il contesto azienda per iniziare.
          </p>
        </div>
        <button class="app-button small gray" id="btn-logout">Esci</button>
      </div>

      <div id="home-body" style="margin-top:14px;"></div>
    </div>
  `;

  document.getElementById("btn-logout").onclick = async () => {
    await supa.auth.signOut();
    window.state.user = null;
    window.state.azienda = null;
    window.location.hash = "#/login";
  };

  const host = document.getElementById("home-body");

  // 🔥 FIX: rimosso "id" dalla select
  const { data: uaRows, error: uaErr } = await supa
    .from("utenti_aziende")
    .select("azienda_id, ruolo, attivo, email")
    .eq("user_id", currentUser.id)
    .eq("attivo", true);

  if (uaErr) {
    console.error("Errore lettura utenti_aziende:", uaErr);
    host.innerHTML = `
      <div class="view" style="margin-top:0;">
        <h3 style="margin-top:0;">Errore</h3>
        <p class="small-muted">Non riesco a caricare le aziende associate al tuo account.</p>
        <button class="app-button small" id="home-retry">Riprova</button>
      </div>
    `;
    document.getElementById("home-retry").onclick = () => render(container);
    return;
  }

  if (!uaRows || uaRows.length === 0) {
    host.innerHTML = `
      <div class="view" style="margin-top:0;">
        <h3 style="margin-top:0;">Nessuna azienda associata</h3>
        <p class="small-muted">
          Il tuo account è valido ma non è collegato a nessuna azienda.
        </p>
      </div>
    `;
    return;
  }

  const aziendaIds = [...new Set(uaRows.map((r) => r.azienda_id).filter(Boolean))];

  const { data: aziende, error: azErr } = await supa
    .from("aziende")
    .select("id,nome,codice,stato,attiva,data_scadenza")
    .in("id", aziendaIds);

  if (azErr) {
    console.error("Errore lettura aziende:", azErr);
    host.innerHTML = `
      <div class="view" style="margin-top:0;">
        <h3 style="margin-top:0;">Errore</h3>
        <p class="small-muted">Non riesco a caricare i dettagli dell’azienda.</p>
      </div>
    `;
    return;
  }

  const aziendeById = new Map((aziende || []).map((a) => [a.id, a]));
  const options = uaRows
    .map((ua) => {
      const a = aziendeById.get(ua.azienda_id);
      if (!a) return null;
      return { ua, azienda: a };
    })
    .filter(Boolean);

  window.state.azienda = options[0]?.azienda || null;

  host.innerHTML = `
    <div class="view" style="margin-top:0;">
      <h3 style="margin-top:0;">Azienda attiva</h3>

      <select class="input-pill" id="home-azienda-select">
        ${options
          .map(
            (o) =>
              `<option value="${o.azienda.id}">
                ${escapeHtml(o.azienda.nome)}
              </option>`
          )
          .join("")}
      </select>

      <div style="margin-top:12px;">
        <button class="app-button small" id="home-open-dashboard">Apri</button>
      </div>
    </div>
  `;

  document.getElementById("home-open-dashboard").onclick = () => {
    const a = window.state.azienda;
    if (a?.stato === "piattaforma") {
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
