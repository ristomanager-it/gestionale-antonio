// ============================================================
// APP PRODUZIONE - VERSIONE OPERATORE SEMI AUTOMATICA
// Vanilla JS + Supabase
// Hash route prevista: #/app-produzione
// ============================================================

import { createPageLayout, createCard } from "../../utils/pageLayout.js";

let state = {
  azienda_id: null,
  sede_id: null,

  ricette: [],
  ricetta: null,

  porzioni: [],
  scenari: [],

  operatore: null,

  produzione: {
    data_produzione: "",
    peso_reale_kg: 0,
    scenario_id: "",
    data_scadenza: "",
    note: ""
  },

  confezioni: []
};

export async function render(container) {
  resetState();

  state.azienda_id = window.state?.azienda?.id || window.state?.azienda_id || null;
  state.sede_id = window.state?.sede?.id || window.state?.sedeAttiva?.id || null;
  state.produzione.data_produzione = todayISO();

  container.innerHTML = createPageLayout({
    title: "Produzione Operativa",
    subtitle: "Produzione guidata: ricetta, peso reale, conservazione, confezionamento e lotto",
    content: `
      ${createCard({
        title: "1. Ricetta",
        body: `
          <div class="form-grid">
            <div class="form-group">
              <label>Ricetta da produrre</label>
              <select id="app-prod-ricetta" class="input">
                <option value="">Caricamento ricette...</option>
              </select>
            </div>

            <div class="form-group">
              <label>Data produzione</label>
              <input id="app-prod-data" type="date" class="input" value="${state.produzione.data_produzione}" />
            </div>
          </div>

          <div id="app-prod-ricetta-info" class="form-help" style="margin-top:10px;">
            Seleziona una ricetta.
          </div>
        `
      })}

      ${createCard({
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
      })}

      ${createCard({
        title: "3. Peso reale e conservazione",
        body: `
          <div class="form-grid">
            <div class="form-group">
              <label>Peso reale prodotto (kg)</label>
              <input id="app-prod-peso" type="number" min="0" step="0.001" class="input" placeholder="Es. 12.500" />
            </div>

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
              <label>Note lotto</label>
              <input id="app-prod-note" class="input" placeholder="Opzionale" />
            </div>
          </div>

          <div id="app-prod-scenario-info" class="form-help" style="margin-top:10px;">
            Lo scenario determina la scadenza del lotto.
          </div>
        `
      })}

      ${createCard({
        title: "4. Confezionamento guidato",
        body: `
          <div id="app-prod-confezioni"></div>

          <div class="form-actions" style="margin-top:12px;">
            <button id="btn-app-add-confezione" type="button" class="app-button secondary" disabled>
              + Aggiungi confezione
            </button>
          </div>

          <div id="app-prod-totali" class="form-help" style="margin-top:10px;">
            Totale confezionato: 0 kg
          </div>
        `
      })}

      ${createCard({
        title: "5. Conferma",
        body: `
          <div class="form-actions">
            <button id="btn-app-salva-produzione" type="button" class="app-button">
              ✅ Registra produzione
            </button>
          </div>

          <div id="app-prod-result" class="form-result"></div>
        `
      })}
    `
  });

  await loadRicette();
  bindEvents();
  renderRicetteSelect();
  renderConfezioni();
  aggiornaTotali();
}

function resetState() {
  state = {
    azienda_id: null,
    sede_id: null,

    ricette: [],
    ricetta: null,

    porzioni: [],
    scenari: [],

    operatore: null,

    produzione: {
      data_produzione: "",
      peso_reale_kg: 0,
      scenario_id: "",
      data_scadenza: "",
      note: ""
    },

    confezioni: []
  };
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
      prodotto_output_id: r.prodotto_output_id,
      resa_teorica: output?.peso_finale ?? null,
      resa_unita: output?.unita_misura || "kg"
    };
  });
}

