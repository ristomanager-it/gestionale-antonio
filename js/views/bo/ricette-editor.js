// ============================================================
// BO - RICETTE EDITOR (VERSIONE DEFINITIVA)
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
  renderAzioni
} from "../../modules/ricette/ricette-ui.js";

// =========================
// STATE
// =========================

let state = {
  azienda_id: null,
  sede_id: null,

  ricetta: {
    nome: "",
    pezzi_base: 0,
    resa_kg: 0
  },

  ingredienti: [],
  fasi: [],

  costi: {
    materia: 0,
    lavoro: 0,
    energia: 0,
    industriale: 0,
    costoKg: 0
  }
};

let prodottiCache = [];
let prodottiMap = new Map();

// =========================
// RENDER
// =========================

export async function render(app) {
  state.azienda_id = window.state?.azienda?.id || null;
  state.sede_id = window.state?.sede?.id || null;

  app.innerHTML = createPageLayout({
    title: "BO Ricette",
    subtitle: "Editor modulare (AI-ready)",
    content: renderLayout()
  });

  await loadProdotti();

  renderAll();
  bindEvents();
}

// =========================
// RENDER FULL
// =========================

function renderAll() {
  const root = document.getElementById("ricette-editor-root");
  if (!root) return;

  ricalcolaCosti();

  root.innerHTML = `
    ${renderAnagrafica(state.ricetta)}
    ${renderIngredienti(state.ingredienti, prodottiCache)}
    ${renderFasi(state.fasi)}
    ${renderCosti(state.costi)}
    ${renderAzioni()}
  `;
}

// =========================
// DATA LOAD
// =========================

async function loadProdotti() {
  const supabase = window.supabaseClient;

  if (!supabase || !state.azienda_id) return;

  let query = supabase
    .from("prodotti")
    .select("id, descrizione, costo_medio, um")
    .eq("azienda_id", state.azienda_id)
    .eq("attivo", true)
    .order("descrizione");

  if (state.sede_id) {
    query = query.eq("sede_id", state.sede_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    prodottiCache = [];
    prodottiMap = new Map();
    return;
  }

  prodottiCache = data || [];
  prodottiMap = new Map(prodottiCache.map(p => [String(p.id), p]));
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);
  document.addEventListener("click", onClick);
}

// =========================
// INPUT (ANAGRAFICA)
// =========================

function onInput(e) {
  const t = e.target;

  if (t.id === "r-nome") {
    state.ricetta.nome = t.value;
  }

  if (t.id === "r-pezzi") {
    state.ricetta.pezzi_base = Number(t.value || 0);
  }

  if (t.id === "r-resa") {
    state.ricetta.resa_kg = Number(t.value || 0);
    renderAll();
  }
}

// =========================
// CHANGE (INGREDIENTI / FASI)
// =========================

function onChange(e) {
  const t = e.target;

  // INGREDIENTI
  const ingCard = t.closest("[data-idx]");
  if (ingCard) {
    const idx = Number(ingCard.dataset.idx);
    const field = t.getAttribute("data-field");

    if (!state.ingredienti[idx]) return;

    state.ingredienti[idx][field] = t.value;

    renderAll();
    return;
  }

  // FASI
  const faseCard = t.closest("[data-fase-idx]");
  if (faseCard) {
    const idx = Number(faseCard.dataset.faseIdx);
    const field = t.getAttribute("data-field");

    if (!state.fasi[idx]) return;

    state.fasi[idx][field] = Number(t.value || 0);

    renderAll();
    return;
  }
}

// =========================
// CLICK
// =========================

function onClick(e) {
  const btn = e.target.closest("[data-action], #btn-add-ing, #btn-add-fase, #btn-save");
  if (!btn) return;

  // ADD INGREDIENTE
  if (btn.id === "btn-add-ing") {
    state.ingredienti.push({
      prodotto_id: "",
      quantita: 0,
      unita_misura: "kg"
    });

    renderAll();
    return;
  }

  // REMOVE INGREDIENTE
  if (btn.dataset.action === "remove") {
    const card = btn.closest("[data-idx]");
    if (!card) return;

    const idx = Number(card.dataset.idx);
    state.ingredienti.splice(idx, 1);

    renderAll();
    return;
  }

  // ADD FASE
  if (btn.id === "btn-add-fase") {
    state.fasi.push({
      durata_min: 0,
      lavoro_umano_min: 0,
      potenza_kw: 0
    });

    renderAll();
    return;
  }

  // REMOVE FASE
  if (btn.dataset.action === "remove-fase") {
    const card = btn.closest("[data-fase-idx]");
    if (!card) return;

    const idx = Number(card.dataset.faseIdx);
    state.fasi.splice(idx, 1);

    renderAll();
    return;
  }

  // SAVE (placeholder)
  if (btn.id === "btn-save") {
    salvaRicetta();
  }
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

  state.costi = result;
}

// =========================
// SAVE
// =========================

async function salvaRicetta() {
  const supabase = window.supabaseClient;

  if (!supabase) return;

  const payload = {
    azienda_id: state.azienda_id,
    nome: state.ricetta.nome,
    pezzi_base: state.ricetta.pezzi_base,

    costo_materia_snapshot: state.costi.materia,
    costo_lavoro_snapshot: state.costi.lavoro,
    costo_energia_snapshot: state.costi.energia,
    costo_industriale_snapshot: state.costi.industriale,
    costo_kg_snapshot: state.costi.costoKg,
    ultimo_ricalcolo: new Date().toISOString()
  };

  console.log("SALVATAGGIO (preview):", payload);
}
