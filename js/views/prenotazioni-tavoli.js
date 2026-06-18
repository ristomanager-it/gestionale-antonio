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
          padding:12px 12px 10px;
        }

        .pren-header-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:12px;
        }

        .pren-icon-btn{
          width:42px;
          height:42px;
          border:none;
          border-radius:14px;
          background:#eef2f7;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:20px;
          cursor:pointer;
          flex-shrink:0;
        }

        .pren-header-title{
          min-width:0;
          flex:1;
          text-align:center;
        }

        .pren-header-title .pren-title{
          font-size:17px;
          font-weight:800;
          color:#111827;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .pren-header-title .pren-subtitle{
          font-size:11px;
          color:#6b7280;
          margin-top:2px;
        }

        .pren-days{
          display:flex;
          gap:8px;
          overflow-x:auto;
          padding-bottom:2px;
          scrollbar-width:none;
        }

        .pren-days::-webkit-scrollbar{
          display:none;
        }

        .pren-day{
          min-width:62px;
          padding:8px 10px;
          border-radius:16px;
          background:#f3f4f6;
          border:1px solid #e5e7eb;
          text-align:center;
          cursor:pointer;
          flex-shrink:0;
        }

        .pren-day.is-active{
          background:#0E5A7A;
          color:#ffffff;
          border-color:#0E5A7A;
          box-shadow:0 8px 18px rgba(14,90,122,0.18);
        }

        .pren-day-top{
          font-size:11px;
          font-weight:700;
          text-transform:capitalize;
          opacity:.9;
        }

        .pren-day-bottom{
          font-size:18px;
          font-weight:800;
          line-height:1.1;
          margin-top:2px;
        }

        .pren-content{
          padding:12px 12px 110px;
        }

        .pren-tabs{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:8px;
          margin-bottom:12px;
        }

        .pren-tab{
          border:none;
          border-radius:16px;
          padding:12px 10px;
          background:#ffffff;
          border:1px solid #e5e7eb;
          font-size:13px;
          font-weight:700;
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
          margin-bottom:12px;
          overflow-x:auto;
          scrollbar-width:none;
        }

        .pren-tools::-webkit-scrollbar{
          display:none;
        }

        .pren-tool-btn,
        .pren-tool-select,
        .pren-tool-date{
          height:42px;
          border-radius:14px;
          border:1px solid #e5e7eb;
          background:#ffffff;
          font-size:13px;
          font-weight:700;
          color:#1f2937;
        }

        .pren-tool-btn{
          min-width:42px;
          padding:0 12px;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .pren-tool-select{
          min-width:130px;
          padding:0 12px;
          cursor:pointer;
        }

        .pren-tool-date{
          min-width:140px;
          padding:0 12px;
        }

        .pren-summary{
          display:flex;
          gap:8px;
          overflow-x:auto;
          padding-bottom:2px;
          margin-bottom:12px;
          scrollbar-width:none;
        }

        .pren-summary::-webkit-scrollbar{
          display:none;
        }

        .pren-summary-card{
          min-width:120px;
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:18px;
          padding:10px 12px;
          box-shadow:0 4px 16px rgba(0,0,0,0.04);
        }

        .pren-summary-label{
          font-size:11px;
          color:#6b7280;
          font-weight:700;
        }

        .pren-summary-value{
          font-size:20px;
          font-weight:800;
          color:#111827;
          margin-top:2px;
        }

        .pren-list{
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .pren-empty,
        .pren-loading,
        .pren-error{
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:18px;
          padding:20px 16px;
          text-align:center;
          color:#6b7280;
          font-weight:600;
        }

        .pren-card{
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:20px;
          padding:12px;
          box-shadow:0 8px 24px rgba(0,0,0,0.04);
        }

        .pren-card-top{
          display:flex;
          align-items:flex-start;
          gap:12px;
        }

        .pren-time{
          width:62px;
          height:62px;
          border-radius:18px;
          background:#f3f4f6;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
        }

        .pren-time-hour{
          font-size:18px;
          font-weight:800;
          color:#111827;
          line-height:1;
        }

        .pren-time-service{
          font-size:10px;
          font-weight:700;
          color:#6b7280;
          margin-top:4px;
          text-transform:uppercase;
        }

        .pren-main{
          min-width:0;
          flex:1;
        }

        .pren-name-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
        }

        .pren-name{
          font-size:15px;
          font-weight:800;
          color:#111827;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .pren-status{
          display:inline-flex;
          align-items:center;
          gap:6px;
          font-size:11px;
          font-weight:800;
          border-radius:999px;
          padding:6px 10px;
          white-space:nowrap;
          flex-shrink:0;
        }

        .pren-meta{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top:8px;
          color:#4b5563;
          font-size:12px;
          font-weight:700;
        }

        .pren-meta-item{
          display:inline-flex;
          align-items:center;
          gap:4px;
          background:#f8fafc;
          border:1px solid #eef2f7;
          border-radius:999px;
          padding:5px 8px;
        }

        .pren-note{
          margin-top:8px;
          font-size:12px;
          color:#6b7280;
          line-height:1.45;
          background:#f9fafb;
          border-radius:12px;
          padding:8px 10px;
        }

        .pren-card-actions{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:8px;
          margin-top:12px;
        }

        .pren-action-btn{
          border:none;
          border-radius:14px;
          min-height:42px;
          background:#eef2f7;
          font-weight:800;
          font-size:13px;
          color:#1f2937;
          cursor:pointer;
          padding:0 8px;
        }

        .pren-action-btn.primary{
          background:#0E5A7A;
          color:#ffffff;
        }

        .pren-action-btn.success{
          background:#dcfce7;
          color:#166534;
        }

        .pren-action-btn.warn{
          background:#fef3c7;
          color:#92400e;
        }

        .pren-action-btn.danger{
          background:#fee2e2;
          color:#991b1b;
        }

        .pren-action-btn.landing{
          background:#f0fdf4;
          color:#166534;
        }

        .pren-action-btn.wa-confirm{
          background:#dcfce7;
          color:#15803d;
        }

        .pren-landing-link{
          display:flex;
          align-items:center;
          gap:6px;
          margin-top:8px;
          font-size:12px;
          font-weight:700;
          color:#0E5A7A;
          text-decoration:none;
          background:#e8f4f8;
          border-radius:10px;
          padding:7px 10px;
          overflow:hidden;
          white-space:nowrap;
          text-overflow:ellipsis;
        }

        .pren-landing-link:hover{
          background:#d1eaf5;
        }

        .pren-status-select{
          width:100%;
          margin-top:10px;
          height:40px;
          border-radius:12px;
          border:1px solid #e5e7eb;
          background:#ffffff;
          padding:0 10px;
          font-weight:700;
          color:#111827;
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
          font-size:11px;
          font-weight:700;
          cursor:pointer;
          min-height:54px;
          border-radius:14px;
        }

        .pren-bottom-item.is-active,
        .pren-bottom-item.is-primary{
          color:#0E5A7A;
          background:#eef6fa;
        }

        .pren-bottom-icon{
          font-size:20px;
          line-height:1;
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
          font-size:16px;
          font-weight:800;
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
          min-height:48px;
          background:#f8fafc;
          border:1px solid #e5e7eb;
          border-radius:16px;
          display:flex;
          align-items:center;
          gap:10px;
          padding:0 14px;
          font-size:14px;
          font-weight:700;
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
          font-size:16px;
          font-weight:800;
          color:#111827;
        }

        .pren-modal-close{
          border:none;
          background:#eef2f7;
          width:38px;
          height:38px;
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
          border-radius:18px;
          padding:12px;
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
          font-size:15px;
          font-weight:800;
          color:#111827;
        }

        .pren-table-meta{
          margin-top:4px;
          font-size:12px;
          color:#4b5563;
          font-weight:700;
        }

        .pren-table-badge{
          margin-top:6px;
          font-size:11px;
          font-weight:800;
        }

        .pren-inline-filter{
          display:flex;
          gap:8px;
          overflow-x:auto;
          margin:0 0 12px;
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
          padding:9px 12px;
          font-size:12px;
          font-weight:800;
          white-space:nowrap;
          cursor:pointer;
        }

        .pren-chip.active{
          background:#0E5A7A;
          color:#ffffff;
          border-color:#0E5A7A;
        }

        @media (min-width: 768px){
          .pren-content{
            padding:14px 14px 110px;
          }

          .pren-card-actions{
            grid-template-columns:repeat(6,1fr);
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
            max-width:560px;
            border-radius:24px;
            max-height:80vh;
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

            <button id="pren-actions-trigger" class="pren-icon-btn" aria-label="Azioni prenotazioni">⋮</button>
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
          <button type="button" class="pren-drawer-item" data-action="richieste">📥 Richieste prenotazione</button>
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
  const overlay = document.getElementById("pren-overlay");
  const drawerMenu = document.getElementById("pren-drawer-menu");
  const drawerActions = document.getElementById("pren-drawer-actions");
  const daysContainer = document.getElementById("pren-days");

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
    currentPrenId: null,
    drawerOpen: null
  };

  renderStatusChips();
  renderDays();

  document.getElementById("btn-refresh").onclick = load;
  document.getElementById("btn-qr").onclick = () => {
    alert("Lettore QR in arrivo: qui collegheremo la scansione di sconti e promo.");
  };

  document.getElementById("footer-new").onclick = () => {
    window.location.hash = "#/prenotazione-tavolo-form";
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
    window.location.hash = "#/bo-configurazione?tab=sala&subtab=piantina";
  };

  document.getElementById("pren-menu-trigger").onclick = () => toggleDrawer("menu");
  document.getElementById("pren-actions-trigger").onclick = () => toggleDrawer("actions");
  overlay.onclick = closeDrawers;

  document.querySelectorAll("[data-action='nuova']").forEach((btn) => {
    btn.onclick = () => {
      closeDrawers();
      window.location.hash = "#/prenotazione-tavolo-form";
    };
  });

  document.querySelectorAll("[data-action='richieste']").forEach((btn) => {
    btn.onclick = () => {
      closeDrawers();
      alert("Vista richieste prenotazione da collegare.");
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
    syncActiveDayFromInput();
    load();
  };

  filtroServizio.onchange = load;

  document.getElementById("close-modal").onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
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
      const fallbackQuery = window.supabaseClient
        .from("prenotazioni_tavoli")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        console.error("ERRORE FALLBACK PRENOTAZIONI:", fallbackError);
      } else {
        prenotazioni = (fallbackData || []).filter((p) => {
          if (aziendaId && p.azienda_id !== aziendaId) return false;
          if (sedeId && p.sede_id !== sedeId) return false;
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
    attachEvents();
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
        data-stato-chip="${item.value}"
      >
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

function renderDays() {

  const current =
    filtroData.value
      ? parseLocalDate(filtroData.value)
      : new Date();

  const visible = [];

  for (let i = -3; i <= 10; i++) {

    const d = new Date(current);

    d.setDate(current.getDate() + i);

    visible.push(d);

  }

  daysContainer.innerHTML = visible.map((d) => {

    const value = formatDateInput(d);

    const isActive =
      value === filtroData.value;

    return `
      <button
        type="button"
        class="pren-day ${isActive ? "is-active" : ""}"
        data-day="${value}"
      >
        <div class="pren-day-top">
          ${getDayLabel(d)}
        </div>

        <div class="pren-day-bottom">
          ${String(d.getDate()).padStart(2, "0")}
        </div>
      </button>
    `;

  }).join("");

  daysContainer
    .querySelectorAll("[data-day]")
    .forEach((btn) => {

      btn.onclick = () => {

        filtroData.value =
          btn.dataset.day;

        syncActiveDayFromInput();

        load();

      };

    });

}
    daysContainer.querySelectorAll("[data-day]").forEach((btn) => {
      btn.onclick = () => {
        filtroData.value = btn.dataset.day;
        syncActiveDayFromInput();
        load();
      };
    });
  }

  function syncActiveDayFromInput() {
    renderDays();
  }

  function renderRow(p) {
    const stato = getStatusMeta(p.stato);
    const servizio = inferService(p);
    const tavoloText = p.tavolo_id ? `🪑 Tavolo assegnato` : `🪑 Non assegnato`;
    const telefono = p.cliente_telefono || p.telefono || "";
    const nome = p.cliente_nome || p.nome_cliente || "Cliente";
    const cognome = p.cognome ? ` ${p.cognome}` : "";
    const note = p.note ? `<div class="pren-note">📝 ${escapeHtml(p.note)}</div>` : "";
    const coperti = Number(p.coperti) || 0;
    const isChatbot = p.canale === "chatbot" || p.tag === "chatbot_wa";
    const isRfbook = p.canale === "rfbook" || p.sorgente === "rfbook" || p.source === "rfbook";
    const badgeChatbot = isChatbot ? `<span style="background:#e8f4f8;color:#0E5A7A;border-radius:100px;padding:2px 8px;font-size:11px;font-weight:600;margin-left:6px;">🤖 Bot</span>` : "";
    const badgeModifica = p.modificata_dal_cliente ? `<span style="background:#fef3c7;color:#92400e;border-radius:100px;padding:2px 8px;font-size:11px;font-weight:600;margin-left:6px;">🖊️ Modificata</span>` : "";
    const badgeRfbook = isRfbook ? `<span style="background:#fff0e8;color:#f97316;border-radius:100px;padding:2px 8px;font-size:11px;font-weight:600;margin-left:6px;">📱 RistoflowBook</span>` : "";

    const token = p.token_pubblico || "";
    const landingUrl = token ? `https://ristoflow-ai.com/prenotazione.html?t=${token}` : "";

    return `
      <div class="pren-card">
        <div class="pren-card-top">
          <div class="pren-time">
            <div class="pren-time-hour">${escapeHtml(p.ora || "--:--")}</div>
            <div class="pren-time-service">${serviceLabel(servizio)}</div>
          </div>

          <div class="pren-main">
            <div class="pren-name-row">
              <div class="pren-name">${escapeHtml(nome + cognome)}${badgeChatbot}${badgeModifica}${badgeRfbook}</div>
              <div class="pren-status" style="background:${stato.bg};color:${stato.color};">
                <span>${stato.emoji}</span>
                <span>${stato.label}</span>
              </div>
            </div>

            <div class="pren-meta">
              <div class="pren-meta-item">👥 ${coperti} coperti</div>
              ${telefono ? `<div class="pren-meta-item">📞 ${escapeHtml(telefono)}</div>` : ""}
              <div class="pren-meta-item">${tavoloText}</div>
            </div>

            ${note}
          </div>
        </div>

        <div class="pren-card-actions">
          <button type="button" class="pren-action-btn ${telefono ? "primary" : ""} chiama" data-phone="${escapeAttribute(telefono)}" ${telefono ? "" : "disabled"}>📞</button>
          <button type="button" class="pren-action-btn ${telefono ? "success" : ""} whatsapp" data-phone="${escapeAttribute(telefono)}" data-id="${escapeAttribute(p.id)}" ${telefono ? "" : "disabled"}>💬</button>
          <button type="button" class="pren-action-btn warn assegna" data-id="${escapeAttribute(p.id)}">🪑</button>
          <button type="button" class="pren-action-btn conferma" data-id="${escapeAttribute(p.id)}">✅</button>
          <button type="button" class="pren-action-btn arriva" data-id="${escapeAttribute(p.id)}">🙋</button>
          <button type="button" class="pren-action-btn danger no-show" data-id="${escapeAttribute(p.id)}">🚫</button>
        </div>

        <!-- Riga WA conferma + landing -->
        <div style="display:grid;grid-template-columns:1fr${landingUrl ? " auto" : ""};gap:8px;margin-top:8px;">
          <button
            type="button"
            class="pren-action-btn wa-confirm"
            data-id="${escapeAttribute(p.id)}"
            data-phone="${escapeAttribute(telefono)}"
            data-token="${escapeAttribute(token)}"
            ${telefono ? "" : "disabled"}
            style="height:40px;font-size:12px;"
          >📤 Conferma & invia WA</button>
          ${landingUrl ? `
            <a
              href="${escapeAttribute(landingUrl)}"
              target="_blank"
              class="pren-action-btn landing"
              style="height:40px;font-size:12px;display:flex;align-items:center;justify-content:center;text-decoration:none;"
            >🔗 Landing</a>
          ` : ""}
        </div>

        ${landingUrl ? `
          <a href="${escapeAttribute(landingUrl)}" target="_blank" class="pren-landing-link">
            🔗 ${escapeHtml(landingUrl)}
          </a>
        ` : ""}

        <select class="pren-status-select change-stato" data-id="${escapeAttribute(p.id)}">
          ${statoOptions(p.stato)}
        </select>
      </div>
    `;
  }

  function statoOptions(current) {
    const stati = ["nuova", "confermata", "arrivata", "no_show", "annullata"];
    return stati.map((s) => {
      const meta = getStatusMeta(s);
      return `<option value="${s}" ${s === current ? "selected" : ""}>${meta.emoji} ${meta.label}</option>`;
    }).join("");
  }

  function attachEvents() {
    document.querySelectorAll(".change-stato").forEach((el) => {
      el.onchange = async (e) => {
        const id = e.target.dataset.id;
        const stato = e.target.value;
        await updateStatoPrenotazione(id, stato);
      };
    });

    document.querySelectorAll(".assegna").forEach((btn) => {
      btn.onclick = () => openTavoli(btn.dataset.id);
    });

    document.querySelectorAll(".conferma").forEach((btn) => {
      btn.onclick = async () => {
        await updateStatoPrenotazione(btn.dataset.id, "confermata");
      };
    });

    document.querySelectorAll(".arriva").forEach((btn) => {
      btn.onclick = async () => {
        await updateStatoPrenotazione(btn.dataset.id, "arrivata");
      };
    });

    document.querySelectorAll(".no-show").forEach((btn) => {
      btn.onclick = async () => {
        await updateStatoPrenotazione(btn.dataset.id, "no_show");
      };
    });

    document.querySelectorAll(".chiama").forEach((btn) => {
      btn.onclick = () => {
        const phone = btn.dataset.phone || "";
        if (!phone) return;
        window.location.href = `tel:${sanitizePhone(phone)}`;
      };
    });

    document.querySelectorAll(".whatsapp").forEach((btn) => {
      btn.onclick = () => {
        const phone = btn.dataset.phone || "";
        const id = btn.dataset.id || "";
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
      };
    });

    document.querySelectorAll(".wa-confirm").forEach((btn) => {
      btn.onclick = async () => {
        const id    = btn.dataset.id    || "";
        const phone = btn.dataset.phone || "";
        const token = btn.dataset.token || "";
        if (!phone) return;

        const pren = state.prenotazioni.find((p) => String(p.id) === String(id));
        if (!pren) return;

        const nome     = pren.cliente_nome || pren.nome_cliente || "Cliente";
        const data     = pren.data ? formatDateHuman(pren.data) : "";
        const ora      = pren.ora ? pren.ora.slice(0, 5) : "";
        const coperti  = pren.coperti || 1;
        const landing  = token ? `https://ristoflow-ai.com/p.html?t=${token}` : "";
        const nomeRist = window.state?.azienda?.nome || "il ristorante";

        btn.disabled = true;
        btn.textContent = "⏳ Invio...";

        try {
          // 1. Aggiorna stato a "confermata" se non già confermata
          if (pren.stato === "nuova") {
            await window.supabaseClient
              .from("prenotazioni_tavoli")
              .update({ stato: "confermata", link_landing: landing })
              .eq("id", id);
          } else if (landing) {
            await window.supabaseClient
              .from("prenotazioni_tavoli")
              .update({ link_landing: landing })
              .eq("id", id);
          }

          // 2. Invia WA via edge function
          const SUPA_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
          const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

          const body = {
            to: sanitizePhone(phone),
            template: "ristoflow_notifica",
            language: "it",
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: nome },
                  { type: "text", text: `${data} alle ${ora}` },
                  { type: "text", text: String(coperti) },
                  { type: "text", text: nomeRist },
                  { type: "text", text: landing || "ristoflow-ai.com" }
                ]
              }
            ]
          };

          const res = await fetch(`${SUPA_URL}/functions/v1/whatsapp-send-ts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify(body)
          });

          const json = await res.json();

          if (!res.ok) {
            console.error("WA error:", json);
            btn.disabled = false;
            btn.textContent = "📤 Conferma & invia WA";
            alert("WA inviato ma controlla console: " + (json?.error || "errore sconosciuto"));
            return;
          }

          btn.textContent = "✅ Inviato!";
          setTimeout(async () => {
            btn.disabled = false;
            btn.textContent = "📤 Conferma & invia WA";
            await load();
          }, 2000);

        } catch (err) {
          console.error("wa-confirm error:", err);
          btn.disabled = false;
          btn.textContent = "📤 Conferma & invia WA";
          alert("Errore invio: " + err.message);
        }
      };
    });
  }

  async function updateStatoPrenotazione(id, stato) {
    const { error } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .update({ stato, ...(stato === "arrivata" ? { arrivato_il: new Date().toISOString() } : {}) })
      .eq("id", id);

    if (error) {
      console.error("ERRORE UPDATE STATO:", error);
      alert("Errore aggiornamento stato");
      return;
    }

    // Se il cliente è arrivato → iscrivilo alla catenaria "nuovo contatto"
    if (stato === "arrivata") {
      await iscriviACatenariaNuovoContatto(id);
    }

    await load();
  }

  async function iscriviACatenariaNuovoContatto(prenId) {
    try {
      // Leggi la prenotazione per avere nome e telefono
      const { data: pren } = await window.supabaseClient
        .from("prenotazioni_tavoli")
        .select("cliente_nome, cliente_telefono, cliente_email, azienda_id, sondaggio_inviato")
        .eq("id", prenId)
        .maybeSingle();

      if (!pren || !pren.cliente_telefono || pren.sondaggio_inviato) return;

      // Trova la catenaria "primo contatto" attiva per questa azienda
      const { data: catenarie } = await window.supabaseClient
        .from("catenarie")
        .select("id, catenarie_step(*)")
        .eq("azienda_id", pren.azienda_id)
        .eq("trigger_tipo", "prima_visita")
        .eq("attiva", true)
        .limit(5);

      if (!catenarie?.length) return;

      for (const cat of catenarie) {
        // Controlla se già iscritto
        const { data: esistente } = await window.supabaseClient
          .from("catenarie_iscritti")
          .select("id")
          .eq("catenaria_id", cat.id)
          .eq("contatto_telefono", pren.cliente_telefono)
          .maybeSingle();

        if (esistente) continue;

        // Primo step
        const primoStep = (cat.catenarie_step || []).sort((a,b)=>a.ordine-b.ordine)[0];
        const dataProssimoStep = primoStep
          ? new Date(Date.now() + (primoStep.delay_giorni||1) * 86400000).toISOString()
          : new Date(Date.now() + 86400000).toISOString();

        await window.supabaseClient.from("catenarie_iscritti").insert({
          catenaria_id:      cat.id,
          azienda_id:        pren.azienda_id,
          contatto_nome:     pren.cliente_nome || "",
          contatto_telefono: pren.cliente_telefono,
          contatto_email:    pren.cliente_email || null,
          step_corrente:     0,
          data_prossimo_step: dataProssimoStep,
          trigger_fonte:     "prenotazione_arrivata",
          completata:        false,
          sospesa:           false,
        });
      }

      // Marca la prenotazione come sondaggio_inviato per evitare duplicati
      await window.supabaseClient
        .from("prenotazioni_tavoli")
        .update({ sondaggio_inviato: true })
        .eq("id", prenId);

    } catch(e) {
      console.warn("Catenaria iscrizione error:", e);
    }
  }

  async function openTavoli(prenId) {
    state.currentPrenId = prenId;

    let query = window.supabaseClient
      .from("tavoli")
      .select("id,nome,numero,sala_id,sede_id,coperti_min,coperti_max,sedie,posizione,attivo,pos_x,pos_y")
      .eq("azienda_id", aziendaId)
      .eq("attivo", true)
      .order("numero");

    if (sedeId) {
      query = query.eq("sede_id", sedeId);
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
      case "colazione": return "COLAZ.";
      case "aperitivo": return "APER.";
      case "pranzo": return "PRANZO";
      case "cena": return "CENA";
      default: return "SERV.";
    }
  }

  function getStatusMeta(stato) {
    switch (stato) {
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
function parseLocalDate(value) {

  const [y, m, d] =
    String(value)
      .split("-")
      .map(Number);

  return new Date(
    y,
    m - 1,
    d
  );

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
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  await load();
}
