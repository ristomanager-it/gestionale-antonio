import { createPageLayout, createCard } from "../utils/pageLayout.js";

let ricetteCache = [];
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
              placeholder="Cerca ricetta..."
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
  await loadRicette();
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
      suggest.classList.remove("open");
      return;
    }

    risultati.forEach(r => {

      const div = document.createElement("div");
      div.className = "suggest-item";

      const resaTxt = (r.resa != null)
        ? ` — ${r.resa} ${r.um || ""}`
        : "";

      const badge =
        r.stato === "bozza" ? " 🔴" :
        r.stato === "in_completamento" ? " 🟡" :
        " 🟢";

      const badgeGen = r.generata ? " ⚙️" : "";

      div.textContent = `${r.nome}${resaTxt}${badge}${badgeGen}`;

      div.onclick = () => {
        suggest.innerHTML = "";
        suggest.classList.remove("open");
        mostraRicetta(r.id);
      };

      suggest.appendChild(div);
    });

    suggest.classList.add("open");
  });

  document.addEventListener("click", (e) => {
    const wrap = input.closest(".input-wrap");
    if (!wrap) return;
    if (!wrap.contains(e.target)) {
      suggest.classList.remove("open");
    }
  });
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

  const bannerStato =
    stato === "bozza"
      ? `<div style="background:#ffe5e5;padding:8px;border-radius:6px;margin-bottom:10px;">
           🔴 Ricetta in bozza – da completare
         </div>`
      : stato === "in_completamento"
      ? `<div style="background:#fff6d6;padding:8px;border-radius:6px;margin-bottom:10px;">
           🟡 Ricetta in completamento
         </div>`
      : `<div style="background:#e6fffa;padding:8px;border-radius:6px;margin-bottom:10px;">
           🟢 Ricetta completa
         </div>`;

  const bannerOrigine = ricetta.generata_automaticamente
    ? `<div style="background:#eef2ff;padding:8px;border-radius:6px;margin-bottom:10px;">
         ⚙️ Ricetta generata automaticamente (${escapeHtml(ricetta.origine || "sistema")})
       </div>`
    : "";

  viewer.innerHTML = `

    <div>

      ${bannerStato}
      ${bannerOrigine}

      <h3>${escapeHtml(ricetta.nome)}</h3>

      ${ricetta.descrizione ? `
        <div class="page-subtitle" style="margin-bottom:12px;">
          ${escapeHtml(ricetta.descrizione)}
        </div>
      ` : ""}

      ${ricetta.note_procedimento ? `
        <div style="margin-bottom:14px;">
          <strong>Procedimento:</strong><br>
          ${escapeHtml(ricetta.note_procedimento)}
        </div>
      ` : ""}

      <h4>Ingredienti</h4>
      <ul>
        ${ingredienti.map(i =>
          `<li>${escapeHtml(i.nome_prodotto)} — ${i.quantita} ${i.unita_misura}</li>`
        ).join("")}
      </ul>

      ${fasi.length ? `
        <h4 style="margin-top:18px;">Fasi</h4>
        <ol>
          ${fasi.map(f =>
            `<li>${escapeHtml(f.nome_fase)}</li>`
          ).join("")}
        </ol>
      ` : ""}

      <div style="margin-top:18px;">
        <button class="app-button"
          onclick="window.location.hash='#/creaRicetta?id=${id}'">
          ✏️ Completa / Modifica
        </button>
      </div>

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
