// js/views/crea-ricetta.js
// ============================================================
// CREA / MODIFICA RICETTA – VERSIONE INDUSTRIALE (MODULARE)
// Coerente con struttura DB reale:
// - ricette
// - ricetta_ingredienti
// - ricette_preparazione_fasi
// - ricette_conservazione
// - ricette_cottura (1 record per ricetta)
// - ricette_output (1 record per ricetta)
// - ricette_porzione
// ============================================================

let ricettaId = null;

let prodottiCache = [];
let prodottiMap = new Map();

let ingredientiCache = [];
let fasiCache = [];
let conservazioniCache = [];
let porzioniCache = [];
let cotturaCache = null;
let outputCache = null;

export async function render(app) {
  ricettaId = window.routeParams?.id ? String(window.routeParams.id) : null;

  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }
  // ============================================================
  // 🔐 CONTROLLO PERMESSI RICETTE (SaaS Multi-Azienda)
  // ============================================================

  const canRead = window.hasPermesso && window.hasPermesso("ricette.read");
  const canCreate = window.hasPermesso && window.hasPermesso("ricette.create");
  const canUpdate = window.hasPermesso && window.hasPermesso("ricette.update");

  // 1️⃣ Blocco totale accesso se manca read
  if (!canRead) {
    app.innerHTML = `
      <section class="view">
        <h2 style="margin-top:0;">Accesso negato</h2>
        <p class="small-muted">
          Non hai i permessi per visualizzare le ricette.
        </p>
      </section>
    `;
    return;
  }

  // 2️⃣ Blocco creazione
  if (!ricettaId && !canCreate) {
    app.innerHTML = `
      <section class="view">
        <h2 style="margin-top:0;">Accesso negato</h2>
        <p class="small-muted">
          Non hai i permessi per creare nuove ricette.
        </p>
      </section>
    `;
    return;
  }

  // 3️⃣ Blocco modifica
  if (ricettaId && !canUpdate) {
    app.innerHTML = `
      <section class="view">
        <h2 style="margin-top:0;">Accesso negato</h2>
        <p class="small-muted">
          Non hai i permessi per modificare le ricette.
        </p>
      </section>
    `;
    return;
  }
  app.innerHTML = `
    <section class="view">

      <div class="page-topbar">
        <button class="app-button small gray"
          onclick="window.location.hash='#/produzione'">
          ← Centro Produzione
        </button>
        <h2>${ricettaId ? "✏️ Modifica Ricetta" : "🆕 Crea Ricetta"}</h2>
      </div>

      <div class="editor-stack">

        <!-- ================= ANAGRAFICA ================= -->
        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Anagrafica</strong>
          </div>
          <div class="editor-section-body editor-grid-2">

            <label>
              Nome ricetta *
              <input id="r-nome" class="input-pill" />
            </label>

            <label>
              Pezzi base (opz.)
              <input id="r-pezzi-base" type="number" min="0" class="input-pill" />
            </label>

            <label style="grid-column:1/-1;">
              Descrizione (opz.)
              <textarea id="r-descrizione" class="input-pill" rows="3" style="resize:vertical;"></textarea>
            </label>

            <label style="grid-column:1/-1;">
              Note procedimento (opz.)
              <textarea id="r-note-proc" class="input-pill" rows="4" style="resize:vertical;"></textarea>
            </label>

            <label style="grid-column:1/-1;">
              Foto URL (opz.)
              <input id="r-foto-url" class="input-pill" placeholder="https://..." />
            </label>

          </div>
        </div>

        <!-- ================= OUTPUT ================= -->
        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Output (prodotto + resa)</strong>
          </div>
          <div class="editor-section-body editor-grid-2">

            <div style="grid-column:1/-1;">
              <label>
                Prodotto output *
                <div class="input-wrap">
                  <input id="r-output-search"
                    class="input-pill"
                    autocomplete="off"
                    placeholder="Cerca prodotto output..." />
                  <input id="r-output-id" type="hidden" />
                  <div id="r-output-suggest" class="suggest-list"></div>
                </div>
              </label>
              <div id="r-output-info" class="small-muted" style="margin-top:6px;">
                Nessun prodotto output selezionato
              </div>
            </div>

            <label>
              Peso finale (resa) *
              <input id="r-output-peso" type="number" min="0" step="0.001" class="input-pill" placeholder="Es: 10.000" />
            </label>

            <label>
              Unità misura output *
              <select id="r-output-um" class="input-pill">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="pz">pz</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
              </select>
            </label>

            <label style="grid-column:1/-1;">
              Note output (opz.)
              <input id="r-output-note" class="input-pill" placeholder="Es: resa dopo cottura / sgocciolato / ecc." />
            </label>

          </div>
        </div>

        <!-- ================= INGREDIENTI ================= -->
        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Ingredienti</strong>
          </div>
          <div class="editor-section-body">
            <div id="ingredienti-container"></div>

            <button id="btn-add-ing"
              class="app-button small gray"
              type="button"
              style="margin-top:10px;">
              + Aggiungi ingrediente
            </button>
          </div>
        </div>

        <!-- ================= FASI ================= -->
        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Fasi di preparazione</strong>
          </div>
          <div class="editor-section-body">
            <div id="fasi-container"></div>

            <button id="btn-add-fase"
              class="app-button small gray"
              type="button"
              style="margin-top:10px;">
              + Aggiungi fase
            </button>

            <div class="small-muted" style="margin-top:10px;">
              Suggerimento: usa ordine 1,2,3... e indica durata e lavoro umano (minuti).
            </div>
          </div>
        </div>

        <!-- ================= CONSERVAZIONE ================= -->
        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Conservazione (scenari)</strong>
          </div>
          <div class="editor-section-body">
            <div id="conservazione-container"></div>

            <button id="btn-add-conservazione"
              class="app-button small gray"
              type="button"
              style="margin-top:10px;">
              + Aggiungi scenario
            </button>

            <div class="small-muted" style="margin-top:10px;">
              Gli scenari vengono poi scelti in Preparazioni per calcolare automaticamente la scadenza.
            </div>
          </div>
        </div>

        <!-- ================= COTTURA ================= -->
        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Cottura (opzionale)</strong>
          </div>
          <div class="editor-section-body editor-grid-2">

            <label>
              Tipologia
              <select id="r-cottura-tipologia" class="input-pill">
                <option value="nessuna">nessuna</option>
                <option value="pentola">pentola</option>
                <option value="forno">forno</option>
                <option value="vapore">vapore</option>
                <option value="brasato">brasato</option>
                <option value="CBT">CBT</option>
                <option value="mista">mista</option>
              </select>
            </label>

            <label>
              Temperatura (opz.)
              <input id="r-cottura-temperatura" class="input-pill" placeholder="Es: 160°C" />
            </label>

            <label>
              Tempo (minuti) (opz.)
              <input id="r-cottura-tempo" type="number" min="0" class="input-pill" />
            </label>

            <label style="grid-column:1/-1;">
              Note cottura (opz.)
              <input id="r-cottura-note" class="input-pill" />
            </label>

          </div>
        </div>

        <!-- ================= PORZIONATURE ================= -->
        <div class="editor-section open">
          <div class="editor-section-header">
            <strong>Porzionature / Confezioni</strong>
          </div>
          <div class="editor-section-body">
            <div id="porzioni-container"></div>

            <button id="btn-add-porzione"
              class="app-button small gray"
              type="button"
              style="margin-top:10px;">
              + Aggiungi porzionatura
            </button>

            <div class="small-muted" style="margin-top:10px;">
              Esempio: "Trattoria 200g", "Ricevimento 120g", "Vasetto 280g". In Produzione potrai creare più confezioni nello stesso lotto.
            </div>
          </div>
        </div>

        <!-- ================= AZIONI ================= -->
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          <button id="btn-salva"
            class="app-button green"
            type="button">
            💾 Salva Ricetta
          </button>

          <button id="btn-torna-ricettario"
            class="app-button small gray"
            type="button">
            ← Torna al Ricettario
          </button>
        </div>

        <div id="r-esito" class="small-muted" style="margin-top:10px;"></div>

      </div>
    </section>
  `;

  await loadProdotti();
  bindUI();

  if (ricettaId) {
    await caricaRicettaCompleta();
  } else {
    // default UI
    aggiungiIngrediente();
    aggiungiFase({ ordine: 1, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });
    aggiungiScenarioConservazione();
    aggiungiPorzione();
    aggiornaOutputInfo();
  }
}

