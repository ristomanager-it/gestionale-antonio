// ============================================================
// APP PRODUZIONE - VERSIONE OPERATORE COMPLETA
// Vanilla JS + Supabase
// Route: #/app-produzione
// ============================================================

import { createPageLayout, createCard } from "../../utils/pageLayout.js";
import { creaLottoProduzione } from "../../modules/produzione/produzione-core.js";

let state = {};

function getInitialState() {
  return {
    azienda_id: null,
    sede_id: null,

    ricette: [],
    ricetta: null,

    porzioni: [],
    scenari: [],
    fasi: [],          // ricette_preparazione_fasi della ricetta selezionata
    logHaccp: [],      // righe compilate dal cuoco, una per fase
    dispositivi: {},   // map dispositivo_id → { nome, tipo, connesso, temperatura_min, temperatura_max }

    operatore: null,

    produzione: {
      data_produzione: "",
      quantita_prodotta: 0,
      unita_misura: "kg",
      peso_reale_kg: 0,
      scenario_id: "",
      data_scadenza: "",
      note: ""
    },

    confezioni: [],

    savedLotto: null,
    savedLottoRef: null,
    savedLabels: []
  };
}

// ============================================================
// RENDER
// ============================================================

export async function render(container) {
  state = getInitialState();

  state.azienda_id = window.state?.azienda?.id || window.state?.azienda_id || null;
  state.sede_id = window.state?.sede?.id || window.state?.sedeAttiva?.id || null;
  state.produzione.data_produzione = todayISO();

  container.innerHTML = createPageLayout({
    title: "Produzione Operativa",
    subtitle: "Ricetta, lotto, quantità prodotta, conservazione, confezionamento e stampa etichette",
    content: `
      ${renderCardRicetta()}
      ${renderCardOperatore()}
      ${renderCardHaccp()}
      ${renderCardQuantita()}
      ${renderCardConservazione()}
      ${renderCardConfezionamento()}
      ${renderCardAzioni()}
      ${renderModalStampa()}
    `
  });

  await loadRicette();

  bindEvents();
  renderRicetteSelect();
  renderScenarioSelect();
  renderConfezioni();
  aggiornaRicettaInfo();
  aggiornaScenarioInfo();
  aggiornaTotali();
  aggiornaAlert();
}

function renderCardRicetta() {
  return createCard({
    title: "1. Ricetta",
    body: `
      <div class="form-grid">

        <div class="form-group">
          <label>Ricetta da produrre</label>

          <div style="display:flex; gap:8px; align-items:center;">

            <select id="app-prod-ricetta" class="input" style="flex:1;">
              <option value="">Caricamento ricette...</option>
            </select>

            <button 
              id="btn-view-ricetta" 
              type="button" 
              class="app-button secondary"
              title="Visualizza ricetta"
              disabled
              style="padding:0 12px;"
            >
              👁
            </button>

          </div>

          <div class="form-help" style="margin-top:6px;">
            Se hai dubbi puoi aprire la scheda ricetta
          </div>
        </div>

        <div class="form-group">
          <label>Data produzione</label>
          <input 
            id="app-prod-data" 
            type="date" 
            class="input" 
            value="${escapeAttr(state.produzione.data_produzione)}" 
          />
        </div>

      </div>

      <div id="app-prod-ricetta-info" class="form-help" style="margin-top:10px;">
        Seleziona una ricetta.
      </div>
    `
  });
}
function renderCardOperatore() {
  return createCard({
    title: "2. Operatore",
    body: `
      <div class="form-grid">
        <div class="form-group">
          <label>PIN operatore</label>
          <input id="app-prod-pin" type="password" inputmode="numeric" class="input" placeholder="Inserisci PIN..." />
        </div>

        <div class="form-group">
          <label>Operatore</label>
          <input id="app-prod-operatore" class="input" readonly placeholder="Non identificato" />
        </div>
      </div>
    `
  });
}

function renderCardQuantita() {
  return createCard({
    title: "3. Quantità prodotta",
    body: `
      <div class="form-grid">
        <div class="form-group">
          <label>Quantità prodotta reale</label>
          <input id="app-prod-quantita" type="number" min="0" step="0.001" class="input" placeholder="Es. 12.500" />
        </div>

        <div class="form-group">
          <label>UM</label>
          <select id="app-prod-um" class="input">
            <option value="kg" selected>kg</option>
            <option value="g">g</option>
            <option value="pz">pz</option>
          </select>
        </div>

        <div class="form-group">
          <label>Equivalente kg</label>
          <input id="app-prod-peso-kg" class="input" readonly placeholder="0,000 kg" />
        </div>

        <div class="form-group">
          <label>Note lotto / destinazione</label>
          <input id="app-prod-note" class="input" placeholder="Es. Battesimo Lucia, Trattoria Rossi..." />
        </div>
      </div>
    `
  });
}

function renderCardConservazione() {
  return createCard({
    title: "4. Conservazione",
    body: `
      <div class="form-grid">
        <div class="form-group">
          <label>Scenario conservazione</label>
          <select id="app-prod-scenario" class="input" disabled>
            <option value="">Seleziona ricetta...</option>
          </select>
        </div>

        <div class="form-group">
          <label>Scadenza automatica</label>
          <input id="app-prod-scadenza" type="date" class="input" readonly />
        </div>

        <div class="form-group">
          <label>Temperatura</label>
          <input id="app-prod-temperatura" class="input" readonly placeholder="—" />
        </div>
      </div>

      <div id="app-prod-scenario-info" class="form-help" style="margin-top:10px;">
        Lo scenario determina la scadenza del lotto.
      </div>
    `
  });
}

function renderCardConfezionamento() {
  return createCard({
    title: "5. Confezionamento",
    body: `
      <div id="app-prod-confezioni"></div>

      <div class="form-actions" style="margin-top:12px;">
        <button id="btn-app-add-confezione" type="button" class="app-button secondary" disabled>
          + Aggiungi confezione
        </button>
      </div>

      <div id="app-prod-totali" class="form-help" style="margin-top:10px;"></div>
      <div id="app-prod-alert" class="form-help" style="margin-top:10px;"></div>
    `
  });
}

function renderCardAzioni() {
  return createCard({
    title: "6. Conferma",
    body: `
      <div class="form-actions">
        <button id="btn-app-salva-produzione" type="button" class="app-button">
          ✅ Registra produzione
        </button>

        <button id="btn-app-open-stampa" type="button" class="app-button secondary" disabled>
          🏷 Stampa etichette
        </button>
      </div>

      <div id="app-prod-result" class="form-result"></div>
    `
  });
}

