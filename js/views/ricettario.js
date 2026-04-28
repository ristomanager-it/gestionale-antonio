import { createPageLayout, createCard } from "../utils/pageLayout.js";

let ricetteCache = [];
let categorieCache = [];
let filtroBozza = false;
let filtroInCompletamento = false;
let filtroComplete = false;

export async function render(app) {

  app.innerHTML = createPageLayout({
    title: "📖 Ricettario",
    subtitle: "Gestione e completamento ricette",
    content: `

      ${createCard({
        title: "Navigazione",
        body: `
          <button class="app-button secondary"
            onclick="window.location.hash='#/produzione'">
            ← Centro Produzione
          </button>
        `
      })}

      ${createCard({
        title: "Filtri",
        body: `
          <div style="display:flex; gap:16px; flex-wrap:wrap;">
            <label>
              <input type="checkbox" id="f-bozza">
              Solo bozze 🔴
            </label>
            <label>
              <input type="checkbox" id="f-incomp">
              In completamento 🟡
            </label>
            <label>
              <input type="checkbox" id="f-complete">
              Complete 🟢
            </label>
          </div>
        `
      })}

      ${createCard({
        title: "Ricerca Ricetta",
        body: `
          <div class="input-wrap">
            <input id="ric-search"
              class="input"
              placeholder="Cerca ricetta o crea prodotto..."
              autocomplete="off" />
            <div id="ric-suggest" class="suggest-list"></div>
          </div>
        `
      })}

      ${createCard({
        title: "Dettaglio Ricetta",
        body: `
          <div id="ric-viewer"></div>
        `
      })}

    `
  });

  bindFiltri();
  await loadAll();
  setupAutocomplete();
}

function bindFiltri() {
  document.getElementById("f-bozza")?.addEventListener("change", e => {
    filtroBozza = e.target.checked;
  });

  document.getElementById("f-incomp")?.addEventListener("change", e => {
    filtroInCompletamento = e.target.checked;
  });

  document.getElementById("f-complete")?.addEventListener("change", e => {
    filtroComplete = e.target.checked;
  });
}

async function loadAll() {
  await Promise.all([
    loadRicette(),
    loadCategorie()
  ]);
}

async function loadRicette() {

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    ricetteCache = [];
    return;
  }

  const { data, error } = await supabase
    .from("ricette")
    .select(`
      id,
      nome,
      stato_strutturale,
      generata_automaticamente,
      origine,
      ricette_output (
        peso_finale,
        unita_misura
      )
    `)
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.error(error);
    ricetteCache = [];
    return;
  }

  ricetteCache = (data || []).map(r => {
    const out = Array.isArray(r.ricette_output)
      ? r.ricette_output[0]
      : r.ricette_output;

    return {
      id: r.id,
      nome: r.nome || "",
      stato: r.stato_strutturale || "bozza",
      resa: out?.peso_finale ?? null,
      um: out?.unita_misura ?? null,
      generata: !!r.generata_automaticamente,
      origine: r.origine || null
    };
  });
}

async function loadCategorie() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  const { data } = await supabase
    .from("categorie_vendita")
    .select("id, nome")
    .eq("azienda_id", aziendaId)
    .order("nome");

  categorieCache = data || [];
}

