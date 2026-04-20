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

          <div style="display:flex;align-items:end;gap:10px;">
            <button class="app-button" id="btn-refresh">Aggiorna</button>
            <button class="app-button" id="btn-new">➕ Nuova</button>
            <button class="app-button" id="go-sala">🪑 Sala</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div id="lista-prenotazioni"></div>
      </div>

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

  const today = new Date().toISOString().split("T")[0];
  filtroData.value = today;

  document.getElementById("btn-refresh").onclick = load;
  document.getElementById("btn-new").onclick = () => {
    window.location.hash = "#/prenotazione-tavolo-form";
  };
  document.getElementById("go-sala").onclick = () => {
    window.location.hash = "#/sala";
  };
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
      .select("*");

    if (aziendaId) query = query.eq("azienda_id", aziendaId);
    if (sedeId) query = query.eq("sede_id", sedeId);
    if (filtroData.value) query = query.eq("data", filtroData.value);
    if (filtroStato.value) query = query.eq("stato", filtroStato.value);

    query = query.order("ora", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error(error);
      lista.innerHTML = "Errore";
      return;
    }

    prenotazioni = data || [];

    if (!prenotazioni.length) {
      lista.innerHTML = "Nessuna prenotazione";
      return;
    }

    lista.innerHTML = prenotazioni.map(renderRow).join("");
    attachEvents();
  }

  function renderRow(p) {
    return `
      <div class="pren-row">
        <div>${p.ora || "-"}</div>
        <div>${p.cliente_nome || "Cliente"}</div>
        <div>${p.coperti || 0} coperti</div>
        <button class="assegna" data-id="${p.id}">Tavolo</button>
      </div>
    `;
  }

  function attachEvents() {
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

    if (!pren) {
      box.innerHTML = "Errore prenotazione";
      return;
    }

    const copertiRichiesti = pren.coperti || 0;

    const tavoliOrdinati = [...tavoli]
      .map(t => ({
        ...t,
        diff: (t.coperti_max || 0) - copertiRichiesti
      }))
      .filter(t => t.coperti_max >= copertiRichiesti)
      .sort((a, b) => a.diff - b.diff);

    if (!tavoliOrdinati.length) {
      box.innerHTML = `
        <div style="padding:20px;">
          Nessun tavolo disponibile
        </div>
      `;
      return;
    }

    box.innerHTML = tavoliOrdinati.map(t => `
      <div class="tavolo-item" data-id="${t.id}">
        ${t.nome} (${t.coperti_max})
      </div>
    `).join("");

    box.querySelectorAll(".tavolo-item").forEach(el => {
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
