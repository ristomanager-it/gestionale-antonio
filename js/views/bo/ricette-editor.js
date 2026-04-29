// ============================================================
// BO - RICETTE EDITOR (VERSIONE COMPLETA ESTESA)
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
  renderConservazione,
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
    pezzi_base: 0,
    resa_kg: 0
  },

  output: {
    porzioni: 0,
    peso_porzione: 0
  },

  conservazione: {
    giorni: 0,
    tipo: ""
  },

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
// RENDER FULL (DESKTOP)
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
  `;

  right.innerHTML = `
    ${renderCosti(state.costi)}
    ${renderOutput(state.output, state.costi)}
    ${renderConservazione(state.conservazione)}
    ${renderCoprodotti(state.coprodotti)}
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
// INPUT
// =========================

function onInput(e) {
  const t = e.target;

  if (t.id === "r-nome") state.ricetta.nome = t.value;
  if (t.id === "r-pezzi") state.ricetta.pezzi_base = Number(t.value || 0);

  if (t.id === "r-resa") {
    state.ricetta.resa_kg = Number(t.value || 0);
  }

  if (t.id === "r-porzioni") {
    state.output.porzioni = Number(t.value || 0);

    if (state.ricetta.resa_kg) {
      state.output.peso_porzione =
        state.ricetta.resa_kg / state.output.porzioni;
    }
  }

  if (t.id === "r-peso-porzione") {
    state.output.peso_porzione = Number(t.value || 0);
  }

  if (t.id === "c-giorni") {
    state.conservazione.giorni = Number(t.value || 0);
  }

  renderAll();
}

// =========================
// CHANGE
// =========================

function onChange(e) {
  const t = e.target;

  // ingredienti
  const ingCard = t.closest("[data-idx]");
  if (ingCard) {
    const idx = Number(ingCard.dataset.idx);
    const field = t.getAttribute("data-field");

    state.ingredienti[idx][field] = t.value;
    renderAll();
    return;
  }

  // fasi
  const faseCard = t.closest("[data-fase-idx]");
  if (faseCard) {
    const idx = Number(faseCard.dataset.faseIdx);
    const field = t.getAttribute("data-field");

    state.fasi[idx][field] = Number(t.value || 0);
    renderAll();
    return;
  }

  if (t.id === "c-tipo") {
    state.conservazione.tipo = t.value;
    renderAll();
  }
}

// =========================
// CLICK
// =========================

function onClick(e) {
  const btn = e.target.closest("[data-action], #btn-add-ing, #btn-add-fase, #btn-add-cp, #btn-save");
  if (!btn) return;

  if (btn.id === "btn-add-ing") {
    state.ingredienti.push({ prodotto_id: "", quantita: 0, unita_misura: "kg" });
    renderAll();
    return;
  }

  if (btn.dataset.action === "remove") {
    const idx = Number(btn.closest("[data-idx]").dataset.idx);
    state.ingredienti.splice(idx, 1);
    renderAll();
    return;
  }

  if (btn.id === "btn-add-fase") {
    state.fasi.push({ durata_min: 0, lavoro_umano_min: 0, potenza_kw: 0 });
    renderAll();
    return;
  }

  if (btn.dataset.action === "remove-fase") {
    const idx = Number(btn.closest("[data-fase-idx]").dataset.faseIdx);
    state.fasi.splice(idx, 1);
    renderAll();
    return;
  }

  if (btn.id === "btn-add-cp") {
    state.coprodotti.push({ nome: "", quantita: 0 });
    renderAll();
    return;
  }

  if (btn.id === "btn-save") {
    salvaRicetta();
  }
}

// =========================
// CALCOLI
// =========================

function ricalcolaCosti() {
  const res = calcolaCostoRicettaCompleto({
    ingredienti: state.ingredienti,
    prodottiMap,
    fasi: state.fasi,
    resaKg: state.ricetta.resa_kg
  });

  const peso = state.output.peso_porzione || 0;
  const costoPorzione = peso ? res.costoKg * peso : 0;

  state.costi = { ...res, costoPorzione };
}

// =========================
// SAVE
// =========================

async function salvaRicetta() {
  console.log("SAVE", state);
}
