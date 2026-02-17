// js/views/crea-ricetta.js
// ============================================================
// CREA / MODIFICA RICETTA – VERSIONE DEFINITIVA STABILE
// ============================================================

let ricettaId = null;
let prodottiCache = [];
let prodottiById = new Map();

export async function render(app) {
  ricettaId = window.routeParams?.id
    ? String(window.routeParams.id)
    : null;

  if (!window.state?.azienda?.id) {
    app.innerHTML = `
      <section class="view">
        <h3>Nessuna azienda attiva</h3>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="view">

      <div class="page-topbar">
        <button class="app-button small gray"
          onclick="window.location.hash='#/produzione'">
          ← Centro Produzione
        </button>
        <h2>${ricettaId ? "✏️ Modifica Ricetta" : "🆕 Crea Ricetta"}</h2>
      </div>

      <div class="form-stack">

        <label>
          Nome ricetta *
          <input id="r-nome" class="input-pill" />
        </label>

        <label>
          Prodotto output *
          <input id="r-output-search"
            class="input-pill"
            autocomplete="off" />
          <input id="r-output-id" type="hidden" />
        </label>
        <div id="r-output-suggest" class="suggest-list"></div>

      </div>

      <hr style="margin:20px 0;">

      <h3>Ingredienti</h3>
      <div id="ingredienti-container"></div>

      <button id="btn-add-ing"
        class="app-button small gray"
        type="button">
        + Aggiungi ingrediente
      </button>

      <hr style="margin:20px 0;">

      <button id="btn-salva"
        class="app-button green"
        type="button">
        💾 Salva Ricetta
      </button>

    </section>
  `;

  // 🔥 PRIMA carico prodotti
  await loadProdotti();

  // 🔥 POI inizializzo UI
  bindUI();

  if (ricettaId) {
    await caricaRicetta(ricettaId);
  } else {
    aggiungiIngrediente();
  }
}

/* ============================================================
   LOAD PRODOTTI
============================================================ */
async function loadProdotti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, descrizione, um")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("descrizione");

  if (error) {
    console.error(error);
    prodottiCache = [];
    prodottiById = new Map();
    return;
  }

  prodottiCache = data || [];
  prodottiById = new Map(
    prodottiCache.map(p => [String(p.id), p])
  );

  // Autocomplete prodotto output
  setupAutocomplete(
    document.getElementById("r-output-search"),
    document.getElementById("r-output-id"),
    document.getElementById("r-output-suggest")
  );
}

/* ============================================================
   AUTOCOMPLETE UNIVERSALE
============================================================ */
function setupAutocomplete(input, hidden, suggestBox) {
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    hidden.value = "";
    suggestBox.innerHTML = "";

    if (q.length < 2) return;

    const risultati = prodottiCache
      .filter(p =>
        (p.descrizione || "")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 10);

    risultati.forEach(p => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = p.descrizione;

      div.onclick = () => {
        input.value = p.descrizione;
        hidden.value = p.id;
        suggestBox.innerHTML = "";
      };

      suggestBox.appendChild(div);
    });
  });
}

/* ============================================================
   INGREDIENTI
============================================================ */
function aggiungiIngrediente(initial = {}) {
  const container =
    document.getElementById("ingredienti-container");

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <div class="editor-grid-2">
      <div>
        <input class="ing-search input-pill"
          placeholder="Ingrediente..."
          autocomplete="off"
          value="${initial.nome_prodotto || ""}" />
        <input class="ing-id"
          type="hidden"
          value="${initial.prodotto_id || ""}" />
        <div class="suggest-list ing-suggest"></div>
      </div>

      <div>
        <input class="ing-qta input-pill"
          type="number"
          step="0.001"
          placeholder="Quantità"
          value="${initial.quantita || ""}" />
      </div>
    </div>

    <div style="margin-top:6px;">
      <button class="app-button tiny red"
        type="button">
        ✕
      </button>
    </div>
  `;

  row.querySelector("button").onclick =
    () => row.remove();

  container.appendChild(row);

  setupAutocomplete(
    row.querySelector(".ing-search"),
    row.querySelector(".ing-id"),
    row.querySelector(".ing-suggest")
  );
}

/* ============================================================
   SALVATAGGIO
============================================================ */
async function salvaTutto() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const nome =
    document.getElementById("r-nome").value.trim();

  const prodotto_output_id =
    document.getElementById("r-output-id").value;

  if (!nome)
    return alert("Nome obbligatorio");

  if (!prodotto_output_id)
    return alert("Seleziona prodotto output");

  let savedId = ricettaId;

  if (ricettaId) {
    await supabase
      .from("ricette")
      .update({
        nome,
        prodotto_output_id,
        azienda_id: aziendaId
      })
      .eq("id", ricettaId);
  } else {
    const { data } = await supabase
      .from("ricette")
      .insert({
        nome,
        prodotto_output_id,
        azienda_id: aziendaId,
        attivo: true
      })
      .select("id")
      .single();

    savedId = data.id;
  }

  const ingredienti = [];

  document
    .querySelectorAll("#ingredienti-container .azienda-card")
    .forEach(r => {
      const pid =
        r.querySelector(".ing-id").value;

      const qta =
        parseFloat(
          r.querySelector(".ing-qta").value
        );

      if (pid && qta > 0) {
        ingredienti.push({
          ricetta_id: savedId,
          prodotto_id: pid,
          quantita: qta
        });
      }
    });

  await supabase
    .from("ricetta_ingredienti")
    .delete()
    .eq("ricetta_id", savedId);

  if (ingredienti.length) {
    await supabase
      .from("ricetta_ingredienti")
      .insert(ingredienti);
  }

  alert("Ricetta salvata ✔️");
  window.location.hash = "#/ricettario";
}

/* ============================================================
   BIND UI
============================================================ */
function bindUI() {
  document
    .getElementById("btn-add-ing")
    .addEventListener("click",
      () => aggiungiIngrediente());

  document
    .getElementById("btn-salva")
    .addEventListener("click",
      salvaTutto);
}
