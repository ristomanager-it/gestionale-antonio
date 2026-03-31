import {
  escapeHtml,
  parseLocaleNumber,
  formatMoney,
  normalizeInputDate,
  safeFileName,
  computeRowsTotal,
  normalizeText,
  normalizePiva,
  normalizeCodiceInterno
} from "./utils.js";

import {
  findBestProductMatch,
  loadProdottiAliasOcr,
  saveProdottoAliasOcr
} from "./ocr.js";

const CATEGORIE_GESTIONE_ACQUISTI = [
  { id: "acquisto_merci", nome: "ACQUISTO DI MERCI", categoriaBilancioSuggerita: "ACQUISTO DI MERCI" },
  { id: "servizi_terzi", nome: "SERVIZI DI TERZI", categoriaBilancioSuggerita: "SERVIZI DI TERZI" },
  { id: "energia_elettrica", nome: "ENERGIA ELETTRICA", categoriaBilancioSuggerita: "ENERGIA ELETTRICA" },
  { id: "spese_telefoniche", nome: "SPESE TELEFONICHE", categoriaBilancioSuggerita: "SPESE TELEFONICHE" },
  { id: "materiale_consumo", nome: "MATERIALE DI CONSUMO", categoriaBilancioSuggerita: "MATERIALE DI CONSUMO" },
  { id: "manutenzione_riparazione", nome: "MANUTENZIONE E RIPARAZIONE", categoriaBilancioSuggerita: "SPESE MANUTENZIONE E RIPARAZIONE" },
  { id: "software", nome: "SOFTWARE APPLICATIVI", categoriaBilancioSuggerita: "SOFTWARE APPLICATIVI" },
  { id: "consulenze", nome: "CONSULENZE", categoriaBilancioSuggerita: "CONSULENZE" },
  { id: "carburante", nome: "CARBURANTE", categoriaBilancioSuggerita: "CARBURANTE" },
  { id: "assicurazioni", nome: "ASSICURAZIONI", categoriaBilancioSuggerita: "ASSICURAZIONI" },
  { id: "abbigliamento_lavoro", nome: "ABBIGLIAMENTO LAVORO", categoriaBilancioSuggerita: "ABBIGLIAMENTO LAVORO" },
  { id: "spese_accessorie", nome: "SPESE ACCESSORIE", categoriaBilancioSuggerita: "SPESE ACCESSORIE" }
];

