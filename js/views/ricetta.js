// ============================================================
// VIEW CREA / MODIFICA RICETTA - VERSIONE STRUTTURALE COMPLETA
// - Ingredienti autocompilanti da prodotti
// - Fasi lavorazione
// - Porzionatura
// - Conservazione
// ============================================================

let ricettaId = null;
let prodottiCache = [];

export async function render(app) {

  ricettaId = window.routeParams?.id || null;

  app.innerHTML = `
    <section class="view">

      <div class="page-topbar">
        <div class="page-topbar-left">
          <button class="app-button small gray"
            onclick="window.location.hash='#/ricettario'">
            ← Ricettario
          </button>
          <h2 class="page-title">
            ${ricettaId ? "✏️ Modifica Ricetta" : "🆕 Crea Ricetta"}
          </h2>
        </div>
      </div>

      <!-- DATI BASE -->
      <div class="editor-section open">
        <div class="editor-section-header">
          <strong>Dati Base</strong>
        </div>
        <div class="editor-section-body">

          <label>
            Nome *
            <input id="r-nome" class="input-pill" />
          </label>

          <label>
            Descrizione
            <textarea id="r-descrizione" class="textarea-pill"></textarea>
          </label>

          <label>
            Prodotto Output (magazzino) *
            <input id="r-output-search" class="input-pill" placeholder="Cerca prodotto..." autocomplete="off"/>
            <input type="hidden" id="r-output-id" />
            <div id="r-output-suggest" class="suggest-list"></div>
          </label>

        </div>
      </div>

      <!-- PORZIONATURA -->
      <div class="editor-section">
        <div class="editor-section-header">
          <strong>Porzionatura</strong>
        </div>
        <div class="editor-section-body">

          <label>
            Pezzi base
            <input id="r-pezzi-base" type="number" class="input-pill"/>
          </label>

          <label>
            Peso porzione (g)
            <input id="r-peso-porzione" type="number" class="input-pill"/>
          </label>

        </div>
      </div>

      <!-- CONSERVAZIONE -->
      <div class="editor-section">
        <div class="editor-section-header">
          <strong>Conservazione</strong>
        </div>
        <div class="editor-section-body">

          <label>
            Shelf life (giorni)
            <input id="r-shelf" type="number" class="input-pill"/>
          </label>

          <label>
            Tipo shelf life
            <select id="r-shelf-tipo" class="input-pill">
              <option value="">--</option>
              <option value="fresco">Fresco</option>
              <option value="abbattuto">Abbattuto</option>
              <option value="surgelato">Surgelato</option>
            </select>
          </label>

        </div>
      </div>

      <!-- INGREDIENTI -->
      <div class="editor-section open">
        <div class="editor-section-header">
          <strong>Ingredienti</strong>
        </div>
        <div class="editor-section-body">

          <div id="ingredienti-container"></div>

          <button id="btn-add-ing" class="app-button tiny gray">
            + Ingrediente
          </button>

        </div>
      </div>

      <!-- FASI LAVORAZIONE -->
      <div class="editor-section">
        <div class="editor-section-header">
          <strong>Lavorazione</strong>
        </div>
        <div class="editor-section-body">

          <div id="fasi-container"></div>

          <button id="btn-add-fase" class="app-button tiny gray">
            + Fase
          </button>

        </div>
      </div>

      <div style="margin-top:20px;">
        <button id="btn-salva" class="app-button green">
          💾 Salva Ricetta
        </button>
      </div>

    </section>
  `;

  bindUI();
  await loadProdotti();

  if (ricettaId) {
    await caricaRicetta();
  } else {
    aggiungiIngrediente();
  }
}

/* ============================================================
   PRODOTTI AUTOCOMPLETE
============================================================ */

async function loadProdotti() {
  const supabase = window.supabaseClient;

  const { data } = await supabase
    .from("prodotti")
    .select("id, nome")
    .order("nome");

  prodottiCache = data || [];
}

