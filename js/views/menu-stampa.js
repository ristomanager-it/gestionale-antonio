// js/views/menu-stampa.js
// MENU STAMPABILE (26/11/2026) — nato dal menu cartaceo della Trattoria dell'Aquila.
// Il ristoratore sceglie, piatto per piatto, cosa SPINGERE (foto grande, riquadro) e cosa è
// della TRADIZIONE (i piatti identitari, sezione a parte con foto). Tony propone i piatti da
// spingere leggendo il Menu Engineering (Puzzle e Star prima di tutto, con foto se c'è).
// Le scelte restano sul piatto (menu_voci.tags: "spingi", "tradizione"; il mare usa il tag
// "pesce" già esistente), così la prossima stampa riparte da lì.
// La stampa si apre in una finestra a parte, A4, pronta per "Stampa o salva PDF".

import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

const ESCLUSE_DEFAULT = /vin|bevand|caff|birr|amar|liquor|distill|bollic|spumant|champ|acqu|bibit/i;
const RX_MARE = /(pesce|\bmare\b|vongol|cozz|calamar|gamber|salmon|spada|tonno|polpo|seppi|alic|baccal|scamp|orata|branzin|acciug|totan|merluz|ostric|crostac|mazzanc|cernia|ricciol|pescespada)/i;
const PESO_Q = { PUZZLE: 3, STAR: 2, PLOWHORSE: 1, DOG: 0 };
const Q_LABEL = { STAR: "⭐ Star", PLOWHORSE: "🐴 Plowhorse", PUZZLE: "🧩 Puzzle", DOG: "🐶 Dog" };

let st = { aziendaId: null, sedi: [], sedeId: null, menus: [], menuId: null, cats: [], voci: [], me: [], escluse: new Set(), nota: "Allergeni: chiedi in sala" };

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function prezzo(v) {
  const p = Number(v.prezzo_override ?? v.prezzo);
  if (!p) return "";
  return "€ " + (Number.isInteger(p) ? String(p) : p.toFixed(2).replace(".", ","));
}
function tags(v) { return Array.isArray(v.tags) ? v.tags : []; }
function ha(v, t) { return tags(v).includes(t); }
function isMare(v) { return ha(v, "pesce") || (!ha(v, "carne") && RX_MARE.test(v.nome || "")); }
function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9àèéìòù]+/g, " ").trim(); }

export async function render(app) {
  st.aziendaId = window.state?.azienda?.id;
  if (!st.aziendaId) { app.innerHTML = "<section class='view'><h3>Nessuna azienda attiva</h3></section>"; return; }

  app.innerHTML = createPageLayout({
    title: "🖨️ Menu stampabile",
    subtitle: "Scegli i piatti da spingere e quelli della tradizione: Ristoflow impagina il menu da stampare",
    content: `
      ${createCard({ title: "1 · Quale menu", body: `<div id="ms-scelta"></div>` })}
      ${createCard({ title: "2 · Cosa spingere e cosa è tradizione", body: `<div id="ms-piatti" style="color:#94a3b8;">Caricamento…</div>` })}
      ${createCard({ title: "3 · Stampa", body: `<div id="ms-stampa"></div>` })}
    `
  });

  const { data: sedi } = await supabase.from("sedi").select("id, nome").eq("azienda_id", st.aziendaId).order("nome");
  st.sedi = sedi || [];
  const attiva = window.state?.sedeAttiva?.id;
  st.sedeId = (st.sedi.find(s => s.id === attiva) || st.sedi[0] || {}).id || null;

  const { data: me } = await supabase.from("vw_menu_engineering")
    .select("nome, ricetta_id, prodotto_vendita_id, quadrante, qta_venduta, margine_unitario")
    .eq("azienda_id", st.aziendaId);
  st.me = me || [];

  await caricaMenus();
  disegnaScelta();
  await caricaVoci();
}

