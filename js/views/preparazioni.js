import { createPageLayout, createCard } from "../utils/pageLayout.js";

let ricetteCache = [];
let ricettaSelezionata = null;

let scenariConservazione = [];
let dipendentiCache = [];
let prodottiCache = [];

let operatoreRisolto = null; // { id, nome, cognome, pin }

let coprodottiRows = [];

let savedProduzioneId = null;
let savedRigaId = null;

export async function render(container) {
  ricetteCache = [];
  ricettaSelezionata = null;

  scenariConservazione = [];
  dipendentiCache = [];
  prodottiCache = [];

  operatoreRisolto = null;

  coprodottiRows = [];
  savedProduzioneId = null;
  savedRigaId = null;

  container.innerHTML = createPageLayout({
    title: "Produzione",
    subtitle: "Ricetta, dati produzione, conservazione, coprodotti e registrazione movimenti",
    content: `
      <div class="form-actions" style="margin-bottom:16px;">
        <button type="button" id="btn-back" class="app-button secondary">← Centro Produzione</button>
      </div>

      ${createCard({
        title: "Ricetta",
        body: `
          <div class="form-group" style="position:relative;">
            <label>Ricetta</label>
            <input id="prod-ricetta-search" class="input" placeholder="Cerca ricetta..." autocomplete="off" />
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
              <label>Peso reale prodotto finito (<span id="prod-unita-label">-</span>)</label>
              <input id="prod-peso" type="number" min="0" step="0.001" class="input" placeholder="Es: 2.500" />
              <div class="form-help">Inserisci il peso reale finale (obbligatorio).</div>
            </div>

            <div class="form-group">
              <label>Lotto (automatico)</label>
              <input id="prod-lotto" class="input" readonly />
              <div class="form-help">Lotto unico per produzione. Dopo salvataggio non sarà modificabile.</div>
            </div>

            <div class="form-group">
              <label>PIN operatore</label>
              <input id="prod-operatore-pin" type="password" inputmode="numeric" class="input" placeholder="Inserisci PIN..." />
              <div id="prod-operatore-info" class="form-help">Nessun operatore identificato</div>
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
              <select id="prod-conservazione" class="input">
                <option value="">Seleziona...</option>
              </select>
            </div>

            <div class="form-group">
              <label>Scadenza (automatica)</label>
              <input id="prod-scadenza" type="date" class="input" readonly />
            </div>

            <div class="form-group">
              <label>Confezionamento</label>
              <select id="prod-confezionamento" class="input">
                <option value="">Seleziona...</option>
              </select>
            </div>

          </div>
        `
      })}

      ${createCard({
        title: "Coprodotti",
        body: `
          <div id="coprodotti-wrap"></div>

          <div class="form-actions">
            <button type="button" id="btn-add-coprodotto" class="app-button secondary">+ Aggiungi coprodotto</button>
          </div>

          <div class="form-help">
            I coprodotti nascono solo in produzione e condividono lo stesso lotto della produzione.
          </div>
        `
      })}

      ${createCard({
        title: "Azioni",
        body: `
          <div class="form-actions">
            <button type="button" id="btn-salva-produzione" class="app-button">💾 Registra produzione</button>
            <button type="button" id="btn-print-finale" class="app-button secondary" disabled>🏷 Stampa etichetta lotto</button>
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

  renderCoprodottiRows();

  bindEvents();

  resetConservazioneUI();
  resetConfezionamentoUI();
  resetScadenza();
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
      peso_output: out?.peso_finale ?? null,
      unita_output: out?.unita_misura ?? "kg"
    };
  });
}

async function preloadDipendenti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  dipendentiCache = [];
  if (!supabase || !aziendaId) return;

  const { data, error } = await supabase
    .from("dipendenti")
    .select("id, nome, cognome, pin")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("cognome");

  if (error) {
    console.error("Errore preload dipendenti:", error);
    dipendentiCache = [];
    return;
  }

  dipendentiCache = data || [];
}

