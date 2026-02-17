// ============================================================
// VIEW RICETTE (EDITOR) - Sezioni verticali collapsible
// Scelta C: cache prodotti caricata 1 volta e filtro in JS
// ============================================================

let ricettaCorrenteId = null;

let prodottiCache = [];
let prodottiById = new Map();

export async function render(app) {
  const route = (window.location.hash || "").replace(/^#\/?/, "");
  const parts = route.split("/").filter(Boolean);

  // Atteso:
  // #/ricette/nuova
  // #/ricette/:id
  ricettaCorrenteId = null;
  if (parts[0] === "ricette" && parts[1] && parts[1] !== "nuova") {
    ricettaCorrenteId = parts[1];
  }

  app.innerHTML = `
    <section class="view">
      <div class="page-topbar">
        <div class="page-topbar-left">
          <button class="app-button small gray" data-route="ricettario">← Ricettario</button>
          <h2 class="page-title">🍽️ Editor Ricetta</h2>
        </div>
        <button id="btn-salva-ricetta" class="app-button green">💾 Salva</button>
      </div>

      <div class="editor-stack">
        <div class="editor-section open" id="sec-identita">
          <div class="editor-section-header">
            <div>
              <strong>Identità</strong>
              <div class="section-meta" id="meta-identita">Nome e output</div>
            </div>
            <div class="section-meta">▾</div>
          </div>
          <div class="editor-section-body">
            <div class="editor-grid-2">
              <label>
                Nome
                <input id="ricetta-nome" class="input-pill" placeholder="Es. Ragù alla bolognese" />
              </label>

              <label>
                Tipo
                <select id="ricetta-tipo" class="input-pill">
                  <option value="piatto">Ricetta (piatto)</option>
                  <option value="base">Ricetta base (semilavorato)</option>
                </select>
              </label>
            </div>

            <label>
              Descrizione
              <textarea id="ricetta-descrizione" class="textarea-pill" rows="3" placeholder="Descrizione breve / note"></textarea>
            </label>

            <div class="editor-grid-2">
              <label>
                Resa base (pezzi)
                <input id="ricetta-resa-base" class="input-pill" type="number" step="1" min="0" placeholder="Es. 10" />
              </label>

              <div class="input-wrap">
                <label>
                  Prodotto output (obbligatorio)
                  <input id="output-search" class="input-pill" placeholder="Cerca prodotto..." autocomplete="off" />
                  <input id="output-prodotto-id" type="hidden" />
                </label>
                <div id="output-suggest" class="suggest-list"></div>
                <div class="small-muted" id="output-hint">Seleziona un prodotto reale di magazzino.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="editor-section open" id="sec-ingredienti">
          <div class="editor-section-header">
            <div>
              <strong>Ingredienti</strong>
              <div class="section-meta" id="meta-ingredienti">Collegati ai prodotti</div>
            </div>
            <div class="section-meta">▾</div>
          </div>
          <div class="editor-section-body">
            <div class="editor-actions">
              <button id="btn-add-ingrediente" class="app-button tiny gray" type="button">+ Ingrediente</button>
            </div>

            <table class="table-mini">
              <thead>
                <tr>
                  <th style="width:44%;">Prodotto</th>
                  <th style="width:18%;">Qtà</th>
                  <th style="width:18%;">UM</th>
                  <th style="width:20%;">Azioni</th>
                </tr>
              </thead>
              <tbody id="ingredienti-body"></tbody>
            </table>

            <div class="small-muted">Ogni ingrediente deve essere selezionato da elenco prodotti (niente testo libero).</div>
          </div>
        </div>

        <div class="editor-section" id="sec-preparazione">
          <div class="editor-section-header">
            <div>
              <strong>Preparazione</strong>
              <div class="section-meta" id="meta-preparazione">Fasi, tempi, lavoro umano</div>
            </div>
            <div class="section-meta">▾</div>
          </div>
          <div class="editor-section-body">
            <div class="editor-actions">
              <button id="btn-add-fase" class="app-button tiny gray" type="button">+ Fase</button>
            </div>

            <table class="table-mini">
              <thead>
                <tr>
                  <th style="width:8%;">Ord</th>
                  <th style="width:20%;">Fase</th>
                  <th style="width:14%;">Tipo</th>
                  <th style="width:12%;">Durata</th>
                  <th style="width:14%;">Lavoro</th>
                  <th style="width:12%;">Temp</th>
                  <th style="width:20%;">Azioni</th>
                </tr>
              </thead>
              <tbody id="fasi-body"></tbody>
            </table>

            <div class="small-muted">Il lavoro umano (min) è la base per il costo lavoro ricetta.</div>
          </div>
        </div>

        <div class="editor-section" id="sec-porzioni">
          <div class="editor-section-header">
            <div>
              <strong>Porzionature</strong>
              <div class="section-meta">UI pronta, collegamento DB nel prossimo step</div>
            </div>
            <div class="section-meta">▾</div>
          </div>
          <div class="editor-section-body">
            <div class="editor-grid-2">
              <label>
                Formato 1 (nome)
                <input id="porz1-label" class="input-pill" placeholder="Es. Ristorante" />
              </label>
              <label>
                Formato 1 (%)
                <input id="porz1-percent" class="input-pill" type="number" step="1" min="1" max="500" placeholder="Es. 100" />
              </label>
            </div>

            <div class="editor-grid-2">
              <label>
                Formato 2 (nome)
                <input id="porz2-label" class="input-pill" placeholder="Es. Buffet" />
              </label>
              <label>
                Formato 2 (%)
                <input id="porz2-percent" class="input-pill" type="number" step="1" min="1" max="500" placeholder="Es. 60" />
              </label>
            </div>

            <div class="small-muted" id="porzioni-preview">Compila resa base e percentuali per calcolo pezzi.</div>
          </div>
        </div>

        <div class="editor-section" id="sec-conservazione">
          <div class="editor-section-header">
            <div>
              <strong>Conservazione</strong>
              <div class="section-meta">UI pronta, collegamento DB nel prossimo step</div>
            </div>
            <div class="section-meta">▾</div>
          </div>
          <div class="editor-section-body">
            <div class="editor-grid-2">
              <label>
                Shelf life (giorni)
                <input id="shelf-life" class="input-pill" type="number" step="1" min="0" placeholder="Es. 3" />
              </label>
              <label>
                Temperatura (°C)
                <input id="shelf-temp" class="input-pill" type="number" step="0.1" placeholder="Es. 4" />
              </label>
            </div>

            <label>
              Note
              <textarea id="shelf-note" class="textarea-pill" rows="2" placeholder="Note conservazione"></textarea>
            </label>
          </div>
        </div>
      </div>
    </section>
  `;

  bindUI();

  await preloadProdotti();

  setupAutocompleteProdotti({
    inputEl: document.getElementById("output-search"),
    hiddenIdEl: document.getElementById("output-prodotto-id"),
    suggestEl: document.getElementById("output-suggest"),
    onSelect: (p) => {
      const hint = document.getElementById("output-hint");
      if (hint) hint.textContent = p ? `Selezionato: ${p.descrizione} (${p.um || "-"})` : "Seleziona un prodotto reale di magazzino.";
    }
  });

  if (ricettaCorrenteId) {
    await caricaRicettaCompleta(ricettaCorrenteId);
  } else {
    nuovaRicetta();
  }
}

function bindUI() {
  document.querySelectorAll(".editor-section-header").forEach((h) => {
    h.addEventListener("click", () => {
      const wrap = h.closest(".editor-section");
      if (!wrap) return;
      wrap.classList.toggle("open");
    });
  });

  document.getElementById("btn-add-ingrediente")?.addEventListener("click", () => {
    aggiungiRigaIngrediente();
  });

  document.getElementById("btn-add-fase")?.addEventListener("click", () => {
    aggiungiRigaFase();
  });

  document.getElementById("btn-salva-ricetta")?.addEventListener("click", salvaRicetta);

  const resa = document.getElementById("ricetta-resa-base");
  const p1 = document.getElementById("porz1-percent");
  const p2 = document.getElementById("porz2-percent");
  const l1 = document.getElementById("porz1-label");
  const l2 = document.getElementById("porz2-label");

  [resa, p1, p2, l1, l2].forEach((el) => {
    el?.addEventListener("input", aggiornaPreviewPorzioni);
  });
}

// ============================================================
// PRODOTTI CACHE + AUTOCOMPLETE
// ============================================================

async function preloadProdotti() {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, descrizione, um, tipo_prodotto")
    .order("descrizione");

  if (error) {
    console.error(error);
    alert("Errore caricamento prodotti (autocomplete ingredienti)");
    prodottiCache = [];
    prodottiById = new Map();
    return;
  }

  prodottiCache = data || [];
  prodottiById = new Map(prodottiCache.map((p) => [String(p.id), p]));
}

function setupAutocompleteProdotti({ inputEl, hiddenIdEl, suggestEl, onSelect }) {
  if (!inputEl || !hiddenIdEl || !suggestEl) return;

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
      item.innerHTML = `
        <span>${escapeHtml(p.descrizione || "")}</span>
        <small>${escapeHtml(p.um || "-")} · ${escapeHtml(p.tipo_prodotto || "-")}</small>
      `;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        hiddenIdEl.value = p.id;
        inputEl.value = p.descrizione || "";
        close();
        if (typeof onSelect === "function") onSelect(p);
      });
      suggestEl.appendChild(item);
    });

    suggestEl.classList.add("open");
  };

  const resetLink = () => {
    hiddenIdEl.value = "";
    if (typeof onSelect === "function") onSelect(null);
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

// ============================================================
// RICETTA: NUOVA / CARICAMENTO
// ============================================================

function nuovaRicetta() {
  ricettaCorrenteId = null;

  setValue("ricetta-nome", "");
  setValue("ricetta-tipo", "piatto");
  setValue("ricetta-descrizione", "");
  setValue("ricetta-resa-base", "");

  setValue("output-search", "");
  setValue("output-prodotto-id", "");

  document.getElementById("ingredienti-body").innerHTML = "";
  document.getElementById("fasi-body").innerHTML = "";

  aggiungiRigaIngrediente();
  aggiungiRigaFase();

  aggiornaPreviewPorzioni();
}

async function caricaRicettaCompleta(id) {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(error);
    alert("Ricetta non trovata");
    return;
  }

  setValue("ricetta-nome", data.nome || "");
  setValue("ricetta-tipo", data.tipo || "piatto");
  setValue("ricetta-descrizione", data.descrizione || "");
  setValue("ricetta-resa-base", data.resa_base ?? "");

  if (data.prodotto_output_id) {
    const p = prodottiById.get(String(data.prodotto_output_id));
    setValue("output-prodotto-id", data.prodotto_output_id);
    setValue("output-search", p?.descrizione || "");
  } else {
    setValue("output-prodotto-id", "");
    setValue("output-search", "");
  }

  await caricaIngredienti(id);
  await caricaFasi(id);

  aggiornaPreviewPorzioni();
}

