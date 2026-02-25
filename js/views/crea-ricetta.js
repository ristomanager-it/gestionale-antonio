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
  // 🔐 CONTROLLO PERMESSI
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
  // 🧱 LAYOUT DEFINITIVO (COME PREVENTIVO)
  // ============================================================

  app.innerHTML = createPageLayout({
    title: ricettaId ? "Modifica Ricetta" : "Crea Ricetta",
    subtitle: "Struttura operativa ed economica",
    content: `

      <div class="form-actions" style="margin-bottom:16px;">
        <button class="app-button secondary"
          onclick="window.location.hash='#/produzione'">
          ← Centro Produzione
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
          <div id="fasi-container"></div>

          <div class="form-actions">
            <button id="btn-add-fase"
              class="app-button secondary"
              type="button">
              + Aggiungi fase
            </button>
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
          💾 Salva Ricetta
        </button>
      </div>

      <div id="r-esito" class="form-result"></div>
    `
  });

  // ============================================================
  // 🔄 LOGICA ORIGINALE (NON TOCCATA)
  // ============================================================

  await loadProdotti();
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
   MINI-TAB FASI
============================================================ */
function initFasiTabs() {
  const tabs = document.querySelectorAll(".fase-tab");
  if (!tabs.length) return;

  // default
  if (!faseTabAttiva) faseTabAttiva = "preparazione";

  tabs.forEach(btn => {
    btn.onclick = () => {
      faseTabAttiva = btn.dataset.tab || "preparazione";
      refreshFasiTabUI();
      filterFasiByTab();
    };
  });

  refreshFasiTabUI();
}

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
   OUTPUT SECONDARI (COPRODOTTI)
