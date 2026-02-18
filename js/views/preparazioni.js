let ricetteCache = [];
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

      <h2>🏷️ Preparazioni / Lotti</h2>

      <div class="editor-section open" style="margin-top:12px;">
        <div class="editor-section-body">

          <div class="input-wrap">
            <label>
              Ricetta
              <input id="prep-ricetta-search"
                class="input-pill"
                placeholder="Cerca ricetta..."
                autocomplete="off" />
              <input id="prep-ricetta-id" type="hidden" />
            </label>

            <div id="prep-ricetta-suggest"
              class="suggest-list"></div>
          </div>

          <label style="margin-top:10px;">
            Data produzione
            <input id="prep-data"
              class="input-pill"
              type="date" />
          </label>

          <label style="margin-top:10px;">
            Quantità prodotta
            <input id="prep-qta"
              class="input-pill"
              type="number"
              min="1" />
          </label>

          <div style="margin-top:15px;">
            <button id="btn-prep-conferma"
              class="app-button green">
              Conferma
            </button>
          </div>

          <div id="prep-riepilogo"
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
  setupAutocomplete();
}

function presetDataOggi() {
  const el = document.getElementById("prep-data");
  if (!el) return;
  el.value = new Date().toISOString().slice(0, 10);
}

async function preloadRicette() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.error(error);
    alert("Errore caricamento ricette");
    return;
  }

  ricetteCache = data || [];
  console.log("RICETTE CARICATE:", ricetteCache.length);
}

function setupAutocomplete() {
  const input = document.getElementById("prep-ricetta-search");
  const suggest = document.getElementById("prep-ricetta-suggest");
  const hiddenId = document.getElementById("prep-ricetta-id");

  if (!input || !suggest) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();

    suggest.innerHTML = "";
    suggest.classList.remove("open");

    if (q.length < 2) return;

    const risultati = ricetteCache
      .filter(r => r.nome.toLowerCase().includes(q))
      .slice(0, 10);

    if (!risultati.length) return;

    risultati.forEach(r => {
      const item = document.createElement("div");
      item.className = "suggest-item";
      item.textContent = r.nome;

      item.addEventListener("click", () => {
        hiddenId.value = r.id;
        input.value = r.nome;
        suggest.innerHTML = "";
        suggest.classList.remove("open");

        ricettaSelezionata = r;
        renderRiepilogo();
      });

      suggest.appendChild(item);
    });

    suggest.classList.add("open");
  });

  document.addEventListener("click", (e) => {
    if (!suggest.contains(e.target) && e.target !== input) {
      suggest.classList.remove("open");
    }
  });
}

function renderRiepilogo() {
  const box = document.getElementById("prep-riepilogo");
  if (!box || !ricettaSelezionata) return;

  box.className = "";
  box.innerHTML = `
    <div class="azienda-card">
      <strong>${ricettaSelezionata.nome}</strong>
    </div>
  `;
}
