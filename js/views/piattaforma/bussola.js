// js/views/piattaforma/bussola.js
// BUSSOLA RISTOFLOW (17/11/2026). Una domanda sola: "Ristoflow sta guadagnando?"
// Stesso cruscotto dei locali: l'arco dice dove vanno le entrate, la lancetta si ferma sul risultato,
// la tacca dorata segna il pareggio. I conti li fa la funzione bussola_piattaforma (solo superadmin):
// qui si disegna e basta. I costi fissi si scrivono al mese direttamente da questa pagina.

const sb = () => window.supabaseClient || window.supabase;
let periodo = "mese", daPers = null, aPers = null;

function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function euro(n) { const v = Math.round(Number(n) || 0); return v.toLocaleString("it-IT") + " €"; }
function euro2(n) { return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

function intervallo(p) {
  const oggi = new Date(), a = iso(oggi);
  if (p === "oggi") return { da: a, a };
  if (p === "settimana") { const d = new Date(oggi); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return { da: iso(d), a }; }
  if (p === "anno") return { da: oggi.getFullYear() + "-01-01", a };
  if (p === "pers" && daPers && aPers) return { da: daPers, a: aPers };
  return { da: iso(new Date(oggi.getFullYear(), oggi.getMonth(), 1)), a };
}
const NOMI_PER = { oggi: "Oggi", settimana: "Settimana", mese: "Mese", anno: "Anno", pers: "Scegli" };

async function dati(per) {
  const { data, error } = await sb().rpc("bussola_piattaforma", { p_da: per.da, p_a: per.a });
  if (error) throw error;
  return data;
}
function somme(d) {
  const e = d.entrate || {}, c = d.costi || {};
  const entrate = (+e.abbonamenti || 0) + (+e.fondatori || 0) + (+e.ricariche_ai || 0);
  const costi = (+c.ai || 0) + (+c.pubblicita || 0) + (+c.provvigioni || 0) + (+c.fissi || 0);
  return { entrate, costi, margine: entrate - costi, ai: +c.ai || 0, var: (+c.pubblicita || 0) + (+c.provvigioni || 0), fissi: +c.fissi || 0 };
}

// arco: rosso AI, arancio pubblicità+provvigioni, oro fissi, verde il resto
function arco(s, piccolo) {
  const R = 118, C = Math.PI * R;
  const base = s.entrate > 0 ? s.entrate : Math.max(s.costi, 1);
  const cum = (v) => Math.max(0, Math.min(1, v / base)) * C;
  const d1 = cum(s.ai), d2 = cum(s.ai + s.var), d3 = cum(s.ai + s.var + s.fissi);
  const fc = Math.max(0, Math.min(1, s.costi / base));
  const punto = (f, r) => { const a = Math.PI * Math.max(0, Math.min(1, f)); return { x: 150 - r * Math.cos(a), y: 150 - r * Math.sin(a) }; };
  const pl = punto(s.entrate > 0 ? fc + (1 - fc) / 2 : 0.02, piccolo ? 92 : 88);
  const t1 = punto(fc, 108), t2 = punto(fc, 130);
  const w = piccolo ? 22 : 19, path = "M32 150 A118 118 0 0 1 268 150";
  const seg = (col, d, cap) => '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (cap ? ' stroke-linecap="round"' : "") + ' stroke-dasharray="' + d.toFixed(1) + " " + C.toFixed(1) + '"/>';
  return '<svg viewBox="0 0 300 168" width="100%">' +
    (piccolo ? "" : '<defs><linearGradient id="bgAi" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#f2a09a"/><stop offset="100%" stop-color="#cf3f36"/></linearGradient><linearGradient id="bgVa" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#f3bd8a"/><stop offset="100%" stop-color="#d97a25"/></linearGradient><linearGradient id="bgFi" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#ecd98c"/><stop offset="100%" stop-color="#c9a81f"/></linearGradient><linearGradient id="bgMa" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#8ed3b0"/><stop offset="100%" stop-color="#1c8a56"/></linearGradient></defs>') +
    '<path d="' + path + '" fill="none" stroke="' + (piccolo ? "#2a3a45" : "#f1f3f5") + '" stroke-width="' + w + '" stroke-linecap="round"/>' +
    (s.entrate > 0 ? seg(piccolo ? "#1c8a56" : "url(#bgMa)", C, true) : "") +
    seg(piccolo ? "#c9a81f" : "url(#bgFi)", d3, false) +
    seg(piccolo ? "#d97a25" : "url(#bgVa)", d2, false) +
    seg(piccolo ? "#cf3f36" : "url(#bgAi)", d1, true) +
    (piccolo ? "" : '<line x1="' + t1.x.toFixed(1) + '" y1="' + t1.y.toFixed(1) + '" x2="' + t2.x.toFixed(1) + '" y2="' + t2.y.toFixed(1) + '" stroke="#b98a3e" stroke-width="3" stroke-linecap="round"/>') +
    '<line x1="150" y1="150" x2="' + pl.x.toFixed(1) + '" y2="' + pl.y.toFixed(1) + '" stroke="' + (piccolo ? "#fff" : "#132029") + '" stroke-width="' + (piccolo ? 7 : 4.5) + '" stroke-linecap="round"/>' +
    '<circle cx="150" cy="150" r="' + (piccolo ? 14 : 12) + '" fill="' + (piccolo ? "#fff" : "#132029") + '"/>' + (piccolo ? "" : '<circle cx="150" cy="150" r="4.5" fill="#fff"/>') +
    "</svg>";
}

// scheda piccola per la home piattaforma: quadrante + margine del mese
export async function montaMini(el) {
  if (!el) return;
  try {
    const d = await dati(intervallo("mese")), s = somme(d);
    const mese = new Date().toLocaleDateString("it-IT", { month: "long" });
    el.innerHTML = '<div class="bs-mini" onclick="location.hash=\'#/bussolaPiattaforma\'">' + arco(s, true) +
      '<div><b>🧭 Bussola Ristoflow</b><small>' + mese.charAt(0).toUpperCase() + mese.slice(1) + " · margine " + (s.margine >= 0 ? "+" : "") + euro(s.margine) + "</small>" +
      (!(d.fissi_elenco || []).length ? '<small style="color:#fbbf24">costi fissi da inserire</small>' : "") + "</div></div>" +
      "<style>.bs-mini{display:flex;align-items:center;gap:12px;background:#132029;color:#fff;border-radius:16px;padding:10px 14px;cursor:pointer;margin-bottom:6px}.bs-mini svg{width:110px;flex-shrink:0}.bs-mini b{display:block;font-size:15px}.bs-mini small{display:block;font-size:12px;color:#9fb0bd;margin-top:2px}</style>";
  } catch (e) { el.innerHTML = ""; console.warn("bussola mini", e); }
}

export async function render(container) {
  container.innerHTML = '<div class="bs"><div class="bs-car">Un attimo…</div></div>' + stile();
  const per = intervallo(periodo);
  let d;
  try { d = await dati(per); } catch (e) { container.innerHTML = '<div class="bs"><div class="bs-car">Errore: ' + esc(e.message) + "</div></div>" + stile(); return; }
  const s = somme(d), e = d.entrate || {}, c = d.costi || {};
  const pc = (v) => s.entrate > 0 ? Math.max(0, v / s.entrate * 100) : 0;
  const fissi = d.fissi_elenco || [];
  const perc = s.entrate > 0 ? Math.round(s.margine / s.entrate * 100) + "% delle entrate" : "nessuna entrata nel periodo";

  container.innerHTML = '<div class="bs">' +
    '<div class="bs-salve">🧭 Bussola Ristoflow<span>tutta la piattaforma · ' + esc(per.da.split("-").reverse().join("/")) + " – " + esc(per.a.split("-").reverse().join("/")) + "</span></div>" +
    '<div class="bs-per">' + Object.keys(NOMI_PER).map(p => '<button data-per="' + p + '" class="' + (p === periodo ? "on" : "") + '">' + NOMI_PER[p] + "</button>").join("") + "</div>" +
    (periodo === "pers" ? '<div class="bs-date"><input type="date" id="bs-da" value="' + per.da + '"><input type="date" id="bs-a" value="' + per.a + '"><button id="bs-vai">Vai</button></div>' : "") +
    '<div class="bs-testa"><span>Entrate</span><b>' + euro(s.entrate) + "</b><i>abbonamenti e servizi, IVA esclusa</i></div>" +
    '<div class="bs-arco">' + arco(s, false) + "</div>" +
    '<div class="bs-bep"><span>Pareggio</span><b>' + euro(s.costi) + "</b></div>" +
    '<div class="bs-marg ' + (s.margine >= 0 ? "su" : "giu") + '"><span>Margine</span><b>' + (s.margine >= 0 ? "+" : "") + euro(s.margine) + "</b><i>" + perc + (fissi.length ? "" : " · senza costi fissi") + "</i></div>" +
    '<div class="bs-tit">Dove vanno le entrate</div>' +
    '<div class="bs-barra"><i style="width:' + pc(s.ai).toFixed(1) + '%;background:#cf3f36"></i><i style="width:' + pc(s.var).toFixed(1) + '%;background:#d97a25"></i><i style="width:' + pc(s.fissi).toFixed(1) + '%;background:#c9a81f"></i><i style="width:' + Math.max(0, pc(s.margine)).toFixed(1) + '%;background:#1c8a56"></i></div>' +
    '<div class="bs-chiavi"><span><i style="background:#cf3f36"></i>Tony e AI ' + Math.round(pc(s.ai)) + '%</span><span><i style="background:#d97a25"></i>Pubblicità e provvigioni ' + Math.round(pc(s.var)) + '%</span><span><i style="background:#c9a81f"></i>Costi fissi ' + (fissi.length ? Math.round(pc(s.fissi)) + "%" : "—") + '</span><span><i style="background:#1c8a56"></i>Margine ' + Math.max(0, Math.round(pc(s.margine))) + "%</span></div>" +

    '<div class="bs-tit">Entrate</div><div class="bs-box">' +
    riga("Abbonamenti", e.abbonamenti_senza_importo ? e.abbonamenti_senza_importo + " senza importo registrato: non contati" : "spalmati sui giorni del periodo", euro2(e.abbonamenti)) +
    riga("Posti Fondatore pagati", (e.fondatori_n || 0) + " nel periodo · " + ((d.posti_fondatore || {}).pagati || 0) + " di " + ((d.posti_fondatore || {}).totali || 20) + " in tutto", euro2(e.fondatori)) +
    riga("Ricariche crediti AI", "", euro2(e.ricariche_ai)) + "</div>" +

    '<div class="bs-tit">Costi</div><div class="bs-box">' +
    riga("Tony e AI", "costo registrato, dollari a " + String(d.cambio_usd_eur || 0.92).replace(".", ","), euro2(c.ai)) +
    riga("Pubblicità Ristoflow", "Meta e Google dell'account Ristoflow", euro2(c.pubblicita)) +
    riga("Provvigioni agenti", "maturate su clienti convertiti nel periodo", euro2(c.provvigioni)) +
    riga("Costi fissi", fissi.length ? fissi.length + " voci, spalmate sui giorni" : "nessuno inserito", fissi.length ? euro2(c.fissi) : '<span style="color:#b98a3e">—</span>') + "</div>" +

    '<details class="bs-apri"' + (fissi.length ? "" : " open") + "><summary><span>Costi fissi al mese</span><em>" + (fissi.length ? euro(fissi.reduce((t, f) => t + (+f.mensile || 0), 0)) + " / mese" : "da inserire") + "</em><b>›</b></summary><div class=\"bs-fissi\">" +
    fissi.map(f => '<div class="bs-f"><span>' + esc(f.descrizione) + "</span><b>" + euro2(f.mensile) + '</b><button data-del="' + f.id + '" title="Togli">✕</button></div>').join("") +
    '<div class="bs-nuovo"><input id="bs-desc" placeholder="Es. Supabase, Anthropic, Openapi"><input id="bs-imp" type="number" step="0.01" min="0" placeholder="€ al mese"><button id="bs-add">＋ Aggiungi</button></div>' +
    "</div></details>" +

    '<div class="bs-tit">Per cliente · paga / costa</div><div class="bs-box">' +
    ((d.clienti || []).length ? d.clienti.map(k => {
      const col = k.paga - k.costa >= 0 ? (k.paga > 0 ? "#1c8a56" : "#132029") : "#cf3f36";
      return riga(k.nome, k.piano || "", '<span style="color:' + col + '">' + euro2(k.paga) + " / " + euro2(k.costa) + "</span>");
    }).join("") : '<div class="bs-r"><span style="color:#8a94a2">Nessun movimento nel periodo</span></div>') + "</div>" +
    "</div>" + stile();

  container.querySelectorAll("[data-per]").forEach(b => b.onclick = () => { periodo = b.dataset.per; render(container); });
  const vai = container.querySelector("#bs-vai");
  if (vai) vai.onclick = () => { daPers = container.querySelector("#bs-da").value; aPers = container.querySelector("#bs-a").value; if (daPers && aPers) render(container); };
  container.querySelector("#bs-add").onclick = async () => {
    const desc = container.querySelector("#bs-desc").value.trim(), imp = parseFloat(container.querySelector("#bs-imp").value);
    if (!desc || !(imp > 0)) { alert("Scrivi cosa è e quanto costa al mese."); return; }
    const { error } = await sb().rpc("bussola_costo_fisso", { p_descrizione: desc, p_mensile: imp });
    if (error) alert(error.message); else render(container);
  };
  container.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Togliere questo costo fisso?")) return;
    const { error } = await sb().rpc("bussola_costo_fisso", { p_descrizione: null, p_mensile: null, p_id: Number(b.dataset.del), p_elimina: true });
    if (error) alert(error.message); else render(container);
  });
}

