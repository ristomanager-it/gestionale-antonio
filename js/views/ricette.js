// ============================================================
// VIEW RICETTE – Gestionale Antonio / Ristoflow SaaS
// ============================================================

let ricettaCorrenteId = null;
let prodottiCache = [];
let preparazioneFasi = [];

// ------------------------------------------------------------
// INIT VIEW
// ------------------------------------------------------------
export async function initViewRicette() {
  await caricaProdotti();
  bindEventi();
  resetFormRicetta();
}

// ------------------------------------------------------------
// EVENTI
// ------------------------------------------------------------
function bindEventi() {
  const btnAddIng = document.getElementById("btn-add-ingrediente");
  const btnAddFase = document.getElementById("btn-add-fase-preparazione");
  const btnSalva = document.getElementById("btn-salva-ricetta");

  btnAddIng?.addEventListener("click", () => creaRigaIngrediente());
  btnAddFase?.addEventListener("click", () => openModalFase());
  btnSalva?.addEventListener("click", handleSalvaRicetta);
}

// ------------------------------------------------------------
// RESET FORM
// ------------------------------------------------------------
function resetFormRicetta() {
  ricettaCorrenteId = null;
  preparazioneFasi = [];

  document.getElementById("ricetta-nome").value = "";
  document.getElementById("ricetta-descrizione").value = "";
  document.getElementById("ricetta-note").value = "";
  document.getElementById("ricetta-prodotto-output").value = "";
  document.getElementById("ricetta-ingredienti-container").innerHTML = "";
  document.querySelector("#table-preparazione tbody").innerHTML = "";

  renderStato("bozza");
  creaRigaIngrediente();
}

// ------------------------------------------------------------
// STATO BADGE
// ------------------------------------------------------------
function renderStato(stato) {
  const el = document.getElementById("ricetta-stato-badge");
  if (!el) return;

  if (stato === "strutturata")
    el.innerHTML = `<span class="badge green">🟢 Strutturata</span>`;
  else if (stato === "incompleta")
    el.innerHTML = `<span class="badge yellow">🟡 Incompleta</span>`;
  else
    el.innerHTML = `<span class="badge red">🔴 Bozza</span>`;
}

// ------------------------------------------------------------
// CARICAMENTO PRODOTTI (AUTOCOMPLETE)
// ------------------------------------------------------------
async function caricaProdotti() {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  const { data } = await supabase
    .from("prodotti")
    .select("id, descrizione")
    .eq("attivo", true)
    .order("descrizione");

  prodottiCache = data || [];

  const datalist = document.getElementById("ingredienti-suggestions");
  if (!datalist) return;

  datalist.innerHTML = "";

  prodottiCache.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.descrizione;
    datalist.appendChild(opt);
  });
}

// ------------------------------------------------------------
// INGREDIENTI
// ------------------------------------------------------------
function creaRigaIngrediente(initial = {}) {
  const container = document.getElementById("ricetta-ingredienti-container");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "ricetta-ingrediente-row";
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.marginBottom = "6px";

  row.innerHTML = `
    <input class="ingrediente-nome input-pill"
      placeholder="Ingrediente (min 2 lettere)"
      list="ingredienti-suggestions"
      value="${initial.nome_prodotto || ""}">
    <input class="ingrediente-quantita input-pill"
      type="number" step="0.001" min="0"
      placeholder="Q.tà"
      value="${initial.quantita || ""}">
    <input class="ingrediente-unita input-pill"
      placeholder="UM"
      value="${initial.unita_misura || ""}">
    <button type="button" class="app-button tiny red">✕</button>
  `;

  row.querySelector("button").onclick = () => row.remove();
  container.appendChild(row);
}

// ------------------------------------------------------------
// PREPARAZIONE FASI
// ------------------------------------------------------------
function openModalFase() {
  const nome = prompt("Nome fase:");
  if (!nome) return;

  preparazioneFasi.push({
    ordine: preparazioneFasi.length + 1,
    nome_fase: nome,
    tipo_fase: "preparazione",
    durata_min: 0,
    lavoro_umano_min: 0,
  });

  renderFasi();
}

