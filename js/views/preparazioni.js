// FILE: js/pages/preparazioni.js
import { createPageLayout, createCard } from "../utils/pageLayout.js";

/*
  PRODUZIONE (nuovo flusso)
  - Tabella principale: produzione_lotti (bigserial id, codice_lotto trigger)
  - Righe: schede_produzione_righe (1 riga per porzione + righe coprodotti)
  - Magazzino: magazzino_movimenti (scarico ingredienti + carichi output + carichi coprodotti)
  - HACCP: produzione_eventi_log (opzionale, best-effort)

  NOTE SCHEMA (necessario):
  - schede_produzione_righe deve puntare a produzione_lotti:
      produzione_id BIGINT FK produzione_lotti(id)
  - per coprodotti in schede_produzione_righe serve:
      prodotto_id BIGINT NULL FK prodotti(id)
  - dipendenti deve avere un campo PIN (pin) oppure usiamo fallback su codice
  - ricette_conservazione: (opz) fasi_operativo TEXT
*/

let ricetteCache = [];
let ricettaSelezionata = null;

let porzioniCache = [];
let dipendentiCache = [];
let prodottiCache = [];
let scenariConservazione = [];

let operatoreRisolto = null;

let porzioniRows = []; // [{ porzione_id, label, peso_porzione, unita_misura, quantita_pz, note }]
let coprodottiRows = []; // [{ id, prodotto_id, quantita, unita_misura, data_scadenza, note }]

let savedLotto = null; // record produzione_lotti
let savedRighe = []; // righe inserite

export async function render(container) {
  ricetteCache = [];
  ricettaSelezionata = null;

  porzioniCache = [];
  dipendentiCache = [];
  prodottiCache = [];
  scenariConservazione = [];

  operatoreRisolto = null;

  porzioniRows = [];
  coprodottiRows = [];

  savedLotto = null;
  savedRighe = [];

  container.innerHTML = createPageLayout({
    title: "Produzione",
    subtitle: "Peso reale, porzioni reali, coprodotti, controllo resa, firma operatore e magazzino (HACCP-ready)",
    content: `
      <div class="form-actions" style="margin-bottom:16px;">
        <button type="button" id="btn-back" class="app-button secondary">← Centro Produzione</button>
      </div>

      ${createCard({
        title: "Ricetta",
        body: `
          <div class="form-group" style="position:relative;">
            <label>Ricetta</label>
            <input id="prod-ricetta-search" class="input" placeholder="Cerca ricetta..." autocomplete="off" ${savedLotto ? "disabled" : ""} />
            <input id="prod-ricetta-id" type="hidden" />
            <div id="prod-ricetta-suggest" class="suggest-list"></div>
            <div id="prod-ricetta-info" class="form-help" style="margin-top:10px;">Nessuna ricetta selezionata</div>
          </div>

          <div class="form-actions">
            <button type="button" id="btn-vedi-ricetta" class="app-button secondary" disabled>👁 Vedi ricetta</button>
          </div>
        `
      })}

      ${createCard({
        title: "Dati Produzione",
        body: `
          <div class="form-grid">

            <div class="form-group">
              <label>Data produzione</label>
              <input id="prod-data" type="date" class="input" />
            </div>

            <div class="form-group">
              <label>Lotto</label>
              <input id="prod-lotto" class="input" readonly placeholder="Generato al salvataggio" />
              <div class="form-help">Lotto unico per azienda. Dopo salvataggio non modificabile.</div>
            </div>

            <div class="form-group">
              <label>PIN operatore</label>
              <input id="prod-operatore-pin" type="password" inputmode="numeric" class="input" placeholder="Inserisci PIN..." ${savedLotto ? "disabled" : ""} />
              <div id="prod-operatore-info" class="form-help">Nessun operatore identificato</div>
            </div>

            <div class="form-group">
              <label>Note lotto / destinatario</label>
              <input id="prod-note-lotto" class="input" placeholder="Es: Battesimo Lucia" ${savedLotto ? "disabled" : ""} />
              <div class="form-help">Questa nota apparirà anche in stampa.</div>
            </div>

          </div>
        `
      })}

      ${createCard({
        title: "Conservazione",
        body: `
          <div class="form-grid">

            <div class="form-group">
              <label>Scenario</label>
              <select id="prod-conservazione" class="input" ${savedLotto ? "disabled" : ""}>
                <option value="">Seleziona...</option>
              </select>
            </div>

            <div class="form-group">
              <label>Scadenza (automatica)</label>
              <input id="prod-scadenza" type="date" class="input" readonly />
            </div>

            <div class="form-group">
              <label>Temperatura</label>
              <input id="prod-temp" class="input" readonly placeholder="—" />
            </div>

          </div>

          <div class="form-group" style="margin-top:10px;">
            <label>Fasi operative (lettura)</label>
            <textarea id="prod-fasi" class="input" rows="5" readonly placeholder="—"></textarea>
          </div>
        `
      })}

      ${createCard({
        title: "Totale prodotto (controllo resa)",
        body: `
          <div class="form-grid">
            <div class="form-group">
              <label>Resa teorica (da ricetta)</label>
              <input id="resa-teorica" class="input" readonly />
              <div class="form-help">Valore di riferimento (ricette_output).</div>
            </div>

            <div class="form-group">
              <label>Peso totale reale (kg)</label>
              <input id="prod-peso-reale" class="input" type="number" min="0" step="0.001" placeholder="Es: 12,500" ${savedLotto ? "disabled" : ""} />
              <div class="form-help">Inserisci il peso reale misurato in laboratorio.</div>
            </div>

            <div class="form-group">
              <label>Peso allocato in porzioni (kg)</label>
              <input id="peso-allocato" class="input" readonly />
            </div>

            <div class="form-group">
              <label>Differenza (reale - allocato) (kg)</label>
              <input id="peso-differenza" class="input" readonly />
              <div class="form-help">Solo informativo (ritagli/calo/extra).</div>
            </div>

            <div class="form-group">
              <label>Scarto (teorica - reale) (kg)</label>
              <input id="resa-scarto" class="input" readonly />
            </div>
          </div>
        `
      })}

      ${createCard({
        title: "Confezionamento reale (porzioni)",
        body: `
          <div id="porzioni-wrap"></div>

          <div class="form-help" style="margin-top:10px;">
            Inserisci quante confezioni reali hai prodotto per ciascuna porzione (Trattoria/Banchetto/Buffet...).
          </div>
        `
      })}

      ${createCard({
        title: "Coprodotti",
        body: `
          <div id="coprodotti-wrap"></div>

          <div class="form-actions">
            <button type="button" id="btn-add-coprodotto" class="app-button secondary" ${savedLotto ? "disabled" : ""}>+ Aggiungi coprodotto</button>
          </div>

          <div class="form-help">
            I coprodotti nascono solo in produzione e vengono caricati a magazzino con lo stesso lotto.
          </div>
        `
      })}

      ${createCard({
        title: "Azioni",
        body: `
          <div class="form-actions">
            <button type="button" id="btn-salva-produzione" class="app-button" ${savedLotto ? "disabled" : ""}>💾 Registra produzione</button>
            <button type="button" id="btn-print-lotto" class="app-button secondary" disabled>🏷 Stampa etichetta lotto</button>
            <button type="button" id="btn-print-coprodotti" class="app-button secondary" disabled>🏷 Stampa etichette coprodotti</button>
          </div>

          <div id="produzione-result" class="form-result"></div>
        `
      })}

      <div id="prod-modal-backdrop" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; padding:16px; overflow:auto;">
        <div class="view" style="max-width:920px; margin:0 auto; background:var(--card-bg, #111); border-radius:14px; padding:16px;">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
            <h3 id="prod-modal-title" style="margin:0;">Ricetta</h3>
            <button id="prod-modal-close" class="app-button secondary">✕ Chiudi</button>
          </div>
          <div id="prod-modal-body" style="margin-top:12px;"></div>
        </div>
      </div>
    `
  });

  presetDataOggi();

  await Promise.all([
    preloadRicette(),
    preloadDipendenti(),
    preloadProdotti()
  ]);

  setupAutocompleteRicette();
  setupOperatorePIN();
  bindEvents();

  resetConservazioneUI();
  resetConservazioneDettagli();
  resetScadenza();

  renderPorzioniRows();
  renderCoprodottiRows();

  recalcResaUI();
}

