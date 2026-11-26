// js/views/menu-stampa.js
// MENU STAMPABILE (26/11/2026) — nato dal menu cartaceo della Trattoria dell'Aquila.
// Il ristoratore sceglie, piatto per piatto, cosa SPINGERE (foto grande, riquadro) e cosa è
// della TRADIZIONE (i piatti identitari, sezione a parte con foto). Tony propone i piatti da
// spingere leggendo il Menu Engineering (Puzzle e Star prima di tutto, con foto se c'è).
// Le scelte restano sul piatto (menu_voci.tags: "spingi", "tradizione"; il mare usa il tag
// "pesce" già esistente), così la prossima stampa riparte da lì.
// La stampa si apre in una finestra a parte, A4, pronta per "Stampa o salva PDF".
// POSIZIONE di ogni piatto (la decide il titolare, o Tony dai dati storici), sempre su menu_voci.tags:
//   "testata" (la foto grande in cima alla categoria) · "spingi" (in evidenza) · "tradizione" ·
//   nessuno = in elenco · "no_stampa" = non entra nel cartaceo (resta nel menu digitale).

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

  // arrivo dal Menu builder (#/menu-stampa?menu=<id>): apro quel menu nella sua sede
  const daHash = new URLSearchParams(location.hash.split("?")[1] || "").get("menu");
  if (daHash) {
    const { data: m } = await supabase.from("menu").select("id, sede_id").eq("id", daHash).maybeSingle();
    if (m) { st.sedeId = m.sede_id || st.sedeId; st.menuId = m.id; }
  }
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
  return storico(v)?.quadrante || null;
}
function storico(v) {
  return st.me.find(x => (v.prodotto_vendita_id && x.prodotto_vendita_id === v.prodotto_vendita_id))
    || st.me.find(x => (v.ricetta_id && x.ricetta_id === v.ricetta_id))
    || st.me.find(x => norm(x.nome) === norm(v.nome)) || null;
}
function datiStorici(v) {
  const r = storico(v);
  if (!r) return "senza dati di vendita";
  const q = Q_LABEL[r.quadrante] || r.quadrante || "";
  const n = Number(r.qta_venduta) || 0, m = Number(r.margine_unitario);
  return `${q} · ${n} venduti${isFinite(m) && m ? ` · margine € ${m.toFixed(2).replace(".", ",")}` : ""}`;
}

function vociCat(catId) { return st.voci.filter(v => v.categoria_id === catId); }
function vociStampa(catId) { return vociCat(catId).filter(v => !ha(v, "no_stampa")); }
const POSIZIONI = [["testata", "📌 Testata"], ["spingi", "⭐ In evidenza"], ["tradizione", "🏛 Tradizione"], ["", "☰ In elenco"], ["no_stampa", "🚫 Non stampare"]];
const TAG_POS = ["testata", "spingi", "tradizione", "no_stampa"];
function posizione(v) { return ha(v, "no_stampa") ? "no_stampa" : ha(v, "testata") ? "testata" : ha(v, "spingi") ? "spingi" : ha(v, "tradizione") ? "tradizione" : ""; }

function disegnaPiatti() {
  const el = document.getElementById("ms-piatti");
  if (!st.cats.length) { el.innerHTML = "<div>Nessuna categoria in questo menu.</div>"; return; }
  const btn = (v, t, on, label) =>
    `<button class="ms-tag" data-id="${v.id}" data-tag="${t}" style="border:1px solid ${on ? "#0E5A7A" : "#cbd5e1"}; background:${on ? "#0E5A7A" : "#fff"}; color:${on ? "#fff" : "#334155"}; border-radius:999px; padding:8px 12px; font-size:13px; cursor:pointer; min-height:36px;">${label}</button>`;
  el.innerHTML = `
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
      <button class="app-button small ms-tony" data-crit="margine">🤖 Tony: spingi i più redditizi</button>
      <button class="app-button small ms-tony" data-crit="venduti">🤖 Tony: spingi i più venduti</button>
      <span style="font-size:13px; color:#64748b;">Per ogni piatto scegli dove va nel cartaceo, oppure fai proporre a Tony dai dati di vendita (redditizi = prima Puzzle e Star del Menu Engineering). Tradizione ed esclusi restano come li hai messi tu.</span>
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

// in elenco la descrizione resta breve: prima frase, al massimo una riga e mezza
function breve(t) {
  const s = String(t || "").trim();
  if (s.length <= 70) return s;
  const m = s.slice(30, 70).search(/[.,;:]/);
  return m >= 0 ? s.slice(0, 30 + m) : s.slice(0, 68).replace(/\s+\S*$/, "") + "…";
}
function riga(v) {
  return `<div class="it"><div class="itn">${esc(v.nome)}<span class="pr">&#8195;${prezzo(v)}</span></div>${v.descrizione ? `<div class="itd">${esc(breve(v.descrizione))}</div>` : ""}</div>`;
}
// elenco a due colonne che si legge dall'alto in basso, nell'ordine del menu
function elenco(vs) {
  if (!vs.length) return "";
  return `<div class="${vs.length > 3 ? "lst2" : "lst1"}">${vs.map(riga).join("")}</div>`;
}
function titoletto(t) { return `<div class="sub"><span>${esc(t)}</span></div>`; }

