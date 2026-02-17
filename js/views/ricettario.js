let ricetteCache = [];

export async function render(app) {
  app.innerHTML = `
    <section class="view">
      <div style="margin-bottom:12px;">
        <button class="app-button small gray"
          onclick="window.location.hash='#/home'">
          ← Dashboard
        </button>
      </div>

      <h2>📚 Ricettario</h2>

      <div style="margin:30px 0; text-align:center;">
        <input 
          id="ricettario-search"
          class="input-pill"
          placeholder="Cerca ricetta..."
          style="max-width:420px; font-size:18px;"
          autocomplete="off"
        />
        <div id="ricettario-suggest" class="suggest-list"></div>
      </div>

      <div id="ricettario-viewer"></div>

      <div style="margin-top:20px; text-align:right;">
        <button class="app-button green"
          onclick="window.location.hash='#/creaRicetta'">
          + Nuova Ricetta
        </button>
      </div>

    </section>
  `;

  await preloadRicette();
  setupAutocomplete();
}

async function preloadRicette() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome, descrizione, pezzi_base")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.error(error);
    alert("Errore caricamento ricette");
    return;
  }

  ricetteCache = data || [];
}

function setupAutocomplete() {
  const input = document.getElementById("ricettario-search");
  const suggest = document.getElementById("ricettario-suggest");

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
      div.onclick = () => {
        window.location.hash = "#/creaRicetta?id=" + r.id;
      };
      suggest.appendChild(div);
    });
  });
}