async function loadRicettaDettagli(ricettaId) {
  await Promise.all([
    loadPorzioni(ricettaId),
    loadScenari(ricettaId)
  ]);
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
// RENDER UI
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

  if (!state.ricetta) {
    wrap.innerHTML = `<div class="form-help">Seleziona una ricetta.</div>`;
    return;
  }

  if (!state.porzioni.length) {
    wrap.innerHTML = `<div class="form-help">Nessuna porzionatura configurata per questa ricetta.</div>`;
    return;
  }

  if (!state.confezioni.length) {
    wrap.innerHTML = `<div class="form-help">Aggiungi almeno una confezione.</div>`;
    return;
  }

  wrap.innerHTML = state.confezioni.map((row, idx) => {
    const porzione = state.porzioni.find((p) => String(p.id) === String(row.porzione_id));
    const pesoPorzioneKg = porzione ? toKg(porzione.peso_porzione, porzione.unita_misura) : 0;
    const kgConf = pesoPorzioneKg * toNumber(row.pezzi_per_confezione);
    const kgTot = kgConf * toNumber(row.numero_confezioni);

    return `
      <div class="card menu-card" data-conf-idx="${idx}">
        <div class="form-grid">
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
            <label>Kg totali</label>
            <input class="input" readonly value="${formatNumber(kgTot)} kg" />
          </div>

          <div class="form-group">
            <label>Note</label>
            <input class="input" data-field="note" value="${escapeAttr(row.note)}" />
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="app-button secondary" data-action="remove-conf">Rimuovi</button>
        </div>
      </div>
    `;
  }).join("");
}

function aggiornaRicettaInfo() {
  const el = document.getElementById("app-prod-ricetta-info");
  if (!el) return;

  if (!state.ricetta) {
    el.innerText = "Seleziona una ricetta.";
    return;
  }

  el.innerText = `Ricetta: ${state.ricetta.nome} — Resa teorica: ${state.ricetta.resa_teorica ?? "-"} ${state.ricetta.resa_unita || "kg"}`;
}

function aggiornaScenarioInfo() {
  const el = document.getElementById("app-prod-scenario-info");
  if (!el) return;

  const scenario = getScenarioSelezionato();

  if (!scenario) {
    el.innerText = "Lo scenario determina la scadenza del lotto.";
    return;
  }

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
  if (!el) return;

  const totale = getTotaleConfezionatoKg();
  const peso = state.produzione.peso_reale_kg || 0;
  const diff = peso - totale;

  el.innerHTML = `
    Totale confezionato: <strong>${formatNumber(totale)} kg</strong><br>
    Peso reale: <strong>${formatNumber(peso)} kg</strong><br>
    Differenza: <strong>${formatNumber(diff)} kg</strong>
  `;
}

// ============================================================
// EVENTS
// ============================================================

function bindEvents() {
  document.getElementById("app-prod-ricetta")?.addEventListener("change", onRicettaChange);
  document.getElementById("app-prod-data")?.addEventListener("change", onDataChange);
  document.getElementById("app-prod-pin")?.addEventListener("input", onPinInput);
  document.getElementById("app-prod-peso")?.addEventListener("input", onPesoInput);
  document.getElementById("app-prod-scenario")?.addEventListener("change", onScenarioChange);
  document.getElementById("app-prod-note")?.addEventListener("input", onNoteInput);
  document.getElementById("btn-app-add-confezione")?.addEventListener("click", addConfezione);
  document.getElementById("app-prod-confezioni")?.addEventListener("input", onConfezioneInput);
  document.getElementById("app-prod-confezioni")?.addEventListener("change", onConfezioneInput);
  document.getElementById("app-prod-confezioni")?.addEventListener("click", onConfezioneClick);
  document.getElementById("btn-app-salva-produzione")?.addEventListener("click", salvaProduzione);
}

async function onRicettaChange(e) {
  const ricettaId = e.target.value || "";
  state.ricetta = state.ricette.find((r) => String(r.id) === String(ricettaId)) || null;

  state.porzioni = [];
  state.scenari = [];
  state.confezioni = [];
  state.produzione.scenario_id = "";
  state.produzione.data_scadenza = "";

  aggiornaRicettaInfo();

  const btnAdd = document.getElementById("btn-app-add-confezione");
  if (btnAdd) btnAdd.disabled = !state.ricetta;

  if (state.ricetta) {
    await loadRicettaDettagli(state.ricetta.id);
  }

  renderScenarioSelect();
  renderConfezioni();
  aggiornaScenarioInfo();
  aggiornaScadenza();
  aggiornaTotali();
}

function onDataChange(e) {
  state.produzione.data_produzione = e.target.value || "";
  aggiornaScadenza();
}

async function onPinInput(e) {
  const pin = (e.target.value || "").trim();
  const out = document.getElementById("app-prod-operatore");

  if (!pin) {
    state.operatore = null;
    if (out) out.value = "";
    return;
  }

  const operatore = await resolveOperatoreByPin(pin);

  state.operatore = operatore;

  if (out) {
    out.value = operatore ? operatore.nome : "PIN non valido";
  }
}

function onPesoInput(e) {
  state.produzione.peso_reale_kg = toNumber(e.target.value);
  aggiornaTotali();
}

