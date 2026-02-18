let ricetteCache = [];
let ricettaSelezionata = null;
let scenariConservazione = [];
let dipendentiCache = [];

let operatoreRisolto = null; // { id, nome, cognome, pin }

export async function render(app) {
  app.innerHTML = `
    <section class="view">

      <div style="margin-bottom:12px;">
        <button class="app-button small gray"
          onclick="window.location.hash='#/produzione'">
          ← Centro Produzione
        </button>
      </div>

      <h2>🏷️ Preparazioni / Lotti</h2>

      <div class="editor-stack">

        <!-- ================= RICETTA ================= -->

        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Ricetta</strong>
          </div>
          <div class="editor-section-body">

            <div class="input-wrap">
              <input id="prep-ricetta-search"
                class="input-pill"
                placeholder="Cerca ricetta..."
                autocomplete="off" />
              <input id="prep-ricetta-id" type="hidden" />
              <div id="prep-ricetta-suggest" class="suggest-list"></div>
            </div>

            <div style="display:flex; gap:8px; margin-top:10px; align-items:center; flex-wrap:wrap;">
              <button id="btn-vedi-ricetta"
                class="app-button small gray"
                disabled>
                👁 Vedi ricetta
              </button>

              <div id="prep-ricetta-info" class="small-muted">
                Nessuna ricetta selezionata
              </div>
            </div>

          </div>
        </div>

        <!-- ================= PRODUZIONE ================= -->

        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Dati Produzione</strong>
          </div>

          <div class="editor-section-body editor-grid-2">

            <label>
              Data produzione
              <input id="prep-data"
                type="date"
                class="input-pill" />
            </label>

            <label>
              Peso finale prodotto (<span id="prep-unita-label">unità</span>)
              <input id="prep-peso-finale"
                type="number"
                min="0"
                step="0.001"
                class="input-pill"
                placeholder="Es: 2.500" />
              <div class="small-muted" style="margin-top:6px;">
                Inserisci il peso reale finale (obbligatorio).
              </div>
            </label>

            <label>
              Lotto (automatico)
              <input id="prep-lotto"
                class="input-pill"
                readonly />
            </label>

            <label>
              PIN operatore
              <input id="prep-operatore-pin"
                type="password"
                inputmode="numeric"
                class="input-pill"
                placeholder="Inserisci PIN..." />
              <div id="prep-operatore-info" class="small-muted" style="margin-top:6px;">
                Nessun operatore identificato
              </div>
            </label>

          </div>
        </div>

        <!-- ================= CONSERVAZIONE ================= -->

        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Conservazione</strong>
          </div>
          <div class="editor-section-body editor-grid-2">

            <label>
              Tipo conservazione
              <select id="prep-conservazione"
                class="input-pill"></select>
            </label>

            <label>
              Scadenza (automatica)
              <input id="prep-scadenza"
                type="date"
                class="input-pill"
                readonly />
            </label>

            <label>
              Confezionamento usato
              <select id="prep-confezionamento"
                class="input-pill"></select>
            </label>

          </div>
        </div>

        <!-- ================= AZIONI ================= -->

        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          <button id="btn-salva-preparazione"
            class="app-button green">
            💾 Registra Produzione
          </button>

          <button id="btn-stampa-etichetta"
            class="app-button">
            🖨 Crea e stampa etichetta
          </button>
        </div>

        <div id="prep-esito" class="small-muted" style="margin-top:10px;"></div>

      </div>

      <!-- ================= MODAL RICETTA (viewer) ================= -->
      <div id="prep-modal-backdrop"
        style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; padding:16px; overflow:auto;">
        <div class="view"
          style="max-width:920px; margin:0 auto; background:var(--card-bg, #111); border-radius:14px; padding:16px;">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
            <h3 id="prep-modal-title" style="margin:0;">Ricetta</h3>
            <button id="prep-modal-close" class="app-button small gray">✕ Chiudi</button>
          </div>

          <div id="prep-modal-body" style="margin-top:12px;"></div>
        </div>
      </div>

    </section>
  `;

  presetDataOggi();

  await preloadRicette();
  await preloadDipendenti();

  setupAutocompleteRicette();
  setupOperatorePIN();

  bindEvents();

  // inizializza select conservazione e confezionamento
  resetConservazioneUI();
  resetConfezionamentoUI();
}

/* ========================================================= */

function presetDataOggi() {
  const el = document.getElementById("prep-data");
  if (el) el.value = new Date().toISOString().slice(0, 10);
}

/* ================= RICETTE ================= */

