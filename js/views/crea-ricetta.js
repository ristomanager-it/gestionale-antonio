// js/views/crea-ricetta.js
// ============================================================
// CREA / MODIFICA RICETTA – VERSIONE INDUSTRIALE (MODULARE)
// Coerente con struttura DB reale:
// - ricette
// - ricetta_ingredienti
// - ricette_preparazione_fasi
// - ricette_conservazione
// - ricette_cottura (1 record per ricetta)
// - ricette_output (1 record per ricetta)
// - ricette_porzione
// + ricette_output_secondari (coprodotti / rifili)
// ============================================================
import { requirePermessi } from "../auth-utils.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";
let ricettaId = null;

let prodottiCache = [];
let prodottiMap = new Map();

let fasiTemplateCache = [];
let fasiTemplateMap = new Map();

let ingredientiCache = [];
let fasiCache = [];
let conservazioniCache = [];
let porzioniCache = [];
let cotturaCache = null;
let outputCache = null;
let outputSecondariCache = [];

let _autocompleteDocBound = false;

// mini-tab fasi
let faseTabAttiva = "preparazione";

export async function render(app) {
  ricettaId = window.routeParams?.id ? String(window.routeParams.id) : null;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  // ============================================================
  // ? CONTROLLO PERMESSI
  // ============================================================

  if (!requirePermessi({
    container: app,
    resource: "ricette",
    action: "read"
  })) return;

  if (!ricettaId) {
    if (!requirePermessi({
      container: app,
      resource: "ricette",
      action: "create"
    })) return;
  } else {
    if (!requirePermessi({
      container: app,
      resource: "ricette",
      action: "update"
    })) return;
  }

  // ============================================================
  // ? LAYOUT DEFINITIVO (COME PREVENTIVO)
  // ============================================================

  app.innerHTML = createPageLayout({
    title: ricettaId ? "Modifica Ricetta" : "Crea Ricetta",
    subtitle: "Struttura operativa ed economica",
    content: `

      <div class="form-actions" style="margin-bottom:16px; display:flex; gap:8px; flex-wrap:wrap;">
        <button id="btn-torna-ricettario" class="app-button secondary" type="button">
          ← Torna al Ricettario
        </button>
        <button class="app-button secondary" type="button"
          onclick="window.location.hash='#/produzione'">
          🏭 Centro Produzione
        </button>
      </div>

      ${createCard({
        title: "Anagrafica",
        body: `
          <div class="form-grid">

            <div class="form-group">
              <label>Nome ricetta *</label>
              <input id="r-nome" class="input" />
            </div>

            <div class="form-group">
              <label>Pezzi base</label>
              <input id="r-pezzi-base" type="number" min="0" class="input" />
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label>Descrizione</label>
              <textarea id="r-descrizione" class="input"></textarea>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label>Note procedimento</label>
              <textarea id="r-note-proc" class="input"></textarea>
            </div>

          </div>
        `
      })}

      ${createCard({
        title: "Ingredienti",
        body: `
          <div id="ingredienti-container"></div>

          <div class="form-actions">
            <button id="btn-add-ing"
              class="app-button secondary"
              type="button">
              + Aggiungi ingrediente
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Output (Resa)",
        body: `
          <div class="form-grid">

            <div class="form-group" style="grid-column:1/-1;">
              <label>Prodotto output *</label>
              <div class="input-wrap">
                <input id="r-output-search"
                  class="input"
                  autocomplete="off"
                  placeholder="Cerca prodotto..." />
                <input id="r-output-id" type="hidden" />
                <div id="r-output-suggest" class="suggest-list"></div>
              </div>
            </div>

            <div class="form-group">
              <label>Peso finale *</label>
              <input id="r-output-peso"
                type="number"
                step="0.001"
                class="input" />
            </div>

            <div class="form-group">
              <label>Unità misura *</label>
              <select id="r-output-um" class="input">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="pz">pz</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
              </select>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <div id="r-output-info" class="small-muted">Nessun prodotto output selezionato</div>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <div id="r-cost-preview" class="small-muted">
                Food cost: —
              </div>
            </div>

          </div>
        `
      })}

      ${createCard({
        title: "Procedimento",
        body: `
          <div class="form-actions" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
            <button id="btn-add-fase-manuale" class="app-button secondary" type="button">
              + Nuova fase
            </button>
            <button id="btn-add-fase-standard" class="app-button secondary" type="button">
              + Inserisci da standard aziendale
            </button>
          </div>

          <div id="fasi-container"></div>

          <!-- Modal selezione template fase -->
          <div id="modal-fasi-template" class="modal-overlay" style="display:none;">
            <div class="modal-card" style="max-width:820px; width:100%; border-radius:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                <h3 style="margin:0;">Standard aziendali (fasi)</h3>
                <button id="btn-close-modal-fasi-template" class="app-button tiny gray" type="button">Chiudi</button>
              </div>

              <div style="margin-top:10px;">
                <input id="tpl-fase-search" class="input" placeholder="Cerca fase standard..." autocomplete="off" />
              </div>

              <div id="tpl-fase-list" style="margin-top:10px; display:flex; flex-direction:column; gap:8px; max-height:420px; overflow:auto;"></div>

              <div class="small-muted" style="margin-top:10px;">
                Seleziona una fase standard per inserirla nel procedimento. Potrai modificarla liberamente.
              </div>
            </div>
          </div>
        `
      })}

      ${createCard({
        title: "Porzionature",
        body: `
          <div id="porzioni-container"></div>

          <div class="form-actions">
            <button id="btn-add-porzione"
              class="app-button secondary"
              type="button">
              + Aggiungi porzione
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Conservazione",
        body: `
          <div id="conservazione-container"></div>

          <div class="form-actions">
            <button id="btn-add-conservazione"
              class="app-button secondary"
              type="button">
              + Aggiungi scenario
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Area Economica",
        body: `
          <div id="output-secondari-container"></div>

          <div class="form-actions">
            <button id="btn-add-out2"
              class="app-button secondary"
              type="button">
              + Aggiungi coprodotto
            </button>
          </div>
        `
      })}

      <div class="form-actions" style="margin-top:20px;">
        <button id="btn-salva"
          class="app-button">
          ? Salva Ricetta
        </button>
      </div>

      <div id="r-esito" class="form-result"></div>
    `
  });

  // ============================================================
  // ? LOGICA ORIGINALE (NON TOCCATA)
  // ============================================================

  await loadProdotti();
  await loadFasiTemplate();
  bindUI();

  if (ricettaId) {
    await caricaRicettaCompleta();
  } else {
    aggiungiIngrediente();
    aggiungiFase({ ordine: 1, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });
    aggiungiScenarioConservazione();
    aggiungiPorzione();
    aggiornaOutputInfo();
  }
}
/* ============================================================
   PRODOTTI + AUTOCOMPLETE
============================================================ */
async function loadProdotti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, descrizione, um, costo_medio")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("descrizione");

  if (error) {
    console.error(error);
    prodottiCache = [];
    prodottiMap = new Map();
    return;
  }

  prodottiCache = data || [];
  prodottiMap = new Map(prodottiCache.map(p => [String(p.id), p]));

  setupAutocomplete(
    document.getElementById("r-output-search"),
    document.getElementById("r-output-id"),
    document.getElementById("r-output-suggest"),
    (p) => {
      const umSel = document.getElementById("r-output-um");
      if (p?.um && umSel) {
        const val = String(p.um).toLowerCase();
        const ok = ["kg", "g", "pz", "l", "ml"].includes(val);
        if (ok) umSel.value = val;
      }
      aggiornaOutputInfo();
    }
  );
}
/* ============================================================
   FASI TEMPLATE
============================================================ */
async function loadFasiTemplate() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("fasi_template")
    .select("id, titolo, descrizione_operativa, tipo_fase, durata_min_default, lavoro_umano_min_default, tecnologia_default, temperatura_default, richiede_conferma, parametri")
    .eq("azienda_id", aziendaId)
    .eq("attiva", true)
    .order("titolo");

  if (error) {
    console.error(error);
    fasiTemplateCache = [];
    fasiTemplateMap = new Map();
    return;
  }

  fasiTemplateCache = data || [];
  fasiTemplateMap = new Map(fasiTemplateCache.map(t => [String(t.id), t]));
}

function rebuildFasiTemplateOptions(selectEl, tipoFase = null, selectedId = "") {
  if (!selectEl) return;

  const selId = selectedId ? String(selectedId) : "";

  const baseOpt = `<option value="">— Nessun template —</option>`;
  const opts = (fasiTemplateCache || [])
    .filter(t => !tipoFase || String(t.tipo_fase || "") === String(tipoFase || ""))
    .map(t => `<option value="${t.id}">${escapeHtml(t.titolo)}</option>`)
    .join("");

  selectEl.innerHTML = baseOpt + opts;
  if (selId) selectEl.value = selId;
}


function setupAutocomplete(input, hidden, suggestBox, onPick = null) {
  if (!_autocompleteDocBound) {
    _autocompleteDocBound = true;
    document.addEventListener("click", (e) => {
      document.querySelectorAll(".suggest-list.open").forEach(box => {
        const wrap = box.closest(".input-wrap") || box.parentElement;
        if (wrap && !wrap.contains(e.target)) box.classList.remove("open");
      });
    });
  }

  input.addEventListener("input", () => {
    const q = (input.value || "").toLowerCase().trim();
    hidden.value = "";
    suggestBox.innerHTML = "";

    if (q.length < 2) {
      suggestBox.classList.remove("open");
      return;
    }

    const risultati = prodottiCache
      .filter(p => (p.descrizione || "").toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach(p => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = p.descrizione;

      div.onclick = () => {
        input.value = p.descrizione;
        hidden.value = p.id;
        suggestBox.innerHTML = "";
        suggestBox.classList.remove("open");
        if (typeof onPick === "function") onPick(p);
      };

      suggestBox.appendChild(div);
    });

    suggestBox.classList.add("open");
  });
}

function aggiornaOutputInfo() {
  const outId = document.getElementById("r-output-id")?.value;
  const outInfo = document.getElementById("r-output-info");
  if (!outInfo) return;

  if (!outId) {
    outInfo.innerText = "Nessun prodotto output selezionato";
    return;
  }

  const p = prodottiMap.get(String(outId));
  if (!p) {
    outInfo.innerText = "Prodotto output selezionato";
    return;
  }

  outInfo.innerText = `Output: ${p.descrizione} — UM: ${p.um || "-"}`;
}

/* ============================================================
   MINI-TAB FASI (deprecato: procedimento unificato)
============================================================ */

function refreshFasiTabUI() {
  document.querySelectorAll(".fase-tab").forEach(btn => {
    const isActive = (btn.dataset.tab === faseTabAttiva);

    // attiva = bottone standard, inattive = gray (nessun colore nuovo)
    btn.className = isActive
      ? "app-button small"
      : "app-button small gray";
  });
}

function filterFasiByTab() {
  const rows = document.querySelectorAll("#fasi-container .azienda-card");
  rows.forEach(row => {
    const tipo = row.dataset.tipoFase || "preparazione";
    row.style.display = (tipo === faseTabAttiva) ? "" : "none";
  });
}

/* ============================================================
   INGREDIENTI
============================================================ */
function aggiungiIngrediente(initial = {}) {
  const container = document.getElementById("ingredienti-container");

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="editor-grid-2">

      <div>
        <div class="input-wrap">
          <input class="ing-search input-pill"
            placeholder="Ingrediente..."
            autocomplete="off"
            value="${escapeAttr(initial.nome_prodotto || "")}" />
          <input class="ing-id"
            type="hidden"
            value="${escapeAttr(initial.prodotto_id || "")}" />
          <div class="suggest-list ing-suggest"></div>
        </div>
      </div>

      <div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input class="ing-qta input-pill"
            type="number"
            step="0.001"
            min="0"
            placeholder="Quantità"
            value="${escapeAttr(initial.quantita ?? initial.quantità ?? "")}" />
          <span class="small-muted ing-um-label" style="min-width:34px; text-align:right;">${escapeHtml(initial.unita_misura || "")}</span>
        </div>
      </div>

    </div>

    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
      <button class="app-button tiny red" type="button" data-action="delete">🗑</button>
    </div>
  `;

  row.querySelector('[data-action="delete"]').onclick = () => row.remove();
  container.appendChild(row);

  const ingSearch = row.querySelector(".ing-search");
  const ingId = row.querySelector(".ing-id");
  const ingSuggest = row.querySelector(".ing-suggest");
  const umLabel = row.querySelector(".ing-um-label");

  setupAutocomplete(
    ingSearch,
    ingId,
    ingSuggest,
    (p) => {
      umLabel.textContent = p?.um || "pz";
    }
  );

  if (ingId.value) {
    const p = prodottiMap.get(String(ingId.value));
    if (p) umLabel.textContent = p.um || "pz";
  }
}

