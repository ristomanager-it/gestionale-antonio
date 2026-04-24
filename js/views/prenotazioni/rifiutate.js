export async function render(container) {
  const aziendaId = window.state?.azienda?.id || null;
  const sedeId = window.state?.sedeAttiva?.id || null;
  const sedeNome = window.state?.sedeAttiva?.nome || "Prenotazioni rifiutate";

  const today = new Date();

  container.innerHTML = `
<div class="view prenotazioni-view">
  <style>
    .prenotazioni-view{
      position:relative;
      padding:0;
      overflow:hidden;
      background:#f7f9fc;
    }

    .pren-shell{
      min-height:100%;
      background:linear-gradient(180deg,#ffffff 0%,#f7f9fc 100%);
    }

    .pren-header{
      position:sticky;
      top:0;
      z-index:30;
      background:#ffffff;
      border-bottom:1px solid #e5e7eb;
      padding:8px 10px 8px;
    }

    .pren-header-top{
      display:grid;
      grid-template-columns:36px 1fr 36px;
      align-items:center;
      gap:8px;
      margin-bottom:8px;
    }

    .pren-header-title{
      min-width:0;
      text-align:center;
    }

    .pren-header-title .pren-title{
      font-size:14px;
      font-weight:600;
      color:#111827;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .pren-icon-btn{
      width:36px;
      height:36px;
      border:none;
      border-radius:10px;
      background:#eef2f7;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:16px;
      cursor:pointer;
      flex-shrink:0;
      position:relative;
      color:#374151;
    }

    .pren-days-bar{
      display:grid;
      grid-template-columns:1fr 34px;
      gap:6px;
      align-items:center;
    }

    .pren-days{
      display:flex;
      gap:5px;
      overflow-x:auto;
      padding:0 26vw 2px 26vw;
      scrollbar-width:none;
      scroll-behavior:smooth;
    }

    .pren-days::-webkit-scrollbar{
      display:none;
    }

    .pren-day{
      min-width:56px;
      padding:5px 4px 6px;
      border-radius:10px;
      background:#f3f4f6;
      border:1px solid #e5e7eb;
      text-align:center;
      cursor:pointer;
      flex-shrink:0;
      font-weight:500;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:flex-start;
      gap:1px;
    }

    .pren-day.is-active{
      background:#0E5A7A;
      color:#ffffff;
      border-color:#0E5A7A;
      box-shadow:0 4px 10px rgba(14,90,122,0.14);
    }

    .pren-day-top{
      font-size:9px;
      font-weight:600;
      text-transform:capitalize;
      opacity:.92;
      line-height:1.05;
    }

    .pren-day-number{
      font-size:16px;
      font-weight:700;
      line-height:1.05;
      margin-top:1px;
    }

    .pren-day-month{
      font-size:9px;
      font-weight:600;
      text-transform:lowercase;
      opacity:.82;
      line-height:1.05;
    }

    .pren-day-stats{
      margin-top:3px;
      font-size:9px;
      font-weight:500;
      line-height:1.1;
      opacity:.72;
      white-space:nowrap;
    }

    .pren-content{
      padding:8px 8px 94px;
    }

    .pren-kpi-row{
      margin:2px 0 10px;
      padding:10px 12px;
      border-radius:12px;
      background:#ffffff;
      border:1px solid #e5e7eb;
      font-size:13px;
      font-weight:600;
      color:#111827;
      text-align:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.03);
    }

    .pren-list{
      display:flex;
      flex-direction:column;
      gap:5px;
    }

    .pren-empty,
    .pren-loading,
    .pren-error{
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:12px;
      padding:14px 12px;
      text-align:center;
      color:#6b7280;
      font-weight:500;
      font-size:12px;
    }

    .pren-row{
      position:relative;
      display:grid;
      grid-template-columns:44px 26px 1fr auto;
      gap:6px;
      align-items:center;
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:12px;
      padding:7px 8px;
      box-shadow:0 2px 8px rgba(0,0,0,0.04);
      cursor:pointer;
    }

    .pren-time{
      font-size:11px;
      font-weight:600;
      color:#111827;
      text-align:center;
      background:#f3f4f6;
      border-radius:9px;
      min-height:34px;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:0 4px;
      line-height:1;
    }

    .pren-pax{
      font-size:11px;
      font-weight:600;
      color:#111827;
      text-align:center;
    }

    .pren-main{
      min-width:0;
      display:flex;
      align-items:center;
      gap:6px;
    }

    .pren-name{
      min-width:0;
      font-size:12px;
      font-weight:500;
      color:#111827;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .pren-tag{
      flex-shrink:0;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:18px;
      padding:0 6px;
      border-radius:999px;
      font-size:9px;
      font-weight:700;
      white-space:nowrap;
      background:#f3f4f6;
      color:#4b5563;
    }

    .pren-tag.rifiutata{
      background:#f3f4f6;
      color:#4b5563;
    }

    .pren-right{
      display:flex;
      align-items:center;
      gap:4px;
      flex-shrink:0;
    }

    .pren-ico{
      width:24px;
      height:24px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border-radius:8px;
      background:#eef2f7;
      cursor:pointer;
      user-select:none;
      -webkit-tap-highlight-color:transparent;
      font-size:12px;
      color:#374151;
      flex-shrink:0;
    }

    .pren-ico.danger{
      background:#fee2e2;
      color:#991b1b;
    }

    .pren-ico.success{
      background:#dcfce7;
      color:#166534;
    }

    .pren-bottom-nav{
      position:fixed;
      left:50%;
      transform:translateX(-50%);
      bottom:0;
      width:min(100%, 560px);
      background:#ffffff;
      border-top:1px solid #e5e7eb;
      padding:8px 10px calc(8px + env(safe-area-inset-bottom));
      display:flex;
      justify-content:space-between;
      z-index:35;
    }

    .pren-bottom-item{
      border:none;
      background:#0E5A7A;
      color:#ffffff;
      width:52px;
      height:52px;
      border-radius:18px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:24px;
      cursor:pointer;
      box-shadow:0 8px 18px rgba(14,90,122,0.22);
    }

    .pren-bottom-item.secondary{
      background:#eef2f7;
      color:#374151;
      box-shadow:none;
    }

    .hidden-date-input{
      position:fixed;
      left:-9999px;
      top:0;
      width:1px;
      height:1px;
      opacity:0;
    }

    @media (min-width: 768px){
      .pren-content{
        padding:10px 10px 96px;
      }

      .pren-kpi-row{
        text-align:left;
      }
    }
  </style>

  <div class="pren-shell">
    <div class="pren-header">
      <div class="pren-header-top">
        <button type="button" class="pren-icon-btn" id="btn-back-top" aria-label="Torna alle prenotazioni">←</button>

        <div class="pren-header-title">
          <div class="pren-title">${escapeHtml(sedeNome)} · Rifiutate</div>
        </div>

        <button type="button" class="pren-icon-btn" id="btn-refresh" aria-label="Aggiorna">↻</button>
      </div>

      <div class="pren-days-bar">
        <div id="pren-days" class="pren-days"></div>
        <button id="btn-calendar" class="pren-icon-btn" aria-label="Scegli data">📅</button>
      </div>

      <input type="date" id="filtro-data" class="hidden-date-input" />
    </div>

    <div class="pren-content">
      <div id="pren-kpi-row" class="pren-kpi-row">
        0 rifiutate
      </div>

      <div id="lista-prenotazioni" class="pren-list">
        <div class="pren-loading">Caricamento...</div>
      </div>
    </div>
  </div>

  <div class="pren-bottom-nav">
    <button type="button" class="pren-bottom-item secondary" id="btn-back-bottom" aria-label="Torna alle prenotazioni">📋</button>
    <button type="button" class="pren-bottom-item" id="btn-refresh-bottom" aria-label="Aggiorna">↻</button>
  </div>
</div>
`;

  const lista = document.getElementById("lista-prenotazioni");
  const filtroData = document.getElementById("filtro-data");
  const daysContainer = document.getElementById("pren-days");
  const kpiRow = document.getElementById("pren-kpi-row");

  filtroData.value = formatDateInput(today);

  const state = {
    prenotazioni: [],
    daysCenterDate: formatDateInput(today),
    renderedDays: [],
    dayStats: {}
  };

  document.getElementById("btn-refresh").onclick = load;
  document.getElementById("btn-refresh-bottom").onclick = load;
  document.getElementById("btn-back-top").onclick = goPrenotazioni;
  document.getElementById("btn-back-bottom").onclick = goPrenotazioni;

  document.getElementById("btn-calendar").onclick = () => {
    try {
      if (typeof filtroData.showPicker === "function") {
        filtroData.showPicker();
      } else {
        filtroData.focus();
        setTimeout(() => filtroData.click(), 50);
      }
    } catch (e) {
      filtroData.focus();
      setTimeout(() => filtroData.click(), 50);
    }
  };

  filtroData.onchange = async () => {
    state.daysCenterDate = filtroData.value || formatDateInput(today);
    renderDays(true);
    await load();
  };

  renderDays(true);
  attachDayInfiniteScroll();
  await load();

  async function load() {
    lista.innerHTML = `<div class="pren-loading">Caricamento...</div>`;
    await loadDayStats();

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("stato", "rifiutata")
      .order("ora", { ascending: true });

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.eq("sede_id", sedeId);
    }

    if (filtroData.value) {
      query = query.eq("data", filtroData.value);
    }

    const { data, error } = await query;

    if (error) {
      console.error("ERRORE PRENOTAZIONI RIFIUTATE:", error);
      state.prenotazioni = [];
      renderKpiRow();
      lista.innerHTML = `<div class="pren-error">Errore caricamento prenotazioni rifiutate</div>`;
      return;
    }

    state.prenotazioni = Array.isArray(data) ? data : [];
    renderKpiRow();

    if (!state.prenotazioni.length) {
      lista.innerHTML = `<div class="pren-empty">Nessuna prenotazione rifiutata per questa data</div>`;
      return;
    }

    lista.innerHTML = state.prenotazioni.map(renderRow).join("");
    attachEvents();
  }

  async function loadDayStats() {
    if (!state.renderedDays.length) {
      state.dayStats = {};
      renderDays(false);
      return;
    }

    const firstDay = state.renderedDays[0];
    const lastDay = state.renderedDays[state.renderedDays.length - 1];
    const from = formatDateInput(firstDay);
    const to = formatDateInput(lastDay);

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("data,coperti")
      .eq("stato", "rifiutata")
      .gte("data", from)
      .lte("data", to);

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.eq("sede_id", sedeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("ERRORE STATS RIFIUTATE:", error);
      state.dayStats = {};
      renderDays(false);
      return;
    }

    const stats = {};

    (data || []).forEach((p) => {
      if (!p?.data) return;

      if (!stats[p.data]) {
        stats[p.data] = { prenotazioni: 0, coperti: 0 };
      }

      stats[p.data].prenotazioni += 1;
      stats[p.data].coperti += Number(p.coperti) || 0;
    });

    state.dayStats = stats;
    renderDays(false);
  }

  function renderRow(p) {
    const nome = `${p.cliente_nome || ""} ${p.cognome || ""}`.trim() || "Cliente";
    const oraRaw = p.ora || "";
    const ora = oraRaw.length >= 5 ? oraRaw.slice(0, 5) : "--:--";
    const coperti = Number(p.coperti) || 0;

    return `
      <div class="pren-row" data-id="${escapeAttribute(p.id)}">
        <div class="pren-time">${escapeHtml(ora)}</div>
        <div class="pren-pax">${coperti}</div>

        <div class="pren-main">
          <div class="pren-name">${escapeHtml(nome)}</div>
          <span class="pren-tag rifiutata">RIF</span>
        </div>

        <div class="pren-right">
          <span class="pren-ico success" data-riattiva="${escapeAttribute(p.id)}" title="Riattiva">🔄</span>
          <span class="pren-ico danger" data-elimina="${escapeAttribute(p.id)}" title="Elimina">🗑</span>
          <span class="pren-ico" data-dettaglio="${escapeAttribute(p.id)}" title="Apri">⚙️</span>
        </div>
      </div>
    `;
  }

  function attachEvents() {
    lista.querySelectorAll("[data-riattiva]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.stopPropagation();
        const id = btn.dataset.riattiva;
        await updateStato(id, "in_attesa");
      };
    });

    lista.querySelectorAll("[data-elimina]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.stopPropagation();

        const id = btn.dataset.elimina;
        if (!id) return;

        if (!confirm("Eliminare definitivamente?")) return;

        let query = window.supabaseClient
          .from("prenotazioni_tavoli")
          .delete()
          .eq("id", id);

        if (aziendaId) {
          query = query.eq("azienda_id", aziendaId);
        }

        if (sedeId) {
          query = query.eq("sede_id", sedeId);
        }

        const { error } = await query;

        if (error) {
          console.error("ERRORE ELIMINAZIONE RIFIUTATA:", error);
          alert("Errore eliminazione");
          return;
        }

        await load();
      };
    });

    lista.querySelectorAll("[data-dettaglio]").forEach((btn) => {
      btn.onclick = (event) => {
        event.stopPropagation();
        const id = btn.dataset.dettaglio;
        if (!id) return;
        window.location.hash = "#/prenotazioni-dettaglio?id=" + encodeURIComponent(id);
      };
    });

    lista.querySelectorAll(".pren-row").forEach((row) => {
      row.onclick = () => {
        const id = row.dataset.id;
        if (!id) return;
        window.location.hash = "#/prenotazioni-dettaglio?id=" + encodeURIComponent(id);
      };
    });
  }

  async function updateStato(id, stato) {
    if (!id) return;

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .update({ stato })
      .eq("id", id);

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.eq("sede_id", sedeId);
    }

    const { error } = await query;

    if (error) {
      console.error("ERRORE RIATTIVA PRENOTAZIONE:", error);
      alert("Errore aggiornamento");
      return;
    }

    await load();
  }

  function renderDays(centerScroll = false) {
    state.renderedDays = buildVisibleDays(state.daysCenterDate, 28, 28);

    daysContainer.innerHTML = state.renderedDays.map((d) => {
      const value = formatDateInput(d);
      const isActive = value === filtroData.value;
      const stats = state.dayStats[value] || { prenotazioni: 0, coperti: 0 };

      return `
        <button type="button" class="pren-day ${isActive ? "is-active" : ""}" data-day="${escapeAttribute(value)}">
          <div class="pren-day-top">${getDayLabel(d)}</div>
          <div class="pren-day-number">${String(d.getDate()).padStart(2, "0")}</div>
          <div class="pren-day-month">${getMonthLabel(d)}</div>
          <div class="pren-day-stats">${stats.prenotazioni} · ${stats.coperti}</div>
        </button>
      `;
    }).join("");

    daysContainer.querySelectorAll("[data-day]").forEach((btn) => {
      btn.onclick = async () => {
        filtroData.value = btn.dataset.day;
        state.daysCenterDate = filtroData.value;
        renderDays(true);
        await load();
      };
    });

    if (centerScroll) {
      requestAnimationFrame(centerActiveDay);
    }
  }

  function attachDayInfiniteScroll() {
    if (daysContainer.dataset.infiniteBound === "true") return;

    daysContainer.addEventListener("scroll", async () => {
      const threshold = 140;
      const nearLeft = daysContainer.scrollLeft <= threshold;
      const nearRight = daysContainer.scrollLeft + daysContainer.clientWidth >= daysContainer.scrollWidth - threshold;

      if (nearLeft) {
        const center = new Date(state.daysCenterDate);
        center.setDate(center.getDate() - 21);
        state.daysCenterDate = formatDateInput(center);
        renderDays(false);
        requestAnimationFrame(centerActiveDay);
        await loadDayStats();
      } else if (nearRight) {
        const center = new Date(state.daysCenterDate);
        center.setDate(center.getDate() + 21);
        state.daysCenterDate = formatDateInput(center);
        renderDays(false);
        requestAnimationFrame(centerActiveDay);
        await loadDayStats();
      }
    }, { passive: true });

    daysContainer.dataset.infiniteBound = "true";
  }

  function centerActiveDay() {
    const active = daysContainer.querySelector(".pren-day.is-active");
    if (!active) return;
    const left = active.offsetLeft - (daysContainer.clientWidth / 2) + (active.clientWidth / 2);
    daysContainer.scrollLeft = Math.max(0, left);
  }

  function renderKpiRow() {
    const total = state.prenotazioni.length;
    const coperti = state.prenotazioni.reduce((sum, item) => sum + (Number(item.coperti) || 0), 0);
    const label = total === 1 ? "prenotazione rifiutata" : "prenotazioni rifiutate";
    kpiRow.innerHTML = `${coperti} coperti · ${total} ${label}`;
  }

  function buildVisibleDays(centerDateString, before = 28, after = 28) {
    const baseDate = new Date(centerDateString || formatDateInput(today));
    const visible = [];

    for (let i = -before; i <= after; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      visible.push(d);
    }

    return visible;
  }

  function goPrenotazioni() {
    window.location.hash = "#/prenotazioni";
  }

  function getDayLabel(date) {
    const labels = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    return labels[date.getDay()];
  }

  function getMonthLabel(date) {
    const labels = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return labels[date.getMonth()];
  }

  function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
}
