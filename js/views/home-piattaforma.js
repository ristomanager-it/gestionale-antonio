export async function render(container) {

  const user = window.state.user;
  const azienda = window.state.azienda;
  const ruolo = window.state?.viewAs || window.state?.ruolo;

  if (!user) {
    container.innerHTML = `<div class="view">Errore caricamento</div>`;
    return;
  }

  // Carica stats aziende
  const supabase = window.supabaseClient;
  const { count: totaleAziende } = await supabase
    .from("aziende").select("id", { count: "exact", head: true });
  const { count: aziendeTrial } = await supabase
    .from("aziende").select("id", { count: "exact", head: true }).eq("piano", "trial");
  const { count: leadDemo } = await supabase
    .from("demo_leads").select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());

  // Utenti RistoflowBook
  const { count: utentiSocial } = await supabase
    .from("clienti_profilo").select("id", { count: "exact", head: true });
  const { count: utentiSocial7gg } = await supabase
    .from("clienti_profilo").select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
  const { count: postSocial } = await supabase
    .from("social_post").select("id", { count: "exact", head: true })
    .eq("visibile", true);

  container.innerHTML = `
    <div class="view piattaforma">

      <!-- HEADER -->
      <div class="header">
        <div>
          <h2>Ristoflow – Piattaforma</h2>
          <p class="sub">Gestione SaaS e aziende</p>
        </div>
        <div class="header-actions">
          <button id="btn-logout" class="logout">Esci</button>
        </div>
      </div>

      <!-- VIEW SWITCH -->
      <div class="view-switch">
        ${renderRoleButton("admin", ruolo)}
        ${renderRoleButton("manager", ruolo)}
        ${renderRoleButton("operatore", ruolo)}
      </div>

      <!-- AZIENDA ATTIVA -->
      <div class="azienda-attiva">
        <div>
          <div class="label">Azienda attiva</div>
          <div class="title">${azienda?.nome || "Nessuna"}</div>
        </div>
        <button id="btn-switch-azienda" class="switch-btn">Cambia</button>
      </div>

      <!-- KPI BAR GESTIONALE -->
      <div class="kpi-section-label">&#127979; Gestionale</div>
      <div class="kpi-bar">
        <div class="kpi">
          <div class="kpi-val">${totaleAziende || 0}</div>
          <div class="kpi-label">Clienti totali</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#d97706;">${aziendeTrial || 0}</div>
          <div class="kpi-label">In trial</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#059669;">${(totaleAziende || 0) - (aziendeTrial || 0)}</div>
          <div class="kpi-label">Paganti</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#0E5A7A;">${leadDemo || 0}</div>
          <div class="kpi-label">Lead 7gg</div>
        </div>
      </div>

      <!-- KPI BAR SOCIAL -->
      <div class="kpi-section-label">&#127759; RistoflowBook</div>
      <div class="kpi-bar">
        <div class="kpi">
          <div class="kpi-val" style="color:#0E5A7A;">${utentiSocial || 0}</div>
          <div class="kpi-label">Iscritti totali</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#059669;">${utentiSocial7gg || 0}</div>
          <div class="kpi-label">Nuovi 7gg</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#7c3aed;">${postSocial || 0}</div>
          <div class="kpi-label">Post pubblicati</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#f97316;">${utentiSocial ? Math.round((utentiSocial7gg||0)/(utentiSocial||1)*100) : 0}%</div>
          <div class="kpi-label">Crescita sett.</div>
        </div>
      </div>

      <!-- GRID -->
      <div class="grid">

        <div class="card" data-route="creaAzienda">
          <div>
            <div class="label">Provisioning</div>
            <div class="title">Crea Azienda</div>
          </div>
          <div class="icon">➕</div>
        </div>

        <div class="card" data-route="gestioneAziende">
          <div>
            <div class="label">Clienti</div>
            <div class="title">Gestione Aziende</div>
          </div>
          <div class="icon">🏢</div>
        </div>

        <div class="card" data-route="demo-leads">
          <div>
            <div class="label">Acquisizione</div>
            <div class="title">Lead Demo</div>
          </div>
          <div class="icon">🎯</div>
        </div>

        <div class="card" id="card-supporto">
          <div>
            <div class="label">Supporto clienti</div>
            <div class="title">Chat Live</div>
            <div id="tawk-status" style="font-size:11px;color:#6b7280;margin-top:4px;">Caricamento...</div>
          </div>
          <div class="icon">💬</div>
        </div>

        <div class="card" id="card-social-users" onclick="window.location.hash='#/social-utenti'">
          <div>
            <div class="label">RistoflowBook</div>
            <div class="title">Utenti Social</div>
            <div style="font-size:11px;color:#7c3aed;margin-top:4px;font-weight:700;">${utentiSocial || 0} iscritti</div>
          </div>
          <div class="icon">&#127759;</div>
        </div>

        <div class="card dark" id="enter-operativo">
          <div>
            <div class="label">Operatività</div>
            <div class="title">Entra nel gestionale</div>
          </div>
          <div class="icon">🧪</div>
        </div>

      </div>

      <!-- MODALE -->
      <div id="azienda-modal" class="modal hidden">
        <div class="modal-box">
          <div class="modal-header">
            <div>Seleziona Azienda</div>
            <button id="close-modal">✖</button>
          </div>
          <input id="search-azienda" placeholder="Cerca azienda..." class="search" />
          <div id="azienda-list" class="list"></div>
        </div>
      </div>

    </div>

    <style>
      .view-switch { display:flex; gap:8px; margin-bottom:16px; }
      .role-btn { flex:1; padding:10px; border-radius:10px; border:none; cursor:pointer; background:#e5e7eb; }
      .role-btn.active { background:#111827; color:white; }
      .piattaforma { padding:16px; }
      .header { display:flex; justify-content:space-between; margin-bottom:20px; }
      .sub { color:#6b7280; font-size:13px; }

      .kpi-bar {
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:12px;
        margin-bottom:20px;
      }
      .kpi {
        background:white;
        border-radius:12px;
        padding:14px;
        text-align:center;
        border:1px solid #e5e7eb;
      }
      .kpi-val { font-size:24px; font-weight:800; color:#111827; }
      .kpi-label { font-size:11px; color:#6b7280; margin-top:2px; }

      .azienda-attiva { display:flex; justify-content:space-between; background:white; padding:14px; border-radius:12px; margin-bottom:16px; }
      .switch-btn { background:#111827; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; }
      .grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); }
      .card { background:white; padding:20px; border-radius:16px; display:flex; justify-content:space-between; cursor:pointer; border:1px solid #e5e7eb; transition:box-shadow 0.15s; }
      .card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); }
      .card.dark { background:#111827; color:white; border-color:#111827; }
      .card .label { font-size:11px; color:#6b7280; margin-bottom:4px; }
      .card.dark .label { color:#9ca3af; }
      .card .title { font-size:15px; font-weight:700; color:#111827; }
      .card.dark .title { color:white; }
      .card .icon { font-size:28px; }
      .modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
      .hidden { display:none; }
      .modal-box { background:white; width:400px; max-height:80vh; border-radius:14px; padding:16px; overflow:auto; }
      .modal-header { display:flex; justify-content:space-between; margin-bottom:10px; }
      .search { width:100%; padding:10px; border-radius:8px; border:1px solid #ddd; margin-bottom:10px; box-sizing:border-box; }
      .list-item { padding:10px; border-bottom:1px solid #eee; cursor:pointer; }
      .list-item:hover { background:#f3f4f6; }

      .kpi-section-label { font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;margin-top:4px; }
      @media(max-width:600px) {
        .kpi-bar { grid-template-columns:repeat(2,1fr); }
      }
    </style>
  `;

  bindEvents();
  initTawkStatus();
}

