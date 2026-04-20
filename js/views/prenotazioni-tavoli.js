export async function render(container) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>📅 Prenotazioni Tavoli</h1>
      </div>

      <div class="card">
        <div class="form-row">
          <div>
            <label>Data</label>
            <input type="date" id="filtro-data" class="input"/>
          </div>

          <div>
            <label>Stato</label>
            <select id="filtro-stato" class="input">
              <option value="">Tutti</option>
              <option value="nuova">Nuova</option>
              <option value="confermata">Confermata</option>
              <option value="arrivata">Arrivata</option>
              <option value="no_show">No Show</option>
              <option value="annullata">Annullata</option>
            </select>
          </div>

          <div style="display:flex;align-items:end;">
            <button class="app-button" id="btn-refresh">Aggiorna</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div id="lista-prenotazioni"></div>
      </div>

      <!-- MODALE TAVOLI -->
      <div id="modal-tavoli" class="modal" style="display:none;">
        <div class="modal-content">
          <h3>Seleziona Tavolo</h3>
          <div id="lista-tavoli"></div>
          <button class="app-button gray" id="close-modal">Chiudi</button>
        </div>
      </div>
    </div>
  `;

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  const lista = document.getElementById("lista-prenotazioni");
  const filtroData = document.getElementById("filtro-data");
  const filtroStato = document.getElementById("filtro-stato");

  // default oggi
  const today = new Date().toISOString().split("T")[0];
  filtroData.value = today;

  document.getElementById("btn-refresh").onclick = load;

  document.getElementById("close-modal").onclick = () => {
    document.getElementById("modal-tavoli").style.display = "none";
  };

  let prenotazioni = [];
  let tavoli = [];
  let currentPrenId = null;

  async function load() {
    lista.innerHTML = "Caricamento...";

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .order("ora", { ascending: true });

    if (filtroData.value) {
      query = query.eq("data", filtroData.value);
    }

    if (filtroStato.value) {
      query = query.eq("stato", filtroStato.value);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      lista.innerHTML = `<div class="empty">Errore caricamento</div>`;
      return;
    }

    prenotazioni = data || [];

    if (!prenotazioni.length) {
      lista.innerHTML = `<div class="empty">Nessuna prenotazione</div>`;
      return;
    }

    lista.innerHTML = prenotazioni.map(p => renderRow(p)).join("");

    attachEvents();
  }

  function renderRow(p) {
    return `
      <div class="pren-row" data-id="${p.id}">
        <div class="pren-main">
          <div class="pren-time">${p.ora || "-"}</div>
          <div class="pren-info">
            <div class="pren-nome">${p.cliente_nome || "Cliente"}</div>
            <div class="pren-sub">
              ${p.coperti || 0} coperti
              ${p.cliente_telefono ? " · " + p.cliente_telefono : ""}
            </div>
          </div>
        </div>

        <div class="pren-actions">
          <select class="change-stato" data-id="${p.id}">
            ${statoOptions(p.stato)}
          </select>

          <button class="app-button tiny assegna" data-id="${p.id}">
            Tavolo
          </button>
        </div>
      </div>
    `;
  }

  function statoOptions(current) {
    const stati = ["nuova", "confermata", "arrivata", "no_show", "annullata"];

    return stati.map(s => `
      <option value="${s}" ${s === current ? "selected" : ""}>
        ${s}
      </option>
    `).join("");
  }

  function attachEvents() {

    document.querySelectorAll(".change-stato").forEach(el => {
      el.onchange = async (e) => {
        const id = e.target.dataset.id;
        const stato = e.target.value;

        await window.supabaseClient
          .from("prenotazioni_tavoli")
          .update({ stato })
          .eq("id", id);

        load();
      };
    });

    document.querySelectorAll(".assegna").forEach(btn => {
      btn.onclick = () => openTavoli(btn.dataset.id);
    });
  }

  async function openTavoli(prenId) {

    currentPrenId = prenId;

    const { data } = await window.supabaseClient
      .from("tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .eq("attivo", true);

    tavoli = data || [];

    renderTavoli();

    document.getElementById("modal-tavoli").style.display = "block";
  }

  function renderTavoli() {

    const box = document.getElementById("lista-tavoli");

    const pren = prenotazioni.find(p => p.id == currentPrenId);

    box.innerHTML = tavoli.map(t => {

      const ok = t.coperti_max >= (pren?.coperti || 0);

      return `
        <div class="tavolo-item ${ok ? "" : "disabled"}" data-id="${t.id}">
          <strong>${t.nome}</strong>
          <div>${t.coperti_max} coperti</div>
          ${!ok ? "<small>Troppo piccolo</small>" : ""}
        </div>
      `;
    }).join("");

    box.querySelectorAll(".tavolo-item").forEach(el => {

      if (el.classList.contains("disabled")) return;

      el.onclick = async () => {

        const tavoloId = el.dataset.id;

        await window.supabaseClient
          .from("prenotazioni_tavoli")
          .update({ tavolo_id: tavoloId })
          .eq("id", currentPrenId);

        document.getElementById("modal-tavoli").style.display = "none";

        load();
      };
    });
  }

  load();
}
