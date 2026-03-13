import { escapeHtml } from "./utils.js";

export async function renderFatture(container, azienda) {
  const supabase = window.supabaseClient;

  container.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <h3 style="margin:0;">Documenti acquisto</h3>
        <button id="btn-carica-documento" class="btn-primary">Carica documento</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-top:16px;">
        <input id="filter-fornitore" class="input" placeholder="Fornitore" />
        <input id="filter-data-da" type="date" class="input" />
        <input id="filter-data-a" type="date" class="input" />
      </div>

      <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
        <button id="btn-cerca-documenti" class="btn-secondary">Cerca</button>
        <button id="btn-reset-documenti" class="btn-secondary">Reset</button>
      </div>
    </div>

    <div class="card">
      <table class="app-table" style="margin-top:0;">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Numero</th>
            <th>Data</th>
            <th>Fornitore</th>
            <th>Totale</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody id="documenti-body">
          <tr><td colspan="6">Caricamento...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const body = container.querySelector("#documenti-body");
  const inputFornitore = container.querySelector("#filter-fornitore");
  const inputDataDa = container.querySelector("#filter-data-da");
  const inputDataA = container.querySelector("#filter-data-a");
  const btnCerca = container.querySelector("#btn-cerca-documenti");
  const btnReset = container.querySelector("#btn-reset-documenti");
  const btnCarica = container.querySelector("#btn-carica-documento");

  let allRows = [];

  function formatMoney(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function applyFilters() {
    const fornitore = normalizeText(inputFornitore.value);
    const dataDa = inputDataDa.value || "";
    const dataA = inputDataA.value || "";

    const filtered = allRows.filter((row) => {
      const ragioneSociale = normalizeText(row.fornitore);
      const dataDoc = String(row.data || "");

      if (fornitore && !ragioneSociale.includes(fornitore)) return false;
      if (dataDa && dataDoc && dataDoc < dataDa) return false;
      if (dataA && dataDoc && dataDoc > dataA) return false;

      return true;
    });

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="6">Nessun documento trovato</td></tr>`;
      return;
    }

    body.innerHTML = filtered.map((row) => `
      <tr>
        <td>${escapeHtml(row.tipo || "")}</td>
        <td>${escapeHtml(row.numero || "")}</td>
        <td>${escapeHtml(row.data || "")}</td>
        <td>${escapeHtml(row.fornitore || "")}</td>
        <td>${row.totale === null || row.totale === undefined || row.totale === "" ? "" : escapeHtml(formatMoney(row.totale))}</td>
        <td>${escapeHtml(row.stato || "")}</td>
      </tr>
    `).join("");
  }

  async function loadDocumenti() {
    const [
      fattureRes,
      ddtRes
    ] = await Promise.all([
      supabase
        .from("fatture_acquisto")
        .select(`
          id,
          numero_documento,
          data_documento,
          totale,
          stato,
          fornitori:fornitore_id (
            ragione_sociale
          )
        `)
        .eq("azienda_id", azienda.id)
        .order("data_documento", { ascending: false }),
      supabase
        .from("ddt_acquisto")
        .select(`
          id,
          numero_ddt,
          data_ddt,
          fornitori:fornitore_id (
            ragione_sociale
          )
        `)
        .eq("azienda_id", azienda.id)
        .order("data_ddt", { ascending: false })
    ]);

    if (fattureRes.error || ddtRes.error) {
      console.error(fattureRes.error || ddtRes.error);
      body.innerHTML = `<tr><td colspan="6">Errore caricamento documenti</td></tr>`;
      return;
    }

    const fatture = (fattureRes.data || []).map((f) => ({
      id: f.id,
      tipo: "Fattura",
      numero: f.numero_documento || "",
      data: f.data_documento || "",
      fornitore: f.fornitori?.ragione_sociale || "",
      totale: f.totale ?? "",
      stato: f.stato || ""
    }));

    const ddt = (ddtRes.data || []).map((d) => ({
      id: d.id,
      tipo: "DDT",
      numero: d.numero_ddt || "",
      data: d.data_ddt || "",
      fornitore: d.fornitori?.ragione_sociale || "",
      totale: "",
      stato: ""
    }));

    allRows = [...fatture, ...ddt].sort((a, b) => {
      const da = a.data ? new Date(a.data).getTime() : 0;
      const db = b.data ? new Date(b.data).getTime() : 0;
      return db - da;
    });

    applyFilters();
  }

  btnCerca.addEventListener("click", applyFilters);

  btnReset.addEventListener("click", () => {
    inputFornitore.value = "";
    inputDataDa.value = "";
    inputDataA.value = "";
    applyFilters();
  });

  inputFornitore.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyFilters();
  });
  inputDataDa.addEventListener("change", applyFilters);
  inputDataA.addEventListener("change", applyFilters);

  btnCarica.addEventListener("click", async () => {
    await openDocumentoUploadModal(azienda);
    await loadDocumenti();
  });

  await loadDocumenti();
}

async function openDocumentoUploadModal(azienda) {
  ensureAcquistiModalStyles();

  const supabase = window.supabaseClient;

  const { data: fornitoriData } = await supabase
    .from("fornitori")
    .select("id, ragione_sociale")
    .eq("azienda_id", azienda.id)
    .order("ragione_sociale", { ascending: true });

  const fornitori = fornitoriData || [];

  const modal = document.createElement("div");
  modal.innerHTML = `
    <div class="rf-modal-backdrop">
      <div class="rf-modal">
        <div class="rf-modal-header">
          <div>
            <h3 class="rf-modal-title">Carica documento</h3>
            <p class="rf-modal-sub">Da qui puoi caricare sia una fattura sia un DDT. In modalità OCR il documento viene analizzato e precompilato.</p>
          </div>
          <button id="rf-close-top" class="btn-secondary" type="button">Chiudi</button>
        </div>

        <div class="rf-modal-body">
          <div class="rf-grid-2">
            <div class="rf-field">
              <label>Tipo documento</label>
              <select id="rf-tipo-documento" class="input">
                <option value="fattura">Fattura</option>
                <option value="ddt">DDT</option>
              </select>
            </div>

            <div class="rf-field">
              <label>Metodo</label>
              <select id="rf-metodo" class="input">
                <option value="manuale">Manuale</option>
                <option value="ocr">OCR</option>
              </select>
            </div>
          </div>

          <div id="rf-upload-wrap" class="rf-field" style="display:none;">
            <label>File documento</label>
            <input id="rf-file" type="file" class="input" accept="image/*,.pdf" />
            <div class="rf-mini-note">Il file viene caricato nel bucket "fatture".</div>
          </div>

          <div class="rf-field">
            <label>Fornitore</label>
            <input id="rf-fornitore" class="input" list="rf-fornitori-list" placeholder="Scrivi o seleziona il fornitore" autocomplete="off" />
            <datalist id="rf-fornitori-list">
              ${fornitori.map((f) => `<option value="${escapeHtml(f.ragione_sociale || "")}"></option>`).join("")}
            </datalist>
          </div>

          <div class="rf-grid-2">
            <div class="rf-field">
              <label id="rf-numero-label">Numero documento</label>
              <input id="rf-numero" class="input" />
            </div>
            <div class="rf-field">
              <label id="rf-data-label">Data documento</label>
              <input id="rf-data" type="date" class="input" />
            </div>
          </div>

          <div id="rf-totale-wrap" class="rf-field">
            <label>Totale</label>
            <input id="rf-totale" class="input" placeholder="0,00" />
          </div>

          <div class="rf-field">
            <label>Anteprima righe OCR</label>
            <div id="rf-righe-preview" class="rf-preview-box">Nessuna riga caricata</div>
          </div>

          <div id="rf-feedback" class="rf-feedback"></div>
        </div>

        <div class="rf-modal-actions">
          <button id="rf-run-ocr" class="btn-secondary" type="button">Esegui OCR</button>
          <button id="rf-save" class="btn-primary" type="button">Salva documento</button>
          <button id="rf-close-bottom" class="btn-secondary" type="button">Chiudi</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const elTipoDocumento = modal.querySelector("#rf-tipo-documento");
  const elMetodo = modal.querySelector("#rf-metodo");
  const elUploadWrap = modal.querySelector("#rf-upload-wrap");
  const elFile = modal.querySelector("#rf-file");
  const elFornitore = modal.querySelector("#rf-fornitore");
  const elNumero = modal.querySelector("#rf-numero");
  const elData = modal.querySelector("#rf-data");
  const elTotaleWrap = modal.querySelector("#rf-totale-wrap");
  const elTotale = modal.querySelector("#rf-totale");
  const elPreview = modal.querySelector("#rf-righe-preview");
  const elFeedback = modal.querySelector("#rf-feedback");
  const elNumeroLabel = modal.querySelector("#rf-numero-label");
  const elDataLabel = modal.querySelector("#rf-data-label");
  const btnRunOcr = modal.querySelector("#rf-run-ocr");
  const btnSave = modal.querySelector("#rf-save");
  const btnCloseTop = modal.querySelector("#rf-close-top");
  const btnCloseBottom = modal.querySelector("#rf-close-bottom");

  let righeOcr = [];
  let uploadedFilePath = null;
  let uploadedPublicUrl = null;

  function closeModal() {
    modal.remove();
  }

  function setFeedback(message, isError = false) {
    elFeedback.textContent = message || "";
    elFeedback.style.color = isError ? "#b42318" : "#166534";
  }

  function parseLocaleNumber(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback;

    let s = String(value).trim();
    if (!s) return fallback;

    s = s.replace(/[€\s]/g, "");
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");

    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (lastComma !== -1) {
      s = s.replace(",", ".");
    }

    s = s.replace(/[^0-9.\-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatMoney(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return "0,00";
    return n.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function safeFileName(name) {
    return String(name || "documento")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  function computeRowsTotal(rows) {
    return (rows || []).reduce((sum, row) => {
      const totaleRiga = parseLocaleNumber(row?.totale_riga, NaN);
      const quantita = parseLocaleNumber(row?.quantita, 0);
      const prezzo = parseLocaleNumber(row?.prezzo_unitario, 0);

      if (Number.isFinite(totaleRiga)) return sum + totaleRiga;
      return sum + (quantita * prezzo);
    }, 0);
  }

  async function ensureFornitoreId(nome) {
    const cleaned = String(nome || "").trim();
    if (!cleaned) return null;

    const exact = fornitori.find((f) => String(f.ragione_sociale || "").trim().toLowerCase() === cleaned.toLowerCase());
    if (exact?.id) return exact.id;

    const { data: created, error } = await supabase
      .from("fornitori")
      .insert({
        azienda_id: azienda.id,
        ragione_sociale: cleaned
      })
      .select("id, ragione_sociale")
      .single();

    if (error || !created?.id) {
      throw new Error(error?.message || "Impossibile creare il fornitore");
    }

    fornitori.push(created);
    const datalist = modal.querySelector("#rf-fornitori-list");
    datalist.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(created.ragione_sociale || "")}"></option>`);

    return created.id;
  }

  function renderPreviewRows(rows) {
    if (!rows || !rows.length) {
      elPreview.innerHTML = "Nessuna riga caricata";
      return;
    }

    elPreview.innerHTML = `
      <div style="display:grid; gap:8px;">
        ${rows.map((r) => `
          <div style="padding:8px 10px; border:1px solid rgba(0,0,0,.08); border-radius:10px; background:#fff;">
            <div style="font-weight:600;">${escapeHtml(r.descrizione || "")}</div>
            <div style="font-size:12px; color:#667085; margin-top:4px;">
              Qta: ${escapeHtml(String(r.quantita ?? ""))} ·
              Prezzo: ${escapeHtml(String(r.prezzo_unitario ?? ""))} ·
              Totale riga: ${escapeHtml(String(r.totale_riga ?? ""))}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function updateLabels() {
    const isDDT = elTipoDocumento.value === "ddt";
    elNumeroLabel.textContent = isDDT ? "Numero DDT" : "Numero documento";
    elDataLabel.textContent = isDDT ? "Data DDT" : "Data documento";
    elTotaleWrap.style.display = isDDT ? "none" : "grid";
  }

  function updateMetodoUI() {
    const isOcr = elMetodo.value === "ocr";
    elUploadWrap.style.display = isOcr ? "grid" : "none";
    btnRunOcr.style.display = isOcr ? "inline-flex" : "none";
  }

  async function uploadFileIfNeeded() {
    const file = elFile.files?.[0];
    const metodo = elMetodo.value;
    const tipoDocumento = elTipoDocumento.value;

    if (metodo !== "ocr") {
      return {
        filePath: uploadedFilePath,
        publicUrl: uploadedPublicUrl
      };
    }

    if (uploadedFilePath && uploadedPublicUrl) {
      return {
        filePath: uploadedFilePath,
        publicUrl: uploadedPublicUrl
      };
    }

    if (!file) {
      throw new Error("Seleziona un file prima di eseguire OCR");
    }

    const filePath = `${azienda.id}/${tipoDocumento}/${Date.now()}_${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase
      .storage
      .from("fatture")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      throw new Error(uploadError.message || "Errore upload file");
    }

    const { data: publicData } = supabase
      .storage
      .from("fatture")
      .getPublicUrl(filePath);

    uploadedFilePath = filePath;
    uploadedPublicUrl = publicData?.publicUrl || null;

    return {
      filePath: uploadedFilePath,
      publicUrl: uploadedPublicUrl
    };
  }

  async function maybePersistFileManuale() {
    const file = elFile.files?.[0];
    const metodo = elMetodo.value;
    const tipoDocumento = elTipoDocumento.value;

    if (metodo !== "manuale" || !file) {
      return {
        filePath: uploadedFilePath,
        publicUrl: uploadedPublicUrl
      };
    }

    if (uploadedFilePath && uploadedPublicUrl) {
      return {
        filePath: uploadedFilePath,
        publicUrl: uploadedPublicUrl
      };
    }

    const filePath = `${azienda.id}/${tipoDocumento}/${Date.now()}_${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase
      .storage
      .from("fatture")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      throw new Error(uploadError.message || "Errore upload file");
    }

    const { data: publicData } = supabase
      .storage
      .from("fatture")
      .getPublicUrl(filePath);

    uploadedFilePath = filePath;
    uploadedPublicUrl = publicData?.publicUrl || null;

    return {
      filePath: uploadedFilePath,
      publicUrl: uploadedPublicUrl
    };
  }

  async function saveFatturaConRighe({ fornitoreId, numeroDocumento, dataDocumento, totale }) {
    const basePayload = {
      azienda_id: azienda.id,
      fornitore_id: fornitoreId,
      numero_documento: numeroDocumento || null,
      data_documento: dataDocumento,
      totale: totale || 0,
      stato: "caricata"
    };

    const { data: createdFattura, error: fatturaError } = await supabase
      .from("fatture_acquisto")
      .insert(basePayload)
      .select("id")
      .single();

    if (fatturaError || !createdFattura?.id) {
      throw new Error(fatturaError?.message || "Errore salvataggio fattura");
    }

    if (!righeOcr.length) return;

    const righePayload = righeOcr.map((row) => ({
      fattura_id: createdFattura.id,
      prodotto_id: null,
      quantita: parseLocaleNumber(row?.quantita, 0),
      prezzo_unitario: parseLocaleNumber(row?.prezzo_unitario, 0)
    }));

    const { error: righeError } = await supabase
      .from("fatture_acquisto_righe")
      .insert(righePayload);

    if (righeError) {
      console.error(righeError);
      setFeedback("Fattura salvata, ma alcune righe OCR non sono state registrate.", true);
      return;
    }
  }

  async function saveDDTConRighe({ fornitoreId, numeroDocumento, dataDocumento }) {
    const { data: createdDDT, error: ddtError } = await supabase
      .from("ddt_acquisto")
      .insert({
        azienda_id: azienda.id,
        fornitore_id: fornitoreId,
        numero_ddt: numeroDocumento || null,
        data_ddt: dataDocumento
      })
      .select("id")
      .single();

    if (ddtError || !createdDDT?.id) {
      throw new Error(ddtError?.message || "Errore salvataggio DDT");
    }

    if (!righeOcr.length) return;

    const righePayload = righeOcr.map((row) => ({
      ddt_id: createdDDT.id,
      prodotto_id: null,
      quantita: parseLocaleNumber(row?.quantita, 0)
    }));

    const { error: righeError } = await supabase
      .from("ddt_acquisto_righe")
      .insert(righePayload);

    if (righeError) {
      console.error(righeError);
      setFeedback("DDT salvato, ma alcune righe OCR non sono state registrate.", true);
      return;
    }
  }

  elTipoDocumento.addEventListener("change", updateLabels);
  elMetodo.addEventListener("change", updateMetodoUI);

  updateLabels();
  updateMetodoUI();

  btnRunOcr.addEventListener("click", async () => {
    setFeedback("");

    btnRunOcr.disabled = true;
    btnRunOcr.textContent = "Analizzo...";

    try {
      const upload = await uploadFileIfNeeded();

      const res = await fetch("/functions/v1/ocr-fattura", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageUrl: upload.publicUrl
        })
      });

      const ocr = await res.json();

      if (!res.ok || !ocr?.success) {
        throw new Error(ocr?.error || "Errore OCR");
      }

      righeOcr = Array.isArray(ocr.righe) ? ocr.righe : [];

      if (ocr?.fornitore?.ragione_sociale) {
        elFornitore.value = ocr.fornitore.ragione_sociale;
      }

      if (ocr?.documento?.numero_documento) {
        elNumero.value = ocr.documento.numero_documento;
      }

      if (ocr?.documento?.data_documento) {
        elData.value = ocr.documento.data_documento;
      }

      if (elTipoDocumento.value === "fattura") {
        const totaleCalcolato = computeRowsTotal(righeOcr);
        if (totaleCalcolato > 0) {
          elTotale.value = formatMoney(totaleCalcolato);
        }
      }

      renderPreviewRows(righeOcr);
      setFeedback("OCR completato. Verifica i dati prima di salvare.");
    } catch (err) {
      console.error(err);
      setFeedback(String(err?.message || err || "Errore OCR"), true);
    } finally {
      btnRunOcr.disabled = false;
      btnRunOcr.textContent = "Esegui OCR";
    }
  });

  btnSave.addEventListener("click", async () => {
    setFeedback("");

    const tipoDocumento = elTipoDocumento.value;
    const fornitoreNome = String(elFornitore.value || "").trim();
    const numeroDocumento = String(elNumero.value || "").trim();
    const dataDocumento = String(elData.value || "").trim();
    const totale = parseLocaleNumber(elTotale.value, 0);

    if (!fornitoreNome) {
      setFeedback("Inserisci il fornitore", true);
      return;
    }

    if (!dataDocumento) {
      setFeedback(tipoDocumento === "ddt" ? "Inserisci la data DDT" : "Inserisci la data documento", true);
      return;
    }

    btnSave.disabled = true;
    btnSave.textContent = "Salvo...";

    try {
      await maybePersistFileManuale();

      const fornitoreId = await ensureFornitoreId(fornitoreNome);

      if (tipoDocumento === "fattura") {
        await saveFatturaConRighe({
          fornitoreId,
          numeroDocumento,
          dataDocumento,
          totale
        });
        setFeedback("Fattura salvata correttamente.");
      } else {
        await saveDDTConRighe({
          fornitoreId,
          numeroDocumento,
          dataDocumento
        });
        setFeedback("DDT salvato correttamente.");
      }

      setTimeout(closeModal, 500);
    } catch (err) {
      console.error(err);
      setFeedback(String(err?.message || err || "Errore salvataggio"), true);
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "Salva documento";
    }
  });

  btnCloseTop.addEventListener("click", closeModal);
  btnCloseBottom.addEventListener("click", closeModal);
  modal.querySelector(".rf-modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

function ensureAcquistiModalStyles() {
  if (document.getElementById("rf-acquisti-modal-style")) return;

  const style = document.createElement("style");
  style.id = "rf-acquisti-modal-style";
  style.textContent = `
    .rf-modal-backdrop{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.45);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:16px;
      z-index:9999;
    }
    .rf-modal{
      width:min(760px,100%);
      max-height:90vh;
      overflow:auto;
      background:#fff;
      border-radius:16px;
      box-shadow:0 18px 50px rgba(0,0,0,.22);
    }
    .rf-modal-header{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:16px;
      padding:18px 18px 12px;
      border-bottom:1px solid rgba(0,0,0,.08);
    }
    .rf-modal-title{
      margin:0;
      font-size:18px;
    }
    .rf-modal-sub{
      margin:6px 0 0;
      color:#667085;
      font-size:13px;
      line-height:1.45;
    }
    .rf-modal-body{
      padding:18px;
      display:grid;
      gap:14px;
    }
    .rf-grid-2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:12px;
    }
    .rf-field{
      display:grid;
      gap:6px;
    }
    .rf-field label{
      font-size:13px;
      color:#344054;
      font-weight:600;
    }
    .rf-modal-actions{
      display:flex;
      justify-content:flex-end;
      gap:8px;
      padding:14px 18px 18px;
      border-top:1px solid rgba(0,0,0,.08);
      flex-wrap:wrap;
    }
    .rf-preview-box{
      min-height:72px;
      border:1px solid rgba(0,0,0,.08);
      border-radius:12px;
      background:#f8fafc;
      padding:12px;
      color:#475467;
    }
    .rf-feedback{
      min-height:18px;
      font-size:13px;
      font-weight:600;
    }
    .rf-mini-note{
      font-size:12px;
      color:#667085;
    }
    @media (max-width: 640px){
      .rf-grid-2{
        grid-template-columns:1fr;
      }
    }
  `;
  document.head.appendChild(style);
}