async function preloadRicette() {
  // FIX: unita/peso output NON stanno in ricette, ma in ricette_output (1:1)
  const { data, error } = await window.supabaseClient
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
    .eq("azienda_id", window.state.azienda.id)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.error("Errore preload ricette:", error);
    ricetteCache = [];
    return;
  }

  ricetteCache = (data || []).map(r => {
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

function setupAutocompleteRicette() {
  const input = document.getElementById("prep-ricetta-search");
  const suggest = document.getElementById("prep-ricetta-suggest");
  const hidden = document.getElementById("prep-ricetta-id");
  const btnVedi = document.getElementById("btn-vedi-ricetta");

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
    ensureLotto();

    if (q.length < 2) {
      suggest.classList.remove("open");
      return;
    }

    const risultati = ricetteCache
      .filter(r => (r.nome || "").toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach(r => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = r.nome;

      div.onclick = async () => {
        hidden.value = r.id;
        input.value = r.nome;
        suggest.classList.remove("open");

        ricettaSelezionata = r;
        btnVedi.disabled = false;

        const resaTxt = (r.peso_output != null)
          ? ` — Resa: ${r.peso_output} ${r.unita_output || "kg"}`
          : "";

        setRicettaInfo("Pezzi base: " + (r.pezzi_base ?? "-") + resaTxt);

        // FIX: unità viene da ricette_output
        setUnitaMisuraLabel(r.unita_output || "kg");

        // lotto auto (prefisso da ricetta) - per ora fallback su nome
        ensureLotto(true);

        await loadConservazioni(r.id);
      };

      suggest.appendChild(div);
    });

    suggest.classList.add("open");
  });

  // chiudi tendina clic esterno
  document.addEventListener("click", (e) => {
    const wrap = input.closest(".input-wrap");
    if (!wrap) return;
    if (!wrap.contains(e.target)) {
      suggest.classList.remove("open");
    }
  });
}

function setRicettaInfo(text) {
  const el = document.getElementById("prep-ricetta-info");
  if (el) el.innerText = text;
}

function setUnitaMisuraLabel(text) {
  const el = document.getElementById("prep-unita-label");
  if (el) el.innerText = text || "-";
}

/* ================= CONSERVAZIONE ================= */

async function loadConservazioni(ricettaId) {
  const { data } = await window.supabaseClient
    .from("ricette_conservazione")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .eq("attivo", true);

  scenariConservazione = data || [];

  const select = document.getElementById("prep-conservazione");
  select.innerHTML = `<option value="">Seleziona...</option>`;

  scenariConservazione.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.scenario_label || "Scenario";
    select.appendChild(opt);
  });

  resetConfezionamentoUI();
  resetScadenza();
}

function resetConservazioneUI() {
  const select = document.getElementById("prep-conservazione");
  if (!select) return;
  select.innerHTML = `<option value="">Seleziona...</option>`;
}

function resetConfezionamentoUI() {
  const sel = document.getElementById("prep-confezionamento");
  if (!sel) return;
  sel.innerHTML = `<option value="">Seleziona...</option>`;
}

function resetScadenza() {
  const el = document.getElementById("prep-scadenza");
  if (el) el.value = "";
}

function aggiornaConservazione() {
  const id = document.getElementById("prep-conservazione").value;
  const scenario = scenariConservazione.find(s => s.id == id);

  resetConfezionamentoUI();
  resetScadenza();

  if (!scenario) return;

  // Confezionamento: supporto a opzioni multiple
  // - scenario.confezionamento_opzioni (array o stringa separata da , ; |)
  // - altrimenti scenario.confezionamento (stringa singola o multipla)
  const opzioni = estraiOpzioniConfezionamento(scenario);
  const sel = document.getElementById("prep-confezionamento");

  sel.innerHTML = `<option value="">Seleziona...</option>`;
  opzioni.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    sel.appendChild(opt);
  });

  // se c'è 1 sola opzione, pre-seleziona
  if (opzioni.length === 1) sel.value = opzioni[0];

  aggiornaScadenza();
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

  // pulizia
  const clean = raw
    .map(x => (x ?? "").toString().trim())
    .filter(Boolean);

  // unique mantenendo ordine
  const seen = new Set();
  const unique = [];
  for (const c of clean) {
    if (seen.has(c.toLowerCase())) continue;
    seen.add(c.toLowerCase());
    unique.push(c);
  }

  return unique;
}

function splitMulti(str) {
  return str
    .split(/[,;|]/g)
    .map(s => s.trim())
    .filter(Boolean);
}