async function caricaMenus() {
  st.menus = [];
  if (!st.sedeId) return;
  const { data: menus } = await supabase.from("menu").select("id, nome").eq("sede_id", st.sedeId).eq("attivo", true).is("sorgente_menu_giorno_sede", null);
  st.menus = menus || [];
  if (!st.menus.length) { st.menuId = null; return; }
  // di default il menu con più piatti (la carta)
  const conteggi = await Promise.all(st.menus.map(m =>
    supabase.from("menu_voci").select("id", { count: "exact", head: true }).eq("menu_id", m.id).then(r => r.count || 0)));
  st.menus.forEach((m, i) => { m.n = conteggi[i]; });
  st.menus.sort((a, b) => b.n - a.n);
  if (!st.menus.find(m => m.id === st.menuId)) st.menuId = st.menus[0].id;
}

function disegnaScelta() {
  const el = document.getElementById("ms-scelta");
  el.innerHTML = `
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <label style="flex:1; min-width:200px; font-size:13px;">Sede<br>
        <select id="ms-sede" class="mb-input" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
          ${st.sedi.map(s => `<option value="${s.id}" ${s.id === st.sedeId ? "selected" : ""}>${esc(s.nome)}</option>`).join("")}
        </select></label>
      <label style="flex:1; min-width:200px; font-size:13px;">Menu<br>
        <select id="ms-menu" class="mb-input" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
          ${st.menus.map(m => `<option value="${m.id}" ${m.id === st.menuId ? "selected" : ""}>${esc(m.nome)} (${m.n} piatti)</option>`).join("") || "<option>Nessun menu attivo</option>"}
        </select></label>
    </div>`;
  document.getElementById("ms-sede").onchange = async e => { st.sedeId = e.target.value; await caricaMenus(); disegnaScelta(); await caricaVoci(); };
  document.getElementById("ms-menu").onchange = async e => { st.menuId = e.target.value; await caricaVoci(); };
}

async function caricaVoci() {
  st.cats = []; st.voci = [];
  if (st.menuId) {
    const [{ data: cats }, { data: voci }] = await Promise.all([
      supabase.from("menu_categorie").select("id, nome, ordine").eq("menu_id", st.menuId).order("ordine"),
      supabase.from("menu_voci").select("id, nome, descrizione, prezzo, prezzo_override, foto_url, categoria_id, ordine, attivo, visibile, tags, ricetta_id, prodotto_vendita_id").eq("menu_id", st.menuId).order("ordine"),
    ]);
    st.cats = cats || [];
    st.voci = (voci || []).filter(v => v.attivo !== false && v.visibile !== false);
  }
  st.escluse = new Set(st.cats.filter(c => ESCLUSE_DEFAULT.test(c.nome)).map(c => c.id));
  st.voci.forEach(v => { v.q = quadrante(v); });
  disegnaPiatti();
  disegnaStampa();
}

function quadrante(v) {
  const r = st.me.find(x => (v.prodotto_vendita_id && x.prodotto_vendita_id === v.prodotto_vendita_id))
    || st.me.find(x => (v.ricetta_id && x.ricetta_id === v.ricetta_id))
    || st.me.find(x => norm(x.nome) === norm(v.nome));
  return r ? r.quadrante : null;
}

function vociCat(catId) { return st.voci.filter(v => v.categoria_id === catId); }

