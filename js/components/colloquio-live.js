// js/components/colloquio-live.js
// Colloquio dal vivo (17/11/2026). Chi intervista apre la scheda del candidato e, domanda per domanda, segna
// ✅ Bene / ❌ Male con una nota. Si salva da solo a ogni tocco (tabella candidature_colloqui, solo admin).
// Le domande sono quelle della scheda di Tony (su di lui, di mestiere, punti da chiarire) + le domande fuori dal
// lavoro, prese dal corso Pienissimo Live (Punto Zero, valori non negoziabili, "i due errori", leadership di servizio).
// In fondo l'esito: secondo colloquio (rimanda il link per prenotarlo), prova pratica, non idoneo.
// "Per la prova" raccoglie da tutti i colloqui cosa è andato male o resta da chiarire: alla prova si verifica quello.
// Le domande vengono copiate nella riga del colloquio: se Tony rigenera la scheda, lo storico resta com'era.

const NOTIFICA = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/candidatura-notifica-ts";

// Domande fuori dal lavoro (fonte: Pienissimo Live). Niente domande su famiglia, figli, salute, religione, politica.
const EXTRA = [
  { k: "x1", domanda: "Fuori dal lavoro cosa ti piace fare? Cosa ti ricarica?", perche: "Capire cosa lo muove e come recupera energie.", buona: "Passioni concrete e costanti: sport, musica, cucina, volontariato. Le racconta con entusiasmo.", campanello: "\"Niente\", \"dormo\", non sa cosa rispondere." },
  { k: "x2", domanda: "Come ti vedi tra tre anni, nel lavoro e nella vita?", perche: "Punto Zero: lo scenario ideale. Chi ha una direzione cresce.", buona: "Un'immagine chiara e realistica, con un ruolo o una competenza da raggiungere.", campanello: "Non ci ha mai pensato, oppure solo \"guadagnare di più\"." },
  { k: "x3", domanda: "Cosa ti fa alzare la mattina con voglia di fare?", perche: "Punto Zero: cosa ti muove ogni giorno.", buona: "Una motivazione sua: imparare, fare bene, una persona o un progetto.", campanello: "Solo obblighi, tono spento." },
  { k: "x4", domanda: "Quali sono i valori che ti fanno sentire una bella persona? Raccontami una volta che li hai rispettati anche se ti costava.", perche: "Valori non negoziabili: contano i comportamenti, non gli slogan.", buona: "Un episodio vero in cui ha scelto onestà o correttezza pagandone il prezzo.", campanello: "Parole generiche senza nessun fatto." },
  { k: "x5", domanda: "C'è una cosa che non sei disposto a fare, nemmeno per lavoro?", perche: "Capire i limiti morali e se sono compatibili con i nostri.", buona: "Limiti chiari e sani: non mentire a un cliente, non servire cibo non sicuro.", campanello: "\"Faccio tutto quello che mi dicono\", oppure limiti che ostacolano il lavoro normale." },
  { k: "x6", domanda: "Raccontami qualcosa che hai iniziato e portato fino in fondo, anche fuori dal lavoro.", perche: "I due errori: non iniziare e non arrivare fino in fondo.", buona: "Un percorso completato: uno sport, un corso, un progetto, un impegno mantenuto nel tempo.", campanello: "Tante cose iniziate e lasciate a metà." },
  { k: "x8", domanda: "Cosa sai di noi? Perché proprio qui?", perche: "Chi si è informato ha scelto noi, non un lavoro qualsiasi.", buona: "Ha guardato il sito o i social, sa cosa facciamo, ha un motivo suo.", campanello: "\"Cercavo lavoro e basta\"." },
  { k: "x7", domanda: "Ti è capitato di aiutare qualcuno senza ricevere niente in cambio? Com'è andata?", perche: "Leadership di servizio: in brigata ci si aiuta anche quando nessuno ringrazia.", buona: "Un episodio concreto, lo racconta con naturalezza.", campanello: "Non gli viene in mente niente, o lo racconta solo per farsi bello." },
];
// Informazioni pratiche (17/11): si risponde Sì / No e i dettagli vanno nella nota.
const PRATICHE = [
  { k: "p1", domanda: "Quali lingue straniere parli e a che livello?", perche: "Clienti stranieri, matrimoni dall'estero, Italian Experience. Fagli dire due frasi in inglese.", buona: "Almeno l'inglese per accogliere e spiegare un piatto. Scrivi nella nota lingue e livello.", campanello: "Nessuna lingua, per un ruolo di sala." },
  { k: "p2", domanda: "Sei disponibile sere, fine settimana e festivi (Natale, Capodanno, matrimoni che finiscono tardi)?", perche: "Il nostro lavoro è lì: eventi e weekend.", buona: "Sì, con la turnazione. Nella nota eventuali giorni fissi in cui non c'è.", campanello: "Esclude weekend o sere." },
  { k: "p3", domanda: "Come arrivi al lavoro? Hai patente e un mezzo tuo?", perche: "Siamo fuori città e i turni finiscono tardi, quando i mezzi pubblici non ci sono.", buona: "Patente e auto o moto. Nella nota da dove viene e quanto ci mette.", campanello: "Dipende da passaggi o mezzi pubblici." },
  { k: "p4", domanda: "Puoi lavorare in tutte le nostre sedi (Campo Antico, Trattoria, Centro cottura)?", perche: "Le persone si spostano dove serve, soprattutto con gli eventi.", buona: "Sì, senza problemi.", campanello: "Solo una sede." },
  { k: "p5", domanda: "Che contratto cerchi? Tempo pieno, part-time, stagionale o extra a chiamata?", perche: "Capire se coincide con quello che offriamo.", buona: "Coincide con il posto aperto. Nella nota cosa ha detto.", campanello: "Cerca qualcosa che non abbiamo." },
  { k: "p6", domanda: "Quando potresti iniziare? Hai un preavviso da dare?", perche: "Per organizzare l'inserimento.", buona: "Una data precisa. Nella nota la data.", campanello: "Data vaga o molto lontana." },
  { k: "p7", domanda: "Quanto ti aspetti di guadagnare al mese, netto?", perche: "Evitare sorprese alla proposta. Noi applichiamo il contratto nazionale.", buona: "Una cifra in linea con il livello del ruolo. Scrivila nella nota.", campanello: "Molto fuori dal contratto per il ruolo." },
  { k: "p8", domanda: "Hai l'attestato HACCP valido?", perche: "È obbligatorio per chi tocca alimenti.", buona: "Sì, con la data di scadenza nella nota.", campanello: "No: va fatto prima di iniziare." },
  { k: "p9", domanda: "Hai già lavorato su eventi grandi, come matrimoni o banchetti da 100 persone in su?", perche: "Grandi numeri e ritmo dei ricevimenti.", buona: "Sì: dove, quante volte, con che ruolo.", campanello: "Solo ristorante alla carta, e non lo incuriosisce." },
];
// 2° colloquio (17/11): non si ripete il primo. Si riprende quello che non ha convinto, poi situazioni vere, poi la proposta.
const SITUAZIONI = [
  { k: "s1", domanda: "Matrimonio da 150: il secondo esce in ritardo di 20 minuti e la sala ti mette fretta. Cosa fai?", perche: "Sangue freddo e comunicazione sotto pressione.", buona: "Avvisa il responsabile, riorganizza, dice alla sala tempi veri, non improvvisa sulla qualità.", campanello: "Se la prende con la sala, oppure esce piatti fatti male pur di correre." },
  { k: "s2", domanda: "Un collega più anziano ti dice di fare in un modo diverso da quello che ti ho detto io. Cosa fai?", perche: "Rispetto delle indicazioni e dei colleghi.", buona: "Fa come indicato dal responsabile e chiarisce con calma, senza scontri.", campanello: "Segue chi urla di più, oppure fa di testa sua." },
  { k: "s3", domanda: "A fine servizio ti accorgi di aver sbagliato le etichette di tre teglie. Lo dici?", perche: "Onestà sugli errori: in cucina è sicurezza alimentare.", buona: "Sì, subito, e le corregge.", campanello: "Esita, minimizza o dice che non è grave." },
  { k: "s4", domanda: "Un cliente straniero chiede un piatto senza glutine. Spiegagli cosa può mangiare (in inglese, se è di sala).", perche: "Allergeni, lingue e cura del cliente.", buona: "Chiede, verifica in cucina, spiega con chiarezza e senza promettere quello che non è sicuro.", campanello: "\"Sì sì, va bene tutto\" senza verificare." },
];
const PROPOSTA = [
  { k: "o1", domanda: "Gli ho spiegato ruolo, orari e turnazione.", perche: "Deve sapere esattamente cosa lo aspetta.", buona: "", campanello: "" },
  { k: "o2", domanda: "Gli ho spiegato contratto nazionale, tredicesima e quattordicesima, bonus.", perche: "Condizioni chiare prima della prova.", buona: "", campanello: "" },
  { k: "o3", domanda: "Gli ho detto in cosa consiste la prova pratica e quando.", perche: "Così arriva preparato.", buona: "", campanello: "" },
  { k: "o4", domanda: "Cosa ha chiesto lui? Ha dubbi sulla proposta?", perche: "Chi chiede di turni, crescita e squadra ragiona diversamente da chi chiede solo dei soldi.", buona: "Domande sul lavoro, sulla squadra, su come crescere. Scrivile nella nota.", campanello: "Nessuna domanda, oppure solo sullo stipendio." },
];
const SINO = { pratiche: 1, proposta: 1 };
const GRUPPI = { riprendere: "Da riprendere dal colloquio prima", pratiche: "Informazioni pratiche", situazioni: "Situazioni vere", proposta: "La proposta", lui: "Su di lui", mestiere: "Di mestiere", dubbi: "Da chiarire", extra: "Fuori dal lavoro" };
const ESITI = { secondo_colloquio: "Secondo colloquio", prova: "Prova pratica", non_idoneo: "Non idoneo" };