function setupAutocomplete(input, hiddenInput, suggestBox) {

  input.addEventListener("input", () => {

    const q = input.value.toLowerCase().trim();
    suggestBox.innerHTML = "";

    if (q.length < 2) return;

    const risultati = prodottiCache
      .filter(p => p.nome.toLowerCase().includes(q))
      .slice(0, 8);

    risultati.forEach(p => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = p.nome;
      div.onclick = () => {
        input.value = p.nome;
        hiddenInput.value = p.id;
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
    <input class="ing-nome input-pill" placeholder="Prodotto"
      value="${initial.nome_prodotto || ""}" autocomplete="off"/>
    <input type="hidden" class="ing-id" value="${initial.prodotto_id || ""}" />
    <div class="suggest-list"></div>

    <input class="ing-qta input-pill" type="number"
      placeholder="Quantità"
      value="${initial.quantita || ""}"/>

    <input class="ing-um input-pill"
      placeholder="UM"
      value="${initial.unita_misura || ""}"/>

    <button class="app-button tiny red">✕</button>
  `;

  row.querySelector("button").onclick = () => row.remove();

  container.appendChild(row);

  const input = row.querySelector(".ing-nome");
  const hidden = row.querySelector(".ing-id");
  const suggest = row.querySelector(".suggest-list");

  setupAutocomplete(input, hidden, suggest);
}

/* ============================================================
   FASI
============================================================ */

function aggiungiFase(initial = {}) {

  const container = document.getElementById("fasi-container");

  const row = document.createElement("div");
  row.className = "azienda-card";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <input class="fase-nome input-pill"
      placeholder="Nome fase"
      value="${initial.nome_fase || ""}"/>

    <select class="fase-tipo input-pill">
      <option value="preparazione">Preparazione</option>
      <option value="cottura">Cottura</option>
      <option value="attesa">Attesa</option>
      <option value="raffreddamento">Raffreddamento</option>
    </select>

    <input class="fase-durata input-pill"
      type="number"
      placeholder="Durata min"
      value="${initial.durata_min || ""}"/>

    <input class="fase-lavoro input-pill"
      type="number"
      placeholder="Lavoro umano min"
      value="${initial.lavoro_umano_min || ""}"/>

    <button class="app-button tiny red">✕</button>
  `;

  row.querySelector("button").onclick = () => row.remove();

  container.appendChild(row);
}

/* ============================================================
   SALVATAGGIO
============================================================ */

async function salvaRicetta() {

  const supabase = window.supabaseClient;

  const nome = document.getElementById("r-nome").value.trim();
  const descrizione = document.getElementById("r-descrizione").value;
  const prodotto_output_id = document.getElementById("r-output-id").value;

  if (!nome || !prodotto_output_id) {
    alert("Nome e prodotto output obbligatori");
    return;
  }

  let ricetta;

  if (ricettaId) {
    const { data } = await supabase
      .from("ricette")
      .update({
        nome,
        descrizione,
        prodotto_output_id,
        pezzi_base: toInt("r-pezzi-base"),
        peso_porzionatura_g: toFloat("r-peso-porzione"),
        shelf_life_giorni: toInt("r-shelf"),
        shelf_life_tipo: document.getElementById("r-shelf-tipo").value
      })
      .eq("id", ricettaId)
      .select()
      .single();

    ricetta = data;
  } else {
    const { data } = await supabase
      .from("ricette")
      .insert({
        nome,
        descrizione,
        prodotto_output_id,
        pezzi_base: toInt("r-pezzi-base"),
        peso_porzionatura_g: toFloat("r-peso-porzione"),
        shelf_life_giorni: toInt("r-shelf"),
        shelf_life_tipo: document.getElementById("r-shelf-tipo").value
      })
      .select()
      .single();

    ricetta = data;
  }

  await salvaIngredienti(ricetta.id);
  await salvaFasi(ricetta.id);

  alert("Ricetta salvata ✔️");
  window.location.hash = "#/ricettario";
}

async function salvaIngredienti(id) {

  const supabase = window.supabaseClient;

  await supabase
    .from("ricetta_ingredienti")
    .delete()
    .eq("ricetta_id", id);

  const rows = document.querySelectorAll("#ingredienti-container .azienda-card");

  const payload = [];

  rows.forEach(r => {

    const prodotto_id = r.querySelector(".ing-id").value;
    const nome = r.querySelector(".ing-nome").value.trim();
    const qta = parseFloat(r.querySelector(".ing-qta").value);
    const um = r.querySelector(".ing-um").value.trim();

    if (!prodotto_id || !qta) return;

    payload.push({
      ricetta_id: id,
      prodotto_id,
      nome_prodotto: nome,
      quantita: qta,
      unita_misura: um
    });
  });

  if (payload.length)
    await supabase.from("ricetta_ingredienti").insert(payload);
}

async function salvaFasi(id) {

  const supabase = window.supabaseClient;

  await supabase
    .from("ricette_preparazione_fasi")
    .delete()
    .eq("ricetta_id", id);

  const rows = document.querySelectorAll("#fasi-container .azienda-card");

  const payload = [];

  rows.forEach((r, i) => {

    payload.push({
      ricetta_id: id,
      ordine: i + 1,
      nome_fase: r.querySelector(".fase-nome").value,
      tipo_fase: r.querySelector(".fase-tipo").value,
      durata_min: toIntEl(r, ".fase-durata"),
      lavoro_umano_min: toIntEl(r, ".fase-lavoro")
    });
  });

  if (payload.length)
    await supabase.from("ricette_preparazione_fasi").insert(payload);
}

/* ============================================================
   UTILS
============================================================ */

function bindUI() {
  document.getElementById("btn-add-ing")
    ?.addEventListener("click", () => aggiungiIngrediente());

  document.getElementById("btn-add-fase")
    ?.addEventListener("click", () => aggiungiFase());

  document.getElementById("btn-salva")
    ?.addEventListener("click", salvaRicetta);

  setupAutocomplete(
    document.getElementById("r-output-search"),
    document.getElementById("r-output-id"),
    document.getElementById("r-output-suggest")
  );
}

function toInt(id) {
  const v = parseInt(document.getElementById(id).value);
  return Number.isFinite(v) ? v : null;
}

function toFloat(id) {
  const v = parseFloat(document.getElementById(id).value);
  return Number.isFinite(v) ? v : null;
}

function toIntEl(row, sel) {
  const v = parseInt(row.querySelector(sel).value);
  return Number.isFinite(v) ? v : null;
}