function renderFasi() {
  const tbody = document.querySelector("#table-preparazione tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  let tot = 0;
  let uomo = 0;

  preparazioneFasi.forEach((f, i) => {
    tot += f.durata_min;
    uomo += f.lavoro_umano_min;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${f.nome_fase}</td>
      <td>${f.tipo_fase}</td>
      <td>${f.durata_min}</td>
      <td>${f.lavoro_umano_min}</td>
      <td>-</td>
      <td>-</td>
      <td><button class="app-button tiny red">✕</button></td>
    `;

    tr.querySelector("button").onclick = () => {
      preparazioneFasi.splice(i, 1);
      renderFasi();
    };

    tbody.appendChild(tr);
  });

  document.getElementById("prep-tempo-totale").innerText = `${tot} min`;
  document.getElementById("prep-tempo-uomo").innerText = `${uomo} min`;
}

// ------------------------------------------------------------
// SALVATAGGIO
// ------------------------------------------------------------
async function handleSalvaRicetta() {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  const nome = document.getElementById("ricetta-nome").value.trim();
  if (!nome) return alert("Nome obbligatorio");

  const descrizione = document.getElementById("ricetta-descrizione").value;
  const note = document.getElementById("ricetta-note").value;
  const outputNome = document.getElementById("ricetta-prodotto-output").value;

  const prodottoOutput = prodottiCache.find(
    p => p.descrizione.toLowerCase() === outputNome.toLowerCase()
  );

  const payload = {
    nome,
    descrizione,
    note_procedimento: note,
    prodotto_output_id: prodottoOutput ? prodottoOutput.id : null
  };

  let ricetta;

  if (ricettaCorrenteId) {
    const { data } = await supabase
      .from("ricette")
      .update(payload)
      .eq("id", ricettaCorrenteId)
      .select()
      .single();
    ricetta = data;
  } else {
    const { data } = await supabase
      .from("ricette")
      .insert(payload)
      .select()
      .single();
    ricetta = data;
  }

  if (!ricetta) return alert("Errore salvataggio");

  ricettaCorrenteId = ricetta.id;

  await salvaIngredienti();
  await salvaFasi();

  renderStato(ricetta.stato_strutturale);

  alert("Ricetta salvata ✔️");
}

// ------------------------------------------------------------
// SALVA INGREDIENTI
// ------------------------------------------------------------
async function salvaIngredienti() {
  const supabase = window.supabaseClient;
  if (!ricettaCorrenteId) return;

  await supabase
    .from("ricetta_ingredienti")
    .delete()
    .eq("ricetta_id", ricettaCorrenteId);

  const rows = document.querySelectorAll(".ricetta-ingrediente-row");

  const payload = [];

  rows.forEach(r => {
    const nome = r.querySelector(".ingrediente-nome").value.trim();
    const qta = parseFloat(r.querySelector(".ingrediente-quantita").value);
    const um = r.querySelector(".ingrediente-unita").value.trim();

    if (!nome || !qta) return;

    const prodotto = prodottiCache.find(
      p => p.descrizione.toLowerCase() === nome.toLowerCase()
    );

    payload.push({
      ricetta_id: ricettaCorrenteId,
      prodotto_id: prodotto ? prodotto.id : null,
      nome_prodotto: nome,
      quantita: qta,
      unita_misura: um
    });
  });

  if (payload.length)
    await supabase.from("ricetta_ingredienti").insert(payload);
}

// ------------------------------------------------------------
// SALVA FASI
// ------------------------------------------------------------
async function salvaFasi() {
  const supabase = window.supabaseClient;
  if (!ricettaCorrenteId) return;

  await supabase
    .from("ricette_preparazione_fasi")
    .delete()
    .eq("ricetta_id", ricettaCorrenteId);

  if (!preparazioneFasi.length) return;

  await supabase.from("ricette_preparazione_fasi").insert(
    preparazioneFasi.map(f => ({
      ricetta_id: ricettaCorrenteId,
      ordine: f.ordine,
      nome_fase: f.nome_fase,
      tipo_fase: f.tipo_fase,
      durata_min: f.durata_min,
      lavoro_umano_min: f.lavoro_umano_min
    }))
  );
}