function riga(t, sotto, val) { return '<div class="bs-r"><span>' + esc(t) + (sotto ? "<em>" + esc(sotto) + "</em>" : "") + "</span><b>" + val + "</b></div>"; }

function stile() {
  return "<style>" +
    ".bs{max-width:560px;margin:0 auto;padding:14px 0 30px;color:#132029;background:#faf9f7}" +
    ".bs-car{padding:40px;text-align:center;color:#8a94a2}" +
    ".bs-salve{padding:0 16px;font-size:20px;font-weight:800}.bs-salve span{display:block;font-size:12px;font-weight:600;color:#8a94a2}" +
    ".bs-per{display:flex;gap:4px;background:#eef0f2;border-radius:10px;padding:3px;margin:12px 16px}" +
    ".bs-per button{flex:1;border:none;background:transparent;padding:7px 0;font-size:12px;font-weight:700;color:#64748b;border-radius:8px;cursor:pointer}.bs-per button.on{background:#fff;color:#0E5A7A}" +
    ".bs-date{display:flex;gap:6px;margin:0 16px 8px}.bs-date input{flex:1;padding:7px;border:1px solid #cbd5e1;border-radius:8px}.bs-date button{padding:7px 12px;border:none;border-radius:8px;background:#0E5A7A;color:#fff;font-weight:700}" +
    ".bs-testa{text-align:center;padding:6px 16px 0}.bs-testa span,.bs-bep span,.bs-marg span{display:block;font-size:9.5px;letter-spacing:2.2px;color:#8a94a2;text-transform:uppercase}" +
    ".bs-testa b{display:block;font-size:30px;font-weight:700;letter-spacing:-.6px;margin-top:2px}.bs-testa i{display:block;font-style:normal;font-size:10px;color:#b6c1cb;margin-top:2px}" +
    ".bs-arco{padding:6px 16px 0;text-align:center}.bs-arco svg{max-width:330px;width:100%}" +
    ".bs-bep{text-align:center;margin:-14px 16px 0}.bs-bep span{display:inline;margin-right:7px}.bs-bep b{font-size:17px;color:#b98a3e}" +
    ".bs-marg{margin:12px 16px 0;border-radius:14px;padding:13px;text-align:center;border:1px solid}.bs-marg.su{background:#eefaf3;border-color:#c3e9d5}.bs-marg.giu{background:#fdf0ef;border-color:#f3ccc9}" +
    ".bs-marg b{display:block;font-size:27px;margin-top:2px}.bs-marg.su b{color:#1c8a56}.bs-marg.giu b{color:#cf3f36}.bs-marg i{display:block;font-style:normal;font-size:11.5px;color:#8a94a2;margin-top:3px}" +
    ".bs-tit{padding:18px 16px 6px;font-size:9.5px;letter-spacing:2px;color:#8a94a2;text-transform:uppercase;font-weight:700}" +
    ".bs-barra{display:flex;height:12px;margin:0 16px;border-radius:7px;overflow:hidden;background:#f1f3f5}" +
    ".bs-chiavi{display:flex;flex-wrap:wrap;gap:6px 14px;padding:8px 16px 0;font-size:12px;color:#5b6b7a}.bs-chiavi i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}" +
    ".bs-box{background:#fff;border:1px solid #e8ecef;border-radius:14px;margin:0 16px 8px;padding:4px 12px}" +
    ".bs-r{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #f1f3f5;font-size:13px}.bs-r:last-child{border:none}.bs-r b{white-space:nowrap}" +
    ".bs-r em{font-style:normal;color:#94a3b8;font-size:11px;display:block}" +
    ".bs-apri{background:#fff;border:1px solid #e8ecef;border-radius:14px;margin:10px 16px 0;overflow:hidden}" +
    ".bs-apri>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:12px 14px;font-weight:700;font-size:14px}.bs-apri>summary::-webkit-details-marker{display:none}" +
    ".bs-apri>summary em{margin-left:auto;font-style:normal;font-weight:600;font-size:13px;color:#b98a3e}.bs-apri>summary b{color:#94a3b8}.bs-apri[open]>summary b{transform:rotate(90deg)}" +
    ".bs-fissi{padding:0 12px 12px}.bs-f{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f3f5;font-size:13px}.bs-f span{flex:1}" +
    ".bs-f button{border:none;background:#f1f5f9;border-radius:6px;padding:3px 7px;cursor:pointer;color:#64748b}" +
    ".bs-nuovo{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.bs-nuovo input{flex:1;min-width:120px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}" +
    ".bs-nuovo button{padding:8px 12px;border:none;border-radius:8px;background:#0E5A7A;color:#fff;font-weight:700;cursor:pointer}" +
    "</style>";
}
