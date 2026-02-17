// js/views/ricettario.js
// ============================================================
// RICETTARIO – Ricerca autocompilante + Viewer
// ============================================================

let ricetteCache = [];

export async function render(app) {

  app.innerHTML = `
    <section class="view">

      <div style="margin-bottom:12px;">
        <button class="app-button small gray"
          onclick="window.location.hash='#/produzione'">
          ← Centro Produzione
        </button>
      </div>

      <h2>📖 Ricettario</h2>

      <input id="ric-search"
        class="input-pill"
        placeholder="Cerca ricetta..."
        autocomplete="off" />

      <div id="ric-suggest" class="suggest-list"></div>

      <div id="ric-viewer" style="margin-top:20px;"></div>

    </section>
  `;

  await loadRicette();
  setupAutocomplete();
}

async function loadRicette() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data } = await supabase
    .from("ricette")
    .select("id, nome")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  ricetteCache = data || [];
}

function setupAutocomplete() {
  const input = document.getElementById("ric-search");
  const suggest = document.getElementById("ric-suggest");

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

        div.onclick = () => {
          suggest.innerHTML = "";
          mostraRicetta(r.id);
        };

        suggest.appendChild(div);
      });
  });
}

async function mostraRicetta(id) {
  const supabase = window.supabaseClient;

  const { data } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", id)
    .single();

  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", id);

  const viewer = document.getElementById("ric-viewer");

  viewer.innerHTML = `
    <div class="azienda-card">
      <h3>${data.nome}</h3>

      <h4>Ingredienti</h4>
      <ul>
        ${ingredienti.map(i =>
          `<li>${i.nome_prodotto} — ${i.quantita} ${i.unita_misura}</li>`
        ).join("")}
      </ul>

      <div style="margin-top:10px;">
        <button class="app-button small"
          onclick="window.location.hash='#/creaRicetta?id=${id}'">
          ✏️ Modifica
        </button>
      </div>
    </div>
  `;
}