/* ============================================================
   FASI
============================================================ */
function aggiungiFase(initial = {}) {
  const container = document.getElementById("fasi-container");

  const fase = {
    ordine: Number(initial.ordine ?? 1),
    tipo_fase: String(initial.tipo_fase || "preparazione"),
    nome_fase: String(initial.nome_fase || ""),
    descrizione_operativa: String(initial.descrizione_operativa || ""),
    durata_min: Number(initial.durata_min ?? 0),
    lavoro_umano_min: Number(initial.lavoro_umano_min ?? 0),
    tecnologia: initial.tecnologia ?? "",
    temperatura: (initial.temperatura ?? ""),
    note: initial.note ?? "",
    richiede_conferma: Boolean(initial.richiede_conferma ?? false),
    fase_template_id: (initial.fase_template_id ?? "")
  };

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "12px";
  card.style.padding = "12px";
  card.style.borderRadius = "16px";

  card.innerHTML = `
    <div class="fase-header" style="display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer;">
      <div style="display:flex; align-items:center; gap:10px; min-width:0;">
        <div class="fase-num" style="font-weight:800; font-size:18px; white-space:nowrap;">FASE ${escapeHtml(String(fase.ordine))}</div>
        <div class="fase-title-preview" style="font-weight:700; font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${escapeHtml(fase.nome_fase || "—")}
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <button class="app-button tiny gray" type="button" data-action="up">↑</button>
        <button class="app-button tiny gray" type="button" data-action="down">↓</button>
        <button class="app-button tiny gray" type="button" data-action="toggle">Apri</button>
        <button class="app-button tiny red" type="button" data-action="delete">🗑</button>
      </div>
    </div>

    <div class="fase-body" style="margin-top:10px; display:none;">
      <div class="form-grid" style="grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px;">

        <input class="fase-ordine" type="hidden" value="${escapeAttr(String(fase.ordine))}" />
        <input class="fase-tipo" type="hidden" value="${escapeAttr(String(fase.tipo_fase))}" />
        <input class="fase-template-id" type="hidden" value="${escapeAttr(String(fase.fase_template_id || ""))}" />

        <div class="form-group" style="grid-column:1/-1;">
          <label>Titolo fase *</label>
          <input class="input fase-nome" value="${escapeAttr(fase.nome_fase)}" placeholder="Es: Soffriggere" />
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label>Descrizione operativa (per operatore)</label>
          <textarea class="input fase-descrizione" rows="5"
            placeholder="Istruzioni operative chiare e sequenziali...">${escapeHtml(fase.descrizione_operativa)}</textarea>
        </div>

        <div class="form-group">
          <label>Tempo stimato totale (min)</label>
          <input class="input fase-durata" type="number" min="0" value="${escapeAttr(String(fase.durata_min))}" />
        </div>

        <div class="form-group">
          <label>Tempo lavoro umano (min)</label>
          <input class="input fase-lavoro" type="number" min="0" value="${escapeAttr(String(fase.lavoro_umano_min))}" />
        </div>

        <div class="form-group">
          <label>Tecnologia (opz.)</label>
          <input class="input fase-tecnologia" value="${escapeAttr(String(fase.tecnologia || ""))}" placeholder="Es: forno, piastra, robot..." />
        </div>

        <div class="form-group">
          <label>Temperatura (opz.)</label>
          <input class="input fase-temperatura" type="number" step="0.1" value="${escapeAttr(String(fase.temperatura ?? ""))}" />
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label>Note (opz.)</label>
          <input class="input fase-note" value="${escapeAttr(String(fase.note || ""))}" />
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label>Step critico (richiede conferma operatore)</label>
          <select class="input fase-conferma">
            <option value="false">No</option>
            <option value="true">Sì</option>
          </select>
        </div>

        <div class="form-group" style="grid-column:1/-1; display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
          <button class="app-button tiny" type="button" data-action="save-template">Salva come standard aziendale</button>
        </div>

      </div>
    </div>
  `;

  // toggle open/close
  const header = card.querySelector(".fase-header");
  const body = card.querySelector(".fase-body");
  const btnToggle = card.querySelector('[data-action="toggle"]');
  const confSel = card.querySelector(".fase-conferma");
  confSel.value = String(fase.richiede_conferma);

  function setOpen(open) {
    body.style.display = open ? "" : "none";
    btnToggle.textContent = open ? "Chiudi" : "Apri";
  }

  // header click (except buttons)
  header.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn) return;
    // open this, close others
    closeAllFasiExcept(card);
    setOpen(true);
  });

  btnToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = body.style.display !== "none";
    if (!isOpen) closeAllFasiExcept(card);
    setOpen(!isOpen);
  });

  // delete
  card.querySelector('[data-action="delete"]').addEventListener("click", (e) => {
    e.stopPropagation();
    card.remove();
    renumberFasi();
  });

  // reorder
  card.querySelector('[data-action="up"]').addEventListener("click", (e) => {
    e.stopPropagation();
    const prev = card.previousElementSibling;
    if (prev) container.insertBefore(card, prev);
    renumberFasi();
  });

  card.querySelector('[data-action="down"]').addEventListener("click", (e) => {
    e.stopPropagation();
    const next = card.nextElementSibling;
    if (next) container.insertBefore(next, card);
    renumberFasi();
  });

  // live preview title
  const titoloInput = card.querySelector(".fase-nome");
  const preview = card.querySelector(".fase-title-preview");
  titoloInput.addEventListener("input", () => {
    preview.textContent = titoloInput.value.trim() || "—";
  });

  // save as template
  card.querySelector('[data-action="save-template"]').addEventListener("click", async (e) => {
    e.stopPropagation();
    const supabase = window.supabaseClient;
    const aziendaId = window.state.azienda.id;

    const titolo = (card.querySelector(".fase-nome")?.value || "").trim();
    if (!titolo) return alert("Titolo fase obbligatorio per salvare uno standard.");

    const payload = {
      azienda_id: aziendaId,
      titolo,
      descrizione_operativa: (card.querySelector(".fase-descrizione")?.value || "").trim() || titolo,
      tipo_fase: (card.querySelector(".fase-tipo")?.value || "preparazione").trim(),
      durata_min_default: toIntOrNull(card.querySelector(".fase-durata")?.value) ?? 0,
      lavoro_umano_min_default: toIntOrNull(card.querySelector(".fase-lavoro")?.value) ?? 0,
      tecnologia_default: (card.querySelector(".fase-tecnologia")?.value || "").trim() || null,
      temperatura_default: toNumOrNull(card.querySelector(".fase-temperatura")?.value),
      richiede_conferma: (card.querySelector(".fase-conferma")?.value === "true"),
      parametri: {},
      attiva: true
    };

    const { data, error } = await supabase
      .from("fasi_template")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return alert("Errore salvataggio standard (verifica duplicati o permessi).");
    }

    // aggiorna cache e collega la fase al template appena creato
    await loadFasiTemplate();
    card.querySelector(".fase-template-id").value = String(data?.id || "");
    alert("Standard salvato.");
  });

  container.appendChild(card);

  // apertura automatica della fase appena creata (chiude le altre)
  closeAllFasiExcept(card);
  setOpen(true);
  renumberFasi();
}