function renderModalStampa() {
  return `
    <div id="app-print-backdrop" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; padding:16px; overflow:auto;">
      <div class="view" style="max-width:720px; margin:0 auto; background:var(--card-bg, #111); border-radius:14px; padding:16px;">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
          <h3 style="margin:0;">🏷 Stampa etichette</h3>
          <button id="app-print-close" class="app-button secondary" type="button">✕ Chiudi</button>
        </div>

        <div style="margin-top:14px; display:grid; gap:12px;">
          <div class="form-group">
            <label>Formato etichetta</label>
            <select id="app-print-format" class="input">
              <option value="50x50">50 x 50 mm</option>
              <option value="70x40">70 x 40 mm</option>
              <option value="100x150">100 x 150 mm</option>
            </select>
          </div>

          <div id="app-print-info" class="form-help"></div>

          <div class="form-actions">
            <button id="btn-app-print-labels" type="button" class="app-button">
              🖨 Stampa etichette confezioni
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// LOAD
// ============================================================

async function loadRicette() {
  const supabase = window.supabaseClient;
  if (!supabase || !state.azienda_id) return;

  const { data, error } = await supabase
    .from("ricette")
    .select(`
      id,
      nome,
      pezzi_base,
      attrezzatura,
      prodotto_output_id,
      ricette_output (
        peso_finale,
        unita_misura
      )
    `)
    .eq("azienda_id", state.azienda_id)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.error("Errore loadRicette:", error);
    state.ricette = [];
    return;
  }

  state.ricette = (data || []).map((r) => {
    const output = Array.isArray(r.ricette_output)
      ? r.ricette_output[0] || null
      : r.ricette_output || null;

    return {
      id: r.id,
      nome: r.nome,
      pezzi_base: r.pezzi_base,
      attrezzatura: r.attrezzatura || null,
      prodotto_output_id: r.prodotto_output_id,
      resa_teorica: output?.peso_finale ?? null,
      resa_unita: output?.unita_misura || "kg"
    };
  });
}

async function loadRicettaDettagli(ricettaId) {
  await Promise.all([
    loadPorzioni(ricettaId),
    loadScenari(ricettaId),
    loadFasiRicetta(ricettaId)
  ]);
}

async function loadFasiRicetta(ricettaId) {
  const supabase = window.supabaseClient;
  if (!supabase || !state.azienda_id || !ricettaId) return;

  const { data, error } = await supabase
    .from("ricette_preparazione_fasi")
    .select("id, ordine, nome_fase, tipo_fase, descrizione_operativa, tecnologia, temperatura, durata_min, lavoro_umano_min, note, dispositivo_id")
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", state.azienda_id)
    .order("ordine", { ascending: true });

  if (error) { console.error(error); state.fasi = []; return; }
  state.fasi = data || [];

  // Carica info dispositivi unici usati nelle fasi
  const dispIds = [...new Set(state.fasi.map(f => f.dispositivo_id).filter(Boolean))];
  state.dispositivi = {};
  if (dispIds.length) {
    const { data: disps } = await supabase
      .from("dispositivi")
      .select("id, nome, tipo, connesso, temperatura_min, temperatura_max, marca, modello, api_endpoint, topic_mqtt")
      .in("id", dispIds);
    (disps || []).forEach(d => { state.dispositivi[d.id] = d; });
  }

  // inizializza log HACCP per ogni fase
  state.logHaccp = state.fasi.map(f => {
    const disp = f.dispositivo_id ? (state.dispositivi[f.dispositivo_id] || null) : null;
    const automatico = disp?.connesso === true;
    return {
      fase_id: f.id,
      fase_ordine: f.ordine,
      fase_nome: f.nome_fase || f.tipo_fase || `Fase ${f.ordine}`,
      fase_tipo: f.tipo_fase,
      dispositivo_id: f.dispositivo_id || null,
      dispositivo: disp,
      fonte_dato: automatico ? "automatico" : "manuale",
      tecnologia_prevista: disp ? disp.nome : (f.tecnologia || ""),
      temperatura_prevista: f.temperatura ?? null,
      temperatura_min: disp?.temperatura_min ?? null,
      temperatura_max: disp?.temperatura_max ?? null,
      temperatura_rilevata: "",
      ora_inizio: "",
      ora_fine: "",
      esito: "ok",
      note: "",
      firmato: false,
      firmato_da: "",
      firmato_il: ""
    };
  });

  renderFasiHaccp();
}

async function loadPorzioni(ricettaId) {
  const supabase = window.supabaseClient;
  if (!supabase || !state.azienda_id || !ricettaId) return;

  const { data, error } = await supabase
    .from("ricette_porzione")
    .select("id, label, peso_porzione, unita_misura, note")
    .eq("azienda_id", state.azienda_id)
    .eq("ricetta_id", ricettaId)
    .eq("attivo", true)
    .order("label");

  if (error) {
    console.error("Errore loadPorzioni:", error);
    state.porzioni = [];
    return;
  }

  state.porzioni = data || [];
}

async function loadScenari(ricettaId) {
  const supabase = window.supabaseClient;
  if (!supabase || !state.azienda_id || !ricettaId) return;

  const { data, error } = await supabase
    .from("ricette_conservazione")
    .select("*")
    .eq("azienda_id", state.azienda_id)
    .eq("ricetta_id", ricettaId)
    .eq("attivo", true)
    .order("scenario_label");

  if (error) {
    console.error("Errore loadScenari:", error);
    state.scenari = [];
    return;
  }

  state.scenari = data || [];
}

async function resolveOperatoreByPin(pin) {
  const supabase = window.supabaseClient;
  if (!supabase || !state.azienda_id || !pin) return null;

  let res = await supabase
    .from("dipendenti")
    .select("id, nome, pin, codice")
    .eq("azienda_id", state.azienda_id)
    .eq("attivo", true)
    .eq("pin", pin)
    .maybeSingle();

  if (!res.error && res.data) return res.data;

  res = await supabase
    .from("dipendenti")
    .select("id, nome, codice")
    .eq("azienda_id", state.azienda_id)
    .eq("attivo", true)
    .eq("codice", pin)
    .maybeSingle();

  if (!res.error && res.data) return res.data;

  return null;
}

// ============================================================
// RENDER UI PARTS
// ============================================================

function renderRicetteSelect() {
  const select = document.getElementById("app-prod-ricetta");
  if (!select) return;

  if (!state.ricette.length) {
    select.innerHTML = `<option value="">Nessuna ricetta disponibile</option>`;
    return;
  }

  select.innerHTML = `
    <option value="">Seleziona ricetta...</option>
    ${state.ricette.map((r) => `
      <option value="${escapeAttr(r.id)}">${escapeHtml(r.nome)}</option>
    `).join("")}
  `;
}

function renderScenarioSelect() {
  const select = document.getElementById("app-prod-scenario");
  if (!select) return;

  if (!state.ricetta) {
    select.disabled = true;
    select.innerHTML = `<option value="">Seleziona ricetta...</option>`;
    return;
  }

  if (!state.scenari.length) {
    select.disabled = true;
    select.innerHTML = `<option value="">Nessuno scenario disponibile</option>`;
    return;
  }

  select.disabled = false;
  select.innerHTML = `
    <option value="">Seleziona scenario...</option>
    ${state.scenari.map((s) => `
      <option value="${escapeAttr(s.id)}" ${String(s.id) === String(state.produzione.scenario_id) ? "selected" : ""}>
        ${escapeHtml(s.scenario_label || "Scenario")} (${Number(s.shelf_life_giorni || 0)} gg)
      </option>
    `).join("")}
  `;
}

function renderConfezioni() {
  const wrap = document.getElementById("app-prod-confezioni");
  if (!wrap) return;

  const btnAdd = document.getElementById("btn-app-add-confezione");

  // 🔴 Nessuna ricetta
  if (!state.ricetta) {
    wrap.innerHTML = `<div class="form-help">Seleziona una ricetta per gestire il confezionamento.</div>`;
    if (btnAdd) btnAdd.disabled = true;
    return;
  }

  // 🟡 Nessuna porzionatura → modalità manuale
  const manualMode = !state.porzioni.length;

  if (btnAdd) btnAdd.disabled = false;

  if (manualMode && !state.confezioni.length) {
    wrap.innerHTML = `
      <div class="form-help" style="color:#f59e0b;">
        ⚠️ Questa ricetta NON ha porzionature configurate.<br>
        Puoi comunque inserire confezioni manuali.<br>
        👉 Consigliato completare la scheda ricetta.
      </div>
    `;
    return;
  }

  if (!state.confezioni.length) {
    wrap.innerHTML = `<div class="form-help">Nessuna confezione inserita. Premi “+ Aggiungi confezione”.</div>`;
    return;
  }

  wrap.innerHTML = state.confezioni.map((row, idx) => {

    let pesoPorzioneKg = 0;
    let label = "";

    if (!manualMode) {
      const porzione = state.porzioni.find((p) => String(p.id) === String(row.porzione_id)) || null;
      pesoPorzioneKg = porzione ? toKg(porzione.peso_porzione, porzione.unita_misura) : 0;
      label = porzione?.label || "";
    } else {
      pesoPorzioneKg = toNumber(row.peso_manuale || 0);
      label = "Manuale";
    }

    const pezzi = Math.max(0, Math.floor(toNumber(row.pezzi_per_confezione)));
    const numConf = Math.max(0, Math.floor(toNumber(row.numero_confezioni)));
    const kgConf = pesoPorzioneKg * pezzi;
    const kgTot = kgConf * numConf;

    return `
      <div class="card menu-card" data-conf-idx="${idx}">
        <div class="form-grid">

          ${
            !manualMode
              ? `
          <div class="form-group">
            <label>Porzionatura</label>
            <select class="input" data-field="porzione_id">
              <option value="">Seleziona...</option>
              ${state.porzioni.map((p) => `
                <option value="${escapeAttr(p.id)}" ${String(p.id) === String(row.porzione_id) ? "selected" : ""}>
                  ${escapeHtml(p.label || "Porzione")} (${formatNumber(toKg(p.peso_porzione, p.unita_misura))} kg)
                </option>
              `).join("")}
            </select>
          </div>
          `
              : `
          <div class="form-group">
            <label>Peso unità (kg)</label>
            <input class="input" type="number" step="0.001" data-field="peso_manuale" value="${escapeAttr(row.peso_manuale || "")}" />
          </div>
          `
          }

          <div class="form-group">
            <label>Pezzi per confezione</label>
            <input class="input" type="number" min="0" step="1" data-field="pezzi_per_confezione" value="${escapeAttr(row.pezzi_per_confezione)}" />
          </div>

          <div class="form-group">
            <label>Numero confezioni</label>
            <input class="input" type="number" min="0" step="1" data-field="numero_confezioni" value="${escapeAttr(row.numero_confezioni)}" />
          </div>

          <div class="form-group">
            <label>Kg per confezione</label>
            <input class="input" readonly value="${formatNumber(kgConf)} kg" />
          </div>

          <div class="form-group">
            <label>Kg totali riga</label>
            <input class="input" readonly value="${formatNumber(kgTot)} kg" />
          </div>

          <div class="form-group">
            <label>Note confezione</label>
            <input class="input" data-field="note" value="${escapeAttr(row.note || "")}" placeholder="Opzionale" />
          </div>

        </div>

        <div class="form-actions">
          <button type="button" class="app-button secondary" data-action="remove-conf">
            Rimuovi
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// ============================================================
// HACCP — CARD E LOGICA
// ============================================================

function renderCardHaccp() {
  return createCard({
    title: "3. Processo & Registro HACCP",
    body: `
      <div id="haccp-empty" style="color:#94a3b8;font-size:13px;font-style:italic;">
        Seleziona una ricetta per vedere le fasi di produzione.
      </div>
      <div id="haccp-fasi-wrap" style="display:none;">
        <div style="font-size:13px;color:#64748b;margin-bottom:12px;">
          Registra temperatura, orari e firma per ogni fase. Il sistema genera automaticamente il registro HACCP del lotto.
        </div>
        <div id="haccp-fasi-list"></div>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
          <button id="btn-haccp-salva" class="app-button secondary" type="button">
            💾 Salva registro HACCP
          </button>
          <button id="btn-haccp-stampa" class="app-button gray small" type="button">
            🖨️ Stampa registro
          </button>
        </div>
        <div id="haccp-esito" style="font-size:13px;margin-top:8px;min-height:16px;"></div>
      </div>
    `
  });
}

function renderFasiHaccp() {
  const empty = document.getElementById("haccp-empty");
  const wrap = document.getElementById("haccp-fasi-wrap");
  const list = document.getElementById("haccp-fasi-list");

  if (!wrap || !list) return;

  if (!state.fasi.length) {
    if (empty) empty.style.display = "";
    wrap.style.display = "none";
    return;
  }

  if (empty) empty.style.display = "none";
  wrap.style.display = "";

  list.innerHTML = state.fasi.map((f, idx) => {
    const log = state.logHaccp[idx];
    const automatico = log.fonte_dato === "automatico";
    const disp = log.dispositivo;
    const hasTempPrevista = f.temperatura != null || disp?.temperatura_min != null;
    const tempPrevLabel = f.temperatura != null ? `${f.temperatura}°C` :
      (disp?.temperatura_min != null && disp?.temperatura_max != null)
        ? `${disp.temperatura_min}–${disp.temperatura_max}°C`
        : disp?.temperatura_min != null ? `min ${disp.temperatura_min}°C` : null;

    // Badge dispositivo
    const dispBadge = disp
      ? automatico
        ? `<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:20px;font-size:12px;">🤖 ${escapeAttr(disp.nome)} — Automatico</span>`
        : `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:12px;">✋ ${escapeAttr(disp.nome)} — Manuale</span>`
      : `<span style="background:#f1f5f9;color:#64748b;padding:3px 10px;border-radius:20px;font-size:12px;">✋ Nessun dispositivo — Manuale</span>`;

    // Se automatico: i campi sono in sola lettura con placeholder "in attesa dati..."
    const inputStyle = automatico ? `background:#f0fdf4;color:#166534;` : "";
    const inputReadonly = automatico ? "readonly" : "";
    const placeholderTemp = automatico ? "In attesa dal dispositivo..." : "es. 72.5";

    return `
      <div class="haccp-fase-card" data-idx="${idx}" style="
        border:1px solid #e2e8f0;
        border-radius:12px;
        padding:14px 16px;
        margin-bottom:12px;
        background:#f8fafc;
        border-left:4px solid ${f.tipo_fase === 'cottura' ? '#f97316' : f.tipo_fase === 'raffreddamento' ? '#0ea5e9' : '#0E5A7A'};
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <span style="font-weight:700;font-size:15px;">Fase ${f.ordine} — ${escapeAttr(f.nome_fase || f.tipo_fase)}</span>
            <span style="margin-left:8px;font-size:12px;color:#64748b;">${tipoLabel}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            ${dispBadge}
            ${tempPrevLabel ? `<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:20px;font-size:12px;">🌡 prevista: ${tempPrevLabel}</span>` : ""}
            ${f.durata_min ? `<span style="background:#f0fdf4;color:#166534;padding:3px 8px;border-radius:20px;font-size:12px;">⏱ ${f.durata_min} min</span>` : ""}
          </div>
        </div>

        ${f.descrizione_operativa ? `
        <div style="background:#fff;border-radius:8px;padding:10px 12px;font-size:13px;color:#374151;margin-bottom:12px;border:1px solid #e5e7eb;">
          📋 ${escapeAttr(f.descrizione_operativa)}
        </div>` : ""}

        ${automatico ? `
        <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:10px 12px;font-size:13px;color:#15803d;margin-bottom:12px;">
          🤖 I dati di questa fase vengono registrati automaticamente da <strong>${escapeAttr(disp.nome)}</strong>.
          Puoi comunque aggiungere note o correggere manualmente.
        </div>` : ""}

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">

          <div>
            <label style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Ora inizio</label>
            <input type="datetime-local" class="input haccp-ora-inizio" data-idx="${idx}"
              value="${escapeAttr(log.ora_inizio || '')}" ${inputReadonly}
              style="margin-top:4px;font-size:14px;${inputStyle}">
          </div>

          <div>
            <label style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Ora fine</label>
            <input type="datetime-local" class="input haccp-ora-fine" data-idx="${idx}"
              value="${escapeAttr(log.ora_fine || '')}" ${inputReadonly}
              style="margin-top:4px;font-size:14px;${inputStyle}">
          </div>

          ${hasTempPrevista ? `
          <div>
            <label style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Temp. rilevata (°C)</label>
            <input type="number" step="0.1" class="input haccp-temp" data-idx="${idx}"
              value="${escapeAttr(String(log.temperatura_rilevata || ''))}"
              placeholder="${placeholderTemp}" ${inputReadonly}
              style="margin-top:4px;font-size:14px;${inputStyle}">
          </div>` : ""}

          <div>
            <label style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Esito</label>
            <select class="input haccp-esito" data-idx="${idx}" style="margin-top:4px;font-size:14px;">
              <option value="ok" ${log.esito === 'ok' ? 'selected' : ''}>✅ OK</option>
              <option value="attenzione" ${log.esito === 'attenzione' ? 'selected' : ''}>⚠️ Attenzione</option>
              <option value="nc" ${log.esito === 'nc' ? 'selected' : ''}>❌ Non conforme</option>
            </select>
          </div>

        </div>

        <div style="margin-top:10px;">
          <label style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Note fase</label>
          <input type="text" class="input haccp-note" data-idx="${idx}"
            value="${escapeAttr(log.note || '')}"
            placeholder="Annotazioni, deviazioni, azioni correttive..."
            style="margin-top:4px;font-size:14px;">
        </div>

        <div style="margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button type="button" class="app-button small haccp-firma-btn ${log.firmato ? 'gray' : ''}" data-idx="${idx}">
            ${log.firmato ? `✅ Firmato — ${escapeAttr(log.firmato_da || '')}` : '✍️ Firma fase'}
          </button>
          ${log.firmato ? `<span style="font-size:12px;color:#64748b;">${escapeAttr(log.firmato_il || '')}</span>` : ''}
        </div>

      </div>
    `;
  }).join("");

  // bind eventi
  list.querySelectorAll(".haccp-ora-inizio").forEach(el => {
    el.addEventListener("change", e => {
      const idx = Number(e.target.dataset.idx);
      state.logHaccp[idx].ora_inizio = e.target.value;
      calcolaDurataReale(idx);
    });
  });
  list.querySelectorAll(".haccp-ora-fine").forEach(el => {
    el.addEventListener("change", e => {
      const idx = Number(e.target.dataset.idx);
      state.logHaccp[idx].ora_fine = e.target.value;
      calcolaDurataReale(idx);
    });
  });
  list.querySelectorAll(".haccp-temp").forEach(el => {
    el.addEventListener("input", e => {
      const idx = Number(e.target.dataset.idx);
      state.logHaccp[idx].temperatura_rilevata = e.target.value;
      verificaTemperatura(idx, el);
    });
  });
  list.querySelectorAll(".haccp-esito").forEach(el => {
    el.addEventListener("change", e => {
      const idx = Number(e.target.dataset.idx);
      state.logHaccp[idx].esito = e.target.value;
    });
  });
  list.querySelectorAll(".haccp-note").forEach(el => {
    el.addEventListener("input", e => {
      const idx = Number(e.target.dataset.idx);
      state.logHaccp[idx].note = e.target.value;
    });
  });
  list.querySelectorAll(".haccp-firma-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = Number(btn.dataset.idx);
      firmaFase(idx);
    });
  });

  // btn salva e stampa
  document.getElementById("btn-haccp-salva")?.addEventListener("click", salvaLogHaccp);
  document.getElementById("btn-haccp-stampa")?.addEventListener("click", stampaRegistroHaccp);
}

function calcolaDurataReale(idx) {
  const log = state.logHaccp[idx];
  if (!log.ora_inizio || !log.ora_fine) return;
  const start = new Date(log.ora_inizio);
  const end = new Date(log.ora_fine);
  const diffMin = (end - start) / 60000;
  log.durata_reale_min = diffMin > 0 ? Math.round(diffMin * 10) / 10 : 0;
}

function verificaTemperatura(idx, inputEl) {
  const log = state.logHaccp[idx];
  const fase = state.fasi[idx];
  if (!fase?.temperatura || !log.temperatura_rilevata) {
    inputEl.style.borderColor = "";
    return;
  }
  const rilevata = Number(log.temperatura_rilevata);
  const prevista = Number(fase.temperatura);
  const scarto = Math.abs(rilevata - prevista);
  const ok = scarto <= 3; // tolleranza ±3°C
  inputEl.style.borderColor = ok ? "#22c55e" : "#ef4444";
  log.temperatura_ok = ok;
  if (!ok && log.esito === "ok") {
    log.esito = "attenzione";
    // aggiorna select
    const sel = inputEl.closest(".haccp-fase-card")?.querySelector(".haccp-esito");
    if (sel) sel.value = "attenzione";
  }
}

function firmaFase(idx) {
  const operatore = document.getElementById("app-prod-operatore")?.value?.trim();
  if (!operatore) {
    alert("Inserisci prima il PIN operatore per firmare.");
    return;
  }
  const log = state.logHaccp[idx];
  log.firmato = true;
  log.firmato_da = operatore;
  log.firmato_il = new Date().toLocaleString("it-IT");
  // Imposta automaticamente ora fine se non compilata
  if (!log.ora_fine) {
    const now = new Date();
    const iso = now.toISOString().slice(0, 16);
    log.ora_fine = iso;
    calcolaDurataReale(idx);
  }
  renderFasiHaccp();
}

async function salvaLogHaccp() {
  const supabase = window.supabaseClient;
  const esito = document.getElementById("haccp-esito");
  if (!state.ricetta?.id) { if(esito) esito.textContent = "Seleziona prima una ricetta."; return; }
  if (!state.logHaccp.length) { if(esito) esito.textContent = "Nessuna fase da registrare."; return; }

  if (esito) esito.textContent = "Salvataggio...";

  const operatoreNome = document.getElementById("app-prod-operatore")?.value?.trim() || null;
  const lotto_id = state.savedLotto?.id || null;

  const rows = state.logHaccp.map(log => ({
    azienda_id: state.azienda_id,
    sede_id: state.sede_id,
    lotto_id,
    ricetta_id: state.ricetta.id,
    fase_id: log.fase_id || null,
    fase_ordine: log.fase_ordine,
    fase_nome: log.fase_nome,
    fase_tipo: log.fase_tipo,
    dispositivo_id: log.dispositivo_id || null,
    fonte_dato: log.fonte_dato || "manuale",
    tecnologia_prevista: log.tecnologia_prevista || null,
    temperatura_prevista: log.temperatura_prevista ?? null,
    operatore_nome: operatoreNome,
    temperatura_rilevata: log.temperatura_rilevata !== "" ? Number(log.temperatura_rilevata) : null,
    temperatura_ok: log.temperatura_ok ?? null,
    ora_inizio: log.ora_inizio ? new Date(log.ora_inizio).toISOString() : null,
    ora_fine: log.ora_fine ? new Date(log.ora_fine).toISOString() : null,
    durata_reale_min: log.durata_reale_min ?? null,
    esito: log.esito || "ok",
    note: log.note || null,
    firmato_da: log.firmato_da || null,
    firmato_il: log.firmato ? new Date().toISOString() : null
  }));

  const { error } = await supabase.from("produzione_log_haccp").insert(rows);

  if (error) {
    console.error(error);
    if (esito) { esito.textContent = "❌ Errore salvataggio HACCP"; esito.style.color = "#dc2626"; }
    return;
  }

  if (esito) { esito.textContent = "✅ Registro HACCP salvato"; esito.style.color = "#16a34a"; }
}

function stampaRegistroHaccp() {
  const azienda = window.state?.azienda;
  const nomeRicetta = state.ricetta?.nome || "—";
  const dataOggi = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  const operatore = document.getElementById("app-prod-operatore")?.value?.trim() || "—";
  const lotto = state.savedLottoRef || "—";

  const righe = state.logHaccp.map((log, idx) => {
    const fase = state.fasi[idx];
    const esitoIcon = { ok: "✅", attenzione: "⚠️", nc: "❌" }[log.esito] || "";
    const tempPrev = fase?.temperatura != null ? `${fase.temperatura}°C` : "—";
    const tempRil = log.temperatura_rilevata !== "" ? `${log.temperatura_rilevata}°C` : "—";
    return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 8px;font-weight:600;">${log.fase_ordine}</td>
        <td style="padding:10px 8px;">${escapeAttr(log.fase_nome)}</td>
        <td style="padding:10px 8px;font-size:12px;color:#64748b;">${escapeAttr(log.tecnologia_prevista || "—")}</td>
        <td style="padding:10px 8px;text-align:center;">${tempPrev}</td>
        <td style="padding:10px 8px;text-align:center;font-weight:700;color:${log.temperatura_ok === false ? '#dc2626' : '#16a34a'}">${tempRil}</td>
        <td style="padding:10px 8px;font-size:12px;">${log.ora_inizio ? new Date(log.ora_inizio).toLocaleTimeString("it-IT", {hour:"2-digit",minute:"2-digit"}) : "—"}</td>
        <td style="padding:10px 8px;font-size:12px;">${log.ora_fine ? new Date(log.ora_fine).toLocaleTimeString("it-IT", {hour:"2-digit",minute:"2-digit"}) : "—"}</td>
        <td style="padding:10px 8px;font-size:12px;">${log.durata_reale_min != null ? `${log.durata_reale_min} min` : "—"}</td>
        <td style="padding:10px 8px;text-align:center;">${esitoIcon}</td>
        <td style="padding:10px 8px;font-size:11px;color:#64748b;">${escapeAttr(log.note || "")}</td>
        <td style="padding:10px 8px;font-size:11px;">${escapeAttr(log.firmato_da || "—")}</td>
      </tr>`;
  }).join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
    <title>Registro HACCP — ${escapeAttr(nomeRicetta)}</title>
    <style>
      * { box-sizing: border-box; margin:0; padding:0; font-family: Arial, sans-serif; }
      body { padding: 32px; color: #1a1a2e; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .sub { font-size: 13px; color: #64748b; margin-bottom: 20px; }
      .meta { display:grid; grid-template-columns: repeat(4,1fr); gap:12px; margin-bottom:24px; }
      .meta-item { background:#f8fafc; border-radius:8px; padding:10px; }
      .meta-label { font-size:10px; text-transform:uppercase; color:#64748b; letter-spacing:1px; }
      .meta-value { font-size:15px; font-weight:700; margin-top:3px; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th { background:#0E5A7A; color:white; padding:10px 8px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; }
      .firma-box { margin-top:32px; display:flex; justify-content:flex-end; gap:40px; }
      .firma-line { border-top: 1px solid #1a1a2e; width:200px; text-align:center; padding-top:6px; font-size:11px; color:#64748b; }
      @media print { body { padding:16px; } .no-print { display:none; } }
    </style></head><body>
    <div class="no-print" style="text-align:center;padding:12px;background:#f8fafc;margin-bottom:16px;">
      <button onclick="window.print()" style="background:#0E5A7A;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">🖨️ Stampa / Salva PDF</button>
    </div>
    <h1>Registro HACCP Produzione</h1>
    <div class="sub">${escapeAttr(azienda?.nome || "")} — Generato il ${dataOggi}</div>
    <div class="meta">
      <div class="meta-item"><div class="meta-label">Ricetta</div><div class="meta-value">${escapeAttr(nomeRicetta)}</div></div>
      <div class="meta-item"><div class="meta-label">Lotto</div><div class="meta-value">${escapeAttr(lotto)}</div></div>
      <div class="meta-item"><div class="meta-label">Data</div><div class="meta-value">${dataOggi}</div></div>
      <div class="meta-item"><div class="meta-label">Responsabile</div><div class="meta-value">${escapeAttr(operatore)}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>Fase</th><th>Attrezzatura</th><th>T° prevista</th><th>T° rilevata</th>
        <th>Inizio</th><th>Fine</th><th>Durata</th><th>Esito</th><th>Note</th><th>Firma</th>
      </tr></thead>
      <tbody>${righe}</tbody>
    </table>
    <div class="firma-box">
      <div class="firma-line">Firma responsabile produzione</div>
      <div class="firma-line">Firma responsabile HACCP</div>
    </div>
    </body></html>`);
  win.document.close();
}

function aggiornaRicettaInfo() {
  const el = document.getElementById("app-prod-ricetta-info");
  if (!el) return;

  if (!state.ricetta) {
    el.innerText = "Seleziona una ricetta.";
    return;
  }

  const resa = state.ricetta.resa_teorica != null
    ? `Resa teorica: ${state.ricetta.resa_teorica} ${state.ricetta.resa_unita || "kg"}`
    : "";

  el.innerHTML = [
    `<strong>${state.ricetta.nome}</strong>`,
    resa
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");
}

function aggiornaScenarioInfo() {
  const el = document.getElementById("app-prod-scenario-info");
  const temp = document.getElementById("app-prod-temperatura");
  if (!el) return;

  const scenario = getScenarioSelezionato();

  if (!scenario) {
    el.innerText = "Lo scenario determina la scadenza del lotto.";
    if (temp) temp.value = "";
    return;
  }

  if (temp) temp.value = scenario.temperatura || "";

  const parti = [
    scenario.scenario_label || "Scenario",
    scenario.abbattimento ? `Abbattimento: ${scenario.abbattimento}` : "",
    scenario.confezionamento ? `Confezionamento: ${scenario.confezionamento}` : "",
    scenario.temperatura ? `Temperatura: ${scenario.temperatura}` : "",
    `Shelf life: ${Number(scenario.shelf_life_giorni || 0)} giorni`
  ].filter(Boolean);

  el.innerText = parti.join(" — ");
}

function aggiornaTotali() {
  const el = document.getElementById("app-prod-totali");
  const kgEl = document.getElementById("app-prod-peso-kg");
  if (!el) return;

  const totale = getTotaleConfezionatoKg();
  const peso = state.produzione.peso_reale_kg || 0;
  const diff = peso - totale;

  if (kgEl) kgEl.value = `${formatNumber(peso)} kg`;

  el.innerHTML = `
    Quantità prodotta: <strong>${formatNumber(peso)} kg</strong><br>
    Totale confezionato: <strong>${formatNumber(totale)} kg</strong><br>
    Differenza: <strong>${formatNumber(diff)} kg</strong>
  `;
}

function aggiornaAlert() {
  const el = document.getElementById("app-prod-alert");
  if (!el) return;

  const alerts = [];
  const peso = state.produzione.peso_reale_kg || 0;
  const totale = getTotaleConfezionatoKg();
  const diff = peso - totale;

  if (!state.ricetta) alerts.push("Seleziona una ricetta.");
  if (!state.operatore?.id) alerts.push("Inserisci un PIN operatore valido.");
  if (!state.produzione.scenario_id) alerts.push("Seleziona uno scenario conservazione.");
  if (!peso || peso <= 0) alerts.push("Inserisci la quantità prodotta.");
  if (!state.confezioni.length) alerts.push("Aggiungi almeno una confezione.");

  if (peso > 0 && totale > 0 && Math.abs(diff) > 0.2) {
    alerts.push(`Differenza quantità/confezionato: ${formatNumber(diff)} kg.`);
  }

  const valide = getConfezioniValide();
  if (state.confezioni.length && !valide.length) {
    alerts.push("Le confezioni inserite non sono valide.");
  }

  if (!alerts.length) {
    el.innerHTML = `<span style="color:#16a34a;">✅ Nessun problema rilevato</span>`;
    return;
  }

  el.innerHTML = `
    <div style="color:#dc2626;">
      ${alerts.map((a) => `<div>⚠️ ${escapeHtml(a)}</div>`).join("")}
    </div>
  `;
}

// ============================================================
// EVENTS
// ============================================================

function bindEvents() {

  const on = (id, event, handler) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(event, handler);
  };

  // ============================================================
  // BASE FORM
  // ============================================================

  on("app-prod-ricetta", "change", onRicettaChange);
  on("app-prod-data", "change", onDataChange);
  on("app-prod-pin", "input", onPinInput);
  on("app-prod-quantita", "input", onQuantitaInput);
  on("app-prod-um", "change", onUnitaInput);
  on("app-prod-scenario", "change", onScenarioChange);
  on("app-prod-note", "input", onNoteInput);

  // 👁 VIEW RICETTA
  on("btn-view-ricetta", "click", () => {
    if (!state.ricetta?.id) {
      alert("Seleziona una ricetta prima");
      return;
    }
   window.location.hash = "#/bo-ricette?id=" + state.ricetta.id;
  });

  // ============================================================
  // CONFEZIONAMENTO
  // ============================================================

  on("btn-app-add-confezione", "click", addConfezione);

  const confWrap = document.getElementById("app-prod-confezioni");
  if (confWrap) {
    confWrap.addEventListener("input", onConfezioneInput);
    confWrap.addEventListener("change", onConfezioneInput);
    confWrap.addEventListener("click", onConfezioneClick);
  }

  // ============================================================
  // PRODUZIONE
  // ============================================================

  on("btn-app-salva-produzione", "click", salvaProduzione);

  // 🏷 STAMPA (INTELLIGENTE)
  on("btn-app-open-stampa", "click", () => {
    if (!state.savedLotto) {
      alert("⚠️ Devi prima registrare la produzione.");
      return;
    }
    openPrintModal();
  });

  on("btn-app-print-labels", "click", stampaEtichetteConfezioni);

  // ============================================================
  // MODAL
  // ============================================================

  on("app-print-close", "click", closePrintModal);

  const backdrop = document.getElementById("app-print-backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target?.id === "app-print-backdrop") {
        closePrintModal();
      }
    });
  }

}
async function onRicettaChange(e) {
  const ricettaId = e.target.value || "";

  // 🔄 Reset base
  state.ricetta = state.ricette.find((r) => String(r.id) === String(ricettaId)) || null;
  state.porzioni = [];
  state.scenari = [];
  state.confezioni = [];

  state.produzione.scenario_id = "";
  state.produzione.data_scadenza = "";

  // 🔘 Bottoni
  const btnAdd = document.getElementById("btn-app-add-confezione");
  if (btnAdd) btnAdd.disabled = !state.ricetta;

  const btnView = document.getElementById("btn-view-ricetta");
  if (btnView) btnView.disabled = !state.ricetta;

  // 🔄 UI immediata (evita lag percepito)
  renderScenarioSelect();
  renderConfezioni();
  aggiornaRicettaInfo();
  aggiornaScenarioInfo();
  aggiornaScadenza();
  aggiornaTotali();
  aggiornaAlert();

  // 📦 Caricamento dati ricetta
  if (state.ricetta) {
    try {
      await loadRicettaDettagli(state.ricetta.id);
    } catch (err) {
      console.error("Errore caricamento ricetta:", err);
    }
  }

  // 🔄 Re-render con dati reali
  renderScenarioSelect();
  renderConfezioni();
  aggiornaRicettaInfo();
  aggiornaScenarioInfo();
  aggiornaScadenza();
  aggiornaTotali();
  aggiornaAlert();
}
function onDataChange(e) {
  state.produzione.data_produzione = e.target.value || "";
  aggiornaScadenza();
  aggiornaAlert();
}

async function onPinInput(e) {
  const pin = (e.target.value || "").trim();
  const out = document.getElementById("app-prod-operatore");

  if (!pin) {
    state.operatore = null;
    if (out) out.value = "";
    aggiornaAlert();
    return;
  }

  const operatore = await resolveOperatoreByPin(pin);
  state.operatore = operatore;

  if (out) out.value = operatore ? operatore.nome : "PIN non valido";

  aggiornaAlert();
}

function onQuantitaInput(e) {
  state.produzione.quantita_prodotta = toNumber(e.target.value);
  state.produzione.peso_reale_kg = toKg(
    state.produzione.quantita_prodotta,
    state.produzione.unita_misura
  );

  aggiornaTotali();
  aggiornaAlert();
}

function onUnitaInput(e) {
  state.produzione.unita_misura = e.target.value || "kg";
  state.produzione.peso_reale_kg = toKg(
    state.produzione.quantita_prodotta,
    state.produzione.unita_misura
  );

  aggiornaTotali();
  aggiornaAlert();
}

function onScenarioChange(e) {
  state.produzione.scenario_id = e.target.value || "";
  aggiornaScadenza();
  aggiornaScenarioInfo();
  aggiornaAlert();
}

function onNoteInput(e) {
  state.produzione.note = e.target.value || "";
}

function onConfezioneInput(e) {
  const target = e.target;
  const card = target.closest("[data-conf-idx]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-conf-idx"));
  const field = target.getAttribute("data-field");

  if (!field || !state.confezioni[idx]) return;

  if (["pezzi_per_confezione", "numero_confezioni"].includes(field)) {
    state.confezioni[idx][field] = Math.max(0, Math.floor(toNumber(target.value)));
  } else {
    state.confezioni[idx][field] = target.value || "";
  }

  renderConfezioni();
  aggiornaTotali();
  aggiornaAlert();
}

function onConfezioneClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const card = btn.closest("[data-conf-idx]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-conf-idx"));

  if (btn.dataset.action === "remove-conf") {
    state.confezioni.splice(idx, 1);
    renderConfezioni();
    aggiornaTotali();
    aggiornaAlert();
  }
}

// ============================================================
// MUTATIONS
// ============================================================

function addConfezione() {
  if (!state.ricetta) return;

  state.confezioni.push({
    porzione_id: "",
    pezzi_per_confezione: 1,
    numero_confezioni: 1,
    note: ""
  });

  renderConfezioni();
  aggiornaTotali();
  aggiornaAlert();
}

// ============================================================
// SAVE
// ============================================================

async function salvaProduzione() {
  const result = document.getElementById("app-prod-result");
  setResult(result, "");

  const err = validaProduzione();
  if (err) {
    setResult(result, err, true);
    return;
  }

  try {
    const lotto = await creaLottoProduzione({
      ricetta: state.ricetta,

      dati: {
        dataProduzione: state.produzione.data_produzione,
        pesoRealeKg: state.produzione.peso_reale_kg,
        scenarioId: state.produzione.scenario_id,
        scadenza: state.produzione.data_scadenza,
        noteLotto: state.produzione.note,
        operatore: state.operatore
      },

      confezioni: getConfezioniValide(),
      coprodotti: [],
      porzioniCache: state.porzioni,
      scenariConservazione: state.scenari
    });

    state.savedLotto = lotto;
    state.savedLottoRef = lotto.lotto_uuid || lotto.id;
    state.savedLabels = buildLabelsForPrint();

    setResult(
      result,
      `✅ Produzione registrata. Lotto: ${escapeHtml(lotto.codice_lotto || lotto.id)}`,
      false
    );

    lockUIAfterSave();
    openPrintModal();

  } catch (error) {
    console.error("Errore produzione:", error);
    setResult(
      result,
      `❌ Errore: ${escapeHtml(error.message || "salvataggio non riuscito")}`,
      true
    );
  }
}

function validaProduzione() {
  if (!window.supabaseClient) return "Supabase non inizializzato.";
  if (!state.azienda_id) return "Azienda non trovata.";
  if (!state.ricetta?.id) return "Seleziona una ricetta.";
  if (!state.operatore?.id) return "Inserisci un PIN operatore valido.";
  if (!state.produzione.data_produzione) return "Inserisci la data produzione.";
  if (!state.produzione.peso_reale_kg || state.produzione.peso_reale_kg <= 0) return "Inserisci la quantità prodotta.";
  if (!state.produzione.scenario_id) return "Seleziona uno scenario di conservazione.";
  if (!state.produzione.data_scadenza) return "La scadenza non è stata calcolata.";
  if (!state.ricetta.prodotto_output_id) return "La ricetta non ha prodotto output collegato.";

  const valide = getConfezioniValide();
  if (!valide.length) return "Inserisci almeno una confezione valida.";

  return null;
}

function lockUIAfterSave() {

  // 🔒 Blocca tutti i campi input
  document.querySelectorAll("input, select").forEach((el) => {
    el.disabled = true;
  });

  // 🔒 Bottone salva
  const saveBtn = document.getElementById("btn-app-salva-produzione");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.classList.add("disabled");
  }

  // 🔒 Bottone aggiungi confezione
  const addBtn = document.getElementById("btn-app-add-confezione");
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.classList.add("disabled");
  }

  // 🔓 Bottone stampa (ATTIVO SOLO DOPO SALVATAGGIO)
  const printBtn = document.getElementById("btn-app-open-stampa");
  if (printBtn) {
    printBtn.disabled = false;
    printBtn.classList.remove("disabled");

    // opzionale: evidenzia visivamente
    printBtn.style.opacity = "1";
    printBtn.style.cursor = "pointer";
  }

  // 🧠 Debug utile (puoi toglierlo dopo)
  console.log("UI bloccata, stampa attiva");
}

// ============================================================
// PRINT
// ============================================================

function openPrintModal() {
  if (!state.savedLotto) {
    alert("Salva prima la produzione.");
    return;
  }

  const info = document.getElementById("app-print-info");
  if (info) {
    info.innerHTML = `
      Lotto: <strong>${escapeHtml(state.savedLotto.codice_lotto || state.savedLotto.id)}</strong><br>
      Etichette pronte: <strong>${state.savedLabels.length}</strong>
    `;
  }

  const backdrop = document.getElementById("app-print-backdrop");
  if (backdrop) backdrop.style.display = "block";
}

function closePrintModal() {
  const backdrop = document.getElementById("app-print-backdrop");
  if (backdrop) backdrop.style.display = "none";
}

function stampaEtichetteConfezioni() {
  if (!state.savedLotto) {
    alert("Salva prima la produzione.");
    return;
  }

  const formatId = document.getElementById("app-print-format")?.value || "50x50";
  const format = getLabelFormat(formatId);
  const labels = buildLabelsForPrint();

  if (!labels.length) {
    alert("Nessuna etichetta valida da stampare.");
    return;
  }

  const html = buildPrintHtml({
    title: "Etichette Produzione",
    labels,
    format
  });

  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup bloccato. Abilita le finestre popup per stampare.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function buildLabelsForPrint() {
  const lotto = state.savedLotto;
  if (!lotto) return [];

  const scenario = getScenarioSelezionato();
  const labels = [];

  for (const c of getConfezioniValide()) {

    const porzione = state.porzioni.find(
      (p) => String(p.id) === String(c.porzione_id)
    ) || null;

    let pesoPorzioneKg = 0;
    let labelPorzione = "";

    // ✔ caso standard
    if (porzione) {
      pesoPorzioneKg = toKg(porzione.peso_porzione, porzione.unita_misura);
      labelPorzione = porzione.label || "";
    }

    // ✔ caso manuale
    else {
      pesoPorzioneKg = Number(c.peso_manuale || 0);
      labelPorzione = "Manuale";
    }

    const kgConf = pesoPorzioneKg * Number(c.pezzi_per_confezione || 0);

    for (let i = 0; i < Number(c.numero_confezioni || 0); i++) {
      labels.push({
        titolo: state.ricetta?.nome || "Prodotto",
        lotto: lotto.codice_lotto || lotto.id,
        lotto_uuid: lotto.lotto_uuid || lotto.id,
        dataProduzione: formatDateITA(state.produzione.data_produzione),
        dataScadenza: formatDateITA(state.produzione.data_scadenza),
        rows: [
          { k: "Tipo", v: labelPorzione },
          { k: "Pezzi", v: String(c.pezzi_per_confezione || "") },
          { k: "Peso", v: `${formatNumber(kgConf)} kg` },
          scenario?.scenario_label ? { k: "Scenario", v: scenario.scenario_label } : null,
          scenario?.temperatura ? { k: "Temperatura", v: scenario.temperatura } : null,
          state.operatore?.nome ? { k: "Operatore", v: state.operatore.nome } : null,
          state.produzione.note ? { k: "Note lotto", v: state.produzione.note } : null,
          c.note ? { k: "Note confezione", v: c.note } : null
        ].filter(Boolean),
        footer: "Generato da Ristoflow — Produzione"
      });
    }
  }

  return labels;
}
function buildPrintHtml({ title, labels, format }) {
  const w = format.w;
  const h = format.h;

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: ${w}mm ${h}mm;
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: Arial, sans-serif;
    }

    .label {
      width: ${w}mm;
      height: ${h}mm;
      box-sizing: border-box;
      padding: ${w >= 100 ? 8 : 4}mm;
      page-break-after: always;
      overflow: hidden;
      border: 1px solid #000;
      position: relative;
    }

    .title {
      font-weight: 700;
      font-size: ${w >= 100 ? 18 : 12}px;
      margin-bottom: 3mm;
    }

    .lotto {
      font-weight: 700;
      font-size: ${w >= 100 ? 15 : 11}px;
      margin-bottom: 2mm;
    }

    .dates,
    .row,
    .footer {
      font-size: ${w >= 100 ? 12 : 9}px;
      line-height: 1.25;
      margin-bottom: 1mm;
    }

    .footer {
      position: absolute;
      left: ${w >= 100 ? 8 : 4}mm;
      right: ${w >= 100 ? 8 : 4}mm;
      bottom: 3mm;
      font-size: ${w >= 100 ? 10 : 7}px;
    }

    .qr {
      position: absolute;
      right: ${w >= 100 ? 8 : 4}mm;
      top: ${w >= 100 ? 8 : 4}mm;
      font-size: ${w >= 100 ? 11 : 8}px;
      border: 1px solid #000;
      padding: 2mm;
      max-width: 26mm;
      overflow: hidden;
      text-align: center;
    }
  </style>
</head>
<body>
  ${(labels || []).map((label) => `
    <div class="label">
      <div class="title">${escapeHtml(label.titolo)}</div>
      <div class="lotto">LOTTO: ${escapeHtml(label.lotto)}</div>
      <div class="dates">Prod: ${escapeHtml(label.dataProduzione)} — Scad: ${escapeHtml(label.dataScadenza)}</div>

      ${(label.rows || []).map((r) => `
        <div class="row">${escapeHtml(r.k)}${r.k ? ": " : ""}${escapeHtml(r.v)}</div>
      `).join("")}

      <div class="qr">${escapeHtml(label.lotto_uuid || label.lotto)}</div>
      <div class="footer">${escapeHtml(label.footer || "")}</div>
    </div>
  `).join("")}

  <script>
    window.onload = function(){
      window.print();
    };
  </script>
</body>
</html>
  `;
}

function getLabelFormat(id) {
  const formats = {
    "50x50": { id: "50x50", w: 50, h: 50 },
    "70x40": { id: "70x40", w: 70, h: 40 },
    "100x150": { id: "100x150", w: 100, h: 150 }
  };

  return formats[id] || formats["50x50"];
}

// ============================================================
// CALCOLI
// ============================================================

function aggiornaScadenza() {
  const scenario = getScenarioSelezionato();
  const input = document.getElementById("app-prod-scadenza");

  if (!scenario || !state.produzione.data_produzione) {
    state.produzione.data_scadenza = "";
    if (input) input.value = "";
    return;
  }

  state.produzione.data_scadenza = addDaysISO(
    state.produzione.data_produzione,
    Number(scenario.shelf_life_giorni || 0)
  );

  if (input) input.value = state.produzione.data_scadenza;
}

function getScenarioSelezionato() {
  return state.scenari.find((s) => String(s.id) === String(state.produzione.scenario_id)) || null;
}

function getConfezioniValide() {
  return state.confezioni.filter((c) => {

    const baseValida =
      Number(c.pezzi_per_confezione) > 0 &&
      Number(c.numero_confezioni) > 0;

    // ✔ caso porzioni
    if (c.porzione_id) return baseValida;

    // ✔ caso manuale
    if (!c.porzione_id && Number(c.peso_manuale) > 0) return baseValida;

    return false;
  });
}

function getTotaleConfezionatoKg() {
  return getConfezioniValide().reduce((sum, c) => {

    const porzione = state.porzioni.find(
      (p) => String(p.id) === String(c.porzione_id)
    ) || null;

    let pesoPorzioneKg = 0;

    // ✔ caso standard (con porzione)
    if (porzione) {
      pesoPorzioneKg = toKg(porzione.peso_porzione, porzione.unita_misura);
    }

    // ✔ caso manuale (senza porzione)
    else if (!porzione && Number(c.peso_manuale) > 0) {
      pesoPorzioneKg = Number(c.peso_manuale);
    }

    // ❌ se non valido → skip
    if (!pesoPorzioneKg) return sum;

    const pezzi = Number(c.pezzi_per_confezione || 0);
    const numConf = Number(c.numero_confezioni || 0);

    const kgConf = pesoPorzioneKg * pezzi;
    const kgTot = kgConf * numConf;

    return sum + kgTot;

  }, 0);
}
// ============================================================
// UTILS
// ============================================================

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateISO, days) {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function toKg(value, um) {
  const n = toNumber(value);
  const u = String(um || "kg").toLowerCase();

  if (u === "g" || u === "gr" || u === "grammi") return n / 1000;
  if (u === "ml") return n / 1000;

  // 🔥 NUOVO
  if (u === "pz") return n;

  return n;
}
function toNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString("it-IT", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
}

function formatDateITA(dateISO) {
  if (!dateISO) return "";
  const d = new Date(dateISO + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString("it-IT");
}

function setResult(el, message, isError = false) {
  if (!el) return;
  el.innerHTML = message;
  el.style.color = isError ? "#dc2626" : "#16a34a";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
