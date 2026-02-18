// ============================================================
// VIEW PRODUZIONE - VERSIONE FIGA STABILE
// Card operative + autocomplete + riepilogo
// Allineata al DB reale
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

      <div class="dashboard-grid" style="margin-top:10px;">

        <div class="azienda-card">
          <h3>➕ Crea Ricetta</h3>
          <p class="small-muted">
            Inserisci la scheda tecnica completa.
          </p>
          <button class="app-button green"
            onclick="window.location.hash='#/ricette?mode=new'">
            Apri Editor
          </button>
        </div>

        <div class="azienda-card">
          <h3>🔍 Cerca Ricetta</h3>
          <p class="small-muted">
            Consulta una ricetta esistente.
          </p>
          <button class="app-button gray"
            onclick="window.location.hash='#/ricette?mode=search'">
            Vai a Ricette
          </button>
        </div>

        <div class="azienda-card">
          <h3>▶ Produci Ricetta</h3>
          <p class="small-muted">
            Registra una lavorazione.
          </p>
          <button id="btn-apri-produzione"
            class="app-button primary">
            Apri Produzione
          </button>
        </div>

      </div>

      <div id="panel-produzione"
        class="editor-section"
        style="margin-top:20px; display:none;">

        <div class="editor-section-header">
          <strong>Produzione</strong>
        </div>

        <div class="editor-section-body">

          <div class="editor-grid-2">

            <div>
              <label>
                Ricetta
                <input id="prod-search"
                  class="input-pill"
                  placeholder="Cerca ricetta..."
                  autocomplete="off">
                <input type="hidden" id="prod-ricetta-id">
              </label>
              <div id="prod-suggest" class="suggest-list"></div>
            </div>

            <label>
              Data
              <input id="prod-data"
                type="date"
                class="input-pill">
            </label>

          </div>

          <div class="editor-grid-2">

            <label>
              Quantità prodotta
              <input id="prod-qta"
                type="number"
                min="1"
                class="input-pill">
            </label>

            <label>
              Lotto
              <input id="prod-lotto"
                class="input-pill">
            </label>

          </div>

          <div id="prod-riepilogo"
            class="small-muted"
            style="margin-top:12px;">
            Seleziona una ricetta.
          </div>

          <div style="margin-top:16px;">
            <button id="btn-conferma"
              class="app-button green">
              Conferma Produzione
            </button>
          </div>

        </div>
      </div>

    </section>
  `;

  document
    .getElementById("btn-apri-produzione")
    ?.addEventListener("click", () => {
      document.getElementById("panel-produzione").style.display = "block";
    });

  document
    .getElementById("btn-conferma")
    ?.addEventListener("click", confermaProduzione);

  presetData();
  await preloadRicette();
  setupAutocomplete();
}

// ============================================================
// DATA OGGI
// ============================================================

function presetData() {
  const el = document.getElementById("prod-data");
  if (!el) return;
  el.value = new Date().toISOString().slice(0, 10);
}

// ============================================================
// PRELOAD RICETTE (FIX DEFINITIVO)
// ============================================================

async function preloadRicette() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    console.warn("Azienda non trovata");
    return;
  }

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome, pezzi_base, azienda_id")
    .eq("azienda_id", aziendaId)
    .order("nome");

  if (error) {
    console.error(error);
    alert("Errore caricamento ricette");
    return;
  }

  ricetteCache = data || [];
  ricetteById = new Map(
    ricetteCache.map(r => [String(r.id), r])
  );
}

// ============================================================
// AUTOCOMPLETE
// ============================================================

function setupAutocomplete() {
  const input = document.getElementById("prod-search");
  const suggest = document.getElementById("prod-suggest");
  const hidden = document.getElementById("prod-ricetta-id");

  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    suggest.innerHTML = "";

    if (q.length < 2) return;

    const results = ricetteCache
      .filter(r => r.nome?.toLowerCase().includes(q))
      .slice(0, 8);

    results.forEach(r => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = r.nome;
      div.onclick = () => {
        hidden.value = r.id;
        input.value = r.nome;
        suggest.innerHTML = "";
        ricettaSelezionata = r;
        renderRiepilogo();
      };
      suggest.appendChild(div);
    });
  });
}

// ============================================================
// RIEPILOGO
// ============================================================

function renderRiepilogo() {
  const box = document.getElementById("prod-riepilogo");
  if (!ricettaSelezionata) return;

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

// ============================================================
// CONFERMA PRODUZIONE (mock)
// ============================================================

function confermaProduzione() {
  const id = document.getElementById("prod-ricetta-id")?.value;
  const qta = parseInt(document.getElementById("prod-qta")?.value);

  if (!id) return alert("Seleziona una ricetta.");
  if (!qta || qta <= 0) return alert("Inserisci quantità valida.");

  alert("Produzione registrata ✔️");
}

// ============================================================
// UTILS
// ============================================================

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
