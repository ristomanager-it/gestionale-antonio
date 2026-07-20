// FILE: js/pages/preparazioni.js
import { createPageLayout, createCard } from "../utils/pageLayout.js";

/*
  PRODUZIONE (flusso industriale)
  - Tabella principale: produzione_lotti (bigserial id, codice_lotto trigger)
  - Righe: schede_produzione_righe (1 riga per tipologia confezione + righe coprodotti)
  - Magazzino: magazzino_movimenti (scarico ingredienti + carichi output + carichi coprodotti)
  - HACCP: produzione_eventi_log (opzionale, best-effort)

  Confezionamento (modello A):
  - 1 riga = 1 tipologia di confezione (porzionatura) scelta da ricette_porzione
  - Campi: porzione, pezzi_per_confezione, numero_confezioni, note
  - kg_riga = peso_porzione_kg * pezzi_per_confezione * numero_confezioni
  - Stampa etichette: numero etichette = numero_confezioni (una per confezione)

  NOTE SCHEMA (necessario):
  - schede_produzione_righe.produzione_id UUID FK produzione_lotti(lotto_uuid)
  - per coprodotti in schede_produzione_righe: prodotto_id BIGINT NULL FK prodotti(id)
  - dipendenti: pin (fallback su codice)
  - ricette_conservazione: (opz) fasi_operativo TEXT
*/

let ricetteCache = [];
let ricettaSelezionata = null;

let porzioniCache = [];
let dipendentiCache = [];
let prodottiCache = [];
let scenariConservazione = [];

let operatoreRisolto = null;

let confezioniRows = []; // [{ id, porzione_id, pezzi_per_confezione, numero_confezioni, note }]
let coprodottiRows = []; // [{ id, prodotto_id, quantita, unita_misura, data_scadenza, note }]

let savedLotto = null;
let savedLottoUUID = null;
let resumeLottoId = null;
let resumeLottoUUID = null;
let savedRighe = [];

let fasiCache = [];       // ricette_preparazione_fasi della ricetta selezionata
let logHaccp = [];        // registrazioni cuoco per fase
let dispositividMap = {}; // uuid → dispositivo
let passaggiConservazioneMap = {}; // scenarioId → [passaggi]
let costoOrarioDipendente = 12; // €/h default — sovrascrivibile da azienda

