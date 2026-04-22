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
      min-width:44px;
      padding:5px 4px;
      border-radius:10px;
      background:#f3f4f6;
      border:1px solid #e5e7eb;
      text-align:center;
      cursor:pointer;
      flex-shrink:0;
      font-weight:500;
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
      line-height:1.1;
    }

    .pren-day-bottom{
      font-size:12px;
      font-weight:600;
      line-height:1.1;
      margin-top:2px;
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
    }

    .pren-tag.arrivata{
      background:#dcfce7;
      color:#166534;
    }

    .pren-tag.no_show{
      background:#fee2e2;
      color:#991b1b;
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

        <button type="button" class="pren-tool-btn" id="btn-refresh" title="Aggiorna">↻</button>

        <input type="date" id="filtro-data" style="display:none" />
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
const slotSizeSelect = document.getElementById("arrivi-slot-size");
const daysContainer = document.getElementById("pren-days");
const onlineBadge = document.getElementById("pren-online-badge");

const today = new Date();
filtroData.value = formatDateInput(today);

const state = {
  prenotazioni: [],
  tavoli: [],
  onlineRequests: [],
  currentPrenId: null,
  daysCenterDate: formatDateInput(today),
  renderedDays: [],
  onlineSource: null,
  onlineTableAvailable: null
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

document.getElementById("btn-calendar").onclick = () => {
  if (typeof filtroData.showPicker === "function") {
    filtroData.showPicker();
  } else {
    filtroData.click();
  }
};

filtroData.onchange = () => {
  state.daysCenterDate = filtroData.value || formatDateInput(today);
  syncActiveDayFromInput(true);
  load();
};

filtroServizio.onchange = load;

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

  let query = window.supabaseClient
    .from("prenotazioni_tavoli")
    .select("*");

  if (aziendaId) {
    query = query.eq("azienda_id", aziendaId);
  }

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  if (filtroData.value) {
    query = query.eq("data", filtroData.value);
  }

  query = query.order("ora", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("ERRORE PRENOTAZIONI:", error);
    lista.innerHTML = `<div class="pren-error">Errore caricamento prenotazioni</div>`;
    return;
  }

  let prenotazioni = data || [];

  if (!prenotazioni.length) {
    let fallbackQuery = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .order("created_at", { ascending: false });

    if (aziendaId) {
      fallbackQuery = fallbackQuery.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      fallbackQuery = fallbackQuery.eq("sede_id", sedeId);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;

    if (fallbackError) {
      console.error("ERRORE FALLBACK PRENOTAZIONI:", fallbackError);
    } else {
      prenotazioni = (fallbackData || []).filter((p) => {
        if (filtroData.value && p.data !== filtroData.value) return false;
        return true;
      });
    }
  }

  prenotazioni = applyServiceFilter(prenotazioni);
  state.prenotazioni = prenotazioni;

  if (!prenotazioni.length) {
    lista.innerHTML = `<div class="pren-empty">Nessuna prenotazione per i filtri selezionati</div>`;
    return;
  }

  lista.innerHTML = prenotazioni.map(renderRow).join("");
  attachRowEvents();
  attachSwipe();
}

async function loadOnlineRequests() {
  let requests = [];
  let source = null;

  if (state.onlineTableAvailable !== false) {
    let onlineQuery = window.supabaseClient
      .from("prenotazioni_online")
      .select("*")
      .order("created_at", { ascending: false });

    if (aziendaId) {
      onlineQuery = onlineQuery.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      onlineQuery = onlineQuery.eq("sede_id", sedeId);
    }

    const { data, error } = await onlineQuery;

    if (!error) {
      requests = (data || []).filter((item) => isOnlinePendingStatus(item.stato));
      source = "prenotazioni_online";
      state.onlineTableAvailable = true;
    } else {
      state.onlineTableAvailable = false;
      console.warn("prenotazioni_online non disponibile, uso fallback:", error);
    }
  }

  if (!source) {
    let fallbackQuery = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .order("created_at", { ascending: false });

    if (aziendaId) {
      fallbackQuery = fallbackQuery.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      fallbackQuery = fallbackQuery.eq("sede_id", sedeId);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;

    if (fallbackError) {
      console.error("ERRORE CARICAMENTO PRENOTAZIONI ONLINE:", fallbackError);
      state.onlineRequests = [];
      state.onlineSource = null;
      updateOnlineBadge();
      if (onlineModal.classList.contains("open")) {
        listaOnline.innerHTML = `<div class="pren-error">Errore caricamento richieste online</div>`;
      }
      return;
    }

    requests = (fallbackData || []).filter((item) => {
      const channel = String(item.canale || item.origine || item.source || "").toLowerCase();
      const status = String(item.stato || "").toLowerCase();
      return isLikelyOnlineChannel(channel) && isOnlinePendingStatus(status);
    });

    source = "prenotazioni_tavoli";
  }

  state.onlineRequests = requests;
  state.onlineSource = source;
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
    return `
      <button type="button" class="pren-day ${isActive ? "is-active" : ""}" data-day="${value}">
        <div class="pren-day-top">${getDayLabel(d)}</div>
        <div class="pren-day-bottom">${String(d.getDate()).padStart(2, "0")}</div>
      </button>
    `;
  }).join("");

  daysContainer.querySelectorAll("[data-day]").forEach((btn) => {
    btn.onclick = () => {
      filtroData.value = btn.dataset.day;
      state.daysCenterDate = filtroData.value;
      syncActiveDayFromInput(true);
      load();
    };
  });

  if (centerScroll) {
    requestAnimationFrame(() => {
      centerActiveDay();
    });
  }
}

function centerActiveDay() {
  const active = daysContainer.querySelector(`.pren-day.is-active`);
  if (!active) return;
  const left = active.offsetLeft - (daysContainer.clientWidth / 2) + (active.clientWidth / 2);
  daysContainer.scrollLeft = Math.max(0, left);
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

function syncActiveDayFromInput(centerScroll = false) {
  renderDays(centerScroll);
}

function renderRow(p) {
  const nome = buildClientName(p);
  const coperti = Number(p.coperti) || 0;
  const oraRaw = p.ora || "";
  const ora = oraRaw.length >= 5 ? oraRaw.slice(0, 5) : (oraRaw || "--:--");
  const noteFull = p.note || "";
  const telefono = p.telefono || p.cliente_telefono || p.phone || "";
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
          ${telefono ? `<span class="pren-ico whatsapp" data-phone="${escapeAttribute(telefono)}" data-id="${escapeAttribute(p.id)}">💬</span>` : `<span class="pren-ico msg" data-id="${escapeAttribute(p.id)}">💬</span>`}
          <span class="pren-ico channel" title="${escapeAttribute(getOriginLabel(p))}">${channelIcon}</span>
        </div>
      </div>
    </div>
  `;
}

function renderStatusTag(stato) {
  const value = String(stato || "").toLowerCase();
  if (value === "arrivata") {
    return `<span class="pren-tag arrivata">ARR</span>`;
  }
  if (value === "no_show") {
    return `<span class="pren-tag no_show">NO SHOW</span>`;
  }
  return ``;
}

function attachRowEvents() {
  lista.querySelectorAll(".cliente-link").forEach((el) => {
  el.onclick = (event) => {
    event.stopPropagation();

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

  lista.querySelectorAll(".msg").forEach((el) => {
    el.onclick = (event) => {
      event.stopPropagation();
      const id = el.dataset.id;
      if (!id) return;
      alert("Aprire chat cliente (step successivo)");
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
      const ora = pren?.ora || "";
      const coperti = pren?.coperti || 0;

      const text = encodeURIComponent(
        `Ciao ${nome}, ti confermiamo la prenotazione per ${coperti} persone${data ? ` il ${data}` : ""}${ora ? ` alle ${ora}` : ""}.`
      );

      window.open(`https://wa.me/${sanitizePhone(phone)}?text=${text}`, "_blank");
    };
  });
}