export async function renderFatture(container, azienda) {
  ensureAcquistiModalStyles();

 container.innerHTML = `
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
      <div>
        <h3 style="margin:0;">Acquisti · Fatture / DDT</h3>
        <div style="font-size:13px; color:#667085; margin-top:4px;"></div>
      </div>
      <button id="btn-carica-documento" class="btn-primary">Carica documento</button>
    </div>
  </div>

  <div class="card">
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
      <div>
        <label style="display:block; font-size:13px; margin-bottom:6px;">Fornitore</label>
        <input id="filter-fornitore" class="input" placeholder="Cerca per fornitore" />
      </div>
      <div>
        <label style="display:block; font-size:13px; margin-bottom:6px;">Data dal</label>
        <input id="filter-data-da" type="date" class="input" />
      </div>
      <div>
        <label style="display:block; font-size:13px; margin-bottom:6px;">Data al</label>
        <input id="filter-data-a" type="date" class="input" />
      </div>
    </div>

    <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
      <button id="btn-cerca-documenti" class="btn-secondary">Cerca</button>
      <button id="btn-reset-documenti" class="btn-secondary">Reset</button>
    </div>

    <div id="documenti-search-feedback" style="margin-top:12px; font-size:13px; color:#667085;">
      Inserisci fornitore e/o intervallo date per cercare i documenti.
    </div>

    <div id="documenti-results" style="margin-top:14px;"></div>
  </div>
`;

  const inputFornitore = container.querySelector("#filter-fornitore");
  const inputDataDa = container.querySelector("#filter-data-da");
  const inputDataA = container.querySelector("#filter-data-a");
  const btnCerca = container.querySelector("#btn-cerca-documenti");
  const btnReset = container.querySelector("#btn-reset-documenti");
  const btnCarica = container.querySelector("#btn-carica-documento");
  const feedback = container.querySelector("#documenti-search-feedback");
  const resultsWrap = container.querySelector("#documenti-results");

  function renderDocumentResults(rows) {
    if (!rows.length) {
      resultsWrap.innerHTML = `
        <div class="rf-empty-righe">
          Nessun documento trovato con i filtri selezionati.
        </div>
      `;
      return;
    }

    resultsWrap.innerHTML = `
      <div class="rf-doc-list">
        ${rows.map((row) => `
          <div class="rf-doc-item">
            <div class="rf-doc-top">
              <div class="rf-doc-badge ${row.tipo === "ddt" ? "ddt" : "fattura"}">${escapeHtml(row.tipo.toUpperCase())}</div>
              <div class="rf-doc-date">${escapeHtml(row.data || "-")}</div>
            </div>
            <div class="rf-doc-title">${escapeHtml(row.fornitore || "Fornitore non definito")}</div>
            <div class="rf-doc-meta">
              <span>Numero: ${escapeHtml(row.numero || "-")}</span>
              ${row.tipo === "fattura" ? `<span>Totale: € ${escapeHtml(formatMoney(row.totale || 0))}</span>` : ""}
              ${row.stato ? `<span>Stato: ${escapeHtml(row.stato)}</span>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  btnCerca.addEventListener("click", async () => {
    const fornitore = String(inputFornitore.value || "").trim();
    const dataDa = String(inputDataDa.value || "").trim();
    const dataA = String(inputDataA.value || "").trim();

    if (!fornitore && !dataDa && !dataA) {
      feedback.textContent = "Inserisci almeno un filtro per cercare i documenti.";
      renderDocumentResults([]);
      return;
    }

    feedback.textContent = "Ricerca in corso...";
    const rows = await searchDocumenti(azienda, { fornitore, dataDa, dataA });

    if (!rows.length) {
      feedback.textContent = "Nessun documento trovato con i filtri inseriti.";
      renderDocumentResults([]);
      return;
    }

    feedback.textContent = `Trovati ${rows.length} documenti con i filtri selezionati.`;
    renderDocumentResults(rows);
  });

  btnReset.addEventListener("click", () => {
    inputFornitore.value = "";
    inputDataDa.value = "";
    inputDataA.value = "";
    feedback.textContent = "Filtri azzerati.";
    resultsWrap.innerHTML = "";
  });

  btnCarica.addEventListener("click", async () => {
    await openDocumentoUploadModal(azienda);
  });
}

async function searchDocumenti(azienda, filters) {
  const supabase = window.supabaseClient;

  const [fattureRes, ddtRes] = await Promise.all([
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

  if (fattureRes.error) {
    console.error(fattureRes.error);
    return [];
  }

  if (ddtRes.error) {
    console.error(ddtRes.error);
    return [];
  }

  const fornitoreNeedle = String(filters?.fornitore || "").trim().toLowerCase();
  const dataDa = String(filters?.dataDa || "").trim();
  const dataA = String(filters?.dataA || "").trim();

  const fatture = (fattureRes.data || []).map((f) => ({
    tipo: "fattura",
    data: f.data_documento || "",
    fornitore: f.fornitori?.ragione_sociale || "",
    numero: f.numero_documento || "",
    totale: f.totale || 0,
    stato: f.stato || ""
  }));

  const ddt = (ddtRes.data || []).map((d) => ({
    tipo: "ddt",
    data: d.data_ddt || "",
    fornitore: d.fornitori?.ragione_sociale || "",
    numero: d.numero_ddt || "",
    totale: 0,
    stato: ""
  }));

  return [...fatture, ...ddt]
    .filter((row) => {
      const fornitoreOk = !fornitoreNeedle || String(row.fornitore || "").toLowerCase().includes(fornitoreNeedle);
      const dataOkDa = !dataDa || (row.data && row.data >= dataDa);
      const dataOkA = !dataA || (row.data && row.data <= dataA);
      return fornitoreOk && dataOkDa && dataOkA;
    })
    .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
}

async function openDocumentoUploadModal(azienda) {
  ensureAcquistiModalStyles();

  const supabase = window.supabaseClient;

  const [fornitoriRes, prodottiRes, aliasCache] = await Promise.all([
    supabase
      .from("fornitori")
      .select("id, ragione_sociale, partita_iva")
      .eq("azienda_id", azienda.id)
      .order("ragione_sociale", { ascending: true }),
    supabase
      .from("prodotti")
      .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id, quantita_riordino, scorta_minima")
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .order("nome", { ascending: true })
      .limit(3000),
    loadProdottiAliasOcr(supabase, azienda.id)
  ]);

  const fornitori = fornitoriRes.data || [];
  const prodottiCache = (prodottiRes.data || []).map((p) => ({
    id: p.id,
    nome: p.nome || "",
    descrizione: String(p.descrizione || "").trim(),
    codice_interno: p.codice_interno || "",
    um: p.um || "",
    categoria_bilancio_id: p.categoria_bilancio_id ?? null,
    quantita_riordino: p.quantita_riordino ?? 0,
    scorta_minima: p.scorta_minima ?? 0
  }));

  const modal = document.createElement("div");
  modal.innerHTML = `
    <div class="rf-modal-backdrop">
      <div class="rf-modal">
        <div class="rf-modal-header">
  <h3 class="rf-modal-title">Carica documento</h3>
  <button type="button" id="rf-close-top" class="rf-close-icon">✕</button>
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
                <option value="carica_documento">Carica documento</option>
                <option value="manuale">Manuale</option>
              </select>
            </div>
          </div>

          <div id="rf-upload-wrap" class="rf-field">
            <label>Documento</label>
            <input id="rf-file" type="file" class="input" accept="image/*,.pdf" />
            
          </div>

          <div class="rf-grid-2">
            <div class="rf-field">
              <label>Fornitore</label>
              <input id="rf-fornitore" class="input" list="rf-fornitori-list" placeholder="Scrivi o seleziona il fornitore" autocomplete="off" />
              <datalist id="rf-fornitori-list">
                ${fornitori.map((f) => `<option value="${escapeHtml(f.ragione_sociale || "")}"></option>`).join("")}
              </datalist>
            </div>
            <div class="rf-field">
              <label>P.IVA fornitore</label>
              <input id="rf-fornitore-piva" class="input" placeholder="P.IVA OCR o manuale" />
            </div>
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
            <div class="rf-righe-header">
              <label style="margin:0;">Righe documento</label>
              <button type="button" id="btn-add-riga" class="btn-secondary">Aggiungi riga</button>
            </div>
            <div id="righe-container" class="rf-righe-wrap"></div>
          </div>

          <div id="rf-feedback" class="rf-feedback"></div>
        </div>

        <div class="rf-modal-actions">
          <button type="button" id="rf-save" class="btn-primary">Salva documento</button>
          <button type="button" id="rf-close-bottom" class="btn-secondary">Chiudi</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('rf-modal-open');

  const elTipoDocumento = modal.querySelector("#rf-tipo-documento");
  const elMetodo = modal.querySelector("#rf-metodo");
  const elUploadWrap = modal.querySelector("#rf-upload-wrap");
  const elFile = modal.querySelector("#rf-file");
  const elFornitore = modal.querySelector("#rf-fornitore");
  const elFornitorePiva = modal.querySelector("#rf-fornitore-piva");
  const elNumero = modal.querySelector("#rf-numero");
  const elData = modal.querySelector("#rf-data");
  const elTotaleWrap = modal.querySelector("#rf-totale-wrap");
  const elTotale = modal.querySelector("#rf-totale");
  const elFeedback = modal.querySelector("#rf-feedback");
  const elNumeroLabel = modal.querySelector("#rf-numero-label");
  const elDataLabel = modal.querySelector("#rf-data-label");
  const btnAddRiga = modal.querySelector("#btn-add-riga");
  const btnSave = modal.querySelector("#rf-save");
  const btnCloseTop = modal.querySelector("#rf-close-top");
  const btnCloseBottom = modal.querySelector("#rf-close-bottom");
  const righeContainer = modal.querySelector("#righe-container");

  let righe = [];

  function closeModal() {
    document.body.classList.remove('rf-modal-open');
    modal.remove();
  }

  function setFeedback(message, isError = false) {
    elFeedback.textContent = message || "";
    elFeedback.style.color = isError ? "#b42318" : "#166534";
  }

  function findProdottoByDescrizione(nome) {
    return findBestProductMatch(nome, prodottiCache, aliasCache);
  }

  function updateLabels() {
    const isDDT = elTipoDocumento.value === "ddt";
    elNumeroLabel.textContent = isDDT ? "Numero DDT" : "Numero documento";
    elDataLabel.textContent = isDDT ? "Data DDT" : "Data documento";
    elTotaleWrap.style.display = isDDT ? "none" : "grid";
  }

  function updateMetodoUI() {
    const isManuale = elMetodo.value === "manuale";
    elUploadWrap.style.display = isManuale ? "none" : "grid";
    btnAddRiga.style.display = "inline-flex";
  }

  function updateTotaleFromRighe() {
    if (elTipoDocumento.value !== "fattura") return;
    const total = computeRowsTotal(righe);
    elTotale.value = total > 0 ? formatMoney(total) : "";
  }

  async function ensureFornitoreId(nome, piva) {
  const cleanedNome = String(nome || "").trim();
  const cleanedPiva = normalizePiva(piva);

  if (!cleanedNome) return null;

  // 🚨 BLOCCO UUID (errore tipico)
  if (cleanedNome.includes("-") && cleanedNome.length > 30) {
    console.error("UUID passato come nome fornitore:", cleanedNome);
    throw new Error("Errore fornitore: valore non valido");
  }

  const exactByPiva = cleanedPiva
    ? fornitori.find((f) => normalizeText(f.partita_iva) === normalizeText(cleanedPiva))
    : null;

  if (exactByPiva?.id) {
    if (!exactByPiva.partita_iva && cleanedPiva) {
      await supabase
        .from("fornitori")
        .update({ partita_iva: cleanedPiva })
        .eq("id", exactByPiva.id)
        .eq("azienda_id", azienda.id);
      exactByPiva.partita_iva = cleanedPiva;
    }

    const id = Number(exactByPiva.id);

    if (!Number.isInteger(id)) {
      console.error("ID fornitore NON valido (by piva):", exactByPiva.id);
      throw new Error("Errore fornitore: ID non valido");
    }

    return id;
  }

  const exactByName = fornitori.find(
    (f) => normalizeText(f.ragione_sociale) === normalizeText(cleanedNome)
  );

  if (exactByName?.id) {
    if (!exactByName.partita_iva && cleanedPiva) {
      await supabase
        .from("fornitori")
        .update({ partita_iva: cleanedPiva })
        .eq("id", exactByName.id)
        .eq("azienda_id", azienda.id);
      exactByName.partita_iva = cleanedPiva;
    }

    const id = Number(exactByName.id);

    if (!Number.isInteger(id)) {
      console.error("ID fornitore NON valido (by name):", exactByName.id);
      throw new Error("Errore fornitore: ID non valido");
    }

    return id;
  }

  const payload = {
    azienda_id: azienda.id,
    ragione_sociale: cleanedNome
  };

  if (cleanedPiva) payload.partita_iva = cleanedPiva;

  const { data: created, error } = await supabase
    .from("fornitori")
    .insert(payload)
    .select("id, ragione_sociale, partita_iva")
    .single();

  if (error || !created?.id) {
    throw new Error(error?.message || "Impossibile creare il fornitore");
  }

  fornitori.push(created);

  modal.querySelector("#rf-fornitori-list").insertAdjacentHTML(
    "beforeend",
    `<option value="${escapeHtml(created.ragione_sociale || "")}"></option>`
  );

  const id = Number(created.id);

  if (!Number.isInteger(id)) {
    console.error("ID fornitore creato NON valido:", created.id);
    throw new Error("Errore fornitore: ID non valido");
  }

  return id;
}
  function addRiga(data = {}) {
    const descrizione = String(data.descrizione || data.descrizione_originale || "").trim();
    const matched = data.prodotto_id
      ? prodottiCache.find((p) => String(p.id) === String(data.prodotto_id)) || null
      : findProdottoByDescrizione(descrizione);

    righe.push({
      descrizione,
      descrizione_originale: String(data.descrizione_originale || descrizione).trim(),
      quantita: parseLocaleNumber(data.quantita, 1),
      prezzo_unitario: parseLocaleNumber(data.prezzo_unitario, 0),
      totale_riga: parseLocaleNumber(data.totale_riga, 0),
      iva_percent: parseLocaleNumber(data.iva_percent, 0),
      prodotto_id: matched?.id || data.prodotto_id || null,
      prodotto_nome: matched?.nome || "",
      um: data.um || matched?.um || "pz"
    });

    renderRighe();
    updateTotaleFromRighe();
  }

  function removeRiga(index) {
    righe.splice(index, 1);
    renderRighe();
    updateTotaleFromRighe();
  }

  function updateRiga(index, patch) {
    righe[index] = {
      ...righe[index],
      ...patch
    };

    if ("descrizione" in patch && !("prodotto_id" in patch)) {
      const matched = findProdottoByDescrizione(patch.descrizione);
      righe[index].prodotto_id = matched?.id || null;
      righe[index].prodotto_nome = matched?.nome || "";
      righe[index].um = righe[index].um || matched?.um || "pz";
    }

    const q = parseLocaleNumber(righe[index].quantita, NaN);
    const pu = parseLocaleNumber(righe[index].prezzo_unitario, NaN);
    const tr = parseLocaleNumber(righe[index].totale_riga, NaN);

    if (Number.isFinite(q) && Number.isFinite(pu)) {

      const computed = Number((q * pu).toFixed(2));

      if (!Number.isFinite(tr) || Math.abs(tr - computed) > 0.01) {
        righe[index].totale_riga = computed;
      }

    }

    renderRighe();
    updateTotaleFromRighe();
  }

 function renderRighe() {
  if (!righe.length) {
    righeContainer.innerHTML = `
      <div class="rf-empty-righe">
        Nessuna riga inserita.
      </div>
    `;
    return;
  }

  righeContainer.innerHTML = righe.map((row, i) => {
    const matched = row.prodotto_id ? "Prodotto agganciato" : "Prodotto non trovato";
    const matchedClass = row.prodotto_id ? "ok" : "missing";

    return `
      <div class="rf-riga-card ${matchedClass}" data-i="${i}">
        <div class="rf-riga-grid">
          <div class="rf-field">
            <label>Descrizione</label>
            <input class="input riga-descrizione" data-i="${i}" value="${escapeHtml(row.descrizione || "")}" />
          </div>
          <div class="rf-field">
            <label>Quantità</label>
            <input class="input riga-quantita" data-i="${i}" value="${escapeHtml(String(row.quantita ?? ""))}" />
          </div>
          <div class="rf-field">
            <label>Prezzo unitario</label>
            <input class="input riga-prezzo" data-i="${i}" value="${escapeHtml(String(row.prezzo_unitario ?? ""))}" ${elTipoDocumento.value === "ddt" ? "disabled" : ""} />
          </div>
          <div class="rf-field">
            <label>Totale riga</label>
            <input class="input riga-totale" data-i="${i}" value="${escapeHtml(String(row.totale_riga ?? ""))}" ${elTipoDocumento.value === "ddt" ? "disabled" : ""} />
          </div>
        </div>

        <div class="rf-riga-bottom">
          <div class="rf-riga-status ${matchedClass}">
            ${escapeHtml(matched)}${row.prodotto_nome ? ` · ${escapeHtml(row.prodotto_nome)}` : ""}
          </div>

          <div class="rf-riga-actions">
            <button type="button" class="btn-secondary btn-match-riga" data-i="${i}">Riprova match</button>
            ${!row.prodotto_id ? `<button type="button" class="btn-secondary btn-crea-prodotto" data-i="${i}">Crea prodotto</button>` : ""}
            <button type="button" class="btn-secondary btn-remove-riga" data-i="${i}">Rimuovi</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  righeContainer.querySelectorAll(".riga-descrizione").forEach((el) => {
    el.addEventListener("input", (e) => {
      const idx = Number(e.currentTarget.dataset.i);
      updateRiga(idx, { descrizione: e.currentTarget.value });
    });
  });

  righeContainer.querySelectorAll(".riga-quantita").forEach((el) => {
    el.addEventListener("input", (e) => {
      const idx = Number(e.currentTarget.dataset.i);
      updateRiga(idx, { quantita: e.currentTarget.value });
    });
  });

  righeContainer.querySelectorAll(".riga-prezzo").forEach((el) => {
    el.addEventListener("input", (e) => {
      const idx = Number(e.currentTarget.dataset.i);
      updateRiga(idx, { prezzo_unitario: e.currentTarget.value });
    });
  });

  righeContainer.querySelectorAll(".riga-totale").forEach((el) => {
    el.addEventListener("input", (e) => {
      const idx = Number(e.currentTarget.dataset.i);
      updateRiga(idx, { totale_riga: e.currentTarget.value });
    });
  });

  righeContainer.querySelectorAll(".btn-remove-riga").forEach((el) => {
    el.addEventListener("click", (e) => {
      removeRiga(Number(e.currentTarget.dataset.i));
    });
  });

  righeContainer.querySelectorAll(".btn-match-riga").forEach((el) => {
    el.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.i);
      const matched = findProdottoByDescrizione(righe[idx]?.descrizione || "");

      if (matched?.id) {
        updateRiga(idx, {
          prodotto_id: matched.id,
          prodotto_nome: matched.nome || "",
          um: matched.um || "pz"
        });
        setFeedback("Prodotto agganciato alla riga.");
      } else {
        updateRiga(idx, {
          prodotto_id: null,
          prodotto_nome: "",
          um: righe[idx]?.um || "pz"
        });
        setFeedback("Nessun prodotto trovato per la riga selezionata.", true);
      }
    });
  });

  righeContainer.querySelectorAll(".btn-crea-prodotto").forEach((el) => {
    el.addEventListener("click", async (e) => {
      const idx = Number(e.currentTarget.dataset.i);
      const descrizioneFattura = String(righe[idx]?.descrizione || "").trim();
      const descrizioneOriginale = String(righe[idx]?.descrizione_originale || descrizioneFattura).trim();

      if (!descrizioneFattura) {
        setFeedback("Inserisci prima la descrizione della riga.", true);
        return;
      }

      const res = await openCreateProductModal({
        azienda,
        descrizioneFattura
      });

      if (!res?.prodotto?.id) return;

      prodottiCache.unshift({
        id: res.prodotto.id,
        nome: res.prodotto.nome || "",
        descrizione: res.prodotto.descrizione || "",
        codice_interno: res.prodotto.codice_interno || "",
        um: res.prodotto.um || "",
        categoria_bilancio_id: res.prodotto.categoria_bilancio_id ?? null,
        quantita_riordino: res.prodotto.quantita_riordino ?? 0,
        scorta_minima: res.prodotto.scorta_minima ?? 0
      });

      await saveProdottoAliasOcr(
        supabase,
        azienda.id,
        descrizioneOriginale || descrizioneFattura,
        res.prodotto.id,
        aliasCache
      );

      updateRiga(idx, {
        prodotto_id: res.prodotto.id,
        prodotto_nome: res.prodotto.nome || "",
        um: res.prodotto.um || "pz"
      });

      setFeedback("Prodotto creato e agganciato alla riga.");
    });
  });

  async function uploadFileAndRunOcr() {
    const file = elFile.files?.[0];
    const tipoDocumento = elTipoDocumento.value;

    if (!file) return;

    setFeedback("Upload documento in corso...");

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

    const imageUrl = publicData?.publicUrl || "";
    if (!imageUrl) {
      throw new Error("Impossibile ottenere URL pubblico del documento");
    }

    setFeedback("Documento caricato. Analisi OCR in corso...");

    const { data, error } = await supabase.functions.invoke("ocr-fattura", {
      body: {
        imageUrl
      }
    });

    if (error) {
      throw new Error(error.message || "Errore OCR");
    }

    if (!data || data.success === false) {
      throw new Error(data?.error || "OCR fallito");
    }

    applyOcrResult(data);
    setFeedback("Documento analizzato. Controlla i dati e salva.");
  }

  function applyOcrResult(result) {
    const fornitoreRagioneSociale = result?.fornitore?.ragione_sociale || result?.fornitore?.nome || "";
    const fornitorePiva = result?.fornitore?.piva || result?.fornitore?.partita_iva || "";
    const numeroDocumento = result?.documento?.numero_documento || result?.documento?.numero || "";
    const dataDocumento = result?.documento?.data_documento || result?.documento?.data || "";

    if (fornitoreRagioneSociale) {
      elFornitore.value = fornitoreRagioneSociale;
    }

    if (fornitorePiva) {
      elFornitorePiva.value = normalizePiva(fornitorePiva);
    }

    if (numeroDocumento) {
      elNumero.value = numeroDocumento;
    }

    if (dataDocumento) {
      const normalizedDate = normalizeInputDate(dataDocumento);
      if (normalizedDate) elData.value = normalizedDate;
    }

    righe = [];
    (result?.righe || []).forEach((row) => {
      addRiga({
        descrizione: row.descrizione || "",
        descrizione_originale: row.descrizione || "",
        quantita: row.quantita ?? 1,
        prezzo_unitario: row.prezzo_unitario ?? 0,
        totale_riga: row.totale_riga ?? 0,
        iva_percent: row.iva_percent ?? 0,
        prodotto_id: row.prodotto_id || null,
        um: row.um || "pz"
      });
    });

    updateTotaleFromRighe();
  }

 async function saveDocumento() {
  const tipoDocumento = elTipoDocumento.value;
  const fornitoreNome = String(elFornitore.value || "").trim();
  const fornitorePiva = String(elFornitorePiva.value || "").trim();
  const numeroDocumento = String(elNumero.value || "").trim();
  const dataDocumento = String(elData.value || "").trim();
  const totale = parseLocaleNumber(elTotale.value, 0);

  if (!fornitoreNome) {
    throw new Error("Inserisci il fornitore");
  }

  if (!dataDocumento) {
    throw new Error(tipoDocumento === "ddt" ? "Inserisci la data DDT" : "Inserisci la data documento");
  }

  if (!numeroDocumento) {
    throw new Error(tipoDocumento === "ddt" ? "Inserisci il numero DDT" : "Inserisci il numero documento");
  }

  if (!righe.length) {
    throw new Error("Inserisci almeno una riga documento");
  }

  // 🔥 FIX CRITICO
  const fornitoreId = await ensureFornitoreId(fornitoreNome, fornitorePiva);

  if (!Number.isInteger(fornitoreId)) {
    console.error("fornitoreId NON valido:", fornitoreId, {
      nome: fornitoreNome,
      piva: fornitorePiva
    });
    throw new Error("Errore interno: fornitore non valido");
  }

  console.log("fornitoreId OK:", fornitoreId);

  console.log("SALVATAGGIO DOCUMENTO", {
    tipo: tipoDocumento,
    fornitoreId,
    numeroDocumento,
    dataDocumento,
    righe: righe.length
  });

  if (tipoDocumento === "fattura") {
    const { data: created, error } = await supabase
      .from("fatture_acquisto")
      .insert({
        azienda_id: azienda.id,
        fornitore_id: fornitoreId,
        numero_documento: numeroDocumento || null,
        data_documento: dataDocumento,
        totale: totale || computeRowsTotal(righe) || 0,
        stato: "bozza"
      })
      .select("id")
      .single();

    if (error || !created?.id) {
      console.error("ERRORE INSERT FATTURA:", error);
      throw new Error(error?.message || "Errore salvataggio fattura");
    }

    const righePayload = righe.map((row, index) => ({
      fattura_id: created.id,
      azienda_id: azienda.id,
      riga_numero: index + 1,
      descrizione: String(row.descrizione || "").trim(),
      prodotto_id: row.prodotto_id || null,
      quantita: parseLocaleNumber(row.quantita, 0),
      unita_misura: row.um || "pz",
      prezzo_unitario: parseLocaleNumber(row.prezzo_unitario, 0),
      iva_percent: parseLocaleNumber(row.iva_percent, 0),
      totale_riga: parseLocaleNumber(row.totale_riga, 0)
    }));

    const { error: righeError } = await supabase
      .from("fatture_acquisto_righe")
      .insert(righePayload);

    if (righeError) {
      console.error("ERRORE RIGHE FATTURA:", righeError);
      throw new Error(righeError.message || "Errore salvataggio righe fattura");
    }

  } else {
    const { data: created, error } = await supabase
      .from("ddt_acquisto")
      .insert({
        azienda_id: azienda.id,
        fornitore_id: fornitoreId,
        numero_ddt: numeroDocumento || null,
        data_ddt: dataDocumento
      })
      .select("id")
      .single();

    if (error || !created?.id) {
      console.error("ERRORE INSERT DDT:", error);
      throw new Error(error?.message || "Errore salvataggio DDT");
    }

    const righePayload = righe.map((row, index) => ({
      ddt_id: created.id,
      azienda_id: azienda.id,
      riga_numero: index + 1,
      descrizione: String(row.descrizione || "").trim(),
      prodotto_id: row.prodotto_id || null,
      quantita: parseLocaleNumber(row.quantita, 0),
      unita_misura: row.um || "pz",
      prezzo_unitario: parseLocaleNumber(row.prezzo_unitario, 0),
      iva_percent: parseLocaleNumber(row.iva_percent, 0),
      totale_riga: parseLocaleNumber(row.totale_riga, 0)
    }));

    const { error: righeError } = await supabase
      .from("ddt_acquisto_righe")
      .insert(righePayload);

    if (righeError) {
      console.error("ERRORE RIGHE DDT (tentativo 1):", righeError);

      const fallbackPayload = righe.map((row, index) => ({
        ddt_id: created.id,
        azienda_id: azienda.id,
        riga_numero: index + 1,
        descrizione: String(row.descrizione || "").trim(),
        prodotto_id: row.prodotto_id || null,
        quantita: parseLocaleNumber(row.quantita, 0),
        unita_misura: row.um || "pz",
        prezzo_unitario: parseLocaleNumber(row.prezzo_unitario, 0),
        iva_percent: parseLocaleNumber(row.iva_percent, 0),
        totale_riga: parseLocaleNumber(row.totale_riga, 0)
      }));

      const { error: fallbackError } = await supabase
        .from("ddt_acquisto_righe")
        .insert(fallbackPayload);

      if (fallbackError) {
        console.error("ERRORE RIGHE DDT (fallback):", fallbackError);
        throw new Error(fallbackError.message || righeError.message || "Errore salvataggio righe DDT");
      }
    }
  }
}

async function openCreateProductModal({ azienda, descrizioneFattura }) {
  ensureAcquistiModalStyles();

  const supabase = window.supabaseClient;

  const [catsBilancioRes, catsInterneRes] = await Promise.all([
    supabase
      .from("categorie_bilancio")
      .select("id, nome, attivo")
      .eq("attivo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("categorie_interne_prodotti")
      .select("id, nome, sigla, attiva")
      .eq("azienda_id", azienda.id)
      .eq("attiva", true)
      .order("nome", { ascending: true })
  ]);

  const catsBilancio = catsBilancioRes.data || [];
  const catsInterne = catsInterneRes.data || [];

  const modalRoot = document.createElement("div");
  modalRoot.innerHTML = `
    <div class="rf-modal-backdrop">
      <div class="rf-modal rf-modal-small">
        <div class="rf-modal-header">
          <div class="rf-header-copy">
            <h3 class="rf-modal-title">Crea prodotto</h3>
            <p class="rf-modal-sub">Nome interno usato nelle ricette. Nel database: nome = nome interno, descrizione = descrizione fattura.</p>
          </div>
          <button type="button" class="btn-secondary rf-close">Chiudi</button>
        </div>

        <div class="rf-modal-body">
          <div class="rf-field">
            <label>Descrizione fattura</label>
            <input id="rf-prod-descrizione-fattura" class="input" value="${escapeHtml(descrizioneFattura || "")}" disabled />
          </div>

          <div class="rf-field">
            <label>Nome prodotto interno</label>
            <input id="rf-prod-nome-interno" class="input" value="${escapeHtml(descrizioneFattura || "")}" />
          </div>

          <div class="rf-field">
            <label>Categoria gestione</label>
            <select id="rf-cat-gestione" class="input">
              <option value="">-- Seleziona --</option>
              ${CATEGORIE_GESTIONE_ACQUISTI.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join("")}
            </select>
          </div>

          <div class="rf-field">
            <label>Categoria bilancio</label>
            <input id="rf-cat-bilancio-text" class="input" list="rf-cat-bilancio-list" placeholder="Cerca categoria bilancio..." autocomplete="off" />
            <input type="hidden" id="rf-cat-bilancio-id" value="" />
            <datalist id="rf-cat-bilancio-list">
              ${catsBilancio.map((c) => `<option value="${escapeHtml(c.nome || "")}"></option>`).join("")}
            </datalist>
          </div>

          <div class="rf-field">
            <label>Categoria interna</label>
            <input id="rf-cat-interna-text" class="input" list="rf-cat-interna-list" placeholder="Scrivi o seleziona categoria interna..." autocomplete="off" />
            <input type="hidden" id="rf-cat-interna-id" value="" />
            <datalist id="rf-cat-interna-list">
              ${catsInterne.map((c) => `<option value="${escapeHtml(c.nome || "")}"></option>`).join("")}
            </datalist>
          </div>

          <div class="rf-grid-2">
            <div class="rf-field">
              <label>Scorta minima</label>
              <input id="rf-scorta-minima" type="number" step="0.001" class="input" placeholder="Es. 1" />
            </div>
            <div class="rf-field">
              <label>Quantità riordino</label>
              <input id="rf-quantita-riordino" type="number" step="0.001" class="input" placeholder="Es. 5" />
            </div>
          </div>

          <div id="rf-prod-feedback" class="rf-feedback"></div>
        </div>

        <div class="rf-modal-actions">
          <button type="button" class="btn-primary rf-save">Crea prodotto</button>
          <button type="button" class="btn-secondary rf-cancel">Annulla</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalRoot);

  const inputNomeInterno = modalRoot.querySelector("#rf-prod-nome-interno");
  const selectGestione = modalRoot.querySelector("#rf-cat-gestione");
  const inputBilancioText = modalRoot.querySelector("#rf-cat-bilancio-text");
  const hiddenBilancioId = modalRoot.querySelector("#rf-cat-bilancio-id");
  const inputInternaText = modalRoot.querySelector("#rf-cat-interna-text");
  const hiddenInternaId = modalRoot.querySelector("#rf-cat-interna-id");
  const inputScortaMinima = modalRoot.querySelector("#rf-scorta-minima");
  const inputQuantitaRiordino = modalRoot.querySelector("#rf-quantita-riordino");
  const feedback = modalRoot.querySelector("#rf-prod-feedback");
  const datalistInterna = modalRoot.querySelector("#rf-cat-interna-list");

  const bilancioByLabel = new Map(
    catsBilancio.map((c) => [String(c.nome || "").trim().toLowerCase(), String(c.id)])
  );

  const interneByNome = new Map(
    catsInterne.map((c) => [String(c.nome || "").trim().toLowerCase(), String(c.id)])
  );

  function close(res = null) {
    modalRoot.remove();
    return res;
  }

  function setFeedback(message, isError = false) {
    feedback.textContent = message || "";
    feedback.style.color = isError ? "#b42318" : "#166534";
  }

  function syncBilancioId() {
    const raw = String(inputBilancioText.value || "").trim().toLowerCase();
    hiddenBilancioId.value = bilancioByLabel.get(raw) || "";
  }

  function syncInternaId() {
    const raw = String(inputInternaText.value || "").trim().toLowerCase();
    hiddenInternaId.value = interneByNome.get(raw) || "";
  }

  selectGestione.addEventListener("change", () => {
    const selected = CATEGORIE_GESTIONE_ACQUISTI.find((c) => c.id === selectGestione.value);
    if (!selected) return;
    inputBilancioText.value = selected.categoriaBilancioSuggerita || "";
    syncBilancioId();
  });

  inputBilancioText.addEventListener("input", syncBilancioId);
  inputInternaText.addEventListener("input", syncInternaId);

  modalRoot.querySelector(".rf-close").addEventListener("click", () => close());
  modalRoot.querySelector(".rf-cancel").addEventListener("click", () => close());
  modalRoot.querySelector(".rf-modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });

  return await new Promise((resolve) => {
    modalRoot.querySelector(".rf-save").addEventListener("click", async () => {
      setFeedback("");

      syncBilancioId();
      syncInternaId();

      const nomeInterno = String(inputNomeInterno.value || "").trim();
      const descrizioneOriginale = String(descrizioneFattura || "").trim();
      const categoriaBilancioId = String(hiddenBilancioId.value || "").trim();
      let categoriaInternaId = String(hiddenInternaId.value || "").trim();
      const nomeCategoriaInterna = String(inputInternaText.value || "").trim();
      const scortaMinima = parseLocaleNumber(inputScortaMinima.value, 0);
      const quantitaRiordino = parseLocaleNumber(inputQuantitaRiordino.value, 0);

      if (!nomeInterno) {
        setFeedback("Inserisci il nome prodotto interno.", true);
        return;
      }

      if (!categoriaBilancioId) {
        setFeedback("Seleziona una categoria bilancio valida.", true);
        return;
      }

    if (!categoriaInternaId) {

  if (!nomeCategoriaInterna) {
    setFeedback("Inserisci o seleziona una categoria interna.", true);
    return;
  }

  const normalized = nomeCategoriaInterna.trim().toLowerCase();

  // ricontrollo sicurezza
  const existingId = interneByNome.get(normalized);

  if (existingId) {
    categoriaInternaId = existingId;

  } else {

    const { data: createdInterna, error: createdInternaError } = await supabase
      .from("categorie_interne_prodotti")
      .insert({
        azienda_id: azienda.id,
        nome: nomeCategoriaInterna,
        attiva: true
      })
      .select("id, nome")
      .single();

    if (createdInternaError || !createdInterna?.id) {
      setFeedback(createdInternaError?.message || "Errore creazione categoria interna.", true);
      return;
    }

    categoriaInternaId = String(createdInterna.id);

    // aggiorna cache in memoria
    interneByNome.set(
      createdInterna.nome.trim().toLowerCase(),
      categoriaInternaId
    );

    // aggiorna dropdown
    datalistInterna.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHtml(createdInterna.nome)}"></option>`
    );

    // seleziona automaticamente
    inputInternaText.value = createdInterna.nome;
    hiddenInternaId.value = categoriaInternaId;
  }
}

      const codiceInterno = normalizeCodiceInterno(nomeInterno);

      const prodottoPayload = {
        azienda_id: azienda.id,
        codice_interno: codiceInterno,
        nome: nomeInterno,
        descrizione: descrizioneOriginale || nomeInterno,
        categoria_bilancio_id: Number(categoriaBilancioId),
        categoria_interna_id: categoriaInternaId,
        scorta_minima: Number.isFinite(scortaMinima) ? scortaMinima : 0,
        quantita_riordino: Number.isFinite(quantitaRiordino) ? quantitaRiordino : 0,
        tipo_prodotto: "materia_prima",
        um: "pz",
        unita_misura: "pz",
        costo_medio: 0,
        costo_ultimo: 0,
        attivo: true
      };

      let created = null;

      const { data: inserted, error } = await supabase
        .from("prodotti")
        .insert(prodottoPayload)
        .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id, quantita_riordino, scorta_minima")
        .single();

      if (!error && inserted?.id) {
        created = inserted;
      }

      if (error && error.code === "23505") {
        const { data: existing, error: existingError } = await supabase
          .from("prodotti")
          .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id, quantita_riordino, scorta_minima")
          .eq("azienda_id", azienda.id)
          .ilike("nome", nomeInterno)
          .maybeSingle();

        if (existingError || !existing?.id) {
          setFeedback(error?.message || "Errore creazione prodotto.", true);
          return;
        }

        created = existing;
      }

      if (!created?.id) {
        setFeedback(error?.message || "Errore creazione prodotto.", true);
        return;
      }

      resolve({
        prodotto: {
          id: created.id,
          nome: created.nome || nomeInterno,
          descrizione: created.descrizione || descrizioneOriginale || nomeInterno,
          codice_interno: created.codice_interno || codiceInterno,
          um: created.um || "pz",
          categoria_bilancio_id: created.categoria_bilancio_id ?? null,
          quantita_riordino: created.quantita_riordino ?? 0,
          scorta_minima: created.scorta_minima ?? 0
        }
      });

      close();
    });
  });
}

function ensureAcquistiModalStyles() {
  if (document.getElementById("rf-acquisti-modal-style")) return;

  const style = document.createElement("style");
  style.id = "rf-acquisti-modal-style";
  style.textContent = `

  body.rf-modal-open{
    overflow:hidden;
  }

  .rf-modal-backdrop{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.45);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
    z-index:9999;
    box-sizing:border-box;
  }

  .rf-modal{
    width:100%;
    max-width:1080px;
    max-height:90vh;
    background:#fff;
    border-radius:16px;
    box-shadow:0 18px 50px rgba(0,0,0,.22);
    display:flex;
    flex-direction:column;
    overflow:hidden;
  }

  .rf-modal-small{
    max-width:680px;
  }

  .rf-modal-header{
    flex-shrink:0;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    padding:18px;
    border-bottom:1px solid rgba(0,0,0,.08);
  }

  .rf-modal-body{
    flex:1;
    overflow-y:auto;
    overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
    padding:18px;
    display:grid;
    gap:14px;
    box-sizing:border-box;
  }

  .rf-modal-actions{
    flex-shrink:0;
    display:flex;
    justify-content:flex-end;
    gap:8px;
    padding:14px 18px 18px;
    border-top:1px solid rgba(0,0,0,.08);
    flex-wrap:wrap;
  }

  .rf-grid-2{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:12px;
  }

  .rf-field{
    min-width:0;
    display:grid;
    gap:6px;
  }

  .rf-riga-grid{
    display:grid;
    gap:10px;
    grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);
    width:100%;
  }

  .rf-close-icon{
  background:none;
  border:none;
  font-size:20px;
  cursor:pointer;
}
input,select,textarea{
    max-width:100%;
    font-size:16px;
    box-sizing:border-box;
  }

  @media (max-width:760px){

    .rf-modal-backdrop{
      padding:8px;
    }

    .rf-modal{
      max-height:95vh;
      border-radius:12px;
    }

    .rf-grid-2{
      grid-template-columns:1fr;
    }

    .rf-riga-grid{
      grid-template-columns:1fr;
    }

    .rf-modal-actions button,
    .rf-top-close{
      width:100%;
    }

  }

  `;

  document.head.appendChild(style);
}