// in evidenza: tre impaginazioni che si alternano, così le pagine non sono tutte uguali
function hero(v, n) {
  const testo = `<div class="tag">Da provare</div><div class="bn">${esc(v.nome)}</div><div class="bp">${v._pre || ""}${prezzo(v)}${v._suf || ""}</div>${v.descrizione ? `<div class="bd">${esc(v.descrizione)}</div>` : ""}`;
  if (n % 3 === 1) return `<div class="hero split"><img src="${esc(v.foto_url)}" alt="${esc(v.nome)}"><div class="band">${testo}</div></div>`;
  if (n % 3 === 2) return `<div class="hero split rev"><div class="band">${testo}</div><img src="${esc(v.foto_url)}" alt="${esc(v.nome)}"></div>`;
  return `<div class="hero full"><img src="${esc(v.foto_url)}" alt="${esc(v.nome)}"><div class="band">${testo}</div></div>`;
}
// gli altri spinti: foto tonda che si alterna a sinistra e a destra
function feature(v, i, tag) {
  return `<div class="feat ${i % 2 ? "rev" : ""}">${v.foto_url ? `<img src="${esc(v.foto_url)}" alt="${esc(v.nome)}">` : ""}<div class="ft"><div class="tag2">${tag}</div>
    <div class="cn">${esc(v.nome)}<span class="pr">&#8195;${prezzo(v)}</span></div>${v.descrizione ? `<div class="cd">${esc(v.descrizione)}</div>` : ""}</div></div>`;
}
function mini(v) {
  return `<div class="mini"><img src="${esc(v.foto_url)}" alt="${esc(v.nome)}"><div class="itn" style="margin-top:6px">${esc(v.nome)}<span class="pr">&#8195;${prezzo(v)}</span></div>${v.descrizione ? `<div class="itd">${esc(v.descrizione)}</div>` : ""}</div>`;
}
// la tradizione: foto rettangolari affiancate (max 3), il resto in elenco
function bloccoTradizione(vs) {
  if (!vs.length) return "";
  const conFoto = vs.filter(v => v.foto_url).slice(0, 3);
  const senza = vs.filter(v => !conFoto.includes(v));
  return `<div class="blk">${titoletto("La tradizione")}${conFoto.length ? `<div class="minis">${conFoto.map(mini).join("")}</div>` : ""}${elenco(senza)}</div>`;
}
// il mare: sempre in colonna, una riga per piatto con la sua foto accanto
function bloccoMare(vs, top = "") {
  if (!vs.length && !top) return "";
  return `<div class="blk">${titoletto("Dal mare")}${top}<div class="mcol">${vs.map(v => `<div class="mrow ${v.foto_url ? "" : "nof"}">${v.foto_url ? `<img src="${esc(v.foto_url)}" alt="${esc(v.nome)}">` : ""}${riga(v)}</div>`).join("")}</div></div>`;
}