function setupAutocomplete() {

  const input = document.getElementById("ric-search");
  const suggest = document.getElementById("ric-suggest");

  input.addEventListener("input", () => {

    const q = (input.value || "").toLowerCase().trim();
    suggest.innerHTML = "";

    if (q.length < 2) {
      suggest.classList.remove("open");
      return;
    }

    let risultati = ricetteCache
      .filter(r => (r.nome || "").toLowerCase().includes(q));

    if (filtroBozza)
      risultati = risultati.filter(r => r.stato === "bozza");

    if (filtroInCompletamento)
      risultati = risultati.filter(r => r.stato === "in_completamento");

    if (filtroComplete)
      risultati = risultati.filter(r => r.stato === "completa");

    risultati.sort((a, b) => {
      const an = a.nome.toLowerCase();
      const bn = b.nome.toLowerCase();
      const aStarts = an.startsWith(q) ? 0 : 1;
      const bStarts = bn.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return an.localeCompare(bn);
    });

    risultati = risultati.slice(0, 15);

    if (!risultati.length) {
      renderCreateItem(input, suggest);
      return;
    }

    risultati.forEach(r => {
      const div = document.createElement("div");
      div.className = "suggest-item";

      const badge =
        r.stato === "bozza" ? " 🔴" :
        r.stato === "in_completamento" ? " 🟡" :
        " 🟢";

      div.textContent = `${r.nome}${badge}`;

      div.onclick = () => {
        suggest.innerHTML = "";
        suggest.classList.remove("open");
        mostraRicetta(r.id);
      };

      suggest.appendChild(div);
    });

    renderCreateItem(input, suggest);
  });

  function renderCreateItem(input, suggest) {
    const div = document.createElement("div");
    div.className = "suggest-item create-new";

    div.textContent = `+ Crea prodotto "${input.value.trim()}"`;

    div.onclick = () => openQuickModal(input.value.trim());

    suggest.appendChild(div);
    suggest.classList.add("open");
  }
}

function openQuickModal(nome) {

  const modal = document.createElement("div");
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-box">

      <h3>Nuovo prodotto</h3>

      <label>Nome</label>
      <input id="qp-nome" class="input" value="${escapeHtml(nome)}">

      <label>Categoria</label>
      <select id="qp-categoria" class="input">
        <option value="">Seleziona</option>
        ${categorieCache.map(c => `
          <option value="${c.id}">${escapeHtml(c.nome)}</option>
        `).join("")}
      </select>

      <div style="margin-top:12px; display:flex; gap:8px;">
        <button id="qp-save" class="app-button primary">Salva</button>
        <button id="qp-close" class="app-button">Annulla</button>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#qp-close").onclick = () => modal.remove();

  modal.querySelector("#qp-save").onclick = async () => {

    const nomeVal = modal.querySelector("#qp-nome").value.trim();
    const categoriaId = modal.querySelector("#qp-categoria").value;

    if (!nomeVal || !categoriaId) {
      alert("Compila nome e categoria");
      return;
    }

    const supabase = window.supabaseClient;
    const azienda_id = window.state?.azienda?.id;

    const { data: prodotto, error } = await supabase
      .from("prodotti_vendita")
      .insert({
        azienda_id,
        nome: nomeVal,
        categoria_vendita_id: categoriaId,
        stato: "bozza",
        attivo: true
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Errore creazione prodotto");
      return;
    }

    // crea ricetta minima
    await supabase.from("ricette").insert({
      azienda_id,
      nome: nomeVal,
      stato_strutturale: "bozza",
      generata_automaticamente: true,
      origine: "prodotto",
      prodotto_vendita_id: prodotto.id,
      attivo: true
    });

    modal.remove();
    alert("Prodotto creato. Completa la ricetta dal ricettario.");
  };
}

async function mostraRicetta(id) {

  const supabase = window.supabaseClient;

  const [
    ricettaRes,
    ingredientiRes,
    fasiRes
  ] = await Promise.all([

    supabase
      .from("ricette")
      .select("*")
      .eq("id", id)
      .single(),

    supabase
      .from("ricetta_ingredienti")
      .select("*")
      .eq("ricetta_id", id),

    supabase
      .from("ricette_preparazione_fasi")
      .select("*")
      .eq("ricetta_id", id)
      .order("ordine")

  ]);

  const ricetta = ricettaRes.data;
  const ingredienti = ingredientiRes.data || [];
  const fasi = fasiRes.data || [];

  const viewer = document.getElementById("ric-viewer");

  const stato = ricetta.stato_strutturale || "bozza";

  viewer.innerHTML = `
    <div>
      <h3>${escapeHtml(ricetta.nome)}</h3>
      <p>Stato: ${stato}</p>

      <h4>Ingredienti</h4>
      <ul>
        ${ingredienti.map(i =>
          `<li>${escapeHtml(i.nome_prodotto)} — ${i.quantita}</li>`
        ).join("")}
      </ul>

      <button class="app-button"
        onclick="window.location.hash='#/creaRicetta?id=${id}'">
        ✏️ Completa
      </button>
    </div>
  `;
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
