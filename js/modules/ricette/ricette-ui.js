# js/modules/ricette/ricette-ui.js

```javascript
// ============================================================
// RICETTE UI - AI READY RESA PRODUZIONE
// ============================================================

const UNITA_RESA = [
  { value: "kg", label: "kg" },
  { value: "gr", label: "gr" },
  { value: "lt", label: "lt" },
  { value: "ml", label: "ml" },
  { value: "pz", label: "pz" }
];

export function renderLayout() {
  return `
    <div id="ricette-editor-root" style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;">
      <div id="col-left" style="flex:2; min-width:320px; display:flex; flex-direction:column; gap:16px;"></div>
      <div id="col-right" style="flex:1; min-width:320px; display:flex; flex-direction:column; gap:16px;"></div>
    </div>
  `;
}

// =========================
// ANAGRAFICA
// =========================

export function renderAnagrafica(ricetta) {
  return `
    <div class="card">
      <h3>Anagrafica</h3>

      <div class="form-grid">
        <div class="form-group">
          <label>Nome ricetta</label>
          <input id="r-nome" class="input" value="${ricetta.nome || ""}" />
        </div>

        <div class="form-group">
          <label>Pezzi base</label>
          <input id="r-pezzi" type="number" class="input" value="${ricetta.pezzi_base || ""}" />
        </div>

        <div class="form-group">
          <label>Resa produzione</label>

          <div style="display:flex; gap:8px; align-items:center;">
            <input
              id="r-resa"
              type="number"
              step="0.001"
              class="input"
              style="flex:1;"
              value="${ricetta.resa_quantita || ""}"
            />

            <select id="r-resa-um" class="input" style="width:110px;">
              ${UNITA_RESA.map(um => `
                <option
                  value="${um.value}"
                  ${ricetta.resa_um === um.value ? "selected" : ""}
                >
                  ${um.label}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="form-help">
            Produzione AI-ready con resa normalizzata multi-unità.
          </div>
        </div>
      </div>
    </div>
  `;
}

// =========================
// OUTPUT
// =========================

export function renderOutput(output, costi, ricetta) {
  return `
    <div class="card">
      <h3>Output produzione</h3>

      <div class="form-grid">
        <div class="form-group">
          <label>Numero porzioni</label>
          <input id="r-porzioni" type="number" class="input" value="${output.porzioni || ""}" />
        </div>

        <div class="form-group">
          <label>Peso/volume porzione</label>
          <input id="r-peso-porzione" type="number" step="0.001" class="input" value="${output.peso_porzione || ""}" />
        </div>
      </div>

      <div class="form-help">
        Resa totale: <strong>${format(ricetta.resa_quantita)} ${ricetta.resa_um || "kg"}</strong><br>
        Costo porzione: € <strong>${format(costi.costoPorzione)}</strong>
      </div>
    </div>
  `;
}

// =========================
// CONSERVAZIONE
// =========================

export function renderConservazioneScenari(lista) {
  return `
    <div class="card">
      <h3>Scenari conservazione</h3>

      ${lista.length === 0 ? `
        <div class="form-help">Nessuno scenario</div>
      ` : `
        ${lista.map((s, i) => `
          <div class="card menu-card" data-scenario-idx="${i}">
            <div class="form-grid">

              <input class="input" data-field="scenario_label"
                placeholder="Nome scenario"
                value="${s.scenario_label || ""}" />

              <input class="input" data-field="abbattimento"
                placeholder="Abbattimento"
                value="${s.abbattimento || ""}" />

              <input class="input" data-field="confezionamento"
                placeholder="Confezionamento"
                value="${s.confezionamento || ""}" />

              <input class="input" type="number" data-field="shelf_life_giorni"
                placeholder="Giorni"
                value="${s.shelf_life_giorni || ""}" />

            </div>

            <button class="app-button secondary" data-action="remove-scenario">
              Rimuovi
            </button>
          </div>
        `).join("")}
      `}

      <button id="btn-add-scenario" class="app-button secondary">
        + Scenario
      </button>
    </div>
  `;
}

// =========================
// COPRODOTTI
// =========================

export function renderCoprodotti(lista) {
  return `
    <div class="card">
      <h3>Coprodotti</h3>

      ${lista.map((c, i) => `
        <div class="form-grid" data-cp-idx="${i}">
          <input class="input" data-field="nome" value="${c.nome || ""}" placeholder="Nome" />
          <input class="input" type="number" data-field="peso" value="${c.peso || ""}" placeholder="Quantità" />
        </div>
      `).join("")}

      <button id="btn-add-cp" class="app-button secondary">+ Coprodotto</button>
    </div>
  `;
}

// =========================
// INGREDIENTI
// =========================

export function renderIngredienti(ingredienti, prodotti) {
  if (!ingredienti.length) {
    return `
      <div class="card">
        <h3>Ingredienti</h3>
        <div class="form-help">Nessun ingrediente</div>
        <button id="btn-add-ing" class="app-button secondary">+ Ingrediente</button>
      </div>
    `;
  }

  return `
    <div class="card">
      <h3>Ingredienti</h3>

      ${ingredienti.map((ing, idx) => `
        <div class="card menu-card" data-idx="${idx}">
          <div class="form-grid">

            <select class="input" data-field="prodotto_id">
              <option value="">Seleziona...</option>
              ${prodotti.map(p => `
                <option value="${p.id}" ${String(p.id) === String(ing.prodotto_id) ? "selected" : ""}>
                  ${p.descrizione}
                </option>
              `).join("")}
            </select>

            <input type="number" step="0.001" class="input"
              data-field="quantita"
              value="${ing.quantita || ""}" />

            <select class="input" data-field="unita_misura">
              <option value="kg" ${ing.unita_misura === "kg" ? "selected" : ""}>kg</option>
              <option value="gr" ${ing.unita_misura === "gr" ? "selected" : ""}>gr</option>
              <option value="lt" ${ing.unita_misura === "lt" ? "selected" : ""}>lt</option>
              <option value="ml" ${ing.unita_misura === "ml" ? "selected" : ""}>ml</option>
              <option value="pz" ${ing.unita_misura === "pz" ? "selected" : ""}>pz</option>
            </select>

          </div>

          <button class="app-button secondary" data-action="remove-ingrediente">Rimuovi</button>
        </div>
      `).join("")}

      <button id="btn-add-ing" class="app-button secondary">+ Ingrediente</button>
    </div>
  `;
}

// =========================
// FASI
// =========================

export function renderFasi(fasi) {
  if (!fasi.length) {
    return `
      <div class="card">
        <h3>Fasi</h3>
        <div class="form-help">Nessuna fase</div>
        <button id="btn-add-fase" class="app-button secondary">+ Fase</button>
      </div>
    `;
  }

  return `
    <div class="card">
      <h3>Fasi</h3>

      ${fasi.map((f, idx) => `
        <div class="card menu-card" data-fase-idx="${idx}">
          <div class="form-grid">

            <input type="number" class="input" data-field="durata_min" value="${f.durata_min || ""}" />
            <input type="number" class="input" data-field="lavoro_umano_min" value="${f.lavoro_umano_min || ""}" />
            <input type="number" step="0.1" class="input" data-field="potenza_kw" value="${f.potenza_kw || ""}" />

          </div>

          <button class="app-button secondary" data-action="remove-fase">Rimuovi</button>
        </div>
      `).join("")}

      <button id="btn-add-fase" class="app-button secondary">+ Fase</button>
    </div>
  `;
}

// =========================
// COSTI
// =========================

export function renderCosti(costi, ricetta) {
  return `
    <div class="card">
      <h3>Costi</h3>

      <div class="form-help">
        Materia: € ${format(costi.materia)}<br>
        Lavoro: € ${format(costi.lavoro)}<br>
        Energia: € ${format(costi.energia)}<br>
        <strong>Industriale: € ${format(costi.industriale)}</strong><br>
        Costo/${ricetta.resa_um || "kg"}: € ${format(costi.costoKg)}
      </div>
    </div>
  `;
}

export function renderAzioni() {
  return `
    <div class="form-actions">
      <button id="btn-save" class="app-button">💾 Salva ricetta</button>
      <div id="ricetta-save-result" class="form-help"></div>
    </div>
  `;
}

function format(n) {
  return Number(n || 0).toFixed(2);
}
```

---

# js/views/Bo/ricette-editor.js

```javascript
// ============================================================
// BO - RICETTE EDITOR AI READY
// ============================================================

import { createPageLayout } from "../../utils/pageLayout.js";

import {
  calcolaCostoRicettaCompleto
} from "../../modules/ricette/ricette-core.js";

import {
  renderLayout,
  renderAnagrafica,
  renderIngredienti,
  renderFasi,
  renderCosti,
  renderAzioni,
  renderOutput,
  renderConservazioneScenari,
  renderCoprodotti
} from "../../modules/ricette/ricette-ui.js";

let state = {
  azienda_id: null,
  sede_id: null,

  ricetta: {
    nome: "",
    tipo: "finita",
    pezzi_base: 0,
    resa_quantita: 0,
    resa_um: "kg",
    descrizione: ""
  },

  output: {
    porzioni: 0,
    peso_porzione: 0
  },

  scenari_conservazione: [],
  coprodotti: [],
  ingredienti: [],
  fasi: [],

  costi: {
    materia: 0,
    lavoro: 0,
    energia: 0,
    industriale: 0,
    costoKg: 0,
    costoPorzione: 0
  }
};

let prodottiCache = [];
let prodottiMap = new Map();
let isBound = false;

export async function render(app) {
  resetState();

  const ricettaId = window.routeParams?.id || null;

  state.azienda_id = window.state?.azienda?.id || null;
  state.sede_id = window.state?.sede?.id || window.state?.sedeAttiva?.id || null;

  app.innerHTML = createPageLayout({
    title: "BO Ricette",
    subtitle: "Editor ricette AI-ready",
    content: renderLayout()
  });

  await loadProdotti();

  renderAll();
  bindEvents();

  if (ricettaId) {
    await loadRicettaById(ricettaId);
    renderAll();
  }
}

function resetState() {
  state = {
    azienda_id: null,
    sede_id: null,

    ricetta: {
      nome: "",
      tipo: "finita",
      pezzi_base: 0,
      resa_quantita: 0,
      resa_um: "kg",
      descrizione: ""
    },

    output: {
      porzioni: 0,
      peso_porzione: 0
    },

    scenari_conservazione: [],
    coprodotti: [],
    ingredienti: [],
    fasi: [],

    costi: {
      materia: 0,
      lavoro: 0,
      energia: 0,
      industriale: 0,
      costoKg: 0,
      costoPorzione: 0
    }
  };
}

function renderAll() {
  const left = document.getElementById("col-left");
  const right = document.getElementById("col-right");

  if (!left || !right) return;

  ricalcolaCosti();

  left.innerHTML = `
    ${renderAnagrafica(state.ricetta)}
    ${renderIngredienti(state.ingredienti, prodottiCache)}
    ${renderFasi(state.fasi)}
    ${renderConservazioneScenari(state.scenari_conservazione)}
  `;

  right.innerHTML = `
    ${renderCosti(state.costi, state.ricetta)}
    ${renderOutput(state.output, state.costi, state.ricetta)}
    ${renderCoprodotti(state.coprodotti)}
    ${renderAzioni()}
  `;
}

async function loadProdotti() {
  const supabase = window.supabaseClient;

  prodottiCache = [];
  prodottiMap = new Map();

  if (!supabase || !state.azienda_id) return;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, descrizione, nome, costo_medio, um, unita_misura")
    .eq("azienda_id", state.azienda_id)
    .eq("attivo", true)
    .order("descrizione", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  prodottiCache = data || [];
  prodottiMap = new Map(prodottiCache.map(p => [String(p.id), p]));
}

function bindEvents() {
  if (isBound) return;
  isBound = true;

  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);
  document.addEventListener("click", onClick);
}

function onInput(e) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;

  if (t.id === "r-nome") {
    state.ricetta.nome = t.value || "";
  }

  if (t.id === "r-pezzi") {
    state.ricetta.pezzi_base = toNumber(t.value);
  }

  if (t.id === "r-resa") {
    state.ricetta.resa_quantita = toNumber(t.value);
    syncPesoPorzioneDaPorzioni();
    renderAll();
  }

  if (t.id === "r-peso-porzione") {
    state.output.peso_porzione = toNumber(t.value);
    syncPorzioniDaPesoPorzione();
    renderAll();
  }

  if (t.id === "r-porzioni") {
    state.output.porzioni = toNumber(t.value);
    syncPesoPorzioneDaPorzioni();
    renderAll();
  }
}