async function caricaIngredienti(ricettaId) {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("ricetta_ingredienti")
    .select("id, prodotto_id, nome_prodotto, quantita, unita_misura")
    .eq("ricetta_id", ricettaId)
    .order("id");

  if (error) {
    console.error(error);
    alert("Errore caricamento ingredienti");
    return;
  }

  const body = document.getElementById("ingredienti-body");
  body.innerHTML = "";

  (data || []).forEach((i) => aggiungiRigaIngrediente(i));

  if (!(data || []).length) aggiungiRigaIngrediente();
}

async function caricaFasi(ricettaId) {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("ricette_preparazione_fasi")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .order("ordine");

  if (error) {
    console.error(error);
    alert("Errore caricamento fasi");
    return;
  }

  const body = document.getElementById("fasi-body");
  body.innerHTML = "";

  (data || []).forEach((f) => aggiungiRigaFase(f));

  if (!(data || []).length) aggiungiRigaFase();
}

// ============================================================
// INGREDIENTI (AUTOCOMPILANTI)
// ============================================================

function aggiungiRigaIngrediente(initial = {}) {
  const body = document.getElementById("ingredienti-body");
  if (!body) return;

  const tr = document.createElement("tr");
  tr.className = "ingrediente-row";

  tr.innerHTML = `
    <td>
      <div class="input-wrap">
        <input class="input-pill ing-search" placeholder="Cerca prodotto..." autocomplete="off" />
        <input class="ing-prodotto-id" type="hidden" />
        <div class="suggest-list"></div>
      </div>
      <div class="small-muted ing-meta"></div>
    </td>
    <td><input class="input-pill ing-qta" type="number" step="0.001" min="0" placeholder="0.000" /></td>
    <td><input class="input-pill ing-um" placeholder="UM" readonly /></td>
    <td>
      <div class="row-actions">
        <button class="app-button tiny red btn-del" type="button">✕</button>
      </div>
    </td>
  `;

  const inputSearch = tr.querySelector(".ing-search");
  const hiddenId = tr.querySelector(".ing-prodotto-id");
  const suggest = tr.querySelector(".suggest-list");
  const um = tr.querySelector(".ing-um");
  const meta = tr.querySelector(".ing-meta");

  if (initial.prodotto_id) {
    const p = prodottiById.get(String(initial.prodotto_id));
    hiddenId.value = initial.prodotto_id;
    inputSearch.value = p?.descrizione || initial.nome_prodotto || "";
    um.value = p?.um || initial.unita_misura || "";
    meta.textContent = p ? `Tipo: ${p.tipo_prodotto || "-"}` : "";
  } else {
    inputSearch.value = initial.nome_prodotto || "";
    um.value = initial.unita_misura || "";
    meta.textContent = initial.nome_prodotto && !initial.prodotto_id ? "Da collegare a prodotto (obbligatorio)" : "";
  }

  tr.querySelector(".ing-qta").value = initial.quantita ?? "";

  setupAutocompleteProdotti({
    inputEl: inputSearch,
    hiddenIdEl: hiddenId,
    suggestEl: suggest,
    onSelect: (p) => {
      um.value = p?.um || "";
      meta.textContent = p ? `Tipo: ${p.tipo_prodotto || "-"}` : "";
    }
  });

  tr.querySelector(".btn-del").addEventListener("click", () => tr.remove());
  body.appendChild(tr);
}