/* ============================================================
   CONSERVAZIONE
/* ============================================================
   CONSERVAZIONE
============================================================ */
function aggiungiScenarioConservazione(initial = {}) {
  const container = document.getElementById("conservazione-container");

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="editor-grid-2">

      <label style="grid-column:1/-1;">
        Label scenario *
        <input class="cons-label input-pill" value="${escapeAttr(initial.scenario_label || "")}" placeholder="Es: Frigo 0-4°C, Abbattuto e congelato..." />
      </label>

      <label>
        Shelf life (giorni) *
        <input class="cons-shelf input-pill" type="number" min="0" value="${escapeAttr(initial.shelf_life_giorni ?? "")}" />
      </label>

      <label>
        Abbattimento (opz.)
        <input class="cons-abbatt input-pill" value="${escapeAttr(initial.abbattimento || "")}" placeholder="Es: sì/no, +3°C..." />
      </label>

      <label style="grid-column:1/-1;">
        Confezionamento (opz.)
        <input class="cons-confez input-pill" value="${escapeAttr(initial.confezionamento || "")}" placeholder="Es: vaschetta, sottovuoto, vasetto..." />
      </label>

      <label style="grid-column:1/-1;">
        Note (opz.)
        <input class="cons-note input-pill" value="${escapeAttr(initial.note || "")}" />
      </label>

      <label>
        Attivo
        <select class="cons-attivo input-pill">
          <option value="true">sì</option>
          <option value="false">no</option>
        </select>
      </label>

    </div>

    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
      <button class="app-button tiny red" type="button" data-action="delete">🗑</button>
    </div>
  `;

  row.querySelector(".cons-attivo").value = String(initial.attivo ?? true);
  row.querySelector('[data-action="delete"]').onclick = () => row.remove();

  container.appendChild(row);
}

/* ============================================================
   PORZIONATURE
============================================================ */
function aggiungiPorzione(initial = {}) {
  const container = document.getElementById("porzioni-container");

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="editor-grid-2">

      <label style="grid-column:1/-1;">
        Label porzione *
        <input class="porz-label input-pill" value="${escapeAttr(initial.label || "")}" placeholder="Es: Trattoria 200g / Ricevimento 120g / Vasetto 280g" />
      </label>

      <label>
        Peso porzione *
        <input class="porz-peso input-pill" type="number" min="0" step="0.001" value="${escapeAttr(initial.peso_porzione ?? "")}" />
      </label>

      <label>
        Unità misura *
        <select class="porz-um input-pill">
          <option value="g">g</option>
          <option value="kg">kg</option>
          <option value="pz">pz</option>
          <option value="ml">ml</option>
          <option value="l">l</option>
        </select>
      </label>

      <label style="grid-column:1/-1;">
        Note (opz.)
        <input class="porz-note input-pill" value="${escapeAttr(initial.note || "")}" />
      </label>

      <label>
        Attivo
        <select class="porz-attivo input-pill">
          <option value="true">sì</option>
          <option value="false">no</option>
        </select>
      </label>

    </div>

    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
      <button class="app-button tiny red" type="button" data-action="delete">🗑</button>
    </div>
  `;

  row.querySelector(".porz-um").value = initial.unita_misura || "g";
  row.querySelector(".porz-attivo").value = String(initial.attivo ?? true);
  row.querySelector('[data-action="delete"]').onclick = () => row.remove();

  container.appendChild(row);
}

