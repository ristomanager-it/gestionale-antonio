// js/views/bo/bo-fidelity.js
const supa = () => window.supabaseClient || window.supabase;
const BASE_URL = "https://app.ristoflow-ai.com";

export async function render(container) {
  const azienda_id = window.state?.azienda?.id;
  const sede_id    = window.state?.sedeAttiva?.id || null;
  const ruolo      = window.state?.ruolo;

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Accesso negato</div>`;
    return;
  }

  let cfg = null;
  let clienti = [];
  let offerte = [];
  let tabAttiva = "dashboard";

  container.innerHTML = `
  <style>
    .fi-input{width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;}
    .fi-input:focus{border-color:#0E5A7A;}
    .fi-label{font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em;}
    .fi-btn{border:none;border-radius:10px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;}
    .fi-btn-primary{background:#0E5A7A;color:#fff;}
    .fi-btn-sec{background:#f1f5f9;color:#374151;}
    .fi-btn-danger{background:#fee2e2;color:#dc2626;}
    .fi-card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:16px;margin-bottom:16px;}
    .fi-stat-card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:20px;text-align:center;}
    .fi-stat-num{font-size:32px;font-weight:800;color:#0E5A7A;}
    .fi-stat-label{font-size:12px;color:#64748b;font-weight:600;margin-top:4px;}
    .fi-table{width:100%;border-collapse:collapse;font-size:13px;}
    .fi-table th{text-align:left;padding:10px 12px;background:#f8fafc;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;}
    .fi-table td{padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
    .fi-table tr:hover td{background:#fafafa;}
    .fi-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;}
    .livello-bronzo{background:#fef3c7;color:#92400e;}
    .livello-argento{background:#f1f5f9;color:#374151;}
    .livello-oro{background:#fef9c3;color:#713f12;}
    .tab-btn{padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap;}
    .tab-btn.active{color:#0E5A7A;border-bottom-color:#0E5A7A;font-weight:800;}
    .offerta-badge{display:inline-block;background:#0E5A7A;color:#fff;border-radius:10px;padding:6px 10px;font-size:13px;font-weight:800;min-width:52px;text-align:center;}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:none;align-items:center;justify-content:center;}
    .modal-overlay.open{display:flex;}
    .modal-box{background:#fff;border-radius:20px;padding:24px;width:min(520px,95vw);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);}
    .qr-tessera{width:120px;height:120px;border-radius:12px;border:2px solid #e5e7eb;}
  </style>

  <div style="min-height:100vh;background:#f8fafc;">

    <!-- TOPBAR -->
    <div style="background:#0E5A7A;padding:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <button id="btn-back" class="fi-btn" style="background:rgba(255,255,255,.15);color:#fff;border:none;">← Indietro</button>
      <div style="font-size:17px;font-weight:800;color:#fff;flex:1;">🎁 Fidelity & Network</div>
      <button id="btn-nuova-tessera" class="fi-btn fi-btn-primary" style="background:#fff;color:#0E5A7A;">+ Emetti tessera</button>
    </div>

    <!-- TABS -->
    <div style="background:#fff;border-bottom:1px solid #e5e7eb;padding:0 20px;display:flex;gap:4px;overflow-x:auto;">
      <button class="tab-btn active" data-tab="dashboard">📊 Dashboard</button>
      <button class="tab-btn" data-tab="clienti">👥 Clienti</button>
      <button class="tab-btn" data-tab="configurazione">⚙️ Regole punti</button>
      <button class="tab-btn" data-tab="network">🌐 Network</button>
    </div>

    <!-- CONTENUTO -->
    <div id="tab-content" style="padding:20px;max-width:1100px;margin:0 auto;"></div>

  </div>

  <!-- MODAL EMETTI TESSERA -->
  <div id="modal-tessera" class="modal-overlay">
    <div class="modal-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:17px;font-weight:800;">🎁 Emetti tessera fidelity</div>
        <button id="chiudi-modal-tessera" class="fi-btn fi-btn-sec" style="width:36px;height:36px;padding:0;">✕</button>
      </div>

      <div style="background:linear-gradient(135deg,#059669,#10b981);border-radius:14px;padding:14px;margin-bottom:16px;color:#fff;text-align:center;">
        <div style="font-size:20px;font-weight:800;" id="modal-sconto-label">-10% SUBITO</div>
        <div style="font-size:12px;opacity:.9;">Sconto applicato al conto attuale</div>
      </div>

      <div style="margin-bottom:12px;">
        <label class="fi-label">Telefono * (cerca cliente esistente)</label>
        <div style="display:flex;gap:8px;">
          <input id="em-telefono" class="fi-input" type="tel" placeholder="Es. 3391234567" style="flex:1;">
          <button id="btn-cerca-cliente" class="fi-btn fi-btn-sec">🔍 Cerca</button>
        </div>
        <div id="em-cliente-trovato" style="margin-top:8px;display:none;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:10px;font-size:13px;"></div>
      </div>

      <div id="em-form-nuovo" style="display:none;">
        <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:10px;text-transform:uppercase;">Nuovo cliente</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div><label class="fi-label">Nome *</label><input id="em-nome" class="fi-input" placeholder="Mario"></div>
          <div><label class="fi-label">Cognome</label><input id="em-cognome" class="fi-input" placeholder="Rossi"></div>
        </div>
        <div style="margin-bottom:8px;"><label class="fi-label">Email</label><input id="em-email" class="fi-input" type="email" placeholder="mario@email.it"></div>
        <div style="margin-bottom:12px;"><label class="fi-label">Data di nascita</label><input id="em-nascita" class="fi-input" type="date"></div>
      </div>

      <div style="margin-bottom:16px;">
        <label class="fi-label">Importo conto (€)</label>
        <input id="em-importo" class="fi-input" type="number" step="0.01" min="0" placeholder="0.00">
        <div id="em-calcolo" style="margin-top:8px;font-size:13px;color:#64748b;"></div>
      </div>

      <button id="btn-emetti" class="fi-btn fi-btn-primary" style="width:100%;padding:14px;font-size:15px;">✅ Emetti tessera e applica sconto</button>
      <div id="em-msg" style="margin-top:10px;font-size:13px;text-align:center;"></div>
    </div>
  </div>

  <!-- MODAL DETTAGLIO CLIENTE -->
  <div id="modal-cliente" class="modal-overlay">
    <div class="modal-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:17px;font-weight:800;" id="modal-cliente-title">Cliente</div>
        <button id="chiudi-modal-cliente" class="fi-btn fi-btn-sec" style="width:36px;height:36px;padding:0;">✕</button>
      </div>
      <div id="modal-cliente-body"></div>
    </div>
  </div>

  <!-- MODAL OFFERTA NETWORK -->
  <div id="modal-offerta" class="modal-overlay">
    <div class="modal-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:17px;font-weight:800;" id="modal-offerta-title">Nuova offerta network</div>
        <button id="chiudi-modal-offerta" class="fi-btn fi-btn-sec" style="width:36px;height:36px;padding:0;">✕</button>
      </div>
      <div id="modal-offerta-body"></div>
    </div>
  </div>
  `;

  // ── BIND FISSI ────────────────────────────────────────────────
  const qs = s => container.querySelector(s);

  qs("#btn-back").onclick = () => window.location.hash = "#/home";
  qs("#btn-nuova-tessera").onclick = aprireModalTessera;
  qs("#chiudi-modal-tessera").onclick = () => qs("#modal-tessera").classList.remove("open");
  qs("#chiudi-modal-cliente").onclick = () => qs("#modal-cliente").classList.remove("open");
  qs("#chiudi-modal-offerta").onclick = () => qs("#modal-offerta").classList.remove("open");

  [qs("#modal-tessera"), qs("#modal-cliente"), qs("#modal-offerta")].forEach(m => {
    m.onclick = e => { if (e.target === e.currentTarget) m.classList.remove("open"); };
  });

  // TABS
  container.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tabAttiva = btn.dataset.tab;
      renderTab();
    };
  });

  // Cerca cliente nel modal
  qs("#btn-cerca-cliente").onclick = cercaClienteModal;
  qs("#em-telefono").addEventListener("keydown", e => { if (e.key === "Enter") cercaClienteModal(); });
  qs("#em-importo").oninput = aggiornaCalcoloModal;
  qs("#btn-emetti").onclick = emettiTessera;

  // ── INIT ─────────────────────────────────────────────────────
  await loadCfg();
  await loadClienti();
  await loadOfferte();
  renderTab();

  // ── LOAD ─────────────────────────────────────────────────────
  async function loadCfg() {
    const { data } = await supa().from("fidelity_config")
      .select("*").eq("azienda_id", azienda_id).maybeSingle();
    cfg = data || {
      punti_per_euro: 1, sconto_benvenuto_perc: 10,
      bonus_benvenuto_punti: 50, bonus_compleanno_punti: 100,
      soglia_argento: 500, soglia_oro: 1500,
      moltiplicatore_argento: 1.5, moltiplicatore_oro: 2,
      network_attivo: false
    };
  }

  async function loadClienti() {
    const { data } = await supa()
      .from("fidelity_tessere")
      .select("*, fidelity_clienti(*)")
      .eq("azienda_id", azienda_id)
      .order("created_at", { ascending: false });
    clienti = data || [];
  }

  async function loadOfferte() {
    const { data } = await supa()
      .from("network_offerte")
      .select("*")
      .eq("azienda_id", azienda_id)
      .order("created_at", { ascending: false });
    offerte = data || [];
  }

  // ── RENDER TAB ────────────────────────────────────────────────
  function renderTab() {
    const box = qs("#tab-content");
    switch (tabAttiva) {
      case "dashboard":     renderDashboard(box); break;
      case "clienti":       renderClienti(box); break;
      case "configurazione":renderConfigurazione(box); break;
      case "network":       renderNetwork(box); break;
    }
  }

  // ── DASHBOARD ─────────────────────────────────────────────────
  function renderDashboard(box) {
    const totClienti = clienti.length;
    const totPunti = clienti.reduce((s, t) => s + (t.punti_locali || 0), 0);
    const oro = clienti.filter(t => t.livello === "oro").length;
    const argento = clienti.filter(t => t.livello === "argento").length;
    const nuoviMese = clienti.filter(t => {
      const d = new Date(t.created_at);
      const ora = new Date();
      return d.getMonth() === ora.getMonth() && d.getFullYear() === ora.getFullYear();
    }).length;

    const linkQR = `${BASE_URL}/fidelity.html?a=${azienda_id}`;
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkQR)}`;

    box.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px;">
        <div class="fi-stat-card">
          <div class="fi-stat-num">${totClienti}</div>
          <div class="fi-stat-label">👥 Clienti fidelity</div>
        </div>
        <div class="fi-stat-card">
          <div class="fi-stat-num">${nuoviMese}</div>
          <div class="fi-stat-label">🆕 Nuovi questo mese</div>
        </div>
        <div class="fi-stat-card">
          <div class="fi-stat-num" style="font-size:24px;">${totPunti.toLocaleString("it")}</div>
          <div class="fi-stat-label">⭐ Punti totali emessi</div>
        </div>
        <div class="fi-stat-card">
          <div class="fi-stat-num" style="color:#713f12;">${oro}</div>
          <div class="fi-stat-label">🥇 Clienti Oro</div>
        </div>
        <div class="fi-stat-card">
          <div class="fi-stat-num" style="color:#374151;">${argento}</div>
          <div class="fi-stat-label">🥈 Clienti Argento</div>
        </div>
      </div>

      <!-- QR ISCRIZIONE -->
      <div class="fi-card" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
        <img src="${qrImg}" class="qr-tessera">
        <div style="flex:1;min-width:200px;">
          <div style="font-size:16px;font-weight:800;margin-bottom:6px;">📱 QR iscrizione fidelity</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:12px;line-height:1.5;">
            Stampa o mostra questo QR alla cassa. Il cliente lo inquadra, si iscrive in 30 secondi e ottiene lo sconto immediato.
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a href="${linkQR}" target="_blank" class="fi-btn fi-btn-primary" style="text-decoration:none;font-size:12px;">🔗 Apri pagina</a>
            <a href="${qrImg}" download="qr-fidelity.png" class="fi-btn fi-btn-sec" style="text-decoration:none;font-size:12px;">⬇ Scarica QR</a>
            <button id="btn-stampa-qr" class="fi-btn fi-btn-sec" style="font-size:12px;">🖨️ Stampa</button>
          </div>
        </div>
      </div>

      <!-- ULTIMI CLIENTI -->
      <div class="fi-card">
        <div style="font-size:15px;font-weight:800;margin-bottom:12px;">👥 Ultimi iscritti</div>
        ${clienti.slice(0,5).length ? `
          <table class="fi-table">
            <thead><tr><th>Cliente</th><th>Punti</th><th>Livello</th><th>Iscritto il</th></tr></thead>
            <tbody>
              ${clienti.slice(0,5).map(t => {
                const c = t.fidelity_clienti || {};
                return `<tr>
                  <td><div style="font-weight:700;">${esc(c.nome||"")} ${esc(c.cognome||"")}</div><div style="font-size:11px;color:#94a3b8;">${esc(c.telefono||"")}</div></td>
                  <td style="font-weight:800;color:#0E5A7A;">${(t.punti_locali||0).toLocaleString("it")}</td>
                  <td><span class="fi-badge livello-${t.livello||"bronzo"}">${livelloEmoji(t.livello)} ${capitalize(t.livello||"bronzo")}</span></td>
                  <td style="font-size:12px;color:#64748b;">${formatData(t.created_at)}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
          <button class="fi-btn fi-btn-sec" style="margin-top:12px;font-size:12px;" onclick="this.closest('[data-tab]')">
        ` : `<div style="color:#94a3b8;text-align:center;padding:20px;font-size:13px;">Nessun cliente ancora. Emetti la prima tessera!</div>`}
      </div>
    `;

    qs("#btn-stampa-qr")?.addEventListener("click", () => {
      const win = window.open("", "_blank");
      win.document.write(`<html><body style="display:flex;flex-direction:column;align-items:center;padding:32px;font-family:sans-serif;text-align:center;">
        <h2 style="margin-bottom:8px;">Tessera Fidelity</h2>
        <p style="color:#666;margin-bottom:20px;">Inquadra il QR code per iscriverti e ottenere subito uno sconto del ${cfg.sconto_benvenuto_perc || 10}%</p>
        <img src="${qrImg}" style="width:240px;height:240px;">
        <p style="font-size:12px;color:#999;margin-top:16px;">Powered by Ristoflow.Ai</p>
        <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`);
    });
  }

  // ── CLIENTI ───────────────────────────────────────────────────
  function renderClienti(box) {
    box.innerHTML = `
      <div class="fi-card">
        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
          <input id="search-clienti" class="fi-input" placeholder="Cerca per nome o telefono..." style="flex:1;min-width:200px;">
          <select id="filter-livello" class="fi-input" style="width:140px;">
            <option value="">Tutti i livelli</option>
            <option value="bronzo">🥉 Bronzo</option>
            <option value="argento">🥈 Argento</option>
            <option value="oro">🥇 Oro</option>
          </select>
        </div>
        <div style="overflow-x:auto;">
          <table class="fi-table" id="tabella-clienti">
            <thead><tr>
              <th>Cliente</th><th>Telefono</th><th>Punti</th><th>Livello</th>
              <th>Iscritto</th><th>Azioni</th>
            </tr></thead>
            <tbody id="tbody-clienti"></tbody>
          </table>
        </div>
      </div>
    `;

    const renderRows = (filter = "", livello = "") => {
      const tbody = qs("#tbody-clienti");
      const filtered = clienti.filter(t => {
        const c = t.fidelity_clienti || {};
        const matchTesto = !filter ||
          (c.nome||"").toLowerCase().includes(filter.toLowerCase()) ||
          (c.cognome||"").toLowerCase().includes(filter.toLowerCase()) ||
          (c.telefono||"").includes(filter);
        const matchLivello = !livello || t.livello === livello;
        return matchTesto && matchLivello;
      });

      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px;">Nessun cliente trovato</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(t => {
        const c = t.fidelity_clienti || {};
        const linkTessera = `${BASE_URL}/fidelity.html?t=${c.qr_token||""}&a=${azienda_id}`;
        const qrSmall = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(linkTessera)}`;
        return `<tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="${qrSmall}" style="width:40px;height:40px;border-radius:8px;">
              <div>
                <div style="font-weight:700;">${esc(c.nome||"")} ${esc(c.cognome||"")}</div>
                <div style="font-size:11px;color:#94a3b8;">${esc(c.email||"")}</div>
              </div>
            </div>
          </td>
          <td style="font-weight:600;">${esc(c.telefono||"")}</td>
          <td><span style="font-size:16px;font-weight:800;color:#0E5A7A;">${(t.punti_locali||0).toLocaleString("it")}</span></td>
          <td><span class="fi-badge livello-${t.livello||"bronzo"}">${livelloEmoji(t.livello)} ${capitalize(t.livello||"bronzo")}</span></td>
          <td style="font-size:12px;color:#64748b;">${formatData(t.created_at)}</td>
          <td>
            <div style="display:flex;gap:4px;">
              <button class="fi-btn fi-btn-sec btn-dettaglio" data-tessera-id="${t.id}" data-cliente-id="${c.id||""}" style="font-size:11px;padding:5px 10px;">👁️ Dettaglio</button>
              <button class="fi-btn fi-btn-primary btn-aggiungi-punti" data-tessera-id="${t.id}" data-cliente-id="${c.id||""}" style="font-size:11px;padding:5px 10px;">⭐ Punti</button>
            </div>
          </td>
        </tr>`;
      }).join("");

      tbody.querySelectorAll(".btn-dettaglio").forEach(btn => {
        btn.onclick = () => aprireDettaglioCliente(btn.dataset.tesseraId, btn.dataset.clienteId);
      });
      tbody.querySelectorAll(".btn-aggiungi-punti").forEach(btn => {
        btn.onclick = () => aprireAggiungiPunti(btn.dataset.tesseraId, btn.dataset.clienteId);
      });
    };

    renderRows();
    qs("#search-clienti").oninput = e => renderRows(e.target.value, qs("#filter-livello").value);
    qs("#filter-livello").onchange = e => renderRows(qs("#search-clienti").value, e.target.value);
  }

  // ── CONFIGURAZIONE ────────────────────────────────────────────
  function renderConfigurazione(box) {
    box.innerHTML = `
      <div class="fi-card">
        <div style="font-size:16px;font-weight:800;margin-bottom:16px;">⭐ Regole accumulo punti</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div><label class="fi-label">Punti per ogni € speso</label>
            <input id="cfg-ppe" class="fi-input" type="number" step="0.1" min="0.1" value="${cfg.punti_per_euro||1}"></div>
          <div><label class="fi-label">Sconto benvenuto (%)</label>
            <input id="cfg-sconto" class="fi-input" type="number" step="1" min="0" max="100" value="${cfg.sconto_benvenuto_perc||10}"></div>
          <div><label class="fi-label">Punti bonus iscrizione</label>
            <input id="cfg-bonus-iscr" class="fi-input" type="number" min="0" value="${cfg.bonus_benvenuto_punti||50}"></div>
          <div><label class="fi-label">Punti bonus compleanno</label>
            <input id="cfg-bonus-compl" class="fi-input" type="number" min="0" value="${cfg.bonus_compleanno_punti||100}"></div>
        </div>
      </div>

      <div class="fi-card">
        <div style="font-size:16px;font-weight:800;margin-bottom:16px;">🏅 Soglie livello</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div><label class="fi-label">🥈 Soglia Argento (punti)</label>
            <input id="cfg-soglia-arg" class="fi-input" type="number" min="1" value="${cfg.soglia_argento||500}"></div>
          <div><label class="fi-label">🥇 Soglia Oro (punti)</label>
            <input id="cfg-soglia-oro" class="fi-input" type="number" min="1" value="${cfg.soglia_oro||1500}"></div>
          <div><label class="fi-label">Moltiplicatore Argento (x)</label>
            <input id="cfg-mol-arg" class="fi-input" type="number" step="0.1" min="1" value="${cfg.moltiplicatore_argento||1.5}"></div>
          <div><label class="fi-label">Moltiplicatore Oro (x)</label>
            <input id="cfg-mol-oro" class="fi-input" type="number" step="0.1" min="1" value="${cfg.moltiplicatore_oro||2}"></div>
        </div>
        <div style="background:#f0f9ff;border-radius:12px;padding:12px;font-size:12px;color:#0369a1;margin-bottom:16px;">
          💡 Il moltiplicatore aumenta i punti guadagnati per livello.<br>
          Es. cliente Oro spende €20 → 20 × ${cfg.punti_per_euro||1} punti base × ${cfg.moltiplicatore_oro||2} moltiplicatore = ${20*(cfg.punti_per_euro||1)*(cfg.moltiplicatore_oro||2)} punti totali.
        </div>
      </div>

      <div class="fi-card">
        <div style="font-size:16px;font-weight:800;margin-bottom:12px;">🌐 Ristoflow Network</div>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-weight:600;margin-bottom:8px;">
          <input type="checkbox" id="cfg-network" style="accent-color:#0E5A7A;width:18px;height:18px;" ${cfg.network_attivo?"checked":""}>
          Partecipa al network Ristoflow (i clienti vedono le tue offerte)
        </label>
        <div style="font-size:12px;color:#64748b;line-height:1.5;">
          Attivando il network, le tue offerte appaiono nella tessera fidelity di tutti i clienti Ristoflow in Italia. I clienti di altri locali possono usare la tessera da te.
        </div>
      </div>

      <button id="btn-salva-cfg" class="fi-btn fi-btn-primary" style="width:100%;padding:14px;font-size:15px;">💾 Salva configurazione</button>
      <div id="msg-cfg-fi" style="margin-top:10px;font-size:13px;text-align:center;"></div>
    `;

    qs("#btn-salva-cfg").onclick = salvaCfg;
  }

  async function salvaCfg() {
    const btn = qs("#btn-salva-cfg");
    const msg = qs("#msg-cfg-fi");
    btn.disabled = true; btn.textContent = "Salvataggio...";

    const nuovoCfg = {
      azienda_id,
      punti_per_euro:        parseFloat(qs("#cfg-ppe").value) || 1,
      sconto_benvenuto_perc: parseFloat(qs("#cfg-sconto").value) || 10,
      bonus_benvenuto_punti: parseInt(qs("#cfg-bonus-iscr").value) || 50,
      bonus_compleanno_punti:parseInt(qs("#cfg-bonus-compl").value) || 100,
      soglia_argento:        parseInt(qs("#cfg-soglia-arg").value) || 500,
      soglia_oro:            parseInt(qs("#cfg-soglia-oro").value) || 1500,
      moltiplicatore_argento:parseFloat(qs("#cfg-mol-arg").value) || 1.5,
      moltiplicatore_oro:    parseFloat(qs("#cfg-mol-oro").value) || 2,
      network_attivo:        qs("#cfg-network").checked,
      updated_at:            new Date().toISOString()
    };

    const { error } = await supa().from("fidelity_config")
      .upsert(nuovoCfg, { onConflict: "azienda_id" });

    btn.disabled = false; btn.textContent = "💾 Salva configurazione";

    if (error) { msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`; return; }
    msg.innerHTML = `<span style="color:#16a34a;">✅ Salvato</span>`;
    cfg = nuovoCfg;
    setTimeout(() => msg.innerHTML = "", 3000);
  }

  // ── NETWORK ───────────────────────────────────────────────────
  function renderNetwork(box) {
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="font-size:16px;font-weight:800;">🌐 Le tue offerte network</div>
        <button id="btn-nuova-offerta" class="fi-btn fi-btn-primary">+ Nuova offerta</button>
      </div>

      ${!cfg.network_attivo ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:16px;margin-bottom:16px;font-size:13px;color:#92400e;">
          ⚠️ Il network non è attivo. Vai in <strong>Regole punti</strong> e attiva "Partecipa al network Ristoflow" per rendere visibili le tue offerte.
        </div>
      ` : ""}

      <div id="lista-offerte">
        ${offerte.length ? offerte.map(o => `
          <div class="fi-card" style="display:flex;gap:12px;align-items:flex-start;">
            <div class="offerta-badge">${o.tipo==="sconto_perc"?"-"+o.valore+"%":o.tipo==="sconto_fisso"?"-€"+Number(o.valore).toFixed(2):"🎁"}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:800;">${esc(o.titolo)}</div>
              ${o.descrizione?`<div style="font-size:13px;color:#64748b;margin-top:2px;">${esc(o.descrizione)}</div>`:""}
              ${o.condizioni?`<div style="font-size:11px;color:#94a3b8;margin-top:4px;">📋 ${esc(o.condizioni)}</div>`:""}
              <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
                ${o.valida_dal?`Dal ${formatDataBreve(o.valida_dal)}`:""}
                ${o.valida_al?" al "+formatDataBreve(o.valida_al):""}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
              <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:${o.attiva?"#dcfce7":"#fee2e2"};color:${o.attiva?"#16a34a":"#dc2626"};">${o.attiva?"Attiva":"Non attiva"}</span>
              <div style="display:flex;gap:4px;">
                <button class="fi-btn fi-btn-sec btn-toggle-offerta" data-id="${o.id}" data-attiva="${o.attiva}" style="font-size:11px;padding:4px 8px;">${o.attiva?"⏸":"▶"}</button>
                <button class="fi-btn fi-btn-danger btn-del-offerta" data-id="${o.id}" style="font-size:11px;padding:4px 8px;">🗑</button>
              </div>
            </div>
          </div>
        `).join("") : `<div class="fi-card" style="text-align:center;color:#94a3b8;padding:32px;">Nessuna offerta network. Creane una!</div>`}
      </div>
    `;

    qs("#btn-nuova-offerta").onclick = aprireModalOfferta;

    container.querySelectorAll(".btn-toggle-offerta").forEach(btn => {
      btn.onclick = async () => {
        const attiva = btn.dataset.attiva === "true";
        await supa().from("network_offerte").update({ attiva: !attiva }).eq("id", btn.dataset.id);
        await loadOfferte();
        renderNetwork(box);
      };
    });

    container.querySelectorAll(".btn-del-offerta").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Eliminare questa offerta?")) return;
        await supa().from("network_offerte").delete().eq("id", btn.dataset.id);
        await loadOfferte();
        renderNetwork(box);
      };
    });
  }

  // ── MODAL TESSERA ─────────────────────────────────────────────
  let clienteSelezionato = null;

  function aprireModalTessera() {
    clienteSelezionato = null;
    qs("#em-telefono").value = "";
    qs("#em-nome") && (qs("#em-nome").value = "");
    qs("#em-cognome") && (qs("#em-cognome").value = "");
    qs("#em-email") && (qs("#em-email").value = "");
    qs("#em-nascita") && (qs("#em-nascita").value = "");
    qs("#em-importo").value = "";
    qs("#em-cliente-trovato").style.display = "none";
    qs("#em-form-nuovo").style.display = "none";
    qs("#em-calcolo").textContent = "";
    qs("#em-msg").textContent = "";
    qs("#modal-sconto-label").textContent = `-${cfg.sconto_benvenuto_perc||10}% SUBITO`;
    qs("#modal-tessera").classList.add("open");
  }

  async function cercaClienteModal() {
    const tel = qs("#em-telefono").value.trim();
    if (!tel) return;
    const { data } = await supa().from("fidelity_clienti")
      .select("*").eq("telefono", tel).maybeSingle();

    const trovato = qs("#em-cliente-trovato");
    const formNuovo = qs("#em-form-nuovo");

    if (data) {
      clienteSelezionato = data;
      trovato.style.display = "block";
      trovato.innerHTML = `✅ Cliente trovato: <strong>${esc(data.nome||"")} ${esc(data.cognome||"")}</strong> — ${(data.punti_totali||0)} punti`;
      formNuovo.style.display = "none";
    } else {
      clienteSelezionato = null;
      trovato.style.display = "none";
      formNuovo.style.display = "block";
    }
    aggiornaCalcoloModal();
  }

  function calcolaPunti(importo, livello) {
    const base = (cfg.punti_per_euro || 1) * importo;
    const mol = livello === "oro" ? (cfg.moltiplicatore_oro||2) : livello === "argento" ? (cfg.moltiplicatore_argento||1.5) : 1;
    return Math.round(base * mol);
  }

  function aggiornaCalcoloModal() {
    const importo = parseFloat(qs("#em-importo").value) || 0;
    if (!importo) { qs("#em-calcolo").textContent = ""; return; }
    const sconto = importo * (cfg.sconto_benvenuto_perc||10) / 100;
    const totale = importo - sconto;
    const punti = calcolaPunti(totale, "bronzo");
    qs("#em-calcolo").innerHTML =
      `Sconto: <strong>€${sconto.toFixed(2)}</strong> → Totale: <strong>€${totale.toFixed(2)}</strong> · Punti guadagnati: <strong>${punti}pt</strong>`;
  }

  async function emettiTessera() {
    const btn = qs("#btn-emetti");
    const msg = qs("#em-msg");
    const importo = parseFloat(qs("#em-importo").value) || 0;
    btn.disabled = true; btn.textContent = "Emissione...";

    try {
      let cliente = clienteSelezionato;

      if (!cliente) {
        // Nuovo cliente
        const nome = (qs("#em-nome")?.value || "").trim();
        const tel = qs("#em-telefono").value.trim();
        if (!nome || !tel) {
          msg.innerHTML = `<span style="color:#dc2626;">Nome e telefono obbligatori</span>`;
          btn.disabled = false; btn.textContent = "✅ Emetti tessera e applica sconto";
          return;
        }
        const { data, error } = await supa().from("fidelity_clienti").insert({
          nome, cognome: (qs("#em-cognome")?.value||"").trim()||null,
          telefono: tel,
          email: (qs("#em-email")?.value||"").trim()||null,
          data_nascita: qs("#em-nascita")?.value||null,
          punti_totali: cfg.bonus_benvenuto_punti||50
        }).select().single();
        if (error) throw new Error(error.message);
        cliente = data;
      }

      // Crea/aggiorna tessera
      const tesseraEsistente = await supa().from("fidelity_tessere")
        .select("*").eq("cliente_id", cliente.id).eq("azienda_id", azienda_id).maybeSingle();

      let tessera = tesseraEsistente.data;
      const puntiBonus = !tessera ? (cfg.bonus_benvenuto_punti||50) : 0;
      const puntiAcquisto = importo > 0 ? calcolaPunti(importo, tessera?.livello||"bronzo") : 0;
      const nuovoPuntiLocali = (tessera?.punti_locali||0) + puntiBonus + puntiAcquisto;
      const nuovoLivello = nuovoPuntiLocali >= (cfg.soglia_oro||1500) ? "oro" : nuovoPuntiLocali >= (cfg.soglia_argento||500) ? "argento" : "bronzo";

      if (!tessera) {
        await supa().from("fidelity_tessere").insert({
          cliente_id: cliente.id, azienda_id, sede_id,
          punti_locali: nuovoPuntiLocali, livello: nuovoLivello
        });
        // Movimento benvenuto
        await supa().from("fidelity_movimenti").insert({
          cliente_id: cliente.id, azienda_id,
          tipo: "benvenuto", punti: puntiBonus,
          descrizione: "Bonus iscrizione fidelity"
        });
      } else {
        await supa().from("fidelity_tessere").update({
          punti_locali: nuovoPuntiLocali, livello: nuovoLivello
        }).eq("id", tessera.id);
      }

      // Movimento acquisto
      if (puntiAcquisto > 0) {
        await supa().from("fidelity_movimenti").insert({
          cliente_id: cliente.id, azienda_id,
          tipo: "acquisto", punti: puntiAcquisto,
          importo_speso: importo,
          descrizione: `Acquisto €${importo.toFixed(2)}`
        });
      }

      // Aggiorna punti totali cliente
      await supa().from("fidelity_clienti").update({
        punti_totali: (cliente.punti_totali||0) + puntiBonus + puntiAcquisto
      }).eq("id", cliente.id);

      const sconto = importo > 0 ? importo * (cfg.sconto_benvenuto_perc||10) / 100 : 0;
      const linkTessera = `${BASE_URL}/fidelity.html?t=${cliente.qr_token}&a=${azienda_id}`;

      msg.innerHTML = `<div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:left;">
        <div style="font-weight:800;color:#16a34a;font-size:15px;margin-bottom:8px;">✅ Tessera emessa!</div>
        ${sconto > 0 ? `<div style="margin-bottom:4px;">💸 Sconto applicato: <strong>€${sconto.toFixed(2)}</strong></div>` : ""}
        <div style="margin-bottom:4px;">⭐ Punti accreditati: <strong>${puntiBonus+puntiAcquisto}pt</strong></div>
        <div style="margin-bottom:8px;">🏅 Livello: <strong>${capitalize(nuovoLivello)}</strong></div>
        <a href="${linkTessera}" target="_blank" style="color:#0E5A7A;font-weight:700;font-size:13px;">🔗 Apri tessera cliente</a>
      </div>`;

      await loadClienti();
      btn.disabled = false; btn.textContent = "✅ Emetti tessera e applica sconto";
    } catch(err) {
      msg.innerHTML = `<span style="color:#dc2626;">${err.message}</span>`;
      btn.disabled = false; btn.textContent = "✅ Emetti tessera e applica sconto";
    }
  }

  // ── DETTAGLIO CLIENTE ─────────────────────────────────────────
  async function aprireDettaglioCliente(tesseraId, clienteId) {
    const tessera = clienti.find(t => t.id === tesseraId);
    const c = tessera?.fidelity_clienti || {};
    qs("#modal-cliente-title").textContent = `${c.nome||""} ${c.cognome||""}`;

    const { data: movimenti } = await supa().from("fidelity_movimenti")
      .select("*").eq("cliente_id", c.id).eq("azienda_id", azienda_id)
      .order("created_at", { ascending: false }).limit(20);

    const linkTessera = `${BASE_URL}/fidelity.html?t=${c.qr_token||""}&a=${azienda_id}`;
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(linkTessera)}`;

    qs("#modal-cliente-body").innerHTML = `
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;">
        <img src="${qrImg}" style="width:90px;height:90px;border-radius:12px;">
        <div>
          <div style="font-size:14px;font-weight:600;color:#64748b;margin-bottom:4px;">${esc(c.telefono||"")} · ${esc(c.email||"")}</div>
          <div style="font-size:24px;font-weight:800;color:#0E5A7A;margin-bottom:4px;">${(tessera?.punti_locali||0).toLocaleString("it")} punti</div>
          <span class="fi-badge livello-${tessera?.livello||"bronzo"}">${livelloEmoji(tessera?.livello)} ${capitalize(tessera?.livello||"bronzo")}</span>
        </div>
      </div>
      <a href="${linkTessera}" target="_blank" class="fi-btn fi-btn-primary" style="display:block;text-align:center;text-decoration:none;margin-bottom:16px;padding:10px;">🔗 Apri tessera cliente</a>
      <div style="font-size:14px;font-weight:800;margin-bottom:10px;">📋 Storico movimenti</div>
      ${(movimenti||[]).length ? (movimenti||[]).map(m => {
        const icon = m.tipo==="acquisto"?"🛍️":m.tipo==="benvenuto"?"🎁":m.tipo==="compleanno"?"🎂":"⭐";
        const color = m.punti>0?"#16a34a":"#dc2626";
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:18px;">${icon}</span>
          <div style="flex:1;"><div style="font-size:13px;font-weight:700;">${esc(m.descrizione||m.tipo)}</div><div style="font-size:11px;color:#94a3b8;">${formatData(m.created_at)}</div></div>
          <span style="font-size:15px;font-weight:800;color:${color};">${m.punti>0?"+":""}${m.punti}pt</span>
        </div>`;
      }).join("") : `<div style="color:#94a3b8;text-align:center;padding:16px;">Nessun movimento</div>`}
    `;

    qs("#modal-cliente").classList.add("open");
  }

  async function aprireAggiungiPunti(tesseraId, clienteId) {
    const tessera = clienti.find(t => t.id === tesseraId);
    const c = tessera?.fidelity_clienti || {};
    qs("#modal-cliente-title").textContent = `⭐ Aggiungi punti — ${c.nome||""}`;
    qs("#modal-cliente-body").innerHTML = `
      <div style="margin-bottom:12px;"><label class="fi-label">Importo acquisto (€)</label>
        <input id="ap-importo" class="fi-input" type="number" step="0.01" placeholder="0.00"></div>
      <div style="margin-bottom:12px;"><label class="fi-label">Oppure punti manuali</label>
        <input id="ap-punti" class="fi-input" type="number" placeholder="Es. 50"></div>
      <div style="margin-bottom:12px;"><label class="fi-label">Descrizione</label>
        <input id="ap-desc" class="fi-input" placeholder="Es. Cena speciale"></div>
      <div id="ap-calcolo" style="font-size:13px;color:#64748b;margin-bottom:12px;"></div>
      <button id="btn-ap-salva" class="fi-btn fi-btn-primary" style="width:100%;padding:12px;">⭐ Aggiungi punti</button>
      <div id="ap-msg" style="margin-top:8px;font-size:13px;text-align:center;"></div>
    `;

    const apImporto = qs("#ap-importo");
    apImporto.oninput = () => {
      const imp = parseFloat(apImporto.value)||0;
      if (!imp) { qs("#ap-calcolo").textContent=""; return; }
      const pt = calcolaPunti(imp, tessera?.livello||"bronzo");
      qs("#ap-calcolo").innerHTML = `Punti calcolati: <strong>${pt}pt</strong> (livello ${capitalize(tessera?.livello||"bronzo")}, ×${tessera?.livello==="oro"?(cfg.moltiplicatore_oro||2):tessera?.livello==="argento"?(cfg.moltiplicatore_argento||1.5):1})`;
    };

    qs("#btn-ap-salva").onclick = async () => {
      const imp = parseFloat(qs("#ap-importo").value)||0;
      const puntiManuali = parseInt(qs("#ap-punti").value)||0;
      const desc = qs("#ap-desc").value.trim();
      const puntiCalcolati = imp > 0 ? calcolaPunti(imp, tessera?.livello||"bronzo") : 0;
      const puntiTotali = puntiCalcolati + puntiManuali;
      if (!puntiTotali) { qs("#ap-msg").innerHTML='<span style="color:#dc2626;">Inserisci importo o punti</span>'; return; }

      const nuovoPuntiLocali = (tessera?.punti_locali||0) + puntiTotali;
      const nuovoLivello = nuovoPuntiLocali>=(cfg.soglia_oro||1500)?"oro":nuovoPuntiLocali>=(cfg.soglia_argento||500)?"argento":"bronzo";

      await supa().from("fidelity_movimenti").insert({
        cliente_id: c.id, azienda_id,
        tipo: imp>0?"acquisto":"bonus",
        punti: puntiTotali, importo_speso: imp||null,
        descrizione: desc || (imp>0?`Acquisto €${imp.toFixed(2)}`:`Punti manuali`)
      });
      await supa().from("fidelity_tessere").update({
        punti_locali: nuovoPuntiLocali, livello: nuovoLivello
      }).eq("id", tesseraId);
      await supa().from("fidelity_clienti").update({
        punti_totali: (c.punti_totali||0) + puntiTotali
      }).eq("id", c.id);

      qs("#ap-msg").innerHTML = `<span style="color:#16a34a;">✅ +${puntiTotali} punti aggiunti!</span>`;
      await loadClienti();
      setTimeout(() => qs("#modal-cliente").classList.remove("open"), 1500);
    };

    qs("#modal-cliente").classList.add("open");
  }

  // ── MODAL OFFERTA ─────────────────────────────────────────────
  function aprireModalOfferta() {
    qs("#modal-offerta-title").textContent = "➕ Nuova offerta network";
    qs("#modal-offerta-body").innerHTML = `
      <div style="margin-bottom:12px;"><label class="fi-label">Titolo *</label>
        <input id="off-titolo" class="fi-input" placeholder="Es. Caffè di benvenuto"></div>
      <div style="margin-bottom:12px;"><label class="fi-label">Descrizione</label>
        <textarea id="off-desc" class="fi-input" style="min-height:60px;resize:vertical;" placeholder="Dettagli offerta..."></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <div><label class="fi-label">Tipo offerta</label>
          <select id="off-tipo" class="fi-input">
            <option value="sconto_perc">Sconto %</option>
            <option value="sconto_fisso">Sconto fisso €</option>
            <option value="omaggio">Omaggio</option>
          </select></div>
        <div><label class="fi-label">Valore</label>
          <input id="off-valore" class="fi-input" type="number" step="0.01" placeholder="10"></div>
      </div>
      <div style="margin-bottom:12px;"><label class="fi-label">Condizioni</label>
        <input id="off-condizioni" class="fi-input" placeholder="Es. Solo con consumazione minima €15"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
        <div><label class="fi-label">Valida dal</label><input id="off-dal" class="fi-input" type="date"></div>
        <div><label class="fi-label">Valida al</label><input id="off-al" class="fi-input" type="date"></div>
      </div>
      <button id="btn-salva-offerta" class="fi-btn fi-btn-primary" style="width:100%;padding:12px;">💾 Salva offerta</button>
      <div id="off-msg" style="margin-top:8px;font-size:13px;text-align:center;"></div>
    `;

    qs("#btn-salva-offerta").onclick = async () => {
      const titolo = qs("#off-titolo").value.trim();
      if (!titolo) { qs("#off-msg").innerHTML='<span style="color:#dc2626;">Titolo obbligatorio</span>'; return; }
      const { error } = await supa().from("network_offerte").insert({
        azienda_id, sede_id,
        titolo, descrizione: qs("#off-desc").value.trim()||null,
        tipo: qs("#off-tipo").value,
        valore: parseFloat(qs("#off-valore").value)||null,
        condizioni: qs("#off-condizioni").value.trim()||null,
        valida_dal: qs("#off-dal").value||null,
        valida_al: qs("#off-al").value||null,
        attiva: true
      });
      if (error) { qs("#off-msg").innerHTML=`<span style="color:#dc2626;">${error.message}</span>`; return; }
      qs("#off-msg").innerHTML='<span style="color:#16a34a;">✅ Offerta salvata!</span>';
      await loadOfferte();
      setTimeout(() => { qs("#modal-offerta").classList.remove("open"); renderTab(); }, 800);
    };

    qs("#modal-offerta").classList.add("open");
  }

  // ── UTILS ─────────────────────────────────────────────────────
  function livelloEmoji(l) { return l==="oro"?"🥇":l==="argento"?"🥈":"🥉"; }
  function capitalize(s) { return s?s.charAt(0).toUpperCase()+s.slice(1):""; }
  function formatData(ts) { if(!ts) return ""; var d=new Date(ts); return d.toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"}); }
  function formatDataBreve(s) { if(!s) return ""; var p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
  function esc(v) { return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
}