// FAMIGLIE: più versioni dello stesso piatto (tagliate, frollature) diventano una scala di prezzi.
// Si decidono con il tag "fam:<nome>"; senza tag, Tony raggruppa da solo 3+ piatti con la stessa prima parola.
function prezzoNum(v) { return Number(v.prezzo_override ?? v.prezzo) || 0; }
function alKg(v) { return /al kg/i.test(v.nome || ""); }
function famiglie(vs) {
  const out = new Map();
  vs.forEach(v => { const t = tags(v).find(x => x.startsWith("fam:")); if (t) { const k = t.slice(4); if (!out.has(k)) out.set(k, []); out.get(k).push(v); } });
  // in automatico solo piatti "normali": non quelli da spingere o della tradizione, e mai terra e mare insieme
  const liberi = vs.filter(v => !tags(v).some(x => x.startsWith("fam:")) && !ha(v, "spingi") && !ha(v, "tradizione"));
  const perParola = new Map();
  liberi.forEach(v => { const w = (v.nome || "").trim().split(/\s+/)[0]; const k = w + (alKg(v) ? "|kg" : ""); if (!perParola.has(k)) perParola.set(k, []); perParola.get(k).push(v); });
  perParola.forEach((g, k) => { const m = g.filter(isMare).length; if (g.length >= 3 && (m === 0 || m === g.length)) out.set(k.split("|")[0], g); });
  return out;
}
function etichetta(v, fam) {
  let r = (v.nome || "").replace(/\(prezzo al kg\)/i, "").replace(/\s+/g, " ").trim();
  if (r.toLowerCase().startsWith(fam.toLowerCase())) r = r.slice(fam.length).trim();
  const m = r.match(/^(\d+)\s*(gg|giorni)?\b/i);
  if (m) return `frollatura minimo ${m[1]} giorni`;
  return r.replace(/^di (manzo|vitello|maiale)\s+/i, "") || v.nome;
}
function scala(fam, vs, senzaFoto = false) {
  const ord = [...vs].sort((a, b) => prezzoNum(a) - prezzoNum(b));
  const kg = vs.some(alKg);
  const foto = vs.find(v => v.foto_url && ha(v, "spingi")) || vs.find(v => v.foto_url);
  const desc = (vs.find(v => v.descrizione) || {}).descrizione;
  return `<div class="scala"><div class="sch"><span>${esc(fam)}</span><em>${kg ? "prezzo al kg" : "come la vuoi"}</em></div>
    <div class="scr">${foto && !senzaFoto ? `<img src="${esc(foto.foto_url)}" alt="${esc(fam)}">` : ""}<div class="scrows">
    ${ord.map((v, i) => `<div class="sc ${i === ord.length - 1 && ord.length > 2 ? "best" : ""}"><span>${esc(etichetta(v, fam))}</span><b>${prezzo(v)}${kg ? "/kg" : ""}</b></div>`).join("")}
    ${desc ? `<div class="scd">${esc(desc)}</div>` : ""}</div></div></div>`;
}

let nSez = 0;
function sezione(c) {
  const tutti = vociCat(c.id);
  if (!tutti.length) return "";
  const fam = famiglie(tutti);
  const inFam = new Set([...fam.values()].flat().map(v => v.id));
  const vs = tutti.filter(v => !inFam.has(v.id));
  const spingi = vs.filter(v => ha(v, "spingi"));
  const trad = vs.filter(v => ha(v, "tradizione") && !ha(v, "spingi"));
  const libero = vs.filter(v => !ha(v, "spingi") && !ha(v, "tradizione"));
  const mare = libero.filter(isMare), terra = libero.filter(v => !isMare(v));
  // la testata: il primo piatto da spingere con foto, anche se fa parte di una famiglia (es. la fiorentina)
  const primo = tutti.filter(v => ha(v, "spingi")).find(v => v.foto_url) || null;
  const famPrimo = primo ? [...fam.entries()].find(([, g]) => g.includes(primo)) : null;
  const altri = spingi.filter(v => v !== primo);
  let h = `<section class="sez ${primo || fam.size ? "nuova" : (tutti.length <= 14 ? "corta" : "")}"><h2>${esc(c.nome)}</h2><div class="orn"></div>`;
  if (primo && famPrimo) {
    // testata di una famiglia (es. fiorentina): le versioni con i prezzi stanno dentro la fascia
    const [k, g] = famPrimo;
    const kg = g.some(alKg);
    const righe = [...g].sort((x, y) => prezzoNum(x) - prezzoNum(y))
      .map(v => `<div class="hr"><span>${esc(etichetta(v, k))}</span><b>${prezzo(v)}${kg ? "/kg" : ""}</b></div>`).join("");
    const d = primo.descrizione || (g.find(v => v.descrizione) || {}).descrizione;
    h += `<div class="hero full"><img src="${esc(primo.foto_url)}" alt="${esc(k)}"><div class="band"><div class="tag">Da provare${kg ? " · prezzo al kg" : ""}</div><div class="bn">${esc(k)}</div>${righe}${d ? `<div class="bd">${esc(d)}</div>` : ""}</div></div>`;
    nSez++;
  } else if (primo) h += hero(primo, nSez++);
  fam.forEach((g, k) => { if (!(famPrimo && famPrimo[0] === k)) h += scala(k, g); });
  const altriT = altri.filter(v => !isMare(v)), altriM = altri.filter(isMare);
  altriT.forEach((v, i) => { h += feature(v, i, "Consigliato"); });
  h += bloccoTradizione(trad);
  if (terra.length) h += `<div class="blk">${(trad.length || mare.length || spingi.length || fam.size) ? titoletto(mare.length || altriM.length ? "Dalla terra" : "Gli altri piatti") : ""}${elenco(terra)}</div>`;
  h += bloccoMare(mare, altriM.map((v, i) => feature(v, altriT.length + i, "Consigliato")).join(""));
  return h + "</section>";
}

