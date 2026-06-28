export async function render(container) {
  const supa = () => window.supabaseClient || window.supabase;
  const isSuperadmin = window.state?.isSuperadmin === true || window.state?.ruolo === "superadmin";
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId && !isSuperadmin) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b;">Nessuna azienda selezionata.</div>`;
    return;
  }

  // ── State ──────────────────────────────────────────────────
  let giorni = 30;
  let filtroAzienda = isSuperadmin ? null : aziendaId;
  let aziende = [];
  let dati = [];

  // ── Helpers ────────────────────────────────────────────────
  const fmt = n => Number(n || 0).toLocaleString("it-IT");
  const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;
  const colore = "#0E5A7A";

  function dateFrom(g) {
    const d = new Date();
    d.setDate(d.getDate() - g);
    return d.toISOString().split("T")[0];
  }

  // ── Layout iniziale ────────────────────────────────────────
  container.innerHTML = `
  <style>
    .an-wrap { max-width:900px; margin:0 auto; padding:16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .an-title { font-size:20px; font-weight:800; color:#111827; margin:0 0 4px; }
    .an-sub   { font-size:13px; color:#64748b; margin:0 0 16px; }
    .an-toolbar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
    .an-btn { padding:8px 14px; border-radius:8px; border:1.5px solid #e5e7eb; background:white; font-size:13px; font-weight:600; color:#374151; cursor:pointer; transition:all .15s; }
    .an-btn.active { background:${colore}; color:white; border-color:${colore}; }
    .an-select { padding:8px 12px; border-radius:8px; border:1.5px solid #e5e7eb; background:white; font-size:13px; color:#374151; outline:none; cursor:pointer; }
    .an-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-bottom:16px; }
    @media(min-width:600px){ .an-grid { grid-template-columns:repeat(4,1fr); } }
    .an-kpi { background:white; border-radius:14px; padding:16px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
    .an-kpi-val { font-size:26px; font-weight:800; color:#111827; margin-bottom:2px; }
    .an-kpi-lab { font-size:12px; color:#64748b; font-weight:600; }
    .an-kpi-sub { font-size:11px; color:#94a3b8; margin-top:2px; }
    .an-card { background:white; border-radius:14px; padding:20px; box-shadow:0 2px 12px rgba(0,0,0,0.06); margin-bottom:12px; }
    .an-card-title { font-size:13px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.5px; margin:0 0 14px; }
    .an-funnel-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
    .an-funnel-label { font-size:13px; color:#374151; width:140px; flex-shrink:0; }
    .an-funnel-bar-wrap { flex:1; background:#f1f5f9; border-radius:6px; height:22px; overflow:hidden; }
    .an-funnel-bar { height:100%; border-radius:6px; transition:width .4s ease; display:flex; align-items:center; padding-left:8px; }
    .an-funnel-bar span { font-size:11px; font-weight:700; color:white; white-space:nowrap; }
    .an-funnel-pct { font-size:12px; color:#64748b; width:44px; text-align:right; flex-shrink:0; }
    .an-step-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9; }
    .an-step-row:last-child { border-bottom:none; }
    .an-step-label { font-size:13px; color:#374151; }
    .an-step-val { font-size:13px; font-weight:700; color:#111827; }
    .an-step-pct { font-size:11px; color:#ef4444; font-weight:600; }
    .an-chart-wrap { position:relative; height:120px; display:flex; align-items:flex-end; gap:3px; }
    .an-bar { flex:1; border-radius:4px 4px 0 0; min-width:4px; transition:height .3s; cursor:default; position:relative; }
    .an-bar:hover .an-bar-tooltip { display:block; }
    .an-bar-tooltip { display:none; position:absolute; bottom:calc(100% + 4px); left:50%; transform:translateX(-50%); background:#111827; color:white; font-size:10px; padding:3px 6px; border-radius:4px; white-space:nowrap; z-index:10; pointer-events:none; }
    .an-utm-row { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid #f1f5f9; font-size:13px; }
    .an-utm-row:last-child { border-bottom:none; }
    .an-device-row { display:flex; gap:12px; }
    .an-device-pill { flex:1; text-align:center; padding:12px; background:#f8fafc; border-radius:10px; }
    .an-device-val { font-size:22px; font-weight:800; color:#111827; }
    .an-device-lab { font-size:11px; color:#64748b; margin-top:2px; }
    .an-error-row { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid #f1f5f9; font-size:13px; }
    .an-error-row:last-child { border-bottom:none; }
    .an-badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
    .an-bench-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:13px; }
    .an-bench-row:last-child { border-bottom:none; }
    .an-loading { text-align:center; padding:40px; color:#94a3b8; font-size:14px; }
    .an-empty { text-align:center; padding:30px; color:#94a3b8; font-size:13px; }
  </style>

  <div class="an-wrap">
    <div style="margin-bottom:12px;">
      <div class="an-title">📊 Analytics</div>
      <div class="an-sub">Traffico, conversioni e comportamento utenti</div>
    </div>

    <div class="an-toolbar">
      <button class="an-btn active" data-giorni="7">7 giorni</button>
      <button class="an-btn" data-giorni="30">30 giorni</button>
      <button class="an-btn" data-giorni="90">90 giorni</button>
      ${isSuperadmin ? `<select id="an-az-select" class="an-select"><option value="">Tutte le aziende</option></select>` : ""}
    </div>

    <div id="an-body">
      <div class="an-loading">⏳ Caricamento dati...</div>
    </div>
  </div>`;

  // ── Carica aziende (superadmin) ────────────────────────────
  if (isSuperadmin) {
    const { data: az } = await supa().from("aziende").select("id,nome").order("nome");
    aziende = az || [];
    const sel = document.getElementById("an-az-select");
    aziende.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.id; opt.textContent = a.nome;
      sel.appendChild(opt);
    });
    sel.onchange = () => { filtroAzienda = sel.value || null; carica(); };
  }

  // ── Toolbar giorni ─────────────────────────────────────────
  container.querySelectorAll("[data-giorni]").forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll("[data-giorni]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      giorni = Number(btn.dataset.giorni);
      carica();
    };
  });

  // ── Query dati ─────────────────────────────────────────────
  async function fetchDati() {
    const from = dateFrom(giorni);
    let q = supa().from("page_analytics").select("*").gte("created_at", from + "T00:00:00");
    if (filtroAzienda) q = q.eq("azienda_id", filtroAzienda);
    else if (!isSuperadmin) q = q.eq("azienda_id", aziendaId);
    const { data } = await q.order("created_at", { ascending: true });
    return data || [];
  }

  async function fetchPrenotazioni() {
    const from = dateFrom(giorni);
    let q = supa().from("prenotazioni_tavoli")
      .select("id, data, ora, coperti, stato, canale, created_at, sede_id, azienda_id")
      .gte("created_at", from + "T00:00:00")
      .not("stato", "eq", "annullata");
    if (filtroAzienda) q = q.eq("azienda_id", filtroAzienda);
    else if (!isSuperadmin) q = q.eq("azienda_id", aziendaId);
    const { data } = await q.order("created_at", { ascending: true });
    return data || [];
  }

  // ── Render dashboard ───────────────────────────────────────
  async function carica() {
    document.getElementById("an-body").innerHTML = `<div class="an-loading">⏳ Caricamento...</div>`;
    const [tracking, prenotazioni] = await Promise.all([fetchDati(), fetchPrenotazioni()]);
    dati = tracking;
    renderDashboard(dati, prenotazioni);
  }

  function renderDashboard(rows, prenotazioni = []) {
    // ── Aggregazioni base ──
    const visite   = rows.filter(r => r.tipo === "view").length;
    const sessioni = new Set(rows.map(r => r.session_id).filter(Boolean)).size;
    const abbandoni  = rows.filter(r => r.tipo === "abbandono").length;

    // ── Prenotazioni reali da DB ──
    const prenOnline   = prenotazioni.filter(p => p.canale === "online").length;
    const prenChatbot  = prenotazioni.filter(p => p.canale === "chatbot").length;
    const prenManuale  = prenotazioni.filter(p => p.canale === "manuale").length;
    const prenSocial   = prenotazioni.filter(p => p.canale === "ristoflowbook").length;
    const prenTotale   = prenotazioni.length;
    const tassoConv    = pct(prenOnline, visite); // conversione form online
    const copertiTot   = prenotazioni.reduce((s,p) => s + (p.coperti||0), 0);
    const copertiMedia = prenTotale ? Math.round(copertiTot / prenTotale * 10) / 10 : 0;

    // ── KPI ──
    const kpiHtml = `
    <div class="an-grid">
      <div class="an-kpi">
        <div class="an-kpi-val">${fmt(visite)}</div>
        <div class="an-kpi-lab">👁️ Visite totali</div>
        <div class="an-kpi-sub">${fmt(sessioni)} sessioni uniche</div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val">${fmt(prenTotale)}</div>
        <div class="an-kpi-lab">✅ Prenotazioni reali</div>
        <div class="an-kpi-sub">${fmt(copertiTot)} coperti · media ${copertiMedia}</div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:${tassoConv >= 20 ? '#16a34a' : tassoConv >= 10 ? '#d97706' : '#dc2626'}">${tassoConv}%</div>
        <div class="an-kpi-lab">🎯 Conversione form</div>
        <div class="an-kpi-sub">Media settore: ~20%</div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:#dc2626">${fmt(abbandoni)}</div>
        <div class="an-kpi-lab">🚪 Abbandoni</div>
        <div class="an-kpi-sub">${visite ? pct(abbandoni, visite) : 0}% delle visite</div>
      </div>
    </div>`;

    // ── Prenotazioni per canale ──
    const canali = [
      { label: '🌐 Form online', val: prenOnline, color: colore },
      { label: '💬 WhatsApp chatbot', val: prenChatbot, color: '#25D366' },
      { label: '📱 RistoflowBook', val: prenSocial, color: '#f97316' },
      { label: '✍️ Manuale', val: prenManuale, color: '#94a3b8' },
    ].filter(c => c.val > 0);
    const maxCanale = Math.max(...canali.map(c => c.val), 1);
    const canaliHtml = `
    <div class="an-card">
      <div class="an-card-title">📊 Prenotazioni per canale</div>
      ${canali.length === 0 ? `<div class="an-empty">Nessuna prenotazione nel periodo</div>` :
        canali.map(c => `
          <div class="an-funnel-row">
            <div class="an-funnel-label">${c.label}</div>
            <div class="an-funnel-bar-wrap">
              <div class="an-funnel-bar" style="width:${pct(c.val,maxCanale)}%;background:${c.color};">
                <span>${fmt(c.val)}</span>
              </div>
            </div>
            <div class="an-funnel-pct">${pct(c.val,prenTotale)}%</div>
          </div>`).join('')}
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;">
        Totale: ${fmt(prenTotale)} prenotazioni · ${fmt(copertiTot)} coperti
      </div>
    </div>`;

    // ── Grafico prenotazioni reali per giorno ──
    const prenPer = {};
    prenotazioni.forEach(p => {
      const g = p.created_at?.split("T")[0];
      if (g) prenPer[g] = (prenPer[g] || 0) + 1;
    });
    const tuttiGiorni = [];
    for (let i = giorni - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      tuttiGiorni.push(d.toISOString().split("T")[0]);
    }
    const visitePer = {};
    rows.filter(r => r.tipo === "view").forEach(r => {
      const g = r.created_at?.split("T")[0];
      if (g) visitePer[g] = (visitePer[g] || 0) + 1;
    });
    const maxVal = Math.max(...tuttiGiorni.map(g => Math.max(visitePer[g]||0, (prenPer[g]||0)*5)), 1);
    const barsHtml = tuttiGiorni.map((g, i) => {
      const v = visitePer[g] || 0;
      const p2 = prenPer[g] || 0;
      const hV = Math.round((v / maxVal) * 100);
      const hP = Math.round(((p2*5) / maxVal) * 100);
      const label = g.slice(5).replace("-", "/");
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;position:relative;">
        <div class="an-bar-tooltip" style="display:none;position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);background:#111827;color:white;font-size:10px;padding:3px 6px;border-radius:4px;white-space:nowrap;z-index:10;">${label}: ${v} visite, ${p2} pren.</div>
        <div style="flex:1;width:100%;display:flex;align-items:flex-end;gap:1px;">
          <div style="flex:1;height:${Math.max(hV,2)}%;background:${colore}cc;border-radius:3px 3px 0 0;cursor:default;" onmouseenter="this.parentElement.parentElement.querySelector('.an-bar-tooltip').style.display='block'" onmouseleave="this.parentElement.parentElement.querySelector('.an-bar-tooltip').style.display='none'"></div>
          <div style="flex:1;height:${Math.max(hP,p2>0?4:0)}%;background:#16a34a;border-radius:3px 3px 0 0;cursor:default;"></div>
        </div>
      </div>`;
    }).join("");

    const chartHtml = `
    <div class="an-card">
      <div class="an-card-title">📈 Visite vs Prenotazioni per giorno</div>
      <div style="display:flex;gap:12px;margin-bottom:10px;font-size:11px;">
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:${colore}cc;border-radius:2px;display:inline-block;"></span>Visite</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#16a34a;border-radius:2px;display:inline-block;"></span>Prenotazioni</span>
      </div>
      <div class="an-chart-wrap">${barsHtml}</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:#94a3b8;">
        <span>${tuttiGiorni[0]?.slice(5).replace("-","/")}</span>
        <span>${tuttiGiorni[tuttiGiorni.length-1]?.slice(5).replace("-","/")}</span>
      </div>
    </div>`;

    // ── Funnel conversione (tracking + prenotazioni reali) ──
    const fView     = visite;
    const fData     = rows.filter(r => r.tipo === "click" && r.elemento === "seleziona_data").length;
    const fSlot     = rows.filter(r => r.tipo === "click" && r.elemento === "slot_orario").length;
    const fSubmit   = rows.filter(r => r.tipo === "click" && r.elemento === "btn_invia").length;
    const fComplete = prenOnline; // usa prenotazioni reali dal DB

    const fSteps = [
      { label: "👁️ Apertura form",    val: fView,     pct: 100 },
      { label: "📅 Seleziona data",    val: fData,     pct: pct(fData, fView) },
      { label: "⏰ Seleziona slot",    val: fSlot,     pct: pct(fSlot, fView) },
      { label: "🖱️ Click prenota",    val: fSubmit,   pct: pct(fSubmit, fView) },
      { label: "✅ Prenotate (DB)",    val: fComplete, pct: pct(fComplete, fView) },
    ];

    const colors = [`${colore}`, `${colore}cc`, `${colore}99`, `${colore}77`, "#16a34a"];
    const funnelHtml = `
    <div class="an-card">
      <div class="an-card-title">🔁 Funnel conversione</div>
      ${fSteps.map((s, i) => `
        <div class="an-funnel-row">
          <div class="an-funnel-label">${s.label}</div>
          <div class="an-funnel-bar-wrap">
            <div class="an-funnel-bar" style="width:${s.pct}%;background:${colors[i]};">
              <span>${fmt(s.val)}</span>
            </div>
          </div>
          <div class="an-funnel-pct">${s.pct}%</div>
        </div>`).join("")}
    </div>`;

    // ── Abbandono per step ──
    const stepCount = {};
    rows.filter(r => r.tipo === "abbandono").forEach(r => {
      const s = r.step || r.valore || "sconosciuto";
      stepCount[s] = (stepCount[s] || 0) + 1;
    });
    const stepOrder = ["inizio","dati_personali","dopo_data","dopo_slot"];
    const stepLabels = { "inizio":"Subito (solo view)", "dati_personali":"Dopo dati personali", "dopo_data":"Dopo data", "dopo_slot":"Dopo orario" };
    const abbandonoHtml = `
    <div class="an-card">
      <div class="an-card-title">🚪 Dove abbandonano</div>
      ${abbandoni === 0 ? `<div class="an-empty">Nessun abbandono tracciato</div>` :
        stepOrder.map(s => stepCount[s] ? `
          <div class="an-step-row">
            <div class="an-step-label">${stepLabels[s] || s}</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="an-step-pct">${pct(stepCount[s], abbandoni)}%</span>
              <span class="an-step-val">${fmt(stepCount[s])}</span>
            </div>
          </div>` : "").join("") || `<div class="an-empty">Nessun dato</div>`}
    </div>`;

    // ── Errori validazione ──
    const errori = {};
    rows.filter(r => r.tipo === "error" && r.elemento === "validazione_fallita").forEach(r => {
      const msg = r.valore || "errore";
      errori[msg] = (errori[msg] || 0) + 1;
    });
    const erroriList = Object.entries(errori).sort((a,b) => b[1]-a[1]).slice(0, 6);
    const erroriHtml = `
    <div class="an-card">
      <div class="an-card-title">❌ Errori validazione più frequenti</div>
      ${erroriList.length === 0 ? `<div class="an-empty">Nessun errore tracciato</div>` :
        erroriList.map(([msg, cnt]) => `
          <div class="an-error-row">
            <span style="color:#374151;">${msg}</span>
            <span class="an-badge" style="background:#fef2f2;color:#dc2626;">${cnt}×</span>
          </div>`).join("")}
    </div>`;

    // ── Slot orari più cliccati ──
    const slotCount = {};
    rows.filter(r => r.tipo === "click" && r.elemento === "slot_orario").forEach(r => {
      const ora = r.valore || "?";
      slotCount[ora] = (slotCount[ora] || 0) + 1;
    });
    const slotList = Object.entries(slotCount).sort((a,b) => b[1]-a[1]).slice(0, 6);
    const slotHtml = `
    <div class="an-card">
      <div class="an-card-title">⏰ Slot orari preferiti</div>
      ${slotList.length === 0 ? `<div class="an-empty">Nessun dato</div>` :
        slotList.map(([ora, cnt]) => `
          <div class="an-utm-row">
            <span style="font-weight:600;">${ora}</span>
            <span class="an-badge" style="background:#eff6ff;color:${colore};">${cnt} click</span>
          </div>`).join("")}
    </div>`;

    // ── UTM Sources ──
    const utmCount = {};
    rows.filter(r => r.tipo === "view").forEach(r => {
      const src = r.utm_source || r.referrer?.split("/")[2] || "diretto";
      utmCount[src] = (utmCount[src] || 0) + 1;
    });
    const utmList = Object.entries(utmCount).sort((a,b) => b[1]-a[1]).slice(0, 8);
    const utmHtml = `
    <div class="an-card">
      <div class="an-card-title">📡 Fonte traffico</div>
      ${utmList.length === 0 ? `<div class="an-empty">Nessun dato</div>` :
        utmList.map(([src, cnt]) => `
          <div class="an-utm-row">
            <span>${src}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;color:#94a3b8;">${pct(cnt, visite)}%</span>
              <span style="font-weight:700;color:#111827;">${fmt(cnt)}</span>
            </div>
          </div>`).join("")}
    </div>`;

    // ── Device ──
    const mob = rows.filter(r => r.tipo === "view" && r.device === "mobile").length;
    const dsk = rows.filter(r => r.tipo === "view" && r.device === "desktop").length;
    const deviceHtml = `
    <div class="an-card">
      <div class="an-card-title">📱 Device</div>
      <div class="an-device-row">
        <div class="an-device-pill">
          <div class="an-device-val">📱 ${pct(mob, mob+dsk)}%</div>
          <div class="an-device-lab">Mobile (${fmt(mob)})</div>
        </div>
        <div class="an-device-pill">
          <div class="an-device-val">🖥️ ${pct(dsk, mob+dsk)}%</div>
          <div class="an-device-lab">Desktop (${fmt(dsk)})</div>
        </div>
      </div>
    </div>`;

    // ── Top pagine / form ──
    const pagCount = {};
    rows.filter(r => r.tipo === "view").forEach(r => {
      const p = [r.pagina, r.pagina_id].filter(Boolean).join(" › ");
      pagCount[p] = (pagCount[p] || 0) + 1;
    });
    const pagList = Object.entries(pagCount).sort((a,b) => b[1]-a[1]).slice(0, 8);
    const pagHtml = `
    <div class="an-card">
      <div class="an-card-title">📄 Top pagine</div>
      ${pagList.length === 0 ? `<div class="an-empty">Nessun dato</div>` :
        pagList.map(([pag, cnt]) => `
          <div class="an-utm-row">
            <span style="font-size:12px;color:#64748b;word-break:break-all;">${pag}</span>
            <span style="font-weight:700;color:#111827;flex-shrink:0;margin-left:8px;">${fmt(cnt)}</span>
          </div>`).join("")}
    </div>`;

    // ── Benchmark superadmin ──
    let benchHtml = "";
    if (isSuperadmin && !filtroAzienda) {
      const azConv = {};
      const azVisite = {};
      rows.filter(r => r.tipo === "view" && r.azienda_id).forEach(r => {
        azVisite[r.azienda_id] = (azVisite[r.azienda_id] || 0) + 1;
      });
      rows.filter(r => r.tipo === "submit" && r.completato && r.azienda_id).forEach(r => {
        azConv[r.azienda_id] = (azConv[r.azienda_id] || 0) + 1;
      });
      const azMap = {};
      aziende.forEach(a => azMap[a.id] = a.nome);
      const azList = Object.entries(azVisite).map(([id, v]) => ({
        id, nome: azMap[id] || id.slice(0,8),
        visite: v, conv: azConv[id] || 0,
        pctConv: pct(azConv[id] || 0, v)
      })).sort((a,b) => b.pctConv - a.pctConv);

      benchHtml = `
      <div class="an-card" style="border:2px solid ${colore}20;">
        <div class="an-card-title">🏆 Benchmark aziende (superadmin)</div>
        ${azList.length === 0 ? `<div class="an-empty">Nessun dato</div>` :
          azList.map(a => `
            <div class="an-bench-row">
              <span style="font-weight:600;">${a.nome}</span>
              <div style="display:flex;gap:12px;align-items:center;">
                <span style="font-size:11px;color:#94a3b8;">${fmt(a.visite)} visite</span>
                <span class="an-badge" style="background:${a.pctConv>=20?'#dcfce7':'#fef2f2'};color:${a.pctConv>=20?'#16a34a':'#dc2626'};">${a.pctConv}% conv</span>
              </div>
            </div>`).join("")}
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;">
          💡 Media piattaforma: ${pct(Object.values(azConv).reduce((s,v)=>s+v,0), Object.values(azVisite).reduce((s,v)=>s+v,0))}% di conversione
        </div>
      </div>`;
    }

    // ── Assembla tutto ──
    document.getElementById("an-body").innerHTML =
      kpiHtml + chartHtml + canaliHtml + funnelHtml + abbandonoHtml +
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>${slotHtml}</div>
        <div>${deviceHtml}</div>
      </div>` +
      utmHtml + erroriHtml + pagHtml + benchHtml +
      `<div style="text-align:center;padding:20px;font-size:11px;color:#94a3b8;">
        Dati aggiornati in tempo reale · ${rows.length} eventi tracciati
      </div>`;
  }

  // ── Avvio ──────────────────────────────────────────────────
  await carica();
}
