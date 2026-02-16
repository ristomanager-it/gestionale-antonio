import "../supabaseClient.js";
import "../state.js";

export async function render(container) {
  const azienda = window.state.azienda;

  if (!azienda) {
    container.innerHTML = `<div class="view"><h3>Nessuna azienda attiva</h3></div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2>Modulo Acquisti</h2>

      <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
        <button class="app-button tiny tab-btn active" data-tab="fatture">Fatture</button>
        <button class="app-button tiny tab-btn" data-tab="fornitori">Fornitori</button>
        <button class="app-button tiny tab-btn" data-tab="ordini">Ordini</button>
        <button class="app-button tiny tab-btn" data-tab="riordino">Riordino</button>
      </div>

      <div id="acquisti-content"></div>
    </div>
  `;

  const content = document.getElementById("acquisti-content");
  const tabButtons = document.querySelectorAll(".tab-btn");

  function setActiveTab(tab) {
    tabButtons.forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.tab === tab) btn.classList.add("active");
    });
  }

  function renderTab(tab) {
    setActiveTab(tab);

    if (tab === "fatture") renderFatture(content, azienda);
    if (tab === "fornitori") renderFornitori(content, azienda);
    if (tab === "ordini") renderOrdini(content);
    if (tab === "riordino") renderRiordino(content);
  }

  tabButtons.forEach(btn =>
    btn.addEventListener("click", () => renderTab(btn.dataset.tab))
  );

  renderTab("fatture");
}

/* ===================================================== */
/* ================== TAB FATTURE ====================== */
/* ===================================================== */

async function renderFatture(container, azienda) {

  const { data: fornitori } = await window.supabaseClient
    .from("fornitori")
    .select("id, ragione_sociale")
    .eq("azienda_id", azienda.id)
    .eq("attivo", true);

  container.innerHTML = `
    <h3>Nuova Fattura</h3>

    <label>Fornitore</label>
    <select id="fattura-fornitore" class="input-pill">
      <option value="">Seleziona fornitore</option>
      ${(fornitori || []).map(f =>
        `<option value="${f.id}">${f.ragione_sociale}</option>`
      ).join("")}
    </select>

    <label>Numero</label>
    <input id="fattura-numero" class="input-pill" />

    <label>Data</label>
    <input id="fattura-data" type="date" class="input-pill" />

    <div id="righe-container" style="margin-top:20px;"></div>

    <button id="btn-add-riga" class="app-button small gray">
      + Riga
    </button>

    <hr style="margin:16px 0;" />

    <button id="btn-salva-fattura" class="app-button small green">
      Salva e Processa
    </button>

    <div id="fattura-feedback" style="margin-top:10px;"></div>
  `;

  const righeContainer = document.getElementById("righe-container");
  const btnAddRiga = document.getElementById("btn-add-riga");
  const btnSalva = document.getElementById("btn-salva-fattura");
  const feedback = document.getElementById("fattura-feedback");

  let righe = [];

  btnAddRiga.addEventListener("click", () => {
    const index = righe.length;
    righe.push({});
    const row = document.createElement("div");
    row.style.marginBottom = "10px";
    row.style.position = "relative";

    row.innerHTML = `
      <input type="text" placeholder="Cerca prodotto..."
        class="input-pill riga-search"
        data-i="${index}" autocomplete="off"/>

      <div class="autocomplete-results"
        data-i="${index}"
        style="position:absolute; background:white; border:1px solid #ddd; width:300px; z-index:1000;"></div>

      <input type="number" step="0.001"
        placeholder="Quantità"
        class="input-pill riga-quantita"
        data-i="${index}" />

      <input type="number" step="0.0001"
        placeholder="Costo Unitario"
        class="input-pill riga-prezzo"
        data-i="${index}" />
    `;

    righeContainer.appendChild(row);
  });

  righeContainer.addEventListener("input", async e => {

    const i = e.target.dataset.i;
    if (i === undefined) return;

    if (e.target.classList.contains("riga-search")) {
      const query = e.target.value;

      if (query.length < 2) return;

      const { data } = await window.supabaseClient
        .from("prodotti")
        .select("id, descrizione, codice_interno")
        .eq("azienda_id", azienda.id)
        .ilike("descrizione", `%${query}%`)
        .limit(10);

      const box = document.querySelector(`.autocomplete-results[data-i="${i}"]`);
      box.innerHTML = (data || []).map(p => `
        <div style="padding:6px; cursor:pointer;"
          data-id="${p.id}"
          data-desc="${p.descrizione}">
          ${p.descrizione}
        </div>
      `).join("");

      box.querySelectorAll("div").forEach(el => {
        el.addEventListener("click", () => {
          righe[i].prodotto_id = Number(el.dataset.id);
          e.target.value = el.dataset.desc;
          box.innerHTML = "";
        });
      });
    }

    if (e.target.classList.contains("riga-quantita")) {
      righe[i].quantita = Number(e.target.value);
    }

    if (e.target.classList.contains("riga-prezzo")) {
      righe[i].prezzo_unitario = Number(e.target.value);
    }
  });

  btnSalva.addEventListener("click", async () => {

    feedback.innerHTML = "Salvataggio...";

    try {

      const fornitoreId = document.getElementById("fattura-fornitore").value;
      if (!fornitoreId) throw new Error("Seleziona fornitore");

      const { data: fattura } = await window.supabaseClient
        .from("fatture_acquisto")
        .insert({
          azienda_id: azienda.id,
          fornitore_id: fornitoreId,
          numero: document.getElementById("fattura-numero").value,
          data: document.getElementById("fattura-data").value
        })
        .select()
        .single();

      const righePulite = righe.filter(r => r.prodotto_id && r.quantita);

      if (righePulite.length > 0) {
        await window.supabaseClient
          .from("fatture_acquisto_righe")
          .insert(righePulite.map(r => ({
            azienda_id: azienda.id,
            fattura_id: fattura.id,
            prodotto_id: r.prodotto_id,
            quantita: r.quantita,
            prezzo_unitario: r.prezzo_unitario || 0
          })));
      }

      await window.supabaseClient.rpc("processa_fattura_acquisto", {
        p_azienda_id: azienda.id,
        p_fattura_id: fattura.id
      });

      feedback.innerHTML = "<span style='color:green;'>Fattura processata.</span>";

    } catch (err) {
      feedback.innerHTML = "<span style='color:red;'>" + err.message + "</span>";
    }
  });
}

/* ===================================================== */
/* Placeholder altri tab */
/* ===================================================== */

function renderFornitori(container) {
  container.innerHTML = "<h3>Fornitori</h3><p>In sviluppo</p>";
}

function renderOrdini(container) {
  container.innerHTML = "<h3>Ordini</h3><p>In sviluppo</p>";
}

function renderRiordino(container) {
  container.innerHTML = "<h3>Riordino</h3><p>In sviluppo</p>";
}