/* ============================================================
   CARICA RICETTA COMPLETA
============================================================ */
async function caricaRicettaCompleta() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data: ricetta, error: errRic } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", ricettaId)
    .eq("azienda_id", aziendaId)
    .single();

  if (errRic || !ricetta) {
    console.error(errRic);
    alert("Ricetta non trovata o non accessibile.");
    window.location.hash = "#/ricettario";
    return;
  }

  setVal("r-nome", ricetta.nome || "");
  setVal("r-pezzi-base", ricetta.pezzi_base ?? "");
  setVal("r-descrizione", ricetta.descrizione || "");
  setVal("r-note-proc", ricetta.note_procedimento || "");
  setVal("r-foto-url", ricetta.foto_url || "");

  if (ricetta.prodotto_output_id) {
    const p = prodottiMap.get(String(ricetta.prodotto_output_id));
    if (p) {
      setVal("r-output-search", p.descrizione || "");
      setVal("r-output-id", p.id);
    } else {
      setVal("r-output-id", ricetta.prodotto_output_id);
    }
  }
  aggiornaOutputInfo();

  // ingredienti
  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId);

  ingredientiCache = ingredienti || [];
  document.getElementById("ingredienti-container").innerHTML = "";
  if (ingredientiCache.length) ingredientiCache.forEach(i => aggiungiIngrediente(i));
  else aggiungiIngrediente();

  // fasi
  const { data: fasi } = await supabase
    .from("ricette_preparazione_fasi")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("ordine", { ascending: true });

  fasiCache = fasi || [];
  document.getElementById("fasi-container").innerHTML = "";
  if (fasiCache.length) fasiCache.forEach(f => aggiungiFase(f));
  else aggiungiFase({ ordine: 1, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });

  // conservazione
  const { data: cons } = await supabase
    .from("ricette_conservazione")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  conservazioniCache = cons || [];
  document.getElementById("conservazione-container").innerHTML = "";
  if (conservazioniCache.length) conservazioniCache.forEach(c => aggiungiScenarioConservazione(c));
  else aggiungiScenarioConservazione();

  // output (1 record)
  const { data: output } = await supabase
    .from("ricette_output")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  outputCache = output || null;
  if (outputCache) {
    setVal("r-output-peso", outputCache.peso_finale ?? "");
    setVal("r-output-um", outputCache.unita_misura || "kg");
    setVal("r-output-note", outputCache.note || "");
  } else {
    setVal("r-output-peso", ricetta.peso_output_kg ?? "");
    setVal("r-output-um", "kg");
    setVal("r-output-note", "");
  }

  // output secondari
  const { data: out2 } = await supabase
    .from("ricette_output_secondari")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  outputSecondariCache = out2 || [];
  const out2Container = document.getElementById("output-secondari-container");
  if (out2Container) out2Container.innerHTML = "";
  if (outputSecondariCache.length) {
    outputSecondariCache.forEach(o => aggiungiOutputSecondario(o));
  }

  // porzioni
  const { data: porzioni } = await supabase
    .from("ricette_porzione")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  porzioniCache = porzioni || [];
  document.getElementById("porzioni-container").innerHTML = "";
  if (porzioniCache.length) porzioniCache.forEach(p => aggiungiPorzione(p));
  else aggiungiPorzione();

  const prev = document.getElementById("r-cost-preview");
  if (prev) {
    const cm = ricetta.costo_materia_prima ?? 0;
    prev.innerText = `Food cost (MP): € ${formatMoney(cm)} (snapshot)`;
  }
}

