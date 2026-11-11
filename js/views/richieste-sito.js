// RICHIESTE DAL SITO — EVENTI › 🌍 Richieste dal sito
// Matrimoni (wedding_richieste), Cene aziendali (richieste_cene_aziendali) e Viaggi (tour_prenotazioni) di tutte le aziende dell'utente (RLS mie_aziende).
// Pacchetto Campagne: senza la funzione "campagne" la pagina mostra il lucchetto.
const STATI_W = { nuova: "NUOVA", contattata: "CONTATTATA", preventivo_inviato: "PROPOSTA INVIATA", confermata: "CONFERMATA", persa: "PERSA" };
const STATI_C = { nuova: "NUOVA", contattata: "CONTATTATA", preventivo_inviato: "PROPOSTA INVIATA", confermata: "CONFERMATA", persa: "PERSA" };
const STATI_T = { bonifico_in_attesa: "BONIFICO ATTESO", confermata: "CONFERMATA", richiesta_info: "RICHIESTA INFO", annullata: "ANNULLATA", scaduta: "SCADUTA", in_attesa: "IN ATTESA" };
const CLASSE = { nuova: "rs-n", contattata: "rs-c", preventivo_inviato: "rs-c", confermata: "rs-ok", persa: "rs-x", bonifico_in_attesa: "rs-at", richiesta_info: "rs-i", annullata: "rs-x", scaduta: "rs-x", in_attesa: "rs-at" };
const BANDIERA = { us: "🇺🇸", en: "🇬🇧", de: "🇩🇪", es: "🇪🇸", it: "🇮🇹", nl: "🇳🇱", ja: "🇯🇵", fr: "🇫🇷" };
const PARTENZE = [["harvest", "Harvest Edition · 2–11 set 2027"], ["chestnut", "Chestnut Edition · 6–15 ott 2027"], ["olive", "Olive Oil Edition · 10–19 nov 2027"]];

let stato = { scheda: "matrimoni", w: [], t: [], c: [], mostraChiuse: false };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const eur = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n) || 0);
const fa = (d) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); if (m < 60) return m + " min fa"; if (m < 1440) return Math.round(m / 60) + " ore fa"; return new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short" }); };
const tel = (t) => String(t || "").replace(/\D/g, "");
const sb = () => window.supabaseClient || window.supabase;

export async function render(app) {
  const ok = typeof window.hasFeature === "function" ? window.hasFeature("campagne") : true;
  app.innerHTML = '<section class="view rs-v">' + CSS + '<div style="margin-bottom:10px"><button class="app-button small gray" onclick="window.location.hash=\'#/preventivi\'">← Preventivi</button></div>'
    + '<h2>🌍 Richieste dal sito</h2>'
    + (ok ? '<div id="rsK" class="rs-k"></div><div class="rs-tabs"><button data-t="matrimoni">💍 Matrimoni</button><button data-t="cene">🏢 Cene aziendali</button><button data-t="viaggi">✈️ Viaggi</button></div><label class="rs-ch"><input type="checkbox" id="rsChiuse"> Mostra anche chiuse e annullate</label><div id="rsL"><p class="rs-m">Carico le richieste…</p></div>'
      : '<div class="rs-card" style="text-align:center;padding:26px 16px"><div style="font-size:34px">🔒</div><b>Pacchetto Campagne</b><p class="rs-m">Le richieste dalle tue landing (matrimoni, eventi, pacchetti soggiorno), con risposta automatica e campagne Meta e Google gestite da Tony.</p><p><b>99 € al mese</b></p><a class="app-button green" href="https://ristoflow-ai.com" target="_blank" rel="noopener">Attiva il pacchetto Campagne</a></div>')
    + '</section>';
  if (!ok) return;
  app.querySelectorAll(".rs-tabs button").forEach((b) => b.onclick = () => { stato.scheda = b.dataset.t; disegna(); });
  document.getElementById("rsChiuse").onchange = (e) => { stato.mostraChiuse = e.target.checked; disegna(); };
  await carica();
}