// ============================================================
// FASI PREPARAZIONE (ricette_preparazione_fasi)
// ============================================================

function aggiungiRigaFase(initial = {}) {
  const body = document.getElementById("fasi-body");
  if (!body) return;

  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input class="input-pill fase-ordine" type="number" step="1" min="1" /></td>
    <td><input class="input-pill fase-nome" placeholder="Es. Rosolare" /></td>
    <td>
      <select class="input-pill fase-tipo">
        <option value="preparazione">preparazione</option>
        <option value="cottura">cottura</option>
        <option value="attesa">attesa</option>
        <option value="raffreddamento">raffreddamento</option>
      </select>
    </td>
    <td><input class="input-pill fase-durata" type="number" step="1" min="0" placeholder="min" /></td>
    <td><input class="input-pill fase-lavoro" type="number" step="1" min="0" placeholder="min" /></td>
    <td><input class="input-pill fase-temp" type="number" step="0.1" placeholder="°C" /></td>
    <td>
      <div class="row-actions">
        <button class="app-button tiny red btn-del-fase" type="button">✕</button>
      </div>
    </td>
  `;

  tr.querySelector(".fase-ordine").value = initial.ordine ?? (body.children.length + 1);
  tr.querySelector(".fase-nome").value = initial.nome_fase || "";
  tr.querySelector(".fase-tipo").value = initial.tipo_fase || "preparazione";
  tr.querySelector(".fase-durata").value = initial.durata_min ?? "";
  tr.querySelector(".fase-lavoro").value = initial.lavoro_umano_min ?? "";
  tr.querySelector(".fase-temp").value = initial.temperatura ?? "";

  tr.querySelector(".btn-del-fase").addEventListener("click", () => tr.remove());
  body.appendChild(tr);
}

// ============================================================
// SALVATAGGIO (ricette + ingredienti + fasi)
// Porzioni + Conservazione: UI presente, collegamento DB nel prossimo step
// ============================================================

async function salvaRicetta() {
  const supabase = window.supabaseClient;

  const nome = getValue("ricetta-nome").trim();
  const tipo = getValue("ricetta-tipo");
  const descrizione = getValue("ricetta-descrizione");
  const resaBase = toIntOrNull(getValue("ricetta-resa-base"));
  const prodottoOutputId = getValue("output-prodotto-id");

  if (!nome) return alert("Nome obbligatorio");
  if (!prodottoOutputId) return alert("Prodotto output obbligatorio (seleziona da elenco)");

  const ingredientiInvalidi = Array.from(document.querySelectorAll("#ingredienti-body tr")).some((tr) => {
    const pid = tr.querySelector(".ing-prodotto-id")?.value || "";
    const qta = parseFloat(tr.querySelector(".ing-qta")?.value || "0");
    return !pid || !(qta > 0);
  });
  if (ingredientiInvalidi) {
    return alert("Ingredienti: seleziona prodotto da elenco e inserisci una quantità > 0 per ogni riga.");
  }

  let ricettaId = ricettaCorrenteId;

  try {
    if (ricettaId) {
      const { error } = await supabase
        .from("ricette")
        .update({
          nome,
          tipo,
          descrizione,
          resa_base: resaBase,
          prodotto_output_id: prodottoOutputId
        })
        .eq("id", ricettaId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("ricette")
        .insert({
          nome,
          tipo,
          descrizione,
          resa_base: resaBase,
          prodotto_output_id: prodottoOutputId
        })
        .select("id")
        .single();

      if (error) throw error;
      ricettaId = data.id;
      ricettaCorrenteId = ricettaId;
    }

    await salvaIngredienti(ricettaId);
    await salvaFasi(ricettaId);

    alert("Ricetta salvata ✔️");
    window.location.hash = `#/ricette/${ricettaId}`;
  } catch (e) {
    console.error(e);
    alert("Errore salvataggio ricetta");
  }
}