============================================================ */
function aggiungiOutputSecondario(initial = {}) {
  const container = document.getElementById("output-secondari-container");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="editor-grid-2">

      <div style="grid-column:1/-1;">
        <label>
          Prodotto coprodotto *
          <div class="input-wrap">
            <input class="out2-search input-pill"
              placeholder="Cerca prodotto..."
              autocomplete="off"
              value="${escapeAttr(initial.prodotto_nome || initial.nome_prodotto || "")}" />
            <input class="out2-id" type="hidden" value="${escapeAttr(initial.prodotto_id || "")}" />
            <div class="suggest-list out2-suggest"></div>
          </div>
        </label>
      </div>

      <label>
        Peso/Qtà *
        <input class="out2-peso input-pill"
          type="number" step="0.001" min="0"
          value="${escapeAttr(initial.peso ?? "")}"
          placeholder="Es: 0.700" />
      </label>

      <label>
        UM *
        <select class="out2-um input-pill">
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="pz">pz</option>
          <option value="l">l</option>
          <option value="ml">ml</option>
        </select>
      </label>

      <label>
        Allocazione costo
        <select class="out2-metodo input-pill">
          <option value="peso">peso</option>
          <option value="percentuale">percentuale</option>
          <option value="manuale">manuale</option>
        </select>
      </label>

      <label>
        % allocazione (solo percentuale)
        <input class="out2-percent input-pill"
          type="number" min="0" max="100" step="0.01"
          value="${escapeAttr(initial.percentuale_allocazione ? Number(initial.percentuale_allocazione) * 100 : "")}"
          placeholder="Es: 20" />
      </label>

    </div>

    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
      <button class="app-button tiny red" type="button">✕</button>
    </div>
  `;

  row.querySelector(".out2-um").value = (initial.unita_misura || "kg");
  row.querySelector(".out2-metodo").value = (initial.metodo_allocazione || "peso");

  row.querySelector("button").onclick = () => row.remove();
  container.appendChild(row);

  const inSearch = row.querySelector(".out2-search");
  const inId = row.querySelector(".out2-id");
  const box = row.querySelector(".out2-suggest");

  setupAutocomplete(inSearch, inId, box, null);
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
      <button class="app-button tiny red" type="button">✕</button>
    </div>
  `;

  row.querySelector("button").onclick = () => row.remove();
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

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  // per filtro tab
  row.dataset.tipoFase = initial.tipo_fase || "preparazione";

  row.innerHTML = `
    <div class="editor-grid-2">

      <label>
        Ordine *
        <input class="fase-ordine input-pill" type="number" min="1" value="${escapeAttr(initial.ordine ?? 1)}" />
      </label>

      <label>
        Tipo fase *
        <select class="fase-tipo input-pill">
          <option value="preparazione">preparazione</option>
          <option value="cottura">cottura</option>
          <option value="attesa">attesa</option>
          <option value="raffreddamento">raffreddamento</option>
        </select>
      </label>

      <label style="grid-column:1/-1;">
        Nome fase *
        <input class="fase-nome input-pill" value="${escapeAttr(initial.nome_fase || "")}" />
      </label>

      <label>
        Durata (min) *
        <input class="fase-durata input-pill" type="number" min="0" value="${escapeAttr(initial.durata_min ?? 0)}" />
      </label>

      <label>
        Lavoro umano (min) *
        <input class="fase-lavoro input-pill" type="number" min="0" value="${escapeAttr(initial.lavoro_umano_min ?? 0)}" />
      </label>

      <label>
        Tecnologia (opz.)
        <input class="fase-tecnologia input-pill" value="${escapeAttr(initial.tecnologia || "")}" />
      </label>

      <label>
        Temperatura (opz.)
        <input class="fase-temperatura input-pill" type="number" step="0.1" value="${escapeAttr(initial.temperatura ?? "")}" />
      </label>

      <label style="grid-column:1/-1;">
        Note (opz.)
        <input class="fase-note input-pill" value="${escapeAttr(initial.note || "")}" />
      </label>

    </div>

    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
      <button class="app-button tiny red" type="button">✕</button>
    </div>
  `;

  const tipoSel = row.querySelector(".fase-tipo");
  tipoSel.value = initial.tipo_fase || "preparazione";

  // se cambio tipo fase, aggiorno dataset e rifiltro
  tipoSel.addEventListener("change", () => {
    row.dataset.tipoFase = tipoSel.value || "preparazione";
    filterFasiByTab();
  });

  row.querySelector("button").onclick = () => row.remove();

  container.appendChild(row);

  // applico filtro subito
  filterFasiByTab();
}

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
      <button class="app-button tiny red" type="button">✕</button>
    </div>
  `;

  row.querySelector(".cons-attivo").value = String(initial.attivo ?? true);
  row.querySelector("button").onclick = () => row.remove();

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
      <button class="app-button tiny red" type="button">✕</button>
    </div>
  `;

  row.querySelector(".porz-um").value = initial.unita_misura || "g";
  row.querySelector(".porz-attivo").value = String(initial.attivo ?? true);
  row.querySelector("button").onclick = () => row.remove();

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

  document.getElementById("btn-add-fase")
    .addEventListener("click", () => {
      const next = nextOrdineFase();
      aggiungiFase({ ordine: next, tipo_fase: faseTabAttiva, durata_min: 0, lavoro_umano_min: 0 });
    });

  document.getElementById("btn-add-conservazione")
    .addEventListener("click", () => aggiungiScenarioConservazione());

  document.getElementById("btn-add-porzione")
    .addEventListener("click", () => aggiungiPorzione());

  document.getElementById("btn-salva")
    .addEventListener("click", salvaTutto);

  document.getElementById("btn-torna-ricettario")
    .addEventListener("click", () => window.location.hash = "#/ricettario");

  document.getElementById("r-output-search")
    .addEventListener("input", () => {
      if (!getVal("r-output-id")) document.getElementById("r-output-info").innerText = "Nessun prodotto output selezionato";
    });

  document.getElementById("r-output-id")
    .addEventListener("change", aggiornaOutputInfo);
}

function nextOrdineFase() {
  let max = 0;
  document.querySelectorAll("#fasi-container .fase-ordine").forEach(el => {
    const n = toIntOrNull(el.value);
    if (n && n > max) max = n;
  });
  return max + 1;
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