function disegnaPiatti() {
  const el = document.getElementById("ms-piatti");
  if (!st.cats.length) { el.innerHTML = "<div>Nessuna categoria in questo menu.</div>"; return; }
  const btn = (v, t, on, label) =>
    `<button class="ms-tag" data-id="${v.id}" data-tag="${t}" style="border:1px solid ${on ? "#0E5A7A" : "#cbd5e1"}; background:${on ? "#0E5A7A" : "#fff"}; color:${on ? "#fff" : "#334155"}; border-radius:999px; padding:8px 12px; font-size:13px; cursor:pointer; min-height:36px;">${label}</button>`;
  el.innerHTML = `
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
      <button id="ms-tony" class="app-button small">🤖 Proposta di Tony</button>
      <span style="font-size:13px; color:#64748b;">Tony sceglie per ogni categoria i piatti da spingere dal Menu Engineering (prima i Puzzle, poi le Star) e segna il mare. La tradizione la decidi tu.</span>
    </div>
    ${st.cats.map(c => {
      const out = st.escluse.has(c.id);
      const vs = vociCat(c.id);
      return `<div style="border-top:1px solid #e5e7eb; padding:12px 0;">
        <label style="display:flex; align-items:center; gap:8px; font-weight:600; font-size:15px; cursor:pointer;">
          <input type="checkbox" class="ms-cat" data-id="${c.id}" ${out ? "" : "checked"} style="width:18px; height:18px;"> ${esc(c.nome)} <span style="font-weight:400; color:#94a3b8; font-size:13px;">${vs.length} piatti${out ? " · non in stampa" : ""}</span>
        </label>
        ${out ? "" : `<div style="display:grid; gap:8px; margin-top:10px;">${vs.map(v => `
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            ${v.foto_url ? `<img src="${esc(v.foto_url)}" alt="" style="width:44px; height:44px; object-fit:cover; border-radius:6px;">` : `<div title="Senza foto" style="width:44px; height:44px; border-radius:6px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:11px;">no foto</div>`}
            <div style="flex:1; min-width:160px;">
              <div style="font-size:14px; font-weight:600;">${esc(v.nome)} <span style="color:#0E5A7A;">${prezzo(v)}</span></div>
              <div style="font-size:12px; color:#64748b;">${v.q ? Q_LABEL[v.q] || v.q : "senza dati di vendita"}</div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${btn(v, "spingi", ha(v, "spingi"), "⭐ Spingi")}
              ${btn(v, "tradizione", ha(v, "tradizione"), "🏛 Tradizione")}
              ${btn(v, "pesce", isMare(v), "🐟 Mare")}
            </div>
          </div>`).join("")}</div>`}
      </div>`;
    }).join("")}`;

  el.querySelectorAll(".ms-cat").forEach(cb => cb.onchange = () => {
    cb.checked ? st.escluse.delete(cb.dataset.id) : st.escluse.add(cb.dataset.id);
    disegnaPiatti();
  });
  el.querySelectorAll(".ms-tag").forEach(b => b.onclick = async () => {
    const v = st.voci.find(x => x.id === b.dataset.id);
    const t = b.dataset.tag;
    let nuovi = tags(v).filter(x => x !== t);
    const acceso = t === "pesce" ? isMare(v) : ha(v, t);
    if (t === "pesce") nuovi = nuovi.filter(x => x !== "carne");
    if (!acceso) nuovi.push(t); else if (t === "pesce") nuovi.push("carne"); // spento il mare = carne/terra esplicito
    await salvaTags(v, nuovi);
    disegnaPiatti();
  });
  document.getElementById("ms-tony").onclick = propostaTony;
}

async function salvaTags(v, nuovi) {
  const { error } = await supabase.from("menu_voci").update({ tags: nuovi }).eq("id", v.id).eq("azienda_id", st.aziendaId);
  if (error) { alert("Non salvato: " + error.message); return; }
  v.tags = nuovi;
}

async function propostaTony() {
  const b = document.getElementById("ms-tony");
  b.disabled = true; b.textContent = "🤖 Tony sta scegliendo…";
  for (const c of st.cats) {
    if (st.escluse.has(c.id)) continue;
    const vs = vociCat(c.id);
    const quanti = vs.length <= 4 ? 1 : 2;
    const punteggio = v => (PESO_Q[v.q] ?? 0.5) + (v.foto_url ? 1.5 : 0);
    const scelti = [...vs].sort((a, b) => punteggio(b) - punteggio(a)).slice(0, quanti).map(v => v.id);
    for (const v of vs) {
      let nuovi = tags(v).filter(x => x !== "spingi");
      if (scelti.includes(v.id)) nuovi.push("spingi");
      if (!ha(v, "pesce") && !ha(v, "carne") && RX_MARE.test(v.nome || "")) nuovi.push("pesce");
      if (JSON.stringify(nuovi) !== JSON.stringify(tags(v))) await salvaTags(v, nuovi);
    }
  }
  disegnaPiatti();
}