function aggiornaScadenza() {
  const id = document.getElementById("prep-conservazione").value;
  const scenario = scenariConservazione.find(s => s.id == id);
  if (!scenario) return;

  const dataProd = document.getElementById("prep-data").value;
  if (!dataProd) return;

  const d = new Date(dataProd);
  d.setDate(d.getDate() + (scenario.shelf_life_giorni || 0));

  document.getElementById("prep-scadenza").value =
    d.toISOString().slice(0, 10);
}

/* ================= DIPENDENTI / PIN ================= */

async function preloadDipendenti() {
  // Richiediamo anche pin (necessario per riconoscere operatore)
  // Se nel DB il campo ha nome diverso, qui va adattato.
  const { data } = await window.supabaseClient
    .from("dipendenti")
    .select("id, nome, cognome, pin")
    .eq("azienda_id", window.state.azienda.id)
    .eq("attivo", true)
    .order("cognome");

  dipendentiCache = data || [];
}

function setupOperatorePIN() {
  const pinInput = document.getElementById("prep-operatore-pin");
  const info = document.getElementById("prep-operatore-info");

  operatoreRisolto = null;
  info.innerText = "Nessun operatore identificato";

  pinInput.addEventListener("input", () => {
    const pin = (pinInput.value || "").trim();
    if (!pin) {
      operatoreRisolto = null;
      info.innerText = "Nessun operatore identificato";
      return;
    }

    const match = dipendentiCache.find(d => (d.pin ?? "").toString() === pin);
    if (!match) {
      operatoreRisolto = null;
      info.innerText = "PIN non valido ❌";
      return;
    }

    operatoreRisolto = match;
    info.innerText = `Operatore: ${match.cognome} ${match.nome} ✅`;
  });
}

/* ================= LOTTO (automatico) ================= */

function ensureLotto(forceRegenerate = false) {
  const lottoEl = document.getElementById("prep-lotto");
  if (!lottoEl) return;

  if (!ricettaSelezionata) {
    lottoEl.value = "";
    return;
  }

  if (lottoEl.value && !forceRegenerate) return;

  const dataProd = document.getElementById("prep-data")?.value || new Date().toISOString().slice(0, 10);
  const prefix = generaPrefissoLotto(ricettaSelezionata);
  const progressivo = nextProgressivo(prefix, dataProd);

  lottoEl.value = `${prefix}-${dataProd.replaceAll("-", "")}-${String(progressivo).padStart(2, "0")}`;
}