/* ============================================================
   PRODOTTI + AUTOCOMPLETE
============================================================ */
async function loadProdotti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, descrizione, um")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("descrizione");

  if (error) {
    console.error(error);
    prodottiCache = [];
    prodottiMap = new Map();
    return;
  }

  prodottiCache = data || [];
  prodottiMap = new Map(prodottiCache.map(p => [String(p.id), p]));

  setupAutocomplete(
    document.getElementById("r-output-search"),
    document.getElementById("r-output-id"),
    document.getElementById("r-output-suggest"),
    (p) => {
      // quando scelgo output: suggerisco UM
      const umSel = document.getElementById("r-output-um");
      if (p?.um && umSel) {
        const val = String(p.um).toLowerCase();
        const ok = ["kg", "g", "pz", "l", "ml"].includes(val);
        if (ok) umSel.value = val;
      }
      aggiornaOutputInfo();
    }
  );
}

function setupAutocomplete(input, hidden, suggestBox, onPick = null) {
  input.addEventListener("input", () => {
    const q = (input.value || "").toLowerCase().trim();
    hidden.value = "";
    suggestBox.innerHTML = "";

    if (q.length < 2) {
      suggestBox.classList.remove("open");
      return;
    }

    const risultati = prodottiCache
      .filter(p => (p.descrizione || "").toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach(p => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = p.descrizione;

      div.onclick = () => {
        input.value = p.descrizione;
        hidden.value = p.id;
        suggestBox.innerHTML = "";
        suggestBox.classList.remove("open");
        if (typeof onPick === "function") onPick(p);
      };

      suggestBox.appendChild(div);
    });

    suggestBox.classList.add("open");
  });

  document.addEventListener("click", (e) => {
    const wrap = input.closest(".input-wrap") || input.parentElement;
    if (!wrap) return;
    if (!wrap.contains(e.target)) suggestBox.classList.remove("open");
  });
}

