// VISITE — EVENTI › 📅 Visite in location
// v2: "+ Nuova visita" per segnare a mano quelle prese al telefono (origine telefono).
// v3 (16/11/2026): nello stesso calendario arrivano i COLLOQUI prenotati dai candidati (tipo='colloquio').
//   Sotto ogni colloquio, solo per gli admin, la scheda di Tony di quel candidato: domande, risposta buona, campanello,
//   punti da chiarire e prova pratica. Si apre con <details>, cosi' l'elenco resta corto.
// v4 (18/11/2026): "📅 Sposta" sotto ogni appuntamento futuro (resta lo stesso appuntamento: un colloquio resta col candidato)
//   con il messaggio al cliente modificabile, inviato da appuntamento-sposta (email sempre, WhatsApp se nella finestra 24h).
//   "🚫 Chiudi un giorno": visite_config.chiusure, il calendario pubblico non offre orari in quei giorni.
// Appuntamenti prenotati dalle landing (visite_appuntamenti) e impostazioni del calendario (visite_config): orari interni, durata, link.
const LINK = "https://app.ristoflow-ai.com/visita.html?p=";
const sb = () => window.supabaseClient || window.supabase;
const az = () => window.state?.azienda?.id;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (i) => document.getElementById(i);
const GG = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
let S = { cand: {}, cfg: null, slug: "", prossime: [], passate: [], tab: "prossime", nuova: false, nG: "", nOre: [], sposta: null, sG: "", sO: "", sOre: [], sMsgMod: false, chiudi: false };
const FN_SPOSTA = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/appuntamento-sposta";
const primoNome = (n) => String(n || "").trim().split(/\s+/)[0] || "";
function msgSposta(v, g, h) {
  const prima = giorno(v.inizio) + " alle " + ora(v.inizio);
  const dopo = g && h ? new Date(g + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) + " alle " + h : "…";
  return v.tipo === "colloquio"
    ? "Ciao " + primoNome(v.nome) + ", ti scriviamo per spostare il tuo colloquio di " + prima + " a " + dopo + ". Ci scusiamo per il cambio.\n\nSe il nuovo orario non ti va bene, scrivici e troviamo un'altra soluzione. A presto!"
    : "Buongiorno " + v.nome + ", vi scriviamo per spostare la vostra visita di " + prima + " a " + dopo + ". Ci scusiamo per il cambio.\n\nSe il nuovo orario non vi va bene, scriveteci e troviamo un'altra soluzione. A presto!";
}
const giorno = (d) => new Date(d).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });
const ora = (d) => new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const wa = (t) => { const x = String(t || "").replace(/[^0-9]/g, ""); return x ? "https://wa.me/" + (x.length <= 10 ? "39" + x : x) : ""; };