async function salvaIngredienti(ricettaId) {
  const supabase = window.supabaseClient;

  await supabase.from("ricetta_ingredienti").delete().eq("ricetta_id", ricettaId);

  const payload = [];
  const rows = Array.from(document.querySelectorAll("#ingredienti-body tr"));

  rows.forEach((tr) => {
    const prodottoId = tr.querySelector(".ing-prodotto-id")?.value || "";
    const qta = parseFloat(tr.querySelector(".ing-qta")?.value || "0");
    const p = prodottiById.get(String(prodottoId));

    if (!prodottoId || !(qta > 0)) return;

    payload.push({
      ricetta_id: ricettaId,
      prodotto_id: prodottoId,
      nome_prodotto: p?.descrizione || "",
      quantita: qta,
      unita_misura: p?.um || ""
    });
  });

  if (payload.length) {
    const { error } = await supabase.from("ricetta_ingredienti").insert(payload);
    if (error) throw error;
  }
}

async function salvaFasi(ricettaId) {
  const supabase = window.supabaseClient;

  await supabase.from("ricette_preparazione_fasi").delete().eq("ricetta_id", ricettaId);

  const payload = [];
  const rows = Array.from(document.querySelectorAll("#fasi-body tr"));

  rows.forEach((tr) => {
    const ordine = toIntOrNull(tr.querySelector(".fase-ordine")?.value);
    const nomeFase = (tr.querySelector(".fase-nome")?.value || "").trim();
    const tipoFase = tr.querySelector(".fase-tipo")?.value || "preparazione";
    const durataMin = toIntOrNull(tr.querySelector(".fase-durata")?.value) ?? 0;
    const lavoroMin = toIntOrNull(tr.querySelector(".fase-lavoro")?.value) ?? 0;
    const temperatura = toFloatOrNull(tr.querySelector(".fase-temp")?.value);

    if (!ordine || !nomeFase) return;

    payload.push({
      ricetta_id: ricettaId,
      ordine,
      nome_fase: nomeFase,
      tipo_fase: tipoFase,
      durata_min: durataMin,
      lavoro_umano_min: lavoroMin,
      temperatura
    });
  });

  if (payload.length) {
    const { error } = await supabase.from("ricette_preparazione_fasi").insert(payload);
    if (error) throw error;
  }
}

