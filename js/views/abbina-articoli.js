// js/views/abbina-articoli.js
// Abbinamento articoli cassa (prodotti venduti) → ricette del ricettario.
// Serve al menu engineering: senza questo ponte niente margini per piatto.
// Suggerimento fuzzy client-side, conferma con un tap, salva prodotti.ricetta_id.

import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

let aziendaId = null;
let ricette = [];
let articoli = [];

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["di", "al", "alla", "alle", "allo", "con", "e", "la", "il", "le", "lo", "in", "del", "della", "da"]);

function tokens(s) {
  return norm(s).split(" ").filter(t => t.length > 1 && !STOPWORDS.has(t));
}

// Score 0-100: overlap di token + bonus prefisso/inclusione
function fuzzyScore(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  let hit = 0;
  for (const t of ta) {
    if (tb.includes(t)) { hit += 1; continue; }
    if (tb.some(x => x.startsWith(t) || t.startsWith(x))) hit += 0.7;
  }
  let score = (hit / Math.max(ta.length, 1)) * 80;
  if (nb.includes(na) || na.includes(nb)) score += 20;
  return Math.min(100, Math.round(score));
}

function migliorRicetta(nomeArticolo) {
  let best = null, bestScore = 0;
  for (const r of ricette) {
    const s = fuzzyScore(nomeArticolo, r.nome);
    if (s > bestScore) { bestScore = s; best = r; }
  }
  return { ricetta: best, score: bestScore };
}

export async function render(app) {
  aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    app.innerHTML = "<section class='view'><h3>Nessuna azienda attiva</h3></section>";
    return;
  }

  app.innerHTML = createPageLayout({
    title: "Abbina Articoli → Ricette",
    subtitle: "Collega gli articoli venduti in cassa alle ricette per margini e menu engineering",
    content: `
      ${createCard({
        title: "Avanzamento",
        body: `<div id="abbina-progress" style="font-weight:700;">Caricamento…</div>`
      })}
      <div id="abbina-lista"></div>
    `
  });

  const [ricRes, artRes] = await Promise.all([
    supabase.from("ricette").select("id, nome").eq("azienda_id", aziendaId).order("nome"),
    supabase.rpc("articoli_venduti_da_abbinare", { p_azienda_id: aziendaId })
  ]);

  ricette = ricRes.data || [];
  articoli = artRes.data || [];

  if (artRes.error) {
    document.getElementById("abbina-lista").innerHTML =
      `<div class="card" style="padding:16px;color:#b91c1c;">Errore caricamento articoli: ${escapeHtml(artRes.error.message)}</div>`;
    return;
  }

  renderLista();
}

function renderLista() {
  const cont = document.getElementById("abbina-lista");
  const daFare = articoli.filter(a => !a.ricetta_id && !a._skip);
  const fatti = articoli.length - daFare.length;

  const prog = document.getElementById("abbina-progress");
  if (prog) prog.innerText = `${fatti} / ${articoli.length} abbinati`;

  if (!articoli.length) {
    cont.innerHTML = `<div class="card" style="padding:16px;">Nessun articolo venduto trovato.</div>`;
    return;
  }

  cont.innerHTML = articoli.map((a, i) => {
    const sugg = a._sugg || (a._sugg = migliorRicetta(a.nome));
    const abbinato = !!a.ricetta_id;
    const nomeRicettaAbbinata = abbinato
      ? (ricette.find(r => r.id === a.ricetta_id)?.nome || `Ricetta ${a.ricetta_id}`)
      : null;

    return `
    <div class="card" style="padding:14px; margin-bottom:10px; ${abbinato ? "opacity:.65;" : ""}" data-idx="${i}">
      <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; align-items:baseline;">
        <div>
          <div style="font-weight:800; font-size:16px;">${escapeHtml(a.nome)}</div>
          <div style="font-size:12px; color:#64748b;">${Number(a.qta_venduta).toLocaleString("it-IT")} pz venduti — € ${Number(a.ricavi).toLocaleString("it-IT", {minimumFractionDigits:0, maximumFractionDigits:0})}</div>
        </div>
        ${abbinato ? `<span style="font-size:13px; color:#16a34a; font-weight:700;">✅ ${escapeHtml(nomeRicettaAbbinata)}</span>` : ""}
      </div>

      ${abbinato ? `
        <div style="margin-top:8px;">
          <button class="app-button gray small btn-scollega" data-idx="${i}" type="button">Scollega</button>
        </div>
      ` : `
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
          ${sugg.ricetta && sugg.score >= 40 ? `
            <button class="app-button small btn-conferma" data-idx="${i}" data-rid="${sugg.ricetta.id}" type="button"
              style="text-align:left;">
              ✓ ${escapeHtml(sugg.ricetta.nome)} <span style="opacity:.7;">(match ${sugg.score}%)</span>
            </button>
          ` : `<div style="font-size:13px; color:#94a3b8;">Nessun suggerimento affidabile</div>`}
          <div style="display:flex; gap:8px;">
            <select class="input sel-ricetta" data-idx="${i}" style="flex:1; min-width:0;">
              <option value="">— scegli ricetta —</option>
              ${ricette.map(r => `<option value="${r.id}">${escapeHtml(r.nome)}</option>`).join("")}
            </select>
            <button class="app-button secondary small btn-salva-sel" data-idx="${i}" type="button">Salva</button>
          </div>
          <button class="app-button gray small btn-skip" data-idx="${i}" type="button" style="align-self:flex-start;">Non è una ricetta (salta)</button>
        </div>
      `}
    </div>`;
  }).join("");

  cont.querySelectorAll(".btn-conferma").forEach(b =>
    b.addEventListener("click", () => salvaAbbinamento(Number(b.dataset.idx), Number(b.dataset.rid))));
  cont.querySelectorAll(".btn-salva-sel").forEach(b =>
    b.addEventListener("click", () => {
      const idx = Number(b.dataset.idx);
      const sel = cont.querySelector(`.sel-ricetta[data-idx="${idx}"]`);
      const rid = Number(sel?.value || 0);
      if (!rid) return alert("Scegli una ricetta dal menu.");
      salvaAbbinamento(idx, rid);
    }));
  cont.querySelectorAll(".btn-scollega").forEach(b =>
    b.addEventListener("click", () => salvaAbbinamento(Number(b.dataset.idx), null)));
  cont.querySelectorAll(".btn-skip").forEach(b =>
    b.addEventListener("click", () => { articoli[Number(b.dataset.idx)]._skip = true; renderLista(); }));
}

async function salvaAbbinamento(idx, ricettaId) {
  const art = articoli[idx];
  if (!art) return;

  const { error } = await supabase
    .from("prodotti")
    .update({ ricetta_id: ricettaId })
    .eq("id", art.prodotto_id)
    .eq("azienda_id", aziendaId);

  if (error) {
    console.error(error);
    return alert("Errore salvataggio: " + error.message);
  }
  art.ricetta_id = ricettaId;
  renderLista();
}
