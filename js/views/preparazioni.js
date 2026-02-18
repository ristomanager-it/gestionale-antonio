let ricetteCache = [];
let ricettaSelezionata = null;
let conservazioniCache = [];

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

      <div class="editor-section open" style="margin-top:15px;">
        <div class="editor-section-body">

          <!-- RICETTA -->
          <h3>Ricetta</h3>

          <label>
            Cerca ricetta
            <input id="prep-ricetta-search"
              class="input-pill"
              placeholder="Digita almeno 2 caratteri..."
              autocomplete="off" />
            <input id="prep-ricetta-id" type="hidden" />
          </label>

          <div id="prep-ricetta-suggest" class="suggest-list"></div>

          <div id="prep-riepilogo" class="small-muted" style="margin-top:8px;">
            Seleziona una ricetta.
          </div>

          <hr style="margin:20px 0;">

          <!-- DATI PRODUZIONE -->
          <h3>Dati Produzione</h3>

          <label>
            Data produzione
            <input id="prep-data" class="input-pill" type="date">
          </label>

          <label>
            Quantità prodotta
            <input id="prep-quantita" class="input-pill" type="number" min="1">
          </label>

          <label>
            Lotto
            <input id="prep-lotto" class="input-pill" readonly>
          </label>

          <label>
            Operatore
            <input id="prep-operatore" class="input-pill" readonly>
          </label>

          <hr style="margin:20px 0;">

          <!-- CONSERVAZIONE -->
          <h3>Conservazione</h3>

          <label>
            Scenario conservazione
            <select id="prep-conservazione" class="input-pill"></select>
          </label>

          <label>
            Shelf life (giorni)
            <input id="prep-shelf" class="input-pill" readonly>
          </label>

          <label>
            Data scadenza
            <input id="prep-scadenza" class="input-pill" readonly>
          </label>

          <hr style="margin:20px 0;">

          <!-- CONFEZIONAMENTO -->
          <h3>Confezionamento</h3>

          <label>
            Tipo confezionamento
            <input id="prep-confezione" class="input-pill">
          </label>

          <label>
            Pezzi per confezione
            <input id="prep-pezzi-confezione" class="input-pill" type="number">
          </label>

          <hr style="margin:20px 0;">

          <label>
            Destinazione
            <select id="prep-destinazione" class="input-pill">
              <option value="magazzino_preparazioni">Magazzino Preparazioni</option>
              <option value="linea_ristorante">Linea Ristorante</option>
            </select>
          </label>

          <div style="margin-top:20px;">
            <button id="btn-prep-salva" class="app-button green">
              💾 Registra Lotto
            </button>
          </div>

        </div>
      </div>
    </section>
  `;

  presetBase();
  await preloadRicette();
  setupAutocomplete();
  bindEvents();
}

/* ------------------ INIT ------------------ */

function presetBase() {
  document.getElementById("prep-data").value =
    new Date().toISOString().slice(0, 10);

  document.getElementById("prep-operatore").value =
    window.state.user?.email || "operatore";
}

/* ------------------ RICETTE ------------------ */

async function preloadRicette() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data } = await supabase
    .from("ricette")
    .select("id, nome, pezzi_base")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  ricetteCache = data || [];
}

function setupAutocomplete() {
  const input = document.getElementById("prep-ricetta-search");
  const suggest = document.getElementById("prep-ricetta-suggest");
  const hiddenId = document.getElementById("prep-ricetta-id");

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    suggest.innerHTML = "";

    if (q.length < 2) return;

    ricetteCache
      .filter(r => r.nome.toLowerCase().includes(q))
      .slice(0, 10)
      .forEach(r => {
        const div = document.createElement("div");
        div.className = "suggest-item";
        div.textContent = r.nome;
        div.onclick = async () => {
          hiddenId.value = r.id;
          input.value = r.nome;
          suggest.innerHTML = "";
          ricettaSelezionata = r;
          renderRiepilogo();
          generaLotto();
          await caricaConservazioni(r.id);
        };
        suggest.appendChild(div);
      });
  });
}

function renderRiepilogo() {
  const box = document.getElementById("prep-riepilogo");
  box.innerHTML = `
    <div class="azienda-card">
      <strong>${ricettaSelezionata.nome}</strong>
      <div class="small-muted">
        Pezzi base: ${ricettaSelezionata.pezzi_base ?? "-"}
      </div>
    </div>
  `;
}

/* ------------------ CONSERVAZIONE ------------------ */

async function caricaConservazioni(ricettaId) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data } = await supabase
    .from("ricette_conservazione")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", aziendaId)
    .eq("attivo", true);

  conservazioniCache = data || [];

  const select = document.getElementById("prep-conservazione");
  select.innerHTML = "<option value=''>-- Seleziona --</option>";

  conservazioniCache.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.scenario_label || "Scenario";
    select.appendChild(opt);
  });
}

/* ------------------ EVENTS ------------------ */

function bindEvents() {
  document
    .getElementById("prep-conservazione")
    ?.addEventListener("change", aggiornaConservazione);

  document
    .getElementById("prep-quantita")
    ?.addEventListener("input", generaLotto);

  document
    .getElementById("btn-prep-salva")
    ?.addEventListener("click", salvaPreparazione);
}

function aggiornaConservazione() {
  const id = document.getElementById("prep-conservazione").value;
  const scenario = conservazioniCache.find(c => c.id == id);
  if (!scenario) return;

  document.getElementById("prep-shelf").value =
    scenario.shelf_life_giorni || "";

  calcolaScadenza();
}

function calcolaScadenza() {
  const giorni = parseInt(document.getElementById("prep-shelf").value);
  const data = document.getElementById("prep-data").value;

  if (!giorni || !data) return;

  const d = new Date(data);
  d.setDate(d.getDate() + giorni);

  document.getElementById("prep-scadenza").value =
    d.toISOString().slice(0, 10);
}

function generaLotto() {
  if (!ricettaSelezionata) return;

  const data = document.getElementById("prep-data").value.replaceAll("-", "");
  const nome = ricettaSelezionata.nome
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);

  document.getElementById("prep-lotto").value =
    `${nome}-${data}-${Math.floor(Math.random()*90+10)}`;
}

/* ------------------ SALVATAGGIO ------------------ */

async function salvaPreparazione() {
  const supabase = window.supabaseClient;

  const payload = {
    ricetta_id: document.getElementById("prep-ricetta-id").value,
    data_produzione: document.getElementById("prep-data").value,
    lotto: document.getElementById("prep-lotto").value,
    quantita_output: parseInt(document.getElementById("prep-quantita").value),
    operatore: document.getElementById("prep-operatore").value,
    data_scadenza: document.getElementById("prep-scadenza").value,
    destinazione: document.getElementById("prep-destinazione").value
  };

  console.log("Payload lotto:", payload);

  alert("Struttura pronta. Ora colleghiamo tabella schede_produzione.");
}