function onChange(e) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;

  if (t.id === "r-resa-um") {
    state.ricetta.resa_um = t.value || "kg";
    renderAll();
  }
}

function onClick(e) {
  const btn = e.target.closest("#btn-save");
  if (!btn) return;

  salvaRicetta();
}

function ricalcolaCosti() {
  const result = calcolaCostoRicettaCompleto({
    ingredienti: state.ingredienti,
    prodottiMap,
    fasi: state.fasi,
    resaKg: state.ricetta.resa_quantita
  });

  const costoPorzione = state.output.peso_porzione
    ? Number(result.costoKg || 0) * Number(state.output.peso_porzione || 0)
    : 0;

  state.costi = {
    ...result,
    costoPorzione
  };
}

function syncPesoPorzioneDaPorzioni() {
  if (!state.ricetta.resa_quantita || !state.output.porzioni) return;

  state.output.peso_porzione =
    state.ricetta.resa_quantita / state.output.porzioni;
}

function syncPorzioniDaPesoPorzione() {
  if (!state.ricetta.resa_quantita || !state.output.peso_porzione) return;

  state.output.porzioni = Math.floor(
    state.ricetta.resa_quantita / state.output.peso_porzione
  );
}

async function salvaRicetta() {
  const resultEl = document.getElementById("ricetta-save-result");
  const supabase = window.supabaseClient;

  try {
    if (!supabase) throw new Error("Supabase non inizializzato");
    if (!state.azienda_id) throw new Error("Azienda mancante");
    if (!state.ricetta.nome.trim()) throw new Error("Nome obbligatorio");
    if (!state.ricetta.resa_quantita) throw new Error("Resa obbligatoria");

    const { data: ricetta, error } = await supabase
      .from("ricette")
      .insert({
        azienda_id: state.azienda_id,
        sede_id: state.sede_id,
        nome: state.ricetta.nome,
        tipo: state.ricetta.tipo,
        resa_quantita: state.ricetta.resa_quantita,
        resa_um: state.ricetta.resa_um,
        pezzi_base: state.ricetta.pezzi_base,
        descrizione: state.ricetta.descrizione,
        costo_kg: state.costi.costoKg
      })
      .select()
      .single();

    if (error) throw error;

    setResult(resultEl, "✅ Ricetta salvata correttamente", false);

  } catch (err) {
    console.error(err);
    setResult(resultEl, "❌ " + err.message, true);
  }
}

async function loadRicettaById(id) {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  const { data, error } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  state.ricetta = {
    nome: data.nome || "",
    tipo: data.tipo || "finita",
    pezzi_base: data.pezzi_base || 0,
    resa_quantita: data.resa_quantita || 0,
    resa_um: data.resa_um || "kg",
    descrizione: data.descrizione || ""
  };
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function setResult(el, message, isError = false) {
  if (!el) return;

  el.innerHTML = message;
  el.style.color = isError ? "#dc2626" : "#16a34a";
}
```