function generaPrefissoLotto(ricetta) {
  // Fallback: prime 3 lettere del nome ricetta
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

/* ================= MODAL: VEDI RICETTA ================= */

async function apriModalRicetta() {
  if (!ricettaSelezionata?.id) return;

  const backdrop = document.getElementById("prep-modal-backdrop");
  const title = document.getElementById("prep-modal-title");
  const body = document.getElementById("prep-modal-body");

  title.innerText = `📖 ${ricettaSelezionata.nome || "Ricetta"}`;
  body.innerHTML = `<div class="small-muted">Caricamento...</div>`;
  backdrop.style.display = "block";

  // carico ingredienti + fasi (solo consultazione)
  const [ingRes, fasiRes, ricRes] = await Promise.all([
    window.supabaseClient.from("ricetta_ingredienti").select("*").eq("ricetta_id", ricettaSelezionata.id).order("ordine"),
    window.supabaseClient.from("ricette_preparazione_fasi").select("*").eq("ricetta_id", ricettaSelezionata.id).order("ordine"),
    // FIX: campo note in ricette è note_procedimento, non "note"
    window.supabaseClient.from("ricette").select("descrizione, note_procedimento").eq("id", ricettaSelezionata.id).maybeSingle()
  ]);

  const ingredienti = ingRes.data || [];
  const fasi = fasiRes.data || [];
  const ricettaDett = ricRes.data || {};

  body.innerHTML = `
    <div style="display:grid; gap:12px;">

      ${(ricettaDett.descrizione || ricettaDett.note_procedimento) ? `
        <div class="editor-section open">
          <div class="editor-section-header"><strong>Note</strong></div>
          <div class="editor-section-body">
            ${ricettaDett.descrizione ? `<div><strong>Descrizione:</strong> ${escapeHtml(ricettaDett.descrizione)}</div>` : ""}
            ${ricettaDett.note_procedimento ? `<div style="margin-top:8px;"><strong>Procedimento:</strong> ${escapeHtml(ricettaDett.note_procedimento)}</div>` : ""}
          </div>
        </div>
      ` : ""}

      <div class="editor-section open">
        <div class="editor-section-header"><strong>Ingredienti</strong></div>
        <div class="editor-section-body">
          ${ingredienti.length ? `
            <ul style="margin:0; padding-left:18px;">
              ${ingredienti.map(i => `<li>${escapeHtml(i.nome_ingrediente || i.nome || i.nome_prodotto || "Ingrediente")} ${formatQta(i)}</li>`).join("")}
            </ul>
          ` : `<div class="small-muted">Nessun ingrediente disponibile</div>`}
        </div>
      </div>

      <div class="editor-section open">
        <div class="editor-section-header"><strong>Fasi di preparazione</strong></div>
        <div class="editor-section-body">
          ${fasi.length ? `
            <ol style="margin:0; padding-left:18px;">
              ${fasi.map(f => `<li style="margin-bottom:8px;">${escapeHtml(f.nome_fase || f.testo || f.descrizione || "Fase")}</li>`).join("")}
            </ol>
          ` : `<div class="small-muted">Nessuna fase disponibile</div>`}
        </div>
      </div>

    </div>
  `;
}

function chiudiModalRicetta() {
  const backdrop = document.getElementById("prep-modal-backdrop");
  if (backdrop) backdrop.style.display = "none";
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatQta(i) {
  const q = i.qta ?? i.quantita ?? "";
  const u = i.unita ?? i.unita_misura ?? "";
  const out = [q, u].filter(Boolean).join(" ");
  return out ? `— ${escapeHtml(out)}` : "";
}

/* ================= EVENTI ================= */

function bindEvents() {

  document.getElementById("prep-conservazione")
    .addEventListener("change", aggiornaConservazione);

  document.getElementById("prep-data")
    .addEventListener("change", () => {
      aggiornaScadenza();
      // se lotto già esiste, NON lo rigeneriamo per non cambiare etichetta;
      // lo rigeneriamo solo se vuoto.
      ensureLotto(false);
    });

  document.getElementById("btn-salva-preparazione")
    .addEventListener("click", salvaPreparazione);

  document.getElementById("btn-stampa-etichetta")
    .addEventListener("click", creaEStampaEtichetta);

  document.getElementById("btn-vedi-ricetta")
    .addEventListener("click", apriModalRicetta);

  document.getElementById("prep-modal-close")
    .addEventListener("click", chiudiModalRicetta);

  document.getElementById("prep-modal-backdrop")
    .addEventListener("click", (e) => {
      if (e.target?.id === "prep-modal-backdrop") chiudiModalRicetta();
    });
}

/* ================= VALIDAZIONI ================= */

function raccogliDatiForm() {

  const ricettaId = document.getElementById("prep-ricetta-id").value;
  const dataProduzione = document.getElementById("prep-data").value;
  const pesoFinale = document.getElementById("prep-peso-finale").value;
  const lotto = document.getElementById("prep-lotto").value;

  const scenarioId = document.getElementById("prep-conservazione").value;
  const scadenza = document.getElementById("prep-scadenza").value;

  const confezionamento = document.getElementById("prep-confezionamento").value;

  return {
    ricettaId,
    dataProduzione,
    pesoFinale,
    lotto,
    scenarioId,
    scadenza,
    confezionamento,
    operatore: operatoreRisolto
  };
}

function validaForm(dati) {

  if (!dati.ricettaId) return alert("Seleziona una ricetta.");
  if (!dati.dataProduzione) return alert("Seleziona la data produzione.");
  if (!dati.pesoFinale || Number(dati.pesoFinale) <= 0) return alert("Inserisci il peso finale prodotto (maggiore di 0).");
  if (!dati.lotto) return alert("Lotto non disponibile. Seleziona una ricetta.");
  if (!dati.operatore?.id) return alert("Inserisci un PIN operatore valido.");
  if (!dati.scenarioId) return alert("Seleziona il tipo di conservazione.");
  if (!dati.scadenza) return alert("Scadenza non disponibile. Controlla la conservazione e la data produzione.");
  if (!dati.confezionamento) return alert("Seleziona il confezionamento usato.");

  return null;
}

/* ================= SALVATAGGIO (reale + movimenti magazzino) ================= */

async function salvaPreparazione() {

  const dati = raccogliDatiForm();
  const err = validaForm(dati);
  if (err) return;

  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    alert("Azienda non attiva.");
    return;
  }

  try {

    // ================================
    // 1️⃣ INSERT TESTATA PRODUZIONE
    // ================================
    const { data: produzione, error: errProduzione } =
      await window.supabaseClient
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

    const produzioneId = produzione.id;

    // ================================
    // 2️⃣ INSERT RIGA PRODUZIONE
    // ================================
    const { data: riga, error: errRiga } =
      await window.supabaseClient
        .from("schede_produzione_righe")
        .insert({
          azienda_id: aziendaId,
          produzione_id: produzioneId,
          ricetta_id: dati.ricettaId,
          quantita: Number(dati.pesoFinale),
          unita: document.getElementById("prep-unita-label")?.innerText || "kg",
          lotto: dati.lotto
        })
        .select()
        .single();

    if (errRiga) throw errRiga;

    const rigaId = riga.id;

    // ================================
    // 3️⃣ RECUPERO INGREDIENTI
    // ================================
    const { data: ingredienti, error: errIng } =
      await window.supabaseClient
        .from("ricetta_ingredienti")
        .select("*")
        .eq("ricetta_id", dati.ricettaId)
        .eq("azienda_id", aziendaId);

    if (errIng) throw errIng;

    // ================================
    // 4️⃣ SCARICO INGREDIENTI
    // ================================
    for (const ing of (ingredienti || [])) {

      const quantitaScarico = Number(ing.quantita || 0);
      if (!ing.prodotto_id || quantitaScarico <= 0) continue;

      const { error: errMov } =
        await window.supabaseClient
          .from("magazzino_movimenti")
          .insert({
            azienda_id: aziendaId,
            prodotto_id: ing.prodotto_id,
            tipo_movimento: "SCARICO",
            quantita: quantitaScarico,
            data_movimento: dati.dataProduzione,
            riferimento_tipo: "PRODUZIONE",
            riferimento_id: produzioneId,
            riferimento_riga_id: rigaId,
            note: `Scarico produzione lotto ${dati.lotto}`
          });

      if (errMov) throw errMov;
    }

    // ================================
    // 5️⃣ CARICO PRODOTTO FINITO
    // ================================
    if (ricettaSelezionata?.prodotto_output_id) {

      const { error: errCarico } =
        await window.supabaseClient
          .from("magazzino_movimenti")
          .insert({
            azienda_id: aziendaId,
            prodotto_id: ricettaSelezionata.prodotto_output_id,
            tipo_movimento: "CARICO",
            quantita: Number(dati.pesoFinale),
            data_movimento: dati.dataProduzione,
            riferimento_tipo: "PRODUZIONE",
            riferimento_id: produzioneId,
            riferimento_riga_id: rigaId,
            note: `Carico produzione lotto ${dati.lotto}`
          });

      if (errCarico) throw errCarico;
    }

    const esito = document.getElementById("prep-esito");
    if (esito) {
      esito.innerText = `Produzione registrata ✔️ — Lotto: ${dati.lotto}`;
    }

    alert(`Produzione registrata ✔️\nLotto: ${dati.lotto}`);

  } catch (error) {
    console.error("Errore produzione:", error);
    alert("Errore durante la registrazione della produzione. Controlla console.");
  }
}

/* ================= ETICHETTA (stampa) ================= */

function creaEStampaEtichetta() {

  const dati = raccogliDatiForm();
  const err = validaForm(dati);
  if (err) return;

  const ricettaNome = ricettaSelezionata?.nome || "Ricetta";
  const operatoreNome = `${dati.operatore.cognome} ${dati.operatore.nome}`.trim();
  const unita = document.getElementById("prep-unita-label")?.innerText || "";

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Etichetta lotto</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 14mm; }
    .label { border: 2px solid #000; padding: 10mm; border-radius: 6mm; }
    .title { font-size: 18pt; font-weight: 700; margin-bottom: 6mm; }
    .row { font-size: 12.5pt; margin: 2.5mm 0; }
    .muted { font-size: 10.5pt; color: #333; margin-top: 6mm; }
    .big { font-size: 15pt; font-weight: 700; }
    @media print {
      body { padding: 0; }
      .label { border: 2px solid #000; border-radius: 6mm; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="title">${escapeHtml(ricettaNome)}</div>

    <div class="row big">Lotto: ${escapeHtml(dati.lotto)}</div>
    <div class="row">Data produzione: <strong>${escapeHtml(dati.dataProduzione)}</strong></div>
    <div class="row">Scadenza: <strong>${escapeHtml(dati.scadenza)}</strong></div>

    <div class="row">Peso finale: <strong>${escapeHtml(String(dati.pesoFinale))} ${escapeHtml(unita)}</strong></div>
    <div class="row">Confezionamento: <strong>${escapeHtml(dati.confezionamento)}</strong></div>
    <div class="row">Operatore: <strong>${escapeHtml(operatoreNome)}</strong></div>

    <div class="muted">Generato da Ristoflow – Produzione</div>
  </div>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return alert("Popup bloccato dal browser. Consenti i popup per stampare l'etichetta.");
  w.document.open();
  w.document.write(html);
  w.document.close();
}
