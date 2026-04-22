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
      padding:10px 12px 10px;
    }

    .pren-header-top{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:10px;
    }

    .pren-icon-btn{
      width:40px;
      height:40px;
      border:none;
      border-radius:12px;
      background:#eef2f7;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:18px;
      cursor:pointer;
      flex-shrink:0;
      position:relative;
      color:#374151;
    }

    .pren-header-title{
      min-width:0;
      flex:1;
      text-align:center;
    }

    .pren-header-title .pren-title{
      font-size:15px;
      font-weight:600;
      color:#111827;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .pren-header-title .pren-subtitle{
      font-size:10px;
      color:#6b7280;
      margin-top:2px;
      font-weight:500;
    }

    .pren-top-actions{
      display:flex;
      align-items:center;
      gap:8px;
      flex-shrink:0;
    }

    .pren-badge{
      position:absolute;
      top:-5px;
      right:-5px;
      min-width:18px;
      height:18px;
      padding:0 5px;
      border-radius:999px;
      background:#dc2626;
      color:#ffffff;
      font-size:10px;
      font-weight:700;
      display:none;
      align-items:center;
      justify-content:center;
      box-shadow:0 2px 8px rgba(220,38,38,0.25);
      border:2px solid #ffffff;
    }

    .pren-badge.show{
      display:flex;
    }

    .pren-days{
      display:flex;
      gap:8px;
      overflow-x:auto;
      padding:0 28vw 2px 28vw;
      scrollbar-width:none;
      scroll-behavior:smooth;
    }

    .pren-days::-webkit-scrollbar{
      display:none;
    }

    .pren-day{
      min-width:58px;
      padding:7px 8px;
      border-radius:14px;
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
      box-shadow:0 6px 14px rgba(14,90,122,0.16);
    }

    .pren-day-top{
      font-size:10px;
      font-weight:600;
      text-transform:capitalize;
      opacity:.92;
    }

    .pren-day-bottom{
      font-size:15px;
      font-weight:600;
      line-height:1.1;
      margin-top:2px;
    }

    .pren-content{
      padding:10px 12px 110px;
    }

    .pren-tabs{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin-bottom:10px;
    }

    .pren-tab{
      border:none;
      border-radius:14px;
      padding:10px 8px;
      background:#ffffff;
      border:1px solid #e5e7eb;
      font-size:12px;
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
      gap:8px;
      align-items:center;
      margin-bottom:10px;
      overflow-x:auto;
      scrollbar-width:none;
    }

    .pren-tools::-webkit-scrollbar{
      display:none;
    }

    .pren-tool-btn,
    .pren-tool-select,
    .pren-tool-date{
      height:38px;
      border-radius:12px;
      border:1px solid #e5e7eb;
      background:#ffffff;
      font-size:12px;
      font-weight:500;
      color:#1f2937;
    }

    .pren-tool-btn{
      min-width:38px;
      padding:0 10px;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    .pren-tool-select{
      min-width:126px;
      padding:0 10px;
      cursor:pointer;
    }

    .pren-tool-date{
      min-width:138px;
      padding:0 10px;
    }

    .pren-summary{
      display:flex;
      gap:8px;
      overflow-x:auto;
      padding-bottom:2px;
      margin-bottom:10px;
      scrollbar-width:none;
    }

    .pren-summary::-webkit-scrollbar{
      display:none;
    }

    .pren-summary-card{
      min-width:108px;
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:9px 11px;
      box-shadow:0 4px 14px rgba(0,0,0,0.04);
    }

    .pren-summary-label{
      font-size:10px;
      color:#6b7280;
      font-weight:500;
    }

    .pren-summary-value{
      font-size:17px;
      font-weight:600;
      color:#111827;
      margin-top:2px;
    }

    .pren-list{
      display:flex;
      flex-direction:column;
      gap:8px;
    }

    .pren-empty,
    .pren-loading,
    .pren-error{
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:18px 14px;
      text-align:center;
      color:#6b7280;
      font-weight:500;
      font-size:13px;
    }

    .pren-inline-filter{
      display:flex;
      gap:8px;
      overflow-x:auto;
      margin:0 0 10px;
      scrollbar-width:none;
    }

    .pren-inline-filter::-webkit-scrollbar{
      display:none;
    }

    .pren-chip{
      border:none;
      background:#ffffff;
      border:1px solid #e5e7eb;
      color:#374151;
      border-radius:999px;
      padding:8px 11px;
      font-size:11px;
      font-weight:500;
      white-space:nowrap;
      cursor:pointer;
    }

    .pren-chip.active{
      background:#0E5A7A;
      color:#ffffff;
      border-color:#0E5A7A;
    }

    .pren-row{
      display:grid;
      grid-template-columns:72px 1fr auto;
      gap:10px;
      align-items:center;
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:10px;
      box-shadow:0 4px 14px rgba(0,0,0,0.04);
    }

    .pren-col.ora{
      font-size:13px;
      font-weight:600;
      color:#111827;
      text-align:center;
      background:#f3f4f6;
      border-radius:12px;
      min-height:52px;
      display:flex;
      align-items:center;
      justify-content:center;
      line-height:1.25;
      padding:4px;
      white-space:pre-line;
    }

    .pren-col.main{
      min-width:0;
    }

    .pren-nome{
      font-size:13px;
      font-weight:500;
      color:#111827;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .pren-secondary-line{
      margin-top:4px;
      font-size:11px;
      color:#6b7280;
      font-weight:500;
      display:flex;
      flex-wrap:wrap;
      gap:6px;
    }

    .cliente-link{
      cursor:pointer;
    }

    .pren-note-small{
      margin-top:5px;
      font-size:11px;
      color:#6b7280;
      line-height:1.35;
      font-weight:400;
    }

    .pren-col.right{
      display:flex;
      align-items:center;
      gap:6px;
      flex-wrap:wrap;
      justify-content:flex-end;
    }

    .pren-ico{
      width:32px;
      height:32px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border-radius:10px;
      background:#eef2f7;
      cursor:pointer;
      user-select:none;
      -webkit-tap-highlight-color:transparent;
      font-size:15px;
    }

    .pren-ico.origine{
      cursor:default;
    }

    .pren-overlay{
      position:fixed;
      inset:0;
      background:rgba(17,24,39,0.38);
      opacity:0;
      pointer-events:none;
      transition:opacity .2s ease;
      z-index:40;
    }

    .pren-overlay.open{
      opacity:1;
      pointer-events:auto;
    }

    .pren-drawer{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      background:#ffffff;
      border-radius:24px 24px 0 0;
      padding:14px 14px calc(20px + env(safe-area-inset-bottom));
      transform:translateY(100%);
      transition:transform .22s ease;
      z-index:41;
      box-shadow:0 -12px 30px rgba(0,0,0,0.12);
    }

    .pren-drawer.open{
      transform:translateY(0);
    }

    .pren-drawer-handle{
      width:48px;
      height:5px;
      border-radius:999px;
      background:#d1d5db;
      margin:0 auto 14px;
    }

    .pren-drawer-title{
      font-size:15px;
      font-weight:600;
      color:#111827;
      margin-bottom:10px;
    }

    .pren-drawer-list{
      display:flex;
      flex-direction:column;
      gap:8px;
    }

    .pren-drawer-item{
      border:none;
      width:100%;
      min-height:46px;
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:14px;
      display:flex;
      align-items:center;
      gap:10px;
      padding:0 14px;
      font-size:13px;
      font-weight:500;
      color:#111827;
      cursor:pointer;
      text-align:left;
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
      max-height:82vh;
      overflow:auto;
      background:#ffffff;
      border-radius:24px 24px 0 0;
      padding:16px 14px calc(18px + env(safe-area-inset-bottom));
    }

    .pren-modal-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      margin-bottom:12px;
    }

    .pren-modal-title{
      font-size:15px;
      font-weight:600;
      color:#111827;
    }

    .pren-modal-close{
      border:none;
      background:#eef2f7;
      width:36px;
      height:36px;
      border-radius:12px;
      font-size:18px;
      cursor:pointer;
    }

    .pren-table-list{
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .pren-table-item{
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:11px;
      background:#ffffff;
      cursor:pointer;
    }

    .pren-table-item.best{
      border-color:#16a34a;
      background:#f0fdf4;
    }

    .pren-table-item.good{
      border-color:#f59e0b;
      background:#fffbeb;
    }

    .pren-table-name{
      font-size:14px;
      font-weight:600;
      color:#111827;
    }

    .pren-table-meta{
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

    .pren-online-item{
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:12px;
      background:#ffffff;
    }

    .pren-online-top{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:8px;
    }

    .pren-online-name{
      font-size:14px;
      font-weight:600;
      color:#111827;
    }

    .pren-online-meta{
      margin-top:4px;
      font-size:11px;
      line-height:1.4;
      color:#6b7280;
      font-weight:500;
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
      gap:8px;
    }

    .pren-online-btn{
      min-height:38px;
      border:none;
      border-radius:12px;
      font-size:12px;
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

    .pren-bottom-nav{
      position:fixed;
      left:50%;
      transform:translateX(-50%);
      bottom:0;
      width:min(100%, 1200px);
      background:#ffffff;
      border-top:1px solid #e5e7eb;
      padding:10px 12px calc(10px + env(safe-area-inset-bottom));
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      z-index:35;
    }

    .pren-bottom-item{
      border:none;
      background:transparent;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:2px;
      color:#6b7280;
      font-size:10px;
      font-weight:500;
      cursor:pointer;
      min-height:52px;
      border-radius:14px;
    }

    .pren-bottom-item.is-active,
    .pren-bottom-item.is-primary{
      color:#0E5A7A;
      background:#eef6fa;
    }

    .pren-bottom-icon{
      font-size:18px;
      line-height:1;
    }

    @media (min-width: 768px){
      .pren-content{
        padding:14px 14px 110px;
      }

      .pren-bottom-nav{
        max-width:680px;
        border-radius:20px 20px 0 0;
      }

      .pren-modal{
        align-items:center;
        justify-content:center;
        padding:20px;
      }

      .pren-modal-box{
        max-width:620px;
        border-radius:24px;
        max-height:80vh;
      }

      .pren-online-actions{
        grid-template-columns:repeat(3,160px);
        justify-content:flex-end;
      }
    }
  </style>

  <div class="pren-shell">
    <div class="pren-header">
      <div class="pren-header-top">
        <button id="pren-menu-trigger" class="pren-icon-btn" aria-label="Menu prenotazioni">☰</button>

        <div class="pren-header-title">
          <div class="pren-title">${escapeHtml(sedeNome)}</div>
          <div class="pren-subtitle">Agenda prenotazioni</div>
        </div>

        <div class="pren-top-actions">
          <button id="pren-online-trigger" class="pren-icon-btn" aria-label="Prenotazioni online">
            🌐
            <span id="pren-online-badge" class="pren-badge">0</span>
          </button>
          <button id="pren-actions-trigger" class="pren-icon-btn" aria-label="Azioni prenotazioni">⋮</button>
        </div>
      </div>

      <div id="pren-days" class="pren-days"></div>
    </div>

    <div class="pren-content">
      <div class="pren-tabs">
        <button type="button" class="pren-tab active" id="tab-prenotazioni">Prenotazioni</button>
        <button type="button" class="pren-tab" id="tab-arrivi">Arrivi</button>
        <button type="button" class="pren-tab" id="tab-piantina">Piantina sala</button>
      </div>

      <div class="pren-tools">
        <button type="button" class="pren-tool-btn" id="btn-qr" title="Scansiona QR">📷</button>

        <select id="filtro-servizio" class="pren-tool-select">
          <option value="">Tutti i servizi</option>
          <option value="colazione">☕ Colazione</option>
          <option value="aperitivo">🍸 Aperitivo</option>
          <option value="pranzo">🌞 Pranzo</option>
          <option value="cena">🌙 Cena</option>
        </select>

        <input type="date" id="filtro-data" class="pren-tool-date" />

        <button type="button" class="pren-tool-btn" id="btn-refresh" title="Aggiorna">↻</button>
      </div>

      <div class="pren-inline-filter" id="stato-chips"></div>

      <div class="pren-summary" id="pren-summary"></div>

      <div id="lista-prenotazioni" class="pren-list">
        <div class="pren-loading">Caricamento...</div>
      </div>
    </div>
  </div>

  <div id="pren-overlay" class="pren-overlay"></div>

  <div id="pren-drawer-menu" class="pren-drawer" aria-hidden="true">
    <div class="pren-drawer-handle"></div>
    <div class="pren-drawer-title">Menu operativo prenotazioni</div>
    <div class="pren-drawer-list">
      <button type="button" class="pren-drawer-item" data-action="nuova">➕ Nuova prenotazione</button>
      <button type="button" class="pren-drawer-item" data-action="richieste">🌐 Richieste online</button>
      <button type="button" class="pren-drawer-item" data-action="arrivi">✅ Arrivi da gestire</button>
      <button type="button" class="pren-drawer-item" data-action="overbooking">⚠️ Overbooking</button>
      <button type="button" class="pren-drawer-item" data-action="conferme">💬 Preferenze conferma</button>
      <button type="button" class="pren-drawer-item" data-action="messaggi">📨 Messaggi pronti</button>
    </div>
  </div>

  <div id="pren-drawer-actions" class="pren-drawer" aria-hidden="true">
    <div class="pren-drawer-handle"></div>
    <div class="pren-drawer-title">Azioni rapide</div>
    <div class="pren-drawer-list">
      <button type="button" class="pren-drawer-item" data-quick-status="nuova">🟡 Filtra nuove</button>
      <button type="button" class="pren-drawer-item" data-quick-status="confermata">🔵 Filtra confermate</button>
      <button type="button" class="pren-drawer-item" data-quick-status="arrivata">🟢 Filtra arrivate</button>
      <button type="button" class="pren-drawer-item" data-quick-status="no_show">🔴 Filtra no show</button>
      <button type="button" class="pren-drawer-item" data-quick-status="">📋 Tutte le prenotazioni</button>
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
      <div id="lista-online" class="pren-table-list">
        <div class="pren-loading">Caricamento...</div>
      </div>
    </div>
  </div>

  <div class="pren-bottom-nav">
    <button type="button" class="pren-bottom-item is-active" id="footer-agenda">
      <div class="pren-bottom-icon">📅</div>
      <div>Agenda</div>
    </button>

    <button type="button" class="pren-bottom-item is-primary" id="footer-new">
      <div class="pren-bottom-icon">➕</div>
      <div>Nuovo</div>
    </button>

    <button type="button" class="pren-bottom-item" id="footer-messaggi">
      <div class="pren-bottom-icon">💬</div>
      <div>Messaggi</div>
    </button>
  </div>
</div>
`;

const lista = document.getElementById("lista-prenotazioni");
const filtroData = document.getElementById("filtro-data");
const filtroServizio = document.getElementById("filtro-servizio");
const statoChips = document.getElementById("stato-chips");
const summaryBox = document.getElementById("pren-summary");
const modal = document.getElementById("modal-tavoli");
const listaTavoli = document.getElementById("lista-tavoli");
const onlineModal = document.getElementById("modal-online");
const listaOnline = document.getElementById("lista-online");
const overlay = document.getElementById("pren-overlay");
const drawerMenu = document.getElementById("pren-drawer-menu");
const drawerActions = document.getElementById("pren-drawer-actions");
const daysContainer = document.getElementById("pren-days");
const onlineBadge = document.getElementById("pren-online-badge");

const today = new Date();
filtroData.value = formatDateInput(today);

const statoItems = [
  { value: "", label: "Tutte" },
  { value: "nuova", label: "Nuove" },
  { value: "confermata", label: "Confermate" },
  { value: "arrivata", label: "Arrivate" },
  { value: "no_show", label: "No show" },
  { value: "annullata", label: "Annullate" }
];

const state = {
  filtroStato: "",
  prenotazioni: [],
  tavoli: [],
  onlineRequests: [],
  currentPrenId: null,
  drawerOpen: null,
  daysCenterDate: formatDateInput(today),
  renderedDays: [],
  onlineSource: null,
  onlineTableAvailable: null
};

renderStatusChips();
renderDays(true);
attachEvents();
attachDayInfiniteScroll();

document.getElementById("btn-refresh").onclick = async () => {
  await load();
  await loadOnlineRequests();
};

document.getElementById("btn-qr").onclick = () => {
  alert("Lettore QR in arrivo: qui collegheremo la scansione di sconti e promo.");
};

document.getElementById("footer-new").onclick = () => {
  window.location.hash = "#/prenotazioni-form";
};

document.getElementById("footer-agenda").onclick = () => {
  window.location.hash = "#/prenotazioni";
};

document.getElementById("footer-messaggi").onclick = () => {
  alert("Qui collegheremo la messaggistica cliente per cliente.");
};

document.getElementById("tab-prenotazioni").onclick = () => {};
document.getElementById("tab-arrivi").onclick = () => {
  state.filtroStato = "arrivata";
  updateStatusChips();
  load();
};
document.getElementById("tab-piantina").onclick = () => {
  window.location.hash = "#/sala";
};

document.getElementById("pren-menu-trigger").onclick = () => toggleDrawer("menu");
document.getElementById("pren-actions-trigger").onclick = () => toggleDrawer("actions");
document.getElementById("pren-online-trigger").onclick = async () => {
  closeDrawers();
  await openOnlineModal();
};

overlay.onclick = () => {
  closeDrawers();
};

document.querySelectorAll("[data-action='nuova']").forEach((btn) => {
  btn.onclick = () => {
    closeDrawers();
    window.location.hash = "#/prenotazioni-form";
  };
});

document.querySelectorAll("[data-action='richieste']").forEach((btn) => {
  btn.onclick = async () => {
    closeDrawers();
    await openOnlineModal();
  };
});

document.querySelectorAll("[data-action='arrivi']").forEach((btn) => {
  btn.onclick = () => {
    state.filtroStato = "arrivata";
    updateStatusChips();
    closeDrawers();
    load();
  };
});

document.querySelectorAll("[data-action='overbooking']").forEach((btn) => {
  btn.onclick = () => {
    closeDrawers();
    alert("Controllo overbooking da collegare.");
  };
});

document.querySelectorAll("[data-action='conferme']").forEach((btn) => {
  btn.onclick = () => {
    closeDrawers();
    alert("Preferenze conferma da collegare ai template WhatsApp.");
  };
});

document.querySelectorAll("[data-action='messaggi']").forEach((btn) => {
  btn.onclick = () => {
    closeDrawers();
    alert("Messaggi pronti da collegare.");
  };
});

document.querySelectorAll("[data-quick-status]").forEach((btn) => {
  btn.onclick = () => {
    state.filtroStato = btn.dataset.quickStatus || "";
    updateStatusChips();
    closeDrawers();
    load();
  };
});

filtroData.onchange = () => {
  state.daysCenterDate = filtroData.value || formatDateInput(today);
  syncActiveDayFromInput();
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

  if (state.filtroStato) {
    query = query.eq("stato", state.filtroStato);
  }

  query = query.order("ora", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("ERRORE PRENOTAZIONI:", error);
    lista.innerHTML = `<div class="pren-error">Errore caricamento prenotazioni</div>`;
    summaryBox.innerHTML = "";
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
        if (state.filtroStato && p.stato !== state.filtroStato) return false;
        return true;
      });
    }
  }

  prenotazioni = applyServiceFilter(prenotazioni);
  state.prenotazioni = prenotazioni;

  renderSummary(prenotazioni);

  if (!prenotazioni.length) {
    lista.innerHTML = `<div class="pren-empty">Nessuna prenotazione per i filtri selezionati</div>`;
    return;
  }

  lista.innerHTML = prenotazioni.map(renderRow).join("");
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

function renderSummary(prenotazioni) {
  const totale = prenotazioni.length;
  const coperti = prenotazioni.reduce((acc, p) => acc + (Number(p.coperti) || 0), 0);
  const confermate = prenotazioni.filter((p) => p.stato === "confermata").length;
  const arrivate = prenotazioni.filter((p) => p.stato === "arrivata").length;

  summaryBox.innerHTML = `
    <div class="pren-summary-card">
      <div class="pren-summary-label">Prenotazioni</div>
      <div class="pren-summary-value">${totale}</div>
    </div>
    <div class="pren-summary-card">
      <div class="pren-summary-label">Coperti</div>
      <div class="pren-summary-value">${coperti}</div>
    </div>
    <div class="pren-summary-card">
      <div class="pren-summary-label">Confermate</div>
      <div class="pren-summary-value">${confermate}</div>
    </div>
    <div class="pren-summary-card">
      <div class="pren-summary-label">Arrivate</div>
      <div class="pren-summary-value">${arrivate}</div>
    </div>
  `;
}

function renderStatusChips() {
  statoChips.innerHTML = statoItems.map((item) => `
    <button
      type="button"
      class="pren-chip ${item.value === state.filtroStato ? "active" : ""}"
      data-stato-chip="${item.value}">
      ${item.label}
    </button>
  `).join("");

  statoChips.querySelectorAll("[data-stato-chip]").forEach((btn) => {
    btn.onclick = () => {
      state.filtroStato = btn.dataset.statoChip || "";
      updateStatusChips();
      load();
    };
  });
}

function updateStatusChips() {
  renderStatusChips();
}

function buildVisibleDays(centerDateString, before = 21, after = 21) {
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
  state.renderedDays = buildVisibleDays(state.daysCenterDate, 21, 21);

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
    const threshold = 120;
    const nearLeft = daysContainer.scrollLeft <= threshold;
    const nearRight = daysContainer.scrollLeft + daysContainer.clientWidth >= daysContainer.scrollWidth - threshold;

    if (nearLeft) {
      const center = new Date(state.daysCenterDate);
      center.setDate(center.getDate() - 14);
      state.daysCenterDate = formatDateInput(center);
      renderDays(false);
      requestAnimationFrame(centerActiveDay);
    } else if (nearRight) {
      const center = new Date(state.daysCenterDate);
      center.setDate(center.getDate() + 14);
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
  const nome = p.cliente_nome || p.nome_cliente || "Cliente";
  const coperti = Number(p.coperti) || 0;
  const oraRaw = p.ora || "";
  const ora = oraRaw.length >= 5 ? oraRaw.slice(0, 5) : (oraRaw || "--:--");
  const noteShort = p.note ? p.note.slice(0, 60) : "";
  const noteFull = p.note || "";
  const telefono = p.telefono || p.cliente_telefono || p.phone || "";
  const tavolo = p.tavolo_nome || p.nome_tavolo || p.tavolo_id || "";
  const origine = getOriginIcon(p);
  const statoMeta = getStatusMeta(p.stato);

  return `
    <div class="pren-row" data-id="${escapeAttribute(p.id)}">
      <div class="pren-col ora">${escapeHtml(ora)}\n${coperti}p</div>

      <div class="pren-col main">
        <div class="pren-nome cliente-link" data-id="${escapeAttribute(p.contatto_id || "")}">
          ${escapeHtml(nome)}
        </div>

        <div class="pren-secondary-line">
          <span>${escapeHtml(statoMeta.label)}</span>
          ${tavolo ? `<span>Tavolo ${escapeHtml(String(tavolo))}</span>` : ""}
          ${telefono ? `<span>${escapeHtml(maskPhone(telefono))}</span>` : ""}
        </div>

        ${noteShort ? `<div class="pren-note-small pren-note" data-note="${escapeAttribute(noteFull)}">${escapeHtml(noteShort)}</div>` : ""}
      </div>

      <div class="pren-col right">
        <span class="pren-ico origine" title="${escapeAttribute(getOriginLabel(p))}">${origine}</span>
        ${noteFull ? `<span class="pren-ico note" data-note="${escapeAttribute(noteFull)}">📝</span>` : ""}
        ${telefono ? `<span class="pren-ico whatsapp" data-phone="${escapeAttribute(telefono)}" data-id="${escapeAttribute(p.id)}">💬</span>` : `<span class="pren-ico msg" data-id="${escapeAttribute(p.id)}">💬</span>`}
        <span class="pren-ico settings" data-id="${escapeAttribute(p.id)}">⚙️</span>
      </div>
    </div>
  `;
}

function attachEvents() {
  if (lista.dataset.eventsBound === "true") {
    return;
  }

  const handler = (event) => {
    const clienteEl = event.target.closest(".cliente-link");
    if (clienteEl && lista.contains(clienteEl)) {
      const id = clienteEl.dataset.id;
      if (!id || id === "null" || id === "undefined") {
        alert("Cliente non collegato");
        return;
      }
      window.location.hash = "#/contatti-dettaglio?id=" + encodeURIComponent(id);
      return;
    }

    const settingsEl = event.target.closest(".pren-ico.settings");
    if (settingsEl && lista.contains(settingsEl)) {
      const id = settingsEl.dataset.id;
      if (!id) return;
      window.location.hash = "#/prenotazioni-form?id=" + encodeURIComponent(id);
      return;
    }

    const msgEl = event.target.closest(".pren-ico.msg");
    if (msgEl && lista.contains(msgEl)) {
      const id = msgEl.dataset.id;
      if (!id) return;
      alert("Aprire chat cliente (step successivo)");
      return;
    }

    const noteIconEl = event.target.closest(".pren-ico.note");
    if (noteIconEl && lista.contains(noteIconEl)) {
      alert(noteIconEl.dataset.note || "Nessuna nota");
      return;
    }

    const noteTextEl = event.target.closest(".pren-note");
    if (noteTextEl && lista.contains(noteTextEl)) {
      alert(noteTextEl.dataset.note || "Nessuna nota");
      return;
    }

    const whatsappEl = event.target.closest(".whatsapp");
    if (whatsappEl && lista.contains(whatsappEl)) {
      const phone = whatsappEl.dataset.phone || "";
      const id = whatsappEl.dataset.id || "";
      if (!phone) return;

      const pren = state.prenotazioni.find((p) => String(p.id) === String(id));
      const nome = pren?.cliente_nome || pren?.nome_cliente || "cliente";
      const data = pren?.data ? formatDateHuman(pren.data) : "";
      const ora = pren?.ora || "";
      const coperti = pren?.coperti || 0;

      const text = encodeURIComponent(
        `Ciao ${nome}, ti confermiamo la prenotazione per ${coperti} persone${data ? ` il ${data}` : ""}${ora ? ` alle ${ora}` : ""}.`
      );

      window.open(`https://wa.me/${sanitizePhone(phone)}?text=${text}`, "_blank");
    }
  };

  lista.addEventListener("click", handler);
  lista.addEventListener("touchend", handler, { passive: true });
  lista.dataset.eventsBound = "true";
}