// ============================================================
// PORZIONATURE (solo preview UI per ora)
// ============================================================

function aggiornaPreviewPorzioni() {
  const resaBase = toIntOrNull(getValue("ricetta-resa-base")) || 0;

  const l1 = (getValue("porz1-label") || "").trim();
  const p1 = toIntOrNull(getValue("porz1-percent")) || 0;

  const l2 = (getValue("porz2-label") || "").trim();
  const p2 = toIntOrNull(getValue("porz2-percent")) || 0;

  const out = document.getElementById("porzioni-preview");
  if (!out) return;

  if (!resaBase || (!p1 && !p2)) {
    out.textContent = "Compila resa base e percentuali per calcolo pezzi.";
    return;
  }

  const pezzi1 = p1 ? Math.round((resaBase * 100) / p1) : null;
  const pezzi2 = p2 ? Math.round((resaBase * 100) / p2) : null;

  const parts = [];
  if (l1 && pezzi1) parts.push(`${l1}: ~${pezzi1} pezzi`);
  if (l2 && pezzi2) parts.push(`${l2}: ~${pezzi2} pezzi`);

  out.textContent = parts.length ? parts.join(" · ") : "Inserisci nome formato e percentuale.";
}

// ============================================================
// UTILS
// ============================================================

function getValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return (el.value ?? "");
}

function setValue(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = v ?? "";
}

function toIntOrNull(v) {
  const n = parseInt(String(v || "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloatOrNull(v) {
  const n = parseFloat(String(v || "").trim());
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
