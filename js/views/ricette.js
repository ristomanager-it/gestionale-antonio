// ============================================================
// VIEW RICETTE - COMPLETA
// Compatibile con router modulare
// ============================================================

let ricettaCorrenteId = null;
let ricetteCache = [];

export async function render(app) {
  app.innerHTML = `
    <section class="view">
      <div class="card">

        <h2>🍽️ Ricette</h2>

        <div class="ricette-layout">

          <div class="ricette-lista">
            <h3>Ricettario</h3>
            <div id="ricette-list"></div>
            <button id="btn-nuova-ricetta" class="app-button gray">
              + Nuova Ricetta
            </button>
          </div>

          <div class="ricette-editor">
            <h3 id="editor-title">Nuova Ricetta</h3>

            <label>
              Nome
              <input id="ricetta-nome" class="input-pill">
            </label>

            <label>
              Descrizione
              <textarea id="ricetta-descrizione" class="input-pill"></textarea>
            </label>

            <h4>Ingredienti</h4>
            <div id="ingredienti-container"></div>
            <button id="btn-add-ingrediente" class="app-button tiny gray">
              + Ingrediente
            </button>

            <div style="margin-top:20px;">
              <button id="btn-salva-ricetta" class="app-button green">
                💾 Salva
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  `;

  bindEventi();
  await caricaRicette();
}

// ============================================================
// EVENTI
// ============================================================

function bindEventi() {
  document
    .getElementById("btn-nuova-ricetta")
    ?.addEventListener("click", nuovaRicetta);

  document
    .getElementById("btn-add-ingrediente")
    ?.addEventListener("click", creaRigaIngrediente);

  document
    .getElementById("btn-salva-ricetta")
    ?.addEventListener("click", salvaRicetta);
}

// ============================================================
// RICETTE LISTA
// ============================================================

async function caricaRicette() {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome")
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  ricetteCache = data || [];
  renderListaRicette();
}

function renderListaRicette() {
  const box = document.getElementById("ricette-list");
  if (!box) return;

  box.innerHTML = "";

  ricetteCache.forEach(r => {
    const div = document.createElement("div");
    div.className = "ricetta-item";
    div.textContent = r.nome;
    div.onclick = () => caricaRicettaInEditor(r.id);
    box.appendChild(div);
  });
}

// ============================================================
// NUOVA RICETTA
// ============================================================

function nuovaRicetta() {
  ricettaCorrenteId = null;
  document.getElementById("editor-title").innerText = "Nuova Ricetta";
  document.getElementById("ricetta-nome").value = "";
  document.getElementById("ricetta-descrizione").value = "";
  document.getElementById("ingredienti-container").innerHTML = "";
  creaRigaIngrediente();
}

// ============================================================
// CARICAMENTO RICETTA
// ============================================================

async function caricaRicettaInEditor(id) {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return;

  ricettaCorrenteId = id;

  document.getElementById("editor-title").innerText = "Modifica Ricetta";
  document.getElementById("ricetta-nome").value = data.nome || "";
  document.getElementById("ricetta-descrizione").value = data.descrizione || "";

  await caricaIngredienti(id);
}

async function caricaIngredienti(ricettaId) {
  const supabase = window.supabaseClient;

  const { data } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", ricettaId);

  const container = document.getElementById("ingredienti-container");
  container.innerHTML = "";

  (data || []).forEach(i => creaRigaIngrediente(i));
}

// ============================================================
// INGREDIENTI
// ============================================================

function creaRigaIngrediente(initial = {}) {
  const container = document.getElementById("ingredienti-container");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "ingrediente-row";

  row.innerHTML = `
    <input class="ing-nome input-pill" placeholder="Ingrediente"
      value="${initial.nome_prodotto || ""}">
    <input class="ing-qta input-pill" type="number" step="0.001"
      placeholder="Q.tà"
      value="${initial.quantita || ""}">
    <input class="ing-um input-pill" placeholder="UM"
      value="${initial.unita_misura || ""}">
    <button class="app-button tiny red">✕</button>
  `;

  row.querySelector("button").onclick = () => row.remove();
  container.appendChild(row);
}

// ============================================================
// SALVATAGGIO
// ============================================================

async function salvaRicetta() {
  const supabase = window.supabaseClient;

  const nome = document.getElementById("ricetta-nome").value.trim();
  const descrizione = document.getElementById("ricetta-descrizione").value;

  if (!nome) {
    alert("Nome obbligatorio");
    return;
  }

  let ricetta;

  if (ricettaCorrenteId) {
    const { data, error } = await supabase
      .from("ricette")
      .update({ nome, descrizione })
      .eq("id", ricettaCorrenteId)
      .select()
      .single();

    if (error) return alert("Errore update");
    ricetta = data;
  } else {
    const { data, error } = await supabase
      .from("ricette")
      .insert({ nome, descrizione })
      .select()
      .single();

    if (error) return alert("Errore insert");
    ricetta = data;
    ricettaCorrenteId = ricetta.id;
  }

  await salvaIngredienti(ricetta.id);

  alert("Ricetta salvata ✔️");
  await caricaRicette();
}

// ============================================================
// SALVA INGREDIENTI
// ============================================================

async function salvaIngredienti(ricettaId) {
  const supabase = window.supabaseClient;

  await supabase
    .from("ricetta_ingredienti")
    .delete()
    .eq("ricetta_id", ricettaId);

  const rows = document.querySelectorAll(".ingrediente-row");

  const payload = [];

  rows.forEach(r => {
    const nome = r.querySelector(".ing-nome").value.trim();
    const qta = parseFloat(r.querySelector(".ing-qta").value);
    const um = r.querySelector(".ing-um").value.trim();

    if (!nome || !qta || !um) return;

    payload.push({
      ricetta_id: ricettaId,
      nome_prodotto: nome,
      quantita: qta,
      unita_misura: um
    });
  });

  if (payload.length) {
    await supabase.from("ricetta_ingredienti").insert(payload);
  }
}