function disegnaStampa() {
  const el = document.getElementById("ms-stampa");
  el.innerHTML = `
    <label style="display:block; font-size:13px; margin-bottom:10px;">Nota in testa al menu (coperto, allergeni…)<br>
      <input id="ms-nota" value="${esc(st.nota)}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-top:4px;">
    </label>
    <button id="ms-vai" class="app-button">🖨️ Apri il menu da stampare</button>
    <div style="font-size:12px; color:#64748b; margin-top:8px;">Si apre in una nuova finestra in formato A4: da lì "Stampa" oppure "Salva come PDF". I piatti senza foto restano in elenco, ben leggibili.</div>`;
  document.getElementById("ms-nota").oninput = e => { st.nota = e.target.value; };
  document.getElementById("ms-vai").onclick = apriStampa;
}

/* ── Impaginazione ─────────────────────────────────────────────────────── */
const SER = "font-family:'Cormorant Garamond',Georgia,serif";
const VERDE = "#2F4A3A", COTTO = "#A8432A";

function riga(v, desc = true) {
  return `<div class="it"><div class="itn">${esc(v.nome)}<span class="pr">&#8195;${prezzo(v)}</span></div>${desc && v.descrizione ? `<div class="itd">${esc(v.descrizione)}</div>` : ""}</div>`;
}
function colonna(titolo, vs) {
  if (!vs.length) return "";
  return `<div class="col">${titolo ? `<div class="lab">${esc(titolo)}</div>` : ""}<div class="lst">${vs.map(v => riga(v)).join("")}</div></div>`;
}
function hero(v) {
  return `<div class="hero"><img src="${esc(v.foto_url)}" alt="${esc(v.nome)}"><div class="band"><div class="tag">Da provare</div>
    <div class="bandr"><div class="bn">${esc(v.nome)}</div><div class="bn">${prezzo(v)}</div></div>
    ${v.descrizione ? `<div class="bd">${esc(v.descrizione)}</div>` : ""}</div></div>`;
}
function card(v, tag) {
  return `<div class="card">${v.foto_url ? `<img src="${esc(v.foto_url)}" alt="${esc(v.nome)}">` : ""}<div><div class="tag2">${tag}</div>
    <div class="cn">${esc(v.nome)}</div><div class="cp">${prezzo(v)}</div>${v.descrizione ? `<div class="cd">${esc(v.descrizione)}</div>` : ""}</div></div>`;
}
function mini(v) {
  return `<div class="mini">${v.foto_url ? `<img src="${esc(v.foto_url)}" alt="${esc(v.nome)}">` : ""}<div class="itn" style="margin-top:8px">${esc(v.nome)}<span class="pr">&#8195;${prezzo(v)}</span></div>${v.descrizione ? `<div class="itd">${esc(v.descrizione)}</div>` : ""}</div>`;
}
function duecolonne(vs, titoloT = "", titoloM = "") {
  const mare = vs.filter(isMare), terra = vs.filter(v => !isMare(v));
  if (mare.length && terra.length) return `<div class="cols">${colonna(titoloT || "Terra", terra)}${colonna(titoloM || "Mare", mare)}</div>`;
  const meta = Math.ceil(vs.length / 2);
  return `<div class="cols">${colonna("", vs.slice(0, meta))}${colonna("", vs.slice(meta))}</div>`;
}

function sezione(c) {
  const vs = vociCat(c.id);
  if (!vs.length) return "";
  const spingi = vs.filter(v => ha(v, "spingi"));
  const trad = vs.filter(v => ha(v, "tradizione") && !ha(v, "spingi"));
  const resto = vs.filter(v => !ha(v, "spingi") && !ha(v, "tradizione"));
  const conFoto = spingi.filter(v => v.foto_url);
  const primo = conFoto[0] || null;
  const altriSpinti = spingi.filter(v => v !== primo);
  let h = `<section class="sez ${primo ? "nuova" : ""}"><h2>${esc(c.nome)}</h2>`;
  if (primo) h += hero(primo);
  if (altriSpinti.length) {
    for (let i = 0; i < altriSpinti.length; i += 2)
      h += `<div class="row">${altriSpinti.slice(i, i + 2).map(v => card(v, isMare(v) ? "Dal mare" : "Consigliato")).join("")}</div>`;
  }
  if (trad.length) {
    h += `<div class="lab big">La tradizione</div>`;
    const tf = trad.filter(v => v.foto_url), tn = trad.filter(v => !v.foto_url);
    for (let i = 0; i < tf.length; i += 3) h += `<div class="row">${tf.slice(i, i + 3).map(mini).join("")}</div>`;
    if (tn.length) h += duecolonne(tn, " ", " ");
  }
  if (resto.length) {
    if (trad.length || spingi.length) h += `<div class="lab big">${trad.length ? "Gli altri" : "Tutti i piatti"}</div>`;
    h += duecolonne(resto);
  }
  return h + "</section>";
}

