// js/views/crea-ricetta.js
// ============================================================
// VIEW CREA / MODIFICA RICETTA (EDITOR COMPLETO)
// - Route: #/creaRicetta        (nuova)
// - Route: #/creaRicetta?id=XX  (modifica)
// - Ingredienti + Output: autocomplete da prodotti.descrizione (>= 2 caratteri)
// - Sezioni verticali collapsible
// - Salva: ricette + ricetta_ingredienti + ricette_preparazione_fasi
// ============================================================

let ricettaId = null;

let prodottiCache = [];
let prodottiById = new Map();

export async function render(app) {
  ricettaId = window.routeParams?.id ? String(window.routeParams.id) : null;

  app.innerHTML = `
    <section class="view">

      <div class="page-topbar">
        <div class="page-topbar-left">
          <button class="app-button small gray" onclick="window.location.hash='#/produzione'">
            ← Produzione
          </button>
          <h2 class="page-title">${ricettaId ? "✏️ Modifica Ricetta" : "🆕 Crea Ricetta"}</h2>
        </div>
      </div>

      <!-- DATI BASE -->
      <div class="editor-section open" data-acc="section">
        <div class="editor-section-header" data-acc="header">
          <div>
            <strong>Dati base</strong>
            <div class="section-meta">Nome, descrizione, prodotto output</div>
          </div>
          <div class="section-meta">▾</div>
        </div>
        <div class="editor-section-body" data-acc="body">
          <div class="form-stack">
            <label>
              Nome ricetta *
              <input id="r-nome" class="input-pill" placeholder="Es. Ragù alla bolognese" />
            </label>

            <label>
              Descrizione
              <textarea id="r-descrizione" class="textarea-pill" rows="3" placeholder="Note descrittive (facoltative)"></textarea>
            </label>

            <div class="input-wrap">
              <label>
                Prodotto output (magazzino) *
                <input id="r-output-search" class="input-pill" placeholder="Cerca prodotto output..." autocomplete="off" />
                <input id="r-output-id" type="hidden" />
              </label>
              <div id="r-output-suggest" class="suggest-list"></div>
              <div class="small-muted">Digita almeno 2 caratteri e seleziona un prodotto esistente.</div>
            </div>

            <div class="editor-grid-2">
              <label>
                Attivo
                <select id="r-attivo" class="input-pill">
                  <option value="true">Sì</option>
                  <option value="false">No</option>
                </select>
              </label>

              <label>
                Unità base
                <input id="r-unita-base" class="input-pill" placeholder="Es. pz / kg / lt" />
              </label>
            </div>

          </div>
        </div>
      </div>

      <!-- PORZIONATURA -->
      <div class="editor-section" data-acc="section">
        <div class="editor-section-header" data-acc="header">
          <div>
            <strong>Porzionatura</strong>
            <div class="section-meta">Pezzi base, peso porzione, fattori</div>
          </div>
          <div class="section-meta">▾</div>
        </div>
        <div class="editor-section-body" data-acc="body">
          <div class="editor-grid-2">
            <label>
              Pezzi base
              <input id="r-pezzi-base" class="input-pill" type="number" step="1" min="0" placeholder="Es. 30" />
            </label>

            <label>
              Peso porzionatura (g)
              <input id="r-peso-porzionatura" class="input-pill" type="number" step="1" min="0" placeholder="Es. 150" />
            </label>
          </div>

          <div class="editor-grid-2">
            <label>
              Fattore porzione ristorante
              <input id="r-fattore-ristorante" class="input-pill" type="number" step="0.01" min="0" placeholder="Es. 1" />
            </label>

            <label>
              Fattore porzione evento
              <input id="r-fattore-evento" class="input-pill" type="number" step="0.01" min="0" placeholder="Es. 1" />
            </label>
          </div>

          <label>
            Note porzione
            <textarea id="r-porzione-note" class="textarea-pill" rows="2" placeholder="Note operative porzionatura"></textarea>
          </label>
        </div>
      </div>

      <!-- CONSERVAZIONE -->
      <div class="editor-section" data-acc="section">
        <div class="editor-section-header" data-acc="header">
          <div>
            <strong>Conservazione</strong>
            <div class="section-meta">Shelf life e abbattimento base</div>
          </div>
          <div class="section-meta">▾</div>
        </div>
        <div class="editor-section-body" data-acc="body">
          <div class="editor-grid-2">
            <label>
              Shelf life (giorni)
              <input id="r-shelf-giorni" class="input-pill" type="number" step="1" min="0" placeholder="Es. 3" />
            </label>

            <label>
              Tipo shelf life
              <select id="r-shelf-tipo" class="input-pill">
                <option value="">--</option>
                <option value="fresco">Fresco</option>
                <option value="abbattuto">Abbattuto</option>
                <option value="surgelato">Surgelato</option>
              </select>
            </label>
          </div>

          <label>
            Abbattimento base
            <input id="r-abbattimento" class="input-pill" placeholder="Es. sì/no/descrizione breve" />
          </label>
        </div>
      </div>

      <!-- INGREDIENTI -->
      <div class="editor-section open" data-acc="section">
        <div class="editor-section-header" data-acc="header">
          <div>
            <strong>Ingredienti</strong>
            <div class="section-meta">Autocomplete da prodotti</div>
          </div>
          <div class="section-meta">▾</div>
        </div>
        <div class="editor-section-body" data-acc="body">
          <div id="ingredienti-container"></div>

          <button id="btn-add-ing" class="app-button tiny gray" type="button">
            + Ingrediente
          </button>

          <div class="small-muted" style="margin-top:8px;">
            Nota: per struttura ERP, ogni ingrediente deve essere collegato a un prodotto reale.
          </div>
        </div>
      </div>

      <!-- LAVORAZIONE / FASI -->
      <div class="editor-section" data-acc="section">
        <div class="editor-section-header" data-acc="header">
          <div>
            <strong>Lavorazione</strong>
            <div class="section-meta">Fasi (preparazione/cottura/attesa/raffreddamento)</div>
          </div>
          <div class="section-meta">▾</div>
        </div>
        <div class="editor-section-body" data-acc="body">
          <div id="fasi-container"></div>

          <button id="btn-add-fase" class="app-button tiny gray" type="button">
            + Fase
          </button>
        </div>
      </div>

      <!-- AZIONI -->
      <div class="editor-actions" style="margin-top:16px;">
        <button id="btn-salva" class="app-button green" type="button">
          💾 Salva Ricetta
        </button>
        <button id="btn-annulla" class="app-button gray" type="button">
          Annulla
        </button>
      </div>

    </section>
  `;

  bindAccordion();
  bindUI();

  await loadProdotti();

  if (ricettaId) {
    await caricaRicettaCompleta(ricettaId);
  } else {
    aggiungiIngrediente();
    aggiungiFase();
  }
}