const finish = async () => {
  if (!active) return;

  row.classList.remove("is-dragging");

  if (currentX >= 80) {
    // 👉 DESTRA = ARRIVATO (verde)
    wrap.querySelector(".pren-row-bg.arrivata").style.opacity = "1";
    wrap.querySelector(".pren-row-bg.no-show").style.opacity = "0";

    row.style.transform = "translateX(100%)";

    setTimeout(async () => {
      await updateStatoPrenotazione(row.dataset.id, "arrivata");
    }, 120);

  } else if (currentX <= -80) {
    // 👉 SINISTRA = NO SHOW (rosso)
    wrap.querySelector(".pren-row-bg.arrivata").style.opacity = "0";
    wrap.querySelector(".pren-row-bg.no-show").style.opacity = "1";

    row.style.transform = "translateX(-100%)";

    setTimeout(async () => {
      await updateStatoPrenotazione(row.dataset.id, "no_show");
    }, 120);

  } else {
    row.style.transform = "translateX(0px)";
  }

  active = false;
  currentX = 0;
};

    row.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      active = true;
      startX = event.clientX;
      currentX = 0;
      row.classList.add("is-dragging");
      row.setPointerCapture?.(event.pointerId);
    });

    row.addEventListener("pointermove", (event) => {
      if (!active) return;
      currentX = event.clientX - startX;
      if (currentX > 110) currentX = 110;
      if (currentX < -110) currentX = -110;
      row.style.transform = `translateX(${currentX}px)`;
    });

    const finish = async () => {
      if (!active) return;

      row.classList.remove("is-dragging");

      if (currentX >= 80) {
        row.style.transform = "translateX(100%)";
        setTimeout(async () => {
          await updateStatoPrenotazione(row.dataset.id, "arrivata");
        }, 120);
      } else if (currentX <= -80) {
        row.style.transform = "translateX(-100%)";
        setTimeout(async () => {
          await updateStatoPrenotazione(row.dataset.id, "no_show");
        }, 120);
      } else {
        row.style.transform = "translateX(0px)";
      }

      active = false;
      currentX = 0;
    };

    row.addEventListener("pointerup", finish);
    row.addEventListener("pointercancel", reset);
    row.addEventListener("lostpointercapture", () => {
      if (active && Math.abs(currentX) < 80) {
        reset();
      }
    });

    row.dataset.swipeBound = "true";
  });
}

