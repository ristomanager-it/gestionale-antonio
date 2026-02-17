import "../supabaseClient.js";
import "../state.js";

export async function render(container) {
  const azienda = window.state.azienda;

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <h3>Nessuna azienda attiva</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <button class="app-button tiny gray" id="btn-back-dashboard" style="margin-bottom:10px;">
        ← Torna alla Dashboard
      </button>

      <h2>Modulo Magazzino</h2>

      <div id="magazzino-home"></div>
      <div id="magazzino-content" style="margin-top:20px;"></div>

    </div>
  `;

  document
    .getElementById("btn-back-dashboard")
    .addEventListener("click", () => {
      window.location.hash = "#/home";
    });

  renderHome(azienda);
}

/* ===================================================== */
/* ===================== HOME CARD ====================== */
/* ===================================================== */

function renderHome(azienda) {
  const home = document.getElementById("magazzino-home");
  const content = document.getElementById("magazzino-content");

  home.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px;">

      <div class="view mag-card" data-type="materia_prima">
        <h3>Materie Prime</h3>
        <p>Magazzino acquisti</p>
      </div>

      <div class="view mag-card" data-type="semilavorato">
        <h3>Preparazioni</h3>
        <p>Semilavorati prodotti</p>
      </div>

      <div class="view mag-card" data-type="prodotto_finito">
        <h3>Prodotti Finiti</h3>
        <p>Pronti alla vendita</p>
      </div>

      <div class="view mag-card" data-tab="mapping">
        <h3>Mapping Fornitori</h3>
      </div>

    </div>
  `;

  document.querySelectorAll(".mag-card").forEach(card => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const type = card.dataset.type;
      const tab = card.dataset.tab;

      if (type) renderProdotti(content, azienda, type);
      if (tab === "mapping") renderMapping(content, azienda);
    });
  });
}

/* ===================================================== */
/* ===================== PRODOTTI ======================= */
/* ===================================================== */

async function renderProdotti(container, azienda, tipoProdotto) {
  container.innerHTML = `<p>Caricamento prodotti...</p>`;

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_giacenze")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("tipo_prodotto", tipoProdotto)
    .order("descrizione");

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  const titolo = {
    materia_prima: "Magazzino Materie Prime",
    semilavorato: "Magazzino Preparazioni",
    prodotto_finito: "Magazzino Prodotti Finiti"
  }[tipoProdotto] || "Magazzino";

  container.innerHTML = `
    <h3>${titolo}</h3>

    <input 
      type="text" 
      id="magazzino-search" 
      class="input-pill" 
      placeholder="🔎 Cerca prodotto..."
      style="margin-bottom:12px;"
    />

    <div id="magazzino-table-container"></div>
  `;

  const tableContainer = document.getElementById("magazzino-table-container");
  const searchInput = document.getElementById("magazzino-search");

  function renderTable(filteredData) {
    tableContainer.innerHTML = `
      <table class="table-timbrature">
        <thead>
          <tr>
            <th>Codice</th>
            <th>Descrizione</th>
            <th>Giacenza</th>
            <th>Scorta Min.</th>
          </tr>
        </thead>
        <tbody>
          ${(filteredData || []).map(p => `
            <tr ${Number(p.giacenza_attuale) <= Number(p.scorta_minima || 0) ? "style='background:#fee2e2;'" : ""}>
              <td>${p.codice_interno || ""}</td>
              <td>${p.descrizione || ""}</td>
              <td>${Number(p.giacenza_attuale || 0).toFixed(3)}</td>
              <td>${p.scorta_minima || 0}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  renderTable(data);

  searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();

    if (value.length === 0) {
      renderTable(data);
      return;
    }

    if (value.length < 2) {
      tableContainer.innerHTML = `
        <p style="opacity:0.6;">Digita almeno 2 lettere...</p>
      `;
      return;
    }

    const filtered = data.filter(p =>
      (p.descrizione || "").toLowerCase().includes(value) ||
      (p.codice_interno || "").toLowerCase().includes(value)
    );

    renderTable(filtered);
  });
}

/* ===================================================== */
/* =================== MAPPING FORNITORI =============== */
/* ===================================================== */

async function renderMapping(container, azienda) {
  container.innerHTML = `<p>Caricamento mapping...</p>`;

  const { data, error } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select(`
      id,
      codice_fornitore,
      descrizione_fornitore,
      prezzo_ultimo_acquisto,
      fornitori:fornitore_id ( ragione_sociale ),
      prodotti:prodotto_id ( descrizione )
    `)
    .eq("azienda_id", azienda.id)
    .eq("attivo", true);

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h3>Mapping Fornitori</h3>

    <table class="table-timbrature">
      <thead>
        <tr>
          <th>Prodotto Interno</th>
          <th>Fornitore</th>
          <th>Codice Fornitore</th>
          <th>Ultimo Prezzo</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(m => `
          <tr>
            <td>${m.prodotti?.descrizione || ""}</td>
            <td>${m.fornitori?.ragione_sociale || ""}</td>
            <td>${m.codice_fornitore || ""}</td>
            <td>${m.prezzo_ultimo_acquisto || 0}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
