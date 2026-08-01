// js/views/menu-engineering.js
// MENU ENGINEERING — versione unica (ex Menu Engineering + Menu Intelligence).
// Fonte: vw_menu_engineering (Kasavana-Smith + percezione prezzo).
// Assi normalizzati sulle soglie di categoria (1 = soglia), così antipasti,
// primi e dolci convivono sullo stesso grafico:
//   X = margine unitario / margine medio della categoria
//   Y = quota vendite / soglia popolarità della categoria
// Bolla proporzionale al fatturato, con separazione automatica per non
// sovrapporsi. Layout adattato al telefono.

import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

let aziendaId = null;
let righe = [];
let filtroCategoria = "";
let simRid = null;

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
function isMobile() {
  return window.innerWidth < 700;
}

export async function render(app) {
  aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    app.innerHTML = "<section class='view'><h3>Nessuna azienda attiva</h3></section>";
    return;
  }

  app.innerHTML = createPageLayout({
    title: "📊 Menu Engineering",
    subtitle: "Popolarità × margine, prezzo consigliato e simulatore: cosa spingere, cosa ritoccare, cosa togliere",
    content: `
      <div id="me-sintesi"></div>
      ${createCard({
        title: "Quadranti",
        body: `
          <div id="me-filtri" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;"></div>
          <div id="me-chart"></div>
          <div id="me-dettaglio"></div>
          <div id="me-legenda" style="margin-top:10px; font-size:13px; color:#475569; display:grid; gap:6px;"></div>
        `
      })}
      ${createCard({
        title: "Simulatore prezzo",
        body: `<div id="me-sim"></div>`
      })}
      ${createCard({
        title: "Piatti e prezzi consigliati",
        body: `<div id="me-tabella" style="overflow-x:auto; -webkit-overflow-scrolling:touch;"></div>`
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

  // il grafico si ridisegna se si gira il telefono
  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => { if (document.getElementById("me-chart")) renderChart(); }, 250);
  });
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
  renderSintesi();
  renderChart();
  renderSimulatore();
  renderTabella();
  renderCopertura();
  document.getElementById("me-legenda").innerHTML =
    Object.entries(LABEL).map(([q, l]) =>
      `<div style="display:flex; gap:8px; align-items:flex-start; line-height:1.4;">
         <span style="flex:0 0 12px; width:12px; height:12px; border-radius:50%; background:${COLORI[q]}; margin-top:3px;"></span>
         <span>${l}</span>
       </div>`
    ).join("");
}

/* ── Sintesi in alto: quanto c'è da guadagnare ─────────────────────────── */
function renderSintesi() {
  const cont = document.getElementById("me-sintesi");
  const dati = righeFiltrate().filter(r => r.quadrante !== "SENZA_COSTO");
  if (!dati.length) { cont.innerHTML = ""; return; }

  const conta = q => dati.filter(r => r.quadrante === q).length;
  const recuperabile = dati.reduce((t, r) =>
    t + Math.max(Number(r.margine_spingibile) || 0, 0) * (Number(r.qta_venduta) || 0), 0);

  cont.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-bottom:14px;">
      ${[["STAR", "Star"], ["PLOWHORSE", "Plowhorse"], ["PUZZLE", "Puzzle"], ["DOG", "Dog"]].map(([q, l]) => `
        <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid ${COLORI[q]}; border-radius:12px; padding:12px;">
          <div style="font-size:26px; font-weight:800; color:${COLORI[q]}; line-height:1;">${conta(q)}</div>
          <div style="font-size:12px; color:#64748b; margin-top:3px;">${l}</div>
        </div>`).join("")}
    </div>
    ${recuperabile > 0 ? `
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:14px 16px; margin-bottom:16px;">
        <div style="font-size:15px; color:#15803d; line-height:1.5;">
          Applicando i prezzi consigliati, sui volumi di questo periodo avreste incassato
          <b style="font-size:18px;">${eur(recuperabile)}</b> in più.
        </div>
      </div>` : ""}
  `;
}

/* ── Grafico a quadranti ───────────────────────────────────────────────── */
function renderChart() {
  const cont = document.getElementById("me-chart");
  if (!cont) return;
  const dati = righeFiltrate().filter(r => r.quadrante !== "SENZA_COSTO");

  if (!dati.length) {
    cont.innerHTML = `<div style="color:#94a3b8; padding:20px 0;">Nessun piatto con costo e vendite in questo filtro. Abbina gli articoli cassa e completa gli ingredienti delle ricette.</div>`;
    document.getElementById("me-dettaglio").innerHTML = "";
    return;
  }

  const mob = isMobile();
  const W = mob ? 380 : 700;
  const H = mob ? 460 : 520;
  const M = mob ? { t: 26, r: 12, b: 40, l: 34 } : { t: 30, r: 20, b: 44, l: 46 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const X = v => M.l + (v / 3) * iw;
  const Y = v => M.t + ih - (v / 3) * ih;
  const fBase = mob ? 11 : 12;

  const maxRicavi = Math.max(...dati.map(r => Number(r.ricavi) || 1));
  const rMin = mob ? 6 : 8;
  const rMax = mob ? 16 : 24;

  // posizioni teoriche + raggio
  const punti = dati.map(r => {
    const rx = r.margine_medio_categoria > 0 ? r.margine_unitario / r.margine_medio_categoria : 1;
    const ry = r.soglia_popolarita_perc > 0 ? r.quota_categoria_perc / r.soglia_popolarita_perc : 1;
    const cx = X(Math.max(0, Math.min(rx, 3)));
    const cy = Y(Math.max(0, Math.min(ry, 3)));
    return {
      r, cx, cy, x: cx, y: cy,
      rad: rMin + (rMax - rMin) * Math.sqrt(Number(r.ricavi) / maxRicavi),
    };
  }).sort((a, b) => b.rad - a.rad);

  separaBolle(punti, M, iw, ih);

  const bolle = punti.map(p => {
    const col = COLORI[p.r.quadrante] || "#64748b";
    // se la bolla è stata spostata, un filo la lega al punto vero
    const spostata = Math.hypot(p.x - p.cx, p.y - p.cy) > 2;
    const filo = spostata
      ? `<line x1="${p.cx.toFixed(1)}" y1="${p.cy.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}"
              stroke="${col}" stroke-width="1" stroke-opacity="0.35"/>
         <circle cx="${p.cx.toFixed(1)}" cy="${p.cy.toFixed(1)}" r="1.6" fill="${col}" fill-opacity="0.5"/>`
      : "";
    const etichetta = p.rad >= (mob ? 13 : 17)
      ? `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
              font-size="${mob ? 9 : 10}" fill="#fff" font-weight="700" pointer-events="none"
              >${escapeHtml(String(p.r.nome).slice(0, Math.floor(p.rad / 3)))}</text>`
      : "";
    return `${filo}
      <circle class="me-bolla" data-rid="${p.r.ricetta_id}"
        cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.rad.toFixed(1)}"
        fill="${col}" fill-opacity="0.82" stroke="#fff" stroke-width="1.8"
        style="cursor:pointer;"><title>${escapeHtml(p.r.nome)}</title></circle>
      ${etichetta}`;
  }).join("");

  cont.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; background:#f8fafc; border-radius:12px; touch-action:manipulation;">
      <rect x="${M.l}" y="${M.t}" width="${iw / 3}" height="${ih * 2 / 3}" fill="#2563eb" opacity="0.05"/>
      <rect x="${M.l + iw / 3}" y="${M.t}" width="${iw * 2 / 3}" height="${ih * 2 / 3}" fill="#16a34a" opacity="0.06"/>
      <rect x="${M.l}" y="${M.t + ih * 2 / 3}" width="${iw / 3}" height="${ih / 3}" fill="#dc2626" opacity="0.05"/>
      <rect x="${M.l + iw / 3}" y="${M.t + ih * 2 / 3}" width="${iw * 2 / 3}" height="${ih / 3}" fill="#d97706" opacity="0.06"/>

      <line x1="${X(1)}" y1="${M.t}" x2="${X(1)}" y2="${M.t + ih}" stroke="#94a3b8" stroke-dasharray="5,4"/>
      <line x1="${M.l}" y1="${Y(1)}" x2="${M.l + iw}" y2="${Y(1)}" stroke="#94a3b8" stroke-dasharray="5,4"/>

      <text x="${M.l + 6}" y="${M.t + 14}" font-size="${fBase - 1}" font-weight="800" fill="#2563eb">${mob ? "PLOW." : "PLOWHORSE"}</text>
      <text x="${M.l + iw - 6}" y="${M.t + 14}" font-size="${fBase - 1}" font-weight="800" fill="#16a34a" text-anchor="end">STAR</text>
      <text x="${M.l + 6}" y="${M.t + ih - 6}" font-size="${fBase - 1}" font-weight="800" fill="#dc2626">DOG</text>
      <text x="${M.l + iw - 6}" y="${M.t + ih - 6}" font-size="${fBase - 1}" font-weight="800" fill="#d97706" text-anchor="end">PUZZLE</text>

      <text x="${M.l + iw / 2}" y="${H - 10}" font-size="${fBase}" fill="#475569" text-anchor="middle">${mob ? "Margine →" : "Margine → (1 = margine medio categoria)"}</text>
      <text x="12" y="${M.t + ih / 2}" font-size="${fBase}" fill="#475569" text-anchor="middle" transform="rotate(-90 12 ${M.t + ih / 2})">${mob ? "Popolarità →" : "Popolarità → (1 = soglia categoria)"}</text>

      ${bolle}
    </svg>
  `;

  cont.querySelectorAll(".me-bolla").forEach(c =>
    c.addEventListener("click", () => mostraDettaglio(Number(c.dataset.rid))));

  document.getElementById("me-dettaglio").innerHTML =
    `<div style="font-size:13px; color:#94a3b8; margin-top:8px;">Tocca una bolla per il dettaglio del piatto.</div>`;
}

// Separa le bolle che si accavallano: spinta reciproca, poche iterazioni,
// e ognuna resta comunque vicina alla sua posizione vera.
function separaBolle(punti, M, iw, ih) {
  const N = punti.length;
  if (N < 2) return;
  const GAP = 1.5;
  for (let iter = 0; iter < 90; iter++) {
    let mosso = false;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = punti[i], b = punti[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const min = a.rad + b.rad + GAP;
        if (d === 0) { dx = 0.5; dy = 0.5; d = 0.7; }
        if (d < min) {
          const spinta = (min - d) / 2;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * spinta; a.y -= uy * spinta;
          b.x += ux * spinta; b.y += uy * spinta;
          mosso = true;
        }
      }
    }
    // richiamo verso la posizione reale, così il quadrante resta quello giusto
    for (const p of punti) {
      p.x += (p.cx - p.x) * 0.05;
      p.y += (p.cy - p.y) * 0.05;
      p.x = Math.max(M.l + p.rad, Math.min(M.l + iw - p.rad, p.x));
      p.y = Math.max(M.t + p.rad, Math.min(M.t + ih - p.rad, p.y));
    }
    if (!mosso && iter > 10) break;
  }
}

function mostraDettaglio(rid) {
  const r = righe.find(x => Number(x.ricetta_id) === rid);
  if (!r) return;
  const col = COLORI[r.quadrante] || "#64748b";
  const spinta = Number(r.margine_spingibile) > 0;
  document.getElementById("me-dettaglio").innerHTML = `
    <div style="margin-top:10px; border:2px solid ${col}; border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; align-items:baseline;">
        <div style="font-weight:800; font-size:17px;">${escapeHtml(r.nome)}</div>
        <span style="color:${col}; font-weight:800;">${escapeHtml(r.quadrante)}</span>
      </div>
      <div style="font-size:14px; color:#475569; margin-top:8px; display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:6px 14px;">
        <div>Venduti: <b>${Number(r.qta_venduta).toLocaleString("it-IT")}</b></div>
        <div>Ricavi: <b>${eur(r.ricavi)}</b></div>
        <div>Prezzo medio: <b>${eur(r.prezzo_medio)}</b></div>
        <div>Costo piatto: <b>${eur(r.costo_piatto)}</b>${r.costo_stimato ? ' <span style="color:#d97706; font-size:11px;">(stima)</span>' : ""}</div>
        <div>Margine: <b>${eur(r.margine_unitario)}</b></div>
        <div>Food cost: <b>${r.food_cost_perc ?? "—"}%</b></div>
        <div>Percezione prezzo: <b>${r.indice_percezione_prezzo}</b></div>
        <div>Quota categoria: <b>${r.quota_categoria_perc}%</b></div>
      </div>
      <div style="margin-top:12px; padding:11px; border-radius:8px; background:${spinta ? "#f0fdf4" : "#f8fafc"}; font-size:14px;">
        💡 Prezzo consigliato: <b>${eur(r.prezzo_consigliato)}</b>
        ${spinta ? ` — margine spingibile <b>+${eur(r.margine_spingibile)}</b> a piatto` : " — prezzo già ben posizionato"}
      </div>
      <button class="app-button small" style="margin-top:10px;" onclick="document.getElementById('me-sim').scrollIntoView({behavior:'smooth'})"
        data-sim="${r.ricetta_id}" id="me-vai-sim">🧮 Prova un prezzo diverso</button>
    </div>`;

  const b = document.getElementById("me-vai-sim");
  if (b) b.addEventListener("click", () => { simRid = rid; renderSimulatore(); });
}

/* ── Simulatore prezzo ─────────────────────────────────────────────────── */
function renderSimulatore() {
  const cont = document.getElementById("me-sim");
  if (!cont) return;
  const dati = righeFiltrate().filter(r => r.quadrante !== "SENZA_COSTO");
  if (!dati.length) { cont.innerHTML = `<div style="color:#94a3b8;">Nessun piatto con costo in questo filtro.</div>`; return; }

  if (!simRid || !dati.some(r => Number(r.ricetta_id) === Number(simRid))) {
    simRid = Number(dati[0].ricetta_id);
  }
  const r = dati.find(x => Number(x.ricetta_id) === Number(simRid));
  const prezzoAttuale = Number(r.prezzo_medio) || 0;

  cont.innerHTML = `
    <label style="display:block; font-size:13px; font-weight:700; margin-bottom:5px;">Piatto</label>
    <select id="me-sim-piatto" style="width:100%; padding:11px; border:1.5px solid #d1d5db; border-radius:10px; font-size:16px; box-sizing:border-box;">
      ${dati.map(x => `<option value="${x.ricetta_id}" ${Number(x.ricetta_id) === Number(simRid) ? "selected" : ""}>${escapeHtml(x.nome)}</option>`).join("")}
    </select>

    <label style="display:block; font-size:13px; font-weight:700; margin:14px 0 5px;">Nuovo prezzo di vendita</label>
    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <input id="me-sim-prezzo" type="number" step="0.50" min="0" value="${(Number(r.prezzo_consigliato) || prezzoAttuale).toFixed(2)}"
        style="flex:1; min-width:120px; padding:11px; border:1.5px solid #d1d5db; border-radius:10px; font-size:16px; box-sizing:border-box;">
      <button class="app-button small gray" id="me-sim-reset">Prezzo attuale</button>
    </div>
    <div id="me-sim-out" style="margin-top:14px;"></div>
  `;

  document.getElementById("me-sim-piatto").addEventListener("change", e => {
    simRid = Number(e.target.value); renderSimulatore();
  });
  document.getElementById("me-sim-reset").addEventListener("click", () => {
    document.getElementById("me-sim-prezzo").value = prezzoAttuale.toFixed(2);
    calcolaSim();
  });
  document.getElementById("me-sim-prezzo").addEventListener("input", calcolaSim);
  calcolaSim();
}

function calcolaSim() {
  const r = righe.find(x => Number(x.ricetta_id) === Number(simRid));
  if (!r) return;
  const nuovo = Number(document.getElementById("me-sim-prezzo").value) || 0;
  const costo = Number(r.costo_piatto) || 0;
  const qta = Number(r.qta_venduta) || 0;
  const prezzoAttuale = Number(r.prezzo_medio) || 0;

  const margineNuovo = nuovo - costo;
  const margineAttuale = prezzoAttuale - costo;
  const fcNuovo = nuovo > 0 ? (costo / nuovo) * 100 : 0;
  const delta = (margineNuovo - margineAttuale) * qta;
  const su = delta >= 0;

  document.getElementById("me-sim-out").innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px;">
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
        <div style="font-size:12px; color:#64748b;">Margine a piatto</div>
        <div style="font-size:19px; font-weight:800;">${eur(margineNuovo)}</div>
        <div style="font-size:12px; color:#94a3b8;">ora ${eur(margineAttuale)}</div>
      </div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
        <div style="font-size:12px; color:#64748b;">Food cost</div>
        <div style="font-size:19px; font-weight:800; color:${fcNuovo > 35 ? "#dc2626" : "#16a34a"};">${fcNuovo.toFixed(1)}%</div>
        <div style="font-size:12px; color:#94a3b8;">ora ${r.food_cost_perc ?? "—"}%</div>
      </div>
      <div style="background:${su ? "#f0fdf4" : "#fef2f2"}; border:1px solid ${su ? "#bbf7d0" : "#fecaca"}; border-radius:10px; padding:12px;">
        <div style="font-size:12px; color:#64748b;">Sui ${qta.toLocaleString("it-IT")} venduti</div>
        <div style="font-size:19px; font-weight:800; color:${su ? "#15803d" : "#b91c1c"};">${su ? "+" : ""}${eur(delta)}</div>
        <div style="font-size:12px; color:#94a3b8;">stesso periodo</div>
      </div>
    </div>
    <div style="font-size:12.5px; color:#94a3b8; margin-top:10px; line-height:1.5;">
      Il conto è a volumi invariati: un ritocco importante può cambiare quanto si vende, e quello lo si vede solo provando.
    </div>`;
}

/* ── Tabella ───────────────────────────────────────────────────────────── */
function renderTabella() {
  const cont = document.getElementById("me-tabella");
  const dati = righeFiltrate();
  if (!dati.length) { cont.innerHTML = `<div style="color:#94a3b8;">Nessun dato.</div>`; return; }

  if (isMobile()) {
    cont.innerHTML = dati.map(r => {
      const col = COLORI[r.quadrante] || "#94a3b8";
      const spinta = r.quadrante !== "SENZA_COSTO" && Number(r.margine_spingibile) > 0;
      return `
        <div style="border:1px solid #e2e8f0; border-left:4px solid ${col}; border-radius:10px; padding:12px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:baseline;">
            <div style="font-weight:700; font-size:15px;">${escapeHtml(r.nome)}</div>
            <span style="color:${col}; font-weight:800; font-size:11px; white-space:nowrap;">${r.quadrante === "SENZA_COSTO" ? "manca costo" : escapeHtml(r.quadrante)}</span>
          </div>
          <div style="font-size:12px; color:#94a3b8; margin-bottom:8px;">${escapeHtml(r.categoria)}</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 12px; font-size:13.5px;">
            <div>Venduti: <b>${Number(r.qta_venduta).toLocaleString("it-IT")}</b></div>
            <div>Prezzo: <b>${eur(r.prezzo_medio)}</b></div>
            <div>Margine: <b>${r.margine_unitario !== null ? eur(r.margine_unitario) : "—"}</b></div>
            <div>Consigliato: <b>${r.quadrante !== "SENZA_COSTO" ? eur(r.prezzo_consigliato) : "—"}</b></div>
          </div>
          ${spinta ? `<div style="margin-top:8px; font-size:13.5px; color:#16a34a; font-weight:700;">+${eur(r.margine_spingibile)} a piatto</div>` : ""}
        </div>`;
    }).join("");
    return;
  }

  cont.innerHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:13.5px;">
      <thead>
        <tr style="text-align:left; border-bottom:2px solid #e2e8f0;">
          <th style="padding:7px 4px;">Piatto</th>
          <th style="padding:7px 4px;">Quad.</th>
          <th style="padding:7px 4px; text-align:right;">Venduti</th>
          <th style="padding:7px 4px; text-align:right;">Prezzo</th>
          <th style="padding:7px 4px; text-align:right;">Margine</th>
          <th style="padding:7px 4px; text-align:right;">Consigliato</th>
          <th style="padding:7px 4px; text-align:right;">Spinta</th>
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
            <td style="padding:7px 4px; font-weight:600;">${escapeHtml(r.nome)}<div style="font-size:11px; color:#94a3b8; font-weight:400;">${escapeHtml(r.categoria)}</div></td>
            <td style="padding:7px 4px;">${badge}</td>
            <td style="padding:7px 4px; text-align:right;">${Number(r.qta_venduta).toLocaleString("it-IT")}</td>
            <td style="padding:7px 4px; text-align:right;">${eur(r.prezzo_medio)}</td>
            <td style="padding:7px 4px; text-align:right;">${r.margine_unitario !== null ? eur(r.margine_unitario) : "—"}</td>
            <td style="padding:7px 4px; text-align:right; font-weight:700;">${r.quadrante !== "SENZA_COSTO" ? eur(r.prezzo_consigliato) : "—"}</td>
            <td style="padding:7px 4px; text-align:right; ${Number(r.margine_spingibile) > 0 ? "color:#16a34a; font-weight:700;" : "color:#94a3b8;"}">${r.quadrante !== "SENZA_COSTO" && Number(r.margine_spingibile) > 0 ? "+" + eur(r.margine_spingibile) : "—"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

/* ── Copertura dati ────────────────────────────────────────────────────── */
function renderCopertura() {
  const cont = document.getElementById("me-copertura");
  const tot = righe.length;
  const senzaCosto = righe.filter(r => r.quadrante === "SENZA_COSTO").length;
  const stimati = righe.filter(r => r.costo_stimato && r.quadrante !== "SENZA_COSTO").length;
  const precisi = (tot - senzaCosto) - stimati;
  cont.innerHTML = `
    <div style="display:grid; gap:8px;">
      <div>Piatti sul grafico: <b>${tot - senzaCosto}</b> <span style="color:#94a3b8;">(${precisi} da distinta, ${stimati} da food cost manuale)</span> — senza costo: <b>${senzaCosto}</b></div>
      ${stimati ? `<div style="font-size:13px; color:#d97706;">⚠️ ${stimati} piatti usano il food cost <b>manuale</b> come stima: per un dato preciso completa la distinta ingredienti della ricetta.</div>` : ""}
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
        <button class="app-button secondary small" onclick="window.location.hash='#/abbina-articoli'">🔗 Abbina altri articoli</button>
        <button class="app-button secondary small" onclick="window.location.hash='#/ricettario'">📖 Completa ingredienti ricette</button>
      </div>
      <div style="font-size:12.5px; color:#94a3b8;">Più articoli abbini, più food cost manuali imposti e più distinte completi, più il quadro si completa.</div>
    </div>`;
}
