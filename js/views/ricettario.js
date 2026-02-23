// js/views/ricettario.js
// ============================================================
// RICETTARIO – Layout standard Ristoflow
// Ricerca autocompilante + Viewer completo
// ============================================================

import { createPageLayout, createCard } from "../utils/pageLayout.js";

let ricetteCache = [];

export async function render(app) {

  app.innerHTML = createPageLayout({
    title: "📖 Ricettario",
    subtitle: "Ricerca e consultazione ricette",
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

  await loadRicette();
  setupAutocomplete();
}

/* ============================================================ */
/* LOAD RICETTE */
/* ============================================================ */

async function loadRicette() {

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    console.warn("Nessuna azienda attiva nel ricettario");
    ricetteCache = [];
    return;
  }

  const { data, error } = await supabase
    .from("ricette")
    .select(`
      id,
      nome,
      stato_strutturale,
      ricette_output (
        peso_finale,
        unita_misura
      )
    `)
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.error("Errore caricamento ricette:", error);
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
      um: out?.unita_misura ?? null
    };
  });
}

/* ============================================================ */
/* AUTOCOMPLETE */
/* ============================================================ */

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

    const risultati = ricetteCache
      .filter(r => (r.nome || "").toLowerCase().includes(q))
      .slice(0, 10);

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

      div.textContent = `${r.nome}${resaTxt}`;

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

/* ============================================================ */
/* VIEWER */
/* ============================================================ */

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

  viewer.innerHTML = `

    <div>

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
          ✏️ Modifica
        </button>
      </div>

    </div>
  `;
}

/* ============================================================ */
/* HELPERS */
/* ============================================================ */

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