const sb = () => window.supabaseClient || window.supabase;
const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 2° colloquio e successivi: le domande andate male o rimaste aperte, con la nota di allora
function vociSeguito(prec) {
  const out = [], visti = {};
  (prec || []).forEach((c) => (c.voci || []).forEach((v) => {
    if (v.g === "proposta" || v.g === "situazioni") return;
    const aperta = v.g === "dubbi" ? v.esito !== "bene" : v.esito === "male";
    if (v.g === "pratiche") { if (v.esito !== "bene" && !visti[v.k]) { visti[v.k] = 1; out.push(Object.assign({}, v, { esito: null, nota: v.nota || "" })); } return; }
    if (v.g === "riprendere" || aperta) {
      const k = v.g === "riprendere" ? v.k : "r" + c.numero + "_" + v.k;
      if (visti[k]) return; visti[k] = 1;
      out.push({ k: k, g: "riprendere", domanda: v.domanda, perche: (v.nota ? "Al " + c.numero + "° colloquio: " + v.nota + ". " : "") + "Chiedi un esempio concreto, non la stessa domanda.", buona: v.buona || "", campanello: v.campanello || "", esito: null, nota: "" });
    }
  }));
  SITUAZIONI.forEach((q) => out.push(Object.assign({ g: "situazioni", esito: null, nota: "" }, q)));
  PROPOSTA.forEach((q) => out.push(Object.assign({ g: "proposta", esito: null, nota: "" }, q)));
  return out;
}

