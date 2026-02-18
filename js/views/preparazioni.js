let ricetteCache = [];
let ricettaSelezionata = null;
let scenariConservazione = [];
let dipendentiCache = [];

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

            <div id="prep-ricetta-info"
              class="small-muted"
              style="margin-top:8px;">
              Nessuna ricetta selezionata
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
              Quantità prodotta
              <input id="prep-qta"
                type="number"
                min="1"
                class="input-pill" />
            </label>

            <label>
              Lotto
              <input id="prep-lotto"
                class="input-pill" />
            </label>

            <label>
              Operatore
              <select id="prep-operatore"
                class="input-pill"></select>
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
              Scenario conservazione
              <select id="prep-conservazione"
                class="input-pill"></select>
            </label>

            <label>
              Scadenza
              <input id="prep-scadenza"
                type="date"
                class="input-pill"
                readonly />
            </label>

            <label>
              Confezionamento
              <input id="prep-confezionamento"
                class="input-pill"
                readonly />
            </label>

            <label>
              Trattamento
              <input id="prep-trattamento"
                class="input-pill"
                readonly />
            </label>

            <label>
              Temperatura
              <input id="prep-temperatura"
                class="input-pill"
                readonly />
            </label>

          </div>
        </div>

        <!-- ================= AZIONI ================= -->

        <div style="margin-top:10px;">
          <button id="btn-salva-preparazione"
            class="app-button green">
            💾 Registra Produzione
          </button>
        </div>

      </div>

    </section>
  `;

  presetDataOggi();
  await preloadRicette();
  await preloadDipendenti();
  setupAutocompleteRicette();
  bindEvents();
}

/* ========================================================= */

function presetDataOggi() {
  const el = document.getElementById("prep-data");
  if (el) el.value = new Date().toISOString().slice(0, 10);
}

/* ================= RICETTE ================= */

async function preloadRicette() {
  const { data } = await window.supabaseClient
    .from("ricette")
    .select("id, nome, pezzi_base")
    .eq("azienda_id", window.state.azienda.id)
    .eq("attivo", true)
    .order("nome");

  ricetteCache = data || [];
}

function setupAutocompleteRicette() {
  const input = document.getElementById("prep-ricetta-search");
  const suggest = document.getElementById("prep-ricetta-suggest");
  const hidden = document.getElementById("prep-ricetta-id");

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    suggest.innerHTML = "";

    if (q.length < 2) {
      suggest.classList.remove("open");
      return;
    }

    const risultati = ricetteCache
      .filter(r => r.nome.toLowerCase().includes(q))
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
        document.getElementById("prep-ricetta-info").innerText =
          "Pezzi base: " + (r.pezzi_base ?? "-");
        await loadConservazioni(r.id);
      };

      suggest.appendChild(div);
    });

    suggest.classList.add("open");
  });
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
}

/* ================= DIPENDENTI ================= */

async function preloadDipendenti() {
  const { data } = await window.supabaseClient
    .from("dipendenti")
    .select("id, nome, cognome")
    .eq("azienda_id", window.state.azienda.id)
    .eq("attivo", true)
    .order("cognome");

  dipendentiCache = data || [];

  const select = document.getElementById("prep-operatore");
  select.innerHTML = `<option value="">Seleziona operatore</option>`;

  dipendentiCache.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.cognome + " " + d.nome;
    select.appendChild(opt);
  });
}

/* ================= EVENTI ================= */

function bindEvents() {

  document.getElementById("prep-conservazione")
    .addEventListener("change", aggiornaConservazione);

  document.getElementById("prep-data")
    .addEventListener("change", aggiornaScadenza);

  document.getElementById("btn-salva-preparazione")
    .addEventListener("click", salvaPreparazione);
}

function aggiornaConservazione() {
  const id = document.getElementById("prep-conservazione").value;
  const scenario = scenariConservazione.find(s => s.id == id);
  if (!scenario) return;

  document.getElementById("prep-confezionamento").value =
    scenario.confezionamento || "";

  document.getElementById("prep-trattamento").value =
    scenario.trattamento || "";

  document.getElementById("prep-temperatura").value =
    scenario.temperatura || "";

  aggiornaScadenza();
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

/* ================= SALVATAGGIO ================= */

function salvaPreparazione() {

  const ricettaId = document.getElementById("prep-ricetta-id").value;
  const qta = document.getElementById("prep-qta").value;
  const operatore = document.getElementById("prep-operatore").value;

  if (!ricettaId) return alert("Seleziona una ricetta.");
  if (!qta) return alert("Inserisci quantità.");
  if (!operatore) return alert("Seleziona operatore.");

  alert("Produzione registrata ✔️ (mock)");
}
