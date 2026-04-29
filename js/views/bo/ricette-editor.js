// ============================================================
// BO - RICETTE EDITOR (VERSIONE BASE MODULARE)
// Multi-azienda + predisposizione multi-sede
// ============================================================

import { createPageLayout, createCard } from "../../utils/pageLayout.js";
import {
  calcolaCostoRicettaCompleto
} from "../../modules/ricette/ricette-core.js";

// =========================
// STATE LOCALE
// =========================

let prodottiCache = [];
let prodottiMap = new Map();

let ingredienti = [];
let fasi = [];

// =========================
// RENDER
// =========================

export async function render(app) {
  app.innerHTML = createPageLayout({
    title: "BO Ricette",
    subtitle: "Editor modulare ricette (AI-ready)",
    content: `
      ${createCard({
        title: "Anagrafica",
        body: `
          <div class="form-grid">
            <div class="form-group">
              <label>Nome ricetta</label>
              <input id="r-nome" class="input" />
            </div>

            <div class="form-group">
              <label>Pezzi base</label>
              <input id="r-pezzi" type="number" class="input" />
            </div>
          </div>
        `
      })}

      ${createCard({
        title: "Ingredienti",
        body: `
          <div id="ingredienti-container"></div>

          <div class="form-actions">
            <button id="btn-add-ing" class="app-button secondary">
              + Ingrediente
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Output",
        body: `
          <div class="form-grid">
            <div class="form-group">
              <label>Peso finale (kg)</label>
              <input id="r-output-peso" type="number" step="0.001" class="input" />
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <div id="r-cost-preview" class="small-muted">
                Costi: —
              </div>
            </div>
          </div>
        `
      })}
    `
  });

  await loadProdotti();
  bindEvents();
  renderIngredienti();
}

// =========================
// DATA LOAD (AZIENDA + SEDE)
// =========================

async function loadProdotti() {
  const supabase = window.supabaseClient;

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sede?.id || null;

  if (!supabase || !aziendaId) return;

  let query = supabase
    .from("prodotti")
    .select("id, descrizione, costo_medio, um")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("descrizione");

  // se esiste sede_id nel DB, attivalo
  if (sedeId) {
    query = query.eq("sede_id", sedeId);
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
// INGREDIENTI UI
// =========================

function renderIngredienti() {
  const container = document.getElementById("ingredienti-container");
  if (!container) return;

  if (!ingredienti.length) {
    container.innerHTML = `<div class="form-help">Nessun ingrediente</div>`;
    return;
  }

  container.innerHTML = ingredienti.map((ing, idx) => {
    return `
      <div class="card menu-card" data-idx="${idx}">
        <div class="form-grid">

          <div class="form-group">
            <label>Prodotto</label>
            <select class="input" data-field="prodotto_id">
              <option value="">Seleziona...</option>
              ${prodottiCache.map(p => `
                <option value="${p.id}" ${String(p.id) === String(ing.prodotto_id) ? "selected" : ""}>
                  ${p.descrizione}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Quantità</label>
            <input type="number" step="0.001" class="input"
              data-field="quantita"
              value="${ing.quantita || ""}" />
          </div>

          <div class="form-group">
            <label>UM</label>
            <select class="input" data-field="unita_misura">
              <option value="kg" ${ing.unita_misura === "kg" ? "selected" : ""}>kg</option>
              <option value="g" ${ing.unita_misura === "g" ? "selected" : ""}>g</option>
              <option value="pz" ${ing.unita_misura === "pz" ? "selected" : ""}>pz</option>
            </select>
          </div>

        </div>

        <div class="form-actions">
          <button class="app-button secondary" data-action="remove">
            Rimuovi
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  document.getElementById("btn-add-ing")?.addEventListener("click", () => {
    ingredienti.push({
      prodotto_id: "",
      quantita: "",
      unita_misura: "kg"
    });

    renderIngredienti();
  });

  document.addEventListener("change", onChange);
  document.addEventListener("click", onClick);
}

function onChange(e) {
  const target = e.target;
  const card = target.closest("[data-idx]");
  if (!card) return;

  const idx = Number(card.dataset.idx);
  const field = target.getAttribute("data-field");
  if (!field) return;

  ingredienti[idx][field] = target.value;

  aggiornaCosti();
}

function onClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const card = btn.closest("[data-idx]");
  if (!card) return;

  const idx = Number(card.dataset.idx);

  if (btn.dataset.action === "remove") {
    ingredienti.splice(idx, 1);
    renderIngredienti();
    aggiornaCosti();
  }
}

// =========================
// CALCOLO COSTI (CORE)
// =========================

function aggiornaCosti() {
  const resaKg = Number(document.getElementById("r-output-peso")?.value || 0);

  const result = calcolaCostoRicettaCompleto({
    ingredienti,
    prodottiMap,
    fasi,
    resaKg
  });

  const el = document.getElementById("r-cost-preview");
  if (!el) return;

  el.innerHTML = `
    Materia: € ${result.materia.toFixed(2)}<br>
    Lavoro: € ${result.lavoro.toFixed(2)}<br>
    Energia: € ${result.energia.toFixed(2)}<br>
    <strong>Industriale: € ${result.industriale.toFixed(2)}</strong><br>
    Costo/kg: € ${result.costoKg.toFixed(2)}
  `;
}