// ── TAWK STATUS ───────────────────────────────────────────────────────────────
function initTawkStatus() {
  const el = document.getElementById("tawk-status");
  if (!el) return;

  // Polling ogni 3 secondi per leggere lo stato da Tawk_API
  let attempts = 0;
  const check = setInterval(() => {
    attempts++;
    const api = window.Tawk_API;
    if (api && typeof api.isChatOngoing === "function") {
      const ongoing = api.isChatOngoing();
      el.innerHTML = ongoing
        ? `<span style="color:#059669;">● Chat attiva in corso</span>`
        : `<span style="color:#6b7280;">● Nessuna chat attiva</span>`;
      clearInterval(check);
    } else if (attempts > 20) {
      el.innerHTML = `<span style="color:#9ca3af;">Widget non caricato</span>`;
      clearInterval(check);
    }
  }, 500);

  // Card click → apre dashboard Tawk
  document.getElementById("card-supporto").onclick = () => {
    window.open("https://dashboard.tawk.to", "_blank");
  };
}

// ── ROLE BUTTON ───────────────────────────────────────────────────────────────
function renderRoleButton(role, current) {
  return `<button class="role-btn ${current === role ? "active" : ""}" data-role="${role}">${role.toUpperCase()}</button>`;
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
function bindEvents() {

  document.querySelectorAll(".card[data-route]").forEach(card => {
    card.onclick = () => {
      if (window.router?.go) window.router.go(card.dataset.route);
      else window.location.hash = "#/" + card.dataset.route;
    };
  });

  document.getElementById("btn-logout").onclick = async () => {
    await window.supabaseClient.auth.signOut();
    window.state = {};
    localStorage.removeItem("viewAs");
    window.location.hash = "#/login";
  };

  document.getElementById("enter-operativo").onclick = () => {
    if (window.router?.go) window.router.go("home");
    else window.location.hash = "#/home";
  };

  document.querySelectorAll(".role-btn").forEach(btn => {
    btn.onclick = () => {
      const role = btn.dataset.role;
      window.state.viewAs = role;
      localStorage.setItem("viewAs", role);
      window.state.previewMode = true;
      if (window.menuController?.refresh) window.menuController.refresh();
      if (window.router?.go) window.router.go("home");
      else window.location.hash = "#/home";
    };
  });

  document.getElementById("btn-switch-azienda").onclick = openModal;
  document.getElementById("close-modal").onclick = closeModal;
  document.getElementById("search-azienda").oninput = filterAziende;

  loadAziende();
}

// ── MODAL ────────────────────────────────────────────────────────────────────
function openModal() { document.getElementById("azienda-modal").classList.remove("hidden"); }
function closeModal() { document.getElementById("azienda-modal").classList.add("hidden"); }

// ── AZIENDE ──────────────────────────────────────────────────────────────────
let aziendeCache = [];

async function loadAziende() {
  const { data } = await window.supabaseClient
    .from("utenti_aziende")
    .select("azienda_id, aziende(nome)")
    .eq("user_id", window.state.user.id);
  aziendeCache = data || [];
  renderLista(aziendeCache);
}

function renderLista(list) {
  const container = document.getElementById("azienda-list");
  container.innerHTML = list.map(a => `
    <div class="list-item" data-id="${a.azienda_id}">${a.aziende?.nome || "Senza nome"}</div>
  `).join("");
  container.querySelectorAll(".list-item").forEach(el => {
    el.onclick = () => selectAzienda(el.dataset.id);
  });
}

function filterAziende(e) {
  const q = e.target.value.toLowerCase();
  renderLista(aziendeCache.filter(a => (a.aziende?.nome || "").toLowerCase().includes(q)));
}

function selectAzienda(id) {
  const azienda = aziendeCache.find(a => a.azienda_id === id);
  if (!azienda) return;
  window.state.azienda = { id: azienda.azienda_id, nome: azienda.aziende?.nome };
  localStorage.setItem("azienda_attiva", JSON.stringify(window.state.azienda));
  window.location.reload();
}
