// ============================================================
// VIEW PRODUZIONE (CENTRO PRODUZIONE)
// ALLINEATO allo schema reale ricette
// ============================================================

let ricetteCache = [];
let ricetteById = new Map();
let ricettaSelezionata = null;

export async function render(app) {
  app.innerHTML = `
    <section class="view">
      <div class="page-topbar">
        <div class="page-topbar-left">
          <button class="app-button small gray"
            onclick="window.location.hash='#/home'">
            ← Dashboard
          </button>
          <h2 class="page-title">🏭 Centro Produzione</h2>
        </div>
      </div>

      <div class="editor-section open" id="panel-produzione" style="margin-top:12px;">
        <div class="editor-section-header">
          <div>
            <strong>Produzione</strong>
            <div class="section-meta">
              Seleziona una ricetta e registra la lavorazione
            </div>
          </div>
          <div class="section-meta">▾</div>
        </div>

        <div class="editor-section-body">

          <div class="editor-grid-2">
            <div class="input-wrap">
              <label>
                Ricetta
                <input id="prod-ricetta-search"
                  class="input-pill"
                  placeholder="Cerca ricetta..."
                  autocomplete="off" />
                <input id="prod-ricetta-id" type="hidden" />
              </label>
              <div id="prod-ricetta-suggest" class="suggest-list"></div>
              <div class="small-muted" id="prod-ricetta-hint">
                Digita almeno 2 caratteri.
              </div>
            </div>

            <label>
              Data produzione
              <input id="prod-data"
                class="input-pill"
                type="date" />
            </label>
          </div>

          <div class="editor-grid-2">
            <label>
              Quantità prodotta
              <input id="prod-qta"
                class="input-pill"
                type="number"
                min="1" />
            </label>

            <label>
              Lotto
              <input id="prod-lotto"
                class="input-pill" />
            </label>
          </div>

          <div class="editor-actions" style="margin-top:12px;">
            <button id="btn-prod-conferma"
              class="app-button green">
              Conferma Produzione
            </button>
          </div>

          <div id="prod-riepilogo"
            class="small-muted"
            style="margin-top:10px;">
            Seleziona una ricetta.
          </div>

        </div>
      </div>
    </section>
  `;

  bindUI();
  presetDataOggi();
  await preloadRicette();
  setupAutocompleteRicette();
}

function bindUI() {
  document.getElementById("btn-prod-conferma")
    ?.addEventListener("click", confermaProduzione);
}

function presetDataOggi() {
  const el = document.getElementById("prod-data");
  if (!el) return;
  const d = new Date();
  el.value = d.toISOString().slice(0, 10);
}

// ============================================================
// CARICAMENTO RICETTE (FIX resa_base → pezzi_base)
// ============================================================

async function preloadRicette() {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome, prodotto_output_id, pezzi_base")
    .order("nome");

  if (error) {
    console.error(error);
    alert("Errore caricamento ricette (Produzione)");
    return;
  }

  ricetteCache = data || [];
  ricetteById = new Map(
    ricetteCache.map(r => [String(r.id), r])
  );
}

function setupAutocompleteRicette() {
  const inputEl = document.getElementById("prod-ricetta-search");
  const suggestEl = document.getElementById("prod-ricetta-suggest");
  const hiddenId = document.getElementById("prod-ricetta-id");

  if (!inputEl || !suggestEl || !hiddenId) return;

  inputEl.addEventListener("input", () => {
    const q = inputEl.value.toLowerCase().trim();

    suggestEl.innerHTML = "";
    if (q.length < 2) return;

    const risultati = ricetteCache
      .filter(r => r.nome?.toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach(r => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = r.nome;
      div.onclick = () => {
        hiddenId.value = r.id;
        inputEl.value = r.nome;
        suggestEl.innerHTML = "";
        ricettaSelezionata = r;
        renderRiepilogo();
      };
      suggestEl.appendChild(div);
    });
  });
}

function renderRiepilogo() {
  const box = document.getElementById("prod-riepilogo");
  if (!box || !ricettaSelezionata) return;

  box.className = "";
  box.innerHTML = `
    <div class="azienda-card">
      <strong>${escapeHtml(ricettaSelezionata.nome)}</strong>
      <div class="small-muted">
        Pezzi base: ${ricettaSelezionata.pezzi_base ?? "-"}
      </div>
    </div>
  `;
}

async function confermaProduzione() {
  const ricettaId =
    document.getElementById("prod-ricetta-id")?.value;
  const qta =
    parseInt(document.getElementById("prod-qta")?.value);

  if (!ricettaId) return alert("Seleziona una ricetta.");
  if (!qta || qta <= 0)
    return alert("Inserisci quantità valida.");

  alert("Produzione salvata (mock) ✔️");
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