function onScenarioChange(e) {
  state.produzione.scenario_id = e.target.value || "";
  aggiornaScadenza();
  aggiornaScenarioInfo();
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

  const supabase = window.supabaseClient;
  const scenario = getScenarioSelezionato();

  try {
    const dettaglioConfezionamento = buildDettaglioConfezionamento();
    const totaleConfezionato = getTotaleConfezionatoKg();

    const { data: lotto, error: errLotto } = await supabase
      .from("produzione_lotti")
      .insert({
        azienda_id: state.azienda_id,
        sede_id: state.sede_id,
        ricetta_id: state.ricetta.id,
        data_produzione: state.produzione.data_produzione,
        data_scadenza: state.produzione.data_scadenza,
        quantita_output: state.produzione.peso_reale_kg,
        unita_misura: "kg",
        scenario_conservazione_id: state.produzione.scenario_id,
        stato: "firmato",
        note: state.produzione.note || "",
        operatore_id: state.operatore.id,
        firmato_at: new Date().toISOString(),
        dettaglio_confezionamento: dettaglioConfezionamento,
        resa_percentuale: calcolaResaPercentuale(),
        scarto_percentuale: calcolaScartoPercentuale()
      })
      .select()
      .single();

    if (errLotto) throw errLotto;

    const lottoRef = lotto.lotto_uuid || lotto.id;

    const righePayload = dettaglioConfezionamento.map((riga) => ({
      azienda_id: state.azienda_id,
      produzione_id: lottoRef,
      ricetta_id: state.ricetta.id,
      conservazione_id: state.produzione.scenario_id,
      formato_label: riga.label || "CONFEZIONE",
      quantita: riga.kg_totali_riga,
      unita: "kg",
      moltiplicatore_ricetta: getMoltiplicatoreRicetta(),
      lotto: lotto.codice_lotto || "",
      porzione_id: Number(riga.porzione_id),
      note_confezionamento: `Confezioni=${riga.numero_confezioni} | Pezzi/Conf=${riga.pezzi_per_confezione} | Kg/Conf=${formatNumber(riga.kg_per_confezione)}${riga.note ? ` | ${riga.note}` : ""}`
    }));

    const { error: errRighe } = await supabase
      .from("schede_produzione_righe")
      .insert(righePayload);

    if (errRighe) throw errRighe;

    await generaMovimentiMagazzino({
      lotto,
      lottoRef,
      dettaglioConfezionamento,
      dataProduzione: state.produzione.data_produzione
    });

    await logEventoHaccp({
      produzioneId: lottoRef,
      tipo: "APP_PRODUZIONE_REGISTRATA",
      payload: {
        ricetta_id: state.ricetta.id,
        scenario_id: scenario?.id || null,
        scenario_label: scenario?.scenario_label || null,
        data_scadenza: state.produzione.data_scadenza,
        peso_reale_kg: state.produzione.peso_reale_kg,
        totale_confezionato_kg: totaleConfezionato,
        operatore_id: state.operatore.id
      }
    });

    setResult(result, `✅ Produzione registrata. Lotto: ${escapeHtml(lotto.codice_lotto || "")}`, false);
    lockUI();

  } catch (error) {
    console.error("Errore salvaProduzione app:", error);
    setResult(result, `❌ Errore: ${escapeHtml(error.message || "salvataggio non riuscito")}`, true);
  }
}

function validaProduzione() {
  if (!window.supabaseClient) return "Supabase non inizializzato.";
  if (!state.azienda_id) return "Azienda non trovata.";
  if (!state.ricetta?.id) return "Seleziona una ricetta.";
  if (!state.operatore?.id) return "Inserisci un PIN operatore valido.";
  if (!state.produzione.data_produzione) return "Inserisci la data produzione.";
  if (!state.produzione.peso_reale_kg || state.produzione.peso_reale_kg <= 0) return "Inserisci il peso reale prodotto.";
  if (!state.produzione.scenario_id) return "Seleziona uno scenario di conservazione.";
  if (!state.produzione.data_scadenza) return "La scadenza non è stata calcolata.";
  if (!state.confezioni.length) return "Inserisci almeno una confezione.";
  if (!state.ricetta.prodotto_output_id) return "La ricetta non ha prodotto output collegato.";

  const valide = state.confezioni.filter((c) =>
    c.porzione_id &&
    Number(c.pezzi_per_confezione) > 0 &&
    Number(c.numero_confezioni) > 0
  );

  if (!valide.length) return "Inserisci almeno una confezione valida.";

  return null;
}

// ============================================================
// MAGAZZINO + HACCP
// ============================================================