function aggiornaOutputInfo() {
  const outId = document.getElementById("r-output-id")?.value;
  const outInfo = document.getElementById("r-output-info");
  if (!outInfo) return;

  if (!outId) {
    outInfo.innerText = "Nessun prodotto output selezionato";
    return;
  }

  const p = prodottiMap.get(String(outId));
  if (!p) {
    outInfo.innerText = "Prodotto output selezionato";
    return;
  }

  outInfo.innerText = `Output: ${p.descrizione} — UM: ${p.um || "-"}`;
}

/* ============================================================
   INGREDIENTI
============================================================ */
function aggiungiIngrediente(initial = {}) {
  const container = document.getElementById("ingredienti-container");

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="editor-grid-2">

      <div>
        <div class="input-wrap">
          <input class="ing-search input-pill"
            placeholder="Ingrediente..."
            autocomplete="off"
            value="${escapeAttr(initial.nome_prodotto || "")}" />
          <input class="ing-id"
            type="hidden"
            value="${escapeAttr(initial.prodotto_id || "")}" />
          <div class="suggest-list ing-suggest"></div>
        </div>
      </div>

      <div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input class="ing-qta input-pill"
            type="number"
            step="0.001"
            min="0"
            placeholder="Quantità"
            value="${escapeAttr(initial.quantita ?? initial.quantità ?? "")}" />
          <span class="small-muted ing-um-label" style="min-width:34px; text-align:right;">${escapeHtml(initial.unita_misura || "")}</span>
        </div>
      </div>

    </div>

    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
      <button class="app-button tiny red" type="button">✕</button>
    </div>
  `;

  row.querySelector("button").onclick = () => row.remove();
  container.appendChild(row);

  const ingSearch = row.querySelector(".ing-search");
  const ingId = row.querySelector(".ing-id");
  const ingSuggest = row.querySelector(".ing-suggest");
  const umLabel = row.querySelector(".ing-um-label");

  setupAutocomplete(
    ingSearch,
    ingId,
    ingSuggest,
    (p) => {
      umLabel.textContent = p?.um || "pz";
    }
  );

  // se già valorizzato
  if (ingId.value) {
    const p = prodottiMap.get(String(ingId.value));
    if (p) umLabel.textContent = p.um || "pz";
  }
}

/* ============================================================
   FASI
============================================================ */
function aggiungiFase(initial = {}) {
  const container = document.getElementById("fasi-container");

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="editor-grid-2">

      <label>
        Ordine *
        <input class="fase-ordine input-pill" type="number" min="1" value="${escapeAttr(initial.ordine ?? 1)}" />
      </label>

      <label>
        Tipo fase *
        <select class="fase-tipo input-pill">
          <option value="preparazione">preparazione</option>
          <option value="cottura">cottura</option>
          <option value="attesa">attesa</option>
          <option value="raffreddamento">raffreddamento</option>
        </select>
      </label>

      <label style="grid-column:1/-1;">
        Nome fase *
        <input class="fase-nome input-pill" value="${escapeAttr(initial.nome_fase || "")}" />
      </label>

      <label>
        Durata (min) *
        <input class="fase-durata input-pill" type="number" min="0" value="${escapeAttr(initial.durata_min ?? 0)}" />
      </label>

      <label>
        Lavoro umano (min) *
        <input class="fase-lavoro input-pill" type="number" min="0" value="${escapeAttr(initial.lavoro_umano_min ?? 0)}" />
      </label>

      <label>
        Tecnologia (opz.)
        <input class="fase-tecnologia input-pill" value="${escapeAttr(initial.tecnologia || "")}" />
      </label>

      <label>
        Temperatura (opz.)
        <input class="fase-temperatura input-pill" type="number" step="0.1" value="${escapeAttr(initial.temperatura ?? "")}" />
      </label>

      <label style="grid-column:1/-1;">
        Note (opz.)
        <input class="fase-note input-pill" value="${escapeAttr(initial.note || "")}" />
      </label>

    </div>

    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
      <button class="app-button tiny red" type="button">✕</button>
    </div>
  `;

  row.querySelector(".fase-tipo").value = initial.tipo_fase || "preparazione";
  row.querySelector("button").onclick = () => row.remove();

  container.appendChild(row);
}

