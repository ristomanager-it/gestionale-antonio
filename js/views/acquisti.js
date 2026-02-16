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

    <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
      <button class="app-button tiny mode-btn active" data-mode="manuale">Manuale</button>
      <button class="app-button tiny mode-btn" data-mode="ocr">Carica Foto (OCR)</button>
      <button class="app-button tiny mode-btn" data-mode="import_api">Import API</button>
    </div>

    <div id="ocr-upload-section" style="display:none; margin-bottom:16px;">
      <label>Carica immagine fattura</label>
      <input type="file" id="fattura-file" accept="image/*,.pdf" class="input-pill"/>
      <button id="btn-esegui-ocr" class="app-button small gray" style="margin-top:8px;">
        Esegui OCR
      </button>
    </div>

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

  let mode = "manuale";
  let allegatoPath = null;
  let righe = [];

  const modeButtons = document.querySelectorAll(".mode-btn");
  const ocrSection = document.getElementById("ocr-upload-section");
  const righeContainer = document.getElementById("righe-container");
  const btnAddRiga = document.getElementById("btn-add-riga");
  const btnSalva = document.getElementById("btn-salva-fattura");
  const feedback = document.getElementById("fattura-feedback");
  const btnOcr = document.getElementById("btn-esegui-ocr");

  /* ================= MODE SWITCH ================= */

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      ocrSection.style.display = mode === "ocr" ? "block" : "none";
    });
  });

  /* ================= OCR FLOW ================= */

  btnOcr?.addEventListener("click", async () => {
    const fileInput = document.getElementById("fattura-file");
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    const path = `${azienda.id}/${new Date().getFullYear()}/${crypto.randomUUID()}_${file.name}`;

    feedback.innerHTML = "Upload in corso...";

    const { error: uploadError } = await window.supabaseClient.storage
      .from("fatture-acquisto")
      .upload(path, file);

    if (uploadError) {
      feedback.innerHTML = `<span style="color:red;">Upload fallito</span>`;
      return;
    }

    allegatoPath = path;

    const { data: signedData, error: signedError } =
      await window.supabaseClient.storage
        .from("fatture-acquisto")
        .createSignedUrl(path, 60);

    if (signedError) {
      feedback.innerHTML = `<span style="color:red;">Errore signed URL</span>`;
      return;
    }

    feedback.innerHTML = "OCR in elaborazione...";

    const { data: ocrResult, error: ocrError } =
      await window.supabaseClient.functions.invoke("ocr-fattura", {
        body: { imageUrl: signedData.signedUrl }
      });

    if (ocrError || !ocrResult?.success) {
      feedback.innerHTML = `<span style="color:red;">OCR fallito</span>`;
      return;
    }

    applyOcrResult(ocrResult);
    feedback.innerHTML = `<span style="color:green;">OCR completato. Verifica dati.</span>`;
  });

  /* ================= APPLY OCR RESULT ================= */

  async function applyOcrResult(result) {

    // Prefill documento
    if (result.documento?.numero_documento)
      document.getElementById("fattura-numero").value =
        result.documento.numero_documento;

    if (result.documento?.data_documento)
      document.getElementById("fattura-data").value =
        result.documento.data_documento;

    // Tentativo match fornitore
    if (result.fornitore?.ragione_sociale) {
      const nome = result.fornitore.ragione_sociale.toLowerCase();
      const match = (fornitori || []).find(f =>
        f.ragione_sociale.toLowerCase().includes(nome)
      );
      if (match)
        document.getElementById("fattura-fornitore").value = match.id;
    }

    // Generazione righe
    righe = [];
    righeContainer.innerHTML = "";

    (result.righe || []).forEach((riga, index) => {

      righe.push({
        quantita: riga.quantita || 0,
        prezzo_unitario: riga.prezzo_unitario || 0
      });

      const row = document.createElement("div");
      row.style.marginBottom = "10px";

      row.innerHTML = `
        <input type="text"
          value="${riga.descrizione || ""}"
          class="input-pill"
          readonly />

        <input type="number"
          value="${riga.quantita || 0}"
          class="input-pill"
          readonly />

        <input type="number"
          value="${riga.prezzo_unitario || 0}"
          class="input-pill"
          readonly />
      `;

      righeContainer.appendChild(row);
    });
  }

  /* ================= MANUAL RIGHE ================= */

  btnAddRiga.addEventListener("click", () => {
    const index = righe.length;
    righe.push({});

    const row = document.createElement("div");
    row.style.marginBottom = "10px";

    row.innerHTML = `
      <input type="text"
        placeholder="Prodotto..."
        class="input-pill riga-search"
        data-i="${index}" />

      <input type="number"
        step="0.001"
        placeholder="Quantità"
        class="input-pill riga-quantita"
        data-i="${index}" />

      <input type="number"
        step="0.0001"
        placeholder="Costo Unitario"
        class="input-pill riga-prezzo"
        data-i="${index}" />
    `;

    righeContainer.appendChild(row);
  });

  righeContainer.addEventListener("input", e => {
    const i = e.target.dataset.i;
    if (i === undefined) return;

    if (e.target.classList.contains("riga-quantita"))
      righe[i].quantita = Number(e.target.value);

    if (e.target.classList.contains("riga-prezzo"))
      righe[i].prezzo_unitario = Number(e.target.value);
  });

  /* ================= SALVATAGGIO ================= */

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
          numero_documento: document.getElementById("fattura-numero").value,
          data_documento: document.getElementById("fattura-data").value,
          origine: mode,
          stato_elaborazione: mode === "manuale" ? "confermata" : "da_verificare",
          allegato_path: allegatoPath
        })
        .select()
        .single();

      const righePulite = righe.filter(r => r.quantita);

      if (righePulite.length > 0) {
        await window.supabaseClient
          .from("fatture_acquisto_righe")
          .insert(righePulite.map(r => ({
            azienda_id: azienda.id,
            fattura_id: fattura.id,
            prodotto_id: null,
            quantita: r.quantita,
            prezzo_unitario: r.prezzo_unitario || 0
          })));
      }

      await window.supabaseClient.rpc("processa_fattura_acquisto", {
        p_azienda_id: azienda.id,
        p_fattura_id: fattura.id
      });

      feedback.innerHTML = "<span style='color:green;'>Fattura salvata e processata.</span>";

    } catch (err) {
      feedback.innerHTML = "<span style='color:red;'>" + err.message + "</span>";
    }
  });
}

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