export async function render(container) {
  ricetteCache = [];
  ricettaSelezionata = null;

  porzioniCache = [];
  dipendentiCache = [];
  prodottiCache = [];
  scenariConservazione = [];

  operatoreRisolto = null;

  confezioniRows = [];
  coprodottiRows = [];

  savedLotto = null;
  savedLottoUUID = null;
  resumeLottoId = null;
  resumeLottoUUID = null;
  savedRighe = [];

  fasiCache = [];
  logHaccp = [];
  dispositividMap = {};
  passaggiConservazioneMap = {};

  container.innerHTML = createPageLayout({
    title: "Produzione",
    subtitle: "Peso reale, confezionamento a porzionature, coprodotti, firma e magazzino (HACCP-ready)",
    content: `
      <div class="form-actions" style="margin-bottom:16px; display:flex; gap:10px; flex-wrap:wrap;">
        <button type="button" id="btn-back" class="app-button secondary">← Centro Produzione</button>
        <button type="button" id="btn-scheda-tecnica" class="app-button secondary">📘 Scheda tecnica</button>
        <button type="button" id="btn-stampa-produzione" class="app-button secondary">🖨 Stampa scheda produzione</button>
        <button type="button" id="btn-stampa-etichetta" class="app-button secondary">🏷 Etichetta (anteprima)</button>
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
        title: "Dati Lotto",
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
        title: "Processo HACCP — Registrazione fasi",
        body: `
          <div id="haccp-empty-msg" style="color:#94a3b8;font-size:13px;font-style:italic;">
            Seleziona una ricetta per registrare le fasi di processo.
          </div>
          <div id="haccp-fasi-wrap" style="display:none;">
            <div style="font-size:13px;color:#64748b;margin-bottom:12px;">
              Registra i parametri di ogni fase prima di confermare la produzione. Il registro viene salvato insieme al lotto.
            </div>
            <div id="haccp-fasi-list"></div>

            <div style="margin-top:12px;padding-top:12px;border-top:1px dashed #e2e8f0;">
              <div style="font-size:12px;color:#64748b;margin-bottom:8px;">
                Aggiungi una fase al processo (es. a cottura ultimata → abbattimento; dopo il confezionamento → riabbattimento):
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
                <div class="form-group" style="margin:0;min-width:170px;">
                  <label style="font-size:12px;">Tipo fase</label>
                  <select id="haccp-nuova-tipo" class="input">
                    <option value="abbattimento">❄️ Abbattimento</option>
                    <option value="conservazione">🧊 Conservazione / stoccaggio</option>
                    <option value="raffreddamento">❄️ Raffreddamento</option>
                    <option value="cottura">🔥 Cottura</option>
                    <option value="preparazione">🔪 Preparazione</option>
                    <option value="porzionatura">🔪 Porzionatura</option>
                    <option value="confezionamento">📦 Confezionamento</option>
                  </select>
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:200px;">
                  <label style="font-size:12px;">Cosa fare (descrizione)</label>
                  <input id="haccp-nuova-desc" class="input" type="text" placeholder="Es: Abbattere a +3°C entro 90 min" />
                </div>
                <button type="button" id="btn-add-fase-haccp" class="app-button secondary" ${savedLotto ? "disabled" : ""}>➕ Aggiungi fase</button>
              </div>
            </div>
          </div>
        `
      })}

      ${createCard({
        title: "Totale prodotto (peso reale + controllo)",
        body: `
          <div class="form-grid">
            <div class="form-group">
              <label>Resa teorica batch base</label>
              <input id="resa-teorica" class="input" type="number" min="0" step="0.001" placeholder="Es: 10,000" ${savedLotto ? "readonly" : ""} />
              <div class="form-help">Precompilata dalla ricetta; puoi correggerla a mano. Serve per il moltiplicatore e lo scarico ingredienti.</div>
            </div>

            <div class="form-group">
              <label>Peso totale reale prodotto (kg)</label>
              <input id="prod-peso-reale" class="input" type="number" min="0" step="0.001" placeholder="Es: 12,500" ${savedLotto ? "disabled" : ""} />
              <div class="form-help">Peso misurato in laboratorio.</div>
            </div>

            <div class="form-group">
              <label>Totale confezionato (kg)</label>
              <input id="peso-allocato" class="input" readonly />
              <div class="form-help">Somma delle righe confezionamento.</div>
            </div>

            <div class="form-group">
              <label>Differenza (reale - confezionato) (kg)</label>
              <input id="peso-differenza" class="input" readonly />
              <div class="form-help">Solo informativo (ritagli/calo/extra).</div>
            </div>

            <div class="form-group">
              <label>Scarto (teorica - reale) (kg)</label>
              <input id="resa-scarto" class="input" readonly />
            </div>

            <div class="form-group">
              <label>Moltiplicatore produzione</label>
              <input id="moltiplicatore" class="input" readonly />
              <div class="form-help">Moltiplica gli ingredienti per lo scarico magazzino.</div>
              <div id="molt-avviso" style="display:none;margin-top:6px;background:#fef3c7;border:1px solid #fcd34d;color:#92400e;border-radius:8px;padding:7px 10px;font-size:12px;font-weight:600;">⚠️ Manca la resa della ricetta: il moltiplicatore resta 1×. Scrivi la <strong>resa teorica</strong> qui sopra per calcolarlo.</div>
            </div>
          </div>
        `
      })}

      ${createCard({
        title: "Conservazione",
        body: `
          <div class="form-grid">

            <div class="form-group">
              <label>Scenario conservazione</label>
              <select id="prod-conservazione" class="input" ${savedLotto ? "disabled" : ""}>
                <option value="">Seleziona...</option>
              </select>
              <div id="prod-conservazione-help" class="form-help">Seleziona una ricetta per caricare gli scenari.</div>
            </div>

            <div class="form-group">
              <label>Scadenza (automatica)</label>
              <input id="prod-scadenza" type="date" class="input" ${savedLotto ? "readonly" : ""} />
              <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;" id="prod-giorni-rapidi">
                ${[3,7,15,30,60,90].map(g => `<button type="button" data-gg="${g}" class="app-button gray small" style="padding:4px 10px;font-size:12px;">${g} gg</button>`).join("")}
              </div>
              <div class="form-help">Scegli lo scenario, un tempo rapido di stoccaggio, o scrivi la scadenza a mano.</div>
            </div>

            <div class="form-group">
              <label>Temperatura conservazione</label>
              <input id="prod-temp" class="input" readonly placeholder="—" />
            </div>

          </div>

          <!-- Suggerimento scenario in base al momento -->
          <div id="cons-suggerimento" style="display:none;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin:10px 0;font-size:13px;color:#1e40af;"></div>

          <!-- Passaggi tecnici dello scenario selezionato -->
          <div id="cons-passaggi-wrap" style="display:none;margin-top:14px;">
            <div style="font-weight:600;font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
              📋 Procedura di conservazione
              <span style="font-size:11px;font-weight:400;color:#6b7280;">— spunta ogni step durante il lavoro</span>
            </div>
            <div id="cons-passaggi-list"></div>
          </div>

          <!-- Campo fasi legacy (nascosto, usato internamente) -->
          <input type="hidden" id="prod-fasi" />
        `
      })}

      ${createCard({
        title: "Confezionamento reale (porzionature)",
        body: `
          <div id="confezioni-wrap"></div>

          <div class="form-actions" style="margin-top:10px;">
            <button type="button" id="btn-add-confezione" class="app-button secondary" ${savedLotto ? "disabled" : ""}>+ Aggiungi confezione</button>
          </div>

          <div class="form-help" style="margin-top:10px;">
            1 riga = 1 tipologia confezione. Stampa: 1 etichetta per confezione.
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
            I coprodotti vengono caricati a magazzino con lo stesso lotto.
          </div>
        `
      })}

      ${createCard({
        title: "Azioni",
        body: `
          <div class="form-actions">
            <button type="button" id="btn-salva-produzione" class="app-button" ${savedLotto ? "disabled" : ""}>💾 Registra / apri in Produzioni</button>
            <button type="button" id="btn-print-lotto" class="app-button secondary" disabled>🏷 Stampa etichette confezioni</button>
            <button type="button" id="btn-print-coprodotti" class="app-button secondary" disabled>🏷 Stampa etichette coprodotti</button>
            <button type="button" id="btn-print-haccp" class="app-button gray small">📋 Stampa registro HACCP</button>
          </div>

          <div id="produzione-result" class="form-result"></div>
        `
      })}

      ${createCard({
        title: "💰 Riepilogo economico produzione",
        body: `
          <div id="econ-empty" style="color:#94a3b8;font-size:13px;font-style:italic;">
            Registra la produzione per vedere il riepilogo economico.
          </div>
          <div id="econ-wrap" style="display:none;">
            <div class="tb-kpi-grid compact" id="econ-kpi-grid" style="margin-bottom:14px;"></div>
            <div id="econ-dettaglio" style="font-size:13px;color:#374151;"></div>
            <div style="margin-top:12px;padding:12px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
              <div style="font-weight:600;font-size:13px;color:#15803d;margin-bottom:6px;">📅 Utilità per programmazione settimanale</div>
              <div id="econ-programmazione" style="font-size:12px;color:#374151;line-height:1.6;"></div>
            </div>
          </div>
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

      <div id="prod-tech-backdrop" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; padding:16px; overflow:auto;">
        <div class="view" style="max-width:920px; margin:0 auto; background:var(--card-bg, #111); border-radius:14px; padding:16px;">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
            <h3 style="margin:0;">📘 Scheda tecnica — Modulo Produzione</h3>
            <button id="prod-tech-close" class="app-button secondary">✕ Chiudi</button>
          </div>
          <div id="prod-tech-body" style="margin-top:12px;"></div>
        </div>
      </div>
    `
  });

  presetDataOggi();

// =========================
// 🔥 PLANNER PARAM
// =========================
const params = new URLSearchParams(location.hash.split("?")[1] || "")
const plannerId = params.get("planner_id")

await Promise.all([preloadRicette(), preloadDipendenti(), preloadProdotti()]);

// =========================
// 🔥 PRELOAD DA PLANNER
// =========================
if (plannerId) {
  await preloadFromPlanner(plannerId)
}

// =========================
// 🔥 RESUME DA PRODUZIONI APERTE (#/preparazioni?lotto=<uuid>)
// =========================
const lottoParam = params.get("lotto")
if (lottoParam) {
  await resumeDaLotto(lottoParam)
}

setupAutocompleteRicette();
setupOperatorePIN();
bindEvents();

resetConservazioneUI();
resetConservazioneDettagli();
resetScadenza();

renderConfezioniRows();
renderCoprodottiRows();

renderSchedaTecnica();
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

  // Carico TUTTE le ricette a blocchi (range) per evitare troncamenti del limite di default.
  // Ordino per id (non per nome) cosi' la collation non sposta le maiuscole in coda oltre il limite.
  let tutte = [];
  const BLOCCO = 1000;
  for (let start = 0; start < 20000; start += BLOCCO) {
    const { data, error } = await supabase
      .from("ricette")
      .select("id, nome, pezzi_base, prodotto_output_id")
      .eq("azienda_id", aziendaId)
      .eq("attivo", true)
      .order("id", { ascending: true })
      .range(start, start + BLOCCO - 1);
    if (error) { console.error("Errore preload ricette:", error); break; }
    if (!data || !data.length) break;
    tutte = tutte.concat(data);
    if (data.length < BLOCCO) break; // ultimo blocco
  }

  ricetteCache = tutte.map((r) => ({
    id: r.id,
    nome: r.nome,
    pezzi_base: r.pezzi_base,
    prodotto_output_id: r.prodotto_output_id ?? null,
    resa_teorica: null,
    resa_unita: "kg"
  }));
  // riordino alfabetico lato client (per la visualizzazione)
  ricetteCache.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "it"));
  console.log("[preparazioni] ricette caricate:", ricetteCache.length, "| ragù presente:", ricetteCache.some(r => /rag/i.test(r.nome)));

  // Carico le rese (ricette_output) a parte e le aggancio; se fallisce, le ricette restano comunque cercabili
  try {
    const ids = ricetteCache.map(r => r.id);
    if (ids.length) {
      const { data: outs } = await supabase
        .from("ricette_output")
        .select("ricetta_id, peso_finale, unita_misura")
        .in("ricetta_id", ids);
      const mappa = new Map((outs || []).map(o => [String(o.ricetta_id), o]));
      ricetteCache.forEach(r => {
        const o = mappa.get(String(r.id));
        if (o) { r.resa_teorica = o.peso_finale ?? null; r.resa_unita = o.unita_misura || "kg"; }
      });
    }
  } catch (e) { console.warn("Rese ricette non caricate (non bloccante):", e); }
}

async function preloadDipendenti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  dipendentiCache = [];
  if (!supabase || !aziendaId) return;

  {
    const { data, error } = await supabase
      .from("dipendenti")
      .select("id, nome, pin, codice, costo_orario")
      .eq("azienda_id", aziendaId)
      .eq("attivo", true)
      .order("nome");

    if (!error) {
      dipendentiCache = (data || []).map((d) => ({
        id: d.id,
        nome: d.nome,
        pin: (d.pin ?? d.codice ?? "").toString(),
        costo_orario: toNumber(d.costo_orario) || null
      }));
      return;
    }
  }

  const { data, error } = await supabase
    .from("dipendenti")
    .select("id, nome, codice, costo_orario")
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
    pin: (d.codice ?? "").toString(),
    costo_orario: toNumber(d.costo_orario) || null
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
  confezioniRows = [];

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
    confezioniRows = [];
    renderConfezioniRows();
    recalcResaUI();
    return;
  }

  porzioniCache = data || [];
  confezioniRows = [];
  renderConfezioniRows();
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
    .eq("attivo", true)
    .order("scenario_label");

  if (error) {
    console.error("Errore load conservazioni:", error);
    scenariConservazione = [];
  } else {
    scenariConservazione = data || [];
  }

  // Carica passaggi tecnici per ogni scenario
  passaggiConservazioneMap = {};
  if (scenariConservazione.length && supabase && aziendaId && ricettaId) {
    const { data: passaggi } = await supabase
      .from("ricette_conservazione_passaggi")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("ricetta_id", ricettaId)
      .order("posizione", { ascending: true });

    (passaggi || []).forEach(p => {
      const sid = String(p.ricette_conservazione_id);
      if (!passaggiConservazioneMap[sid]) passaggiConservazioneMap[sid] = [];
      passaggiConservazioneMap[sid].push(p);
    });
  }

  const select = document.getElementById("prod-conservazione");
  const help = document.getElementById("prod-conservazione-help");
  if (!select) return;

  select.innerHTML = `<option value="">Seleziona...</option>`;
  scenariConservazione.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    const nPassaggi = (passaggiConservazioneMap[String(s.id)] || []).length;
    opt.textContent = (s.scenario_label || "Scenario") + (nPassaggi ? ` (${nPassaggi} step)` : "");
    select.appendChild(opt);
  });

  if (help) {
    help.innerText = scenariConservazione.length
      ? "Seleziona uno scenario per vedere la procedura completa."
      : "Nessuno scenario attivo per questa ricetta.";
  }

  // Suggerimento automatico scenario in base al momento
  suggerisciScenario();

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
    confezioniRows = [];
    renderConfezioniRows();

    resetConservazioneUI();
    resetConservazioneDettagli();
    resetScadenza();
    recalcResaUI();

    if (q.length < 2) {
      suggest.classList.remove("open");
      return;
    }

    const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nq = norm(q);
    const risultati = ricetteCache.filter((r) => norm(r.nome).includes(nq)).slice(0, 10);

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

        const resaTxt = r.resa_teorica != null ? ` — Resa teorica batch base: ${String(r.resa_teorica)} ${r.resa_unita || "kg"}` : "";
        setRicettaInfo("Pezzi base: " + (r.pezzi_base ?? "-") + resaTxt);

        await Promise.all([loadPorzioniRicetta(r.id), loadConservazioni(r.id), loadFasiHaccp(r.id)]);
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
  const help = document.getElementById("prod-conservazione-help");
  if (!select) return;
  select.innerHTML = `<option value="">Seleziona...</option>`;
  if (help) help.innerText = "Seleziona una ricetta per caricare gli scenari.";
}

function resetConservazioneDettagli() {
  const t = document.getElementById("prod-temp");
  if (t) t.value = "";
  const wrap = document.getElementById("cons-passaggi-wrap");
  if (wrap) wrap.style.display = "none";
  const sug = document.getElementById("cons-suggerimento");
  if (sug) sug.style.display = "none";
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
    document.getElementById("cons-passaggi-wrap")?.style && (document.getElementById("cons-passaggi-wrap").style.display = "none");
    return;
  }

  const dataProd = document.getElementById("prod-data")?.value || "";
  if (!dataProd) return;

  const scad = addDaysISO(dataProd, scenario.shelf_life_giorni || 0);
  const scadEl = document.getElementById("prod-scadenza");
  if (scadEl) scadEl.value = scad;

  const tempEl = document.getElementById("prod-temp");
  if (tempEl) tempEl.value = scenario.temperatura != null ? `${scenario.temperatura}°C` : "";

  // Passaggi tecnici reali
  renderPassaggiConservazione(String(scenario.id));

  coprodottiRows = coprodottiRows.map((r) => ({
    ...r,
    data_scadenza: r.data_scadenza || scad
  }));
  renderCoprodottiRows();
}

// ── Render checklist passaggi conservazione ────────────────────────────────
const TIPO_PASSAGGIO_ICON = {
  abbattimento: "❄️",
  raffreddamento: "🌡",
  sottovuoto: "🧴",
  confezionamento: "📦",
  etichettatura: "🏷",
  stoccaggio: "🏠",
  congelamento: "🧊",
  surgelamento: "🧊",
  pastorizzazione: "🔥",
  sterilizzazione: "🔥",
  altro: "📋"
};

function renderPassaggiConservazione(scenarioId) {
  const wrap = document.getElementById("cons-passaggi-wrap");
  const list = document.getElementById("cons-passaggi-list");
  if (!wrap || !list) return;

  const passaggi = passaggiConservazioneMap[scenarioId] || [];

  if (!passaggi.length) {
    wrap.style.display = "none";
    return;
  }

  wrap.style.display = "";

  list.innerHTML = passaggi.map((p, idx) => {
    const icon = TIPO_PASSAGGIO_ICON[p.tipo_passaggio] || "📋";
    const durataText = p.durata_min ? `⏱ ${p.durata_min} min` : "";
    const tempText = p.temperatura_c != null ? `🌡 ${p.temperatura_c}°C` : "";
    const attrText = p.attrezzatura ? `🔧 ${p.attrezzatura}` : "";
    const badge = [durataText, tempText, attrText].filter(Boolean).join(" · ");

    return `
      <div class="azienda-card" style="margin-bottom:8px;padding:10px 14px;display:flex;gap:12px;align-items:flex-start;border-left:4px solid #0E5A7A;">
        <div style="padding-top:2px;">
          <input type="checkbox" class="cons-step-check" data-idx="${idx}"
            style="width:18px;height:18px;cursor:pointer;accent-color:#0E5A7A;">
        </div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            <span style="font-size:18px;">${icon}</span>
            <strong style="font-size:14px;">Step ${p.posizione} — ${escapeHtml(p.titolo || p.tipo_passaggio)}</strong>
            ${badge ? `<span style="font-size:11px;color:#6b7280;">${badge}</span>` : ""}
            ${p.gruppo_alternativa ? `<span style="background:#fef3c7;color:#92400e;font-size:10px;padding:1px 6px;border-radius:10px;">ALT ${p.gruppo_alternativa}</span>` : ""}
          </div>
          ${p.descrizione_operativa ? `
            <div style="font-size:13px;color:#374151;background:#f8fafc;border-radius:8px;padding:6px 10px;border:1px solid #e5e7eb;">
              ${escapeHtml(p.descrizione_operativa)}
            </div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  // Bind checkbox: barra lo step completato
  list.querySelectorAll(".cons-step-check").forEach(cb => {
    cb.addEventListener("change", e => {
      const card = e.target.closest(".azienda-card");
      if (card) {
        card.style.opacity = e.target.checked ? "0.55" : "1";
        card.style.background = e.target.checked ? "#f0fdf4" : "";
        card.style.borderLeftColor = e.target.checked ? "#16a34a" : "#0E5A7A";
      }
    });
  });
}

// ── Suggerimento scenario in base al momento/giorno ───────────────────────
function suggerisciScenario() {
  const el = document.getElementById("cons-suggerimento");
  if (!el || !scenariConservazione.length) return;

  const ora = new Date().getHours();
  const giorno = new Date().getDay(); // 0=Dom, 5=Ven, 6=Sab

  let messaggio = "";

  // Scenari ordinati per shelf_life
  const byShelf = [...scenariConservazione].sort((a, b) =>
    (a.shelf_life_giorni || 0) - (b.shelf_life_giorni || 0)
  );
  const breve = byShelf[0]; // shelf life più corta = frigo
  const lungo = byShelf[byShelf.length - 1]; // shelf life più lunga = freezer

  if (giorno === 5 || giorno === 6) {
    // Venerdì o Sabato
    if (lungo && lungo.shelf_life_giorni >= 30) {
      messaggio = `🧊 Siamo a ${giorno === 5 ? "venerdì" : "sabato"} — considera lo scenario <strong>${escapeHtml(lungo.scenario_label)}</strong> per coprire il weekend e i giorni successivi.`;
    }
  } else if (ora >= 14 && ora <= 18) {
    // Produzione pomeridiana → consegna domani
    if (breve) {
      messaggio = `🌙 Produzione pomeridiana — lo scenario <strong>${escapeHtml(breve.scenario_label)}</strong> (${breve.shelf_life_giorni || 0} gg) è adatto per il servizio di domani.`;
    }
  } else if (ora >= 6 && ora <= 11) {
    // Produzione mattutina → servizio pranzo
    if (breve) {
      messaggio = `☀️ Produzione mattutina — lo scenario <strong>${escapeHtml(breve.scenario_label)}</strong> copre il servizio pranzo e cena di oggi.`;
    }
  }

  if (messaggio) {
    el.innerHTML = `💡 ${messaggio}`;
    el.style.display = "";
  } else {
    el.style.display = "none";
  }
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
    // Aggiorna il costo orario con quello reale del dipendente
    if (match.costo_orario) {
      costoOrarioDipendente = match.costo_orario;
    }
  });
}

/* ========================================================= */
/* CONFEZIONI */
/* ========================================================= */

function addConfezioneRow() {
  confezioniRows.push({
    id: cryptoRandomId(),
    porzione_id: "",
    pezzi_per_confezione: "",
    numero_confezioni: "",
    note: ""
  });
  renderConfezioniRows();
  recalcResaUI();
}

function removeConfezioneRow(rowId) {
  confezioniRows = confezioniRows.filter((r) => String(r.id) !== String(rowId));
  renderConfezioniRows();
  recalcResaUI();
}

function renderConfezioniRows() {
  const wrap = document.getElementById("confezioni-wrap");
  if (!wrap) return;

  if (!ricettaSelezionata?.id) {
    wrap.innerHTML = `<div class="form-help">Seleziona una ricetta per gestire le porzionature.</div>`;
    return;
  }

  if (!porzioniCache.length) {
    wrap.innerHTML = `<div class="form-help">Nessuna porzionatura attiva per questa ricetta (ricette_porzione).</div>`;
    return;
  }

  if (!confezioniRows.length) {
    wrap.innerHTML = `<div class="form-help">Nessuna confezione inserita. Premi “+ Aggiungi confezione”.</div>`;
    return;
  }

  wrap.innerHTML = confezioniRows
    .map((row) => {
      const porz = porzioniCache.find((p) => String(p.id) === String(row.porzione_id)) || null;
      const pesoKg = porz ? toKg(porz.peso_porzione, porz.unita_misura) : 0;
      const pezzi = Math.max(0, Math.floor(toNumber(row.pezzi_per_confezione) || 0));
      const numConf = Math.max(0, Math.floor(toNumber(row.numero_confezioni) || 0));
      const kgConf = pesoKg * pezzi;
      const kgTot = kgConf * numConf;

      return `
        <div class="card menu-card" data-confezione-id="${escapeAttr(String(row.id))}">
          <div class="form-grid">

            <div class="form-group">
              <label>Porzionatura</label>
              <select class="input" data-field="porzione_id" ${savedLotto ? "disabled" : ""}>
                <option value="">Seleziona...</option>
                ${porzioniCache
                  .map((p) => {
                    const pKg = toKg(p.peso_porzione, p.unita_misura);
                    const selected = String(p.id) === String(row.porzione_id) ? "selected" : "";
                    return `<option value="${escapeAttr(String(p.id))}" ${selected}>${escapeHtml(p.label)} (${escapeHtml(formatNumber(pKg))} kg)</option>`;
                  })
                  .join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Pezzi per confezione</label>
              <input class="input"
                type="number"
                min="0"
                step="1"
                data-field="pezzi_per_confezione"
                value="${escapeAttr(String(row.pezzi_per_confezione ?? ""))}"
                placeholder="Es: 10"
                ${savedLotto ? "readonly" : ""} />
            </div>

            <div class="form-group">
              <label>Numero confezioni</label>
              <input class="input"
                type="number"
                min="0"
                step="1"
                data-field="numero_confezioni"
                value="${escapeAttr(String(row.numero_confezioni ?? ""))}"
                placeholder="Es: 3"
                ${savedLotto ? "readonly" : ""} />
            </div>

            <div class="form-group">
              <label>Kg per confezione</label>
              <input class="input" readonly value="${escapeAttr(formatNumber(kgConf))} kg" />
            </div>

            <div class="form-group">
              <label>Kg totali riga</label>
              <input class="input" readonly value="${escapeAttr(formatNumber(kgTot))} kg" />
            </div>

            <div class="form-group">
              <label>Note</label>
              <input class="input"
                type="text"
                data-field="note"
                value="${escapeAttr(String(row.note ?? ""))}"
                placeholder="Es: Battesimo Lucia"
                ${savedLotto ? "readonly" : ""} />
            </div>

          </div>

          <div class="form-actions">
            <button type="button"
              class="app-button secondary"
              data-action="remove-confezione"
              ${savedLotto ? "disabled" : ""}>
              Rimuovi
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function onConfezioniChange(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const card = target.closest("[data-confezione-id]");
  if (!card) return;

  const rowId = card.getAttribute("data-confezione-id");
  if (!rowId) return;

  const idx = confezioniRows.findIndex((r) => String(r.id) === String(rowId));
  if (idx < 0) return;

  const field = target.getAttribute("data-field");
  if (!field) return;

  if (savedLotto) return;

  if (field === "porzione_id" && target instanceof HTMLSelectElement) {
    confezioniRows[idx].porzione_id = (target.value || "").toString();
    renderConfezioniRows();
    recalcResaUI();
    return;
  }

  if (field === "pezzi_per_confezione" && target instanceof HTMLInputElement) {
    confezioniRows[idx].pezzi_per_confezione = target.value ?? "";
    renderConfezioniRows();
    recalcResaUI();
    return;
  }

  if (field === "numero_confezioni" && target instanceof HTMLInputElement) {
    confezioniRows[idx].numero_confezioni = target.value ?? "";
    renderConfezioniRows();
    recalcResaUI();
    return;
  }

  if (field === "note" && target instanceof HTMLInputElement) {
    confezioniRows[idx].note = target.value ?? "";
    return;
  }
}

function onConfezioniClick(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const btn = target.closest("[data-action]");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const card = btn.closest("[data-confezione-id]");
  if (!card) return;

  const rowId = card.getAttribute("data-confezione-id");
  if (!rowId) return;

  if (action === "remove-confezione") {
    if (savedLotto) return;
    removeConfezioneRow(rowId);
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
              <div class="cop-search-wrap" style="position:relative;">
                <input class="input cop-search" type="text" autocomplete="off"
                  placeholder="Scrivi per cercare o creare..."
                  value="${escapeAttr(prodotto ? String(prodotto.nome) : "")}"
                  ${savedLotto ? "readonly" : ""} />
                <input type="hidden" data-field="prodotto_id" value="${escapeAttr(String(row.prodotto_id ?? ""))}" />
                <div class="cop-suggest" style="display:none;position:absolute;left:0;right:0;top:100%;z-index:30;background:#fff;border:1px solid #e2e8f0;border-radius:0 0 10px 10px;max-height:220px;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.12);"></div>
              </div>
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
                value="${escapeAttr(String(row.note ?? ""))}"
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

  bindCoprodottoAutocomplete();
}

// Autocomplete di ricerca prodotto per ogni riga coprodotto
function bindCoprodottoAutocomplete() {
  if (savedLotto) return;
  const wrap = document.getElementById("coprodotti-wrap");
  if (!wrap) return;
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  wrap.querySelectorAll(".cop-search-wrap").forEach((box) => {
    const input = box.querySelector(".cop-search");
    const hidden = box.querySelector('[data-field="prodotto_id"]');
    const sug = box.querySelector(".cop-suggest");
    const card = box.closest("[data-coprodotto-id]");
    const rowId = card?.getAttribute("data-coprodotto-id");
    if (!input || input.dataset.bound === "1") return;
    input.dataset.bound = "1";

    const setRow = (prodId, um) => {
      const idx = coprodottiRows.findIndex((r) => String(r.id) === String(rowId));
      if (idx < 0) return;
      coprodottiRows[idx].prodotto_id = prodId ? String(prodId) : "";
      if (um && !coprodottiRows[idx].unita_misura) coprodottiRows[idx].unita_misura = um;
    };

    const chiudi = () => { sug.style.display = "none"; sug.innerHTML = ""; };

    input.addEventListener("input", () => {
      const q = norm(input.value.trim());
      hidden.value = ""; setRow("", null);
      if (q.length < 1) { chiudi(); return; }
      const ris = prodottiCache.filter((p) => norm(p.nome).includes(q)).slice(0, 12);
      let html = ris.map((p) =>
        `<div class="cop-opt" data-id="${escapeAttr(String(p.id))}" data-um="${escapeAttr(String(p.unita_misura || ""))}" data-nome="${escapeAttr(String(p.nome))}" style="padding:9px 12px;cursor:pointer;font-size:14px;border-bottom:1px solid #f1f5f9;">${escapeHtml(p.nome)}</div>`
      ).join("");
      html += `<div class="cop-crea" style="padding:9px 12px;cursor:pointer;font-size:14px;font-weight:700;color:#0E5A7A;">➕ Crea nuovo: "${escapeHtml(input.value.trim())}"</div>`;
      sug.innerHTML = html;
      sug.style.display = "block";

      sug.querySelectorAll(".cop-opt").forEach((opt) => {
        opt.onmousedown = (e) => {
          e.preventDefault();
          input.value = opt.dataset.nome;
          hidden.value = opt.dataset.id;
          setRow(opt.dataset.id, opt.dataset.um);
          chiudi();
        };
      });
      const creaEl = sug.querySelector(".cop-crea");
      if (creaEl) creaEl.onmousedown = async (e) => {
        e.preventDefault();
        const nuovo = await creaProdottoCoprodottoInline(input.value.trim());
        if (nuovo) {
          input.value = nuovo.nome;
          hidden.value = String(nuovo.id);
          setRow(nuovo.id, nuovo.unita_misura);
        }
        chiudi();
      };
    });

    input.addEventListener("blur", () => setTimeout(chiudi, 150));
  });
}

async function creaProdottoCoprodottoInline(nome) {
  if (!nome || nome.length < 2) { alert("Scrivi almeno il nome."); return null; }
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const um = (prompt("Unità di misura (kg, gr, pz, lt):", "kg") || "kg").trim();
  const { data, error } = await supabase.from("prodotti")
    .insert({ azienda_id: aziendaId, nome: nome, descrizione: nome, unita_misura: um, um: um, attivo: true })
    .select("id, nome, unita_misura").maybeSingle();
  if (error || !data) { alert("Errore creazione: " + (error?.message || "sconosciuto")); return null; }
  prodottiCache.push(data);
  prodottiCache.sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
  return data;
}

async function creaNuovoProdottoCoprodotto(rowId, selectEl) {
  const nome = prompt("Nome del nuovo prodotto (coprodotto):");
  if (!nome || !nome.trim()) { selectEl.value = ""; return; }
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const um = prompt("Unità di misura (kg, pz, lt...):", "kg") || "kg";
  const { data, error } = await supabase.from("prodotti")
    .insert({ azienda_id: aziendaId, nome: nome.trim(), unita_misura: um.trim(), attivo: true })
    .select("id, nome, unita_misura").maybeSingle();
  if (error || !data) { alert("Errore creazione prodotto: " + (error?.message || "sconosciuto")); selectEl.value = ""; return; }
  prodottiCache.push(data);
  prodottiCache.sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
  const row = coprodottiRows.find(r => String(r.id) === String(rowId));
  if (row) { row.prodotto_id = String(data.id); if (!row.unita_misura) row.unita_misura = data.unita_misura; }
  renderCoprodottiRows();
}

function onCoprodottiChange(e) {
  const selNuovo = e.target;
  if (selNuovo?.getAttribute && selNuovo.getAttribute("data-field") === "prodotto_id" && selNuovo.value === "__nuovo__") {
    const cardN = selNuovo.closest("[data-coprodotto-id]");
    if (cardN) { creaNuovoProdottoCoprodotto(cardN.getAttribute("data-coprodotto-id"), selNuovo); return; }
  }
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
/* RESA / TOTALI */
/* ========================================================= */

function recalcResaUI() {
  const resaTeoEl = document.getElementById("resa-teorica");
  const pesoRealeEl = document.getElementById("prod-peso-reale");
  const pesoAllocEl = document.getElementById("peso-allocato");
  const diffEl = document.getElementById("peso-differenza");
  const scartoEl = document.getElementById("resa-scarto");
  const moltEl = document.getElementById("moltiplicatore");

  if (!resaTeoEl || !pesoRealeEl || !pesoAllocEl || !diffEl || !scartoEl || !moltEl) return;

  const resaTeoKg = getResaTeoricaKg();
  const pesoRealeKg = getPesoRealeKg();
  const confezionatoKg = getTotaleConfezionatoKg();

  const diffKg = pesoRealeKg - confezionatoKg;
  const scartoKg = resaTeoKg == null ? null : resaTeoKg - pesoRealeKg;
  const moltiplicatore = getMoltiplicatoreRicetta();

  if (resaTeoEl.dataset.manuale !== "1") {
    resaTeoEl.value = resaTeoKg == null ? "" : formatNumber(resaTeoKg);
  }
  pesoAllocEl.value = `${formatNumber(confezionatoKg)} kg`;
  diffEl.value = `${formatNumber(diffKg)} kg`;
  scartoEl.value = scartoKg == null ? "" : `${formatNumber(scartoKg)} kg`;
  moltEl.value = `${formatNumber(moltiplicatore)} x`;

  // Avviso "manca la resa": compare quando c'è un peso reale ma la resa non c'è → moltiplicatore bloccato a 1
  const avvisoEl = document.getElementById("molt-avviso");
  if (avvisoEl) {
    const resaMancante = (resaTeoKg == null || resaTeoKg <= 0);
    const haPesoReale = Number.isFinite(pesoRealeKg) && pesoRealeKg > 0;
    avvisoEl.style.display = (resaMancante && haPesoReale) ? "block" : "none";
    moltEl.style.color = (resaMancante && haPesoReale) ? "#b45309" : "";
  }
}

function getResaTeoricaKg() {
  // Override manuale: se il campo contiene un numero digitato dall'utente, ha priorità
  const el = document.getElementById("resa-teorica");
  if (el && el.dataset.manuale === "1") {
    const n = parseFloat((el.value || "").toString().replace(",", ".").replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (!ricettaSelezionata) return null;
  if (ricettaSelezionata.resa_teorica == null) return null;

  const v = toNumber(ricettaSelezionata.resa_teorica);
  const u = (ricettaSelezionata.resa_unita || "kg").toString().toLowerCase().trim();

  if (u === "g" || u === "gr" || u === "grammi") return v / 1000;
  return v;
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

function getTotaleConfezionatoKg() {
  let tot = 0;

  for (const r of confezioniRows) {
    const porz = porzioniCache.find((p) => String(p.id) === String(r.porzione_id)) || null;
    if (!porz) continue;

    const pesoKg = toKg(porz.peso_porzione, porz.unita_misura);
    const pezzi = Math.max(0, Math.floor(toNumber(r.pezzi_per_confezione) || 0));
    const numConf = Math.max(0, Math.floor(toNumber(r.numero_confezioni) || 0));

    if (pezzi <= 0 || numConf <= 0) continue;

    tot += pesoKg * pezzi * numConf;
  }

  return tot;
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
      .eq("azienda_id", aziendaId)
      .eq("id", ricettaSelezionata.id)
      .maybeSingle()
  ]);

  const ingredienti = ingRes.data || [];
  const fasi = fasiRes.data || [];
  const ricettaDett = ricRes.data || null;

  if (!ricettaDett) {
    body.innerHTML = `<div class="form-help">Ricetta non disponibile (permessi/RLS o record mancante).</div>`;
    return;
  }

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
/* SCHEDA TECNICA */
/* ========================================================= */

function renderSchedaTecnica() {
  const body = document.getElementById("prod-tech-body");
  if (!body) return;

  body.innerHTML = `
    <div style="display:grid; gap:12px;">

      <div class="card">
        <div class="form-group">
          <label>Obiettivo</label>
          <div class="form-help">
            Registrare un lotto di produzione tracciato, con confezionamento a porzionature, coprodotti, firma operatore, movimenti magazzino e stampa etichette.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="form-group">
          <label>Flusso operativo</label>
          <ol style="margin:0; padding-left:18px;">
            <li>Seleziona la ricetta (autocomplete) e, se serve, apri “Vedi ricetta”.</li>
            <li>Inserisci il <b>peso reale totale</b> (kg).</li>
            <li>Compila i dati lotto (data, PIN operatore, note).</li>
            <li>Seleziona lo <b>scenario conservazione</b> per calcolare scadenza e mostrare temperatura/fasi.</li>
            <li>Inserisci le righe di <b>confezionamento</b> (porzionatura, pezzi per confezione, numero confezioni, note).</li>
            <li>Inserisci eventuali <b>coprodotti</b>.</li>
            <li>Registra produzione: lotto firmato, righe inserite, movimenti magazzino generati, log HACCP (se tabella presente).</li>
            <li>Stampa etichette: 1 etichetta per confezione (numero confezioni).</li>
          </ol>
        </div>
      </div>

      <div class="card">
        <div class="form-group">
          <label>Logica resa</label>
          <div class="form-help">
            <b>Resa teorica</b> è la resa del batch base della ricetta (ricette_output).<br>
            <b>Moltiplicatore</b> = peso reale / resa teorica → scala lo scarico ingredienti.<br>
            <b>Totale confezionato</b> = somma righe confezionamento (kg).<br>
            <b>Differenza</b> = peso reale - confezionato (solo informativa).
          </div>
        </div>
      </div>

      <div class="card">
        <div class="form-group">
          <label>Magazzino automatico</label>
          <div class="form-help">
            1) Scarico ingredienti (ricetta_ingredienti × moltiplicatore).<br>
            2) Carico prodotto finito (totale kg confezionato, suddiviso per righe confezione).<br>
            3) Carico coprodotti (quantità/UM inserite).<br>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="form-group">
          <label>HACCP / Tracciabilità</label>
          <div class="form-help">
            Il lotto è univoco (codice_lotto trigger). La firma avviene tramite PIN operatore (firmato_at).<br>
            Se esiste la tabella <b>produzione_eventi_log</b>, vengono registrati eventi di processo (best-effort).
          </div>
        </div>
      </div>

    </div>
  `;
}

function apriSchedaTecnica() {
  const backdrop = document.getElementById("prod-tech-backdrop");
  if (backdrop) backdrop.style.display = "block";
}

function chiudiSchedaTecnica() {
  const backdrop = document.getElementById("prod-tech-backdrop");
  if (backdrop) backdrop.style.display = "none";
}

/* ========================================================= */
/* STAMPA SCHEDA PRODUZIONE (anteprima A4 browser)           */
/* ========================================================= */
async function stampaSchedaProduzione() {
  if (!ricettaSelezionata?.id) { alert("Seleziona prima una ricetta."); return; }
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const azienda = window.state?.azienda;

  const [ingRes, fasiRes] = await Promise.all([
    supabase.from("ricetta_ingredienti").select("*").eq("azienda_id", aziendaId).eq("ricetta_id", ricettaSelezionata.id).order("ordine"),
    supabase.from("ricette_preparazione_fasi").select("*").eq("azienda_id", aziendaId).eq("ricetta_id", ricettaSelezionata.id).order("ordine"),
  ]);
  const ingredienti = ingRes.data || [];
  const fasi = fasiRes.data || [];

  const molt = getMoltiplicatoreRicetta();
  const dataProd = document.getElementById("prod-data")?.value || new Date().toISOString().slice(0, 10);
  const dataFmt = new Date(dataProd).toLocaleDateString("it-IT");
  const lotto = (document.getElementById("prod-lotto")?.value || "").trim() || "—";
  const note = (document.getElementById("prod-note-lotto")?.value || "").trim();
  const operatore = (document.getElementById("prod-operatore-info")?.innerText || "").replace(/nessun operatore identificato/i, "").trim() || "—";
  const resaTeo = getResaTeoricaKg();
  const pesoReale = getPesoRealeKg();

  const righeIng = ingredienti.length ? ingredienti.map((i) => {
    const base = Number(i.qta ?? i.quantita ?? i.qta_ingrediente ?? 0);
    const um = i.unita_misura || i.um || "";
    const nome = i.nome_ingrediente || i.nome || i.nome_prodotto || "Ingrediente";
    const scaled = base * (Number.isFinite(molt) && molt > 0 ? molt : 1);
    return `<tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px;text-align:center;font-size:16px;">☐</td>
      <td style="padding:8px;">${escapeHtml(nome)}</td>
      <td style="padding:8px;text-align:right;font-weight:700;font-size:15px;">${formatNumber(scaled)} ${escapeHtml(um)}</td>
      <td style="padding:8px;text-align:right;color:#94a3b8;font-size:12px;">${formatNumber(base)} ${escapeHtml(um)}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="4" style="padding:12px;color:#64748b;">Nessun ingrediente in ricetta</td></tr>`;

  const listaFasi = fasi.length
    ? `<ol style="margin:0;padding-left:20px;">${fasi.map((f) => `<li style="margin-bottom:10px;">☐ &nbsp;${escapeHtml(f.nome_fase || f.testo || f.descrizione || "Fase")}</li>`).join("")}</ol>`
    : `<div style="color:#64748b;">Nessuna fase registrata</div>`;

  const moltInfo = (Number.isFinite(molt) && Math.abs(molt - 1) > 0.001)
    ? `<div class="meta-item"><div class="meta-label">Moltiplicatore</div><div class="meta-value">${formatNumber(molt)} x</div></div>`
    : "";

  const win = window.open("", "_blank");
  if (!win) { alert("Consenti i popup del browser per vedere l'anteprima di stampa."); return; }
  win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
    <title>Scheda produzione — ${escapeHtml(ricettaSelezionata.nome || "")}</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; font-family:Arial,sans-serif; }
      body { padding:32px; color:#1a1a2e; }
      h1 { font-size:22px; margin-bottom:2px; }
      .sub { font-size:13px; color:#64748b; margin-bottom:20px; }
      .meta { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:22px; }
      .meta-item { background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:10px; }
      .meta-label { font-size:10px; text-transform:uppercase; color:#64748b; letter-spacing:1px; }
      .meta-value { font-size:15px; font-weight:700; margin-top:3px; }
      h2 { font-size:14px; text-transform:uppercase; letter-spacing:1px; color:#0E5A7A; margin:20px 0 10px; border-bottom:2px solid #0E5A7A; padding-bottom:4px; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th { background:#0E5A7A; color:white; padding:8px; text-align:left; font-size:11px; text-transform:uppercase; }
      th.r, td.r { text-align:right; }
      .note-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px 12px; font-size:13px; margin-top:10px; }
      .firma-box { margin-top:44px; display:flex; justify-content:space-between; gap:40px; }
      .firma-line { border-top:1px solid #1a1a2e; width:220px; text-align:center; padding-top:6px; font-size:11px; color:#64748b; }
      @media print { .no-print { display:none; } body { padding:12px; } }
    </style></head><body>
    <div class="no-print" style="text-align:center;padding:12px;background:#f8fafc;margin-bottom:16px;border-radius:8px;">
      <button onclick="window.print()" style="background:#0E5A7A;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">🖨️ Stampa / Salva PDF</button>
    </div>
    <h1>Scheda di produzione</h1>
    <div class="sub">${escapeHtml(azienda?.nome || "")}</div>
    <div class="meta">
      <div class="meta-item"><div class="meta-label">Ricetta</div><div class="meta-value">${escapeHtml(ricettaSelezionata.nome || "—")}</div></div>
      <div class="meta-item"><div class="meta-label">Data produzione</div><div class="meta-value">${dataFmt}</div></div>
      <div class="meta-item"><div class="meta-label">Lotto</div><div class="meta-value">${escapeHtml(lotto)}</div></div>
      <div class="meta-item"><div class="meta-label">Operatore</div><div class="meta-value">${escapeHtml(operatore)}</div></div>
      ${resaTeo ? `<div class="meta-item"><div class="meta-label">Resa teorica</div><div class="meta-value">${formatNumber(resaTeo)} kg</div></div>` : ""}
      ${pesoReale ? `<div class="meta-item"><div class="meta-label">Peso reale</div><div class="meta-value">${formatNumber(pesoReale)} kg</div></div>` : ""}
      ${moltInfo}
    </div>
    ${note ? `<div class="note-box"><b>Note / destinatario:</b> ${escapeHtml(note)}</div>` : ""}
    <h2>Ingredienti da preparare</h2>
    <table>
      <thead><tr><th style="width:34px;"></th><th>Ingrediente</th><th class="r">Q.tà produzione</th><th class="r">Base ricetta</th></tr></thead>
      <tbody>${righeIng}</tbody>
    </table>
    <h2>Fasi di preparazione</h2>
    ${listaFasi}
    <div class="firma-box">
      <div class="firma-line">Preparato da (firma)</div>
      <div class="firma-line">Controllo (firma)</div>
    </div>
  </body></html>`);
  win.document.close();
  try { win.document.body.insertAdjacentHTML("beforeend", '<button onclick="window.close()" class="rf-no-print" style="position:fixed;top:10px;right:10px;z-index:999;background:#0E5A7A;color:#fff;border:none;border-radius:999px;padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.25);">✕ Chiudi</button><style>@media print{.rf-no-print{display:none!important}}</style>'); } catch(e) {}
}

/* ========================================================= */
/* EVENTS */
/* ========================================================= */

async function stampaEtichettaProduzione() {
  if (!ricettaSelezionata?.id) { alert("Seleziona prima una ricetta."); return; }
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const azienda = window.state?.azienda;
  const sedeNome = window.state?.sedeAttiva?.nome || azienda?.nome || "";

  const { data: ric } = await supabase
    .from("ricette")
    .select("nome, shelf_life_giorni, shelf_life_tipo, allergeni")
    .eq("id", ricettaSelezionata.id)
    .maybeSingle();

  const nome = ric?.nome || ricettaSelezionata.nome || "Prodotto";
  const dataProd = document.getElementById("prod-data")?.value || new Date().toISOString().slice(0, 10);
  const dataFmt = new Date(dataProd).toLocaleDateString("it-IT");
  const lotto = (document.getElementById("prod-lotto")?.value || "").trim() || "________";
  const note = (document.getElementById("prod-note-lotto")?.value || "").trim();
  const operatore = (document.getElementById("prod-operatore-info")?.innerText || "").replace(/nessun operatore identificato/i, "").trim() || "____________";

  let scadenza = "____ / ____ / ________";
  if (ric?.shelf_life_giorni) {
    const d = new Date(dataProd);
    d.setDate(d.getDate() + Number(ric.shelf_life_giorni));
    scadenza = d.toLocaleDateString("it-IT");
  }
  const conservazione = ric?.shelf_life_tipo ? escapeHtml(ric.shelf_life_tipo) : "____________";

  let allergeniTxt = "—";
  if (Array.isArray(ric?.allergeni) && ric.allergeni.length) {
    allergeniTxt = ric.allergeni.map((a) => (typeof a === "string" ? a : (a?.nome || a?.label || ""))).filter(Boolean).join(", ");
  }

  const copie = Math.max(1, Math.min(40, parseInt(prompt("Quante etichette vuoi stampare?", "1"), 10) || 1));

  const etichetta = `
    <div class="lbl">
      <div class="lbl-name">${escapeHtml(nome)}</div>
      <div class="lbl-sede">${escapeHtml(sedeNome)}</div>
      <div class="lbl-row"><span>Lotto</span><b>${escapeHtml(lotto)}</b></div>
      <div class="lbl-row"><span>Prodotto il</span><b>${dataFmt}</b></div>
      <div class="lbl-row"><span>Consumare entro</span><b>${scadenza}</b></div>
      <div class="lbl-row"><span>Conservazione</span><b>${conservazione}</b></div>
      <div class="lbl-aller"><span>Allergeni:</span> ${escapeHtml(allergeniTxt)}</div>
      ${note ? `<div class="lbl-note">${escapeHtml(note)}</div>` : ""}
      <div class="lbl-row"><span>Operatore</span><b>${escapeHtml(operatore)}</b></div>
    </div>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Consenti i popup del browser per vedere l'anteprima."); return; }
  win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
    <title>Etichetta — ${escapeHtml(nome)}</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; font-family:Arial,sans-serif; }
      body { padding:16px; background:#f1f5f9; }
      .grid { display:flex; flex-wrap:wrap; gap:8px; }
      .lbl { width:88mm; border:1.5px solid #1a1a2e; border-radius:6px; padding:8px 10px; background:white; }
      .lbl-name { font-size:17px; font-weight:800; color:#0E5A7A; line-height:1.1; }
      .lbl-sede { font-size:10px; color:#64748b; margin-bottom:6px; text-transform:uppercase; letter-spacing:.5px; }
      .lbl-row { display:flex; justify-content:space-between; font-size:12px; padding:2px 0; border-bottom:1px dotted #cbd5e1; }
      .lbl-row span { color:#64748b; }
      .lbl-aller { font-size:11px; margin-top:5px; background:#fff7ed; border:1px solid #fed7aa; border-radius:4px; padding:3px 6px; }
      .lbl-aller span { font-weight:700; color:#9a3412; }
      .lbl-note { font-size:11px; font-style:italic; color:#334155; margin-top:4px; }
      @media print { body { padding:0; background:white; } .no-print { display:none; } .lbl { break-inside:avoid; } }
    </style></head><body>
    <div class="no-print" style="text-align:center;padding:10px;margin-bottom:12px;">
      <button onclick="window.print()" style="background:#0E5A7A;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">🖨️ Stampa etichette</button>
    </div>
    <div class="grid">${etichetta.repeat(copie)}</div>
  </body></html>`);
  win.document.close();
  try { win.document.body.insertAdjacentHTML("beforeend", '<button onclick="window.close()" class="rf-no-print" style="position:fixed;top:10px;right:10px;z-index:999;background:#0E5A7A;color:#fff;border:none;border-radius:999px;padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.25);">✕ Chiudi</button><style>@media print{.rf-no-print{display:none!important}}</style>'); } catch(e) {}
}

function bindEvents() {
  document.getElementById("btn-back")?.addEventListener("click", () => {
    window.location.hash = "#/produzione";
  });

  document.getElementById("btn-scheda-tecnica")?.addEventListener("click", apriSchedaTecnica);
  document.getElementById("btn-stampa-produzione")?.addEventListener("click", stampaSchedaProduzione);
  document.getElementById("btn-stampa-etichetta")?.addEventListener("click", stampaEtichettaProduzione);
  document.getElementById("prod-tech-close")?.addEventListener("click", chiudiSchedaTecnica);
  document.getElementById("prod-tech-backdrop")?.addEventListener("click", (e) => {
    if (e.target?.id === "prod-tech-backdrop") chiudiSchedaTecnica();
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

  document.getElementById("btn-add-confezione")?.addEventListener("click", () => {
    if (savedLotto) return;
    addConfezioneRow();
  });

  document.getElementById("confezioni-wrap")?.addEventListener("change", (e) => onConfezioniChange(e));
  document.getElementById("confezioni-wrap")?.addEventListener("input", (e) => onConfezioniChange(e));
  document.getElementById("confezioni-wrap")?.addEventListener("click", (e) => onConfezioniClick(e));

  document.getElementById("btn-add-coprodotto")?.addEventListener("click", () => {
    if (savedLotto) return;
    addCoprodottoRow();
  });

  document.getElementById("btn-add-fase-haccp")?.addEventListener("click", () => {
    if (savedLotto) return;
    aggiungiFaseHaccpManuale();
  });

  document.getElementById("coprodotti-wrap")?.addEventListener("change", (e) => onCoprodottiChange(e));
  document.getElementById("coprodotti-wrap")?.addEventListener("input", (e) => onCoprodottiChange(e));
  document.getElementById("coprodotti-wrap")?.addEventListener("click", (e) => onCoprodottiClick(e));

  document.getElementById("resa-teorica")?.addEventListener("input", (e) => {
    e.target.dataset.manuale = (e.target.value || "").trim() ? "1" : "0";
    recalcResaUI();
  });

  document.getElementById("prod-giorni-rapidi")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-gg]");
    if (!b || savedLotto) return;
    const dataProd = document.getElementById("prod-data")?.value;
    if (!dataProd) { alert("Imposta prima la data di produzione."); return; }
    const d = new Date(dataProd + "T00:00:00");
    d.setDate(d.getDate() + parseInt(b.dataset.gg));
    const scadEl = document.getElementById("prod-scadenza");
    if (scadEl) scadEl.value = d.toISOString().split("T")[0];
  });

  document.getElementById("btn-salva-produzione")?.addEventListener("click", salvaProduzione);

  document.getElementById("btn-print-lotto")?.addEventListener("click", stampaEtichetteConfezioni);
  document.getElementById("btn-print-coprodotti")?.addEventListener("click", stampaEtichetteCoprodotti);
  document.getElementById("btn-print-haccp")?.addEventListener("click", stampaRegistroHaccp);
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

  const confezioni = confezioniRows.map((r) => ({
    id: r.id,
    porzione_id: (r.porzione_id || "").toString(),
    pezzi_per_confezione: Math.max(0, Math.floor(toNumber(r.pezzi_per_confezione) || 0)),
    numero_confezioni: Math.max(0, Math.floor(toNumber(r.numero_confezioni) || 0)),
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
    confezioni,
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

  if (!ricettaSelezionata?.prodotto_output_id) {
    return "La ricetta non ha un prodotto output associato (prodotto_output_id).";
  }

  const confezioniValide = (dati.confezioni || []).filter((c) => c.porzione_id && c.pezzi_per_confezione > 0 && c.numero_confezioni > 0);
  if (!confezioniValide.length) return "Inserisci almeno una confezione valida (porzionatura + pezzi + numero confezioni).";

  const totConfezionato = getTotaleConfezionatoKg();
  if (!Number.isFinite(totConfezionato) || totConfezionato <= 0) {
    return "Totale confezionato non valido. Controlla le righe confezionamento.";
  }

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

  return null;
}


function getLottoRefId(lotto) {
  // Usa lotto_uuid se presente (tracciabilità universale), fallback su id.
  return lotto?.lotto_uuid ?? lotto?.id ?? null;
}

/* ========================================================= */
/* ========================================================= */
/* HACCP — FASI PRODUZIONE                                   */
/* ========================================================= */

async function loadFasiHaccp(ricettaId) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  if (!supabase || !aziendaId || !ricettaId) return;

  const { data, error } = await supabase
    .from("ricette_preparazione_fasi")
    .select("id, ordine, nome_fase, tipo_fase, descrizione_operativa, tecnologia, temperatura, durata_min, dispositivo_id")
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", aziendaId)
    .order("ordine", { ascending: true });

  if (error) { console.error(error); fasiCache = []; renderFasiHaccp(); return; }
  fasiCache = data || [];

  // ── FASI HACCP STANDARD: porzionatura e conservazione sono SEMPRE firmabili,
  //    anche se la ricetta non le prevede (aggiunte come fasi sintetiche, fase_id null)
  const nomiEsistenti = fasiCache.map(f => String((f.nome_fase || "") + " " + (f.tipo_fase || "")).toLowerCase());
  const haTipo = (kw) => nomiEsistenti.some(n => kw.some(k => n.includes(k)));
  let ordMax = fasiCache.reduce((m, f) => Math.max(m, Number(f.ordine) || 0), 0);
  // Porzionatura
  if (!haTipo(["porzion"])) {
    ordMax += 1;
    fasiCache.push({ id: null, ordine: ordMax, nome_fase: "Porzionatura", tipo_fase: "porzionatura", descrizione_operativa: "Porzionare rispettando le buone prassi igieniche.", tecnologia: null, temperatura: null, durata_min: null, dispositivo_id: null, sintetica: true });
  }
  // Confezionamento (fase firmabile a sé)
  if (!haTipo(["confezion"])) {
    ordMax += 1;
    fasiCache.push({ id: null, ordine: ordMax, nome_fase: "Confezionamento", tipo_fase: "confezionamento", descrizione_operativa: "Confezionare ed etichettare (lotto e scadenza) rispettando le buone prassi igieniche.", tecnologia: null, temperatura: null, durata_min: null, dispositivo_id: null, sintetica: true });
  }
  // Conservazione
  if (!haTipo(["conserv", "stocc", "abbatt"])) {
    ordMax += 1;
    fasiCache.push({ id: null, ordine: ordMax, nome_fase: "Conservazione / stoccaggio", tipo_fase: "conservazione", descrizione_operativa: "Riporre il prodotto etichettato alla temperatura di conservazione prevista.", tecnologia: null, temperatura: null, durata_min: null, dispositivo_id: null, sintetica: true });
  }

  // Carica dispositivi collegati alle fasi
  const dispIds = [...new Set(fasiCache.map(f => f.dispositivo_id).filter(Boolean))];
  dispositividMap = {};
  if (dispIds.length) {
    const { data: disps } = await supabase
      .from("dispositivi")
      .select("id, nome, tipo, connesso, temperatura_min, temperatura_max")
      .in("id", dispIds);
    (disps || []).forEach(d => { dispositividMap[d.id] = d; });
  }

  // Inizializza log vuoto per ogni fase
  logHaccp = fasiCache.map(f => {
    const disp = f.dispositivo_id ? (dispositividMap[f.dispositivo_id] || null) : null;
    return {
      fase_id: f.id,
      fase_ordine: f.ordine,
      fase_nome: f.nome_fase || f.tipo_fase || `Fase ${f.ordine}`,
      fase_tipo: f.tipo_fase,
      dispositivo_id: f.dispositivo_id || null,
      fonte_dato: disp?.connesso ? "automatico" : "manuale",
      tecnologia_prevista: disp ? disp.nome : (f.tecnologia || ""),
      temperatura_prevista: f.temperatura ?? null,
      temperatura_min: disp?.temperatura_min ?? null,
      temperatura_max: disp?.temperatura_max ?? null,
      temperatura_rilevata: "",
      temperatura_ok: null,
      ora_inizio: "",
      ora_fine: "",
      durata_reale_min: null,
      esito: "ok",
      note: "",
      firmato: false,
      firmato_da: "",
      firmato_il: "",
      firme: []
    };
  });

  renderFasiHaccp();
}

function aggiungiFaseHaccpManuale() {
  const tipoEl = document.getElementById("haccp-nuova-tipo");
  const descEl = document.getElementById("haccp-nuova-desc");
  const tipo = (tipoEl?.value || "abbattimento").trim();
  const desc = (descEl?.value || "").trim();

  const nomiTipo = {
    abbattimento: "Abbattimento",
    conservazione: "Conservazione / stoccaggio",
    raffreddamento: "Raffreddamento",
    cottura: "Cottura",
    preparazione: "Preparazione",
    porzionatura: "Porzionatura",
    confezionamento: "Confezionamento",
  };
  const nome = nomiTipo[tipo] || "Fase";

  // ordine = dopo l'ultima fase attuale
  const ordMax = fasiCache.reduce((m, f) => Math.max(m, Number(f.ordine) || 0), 0) + 1;

  const nuovaFase = {
    id: null,
    ordine: ordMax,
    nome_fase: nome,
    tipo_fase: tipo,
    descrizione_operativa: desc || null,
    tecnologia: null,
    temperatura: null,
    durata_min: null,
    dispositivo_id: null,
    sintetica: true,
  };
  fasiCache.push(nuovaFase);

  // riga di registrazione corrispondente
  logHaccp.push({
    fase_id: null,
    fase_ordine: ordMax,
    fase_nome: nome,
    fase_tipo: tipo,
    dispositivo_id: null,
    fonte_dato: "manuale",
    tecnologia_prevista: "",
    temperatura_prevista: null,
    temperatura_min: null,
    temperatura_max: null,
    temperatura_rilevata: "",
    temperatura_ok: null,
    ora_inizio: "",
    ora_fine: "",
    durata_reale_min: null,
    esito: "ok",
    note: desc || "",
    firmato: false,
    firmato_da: null,
    firmato_il: null,
    firme: [],
  });

  if (descEl) descEl.value = "";
  renderFasiHaccp();

  // porto l'utente sulla fase appena aggiunta (l'ultima)
  setTimeout(() => {
    const list = document.getElementById("haccp-fasi-list");
    const card = list?.querySelector(`[data-idx="${logHaccp.length - 1}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.style.transition = "background .4s";
      card.style.background = "#ecfeff";
      setTimeout(() => { card.style.background = ""; }, 1600);
    }
  }, 100);
}

function renderFasiHaccp() {
  const emptyEl = document.getElementById("haccp-empty-msg");
  const wrap = document.getElementById("haccp-fasi-wrap");
  const list = document.getElementById("haccp-fasi-list");
  if (!wrap || !list) return;
  // (l'abilitazione stampe viene ricalcolata a fine funzione)

  // Se non c'è nessuna ricetta selezionata → mostro solo il messaggio.
  // Se c'è una ricetta (anche senza fasi) → mostro il wrap col bottone "aggiungi fase".
  if (!ricettaSelezionata) {
    if (emptyEl) emptyEl.style.display = "";
    wrap.style.display = "none";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  wrap.style.display = "";

  if (!fasiCache.length) {
    list.innerHTML = `<div style="color:#94a3b8;font-size:13px;font-style:italic;padding:8px 0;">Nessuna fase dalla ricetta. Aggiungine una qui sotto (es. abbattimento a cottura ultimata).</div>`;
    aggiornaAbilitazioneStampe();
    return;
  }

  const tipoLabel = { preparazione: "🔪 Prep.", cottura: "🔥 Cottura", raffreddamento: "❄️ Raffr.", attesa: "⏳ Attesa", abbattimento: "❄️ Abbatt.", confezionamento: "📦 Confez.", porzionatura: "🔪 Porz.", conservazione: "🧊 Conserv." };
  const borderColor = { cottura: "#f97316", raffreddamento: "#0ea5e9", preparazione: "#0E5A7A", attesa: "#a855f7", abbattimento: "#0891b2", confezionamento: "#7c3aed", porzionatura: "#0E5A7A", conservazione: "#0ea5e9" };

  list.innerHTML = fasiCache.map((f, idx) => {
    const log = logHaccp[idx];
    const disp = f.dispositivo_id ? (dispositividMap[f.dispositivo_id] || null) : null;
    const automatico = disp?.connesso === true;
    const hasTempPrevista = f.temperatura != null || disp?.temperatura_min != null;
    const tempLabel = f.temperatura != null ? `${f.temperatura}°C`
      : disp?.temperatura_min != null ? `${disp.temperatura_min}–${disp.temperatura_max ?? "?"}°C` : null;

    const dispBadge = disp
      ? automatico
        ? `<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:20px;font-size:11px;">🤖 ${escapeHtml(disp.nome)}</span>`
        : `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-size:11px;">✋ ${escapeHtml(disp.nome)}</span>`
      : `<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:20px;font-size:11px;">✋ Manuale</span>`;

    const ro = automatico ? "readonly" : "";
    const bgAuto = automatico ? "background:#f0fdf4;" : "";

    return `<div class="azienda-card" style="margin-bottom:12px;border-left:4px solid ${borderColor[f.tipo_fase] || "#0E5A7A"};" data-idx="${idx}">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        <div>
          <strong>Fase ${f.ordine} — ${escapeHtml(f.nome_fase || f.tipo_fase)}</strong>
          <span style="margin-left:6px;font-size:12px;color:#64748b;">${tipoLabel[f.tipo_fase] || f.tipo_fase}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          ${dispBadge}
          ${tempLabel ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-size:11px;">🌡 ${tempLabel}</span>` : ""}
          ${f.durata_min ? `<span style="background:#f0fdf4;color:#166534;padding:2px 8px;border-radius:20px;font-size:11px;">⏱ ${f.durata_min}min</span>` : ""}
        </div>
      </div>

      ${f.descrizione_operativa ? `<div style="background:var(--bg,#f8fafc);border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px;border:1px solid #e5e7eb;">📋 ${escapeHtml(f.descrizione_operativa)}</div>` : ""}
      ${automatico ? `<div style="background:#dcfce7;border-radius:8px;padding:8px 12px;font-size:12px;color:#15803d;margin-bottom:10px;">🤖 Dati automatici da <strong>${escapeHtml(disp.nome)}</strong> — aggiungi note se necessario.</div>` : ""}

      <div class="form-grid" style="margin-bottom:10px;">
        <div class="form-group">
          <label style="font-size:11px;">Ora inizio</label>
          <input type="datetime-local" class="input haccp-inizio" data-idx="${idx}" value="${log.ora_inizio || ""}" ${ro} style="${bgAuto}">
        </div>
        <div class="form-group">
          <label style="font-size:11px;">Ora fine</label>
          <input type="datetime-local" class="input haccp-fine" data-idx="${idx}" value="${log.ora_fine || ""}" ${ro} style="${bgAuto}">
        </div>
        ${hasTempPrevista ? `
        <div class="form-group">
          <label style="font-size:11px;">Temp. rilevata (°C)</label>
          <input type="number" step="0.1" class="input haccp-temp" data-idx="${idx}" value="${log.temperatura_rilevata || ""}" placeholder="${automatico ? "Da dispositivo..." : "es. 72.5"}" ${ro} style="${bgAuto}">
        </div>` : ""}
        <div class="form-group">
          <label style="font-size:11px;">Esito</label>
          <select class="input haccp-esito" data-idx="${idx}">
            <option value="ok" ${log.esito === "ok" ? "selected" : ""}>✅ OK</option>
            <option value="attenzione" ${log.esito === "attenzione" ? "selected" : ""}>⚠️ Attenzione</option>
            <option value="nc" ${log.esito === "nc" ? "selected" : ""}>❌ Non conforme</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-bottom:10px;">
        <label style="font-size:11px;">Note / azioni correttive</label>
        <input type="text" class="input haccp-note" data-idx="${idx}" value="${escapeHtml(log.note || "")}" placeholder="Annotazioni, deviazioni...">
      </div>

      <div>
        ${(Array.isArray(log.firme) && log.firme.length) ? `
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
            ${log.firme.map((f, i) => `<span style="background:#dcfce7;color:#166534;border-radius:12px;padding:2px 10px;font-size:11px;font-weight:600;">✅ ${escapeHtml(f.operatore_nome)}<span style="color:#16a34a;cursor:pointer;margin-left:6px;" onclick="window.__rimuoviFirmaFase(${idx},${i})">✕</span></span>`).join("")}
          </div>` : ""}
        <button type="button" class="app-button small ${(log.firme && log.firme.length) ? "gray" : ""} haccp-firma" data-idx="${idx}">
          ${(log.firme && log.firme.length) ? "➕ Aggiungi firma" : "✍️ Firma fase"}
        </button>
        ${(Array.isArray(log.firme) && log.firme.length) ? `<span style="font-size:11px;color:#64748b;margin-left:8px;">${escapeHtml(new Date(log.firme[0].firmato_il).toLocaleString("it-IT"))}</span>` : ""}
      </div>
    </div>`;
  }).join("");

  // Bind eventi
  list.querySelectorAll(".haccp-inizio").forEach(el => {
    el.addEventListener("change", e => {
      const idx = +e.target.dataset.idx;
      logHaccp[idx].ora_inizio = e.target.value;
      calcolaHaccpDurata(idx);
    });
  });
  list.querySelectorAll(".haccp-fine").forEach(el => {
    el.addEventListener("change", e => {
      const idx = +e.target.dataset.idx;
      logHaccp[idx].ora_fine = e.target.value;
      calcolaHaccpDurata(idx);
    });
  });
  list.querySelectorAll(".haccp-temp").forEach(el => {
    el.addEventListener("input", e => {
      const idx = +e.target.dataset.idx;
      logHaccp[idx].temperatura_rilevata = e.target.value;
      verificaHaccpTemp(idx, e.target);
    });
  });
  list.querySelectorAll(".haccp-esito").forEach(el => {
    el.addEventListener("change", e => { logHaccp[+e.target.dataset.idx].esito = e.target.value; });
  });
  list.querySelectorAll(".haccp-note").forEach(el => {
    el.addEventListener("input", e => { logHaccp[+e.target.dataset.idx].note = e.target.value; });
  });
  list.querySelectorAll(".haccp-firma").forEach(btn => {
    btn.addEventListener("click", () => firmaFaseHaccp(+btn.dataset.idx));
  });
  aggiornaAbilitazioneStampe();
}
function calcolaHaccpDurata(idx) {
  const log = logHaccp[idx];
  if (!log.ora_inizio || !log.ora_fine) return;
  const diff = (new Date(log.ora_fine) - new Date(log.ora_inizio)) / 60000;
  log.durata_reale_min = diff > 0 ? Math.round(diff * 10) / 10 : 0;
}

function verificaHaccpTemp(idx, inputEl) {
  const log = logHaccp[idx];
  const fase = fasiCache[idx];
  if (!fase?.temperatura || !log.temperatura_rilevata) { inputEl.style.borderColor = ""; return; }
  const scarto = Math.abs(Number(log.temperatura_rilevata) - Number(fase.temperatura));
  const ok = scarto <= 3;
  inputEl.style.borderColor = ok ? "#22c55e" : "#ef4444";
  log.temperatura_ok = ok;
  if (!ok && log.esito === "ok") {
    log.esito = "attenzione";
    const sel = inputEl.closest("[data-idx]")?.querySelector(".haccp-esito");
    if (sel) sel.value = "attenzione";
  }
}

function firmaFaseHaccp(idx) {
  const log = logHaccp[idx];
  const fase = fasiCache[idx];
  const nomeFase = fase?.nome_fase || fase?.tipo_fase || "fase";
  log.firme = Array.isArray(log.firme) ? log.firme : [];
  const primaFirma = log.firme.length === 0;
  const suggerito = (primaFirma && operatoreRisolto?.pin) ? String(operatoreRisolto.pin) : "";
  const msg = primaFirma
    ? `PIN di chi ha eseguito la fase «${nomeFase}»:`
    : `PIN del collega che ha lavorato la fase «${nomeFase}» insieme:`;
  const pin = (prompt(msg, suggerito) || "").trim();
  if (!pin) return;
  const match = dipendentiCache.find((d) => (d.pin ?? "").toString() === pin);
  if (!match) { alert("PIN non valido ❌"); return; }
  if (log.firme.some((f) => String(f.operatore_id) === String(match.id))) { alert(match.nome + " ha già firmato questa fase."); return; }
  log.firme.push({ operatore_id: match.id ?? null, operatore_nome: match.nome, firmato_il: new Date().toISOString() });
  applicaFirmePrincipale(log);
  if (!log.ora_fine) {
    log.ora_fine = new Date().toISOString().slice(0, 16);
    calcolaHaccpDurata(idx);
  }
  renderFasiHaccp();
  aggiornaAbilitazioneStampe();
}

function aggiornaAbilitazioneStampe() {
  // Le etichette si possono stampare se il lotto e' salvato/ripreso OPPURE
  // se tutte le fasi HACCP risultano firmate (preparazione di fatto completata).
  const tutteFirmate = logHaccp.length > 0 && logHaccp.every((l) => l.firmato);
  const abilita = !!savedLotto || tutteFirmate;
  const pL = document.getElementById("btn-print-lotto");
  const pC = document.getElementById("btn-print-coprodotti");
  if (pL) { if (abilita) pL.removeAttribute("disabled"); else pL.setAttribute("disabled", "disabled"); }
  if (pC) { if (abilita) pC.removeAttribute("disabled"); else pC.setAttribute("disabled", "disabled"); }
}

function applicaFirmePrincipale(log) {
  const firme = Array.isArray(log.firme) ? log.firme : [];
  if (!firme.length) {
    log.firmato = false; log.operatore_id = null; log.operatore_nome = ""; log.firmato_da = ""; log.firmato_il = "";
    return;
  }
  const primo = firme[0];
  log.firmato = true;
  log.operatore_id = primo.operatore_id;      // il primo firmatario resta il principale (per costo/valutazioni)
  log.operatore_nome = primo.operatore_nome;
  log.firmato_da = firme.map((f) => f.operatore_nome).join(" + ");
  log.firmato_il = primo.firmato_il;
}

function rimuoviFirmaFase(idx, i) {
  const log = logHaccp[idx];
  if (!log || !Array.isArray(log.firme)) return;
  log.firme.splice(i, 1);
  applicaFirmePrincipale(log);
  renderFasiHaccp();
}
window.__rimuoviFirmaFase = rimuoviFirmaFase;

async function salvaProduzione() {
  const esito = document.getElementById("r-esito") || null;
  const setEsito = (msg, err) => { if (esito) { esito.textContent = msg; esito.style.color = err ? "#b91c1c" : "#15803d"; } };

  if (!ricettaSelezionata?.id) { alert("Seleziona prima una ricetta."); return; }
  if (savedLotto) { alert("Produzione già registrata."); return; }

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  if (!supabase || !aziendaId) { alert("Sessione non valida."); return; }

  const btn = document.getElementById("btn-salva-produzione");
  if (btn) { btn.disabled = true; btn.textContent = "Salvataggio..."; }

  try {
    const dataProd = document.getElementById("prod-data")?.value || new Date().toISOString().slice(0, 10);
    const scadenza = document.getElementById("prod-scadenza")?.value || null;
    const note = document.getElementById("prod-note-lotto")?.value || null;
    const pesoReale = getPesoRealeKg();
    const scenarioId = document.getElementById("prod-conservazione")?.value || null;
    const lottoUuid = (crypto?.randomUUID && crypto.randomUUID()) || null;

    // 1) crea il lotto in stato "aperta" -> comparirà in Produzioni aperte
    const { data: nuovo, error } = await supabase.from("produzione_lotti").insert({
      azienda_id: aziendaId,
      ricetta_id: ricettaSelezionata.id,
      data_produzione: dataProd,
      data_scadenza: scadenza,
      quantita_output: pesoReale || null,
      unita_misura: "kg",
      scenario_conservazione_id: scenarioId,
      stato: "aperta",
      sede_uuid: window.state?.sedeAttiva?.id || null,
      luogo: window.state?.sedeAttiva?.nome || null,
      note: note,
      operatore_id: operatoreRisolto?.id || null,
      lotto_uuid: lottoUuid,
      dettaglio_confezionamento: buildDettaglioConfezionamento(),
    }).select("id, lotto_uuid, codice_lotto").single();

    if (error) throw error;
    const luuid = nuovo?.lotto_uuid || lottoUuid;

    // 2) salva TUTTE le fasi HACCP (incluse porzionatura/confezionamento/conservazione sintetiche)
    //    con le eventuali firme già apposte in questa schermata
    await salvaLogHaccpConLotto(luuid, aziendaId, false);

    // 3) aggancio lo stato locale: la produzione è ora "aperta" e stampabile
    savedLotto = { lotto_uuid: luuid, id: nuovo.id, codice_lotto: nuovo.codice_lotto };
    savedLottoUUID = luuid;
    resumeLottoUUID = luuid;
    aggiornaAbilitazioneStampe();
    setEsito("✅ Produzione registrata e aperta in Produzioni aperte. Lotto: " + (nuovo.codice_lotto || String(luuid).slice(0, 8)), false);
    if (btn) btn.textContent = "✅ Registrata";
  } catch (e) {
    console.error("salvaProduzione:", e);
    setEsito("❌ Errore: " + (e.message || "salvataggio non riuscito"), true);
    if (btn) { btn.disabled = false; btn.textContent = "💾 Registra / apri in Produzioni"; }
  }
}

// Costruisce il JSON confezionamento dai row correnti (per la stampa etichette dopo)
function buildDettaglioConfezionamento() {
  try {
    return (confezioniRows || [])
      .filter(c => c.porzione_id && Number(c.pezzi_per_confezione) > 0 && Number(c.numero_confezioni) > 0)
      .map(c => {
        const porz = porzioniCache.find(p => String(p.id) === String(c.porzione_id));
        const pesoKg = toKg(porz?.peso_porzione, porz?.unita_misura);
        return {
          porzione_id: String(c.porzione_id),
          label: porz?.label || "",
          pezzi_per_confezione: Number(c.pezzi_per_confezione),
          numero_confezioni: Number(c.numero_confezioni),
          peso_porzione_kg: pesoKg,
          kg_per_confezione: pesoKg * Number(c.pezzi_per_confezione),
          kg_totali_riga: pesoKg * Number(c.pezzi_per_confezione) * Number(c.numero_confezioni),
          note: c.note || "",
        };
      });
  } catch (e) { return []; }
}

async function salvaLogHaccpConLotto(lottoUUID, aziendaId, resume) {
  const supabase = window.supabaseClient;
  if (!logHaccp.length || !lottoUUID) return;

  // In resume le righe fase esistono già (create all'apertura): le aggiorno.
  if (resume) {
    for (const log of logHaccp) {
      if (!log.fase_id) continue;
      try {
        await supabase.from("produzione_log_haccp").update({
          operatore_id: log.operatore_id || operatoreRisolto?.id || null,
          operatore_nome: log.operatore_nome || operatoreRisolto?.nome || null,
          temperatura_rilevata: log.temperatura_rilevata !== "" ? Number(log.temperatura_rilevata) : null,
          temperatura_ok: log.temperatura_ok ?? null,
          ora_inizio: log.ora_inizio ? new Date(log.ora_inizio).toISOString() : null,
          ora_fine: log.ora_fine ? new Date(log.ora_fine).toISOString() : null,
          durata_reale_min: log.durata_reale_min ?? null,
          esito: log.esito || "ok",
          note: log.note || null,
          firmato_da: log.firmato_da || null,
          firmato_il: log.firmato_il || (log.firmato ? new Date().toISOString() : null),
          firme: log.firme || []
        }).eq("lotto_id", lottoUUID).eq("fase_id", log.fase_id);
      } catch (e) { console.warn("Update log HACCP fase non riuscito:", e); }
    }
    return;
  }

  const rows = logHaccp.map(log => ({
    azienda_id: aziendaId,
    lotto_id: lottoUUID,
    ricetta_id: ricettaSelezionata?.id || null,
    fase_id: log.fase_id || null,
    fase_ordine: log.fase_ordine,
    fase_nome: log.fase_nome,
    fase_tipo: log.fase_tipo,
    dispositivo_id: log.dispositivo_id || null,
    fonte_dato: log.fonte_dato || "manuale",
    tecnologia_prevista: log.tecnologia_prevista || null,
    temperatura_prevista: log.temperatura_prevista ?? null,
    operatore_id: log.operatore_id || operatoreRisolto?.id || null,
    operatore_nome: log.operatore_nome || operatoreRisolto?.nome || null,
    temperatura_rilevata: log.temperatura_rilevata !== "" ? Number(log.temperatura_rilevata) : null,
    temperatura_ok: log.temperatura_ok ?? null,
    ora_inizio: log.ora_inizio ? new Date(log.ora_inizio).toISOString() : null,
    ora_fine: log.ora_fine ? new Date(log.ora_fine).toISOString() : null,
    durata_reale_min: log.durata_reale_min ?? null,
    esito: log.esito || "ok",
    note: log.note || null,
    firmato_da: log.firmato_da || null,
    firmato_il: log.firmato_il || (log.firmato ? new Date().toISOString() : null),
    firme: log.firme || []
  }));

  try {
    await supabase.from("produzione_log_haccp").insert(rows);
  } catch (e) {
    console.warn("Log HACCP non salvato (best-effort):", e);
  }
}

async function stampaRegistroHaccp() {
  const azienda = window.state?.azienda;
  const supabase = window.supabaseClient;
  const nomeRicetta = ricettaSelezionata?.nome || "—";
  const codLotto = document.getElementById("prod-lotto")?.value || savedLotto?.codice_lotto || "—";
  const dataOggi = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  const operatore = operatoreRisolto?.nome || "—";

  // ── FONTE DATI: DB se il lotto esiste (firme vere salvate), altrimenti stato in pagina ──
  const lottoRef = (typeof resumeLottoUUID !== "undefined" && resumeLottoUUID) || savedLotto?.lotto_uuid || null;
  let fonte = [];
  if (lottoRef && supabase) {
    const { data } = await supabase.from("produzione_log_haccp")
      .select("*").eq("lotto_id", lottoRef).order("fase_ordine");
    if (data && data.length) fonte = data;
  }
  if (!fonte.length) {
    if (!logHaccp.length) { alert("Nessuna fase da stampare."); return; }
    fonte = logHaccp.map((log, idx) => Object.assign({}, log, {
      temperatura_prevista: fasiCache[idx]?.temperatura ?? log.temperatura_prevista ?? null,
    }));
  }

  const fmtOra = (v) => v ? new Date(v).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtFirmaIl = (v) => {
    if (!v) return "";
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const totFasi = fonte.length;
  const firmate = fonte.filter(l => l.firmato_da).length;

  const righe = fonte.map((log) => {
    const esitoIcon = { ok: "✅", attenzione: "⚠️", nc: "❌" }[log.esito] || "";
    const tempPrev = log.temperatura_prevista != null ? `${log.temperatura_prevista}°C` : "—";
    const tempRilVal = (log.temperatura_rilevata !== "" && log.temperatura_rilevata != null) ? log.temperatura_rilevata : null;
    const tempRil = tempRilVal != null ? `${tempRilVal}°C` : "—";
    const firmaCell = log.firmato_da
      ? `<div style="font-weight:700;">✍️ ${escapeHtml(log.firmato_da)}</div><div style="font-size:10px;color:#64748b;">${escapeHtml(fmtFirmaIl(log.firmato_il))}</div>`
      : `<span style="color:#dc2626;font-weight:700;font-size:11px;">NON FIRMATA</span>`;
    return `<tr style="border-bottom:1px solid #e5e7eb;${log.firmato_da ? "" : "background:#fef2f2;"}">
      <td style="padding:8px;">${log.fase_ordine ?? ""}</td>
      <td style="padding:8px;">${escapeHtml(log.fase_nome || "")}</td>
      <td style="padding:8px;font-size:12px;color:#64748b;">${escapeHtml(log.tecnologia_prevista || "—")}</td>
      <td style="padding:8px;text-align:center;">${tempPrev}</td>
      <td style="padding:8px;text-align:center;font-weight:700;color:${log.temperatura_ok === false ? "#dc2626" : "#16a34a"}">${tempRil}</td>
      <td style="padding:8px;font-size:12px;">${fmtOra(log.ora_inizio)}</td>
      <td style="padding:8px;font-size:12px;">${fmtOra(log.ora_fine)}</td>
      <td style="padding:8px;font-size:12px;">${log.durata_reale_min != null ? `${log.durata_reale_min}min` : "—"}</td>
      <td style="padding:8px;text-align:center;">${esitoIcon}</td>
      <td style="padding:8px;font-size:11px;color:#64748b;">${escapeHtml(log.note || "")}</td>
      <td style="padding:8px;font-size:11px;">${firmaCell}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
    <title>Registro HACCP — ${escapeHtml(nomeRicetta)}</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; font-family:Arial,sans-serif; }
      body { padding:32px; color:#1a1a2e; }
      h1 { font-size:20px; margin-bottom:4px; }
      .sub { font-size:13px; color:#64748b; margin-bottom:20px; }
      .meta { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
      .meta-item { background:#f8fafc; border-radius:8px; padding:10px; }
      .meta-label { font-size:10px; text-transform:uppercase; color:#64748b; letter-spacing:1px; }
      .meta-value { font-size:15px; font-weight:700; margin-top:3px; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th { background:#0E5A7A; color:white; padding:8px; text-align:left; font-size:11px; text-transform:uppercase; }
      .firma-box { margin-top:44px; display:flex; justify-content:space-between; gap:40px; align-items:flex-end; }
      .firma-line { border-top:1px solid #1a1a2e; width:220px; text-align:center; padding-top:6px; font-size:11px; color:#64748b; }
      .riepilogo { font-size:13px; font-weight:700; color:${firmate === totFasi ? "#16a34a" : "#b45309"}; }
      @media print { .no-print { display:none !important; } body { padding:14px; } }
    </style></head><body>
    <div class="no-print" style="display:flex;justify-content:center;gap:10px;padding:12px;background:#f8fafc;margin-bottom:16px;">
      <button onclick="window.print()" style="background:#0E5A7A;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">🖨️ Stampa / Salva PDF</button>
      <button onclick="window.close()" style="background:#e2e8f0;color:#334155;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">✕ Chiudi</button>
    </div>
    <h1>Registro HACCP Produzione</h1>
    <div class="sub">${escapeHtml(azienda?.nome || "")} — ${dataOggi}</div>
    <div class="meta">
      <div class="meta-item"><div class="meta-label">Ricetta</div><div class="meta-value">${escapeHtml(nomeRicetta)}</div></div>
      <div class="meta-item"><div class="meta-label">Lotto</div><div class="meta-value">${escapeHtml(codLotto)}</div></div>
      <div class="meta-item"><div class="meta-label">Data</div><div class="meta-value">${dataOggi}</div></div>
      <div class="meta-item"><div class="meta-label">Responsabile</div><div class="meta-value">${escapeHtml(operatore)}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>Fase</th><th>Attrezzatura</th><th>T° prev.</th><th>T° rilev.</th>
        <th>Inizio</th><th>Fine</th><th>Durata</th><th>Esito</th><th>Note</th><th>Firma operatore</th>
      </tr></thead>
      <tbody>${righe}</tbody>
    </table>
    <div class="firma-box">
      <div class="riepilogo">Fasi firmate: ${firmate}/${totFasi} ${firmate === totFasi ? "✅" : "⚠️ registro incompleto"}</div>
      <div style="display:flex;gap:40px;">
        <div class="firma-line">Responsabile qualità (firma)</div>
        <div class="firma-line">Data</div>
      </div>
    </div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Consenti i popup per aprire il registro."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

function calcolaEMostraEconomia({ lotto, ingredienti, moltiplicatore, pesoRealeKg, confezionatoKg, fasiCache, scenario }) {
  const empty = document.getElementById("econ-empty");
  const wrap = document.getElementById("econ-wrap");
  const kpiGrid = document.getElementById("econ-kpi-grid");
  const dettaglio = document.getElementById("econ-dettaglio");
  const programmazione = document.getElementById("econ-programmazione");

  if (!wrap || !kpiGrid) return;

  // ── Costo materie prime ──────────────────────────────────────────
  let costoMP = 0;
  const righeMP = [];
  for (const ing of (ingredienti || [])) {
    const q = toNumber(ing.quantita ?? 0) * moltiplicatore;
    const prod = prodottiCache.find(p => String(p.id) === String(ing.prodotto_id));
    const costoUnitario = toNumber(prod?.costo_medio || prod?.costo_ultimo || 0);
    // costo_medio è €/kg
    const costoRiga = q * costoUnitario;
    costoMP += costoRiga;
    if (prod && q > 0) {
      righeMP.push({ nome: prod.nome || prod.descrizione || "Ingrediente", q, costoUnitario, costoRiga });
    }
  }

  // ── Costo manodopera stimato dalle fasi ──────────────────────────
  let minLavoroTotale = 0;
  for (const f of (fasiCache || [])) {
    minLavoroTotale += toNumber(f.lavoro_umano_min || 0);
  }
  // Scala col moltiplicatore solo se > 1 batch
  const minLavoroScalato = minLavoroTotale * Math.max(1, moltiplicatore);
  const oreLavoro = minLavoroScalato / 60;
  const costoManodopera = oreLavoro * costoOrarioDipendente;

  // ── Totali ───────────────────────────────────────────────────────
  const costoTotale = costoMP + costoManodopera;
  const pesoKg = pesoRealeKg || 1;
  const costoPorKg = costoTotale / pesoKg;

  // ── KPI Grid ─────────────────────────────────────────────────────
  const money = (v) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);
  const fmt = (v, dec = 2) => Number(v || 0).toFixed(dec);

  kpiGrid.innerHTML = `
    <div class="tb-kpi"><span>Costo materie prime</span><strong>${money(costoMP)}</strong></div>
    <div class="tb-kpi"><span>Manodopera (${fmt(oreLavoro, 1)}h × €${costoOrarioDipendente}/h)</span><strong>${money(costoManodopera)}</strong></div>
    <div class="tb-kpi"><span>Costo totale produzione</span><strong style="color:#0E5A7A;">${money(costoTotale)}</strong></div>
    <div class="tb-kpi"><span>Costo per kg prodotto</span><strong>${money(costoPorKg)}</strong></div>
    <div class="tb-kpi"><span>Peso reale prodotto</span><strong>${fmt(pesoKg, 3)} kg</strong></div>
    <div class="tb-kpi"><span>Resa %</span><strong>${fmt(confezionatoKg / pesoKg * 100, 1)}%</strong></div>
  `;

  // ── Dettaglio ingredienti ─────────────────────────────────────────
  if (dettaglio) {
    const righeHtml = righeMP.map(r =>
      `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:12px;">
        <span>${escapeHtml(r.nome)}</span>
        <span style="color:#6b7280;">${fmt(r.q, 3)} kg × ${money(r.costoUnitario)}/kg = <strong>${money(r.costoRiga)}</strong></span>
      </div>`
    ).join("");

    dettaglio.innerHTML = righeHtml
      ? `<div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;">Dettaglio materie prime:</div>${righeHtml}`
      : "";
  }

  // ── Testo programmazione settimanale ─────────────────────────────
  if (programmazione) {
    const shelfGg = scenario?.shelf_life_giorni || 0;
    const dataScad = lotto?.data_scadenza || "";
    const produzioniSettimana = shelfGg >= 7 ? Math.floor(shelfGg / 7) : 1;

    const lines = [
      `<strong>Lotto ${escapeHtml(lotto?.codice_lotto || "")}</strong> — ${fmt(pesoKg, 2)} kg prodotti`,
      shelfGg ? `📅 Shelf life: <strong>${shelfGg} giorni</strong> — scadenza ${dataScad ? new Date(dataScad).toLocaleDateString("it-IT") : "—"}` : "",
      `💰 Costo batch: <strong>${money(costoTotale)}</strong> (MP ${money(costoMP)} + MOD ${money(costoManodopera)})`,
      `⚖️ Costo/kg: <strong>${money(costoPorKg)}</strong>`,
      minLavoroTotale ? `👷 Tempo operatore: <strong>${minLavoroScalato} min</strong> (${fmt(oreLavoro, 1)}h)` : "",
      shelfGg >= 7 ? `🔄 Con questa shelf life puoi produrre <strong>ogni ${produzioniSettimana > 1 ? produzioniSettimana + " settimane" : "settimana"}</strong>` : "⚠️ Shelf life breve — produzione frequente necessaria",
    ].filter(Boolean);

    programmazione.innerHTML = lines.map(l => `<div style="margin-bottom:4px;">${l}</div>`).join("");
  }

  if (empty) empty.style.display = "none";
  wrap.style.display = "";

  // Scroll al riepilogo
  setTimeout(() => wrap.closest(".card, .azienda-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300);
}

function lockUIAfterSave() {
  const btnSave = document.getElementById("btn-salva-produzione");
  if (btnSave) btnSave.setAttribute("disabled", "disabled");

  const btnAddCop = document.getElementById("btn-add-coprodotto");
  if (btnAddCop) btnAddCop.setAttribute("disabled", "disabled");

  const btnAddConf = document.getElementById("btn-add-confezione");
  if (btnAddConf) btnAddConf.setAttribute("disabled", "disabled");

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

  renderConfezioniRows();
  renderCoprodottiRows();
}

/* ========================================================= */
/* PRINT */
/* ========================================================= */

/* ========================================================= */
/* STAMPA ETICHETTE – PDF + QR (Orgsta T003)                  */
/* Richiede in index.html:                                    */
/*  - jspdf.umd.min.js  (window.jspdf.jsPDF)                  */
/*  - qrcodejs          (QRCode)                              */
/* Formati: 50x50, 70x40, 100x150 (mm)                        */
/* ========================================================= */

const RF_LABEL_FORMATS = [
  { id: "50x50", label: "50 x 50 mm", w: 50, h: 50 },
  { id: "70x40", label: "70 x 40 mm", w: 70, h: 40 },
  { id: "100x150", label: "100 x 150 mm", w: 100, h: 150 }
];

function rfFormatDateITA(dateISO) {
  const s = (dateISO || "").toString().trim();
  if (!s) return "";
  const d = new Date(s.length === 10 ? s + "T00:00:00" : s);
  if (Number.isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function rfGetLabelFormatById(id) {
  return RF_LABEL_FORMATS.find(f => f.id === id) || RF_LABEL_FORMATS[0];
}

function rfChooseLabelFormat() {
  const last = (localStorage.getItem("rf_label_format") || "50x50").toString();
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.style.cssText =
      "position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;";
    backdrop.innerHTML = `
      <div class="view" style="width:min(520px,100%); border-radius:14px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <h3 style="margin:0;">🖨️ Formato etichetta</h3>
          <button type="button" id="rf-lbl-close" class="app-button tiny gray">✕</button>
        </div>

        <div class="form-help" style="margin-top:8px;">
          Seleziona la misura dell'etichetta (in millimetri). Il PDF generato avrà esattamente questa dimensione.
        </div>

        <div class="form-group" style="margin-top:14px;">
          <label>Formato</label>
          <select id="rf-lbl-format" class="input">
            ${RF_LABEL_FORMATS.map(f => `<option value="${f.id}">${escapeHtml(f.label)}</option>`).join("")}
          </select>
        </div>

        <div class="form-actions" style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" id="rf-lbl-ok" class="app-button">✅ Genera PDF</button>
          <button type="button" id="rf-lbl-cancel" class="app-button gray">Annulla</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const sel = backdrop.querySelector("#rf-lbl-format");
    const btnOk = backdrop.querySelector("#rf-lbl-ok");
    const btnCancel = backdrop.querySelector("#rf-lbl-cancel");
    const btnClose = backdrop.querySelector("#rf-lbl-close");

    if (sel) sel.value = RF_LABEL_FORMATS.some(f => f.id === last) ? last : "50x50";

    const close = (result) => {
      try { document.body.removeChild(backdrop); } catch {}
      resolve(result);
    };

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close(null);
    });

    btnCancel?.addEventListener("click", () => close(null));
    btnClose?.addEventListener("click", () => close(null));

    btnOk?.addEventListener("click", () => {
      const id = (sel?.value || "50x50").toString();
      localStorage.setItem("rf_label_format", id);
      close(rfGetLabelFormatById(id));
    });
  });
}

async function rfMakeQrDataUrl(text, sizePx = 220) {
  try {
    if (typeof QRCode === "undefined") return null;

    const host = document.createElement("div");
    host.style.cssText = "position:fixed; left:-9999px; top:-9999px; width:0; height:0; overflow:hidden;";
    document.body.appendChild(host);

    // qrcodejs renders either canvas or img depending on browser
    const qr = new QRCode(host, {
      text: (text || "").toString(),
      width: sizePx,
      height: sizePx,
      correctLevel: QRCode.CorrectLevel.M
    });

    // allow render
    await new Promise(r => setTimeout(r, 0));

    const img = host.querySelector("img");
    const canvas = host.querySelector("canvas");

    let dataUrl = null;
    if (img?.src) dataUrl = img.src;
    else if (canvas?.toDataURL) dataUrl = canvas.toDataURL("image/png");

    try { qr.clear(); } catch {}
    document.body.removeChild(host);

    return dataUrl;
  } catch (e) {
    console.warn("QR generation failed:", e);
    return null;
  }
}

async function rfPrintLabelsPdf({ format, title, labels }) {
  if (!labels?.length) return;

  if (!window.jspdf?.jsPDF) {
    alert("Libreria jsPDF non disponibile. Controlla index.html (cdn jspdf).");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: [format.w, format.h] });

  for (let i = 0; i < labels.length; i++) {
    if (i > 0) doc.addPage([format.w, format.h]);
    await rfRenderLabelPdfPage(doc, format, labels[i]);
  }

  const nomeFile = `${(title || "etichette").toString().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;

  // ANTEPRIMA a schermo prima di stampare/scaricare
  const blobUrl = doc.output("bloburl");
  mostraAnteprimaStampa(blobUrl, nomeFile, title, labels.length, () => doc.save(nomeFile));
}

// Overlay di anteprima: mostra il PDF e offre Stampa / Scarica / Chiudi
function mostraAnteprimaStampa(blobUrl, nomeFile, title, count, onScarica) {
  const back = document.createElement("div");
  back.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:14px;";
  back.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:min(760px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #e5e7eb;">
        <div>
          <div style="font-weight:800;font-size:16px;">🖨️ Anteprima stampa</div>
          <div style="font-size:12px;color:#64748b;">${escapeHtml(String(title || "Etichette"))} — ${count} etichett${count === 1 ? "a" : "e"}</div>
        </div>
        <button id="rf-prev-close" class="app-button tiny gray">✕</button>
      </div>
      <div style="flex:1;overflow:auto;background:#f1f5f9;">
        <iframe src="${blobUrl}" style="width:100%;height:58vh;border:none;background:#fff;"></iframe>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid #e5e7eb;">
        <button id="rf-prev-print" class="app-button">🖨️ Stampa</button>
        <button id="rf-prev-save" class="app-button secondary">⬇️ Scarica PDF</button>
        <button id="rf-prev-cancel" class="app-button gray">Annulla</button>
      </div>
    </div>`;
  document.body.appendChild(back);

  const chiudi = () => { try { document.body.removeChild(back); } catch {} try { URL.revokeObjectURL(blobUrl); } catch {} };
  back.querySelector("#rf-prev-close").onclick = chiudi;
  back.querySelector("#rf-prev-cancel").onclick = chiudi;
  back.querySelector("#rf-prev-save").onclick = () => { onScarica(); };
  back.querySelector("#rf-prev-print").onclick = () => {
    const ifr = back.querySelector("iframe");
    try { ifr.contentWindow.focus(); ifr.contentWindow.print(); }
    catch { window.open(blobUrl, "_blank"); }
  };
  back.addEventListener("click", (e) => { if (e.target === back) chiudi(); });
}

async function rfRenderLabelPdfPage(doc, format, label) {
  const w = Number(format.w || 50);
  const h = Number(format.h || 50);

  const margin = w >= 100 ? 6 : 3;
  const qrSize = w >= 100 ? 26 : w >= 70 ? 18 : 16;

  const headerMaxW = w - margin * 2 - qrSize - 2;

  const payload = JSON.stringify({
    lotto: label.lotto || "",
    lotto_uuid: label.lotto_uuid || "",
    titolo: label.titolo || "",
    produzione: label.dataProduzione || "",
    scadenza: label.dataScadenza || "",
    azienda_id: window.state?.azienda?.id || "",
    azienda: window.state?.azienda?.nome || "",
    ts: new Date().toISOString()
  });

  const qrDataUrl = await rfMakeQrDataUrl(payload, 220);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(w >= 100 ? 16 : 12);

  const headerLines = doc.splitTextToSize((label.titolo || "").toString(), headerMaxW);
  doc.text(headerLines.slice(0, w >= 100 ? 3 : 2), margin, margin + (w >= 100 ? 6 : 5));

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, "PNG", w - margin - qrSize, margin, qrSize, qrSize);
  }

  let y = w >= 100 ? margin + 24 : margin + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(w >= 100 ? 14 : 11);
  doc.text(`LOTTO: ${(label.lotto || "").toString()}`, margin, y);
  y += w >= 100 ? 9 : 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(w >= 100 ? 11 : 9);

  const lineDate = `Prod: ${(label.dataProduzione || "").toString()}   Scad: ${(label.dataScadenza || "").toString()}`;
  doc.text(doc.splitTextToSize(lineDate, w - margin * 2), margin, y);
  y += w >= 100 ? 8 : 6;

  for (const r of (label.rows || [])) {
    if (!r) continue;
    const k = (r.k || "").toString().trim();
    const v = (r.v || "").toString();
    if (!k && !v) continue;

    const txt = k ? `${k}: ${v}` : v;
    const lines = doc.splitTextToSize(txt, w - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * (w >= 100 ? 5 : 4.5);
    if (y > h - margin - 10) break;
  }

  if (label.footer) {
    doc.setFontSize(w >= 100 ? 9 : 7.5);
    doc.text(doc.splitTextToSize(label.footer, w - margin * 2), margin, h - margin);
  }
}


/* ── Testo conservazione da passaggi reali ───────────────────────────────── */
function buildTestoConservazione(scenarioId) {
  const passaggi = passaggiConservazioneMap[String(scenarioId)] || [];
  if (!passaggi.length) return "";

  const TIPO_ETICH = {
    abbattimento: "❄️ Abbatt.",
    raffreddamento: "🌡 Raffr.",
    sottovuoto: "🧴 Sottovuoto",
    confezionamento: "📦 Conf.",
    etichettatura: "🏷 Etich.",
    stoccaggio: "🏠 Stocc.",
    congelamento: "🧊 Congel.",
    surgelamento: "🧊 Surgel.",
    pastorizzazione: "🔥 Pastor.",
    sterilizzazione: "🔥 Steril.",
    altro: "📋"
  };

  return passaggi.map(p => {
    const tipo = TIPO_ETICH[p.tipo_passaggio] || "📋";
    const temp = p.temperatura_c != null ? ` ${p.temperatura_c}°C` : "";
    const durata = p.durata_min ? ` ${p.durata_min}min` : "";
    return `${tipo}${temp}${durata}`;
  }).join(" → ");
}
function stampaEtichetteConfezioni() {
  if (!savedLotto?.codice_lotto && !savedLotto?.lotto_uuid) return alert("Registra o riprendi prima la produzione.");

  rfChooseLabelFormat().then(async (format) => {
    if (!format) return;

    const dataProdISO = document.getElementById("prod-data")?.value || "";
    const scadenzaISO = document.getElementById("prod-scadenza")?.value || "";
    const noteLotto = document.getElementById("prod-note-lotto")?.value || "";
    const operatoreNome = operatoreRisolto?.nome || "";

    const scenarioId = document.getElementById("prod-conservazione")?.value || "";
    const scenario = scenariConservazione.find((s) => String(s.id) === String(scenarioId)) || null;
    const scenarioLabel = scenario?.scenario_label || "";
    const temperatura = (scenario?.temperatura ?? "").toString();
    const fasiText = buildTestoConservazione(scenarioId) || compactText((scenario?.fasi_operativo ?? "").toString(), 260);

    const rows = confezioniRows
      .map((r) => {
        const porz = porzioniCache.find((p) => String(p.id) === String(r.porzione_id)) || null;
        const pezzi = Math.max(0, Math.floor(toNumber(r.pezzi_per_confezione) || 0));
        const numConf = Math.max(0, Math.floor(toNumber(r.numero_confezioni) || 0));
        if (!porz || pezzi <= 0 || numConf <= 0) return null;

        const pesoPorzKg = toKg(porz.peso_porzione, porz.unita_misura);
        const kgConf = pesoPorzKg * pezzi;

        return {
          label: porz.label,
          pezzi_per_confezione: pezzi,
          numero_confezioni: numConf,
          kg_per_confezione: kgConf,
          note: (r.note || "").toString()
        };
      })
      .filter(Boolean);

    if (!rows.length) return alert("Nessuna confezione valida da stampare.");

    const labels = [];
    for (const r of rows) {
      for (let i = 0; i < r.numero_confezioni; i++) {
        labels.push({
          titolo: (ricettaSelezionata?.nome || "Ricetta").toString(),
          lotto: savedLotto.codice_lotto || ("LOTTO-" + String(savedLotto.lotto_uuid || "").slice(0, 8)),
          lotto_uuid: savedLottoUUID || savedLotto.lotto_uuid || null,
          dataProduzione: rfFormatDateITA(dataProdISO),
          dataScadenza: rfFormatDateITA(scadenzaISO),
          rows: [
            { k: "Porzionatura", v: r.label || "" },
            { k: "Pezzi", v: String(r.pezzi_per_confezione) },
            { k: "Peso", v: `${formatNumber(r.kg_per_confezione)} kg` },
            scenarioLabel ? { k: "Scenario", v: scenarioLabel } : null,
            temperatura ? { k: "Temperatura", v: temperatura } : null,
            fasiText ? { k: "Conservazione", v: fasiText } : null,
            operatoreNome ? { k: "Operatore", v: operatoreNome } : null,
            noteLotto ? { k: "Note lotto", v: noteLotto } : null,
            r.note ? { k: "Note confezione", v: r.note } : null
          ],
          footer: "Generato da Ristoflow — Produzione"
        });
      }
    }

    await rfPrintLabelsPdf({
      format,
      title: "Etichette Confezioni",
      labels
    });
  });
}

function stampaEtichetteCoprodotti() {
  if (!savedLotto?.codice_lotto && !savedLotto?.lotto_uuid) return alert("Registra o riprendi prima la produzione.");

  rfChooseLabelFormat().then(async (format) => {
    if (!format) return;

    const dataProdISO = document.getElementById("prod-data")?.value || "";
    const scadenzaLottoISO = document.getElementById("prod-scadenza")?.value || "";

    const scenarioId = document.getElementById("prod-conservazione")?.value || "";
    const scenario = scenariConservazione.find((s) => String(s.id) === String(scenarioId)) || null;
    const scenarioLabel = scenario?.scenario_label || "";
    const temperatura = (scenario?.temperatura ?? "").toString();
    const fasiText = buildTestoConservazione(scenarioId) || compactText((scenario?.fasi_operativo ?? "").toString(), 260);

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
      const scadISO = c.data_scadenza || scadenzaLottoISO;

      return {
        titolo: (nomeProd || "Coprodotto").toString(),
        lotto: savedLotto.codice_lotto || ("LOTTO-" + String(savedLotto.lotto_uuid || "").slice(0, 8)),
        lotto_uuid: savedLottoUUID || null,
        dataProduzione: rfFormatDateITA(dataProdISO),
        dataScadenza: rfFormatDateITA(scadISO),
        rows: [
          { k: "Quantità", v: `${formatNumber(c.q)} ${unita}` },
          scenarioLabel ? { k: "Scenario", v: scenarioLabel } : null,
          temperatura ? { k: "Temperatura", v: temperatura } : null,
          fasiText ? { k: "Conservazione", v: fasiText } : null,
          { k: "", v: "Coprodotto da lavorazione" },
          c.note ? { k: "Note", v: c.note } : null
        ],
        footer: "Generato da Ristoflow — Produzione"
      };
    });

    await rfPrintLabelsPdf({
      format,
      title: "Etichette Coprodotti",
      labels
    });
  });
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
  const w = window.open("about:blank", "_blank");
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
// =========================
// 🔥 PRELOAD DA PLANNER
// =========================
async function preloadFromPlanner(plannerId){

  const supabase = window.supabaseClient

  const { data } = await supabase
    .from("produzioni_settimanali")
    .select(`
      id,
      data,
      quantita,
      ricetta_id,
      note
    `)
    .eq("id", plannerId)
    .single()

  if(!data) return

  // DATA
  const dataEl = document.getElementById("prod-data")
  if(dataEl && data.data){
    dataEl.value = data.data
  }

  // RICETTA
  if(data.ricetta_id){

    const ricetta = ricetteCache.find(r => r.id === data.ricetta_id)

    if(ricetta){

      ricettaSelezionata = ricetta

      const input = document.getElementById("prod-ricetta-search")
      const hidden = document.getElementById("prod-ricetta-id")
      const btn = document.getElementById("btn-vedi-ricetta")

      if(input) input.value = ricetta.nome
      if(hidden) hidden.value = ricetta.id
      if(btn) btn.disabled = false

      if(typeof setRicettaInfo === "function"){
        setRicettaInfo("Caricata da planner ✔")
      }

      if(typeof loadPorzioniRicetta === "function"){
        await loadPorzioniRicetta(ricetta.id)
      }

      if(typeof loadConservazioni === "function"){
        await loadConservazioni(ricetta.id)
      }

    }
  }

  // QUANTITÀ → PESO
  if(data.quantita){
    const pesoEl = document.getElementById("prod-peso-reale")
    if(pesoEl && !pesoEl.value){
      pesoEl.value = data.quantita
    }
  }

  // NOTE
  const noteEl = document.getElementById("prod-note-lotto")
  if(noteEl){
    noteEl.value = `Da planner\n${data.note || ""}`
  }

  console.log("Planner collegato:", plannerId)
}

// =========================================================
// RESUME: riprende un lotto aperto dal monitor "Produzioni aperte"
// =========================================================
async function resumeDaLotto(lottoUuid) {
  const supabase = window.supabaseClient
  const aziendaId = window.state?.azienda?.id
  if (!supabase || !aziendaId) return

  const { data: lotto } = await supabase
    .from("produzione_lotti")
    .select("*")
    .eq("lotto_uuid", lottoUuid)
    .eq("azienda_id", aziendaId)
    .maybeSingle()
  if (!lotto) { console.warn("Lotto da riprendere non trovato:", lottoUuid); return }

  resumeLottoId = lotto.id
  resumeLottoUUID = lotto.lotto_uuid

  // Preseleziona la ricetta e carica porzioni/conservazioni/fasi
  const ricetta = ricetteCache.find(r => r.id === lotto.ricetta_id)
  if (ricetta) {
    ricettaSelezionata = ricetta
    const input = document.getElementById("prod-ricetta-search")
    const hidden = document.getElementById("prod-ricetta-id")
    const btn = document.getElementById("btn-vedi-ricetta")
    if (input) input.value = ricetta.nome
    if (hidden) hidden.value = ricetta.id
    if (btn) btn.disabled = false
    if (typeof setRicettaInfo === "function") setRicettaInfo("Ripresa da produzioni aperte ✔")
    await Promise.all([
      loadPorzioniRicetta(ricetta.id),
      loadConservazioni(ricetta.id),
      loadFasiHaccp(ricetta.id)
    ])
  }

  // Sovrappone le firme/temperature già registrate sulle fasi
  const { data: haccp } = await supabase
    .from("produzione_log_haccp")
    .select("*")
    .eq("lotto_id", lottoUuid)
  if (haccp && haccp.length && logHaccp.length) {
    haccp.forEach(h => {
      const log = logHaccp.find(l => (h.fase_id != null && String(l.fase_id) === String(h.fase_id)) || (h.fase_id == null && l.fase_id == null && l.fase_nome === h.fase_nome))
      if (!log) return
      if (h.firmato_da) {
        log.firmato = true
        log.firmato_da = h.firmato_da
        log.firmato_il = h.firmato_il
        log.operatore_id = h.operatore_id
        log.operatore_nome = h.operatore_nome
        log.firme = Array.isArray(h.firme) && h.firme.length
          ? h.firme
          : [{ operatore_id: h.operatore_id, operatore_nome: h.operatore_nome, firmato_il: h.firmato_il }]
      }
      if (h.temperatura_rilevata != null) log.temperatura_rilevata = h.temperatura_rilevata
      if (h.temperatura_ok != null) log.temperatura_ok = h.temperatura_ok
      if (h.ora_inizio) log.ora_inizio = h.ora_inizio
      if (h.ora_fine) log.ora_fine = h.ora_fine
      if (h.esito) log.esito = h.esito
    })
    renderFasiHaccp()
  }

  // Prefill data / peso / note
  const dataEl = document.getElementById("prod-data")
  if (dataEl && lotto.data_produzione) dataEl.value = lotto.data_produzione
  const pesoEl = document.getElementById("prod-peso-reale")
  if (pesoEl && lotto.quantita_output) pesoEl.value = lotto.quantita_output
  const noteEl = document.getElementById("prod-note-lotto")
  if (noteEl && lotto.note) noteEl.value = lotto.note

  // Ripristino le confezioni salvate (per la stampa etichette) dal dettaglio JSON del lotto
  try {
    const det = Array.isArray(lotto.dettaglio_confezionamento) ? lotto.dettaglio_confezionamento : [];
    if (det.length) {
      confezioniRows = det.map((d) => ({
        id: cryptoRandomId(),
        porzione_id: (d.porzione_id ?? "").toString(),
        pezzi_per_confezione: d.pezzi_per_confezione ?? "",
        numero_confezioni: d.numero_confezioni ?? "",
        note: d.note ?? ""
      }));
      renderConfezioniRows();
    }
  } catch (e) { console.warn("Ripristino confezioni:", e); }

  // Il lotto e' gia' registrato: rendo disponibili le stampe etichette e blocco i campi
  savedLotto = { lotto_uuid: lotto.lotto_uuid, id: lotto.id, codice_lotto: lotto.codice_lotto };
  savedLottoUUID = lotto.lotto_uuid;
  const pL = document.getElementById("btn-print-lotto");
  const pC = document.getElementById("btn-print-coprodotti");
  if (pL) pL.removeAttribute("disabled");
  if (pC) pC.removeAttribute("disabled");

  recalcResaUI()

  // Porta l'operatore alla PROSSIMA FASE MANCANTE (prima non firmata) ed evidenziala
  setTimeout(() => vaiAllaProssimaFaseMancante(), 400)
}

// Trova la prima fase HACCP non firmata, ci scrolla sopra e la evidenzia
function vaiAllaProssimaFaseMancante() {
  const idx = logHaccp.findIndex(l => !l.firmato);
  const list = document.getElementById("haccp-fasi-list");
  if (!list) return;
  if (idx < 0) {
    // tutte firmate: porto al blocco stampa/azioni
    document.getElementById("btn-print-haccp")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const card = list.querySelector(`[data-idx="${idx}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  // flash di evidenziazione
  const bg0 = card.style.background;
  card.style.transition = "background .4s";
  card.style.background = "#fff7ed";
  card.style.boxShadow = "0 0 0 3px #fdba74";
  setTimeout(() => { card.style.background = bg0; card.style.boxShadow = ""; }, 2200);
  // badge "prossima fase"
  if (!card.querySelector(".rf-next-badge")) {
    const b = document.createElement("span");
    b.className = "rf-next-badge";
    b.textContent = "👉 Prossima fase da firmare";
    b.style.cssText = "display:inline-block;margin-left:8px;background:#fdba74;color:#7c2d12;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;";
    const head = card.querySelector("div");
    if (head) head.appendChild(b);
  }
}
