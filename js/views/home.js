// js/views/home.js
// =======================================
// Home – gestione contesto azienda (robusta)
// Fix: evita errori 500 quando non c'è alcuna azienda associata
// - Se non trova associazioni in utenti_aziende -> mostra schermata guidata
// - Non lancia eccezioni / non blocca il routing
// =======================================

export async function render(container) {
  const supa = window.supabaseClient;
  const user = window.state?.user;

  if (!supa) {
    container.innerHTML = `<div class="view">Errore: Supabase client non inizializzato</div>`;
    return;
  }

  // Se non c'è user in state, proviamo a recuperarlo
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
    document.getElementById("go-login").onclick = () => (window.location.hash = "#/login");
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
    if (!window.state) window.state = {};
    window.state.user = null;
    window.state.azienda = null;
    window.location.hash = "#/login";
  };

  const host = document.getElementById("home-body");

  // 1) Carichiamo le associazioni (utenti_aziende) dell'utente
  const { data: uaRows, error: uaErr } = await supa
    .from("utenti_aziende")
    .select("id, azienda_id, ruolo, attivo, email")
    .eq("user_id", currentUser.id)
    .eq("attivo", true);

  if (uaErr) {
    console.error("Errore lettura utenti_aziende:", uaErr);
    host.innerHTML = `
      <div class="view" style="margin-top:0;">
        <h3 style="margin-top:0;">Errore</h3>
        <p class="small-muted">Non riesco a caricare le aziende associate al tuo account.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="app-button small" id="home-retry">Riprova</button>
          <button class="app-button small gray" id="home-go-login">Login</button>
        </div>
      </div>
    `;
    document.getElementById("home-retry").onclick = () => render(container);
    document.getElementById("home-go-login").onclick = () => (window.location.hash = "#/login");
    return;
  }

  // 2) Nessuna azienda associata -> NON errore 500: schermata guidata
  if (!uaRows || uaRows.length === 0) {
    host.innerHTML = `
      <div class="view" style="margin-top:0;">
        <h3 style="margin-top:0;">Nessuna azienda associata</h3>
        <p class="small-muted">
          Il tuo account è valido, ma non risulta collegato ad alcuna azienda.
          Se sei stato invitato, verifica di aver accettato l’invito con la stessa email del tuo account.
        </p>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="app-button small" id="btn-retry-assoc">Ricarica</button>
          <button class="app-button small gray" id="btn-open-select">Seleziona azienda</button>
        </div>

        <div class="small-muted" style="margin-top:10px;">
          Se questo account deve essere amministratore piattaforma/azienda, aggiungi il record in <strong>utenti_aziende</strong>.
        </div>
      </div>
    `;

    document.getElementById("btn-retry-assoc").onclick = () => render(container);
    document.getElementById("btn-open-select").onclick = () => (window.location.hash = "#/select-azienda");
    return;
  }

  // 3) Carichiamo i dettagli delle aziende collegate
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
        <button class="app-button small" id="home-retry-az">Riprova</button>
      </div>
    `;
    document.getElementById("home-retry-az").onclick = () => render(container);
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

  // 4) Auto-set azienda se già presente in state e valida, altrimenti scegli prima disponibile
  if (!window.state) window.state = {};
  const currentAzienda = window.state.azienda;
  let active = null;

  if (currentAzienda?.id && options.some((o) => o.azienda.id === currentAzienda.id)) {
    active = options.find((o) => o.azienda.id === currentAzienda.id) || null;
  } else {
    active = options[0] || null;
    window.state.azienda = active ? active.azienda : null;
  }

  // 5) UI: scelta azienda + azioni
  host.innerHTML = `
    <div class="view" style="margin-top:0;">
      <h3 style="margin-top:0;">Azienda attiva</h3>

      <label class="small-muted" style="display:block; margin-bottom:6px;">
        Seleziona contesto
      </label>

      <select class="input-pill" id="home-azienda-select">
        ${options
          .map((o) => {
            const selected = active && o.azienda.id === active.azienda.id ? "selected" : "";
            const label = `${o.azienda.nome}${o.azienda.codice ? " (" + o.azienda.codice + ")" : ""}`;
            return `<option value="${o.azienda.id}" ${selected}>${escapeHtml(label)}</option>`;
          })
          .join("")}
      </select>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
        <button class="app-button small" id="home-open-dashboard">Apri</button>
        <button class="app-button small gray" id="home-refresh">Ricarica</button>
      </div>

      <div id="home-info" class="small-muted" style="margin-top:10px;"></div>
    </div>
  `;

  const info = document.getElementById("home-info");
  const select = document.getElementById("home-azienda-select");

  function updateInfo() {
    const id = select.value;
    const o = options.find((x) => x.azienda.id === id);
    if (!o) {
      info.textContent = "";
      return;
    }
    info.innerHTML = `
      Ruolo: <strong>${escapeHtml(o.ua.ruolo || "-")}</strong>
      ${o.azienda.stato ? ` • Stato: <strong>${escapeHtml(o.azienda.stato)}</strong>` : ""}
      ${typeof o.azienda.attiva === "boolean" ? ` • Attiva: <strong>${o.azienda.attiva ? "Sì" : "No"}</strong>` : ""}
    `;
  }

  select.onchange = () => {
    const id = select.value;
    const o = options.find((x) => x.azienda.id === id);
    window.state.azienda = o ? o.azienda : null;
    updateInfo();
  };

  updateInfo();

  document.getElementById("home-open-dashboard").onclick = () => {
    // Se hai una home differenziata piattaforma, puoi cambiare route in base a stato
    // Esempio: se azienda.stato === 'piattaforma' -> #/home-piattaforma
    const a = window.state.azienda;
    if (a?.stato === "piattaforma") {
      window.location.hash = "#/home-piattaforma";
    } else {
      window.location.hash = "#/home";
      // Se la tua dashboard manager è un'altra route, cambia qui.
    }
  };

  document.getElementById("home-refresh").onclick = () => render(container);
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