function apriStampa() {
  nSez = 0;
  const sede = (st.sedi.find(s => s.id === st.sedeId) || {}).nome || "";
  const corpo = st.cats.filter(c => !st.escluse.has(c.id)).map(sezione).join("");
  if (!corpo) { alert("Nessuna categoria da stampare."); return; }
  const w = window.open("", "_blank");
  if (!w) { alert("Il browser ha bloccato la finestra: consenti i popup e riprova."); return; }
  const css = `
@page{size:A4;margin:13mm 14mm 13mm 14mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#FBF8F2;color:#231F1A;font-family:'Work Sans',Arial,sans-serif}
.wrap{max-width:180mm;margin:0 auto;padding:10px}
.top{display:flex;justify-content:space-between;border-bottom:1px solid #231F1A;padding-bottom:8px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:600}
h2{${SER};font-size:38px;font-weight:600;margin:18px 0 10px;line-height:1}
.sez{break-inside:auto} .sez.corta{break-inside:avoid} h2,.orn,.sub{break-after:avoid} .sez.nuova{break-before:page} .sez:first-of-type{break-before:auto}
.orn{width:46px;height:2px;background:${COTTO};margin:-4px 0 16px}
.hero{break-inside:avoid;margin:0 0 18px;position:relative}
.hero .tag{font-size:10px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;color:#e7c9b8}
.hero .bn{${SER};font-size:30px;font-weight:600;line-height:1.05;margin-top:4px} .hero .bp{${SER};font-size:26px;font-weight:600;margin-top:2px} .hero .bd{font-size:13px;line-height:1.4;margin-top:6px}
.hero.full img{width:100%;height:46mm;object-fit:cover;display:block}
.hero.full .band{background:${VERDE};color:#FBF8F2;padding:12px 16px;width:78%;margin:-34px 0 0 auto;position:relative}
.hero .hr{display:flex;justify-content:space-between;gap:14px;${SER};font-size:19px;font-weight:600;border-bottom:1px solid rgba(251,248,242,.25);padding:3px 0} .hero .hr b{white-space:nowrap}
.hero.split{display:flex;align-items:stretch} .hero.split img{width:58%;height:54mm;object-fit:cover;display:block}
.hero.split .band{flex:1;background:${VERDE};color:#FBF8F2;padding:18px;display:flex;flex-direction:column;justify-content:center}
.feat{display:flex;gap:16px;align-items:center;margin:10px 0;break-inside:avoid} .feat.rev{flex-direction:row-reverse;text-align:right}
.feat img{width:26mm;height:26mm;border-radius:50%;object-fit:cover;flex:none;border:3px solid #F1EBDF}
.ft{flex:1} .tag2{font-size:10px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;color:${COTTO}}
.cn{${SER};font-size:24px;font-weight:600;line-height:1.1;margin-top:3px} .cd{font-size:12.5px;line-height:1.4;margin-top:3px;color:#3b352d}
.blk{margin-top:10px}
.sub{display:flex;align-items:center;gap:12px;margin:4px 0 8px;break-after:avoid} .sub span{${SER};font-style:italic;font-size:22px;color:${VERDE};white-space:nowrap}
.sub:after{content:"";flex:1;height:1px;background:#cfc5b3}
.minis{display:flex;gap:14px;margin-bottom:8px;break-inside:avoid} .mini{flex:1;min-width:0} .mini img{width:100%;height:30mm;object-fit:cover;display:block}
.mcol{display:flex;flex-direction:column;gap:8px} .mrow{display:flex;gap:12px;align-items:center;break-inside:avoid} .mrow img,.mph{width:24mm;height:17mm;object-fit:cover;flex:none} .mph{background:#EFE7D8}
.mrow .it{margin:0} .mrow.nof{padding-left:calc(24mm + 12px)}
.scala{margin:8px 0 2px;break-inside:avoid} .sch{display:flex;align-items:baseline;gap:12px;margin-bottom:5px} .sch span{${SER};font-size:23px;font-weight:600} .sch em{${SER};font-size:18px;color:${VERDE}}
.scr{display:flex;gap:20px;align-items:stretch} .scr img{width:50mm;height:34mm;object-fit:cover;flex:none}
.scrows{flex:1;display:flex;flex-direction:column;justify-content:center;gap:2px}
.sc{display:flex;justify-content:space-between;gap:12px;align-items:baseline;border-bottom:1px solid #d9d1c3;padding:3px 0;${SER};font-size:18px;font-weight:600}
.sc b{color:${VERDE};white-space:nowrap} .sc.best{background:${COTTO};color:#FBF8F2;border:0;padding:5px 10px;margin:4px -10px 0} .sc.best b{color:#FBF8F2}
.scd{font-size:12px;color:#3b352d;margin-top:6px}
.lst2{column-count:2;column-gap:34px} .lst1{max-width:62%} .it{break-inside:avoid;margin-bottom:6px}
.itn{${SER};font-size:18px;font-weight:600;line-height:1.15} .pr{color:${VERDE};white-space:nowrap} .itd{font-size:12px;line-height:1.35;color:#3b352d;margin-top:1px}
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