async function preloadProdotti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  prodottiCache = [];
  if (!supabase || !aziendaId) return;

  // Best-effort: tenta "prodotti", poi fallback "magazzino_prodotti"
  {
    const { data, error } = await supabase
      .from("prodotti")
      .select("id, nome, unita_misura")
      .eq("azienda_id", aziendaId)
      .eq("attivo", true)
      .order("nome");

    if (!error && data) {
      prodottiCache = data.map((p) => ({
        id: p.id,
        nome: p.nome,
        unita_misura: p.unita_misura || "kg"
      }));
      return;
    }
  }

  {
    const { data, error } = await supabase
      .from("magazzino_prodotti")
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
}

/* ========================================================= */
/* RICETTA AUTOCOMPLETE */
/* ========================================================= */

function setupAutocompleteRicette() {
  const input = document.getElementById("prod-ricetta-search");
  const suggest = document.getElementById("prod-ricetta-suggest");
  const hidden = document.getElementById("prod-ricetta-id");
  const btnVedi = document.getElementById("btn-vedi-ricetta");

  if (!input || !suggest || !hidden || !btnVedi) return;

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    suggest.innerHTML = "";

    ricettaSelezionata = null;
    hidden.value = "";
    btnVedi.disabled = true;
    setRicettaInfo("Nessuna ricetta selezionata");
    setUnitaMisuraLabel("-");
    resetConservazioneUI();
    resetConfezionamentoUI();
    resetScadenza();
    ensureLotto(false);

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

        const resaTxt = r.peso_output != null
          ? ` — Resa: ${r.peso_output} ${r.unita_output || "kg"}`
          : "";

        setRicettaInfo("Pezzi base: " + (r.pezzi_base ?? "-") + resaTxt);
        setUnitaMisuraLabel(r.unita_output || "kg");

        ensureLotto(true);
        await loadConservazioni(r.id);
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

function setUnitaMisuraLabel(text) {
  const el = document.getElementById("prod-unita-label");
  if (el) el.innerText = text || "-";
}

/* ========================================================= */
/* CONSERVAZIONE */
/* ========================================================= */

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

  resetConfezionamentoUI();
  resetScadenza();
}

function resetConservazioneUI() {
  const select = document.getElementById("prod-conservazione");
  if (!select) return;
  select.innerHTML = `<option value="">Seleziona...</option>`;
}

function resetConfezionamentoUI() {
  const sel = document.getElementById("prod-confezionamento");
  if (!sel) return;
  sel.innerHTML = `<option value="">Seleziona...</option>`;
}

function resetScadenza() {
  const el = document.getElementById("prod-scadenza");
  if (el) el.value = "";
}

function aggiornaConservazione() {
  const select = document.getElementById("prod-conservazione");
  if (!select) return;

  const id = select.value;
  const scenario = scenariConservazione.find((s) => String(s.id) === String(id));

  resetConfezionamentoUI();
  resetScadenza();

  if (!scenario) return;

  const opzioni = estraiOpzioniConfezionamento(scenario);
  const sel = document.getElementById("prod-confezionamento");
  if (!sel) return;

  sel.innerHTML = `<option value="">Seleziona...</option>`;
  opzioni.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    sel.appendChild(opt);
  });

  if (opzioni.length === 1) sel.value = opzioni[0];

  aggiornaScadenza();
  aggiornaScadenzeCoprodottiDaConservazione();
}

function estraiOpzioniConfezionamento(scenario) {
  let raw = [];

  if (Array.isArray(scenario.confezionamento_opzioni)) {
    raw = scenario.confezionamento_opzioni;
  } else if (typeof scenario.confezionamento_opzioni === "string" && scenario.confezionamento_opzioni.trim()) {
    raw = splitMulti(scenario.confezionamento_opzioni);
  } else if (typeof scenario.confezionamento === "string" && scenario.confezionamento.trim()) {
    raw = splitMulti(scenario.confezionamento);
  }

  const clean = raw
    .map((x) => (x ?? "").toString().trim())
    .filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const c of clean) {
    const k = c.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(c);
  }
  return unique;
}