async function updateStatoPrenotazione(id, stato) {
  const { error } = await window.supabaseClient
    .from("prenotazioni_tavoli")
    .update({ stato })
    .eq("id", id);

  if (error) {
    console.error("ERRORE UPDATE STATO:", error);
    alert("Errore aggiornamento stato");
    await load();
    return;
  }

  await load();
  if (arriviModal.classList.contains("open")) {
    renderArriviSlots();
  }
}

async function openTavoli(prenId) {
  state.currentPrenId = prenId;

  let query = window.supabaseClient
    .from("tavoli")
    .select("*");

  if (aziendaId) {
    query = query.eq("azienda_id", aziendaId);
  }

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  query = query.eq("attivo", true);

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
  if (!state.onlineRequests.length) {
    listaOnline.innerHTML = `<div class="pren-empty">Nessuna richiesta online da gestire</div>`;
    return;
  }

  listaOnline.innerHTML = state.onlineRequests.map((item) => {
    const statusMeta = getOnlineRequestStatusMeta(item.stato);
    const nome = buildClientName(item);
    const coperti = Number(item.coperti) || 0;
    const data = item.data ? formatDateHuman(item.data) : "Data non disponibile";
    const ora = item.ora ? String(item.ora).slice(0, 5) : "--:--";
    const telefono = item.telefono || item.cliente_telefono || item.phone || "";
    const note = item.note || item.richiesta_note || "";
    const linkedPrenId = item.prenotazione_id || item.id;

    return `
      <div class="pren-online-item" data-online-id="${escapeAttribute(item.id)}">
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
          <button type="button" class="pren-online-btn accept" data-online-accept="${escapeAttribute(item.id)}">Accetta</button>
          <button type="button" class="pren-online-btn reject" data-online-reject="${escapeAttribute(item.id)}">Rifiuta</button>
          <button type="button" class="pren-online-btn manage" data-online-manage="${escapeAttribute(linkedPrenId)}">Gestisci</button>
        </div>
      </div>
    `;
  }).join("");

  listaOnline.querySelectorAll("[data-online-accept]").forEach((btn) => {
    btn.onclick = async () => {
      await acceptOnlineRequest(btn.dataset.onlineAccept);
    };
  });

  listaOnline.querySelectorAll("[data-online-reject]").forEach((btn) => {
    btn.onclick = async () => {
      await rejectOnlineRequest(btn.dataset.onlineReject);
    };
  });

  listaOnline.querySelectorAll("[data-online-manage]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.onlineManage;
      if (!id) return;
      closeOnlineModal();
      window.location.hash = "#/prenotazioni-form?id=" + encodeURIComponent(id);
    };
  });
}

