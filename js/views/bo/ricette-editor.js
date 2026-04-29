// ============================================================
// BO - RICETTE EDITOR (VERSIONE COMPLETA ESTESA)
// Orchestrazione + UI modulare + CORE
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

// =========================
// STATE
// =========================

let state = {
  azienda_id: null,
  sede_id: null,

  ricetta: {
    nome: "",
    tipo: "finita",
    pezzi_base: 0,
    resa_kg: 0,
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

// =========================
// RENDER
// =========================

export async function render(app) {
  resetState();

  state.azienda_id = window.state?.azienda?.id || window.state?.azienda_id || null;
  state.sede_id = window.state?.sede?.id || window.state?.sedeAttiva?.id || null;

  app.innerHTML = createPageLayout({
    title: "BO Ricette",
    subtitle: "Editor modulare desktop/iPad — ingredienti, fasi, output, porzioni, conservazione e coprodotti",
    content: renderLayout()
  });

  await loadProdotti();

  renderAll();
  bindEvents();
}

function resetState() {
  state = {
    azienda_id: null,
    sede_id: null,

    ricetta: {
      nome: "",
      tipo: "finita",
      pezzi_base: 0,
      resa_kg: 0,
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

// =========================
// RENDER FULL
// =========================

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
    ${renderCosti(state.costi)}
    ${renderOutput(state.output, state.costi)}
    ${renderCoprodotti(state.coprodotti, prodottiCache)}
    ${renderAzioni()}
  `;
}

// =========================
// DATA LOAD
// =========================

async function loadProdotti() {
  const supabase = window.supabaseClient;

  prodottiCache = [];
  prodottiMap = new Map();

  if (!supabase || !state.azienda_id) return;

  let query = supabase
    .from("prodotti")
    .select("id, descrizione, nome, costo_medio, um, unita_misura")
    .eq("azienda_id", state.azienda_id)
    .eq("attivo", true)
    .order("descrizione", { ascending: true });

  if (state.sede_id) {
    query = query.eq("sede_id", state.sede_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Errore loadProdotti:", error);
    prodottiCache = [];
    prodottiMap = new Map();
    return;
  }

  prodottiCache = data || [];
  prodottiMap = new Map(prodottiCache.map((p) => [String(p.id), p]));
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  if (isBound) return;
  isBound = true;

  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);
  document.addEventListener("click", onClick);
}

// =========================
// INPUT
// =========================

function onInput(e) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;

  if (handleRicettaInput(t)) return;
  if (handleOutputInput(t)) return;
  if (handleScenarioInput(t)) return;
  if (handlePassaggioInput(t)) return;
  if (handleCoprodottoInput(t)) return;
  if (handleFaseInput(t)) return;
  if (handleIngredienteInput(t)) return;
}

function handleRicettaInput(t) {
  if (t.id === "r-nome") {
    state.ricetta.nome = t.value || "";
    return false;
  }

  if (t.id === "r-pezzi") {
    state.ricetta.pezzi_base = toNumber(t.value);
    return false;
  }

  if (t.id === "r-resa") {
    state.ricetta.resa_kg = toNumber(t.value);
    syncPesoPorzioneDaPorzioni();
    renderAll();
    return true;
  }

  if (t.id === "r-descrizione") {
    state.ricetta.descrizione = t.value || "";
    return false;
  }

  return false;
}

function handleOutputInput(t) {
  if (t.id === "r-porzioni") {
    state.output.porzioni = toNumber(t.value);
    syncPesoPorzioneDaPorzioni();
    renderAll();
    return true;
  }

  if (t.id === "r-peso-porzione") {
    state.output.peso_porzione = toNumber(t.value);
    syncPorzioniDaPesoPorzione();
    renderAll();
    return true;
  }

  return false;
}

function handleIngredienteInput(t) {
  const card = t.closest("[data-idx]");
  if (!card) return false;

  const idx = Number(card.getAttribute("data-idx"));
  const field = t.getAttribute("data-field");

  if (!field || !state.ingredienti[idx]) return false;

  if (field === "quantita") {
    state.ingredienti[idx][field] = toNumber(t.value);
    renderAll();
    return true;
  }

  if (field === "note") {
    state.ingredienti[idx][field] = t.value || "";
    return true;
  }

  return false;
}

function handleFaseInput(t) {
  const card = t.closest("[data-fase-idx]");
  if (!card) return false;

  const idx = Number(card.getAttribute("data-fase-idx"));
  const field = t.getAttribute("data-field");

  if (!field || !state.fasi[idx]) return false;

  if (["durata_min", "lavoro_umano_min", "potenza_kw", "temperatura"].includes(field)) {
    state.fasi[idx][field] = toNumber(t.value);
    renderAll();
    return true;
  }

  state.fasi[idx][field] = t.value || "";
  return true;
}

function handleScenarioInput(t) {
  const card = t.closest("[data-scenario-idx]");
  if (!card) return false;

  const idx = Number(card.getAttribute("data-scenario-idx"));
  const field = t.getAttribute("data-field");

  if (!field || !state.scenari_conservazione[idx]) return false;

  if (field === "shelf_life_giorni") {
    state.scenari_conservazione[idx][field] = toNumber(t.value);
    return true;
  }

  state.scenari_conservazione[idx][field] = t.value || "";
  return true;
}

function handlePassaggioInput(t) {
  const card = t.closest("[data-passaggio-idx]");
  if (!card) return false;

  const scenarioIdx = Number(card.getAttribute("data-scenario-idx"));
  const passaggioIdx = Number(card.getAttribute("data-passaggio-idx"));
  const field = t.getAttribute("data-field");

  const scenario = state.scenari_conservazione[scenarioIdx];
  if (!scenario || !scenario.passaggi?.[passaggioIdx] || !field) return false;

  if (["temperatura_c", "durata_min"].includes(field)) {
    scenario.passaggi[passaggioIdx][field] = toNumber(t.value);
    return true;
  }

  scenario.passaggi[passaggioIdx][field] = t.value || "";
  return true;
}

function handleCoprodottoInput(t) {
  const card = t.closest("[data-cp-idx]");
  if (!card) return false;

  const idx = Number(card.getAttribute("data-cp-idx"));
  const field = t.getAttribute("data-field");

  if (!field || !state.coprodotti[idx]) return false;

  if (field === "peso") {
    state.coprodotti[idx][field] = toNumber(t.value);
    return true;
  }

  state.coprodotti[idx][field] = t.value || "";
  return true;
}

// =========================
// CHANGE
// =========================

function onChange(e) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;

  if (t.id === "r-tipo") {
    state.ricetta.tipo = t.value || "finita";
    return;
  }

  const ingCard = t.closest("[data-idx]");
  if (ingCard) {
    const idx = Number(ingCard.getAttribute("data-idx"));
    const field = t.getAttribute("data-field");

    if (!field || !state.ingredienti[idx]) return;

    state.ingredienti[idx][field] = t.value || "";

    if (field === "prodotto_id") {
      const prodotto = prodottiMap.get(String(t.value));
      if (prodotto?.um || prodotto?.unita_misura) {
        state.ingredienti[idx].unita_misura = String(prodotto.um || prodotto.unita_misura || "kg").toLowerCase();
      }
    }

    renderAll();
    return;
  }

  const faseCard = t.closest("[data-fase-idx]");
  if (faseCard) {
    const idx = Number(faseCard.getAttribute("data-fase-idx"));
    const field = t.getAttribute("data-field");

    if (!field || !state.fasi[idx]) return;

    state.fasi[idx][field] = t.value || "";
    renderAll();
    return;
  }

  const scenarioCard = t.closest("[data-scenario-idx]");
  if (scenarioCard && !t.closest("[data-passaggio-idx]")) {
    const idx = Number(scenarioCard.getAttribute("data-scenario-idx"));
    const field = t.getAttribute("data-field");

    if (!field || !state.scenari_conservazione[idx]) return;

    state.scenari_conservazione[idx][field] = t.value || "";
    renderAll();
    return;
  }

  const passaggioCard = t.closest("[data-passaggio-idx]");
  if (passaggioCard) {
    const scenarioIdx = Number(passaggioCard.getAttribute("data-scenario-idx"));
    const passaggioIdx = Number(passaggioCard.getAttribute("data-passaggio-idx"));
    const field = t.getAttribute("data-field");

    const scenario = state.scenari_conservazione[scenarioIdx];
    if (!scenario || !scenario.passaggi?.[passaggioIdx] || !field) return;

    scenario.passaggi[passaggioIdx][field] = t.value || "";
    renderAll();
    return;
  }

  const cpCard = t.closest("[data-cp-idx]");
  if (cpCard) {
    const idx = Number(cpCard.getAttribute("data-cp-idx"));
    const field = t.getAttribute("data-field");

    if (!field || !state.coprodotti[idx]) return;

    state.coprodotti[idx][field] = t.value || "";

    if (field === "prodotto_id") {
      const prodotto = prodottiMap.get(String(t.value));
      if (prodotto?.um || prodotto?.unita_misura) {
        state.coprodotti[idx].unita_misura = String(prodotto.um || prodotto.unita_misura || "kg").toLowerCase();
      }
    }

    renderAll();
  }
}

// =========================
// CLICK
// =========================

function onClick(e) {
  const btn = e.target.closest("[data-action], #btn-add-ing, #btn-add-fase, #btn-add-cp, #btn-add-scenario, #btn-save");
  if (!btn) return;

  if (btn.id === "btn-add-ing") {
    addIngrediente();
    return;
  }

  if (btn.dataset.action === "remove-ingrediente") {
    removeIngrediente(btn);
    return;
  }

  if (btn.id === "btn-add-fase") {
    addFase();
    return;
  }

  if (btn.dataset.action === "remove-fase") {
    removeFase(btn);
    return;
  }

  if (btn.id === "btn-add-scenario") {
    addScenarioConservazione();
    return;
  }

  if (btn.dataset.action === "remove-scenario") {
    removeScenario(btn);
    return;
  }

  if (btn.dataset.action === "add-passaggio") {
    addPassaggio(btn);
    return;
  }

  if (btn.dataset.action === "remove-passaggio") {
    removePassaggio(btn);
    return;
  }

  if (btn.id === "btn-add-cp") {
    addCoprodotto();
    return;
  }

  if (btn.dataset.action === "remove-cp") {
    removeCoprodotto(btn);
    return;
  }

  if (btn.id === "btn-save") {
    salvaRicetta();
  }
}

// =========================
// MUTATIONS
// =========================

function addIngrediente() {
  state.ingredienti.push({
    prodotto_id: "",
    quantita: 0,
    unita_misura: "kg",
    note: ""
  });

  renderAll();
}

function removeIngrediente(btn) {
  const card = btn.closest("[data-idx]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-idx"));
  state.ingredienti.splice(idx, 1);

  renderAll();
}

function addFase() {
  state.fasi.push({
    titolo: "",
    descrizione_operativa: "",
    durata_min: 0,
    lavoro_umano_min: 0,
    potenza_kw: 0,
    temperatura: ""
  });

  renderAll();
}

function removeFase(btn) {
  const card = btn.closest("[data-fase-idx]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-fase-idx"));
  state.fasi.splice(idx, 1);

  renderAll();
}

function addScenarioConservazione() {
  state.scenari_conservazione.push({
    scenario_label: "",
    abbattimento: "",
    confezionamento: "",
    shelf_life_giorni: 0,
    temperatura: "",
    trattamento: "",
    note: "",
    attivo: true,
    passaggi: []
  });

  renderAll();
}

function removeScenario(btn) {
  const card = btn.closest("[data-scenario-idx]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-scenario-idx"));
  state.scenari_conservazione.splice(idx, 1);

  renderAll();
}

function addPassaggio(btn) {
  const card = btn.closest("[data-scenario-idx]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-scenario-idx"));
  const scenario = state.scenari_conservazione[idx];

  if (!scenario) return;
  if (!Array.isArray(scenario.passaggi)) scenario.passaggi = [];

  scenario.passaggi.push({
    posizione: scenario.passaggi.length + 1,
    gruppo_alternativa: null,
    titolo: "",
    tipo_passaggio: "abbattimento",
    attrezzatura: "",
    temperatura_c: "",
    durata_min: 0,
    descrizione_operativa: "",
    note: "",
    parametri: {}
  });

  renderAll();
}

function removePassaggio(btn) {
  const card = btn.closest("[data-passaggio-idx]");
  if (!card) return;

  const scenarioIdx = Number(card.getAttribute("data-scenario-idx"));
  const passaggioIdx = Number(card.getAttribute("data-passaggio-idx"));

  const scenario = state.scenari_conservazione[scenarioIdx];
  if (!scenario || !Array.isArray(scenario.passaggi)) return;

  scenario.passaggi.splice(passaggioIdx, 1);
  scenario.passaggi = scenario.passaggi.map((p, idx) => ({
    ...p,
    posizione: idx + 1
  }));

  renderAll();
}

function addCoprodotto() {
  state.coprodotti.push({
    prodotto_id: "",
    peso: 0,
    unita_misura: "kg"
  });

  renderAll();
}

function removeCoprodotto(btn) {
  const card = btn.closest("[data-cp-idx]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-cp-idx"));
  state.coprodotti.splice(idx, 1);

  renderAll();
}

// =========================
// CALCOLI
// =========================

function ricalcolaCosti() {
  const result = calcolaCostoRicettaCompleto({
    ingredienti: state.ingredienti,
    prodottiMap,
    fasi: state.fasi,
    resaKg: state.ricetta.resa_kg
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
  if (!state.ricetta.resa_kg || !state.output.porzioni) return;
  state.output.peso_porzione = state.ricetta.resa_kg / state.output.porzioni;
}

function syncPorzioniDaPesoPorzione() {
  if (!state.ricetta.resa_kg || !state.output.peso_porzione) return;
  state.output.porzioni = Math.floor(state.ricetta.resa_kg / state.output.peso_porzione);
}

// =========================
// SAVE
// =========================

async function salvaRicetta() {
  const resultEl = document.getElementById("ricetta-save-result");
  const supabase = window.supabaseClient;

  if (!supabase) {
    setResult(resultEl, "Errore: Supabase non inizializzato", true);
    return;
  }

  if (!state.azienda_id) {
    setResult(resultEl, "Errore: azienda non trovata", true);
    return;
  }

  if (!state.ricetta.nome.trim()) {
    setResult(resultEl, "Inserisci il nome della ricetta", true);
    return;
  }

  if (!state.ricetta.resa_kg) {
    setResult(resultEl, "Inserisci la resa totale in kg", true);
    return;
  }

  const payload = buildPayload();

  console.log("SAVE RICETTA BO:", payload);
  setResult(resultEl, "Anteprima salvataggio pronta in console. Prossimo step: insert/update DB completo.", false);
}

function buildPayload() {
  return {
    azienda_id: state.azienda_id,
    sede_id: state.sede_id,

    ricetta: {
      ...state.ricetta,
      costo_materia_snapshot: state.costi.materia,
      costo_lavoro_snapshot: state.costi.lavoro,
      costo_energia_snapshot: state.costi.energia,
      costo_industriale_snapshot: state.costi.industriale,
      costo_kg_snapshot: state.costi.costoKg,
      ultimo_ricalcolo: new Date().toISOString()
    },

    ingredienti: state.ingredienti.map((ing, idx) => ({
      ...ing,
      ordine: idx + 1,
      azienda_id: state.azienda_id
    })),

    fasi: state.fasi.map((fase, idx) => ({
      ...fase,
      ordine: idx + 1,
      azienda_id: state.azienda_id
    })),

    output: {
      azienda_id: state.azienda_id,
      peso_finale: state.ricetta.resa_kg,
      unita_misura: "kg"
    },

    porzione: {
      azienda_id: state.azienda_id,
      label: "Porzione standard",
      peso_porzione: state.output.peso_porzione,
      unita_misura: "kg",
      attivo: true
    },

    conservazione: state.scenari_conservazione.map((scenario) => ({
      azienda_id: state.azienda_id,
      scenario_label: scenario.scenario_label,
      abbattimento: scenario.abbattimento,
      confezionamento: scenario.confezionamento,
      shelf_life_giorni: scenario.shelf_life_giorni,
      trattamento: scenario.trattamento,
      temperatura: scenario.temperatura,
      note: scenario.note,
      attivo: scenario.attivo !== false,
      passaggi: (scenario.passaggi || []).map((p, idx) => ({
        ...p,
        azienda_id: state.azienda_id,
        posizione: idx + 1
      }))
    })),

    coprodotti: state.coprodotti.map((cp) => ({
      ...cp,
      azienda_id: state.azienda_id
    }))
  };
}

// =========================
// UTILS
// =========================

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function setResult(el, message, isError = false) {
  if (!el) return;
  el.innerHTML = message;
  el.style.color = isError ? "#dc2626" : "#16a34a";
}
