// js/views/menu-engineering.js
// MENU ENGINEERING — scatter a 4 quadranti + tabella prezzi consigliati.
// Fonte: vw_menu_engineering (Kasavana-Smith + percezione prezzo).
// Assi NORMALIZZATI sulle soglie di categoria (1 = soglia), così antipasti,
// primi e dolci convivono sullo stesso grafico:
//   X = margine unitario / margine medio della categoria
//   Y = quota vendite / soglia popolarità della categoria
// Bolla proporzionale al fatturato. Tap sulla bolla → dettaglio piatto.

import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

let aziendaId = null;
let righe = [];
let filtroCategoria = "";

const COLORI = {
  STAR:      "#16a34a",
  PLOWHORSE: "#2563eb",
  PUZZLE:    "#d97706",
  DOG:       "#dc2626",
};
const LABEL = {
  STAR:      "⭐ Star — tienili e proteggili",
  PLOWHORSE: "🐴 Plowhorse — popolari, margine basso: ritocca prezzo o costo",
  PUZZLE:    "🧩 Puzzle — margine alto, vendono poco: spingili in sala e sui social",
  DOG:       "🐶 Dog — valutare rilancio o uscita dal menu",
};

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
function eur(n) {
  if (n === null || n === undefined) return "—";
  return "€ " + Number(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function render(app) {
  aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    app.innerHTML = "<section class='view'><h3>Nessuna azienda attiva</h3></section>";
    return;
  }

  app.innerHTML = createPageLayout({
    title: "📊 Menu Engineering",
    subtitle: "Valutazione piatti: popolarità × margine, percezione prezzo, prezzo consigliato",
    content: `
      ${createCard({
        title: "Quadranti",
        body: `
          <div id="me-filtri" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;"></div>
          <div id="me-chart"></div>
          <div id="me-dettaglio"></div>
          <div id="me-legenda" style="margin-top:10px; font-size:12px; color:#475569; display:grid; gap:4px;"></div>
        `
      })}
      ${createCard({
        title: "Piatti e prezzi consigliati",
        body: `<div id="me-tabella" style="overflow-x:auto;"></div>`
      })}
      ${createCard({
        title: "Copertura dati",
        body: `<div id="me-copertura" style="font-size:14px;"></div>`
      })}
    `
  });

  const { data, error } = await supabase
    .from("vw_menu_engineering")
    .select("*")
    .eq("azienda_id", aziendaId)
    .order("ricavi", { ascending: false });

  if (error) {
    document.getElementById("me-chart").innerHTML =
      `<div style="color:#b91c1c;">Errore caricamento: ${escapeHtml(error.message)}</div>`;
    return;
  }

  righe = data || [];
  renderFiltri();
  renderTutto();
}

function categorie() {
  return [...new Set(righe.map(r => r.categoria))].sort();
}

function righeFiltrate() {
  return filtroCategoria ? righe.filter(r => r.categoria === filtroCategoria) : righe;
}

function renderFiltri() {
  const cont = document.getElementById("me-filtri");
  const cats = categorie();
  cont.innerHTML = [
    `<button class="app-button small ${filtroCategoria ? "gray" : ""}" data-cat="">Tutte</button>`,
    ...cats.map(c =>
      `<button class="app-button small ${filtroCategoria === c ? "" : "gray"}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
  ].join("");
  cont.querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => { filtroCategoria = b.dataset.cat; renderFiltri(); renderTutto(); }));
}

function renderTutto() {
  renderChart();
  renderTabella();
  renderCopertura();
  document.getElementById("me-legenda").innerHTML =
    Object.entries(LABEL).map(([q, l]) =>
      `<div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORI[q]};margin-right:6px;"></span>${l}</div>`
    ).join("");
}

function renderChart() {
  const cont = document.getElementById("me-chart");
  const dati = righeFiltrate().filter(r => r.quadrante !== "SENZA_COSTO");

  if (!dati.length) {
    cont.innerHTML = `<div style="color:#94a3b8; padding:20px 0;">Nessun piatto con costo e vendite in questo filtro. Abbina gli articoli cassa e completa gli ingredienti delle ricette.</div>`;
    document.getElementById("me-dettaglio").innerHTML = "";
    return;
  }

  // rapporti normalizzati (1 = soglia del quadrante)
  const punti = dati.map(r => {
    const rx = r.margine_medio_categoria > 0 ? r.margine_unitario / r.margine_medio_categoria : 1;
    const ry = r.soglia_popolarita_perc > 0 ? r.quota_categoria_perc / r.soglia_popolarita_perc : 1;
    return { r, rx: Math.max(0, Math.min(rx, 3)), ry: Math.max(0, Math.min(ry, 3)) };
  });

  const maxRicavi = Math.max(...dati.map(r => Number(r.ricavi) || 1));
  const W = 700, H = 520, M = { t: 30, r: 20, b: 44, l: 46 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const X = v => M.l + (v / 3) * iw;
  const Y = v => M.t + ih - (v / 3) * ih;

  const bolle = punti
    .sort((a, b) => Number(b.r.ricavi) - Number(a.r.ricavi))
    .map((p, i) => {
      const raggio = 8 + 24 * Math.sqrt(Number(p.r.ricavi) / maxRicavi);
      const col = COLORI[p.r.quadrante] || "#64748b";
      return `
        <circle class="me-bolla" data-rid="${p.r.ricetta_id}"
          cx="${X(p.rx).toFixed(1)}" cy="${Y(p.ry).toFixed(1)}" r="${raggio.toFixed(1)}"
          fill="${col}" fill-opacity="0.75" stroke="#fff" stroke-width="1.5"
          style="cursor:pointer;"/>
        ${raggio > 16 ? `<text x="${X(p.rx).toFixed(1)}" y="${Y(p.ry).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
          font-size="10" fill="#fff" font-weight="700" pointer-events="none">${escapeHtml(String(p.r.nome).slice(0, Math.floor(raggio / 3.2)))}</text>` : ""}`;
    }).join("");

  cont.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; background:#f8fafc; border-radius:12px;">
      <!-- sfondi quadranti -->
      <rect x="${M.l}" y="${M.t}" width="${iw / 3}" height="${ih * 2 / 3}" fill="#2563eb" opacity="0.05"/>
      <rect x="${M.l + iw / 3}" y="${M.t}" width="${iw * 2 / 3}" height="${ih * 2 / 3}" fill="#16a34a" opacity="0.06"/>
      <rect x="${M.l}" y="${M.t + ih * 2 / 3}" width="${iw / 3}" height="${ih / 3}" fill="#dc2626" opacity="0.05"/>
      <rect x="${M.l + iw / 3}" y="${M.t + ih * 2 / 3}" width="${iw * 2 / 3}" height="${ih / 3}" fill="#d97706" opacity="0.06"/>
      <!-- soglie (=1) -->
      <line x1="${X(1)}" y1="${M.t}" x2="${X(1)}" y2="${M.t + ih}" stroke="#94a3b8" stroke-dasharray="5,4"/>
      <line x1="${M.l}" y1="${Y(1)}" x2="${M.l + iw}" y2="${Y(1)}" stroke="#94a3b8" stroke-dasharray="5,4"/>
      <!-- etichette quadranti -->
      <text x="${M.l + 8}" y="${M.t + 16}" font-size="12" font-weight="800" fill="#2563eb">PLOWHORSE</text>
      <text x="${M.l + iw - 8}" y="${M.t + 16}" font-size="12" font-weight="800" fill="#16a34a" text-anchor="end">STAR</text>
      <text x="${M.l + 8}" y="${M.t + ih - 8}" font-size="12" font-weight="800" fill="#dc2626">DOG</text>
      <text x="${M.l + iw - 8}" y="${M.t + ih - 8}" font-size="12" font-weight="800" fill="#d97706" text-anchor="end">PUZZLE</text>
      <!-- assi -->
      <text x="${M.l + iw / 2}" y="${H - 10}" font-size="12" fill="#475569" text-anchor="middle">Margine → (1 = margine medio categoria)</text>
      <text x="14" y="${M.t + ih / 2}" font-size="12" fill="#475569" text-anchor="middle" transform="rotate(-90 14 ${M.t + ih / 2})">Popolarità → (1 = soglia categoria)</text>
      ${bolle}
    </svg>
  `;

  cont.querySelectorAll(".me-bolla").forEach(c =>
    c.addEventListener("click", () => mostraDettaglio(Number(c.dataset.rid))));

  document.getElementById("me-dettaglio").innerHTML =
    `<div style="font-size:12px; color:#94a3b8; margin-top:6px;">Tocca una bolla per il dettaglio del piatto.</div>`;
}

function mostraDettaglio(rid) {
  const r = righe.find(x => Number(x.ricetta_id) === rid);
  if (!r) return;
  const col = COLORI[r.quadrante] || "#64748b";
  const spinta = Number(r.margine_spingibile) > 0;
  document.getElementById("me-dettaglio").innerHTML = `
    <div style="margin-top:10px; border:2px solid ${col}; border-radius:12px; padding:12px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; align-items:baseline;">
        <div style="font-weight:800; font-size:16px;">${escapeHtml(r.nome)}</div>
        <span style="color:${col}; font-weight:800;">${escapeHtml(r.quadrante)}</span>
      </div>
      <div style="font-size:13px; color:#475569; margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:4px 12px;">
        <div>Venduti: <b>${Number(r.qta_venduta).toLocaleString("it-IT")}</b></div>
        <div>Ricavi: <b>${eur(r.ricavi)}</b></div>
        <div>Prezzo medio: <b>${eur(r.prezzo_medio)}</b></div>
        <div>Costo piatto: <b>${eur(r.costo_piatto)}</b></div>
        <div>Margine: <b>${eur(r.margine_unitario)}</b></div>
        <div>Food cost: <b>${r.food_cost_perc ?? "—"}%</b></div>
        <div>Percezione prezzo: <b>${r.indice_percezione_prezzo}</b> <span style="color:#94a3b8;">(1 = media cat.)</span></div>
        <div>Quota categoria: <b>${r.quota_categoria_perc}%</b></div>
      </div>
      <div style="margin-top:10px; padding:10px; border-radius:8px; background:${spinta ? "#f0fdf4" : "#f8fafc"};">
        💡 Prezzo consigliato: <b>${eur(r.prezzo_consigliato)}</b>
        ${spinta ? ` — margine spingibile <b>+${eur(r.margine_spingibile)}</b> a piatto` : " — prezzo già ben posizionato"}
      </div>
    </div>`;
}

function renderTabella() {
  const cont = document.getElementById("me-tabella");
  const dati = righeFiltrate();
  if (!dati.length) { cont.innerHTML = `<div style="color:#94a3b8;">Nessun dato.</div>`; return; }

  cont.innerHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <thead>
        <tr style="text-align:left; border-bottom:2px solid #e2e8f0;">
          <th style="padding:6px 4px;">Piatto</th>
          <th style="padding:6px 4px;">Quad.</th>
          <th style="padding:6px 4px; text-align:right;">Venduti</th>
          <th style="padding:6px 4px; text-align:right;">Prezzo</th>
          <th style="padding:6px 4px; text-align:right;">Margine</th>
          <th style="padding:6px 4px; text-align:right;">Consigliato</th>
          <th style="padding:6px 4px; text-align:right;">Spinta</th>
        </tr>
      </thead>
      <tbody>
        ${dati.map(r => {
          const col = COLORI[r.quadrante] || "#64748b";
          const badge = r.quadrante === "SENZA_COSTO"
            ? `<span style="color:#94a3b8; font-size:11px;">manca costo</span>`
            : `<span style="color:${col}; font-weight:800; font-size:11px;">${escapeHtml(r.quadrante)}</span>`;
          return `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:6px 4px; font-weight:600;">${escapeHtml(r.nome)}<div style="font-size:11px; color:#94a3b8; font-weight:400;">${escapeHtml(r.categoria)}</div></td>
            <td style="padding:6px 4px;">${badge}</td>
            <td style="padding:6px 4px; text-align:right;">${Number(r.qta_venduta).toLocaleString("it-IT")}</td>
            <td style="padding:6px 4px; text-align:right;">${eur(r.prezzo_medio)}</td>
            <td style="padding:6px 4px; text-align:right;">${r.margine_unitario !== null ? eur(r.margine_unitario) : "—"}</td>
            <td style="padding:6px 4px; text-align:right; font-weight:700;">${r.quadrante !== "SENZA_COSTO" ? eur(r.prezzo_consigliato) : "—"}</td>
            <td style="padding:6px 4px; text-align:right; ${Number(r.margine_spingibile) > 0 ? "color:#16a34a; font-weight:700;" : "color:#94a3b8;"}">${r.quadrante !== "SENZA_COSTO" && Number(r.margine_spingibile) > 0 ? "+" + eur(r.margine_spingibile) : "—"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

function renderCopertura() {
  const cont = document.getElementById("me-copertura");
  const tot = righe.length;
  const senzaCosto = righe.filter(r => r.quadrante === "SENZA_COSTO").length;
  cont.innerHTML = `
    <div style="display:grid; gap:6px;">
      <div>Piatti sul grafico: <b>${tot - senzaCosto}</b> — abbinati ma senza costo ricetta: <b>${senzaCosto}</b></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
        <button class="app-button secondary small" onclick="window.location.hash='#/abbina-articoli'">🔗 Abbina altri articoli</button>
        <button class="app-button secondary small" onclick="window.location.hash='#/ricettario'">📖 Completa ingredienti ricette</button>
      </div>
      <div style="font-size:12px; color:#94a3b8;">Più articoli abbini e più ricette hanno la distinta ingredienti, più il quadro si completa.</div>
    </div>`;
}