/* ============================================================
   CONSERVAZIONE
============================================================ */
function aggiungiScenarioConservazione(initial = {}) {
  const container = document.getElementById("conservazione-container");

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="editor-grid-2">

      <label style="grid-column:1/-1;">
        Label scenario *
        <input class="cons-label input-pill" value="${escapeAttr(initial.scenario_label || "")}" placeholder="Es: Frigo 0-4°C, Abbattuto e congelato..." />
      </label>

      <label>
        Shelf life (giorni) *
        <input class="cons-shelf input-pill" type="number" min="0" value="${escapeAttr(initial.shelf_life_giorni ?? "")}" />
      </label>

      <label>
        Abbattimento (opz.)
        <input class="cons-abbatt input-pill" value="${escapeAttr(initial.abbattimento || "")}" placeholder="Es: sì/no, +3°C..." />
      </label>

      <label style="grid-column:1/-1;">
        Confezionamento (opz.)
        <input class="cons-confez input-pill" value="${escapeAttr(initial.confezionamento || "")}" placeholder="Es: vaschetta, sottovuoto, vasetto..." />
      </label>

      <label style="grid-column:1/-1;">
        Note (opz.)
        <input class="cons-note input-pill" value="${escapeAttr(initial.note || "")}" />
      </label>

      <label>
        Attivo
        <select class="cons-attivo input-pill">
          <option value="true">sì</option>
          <option value="false">no</option>
        </select>
      </label>

    </div>

    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
      <button class="app-button tiny red" type="button">✕</button>
    </div>
  `;

  row.querySelector(".cons-attivo").value = String(initial.attivo ?? true);
  row.querySelector("button").onclick = () => row.remove();

  container.appendChild(row);
}

/* ============================================================
   PORZIONATURE
============================================================ */
function aggiungiPorzione(initial = {}) {
  const container = document.getElementById("porzioni-container");

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="editor-grid-2">

      <label style="grid-column:1/-1;">
        Label porzione *
        <input class="porz-label input-pill" value="${escapeAttr(initial.label || "")}" placeholder="Es: Trattoria 200g / Ricevimento 120g / Vasetto 280g" />
      </label>

      <label>
        Peso porzione *
        <input class="porz-peso input-pill" type="number" min="0" step="0.001" value="${escapeAttr(initial.peso_porzione ?? "")}" />
      </label>

      <label>
        Unità misura *
        <select class="porz-um input-pill">
          <option value="g">g</option>
          <option value="kg">kg</option>
          <option value="pz">pz</option>
          <option value="ml">ml</option>
          <option value="l">l</option>
        </select>
      </label>

      <label style="grid-column:1/-1;">
        Note (opz.)
        <input class="porz-note input-pill" value="${escapeAttr(initial.note || "")}" />
      </label>

      <label>
        Attivo
        <select class="porz-attivo input-pill">
          <option value="true">sì</option>
          <option value="false">no</option>
        </select>
      </label>

    </div>

    <div style="margin-top:6px; display:flex; justify-content:flex-end;">
      <button class="app-button tiny red" type="button">✕</button>
    </div>
  `;

  row.querySelector(".porz-um").value = initial.unita_misura || "g";
  row.querySelector(".porz-attivo").value = String(initial.attivo ?? true);
  row.querySelector("button").onclick = () => row.remove();

  container.appendChild(row);
}