/* ============================================================
   ACCORDION
============================================================ */
function bindAccordion() {
  document.querySelectorAll('[data-acc="header"]').forEach((h) => {
    h.addEventListener("click", () => {
      const section = h.closest('[data-acc="section"]');
      if (!section) return;
      section.classList.toggle("open");
    });
  });
}

/* ============================================================
   UI EVENTS
============================================================ */
function bindUI() {
  document.getElementById("btn-add-ing")?.addEventListener("click", () => aggiungiIngrediente());
  document.getElementById("btn-add-fase")?.addEventListener("click", () => aggiungiFase());
  document.getElementById("btn-salva")?.addEventListener("click", salvaTutto);
  document.getElementById("btn-annulla")?.addEventListener("click", () => {
    window.location.hash = "#/produzione";
  });

  // autocomplete prodotto output
  const outInput = document.getElementById("r-output-search");
  const outHidden = document.getElementById("r-output-id");
  const outSuggest = document.getElementById("r-output-suggest");
  setupAutocompleteProdotti(outInput, outHidden, outSuggest, { allowClear: true });
}

/* ============================================================
   LOAD PRODOTTI (per autocomplete)
   Tabella prodotti:
   - descrizione (testo)
   - um
============================================================ */
async function loadProdotti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, descrizione, um, tipo_prodotto, costo_medio, attivo, azienda_id")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("descrizione");

  if (error) {
    console.error(error);
    alert("Errore caricamento prodotti (autocomplete)");
    prodottiCache = [];
    prodottiById = new Map();
    return;
  }

  prodottiCache = data || [];
  prodottiById = new Map(prodottiCache.map((p) => [String(p.id), p]));
}

