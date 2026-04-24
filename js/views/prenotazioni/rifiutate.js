export async function render(container) {
  const aziendaId = window.state?.azienda?.id || null;
  const sedeId = window.state?.sedeAttiva?.id || null;
  const sedeNome = window.state?.sedeAttiva?.nome || "Prenotazioni rifiutate";

  const today = new Date();

  container.innerHTML = `
<div class="view rifiutate-view">
  <style>
    .rifiutate-view{
      position:relative;
      min-height:100vh;
      background:#f7f9fc;
      padding:0 0 94px;
      overflow:hidden;
    }

    .rif-shell{
      min-height:100%;
      background:linear-gradient(180deg,#ffffff 0%,#f7f9fc 100%);
    }

    .rif-header{
      position:sticky;
      top:0;
      z-index:30;
      background:#ffffff;
      border-bottom:1px solid #e5e7eb;
      padding:8px 10px 8px;
    }

    .rif-header-top{
      display:grid;
      grid-template-columns:36px 1fr 36px;
      align-items:center;
      gap:8px;
      margin-bottom:8px;
    }

    .rif-title{
      text-align:center;
      font-size:14px;
      font-weight:600;
      color:#111827;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .rif-icon-btn{
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
      color:#374151;
    }

    .rif-days-bar{
      display:grid;
      grid-template-columns:1fr 34px;
      gap:6px;
      align-items:center;
    }

    .rif-days{
      display:flex;
      gap:5px;
      overflow-x:auto;
      padding:0 26vw 2px 26vw;
      scrollbar-width:none;
      scroll-behavior:smooth;
    }

    .rif-days::-webkit-scrollbar{
      display:none;
    }

    .rif-day{
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

    .rif-day.is-active{
      background:#0E5A7A;
      color:#ffffff;
      border-color:#0E5A7A;
      box-shadow:0 4px 10px rgba(14,90,122,0.14);
    }

    .rif-day-top{
      font-size:9px;
      font-weight:600;
      text-transform:capitalize;
      opacity:.92;
      line-height:1.05;
    }

    .rif-day-number{
      font-size:16px;
      font-weight:700;
      line-height:1.05;
      margin-top:1px;
    }

    .rif-day-month{
      font-size:9px;
      font-weight:600;
      text-transform:lowercase;
      opacity:.82;
      line-height:1.05;
    }

    .rif-content{
      padding:8px 8px 94px;
    }

    .rif-list{
      display:flex;
      flex-direction:column;
      gap:6px;
    }

    .rif-empty,
    .rif-loading,
    .rif-error{
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:12px;
      padding:14px 12px;
      text-align:center;
      color:#6b7280;
      font-weight:500;
      font-size:12px;
    }

    .rif-card{
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:12px;
      padding:10px;
      box-shadow:0 2px 8px rgba(0,0,0,0.04);
    }

    .rif-card-top{
      display:grid;
      grid-template-columns:44px 26px 1fr auto;
      gap:6px;
      align-items:center;
    }

    .rif-time{
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

    .rif-pax{
      font-size:11px;
      font-weight:600;
      color:#111827;
      text-align:center;
    }

    .rif-main{
      min-width:0;
    }

    .rif-name{
      font-size:12px;
      font-weight:600;
      color:#111827;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .rif-meta{
      margin-top:3px;
      font-size:10px;
      color:#6b7280;
      font-weight:500;
    }

    .rif-tag{
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

    .rif-actions{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:6px;
      margin-top:9px;
    }

    .rif-btn{
      min-height:34px;
      border:none;
      border-radius:10px;
      font-size:11px;
      font-weight:600;
      cursor:pointer;
      padding:0 8px;
    }

    .rif-btn.reactivate{
      background:#dcfce7;
      color:#166534;
    }

    .rif-btn.delete{
      background:#fee2e2;
      color:#991b1b;
    }

    .rif-btn.detail{
      background:#eef2f7;
      color:#374151;
    }

    .rif-date-input{
      position:fixed;
      left:-9999px;
      top:0;
      width:1px;
      height:1px;
      opacity:0;
    }

    .rif-bottom-nav{
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
      gap:8px;
      z-index:35;
    }

    .rif-bottom-btn{
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

    .rif-bottom-btn.secondary{
      background:#eef2f7;
      color:#374151;
      box-shadow:none;
    }

    @media (min-width:768px){
      .rif-content{
        padding:10px 10px 96px;
      }
    }
  </style>

  <div class="rif-shell">
    <div class="rif-header">
      <div class="rif-header-top">
        <button type="button" id="btn-back-prenotazioni-top" class="rif-icon-btn" aria-label="Torna alle prenotazioni">←</button>
        <div class="rif-title">${escapeHtml(sedeNome)} · Rifiutate</div>
        <button type="button" id="btn-refresh" class="rif-icon-btn" aria-label="Aggiorna">↻</button>
      </div>

      <div class="rif-days-bar">
        <div id="rif-days" class="rif-days"></div>
        <button type="button" id="btn-calendar" class="rif-icon-btn" aria-label="Scegli data">📅</button>
      </div>

      <input type="date" id="filtro-data" class="rif-date-input" />
    </div>

    <div class="rif-content">
      <div id="lista" class="rif-list">
        <div class="rif-loading">Caricamento...</div>
      </div>
    </div>
  </div>

  <div class="rif-bottom-nav">
    <button type="button" id="btn-back-prenotazioni" class="rif-bottom-btn secondary" aria-label="Torna alle prenotazioni">📋</button>
    <button type="button" id="btn-refresh-bottom" class="rif-bottom-btn" aria-label="Aggiorna">↻</button>
  </div>
</div>
`;

  const lista = document.getElementById("lista");
  const filtroData = document.getElementById("filtro-data");
  const daysContainer = document.getElementById("rif-days");

  filtroData.value = formatDateInput(today);

  const state = {
    prenotazioni: [],
    daysCenterDate: formatDateInput(today),
    renderedDays: []
  };

  document.getElementById("btn-refresh").onclick = load;
  document.getElementById("btn-refresh-bottom").onclick = load;

  document.getElementById("btn-back-prenotazioni").onclick = goPrenotazioni;
  document.getElementById("btn-back-prenotazioni-top").onclick = goPrenotazioni;

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

  async function load() {
    lista.innerHTML = `<div class="rif-loading">Caricamento...</div>`;

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
      lista.innerHTML = `<div class="rif-error">Errore caricamento prenotazioni rifiutate</div>`;
      return;
    }

    state.prenotazioni = Array.isArray(data) ? data : [];

    if (!state.prenotazioni.length) {
      lista.innerHTML = `<div class="rif-empty">Nessuna prenotazione rifiutata per questa data</div>`;
      return;
    }

    lista.innerHTML = state.prenotazioni.map(renderRow).join("");
    attachEvents();
  }

  function renderRow(p) {
    const nome = `${p.cliente_nome || ""} ${p.cognome || ""}`.trim() || "Cliente";
    const oraRaw = p.ora || "";
    const ora = oraRaw.length >= 5 ? oraRaw.slice(0, 5) : "--:--";
    const coperti = Number(p.coperti) || 0;
    const data = p.data ? formatDateHuman(p.data) : "Data non disponibile";

    return `
      <div class="rif-card" data-id="${escapeAttribute(p.id)}">
        <div class="rif-card-top">
          <div class="rif-time">${escapeHtml(ora)}</div>
          <div class="rif-pax">${coperti}</div>

          <div class="rif-main">
            <div class="rif-name">${escapeHtml(nome)}</div>
            <div class="rif-meta">${escapeHtml(data)}</div>
          </div>

          <div class="rif-tag">RIF</div>
        </div>

        <div class="rif-actions">
          <button type="button" class="rif-btn reactivate" data-riattiva="${escapeAttribute(p.id)}">🔄 Riattiva</button>
          <button type="button" class="rif-btn delete" data-elimina="${escapeAttribute(p.id)}">🗑 Elimina</button>
          <button type="button" class="rif-btn detail" data-dettaglio="${escapeAttribute(p.id)}">Apri</button>
        </div>
      </div>
    `;
  }

  function attachEvents() {
    lista.querySelectorAll("[data-riattiva]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.riattiva;
        await updateStato(id, "in_attesa");
      };
    });

    lista.querySelectorAll("[data-elimina]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.elimina;

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
      btn.onclick = () => {
        const id = btn.dataset.dettaglio;
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

      return `
        <button type="button" class="rif-day ${isActive ? "is-active" : ""}" data-day="${escapeAttribute(value)}">
          <div class="rif-day-top">${getDayLabel(d)}</div>
          <div class="rif-day-number">${String(d.getDate()).padStart(2, "0")}</div>
          <div class="rif-day-month">${getMonthLabel(d)}</div>
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

    daysContainer.addEventListener("scroll", () => {
      const threshold = 140;
      const nearLeft = daysContainer.scrollLeft <= threshold;
      const nearRight = daysContainer.scrollLeft + daysContainer.clientWidth >= daysContainer.scrollWidth - threshold;

      if (nearLeft) {
        const center = new Date(state.daysCenterDate);
        center.setDate(center.getDate() - 21);
        state.daysCenterDate = formatDateInput(center);
        renderDays(false);
        requestAnimationFrame(centerActiveDay);
      } else if (nearRight) {
        const center = new Date(state.daysCenterDate);
        center.setDate(center.getDate() + 21);
        state.daysCenterDate = formatDateInput(center);
        renderDays(false);
        requestAnimationFrame(centerActiveDay);
      }
    }, { passive: true });

    daysContainer.dataset.infiniteBound = "true";
  }

  function centerActiveDay() {
    const active = daysContainer.querySelector(".rif-day.is-active");
    if (!active) return;
    const left = active.offsetLeft - (daysContainer.clientWidth / 2) + (active.clientWidth / 2);
    daysContainer.scrollLeft = Math.max(0, left);
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

  function formatDateHuman(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
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

  await load();
}
