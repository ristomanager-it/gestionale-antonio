import { escapeHtml } from "./utils.js";

export async function renderFatture(container, azienda) {
  const supabase = window.supabaseClient;

  container.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <h3 style="margin:0;">Fatture acquisto</h3>
        <button id="btn-carica-fattura" class="btn-primary">Carica documento</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-top:16px;">
        <input id="filter-numero" class="input" placeholder="Numero fattura" />
        <input id="filter-fornitore" class="input" placeholder="Fornitore" />
        <input id="filter-data-da" type="date" class="input" />
        <input id="filter-data-a" type="date" class="input" />
      </div>

      <div style="display:flex; gap:8px; margin-top:12px;">
        <button id="btn-cerca-fatture" class="btn-secondary">Cerca</button>
        <button id="btn-reset-fatture" class="btn-secondary">Reset</button>
      </div>
    </div>

    <div class="card">
      <table class="app-table" style="margin-top:0;">
        <thead>
          <tr>
            <th>Numero</th>
            <th>Data</th>
            <th>Fornitore</th>
            <th>Totale</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody id="fatture-body">
          <tr><td colspan="5">Caricamento...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const body = container.querySelector("#fatture-body");
  const inputNumero = container.querySelector("#filter-numero");
  const inputFornitore = container.querySelector("#filter-fornitore");
  const inputDataDa = container.querySelector("#filter-data-da");
  const inputDataA = container.querySelector("#filter-data-a");
  const btnCerca = container.querySelector("#btn-cerca-fatture");
  const btnReset = container.querySelector("#btn-reset-fatture");
  const btnCarica = container.querySelector("#btn-carica-fattura");

  let allRows = [];

  function formatMoney(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return "0,00";
    return n.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function applyFilters() {
    const numero = normalizeText(inputNumero.value);
    const fornitore = normalizeText(inputFornitore.value);
    const dataDa = inputDataDa.value || "";
    const dataA = inputDataA.value || "";

    const filtered = allRows.filter((row) => {
      const numeroDoc = normalizeText(row.numero_documento);
      const ragioneSociale = normalizeText(row.fornitori?.ragione_sociale);
      const dataDoc = String(row.data_documento || "");

      if (numero && !numeroDoc.includes(numero)) return false;
      if (fornitore && !ragioneSociale.includes(fornitore)) return false;
      if (dataDa && dataDoc && dataDoc < dataDa) return false;
      if (dataA && dataDoc && dataDoc > dataA) return false;

      return true;
    });

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="5">Nessuna fattura trovata</td></tr>`;
      return;
    }

    body.innerHTML = filtered.map((f) => `
      <tr>
        <td>${escapeHtml(f.numero_documento || "")}</td>
        <td>${escapeHtml(f.data_documento || "")}</td>
        <td>${escapeHtml(f.fornitori?.ragione_sociale || "")}</td>
        <td>${formatMoney(f.totale)}</td>
        <td>${escapeHtml(f.stato || "")}</td>
      </tr>
    `).join("");
  }

  async function loadFatture() {
    const { data, error } = await supabase
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
      .order("data_documento", { ascending: false });

    if (error) {
      console.error(error);
      body.innerHTML = `<tr><td colspan="5">Errore caricamento fatture</td></tr>`;
      return;
    }

    allRows = data || [];
    applyFilters();
  }

  btnCerca.addEventListener("click", applyFilters);

  btnReset.addEventListener("click", () => {
    inputNumero.value = "";
    inputFornitore.value = "";
    inputDataDa.value = "";
    inputDataA.value = "";
    applyFilters();
  });

  btnCarica.addEventListener("click", async () => {
    await openFatturaUploadModal(azienda);
    await loadFatture();
  });

  await loadFatture();
}

async function openFatturaUploadModal(azienda) {
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
            <h3 class="rf-modal-title">Carica fattura</h3>
            <p class="rf-modal-sub">Puoi inserire la fattura manualmente oppure usare OCR per precompilare i dati.</p>
          </div>
          <button id="rf-close-top" class="btn-secondary" type="button">Chiudi</button>
        </div>

        <div class="rf-modal-body">
          <div class="rf-field">
            <label>Metodo</label>
            <select id="rf-metodo" class="input">
              <option value="manuale">Manuale</option>
              <option value="ocr">OCR</option>
            </select>
          </div>

          <div id="rf-upload-wrap" class="rf-field" style="display:none;">
            <label>File fattura</label>
            <input id="rf-file" type="file" class="input" accept="image/*,.pdf" />
            <div class="rf-mini-note">Il file viene caricato nel bucket "fatture".</div>
          </div>

          <div class="rf-field">
            <label>Fornitore</label>
            <input id="rf-fornitore" class="input" list="rf-fornitori-list" placeholder="Scrivi o seleziona il fornitore" />
            <datalist id="rf-fornitori-list">
              ${fornitori.map((f) => `<option value="${escapeHtml(f.ragione_sociale || "")}"></option>`).join("")}
            </datalist>
          </div>

          <div class="rf-grid-2">
            <div class="rf-field">
              <label>Numero documento</label>
              <input id="rf-numero" class="input" />
            </div>
            <div class="rf-field">
              <label>Data documento</label>
              <input id="rf-data" type="date" class="input" />
            </div>
          </div>

          <div class="rf-field">
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
          <button id="rf-save" class="btn-primary" type="button">Salva fattura</button>
          <button id="rf-close-bottom" class="btn-secondary" type="button">Chiudi</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const elMetodo = modal.querySelector("#rf-metodo");
  const elUploadWrap = modal.querySelector("#rf-upload-wrap");
  const elFile = modal.querySelector("#rf-file");
  const elFornitore = modal.querySelector("#rf-fornitore");
  const elNumero = modal.querySelector("#rf-numero");
  const elData = modal.querySelector("#rf-data");
  const elTotale = modal.querySelector("#rf-totale");
  const elPreview = modal.querySelector("#rf-righe-preview");
  const elFeedback = modal.querySelector("#rf-feedback");
  const btnRunOcr = modal.querySelector("#rf-run-ocr");
  const btnSave = modal.querySelector("#rf-save");
  const btnCloseTop = modal.querySelector("#rf-close-top");
  const btnCloseBottom = modal.querySelector("#rf-close-bottom");

  let righeOcr = [];

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

  elMetodo.addEventListener("change", () => {
    const isOcr = elMetodo.value === "ocr";
    elUploadWrap.style.display = isOcr ? "block" : "none";
    btnRunOcr.style.display = isOcr ? "inline-flex" : "none";
  });

  btnRunOcr.style.display = "none";

  btnRunOcr.addEventListener("click", async () => {
    setFeedback("");

    const file = elFile.files?.[0];
    if (!file) {
      setFeedback("Seleziona un file prima di eseguire OCR", true);
      return;
    }

    btnRunOcr.disabled = true;
    btnRunOcr.textContent = "Analizzo...";

    try {
      const fileName = `${azienda.id}/fatture/${Date.now()}_${safeFileName(file.name)}`;

      const { error: uploadError } = await supabase
        .storage
        .from("fatture")
        .upload(fileName, file, { upsert: false });

      if (uploadError) {
        throw new Error(uploadError.message || "Errore upload file");
      }

      const { data: publicData } = supabase
        .storage
        .from("fatture")
        .getPublicUrl(fileName);

      const res = await fetch("/functions/v1/ocr-fattura", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageUrl: publicData?.publicUrl
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

      const totaleCalcolato = computeRowsTotal(righeOcr);
      if (totaleCalcolato > 0) {
        elTotale.value = formatMoney(totaleCalcolato);
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

    const fornitoreNome = String(elFornitore.value || "").trim();
    const numeroDocumento = String(elNumero.value || "").trim();
    const dataDocumento = String(elData.value || "").trim();
    const totale = parseLocaleNumber(elTotale.value, 0);

    if (!fornitoreNome) {
      setFeedback("Inserisci il fornitore", true);
      return;
    }

    if (!dataDocumento) {
      setFeedback("Inserisci la data documento", true);
      return;
    }

    btnSave.disabled = true;
    btnSave.textContent = "Salvo...";

    try {
      const fornitoreId = await ensureFornitoreId(fornitoreNome);

      const payload = {
        azienda_id: azienda.id,
        fornitore_id: fornitoreId,
        numero_documento: numeroDocumento || null,
        data_documento: dataDocumento,
        totale: totale || 0,
        stato: "caricata"
      };

      const { error } = await supabase
        .from("fatture_acquisto")
        .insert(payload);

      if (error) {
        throw new Error(error.message || "Errore salvataggio fattura");
      }

      setFeedback("Fattura salvata correttamente.");
      setTimeout(closeModal, 500);
    } catch (err) {
      console.error(err);
      setFeedback(String(err?.message || err || "Errore salvataggio"), true);
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "Salva fattura";
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