function presetDataOggi() {
  const el = document.getElementById("prod-data");
  if (el) el.value = new Date().toISOString().slice(0, 10);
}

/* ========================================================= */
/* DATA LOAD */
/* ========================================================= */

async function preloadRicette() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  ricetteCache = [];
  if (!supabase || !aziendaId) return;

  const { data, error } = await supabase
    .from("ricette")
    .select(`
      id,
      nome,
      pezzi_base,
      prodotto_output_id,
      ricette_output (
        peso_finale,
        unita_misura
      )
    `)
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.error("Errore preload ricette:", error);
    ricetteCache = [];
    return;
  }

  ricetteCache = (data || []).map((r) => {
    const out = Array.isArray(r.ricette_output)
      ? (r.ricette_output[0] || null)
      : (r.ricette_output || null);

    return {
      id: r.id,
      nome: r.nome,
      pezzi_base: r.pezzi_base,
      prodotto_output_id: r.prodotto_output_id ?? null,
      resa_teorica: out?.peso_finale ?? null,
      resa_unita: out?.unita_misura ?? "kg"
    };
  });
}

async function preloadDipendenti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  dipendentiCache = [];
  if (!supabase || !aziendaId) return;

  {
    const { data, error } = await supabase
      .from("dipendenti")
      .select("id, nome, pin, codice")
      .eq("azienda_id", aziendaId)
      .eq("attivo", true)
      .order("nome");

    if (!error) {
      dipendentiCache = (data || []).map((d) => ({
        id: d.id,
        nome: d.nome,
        pin: (d.pin ?? d.codice ?? "").toString()
      }));
      return;
    }
  }

  const { data, error } = await supabase
    .from("dipendenti")
    .select("id, nome, codice")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.error("Errore preload dipendenti:", error);
    dipendentiCache = [];
    return;
  }

  dipendentiCache = (data || []).map((d) => ({
    id: d.id,
    nome: d.nome,
    pin: (d.codice ?? "").toString()
  }));
}

async function preloadProdotti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  prodottiCache = [];
  if (!supabase || !aziendaId) return;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, nome, unita_misura")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.error("Errore preload prodotti:", error);
    prodottiCache = [];
    return;
  }

  prodottiCache = (data || []).map((p) => ({
    id: p.id,
    nome: p.nome,
    unita_misura: p.unita_misura || "kg"
  }));
}

async function loadPorzioniRicetta(ricettaId) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  porzioniCache = [];
  porzioniRows = [];

  if (!supabase || !aziendaId || !ricettaId) return;

  const { data, error } = await supabase
    .from("ricette_porzione")
    .select("id, label, peso_porzione, unita_misura, note")
    .eq("azienda_id", aziendaId)
    .eq("ricetta_id", ricettaId)
    .eq("attivo", true)
    .order("label");

  if (error) {
    console.error("Errore load porzioni:", error);
    porzioniCache = [];
    porzioniRows = [];
    return;
  }

  porzioniCache = data || [];
  porzioniRows = porzioniCache.map((p) => ({
    porzione_id: p.id,
    label: p.label,
    peso_porzione: toNumber(p.peso_porzione),
    unita_misura: (p.unita_misura || "kg").toString(),
    quantita_pz: "",
    note: ""
  }));

  renderPorzioniRows();
  recalcResaUI();
}

async function loadConservazioni(ricettaId) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  scenariConservazione = [];
  if (!supabase || !aziendaId || !ricettaId) return;

  const { data, error } = await supabase
    .from("ricette_conservazione")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("ricetta_id", ricettaId)
    .eq("attivo", true);

  if (error) {
    console.error("Errore load conservazioni:", error);
    scenariConservazione = [];
  } else {
    scenariConservazione = data || [];
  }

  const select = document.getElementById("prod-conservazione");
  if (!select) return;

  select.innerHTML = `<option value="">Seleziona...</option>`;
  scenariConservazione.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.scenario_label || "Scenario";
    select.appendChild(opt);
  });

  resetScadenza();
  resetConservazioneDettagli();
}

/* ========================================================= */
/* RICETTA AUTOCOMPLETE + VEDI */
/* ========================================================= */

function setupAutocompleteRicette() {
  const input = document.getElementById("prod-ricetta-search");
  const suggest = document.getElementById("prod-ricetta-suggest");
  const hidden = document.getElementById("prod-ricetta-id");
  const btnVedi = document.getElementById("btn-vedi-ricetta");

  if (!input || !suggest || !hidden || !btnVedi) return;

  input.addEventListener("input", () => {
    if (savedLotto) return;

    const q = (input.value || "").toLowerCase().trim();
    suggest.innerHTML = "";

    ricettaSelezionata = null;
    hidden.value = "";
    btnVedi.disabled = true;

    setRicettaInfo("Nessuna ricetta selezionata");
    porzioniCache = [];
    porzioniRows = [];
    renderPorzioniRows();
    resetConservazioneUI();
    resetConservazioneDettagli();
    resetScadenza();
    recalcResaUI();

    if (q.length < 2) {
      suggest.classList.remove("open");
      return;
    }

    const risultati = ricetteCache
      .filter((r) => (r.nome || "").toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach((r) => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = r.nome;

      div.onclick = async () => {
        hidden.value = r.id;
        input.value = r.nome;
        suggest.classList.remove("open");

        ricettaSelezionata = r;
        btnVedi.disabled = false;

        const resaTxt = r.resa_teorica != null
          ? ` — Resa teorica: ${String(r.resa_teorica)} ${r.resa_unita || "kg"}`
          : "";

        setRicettaInfo("Pezzi base: " + (r.pezzi_base ?? "-") + resaTxt);

        await Promise.all([
          loadPorzioniRicetta(r.id),
          loadConservazioni(r.id)
        ]);

        recalcResaUI();
      };

      suggest.appendChild(div);
    });

    suggest.classList.add("open");
  });

  document.addEventListener("click", (e) => {
    const wrap = input.parentElement;
    if (!wrap) return;
    if (!wrap.contains(e.target)) suggest.classList.remove("open");
  });
}

