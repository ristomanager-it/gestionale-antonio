// js/views/crea-ricetta.js
// ============================================================
// CREA / MODIFICA RICETTA – VERSIONE DEFINITIVA STABILE
// Coerente con struttura DB reale
// ============================================================

let ricettaId = null;
let prodottiCache = [];
let prodottiMap = new Map();

export async function render(app) {
  ricettaId = window.routeParams?.id
    ? String(window.routeParams.id)
    : null;

  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
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

  await loadProdotti();
  bindUI();

  if (ricettaId) {
    await caricaRicetta();
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
    prodottiMap = new Map();
    return;
  }

  prodottiCache = data || [];
  prodottiMap = new Map(
    prodottiCache.map(p => [String(p.id), p])
  );

  setupAutocomplete(
    document.getElementById("r-output-search"),
    document.getElementById("r-output-id"),
    document.getElementById("r-output-suggest")
  );
}

/* ============================================================
   AUTOCOMPLETE
============================================================ */
function setupAutocomplete(input, hidden, suggestBox) {
  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    hidden.value = "";
    suggestBox.innerHTML = "";

    if (q.length < 2) return;

    const risultati = prodottiCache
      .filter(p =>
        p.descrizione.toLowerCase().includes(q)
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
  const container = document.getElementById("ingredienti-container");

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

  row.querySelector("button").onclick = () => row.remove();
  container.appendChild(row);

  setupAutocomplete(
    row.querySelector(".ing-search"),
    row.querySelector(".ing-id"),
    row.querySelector(".ing-suggest")
  );
}

/* ============================================================
   CARICA RICETTA
============================================================ */
async function caricaRicetta() {
  const supabase = window.supabaseClient;

  const { data } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", ricettaId)
    .single();

  document.getElementById("r-nome").value = data.nome;

  if (data.prodotto_output_id) {
    const p = prodottiMap.get(String(data.prodotto_output_id));
    if (p) {
      document.getElementById("r-output-search").value = p.descrizione;
      document.getElementById("r-output-id").value = p.id;
    }
  }

  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", ricettaId);

  document.getElementById("ingredienti-container").innerHTML = "";
  ingredienti.forEach(i => aggiungiIngrediente(i));
}

/* ============================================================
   SAVE
============================================================ */
async function salvaTutto() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const nome = document.getElementById("r-nome").value.trim();
  const prodotto_output_id = document.getElementById("r-output-id").value;

  if (!nome) return alert("Nome obbligatorio");
  if (!prodotto_output_id) return alert("Seleziona prodotto output");

  let savedId = ricettaId;

  if (!ricettaId) {
    const { data } = await supabase
      .from("ricette")
      .insert({
        nome,
        prodotto_output_id,
        azienda_id: aziendaId,
        attivo: true,
        costo_materia_prima: 0,
        percentuale_sfrido: 0,
        costo_con_sfrido: 0,
        coefficiente_base: 1,
        fattore_porzione_ristorante: 1,
        fattore_porzione_evento: 1,
        prezzo_ristorante: 0,
        prezzo_evento: 0,
        costo_mp_snapshot: 0,
        costo_tot_snapshot: 0,
        stato_costo: 'bozza'
      })
      .select("id")
      .single();

    savedId = data.id;
  } else {
    await supabase
      .from("ricette")
      .update({ nome, prodotto_output_id })
      .eq("id", ricettaId);
  }

  await supabase
    .from("ricetta_ingredienti")
    .delete()
    .eq("ricetta_id", savedId);

  const rows = [];

  document.querySelectorAll("#ingredienti-container .azienda-card")
    .forEach(r => {
      const pid = r.querySelector(".ing-id").value;
      const nomeProd = r.querySelector(".ing-search").value;
      const qta = parseFloat(r.querySelector(".ing-qta").value);

      if (pid && qta > 0) {
        rows.push({
          ricetta_id: savedId,
          prodotto_id: pid,
          nome_prodotto: nomeProd,
          quantita: qta,
          unita_misura: prodottiMap.get(pid)?.um || "pz",
          azienda_id: aziendaId,
          mapping_stato: "ok"
        });
      }
    });

  if (rows.length) {
    await supabase.from("ricetta_ingredienti").insert(rows);
  }

  alert("Ricetta salvata ✔️");
  window.location.hash = "#/ricettario";
}

/* ============================================================
   BIND UI
============================================================ */
function bindUI() {
  document.getElementById("btn-add-ing")
    .addEventListener("click", () => aggiungiIngrediente());

  document.getElementById("btn-salva")
    .addEventListener("click", salvaTutto);
}
