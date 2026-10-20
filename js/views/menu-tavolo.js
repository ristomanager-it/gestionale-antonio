// js/views/menu-tavolo.js
// 🖨 Menu da tavolo dei ricevimenti. Ogni sede ha i suoi modelli grafici (formato, carta, cornice, caratteri,
// colori, testi): li crea Tony da una foto o si costruiscono qui. Si sceglie l'evento, il menu si compone da solo
// con i piatti del preventivo e si stampa (anche una copia per tavolo).
const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FORMATI = {
  A5: [148, 210], A4: [210, 297], A6: [105, 148], "10x21": [100, 210], "15x15": [150, 150], "21x10 orizzontale": [210, 100],
};
const FONT = ["Cormorant Garamond", "Playfair Display", "EB Garamond", "Libre Baskerville", "Lora", "Cinzel", "Great Vibes",
  "Dancing Script", "Parisienne", "Montserrat", "Raleway", "Josefin Sans"];
const ORDINE_SEZ = ["Aperitivo", "Antipasti", "Antipasto al buffet", "Primi", "Secondi", "Contorni", "Formaggi", "Torta", "Buffet di dolci", "Dolci", "Vini e bollicine"];
const DIVISORI = { nessuno: "", linea: "<span class=\"mt-linea\"></span>", ornamento: "~ ❦ ~", punto: "•", stelline: "✦ ✦ ✦", tilde: "~" };
const BASE = {
  formato: { nome: "A5", larghezza_mm: 148, altezza_mm: 210 }, margini_mm: 14, sfondo: { colore: "#ffffff" },
  cornice: { stile: "sottile", colore: "#999999", distanza_mm: 6, spessore_pt: 1 },
  font_titolo: "Cormorant Garamond", font_testo: "Cormorant Garamond",
  colori: { titolo: "#333333", sezione: "#777777", piatto: "#333333", dettagli: "#888888" }, allineamento: "center",
  intestazione: { testo: "Menu", stile: "corsivo", dimensione_pt: 28, mostra_nome_evento: true, mostra_data: true },
  sezioni: { mostra_titoli: true, stile: "maiuscoletto", dimensione_pt: 11, divisore: "ornamento" },
  piatti: { dimensione_pt: 13, interlinea: 1.35, stile: "normale" }, decorazione: { simbolo: "", posizione: "basso" }, piede: { testo: "" },
};
const unisci = (a, b) => { const o = { ...a }; for (const k in b || {}) o[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? unisci(a[k] || {}, b[k]) : b[k]; return o; };

function caricaFont(spec, doc = document) {
  const fam = [...new Set([spec.font_titolo, spec.font_testo].filter(Boolean))].map((f) => "family=" + encodeURIComponent(f) + ":ital,wght@0,400;0,600;1,400").join("&");
  if (!fam) return;
  const href = `https://fonts.googleapis.com/css2?${fam}&display=swap`;
  if ([...doc.querySelectorAll("link[data-mt-font]")].some((l) => l.href === href)) return;
  const l = doc.createElement("link"); l.rel = "stylesheet"; l.href = href; l.dataset.mtFont = "1"; doc.head.appendChild(l);
}

// una pagina di menu (misure in mm, testi in pt): la stessa per anteprima e stampa
export function paginaMenu(specIn, dati) {
  const s = unisci(BASE, specIn || {});
  const W = Number(s.formato.larghezza_mm) || 148, H = Number(s.formato.altezza_mm) || 210, M = Number(s.margini_mm) || 12;
  const c = s.colori, cor = s.cornice || {};
  const bordo = { nessuna: "none", sottile: `${cor.spessore_pt || 1}pt solid ${cor.colore}`, doppia: `${Math.max(3, (cor.spessore_pt || 1) * 3)}pt double ${cor.colore}`,
    tratteggiata: `${cor.spessore_pt || 1}pt dashed ${cor.colore}`, ornata: `${cor.spessore_pt || 1}pt solid ${cor.colore}` }[cor.stile] || "none";
  const stileTesto = (st) => st === "corsivo" ? "font-style:italic;" : st === "maiuscoletto" ? "font-variant:small-caps;letter-spacing:.12em;" : st === "maiuscolo" ? "text-transform:uppercase;letter-spacing:.14em;" : st === "grassetto" ? "font-weight:600;" : "";
  const div = DIVISORI[s.sezioni.divisore] ?? "";
  const deco = s.decorazione?.simbolo ? `<div class="mt-deco" style="color:${c.dettagli}">${esc(s.decorazione.simbolo)}</div>` : "";
  const sezioni = (dati?.sezioni || []).map((sez, i) => `
    ${i > 0 && div ? `<div class="mt-div" style="color:${c.dettagli}">${div}</div>` : ""}
    ${s.sezioni.mostra_titoli && sez.titolo ? `<div class="mt-sez" style="color:${c.sezione};font-size:${s.sezioni.dimensione_pt}pt;${stileTesto(s.sezioni.stile)}">${esc(sez.titolo)}</div>` : ""}
    ${sez.piatti.map((p) => `<div class="mt-piatto" style="color:${c.piatto};font-size:${s.piatti.dimensione_pt}pt;line-height:${s.piatti.interlinea};${stileTesto(s.piatti.stile)}">${esc(p)}</div>`).join("")}`).join("");
  return `<div class="mt-pagina" style="width:${W}mm;height:${H}mm;background:${s.sfondo.colore};font-family:'${s.font_testo}',serif;text-align:${s.allineamento};">
    ${bordo !== "none" ? `<div class="mt-cornice" style="inset:${cor.distanza_mm || 6}mm;border:${bordo};${cor.stile === "ornata" ? `outline:${cor.spessore_pt || 1}pt solid ${cor.colore};outline-offset:-2.2mm;` : ""}"></div>` : ""}
    <div class="mt-contenuto" style="padding:${M}mm;">
      ${s.decorazione?.posizione !== "basso" ? deco : ""}
      ${dati?.tavolo ? `<div class="mt-tavolo" style="color:${c.dettagli}">${esc(dati.tavolo)}</div>` : ""}
      <div class="mt-titolo" style="font-family:'${s.font_titolo}',serif;color:${c.titolo};font-size:${s.intestazione.dimensione_pt}pt;${stileTesto(s.intestazione.stile)}">${esc(s.intestazione.testo || "Menu")}</div>
      ${s.intestazione.mostra_nome_evento && dati?.evento ? `<div class="mt-evento" style="font-family:'${s.font_titolo}',serif;color:${c.titolo}">${esc(dati.evento)}</div>` : ""}
      ${s.intestazione.mostra_data && dati?.data ? `<div class="mt-data" style="color:${c.dettagli}">${esc(dati.data)}</div>` : ""}
      <div class="mt-corpo">${sezioni}</div>
      ${s.decorazione?.posizione !== "alto" ? deco : ""}
      ${s.piede?.testo ? `<div class="mt-piede" style="color:${c.dettagli}">${esc(s.piede.testo)}</div>` : ""}
    </div></div>`;
}
const CSS_PAGINA = `
  .mt-pagina{position:relative;box-sizing:border-box;overflow:hidden;}
  .mt-cornice{position:absolute;pointer-events:none;}
  .mt-contenuto{position:relative;height:100%;box-sizing:border-box;display:flex;flex-direction:column;}
  .mt-corpo{flex:1;display:flex;flex-direction:column;justify-content:center;gap:1.2mm;}
  .mt-titolo{line-height:1.1;margin-bottom:1mm;}
  .mt-evento{font-size:13pt;font-style:italic;margin-top:1mm;}
  .mt-data{font-size:9.5pt;margin-top:1mm;margin-bottom:3mm;}
  .mt-sez{margin-top:3mm;margin-bottom:1mm;}
  .mt-div{font-size:10pt;margin:2mm 0;}
  .mt-linea{display:inline-block;width:22mm;border-top:0.6pt solid currentColor;vertical-align:middle;}
  .mt-deco{font-size:16pt;margin:2mm 0;}
  .mt-piede{font-size:8.5pt;letter-spacing:.08em;margin-top:2mm;}
  .mt-tavolo{font-size:9pt;letter-spacing:.1em;text-transform:uppercase;margin-bottom:2mm;}`;

async function datiEvento(id) {
  const [{ data: p }, { data: righe }] = await Promise.all([
    sb().from("preventivi").select("id, titolo_evento, nome_festeggiato, data_evento, sede_uuid, tipo_servizio").eq("id", id).maybeSingle(),
    sb().from("preventivi_righe").select("sezione_menu, nome_portata, ricetta_id").eq("preventivo_id", id).is("semilavorato_di", null),
  ]);
  if (!p) return null;
  const gruppi = new Map();
  for (const r of righe || []) {
    const nome = String(r.nome_portata || "").trim();
    if (!nome || /proposte da scegliere|\?$/i.test(nome) || /semilavorat|menu bambini/i.test(r.sezione_menu || "")) continue;
    const sez = r.sezione_menu || "Menu";
    if (!gruppi.has(sez)) gruppi.set(sez, []);
    gruppi.get(sez).push(nome.charAt(0).toUpperCase() + nome.slice(1));
  }
  const pos = (x) => { const i = ORDINE_SEZ.findIndex((s) => s.toLowerCase() === x.toLowerCase()); return i < 0 ? 50 : i; };
  return { id: p.id, sede: p.sede_uuid, tipo: p.tipo_servizio, evento: p.nome_festeggiato || p.titolo_evento,
    data: p.data_evento ? new Date(p.data_evento + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "",
    sezioni: [...gruppi.entries()].sort((a, b) => pos(a[0]) - pos(b[0])).map(([titolo, piatti]) => ({ titolo, piatti })) };
}
// dalla prenotazione: se nasce da un evento usa il preventivo, altrimenti il menu componibile del gruppo
const PORTATE = { antipasti: "Antipasti", primi: "Primi", secondi: "Secondi", contorni: "Contorni", dessert: "Dolci", dolci: "Dolci" };
async function datiPrenotazione(id) {
  const { data: p } = await sb().from("prenotazioni_tavoli").select("id, cliente_nome, data, sede_id, note").eq("id", id).maybeSingle();
  if (!p) return null;
  const ev = String(p.note || "").match(/da preventivo (\d+)/i);
  if (ev) { const d = await datiEvento(ev[1]); if (d) return { ...d, pren: true }; }
  const { data: m } = await sb().from("menu_componibile").select("titolo, nome_gruppo, data, voci").eq("prenotazione_id", id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const gruppi = new Map();
  for (const v of Array.isArray(m?.voci) ? m.voci : []) {
    const nome = String(v.nome || "").trim(); if (!nome) continue;
    const sez = PORTATE[String(v.portata || "").toLowerCase()] || (v.portata ? String(v.portata).charAt(0).toUpperCase() + String(v.portata).slice(1) : "Menu");
    if (!gruppi.has(sez)) gruppi.set(sez, []);
    gruppi.get(sez).push(nome.charAt(0).toUpperCase() + nome.slice(1));
  }
  const pos = (x) => { const i = ORDINE_SEZ.findIndex((s) => s.toLowerCase() === x.toLowerCase()); return i < 0 ? 50 : i; };
  const dd = m?.data || p.data;
  return { pren: true, sede: p.sede_id, evento: m?.titolo || m?.nome_gruppo || p.cliente_nome,
    data: dd ? new Date(dd + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "",
    sezioni: [...gruppi.entries()].sort((a, b) => pos(a[0]) - pos(b[0])).map(([titolo, piatti]) => ({ titolo, piatti })) };
}
const ESEMPIO = { evento: "Battesimo di Federica", data: "domenica 25 ottobre 2026", sezioni: [
  { titolo: "Antipasti", piatti: ["Antipasto Campo Antico"] },
  { titolo: "Primi", piatti: ["Risotto ai fiori di zucca con stracciatella", "Cappellacci verdi di vitella e porcini al tartufo"] },
  { titolo: "Secondi", piatti: ["Cappello del prete ai porcini", "Rosa di patate", "Spinaci al burro"] },
  { titolo: "Torta", piatti: ["Torta millefoglie"] }] };

export async function render(app) {
  const az = window.state?.azienda?.id;
  if (!az) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  const sedeAttiva = window.state?.sedeAttiva?.id || null;
  const par = new URLSearchParams(location.hash.split("?")[1] || "");
  let modelli = [], eventi = [], modello = null, dati = ESEMPIO, eventoId = par.get("evento") || "";
  app.innerHTML = `<style>${CSS_PAGINA}${stile()}</style><div class="mt"><h2 class="mt-h">🖨 Menu da tavolo</h2>
    <div class="mt-sub">Scegli l'evento e il modello, controlla l'anteprima e stampa. I modelli li crea Tony da una foto ("questo è il modello del menu da tavolo") o li costruisci qui.</div>
    <div class="mt-g2"><label>Evento<select id="mt-ev" class="mt-in"><option value="">Esempio</option></select></label>
      <label>Modello<select id="mt-mod" class="mt-in"></select></label></div>
    <div class="mt-anteprima"><div id="mt-scala"></div></div>
    <div class="mt-g2"><label>Copie<input id="mt-copie" class="mt-in" type="number" min="1" value="1"></label>
      <label>Tavoli (uno per riga, facoltativo)<textarea id="mt-tavoli" class="mt-in" rows="2" placeholder="Tavolo degli sposi&#10;Tavolo 1"></textarea></label></div>
    <button id="mt-stampa" class="mt-pri" type="button">🖨 Stampa</button>
    <details class="mt-ed" id="mt-ed"><summary>✏️ Modifica il modello</summary><div id="mt-form"></div></details>
  </div>`;
  const $ = (s) => app.querySelector(s);

  const [{ data: m }, { data: ev }] = await Promise.all([
    sb().from("menu_stampa_modelli").select("*").eq("azienda_id", az).eq("attivo", true).order("predefinito", { ascending: false }).order("nome"),
    sb().from("preventivi").select("id, titolo_evento, data_evento, sede_uuid").eq("azienda_id", az).eq("stato", "confermato")
      .gte("data_evento", new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)).order("data_evento").limit(60),
  ]);
  modelli = m || []; eventi = ev || [];
  const datiPren = par.get("pren") ? await datiPrenotazione(par.get("pren")) : null;
  if (datiPren) $("#mt-ev").innerHTML = `<option value="__pren" selected>Prenotazione: ${esc(datiPren.evento)}</option>` + $("#mt-ev").innerHTML;
  $("#mt-ev").innerHTML += eventi.map((e) => `<option value="${e.id}" ${String(e.id) === eventoId ? "selected" : ""}>${esc(new Date(e.data_evento + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "numeric" }))} · ${esc(e.titolo_evento)}</option>`).join("");

  const scegliModello = (sede) => modelli.find((x) => x.sede_id === sede && x.predefinito) || modelli.find((x) => x.sede_id === sedeAttiva && x.predefinito) || modelli.find((x) => x.predefinito) || modelli[0] || null;
  const riempiModelli = () => {
    $("#mt-mod").innerHTML = modelli.map((x) => `<option value="${x.id}" ${modello && x.id === modello.id ? "selected" : ""}>${esc(x.nome)}${x.predefinito ? " ★" : ""}</option>`).join("") + `<option value="__nuovo">＋ Nuovo modello</option>`;
  };
  const anteprima = () => {
    const spec = modello?.spec || BASE;
    caricaFont(unisci(BASE, spec));
    const box = $("#mt-scala");
    box.innerHTML = paginaMenu(spec, { ...dati, tavolo: ($("#mt-tavoli").value.split("\n").map((x) => x.trim()).filter(Boolean)[0]) || "" });
    const pag = box.firstElementChild;
    const k = Math.min(1, (box.parentElement.clientWidth - 16) / pag.offsetWidth);
    box.style.transform = `scale(${k})`; box.style.height = pag.offsetHeight * k + "px";
  };
  const caricaEvento = async () => {
    eventoId = $("#mt-ev").value;
    dati = eventoId ? (await datiEvento(eventoId)) || ESEMPIO : ESEMPIO;
    modello = scegliModello(dati.sede || sedeAttiva);
    riempiModelli(); disegnaForm(); anteprima();
  };
  $("#mt-ev").addEventListener("change", caricaEvento);
  $("#mt-mod").addEventListener("change", async () => {
    if ($("#mt-mod").value === "__nuovo") {
      const nome = prompt("Nome del nuovo modello", "Nuovo modello");
      if (!nome) { riempiModelli(); return; }
      const { data, error } = await sb().from("menu_stampa_modelli").insert({ azienda_id: az, sede_id: sedeAttiva, nome, spec: modello?.spec || BASE }).select("*").single();
      if (error) { alert(error.message); return; }
      modelli.push(data); modello = data;
    } else modello = modelli.find((x) => x.id === $("#mt-mod").value) || null;
    riempiModelli(); disegnaForm(); anteprima();
  });
  $("#mt-tavoli").addEventListener("input", anteprima);
  window.addEventListener("resize", anteprima);

  $("#mt-stampa").addEventListener("click", () => {
    const spec = unisci(BASE, modello?.spec || {});
    const tavoli = $("#mt-tavoli").value.split("\n").map((x) => x.trim()).filter(Boolean);
    const copie = Math.max(1, Number($("#mt-copie").value) || 1);
    const pagine = (tavoli.length ? tavoli : [""]).flatMap((t) => Array.from({ length: copie }, () => paginaMenu(spec, { ...dati, tavolo: t })));
    const w = window.open("", "_blank");
    if (!w) { alert("Il telefono ha bloccato la finestra di stampa: consenti i popup e riprova."); return; }
    const fam = [...new Set([spec.font_titolo, spec.font_testo])].map((f) => "family=" + encodeURIComponent(f) + ":ital,wght@0,400;0,600;1,400").join("&");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Menu ${esc(dati.evento || "")}</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam}&display=swap">
      <style>@page{size:${spec.formato.larghezza_mm}mm ${spec.formato.altezza_mm}mm;margin:0}html,body{margin:0;padding:0}
      .mt-pagina{page-break-after:always;break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}${CSS_PAGINA}</style></head>
      <body>${pagine.join("")}<script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`);
    w.document.close();
  });

  function disegnaForm() {
    const f = $("#mt-form");
    if (!modello) { f.innerHTML = `<div class="mt-sub">Nessun modello: creane uno con "＋ Nuovo modello" o mandane la foto a Tony.</div>`; return; }
    const s = unisci(BASE, modello.spec || {});
    const sel = (k, opts, v) => `<select class="mt-in" data-k="${k}">${opts.map((o) => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("")}</select>`;
    const col = (k, v) => `<input class="mt-in mt-col" type="color" data-k="${k}" value="${v}">`;
    const num = (k, v, st = 1) => `<input class="mt-in" type="number" step="${st}" data-k="${k}" value="${v}">`;
    const txt = (k, v) => `<input class="mt-in" data-k="${k}" value="${esc(v)}">`;
    const chk = (k, v) => `<input type="checkbox" data-k="${k}" ${v ? "checked" : ""}>`;
    f.innerHTML = `
      <label>Nome<input class="mt-in" id="mt-nome" value="${esc(modello.nome)}"></label>
      <div class="mt-g2"><label>Formato${sel("formato.nome", [...Object.keys(FORMATI), "Personalizzato"], FORMATI[s.formato.nome] ? s.formato.nome : "Personalizzato")}</label>
        <label>Tipo di evento<input class="mt-in" id="mt-tipo" value="${esc(modello.tipo_evento || "")}" placeholder="tutti"></label></div>
      <div class="mt-g3"><label>Larghezza mm${num("formato.larghezza_mm", s.formato.larghezza_mm)}</label><label>Altezza mm${num("formato.altezza_mm", s.formato.altezza_mm)}</label><label>Margine mm${num("margini_mm", s.margini_mm)}</label></div>
      <div class="mt-g3"><label>Carta${col("sfondo.colore", s.sfondo.colore)}</label><label>Cornice${sel("cornice.stile", ["nessuna", "sottile", "doppia", "tratteggiata", "ornata"], s.cornice.stile)}</label><label>Colore cornice${col("cornice.colore", s.cornice.colore)}</label></div>
      <div class="mt-g2"><label>Carattere titoli${sel("font_titolo", FONT, s.font_titolo)}</label><label>Carattere piatti${sel("font_testo", FONT, s.font_testo)}</label></div>
      <div class="mt-g3"><label>Titolo${col("colori.titolo", s.colori.titolo)}</label><label>Sezioni${col("colori.sezione", s.colori.sezione)}</label><label>Piatti${col("colori.piatto", s.colori.piatto)}</label></div>
      <div class="mt-g3"><label>Intestazione${txt("intestazione.testo", s.intestazione.testo)}</label><label>Stile${sel("intestazione.stile", ["corsivo", "maiuscolo", "maiuscoletto", "normale"], s.intestazione.stile)}</label><label>Grandezza pt${num("intestazione.dimensione_pt", s.intestazione.dimensione_pt)}</label></div>
      <div class="mt-g3"><label class="mt-ck">${chk("intestazione.mostra_nome_evento", s.intestazione.mostra_nome_evento)} nome evento</label><label class="mt-ck">${chk("intestazione.mostra_data", s.intestazione.mostra_data)} data</label><label class="mt-ck">${chk("sezioni.mostra_titoli", s.sezioni.mostra_titoli)} titoli sezioni</label></div>
      <div class="mt-g3"><label>Stile sezioni${sel("sezioni.stile", ["maiuscoletto", "maiuscolo", "corsivo", "grassetto", "normale"], s.sezioni.stile)}</label><label>Divisore${sel("sezioni.divisore", Object.keys(DIVISORI), s.sezioni.divisore)}</label><label>Piatti pt${num("piatti.dimensione_pt", s.piatti.dimensione_pt, 0.5)}</label></div>
      <div class="mt-g3"><label>Allineamento${sel("allineamento", ["center", "left"], s.allineamento)}</label><label>Decorazione${txt("decorazione.simbolo", s.decorazione.simbolo)}</label><label>Dove${sel("decorazione.posizione", ["basso", "alto", "entrambi"], s.decorazione.posizione)}</label></div>
      <label>Frase in fondo${txt("piede.testo", s.piede.testo)}</label>
      <label class="mt-ck"><input type="checkbox" id="mt-pred" ${modello.predefinito ? "checked" : ""}> Modello predefinito di questa sede</label>
      <div class="mt-az"><button type="button" class="mt-sec" id="mt-del">Archivia</button><button type="button" class="mt-pri" id="mt-salva">💾 Salva modello</button></div>`;
    f.querySelectorAll("[data-k]").forEach((el) => el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => {
      const sp = unisci(BASE, modello.spec || {});
      const path = el.dataset.k.split(".");
      let o = sp; for (let i = 0; i < path.length - 1; i++) o = o[path[i]] = { ...(o[path[i]] || {}) };
      let v = el.type === "checkbox" ? el.checked : el.type === "number" ? Number(el.value) : el.value;
      o[path[path.length - 1]] = v;
      if (el.dataset.k === "formato.nome" && FORMATI[v]) { sp.formato.larghezza_mm = FORMATI[v][0]; sp.formato.altezza_mm = FORMATI[v][1]; }
      modello.spec = sp;
      if (el.dataset.k === "formato.nome") disegnaForm();
      anteprima();
    }));
    f.querySelector("#mt-salva").addEventListener("click", async () => {
      const pred = f.querySelector("#mt-pred").checked;
      if (pred) await sb().from("menu_stampa_modelli").update({ predefinito: false }).eq("azienda_id", az).eq("sede_id", modello.sede_id || sedeAttiva).neq("id", modello.id);
      const { error } = await sb().from("menu_stampa_modelli").update({ nome: f.querySelector("#mt-nome").value.trim() || modello.nome, tipo_evento: f.querySelector("#mt-tipo").value.trim() || null,
        spec: modello.spec, predefinito: pred, sede_id: modello.sede_id || sedeAttiva, updated_at: new Date().toISOString() }).eq("id", modello.id);
      if (error) { alert("Non salvato: " + error.message); return; }
      modello.nome = f.querySelector("#mt-nome").value.trim() || modello.nome; modello.predefinito = pred;
      if (pred) modelli.forEach((x) => { if (x.id !== modello.id && x.sede_id === modello.sede_id) x.predefinito = false; });
      riempiModelli(); alert("Modello salvato.");
    });
    f.querySelector("#mt-del").addEventListener("click", async () => {
      if (!confirm("Archiviare questo modello?")) return;
      await sb().from("menu_stampa_modelli").update({ attivo: false }).eq("id", modello.id);
      modelli = modelli.filter((x) => x.id !== modello.id); modello = scegliModello(dati.sede || sedeAttiva); riempiModelli(); disegnaForm(); anteprima();
    });
  }

  await caricaEvento();
  if (par.get("modifica")) $("#mt-ed").open = true;
}

function stile() {
  return `
  .mt{max-width:820px;margin:0 auto;padding:16px 14px 110px;}
  .mt-h{margin:0;font-size:22px;font-weight:800;}
  .mt-sub{font-size:13.5px;color:#64748b;margin:4px 0 12px;}
  .mt label{display:block;font-size:12px;font-weight:700;color:#64748b;margin-top:8px;}
  .mt-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px;font-size:15px;font-family:inherit;background:#fff;color:#0f172a;margin-top:3px;}
  .mt-col{padding:2px;height:40px;}
  .mt-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .mt-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
  .mt-ck{display:flex!important;gap:6px;align-items:center;font-size:13px!important;}
  .mt-anteprima{background:#e9e5dc;border-radius:14px;padding:8px;margin:12px 0;overflow:hidden;}
  #mt-scala{transform-origin:top left;}
  #mt-scala .mt-pagina{box-shadow:0 6px 20px rgba(0,0,0,.18);}
  .mt-pri{width:100%;border:0;border-radius:12px;padding:13px;background:#0E5A7A;color:#fff;font-size:15px;font-weight:800;cursor:pointer;margin-top:10px;}
  .mt-sec{border:1.5px solid #cbd5e1;background:#fff;border-radius:12px;padding:12px;font-weight:700;color:#b91c1c;cursor:pointer;margin-top:10px;}
  .mt-az{display:flex;gap:8px;} .mt-az .mt-pri{flex:2;} .mt-az .mt-sec{flex:1;}
  .mt-ed{margin-top:14px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;}
  .mt-ed summary{font-weight:800;color:#0E5A7A;cursor:pointer;}`;
}
