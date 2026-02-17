let ricetteCache = [];
let ricettaSelezionata = null;

export async function render(app) {
  app.innerHTML = `
    <section class="view">
      <div style="margin-bottom:12px;">
        <button class="app-button small gray"
          onclick="window.location.hash='#/produzione'">
          ← Centro Produzione
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
        suggest.innerHTML = "";
        input.value = r.nome;
        ricettaSelezionata = r;
        renderViewer(r);
      };
      suggest.appendChild(div);
    });
  });
}

async function renderViewer(ricetta) {
  const viewer = document.getElementById("ricettario-viewer");
  const supabase = window.supabaseClient;

  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("quantita, prodotti:prodotto_id (descrizione, um)")
    .eq("ricetta_id", ricetta.id);

  const { data: fasi } = await supabase
    .from("ricette_preparazione_fasi")
    .select("ordine, descrizione")
    .eq("ricetta_id", ricetta.id)
    .order("ordine");

  const ruolo = window.state?.ruolo || "";

  viewer.innerHTML = `
    <div class="azienda-card">
      <h3>${ricetta.nome}</h3>
      <div class="small-muted">
        ${ricetta.descrizione || ""}
      </div>

      <div style="margin-top:10px;">
        <strong>Pezzi base:</strong> ${ricetta.pezzi_base ?? "-"}
      </div>

      <hr style="margin:15px 0;">

      <h4>Ingredienti</h4>
      <ul>
        ${(ingredienti || [])
          .map(i => `
            <li>
              ${i.prodotti?.descrizione || "-"} 
              — ${i.quantita} ${i.prodotti?.um || ""}
            </li>
          `).join("")}
      </ul>

      <h4 style="margin-top:15px;">Preparazione</h4>
      <ol>
        ${(fasi || [])
          .map(f => `<li>${f.descrizione}</li>`)
          .join("")}
      </ol>

      ${ruolo.includes("manager") || ruolo === "admin" ? `
        <div style="margin-top:20px;">
          <button class="app-button small"
            onclick="window.location.hash='#/creaRicetta?id=${ricetta.id}'">
            Modifica Ricetta
          </button>
        </div>
      ` : ""}

    </div>
  `;
}