async function updateStatoPrenotazione(id, stato) {
  const { error } = await window.supabaseClient
    .from("prenotazioni_tavoli")
    .update({ stato })
    .eq("id", id);

  if (error) {
    console.error("ERRORE UPDATE STATO:", error);
    alert("Errore aggiornamento stato");
    return;
  }

  await load();
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
    const nome = item.cliente_nome || item.nome_cliente || item.nome || "Cliente";
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
              ${escapeHtml(data)} · ${escapeHtml(ora)} · ${coperti}p
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
  const request = state.onlineRequests.find((item) => String(item.id) === String(onlineId));
  if (!request) return;

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
  const request = state.onlineRequests.find((item) => String(item.id) === String(onlineId));
  if (!request) return;

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

function closeModal() {
  modal.classList.remove("open");
}

function toggleDrawer(type) {
  const isMenu = type === "menu";
  const target = isMenu ? drawerMenu : drawerActions;
  const other = isMenu ? drawerActions : drawerMenu;
  const isOpen = target.classList.contains("open");

  other.classList.remove("open");
  target.classList.toggle("open", !isOpen);
  overlay.classList.toggle("open", !isOpen);
  state.drawerOpen = !isOpen ? type : null;
}

function closeDrawers() {
  drawerMenu.classList.remove("open");
  drawerActions.classList.remove("open");
  overlay.classList.remove("open");
  state.drawerOpen = null;
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

function serviceLabel(servizio) {
  switch (servizio) {
    case "colazione":
      return "COLAZ.";
    case "aperitivo":
      return "APER.";
    case "pranzo":
      return "PRANZO";
    case "cena":
      return "CENA";
    default:
      return "SERV.";
  }
}

function getStatusMeta(stato) {
  switch (String(stato || "").toLowerCase()) {
    case "nuova":
      return { label: "Nuova", emoji: "🟡", bg: "#FEF3C7", color: "#92400E" };
    case "confermata":
      return { label: "Confermata", emoji: "🔵", bg: "#DBEAFE", color: "#1D4ED8" };
    case "arrivata":
      return { label: "Arrivata", emoji: "🟢", bg: "#DCFCE7", color: "#166534" };
    case "no_show":
      return { label: "No show", emoji: "🔴", bg: "#FEE2E2", color: "#991B1B" };
    case "annullata":
      return { label: "Annullata", emoji: "⚫", bg: "#E5E7EB", color: "#374151" };
    default:
      return { label: "Da gestire", emoji: "⚪", bg: "#F3F4F6", color: "#4B5563" };
  }
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
  return "📱";
}

function getOriginLabel(p) {
  const channel = String(p.canale || p.origine || p.source || "").trim();
  return channel || "Prenotazione";
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

function maskPhone(phone) {
  const clean = String(phone || "").trim();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 3)}•••${clean.slice(-2)}`;
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