/* ============================================================
   AUTOCOMPLETE PRODOTTI (riusabile)
============================================================ */
function setupAutocompleteProdotti(inputEl, hiddenEl, suggestEl, opts = {}) {
  if (!inputEl || !hiddenEl || !suggestEl) return;

  const close = () => {
    suggestEl.classList.remove("open");
    suggestEl.innerHTML = "";
  };

  const openWith = (items) => {
    suggestEl.innerHTML = "";
    if (!items.length) {
      close();
      return;
    }

    items.slice(0, 12).forEach((p) => {
      const item = document.createElement("div");
      item.className = "suggest-item";
      const desc = p.descrizione || "";
      const um = p.um ? ` · ${p.um}` : "";
      item.innerHTML = `<span>${escapeHtml(desc)}</span><small>${escapeHtml(um)}</small>`;

      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        inputEl.value = desc;
        hiddenEl.value = p.id;
        close();
      });

      suggestEl.appendChild(item);
    });

    suggestEl.classList.add("open");
  };

  const resetLink = () => {
    if (!opts.allowClear) return;
    hiddenEl.value = "";
  };

  inputEl.addEventListener("input", () => {
    const q = (inputEl.value || "").trim().toLowerCase();
    resetLink();
    if (!q || q.length < 2) {
      close();
      return;
    }
    const items = prodottiCache.filter((p) => (p.descrizione || "").toLowerCase().includes(q));
    openWith(items);
  });

  inputEl.addEventListener("focus", () => {
    const q = (inputEl.value || "").trim().toLowerCase();
    if (!q || q.length < 2) return;
    const items = prodottiCache.filter((p) => (p.descrizione || "").toLowerCase().includes(q));
    openWith(items);
  });

  document.addEventListener("click", (e) => {
    if (e.target === inputEl) return;
    if (suggestEl.contains(e.target)) return;
    close();
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

/* ============================================================
   INGREDIENTI UI
============================================================ */
function aggiungiIngrediente(initial = {}) {
  const container = document.getElementById("ingredienti-container");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="form-stack">

      <div class="input-wrap">
        <label style="margin:0;">
          Prodotto ingrediente *
          <input class="ing-search input-pill" placeholder="Cerca prodotto..." autocomplete="off"
            value="${escapeAttr(initial.nome_prodotto || "")}" />
          <input class="ing-id" type="hidden" value="${escapeAttr(initial.prodotto_id || "")}" />
        </label>
        <div class="suggest-list ing-suggest"></div>
      </div>

      <div class="editor-grid-2">
        <label style="margin:0;">
          Quantità *
          <input class="ing-qta input-pill" type="number" step="0.001" min="0" placeholder="Es. 1.250"
            value="${initial.quantita ?? ""}" />
        </label>

        <label style="margin:0;">
          UM
          <input class="ing-um input-pill" placeholder="Es. kg / g / lt / pz"
            value="${escapeAttr(initial.unita_misura || "")}" />
        </label>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="app-button tiny red" type="button">✕ Rimuovi</button>
      </div>

    </div>
  `;

  row.querySelector("button")?.addEventListener("click", () => row.remove());
  container.appendChild(row);

  const input = row.querySelector(".ing-search");
  const hidden = row.querySelector(".ing-id");
  const suggest = row.querySelector(".ing-suggest");

  setupAutocompleteProdotti(input, hidden, suggest, { allowClear: true });

  // Se abbiamo prodotto_id ma manca um, valorizziamo um dal prodotto
  const pid = (hidden.value || "").trim();
  const umEl = row.querySelector(".ing-um");
  if (pid && umEl && !umEl.value) {
    const p = prodottiById.get(String(pid));
    if (p?.um) umEl.value = p.um;
  }
}

/* ============================================================
   FASI UI
============================================================ */
function aggiungiFase(initial = {}) {
  const container = document.getElementById("fasi-container");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="form-stack">

      <label style="margin:0;">
        Nome fase *
        <input class="fase-nome input-pill" placeholder="Es. Rosolare soffritto"
          value="${escapeAttr(initial.nome_fase || "")}" />
      </label>

      <div class="editor-grid-2">
        <label style="margin:0;">
          Tipo fase
          <select class="fase-tipo input-pill">
            <option value="preparazione">Preparazione</option>
            <option value="cottura">Cottura</option>
            <option value="attesa">Attesa</option>
            <option value="raffreddamento">Raffreddamento</option>
          </select>
        </label>

        <label style="margin:0;">
          Temperatura (fac.)
          <input class="fase-temp input-pill" type="number" step="0.1" placeholder="°C"
            value="${initial.temperatura ?? ""}" />
        </label>
      </div>

      <div class="editor-grid-2">
        <label style="margin:0;">
          Durata (min) *
          <input class="fase-durata input-pill" type="number" step="1" min="0" placeholder="Es. 25"
            value="${initial.durata_min ?? ""}" />
        </label>

        <label style="margin:0;">
          Lavoro umano (min) *
          <input class="fase-lavoro input-pill" type="number" step="1" min="0" placeholder="Es. 10"
            value="${initial.lavoro_umano_min ?? ""}" />
        </label>
      </div>

      <label style="margin:0;">
        Note (fac.)
        <textarea class="fase-note textarea-pill" rows="2" placeholder="Note operative">${escapeHtml(initial.note || "")}</textarea>
      </label>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="app-button tiny red" type="button">✕ Rimuovi</button>
      </div>

    </div>
  `;

  // set tipo iniziale se presente
  const tipoSel = row.querySelector(".fase-tipo");
  if (tipoSel && initial.tipo_fase) {
    tipoSel.value = String(initial.tipo_fase);
  }

  row.querySelector("button")?.addEventListener("click", () => row.remove());
  container.appendChild(row);
}

/* ============================================================
   LOAD RICETTA (per modifica)
============================================================ */
async function caricaRicettaCompleta(id) {
  const supabase = window.supabaseClient;

  const { data: r, error } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !r) {
    console.error(error);
    alert("Errore caricamento ricetta");
    return;
  }

  // dati base
  setVal("r-nome", r.nome || "");
  setVal("r-descrizione", r.descrizione || "");
  setVal("r-attivo", String(r.attivo ?? true));
  setVal("r-unita-base", r.unita_base || "");

  // porzionatura
  setVal("r-pezzi-base", r.pezzi_base ?? "");
  setVal("r-peso-porzionatura", r.peso_porzionatura_g ?? "");
  setVal("r-fattore-ristorante", r.fattore_porzione_ristorante ?? "");
  setVal("r-fattore-evento", r.fattore_porzione_evento ?? "");
  setVal("r-porzione-note", r.porzione_base_note || "");

  // conservazione
  setVal("r-shelf-giorni", r.shelf_life_giorni ?? "");
  setVal("r-shelf-tipo", r.shelf_life_tipo || "");
  setVal("r-abbattimento", r.abbattimento_base || "");

  // prodotto output
  if (r.prodotto_output_id) {
    const pid = String(r.prodotto_output_id);
    const p = prodottiById.get(pid);
    setVal("r-output-id", pid);
    setVal("r-output-search", p ? (p.descrizione || "") : "");
  }

  // ingredienti
  const { data: ing } = await supabase
    .from("ricetta_ingredienti")
    .select("prodotto_id, nome_prodotto, quantita, unita_misura")
    .eq("ricetta_id", id);

  const ingContainer = document.getElementById("ingredienti-container");
  if (ingContainer) ingContainer.innerHTML = "";
  (ing || []).forEach((i) => aggiungiIngrediente(i));
  if (!ing || ing.length === 0) aggiungiIngrediente();

  // fasi
  const { data: fasi } = await supabase
    .from("ricette_preparazione_fasi")
    .select("ordine, nome_fase, tipo_fase, durata_min, lavoro_umano_min, temperatura, note")
    .eq("ricetta_id", id)
    .order("ordine");

  const fasiContainer = document.getElementById("fasi-container");
  if (fasiContainer) fasiContainer.innerHTML = "";
  (fasi || []).forEach((f) => aggiungiFase(f));
  if (!fasi || fasi.length === 0) aggiungiFase();
}

/* ============================================================
   SAVE ALL
============================================================ */
async function salvaTutto() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  const nome = getVal("r-nome").trim();
  const descrizione = getVal("r-descrizione");
  const prodotto_output_id = getVal("r-output-id").trim();
  const attivo = getVal("r-attivo") === "true";
  const unita_base = getVal("r-unita-base").trim() || null;

  if (!nome) return alert("Nome ricetta obbligatorio");
  if (!prodotto_output_id) return alert("Prodotto output obbligatorio (seleziona dall’autocomplete)");

  // validazione ingredienti: tutti con prodotto_id
  const ingredientiPayload = leggiIngredienti();
  if (!ingredientiPayload.length) {
    return alert("Inserisci almeno un ingrediente valido.");
  }
  const hasNullProd = ingredientiPayload.some((i) => !i.prodotto_id);
  if (hasNullProd) {
    return alert("Ogni ingrediente deve essere collegato a un prodotto (seleziona dall’autocomplete).");
  }

  const ricettaPayload = {
    nome,
    descrizione,
    prodotto_output_id: toIntOrNull(prodotto_output_id),
    attivo,
    unita_base,
    pezzi_base: toIntOrNull(getVal("r-pezzi-base")),
    peso_porzionatura_g: toFloatOrNull(getVal("r-peso-porzionatura")),
    fattore_porzione_ristorante: toFloatOrNull(getVal("r-fattore-ristorante")),
    fattore_porzione_evento: toFloatOrNull(getVal("r-fattore-evento")),
    porzione_base_note: getVal("r-porzione-note") || null,
    shelf_life_giorni: toIntOrNull(getVal("r-shelf-giorni")),
    shelf_life_tipo: getVal("r-shelf-tipo") || null,
    abbattimento_base: getVal("r-abbattimento") || null,
    azienda_id: aziendaId
  };

  try {
    let savedId = ricettaId;

    if (ricettaId) {
      const { error } = await supabase
        .from("ricette")
        .update(ricettaPayload)
        .eq("id", ricettaId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("ricette")
        .insert(ricettaPayload)
        .select("id")
        .single();

      if (error) throw error;
      savedId = String(data.id);
      ricettaId = savedId;
    }

    // salva ingredienti (replace)
    await supabase.from("ricetta_ingredienti").delete().eq("ricetta_id", savedId);
    if (ingredientiPayload.length) {
      const rows = ingredientiPayload.map((i) => ({
        ricetta_id: savedId,
        prodotto_id: toIntOrNull(i.prodotto_id),
        nome_prodotto: i.nome_prodotto,
        quantita: i.quantita,
        unita_misura: i.unita_misura
      }));
      const { error } = await supabase.from("ricetta_ingredienti").insert(rows);
      if (error) throw error;
    }

    // salva fasi (replace)
    const fasiPayload = leggiFasi(savedId, aziendaId);
    await supabase.from("ricette_preparazione_fasi").delete().eq("ricetta_id", savedId);
    if (fasiPayload.length) {
      const { error } = await supabase.from("ricette_preparazione_fasi").insert(fasiPayload);
      if (error) throw error;
    }

    alert("Ricetta salvata ✔️");
    window.location.hash = "#/produzione";
  } catch (e) {
    console.error(e);
    alert("Salvataggio non riuscito. Controlla permessi RLS e campi obbligatori.");
  }
}

function leggiIngredienti() {
  const rows = document.querySelectorAll("#ingredienti-container .azienda-card");
  const payload = [];

  rows.forEach((r) => {
    const prodotto_id = (r.querySelector(".ing-id")?.value || "").trim();
    const nome_prodotto = (r.querySelector(".ing-search")?.value || "").trim();
    const quantita = toFloatOrNull(r.querySelector(".ing-qta")?.value);
    let unita_misura = (r.querySelector(".ing-um")?.value || "").trim();

    // se um vuota, prova dal prodotto
    if (!unita_misura && prodotto_id) {
      const p = prodottiById.get(String(prodotto_id));
      if (p?.um) unita_misura = p.um;
    }

    if (!nome_prodotto || !quantita || quantita <= 0) return;

    payload.push({
      prodotto_id: prodotto_id || null,
      nome_prodotto,
      quantita,
      unita_misura: unita_misura || null
    });
  });

  return payload;
}

function leggiFasi(savedId, aziendaId) {
  const rows = document.querySelectorAll("#fasi-container .azienda-card");
  const payload = [];

  rows.forEach((r, idx) => {
    const nome_fase = (r.querySelector(".fase-nome")?.value || "").trim();
    const tipo_fase = (r.querySelector(".fase-tipo")?.value || "preparazione").trim();
    const durata_min = toIntOrNull(r.querySelector(".fase-durata")?.value);
    const lavoro_umano_min = toIntOrNull(r.querySelector(".fase-lavoro")?.value);
    const temperatura = toFloatOrNull(r.querySelector(".fase-temp")?.value);
    const note = (r.querySelector(".fase-note")?.value || "").trim() || null;

    if (!nome_fase) return;
    if (durata_min === null) return;
    if (lavoro_umano_min === null) return;

    payload.push({
      ricetta_id: savedId,
      azienda_id: aziendaId,
      ordine: idx + 1,
      nome_fase,
      tipo_fase,
      durata_min,
      lavoro_umano_min,
      temperatura,
      note
    });
  });

  return payload;
}

/* ============================================================
   UTILS
============================================================ */
function setVal(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = v ?? "";
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value ?? "") : "";
}

function toIntOrNull(v) {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloatOrNull(v) {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
