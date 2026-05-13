export async function render(container) {
  const aziendaId = window.state?.azienda?.id || null;
  const sedeId = window.state?.sedeAttiva?.id || null;
  const sedeNome = window.state?.sedeAttiva?.nome || "Prenotazioni";

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

    .pren-badge{
      position:absolute;
      top:-4px;
      right:-4px;
      min-width:16px;
      height:16px;
      padding:0 4px;
      border-radius:999px;
      background:#dc2626;
      color:#ffffff;
      font-size:9px;
      font-weight:700;
      display:none;
      align-items:center;
      justify-content:center;
      box-shadow:0 2px 6px rgba(220,38,38,0.24);
      border:2px solid #ffffff;
    }

    .pren-badge.show{
      display:flex;
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

    .pren-day.is-active .pren-day-stats{
      opacity:.84;
    }

    .pren-calendar-btn{
      width:34px;
      height:34px;
      border:none;
      border-radius:10px;
      background:#eef2f7;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:15px;
      cursor:pointer;
      color:#374151;
    }

    .pren-content{
      padding:8px 8px 94px;
    }

    .pren-tabs{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:6px;
      margin-bottom:8px;
    }

    .pren-tab{
      border:none;
      border-radius:12px;
      padding:8px 6px;
      background:#ffffff;
      border:1px solid #e5e7eb;
      font-size:11px;
      font-weight:500;
      cursor:pointer;
      color:#374151;
    }

    .pren-tab.active{
      background:#0E5A7A;
      color:#ffffff;
      border-color:#0E5A7A;
    }

    .pren-tools{
      display:flex;
      gap:6px;
      align-items:center;
      margin-bottom:8px;
      overflow-x:auto;
      scrollbar-width:none;
    }

    .pren-tools::-webkit-scrollbar{
      display:none;
    }

    .pren-tool-select,
    .pren-tool-btn{
      height:34px;
      border-radius:10px;
      border:1px solid #e5e7eb;
      background:#ffffff;
      font-size:11px;
      font-weight:500;
      color:#1f2937;
    }

    .pren-tool-select{
      min-width:124px;
      padding:0 10px;
      cursor:pointer;
    }

    .pren-tool-btn{
      min-width:34px;
      padding:0 10px;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
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

    .pren-kpi-row .muted{
      color:#6b7280;
      font-weight:600;
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

    .pren-row-wrap{
      position:relative;
      overflow:hidden;
      border-radius:12px;
    }

    .pren-row-bg{
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:0 12px;
      font-size:11px;
      font-weight:700;
      color:#ffffff;
      pointer-events:none;
      opacity:0;
      transition:opacity .18s ease;
    }

    .pren-row-bg.arrivata{
      background:#16a34a;
    }

    .pren-row-bg.no-show{
      background:#dc2626;
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
      transform:translateX(0);
      transition:transform .18s ease;
      touch-action:pan-y;
      will-change:transform;
      cursor:pointer;
    }

    .pren-row.is-dragging{
      transition:none;
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
      cursor:pointer;
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

    .pren-tag.arrivata{
      background:#dcfce7;
      color:#166534;
    }

    .pren-tag.no_show{
      background:#fee2e2;
      color:#991b1b;
    }

    .pren-tag.in_attesa{
      background:#fef3c7;
      color:#92400e;
    }

    .pren-tag.confermata{
      background:#dbeafe;
      color:#1d4ed8;
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

    .pren-ico.channel{
      cursor:default;
      background:#f3f4f6;
    }

    .pren-modal{
      position:fixed;
      inset:0;
      background:rgba(17,24,39,0.42);
      display:none;
      align-items:flex-end;
      z-index:50;
    }

    .pren-modal.open{
      display:flex;
    }

    .pren-modal-box{
      width:100%;
      max-height:84vh;
      overflow:auto;
      background:#ffffff;
      border-radius:22px 22px 0 0;
      padding:14px 12px calc(16px + env(safe-area-inset-bottom));
    }

    .pren-modal-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      margin-bottom:10px;
    }

    .pren-modal-title{
      font-size:14px;
      font-weight:600;
      color:#111827;
    }

    .pren-modal-close{
      border:none;
      background:#eef2f7;
      width:34px;
      height:34px;
      border-radius:10px;
      font-size:16px;
      cursor:pointer;
    }

    .pren-table-list,
    .pren-online-list,
    .pren-arrivi-list{
      display:flex;
      flex-direction:column;
      gap:8px;
    }

    .pren-table-item,
    .pren-online-item,
    .pren-slot-card{
      border:1px solid #e5e7eb;
      border-radius:14px;
      padding:10px;
      background:#ffffff;
    }

    .pren-table-item.best{
      border-color:#16a34a;
      background:#f0fdf4;
    }

    .pren-table-item.good{
      border-color:#f59e0b;
      background:#fffbeb;
    }

    .pren-table-name,
    .pren-online-name,
    .pren-slot-time{
      font-size:13px;
      font-weight:600;
      color:#111827;
    }

    .pren-table-meta,
    .pren-online-meta{
      margin-top:4px;
      font-size:11px;
      color:#4b5563;
      font-weight:500;
    }

    .pren-table-badge{
      margin-top:6px;
      font-size:10px;
      font-weight:600;
    }

    .pren-online-top{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:8px;
    }

    .pren-online-status{
      display:inline-flex;
      align-items:center;
      gap:5px;
      border-radius:999px;
      padding:5px 8px;
      font-size:10px;
      font-weight:600;
      white-space:nowrap;
    }

    .pren-online-note{
      margin-top:8px;
      font-size:11px;
      color:#4b5563;
      background:#f8fafc;
      border-radius:10px;
      padding:8px 9px;
      line-height:1.4;
      font-weight:400;
    }

    .pren-online-actions{
      margin-top:10px;
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:6px;
    }

    .pren-online-btn{
      min-height:34px;
      border:none;
      border-radius:10px;
      font-size:11px;
      font-weight:600;
      cursor:pointer;
      padding:0 8px;
    }

    .pren-online-btn.accept{
      background:#dcfce7;
      color:#166534;
    }

    .pren-online-btn.reject{
      background:#fee2e2;
      color:#991b1b;
    }

    .pren-online-btn.manage{
      background:#eef2f7;
      color:#374151;
    }

    .pren-arrivi-toolbar{
      display:flex;
      justify-content:flex-end;
      margin-bottom:8px;
    }

    .pren-slot-select{
      height:34px;
      border-radius:10px;
      border:1px solid #e5e7eb;
      background:#ffffff;
      font-size:11px;
      font-weight:500;
      color:#1f2937;
      padding:0 10px;
    }

    .pren-slot-time{
      margin-bottom:8px;
    }

    .pren-slot-list{
      display:flex;
      flex-direction:column;
      gap:6px;
    }

    .pren-slot-row{
      display:grid;
      grid-template-columns:42px 22px 1fr auto;
      gap:6px;
      align-items:center;
      background:#f8fafc;
      border:1px solid #eef2f7;
      border-radius:10px;
      padding:6px 7px;
      font-size:11px;
      color:#111827;
    }

    .pren-slot-pax{
      text-align:center;
      font-weight:600;
    }

    .pren-slot-name{
      min-width:0;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      font-weight:500;
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
      justify-content:flex-end;
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
      font-size:26px;
      cursor:pointer;
      box-shadow:0 8px 18px rgba(14,90,122,0.22);
    }

    @media (min-width: 768px){
      .pren-content{
        padding:10px 10px 96px;
      }

      .pren-kpi-row{
        text-align:left;
      }

      .pren-modal{
        align-items:center;
        justify-content:center;
        padding:20px;
      }

      .pren-modal-box{
        max-width:620px;
        border-radius:22px;
        max-height:82vh;
      }
    }
  </style>

  <div class="pren-shell">
    <div class="pren-header">
      <div class="pren-header-top">
        <div></div>

        <div class="pren-header-title">
          <div class="pren-title">${escapeHtml(sedeNome)}</div>
        </div>

        <button id="pren-online-trigger" class="pren-icon-btn" aria-label="Prenotazioni online">
          🌐
          <span id="pren-online-badge" class="pren-badge">0</span>
        </button>
        
      </div>

      <div class="pren-days-bar">
        <div id="pren-days" class="pren-days"></div>
        <button id="btn-calendar" class="pren-calendar-btn" aria-label="Scegli data">📅</button>
      </div>
    </div>

    <div class="pren-content">
      <div class="pren-tabs">
        <button type="button" class="pren-tab active" id="tab-prenotazioni">Prenotazioni</button>
        <button type="button" class="pren-tab" id="tab-arrivi">Arrivi</button>
        <button type="button" class="pren-tab" id="tab-piantina">Piantina sala</button>
      </div>

      <div class="pren-tools">
        <select id="filtro-servizio" class="pren-tool-select">
          <option value="">Tutti i servizi</option>
          <option value="colazione">☕ Colazione</option>
          <option value="aperitivo">🍸 Aperitivo</option>
          <option value="pranzo">🌞 Pranzo</option>
          <option value="cena">🌙 Cena</option>
        </select>
<button id="pren-richieste-trigger" class="pren-tool-btn">📂 Fila-Fast</button>
        <button type="button" class="pren-tool-btn" id="btn-refresh" title="Aggiorna">↻</button>

        <input type="date" id="filtro-data" style="display:none" />
      </div>

      <div id="pren-kpi-row" class="pren-kpi-row">
        <span class="muted">0 coperti · 0 prenotazioni</span>
      </div>

      <div id="lista-prenotazioni" class="pren-list">
        <div class="pren-loading">Caricamento...</div>
      </div>
    </div>
  </div>

  <div id="modal-tavoli" class="pren-modal">
    <div class="pren-modal-box">
      <div class="pren-modal-head">
        <div class="pren-modal-title">Assegna tavolo</div>
        <button type="button" class="pren-modal-close" id="close-modal">✕</button>
      </div>
      <div id="lista-tavoli" class="pren-table-list"></div>
    </div>
  </div>

  <div id="modal-online" class="pren-modal">
    <div class="pren-modal-box">
      <div class="pren-modal-head">
        <div class="pren-modal-title">Prenotazioni online</div>
        <button type="button" class="pren-modal-close" id="close-online-modal">✕</button>
      </div>
      <div id="lista-online" class="pren-online-list">
        <div class="pren-loading">Caricamento...</div>
      </div>
    </div>
  </div>

  <div id="modal-arrivi" class="pren-modal">
    <div class="pren-modal-box">
      <div class="pren-modal-head">
        <div class="pren-modal-title">Arrivi</div>
        <button type="button" class="pren-modal-close" id="close-arrivi-modal">✕</button>
      </div>
      <div class="pren-arrivi-toolbar">
        <select id="arrivi-slot-size" class="pren-slot-select">
          <option value="15">Fasce 15 min</option>
          <option value="30" selected>Fasce 30 min</option>
          <option value="60">Fasce 60 min</option>
        </select>
      </div>
      <div id="lista-arrivi" class="pren-arrivi-list"></div>
    </div>
  </div>

  <div class="pren-bottom-nav">
    <button type="button" class="pren-bottom-item" id="footer-new" aria-label="Nuova prenotazione">+</button>
  </div>
</div>
`;

  const lista = document.getElementById("lista-prenotazioni");
  const filtroData = document.getElementById("filtro-data");
  const filtroServizio = document.getElementById("filtro-servizio");
  const modal = document.getElementById("modal-tavoli");
  const listaTavoli = document.getElementById("lista-tavoli");
  const onlineModal = document.getElementById("modal-online");
  const listaOnline = document.getElementById("lista-online");
  const arriviModal = document.getElementById("modal-arrivi");
  const listaArrivi = document.getElementById("lista-arrivi");
  // 🔔 AUDIO NOTIFICA PRENOTAZIONI ONLINE
const notificationAudio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
notificationAudio.volume = 0.6;
  const slotSizeSelect = document.getElementById("arrivi-slot-size");
  const daysContainer = document.getElementById("pren-days");
  const onlineBadge = document.getElementById("pren-online-badge");
  const kpiRow = document.getElementById("pren-kpi-row");

  const today = new Date();
  filtroData.value = formatDateInput(today);

  const state = {
  prenotazioni: [],
  tavoli: [],
  onlineRequests: [],
  lastOnlineCount: 0, // 👈 QUI
  currentPrenId: null,
  daysCenterDate: formatDateInput(today),
  renderedDays: [],
  dayStats: {}
};

  renderDays(true);
  attachDayInfiniteScroll();

  document.getElementById("btn-refresh").onclick = async () => {
    await load();
    await loadOnlineRequests();
  };

  document.getElementById("footer-new").onclick = () => {
    window.location.hash = "#/prenotazioni-form";
  };

  document.getElementById("tab-prenotazioni").onclick = () => {};
  document.getElementById("tab-arrivi").onclick = () => {
    openArriviModal();
  };
  document.getElementById("tab-piantina").onclick = () => {
    window.location.hash = "#/sala";
  };

  document.getElementById("pren-online-trigger").onclick = async () => {
    await openOnlineModal();
  };
const richiesteBtn = document.getElementById("pren-richieste-trigger");
  if (richiesteBtn) {
    richiesteBtn.onclick = () => {
      window.location.hash = "#/prenotazioni-rifiutate";
    };
  }
  document.getElementById("btn-calendar").onclick = () => {
    try {
      if (typeof filtroData.showPicker === "function") {
        filtroData.showPicker();
      } else {
        throw new Error("showPicker non disponibile");
      }
    } catch (e) {
      filtroData.focus();
      filtroData.click();
    }
  };

  filtroData.onchange = async () => {
    state.daysCenterDate = filtroData.value || formatDateInput(today);
    syncActiveDayFromInput(true);
    await load();
  };

  filtroServizio.onchange = async () => {
    await load();
  };

  document.getElementById("close-modal").onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  document.getElementById("close-online-modal").onclick = closeOnlineModal;
  onlineModal.onclick = (e) => {
    if (e.target === onlineModal) closeOnlineModal();
  };

  document.getElementById("close-arrivi-modal").onclick = closeArriviModal;
  arriviModal.onclick = (e) => {
    if (e.target === arriviModal) closeArriviModal();
  };

  slotSizeSelect.onchange = () => {
    renderArriviSlots();
  };

  async function load() {
    lista.innerHTML = `<div class="pren-loading">Caricamento...</div>`;
    renderKpiRow();

    await loadDayStats();

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*");

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.or(`sede_id.eq.${sedeId},sede_id.is.null`);
    }

    if (filtroData.value) {
      query = query.eq("data", filtroData.value);
    }

    query = query.order("ora", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("ERRORE PRENOTAZIONI:", error);
      lista.innerHTML = `<div class="pren-error">Errore caricamento prenotazioni</div>`;
      state.prenotazioni = [];
      renderKpiRow();
      return;
    }

    let prenotazioni = Array.isArray(data) ? data : [];

    if (!prenotazioni.length) {
      let fallbackQuery = window.supabaseClient
        .from("prenotazioni_tavoli")
        .select("*")
        .order("ora", { ascending: true });

      if (aziendaId) {
        fallbackQuery = fallbackQuery.eq("azienda_id", aziendaId);
      }

      if (sedeId) {
        fallbackQuery = fallbackQuery.or(`sede_id.eq.${sedeId},sede_id.is.null`);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        console.error("ERRORE FALLBACK PRENOTAZIONI:", fallbackError);
      } else {
        prenotazioni = (fallbackData || []).filter((p) => {
          return !filtroData.value || p.data === filtroData.value;
        });
      }
    }

    prenotazioni = applyServiceFilter(prenotazioni);
    prenotazioni = filterMainListPrenotazioni(prenotazioni);

    state.prenotazioni = prenotazioni;
    renderKpiRow();

    if (!prenotazioni.length) {
      lista.innerHTML = `<div class="pren-empty">Nessuna prenotazione per i filtri selezionati</div>`;
      return;
    }

    lista.innerHTML = prenotazioni.map(renderRow).join("");
    attachRowEvents();
    attachSwipe();
  }

  async function loadDayStats() {
    if (!state.renderedDays.length) {
      state.dayStats = {};
      renderKpiRow();
      return;
    }

    const firstDay = state.renderedDays[0];
    const lastDay = state.renderedDays[state.renderedDays.length - 1];
    const from = formatDateInput(firstDay);
    const to = formatDateInput(lastDay);

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .gte("data", from)
      .lte("data", to);

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.or(`sede_id.eq.${sedeId},sede_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("ERRORE STATS GIORNI PRENOTAZIONI:", error);
      state.dayStats = {};
      renderDays(false);
      renderKpiRow();
      return;
    }

    const stats = {};

    (data || []).forEach((p) => {
      if (!p?.data) return;
      if (!isMainVisibleStatus(p.stato)) return;

      if (filtroServizio.value && inferService(p) !== filtroServizio.value) {
        return;
      }

      const key = p.data;
      if (!stats[key]) {
        stats[key] = { prenotazioni: 0, coperti: 0 };
      }

      stats[key].prenotazioni += 1;
      stats[key].coperti += Number(p.coperti) || 0;
    });

    state.dayStats = stats;
    renderDays(false);
    renderKpiRow();
  }

  async function loadOnlineRequests() {
    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("stato", "in_attesa")
      .order("created_at", { ascending: false });

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.or(`sede_id.eq.${sedeId},sede_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("ERRORE CARICAMENTO PRENOTAZIONI ONLINE:", error);
      state.onlineRequests = [];
      updateOnlineBadge();

      if (onlineModal.classList.contains("open")) {
        listaOnline.innerHTML = `<div class="pren-error">Errore caricamento richieste online</div>`;
      }
      return;
    }

   const prevCount = state.lastOnlineCount || 0;

state.onlineRequests = (data || []).filter((item) => isOnlinePendingStatus(item.stato));

const newCount = state.onlineRequests.length;

// 🔔 NUOVA PRENOTAZIONE
if (newCount > prevCount) {
  try {
    notificationAudio.currentTime = 0;
    notificationAudio.play();
  } catch (e) {
    console.warn("Audio bloccato");
  }

  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}

state.lastOnlineCount = newCount;

updateOnlineBadge();

if (onlineModal.classList.contains("open")) {
  renderOnlineRequests();
}
  }

  function applyServiceFilter(prenotazioni) {
    const servizio = filtroServizio.value;
    if (!servizio) return prenotazioni;
    return prenotazioni.filter((p) => inferService(p) === servizio);
  }

  function filterMainListPrenotazioni(prenotazioni) {
    return prenotazioni.filter((p) => isMainVisibleStatus(p.stato));
  }

  function isMainVisibleStatus(stato) {
    const value = normalizeStatus(stato);
    return value === "confermata" || value === "arrivata";
  }

 function normalizeStatus(stato) {

  return String(stato || "")
    .trim()
    .toLowerCase()
    .replace("-", "_");

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

  function renderDays(centerScroll = false) {
    state.renderedDays = buildVisibleDays(state.daysCenterDate, 28, 28);

    daysContainer.innerHTML = state.renderedDays.map((d) => {
      const value = formatDateInput(d);
      const isActive = value === filtroData.value;
      const stats = state.dayStats[value] || { prenotazioni: 0, coperti: 0 };

      return `
        <button type="button" class="pren-day ${isActive ? "is-active" : ""}" data-day="${value}">
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
        syncActiveDayFromInput(true);
        await load();
      };
    });

    if (centerScroll) {
      requestAnimationFrame(() => {
        centerActiveDay();
      });
    }
  }

  function renderKpiRow() {
    const stats = getSelectedDayStats();
    const copertiLabel = stats.coperti === 1 ? "coperto" : "coperti";
    const prenLabel = stats.prenotazioni === 1 ? "prenotazione" : "prenotazioni";
    kpiRow.innerHTML = `${stats.coperti} ${copertiLabel} · ${stats.prenotazioni} ${prenLabel}`;
  }

  function getSelectedDayStats() {
    const selectedDate = filtroData.value || formatDateInput(today);
    const fromState = state.dayStats[selectedDate];

    if (fromState) {
      return {
        prenotazioni: Number(fromState.prenotazioni) || 0,
        coperti: Number(fromState.coperti) || 0
      };
    }

    const filtered = (state.prenotazioni || []).filter((p) => p.data === selectedDate);

    return {
      prenotazioni: filtered.length,
      coperti: filtered.reduce((sum, item) => sum + (Number(item.coperti) || 0), 0)
    };
  }

  function centerActiveDay() {
    const active = daysContainer.querySelector(".pren-day.is-active");
    if (!active) return;
    const left = active.offsetLeft - (daysContainer.clientWidth / 2) + (active.clientWidth / 2);
    daysContainer.scrollLeft = Math.max(0, left);
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

  function syncActiveDayFromInput(centerScroll = false) {
    renderDays(centerScroll);
    renderKpiRow();
  }

  function renderRow(p) {
    const nome = buildClientName(p);
    const coperti = Number(p.coperti) || 0;
    const oraRaw = p.ora || "";
    const ora = oraRaw.length >= 5 ? oraRaw.slice(0, 5) : (oraRaw || "--:--");
    const noteFull = p.note || "";
    const telefono = p.cliente_telefono || "";
    const channelIcon = getOriginIcon(p);
    const tag = renderStatusTag(p.stato);

    return `
      <div class="pren-row-wrap" data-id="${escapeAttribute(p.id)}">
        <div class="pren-row-bg arrivata">
          <span></span>
          <span>ARRIVATO</span>
        </div>
        <div class="pren-row-bg no-show">
          <span>NO SHOW</span>
          <span></span>
        </div>

        <div class="pren-row" data-id="${escapeAttribute(p.id)}">
          <div class="pren-time">${escapeHtml(ora)}</div>
          <div class="pren-pax">${coperti}</div>

          <div class="pren-main">
            <div class="pren-name cliente-link" data-id="${escapeAttribute(p.contatto_id || "")}">
              ${escapeHtml(nome)}
            </div>
            ${tag}
          </div>

          <div class="pren-right">
            ${noteFull ? `<span class="pren-ico note" data-note="${escapeAttribute(noteFull)}">📝</span>` : ""}

            ${telefono
              ? `<span class="pren-ico whatsapp" data-phone="${escapeAttribute(telefono)}" data-id="${escapeAttribute(p.id)}">💬</span>`
              : `<span class="pren-ico msg" data-id="${escapeAttribute(p.id)}">💬</span>`
            }

            <span class="pren-ico settings" data-id="${escapeAttribute(p.id)}">⚙️</span>

            <span class="pren-ico channel" title="${escapeAttribute(getOriginLabel(p))}">
              ${channelIcon}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function renderStatusTag(stato) {
    const value = normalizeStatus(stato);

    if (value === "in_attesa") {
      return `<span class="pren-tag in_attesa">ATT</span>`;
    }

    if (value === "confermata") {
      return `<span class="pren-tag confermata">CONF</span>`;
    }

    if (value === "arrivata") {
      return `<span class="pren-tag arrivata">ARR</span>`;
    }

    if (value === "no_show") {
      return `<span class="pren-tag no_show">NO SHOW</span>`;
    }

    if (value === "rifiutata") {
      return `<span class="pren-tag rifiutata">RIF</span>`;
    }

    return ``;
  }

  function attachRowEvents() {
    lista.querySelectorAll(".cliente-link").forEach((el) => {
      el.onclick = (event) => {
        event.stopPropagation();
        event.preventDefault();

        const id = el.dataset.id;

        if (!id || id === "null" || id === "undefined") {
          alert("Cliente non collegato");
          return;
        }

        window.location.hash = "#/contatti-dettaglio?id=" + encodeURIComponent(id);
      };
    });

    lista.querySelectorAll(".note").forEach((el) => {
      el.onclick = (event) => {
        event.stopPropagation();
        alert(el.dataset.note || "Nessuna nota");
      };
    });

    lista.querySelectorAll(".whatsapp").forEach((el) => {
      el.onclick = (event) => {
        event.stopPropagation();

        const phone = el.dataset.phone || "";
        const id = el.dataset.id || "";
        if (!phone) return;

        const pren = state.prenotazioni.find((p) => String(p.id) === String(id));
        const nome = buildClientName(pren || {});
        const data = pren?.data ? formatDateHuman(pren.data) : "";
        const ora = pren?.ora ? String(pren.ora).slice(0, 5) : "";
        const coperti = pren?.coperti || 0;

        const text = encodeURIComponent(
          `Ciao ${nome}, ti confermiamo la prenotazione per ${coperti} persone${data ? ` il ${data}` : ""}${ora ? ` alle ${ora}` : ""}.`
        );

        window.open(`https://wa.me/${sanitizePhone(phone)}?text=${text}`, "_blank");
      };
    });

    lista.querySelectorAll(".msg").forEach((el) => {
      el.onclick = (event) => {
        event.stopPropagation();
        const id = el.dataset.id;
        if (!id) return;
        window.location.hash = "#/prenotazioni-dettaglio?id=" + encodeURIComponent(id);
      };
    });

    lista.querySelectorAll(".settings").forEach((el) => {
      el.onclick = (event) => {
        event.stopPropagation();
        event.preventDefault();

        const id = el.dataset.id;
        if (!id) return;

        window.location.hash = "#/prenotazioni-dettaglio?id=" + encodeURIComponent(id);
      };
    });

    lista.querySelectorAll(".pren-row").forEach((row) => {
      row.onclick = (event) => {
        if (event.target.closest(".pren-ico")) return;
        if (event.target.closest(".cliente-link")) return;

        const id = row.dataset.id;
        if (!id) return;

        window.location.hash = "#/prenotazioni-dettaglio?id=" + encodeURIComponent(id);
      };
    });
  }

  function attachSwipe() {
    lista.querySelectorAll(".pren-row-wrap").forEach((wrap) => {
      const row = wrap.querySelector(".pren-row");
      if (!row || row.dataset.swipeBound === "true") return;

      let startX = 0;
      let currentX = 0;
      let active = false;
      let isHorizontal = false;
      let startY = 0;

      const bgArrivata = wrap.querySelector(".pren-row-bg.arrivata");
      const bgNoShow = wrap.querySelector(".pren-row-bg.no-show");

      const resetSwipe = () => {
        row.classList.remove("is-dragging");
        row.style.transform = "translateX(0px)";
        bgArrivata.style.opacity = "0";
        bgNoShow.style.opacity = "0";
        currentX = 0;
        active = false;
        isHorizontal = false;
      };

      row.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const target = event.target;
        if (target && target.closest(".pren-ico, .cliente-link")) {
          active = false;
          return;
        }

        active = true;
        isHorizontal = false;
        startX = event.clientX;
        startY = event.clientY;
        currentX = 0;
        row.classList.add("is-dragging");
        row.setPointerCapture?.(event.pointerId);
      });

      row.addEventListener("pointermove", (event) => {
        if (!active) return;

        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;

        if (!isHorizontal) {
          if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
            resetSwipe();
            return;
          }

          if (Math.abs(deltaX) > 6) {
            isHorizontal = true;
          }
        }

        currentX = deltaX;
        if (currentX > 110) currentX = 110;
        if (currentX < -110) currentX = -110;

        row.style.transform = `translateX(${currentX}px)`;

        if (currentX > 0) {
          bgArrivata.style.opacity = "1";
          bgNoShow.style.opacity = "0";
        } else if (currentX < 0) {
          bgArrivata.style.opacity = "0";
          bgNoShow.style.opacity = "1";
        } else {
          bgArrivata.style.opacity = "0";
          bgNoShow.style.opacity = "0";
        }
      });

      const handleSwipeEnd = async () => {
        if (!active) return;

        row.classList.remove("is-dragging");

        if (currentX >= 80) {
          bgArrivata.style.opacity = "1";
          bgNoShow.style.opacity = "0";
          row.style.transform = "translateX(100%)";

          setTimeout(async () => {
            await updateStatoPrenotazione(row.dataset.id, "arrivata");
          }, 120);
        } else if (currentX <= -80) {
          bgArrivata.style.opacity = "0";
          bgNoShow.style.opacity = "1";
          row.style.transform = "translateX(-100%)";

          setTimeout(async () => {
            await updateStatoPrenotazione(row.dataset.id, "no_show");
          }, 120);
        } else {
          resetSwipe();
        }

        active = false;
        isHorizontal = false;
        currentX = 0;
      };

      row.addEventListener("pointerup", handleSwipeEnd);
      row.addEventListener("pointercancel", resetSwipe);
      row.addEventListener("lostpointercapture", () => {
        if (active && Math.abs(currentX) < 80) {
          resetSwipe();
        }
      });

      row.dataset.swipeBound = "true";
    });
  }

  async function updateStatoPrenotazione(id, stato) {
    const normalizedStatus = normalizeStatus(stato);

    if (!["in_attesa", "confermata", "arrivata", "rifiutata", "no_show"].includes(normalizedStatus)) {
      alert("Stato non valido");
      return;
    }

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .update({ stato: normalizedStatus })
      .eq("id", id);

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.or(`sede_id.eq.${sedeId},sede_id.is.null`);
    }

    const { error } = await query;

    if (error) {
      console.error("ERRORE UPDATE STATO:", error);
      alert("Errore aggiornamento stato");
      await load();
      return;
    }

    await load();
    await loadOnlineRequests();

    if (arriviModal.classList.contains("open")) {
      renderArriviSlots();
    }
  }

  async function openTavoli(prenId) {
    state.currentPrenId = prenId;

    let query = window.supabaseClient
      .from("tavoli")
      .select("*")
      .eq("attivo", true);

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.or(`sede_id.eq.${sedeId},sede_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("ERRORE TAVOLI:", error);
      alert("Errore caricamento tavoli");
      return;
    }

    state.tavoli = data || [];
    renderTavoli();
    modal.classList.add("open");
  }

  function renderTavoli() {
    const pren = state.prenotazioni.find((p) => String(p.id) === String(state.currentPrenId));

    if (!pren) {
      listaTavoli.innerHTML = `<div class="pren-empty">Errore prenotazione</div>`;
      return;
    }

    const copertiRichiesti = Number(pren.coperti) || 0;

    const tavoliOrdinati = [...state.tavoli]
      .map((t) => ({
        ...t,
        diff: (Number(t.coperti_max) || 0) - copertiRichiesti
      }))
      .filter((t) => (Number(t.coperti_max) || 0) >= copertiRichiesti)
      .sort((a, b) => a.diff - b.diff);

    if (!tavoliOrdinati.length) {
      listaTavoli.innerHTML = `
      <div class="pren-empty">
        ⚠️ Nessun tavolo abbastanza grande<br>
        Coperti richiesti: <strong>${copertiRichiesti}</strong>
      </div>
    `;
      return;
    }

    listaTavoli.innerHTML = tavoliOrdinati.map((t) => {
      const perfetto = t.diff === 0;
      const buono = t.diff > 0 && t.diff <= 2;

      let classe = "pren-table-item";
      let badge = "";

      if (perfetto) {
        classe += " best";
        badge = "🔥 Perfetto";
      } else if (buono) {
        classe += " good";
        badge = "👍 Buono";
      }

      return `
      <div class="${classe}" data-id="${escapeAttribute(t.id)}">
        <div class="pren-table-name">${escapeHtml(t.nome || "Tavolo")}</div>
        <div class="pren-table-meta">${Number(t.coperti_max) || 0} coperti max</div>
        <div class="pren-table-meta">Differenza: +${t.diff}</div>
        ${badge ? `<div class="pren-table-badge">${badge}</div>` : ``}
      </div>
    `;
    }).join("");

    listaTavoli.querySelectorAll("[data-id]").forEach((el) => {
      el.onclick = async () => {
        const tavoloId = el.dataset.id;

        const { error } = await window.supabaseClient
          .from("prenotazioni_tavoli")
          .update({ tavolo_id: tavoloId })
          .eq("id", state.currentPrenId);

        if (error) {
          console.error("ERRORE ASSEGNA TAVOLO:", error);
          alert("Errore assegnazione tavolo");
          return;
        }

        closeModal();
        await load();
      };
    });
  }

  async function openOnlineModal() {
    onlineModal.classList.add("open");
    listaOnline.innerHTML = `<div class="pren-loading">Caricamento...</div>`;
    await loadOnlineRequests();
    renderOnlineRequests();
  }

  function closeOnlineModal() {
    onlineModal.classList.remove("open");
  }

  function renderOnlineRequests() {
    const pendingRequests = (state.onlineRequests || []).filter((item) => isOnlinePendingStatus(item.stato));

    if (!pendingRequests.length) {
      listaOnline.innerHTML = `<div class="pren-empty">Nessuna richiesta online da gestire</div>`;
      listaOnline.onclick = null;
      return;
    }

    listaOnline.innerHTML = pendingRequests.map((item) => {
      const onlineId = getOnlineRequestId(item);
      const statusMeta = getOnlineRequestStatusMeta(item.stato);
      const nome = buildClientName(item);
      const coperti = Number(item.coperti) || 0;
      const data = item.data ? formatDateHuman(item.data) : "Data non disponibile";
      const ora = item.ora ? String(item.ora).slice(0, 5) : "--:--";
      const telefono = item.cliente_telefono || "";
      const note = item.note || "";

      return `
      <div class="pren-online-item" data-online-id="${escapeAttribute(onlineId)}">
        <div class="pren-online-top">
          <div>
            <div class="pren-online-name">${escapeHtml(nome)}</div>
            <div class="pren-online-meta">
              ${escapeHtml(data)} · ${escapeHtml(ora)} · ${coperti}
              ${telefono ? `<br>${escapeHtml(telefono)}` : ""}
            </div>
          </div>
          <div class="pren-online-status" style="background:${statusMeta.bg};color:${statusMeta.color}">
            <span>${statusMeta.emoji}</span>
            <span>${escapeHtml(statusMeta.label)}</span>
          </div>
        </div>

        ${note ? `<div class="pren-online-note">${escapeHtml(note)}</div>` : ""}

        <div class="pren-online-actions">
          <button type="button" class="pren-online-btn accept" data-online-action="accept" data-online-id="${escapeAttribute(onlineId)}">Accetta</button>
          <button type="button" class="pren-online-btn reject" data-online-action="reject" data-online-id="${escapeAttribute(onlineId)}">Rifiuta</button>
          <button type="button" class="pren-online-btn manage" data-online-action="manage" data-online-id="${escapeAttribute(onlineId)}">Gestisci</button>
        </div>
      </div>
    `;
    }).join("");

    listaOnline.onclick = async (event) => {
      const actionBtn = event.target.closest("[data-online-action]");
      if (!actionBtn || !listaOnline.contains(actionBtn)) return;

      event.preventDefault();
      event.stopPropagation();

      const onlineId = actionBtn.dataset.onlineId || actionBtn.closest(".pren-online-item")?.dataset.onlineId || "";

      if (!onlineId || onlineId === "undefined" || onlineId === "null") {
        console.error("ID prenotazione online mancante", { action: actionBtn.dataset.onlineAction, button: actionBtn });
        alert("Errore: ID prenotazione online mancante");
        await loadOnlineRequests();
        return;
      }

      if (actionBtn.dataset.onlineAction === "accept") {
        await acceptOnlineRequest(onlineId);
        return;
      }

      if (actionBtn.dataset.onlineAction === "reject") {
        await rejectOnlineRequest(onlineId);
        return;
      }

      if (actionBtn.dataset.onlineAction === "manage") {
        closeOnlineModal();
        window.location.hash = "#/prenotazioni-dettaglio?id=" + encodeURIComponent(onlineId);
      }
    };
  }

  function getOnlineRequestId(item) {
    return String(item?.id || item?.prenotazione_id || item?.booking_id || item?.uuid || "").trim();
  }

  async function acceptOnlineRequest(onlineId) {
    await updateOnlineRequestStatus(onlineId, "confermata");
  }

  async function rejectOnlineRequest(onlineId) {
    await updateOnlineRequestStatus(onlineId, "rifiutata");
  }

  async function updateOnlineRequestStatus(onlineId, nextStatus) {
    const safeOnlineId = String(onlineId || "").trim();

    if (!safeOnlineId || safeOnlineId === "undefined" || safeOnlineId === "null") {
      console.error("ERRORE UPDATE ONLINE: ID mancante", { onlineId, nextStatus });
      alert("Errore: ID prenotazione online mancante");
      await loadOnlineRequests();
      return;
    }

    const stato = normalizeStatus(nextStatus);

    if (!["confermata", "rifiutata"].includes(stato)) {
      alert("Stato non valido");
      return;
    }

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .update({ stato })
      .eq("id", safeOnlineId);

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.or(`sede_id.eq.${sedeId},sede_id.is.null`);
    }

    const { error } = await query;

    if (error) {
      console.error("ERRORE UPDATE ONLINE:", error);
      alert("Errore aggiornamento");
      await loadOnlineRequests();
      return;
    }

    state.onlineRequests = (state.onlineRequests || []).filter(
      (item) => String(getOnlineRequestId(item)) !== String(safeOnlineId)
    );

    updateOnlineBadge();

    if (onlineModal.classList.contains("open")) {
      renderOnlineRequests();
    }

    await load();
    await loadOnlineRequests();
  }

  function openArriviModal() {
    arriviModal.classList.add("open");
    renderArriviSlots();
  }

  function closeArriviModal() {
    arriviModal.classList.remove("open");
  }

  function renderArriviSlots() {
    const slotMinutes = Number(slotSizeSelect.value) || 30;
    const arrivate = state.prenotazioni.filter((p) => {
      const stato = normalizeStatus(p.stato);
      return stato === "confermata" || stato === "arrivata";
    });

    if (!arrivate.length) {
      listaArrivi.innerHTML = `<div class="pren-empty">Nessun arrivo per questa data</div>`;
      return;
    }

    const groups = {};

    arrivate.forEach((p) => {
      const slot = getTimeSlotLabel(p.ora, slotMinutes);
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push(p);
    });

    const slots = Object.keys(groups).sort();

    listaArrivi.innerHTML = slots.map((slot) => {
      const items = groups[slot];
      return `
      <div class="pren-slot-card">
        <div class="pren-slot-time">${escapeHtml(slot)}</div>
        <div class="pren-slot-list">
          ${items.map((p) => {
            const nome = buildClientName(p);
            const coperti = Number(p.coperti) || 0;
            const ora = String(p.ora || "").slice(0, 5) || "--:--";
            const note = p.note ? `<span class="pren-ico note" data-note="${escapeAttribute(p.note)}">📝</span>` : "";
            return `
              <div class="pren-slot-row" data-id="${escapeAttribute(p.id)}">
                <div>${escapeHtml(ora)}</div>
                <div class="pren-slot-pax">${coperti}</div>
                <div class="pren-slot-name">${escapeHtml(nome)}</div>
                <div>${note}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
    }).join("");

    listaArrivi.querySelectorAll(".note").forEach((el) => {
      el.onclick = () => {
        alert(el.dataset.note || "Nessuna nota");
      };
    });
  }

  function closeModal() {
    modal.classList.remove("open");
  }

  function inferService(p) {
    if (p.servizio) return String(p.servizio).toLowerCase();

    const ora = String(p.ora || "").slice(0, 5);
    if (!ora) return "pranzo";

    if (ora >= "06:00" && ora < "11:00") return "colazione";
    if (ora >= "11:00" && ora < "15:30") return "pranzo";
    if (ora >= "15:30" && ora < "19:30") return "aperitivo";
    return "cena";
  }

  function getOnlineRequestStatusMeta(stato) {
    const value = normalizeStatus(stato);

    if (value === "in_attesa") {
      return { label: "Da gestire", emoji: "🔴", bg: "#fee2e2", color: "#991b1b" };
    }

    if (value === "confermata") {
      return { label: "Accettata", emoji: "🟢", bg: "#dcfce7", color: "#166534" };
    }

    if (value === "rifiutata") {
      return { label: "Rifiutata", emoji: "⚫", bg: "#e5e7eb", color: "#374151" };
    }

    if (value === "arrivata") {
      return { label: "Arrivata", emoji: "🟢", bg: "#dcfce7", color: "#166534" };
    }

    if (value === "no_show") {
      return { label: "No show", emoji: "⚫", bg: "#fee2e2", color: "#991b1b" };
    }

    return { label: "Da gestire", emoji: "🔴", bg: "#fee2e2", color: "#991b1b" };
  }

  function isOnlinePendingStatus(stato) {
    return normalizeStatus(stato) === "in_attesa";
  }

  function getOriginIcon(p) {
    const channel = String(p.canale || p.source || "").toLowerCase();

    if (channel.includes("online") || channel.includes("web") || channel.includes("widget") || channel.includes("booking")) return "🌐";
    if (channel.includes("telefono") || channel.includes("call")) return "📞";
    if (channel.includes("whatsapp")) return "💬";
    if (channel.includes("walk")) return "🚶";
    return "📱";
  }

  function getOriginLabel(p) {
    const channel = String(p.canale || p.source || "").trim();
    return channel || "Prenotazione";
  }

  function buildClientName(p) {
    const nome = String(p?.cliente_nome || "").trim();
    const cognome = String(p?.cognome || "").trim();
    const full = `${nome} ${cognome}`.trim();
    return full || "Cliente";
  }

  function getTimeSlotLabel(timeValue, slotMinutes) {
    const raw = String(timeValue || "").slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(raw)) return "--:--";
    const [h, m] = raw.split(":").map(Number);
    const total = (h * 60) + m;
    const rounded = Math.floor(total / slotMinutes) * slotMinutes;
    const hh = String(Math.floor(rounded / 60)).padStart(2, "0");
    const mm = String(rounded % 60).padStart(2, "0");
    return `${hh}:${mm}`;
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

  function sanitizePhone(phone) {
    return String(phone || "").replace(/[^\d+]/g, "");
  }

  function updateOnlineBadge() {
    const total = (state.onlineRequests || []).filter(
      (item) => normalizeStatus(item.stato) === "in_attesa"
    ).length;

    if (!onlineBadge) return;

    onlineBadge.textContent = total > 99 ? "99+" : String(total);
    onlineBadge.classList.toggle("show", total > 0);
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
  await loadOnlineRequests();
}

export function buildPayloadFromForm(formOrData = {}, options = {}) {
  const source = formOrData instanceof HTMLFormElement
    ? Object.fromEntries(new FormData(formOrData).entries())
    : { ...(formOrData || {}) };

  const aziendaId = options.aziendaId || window.state?.azienda?.id || null;
  const sedeId = options.sedeId || window.state?.sedeAttiva?.id || null;

  const clienteNome = String(source.cliente_nome || source.nome || "").trim();
  const cognome = String(source.cognome || "").trim();
  const clienteTelefono = String(source.cliente_telefono || "").trim();
  const data = String(source.data || "").trim();
  const ora = normalizeTime(source.ora);
  const coperti = normalizeInteger(source.coperti);
  const stato = normalizeAllowedStatus(source.stato, "confermata");
  const note = String(source.note || "").trim();

  const canale = String(source.canale || "").trim();
  const sourceValue = String(source.source || "").trim();
  const riferimento = String(source.riferimento || "").trim();
  const tag = String(source.tag || "").trim();

  return {
    azienda_id: aziendaId,
    sede_id: sedeId,
    cliente_nome: clienteNome || null,
    cognome: cognome || null,
    cliente_telefono: clienteTelefono || null,
    data: data || null,
    ora: ora || null,
    coperti,
    stato,
    note: note || null,
    canale: canale || null,
    source: sourceValue || null,
    riferimento: riferimento || null,
    tag: tag || null
  };
}

function normalizeAllowedStatus(value, fallback = "confermata") {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = ["in_attesa", "confermata", "arrivata", "rifiutata", "no_show"];
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeInteger(value) {
  const parsed = parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}
