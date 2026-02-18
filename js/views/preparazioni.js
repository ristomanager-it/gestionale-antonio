// ============================================================
// VIEW PREPARAZIONI / PRODUZIONE OPERATIVA
// ============================================================

let ricetteCache = [];
let ricetteById = new Map();
let ricettaSelezionata = null;

export async function render(app) {
  app.innerHTML = `
    <section class="view">

      <div style="margin-bottom:12px;">
        <button class="app-button small gray"
          onclick="window.location.hash='#/home'">
          ← Dashboard
        </button>
      </div>

      <h2>🏭 Produzione Operativa</h2>

      <div class="editor-section open" style="margin-top:12px;">
        <div class="editor-section-body">

          <label>
            Ricetta
            <input id="prod-ricetta-search"
              class="input-pill"
              placeholder="Cerca ricetta..."
              autocomplete="off" />
            <input id="prod-ricetta-id" type="hidden" />
          </label>

          <div id="prod-ricetta-suggest" class="suggest-list"></div>

          <label style="margin-top:10px;">
            Data produzione
            <input id="prod-data"
              class="input-pill"
              type="date" />
          </label>

          <label style="margin-top:10px;">
            Quantità prodotta
            <input id="prod-qta"
              class="input-pill"
              type="number"
              min="1" />
          </label>

          <div style="margin-top:15px;">
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

  presetDataOggi();
  await preloadRicette();
  setupAutocompleteRicette();

  document.getElementById("btn-prod-conferma")
    ?.addEventListener("click", confermaProduzione);
}

// ============================================================
// DATA OGGI
// ============================================================

function presetDataOggi() {
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
    console.warn("Azienda non disponibile");
    return;
  }

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome, prodotto_output_id, pezzi_base")
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

  console.log("RICETTE CARICATE:", ricetteCache.length);
}

// ============================================================
// AUTOCOMPLETE
// ============================================================

function setupAutocompleteRicette() {
  const input = document.getElementById("prod-ricetta-search");
  const suggest = document.getElementById("prod-ricetta-suggest");
  const hiddenId = document.getElementById("prod-ricetta-id");

  if (!input || !suggest || !hiddenId) return;

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    suggest.innerHTML = "";

    if (q.length < 2) return;

    const risultati = ricetteCache
      .filter(r => r.nome?.toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach(r => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = r.nome;

      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        hiddenId.value = r.id;
        input.value = r.nome;
        suggest.innerHTML = "";
        ricettaSelezionata = r;
        renderRiepilogo();
      });

      suggest.appendChild(div);
    });
  });
}

// ============================================================
// RIEPILOGO
// ============================================================

function renderRiepilogo() {
  const box = document.getElementById("prod-riepilogo");

  if (!box) return;

  if (!ricettaSelezionata) {
    box.className = "small-muted";
    box.textContent = "Seleziona una ricetta.";
    return;
  }

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
// CONFERMA PRODUZIONE (mock per ora)
// ============================================================

function confermaProduzione() {
  const ricettaId =
    document.getElementById("prod-ricetta-id")?.value;
  const qta =
    parseInt(document.getElementById("prod-qta")?.value);

  if (!ricettaId) return alert("Seleziona una ricetta.");
  if (!qta || qta <= 0)
    return alert("Quantità non valida.");

  alert("Produzione salvata (mock) ✔️");
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
