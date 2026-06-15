export async function render(container) {
  const supa = window.supabaseClient;

  container.innerHTML = `
    <div class="su-view">
      <div class="su-header">
        <div>
          <div class="su-eyebrow">RistoflowBook</div>
          <h2 class="su-title">Utenti Social</h2>
        </div>
        <div class="su-header-actions">
          <button class="su-btn-export" id="btn-export-csv">&#11015; Esporta CSV</button>
        </div>
      </div>

      <!-- FILTRI -->
      <div class="su-filtri">
        <input class="su-search" id="su-search" placeholder="&#128269; Cerca per nome, email, città..."/>
        <select class="su-select" id="su-filtro-livello">
          <option value="">Tutti i livelli</option>
          <option value="bronzo">&#129355; Bronzo</option>
          <option value="argento">&#129354; Argento</option>
          <option value="oro">&#129353; Oro</option>
          <option value="platinum">&#128142; Platinum</option>
        </select>
        <select class="su-select" id="su-filtro-periodo">
          <option value="">Tutti i periodi</option>
          <option value="7">Ultimi 7 giorni</option>
          <option value="30">Ultimi 30 giorni</option>
          <option value="90">Ultimi 90 giorni</option>
        </select>
        <select class="su-select" id="su-filtro-ruolo">
          <option value="">Tutti i ruoli</option>
          <option value="cliente">Cliente</option>
          <option value="chef">Chef</option>
          <option value="titolare">Titolare</option>
          <option value="fornitore">Fornitore</option>
        </select>
      </div>

      <!-- KPI STRIP -->
      <div class="su-kpi-strip" id="su-kpi-strip">
        <div class="su-kpi"><div class="su-kpi-val" id="kpi-tot">—</div><div class="su-kpi-label">Iscritti totali</div></div>
        <div class="su-kpi"><div class="su-kpi-val su-green" id="kpi-7gg">—</div><div class="su-kpi-label">Nuovi 7gg</div></div>
        <div class="su-kpi"><div class="su-kpi-val su-blue" id="kpi-post">—</div><div class="su-kpi-label">Post pubblicati</div></div>
        <div class="su-kpi"><div class="su-kpi-val su-orange" id="kpi-punti">—</div><div class="su-kpi-label">Punti medi</div></div>
      </div>

      <!-- TABELLA -->
      <div class="su-table-wrap">
        <table class="su-table">
          <thead>
            <tr>
              <th>Utente</th>
              <th>Email</th>
              <th>Città</th>
              <th>Ruolo</th>
              <th>Livello</th>
              <th class="su-right">Punti</th>
              <th class="su-right">Post</th>
              <th>Iscritto</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="su-tbody">
            <tr><td colspan="9" class="su-loading"><div class="su-spinner"></div> Caricamento...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="su-pagination" id="su-pagination"></div>
    </div>

    <style>
      .su-view{padding:20px;max-width:1200px;margin:0 auto;}
      .su-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
      .su-eyebrow{font-size:11px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}
      .su-title{font-size:24px;font-weight:900;color:#111827;margin:0;}
      .su-btn-export{background:#111827;color:#fff;border:none;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;}
      .su-btn-export:hover{background:#1f2937;}
      .su-filtri{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
      .su-search{flex:1;min-width:200px;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;outline:none;background:#f9fafb;}
      .su-search:focus{border-color:#0E5A7A;background:#fff;}
      .su-select{padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:inherit;outline:none;background:#f9fafb;cursor:pointer;}
      .su-select:focus{border-color:#0E5A7A;}
      .su-kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
      .su-kpi{background:#fff;border-radius:12px;padding:16px;border:1px solid #e5e7eb;text-align:center;}
      .su-kpi-val{font-size:28px;font-weight:900;color:#111827;line-height:1;}
      .su-kpi-label{font-size:11px;color:#6b7280;margin-top:4px;font-weight:600;}
      .su-green{color:#059669!important;}
      .su-blue{color:#0E5A7A!important;}
      .su-orange{color:#f97316!important;}
      .su-table-wrap{background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;overflow-x:auto;}
      .su-table{width:100%;border-collapse:collapse;font-size:13px;}
      .su-table thead tr{background:#f9fafb;border-bottom:2px solid #e5e7eb;}
      .su-table th{padding:12px 16px;text-align:left;font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;}
      .su-table td{padding:12px 16px;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
      .su-table tbody tr:last-child td{border-bottom:none;}
      .su-table tbody tr:hover{background:#f9fafb;}
      .su-right{text-align:right!important;}
      .su-td-right{text-align:right;}
      .su-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#e8f4f8,#1a8fb5);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#0E5A7A;flex-shrink:0;overflow:hidden;}
      .su-avatar img{width:100%;height:100%;object-fit:cover;}
      .su-user-cell{display:flex;align-items:center;gap:10px;}
      .su-user-nome{font-weight:700;color:#111827;font-size:13px;}
      .su-badge-livello{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;}
      .su-badge-livello.bronzo{background:#fef3c7;color:#92400e;}
      .su-badge-livello.argento{background:#f1f5f9;color:#475569;}
      .su-badge-livello.oro{background:#fefce8;color:#854d0e;}
      .su-badge-livello.platinum{background:#f5f3ff;color:#6d28d9;}
      .su-badge-ruolo{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#f3f4f6;color:#374151;}
      .su-loading{text-align:center;padding:40px;color:#9ca3af;font-size:14px;}
      .su-spinner{display:inline-block;width:20px;height:20px;border:2px solid #e5e7eb;border-top-color:#0E5A7A;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:8px;}
      @keyframes spin{to{transform:rotate(360deg);}}
      .su-empty{text-align:center;padding:48px;color:#9ca3af;}
      .su-empty-icon{font-size:40px;margin-bottom:8px;}
      .su-pagination{display:flex;gap:8px;justify-content:center;padding:16px 0;flex-wrap:wrap;}
      .su-page-btn{padding:8px 14px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;font-size:13px;font-weight:700;cursor:pointer;color:#374151;}
      .su-page-btn.active{background:#0E5A7A;color:#fff;border-color:#0E5A7A;}
      .su-page-btn:hover:not(.active){background:#f9fafb;}
      .su-action-btn{padding:6px 12px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;font-size:12px;font-weight:700;cursor:pointer;color:#374151;white-space:nowrap;}
      .su-action-btn:hover{background:#f3f4f6;}
      @media(max-width:768px){
        .su-kpi-strip{grid-template-columns:repeat(2,1fr);}
        .su-filtri{flex-direction:column;}
        .su-select,.su-search{width:100%;}
        .su-table th:nth-child(3),.su-table td:nth-child(3),
        .su-table th:nth-child(7),.su-table td:nth-child(7){display:none;}
      }
    </style>
  `;

  let allUtenti = [];
  let paginaCorrente = 1;
  const PER_PAGINA = 25;

  // ── CARICA KPI ────────────────────────────────────────────────────────────────
  async function caricaKpi() {
    const [
      { count: tot },
      { count: nuovi7 },
      { count: post },
      { data: puntiData }
    ] = await Promise.all([
      supa.from("clienti_profilo").select("id", { count: "exact", head: true }),
      supa.from("clienti_profilo").select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      supa.from("social_post").select("id", { count: "exact", head: true }).eq("visibile", true),
      supa.from("clienti_profilo").select("punti_totali,punti_social")
    ]);

    document.getElementById("kpi-tot").textContent = (tot || 0).toLocaleString("it-IT");
    document.getElementById("kpi-7gg").textContent = "+" + (nuovi7 || 0);
    document.getElementById("kpi-post").textContent = (post || 0).toLocaleString("it-IT");

    if (puntiData && puntiData.length > 0) {
      const media = Math.round(
        puntiData.reduce((s, r) => s + ((r.punti_totali || 0) + (r.punti_social || 0)), 0) / puntiData.length
      );
      document.getElementById("kpi-punti").textContent = media.toLocaleString("it-IT");
    } else {
      document.getElementById("kpi-punti").textContent = "0";
    }
  }

  // ── CARICA UTENTI ─────────────────────────────────────────────────────────────
  async function caricaUtenti() {
    const tbody = document.getElementById("su-tbody");
    tbody.innerHTML = `<tr><td colspan="9" class="su-loading"><div class="su-spinner"></div> Caricamento...</td></tr>`;

    const { data, error } = await supa
      .from("clienti_profilo")
      .select("user_id,nome_completo,email,citta,tipo_utente,punti_totali,punti_social,storie_pubblicate,avatar_url,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) {
      tbody.innerHTML = `<tr><td colspan="9" class="su-empty"><div class="su-empty-icon">⚠️</div>Errore caricamento</td></tr>`;
      return;
    }

    allUtenti = data;
    renderTabella();
  }

  // ── LIVELLO ───────────────────────────────────────────────────────────────────
  function getLivello(punti) {
    if (punti >= 10000) return { label: "Platinum", icon: "💎", cls: "platinum" };
    if (punti >= 5000) return { label: "Oro", icon: "🥇", cls: "oro" };
    if (punti >= 2000) return { label: "Argento", icon: "🥈", cls: "argento" };
    return { label: "Bronzo", icon: "🥉", cls: "bronzo" };
  }

  // ── FILTRA ────────────────────────────────────────────────────────────────────
  function getFiltered() {
    const q = document.getElementById("su-search").value.toLowerCase().trim();
    const livFiltro = document.getElementById("su-filtro-livello").value.toLowerCase();
    const periodoFiltro = parseInt(document.getElementById("su-filtro-periodo").value) || 0;
    const ruoloFiltro = document.getElementById("su-filtro-ruolo").value;

    return allUtenti.filter(u => {
      const punti = (u.punti_totali || 0) + (u.punti_social || 0);
      const lv = getLivello(punti);

      if (q && !(
        (u.nome_completo || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.citta || "").toLowerCase().includes(q)
      )) return false;

      if (livFiltro && lv.cls !== livFiltro) return false;
      if (ruoloFiltro && (u.tipo_utente || "cliente") !== ruoloFiltro) return false;
      if (periodoFiltro) {
        const cutoff = new Date(Date.now() - periodoFiltro * 86400000);
        if (new Date(u.created_at) < cutoff) return false;
      }
      return true;
    });
  }

  // ── RENDER TABELLA ────────────────────────────────────────────────────────────
  function renderTabella() {
    const filtered = getFiltered();
    const tbody = document.getElementById("su-tbody");
    const totPagine = Math.ceil(filtered.length / PER_PAGINA);
    paginaCorrente = Math.min(paginaCorrente, totPagine || 1);
    const slice = filtered.slice((paginaCorrente - 1) * PER_PAGINA, paginaCorrente * PER_PAGINA);

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="su-empty"><div class="su-empty-icon">🔍</div>Nessun utente trovato</td></tr>`;
      document.getElementById("su-pagination").innerHTML = "";
      return;
    }

    tbody.innerHTML = slice.map(u => {
      const punti = (u.punti_totali || 0) + (u.punti_social || 0);
      const lv = getLivello(punti);
      const nome = u.nome_completo || "—";
      const av = u.avatar_url
        ? `<img src="${u.avatar_url}" />`
        : `<span>${nome.charAt(0).toUpperCase()}</span>`;
      const ruolo = u.tipo_utente || "cliente";
      const dataIsc = u.created_at ? new Date(u.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
      const post = u.storie_pubblicate || 0;

      return `<tr>
        <td>
          <div class="su-user-cell">
            <div class="su-avatar">${av}</div>
            <div class="su-user-nome">${esc(nome)}</div>
          </div>
        </td>
        <td style="color:#6b7280;">${esc(u.email || "—")}</td>
        <td style="color:#6b7280;">${esc(u.citta && u.citta.trim() ? u.citta : "—")}</td>
        <td><span class="su-badge-ruolo">${esc(ruolo)}</span></td>
        <td><span class="su-badge-livello ${lv.cls}">${lv.icon} ${lv.label}</span></td>
        <td class="su-td-right" style="font-weight:800;color:#0E5A7A;">${punti.toLocaleString("it-IT")}</td>
        <td class="su-td-right" style="color:#7c3aed;font-weight:700;">${post}</td>
        <td style="color:#9ca3af;font-size:12px;">${dataIsc}</td>
        <td>
          <button class="su-action-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${esc(u.email||"")}').then(()=>this.textContent='✓').catch(()=>{})">
            Copia email
          </button>
        </td>
      </tr>`;
    }).join("");

    // Paginazione
    const pag = document.getElementById("su-pagination");
    if (totPagine <= 1) { pag.innerHTML = ""; return; }
    pag.innerHTML = Array.from({ length: totPagine }, (_, i) => i + 1).map(n =>
      `<button class="su-page-btn ${n === paginaCorrente ? "active" : ""}" onclick="window._suGoPage(${n})">${n}</button>`
    ).join("");
  }

  window._suGoPage = function(n) { paginaCorrente = n; renderTabella(); };

  // ── EXPORT CSV ────────────────────────────────────────────────────────────────
  function esportaCsv() {
    const filtered = getFiltered();
    const header = ["Nome", "Email", "Città", "Ruolo", "Livello", "Punti", "Post", "Iscritto"];
    const rows = filtered.map(u => {
      const punti = (u.punti_totali || 0) + (u.punti_social || 0);
      const lv = getLivello(punti);
      return [
        u.nome_completo || "",
        u.email || "",
        (u.citta || "").trim(),
        u.tipo_utente || "cliente",
        lv.label,
        punti,
        u.storie_pubblicate || 0,
        u.created_at ? new Date(u.created_at).toLocaleDateString("it-IT") : ""
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ristoflowbook-utenti-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── HELPER ───────────────────────────────────────────────────────────────────
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ── EVENTS ────────────────────────────────────────────────────────────────────
  document.getElementById("su-search").addEventListener("input", () => { paginaCorrente = 1; renderTabella(); });
  document.getElementById("su-filtro-livello").addEventListener("change", () => { paginaCorrente = 1; renderTabella(); });
  document.getElementById("su-filtro-periodo").addEventListener("change", () => { paginaCorrente = 1; renderTabella(); });
  document.getElementById("su-filtro-ruolo").addEventListener("change", () => { paginaCorrente = 1; renderTabella(); });
  document.getElementById("btn-export-csv").addEventListener("click", esportaCsv);

  // ── INIT ─────────────────────────────────────────────────────────────────────
  await Promise.all([caricaKpi(), caricaUtenti()]);
}