function apriStampa() {
  const sede = (st.sedi.find(s => s.id === st.sedeId) || {}).nome || "";
  const corpo = st.cats.filter(c => !st.escluse.has(c.id)).map(sezione).join("");
  if (!corpo) { alert("Nessuna categoria da stampare."); return; }
  const w = window.open("", "_blank");
  if (!w) { alert("Il browser ha bloccato la finestra: consenti i popup e riprova."); return; }
  const css = `
@page{size:A4;margin:16mm 15mm 18mm 15mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#FBF8F2;color:#231F1A;font-family:'Work Sans',Arial,sans-serif}
.wrap{max-width:180mm;margin:0 auto;padding:10px}
.top{display:flex;justify-content:space-between;border-bottom:1px solid #231F1A;padding-bottom:8px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:600}
h2{${SER};font-size:40px;font-weight:600;margin:22px 0 12px;line-height:1}
.sez{break-inside:auto} .sez.nuova{break-before:page} .sez:first-of-type{break-before:auto}
.hero{break-inside:avoid;margin-bottom:14px} .hero img{width:100%;height:58mm;object-fit:cover;display:block}
.band{background:${VERDE};color:#FBF8F2;padding:12px 16px} .tag{font-size:10px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;color:#e7c9b8}
.bandr{display:flex;justify-content:space-between;gap:16px;align-items:baseline} .bn{${SER};font-size:28px;font-weight:600;line-height:1.1} .bd{font-size:13px;margin-top:3px}
.row{display:flex;gap:12px;margin:12px 0;break-inside:avoid}
.card{flex:1;min-width:0;display:flex;gap:14px;align-items:center;background:#F1EBDF;padding:10px}
.card img{width:30mm;height:30mm;object-fit:cover;flex:none} .tag2{font-size:10px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;color:${COTTO}}
.cn{${SER};font-size:22px;font-weight:600;line-height:1.05;margin-top:3px} .cp{${SER};font-size:21px;font-weight:600;color:${VERDE}} .cd{font-size:12.5px;line-height:1.35;margin-top:2px}
.mini{flex:1;min-width:0} .mini img{width:100%;height:28mm;object-fit:cover;display:block}
.lab{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;color:${COTTO};border-bottom:1px solid #231F1A;padding-bottom:5px;margin-bottom:9px}
.lab.big{font-size:11.5px;margin-top:18px}
.cols{display:flex;gap:36px;align-items:flex-start;margin-top:8px} .col{flex:1;min-width:0} .lst{display:flex;flex-direction:column;gap:7px}
.it{break-inside:avoid} .itn{${SER};font-size:19px;font-weight:600;line-height:1.15} .pr{color:${VERDE};white-space:nowrap} .itd{font-size:12.5px;line-height:1.35;color:#3b352d;margin-top:1px}
.nota{margin-top:26px;border-top:1px solid #d9d1c3;padding-top:8px;font-size:11px;color:#5c554c}
.np{position:sticky;top:0;background:#fff;padding:10px;text-align:center;border-bottom:1px solid #e5e7eb}
.np button{background:#0E5A7A;color:#fff;border:0;padding:10px 22px;border-radius:8px;font-size:14px;cursor:pointer}
@media print{.np{display:none}.wrap{padding:0}}`;
  w.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Menu — ${esc(sede)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
<div class="np"><button onclick="window.print()">🖨️ Stampa o salva PDF</button></div>
<div class="wrap"><div class="top"><span>${esc(sede)}</span><span style="letter-spacing:.05em;text-transform:none;font-weight:400">${esc(st.nota)}</span></div>${corpo}</div></body></html>`);
  w.document.close();
}