async function generaMovimentiMagazzino({ lotto, lottoRef, dettaglioConfezionamento, dataProduzione }) {
  const supabase = window.supabaseClient;

  const { data: ingredienti, error: errIng } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("azienda_id", state.azienda_id)
    .eq("ricetta_id", state.ricetta.id);

  if (errIng) throw errIng;

  const moltiplicatore = getMoltiplicatoreRicetta();

  for (const ing of ingredienti || []) {
    const prodottoId = ing.prodotto_id;
    const qBase = toNumber(ing.quantita ?? ing.qta ?? ing.qta_ingrediente ?? 0);
    if (!prodottoId || qBase <= 0) continue;

    const { error } = await supabase
      .from("magazzino_movimenti")
      .insert({
        azienda_id: state.azienda_id,
        prodotto_id: prodottoId,
        tipo_movimento: "SCARICO",
        quantita: qBase * moltiplicatore,
        data_movimento: dataProduzione,
        riferimento_tipo: "LOTTO_PRODUZIONE",
        riferimento_id: lottoRef,
        note: `Scarico ingredienti lotto ${lotto.codice_lotto || ""}`
      });

    if (error) throw error;
  }

  for (const riga of dettaglioConfezionamento) {
    const { error } = await supabase
      .from("magazzino_movimenti")
      .insert({
        azienda_id: state.azienda_id,
        prodotto_id: state.ricetta.prodotto_output_id,
        tipo_movimento: "CARICO",
        quantita: riga.kg_totali_riga,
        data_movimento: dataProduzione,
        riferimento_tipo: "LOTTO_PRODUZIONE",
        riferimento_id: lottoRef,
        note: `Carico prodotto finito lotto ${lotto.codice_lotto || ""} — ${riga.label || ""}`
      });

    if (error) throw error;
  }
}

async function logEventoHaccp({ produzioneId, tipo, payload }) {
  const supabase = window.supabaseClient;
  if (!supabase || !produzioneId || !tipo) return;

  try {
    await supabase
      .from("produzione_eventi_log")
      .insert({
        azienda_id: state.azienda_id,
        produzione_id: produzioneId,
        tipo_evento: tipo,
        payload: payload || {}
      });
  } catch (error) {
    console.warn("Log HACCP non registrato:", error);
  }
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

function buildDettaglioConfezionamento() {
  return state.confezioni
    .filter((c) => c.porzione_id && Number(c.pezzi_per_confezione) > 0 && Number(c.numero_confezioni) > 0)
    .map((c) => {
      const porzione = state.porzioni.find((p) => String(p.id) === String(c.porzione_id)) || null;
      const pesoPorzioneKg = porzione ? toKg(porzione.peso_porzione, porzione.unita_misura) : 0;
      const kgPerConf = pesoPorzioneKg * Number(c.pezzi_per_confezione || 0);
      const kgTot = kgPerConf * Number(c.numero_confezioni || 0);

      return {
        porzione_id: c.porzione_id,
        label: porzione?.label || "",
        peso_porzione_kg: pesoPorzioneKg,
        pezzi_per_confezione: Number(c.pezzi_per_confezione || 0),
        numero_confezioni: Number(c.numero_confezioni || 0),
        kg_per_confezione: kgPerConf,
        kg_totali_riga: kgTot,
        note: c.note || ""
      };
    });
}

function getTotaleConfezionatoKg() {
  return buildDettaglioConfezionamento()
    .reduce((sum, r) => sum + Number(r.kg_totali_riga || 0), 0);
}

function getResaTeoricaKg() {
  if (!state.ricetta?.resa_teorica) return null;
  return toKg(state.ricetta.resa_teorica, state.ricetta.resa_unita || "kg");
}

function getMoltiplicatoreRicetta() {
  const teorica = getResaTeoricaKg();
  if (!teorica || teorica <= 0) return 1;
  if (!state.produzione.peso_reale_kg || state.produzione.peso_reale_kg <= 0) return 1;
  return state.produzione.peso_reale_kg / teorica;
}

function calcolaResaPercentuale() {
  const teorica = getResaTeoricaKg();
  if (!teorica || teorica <= 0) return null;
  return (state.produzione.peso_reale_kg / teorica) * 100;
}

function calcolaScartoPercentuale() {
  const teorica = getResaTeoricaKg();
  if (!teorica || teorica <= 0) return null;
  return ((teorica - state.produzione.peso_reale_kg) / teorica) * 100;
}

// ============================================================
// UI LOCK
// ============================================================

function lockUI() {
  document.querySelectorAll("input, select, button").forEach((el) => {
    if (el.id !== "logout-btn") el.setAttribute("disabled", "disabled");
  });
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