async function carica() {
  const [w, t, c] = await Promise.all([
    sb().from("wedding_richieste").select("*").order("created_at", { ascending: false }).limit(300),
    sb().from("tour_prenotazioni").select("*").order("created_at", { ascending: false }).limit(300),
    sb().from("richieste_cene_aziendali").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  stato.c = c.data || [];
  stato.w = (w.data || []).filter((r) => !/^PROVA/i.test(r.nomi || ""));
  stato.t = t.data || [];
  disegna();
}

function bonificoValido(r) { return r.stato === "bonifico_in_attesa" && (!r.scadenza_bonifico || new Date(r.scadenza_bonifico) > new Date()); }

function disegna() {
  const w = stato.w, t = stato.t;
  const daGestire = w.filter((r) => r.stato === "nuova").length + stato.c.filter((r) => r.stato === "nuova").length + t.filter((r) => bonificoValido(r) || r.stato === "richiesta_info").length;
  const attesi = t.filter(bonificoValido).reduce((s, r) => s + Number(r.acconto || 0), 0);
  const consenso = w.filter((r) => r.consenso_whatsapp).length;
  document.getElementById("rsK").innerHTML = '<div><b>' + daGestire + '</b><span>da gestire</span></div><div><b>' + eur(attesi) + '</b><span>acconti attesi</span></div><div><b>' + consenso + '</b><span>con consenso offerte</span></div>';
  document.querySelectorAll(".rs-tabs button").forEach((b) => {
    const n = b.dataset.t === "matrimoni" ? w.filter((r) => r.stato === "nuova").length : b.dataset.t === "cene" ? stato.c.filter((r) => r.stato === "nuova").length : t.filter((r) => bonificoValido(r) || r.stato === "richiesta_info").length;
    b.className = b.dataset.t === stato.scheda ? "on" : ""; b.innerHTML = (b.dataset.t === "matrimoni" ? "💍 Matrimoni" : b.dataset.t === "cene" ? "🏢 Cene aziendali" : "✈️ Viaggi") + (n ? ' <span class="rs-b">' + n + "</span>" : "");
  });
  const L = document.getElementById("rsL");
  L.innerHTML = stato.scheda === "matrimoni" ? listaW() : stato.scheda === "cene" ? listaC() : listaT();
  L.querySelectorAll("[data-sc]").forEach((s) => s.onchange = async () => { await aggiorna("richieste_cene_aziendali", s.dataset.sc, { stato: s.value, aggiornata_at: new Date().toISOString() }); });
  L.querySelectorAll("[data-prevc]").forEach((b) => b.onclick = () => creaPreventivoCena(b.dataset.prevc, b));
  L.querySelectorAll("[data-sw]").forEach((s) => s.onchange = async () => { await aggiorna("wedding_richieste", s.dataset.sw, { stato: s.value }); });
  L.querySelectorAll("[data-prev]").forEach((b) => b.onclick = () => creaPreventivo(b.dataset.prev, b));
  L.querySelectorAll("[data-acc]").forEach((b) => b.onclick = () => accontoRicevuto(b.dataset.acc, b));
  L.querySelectorAll("[data-ann]").forEach((b) => b.onclick = async () => { if (!confirm("Annullo la prenotazione? I posti tornano liberi.")) return; await aggiorna("tour_prenotazioni", b.dataset.ann, { stato: "annullata" }); });
  L.querySelectorAll("[data-st]").forEach((s) => s.onchange = async () => { await aggiorna("tour_prenotazioni", s.dataset.st, { stato: s.value }); });
}

function azioni(nome, telefono, email, consenso, extra) {
  const a = [];
  if (tel(telefono)) a.push('<a class="rs-btn ' + (consenso ? "p" : "") + '" href="https://wa.me/' + tel(telefono) + '" target="_blank" rel="noopener">💬 WhatsApp' + (consenso ? " · consenso offerte" : "") + "</a>");
  if (email) a.push('<a class="rs-btn" href="mailto:' + esc(email) + '">✉️ Email</a>');
  return '<div class="rs-a">' + a.join("") + (extra || "") + "</div>";
}

function listaW() {
  const righe = stato.w.filter((r) => stato.mostraChiuse || ["nuova", "contattata", "preventivo_inviato"].indexOf(r.stato) >= 0);
  if (!righe.length) return '<p class="rs-m">Nessuna richiesta matrimonio da gestire. Arrivano dal modulo "Check your date" di campoanticowedding.it.</p>';
  return righe.map((r) => {
    const opz = Object.keys(STATI_W).map((k) => '<option value="' + k + '"' + (k === r.stato ? " selected" : "") + ">" + STATI_W[k] + "</option>").join("");
    const bozza = r.risposta_auto_at ? "✉️ Bozza automatica inviata " + fa(r.risposta_auto_at) + (String(r.risposta_auto_a || "").indexOf("admin") === 0 ? " agli admin" : " alla coppia")
      : r.risposta_auto_errore ? "⚠️ Bozza non inviata: " + esc(r.risposta_auto_errore) : r.stato === "nuova" ? "✉️ Bozza automatica in arrivo (tra 1 e 2 ore, mai di notte)" : "";
    const prev = r.preventivo_id ? '<a class="rs-btn" href="#/creaPreventivo?id=' + r.preventivo_id + '">📑 Apri preventivo</a>' : '<button class="rs-btn" data-prev="' + r.id + '">📑 Crea preventivo</button>';
    return '<div class="rs-card"><div class="rs-h"><div><b>' + esc(r.nomi) + '</b><div class="rs-m">' + (BANDIERA[String(r.lingua || "").slice(0, 2)] || "🌍") + " " + esc(r.paese || "") + " · " + esc(r.data_matrimonio || "data da definire") + " · " + (r.invitati ? r.invitati + " invitati" : "invitati ?") + (r.utm_source ? " · da " + esc(r.utm_source) : "") + '</div></div><span class="rs-s ' + CLASSE[r.stato] + '">' + STATI_W[r.stato] + " · " + fa(r.created_at) + "</span></div>"
      + (r.messaggio ? '<div class="rs-msg">' + esc(r.messaggio).replace(/\n/g, "<br>") + "</div>" : "")
      + (bozza ? '<div class="rs-m">' + bozza + "</div>" : "")
      + azioni(r.nomi, r.telefono, r.email, r.consenso_whatsapp, prev + '<select class="rs-sel" data-sw="' + r.id + '">' + opz + "</select>") + "</div>";
  }).join("");
}

function listaC() {
  const righe = stato.c.filter((r) => stato.mostraChiuse || ["nuova", "contattata", "preventivo_inviato"].indexOf(r.stato) >= 0);
  if (!righe.length) return '<p class="rs-m">Nessuna richiesta di cena aziendale da gestire. Arrivano dalla pagina delle cene aziendali.</p>';
  return righe.map((r) => {
    const opz = Object.keys(STATI_C).map((k) => '<option value="' + k + '"' + (k === r.stato ? " selected" : "") + ">" + STATI_C[k] + "</option>").join("");
    const data = r.data_preferita ? new Date(r.data_preferita + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long" }) : "data da definire";
    const dove = r.sede_preferita === "campoantico" ? "Campo Antico" : r.sede_preferita === "aquila" ? "Trattoria dell'Aquila" : (r.sede_preferita || "");
    const fonte = r.utm && r.utm.utm_source ? " · da " + esc(r.utm.utm_source) : "";
    const prev = r.preventivo_id ? '<a class="rs-btn" href="#/creaPreventivo?id=' + r.preventivo_id + '">📑 Apri preventivo</a>' : '<button class="rs-btn p" data-prevc="' + r.id + '">📑 Crea preventivo</button>';
    const chiama = tel(r.telefono) ? '<a class="rs-btn" href="tel:' + tel(r.telefono) + '">📞 Chiama</a>' : "";
    return '<div class="rs-card"><div class="rs-h"><div><b>' + esc(r.azienda_nome || "Azienda") + '</b><div class="rs-m">' + esc(r.referente || "") + " · " + data + " · " + (r.persone ? r.persone + " persone" : "persone ?") + (dove ? " · " + esc(dove) : "") + fonte + '</div></div><span class="rs-s ' + (CLASSE[r.stato] || "rs-c") + '">' + esc(STATI_C[r.stato] || r.stato) + "</span></div>"
      + '<div class="rs-m">' + (r.menu_scelto ? "Menu: <b>" + esc(r.menu_scelto) + "</b>" : "Menu da scegliere") + ((r.extra_scelti || []).length ? " · extra: " + (r.extra_scelti || []).map(esc).join(", ") : "") + (r.totale_stimato ? " · stima <b>" + eur(r.totale_stimato) + "</b>" : "") + " · arrivata " + fa(r.created_at) + "</div>"
      + (r.note ? '<div class="rs-msg">' + esc(r.note).replace(/\n/g, "<br>") + "</div>" : "")
      + azioni(r.referente, r.telefono, r.email, r.consenso_marketing, chiama + prev + '<select class="rs-sel" data-sc="' + r.id + '">' + opz + "</select>") + "</div>";
  }).join("");
}

async function creaPreventivoCena(id, b) {
  const r = stato.c.find((x) => String(x.id) === String(id));
  if (!r) return;
  b.disabled = true; b.textContent = "Creo…";
  const ref = String(r.referente || "").trim().split(/\s+/);
  const riga = {
    azienda_id: r.azienda_id, sede_uuid: r.sede_id || null, tipo_servizio: "Cena aziendale", titolo_evento: "Cena aziendale " + (r.azienda_nome || ""), stato: "bozza",
    cliente_nome: r.azienda_nome || r.referente, cliente_cognome: null, cliente_email: r.email || null, cliente_telefono: r.telefono || null,
    n_invitati: r.persone || null, data_evento: r.data_preferita || null, lingua: "it",
    note: "Richiesta cena aziendale dal sito · referente " + (r.referente || "") + (r.menu_scelto ? " · menu scelto: " + r.menu_scelto : "") + ((r.extra_scelti || []).length ? " · extra: " + r.extra_scelti.join(", ") : "") + (r.totale_stimato ? " · stima vista dal cliente " + eur(r.totale_stimato) : "") + (r.note ? "\n\n" + r.note : ""),
  };
  const { data, error } = await sb().from("preventivi").insert(riga).select("id").single();
  if (error) { b.disabled = false; b.textContent = "📑 Crea preventivo"; alert("Non riesco a creare il preventivo: " + error.message); return; }
  await sb().from("richieste_cene_aziendali").update({ preventivo_id: data.id, stato: r.stato === "nuova" ? "contattata" : r.stato, aggiornata_at: new Date().toISOString() }).eq("id", r.id);
  window.location.hash = "#/creaPreventivo?id=" + data.id;
}

function listaT() {
  const righe = stato.t.filter((r) => stato.mostraChiuse || bonificoValido(r) || ["confermata", "richiesta_info", "in_attesa"].indexOf(r.stato) >= 0);
  let h = "";
  h += righe.length ? righe.map((r) => {
    const st = r.stato === "bonifico_in_attesa" && !bonificoValido(r) ? "scaduta" : r.stato;
    const camere = (r.stanze || []).map((s) => esc(s.camera) + " · " + esc(s.struttura)).join(" + ");
    const giorni = r.scadenza_bonifico ? Math.ceil((new Date(r.scadenza_bonifico) - Date.now()) / 86400000) : null;
    const ospiti = (r.adulti || 0) + " adulti" + (r.bambini ? " + " + r.bambini + " bambini" : "");
    let extra = "";
    if (st === "bonifico_in_attesa") extra = '<button class="rs-btn p" data-acc="' + r.id + '">✅ Acconto ricevuto</button><button class="rs-btn" data-ann="' + r.id + '">✖ Annulla</button>';
    if (st === "richiesta_info") extra = '<select class="rs-sel" data-st="' + r.id + '"><option value="richiesta_info" selected>RICHIESTA INFO</option><option value="annullata">CHIUSA</option></select>';
    return '<div class="rs-card"><div class="rs-h"><div><b>' + esc(r.cliente_nome) + (r.metodo !== "info" ? " · " + esc(r.codice) : "") + '</b><div class="rs-m">' + (BANDIERA[String(r.lingua || "").slice(0, 2)] || "🌍") + " " + esc(r.paese || "") + " · " + esc(r.partenza_label || "partenza da definire") + (r.metodo !== "info" ? " · " + ospiti : "") + '</div></div><span class="rs-s ' + CLASSE[st] + '">' + STATI_T[st] + "</span></div>"
      + (camere ? '<div class="rs-m">' + camere + (r.estensione ? " · estensione " + esc(r.estensione === "capri" ? "Napoli e Capri" : "Milano e Venezia") : "") + "</div>" : "")
      + (r.totale ? '<div class="rs-m">Totale <b>' + eur(r.totale) + "</b> · acconto <b>" + eur(r.acconto) + "</b>" + (st === "bonifico_in_attesa" && giorni != null ? " · il bonifico scade <b>tra " + giorni + (giorni === 1 ? " giorno" : " giorni") + "</b>" : st === "confermata" ? " · ricevuto " + eur(r.pagato) : "") + "</div>" : "")
      + (r.messaggio ? '<div class="rs-msg">' + esc(r.messaggio) + "</div>" : "")
      + azioni(r.cliente_nome, r.cliente_telefono, r.cliente_email, false, extra) + "</div>";
  }).join("") : '<p class="rs-m">Nessuna prenotazione o richiesta da gestire. Arrivano da italianexperiencetours.com.</p>';
  // posti per partenza: confermate + bonifici ancora validi
  h += '<h3 style="margin:22px 0 8px">Posti per partenza</h3><div class="rs-card">' + PARTENZE.map((p, i) => {
    const n = stato.t.filter((r) => r.partenza === p[0] && (r.stato === "confermata" || bonificoValido(r))).reduce((s, r) => s + (r.stanze || []).reduce((x, y) => x + Number(y.letti || 0), 0), 0);
    return '<div class="rs-dep"' + (i ? "" : ' style="border-top:0"') + "><b>" + p[1] + "</b><span>" + n + ' / 16</span><div class="rs-bar"><i style="width:' + Math.min(100, Math.round(n / 16 * 100)) + '%"></i></div></div>';
  }).join("") + '<div class="rs-m">Contano i posti confermati e quelli bloccati con bonifico ancora valido.</div></div>';
  return h;
}

async function aggiorna(tabella, id, campi) {
  const { error } = await sb().from(tabella).update(campi).eq("id", id);
  if (error) { alert("Non riesco a salvare: " + error.message); return; }
  await carica();
}

async function accontoRicevuto(id, b) {
  const r = stato.t.find((x) => String(x.id) === String(id));
  if (!r || !confirm("Confermo l'acconto di " + eur(r.acconto) + " per " + r.cliente_nome + "?")) return;
  b.disabled = true;
  await aggiorna("tour_prenotazioni", id, { stato: "confermata", pagato: r.acconto, note: ((r.note || "") + "\nAcconto ricevuto il " + new Date().toLocaleDateString("it-IT")).trim() });
}

async function creaPreventivo(id, b) {
  const r = stato.w.find((x) => String(x.id) === String(id));
  if (!r) return;
  b.disabled = true; b.textContent = "Creo…";
  const nomi = String(r.nomi || "").split(/\s*(?:&|\+| e | and | und | y | en )\s*/i);
  const mese = /(\d{4})-(\d{2})-(\d{2})/.exec(r.data_matrimonio || "");
  const riga = {
    azienda_id: r.azienda_id, sede_uuid: r.sede_id || null, tipo_servizio: "Matrimonio", stato: "bozza",
    cliente_nome: nomi[0] || r.nomi, cliente2_nome: nomi[1] || null, cliente_email: r.email, cliente_telefono: r.telefono || null,
    n_invitati: r.invitati || null, data_evento: mese ? mese[0] : null, lingua: ["it", "en", "de", "es", "nl"].indexOf(String(r.lingua || "").slice(0, 2)) >= 0 ? String(r.lingua).slice(0, 2) : "en",
    note: "Richiesta dal sito #" + r.id + " · " + (r.paese || "") + " · data indicata: " + (r.data_matrimonio || "da definire") + (r.messaggio ? "\n\n" + r.messaggio : ""),
  };
  const { data, error } = await sb().from("preventivi").insert(riga).select("id").single();
  if (error) { b.disabled = false; b.textContent = "📑 Crea preventivo"; alert("Non riesco a creare il preventivo: " + error.message); return; }
  await sb().from("wedding_richieste").update({ preventivo_id: data.id, stato: r.stato === "nuova" ? "contattata" : r.stato }).eq("id", r.id);
  window.location.hash = "#/creaPreventivo?id=" + data.id;
}

const CSS = '<style>.rs-v{max-width:720px}.rs-k{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.rs-k div{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center}.rs-k b{display:block;font-size:20px}.rs-k span{font-size:12px;color:#64748b}'
  + '.rs-tabs{display:flex;gap:6px;margin:12px 0 6px}.rs-tabs button{flex:1;padding:10px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;font-weight:700;font-size:14px;cursor:pointer}.rs-tabs button.on{background:#023C59;color:#fff;border-color:#023C59}.rs-b{background:#dc2626;color:#fff;border-radius:999px;padding:1px 7px;font-size:12px;margin-left:4px}'
  + '.rs-ch{display:flex;gap:8px;align-items:center;font-size:13px;color:#64748b;margin:4px 2px 10px}.rs-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;color:#0f172a}.rs-h{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.rs-h b{font-size:16px}'
  + '.rs-s{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}.rs-n{background:#fee2e2;color:#991b1b}.rs-c{background:#e0f2fe;color:#075985}.rs-at{background:#fef3c7;color:#92400e}.rs-ok{background:#dcfce7;color:#166534}.rs-i{background:#ede9fe;color:#5b21b6}.rs-x{background:#f1f5f9;color:#64748b}'
  + '.rs-m{color:#64748b;font-size:13px;margin-top:4px}.rs-msg{font-size:14px;background:#f8fafc;border-radius:8px;padding:8px 10px;margin-top:8px}.rs-a{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center;background:none!important}'
  + '.rs-btn{font-size:13px;padding:8px 11px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;font-weight:600;text-decoration:none;cursor:pointer}.rs-btn.p{background:#023C59;color:#fff;border-color:#023C59}.rs-sel{font-size:13px;padding:7px 8px;border-radius:8px;border:1px solid #e2e8f0;background:#fff}'
  + '.rs-dep{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:8px 0;border-top:1px solid #e2e8f0}.rs-bar{grid-column:1/3;height:8px;background:#f1f5f9;border-radius:6px;overflow:hidden}.rs-bar i{display:block;height:100%;background:#023C59}</style>';