function splitMulti(str) {
  return (str || "")
    .split(/[,;|]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function aggiornaScadenza() {
  const id = document.getElementById("prod-conservazione")?.value || "";
  const scenario = scenariConservazione.find((s) => String(s.id) === String(id));
  if (!scenario) return;

  const dataProd = document.getElementById("prod-data")?.value || "";
  if (!dataProd) return;

  const d = new Date(dataProd);
  d.setDate(d.getDate() + (scenario.shelf_life_giorni || 0));

  const scadEl = document.getElementById("prod-scadenza");
  if (scadEl) scadEl.value = d.toISOString().slice(0, 10);
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
    const pin = (pinInput.value || "").trim();

    // Reset stato base
    if (!pin) {
      operatoreRisolto = null;
      info.innerText = "Nessun operatore identificato";
      return;
    }

    // Validazione formato: solo numeri 4-6 cifre
    if (!/^[0-9]{4,6}$/.test(pin)) {
      operatoreRisolto = null;
      info.innerText = "PIN deve essere 4-6 cifre numeriche";
      return;
    }

    // Ricerca operatore con PIN
    const match = dipendentiCache.find(
      (d) => (d.pin ?? "").toString() === pin
    );

    if (!match) {
      operatoreRisolto = null;
      info.innerText = "PIN non valido ❌";
      return;
    }

    // OK
    operatoreRisolto = match;
    info.innerText = `Operatore: ${match.nome} ✅`;
  });
}
/* ========================================================= */
/* LOTTO */
/* ========================================================= */

function ensureLotto(forceRegenerate = false) {
  const lottoEl = document.getElementById("prod-lotto");
  if (!lottoEl) return;

  if (savedProduzioneId) return;

  if (!ricettaSelezionata) {
    lottoEl.value = "";
    return;
  }

  if (lottoEl.value && !forceRegenerate) return;

  const dataProd = document.getElementById("prod-data")?.value || new Date().toISOString().slice(0, 10);
  const prefix = generaPrefissoLotto(ricettaSelezionata);
  const progressivo = nextProgressivo(prefix, dataProd);

  lottoEl.value = `${prefix}-${dataProd.replaceAll("-", "")}-${String(progressivo).padStart(2, "0")}`;
}

function generaPrefissoLotto(ricetta) {
  const nome = (ricetta?.nome || "").trim().toUpperCase();
  const onlyLetters = nome.replace(/[^A-Z]/g, "");
  const pref = (onlyLetters.slice(0, 3) || "LOT").padEnd(3, "X");
  return pref;
}