function setRicettaInfo(text) {
  const el = document.getElementById("prod-ricetta-info");
  if (el) el.innerText = text;
}

/* ========================================================= */
/* CONSERVAZIONE */
/* ========================================================= */

function resetConservazioneUI() {
  const select = document.getElementById("prod-conservazione");
  if (!select) return;
  select.innerHTML = `<option value="">Seleziona...</option>`;
}

function resetConservazioneDettagli() {
  const t = document.getElementById("prod-temp");
  const f = document.getElementById("prod-fasi");
  if (t) t.value = "";
  if (f) f.value = "";
}

function resetScadenza() {
  const el = document.getElementById("prod-scadenza");
  if (el) el.value = "";
}

function aggiornaScadenza() {
  const scenarioId = document.getElementById("prod-conservazione")?.value || "";
  const scenario = scenariConservazione.find((s) => String(s.id) === String(scenarioId));
  if (!scenario) {
    resetScadenza();
    resetConservazioneDettagli();
    return;
  }

  const dataProd = document.getElementById("prod-data")?.value || "";
  if (!dataProd) return;

  const scad = addDaysISO(dataProd, scenario.shelf_life_giorni || 0);
  const scadEl = document.getElementById("prod-scadenza");
  if (scadEl) scadEl.value = scad;

  const tempEl = document.getElementById("prod-temp");
  if (tempEl) tempEl.value = (scenario.temperatura ?? "").toString();

  const fasiEl = document.getElementById("prod-fasi");
  if (fasiEl) fasiEl.value = (scenario.fasi_operativo ?? "").toString();

  coprodottiRows = coprodottiRows.map((r) => ({
    ...r,
    data_scadenza: r.data_scadenza || scad
  }));
  renderCoprodottiRows();
}

/* ========================================================= */
/* DIPENDENTI / PIN */
/* ========================================================= */

function setupOperatorePIN() {
  const pinInput = document.getElementById("prod-operatore-pin");
  const info = document.getElementById("prod-operatore-info");
  if (!pinInput || !info) return;

  operatoreRisolto = null;
  info.innerText = "Nessun operatore identificato";

  pinInput.addEventListener("input", () => {
    if (savedLotto) return;

    const pin = (pinInput.value || "").trim();
    if (!pin) {
      operatoreRisolto = null;
      info.innerText = "Nessun operatore identificato";
      return;
    }

    const match = dipendentiCache.find((d) => (d.pin ?? "").toString() === pin);
    if (!match) {
      operatoreRisolto = null;
      info.innerText = "PIN non valido ❌";
      return;
    }

    operatoreRisolto = match;
    info.innerText = `Operatore: ${match.nome} ✅`;
  });
}

/* ========================================================= */
/* PORZIONI */
/* ========================================================= */

