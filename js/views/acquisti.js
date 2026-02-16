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
    if (tab === "fornitori") renderFornitori(content);
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

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      ocrSection.style.display = mode === "ocr" ? "block" : "none";
    });
  });

  /* ================= MATCHING FUNCTION ================= */

  async function matchProdotto(descrizione, fornitoreId) {

    if (!descrizione) return null;

    // 1️⃣ match su prodotti_fornitore
    if (fornitoreId) {
      const { data } = await window.supabaseClient
        .from("prodotti_fornitore")
        .select("prodotto_id, descrizione_fornitore")
        .eq("azienda_id", azienda.id)
        .eq("fornitore_id", fornitoreId)
        .ilike("descrizione_fornitore", `%${descrizione}%`)
        .limit(1);

      if (data?.length) return data[0].prodotto_id;
    }

    // 2️⃣ fallback su prodotti
    const { data } = await window.supabaseClient
      .from("prodotti")
      .select("id, descrizione")
      .eq("azienda_id", azienda.id)
      .ilike("descrizione", `%${descrizione}%`)
      .limit(1);

    if (data?.length) return data[0].id;

    return null;
  }

  /* ================= APPLY OCR ================= */

  async function applyOcrResult(result) {

    const fornitoreSelect = document.getElementById("fattura-fornitore");
    const fornitoreId = fornitoreSelect.value;

    righe = [];
    righeContainer.innerHTML = "";

    for (const riga of result.righe || []) {

      const prodottoId = await matchProdotto(
        riga.descrizione,
        fornitoreId
      );

      const matched = !!prodottoId;

      righe.push({
        prodotto_id: prodottoId,
        quantita: riga.quantita || 0,
        prezzo_unitario: riga.prezzo_unitario || 0
      });

      const row = document.createElement("div");
      row.style.marginBottom = "10px";
      row.style.padding = "8px";
      row.style.borderRadius = "12px";
      row.style.background = matched ? "#dcfce7" : "#fee2e2";

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

        <small style="font-size:12px;">
          ${matched ? "Prodotto riconosciuto" : "Prodotto NON riconosciuto"}
        </small>
      `;

      righeContainer.appendChild(row);
    }
  }

  /* ================= OCR ================= */

  btnOcr?.addEventListener("click", async () => {

    const fileInput = document.getElementById("fattura-file");
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    const path = `${azienda.id}/${new Date().getFullYear()}/${crypto.randomUUID()}_${file.name}`;

    feedback.innerHTML = "Upload in corso...";

    await window.supabaseClient.storage
      .from("fatture-acquisto")
      .upload(path, file);

    allegatoPath = path;

    const { data: signedData } =
      await window.supabaseClient.storage
        .from("fatture-acquisto")
        .createSignedUrl(path, 60);

    const { data: ocrResult } =
      await window.supabaseClient.functions.invoke("ocr-fattura", {
        body: { imageUrl: signedData.signedUrl }
      });

    if (ocrResult?.success) {
      await applyOcrResult(ocrResult);
      feedback.innerHTML = "OCR completato.";
    } else {
      feedback.innerHTML = "Errore OCR.";
    }
  });

  /* ================= SALVATAGGIO ================= */

  btnSalva.addEventListener("click", async () => {

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

      if (righePulite.length) {
        await window.supabaseClient
          .from("fatture_acquisto_righe")
          .insert(righePulite.map(r => ({
            azienda_id: azienda.id,
            fattura_id: fattura.id,
            prodotto_id: r.prodotto_id,
            quantita: r.quantita,
            prezzo_unitario: r.prezzo_unitario
          })));
      }

      await window.supabaseClient.rpc("processa_fattura_acquisto", {
        p_azienda_id: azienda.id,
        p_fattura_id: fattura.id
      });

      feedback.innerHTML = "Fattura processata.";

    } catch (err) {
      feedback.innerHTML = err.message;
    }
  });
}

function renderFornitori(container) {
  container.innerHTML = "<h3>Fornitori</h3><p>In sviluppo</p>";
}

function renderOrdini(container) {
  container.innerHTML = "<h3>Ordini</h3><p>In sviluppo</p>";
}

function renderRiordino(container) {
  container.innerHTML = "<h3>Riordino</h3><p>In sviluppo</p>";
}
