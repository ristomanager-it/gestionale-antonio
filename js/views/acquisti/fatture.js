import { escapeHtml } from "./utils.js";

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

function normalizeMatchText(value) {
  let s = String(value || "").trim().toLowerCase();
  if (!s) return "";

  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[.,;:/\\|()[\]{}'"`´’“”]+/g, " ");
  s = s.replace(/[%€$£]+/g, " ");
  s = s.replace(/\bgr\b/g, " g ");
  s = s.replace(/\bgrammi\b/g, " g ");
  s = s.replace(/\bkg\b/g, " kg ");
  s = s.replace(/\bkgr\b/g, " kg ");
  s = s.replace(/\blt\b/g, " l ");
  s = s.replace(/\bltr\b/g, " l ");
  s = s.replace(/\bpezzi\b/g, " pz ");
  s = s.replace(/\bpezzo\b/g, " pz ");
  s = s.replace(/\bconf\b/g, " confezione ");
  s = s.replace(/\bconfez\b/g, " confezione ");
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

function tokenizeMatchText(value) {
  return normalizeMatchText(value).split(" ").filter(Boolean);
}

function computeWordOverlapScore(queryWords, targetWords) {
  if (!queryWords.length || !targetWords.length) return 0;

  let matches = 0;
  queryWords.forEach((word) => {
    if (targetWords.includes(word)) matches += 1;
  });

  return matches / queryWords.length;
}

function findBestProductMatch(nome, prodottiCache) {
  const query = normalizeMatchText(nome);
  if (!query) return null;

  let best = null;
  let bestScore = 0;

  const queryWords = tokenizeMatchText(query);

  prodottiCache.forEach((prodotto) => {
    const target = normalizeMatchText(prodotto.descrizione || prodotto.nome || "");
    if (!target) return;

    if (target === query) {
      best = prodotto;
      bestScore = 100;
      return;
    }

    if (target.includes(query) || query.includes(target)) {
      if (bestScore < 80) {
        best = prodotto;
        bestScore = 80;
      }
    }

    const targetWords = tokenizeMatchText(target);
    const overlapScore = computeWordOverlapScore(queryWords, targetWords);

    if (overlapScore >= 0.6) {
      const weightedScore = overlapScore * 10;
      if (weightedScore > bestScore) {
        best = prodotto;
        bestScore = weightedScore;
      }
    }
  });

  return best;
}

export async function renderFatture(container, azienda) {
  container.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div>
          <h3 style="margin:0;">Documenti acquisto</h3>
          <div style="font-size:13px; color:#667085; margin-top:4px;">
            Caricamento fatture e DDT con gestione manuale o documento da analizzare.
          </div>
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
        Inserisci fornitore e/o intervallo date per la ricerca documenti.
      </div>
    </div>
  `;

  ensureAcquistiModalStyles();

  const inputFornitore = container.querySelector("#filter-fornitore");
  const inputDataDa = container.querySelector("#filter-data-da");
  const inputDataA = container.querySelector("#filter-data-a");
  const btnCerca = container.querySelector("#btn-cerca-documenti");
  const btnReset = container.querySelector("#btn-reset-documenti");
  const btnCarica = container.querySelector("#btn-carica-documento");
  const feedback = container.querySelector("#documenti-search-feedback");

  btnCerca.addEventListener("click", async () => {
    const fornitore = String(inputFornitore.value || "").trim();
    const dataDa = String(inputDataDa.value || "").trim();
    const dataA = String(inputDataA.value || "").trim();

    if (!fornitore && !dataDa && !dataA) {
      feedback.textContent = "Inserisci almeno un filtro per cercare i documenti.";
      return;
    }

    const rows = await searchDocumenti(azienda, {
      fornitore,
      dataDa,
      dataA
    });

    if (!rows.length) {
      feedback.textContent = "Nessun documento trovato con i filtri inseriti.";
      return;
    }

    feedback.textContent = `Trovati ${rows.length} documenti con i filtri selezionati.`;
  });

  btnReset.addEventListener("click", () => {
    inputFornitore.value = "";
    inputDataDa.value = "";
    inputDataA.value = "";
    feedback.textContent = "Filtri azzerati.";
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
      .eq("azienda_id", azienda.id),
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
    totale: f.totale || 0
  }));

  const ddt = (ddtRes.data || []).map((d) => ({
    tipo: "ddt",
    data: d.data_ddt || "",
    fornitore: d.fornitori?.ragione_sociale || "",
    numero: d.numero_ddt || "",
    totale: 0
  }));

  return [...fatture, ...ddt].filter((row) => {
    const fornitoreOk = !fornitoreNeedle || String(row.fornitore || "").toLowerCase().includes(fornitoreNeedle);
    const dataOkDa = !dataDa || (row.data && row.data >= dataDa);
    const dataOkA = !dataA || (row.data && row.data <= dataA);
    return fornitoreOk && dataOkDa && dataOkA;
  });
}

async function openDocumentoUploadModal(azienda) {
  const supabase = window.supabaseClient;

  const [fornitoriRes, prodottiRes] = await Promise.all([
    supabase
      .from("fornitori")
      .select("id, ragione_sociale")
      .eq("azienda_id", azienda.id)
      .order("ragione_sociale", { ascending: true }),
    supabase
      .from("prodotti")
      .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id")
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .order("nome", { ascending: true })
      .limit(2000)
  ]);

  const fornitori = fornitoriRes.data || [];
  const prodottiCache = (prodottiRes.data || []).map((p) => ({
    id: p.id,
    nome: p.nome || "",
    descrizione: String(p.descrizione || p.nome || "").trim(),
    codice_interno: p.codice_interno || "",
    um: p.um || "",
    categoria_bilancio_id: p.categoria_bilancio_id ?? null
  }));

  const modal = document.createElement("div");
  modal.innerHTML = `
    <div class="rf-modal-backdrop">
      <div class="rf-modal">
        <div class="rf-modal-header">
          <div class="rf-header-copy">
            <h3 class="rf-modal-title">Carica documento</h3>
            <p class="rf-modal-sub">Il controllo OCR parte al momento del caricamento del documento. Dopo il controllo puoi salvare.</p>
          </div>
          <button type="button" id="rf-close-top" class="btn-secondary rf-top-close">Chiudi</button>
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
            <div class="rf-mini-note">Quando scegli il file parte subito l'analisi OCR.</div>
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

  const elTipoDocumento = modal.querySelector("#rf-tipo-documento");
  const elMetodo = modal.querySelector("#rf-metodo");
  const elUploadWrap = modal.querySelector("#rf-upload-wrap");
  const elFile = modal.querySelector("#rf-file");
  const elFornitore = modal.querySelector("#rf-fornitore");
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
  let uploadedFilePath = null;
  let uploadedPublicUrl = null;

  function closeModal() {
    modal.remove();
  }

  function setFeedback(message, isError = false) {
    elFeedback.textContent = message || "";
    elFeedback.style.color = isError ? "#b42318" : "#166534";
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
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

  function normalizeInputDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const m1 = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m1) {
      const dd = m1[1].padStart(2, "0");
      const mm = m1[2].padStart(2, "0");
      const yyyy = m1[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    const m2 = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (m2) {
      const yyyy = m2[1];
      const mm = m2[2].padStart(2, "0");
      const dd = m2[3].padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    return "";
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

  function findProdottoByDescrizione(nome) {
    return findBestProductMatch(nome, prodottiCache);
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
    btnAddRiga.style.display = isManuale ? "inline-flex" : "none";
  }

  async function ensureFornitoreId(nome) {
    const cleaned = String(nome || "").trim();
    if (!cleaned) return null;

    const exact = fornitori.find((f) => normalizeText(f.ragione_sociale) === normalizeText(cleaned));
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
    modal.querySelector("#rf-fornitori-list").insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHtml(created.ragione_sociale || "")}"></option>`
    );

    return created.id;
  }

  function addRiga(data = {}) {
    const matched = data.prodotto_id
      ? prodottiCache.find((p) => String(p.id) === String(data.prodotto_id)) || null
      : findProdottoByDescrizione(data.descrizione || data.descrizione_originale || "");

    righe.push({
      descrizione: String(data.descrizione_originale || data.descrizione || "").trim(),
      quantita: parseLocaleNumber(data.quantita, 1),
      prezzo_unitario: parseLocaleNumber(data.prezzo_unitario, 0),
      totale_riga: parseLocaleNumber(data.totale_riga, 0),
      prodotto_id: matched?.id || data.prodotto_id || null,
      prodotto_nome: matched?.descrizione || "",
      um: matched?.um || ""
    });

    renderRighe();
  }

  function removeRiga(index) {
    righe.splice(index, 1);
    renderRighe();
  }

  function updateRiga(index, patch) {
    righe[index] = {
      ...righe[index],
      ...patch
    };

    if ("descrizione" in patch && !patch.prodotto_id) {
      const matched = findProdottoByDescrizione(patch.descrizione);
      righe[index].prodotto_id = matched?.id || null;
      righe[index].prodotto_nome = matched?.descrizione || "";
      righe[index].um = matched?.um || "";
    }

    const q = parseLocaleNumber(righe[index].quantita, 0);
    const pu = parseLocaleNumber(righe[index].prezzo_unitario, 0);
    const tr = parseLocaleNumber(righe[index].totale_riga, 0);

    if (q > 0 && pu > 0) {
      righe[index].totale_riga = tr > 0 ? tr : Number((q * pu).toFixed(2));
    }

    if (elTipoDocumento.value === "fattura") {
      const total = computeRowsTotal(righe);
      if (total > 0) elTotale.value = formatMoney(total);
    }

    renderRighe();
  }

  function renderRighe() {
    if (!righe.length) {
      righeContainer.innerHTML = `
        <div class="rf-empty-righe">
          Nessuna riga presente. In manuale usa "Aggiungi riga", in caricamento documento le righe vengono compilate dopo l'analisi.
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
              <button type="button" class="btn-secondary btn-crea-prodotto" data-i="${i}">Crea prodotto</button>
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
            prodotto_nome: matched.descrizione,
            um: matched.um || ""
          });
          setFeedback("Prodotto agganciato alla riga.");
        } else {
          updateRiga(idx, {
            prodotto_id: null,
            prodotto_nome: "",
            um: ""
          });
          setFeedback("Nessun prodotto trovato per la riga selezionata.", true);
        }
      });
    });

    righeContainer.querySelectorAll(".btn-crea-prodotto").forEach((el) => {
      el.addEventListener("click", async (e) => {
        const idx = Number(e.currentTarget.dataset.i);
        const nome = String(righe[idx]?.descrizione || "").trim();
        if (!nome) {
          setFeedback("Inserisci prima la descrizione della riga.", true);
          return;
        }

        const res = await openCreateProductModal({
          azienda,
          prefillName: nome
        });

        if (!res?.prodotto?.id) return;

        prodottiCache.unshift({
          id: res.prodotto.id,
          nome: res.prodotto.descrizione || nome,
          descrizione: res.prodotto.descrizione || nome,
          codice_interno: res.prodotto.codice_interno || "",
          um: res.prodotto.um || "",
          categoria_bilancio_id: res.prodotto.categoria_bilancio_id ?? null
        });

        updateRiga(idx, {
          prodotto_id: res.prodotto.id,
          prodotto_nome: res.prodotto.descrizione || nome,
          um: res.prodotto.um || ""
        });

        setFeedback("Prodotto creato e agganciato alla riga.");
      });
    });
  }

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

    uploadedFilePath = filePath;
    uploadedPublicUrl = publicData?.publicUrl || null;

    setFeedback("Documento caricato. Analisi OCR in corso...");

    const { data, error } = await supabase.functions.invoke("ocr-fattura", {
      body: {
        imageUrl: uploadedPublicUrl
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
    if (result?.fornitore?.ragione_sociale) {
      elFornitore.value = result.fornitore.ragione_sociale;
    }

    if (result?.documento?.numero_documento) {
      elNumero.value = result.documento.numero_documento;
    }

    if (result?.documento?.data_documento) {
      const normalizedDate = normalizeInputDate(result.documento.data_documento);
      if (normalizedDate) {
        elData.value = normalizedDate;
      }
    }

    righe = [];
    (result?.righe || []).forEach((row) => {
      addRiga({
        descrizione_originale: row.descrizione_originale || row.descrizione || "",
        descrizione: row.descrizione_originale || row.descrizione || "",
        quantita: row.quantita ?? 1,
        prezzo_unitario: row.prezzo_unitario ?? 0,
        totale_riga: row.totale_riga ?? 0,
        prodotto_id: row.prodotto_id || row.product_id || null
      });
    });

    if (elTipoDocumento.value === "fattura") {
      const total = computeRowsTotal(righe);
      if (total > 0) elTotale.value = formatMoney(total);
    }
  }

  async function saveDocumento() {
    const tipoDocumento = elTipoDocumento.value;
    const fornitoreNome = String(elFornitore.value || "").trim();
    const numeroDocumento = String(elNumero.value || "").trim();
    const dataDocumento = String(elData.value || "").trim();
    const totale = parseLocaleNumber(elTotale.value, 0);

    if (!fornitoreNome) {
      throw new Error("Inserisci il fornitore");
    }

    if (!dataDocumento) {
      throw new Error(tipoDocumento === "ddt" ? "Inserisci la data DDT" : "Inserisci la data documento");
    }

    const fornitoreId = await ensureFornitoreId(fornitoreNome);

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
        throw new Error(error?.message || "Errore salvataggio fattura");
      }

      if (righe.length) {
        const righePayload = righe.map((row, index) => ({
  fattura_id: created.id,
  riga_numero: index + 1,
  descrizione: String(row.descrizione || "").trim(),
  prodotto_id: row.prodotto_id || null,
  quantita: parseLocaleNumber(row.quantita, 0),
  prezzo_unitario: parseLocaleNumber(row.prezzo_unitario, 0),
  totale_riga: parseLocaleNumber(row.totale_riga, 0)
}));

        const { error: righeError } = await supabase
          .from("fatture_acquisto_righe")
          .insert(righePayload);

        if (righeError) {
          throw new Error(righeError.message || "Errore salvataggio righe fattura");
        }
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
        throw new Error(error?.message || "Errore salvataggio DDT");
      }

      if (righe.length) {
        const righePayload = righe.map((row, index) => ({
          ddt_id: created.id,
          riga_numero: index + 1,
          prodotto_id: row.prodotto_id || null,
          quantita: parseLocaleNumber(row.quantita, 0)
        }));

        const { error: righeError } = await supabase
          .from("ddt_acquisto_righe")
          .insert(righePayload);

        if (righeError) {
          throw new Error(righeError.message || "Errore salvataggio righe DDT");
        }
      }
    }
  }

  btnAddRiga.addEventListener("click", () => {
    addRiga({
      descrizione: "",
      quantita: 1,
      prezzo_unitario: 0,
      totale_riga: 0
    });
  });

  elTipoDocumento.addEventListener("change", () => {
    updateLabels();
    renderRighe();
  });

  elMetodo.addEventListener("change", () => {
    updateMetodoUI();
  });

  elFile.addEventListener("change", async () => {
    if (elMetodo.value !== "carica_documento") return;

    try {
      await uploadFileAndRunOcr();
    } catch (err) {
      console.error(err);
      setFeedback(String(err?.message || err || "Errore durante il caricamento"), true);
    }
  });

  btnSave.addEventListener("click", async () => {
    btnSave.disabled = true;
    btnSave.textContent = "Salvo...";

    try {
      await saveDocumento();
      setFeedback("Documento salvato correttamente.");
      setTimeout(closeModal, 500);
    } catch (err) {
      console.error(err);
      setFeedback(String(err?.message || err || "Errore salvataggio documento"), true);
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

  updateLabels();
  updateMetodoUI();
  renderRighe();
}

async function openCreateProductModal({ azienda, prefillName }) {
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
            <p class="rf-modal-sub">Se il prodotto non esiste in anagrafica lo puoi creare qui con le categorie necessarie.</p>
          </div>
          <button type="button" class="btn-secondary rf-close">Chiudi</button>
        </div>

        <div class="rf-modal-body">
          <div class="rf-field">
            <label>Nome prodotto</label>
            <input id="rf-prod-nome" class="input" value="${escapeHtml(prefillName || "")}" />
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
              ${catsInterne.map((c) => `<option value="${escapeHtml(`${c.nome}${c.sigla ? ` · ${c.sigla}` : ""}`)}"></option>`).join("")}
            </datalist>
          </div>

          <div class="rf-field">
            <label>Scorta minima</label>
            <input id="rf-scorta-minima" type="number" step="0.001" class="input" placeholder="Es. 1" />
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

  const inputNome = modalRoot.querySelector("#rf-prod-nome");
  const selectGestione = modalRoot.querySelector("#rf-cat-gestione");
  const inputBilancioText = modalRoot.querySelector("#rf-cat-bilancio-text");
  const hiddenBilancioId = modalRoot.querySelector("#rf-cat-bilancio-id");
  const inputInternaText = modalRoot.querySelector("#rf-cat-interna-text");
  const hiddenInternaId = modalRoot.querySelector("#rf-cat-interna-id");
  const inputScortaMinima = modalRoot.querySelector("#rf-scorta-minima");
  const feedback = modalRoot.querySelector("#rf-prod-feedback");
  const datalistInterna = modalRoot.querySelector("#rf-cat-interna-list");

  const bilancioByLabel = new Map(
    catsBilancio.map((c) => [String(c.nome || "").trim().toLowerCase(), String(c.id)])
  );

  const interneByLabel = new Map(
    catsInterne.map((c) => [`${String(c.nome || "").trim().toLowerCase()}${c.sigla ? ` · ${String(c.sigla || "").trim().toLowerCase()}` : ""}`.trim(), String(c.id)])
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
    hiddenInternaId.value = interneByLabel.get(raw) || interneByNome.get(raw) || "";
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

      const nome = String(inputNome.value || "").trim();
      const categoriaBilancioId = String(hiddenBilancioId.value || "").trim();
      let categoriaInternaId = String(hiddenInternaId.value || "").trim();
      const scortaMinima = Number(inputScortaMinima.value || 0);

      if (!nome) {
        setFeedback("Inserisci il nome prodotto.", true);
        return;
      }

      if (!categoriaBilancioId) {
        setFeedback("Seleziona una categoria bilancio valida.", true);
        return;
      }

      if (!categoriaInternaId) {
        const nomeCategoriaInterna = String(inputInternaText.value || "").trim();

        if (!nomeCategoriaInterna) {
          setFeedback("Inserisci o seleziona una categoria interna.", true);
          return;
        }

        const { data: createdInterna, error: createdInternaError } = await supabase
          .from("categorie_interne_prodotti")
          .insert({
            azienda_id: azienda.id,
            nome: nomeCategoriaInterna,
            sigla: null,
            attiva: true
          })
          .select("id, nome, sigla")
          .single();

        if (createdInternaError || !createdInterna?.id) {
          setFeedback(createdInternaError?.message || "Errore creazione categoria interna.", true);
          return;
        }

        categoriaInternaId = String(createdInterna.id);
        interneByNome.set(String(createdInterna.nome || "").trim().toLowerCase(), categoriaInternaId);
        datalistInterna.insertAdjacentHTML(
          "beforeend",
          `<option value="${escapeHtml(createdInterna.nome || "")}"></option>`
        );
      }

      const { data: created, error } = await supabase
        .from("prodotti")
        .insert({
          azienda_id: azienda.id,
          codice_interno: null,
          nome,
          descrizione: nome,
          categoria_bilancio_id: Number(categoriaBilancioId),
          categoria_interna_id: categoriaInternaId,
          scorta_minima: Number.isFinite(scortaMinima) ? scortaMinima : 0,
          tipo_prodotto: "materia_prima",
          um: "pz",
          unita_misura: "pz",
          costo_medio: 0,
          costo_ultimo: 0,
          attivo: true
        })
        .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id")
        .single();

      if (error || !created?.id) {
        setFeedback(error?.message || "Errore creazione prodotto.", true);
        return;
      }

      resolve({
        prodotto: {
          id: created.id,
          descrizione: created.descrizione || created.nome || nome,
          codice_interno: created.codice_interno || "",
          um: created.um || "pz",
          categoria_bilancio_id: created.categoria_bilancio_id ?? null
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
      max-width:960px;
      max-height:92vh;
      overflow:auto;
      background:#fff;
      border-radius:16px;
      box-shadow:0 18px 50px rgba(0,0,0,.22);
      box-sizing:border-box;
    }
    .rf-modal-small{
      width:100%;
      max-width:640px;
    }
    .rf-modal-header{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:16px;
      padding:18px 18px 12px;
      border-bottom:1px solid rgba(0,0,0,.08);
    }
    .rf-header-copy{
      min-width:0;
      flex:1;
    }
    .rf-top-close{
      flex-shrink:0;
    }
    .rf-modal-title{
      margin:0;
      font-size:18px;
      line-height:1.25;
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
      box-sizing:border-box;
    }
    .rf-grid-2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:12px;
    }
    .rf-field{
      display:grid;
      gap:6px;
      min-width:0;
    }
    .rf-field label{
      font-size:13px;
      color:#344054;
      font-weight:600;
    }
    .rf-righe-header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      flex-wrap:wrap;
    }
    .rf-modal-actions{
      display:flex;
      justify-content:flex-end;
      gap:8px;
      padding:14px 18px 18px;
      border-top:1px solid rgba(0,0,0,.08);
      flex-wrap:wrap;
    }
    .rf-feedback{
      min-height:18px;
      font-size:13px;
      font-weight:600;
      word-break:break-word;
    }
    .rf-mini-note{
      font-size:12px;
      color:#667085;
      line-height:1.4;
    }
    .rf-righe-wrap{
      display:grid;
      gap:12px;
      width:100%;
    }
    .rf-empty-righe{
      padding:14px;
      border:1px dashed rgba(0,0,0,.14);
      border-radius:12px;
      background:#f8fafc;
      color:#667085;
      font-size:13px;
      line-height:1.45;
    }
    .rf-riga-card{
      padding:14px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,.08);
      background:#fff;
      display:grid;
      gap:10px;
      box-sizing:border-box;
      width:100%;
      min-width:0;
    }
    .rf-riga-card.ok{
      border-color:rgba(34,197,94,.35);
    }
    .rf-riga-card.missing{
      border-color:rgba(239,68,68,.35);
    }
    .rf-riga-grid{
      display:grid;
      gap:10px;
      grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);
      width:100%;
      min-width:0;
    }
    .rf-riga-bottom{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }
    .rf-riga-status{
      font-size:12px;
      font-weight:600;
      word-break:break-word;
    }
    .rf-riga-status.ok{
      color:#166534;
    }
    .rf-riga-status.missing{
      color:#b42318;
    }
    .rf-riga-actions{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }
    @media (max-width: 760px){
      .rf-modal-backdrop{
        padding:8px;
      }
      .rf-modal{
        border-radius:12px;
        max-height:96vh;
      }
      .rf-modal-small{
        max-width:100%;
      }
      .rf-modal-header{
        padding:14px 14px 10px;
        gap:10px;
      }
      .rf-modal-title{
        font-size:16px;
      }
      .rf-modal-sub{
        font-size:12px;
      }
      .rf-modal-body{
        padding:14px;
        gap:12px;
      }
      .rf-modal-actions{
        padding:12px 14px 14px;
      }
      .rf-grid-2{
        grid-template-columns:1fr;
      }
      .rf-field label{
        font-size:12px;
      }
      .rf-riga-grid{
        grid-template-columns:1fr;
      }
      .rf-riga-card{
        padding:12px;
      }
      .rf-riga-status{
        font-size:11px;
      }
      .rf-riga-actions{
        width:100%;
      }
      .rf-riga-actions > button,
      .rf-modal-actions > button,
      .rf-righe-header > button,
      .rf-top-close{
        width:100%;
      }
      .rf-righe-header{
        align-items:stretch;
      }
      .rf-modal-header{
        flex-direction:column;
      }
    }
  `;
  document.head.appendChild(style);
}