/* ============================================================
   CARICA RICETTA COMPLETA
============================================================ */
async function caricaRicettaCompleta() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data: ricetta, error: errRic } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", ricettaId)
    .eq("azienda_id", aziendaId)
    .single();

  if (errRic || !ricetta) {
    console.error(errRic);
    alert("Ricetta non trovata o non accessibile.");
    window.location.hash = "#/ricettario";
    return;
  }

  // anagrafica
  setVal("r-nome", ricetta.nome || "");
  setVal("r-pezzi-base", ricetta.pezzi_base ?? "");
  setVal("r-descrizione", ricetta.descrizione || "");
  setVal("r-note-proc", ricetta.note_procedimento || "");
  setVal("r-foto-url", ricetta.foto_url || "");

  // prodotto output
  if (ricetta.prodotto_output_id) {
    const p = prodottiMap.get(String(ricetta.prodotto_output_id));
    if (p) {
      setVal("r-output-search", p.descrizione || "");
      setVal("r-output-id", p.id);
    } else {
      setVal("r-output-id", ricetta.prodotto_output_id);
    }
  }
  aggiornaOutputInfo();

  // ingredienti
  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", aziendaId);

  ingredientiCache = ingredienti || [];
  document.getElementById("ingredienti-container").innerHTML = "";
  if (ingredientiCache.length) ingredientiCache.forEach(i => aggiungiIngrediente(i));
  else aggiungiIngrediente();

  // fasi
  const { data: fasi } = await supabase
    .from("ricette_preparazione_fasi")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", aziendaId)
    .order("ordine", { ascending: true });

  fasiCache = fasi || [];
  document.getElementById("fasi-container").innerHTML = "";
  if (fasiCache.length) fasiCache.forEach(f => aggiungiFase(f));
  else aggiungiFase({ ordine: 1, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });

  // conservazione
  const { data: cons } = await supabase
    .from("ricette_conservazione")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  conservazioniCache = cons || [];
  document.getElementById("conservazione-container").innerHTML = "";
  if (conservazioniCache.length) conservazioniCache.forEach(c => aggiungiScenarioConservazione(c));
  else aggiungiScenarioConservazione();

  // cottura (1 record)
  const { data: cottura } = await supabase
    .from("ricette_cottura")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  cotturaCache = cottura || null;
  if (cotturaCache) {
    setVal("r-cottura-tipologia", cotturaCache.tipologia || "nessuna");
    setVal("r-cottura-temperatura", cotturaCache.temperatura || "");
    setVal("r-cottura-tempo", cotturaCache.tempo_minuti ?? "");
    setVal("r-cottura-note", cotturaCache.note || "");
  } else {
    setVal("r-cottura-tipologia", "nessuna");
    setVal("r-cottura-temperatura", "");
    setVal("r-cottura-tempo", "");
    setVal("r-cottura-note", "");
  }

  // output (1 record)
  const { data: output } = await supabase
    .from("ricette_output")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  outputCache = output || null;
  if (outputCache) {
    setVal("r-output-peso", outputCache.peso_finale ?? "");
    setVal("r-output-um", outputCache.unita_misura || "kg");
    setVal("r-output-note", outputCache.note || "");
  } else {
    setVal("r-output-peso", ricetta.peso_output_kg ?? "");
    setVal("r-output-um", "kg");
    setVal("r-output-note", "");
  }

  // porzioni
  const { data: porzioni } = await supabase
    .from("ricette_porzione")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  porzioniCache = porzioni || [];
  document.getElementById("porzioni-container").innerHTML = "";
  if (porzioniCache.length) porzioniCache.forEach(p => aggiungiPorzione(p));
  else aggiungiPorzione();
}

