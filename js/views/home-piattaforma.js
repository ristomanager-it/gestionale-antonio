import { supabase } from "../supabaseClient.js";

export async function render(container) {

  const user = window.state.user;
  const azienda = window.state.azienda;
  const ruolo = window.state?.viewAs || window.state?.ruolo;

  if (!user) {
    container.innerHTML = `<div class="view">Errore caricamento</div>`;
    return;
  }

  // MRR e abbonamenti
  const { data: abbonamenti } = await supabase
    .from("abbonamenti")
    .select("stato, intervallo, importo_pagato, piano_id, piani_abbonamento(nome,icona,colore)")
    .eq("stato", "attivo");

  const mrr = (abbonamenti||[]).reduce((s, a) => {
    const imp = Number(a.importo_pagato || 0);
    return s + (a.intervallo === 'annuale' ? imp/12 : a.intervallo === 'lifetime' ? 0 : imp);
  }, 0);
  const arr = mrr * 12;

  // Clienti per piano
  const perPiano = {};
  (abbonamenti||[]).forEach(a => {
    const nome = a.piani_abbonamento?.nome || 'Senza piano';
    const icona = a.piani_abbonamento?.icona || '📋';
    if (!perPiano[nome]) perPiano[nome] = { count:0, icona };
    perPiano[nome].count++;
  });

  const { count: totaleAziende } = await supabase
    .from("aziende").select("id", { count: "exact", head: true }).neq("stato","piattaforma");
  const { count: aziendeTrial } = await supabase
    .from("aziende").select("id", { count: "exact", head: true }).eq("piano", "trial");
  const { count: leadDemo } = await supabase
    .from("demo_leads").select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).catch(()=>({count:0}));

  // Utenti RistoflowBook — tutte le fonti
  const [
    { count: utentiSocial },
    { count: utentiSocial7gg },
    { count: postSocial },
    { count: utentiDipendenti },
    { count: utentiFidelity },
    { data: utentiList }
  ] = await Promise.all([
    supabase.from("clienti_profilo").select("id", { count: "exact", head: true }),
    supabase.from("clienti_profilo").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from("social_post").select("id", { count: "exact", head: true }).eq("visibile", true),
    supabase.from("dipendenti").select("id", { count: "exact", head: true }),
    supabase.from("clienti_profilo").select("id", { count: "exact", head: true }).eq("tipo_utente", "fidelity"),
    supabase.from("clienti_profilo")
      .select("nome_completo,email,citta,tipo_utente,punti_totali,punti_social,created_at,avatar_url")
      .order("created_at", { ascending: false })
      .limit(200)
  ]);

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

      <!-- KPI MRR -->
      <div class="kpi-section-label">💶 Revenue</div>
      <div class="kpi-bar" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
        <div class="kpi">
          <div class="kpi-val" style="color:#059669;">€${Math.round(mrr).toLocaleString('it-IT')}</div>
          <div class="kpi-label">MRR</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#0E5A7A;">€${Math.round(arr).toLocaleString('it-IT')}</div>
          <div class="kpi-label">ARR</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#7c3aed;">${(abbonamenti||[]).length}</div>
          <div class="kpi-label">Abbonati attivi</div>
        </div>
        ${Object.entries(perPiano).map(([nome,v])=>`
          <div class="kpi">
            <div class="kpi-val" style="font-size:18px;">${v.count}</div>
            <div class="kpi-label">${v.icona} ${nome}</div>
          </div>
        `).join('')}
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
      <div class="kpi-section-label">&#127759; RistoflowBook — Contatti</div>
      <div class="kpi-bar" style="grid-template-columns:repeat(4,1fr)">
        <div class="kpi" style="cursor:pointer" onclick="filtraContatti('tutti')">
          <div class="kpi-val" style="color:#0E5A7A;">${utentiSocial || 0}</div>
          <div class="kpi-label">Iscritti social</div>
        </div>
        <div class="kpi" style="cursor:pointer" onclick="filtraContatti('nuovi')">
          <div class="kpi-val" style="color:#059669;">+${utentiSocial7gg || 0}</div>
          <div class="kpi-label">Nuovi 7gg</div>
        </div>
        <div class="kpi" style="cursor:pointer" onclick="filtraContatti('fidelity')">
          <div class="kpi-val" style="color:#d97706;">${utentiFidelity || 0}</div>
          <div class="kpi-label">Fidelity</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#7c3aed;">${postSocial || 0}</div>
          <div class="kpi-label">Post</div>
        </div>
      </div>

      <!-- CONTATTI INLINE -->
      <div class="contatti-section">
        <div class="contatti-header">
          <div style="font-size:15px;font-weight:800;color:#111827">Contatti RistoflowBook</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input id="contatti-search" placeholder="&#128269; Cerca..." class="contatti-search" oninput="filtraContatti()"/>
            <select id="contatti-filtro-tipo" class="contatti-select" onchange="filtraContatti()">
              <option value="">Tutti</option>
              <option value="cliente">Clienti</option>
              <option value="chef">Chef</option>
              <option value="titolare">Titolari</option>
              <option value="fidelity">Fidelity</option>
              <option value="fornitore">Fornitori</option>
            </select>
            <button class="contatti-export-btn" onclick="esportaContatti()">&#11015; CSV</button>
          </div>
        </div>
        <div id="contatti-list"></div>
        <div id="contatti-more" style="text-align:center;padding:12px;display:none">
          <button class="contatti-more-btn" onclick="mostraAltri()">Carica altri</button>
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
      .contatti-section { background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:20px; }
      .contatti-header { display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #f3f4f6;flex-wrap:wrap;gap:10px; }
      .contatti-search { padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;outline:none;width:180px; }
      .contatti-search:focus { border-color:#0E5A7A; }
      .contatti-select { padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;outline:none;cursor:pointer; }
      .contatti-export-btn { padding:8px 14px;background:#111827;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer; }
      .contatto-row { display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #f9fafb;transition:background .1s; }
      .contatto-row:hover { background:#f9fafb; }
      .contatto-av { width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#e8f4f8,#1a8fb5);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#0E5A7A;flex-shrink:0;overflow:hidden; }
      .contatto-av img { width:100%;height:100%;object-fit:cover; }
      .contatto-info { flex:1;min-width:0; }
      .contatto-nome { font-size:14px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .contatto-sub { font-size:12px;color:#6b7280;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .contatto-badge { font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;flex-shrink:0; }
      .contatto-badge.cliente { background:#e8f4f8;color:#0E5A7A; }
      .contatto-badge.chef { background:#fef3c7;color:#d97706; }
      .contatto-badge.titolare { background:#dcfce7;color:#16a34a; }
      .contatto-badge.fidelity { background:#f5f3ff;color:#7c3aed; }
      .contatto-badge.fornitore { background:#f3f4f6;color:#374151; }
      .contatto-punti { font-size:12px;font-weight:800;color:#0E5A7A;flex-shrink:0; }
      .contatto-data { font-size:11px;color:#9ca3af;flex-shrink:0; }
      .contatti-more-btn { padding:8px 20px;border:1.5px solid #e5e7eb;border-radius:8px;background:#fff;font-size:13px;font-weight:700;cursor:pointer;color:#374151; }
      .contatti-empty { text-align:center;padding:32px;color:#9ca3af;font-size:14px; }
      @media(max-width:600px) {
        .kpi-bar { grid-template-columns:repeat(2,1fr); }
        .contatti-search { width:120px; }
        .contatto-data,.contatto-punti { display:none; }
      }
    </style>
  `;

  bindEvents();
  initTawkStatus();
  window.initContatti(utentiList || []);
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
    await supabase.auth.signOut();
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
  const { data } = await supabase
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

// ── CONTATTI RISTOFLOWBOOK ────────────────────────────────────────────────────
let _contatti = [];
let _contattiShown = 30;

function getLivello(punti) {
  if (punti >= 10000) return "💎";
  if (punti >= 5000) return "🥇";
  if (punti >= 2000) return "🥈";
  return "🥉";
}

window.initContatti = function(lista) {
  _contatti = lista || [];
  filtraContatti();
};

window.filtraContatti = function(preset) {
  const search = (document.getElementById("contatti-search")?.value || "").toLowerCase().trim();
  const tipo = document.getElementById("contatti-filtro-tipo")?.value || "";

  let filtered = _contatti.filter(u => {
    if (tipo && (u.tipo_utente || "cliente") !== tipo) return false;
    if (preset === "fidelity" && (u.tipo_utente || "") !== "fidelity") return false;
    if (preset === "nuovi") {
      const cutoff = new Date(Date.now() - 7 * 86400000);
      if (new Date(u.created_at) < cutoff) return false;
    }
    if (search && !(
      (u.nome_completo || "").toLowerCase().includes(search) ||
      (u.email || "").toLowerCase().includes(search) ||
      (u.citta || "").toLowerCase().includes(search)
    )) return false;
    return true;
  });

  _contattiShown = 30;
  renderContatti(filtered);
};

function renderContatti(filtered) {
  const el = document.getElementById("contatti-list");
  const more = document.getElementById("contatti-more");
  if (!el) return;

  const slice = filtered.slice(0, _contattiShown);

  if (slice.length === 0) {
    el.innerHTML = `<div class="contatti-empty">Nessun contatto trovato</div>`;
    if (more) more.style.display = "none";
    return;
  }

  el.innerHTML = slice.map(u => {
    const nome = u.nome_completo || "—";
    const tipo = u.tipo_utente || "cliente";
    const punti = (u.punti_totali || 0) + (u.punti_social || 0);
    const lv = getLivello(punti);
    const av = u.avatar_url
      ? `<img src="${u.avatar_url}" />`
      : `<span>${nome.charAt(0).toUpperCase()}</span>`;
    const data = u.created_at
      ? new Date(u.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" })
      : "";
    const sub = [u.email, u.citta && u.citta.trim() ? u.citta : null].filter(Boolean).join(" · ");

    return `<div class="contatto-row">
      <div class="contatto-av">${av}</div>
      <div class="contatto-info">
        <div class="contatto-nome">${escHP(nome)}</div>
        <div class="contatto-sub">${escHP(sub)}</div>
      </div>
      <span class="contatto-badge ${tipo}">${tipo}</span>
      <div class="contatto-punti">${lv} ${punti > 0 ? punti.toLocaleString("it-IT") + " pt" : ""}</div>
      <div class="contatto-data">${data}</div>
    </div>`;
  }).join("");

  if (more) more.style.display = filtered.length > _contattiShown ? "block" : "none";
  // salva filtered per "mostra altri"
  el.dataset.filtered = JSON.stringify(filtered.map((u, i) => i));
  window._contattiFiltered = filtered;
}

window.mostraAltri = function() {
  _contattiShown += 30;
  if (window._contattiFiltered) renderContatti(window._contattiFiltered);
};

window.esportaContatti = function() {
  const lista = window._contattiFiltered || _contatti;
  const header = ["Nome", "Email", "Città", "Tipo", "Punti", "Iscritto"];
  const rows = lista.map(u => [
    u.nome_completo || "",
    u.email || "",
    (u.citta || "").trim(),
    u.tipo_utente || "cliente",
    (u.punti_totali || 0) + (u.punti_social || 0),
    u.created_at ? new Date(u.created_at).toLocaleDateString("it-IT") : ""
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `contatti-rfbook-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

function escHP(v) {
  return String(v == null ? "" : v)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