export async function render(app) {
  app.innerHTML = '<section class="view vi-v">' + CSS + '<div id="viC"><p class="vi-m">Carico…</p></div></section>';
  await carica(); disegna();
}
async function carica() {
  const a = az(), ora0 = new Date(Date.now() - 2 * 3600000).toISOString();
  const [cfg, azi, pr, pa] = await Promise.all([
    sb().from("visite_config").select("*").eq("azienda_id", a).maybeSingle(),
    sb().from("aziende").select("slug").eq("id", a).maybeSingle(),
    sb().from("visite_appuntamenti").select("*").eq("azienda_id", a).gte("inizio", ora0).neq("stato", "annullato").order("inizio").limit(200),
    sb().from("visite_appuntamenti").select("*").eq("azienda_id", a).lt("inizio", ora0).order("inizio", { ascending: false }).limit(40),
  ]);
  S.cfg = cfg.data || null; S.slug = azi.data?.slug || ""; S.prossime = pr.data || []; S.passate = pa.data || [];
  // schede colloquio dei candidati (solo admin: dentro ci sono le valutazioni)
  S.cand = {};
  const ids = S.prossime.concat(S.passate).map((v) => v.candidatura_id).filter(Boolean);
  if (ids.length && admin()) {
    const { data } = await sb().from("candidature").select("id, nome, cognome, ruolo_desiderato, relazione_finale").in("id", ids);
    (data || []).forEach((c) => { S.cand[c.id] = c; });
  }
}
const admin = () => ["admin", "superadmin"].indexOf(window.state?.ruolo) >= 0 || !!window.state?.is_superadmin;
function scheda(c) {
  const r = (c && c.relazione_finale) || {};
  const qs = (r.domande_colloquio || []).concat(r.domande_mestiere || []);
  if (!qs.length) return '<div class="vi-m" style="margin-top:6px">📋 Scheda colloquio non ancora pronta per questo candidato.</div>';
  const blocco = (titolo, lista, da) => !lista || !lista.length ? "" : '<div class="vi-st">' + titolo + "</div>" + lista.map((q, i) =>
    '<div class="vi-q"><b>' + (da + i) + ". " + esc(q.domanda) + "</b>" + (q.perche ? '<div class="vi-m">Perché: ' + esc(q.perche) + "</div>" : "") +
    (q.risposta_buona ? '<div class="vi-ok">✅ ' + esc(q.risposta_buona) + "</div>" : "") + (q.campanello ? '<div class="vi-ko">⚠️ ' + esc(q.campanello) + "</div>" : "") + "</div>").join("");
  const n1 = (r.domande_colloquio || []).length;
  return '<details class="vi-sc"><summary>📋 Domande per ' + esc(c.nome) + " (" + qs.length + ")</summary>" +
    blocco("Su di lui", r.domande_colloquio, 1) + blocco("Di mestiere", r.domande_mestiere, n1 + 1) +
    (Array.isArray(r.dubbi) && r.dubbi.length ? '<div class="vi-st">Da chiarire</div><ul class="vi-ul">' + r.dubbi.map((d) => "<li>" + esc(d) + "</li>").join("") + "</ul>" : "") +
    (r.prova_pratica ? '<div class="vi-st">Prova pratica</div><div class="vi-q">' + esc(typeof r.prova_pratica === "string" ? r.prova_pratica : JSON.stringify(r.prova_pratica)) + "</div>" : "") +
    "</details>";
}
function riga(v, passata) {
  if (S.sposta === v.id) return formSposta(v);
  const st = { confermato: "", fatto: "✅ Fatta", non_venuto: "🚫 Non venuti", annullato: "❌ Annullata" }[v.stato] || "";
  return '<div class="vi-ap"><div class="vi-ora">' + ora(v.inizio) + '</div><div style="flex:1;min-width:0"><b>' + esc(v.nome) + "</b>" + (st ? ' <span class="vi-m">· ' + st + "</span>" : "") +
    '<div class="vi-m">' + [v.tipo_evento, v.data_evento ? "evento " + v.data_evento : "", v.invitati ? v.invitati + " invitati" : ""].filter(Boolean).map(esc).join(" · ") + "</div>" +
    (v.note ? '<div class="vi-m">“' + esc(v.note) + "”</div>" : "") +
    (v.tipo === "colloquio" && v.candidatura_id && admin() ? '<button class="vi-live" data-live="' + esc(v.candidatura_id) + '" data-app="' + v.id + '">🗣 Apri il colloquio dal vivo</button>' + scheda(S.cand[v.candidatura_id]) : "") +
    '<div class="vi-az">' + (v.telefono ? '<a class="vi-btn s" href="tel:' + esc(v.telefono) + '">📞</a>' + (wa(v.telefono) ? '<a class="vi-btn s" target="_blank" href="' + wa(v.telefono) + '">WhatsApp</a>' : "") : "") +
    (v.email ? '<a class="vi-btn s" href="mailto:' + esc(v.email) + '">✉️</a>' : "") +
    (v.stato === "confermato" ? (passata || new Date(v.inizio) < new Date() ? '<button class="vi-btn s" data-st="fatto" data-id="' + v.id + '">✅ Fatta</button><button class="vi-btn s" data-st="non_venuto" data-id="' + v.id + '">🚫 Non venuti</button>' : "") + (new Date(v.inizio) > new Date() ? '<button class="vi-btn s" data-sposta="' + v.id + '">📅 Sposta</button>' : "") + '<button class="vi-btn s r" data-st="annullato" data-id="' + v.id + '">Annulla</button>' : "") +
    "</div></div></div>";
}
function elenco(lista, passata) {
  if (!lista.length) return '<p class="vi-m">' + (passata ? "Nessuna visita passata." : "Nessuna visita in programma.") + "</p>";
  let h = "", g = "";
  lista.forEach((v) => { const d = giorno(v.inizio); if (d !== g) { g = d; h += '<div class="vi-g">' + esc(d) + "</div>"; } h += riga(v, passata); });
  return h;
}
async function cambiaGiorno(g) {
  const keep = {}; ["nvN", "nvT", "nvE", "nvTipo", "nvI", "nvD", "nvNote"].forEach((i) => { if ($(i)) keep[i] = $(i).value; });
  S.nG = g; await caricaOre(g); disegna(); Object.keys(keep).forEach((i) => { if ($(i)) $(i).value = keep[i]; });
}
function disegna() {
  const c = S.cfg || { attivo: false, durata_min: 45, fasce: [], anticipo_ore: 12, giorni_avanti: 60 };
  let h = '<div style="margin-bottom:10px"><button class="app-button small gray" onclick="window.location.hash=\'#/preventivi\'">← Preventivi</button></div>' +
    '<h2>📅 Visite in location</h2><p class="vi-m">Le coppie e i clienti prenotano da soli la visita dalle vostre pagine: vedono solo gli orari ancora liberi.</p>' +
    '<div class="vi-tabs"><button data-tab="prossime" class="' + (S.tab === "prossime" ? "on" : "") + '">In programma (' + S.prossime.length + ')</button><button data-tab="passate" class="' + (S.tab === "passate" ? "on" : "") + '">Passate</button><button data-tab="imp" class="' + (S.tab === "imp" ? "on" : "") + '">Impostazioni</button></div>';
  if (S.tab === "prossime") {
    h += S.nuova ? formNuova() : '<button class="vi-btn p" id="viNuova" style="width:100%;margin-bottom:4px">+ Nuova visita (presa al telefono)</button>';
    h += S.chiudi ? formChiudi() : '<button class="vi-btn" id="viChiudi" style="width:100%;margin-bottom:4px">🚫 Chiudi un giorno' + ((S.cfg?.chiusure || []).filter((d) => d >= oggiIso()).length ? " (" + (S.cfg.chiusure.filter((d) => d >= oggiIso()).length) + " chiusi)" : "") + "</button>";
    h += '<div class="vi-card">' + elenco(S.prossime, false) + "</div>";
  }
  else if (S.tab === "passate") h += '<div class="vi-card">' + elenco(S.passate, true) + "</div>";
  else {
    h += '<div class="vi-card ' + (c.attivo ? "on" : "") + '"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b>' + (c.attivo ? "🟢 Visite online attive" : "⚪ Visite online spente") + '</b><div class="vi-m">' + (c.attivo ? "Chi apre il link può prenotare." : "Il link mostra «non ancora attive».") + '</div></div><button class="vi-btn ' + (c.attivo ? "" : "p") + '" id="viAtt">' + (c.attivo ? "Spegni" : "Accendi") + "</button></div></div>";
    h += '<div class="vi-card"><b>Orari per le visite</b><p class="vi-m">Interni: il cliente vede solo gli orari liberi, uno per volta.</p><div id="viFasce">' +
      (c.fasce || []).map((f, i) => '<div class="vi-fa" data-i="' + i + '"><div class="vi-gg">' + GG.map((n, k) => '<label><input type="checkbox" data-g="' + (k + 1) + '"' + ((f.giorni || []).indexOf(k + 1) >= 0 ? " checked" : "") + ">" + n + "</label>").join("") +
        '</div><div class="vi-dd">dalle <input type="time" data-k="dalle" value="' + esc(f.dalle) + '"> alle <input type="time" data-k="alle" value="' + esc(f.alle) + '"><button class="vi-btn s r" data-tolgo="' + i + '">✕</button></div></div>').join("") +
      '</div><button class="vi-btn s" id="viAgg">+ Aggiungi orari</button>' +
      '<div class="vi-due"><label class="vi-f"><span>Durata di una visita (minuti)</span><input type="number" min="15" max="240" step="5" id="viDur" value="' + esc(c.durata_min) + '"></label>' +
      '<label class="vi-f"><span>Prenotabile almeno (ore prima)</span><input type="number" min="0" max="168" id="viAnt" value="' + esc(c.anticipo_ore) + '"></label></div>' +
      '<label class="vi-f"><span>Il calendario si vede fino a (giorni)</span><input type="number" min="7" max="365" id="viAv" value="' + esc(c.giorni_avanti) + '"></label></div>';
    h += '<div class="vi-card"><b>Cosa vede il cliente</b><label class="vi-f"><span>Titolo</span><input id="viTit" value="' + esc(c.titolo || "Prenotate la vostra visita") + '"></label>' +
      '<label class="vi-f"><span>Indirizzo (per la mappa e l’email)</span><input id="viLuogo" value="' + esc(c.luogo || "") + '"></label>' +
      '<label class="vi-f"><span>Indicazioni (parcheggio, dove trovarvi…)</span><textarea id="viInd" rows="2">' + esc(c.indicazioni || "") + "</textarea></label>" +
      '<button class="vi-btn p" id="viSalva">Salva</button> <span class="vi-m" id="viOk"></span></div>';
    if (S.slug) {
      const L = [["Tutti gli eventi", ""], ["Matrimonio", "Matrimonio"], ["Feste (comunione, 18 anni…)", "Comunione"]];
      h += '<div class="vi-card"><b>I vostri link</b><p class="vi-m">Da mettere sulle landing, nelle email e negli annunci.</p>' + L.map((x, i) => { const u = LINK + encodeURIComponent(S.slug) + (x[1] ? "&tipo=" + encodeURIComponent(x[1]) : ""); return '<div class="vi-ln"><div style="flex:1;min-width:0"><b>' + esc(x[0]) + '</b><div class="vi-url">' + esc(u) + '</div></div><button class="vi-btn s" data-cp="' + esc(u) + '">Copia</button><a class="vi-btn s" target="_blank" href="' + esc(u) + '">Apri</a></div>'; }).join("") + "</div>";
    }
  }
  $("viC").innerHTML = h; $("viC").onclick = clic;
  if ($("nvG")) $("nvG").onchange = (e) => cambiaGiorno(e.target.value);
  if ($("spG")) $("spG").onchange = async (e) => { const m = $("spMsg").value; S.sG = e.target.value; S.sO = ""; await caricaOreSposta(S.sG, S.sposta); disegna(); if (S.sMsgMod) $("spMsg").value = m; };
  if ($("spO")) $("spO").onchange = (e) => { S.sO = e.target.value; aggiornaMsg(); };
  if ($("spMsg")) $("spMsg").oninput = () => { S.sMsgMod = true; };
}
const p2 = (n) => (n < 10 ? "0" : "") + n;
const oggiIso = () => { const d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); };
function orariGiorno(g) {
  const c = S.cfg || {}, dur = Number(c.durata_min || 45), w = new Date(g + "T12:00:00").getDay() || 7, out = [];
  (c.fasce || []).forEach((f) => { if ((f.giorni || []).indexOf(w) < 0) return; const a = f.dalle.split(":").map(Number), b = f.alle.split(":").map(Number);
    for (let m = a[0] * 60 + a[1]; m + dur <= b[0] * 60 + b[1]; m += dur) out.push(p2(Math.floor(m / 60)) + ":" + p2(m % 60)); });
  return out.sort();
}
async function caricaOre(g) {
  const ini = new Date(g + "T00:00:00"), fin = new Date(ini.getTime() + 86400000);
  const { data } = await sb().from("visite_appuntamenti").select("inizio").eq("azienda_id", az()).neq("stato", "annullato").gte("inizio", ini.toISOString()).lt("inizio", fin.toISOString());
  const prese = (data || []).map((x) => ora(x.inizio));
  S.nOre = orariGiorno(g).filter((h) => prese.indexOf(h) < 0 && new Date(g + "T" + h + ":00") > new Date());
}
function formSposta(v) {
  const giornoChiuso = S.sG && (S.cfg?.chiusure || []).indexOf(S.sG) >= 0;
  return '<div class="vi-card" style="border-color:#023C59;border-width:2px"><b>📅 Sposta: ' + esc(v.nome) + '</b><div class="vi-m">Ora: ' + esc(giorno(v.inizio) + " alle " + ora(v.inizio)) + (v.tipo_evento ? " · " + esc(v.tipo_evento) : "") + "</div>" +
    '<div class="vi-due"><label class="vi-f"><span>Nuovo giorno</span><input type="date" id="spG" min="' + oggiIso() + '" value="' + esc(S.sG) + '"></label>' +
    '<label class="vi-f"><span>Nuova ora</span><input type="time" id="spO" step="300" value="' + esc(S.sO) + '"></label></div>' +
    (S.sG ? '<div class="vi-m" style="margin:-2px 0 4px">' + (giornoChiuso ? "⚠️ Questo giorno è chiuso nel calendario: puoi comunque segnarlo a mano." : S.sOre.length ? "Orari liberi:" : "Nessun orario libero nelle vostre fasce: scrivi l’ora a mano.") + "</div>" + '<div class="vi-az">' + S.sOre.map((h) => '<button class="vi-btn s' + (h === S.sO ? " p" : "") + '" data-sora="' + h + '">' + h + "</button>").join("") + "</div>" : "") +
    '<label class="vi-f"><span>Messaggio che arriva ' + (v.tipo === "colloquio" ? "al candidato" : "al cliente") + ' (puoi modificarlo)</span><textarea id="spMsg" rows="6">' + esc(msgSposta(v, S.sG, S.sO)) + "</textarea></label>" +
    '<label style="display:flex;gap:8px;align-items:center;font-size:14px;margin:4px 0 8px"><input type="checkbox" id="spAvv" checked> Invia il messaggio</label>' +
    '<div class="vi-m" style="margin-bottom:8px">' + (v.email ? "✉️ Arriva per email a " + esc(v.email) + ", con l’appuntamento da aggiungere al calendario." : "⚠️ Nessuna email: ") + (v.telefono ? " Su WhatsApp parte solo se ci ha scritto nelle ultime 24 ore." : "") + "</div>" +
    '<div class="vi-m" id="spErr" style="color:#b42318"></div><button class="vi-btn p" id="spOk">Sposta</button> <button class="vi-btn" id="spAnn">Lascia com’è</button></div>';
}
function formChiudi() {
  const ch = (S.cfg?.chiusure || []).filter((d) => d >= oggiIso()).sort();
  return '<div class="vi-card"><b>🚫 Giorni chiusi</b><p class="vi-m">In questi giorni il calendario non offre orari, né per le visite né per i colloqui.</p>' +
    (ch.length ? ch.map((d) => '<div class="vi-ln"><div style="flex:1;text-transform:capitalize">' + esc(new Date(d + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })) + '</div><button class="vi-btn s" data-riapri="' + d + '">Riapri</button></div>').join("") : '<p class="vi-m">Nessun giorno chiuso.</p>') +
    '<div class="vi-due" style="align-items:end"><label class="vi-f"><span>Chiudi il giorno</span><input type="date" id="chG" min="' + oggiIso() + '"></label><div style="margin:8px 0"><button class="vi-btn p" id="chOk" style="width:100%">Chiudi</button></div></div>' +
    '<div class="vi-m" id="chMsg"></div><button class="vi-btn s" id="chAnn">Fatto</button></div>';
}
async function caricaOreSposta(g, escludi) {
  const ini = new Date(g + "T00:00:00"), fin = new Date(ini.getTime() + 86400000);
  const { data } = await sb().from("visite_appuntamenti").select("id, inizio").eq("azienda_id", az()).neq("stato", "annullato").gte("inizio", ini.toISOString()).lt("inizio", fin.toISOString());
  const prese = (data || []).filter((x) => x.id !== escludi).map((x) => ora(x.inizio));
  S.sOre = (S.cfg?.chiusure || []).indexOf(g) >= 0 ? [] : orariGiorno(g).filter((h) => prese.indexOf(h) < 0 && new Date(g + "T" + h + ":00") > new Date());
}
function aggiornaMsg() {
  const v = S.prossime.find((x) => x.id === S.sposta); if (!v || S.sMsgMod || !$("spMsg")) return;
  $("spMsg").value = msgSposta(v, S.sG, S.sO);
}
function formNuova() {
  const tipi = ["Matrimonio", "Comunione", "Cresima", "Battesimo", "Compleanno", "18 anni", "Laurea", "Cena aziendale", "Altro"];
  return '<div class="vi-card"><b>Nuova visita</b><p class="vi-m">Per le visite prese al telefono o di persona.</p>' +
    '<div class="vi-due"><label class="vi-f"><span>Giorno</span><input type="date" id="nvG" min="' + oggiIso() + '" value="' + esc(S.nG) + '"></label>' +
    '<label class="vi-f"><span>Ora</span><input type="time" id="nvO" step="300"></label></div>' +
    (S.nG ? '<div class="vi-m" style="margin:-2px 0 4px">' + (S.nOre.length ? "Orari liberi:" : "Nessun orario libero nelle vostre fasce: scrivete l’ora a mano.") + "</div>" + '<div class="vi-az">' + S.nOre.map((h) => '<button class="vi-btn s" data-ora="' + h + '">' + h + "</button>").join("") + "</div>" : "") +
    '<label class="vi-f"><span>Nomi</span><input id="nvN" placeholder="Es. Giulia e Marco"></label>' +
    '<div class="vi-due"><label class="vi-f"><span>Telefono</span><input id="nvT" type="tel"></label><label class="vi-f"><span>Email</span><input id="nvE" type="email"></label></div>' +
    '<div class="vi-due"><label class="vi-f"><span>Evento</span><select id="nvTipo" style="width:100%;min-height:40px;border:1px solid #e2e8f0;border-radius:9px;padding:8px;font:inherit">' + tipi.map((t) => "<option>" + t + "</option>").join("") + "</select></label>" +
    '<label class="vi-f"><span>Invitati</span><input id="nvI" type="number" min="1"></label></div>' +
    '<label class="vi-f"><span>Data dell’evento (anche indicativa)</span><input id="nvD" placeholder="Es. giugno 2027"></label>' +
    '<label class="vi-f"><span>Note</span><input id="nvNote"></label>' +
    '<div class="vi-m" id="nvErr" style="color:#b42318"></div><button class="vi-btn p" id="nvSalva">Salva la visita</button> <button class="vi-btn" id="nvAnn">Annulla</button></div>';
}
function leggiFasce() {
  return [...document.querySelectorAll(".vi-fa")].map((r) => ({ giorni: [...r.querySelectorAll("input[data-g]:checked")].map((x) => +x.dataset.g), dalle: r.querySelector('[data-k="dalle"]').value, alle: r.querySelector('[data-k="alle"]').value })).filter((f) => f.giorni.length && f.dalle && f.alle && f.dalle < f.alle);
}
async function salva(campi) {
  if (S.cfg) { const r = await sb().from("visite_config").update(Object.assign({ updated_at: new Date().toISOString() }, campi)).eq("azienda_id", az()).select("*").single(); if (!r.error) S.cfg = r.data; return r; }
  const r = await sb().from("visite_config").insert(Object.assign({ azienda_id: az() }, campi)).select("*").single(); if (!r.error) S.cfg = r.data; return r;
}
async function clic(e) {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.live) { const m = await import("../components/colloquio-live.js?v=" + (window.APP_V || "1")); m.apriColloquioLive(t.dataset.live, { appuntamentoId: Number(t.dataset.app) || null }); return; }
  if (t.dataset.tab) { S.tab = t.dataset.tab; disegna(); return; }
  if (t.dataset.sposta) { S.sposta = +t.dataset.sposta; S.sG = ""; S.sO = ""; S.sOre = []; S.sMsgMod = false; disegna(); return; }
  if (t.id === "spAnn") { S.sposta = null; disegna(); return; }
  if (t.dataset.sora) { const m = $("spMsg").value; S.sO = t.dataset.sora; disegna(); if (S.sMsgMod) $("spMsg").value = m; else aggiornaMsg(); return; }
  if (t.id === "spOk") {
    const g = $("spG").value, h = $("spO").value;
    if (!g || !h) { $("spErr").textContent = "Scegli giorno e ora."; return; }
    t.disabled = true; t.textContent = "Sposto…";
    try {
      const { data: ses } = await sb().auth.getSession();
      const r = await fetch(FN_SPOSTA, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (ses?.session?.access_token || "") },
        body: JSON.stringify({ id: S.sposta, giorno: g, ora: h, messaggio: $("spMsg").value, avvisa: $("spAvv").checked }) });
      const d = await r.json();
      if (!d.ok) { $("spErr").textContent = d.errore || "Non spostato"; t.disabled = false; t.textContent = "Sposta"; return; }
      const parti = ["✅ Spostato a " + d.quando + "."];
      if ($("spAvv").checked) {
        parti.push(d.email?.ok ? "✉️ Email inviata." : "✉️ Email non inviata" + (d.email?.motivo ? " (" + d.email.motivo + ")" : "") + ".");
        parti.push(d.whatsapp?.ok ? "💬 WhatsApp inviato." : "💬 WhatsApp non inviato" + (d.whatsapp?.motivo ? " (" + d.whatsapp.motivo + ")" : "") + ": se serve, scrivigli dal telefono.");
      }
      S.sposta = null; await carica(); disegna(); alert(parti.join("\n"));
    } catch (er) { $("spErr").textContent = er.message; t.disabled = false; t.textContent = "Sposta"; }
    return;
  }
  if (t.id === "viChiudi") { S.chiudi = true; disegna(); return; }
  if (t.id === "chAnn") { S.chiudi = false; disegna(); return; }
  if (t.id === "chOk" || t.dataset.riapri) {
    const d = t.dataset.riapri || $("chG").value; if (!d) return;
    const ch = (S.cfg?.chiusure || []).filter((x) => x !== d);
    if (!t.dataset.riapri) ch.push(d);
    const r = await salva({ chiusure: ch.sort() });
    if (r.error) { alert(r.error.message); return; }
    disegna();
    if (!t.dataset.riapri) { const n = S.prossime.filter((v) => v.stato === "confermato" && new Date(v.inizio).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }) === d).length; if (n && $("chMsg")) $("chMsg").textContent = "⚠️ In quel giorno ci sono " + n + " appuntamenti già presi: spostali con 📅 Sposta."; }
    return;
  }
  if (t.id === "viNuova") { S.nuova = true; S.nG = ""; S.nOre = []; disegna(); return; }
  if (t.id === "nvAnn") { S.nuova = false; disegna(); return; }
  if (t.dataset.ora) { $("nvO").value = t.dataset.ora; document.querySelectorAll("[data-ora]").forEach((x) => x.classList.toggle("p", x === t)); return; }
  if (t.id === "nvSalva") {
    const g = $("nvG").value, h = $("nvO").value, n = $("nvN").value.trim();
    if (!g || !h || !n) { $("nvErr").textContent = "Servono giorno, ora e nomi."; return; }
    const ini = new Date(g + "T" + h + ":00"), fine = new Date(ini.getTime() + Number((S.cfg || {}).durata_min || 45) * 60000);
    t.disabled = true;
    const { error } = await sb().from("visite_appuntamenti").insert({ azienda_id: az(), inizio: ini.toISOString(), fine: fine.toISOString(), nome: n,
      telefono: $("nvT").value.trim() || null, email: $("nvE").value.trim() || null, tipo_evento: $("nvTipo").value, invitati: parseInt($("nvI").value, 10) || null,
      data_evento: $("nvD").value.trim() || null, note: $("nvNote").value.trim() || null, origine: "telefono" });
    if (error) { t.disabled = false; $("nvErr").textContent = /duplicate|unique/i.test(error.message) ? "A quell’ora c’è già una visita: scegliete un altro orario." : error.message; return; }
    S.nuova = false; await carica(); disegna(); return;
  }
  if (t.dataset.cp) { try { await navigator.clipboard.writeText(t.dataset.cp); t.textContent = "✓"; } catch (_) { prompt("Copiate il link:", t.dataset.cp); } return; }
  if (t.id === "viAtt") { const r = await salva({ attivo: !(S.cfg && S.cfg.attivo) }); if (r.error) alert(r.error.message); disegna(); return; }
  if (t.id === "viAgg") { S.cfg = Object.assign({}, S.cfg || {}, { fasce: leggiFasce().concat([{ giorni: [6, 7], dalle: "09:30", alle: "12:30" }]) }); disegna(); return; }
  if (t.dataset.tolgo !== undefined) { const f = leggiFasce(); f.splice(+t.dataset.tolgo, 1); S.cfg = Object.assign({}, S.cfg || {}, { fasce: f }); disegna(); return; }
  if (t.id === "viSalva") {
    const r = await salva({ fasce: leggiFasce(), durata_min: +$("viDur").value || 45, anticipo_ore: +$("viAnt").value || 0, giorni_avanti: +$("viAv").value || 60, titolo: $("viTit").value.trim() || null, luogo: $("viLuogo").value.trim() || null, indicazioni: $("viInd").value.trim() || null });
    $("viOk").textContent = r.error ? "Non salvato: " + r.error.message : "✓ Salvato"; return;
  }
  if (t.dataset.st) {
    const st = t.dataset.st, id = +t.dataset.id;
    if (st === "annullato" && !confirm("Annullo l’appuntamento? L’orario torna libero.")) return;
    const { error } = await sb().from("visite_appuntamenti").update(st === "annullato" ? { stato: st, annullato_da: "locale" } : { stato: st }).eq("id", id);
    if (error) { alert(error.message); return; }
    await carica(); disegna();
  }
}
const CSS = '<style>.vi-v{max-width:680px;box-sizing:border-box}.vi-v *{box-sizing:border-box}.vi-m{color:#64748b;font-size:13px}' +
  '.vi-tabs{display:flex;gap:6px;margin:12px 0}.vi-tabs button{flex:1;border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:9px 6px;font:inherit;font-weight:600;font-size:14px;cursor:pointer}.vi-tabs button.on{background:#023C59;color:#fff;border-color:#023C59}' +
  '.vi-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:10px 0}.vi-card.on{border-color:#16a34a;background:#f0fdf4}' +
  '.vi-g{font-weight:700;text-transform:capitalize;margin:14px 0 4px;color:#023C59}.vi-g:first-child{margin-top:0}' +
  '.vi-ap{display:flex;gap:12px;border-top:1px solid #f1f5f9;padding:10px 0}.vi-ora{font-weight:700;font-size:18px;min-width:56px}.vi-az{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
  '.vi-btn{display:inline-block;border:1px solid #e2e8f0;background:#fff;color:#0f172a;border-radius:10px;padding:9px 13px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}.vi-btn.p{background:#023C59;color:#fff;border-color:#023C59}.vi-btn.s{padding:6px 10px;font-size:13px}.vi-btn.r{color:#b42318}' +
  '.vi-fa{border-top:1px solid #f1f5f9;padding:8px 0}.vi-gg{display:flex;flex-wrap:wrap;gap:4px}.vi-gg label{border:1px solid #e2e8f0;border-radius:8px;padding:4px 8px;font-size:13px;display:flex;gap:4px;align-items:center}' +
  '.vi-dd{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:14px}.vi-dd input{border:1px solid #e2e8f0;border-radius:8px;padding:6px;font:inherit}' +
  '.vi-f{display:block;margin:8px 0}.vi-f span{display:block;font-size:13px;color:#64748b;margin-bottom:3px}.vi-f input,.vi-f textarea{width:100%;min-height:40px;border:1px solid #e2e8f0;border-radius:9px;padding:8px 10px;font:inherit;font-size:16px}.vi-due{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
  '.vi-live{display:block;width:100%;margin-top:10px;border:none;border-radius:12px;padding:13px;font-weight:800;font-size:15px;background:#f59e0b;color:#fff;cursor:pointer;font-family:inherit}' +
  '.vi-sc{margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;background:#f8fafc}.vi-sc summary{font-weight:700;cursor:pointer;color:#023C59}' +
  '.vi-st{font-weight:700;margin:12px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#475569}.vi-q{font-size:14px;line-height:1.45;margin:8px 0}' +
  '.vi-ok{font-size:13.5px;color:#166534;margin-top:3px}.vi-ko{font-size:13.5px;color:#9a3412;margin-top:3px}.vi-ul{margin:4px 0;padding-left:18px;font-size:13.5px;line-height:1.45}' +
  '.vi-ln{display:flex;align-items:center;gap:6px;border-top:1px solid #f1f5f9;padding:8px 0}.vi-url{font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}</style>';
