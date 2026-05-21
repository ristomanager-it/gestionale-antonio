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

// =========================
// RENDER
// =========================

export async function render(app) {
  resetState();

  const ricettaId = window.routeParams?.id || null;

  state.azienda_id = window.state?.azienda?.id || null;

  state.sede_id =
    window.state?.sede?.id ||
    window.state?.sedeAttiva?.id ||
    null;

  app.innerHTML = createPageLayout({
    title: "BO Ricette",
    subtitle: "Editor ricette AI-ready",
    content: renderLayout()
  });

  await loadProdotti();

  renderAll();
  bindEvents();

  if (ricettaId) {
    try {
      await loadRicettaById(ricettaId);
      renderAll();
    } catch (err) {
      console.error("Errore apertura ricetta:", err);
    }
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
    ${renderCosti(state.costi, state.ricetta)}
    ${renderOutput(state.output, state.costi, state.ricetta)}
    ${renderCoprodotti(state.coprodotti)}
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

  prodottiMap = new Map(
    prodottiCache.map((p) => [String(p.id), p])
  );
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
    state.ricetta.resa_quantita = toNumber(t.value);

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

  if (
    ["durata_min", "lavoro_umano_min", "potenza_kw", "temperatura"]
      .includes(field)
  ) {
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
    state.scenari_conservazione[idx][field] =
      toNumber(t.value);

    return true;
  }

  state.scenari_conservazione[idx][field] =
    t.value || "";

  return true;
}

function handlePassaggioInput(t) {
  const card = t.closest("[data-passaggio-idx]");

  if (!card) return false;

  const scenarioIdx = Number(
    card.getAttribute("data-scenario-idx")
  );

  const passaggioIdx = Number(
    card.getAttribute("data-passaggio-idx")
  );

  const field = t.getAttribute("data-field");

  const scenario =
    state.scenari_conservazione[scenarioIdx];

  if (
    !scenario ||
    !scenario.passaggi?.[passaggioIdx] ||
    !field
  ) {
    return false;
  }

  if (
    ["temperatura_c", "durata_min"].includes(field)
  ) {
    scenario.passaggi[passaggioIdx][field] =
      toNumber(t.value);

    return true;
  }

  scenario.passaggi[passaggioIdx][field] =
    t.value || "";

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

  if (t.id === "r-resa-um") {
    state.ricetta.resa_um = t.value || "kg";

    renderAll();

    return;
  }

  const ingCard = t.closest("[data-idx]");

  if (ingCard) {
    const idx = Number(
      ingCard.getAttribute("data-idx")
    );

    const field = t.getAttribute("data-field");

    if (!field || !state.ingredienti[idx]) return;

    state.ingredienti[idx][field] = t.value || "";

    if (field === "prodotto_id") {
      const prodotto = prodottiMap.get(String(t.value));

      if (prodotto?.um || prodotto?.unita_misura) {
        state.ingredienti[idx].unita_misura =
          String(
            prodotto.um ||
            prodotto.unita_misura ||
            "kg"
          ).toLowerCase();
      }
    }

    renderAll();

    return;
  }
}

// =========================
// CLICK
// =========================

function onClick(e) {
  const btn = e.target.closest(
    "[data-action], #btn-add-ing, #btn-save"
  );

  if (!btn) return;

  if (btn.id === "btn-add-ing") {
    addIngrediente();
    return;
  }

  if (btn.dataset.action === "remove-ingrediente") {
    removeIngrediente(btn);
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

// =========================
// CALCOLI
// =========================

function ricalcolaCosti() {
  const result = calcolaCostoRicettaCompleto({
    ingredienti: state.ingredienti,
    prodottiMap,
    fasi: state.fasi,
    resaKg: state.ricetta.resa_quantita
  });

  const costoPorzione =
    state.output.peso_porzione
      ? Number(result.costoKg || 0) *
        Number(state.output.peso_porzione || 0)
      : 0;

  state.costi = {
    ...result,
    costoPorzione
  };
}

function syncPesoPorzioneDaPorzioni() {
  if (
    !state.ricetta.resa_quantita ||
    !state.output.porzioni
  ) {
    return;
  }

  state.output.peso_porzione =
    state.ricetta.resa_quantita /
    state.output.porzioni;
}

function syncPorzioniDaPesoPorzione() {
  if (
    !state.ricetta.resa_quantita ||
    !state.output.peso_porzione
  ) {
    return;
  }

  state.output.porzioni = Math.floor(
    state.ricetta.resa_quantita /
    state.output.peso_porzione
  );
}

// =========================
// SAVE
// =========================

async function salvaRicetta() {
  const resultEl =
    document.getElementById("ricetta-save-result");

  const supabase = window.supabaseClient;

  try {
    if (!supabase) {
      throw new Error("Supabase non inizializzato");
    }

    if (!state.azienda_id) {
      throw new Error("Azienda mancante");
    }

    if (!state.ricetta.nome.trim()) {
      throw new Error("Nome ricetta obbligatorio");
    }

    if (!state.ricetta.resa_quantita) {
      throw new Error("Resa obbligatoria");
    }

    const { data: ricetta, error: errRicetta } =
      await supabase
        .from("ricette")
        .insert({
          azienda_id: state.azienda_id,
          sede_id: state.sede_id,

          nome: state.ricetta.nome,
          tipo: state.ricetta.tipo,

          resa_quantita:
            state.ricetta.resa_quantita,

          resa_um:
            state.ricetta.resa_um,

          pezzi_base:
            state.ricetta.pezzi_base,

          descrizione:
            state.ricetta.descrizione,

          costo_kg:
            state.costi.costoKg
        })
        .select()
        .single();

    if (errRicetta) throw errRicetta;

    const ricetta_id = ricetta.id;

    if (state.ingredienti.length) {
      const payload = state.ingredienti.map(
        (i, idx) => ({
          azienda_id: state.azienda_id,
          ricetta_id,

          prodotto_id: i.prodotto_id,

          quantita: i.quantita,

          unita_misura:
            i.unita_misura,

          ordine: idx + 1
        })
      );

      const { error } = await supabase
        .from("ricette_ingredienti")
        .insert(payload);

      if (error) throw error;
    }

    await supabase
      .from("ricette_output")
      .insert({
        azienda_id: state.azienda_id,
        ricetta_id,

        peso_totale:
          state.ricetta.resa_quantita
      });

    await supabase
      .from("ricette_porzione")
      .insert({
        azienda_id: state.azienda_id,
        ricetta_id,

        peso_porzione:
          state.output.peso_porzione
      });

    setResult(
      resultEl,
      "✅ Ricetta salvata correttamente",
      false
    );

  } catch (err) {
    console.error(err);

    setResult(
      resultEl,
      "❌ Errore salvataggio: " + err.message,
      true
    );
  }
}

// =========================
// LOAD RICETTA
// =========================

async function loadRicettaById(id) {
  const supabase = window.supabaseClient;

  if (!supabase || !id) return;

  try {
    const { data: ricetta, error } =
      await supabase
        .from("ricette")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;

    state.ricetta = {
      nome: ricetta.nome || "",
      tipo: ricetta.tipo || "finita",

      pezzi_base:
        ricetta.pezzi_base || 0,

      resa_quantita:
        ricetta.resa_quantita || 0,

      resa_um:
        ricetta.resa_um || "kg",

      descrizione:
        ricetta.descrizione || ""
    };

    const { data: ingredienti } =
      await supabase
        .from("ricette_ingredienti")
        .select("*")
        .eq("ricetta_id", id)
        .order("ordine");

    state.ingredienti = ingredienti || [];

    const { data: fasi } =
      await supabase
        .from("ricette_preparazione_fasi")
        .select("*")
        .eq("ricetta_id", id)
        .order("ordine");

    state.fasi = fasi || [];

    const { data: scenari } =
      await supabase
        .from("ricette_conservazione")
        .select("*")
        .eq("ricetta_id", id);

    state.scenari_conservazione =
      scenari || [];

  } catch (err) {
    console.error(
      "Errore load ricetta:",
      err
    );
  }
}

// =========================
// UTILS
// =========================

function toNumber(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

function setResult(
  el,
  message,
  isError = false
) {
  if (!el) return;

  el.innerHTML = message;

  el.style.color =
    isError
      ? "#dc2626"
      : "#16a34a";
}