/* ============================================================
   SALVA TUTTO
============================================================ */
async function salvaTutto() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const nome = getVal("r-nome").trim();
  const pezzi_base = toIntOrNull(getVal("r-pezzi-base"));
  const descrizione = getVal("r-descrizione").trim() || null;
  const note_procedimento = getVal("r-note-proc").trim() || null;
  const foto_url = getVal("r-foto-url").trim() || null;

  const prodotto_output_id = getVal("r-output-id");
  const output_peso = toNumOrNull(getVal("r-output-peso"));
  const output_um = getVal("r-output-um");
  const output_note = getVal("r-output-note").trim() || null;

  if (!nome) return alert("Nome ricetta obbligatorio.");
  if (!prodotto_output_id) return alert("Seleziona il prodotto output.");
  if (!output_peso || output_peso <= 0) return alert("Inserisci il peso finale (resa) dell'output.");
  if (!output_um) return alert("Seleziona unità misura output.");

  const esito = document.getElementById("r-esito");
  if (esito) esito.innerText = "Salvataggio in corso...";

  // 1) salva ricetta (ricette)
  let savedId = ricettaId;

  if (!ricettaId) {
    const payload = {
      nome,
      descrizione,
      note_procedimento,
      foto_url,
      pezzi_base,
      prodotto_output_id,
      azienda_id: aziendaId,
      attivo: true,
      stato_strutturale: "bozza"
    };

    const { data, error } = await supabase
      .from("ricette")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore salvataggio ricetta.");
    }

    savedId = String(data.id);
    ricettaId = savedId;
  } else {
    const payload = {
      nome,
      descrizione,
      note_procedimento,
      foto_url,
      pezzi_base,
      prodotto_output_id,
      aggiornato_il: new Date().toISOString()
    };

    const { error } = await supabase
      .from("ricette")
      .update(payload)
      .eq("id", ricettaId)
      .eq("azienda_id", aziendaId);

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore aggiornamento ricetta.");
    }
  }

  // 2) salva output (ricette_output) - 1 record per ricetta
  {
    const payloadOut = {
      ricetta_id: Number(savedId),
      peso_finale: output_peso,
      unita_misura: output_um,
      note: output_note,
      azienda_id: aziendaId
    };

    const { error } = await supabase
      .from("ricette_output")
      .upsert(payloadOut, { onConflict: "ricetta_id" });

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore salvataggio output ricetta.");
    }
  }

  // 3) ingredienti: reset + insert
  {
    const { error: delErr } = await supabase
      .from("ricetta_ingredienti")
      .delete()
      .eq("ricetta_id", savedId)
      .eq("azienda_id", aziendaId);

    if (delErr) {
      console.error(delErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset ingredienti.");
    }

    const rows = [];
    document.querySelectorAll("#ingredienti-container .azienda-card").forEach(r => {
      const pid = (r.querySelector(".ing-id")?.value || "").trim();
      const nomeProd = (r.querySelector(".ing-search")?.value || "").trim();
      const qta = toNumOrNull(r.querySelector(".ing-qta")?.value);

      if (pid && qta && qta > 0) {
        const p = prodottiMap.get(String(pid));
        rows.push({
          ricetta_id: Number(savedId),
          prodotto_id: Number(pid),
          nome_prodotto: nomeProd || (p?.descrizione || ""),
          quantita: qta,
          unita_misura: p?.um || "pz",
          azienda_id: aziendaId,
          mapping_stato: "ok"
        });
      }
    });

    if (rows.length) {
      const { error: insErr } = await supabase
        .from("ricetta_ingredienti")
        .insert(rows);

      if (insErr) {
        console.error(insErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio ingredienti.");
      }
    }
  }

  // 4) fasi: reset + insert
  {
    const { error: delErr } = await supabase
      .from("ricette_preparazione_fasi")
      .delete()
      .eq("ricetta_id", savedId)
      .eq("azienda_id", aziendaId);

    if (delErr) {
      console.error(delErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset fasi.");
    }

    const rows = [];
    document.querySelectorAll("#fasi-container .azienda-card").forEach(r => {
      const ordine = toIntOrNull(r.querySelector(".fase-ordine")?.value);
      const tipo_fase = (r.querySelector(".fase-tipo")?.value || "").trim();
      const nome_fase = (r.querySelector(".fase-nome")?.value || "").trim();
      const durata_min = toIntOrNull(r.querySelector(".fase-durata")?.value);
      const lavoro_umano_min = toIntOrNull(r.querySelector(".fase-lavoro")?.value);
      const tecnologia = (r.querySelector(".fase-tecnologia")?.value || "").trim() || null;
      const temperatura = toNumOrNull(r.querySelector(".fase-temperatura")?.value);
      const note = (r.querySelector(".fase-note")?.value || "").trim() || null;

      if (ordine && tipo_fase && nome_fase && durata_min != null && lavoro_umano_min != null) {
        rows.push({
          ricetta_id: Number(savedId),
          ordine,
          tipo_fase,
          nome_fase,
          durata_min,
          lavoro_umano_min,
          tecnologia,
          temperatura,
          note,
          azienda_id: aziendaId
        });
      }
    });

    if (rows.length) {
      const { error: insErr } = await supabase
        .from("ricette_preparazione_fasi")
        .insert(rows);

      if (insErr) {
        console.error(insErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio fasi.");
      }
    }
  }

  // 5) conservazione: reset + insert
  {
    const { error: delErr } = await supabase
      .from("ricette_conservazione")
      .delete()
      .eq("ricetta_id", savedId)
      .eq("azienda_id", aziendaId);

    if (delErr) {
      console.error(delErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset conservazione.");
    }

    const rows = [];
    document.querySelectorAll("#conservazione-container .azienda-card").forEach(r => {
      const scenario_label = (r.querySelector(".cons-label")?.value || "").trim();
      const shelf_life_giorni = toIntOrNull(r.querySelector(".cons-shelf")?.value);
      const abbattimento = (r.querySelector(".cons-abbatt")?.value || "").trim() || null;
      const confezionamento = (r.querySelector(".cons-confez")?.value || "").trim() || null;
      const note = (r.querySelector(".cons-note")?.value || "").trim() || null;
      const attivo = (r.querySelector(".cons-attivo")?.value || "true") === "true";

      if (scenario_label && shelf_life_giorni != null) {
        rows.push({
          ricetta_id: Number(savedId),
          scenario_label,
          shelf_life_giorni,
          abbattimento,
          confezionamento,
          note,
          attivo,
          azienda_id: aziendaId
        });
      }
    });

    if (rows.length) {
      const { error: insErr } = await supabase
        .from("ricette_conservazione")
        .insert(rows);

      if (insErr) {
        console.error(insErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio conservazione.");
      }
    }
  }

  // 6) cottura (1 record): upsert su ricetta_id
  {
    const tipologia = getVal("r-cottura-tipologia") || "nessuna";
    const temperatura = getVal("r-cottura-temperatura").trim() || null;
    const tempo_minuti = toIntOrNull(getVal("r-cottura-tempo"));
    const note = getVal("r-cottura-note").trim() || null;

    // salviamo sempre un record (anche "nessuna") per coerenza, puoi cambiare in futuro
    const payload = {
      ricetta_id: Number(savedId),
      tipologia,
      temperatura,
      tempo_minuti,
      note,
      attivo: true,
      azienda_id: aziendaId
    };

    const { error } = await supabase
      .from("ricette_cottura")
      .upsert(payload, { onConflict: "ricetta_id" });

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore salvataggio cottura.");
    }
  }

  // 7) porzioni: reset + insert
  {
    const { error: delErr } = await supabase
      .from("ricette_porzione")
      .delete()
      .eq("ricetta_id", savedId)
      .eq("azienda_id", aziendaId);

    if (delErr) {
      console.error(delErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset porzionature.");
    }

    const rows = [];
    document.querySelectorAll("#porzioni-container .azienda-card").forEach(r => {
      const label = (r.querySelector(".porz-label")?.value || "").trim();
      const peso_porzione = toNumOrNull(r.querySelector(".porz-peso")?.value);
      const unita_misura = (r.querySelector(".porz-um")?.value || "").trim();
      const note = (r.querySelector(".porz-note")?.value || "").trim() || null;
      const attivo = (r.querySelector(".porz-attivo")?.value || "true") === "true";

      if (label && peso_porzione && peso_porzione > 0 && unita_misura) {
        rows.push({
          ricetta_id: Number(savedId),
          label,
          peso_porzione,
          unita_misura,
          note,
          attivo,
          azienda_id: aziendaId
        });
      }
    });

    if (rows.length) {
      const { error: insErr } = await supabase
        .from("ricette_porzione")
        .insert(rows);

      if (insErr) {
        console.error(insErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio porzionature.");
      }
    }
  }

  if (esito) esito.innerText = "Ricetta salvata ✔️";
  alert("Ricetta salvata ✔️");
  window.location.hash = "#/ricettario";
}

/* ============================================================
   BIND UI
============================================================ */
function bindUI() {
  document.getElementById("btn-add-ing")
    .addEventListener("click", () => aggiungiIngrediente());

  document.getElementById("btn-add-fase")
    .addEventListener("click", () => {
      const next = nextOrdineFase();
      aggiungiFase({ ordine: next, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });
    });

  document.getElementById("btn-add-conservazione")
    .addEventListener("click", () => aggiungiScenarioConservazione());

  document.getElementById("btn-add-porzione")
    .addEventListener("click", () => aggiungiPorzione());

  document.getElementById("btn-salva")
    .addEventListener("click", salvaTutto);

  document.getElementById("btn-torna-ricettario")
    .addEventListener("click", () => window.location.hash = "#/ricettario");

  // output info refresh
  document.getElementById("r-output-search")
    .addEventListener("input", () => {
      if (!getVal("r-output-id")) document.getElementById("r-output-info").innerText = "Nessun prodotto output selezionato";
    });

  document.getElementById("r-output-id")
    .addEventListener("change", aggiornaOutputInfo);
}

function nextOrdineFase() {
  let max = 0;
  document.querySelectorAll("#fasi-container .fase-ordine").forEach(el => {
    const n = toIntOrNull(el.value);
    if (n && n > max) max = n;
  });
  return max + 1;
}

/* ============================================================
   HELPERS
============================================================ */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? (el.value ?? "") : "";
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? "";
}

function toIntOrNull(v) {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function toNumOrNull(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}
