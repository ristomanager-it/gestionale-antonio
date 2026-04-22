export async function render(container) {

  const aziendaId = window.state?.azienda?.id || null;
  const sedeId = window.state?.sedeAttiva?.id || null;
  const sedeNome = window.state?.sedeAttiva?.nome || "Prenotazioni";

  container.innerHTML = `<!-- IL TUO HTML IDENTICO (NON MODIFICATO) -->`;

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

  // ✅ STATE UNICO
  const state = {
    filtroStato: "",
    vistaAttiva: "prenotazioni",
    prenotazioni: [],
    tavoli: [],
    currentPrenId: null,
    drawerOpen: null
  };

  // ================= INIT =================
  renderStatusChips();
  renderDays();
  renderActiveTab();
  attachEvents();

  // ================= EVENTI UI =================
  document.getElementById("btn-refresh").onclick = load;
  document.getElementById("btn-qr").onclick = () => alert("QR in arrivo");

  document.getElementById("footer-new").onclick = () => {
    window.location.hash = "#/prenotazioni-form";
  };

  document.getElementById("footer-agenda").onclick = () => {
    window.location.hash = "#/prenotazioni";
  };

  document.getElementById("footer-messaggi").onclick = () => {
    alert("Messaggi in arrivo");
  };

  document.getElementById("tab-prenotazioni").onclick = () => {
    state.vistaAttiva = "prenotazioni";
    renderActiveTab();
    load();
  };

  document.getElementById("tab-arrivi").onclick = () => {
    state.vistaAttiva = "arrivi";
    renderActiveTab();
    load();
  };

  document.getElementById("tab-piantina").onclick = () => {
    window.location.hash = "#/sala";
  };

  document.getElementById("pren-menu-trigger").onclick = () => toggleDrawer("menu");
  document.getElementById("pren-actions-trigger").onclick = () => toggleDrawer("actions");
  overlay.onclick = closeDrawers;

  filtroData.onchange = () => {
    syncActiveDayFromInput();
    load();
  };

  filtroServizio.onchange = load;

  document.getElementById("close-modal").onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  // ================= LOAD =================
  async function load() {

    lista.innerHTML = `<div class="pren-loading">Caricamento...</div>`;

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*");

    if (aziendaId) query = query.eq("azienda_id", aziendaId);
    if (sedeId) query = query.eq("sede_id", sedeId);
    if (filtroData.value) query = query.eq("data", filtroData.value);

    if (state.vistaAttiva === "prenotazioni") {
      query = query.eq("stato", "confermata");
    } else if (state.vistaAttiva === "arrivi") {
      query = query.eq("stato", "arrivata");
    } else if (state.filtroStato) {
      query = query.eq("stato", state.filtroStato);
    }

    query = query.order("ora", { ascending: true });

    const { data, error } = await query;

    if (error) {
      lista.innerHTML = `<div class="pren-error">Errore</div>`;
      return;
    }

    let prenotazioni = data || [];

    prenotazioni = applyServiceFilter(prenotazioni);
    state.prenotazioni = prenotazioni;

    renderSummary(prenotazioni);

    if (!prenotazioni.length) {
      lista.innerHTML = `<div class="pren-empty">Nessuna prenotazione</div>`;
      return;
    }

    lista.innerHTML = prenotazioni.map(renderRow).join("");
  }

  // ================= ROW =================
  function renderRow(p) {
    const nome = p.cliente_nome || "Cliente";
    const coperti = Number(p.coperti) || 0;
    const ora = (p.ora || "").slice(0, 5);
    const note = p.note || "";

    return `
      <div class="pren-row">
        <div class="pren-col ora">${escapeHtml(ora)}</div>

        <div class="pren-col main">
          <div class="pren-nome cliente-link" data-id="${p.contatto_id}">
            ${escapeHtml(nome)} x${coperti}
          </div>
        </div>

        <div class="pren-col right">
          ${note ? `<span class="pren-ico note" data-note="${escapeAttribute(note)}">📝</span>` : ""}
          <span class="pren-ico msg" data-id="${p.id}">💬</span>
          <span class="pren-ico settings" data-id="${p.id}">⚙️</span>
        </div>
      </div>
    `;
  }

  // ================= EVENTI =================
  function attachEvents() {
    lista.addEventListener("click", (e) => {

      const cliente = e.target.closest(".cliente-link");
      if (cliente) {
        const id = cliente.dataset.id;
        if (!id) return alert("Cliente non collegato");
        window.location.hash = "#/cliente?id=" + id;
        return;
      }

      const msg = e.target.closest(".pren-ico.msg");
      if (msg) {
        alert("Chat cliente");
        return;
      }

      const settings = e.target.closest(".pren-ico.settings");
      if (settings) {
        window.location.hash = "#/prenotazioni-form?id=" + settings.dataset.id;
        return;
      }

      const note = e.target.closest(".pren-ico.note");
      if (note) {
        alert(note.dataset.note || "Nessuna nota");
        return;
      }

    });
  }

  // ================= UTILS =================
  function applyServiceFilter(list) {
    const servizio = filtroServizio.value;
    if (!servizio) return list;
    return list.filter(p => inferService(p) === servizio);
  }

  function renderSummary(list) {
    summaryBox.innerHTML = "";
  }

  function renderStatusChips() {}
  function renderActiveTab() {}
  function renderDays() {}
  function syncActiveDayFromInput() {}
  function closeModal() { modal.classList.remove("open"); }

  function toggleDrawer(type) {
    const target = type === "menu" ? drawerMenu : drawerActions;
    target.classList.toggle("open");
    overlay.classList.toggle("open");
  }

  function closeDrawers() {
    drawerMenu.classList.remove("open");
    drawerActions.classList.remove("open");
    overlay.classList.remove("open");
  }

  function inferService(p) {
    const ora = (p.ora || "").slice(0,5);
    if (ora < "11:00") return "colazione";
    if (ora < "15:30") return "pranzo";
    if (ora < "19:30") return "aperitivo";
    return "cena";
  }

  function formatDateInput(d){
    return d.toISOString().split("T")[0];
  }

  function escapeHtml(v){
    return String(v || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");
  }

  function escapeAttribute(v){
    return escapeHtml(v);
  }

  await load();
}