async function acceptOnlineRequest(onlineId) {
  if (state.onlineSource === "prenotazioni_online") {
    const { error } = await window.supabaseClient
      .from("prenotazioni_online")
      .update({ stato: "accettata" })
      .eq("id", onlineId);

    if (error) {
      console.error("ERRORE ACCETTA ONLINE:", error);
      alert("Errore accettazione richiesta online");
      return;
    }
  } else {
    const { error } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .update({ stato: "confermata" })
      .eq("id", onlineId);

    if (error) {
      console.error("ERRORE ACCETTA PRENOTAZIONE ONLINE:", error);
      alert("Errore accettazione richiesta online");
      return;
    }
  }

  await load();
  await loadOnlineRequests();
  renderOnlineRequests();
}

async function rejectOnlineRequest(onlineId) {
  if (state.onlineSource === "prenotazioni_online") {
    const { error } = await window.supabaseClient
      .from("prenotazioni_online")
      .update({ stato: "rifiutata" })
      .eq("id", onlineId);

    if (error) {
      console.error("ERRORE RIFIUTA ONLINE:", error);
      alert("Errore rifiuto richiesta online");
      return;
    }
  } else {
    const { error } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .update({ stato: "annullata" })
      .eq("id", onlineId);

    if (error) {
      console.error("ERRORE RIFIUTA PRENOTAZIONE ONLINE:", error);
      alert("Errore rifiuto richiesta online");
      return;
    }
  }

  await load();
  await loadOnlineRequests();
  renderOnlineRequests();
}

function updateOnlineBadge() {
  const total = state.onlineRequests.length;
  onlineBadge.textContent = total > 99 ? "99+" : String(total);
  onlineBadge.classList.toggle("show", total > 0);
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
    const stato = String(p.stato || "").toLowerCase();
    return stato !== "annullata" && stato !== "no_show";
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
  const value = String(stato || "").toLowerCase();
  if (value === "in_attesa" || value === "pending" || value === "nuova" || value === "richiesta") {
    return { label: "Da gestire", emoji: "🔴", bg: "#fee2e2", color: "#991b1b" };
  }
  if (value === "accettata" || value === "confermata") {
    return { label: "Accettata", emoji: "🟢", bg: "#dcfce7", color: "#166534" };
  }
  if (value === "rifiutata" || value === "annullata") {
    return { label: "Rifiutata", emoji: "⚫", bg: "#e5e7eb", color: "#374151" };
  }
  return { label: "Da gestire", emoji: "🔴", bg: "#fee2e2", color: "#991b1b" };
}

function isOnlinePendingStatus(stato) {
  const value = String(stato || "").toLowerCase();
  return value === "in_attesa" || value === "pending" || value === "nuova" || value === "richiesta";
}

function isLikelyOnlineChannel(channel) {
  return [
    "online",
    "thefork",
    "quandoo",
    "google",
    "sito",
    "web",
    "widget",
    "booking",
    "prenotazione_online"
  ].includes(String(channel || "").toLowerCase());
}

function getOriginIcon(p) {
  const channel = String(p.canale || p.origine || p.source || "").toLowerCase();

  if (isLikelyOnlineChannel(channel)) return "🌐";
  if (channel.includes("telefono") || channel.includes("call")) return "📞";
  if (channel.includes("whatsapp")) return "💬";
  if (channel.includes("walk")) return "🚶";
  return "📱";
}

function getOriginLabel(p) {
  const channel = String(p.canale || p.origine || p.source || "").trim();
  return channel || "Prenotazione";
}

function buildClientName(p) {
  const nome = String(p?.cliente_nome || p?.nome_cliente || p?.nome || "").trim();
  const cognome = String(p?.cliente_cognome || p?.cognome || "").trim();
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