function renderPorzioniRows() {
  const wrap = document.getElementById("porzioni-wrap");
  if (!wrap) return;

  if (!ricettaSelezionata?.id) {
    wrap.innerHTML = `<div class="form-help">Seleziona una ricetta per vedere le porzioni disponibili.</div>`;
    return;
  }

  if (!porzioniRows.length) {
    wrap.innerHTML = `<div class="form-help">Nessuna porzione configurata per questa ricetta.</div>`;
    return;
  }

  wrap.innerHTML = porzioniRows
    .map((r) => {
      const pesoTxt = `${formatNumber(r.peso_porzione)} ${escapeHtml(r.unita_misura || "kg")}`;
      return `
        <div class="card menu-card" data-porzione-id="${escapeAttr(String(r.porzione_id))}">
          <div class="form-grid">
            <div class="form-group">
              <label>${escapeHtml(r.label)} (${pesoTxt})</label>
              <input class="input"
                type="number"
                min="0"
                step="1"
                data-field="quantita_pz"
                value="${escapeAttr(String(r.quantita_pz ?? ""))}"
                placeholder="Numero confezioni"
                ${savedLotto ? "readonly" : ""} />
              <div class="form-help">Inserisci la quantità reale prodotta (pezzi).</div>
            </div>

            <div class="form-group">
              <label>Note confezionamento</label>
              <input class="input"
                type="text"
                data-field="note"
                value="${escapeAttr(String(r.note ?? ""))}"
                placeholder="Es: Battesimo Lucia"
                ${savedLotto ? "readonly" : ""} />
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function onPorzioniInput(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const card = target.closest("[data-porzione-id]");
  if (!card) return;

  const porzioneId = card.getAttribute("data-porzione-id");
  if (!porzioneId) return;

  const idx = porzioniRows.findIndex((x) => String(x.porzione_id) === String(porzioneId));
  if (idx < 0) return;

  const field = target.getAttribute("data-field");
  if (!field) return;

  if (savedLotto) return;

  if (field === "quantita_pz" && target instanceof HTMLInputElement) {
    porzioniRows[idx].quantita_pz = target.value ?? "";
    recalcResaUI();
    return;
  }

  if (field === "note" && target instanceof HTMLInputElement) {
    porzioniRows[idx].note = target.value ?? "";
    return;
  }
}

/* ========================================================= */
/* COPRODOTTI */
/* ========================================================= */

function addCoprodottoRow() {
  coprodottiRows.push({
    id: cryptoRandomId(),
    prodotto_id: "",
    quantita: "",
    unita_misura: "",
    data_scadenza: "",
    note: ""
  });

  const scadBase = document.getElementById("prod-scadenza")?.value || "";
  if (scadBase) {
    coprodottiRows = coprodottiRows.map((r) => ({
      ...r,
      data_scadenza: r.data_scadenza || scadBase
    }));
  }

  renderCoprodottiRows();
}

function removeCoprodottoRow(rowId) {
  coprodottiRows = coprodottiRows.filter((r) => String(r.id) !== String(rowId));
  renderCoprodottiRows();
}

function renderCoprodottiRows() {
  const wrap = document.getElementById("coprodotti-wrap");
  if (!wrap) return;

  if (!coprodottiRows.length) {
    wrap.innerHTML = `<div class="form-help">Nessun coprodotto inserito.</div>`;
    return;
  }

  wrap.innerHTML = coprodottiRows
    .map((row) => {
      const prodotto = prodottiCache.find((p) => String(p.id) === String(row.prodotto_id)) || null;
      const umDefault = row.unita_misura || prodotto?.unita_misura || "";

      return `
        <div class="card menu-card" data-coprodotto-id="${escapeAttr(row.id)}">
          <div class="form-grid">

            <div class="form-group">
              <label>Prodotto</label>
              <select class="input" data-field="prodotto_id" ${savedLotto ? "disabled" : ""}>
                <option value="">Seleziona prodotto</option>
                ${prodottiCache.map((p) => {
                  const selected = String(p.id) === String(row.prodotto_id) ? "selected" : "";
                  return `<option value="${escapeAttr(String(p.id))}" ${selected}>${escapeHtml(p.nome)}</option>`;
                }).join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Quantità</label>
              <input class="input"
                type="number"
                min="0"
                step="0.001"
                data-field="quantita"
                value="${escapeAttr(String(row.quantita ?? ""))}"
                placeholder="Es: 0.500"
                ${savedLotto ? "readonly" : ""} />
            </div>

            <div class="form-group">
              <label>UM</label>
              <input class="input"
                type="text"
                data-field="unita_misura"
                value="${escapeAttr(String(umDefault || ""))}"
                placeholder="Es: kg"
                ${savedLotto ? "readonly" : ""} />
            </div>

            <div class="form-group">
              <label>Scadenza</label>
              <input class="input"
                type="date"
                data-field="data_scadenza"
                value="${escapeAttr(String(row.data_scadenza || ""))}"
                ${savedLotto ? "readonly" : ""} />
            </div>

            <div class="form-group">
              <label>Note</label>
              <input class="input"
                type="text"
                data-field="note"
                value="${escapeAttr(String(row.note || ""))}"
                placeholder="Es: Per salsa / evento..."
                ${savedLotto ? "readonly" : ""} />
            </div>

          </div>

          <div class="form-actions">
            <button type="button"
              class="app-button secondary"
              data-action="remove-coprodotto"
              ${savedLotto ? "disabled" : ""}>
              Rimuovi
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function onCoprodottiChange(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const card = target.closest("[data-coprodotto-id]");
  if (!card) return;

  const rowId = card.getAttribute("data-coprodotto-id");
  if (!rowId) return;

  const idx = coprodottiRows.findIndex((r) => String(r.id) === String(rowId));
  if (idx < 0) return;

  const field = target.getAttribute("data-field");
  if (!field) return;

  if (savedLotto) return;

  if (field === "prodotto_id" && target instanceof HTMLSelectElement) {
    coprodottiRows[idx].prodotto_id = (target.value || "").toString();
    const prodotto = prodottiCache.find((p) => String(p.id) === String(coprodottiRows[idx].prodotto_id)) || null;
    if (prodotto && !coprodottiRows[idx].unita_misura) {
      coprodottiRows[idx].unita_misura = prodotto.unita_misura || "kg";
    }
    renderCoprodottiRows();
    return;
  }

  if (field === "quantita" && target instanceof HTMLInputElement) {
    coprodottiRows[idx].quantita = target.value ?? "";
    return;
  }

  if (field === "unita_misura" && target instanceof HTMLInputElement) {
    coprodottiRows[idx].unita_misura = target.value ?? "";
    return;
  }

  if (field === "data_scadenza" && target instanceof HTMLInputElement) {
    coprodottiRows[idx].data_scadenza = target.value ?? "";
    return;
  }

  if (field === "note" && target instanceof HTMLInputElement) {
    coprodottiRows[idx].note = target.value ?? "";
    return;
  }
}

function onCoprodottiClick(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const btn = target.closest("[data-action]");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const card = btn.closest("[data-coprodotto-id]");
  if (!card) return;

  const rowId = card.getAttribute("data-coprodotto-id");
  if (!rowId) return;

  if (action === "remove-coprodotto") {
    if (savedLotto) return;
    removeCoprodottoRow(rowId);
  }
}

/* ========================================================= */
/* RESA */
/* ========================================================= */

function recalcResaUI() {
  const resaTeoEl = document.getElementById("resa-teorica");
  const pesoRealeEl = document.getElementById("prod-peso-reale");
  const pesoAllocEl = document.getElementById("peso-allocato");
  const diffEl = document.getElementById("peso-differenza");
  const scartoEl = document.getElementById("resa-scarto");

  if (!resaTeoEl || !pesoRealeEl || !pesoAllocEl || !diffEl || !scartoEl) return;

  const resaTeoKg = getResaTeoricaKg();
  const pesoRealeKg = getPesoRealeKg();
  const pesoAllocatoKg = getPesoAllocatoDaPorzioniKg();

  const diffKg = (Number.isFinite(pesoRealeKg) ? (pesoRealeKg - pesoAllocatoKg) : 0);
  const scartoKg = (resaTeoKg != null) ? (resaTeoKg - pesoRealeKg) : null;

  resaTeoEl.value = resaTeoKg == null ? "" : `${formatNumber(resaTeoKg)} kg`;
  pesoAllocEl.value = `${formatNumber(pesoAllocatoKg)} kg`;
  diffEl.value = `${formatNumber(diffKg)} kg`;
  scartoEl.value = scartoKg == null ? "" : `${formatNumber(scartoKg)} kg`;
}

function getResaTeoricaKg() {
  if (!ricettaSelezionata) return null;
  if (ricettaSelezionata.resa_teorica == null) return null;

  const v = toNumber(ricettaSelezionata.resa_teorica);
  const u = (ricettaSelezionata.resa_unita || "kg").toString().toLowerCase().trim();

  if (u === "g" || u === "gr" || u === "grammi") return v / 1000;
  return v;
}

function getPesoAllocatoDaPorzioniKg() {
  let totKg = 0;

  for (const r of porzioniRows) {
    const qPz = Math.max(0, Math.floor(toNumber(r.quantita_pz) || 0));
    if (qPz <= 0) continue;

    const peso = toNumber(r.peso_porzione);
    const u = (r.unita_misura || "kg").toString().toLowerCase().trim();

    let pesoKg = peso;
    if (u === "g" || u === "gr" || u === "grammi") pesoKg = peso / 1000;
    totKg += qPz * pesoKg;
  }

  return totKg;
}

function getPesoRealeKg() {
  const el = document.getElementById("prod-peso-reale");
  const raw = (el?.value ?? "").toString().trim();
  const n = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function getMoltiplicatoreRicetta() {
  const teo = getResaTeoricaKg();
  const reale = getPesoRealeKg();
  if (teo == null || teo <= 0) return 1;
  if (!Number.isFinite(reale) || reale <= 0) return 1;
  return reale / teo;
}

/* ========================================================= */
/* MODAL: VEDI RICETTA */
/* ========================================================= */

async function apriModalRicetta() {
  if (!ricettaSelezionata?.id) return;

  const backdrop = document.getElementById("prod-modal-backdrop");
  const title = document.getElementById("prod-modal-title");
  const body = document.getElementById("prod-modal-body");
  if (!backdrop || !title || !body) return;

  title.innerText = `📖 ${ricettaSelezionata.nome || "Ricetta"}`;
  body.innerHTML = `<div class="form-help">Caricamento...</div>`;
  backdrop.style.display = "block";

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  const [ingRes, fasiRes, ricRes] = await Promise.all([
    supabase
      .from("ricetta_ingredienti")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("ricetta_id", ricettaSelezionata.id)
      .order("ordine"),
    supabase
      .from("ricette_preparazione_fasi")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("ricetta_id", ricettaSelezionata.id)
      .order("ordine"),
    supabase
      .from("ricette")
      .select("descrizione, note_procedimento")
      .eq("id", ricettaSelezionata.id)
      .maybeSingle()
  ]);

  const ingredienti = ingRes.data || [];
  const fasi = fasiRes.data || [];
  const ricettaDett = ricRes.data || {};

  body.innerHTML = `
    <div style="display:grid; gap:12px;">

      ${(ricettaDett.descrizione || ricettaDett.note_procedimento) ? `
        <div class="card">
          <div class="form-group">
            <label>Note</label>
            ${ricettaDett.descrizione ? `<div>${escapeHtml(ricettaDett.descrizione)}</div>` : ""}
            ${ricettaDett.note_procedimento ? `<div style="margin-top:8px;">${escapeHtml(ricettaDett.note_procedimento)}</div>` : ""}
          </div>
        </div>
      ` : ""}

      <div class="card">
        <div class="form-group">
          <label>Ingredienti</label>
          ${ingredienti.length ? `
            <ul style="margin:0; padding-left:18px;">
              ${ingredienti.map((i) => `<li>${escapeHtml(i.nome_ingrediente || i.nome || i.nome_prodotto || "Ingrediente")} ${formatQta(i)}</li>`).join("")}
            </ul>
          ` : `<div class="form-help">Nessun ingrediente disponibile</div>`}
        </div>
      </div>

      <div class="card">
        <div class="form-group">
          <label>Fasi di preparazione</label>
          ${fasi.length ? `
            <ol style="margin:0; padding-left:18px;">
              ${fasi.map((f) => `<li style="margin-bottom:8px;">${escapeHtml(f.nome_fase || f.testo || f.descrizione || "Fase")}</li>`).join("")}
            </ol>
          ` : `<div class="form-help">Nessuna fase disponibile</div>`}
        </div>
      </div>

    </div>
  `;
}

function chiudiModalRicetta() {
  const backdrop = document.getElementById("prod-modal-backdrop");
  if (backdrop) backdrop.style.display = "none";
}

function formatQta(i) {
  const q = i.qta ?? i.quantita ?? i.qta_ingrediente ?? "";
  const u = i.unita ?? i.unita_misura ?? "";
  const out = [q, u].filter(Boolean).join(" ");
  return out ? `— ${escapeHtml(out)}` : "";
}

/* ========================================================= */
/* EVENTS */
/* ========================================================= */

function bindEvents() {
  document.getElementById("btn-back")?.addEventListener("click", () => {
    window.location.hash = "#/produzione";
  });

  document.getElementById("btn-vedi-ricetta")?.addEventListener("click", apriModalRicetta);

  document.getElementById("prod-modal-close")?.addEventListener("click", chiudiModalRicetta);
  document.getElementById("prod-modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target?.id === "prod-modal-backdrop") chiudiModalRicetta();
  });

  document.getElementById("prod-conservazione")?.addEventListener("change", () => {
    if (savedLotto) return;
    aggiornaScadenza();
  });

  document.getElementById("prod-data")?.addEventListener("change", () => {
    if (savedLotto) return;
    aggiornaScadenza();
  });

  document.getElementById("prod-peso-reale")?.addEventListener("input", () => {
    if (savedLotto) return;
    recalcResaUI();
  });

  document.getElementById("porzioni-wrap")?.addEventListener("input", (e) => onPorzioniInput(e));
  document.getElementById("porzioni-wrap")?.addEventListener("change", (e) => onPorzioniInput(e));

  document.getElementById("btn-add-coprodotto")?.addEventListener("click", () => {
    if (savedLotto) return;
    addCoprodottoRow();
  });

  document.getElementById("coprodotti-wrap")?.addEventListener("change", (e) => onCoprodottiChange(e));
  document.getElementById("coprodotti-wrap")?.addEventListener("input", (e) => onCoprodottiChange(e));
  document.getElementById("coprodotti-wrap")?.addEventListener("click", (e) => onCoprodottiClick(e));

  document.getElementById("btn-salva-produzione")?.addEventListener("click", salvaProduzione);

  document.getElementById("btn-print-lotto")?.addEventListener("click", stampaEtichettaLotto);
  document.getElementById("btn-print-coprodotti")?.addEventListener("click", stampaEtichetteCoprodotti);
}

/* ========================================================= */
/* VALIDAZIONE */
/* ========================================================= */

function raccogliDatiForm() {
  const dataProduzione = document.getElementById("prod-data")?.value || "";
  const scenarioId = document.getElementById("prod-conservazione")?.value || "";
  const scadenza = document.getElementById("prod-scadenza")?.value || "";
  const noteLotto = document.getElementById("prod-note-lotto")?.value || "";
  const pesoRealeKg = getPesoRealeKg();

  const porzioni = porzioniRows.map((r) => ({
    porzione_id: r.porzione_id,
    label: r.label,
    peso_porzione: toNumber(r.peso_porzione),
    unita_misura: r.unita_misura,
    quantita_pz: Math.max(0, Math.floor(toNumber(r.quantita_pz) || 0)),
    note: (r.note || "").toString()
  }));

  const coprodotti = coprodottiRows.map((r) => ({
    ...r,
    prodotto_id: (r.prodotto_id || "").toString(),
    quantita: r.quantita,
    unita_misura: (r.unita_misura || "").toString(),
    data_scadenza: (r.data_scadenza || "").toString(),
    note: (r.note || "").toString()
  }));

  return {
    dataProduzione,
    scenarioId,
    scadenza,
    noteLotto,
    operatore: operatoreRisolto,
    pesoRealeKg,
    porzioni,
    coprodotti
  };
}

function validaForm(dati) {
  if (savedLotto) return "Produzione già registrata.";

  if (!ricettaSelezionata?.id) return "Seleziona una ricetta.";
  if (!dati.dataProduzione) return "Seleziona la data produzione.";
  if (!dati.operatore?.id) return "Inserisci un PIN operatore valido.";
  if (!dati.scenarioId) return "Seleziona lo scenario di conservazione.";
  if (!dati.scadenza) return "Scadenza non disponibile. Controlla conservazione e data produzione.";

  if (!Number.isFinite(dati.pesoRealeKg) || dati.pesoRealeKg <= 0) {
    return "Inserisci il peso totale reale (kg) > 0.";
  }

  const porzioniValide = (dati.porzioni || []).filter((p) => p.quantita_pz > 0);
  if (!porzioniValide.length) return "Inserisci almeno una porzione con quantità > 0.";

  const invalidCop = (dati.coprodotti || []).some((c) => {
    const hasProd = !!c.prodotto_id;
    if (!hasProd) return false;

    const q = toNumber(c.quantita);
    if (!Number.isFinite(q) || q <= 0) return true;
    if (!c.unita_misura) return true;
    if (!c.data_scadenza) return true;
    return false;
  });

  if (invalidCop) return "Compila correttamente i coprodotti (quantità > 0, UM e scadenza).";

  if (!ricettaSelezionata?.prodotto_output_id) {
    return "La ricetta non ha un prodotto output associato (prodotto_output_id).";
  }

  return null;
}

/* ========================================================= */
/* HACCP LOG (best-effort) */
/* ========================================================= */

async function logEventoHaccp({ aziendaId, produzioneId, tipo, payload }) {
  const supabase = window.supabaseClient;
  if (!supabase || !aziendaId || !produzioneId || !tipo) return;

  try {
    await supabase
      .from("produzione_eventi_log")
      .insert({
        azienda_id: aziendaId,
        produzione_id: produzioneId,
        tipo_evento: tipo,
        payload: payload ?? null
      });
  } catch {
  }
}

/* ========================================================= */
/* SAVE */
/* ========================================================= */

async function salvaProduzione() {
  const dati = raccogliDatiForm();
  const err = validaForm(dati);
  if (err) return alert(err);

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!supabase || !aziendaId) {
    alert("Azienda non attiva o Supabase non disponibile.");
    return;
  }

  const result = document.getElementById("produzione-result");
  if (result) result.innerHTML = "";

  try {
    const resaTeoKg = getResaTeoricaKg();
    const pesoRealeKg = dati.pesoRealeKg;
    const pesoAllocatoKg = getPesoAllocatoDaPorzioniKg();
    const differenzaKg = pesoRealeKg - pesoAllocatoKg;
    const scartoKg = (resaTeoKg != null) ? (resaTeoKg - pesoRealeKg) : null;

    const moltiplicatore = getMoltiplicatoreRicetta();

    const dettaglioConfezionamento = (dati.porzioni || [])
      .filter((p) => p.quantita_pz > 0)
      .map((p) => ({
        porzione_id: p.porzione_id,
        label: p.label,
        peso_porzione: p.peso_porzione,
        unita_misura: p.unita_misura,
        quantita_pz: p.quantita_pz,
        note: p.note || ""
      }));

    const scenario = scenariConservazione.find((s) => String(s.id) === String(dati.scenarioId)) || null;

    const { data: lotto, error: errLotto } = await supabase
      .from("produzione_lotti")
      .insert({
        azienda_id: aziendaId,
        ricetta_id: ricettaSelezionata.id,
        data_produzione: dati.dataProduzione,
        data_scadenza: dati.scadenza,
        quantita_output: pesoRealeKg,
        unita_misura: "kg",
        scenario_conservazione_id: dati.scenarioId || null,
        porzione_id: null,
        stato: "firmato",
        note: (dati.noteLotto || "").toString(),
        operatore_id: dati.operatore.id,
        firmato_at: new Date().toISOString(),
        dettaglio_confezionamento: dettaglioConfezionamento,
        resa_teorica: resaTeoKg,
        resa_reale: pesoRealeKg,
        scarto: scartoKg
      })
      .select()
      .single();

    if (errLotto) throw errLotto;

    savedLotto = lotto;

    await logEventoHaccp({
      aziendaId,
      produzioneId: lotto.id,
      tipo: "LOTTO_CREATO",
      payload: {
        ricetta_id: ricettaSelezionata.id,
        data_produzione: dati.dataProduzione,
        data_scadenza: dati.scadenza,
        scenario_id: dati.scenarioId || null,
        scenario_label: scenario?.scenario_label ?? null,
        temperatura: scenario?.temperatura ?? null,
        peso_reale_kg: pesoRealeKg,
        peso_allocato_kg: pesoAllocatoKg,
        differenza_kg: differenzaKg,
        scarto_kg: scartoKg,
        operatore_id: dati.operatore.id
      }
    });

    const lottoEl = document.getElementById("prod-lotto");
    if (lottoEl && lotto?.codice_lotto) lottoEl.value = lotto.codice_lotto;

    const porzioniValide = (dati.porzioni || []).filter((p) => p.quantita_pz > 0);

    const righePorzioniPayload = porzioniValide.map((p) => ({
      azienda_id: aziendaId,
      produzione_id: lotto.id,
      ricetta_id: ricettaSelezionata.id,
      conservazione_id: dati.scenarioId || null,
      formato_label: p.label,
      quantita: p.quantita_pz,
      quantita_equivalente: null,
      unita: "pz",
      moltiplicatore_ricetta: moltiplicatore,
      lotto: lotto.codice_lotto,
      porzione_id: p.porzione_id,
      note_confezionamento: p.note || null
    }));

    const { data: righeIns, error: errRighe } = await supabase
      .from("schede_produzione_righe")
      .insert(righePorzioniPayload)
      .select("id, porzione_id, formato_label, quantita, unita, note_confezionamento");

    if (errRighe) throw errRighe;
    savedRighe = (righeIns || []);

    await logEventoHaccp({
      aziendaId,
      produzioneId: lotto.id,
      tipo: "PORZIONI_INSERITE",
      payload: {
        righe: porzioniValide.map((p) => ({
          porzione_id: p.porzione_id,
          label: p.label,
          qta_pz: p.quantita_pz,
          peso_porzione: p.peso_porzione,
          unita_misura: p.unita_misura,
          note: p.note || ""
        }))
      }
    });

    const { data: ingredienti, error: errIng } = await supabase
      .from("ricetta_ingredienti")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("ricetta_id", ricettaSelezionata.id);

    if (errIng) throw errIng;

    await supabase
      .from("magazzino_movimenti")
      .delete()
      .eq("azienda_id", aziendaId)
      .eq("riferimento_tipo", "PRODUZIONE_LOTTO")
      .eq("riferimento_id", lotto.id);

    for (const ing of (ingredienti || [])) {
      const prodottoId = ing.prodotto_id;
      const qBase = toNumber(ing.quantita ?? ing.qta ?? ing.qta_ingrediente ?? 0);
      if (!prodottoId || qBase <= 0) continue;

      const qScarico = qBase * moltiplicatore;

      const { error: errMov } = await supabase
        .from("magazzino_movimenti")
        .insert({
          azienda_id: aziendaId,
          prodotto_id: prodottoId,
          tipo_movimento: "SCARICO",
          quantita: qScarico,
          data_movimento: dati.dataProduzione,
          riferimento_tipo: "PRODUZIONE_LOTTO",
          riferimento_id: lotto.id,
          note: `Scarico ingredienti lotto ${lotto.codice_lotto}`
        });

      if (errMov) throw errMov;
    }

    for (const p of porzioniValide) {
      const qPz = p.quantita_pz;
      const pesoKg = toKg(toNumber(p.peso_porzione), p.unita_misura);
      const qKg = qPz * pesoKg;

      const noteExtra = (p.note || "").trim();
      const note = `Carico prodotto finito lotto ${lotto.codice_lotto} — ${p.label} — ${qPz} pz x ${formatNumber(pesoKg)} kg${noteExtra ? ` — ${noteExtra}` : ""}`;

      const { error: errCarico } = await supabase
        .from("magazzino_movimenti")
        .insert({
          azienda_id: aziendaId,
          prodotto_id: ricettaSelezionata.prodotto_output_id,
          tipo_movimento: "CARICO",
          quantita: qKg,
          data_movimento: dati.dataProduzione,
          riferimento_tipo: "PRODUZIONE_LOTTO",
          riferimento_id: lotto.id,
          note
        });

      if (errCarico) throw errCarico;
    }

    const coprodottiValidi = (dati.coprodotti || []).filter((c) => c.prodotto_id);

    if (coprodottiValidi.length) {
      await logEventoHaccp({
        aziendaId,
        produzioneId: lotto.id,
        tipo: "COPRODOTTI_INSERITI",
        payload: {
          righe: coprodottiValidi.map((c) => ({
            prodotto_id: c.prodotto_id,
            quantita: toNumber(c.quantita),
            unita_misura: c.unita_misura || "",
            data_scadenza: c.data_scadenza || "",
            note: (c.note || "").trim()
          }))
        }
      });
    }

    for (const c of coprodottiValidi) {
      const q = toNumber(c.quantita);
      if (q <= 0) continue;

      const { error: errRigaCop } = await supabase
        .from("schede_produzione_righe")
        .insert({
          azienda_id: aziendaId,
          produzione_id: lotto.id,
          ricetta_id: ricettaSelezionata.id,
          conservazione_id: dati.scenarioId || null,
          formato_label: "COPRODOTTO",
          quantita: q,
          quantita_equivalente: null,
          unita: c.unita_misura || "kg",
          moltiplicatore_ricetta: moltiplicatore,
          lotto: lotto.codice_lotto,
          porzione_id: null,
          note_confezionamento: (c.note || "").trim() || null,
          prodotto_id: Number(c.prodotto_id)
        });

      if (errRigaCop) throw errRigaCop;

      const prod = prodottiCache.find((p) => String(p.id) === String(c.prodotto_id));
      const nomeProd = prod?.nome || "Coprodotto";
      const noteCop = `Carico coprodotto lotto ${lotto.codice_lotto} — ${nomeProd}${c.note ? ` — ${c.note}` : ""}`;

      const { error: errMovCop } = await supabase
        .from("magazzino_movimenti")
        .insert({
          azienda_id: aziendaId,
          prodotto_id: Number(c.prodotto_id),
          tipo_movimento: "CARICO",
          quantita: q,
          data_movimento: dati.dataProduzione,
          riferimento_tipo: "PRODUZIONE_LOTTO",
          riferimento_id: lotto.id,
          note: noteCop
        });

      if (errMovCop) throw errMovCop;
    }

    await logEventoHaccp({
      aziendaId,
      produzioneId: lotto.id,
      tipo: "MOVIMENTI_MAGAZZINO_GENERATI",
      payload: {
        moltiplicatore_ricetta: moltiplicatore,
        prodotto_output_id: ricettaSelezionata.prodotto_output_id,
        coprodotti_count: coprodottiValidi.length
      }
    });

    await logEventoHaccp({
      aziendaId,
      produzioneId: lotto.id,
      tipo: "LOTTO_FIRMATO",
      payload: {
        operatore_id: dati.operatore.id,
        firmato_at: lotto.firmato_at ?? new Date().toISOString()
      }
    });

    lockUIAfterSave();

    if (result) {
      result.innerHTML = `<span class="success-text">Produzione registrata ✔ — Lotto: ${escapeHtml(lotto.codice_lotto || "")}</span>`;
    }

    alert(`Produzione registrata ✔️\nLotto: ${lotto.codice_lotto || "(generato)"}`);
  } catch (error) {
    console.error("Errore registrazione produzione:", error);

    const result = document.getElementById("produzione-result");
    if (result) {
      result.innerHTML = `<span class="error-text">Errore: ${escapeHtml(error?.message || "Operazione non riuscita")}</span>`;
    }

    alert("Errore durante la registrazione della produzione. Controlla console.");
  }
}

function lockUIAfterSave() {
  const btnSave = document.getElementById("btn-salva-produzione");
  if (btnSave) btnSave.setAttribute("disabled", "disabled");

  const btnAddCop = document.getElementById("btn-add-coprodotto");
  if (btnAddCop) btnAddCop.setAttribute("disabled", "disabled");

  const printLotto = document.getElementById("btn-print-lotto");
  const printCop = document.getElementById("btn-print-coprodotti");
  if (printLotto) printLotto.removeAttribute("disabled");
  if (printCop) printCop.removeAttribute("disabled");

  const lockIds = [
    "prod-ricetta-search",
    "prod-data",
    "prod-operatore-pin",
    "prod-note-lotto",
    "prod-conservazione",
    "prod-peso-reale"
  ];

  for (const id of lockIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.setAttribute("disabled", "disabled");
    }
  }

  renderPorzioniRows();
  renderCoprodottiRows();
}

/* ========================================================= */
/* PRINT */
/* ========================================================= */

function stampaEtichettaLotto() {
  if (!savedLotto?.codice_lotto) return alert("Salva prima la produzione.");

  const dataProd = document.getElementById("prod-data")?.value || "";
  const scadenza = document.getElementById("prod-scadenza")?.value || "";
  const noteLotto = document.getElementById("prod-note-lotto")?.value || "";
  const operatoreNome = operatoreRisolto?.nome || "";

  const scenarioId = document.getElementById("prod-conservazione")?.value || "";
  const scenario = scenariConservazione.find((s) => String(s.id) === String(scenarioId)) || null;
  const scenarioLabel = scenario?.scenario_label || "";
  const temperatura = (scenario?.temperatura ?? "").toString();
  const fasi = compactText((scenario?.fasi_operativo ?? "").toString(), 420);

  const pesoRealeKg = getPesoRealeKg();
  const pesoAllocatoKg = getPesoAllocatoDaPorzioniKg();
  const diffKg = pesoRealeKg - pesoAllocatoKg;

  const porzioniValide = porzioniRows
    .map((p) => ({
      ...p,
      q: Math.max(0, Math.floor(toNumber(p.quantita_pz) || 0))
    }))
    .filter((p) => p.q > 0);

  const righePorzioniTxt = porzioniValide
    .map((p) => {
      const note = (p.note || "").trim();
      const pesoKg = toKg(toNumber(p.peso_porzione), p.unita_misura);
      return `${escapeHtml(p.label)} → ${escapeHtml(String(p.q))} pz (x ${escapeHtml(formatNumber(pesoKg))} kg)${note ? ` — ${escapeHtml(note)}` : ""}`;
    })
    .join("<br>");

  const html = buildPrintHtml({
    title: "Etichetta Lotto",
    labels: [
      buildLabelHtml({
        header: escapeHtml(ricettaSelezionata?.nome || "Ricetta"),
        rows: [
          { k: "Lotto", v: savedLotto.codice_lotto, big: true },
          { k: "Data produzione", v: dataProd },
          { k: "Scadenza", v: scadenza },
          scenarioLabel ? { k: "Scenario", v: scenarioLabel } : null,
          temperatura ? { k: "Temperatura", v: temperatura } : null,
          fasi ? { k: "Fasi operative", v: fasi } : null,
          { k: "Peso reale", v: `${formatNumber(pesoRealeKg)} kg` },
          { k: "Peso porzionato", v: `${formatNumber(pesoAllocatoKg)} kg` },
          { k: "Differenza", v: `${formatNumber(diffKg)} kg` },
          { k: "Operatore", v: operatoreNome },
          noteLotto ? { k: "Destinazione / Note", v: noteLotto } : null,
          { k: "Confezionamento", v: righePorzioniTxt || "—" }
        ],
        footer: "Generato da Ristoflow — Produzione"
      })
    ]
  });

  openPrintWindow(html);
}

function stampaEtichetteCoprodotti() {
  if (!savedLotto?.codice_lotto) return alert("Salva prima la produzione.");

  const dataProd = document.getElementById("prod-data")?.value || "";
  const scadenzaLotto = document.getElementById("prod-scadenza")?.value || "";

  const scenarioId = document.getElementById("prod-conservazione")?.value || "";
  const scenario = scenariConservazione.find((s) => String(s.id) === String(scenarioId)) || null;
  const scenarioLabel = scenario?.scenario_label || "";
  const temperatura = (scenario?.temperatura ?? "").toString();
  const fasi = compactText((scenario?.fasi_operativo ?? "").toString(), 320);

  const coprodottiValidi = coprodottiRows
    .map((c) => ({
      ...c,
      q: toNumber(c.quantita),
      prod: prodottiCache.find((p) => String(p.id) === String(c.prodotto_id)) || null
    }))
    .filter((c) => c.prodotto_id && c.q > 0);

  if (!coprodottiValidi.length) return alert("Nessun coprodotto valido da stampare.");

  const labels = coprodottiValidi.map((c) => {
    const nomeProd = c.prod?.nome || "Coprodotto";
    const unita = c.unita_misura || c.prod?.unita_misura || "kg";
    const scad = c.data_scadenza || scadenzaLotto;

    return buildLabelHtml({
      header: escapeHtml(nomeProd),
      rows: [
        { k: "Lotto", v: savedLotto.codice_lotto, big: true },
        { k: "Data produzione", v: dataProd },
        { k: "Scadenza", v: scad },
        scenarioLabel ? { k: "Scenario", v: scenarioLabel } : null,
        temperatura ? { k: "Temperatura", v: temperatura } : null,
        fasi ? { k: "Fasi operative", v: fasi } : null,
        { k: "Quantità", v: `${formatNumber(c.q)} ${escapeHtml(unita)}` },
        { k: "", v: "Coprodotto da lavorazione" },
        c.note ? { k: "Note", v: c.note } : null
      ],
      footer: "Generato da Ristoflow — Produzione"
    });
  });

  const html = buildPrintHtml({
    title: "Etichette Coprodotti",
    labels
  });

  openPrintWindow(html);
}

function buildPrintHtml({ title, labels }) {
  const labelsHtml = (labels || [])
    .map((l, i) => `<div class="label">${l}</div>${i < labels.length - 1 ? `<div class="pagebreak"></div>` : ""}`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title || "Stampa")}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 12mm; color:#111; background:#fff; }
    .label { border: 2px solid #000; padding: 10mm; border-radius: 6mm; }
    .title { font-size: 18pt; font-weight: 700; margin-bottom: 6mm; }
    .row { font-size: 12.5pt; margin: 2.5mm 0; }
    .muted { font-size: 10.5pt; color: #333; margin-top: 6mm; }
    .big { font-size: 15pt; font-weight: 700; }
    .kv { display:flex; gap:8px; flex-wrap:wrap; }
    .k { font-weight:700; }
    .pagebreak { page-break-after: always; height: 0; }
    @media print {
      body { padding: 0; }
      .label { border: 2px solid #000; border-radius: 6mm; margin: 0; }
    }
  </style>
</head>
<body>
  ${labelsHtml}
  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>`;
}

function buildLabelHtml({ header, rows, footer }) {
  const rowsHtml = (rows || [])
    .filter((r) => r && (r.k || r.v))
    .map((r) => {
      const v = escapeHtml(String(r.v ?? ""));
      if (r.big) {
        return `<div class="row big">${escapeHtml(r.k || "")}: ${v}</div>`;
      }
      if (!r.k) return `<div class="row">${v}</div>`;
      return `<div class="row kv"><span class="k">${escapeHtml(r.k)}:</span> <span>${v}</span></div>`;
    })
    .join("");

  return `
    <div class="title">${header || ""}</div>
    ${rowsHtml}
    ${footer ? `<div class="muted">${escapeHtml(footer)}</div>` : ""}
  `;
}

function openPrintWindow(html) {
  const w = window.open("", "_blank");
  if (!w) return alert("Popup bloccato dal browser. Consenti i popup per stampare.");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function addDaysISO(dateISO, days) {
  const d = new Date(dateISO);
  if (Number.isFinite(days)) d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toNumber(v) {
  const n = parseFloat((v ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toKg(value, unita) {
  const v = toNumber(value);
  const u = (unita || "kg").toString().toLowerCase().trim();
  if (u === "g" || u === "gr" || u === "grammi") return v / 1000;
  return v;
}

function formatNumber(n) {
  const x = toNumber(n);
  return String(Math.round(x * 1000) / 1000).replace(".", ",");
}

function compactText(text, maxLen) {
  const t = (text || "").toString().replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (!maxLen || t.length <= maxLen) return t;
  return t.slice(0, Math.max(0, maxLen - 1)).trimEnd() + "…";
}

function escapeHtml(str) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}

function cryptoRandomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}