function vociDa(rel) {
  const r = rel || {}, out = [];
  PRATICHE.forEach((q) => out.push(Object.assign({ g: "pratiche" }, q)));
  (r.domande_colloquio || []).forEach((q, i) => out.push({ k: "l" + i, g: "lui", domanda: q.domanda, perche: q.perche || "", buona: q.risposta_buona || "", campanello: q.campanello || "" }));
  (r.domande_mestiere || []).forEach((q, i) => out.push({ k: "m" + i, g: "mestiere", domanda: q.domanda, perche: q.perche || "", buona: q.risposta_buona || "", campanello: q.campanello || "" }));
  (Array.isArray(r.dubbi) ? r.dubbi : []).forEach((d, i) => out.push({ k: "d" + i, g: "dubbi", domanda: d, perche: "", buona: "", campanello: "" }));
  EXTRA.forEach((q) => out.push(Object.assign({ g: "extra" }, q)));
  return out.map((v) => Object.assign({ esito: null, nota: "" }, v));
}

export async function apriColloquioLive(candidaturaId, opts) {
  opts = opts || {};
  const st = '<style>' +
    '#cl-ov{position:fixed;inset:0;z-index:10000;background:#f1f5f9;overflow:auto;-webkit-overflow-scrolling:touch;font-family:inherit}' +
    '#cl-ov .w{max-width:680px;margin:0 auto;padding:12px 12px 90px}' +
    '#cl-ov .top{background:#0E5A7A;color:#fff;border-radius:16px;padding:14px 16px;position:sticky;top:8px;z-index:2;box-shadow:0 4px 14px rgba(0,0,0,.15)}' +
    '#cl-ov .top .r{display:flex;justify-content:space-between;align-items:center;gap:10px}#cl-ov .top b{font-size:18px}#cl-ov .top small{display:block;opacity:.85;font-size:12.5px;margin-top:2px}' +
    '#cl-ov .x{background:rgba(255,255,255,.18);border:none;color:#fff;border-radius:10px;padding:9px 13px;font-weight:800;font-size:14px;cursor:pointer}' +
    '#cl-ov .cont{margin-top:8px;font-size:13.5px;font-weight:700}#cl-ov .sv{font-size:12px;opacity:.85;margin-left:8px;font-weight:400}' +
    '#cl-ov .box{background:#fff;border-radius:14px;padding:12px 14px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)}' +
    '#cl-ov .sez{font-size:12px;font-weight:800;color:#0E5A7A;text-transform:uppercase;letter-spacing:.5px;margin:4px 0 2px}' +
    '#cl-ov .v{border-top:1px solid #e2e8f0;padding:12px 0}#cl-ov .v:first-of-type{border-top:none}' +
    '#cl-ov .q{font-weight:700;font-size:15px;line-height:1.4;color:#0f172a}#cl-ov .p{font-size:12.5px;color:#64748b;margin-top:3px}' +
    '#cl-ov .ok{font-size:12.5px;color:#166534;margin-top:4px}#cl-ov .ko{font-size:12.5px;color:#9a3412;margin-top:2px}' +
    '#cl-ov .bt{display:flex;gap:8px;margin-top:9px}#cl-ov .bt button{flex:1;border:2px solid #cbd5e1;background:#fff;border-radius:12px;padding:11px 6px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;color:#334155}' +
    '#cl-ov .bt button.b.on{background:#16a34a;border-color:#16a34a;color:#fff}#cl-ov .bt button.m.on{background:#dc2626;border-color:#dc2626;color:#fff}' +
    '#cl-ov input.n,#cl-ov textarea{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 11px;font-size:14.5px;font-family:inherit;margin-top:8px;background:#f8fafc}' +
    '#cl-ov .es{display:flex;flex-direction:column;gap:8px;margin-top:10px}#cl-ov .es button{border:2px solid #cbd5e1;background:#fff;border-radius:12px;padding:13px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;text-align:left;color:#0f172a}' +
    '#cl-ov .es button.on{border-color:#0E5A7A;background:#e0f2fe}#cl-ov .msg{font-size:13.5px;margin-top:10px;font-weight:700}' +
    '#cl-ov .pv li{font-size:13.5px;line-height:1.45;margin:5px 0}#cl-ov .tab{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
    '#cl-ov .tab button{border:none;border-radius:999px;padding:6px 12px;font-weight:800;font-size:13px;background:rgba(255,255,255,.18);color:#fff;cursor:pointer;font-family:inherit}#cl-ov .tab button.on{background:#fff;color:#0E5A7A}' +
    '#cl-ov .info{font-size:12.5px;color:#64748b;line-height:1.45}' +
    '</style>';
  let ov = document.getElementById("cl-ov");
  if (!ov) { ov = document.createElement("div"); ov.id = "cl-ov"; document.body.appendChild(ov); }
  const chiudi = () => { ov.remove(); document.body.style.overflow = ""; if (opts.onClose) opts.onClose(); };
  document.body.style.overflow = "hidden";
  ov.innerHTML = st + '<div class="w"><div class="box">Carico la scheda…</div></div>';

  const [cr, kr] = await Promise.all([
    sb().from("candidature").select("id, azienda_id, nome, cognome, ruolo_desiderato, telefono, fase_attuale, relazione_finale").eq("id", candidaturaId).single(),
    sb().from("candidature_colloqui").select("*").eq("candidatura_id", candidaturaId).order("numero"),
  ]);
  if (cr.error || kr.error) { ov.innerHTML = st + '<div class="w"><div class="box">Non riesco ad aprire il colloquio: ' + esc((cr.error || kr.error).message) + '</div><div class="es"><button id="cl-x">Chiudi</button></div></div>'; ov.querySelector("#cl-x").onclick = chiudi; return; }
  const cand = cr.data, rel = cand.relazione_finale || {};
  let colloqui = kr.data || [];
  // colloquio aperto: l'ultimo senza esito; se non c'è (o l'ultimo ha esito "secondo colloquio") se ne prepara uno nuovo
  let cur = colloqui.length && !colloqui[colloqui.length - 1].esito ? colloqui[colloqui.length - 1] : null;
  const nuovo = () => ({ id: null, azienda_id: cand.azienda_id, candidatura_id: cand.id, numero: (colloqui.length ? colloqui[colloqui.length - 1].numero : 0) + 1, appuntamento_id: opts.appuntamentoId || null, voci: colloqui.length ? vociSeguito(colloqui) : vociDa(rel), note: "", esito: null });
  if (!cur && (!colloqui.length || colloqui[colloqui.length - 1].esito === "secondo_colloquio")) cur = nuovo();
  let vedi = cur || colloqui[colloqui.length - 1];
  let stato = "", timer = null;

  async function salva() {
    if (!vedi || vedi !== cur) return;
    stato = "salvo…"; segnaStato();
    const riga = { azienda_id: cur.azienda_id, candidatura_id: cur.candidatura_id, numero: cur.numero, appuntamento_id: cur.appuntamento_id || null, voci: cur.voci, note: cur.note || null, esito: cur.esito || null, updated_at: new Date().toISOString() };
    const r = await sb().from("candidature_colloqui").upsert(riga, { onConflict: "candidatura_id,numero" }).select("*").single();
    if (r.error) { stato = "⚠️ non salvato: " + r.error.message; segnaStato(); return false; }
    const was = cur; cur = Object.assign(cur, r.data); if (vedi === was) vedi = cur;
    if (!colloqui.some((c) => c.numero === cur.numero)) colloqui.push(cur);
    stato = "✓ salvato"; segnaStato(); return true;
  }
  const salvaPoi = () => { clearTimeout(timer); timer = setTimeout(salva, 700); };
  function segnaStato() { const s = ov.querySelector("#cl-sv"); if (s) s.textContent = stato; }

  // per la prova: vale l'ultimo giudizio su ogni domanda (se al 2° colloquio è andata bene, esce dalla lista)
  function perLaProva() {
    const m = new Map();
    colloqui.concat(cur && !colloqui.includes(cur) ? [cur] : []).forEach((c) => (c.voci || []).forEach((v) => {
      if (SINO[v.g] || v.g === "situazioni" && v.esito !== "male") return;
      const chiave = v.domanda;
      if (v.esito === "bene") { m.delete(chiave); return; }
      if (v.esito === "male") m.set(chiave, "❌ " + (c.numero > 1 ? "(" + c.numero + "° coll.) " : "") + v.domanda + (v.nota ? " — " + v.nota : ""));
      else if ((v.g === "dubbi" || v.g === "riprendere") && !m.has(chiave)) m.set(chiave, "❓ " + v.domanda + (v.nota ? " — " + v.nota : ""));
    }));
    return [...m.values()];
  }

  let htmlProvaG = () => "";
  function disegna() {
    const ro = vedi !== cur; // colloquio già chiuso: solo lettura
    const voci = vedi.voci || [];
    const nb = voci.filter((v) => v.esito === "bene").length, nm = voci.filter((v) => v.esito === "male").length;
    let h = st + '<div class="w"><div class="top"><div class="r"><div><b>🗣 ' + esc(cand.nome + " " + (cand.cognome || "")) + '</b><small>' + esc(cand.ruolo_desiderato || "") + " · " + vedi.numero + "° colloquio" + (ro ? " · chiuso" : "") + '</small></div><button class="x" id="cl-x">Chiudi</button></div>' +
      '<div class="cont">✅ ' + nb + " · ❌ " + nm + " · su " + voci.length + '<span class="sv" id="cl-sv">' + esc(stato) + "</span></div>";
    const tutti = colloqui.concat(cur && !colloqui.includes(cur) ? [cur] : []);
    if (tutti.length > 1) h += '<div class="tab">' + tutti.map((c) => '<button data-n="' + c.numero + '" class="' + (c === vedi ? "on" : "") + '">' + c.numero + "° " + (c.esito ? "· " + ESITI[c.esito] : c === cur ? "· in corso" : "") + "</button>").join("") + "</div>";
    h += "</div>";
    if (vedi.numero === 1 && !(rel.domande_colloquio || rel.domande_mestiere)) h += '<div class="box info">Tony non ha ancora preparato la scheda per questo candidato: ci sono solo le domande fuori dal lavoro.</div>';
    Object.keys(GRUPPI).forEach((g) => {
      const vv = voci.map((v, i) => [v, i]).filter((x) => x[0].g === g);
      if (!vv.length) return;
      h += '<div class="box"><div class="sez">' + GRUPPI[g] + "</div>" + vv.map(([v, i]) =>
        '<div class="v"><div class="q">' + esc(v.domanda) + "</div>" + (v.perche ? '<div class="p">Perché: ' + esc(v.perche) + "</div>" : "") +
        (v.buona ? '<div class="ok">✅ ' + esc(v.buona) + "</div>" : "") + (v.campanello ? '<div class="ko">⚠️ ' + esc(v.campanello) + "</div>" : "") +
        '<div class="bt"><button class="b' + (v.esito === "bene" ? " on" : "") + '" data-i="' + i + '" data-e="bene"' + (ro ? " disabled" : "") + '>' + (SINO[v.g] ? "✅ Sì" : "✅ Bene") + '</button><button class="m' + (v.esito === "male" ? " on" : "") + '" data-i="' + i + '" data-e="male"' + (ro ? " disabled" : "") + ">" + (SINO[v.g] ? "❌ No" : "❌ Male") + "</button></div>" +
        '<input class="n" data-nota="' + i + '" placeholder="Nota (facoltativa)" value="' + esc(v.nota) + '"' + (ro ? " disabled" : "") + "></div>").join("") + "</div>";
    });
    h += '<div class="box"><div class="sez">Note sul colloquio</div><textarea id="cl-note" rows="3" placeholder="Impressione generale, cosa ti ha colpito, cosa non ti ha convinto"' + (ro ? " disabled" : "") + ">" + esc(vedi.note || "") + "</textarea></div>";
    h += '<div class="box" id="cl-pv">' + htmlProva() + "</div>";
    function htmlProva() { const pv = perLaProva();
    return '<div class="sez">🔎 Per la prova</div>' + (pv.length ? '<ul class="pv">' + pv.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" : '<div class="info">Qui finisce quello che segni ❌ e i punti da chiarire non risolti: alla prova si verifica questo.</div>') +
      (rel.prova_pratica ? '<div class="info" style="margin-top:8px"><b>Prova proposta da Tony:</b> ' + esc(typeof rel.prova_pratica === "string" ? rel.prova_pratica : JSON.stringify(rel.prova_pratica)) + "</div>" : ""); }
    if (!ro) {
      h += '<div class="box"><div class="sez">Esito del colloquio</div><div class="es">' +
        '<button data-es="secondo_colloquio" class="' + (vedi.esito === "secondo_colloquio" ? "on" : "") + '">🔁 Secondo colloquio<div class="info">Gli rimando il link per prenotarlo</div></button>' +
        '<button data-es="prova" class="' + (vedi.esito === "prova" ? "on" : "") + '">🍳 Prova pratica<div class="info">Si segna: alla prova si verifica la lista qui sopra</div></button>' +
        '<button data-es="non_idoneo" class="' + (vedi.esito === "non_idoneo" ? "on" : "") + '">✋ Non idoneo<div class="info">Si segna qui. Il messaggio al candidato parte dal tasto "Non idoneo" della scheda</div></button>' +
        '</div><div class="msg" id="cl-msg"></div></div>';
    } else if (vedi.esito) {
      h += '<div class="box"><div class="sez">Esito</div><b>' + ESITI[vedi.esito] + "</b></div>";
    }
    h += "</div>";
    ov.innerHTML = h; htmlProvaG = htmlProva;
    ov.querySelector("#cl-x").onclick = async () => { clearTimeout(timer); if (vedi === cur && cur.id === null && !cur.voci.some((v) => v.esito || v.nota) && !cur.note) return chiudi(); await salva(); chiudi(); };
    ov.querySelectorAll("[data-n]").forEach((b) => b.onclick = () => { vedi = colloqui.concat(cur && !colloqui.includes(cur) ? [cur] : []).find((c) => c.numero === Number(b.dataset.n)); disegna(); });
    if (ro) return;
    ov.querySelectorAll("[data-e]").forEach((b) => b.onclick = () => {
      const v = cur.voci[Number(b.dataset.i)]; v.esito = v.esito === b.dataset.e ? null : b.dataset.e;
      const box = b.parentNode; box.querySelector(".b").classList.toggle("on", v.esito === "bene"); box.querySelector(".m").classList.toggle("on", v.esito === "male");
      const nb2 = cur.voci.filter((x) => x.esito === "bene").length, nm2 = cur.voci.filter((x) => x.esito === "male").length;
      const c = ov.querySelector(".cont"); if (c) c.firstChild.nodeValue = "✅ " + nb2 + " · ❌ " + nm2 + " · su " + cur.voci.length;
      ov.querySelector("#cl-pv").innerHTML = htmlProvaG();
      salva();
    });
    ov.querySelectorAll("[data-nota]").forEach((inp) => inp.oninput = () => { cur.voci[Number(inp.dataset.nota)].nota = inp.value; salvaPoi(); });
    ov.querySelectorAll("[data-nota]").forEach((inp) => inp.onchange = () => { ov.querySelector("#cl-pv").innerHTML = htmlProvaG(); });
    const nt = ov.querySelector("#cl-note"); nt.oninput = () => { cur.note = nt.value; salvaPoi(); };
    ov.querySelectorAll("[data-es]").forEach((b) => b.onclick = async () => {
      const es = b.dataset.es, msg = ov.querySelector("#cl-msg");
      if (es === "non_idoneo" && !confirm("Segno il colloquio come non idoneo?")) return;
      clearTimeout(timer); cur.esito = es; msg.textContent = "Salvo…";
      if (!(await salva())) { cur.esito = null; msg.textContent = "⚠️ " + stato; return; }
      if (es === "secondo_colloquio") {
        msg.textContent = "Mando il link per il secondo colloquio…";
        try {
          const { data: ses } = await sb().auth.getSession();
          const r = await fetch(NOTIFICA, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (ses?.session?.access_token || "") },
            body: JSON.stringify({ link_colloquio: true, evento: "link", candidatura_id: cand.id, azienda_id: cand.azienda_id }) });
          const d = await r.json();
          msg.textContent = d.esito?.in_coda ? "✅ Segnato. Il link parte appena Meta approva il messaggio." : d.success ? "✅ Link per il secondo colloquio inviato su WhatsApp." : "⚠️ Segnato, ma il link non è partito: " + (d.error || d.esito?.error || "");
        } catch (e) { msg.textContent = "⚠️ Segnato, ma il link non è partito: " + e.message; }
      } else msg.textContent = es === "prova" ? "✅ Segnato: prova pratica. La lista \"Per la prova\" resta qui." : "✅ Segnato: non idoneo.";
      ov.querySelectorAll("[data-es]").forEach((x) => x.classList.toggle("on", x.dataset.es === es));
      if (opts.onEsito) opts.onEsito(es);
    });
  }
  disegna();
}
