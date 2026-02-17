// js/views/ricettario.js

let ricetteCache = [];

export async function render(app) {
  app.innerHTML = `
    <section class="view">
      <div class="page-topbar">
        <div class="page-topbar-left">
          <button class="app-button small gray"
            onclick="window.location.hash='#/home'">
            ← Dashboard
          </button>
          <h2 class="page-title">📚 Ricettario</h2>
        </div>

        <button class="app-button green"
          onclick="window.location.hash='#/ricettario/crea'">
          + Nuova Ricetta
        </button>
      </div>

      <div style="margin:40px 0; text-align:center;">
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
    </section>
  `;

  await preloadRicette();
  setupAutocomplete();
}

// Carica le ricette dal DB
async function preloadRicette() {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome")
    .order("nome");

  if (error) {
    console.error(error);
    alert("Errore caricamento ricette");
    return;
  }

  ricetteCache = data || [];
}

// Impostare autocompletamento per la ricerca ricetta
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
      div.onclick = async () => {
        input.value = r.nome;
        suggest.innerHTML = "";
        await apriRicetta(r.id);
      };
      suggest.appendChild(div);
    });
  });
}

// Funzione per aprire la ricetta e mostrarla in formato riassunto
async function apriRicetta(id) {
  const supabase = window.supabaseClient;

  const { data: ricetta } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", id)
    .single();

  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("nome_prodotto, quantita, unita_misura")
    .eq("ricetta_id", id);

  const { data: fasi } = await supabase
    .from("ricette_preparazione_fasi")
    .select("ordine, nome_fase, tipo_fase, durata_min, lavoro_umano_min")
    .eq("ricetta_id", id)
    .order("ordine");

  renderViewer(ricetta, ingredienti || [], fasi || []);
}

// Funzione per visualizzare la ricetta in modalità riassunto
function renderViewer(r, ingredienti, fasi) {
  const container = document.getElementById("ricettario-viewer");

  container.innerHTML = `
    <div class="azienda-card" style="margin-bottom:20px;">
      <h3>${escapeHtml(r.nome)}</h3>
      <p class="small-muted">${escapeHtml(r.descrizione || "")}</p>
      <p><strong>Resa base:</strong> ${r.pezzi_base ?? "-"}</p>
    </div>

    <div class="azienda-card" style="margin-bottom:20px;">
      <h4>Ingredienti</h4>
      ${
        ingredienti.length
          ? ingredienti.map(i => `
            <div style="display:flex; justify-content:space-between;">
              <span>${escapeHtml(i.nome_prodotto)}</span>
              <span>${i.quantita} ${escapeHtml(i.unita_misura)}</span>
            </div>
          `).join("")
          : `<div class="small-muted">Nessun ingrediente</div>`
      }
    </div>

    <div class="azienda-card" style="margin-bottom:20px;">
      <h4>Preparazione</h4>
      ${
        fasi.length
          ? fasi.map(f => `
            <div style="margin-bottom:8px;">
              <strong>${f.ordine}. ${escapeHtml(f.nome_fase)}</strong>
              <div class="small-muted">
                ${escapeHtml(f.tipo_fase)} · ${f.durata_min} min
              </div>
            </div>
          `).join("")
          : `<div class="small-muted">Nessuna fase registrata</div>`
      }
    </div>

    <div style="text-align:right;">
      <button class="app-button gray"
        onclick="window.location.hash='#/ricettario/modifica/${r.id}'">
        Modifica
      </button>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
