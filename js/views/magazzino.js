import "../supabaseClient.js";
import "../state.js";
import { render as renderAnagraficaProdotti } from "./prodotti.js";

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

      <div class="view mag-card" data-tab="anagrafica">
        <h3>Anagrafica Prodotti</h3>
        <p>UM • IVA • Categorie • Scorte</p>
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
      if (tab === "anagrafica") renderAnagraficaProdotti(content);
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

    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
      <input 
        type="text" 
        id="magazzino-search" 
        class="input-pill" 
        placeholder="🔎 Cerca prodotto..."
        style="flex:1 1 260px;"
      />
      <button class="app-button tiny gray" id="btn-back-mag-home">← Menu Magazzino</button>
    </div>

    <div id="magazzino-table-container"></div>

    <div id="magazzino-carico-backdrop"
      style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; padding:16px; overflow:auto;">
      <div class="view"
        style="max-width:560px; margin:0 auto; border-radius:14px; padding:16px;">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
          <h3 style="margin:0;">📦 Carico Giacenza</h3>
          <button id="btn-close-carico" class="app-button tiny gray">✕ Chiudi</button>
        </div>

        <div class="small-muted" id="carico-prodotto-label" style="margin-top:8px;"></div>

        <div class="editor-stack" style="margin-top:12px;">
          <label>
            Quantità da caricare
            <input id="carico-quantita" type="number" step="0.001" min="0" class="input-pill" placeholder="Es: 12.500" />
          </label>

          <label style="margin-top:10px;">
            Data movimento
            <input id="carico-data" type="date" class="input-pill" />
          </label>

          <label style="margin-top:10px;">
            Note
            <input id="carico-note" class="input-pill" />
          </label>

          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <button id="btn-conferma-carico" class="app-button green">✅ Registra Carico</button>
            <button id="btn-annulla-carico" class="app-button gray">Annulla</button>
          </div>

          <div id="carico-esito" class="small-muted" style="margin-top:10px;"></div>
        </div>
      </div>
    </div>
  `;

  const tableContainer = document.getElementById("magazzino-table-container");
  const searchInput = document.getElementById("magazzino-search");
  const btnBackHome = document.getElementById("btn-back-mag-home");

  btnBackHome?.addEventListener("click", () => renderHome(azienda));

  function renderTable(filteredData) {
    tableContainer.innerHTML = `
      <table class="table-timbrature">
        <thead>
          <tr>
            <th>Codice</th>
            <th>Descrizione</th>
            <th>Giacenza</th>
            <th>Scorta Min.</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          ${(filteredData || []).map(p => `
            <tr ${Number(p.giacenza_attuale) <= Number(p.scorta_minima || 0) ? "style='background:#fee2e2;'" : ""}>
              <td>${escapeHtml(p.codice_interno || "")}</td>
              <td>${escapeHtml(p.descrizione || "")}</td>
              <td>${Number(p.giacenza_attuale || 0).toFixed(3)}</td>
              <td>${Number(p.scorta_minima || 0)}</td>
              <td>
                <button class="app-button tiny gray btn-apri-carico"
                  data-prodotto-id="${escapeHtml(p.prodotto_id || "")}"
                  data-prodotto-label="${escapeHtml((p.codice_interno ? p.codice_interno + " · " : "") + (p.descrizione || ""))}">
                  + Carica
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    tableContainer.querySelectorAll(".btn-apri-carico").forEach(btn => {
      btn.addEventListener("click", () => {
        const prodottoId = btn.getAttribute("data-prodotto-id");
        const prodottoLabel = btn.getAttribute("data-prodotto-label");
        apriCaricoModal({
          aziendaId: azienda.id,
          prodottoId,
          prodottoLabel,
          onSuccess: () => renderProdotti(container, azienda, tipoProdotto)
        });
      });
    });
  }

  renderTable(data);

  searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();

    if (value.length === 0) {
      renderTable(data);
      return;
    }

    if (value.length < 2) {
      tableContainer.innerHTML = `<p style="opacity:0.6;">Digita almeno 2 lettere...</p>`;
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
/* =================== CARICO GIACENZA ================== */
/* ===================================================== */

function apriCaricoModal({ aziendaId, prodottoId, prodottoLabel, onSuccess }) {
  const backdrop = document.getElementById("magazzino-carico-backdrop");
  const btnClose = document.getElementById("btn-close-carico");
  const btnAnnulla = document.getElementById("btn-annulla-carico");
  const btnConferma = document.getElementById("btn-conferma-carico");

  const label = document.getElementById("carico-prodotto-label");
  const qtaEl = document.getElementById("carico-quantita");
  const dataEl = document.getElementById("carico-data");
  const noteEl = document.getElementById("carico-note");
  const esitoEl = document.getElementById("carico-esito");

  if (!backdrop || !btnClose || !btnAnnulla || !btnConferma || !label || !qtaEl || !dataEl || !noteEl || !esitoEl) {
    alert("UI carico non disponibile.");
    return;
  }

  if (!prodottoId) {
    alert("Prodotto non valido.");
    return;
  }

  esitoEl.innerText = "";
  label.innerText = prodottoLabel ? `Prodotto: ${prodottoLabel}` : "Prodotto selezionato";
  qtaEl.value = "";
  dataEl.value = new Date().toISOString().slice(0, 10);
  noteEl.value = "Inventario iniziale";

  backdrop.style.display = "block";

  const close = () => {
    backdrop.style.display = "none";
    btnConferma.removeAttribute("disabled");
  };

  btnClose.onclick = close;
  btnAnnulla.onclick = close;

  backdrop.onclick = (e) => {
    if (e.target?.id === "magazzino-carico-backdrop") close();
  };

  btnConferma.onclick = async () => {
    const q = Number(qtaEl.value || 0);
    const d = (dataEl.value || "").trim();
    const note = (noteEl.value || "").trim();

    if (!q || q <= 0) return alert("Inserisci una quantità > 0.");
    if (!d) return alert("Seleziona una data.");

    btnConferma.setAttribute("disabled", "disabled");
    esitoEl.innerText = "Salvataggio...";

    const { error } = await window.supabaseClient
      .from("magazzino_movimenti")
      .insert({
        azienda_id: aziendaId,
        prodotto_id: prodottoId,
        tipo_movimento: "CARICO",
        quantita: q,
        data_movimento: d,
        riferimento_tipo: "INVENTARIO",
        note: note || "Inventario iniziale"
      });

    if (error) {
      console.error("Errore carico magazzino:", error);
      esitoEl.innerText = "Errore durante il carico. Controlla console.";
      btnConferma.removeAttribute("disabled");
      return;
    }

    esitoEl.innerText = "Carico registrato ✔️";
    setTimeout(() => {
      close();
      if (typeof onSuccess === "function") onSuccess();
    }, 350);
  };
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
        ${(data || []).map(m => `
          <tr>
            <td>${escapeHtml(m.prodotti?.descrizione || "")}</td>
            <td>${escapeHtml(m.fornitori?.ragione_sociale || "")}</td>
            <td>${escapeHtml(m.codice_fornitore || "")}</td>
            <td>${Number(m.prezzo_ultimo_acquisto || 0)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