/* ============================================================
   SALVA TUTTO
============================================================ */
async function salvaTutto() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  if (!ricettaId) {
    if (!requirePermessi({ resource: "ricette", action: "create" })) {
      alert("Non hai i permessi per creare ricette.");
      return;
    }
  } else {
    if (!requirePermessi({ resource: "ricette", action: "update" })) {
      alert("Non hai i permessi per modificare ricette.");
      return;
    }
  }

  const nome = getVal("r-nome").trim();
  const pezzi_base = toIntOrNull(getVal("r-pezzi-base"));
  const descrizione = getVal("r-descrizione").trim() || null;
  const note_procedimento = getVal("r-note-proc").trim() || null;
  const foto_url = getVal("r-foto-url").trim() || null;

  const prodotto_output_id = getVal("r-output-id");
  const output_peso = toNumOrNull(getVal("r-output-peso"));
  const output_um = getVal("r-output-um");
  const output_note = getVal("r-output-note").trim() || null;

  if (!nome) return alert("Nome ricetta obbligatorio.");
  if (!prodotto_output_id) return alert("Seleziona il prodotto output.");
  if (!output_peso || output_peso <= 0) return alert("Inserisci il peso finale (resa) dell'output.");
  if (!output_um) return alert("Seleziona unità misura output.");

  const esito = document.getElementById("r-esito");
  if (esito) esito.innerText = "Salvataggio in corso...";

  let savedId = ricettaId;

  if (!ricettaId) {
    const payload = {
      nome,
      descrizione,
      note_procedimento,
      foto_url,
      pezzi_base,
      prodotto_output_id: Number(prodotto_output_id),
      azienda_id: aziendaId,
      attivo: true,
      stato_strutturale: "bozza"
    };

    const { data, error } = await supabase
      .from("ricette")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore salvataggio ricetta.");
    }

    savedId = String(data.id);
    ricettaId = savedId;
  } else {
    const payload = {
      nome,
      descrizione,
      note_procedimento,
      foto_url,
      pezzi_base,
      prodotto_output_id: Number(prodotto_output_id),
      aggiornato_il: new Date().toISOString()
    };

    const { error } = await supabase
      .from("ricette")
      .update(payload)
      .eq("id", Number(ricettaId))
      .eq("azienda_id", aziendaId);

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore aggiornamento ricetta.");
    }
  }

  const ricettaIdNum = Number(savedId);

  // output principale
  {
    const payloadOut = {
      ricetta_id: ricettaIdNum,
      peso_finale: output_peso,
      unita_misura: output_um,
      note: output_note,
      azienda_id: aziendaId
    };

    const { error } = await supabase
      .from("ricette_output")
      .upsert(payloadOut, { onConflict: "ricetta_id" });

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore salvataggio output ricetta.");
    }
  }

  // output secondari
  {
    const { error: delOut2Err } = await supabase
      .from("ricette_output_secondari")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delOut2Err) {
      console.error(delOut2Err);
      if (esito) esito.innerText = "";
      return alert("Errore reset coprodotti.");
    }

    const out2Rows = [];
    document.querySelectorAll("#output-secondari-container .azienda-card").forEach(r => {
      const pid = (r.querySelector(".out2-id")?.value || "").trim();
      const peso = toNumOrNull(r.querySelector(".out2-peso")?.value);
      const um = (r.querySelector(".out2-um")?.value || "").trim();
      const metodo = (r.querySelector(".out2-metodo")?.value || "peso").trim();
      const perc = toNumOrNull(r.querySelector(".out2-percent")?.value);

      if (pid && peso && peso > 0 && um) {
        out2Rows.push({
          ricetta_id: ricettaIdNum,
          prodotto_id: Number(pid),
          peso,
          unita_misura: um,
          metodo_allocazione: metodo,
          percentuale_allocazione: (metodo === "percentuale" && perc != null)
            ? (Number(perc) / 100)
            : null,
          azienda_id: aziendaId
        });
      }
    });

    if (out2Rows.length) {
      const { error: insOut2Err } = await supabase
        .from("ricette_output_secondari")
        .insert(out2Rows);

      if (insOut2Err) {
        console.error(insOut2Err);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio coprodotti.");
      }
    }
  }

  // ingredienti
  let ingredientRowsForCost = [];
  {
    const { error: delErr } = await supabase
      .from("ricetta_ingredienti")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delErr) {
      console.error(delErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset ingredienti.");
    }

    const rows = [];
    document.querySelectorAll("#ingredienti-container .azienda-card").forEach(r => {
      const pid = (r.querySelector(".ing-id")?.value || "").trim();
      const nomeProd = (r.querySelector(".ing-search")?.value || "").trim();
      const qta = toNumOrNull(r.querySelector(".ing-qta")?.value);

      if (pid && qta && qta > 0) {
        const p = prodottiMap.get(String(pid));
        const um = p?.um || "pz";

        rows.push({
          ricetta_id: ricettaIdNum,
          prodotto_id: Number(pid),
          nome_prodotto: nomeProd || (p?.descrizione || ""),
          quantita: qta,
          unita_misura: um,
          azienda_id: aziendaId,
          mapping_stato: "ok"
        });

        ingredientRowsForCost.push({
          prodotto_id: Number(pid),
          quantita: qta
        });
      }
    });

    if (rows.length) {
      const { error: insErr } = await supabase
        .from("ricetta_ingredienti")
        .insert(rows);

      if (insErr) {
        console.error(insErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio ingredienti.");
      }
    }
  }

  // fasi (procedimento)
  {
    const { error: delFasiErr } = await supabase
      .from("ricette_preparazione_fasi")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delFasiErr) {
      console.error(delFasiErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset fasi.");
    }

    const rows = [];
    document.querySelectorAll("#fasi-container .azienda-card").forEach(r => {
      const ordine = toIntOrNull(r.querySelector(".fase-ordine")?.value) ?? 1;
      const tipo_fase = (r.querySelector(".fase-tipo")?.value || "preparazione").trim();
      const nome_fase = (r.querySelector(".fase-nome")?.value || "").trim();
      const descrizione_operativa = (r.querySelector(".fase-descrizione")?.value || "").trim() || null;
      const durata_min = toIntOrNull(r.querySelector(".fase-durata")?.value) ?? 0;
      const lavoro_umano_min = toIntOrNull(r.querySelector(".fase-lavoro")?.value) ?? 0;
      const tecnologia = (r.querySelector(".fase-tecnologia")?.value || "").trim() || null;
      const temperatura = toNumOrNull(r.querySelector(".fase-temperatura")?.value);
      const note = (r.querySelector(".fase-note")?.value || "").trim() || null;
      const richiede_conferma = (r.querySelector(".fase-conferma")?.value === "true");
      const fase_template_id = toIntOrNull(r.querySelector(".fase-template-id")?.value);

      if (!nome_fase) return;

      rows.push({
        ricetta_id: ricettaIdNum,
        ordine,
        nome_fase,
        tipo_fase,
        durata_min,
        lavoro_umano_min,
        tecnologia,
        temperatura,
        note,
        descrizione_operativa,
        richiede_conferma,
        fase_template_id: fase_template_id ?? null,
        parametri: {},
        azienda_id: aziendaId
      });
    });

    if (rows.length) {
      const { error: insFasiErr } = await supabase
        .from("ricette_preparazione_fasi")
        .insert(rows);

      if (insFasiErr) {
        console.error(insFasiErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio fasi.");
      }
    }
  }

  // conservazione (scenari)
  {
    const { error: delConsErr } = await supabase
      .from("ricette_conservazione")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delConsErr) {
      console.error(delConsErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset conservazione.");
    }

    const rows = [];
    document.querySelectorAll("#conservazione-container .azienda-card").forEach(r => {
      const scenario_label = (r.querySelector(".cons-label")?.value || "").trim();
      const shelf_life_giorni = toIntOrNull(r.querySelector(".cons-shelf")?.value);
      const abbattimento = (r.querySelector(".cons-abbatt")?.value || "").trim() || null;
      const confezionamento = (r.querySelector(".cons-confez")?.value || "").trim() || null;
      const note = (r.querySelector(".cons-note")?.value || "").trim() || null;
      const attivo = (r.querySelector(".cons-attivo")?.value !== "false");

      if (!scenario_label) return;

      rows.push({
        ricetta_id: ricettaIdNum,
        scenario_label,
        abbattimento,
        confezionamento,
        shelf_life_giorni,
        note,
        attivo,
        azienda_id: aziendaId
      });
    });

    if (rows.length) {
      const { error: insConsErr } = await supabase
        .from("ricette_conservazione")
        .insert(rows);

      if (insConsErr) {
        console.error(insConsErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio conservazione.");
      }
    }
  }

  // porzionature
  {
    const { error: delPorzErr } = await supabase
      .from("ricette_porzione")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delPorzErr) {
      console.error(delPorzErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset porzionature.");
    }

    const rows = [];
    document.querySelectorAll("#porzioni-container .azienda-card").forEach(r => {
      const label = (r.querySelector(".porz-label")?.value || "").trim();
      const peso_porzione = toNumOrNull(r.querySelector(".porz-peso")?.value);
      const unita_misura = (r.querySelector(".porz-um")?.value || "g").trim();
      const note = (r.querySelector(".porz-note")?.value || "").trim() || null;
      const attivo = (r.querySelector(".porz-attivo")?.value !== "false");

      if (!label) return;
      if (!peso_porzione || peso_porzione <= 0) return;

      rows.push({
        ricetta_id: ricettaIdNum,
        label,
        peso_porzione,
        unita_misura,
        note,
        attivo,
        azienda_id: aziendaId
      });
    });

    if (rows.length) {
      const { error: insPorzErr } = await supabase
        .from("ricette_porzione")
        .insert(rows);

      if (insPorzErr) {
        console.error(insPorzErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio porzionature.");
      }
    }
  }


  // calcolo costo + snapshot ricetta
  const computed = computeCostoIndustriale({
    outputPrincipale: { peso: output_peso, um: output_um },
    ingredienti: ingredientRowsForCost,
    outputSecondariDom: readOutputSecondariFromDOM()
  });

  {
    const payloadSnap = {
      costo_materia_prima: computed.costoTotaleInput,
      costo_tot_snapshot: computed.costoTotaleInput,
      ultimo_ricalcolo: new Date().toISOString(),
      stato_costo: computed.ok ? "ok" : "warning"
    };

    const { error: upErr } = await supabase
      .from("ricette")
      .update(payloadSnap)
      .eq("id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (upErr) console.error(upErr);
  }

  const prev = document.getElementById("r-cost-preview");
  if (prev) {
    if (computed.ok) {
      prev.innerText = `Food cost (MP): € ${formatMoney(computed.costoTotaleInput)} — Costo unitario output: € ${formatMoney(computed.costoUnitarioPrincipale)} / ${computed.baseUnitLabel}`;
    } else {
      prev.innerText = `Food cost (MP): € ${formatMoney(computed.costoTotaleInput)} — ${computed.warning || "Verifica unità output/ingredienti"}`;
    }
  }

  {
    const hasIngredienteValido = Array.isArray(ingredientRowsForCost) && ingredientRowsForCost.length > 0;

    let hasFaseValida = false;
    document.querySelectorAll("#fasi-container .azienda-card").forEach(r => {
      const nomeFase = (r.querySelector(".fase-nome")?.value || "").trim();
      if (nomeFase) hasFaseValida = true;
    });

    const hasOutputProdotto = !!prodotto_output_id;
    const hasOutputPeso = !!output_peso && output_peso > 0;
    const hasOutputUm = !!output_um;

    const scheda_completa =
      hasIngredienteValido &&
      hasFaseValida &&
      hasOutputProdotto &&
      hasOutputPeso &&
      hasOutputUm;

    const stato_strutturale = scheda_completa ? "strutturata" : "bozza";

    const { error: strutturaErr } = await supabase
      .from("ricette")
      .update({
        scheda_completa,
        stato_strutturale,
        aggiornato_il: new Date().toISOString()
      })
      .eq("id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (strutturaErr) console.error(strutturaErr);
  }

  if (esito) esito.innerText = "Ricetta salvata";
  alert("Ricetta salvata");
  window.location.hash = "#/ricettario";
}

/* ============================================================
   COSTO INDUSTRIALE
============================================================ */
function computeCostoIndustriale({ outputPrincipale, ingredienti, outputSecondariDom }) {
  let costoTotale = 0;
  for (const r of (ingredienti || [])) {
    const p = prodottiMap.get(String(r.prodotto_id));
    const costoMedio = Number(p?.costo_medio ?? 0);
    const qta = Number(r.quantita ?? 0);
    costoTotale += (costoMedio * qta);
  }

  const p1 = convertToBase(outputPrincipale.peso, outputPrincipale.um);
  if (!p1.ok) {
    return {
      ok: false,
      costoTotaleInput: round4(costoTotale),
      costoUnitarioPrincipale: 0,
      baseUnitLabel: "unità",
      warning: p1.warning
    };
  }

  let outputs = [{ kind: "principale", baseQty: p1.baseQty, unitLabel: p1.baseUnitLabel, metodo: "peso" }];

  for (const o of (outputSecondariDom || [])) {
    const conv = convertToBase(o.peso, o.unita_misura);
    if (!conv.ok || conv.baseUnitLabel !== p1.baseUnitLabel) {
      return {
        ok: false,
        costoTotaleInput: round4(costoTotale),
        costoUnitarioPrincipale: 0,
        baseUnitLabel: p1.baseUnitLabel,
        warning: "Unità coprodotti non coerenti con output (kg/g oppure l/ml oppure pz)."
      };
    }
    outputs.push({
      kind: "secondario",
      baseQty: conv.baseQty,
      metodo: o.metodo_allocazione,
      percentuale_allocazione: o.percentuale_allocazione
    });
  }

  const percentSecondari = outputs
    .filter(x => x.kind === "secondario" && x.metodo === "percentuale" && Number.isFinite(x.percentuale_allocazione))
    .reduce((a, x) => a + Number(x.percentuale_allocazione), 0);

  let costoPrincipale = costoTotale;

  if (percentSecondari > 0) {
    const perc = Math.max(0, Math.min(1, percentSecondari));
    costoPrincipale = costoTotale * (1 - perc);
  } else {
    const totBase = outputs.reduce((a, x) => a + (Number(x.baseQty) || 0), 0);
    if (totBase > 0) costoPrincipale = costoTotale * (p1.baseQty / totBase);
  }

  const costoUnitarioPrincipale = (p1.baseQty > 0) ? (costoPrincipale / p1.baseQty) : 0;

  return {
    ok: true,
    costoTotaleInput: round4(costoTotale),
    costoPrincipale: round4(costoPrincipale),
    costoUnitarioPrincipale: round4(costoUnitarioPrincipale),
    baseUnitLabel: p1.baseUnitLabel,
    warning: null
  };
}

function readOutputSecondariFromDOM() {
  const out = [];
  document.querySelectorAll("#output-secondari-container .azienda-card").forEach(r => {
    const pid = (r.querySelector(".out2-id")?.value || "").trim();
    const peso = toNumOrNull(r.querySelector(".out2-peso")?.value);
    const um = (r.querySelector(".out2-um")?.value || "").trim();
    const metodo = (r.querySelector(".out2-metodo")?.value || "peso").trim();
    const perc = toNumOrNull(r.querySelector(".out2-percent")?.value);

    if (pid && peso && peso > 0 && um) {
      out.push({
        prodotto_id: Number(pid),
        peso,
        unita_misura: um,
        metodo_allocazione: metodo,
        percentuale_allocazione: (metodo === "percentuale" && perc != null)
          ? (Number(perc) / 100)
          : null
      });
    }
  });
  return out;
}

function convertToBase(qty, um) {
  const u = String(um || "").toLowerCase().trim();
  const n = Number(qty ?? 0);

  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, warning: "Peso/Qtà output non valido." };
  }

  if (u === "kg") return { ok: true, baseQty: n * 1000, baseUnitLabel: "g" };
  if (u === "g") return { ok: true, baseQty: n, baseUnitLabel: "g" };

  if (u === "l") return { ok: true, baseQty: n * 1000, baseUnitLabel: "ml" };
  if (u === "ml") return { ok: true, baseQty: n, baseUnitLabel: "ml" };

  if (u === "pz") return { ok: true, baseQty: n, baseUnitLabel: "pz" };

  return { ok: false, warning: "Unità output non supportata (usa kg/g oppure l/ml oppure pz)." };
}

/* ============================================================
   BIND UI
============================================================ */
function bindUI() {
  document.getElementById("btn-add-ing")
    .addEventListener("click", () => aggiungiIngrediente());

  document.getElementById("btn-add-out2")
    .addEventListener("click", () => aggiungiOutputSecondario());

  document.getElementById("btn-add-fase-manuale")
    .addEventListener("click", () => {
      const next = nextOrdineFase();
      aggiungiFase({ ordine: next, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });
      openOnlyLastFase();
      renumberFasi();
    });

  document.getElementById("btn-add-fase-standard")
    .addEventListener("click", () => {
      openModalFasiTemplate();
    });

  document.getElementById("btn-add-conservazione")
    .addEventListener("click", () => aggiungiScenarioConservazione());

  document.getElementById("btn-add-porzione")
    .addEventListener("click", () => aggiungiPorzione());

  document.getElementById("btn-salva")
    .addEventListener("click", salvaTutto);

  const backBtn = document.getElementById("btn-torna-ricettario");
  if (backBtn) backBtn.addEventListener("click", () => window.location.hash = "#/ricettario");

  document.getElementById("r-output-search")
    .addEventListener("input", () => {
      if (!getVal("r-output-id")) document.getElementById("r-output-info").innerText = "Nessun prodotto output selezionato";
    });

  document.getElementById("r-output-id")
    .addEventListener("change", aggiornaOutputInfo);
}

function nextOrdineFase() {
  return (document.querySelectorAll("#fasi-container .azienda-card").length || 0) + 1;
}


/* ============================================================
   MODAL TEMPLATE FASI (inserimento da standard)
============================================================ */
function openModalFasiTemplate() {
  const modal = document.getElementById("modal-fasi-template");
  const search = document.getElementById("tpl-fase-search");
  const list = document.getElementById("tpl-fase-list");
  const btnClose = document.getElementById("btn-close-modal-fasi-template");

  if (!modal || !search || !list || !btnClose) return;

  modal.style.display = "";

  const renderList = () => {
    const q = (search.value || "").toLowerCase().trim();
    const items = (fasiTemplateCache || [])
      .filter(t => {
        const titolo = String(t.titolo || "").toLowerCase();
        const desc = String(t.descrizione_operativa || "").toLowerCase();
        return !q || titolo.includes(q) || desc.includes(q);
      })
      .slice(0, 80);

    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = `<div class="small-muted">Nessun risultato</div>`;
      return;
    }

    items.forEach(t => {
      const row = document.createElement("div");
      row.className = "azienda-card";
      row.style.padding = "10px";
      row.style.borderRadius = "14px";
      row.style.cursor = "pointer";

      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
          <div style="min-width:0;">
            <div style="font-weight:800;">${escapeHtml(t.titolo)}</div>
            <div class="small-muted" style="margin-top:4px; white-space:pre-wrap;">${escapeHtml(String(t.descrizione_operativa || "").slice(0, 180))}</div>
          </div>
          <div class="small-muted" style="white-space:nowrap;">${escapeHtml(t.tipo_fase || "")}</div>
        </div>
      `;

      row.addEventListener("click", () => {
        const next = nextOrdineFase();
        aggiungiFase({
          ordine: next,
          tipo_fase: t.tipo_fase || "preparazione",
          nome_fase: t.titolo || "",
          descrizione_operativa: t.descrizione_operativa || "",
          durata_min: t.durata_min_default ?? 0,
          lavoro_umano_min: t.lavoro_umano_min_default ?? 0,
          tecnologia: t.tecnologia_default || "",
          temperatura: t.temperatura_default ?? "",
          richiede_conferma: Boolean(t.richiede_conferma),
          fase_template_id: t.id
        });
        closeModalFasiTemplate();
        openOnlyLastFase();
      });

      list.appendChild(row);
    });
  };

  renderList();
  search.focus();
  search.oninput = renderList;

  btnClose.onclick = closeModalFasiTemplate;

  modal.onclick = (e) => {
    if (e.target === modal) closeModalFasiTemplate();
  };
}

function closeModalFasiTemplate() {
  const modal = document.getElementById("modal-fasi-template");
  if (modal) modal.style.display = "none";
}

function closeAllFasiExcept(cardEl) {
  document.querySelectorAll("#fasi-container .azienda-card").forEach(c => {
    if (c === cardEl) return;
    const body = c.querySelector(".fase-body");
    const btn = c.querySelector('[data-action="toggle"]');
    if (body) body.style.display = "none";
    if (btn) btn.textContent = "Apri";
  });
}

function openOnlyLastFase() {
  const cards = document.querySelectorAll("#fasi-container .azienda-card");
  if (!cards.length) return;
  const last = cards[cards.length - 1];
  closeAllFasiExcept(last);
  const body = last.querySelector(".fase-body");
  const btn = last.querySelector('[data-action="toggle"]');
  if (body) body.style.display = "";
  if (btn) btn.textContent = "Chiudi";
}

function renumberFasi() {
  const cards = Array.from(document.querySelectorAll("#fasi-container .azienda-card"));
  cards.forEach((card, idx) => {
    const ordine = idx + 1;
    const ordineHidden = card.querySelector(".fase-ordine");
    if (ordineHidden) ordineHidden.value = String(ordine);
    const num = card.querySelector(".fase-num");
    if (num) num.textContent = `FASE ${ordine}`;
  });
}

/* ============================================================
   HELPERS
============================================================ */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? (el.value ?? "") : "";
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? "";
}

function toIntOrNull(v) {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function toNumOrNull(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}

function round4(n) {
  const x = Number(n ?? 0);
  return Math.round(x * 10000) / 10000;
}

function formatMoney(n) {
  const x = Number(n ?? 0);
  return x.toFixed(2);
}