function nextProgressivo(prefix, dataISO) {
  const key = `rf_lotto_${prefix}_${dataISO}`;
  const n = Number(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, String(n));
  return n;
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
    data_scadenza: ""
  });

  renderCoprodottiRows();
  aggiornaScadenzeCoprodottiDaConservazione();
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
              <select class="input" data-field="prodotto_id" ${savedProduzioneId ? "disabled" : ""}>
                <option value="">Seleziona prodotto</option>
                ${prodottiCache
                  .map((p) => {
                    const selected = String(p.id) === String(row.prodotto_id) ? "selected" : "";
                    return `<option value="${escapeAttr(p.id)}" ${selected}>${escapeHtml(p.nome)}</option>`;
                  })
                  .join("")}
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
                ${savedProduzioneId ? "readonly" : ""} />
            </div>

            <div class="form-group">
              <label>UM</label>
              <input class="input"
                type="text"
                data-field="unita_misura"
                value="${escapeAttr(String(umDefault || ""))}"
                placeholder="Es: kg"
                ${savedProduzioneId ? "readonly" : ""} />
            </div>

            <div class="form-group">
              <label>Scadenza</label>
              <input class="input"
                type="date"
                data-field="data_scadenza"
                value="${escapeAttr(String(row.data_scadenza || ""))}"
                ${savedProduzioneId ? "readonly" : ""} />
            </div>

          </div>

          <div class="form-actions">
            <button type="button"
              class="app-button secondary"
              data-action="remove-coprodotto"
              ${savedProduzioneId ? "disabled" : ""}>
              Rimuovi
            </button>
          </div>

        </div>
      `;
    })
    .join("");
}

function aggiornaScadenzeCoprodottiDaConservazione() {
  const dataProd = document.getElementById("prod-data")?.value || "";
  if (!dataProd) return;

  const scenarioId = document.getElementById("prod-conservazione")?.value || "";
  const scenario = scenariConservazione.find((s) => String(s.id) === String(scenarioId)) || null;
  if (!scenario) return;

  const scadenzaBase = addDaysISO(dataProd, scenario.shelf_life_giorni || 0);

  coprodottiRows = coprodottiRows.map((r) => ({
    ...r,
    data_scadenza: r.data_scadenza || scadenzaBase
  }));

  renderCoprodottiRows();
}

function addDaysISO(dateISO, days) {
  const d = new Date(dateISO);
  if (Number.isFinite(days)) d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function cryptoRandomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
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

  document.getElementById("prod-conservazione")?.addEventListener("change", aggiornaConservazione);

  document.getElementById("prod-data")?.addEventListener("change", () => {
    aggiornaScadenza();
    if (!savedProduzioneId) ensureLotto(false);
    aggiornaScadenzeCoprodottiDaConservazione();
  });

  document.getElementById("btn-add-coprodotto")?.addEventListener("click", () => {
    if (savedProduzioneId) return;
    addCoprodottoRow();
  });

  document.getElementById("coprodotti-wrap")?.addEventListener("change", (e) => onCoprodottiChange(e));
  document.getElementById("coprodotti-wrap")?.addEventListener("click", (e) => onCoprodottiClick(e));

  document.getElementById("btn-salva-produzione")?.addEventListener("click", salvaProduzione);

  document.getElementById("btn-print-finale")?.addEventListener("click", stampaEtichettaProdottoFinito);
  document.getElementById("btn-print-coprodotti")?.addEventListener("click", stampaEtichetteCoprodotti);

  document.getElementById("btn-vedi-ricetta")?.addEventListener("click", apriModalRicetta);
  document.getElementById("prod-modal-close")?.addEventListener("click", chiudiModalRicetta);
  document.getElementById("prod-modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target?.id === "prod-modal-backdrop") chiudiModalRicetta();
  });
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
    if (savedProduzioneId) return;
    removeCoprodottoRow(rowId);
  }
}

/* ========================================================= */
/* FORM VALIDATION */
/* ========================================================= */

function raccogliDatiForm() {
  const ricettaId = document.getElementById("prod-ricetta-id")?.value || "";
  const dataProduzione = document.getElementById("prod-data")?.value || "";
  const pesoFinale = document.getElementById("prod-peso")?.value || "";
  const lotto = document.getElementById("prod-lotto")?.value || "";

  const scenarioId = document.getElementById("prod-conservazione")?.value || "";
  const scadenza = document.getElementById("prod-scadenza")?.value || "";

  const confezionamento = document.getElementById("prod-confezionamento")?.value || "";
  const unita = document.getElementById("prod-unita-label")?.innerText || "kg";

  return {
    ricettaId,
    dataProduzione,
    pesoFinale,
    lotto,
    scenarioId,
    scadenza,
    confezionamento,
    unita,
    operatore: operatoreRisolto,
    coprodotti: coprodottiRows.map((r) => ({
      ...r,
      prodotto_id: (r.prodotto_id || "").toString(),
      quantita: r.quantita,
      unita_misura: (r.unita_misura || "").toString(),
      data_scadenza: (r.data_scadenza || "").toString()
    }))
  };
}

function validaForm(dati) {
  if (savedProduzioneId) return "Produzione già registrata.";

  if (!dati.ricettaId) return "Seleziona una ricetta.";
  if (!dati.dataProduzione) return "Seleziona la data produzione.";
  if (!dati.pesoFinale || Number(dati.pesoFinale) <= 0) return "Inserisci il peso reale prodotto finito (maggiore di 0).";
  if (!dati.lotto) return "Lotto non disponibile. Seleziona una ricetta.";
  if (!dati.operatore?.id) return "Inserisci un PIN operatore valido.";
  if (!dati.scenarioId) return "Seleziona lo scenario di conservazione.";
  if (!dati.scadenza) return "Scadenza non disponibile. Controlla conservazione e data produzione.";
  if (!dati.confezionamento) return "Seleziona il confezionamento.";

  const invalidCop = dati.coprodotti.some((c) => {
    const q = toNumber(c.quantita);
    if (!c.prodotto_id) return false;
    if (!Number.isFinite(q) || q <= 0) return true;
    if (!c.unita_misura) return true;
    if (!c.data_scadenza) return true;
    return false;
  });

  if (invalidCop) return "Compila correttamente i coprodotti (quantità > 0, UM e scadenza).";

  return null;
}

/* ========================================================= */
/* SAVE (produzioni + righe + movimenti + coprodotti) */
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
    const { data: produzione, error: errProduzione } = await supabase
      .from("produzioni")
      .insert({
        azienda_id: aziendaId,
        data_produzione: dati.dataProduzione,
        lotto: dati.lotto,
        operatore_id: dati.operatore.id,
        scenario_conservazione_id: dati.scenarioId,
        scadenza: dati.scadenza,
        confezionamento: dati.confezionamento
      })
      .select()
      .single();

    if (errProduzione) throw errProduzione;

    savedProduzioneId = produzione.id;

    const { data: riga, error: errRiga } = await supabase
      .from("schede_produzione_righe")
      .insert({
        azienda_id: aziendaId,
        produzione_id: savedProduzioneId,
        ricetta_id: dati.ricettaId,
        quantita: toNumber(dati.pesoFinale),
        unita: dati.unita || "kg",
        lotto: dati.lotto
      })
      .select()
      .single();

    if (errRiga) throw errRiga;

    savedRigaId = riga.id;

    const { data: ingredienti, error: errIng } = await supabase
      .from("ricetta_ingredienti")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("ricetta_id", dati.ricettaId);

    if (errIng) throw errIng;

    for (const ing of (ingredienti || [])) {
      const prodottoId = ing.prodotto_id;
      const q = toNumber(ing.quantita ?? ing.qta ?? ing.qta_ingrediente ?? 0);
      if (!prodottoId || q <= 0) continue;

      const { error: errMov } = await supabase
        .from("magazzino_movimenti")
        .insert({
          azienda_id: aziendaId,
          prodotto_id: prodottoId,
          tipo_movimento: "SCARICO",
          quantita: q,
          data_movimento: dati.dataProduzione,
          riferimento_tipo: "PRODUZIONE",
          riferimento_id: savedProduzioneId,
          riferimento_riga_id: savedRigaId,
          note: `Scarico ingredienti produzione lotto ${dati.lotto}`
        });

      if (errMov) throw errMov;
    }

    if (ricettaSelezionata?.prodotto_output_id) {
      const { error: errCarico } = await supabase
        .from("magazzino_movimenti")
        .insert({
          azienda_id: aziendaId,
          prodotto_id: ricettaSelezionata.prodotto_output_id,
          tipo_movimento: "CARICO",
          quantita: toNumber(dati.pesoFinale),
          data_movimento: dati.dataProduzione,
          riferimento_tipo: "PRODUZIONE",
          riferimento_id: savedProduzioneId,
          riferimento_riga_id: savedRigaId,
          note: `Carico prodotto finito lotto ${dati.lotto}`
        });

      if (errCarico) throw errCarico;
    }

    const coprodottiValidi = (dati.coprodotti || []).filter((c) => c.prodotto_id);

    for (const c of coprodottiValidi) {
      const q = toNumber(c.quantita);
      if (q <= 0) continue;

      const { data: cop, error: errCop } = await supabase
        .from("produzione_output_secondari")
        .insert({
          azienda_id: aziendaId,
          produzione_id: savedProduzioneId,
          prodotto_id: c.prodotto_id,
          codice_lotto: dati.lotto,
          quantita: q,
          unita_misura: c.unita_misura || "kg",
          data_produzione: dati.dataProduzione,
          data_scadenza: c.data_scadenza,
          costo_allocato: null,
          stampato: false
        })
        .select("id")
        .single();

      if (errCop) throw errCop;

      const { error: errMovCop } = await supabase
        .from("magazzino_movimenti")
        .insert({
          azienda_id: aziendaId,
          prodotto_id: c.prodotto_id,
          tipo_movimento: "CARICO",
          quantita: q,
          data_movimento: dati.dataProduzione,
          riferimento_tipo: "PRODUZIONE",
          riferimento_id: savedProduzioneId,
          riferimento_riga_id: savedRigaId,
          note: `Carico coprodotto lotto ${dati.lotto}`
        });

      if (errMovCop) throw errMovCop;

      void cop;
    }

    lockUIAfterSave();

    if (result) {
      result.innerHTML = `<span class="success-text">Produzione registrata ✔ — Lotto: ${escapeHtml(dati.lotto)}</span>`;
    }

    alert(`Produzione registrata ✔️\nLotto: ${dati.lotto}`);
  } catch (error) {
    console.error("Errore registrazione produzione:", error);
    savedProduzioneId = null;
    savedRigaId = null;

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

  const printFin = document.getElementById("btn-print-finale");
  const printCop = document.getElementById("btn-print-coprodotti");
  if (printFin) printFin.removeAttribute("disabled");
  if (printCop) printCop.removeAttribute("disabled");

  const lockIds = [
    "prod-ricetta-search",
    "prod-data",
    "prod-peso",
    "prod-operatore-pin",
    "prod-conservazione",
    "prod-confezionamento"
  ];

  for (const id of lockIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.setAttribute("disabled", "disabled");
    }
  }

  renderCoprodottiRows();
}

/* ========================================================= */
/* PRINT */
/* ========================================================= */

function stampaEtichettaProdottoFinito() {
  const dati = raccogliDatiForm();
  const err = validaFormForPrint(dati);
  if (err) return alert(err);

  const ricettaNome = ricettaSelezionata?.nome || "Ricetta";
  const operatoreNome = `${dati.operatore?.cognome || ""} ${dati.operatore?.nome || ""}`.trim();
  const unita = dati.unita || "";

  const html = buildPrintHtml({
    title: "Etichetta Prodotto Finito",
    labels: [
      buildLabelHtml({
        header: escapeHtml(ricettaNome),
        rows: [
          { k: "Lotto", v: dati.lotto, big: true },
          { k: "Data produzione", v: dati.dataProduzione },
          { k: "Scadenza", v: dati.scadenza },
          { k: "Peso", v: `${String(dati.pesoFinale)} ${unita}` },
          { k: "Operatore", v: operatoreNome }
        ],
        footer: "Generato da Ristoflow — Produzione"
      })
    ]
  });

  openPrintWindow(html);
}

function stampaEtichetteCoprodotti() {
  const dati = raccogliDatiForm();
  const err = validaFormForPrint(dati);
  if (err) return alert(err);

  const coprodottiValidi = (dati.coprodotti || []).filter((c) => c.prodotto_id && toNumber(c.quantita) > 0);
  if (!coprodottiValidi.length) return alert("Nessun coprodotto valido da stampare.");

  const labels = coprodottiValidi.map((c) => {
    const prod = prodottiCache.find((p) => String(p.id) === String(c.prodotto_id));
    const nomeProd = prod?.nome || "Coprodotto";
    const unita = c.unita_misura || prod?.unita_misura || "";

    return buildLabelHtml({
      header: escapeHtml(nomeProd),
      rows: [
        { k: "Lotto", v: dati.lotto, big: true },
        { k: "Data produzione", v: dati.dataProduzione },
        { k: "Scadenza", v: c.data_scadenza || dati.scadenza },
        { k: "Peso", v: `${String(c.quantita)} ${unita}` },
        { k: "", v: "Coprodotto da lavorazione" }
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

function validaFormForPrint(dati) {
  if (!dati.ricettaId) return "Seleziona una ricetta.";
  if (!dati.dataProduzione) return "Seleziona la data produzione.";
  if (!dati.lotto) return "Lotto non disponibile.";
  if (!dati.scadenza) return "Scadenza non disponibile.";
  if (!dati.operatore?.id) return "PIN operatore non valido.";
  return null;
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

function toNumber(v) {
  const n = parseFloat((v ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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
