// js/views/home-sezione.js
// Home di sezione (Sala, Eventi, Gestione, Menu e prodotti, Marketing, Personale).
// Una pagina sola, configurata per sezione: righe di stato (solo se c'e' qualcosa da dire) + pulsanti grandi.
// Si apre toccando il NOME della sezione nel menu laterale: #/home-sezione?s=sala
// Cucina ha la sua (home-cucina.js). Niente costi o incassi a chi non e' responsabile.

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dataLocale = (d) => { const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const euro = (n) => Number(n || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// pulsanti grandi per sezione: [icona, testo, rotta]
const SEZIONI = {
  sala: { titolo: "🪑 Sala", pulsanti: [
    ["🍽️", "Menu del giorno", "menu-giorno"], ["🪑", "Comande", "bo-comande"], ["📅", "Prenotazioni", "prenotazioni"], ["🗺️", "Mappa Sala", "sala"],
    ["🖨", "Menu da tavolo", "menu-tavolo"], ["📋", "Mansionario Sala", "mansionario-sala"] ] },
  eventi: { titolo: "🎪 Eventi", pulsanti: [
    ["📑", "Preventivi", "preventivi"], ["🏛️", "Location", "bo-location-ricevimenti"], ["🎪", "Servizi e personale", "servizi-eventi"] ] },
  gestione: { titolo: "💼 Gestione", pulsanti: [
    ["💳", "Cassa", "cassa-libera"], ["🧾", "Chiusura cassa", "chiusura-cassa"], ["🛒", "Acquisti", "acquisti"], ["🧮", "Ragioniere", "bo-bilancio"],
    ["💰", "Venduto", "venduto"], ["📈", "Margini", "margini"], ["🍝", "Food cost mancanti", "food-cost-mancanti"],
    ["💸", "Spese fisse", "spese-fisse"], ["📊", "Menu Engineering", "menu-intelligence"] ] },
  menu_prodotti: { titolo: "📋 Menu e prodotti", pulsanti: [
    ["📋", "Menu Builder", "bo-menu"], ["🧺", "Prodotti", "bo-prodotti"], ["📂", "Categorie", "bo-categorie"],
    ["🍳", "Ricette", "ricettario"], ["📦", "Magazzino", "bo-magazzino"], ["👨‍🍳", "Produzioni", "produzioni-aperte"] ] },
  marketing: { titolo: "📣 Marketing e CRM", pulsanti: [
    ["📉", "Analytics", "bo-analytics"],
    // i gruppi aprono l'elenco delle loro voci (come nel menu laterale): [icona, testo, rotta, [figli]]
    ["👥", "Clienti", "bo-tag", [["🏷️", "Tag e LTV", "bo-tag"], ["🎫", "Fidelity e Network", "bo-fidelity"], ["⭐", "Recensioni ricevute", "recensioni-ricevute"], ["⚙️", "Config recensioni", "recensioni"], ["📸", "Chi ci tagga", "bo-menzioni"]]],
    ["📣", "Campagne", "bo-marketing", [["📣", "Campagne", "bo-marketing"], ["📧", "Mail marketing", "mail-marketing"], ["🎁", "Promo", "bo-promo"], ["📊", "Analisi Promo", "bo-promo-analisi"], ["🎁", "Buoni regalo", "bo-voucher"], ["🔗", "Catenarie", "bo-catenarie"], ["✂️", "Short Link", "bo-shortlink"]]],
    ["💬", "Messaggi", "bo-template", [["💬", "Template WhatsApp", "bo-template"], ["📱", "WhatsApp Inbox", "bo-whatsapp"], ["🤖", "Chatbot", "bo-chatbot"], ["📨", "Registro messaggi", "registro-messaggi"]]],
    ["📸", "Social e Sito", "bo-calendario", [["📸", "Bacheca Social", "bo-marketing?tab=bacheca-social"], ["📅", "Calendario editoriale", "bo-calendario"], ["📱", "Storie", "bo-storie"], ["🌐", "Sito Web", "bo-sito"], ["🖼️", "Media Library", "bo-media"]]],
    ["⚡", "Crediti Tony", "bo-crediti"] ] },
  personale: { titolo: "👥 Personale", pulsanti: [
    ["👨‍💼", "Squadra", "dipendenti"], ["🕒", "Ore e paghe", "bo-presenze"], ["📁", "Documenti", "hr-fascicolo"],
    ["🎯", "Crescita", "persone"], ["👥", "Candidature", "bo-candidature"], ["📘", "Manuale", "manuale"] ] },
};

export async function render(app) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;
  const chiave = new URLSearchParams((window.location.hash.split("?")[1] || "")).get("s") || "";
  const conf = SEZIONI[chiave];
  if (!conf) { window.location.hash = "#/home"; return; }
  if (!sede) { window.location.hash = "#/scegli-sede"; return; }

  const ruolo = String((window.normalizeRuolo ? window.normalizeRuolo(window.state?.viewAs || window.state?.ruolo) : (window.state?.viewAs || window.state?.ruolo)) || "").toLowerCase();
  const admin = ["admin", "superadmin"].includes(ruolo);
  const responsabile = admin || ruolo === "manager";

  app.innerHTML = `<section class="view"><div class="small-muted">Un attimo…</div></section>`;

  const oggi = dataLocale(new Date());
  const tra14 = dataLocale(new Date(Date.now() + 14 * 86400000));
  const inizioGiorno = new Date(oggi + "T00:00:00").toISOString();
  const aid = azienda.id;
  const conta = async (q) => { try { const { count } = await q; return count || 0; } catch (_) { return 0; } };

  // righe di stato: { testo, dest, tono } — compaiono solo se c'e' qualcosa da dire
  const righe = [];
  let prossimi = [];

  if (chiave === "sala") {
    const [{ data: pren }, comande] = await Promise.all([
      supabase.from("prenotazioni_tavoli").select("coperti, stato").eq("azienda_id", aid).eq("sede_id", sede.id).eq("data", oggi).in("stato", ["in_attesa", "confermata", "arrivata"]).limit(500),
      conta(supabase.from("comande").select("id", { count: "exact", head: true }).eq("azienda_id", aid).eq("sede_id", sede.id).in("stato", ["aperta", "in_corso"])),
    ]);
    const lista = pren || [];
    const coperti = lista.reduce((s, r) => s + (Number(r.coperti) || 0), 0);
    const attesa = lista.filter((r) => r.stato === "in_attesa").length;
    if (comande) righe.push({ testo: `🪑 ${comande} ${comande === 1 ? "comanda aperta" : "comande aperte"}`, dest: "bo-comande", tono: "verde" });
    if (lista.length) righe.push({ testo: `📅 Oggi ${lista.length} ${lista.length === 1 ? "prenotazione" : "prenotazioni"} · ${coperti} coperti`, dest: "prenotazioni", tono: "grigio" });
    if (attesa) righe.push({ testo: `⏳ ${attesa} ${attesa === 1 ? "prenotazione" : "prenotazioni"} da confermare`, dest: "prenotazioni", tono: "giallo" });
  }

  if (chiave === "eventi") {
    const [trattativa, { data: ev }] = await Promise.all([
      conta(supabase.from("preventivi").select("id", { count: "exact", head: true }).eq("azienda_id", aid).eq("stato", "trattativa")),
      supabase.from("preventivi").select("titolo_evento, data_evento, n_invitati, stato").eq("azienda_id", aid).in("stato", ["confermato", "accettato"]).gte("data_evento", oggi).lte("data_evento", tra14).order("data_evento", { ascending: true }).limit(8),
    ]);
    prossimi = ev || [];
    if (trattativa) righe.push({ testo: `📑 ${trattativa} ${trattativa === 1 ? "preventivo in trattativa" : "preventivi in trattativa"}`, dest: "preventivi", tono: "giallo" });
    if (prossimi.length) righe.push({ testo: `🎪 ${prossimi.length} ${prossimi.length === 1 ? "evento" : "eventi"} nei prossimi 14 giorni`, dest: "preventivi", tono: "verde", apri: true });
  }

  if (chiave === "gestione" && responsabile) {
    const [bozze, { data: inc }] = await Promise.all([
      conta(supabase.from("fatture_acquisto").select("id", { count: "exact", head: true }).eq("azienda_id", aid).eq("stato", "bozza")),
      admin ? supabase.from("comande").select("totale").eq("azienda_id", aid).eq("sede_id", sede.id).in("stato", ["pagata", "chiusa"]).gte("chiusa_at", inizioGiorno).limit(2000) : Promise.resolve({ data: [] }),
    ]);
    if (bozze) righe.push({ testo: `🧾 ${bozze} ${bozze === 1 ? "fattura da confermare" : "fatture da confermare"}`, dest: "acquisti?tab=fatture", tono: "giallo" });
    if (admin && (inc || []).length) righe.push({ testo: `💳 Incassato oggi ${euro((inc || []).reduce((s, r) => s + (Number(r.totale) || 0), 0))}`, dest: "chiusura-cassa", tono: "grigio" });
  }

  if (chiave === "marketing") {
    const wa = await conta(supabase.from("whatsapp_messaggi").select("id", { count: "exact", head: true }).eq("azienda_id", aid).eq("letto", false));
    if (wa) righe.push({ testo: `💬 ${wa} ${wa === 1 ? "messaggio WhatsApp da leggere" : "messaggi WhatsApp da leggere"}`, dest: "bo-whatsapp", tono: "giallo" });
  }

  if (chiave === "personale" && responsabile) {
    const ass = await conta(supabase.from("richieste_assenze").select("id", { count: "exact", head: true }).eq("azienda_id", aid).eq("stato", "richiesto"));
    if (ass) righe.push({ testo: `📆 ${ass} ${ass === 1 ? "richiesta" : "richieste"} di ferie/permessi da approvare`, dest: "hr-admin", tono: "giallo" });
  }

  // solo i pulsanti che questo ruolo puo' aprire
  const puo = (rotta) => (window.hasPermission ? window.hasPermission(String(rotta).split("?")[0]) : true);
  const pulsanti = conf.pulsanti.filter((p) => (p[3] ? p[3].some((c) => puo(c[2])) : puo(p[2])));

  const apriPannello = `const p=this.nextElementSibling;const a=p.style.display==='none';p.style.display=a?'block':'none';this.querySelector('.chev').style.transform=a?'rotate(90deg)':'none'`;
  const giorno = (d) => new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });

  app.innerHTML = `
    <section class="view ps-home">
      <h2 style="margin:0 0 2px;">${conf.titolo}</h2>
      <div class="small-muted" style="margin-bottom:14px;">${esc(sede.nome || "")} · ${new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</div>

      ${righe.map((r) => r.apri ? `
        <div class="ps-barra ps-${r.tono}" onclick="${apriPannello}"><span>${esc(r.testo)}</span><span class="chev">›</span></div>
        <div class="ps-pannello" style="display:none;">
          ${prossimi.map((e) => `<div class="ps-riga" onclick="window.location.hash='#/${r.dest}'"><b>${esc(giorno(e.data_evento))}</b> · ${esc(e.titolo_evento || "Evento")}${e.n_invitati ? ` · ${e.n_invitati} invitati` : ""}</div>`).join("")}
        </div>` : `
        <div class="ps-barra ps-${r.tono}" onclick="window.location.hash='#/${r.dest}'"><span>${esc(r.testo)}</span><span class="chev">›</span></div>`).join("")}

      <div class="ps-griglia">
        ${pulsanti.map((p) => `<button class="ps-btn" onclick="window.location.hash='#/${p[2]}'"><i>${p[0]}</i>${esc(p[1])}</button>`).join("")}
      </div>
    </section>
    <style>
      .ps-home .ps-barra{border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;margin-bottom:10px;font-weight:700;font-size:15px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;}
      .ps-home .ps-grigio{background:#f1f5f9;}
      .ps-home .ps-verde{background:#dcfce7;border-color:#86efac;color:#14532d;font-weight:800;}
      .ps-home .ps-giallo{background:#fef9c3;border-color:#fde047;color:#713f12;font-weight:800;}
      .ps-home .ps-barra .chev{font-size:20px;transition:transform .15s;}
      .ps-home .ps-pannello{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:6px 14px;margin:-2px 0 12px;}
      .ps-home .ps-riga{padding:10px 0;border-top:1px solid #f1f5f9;font-size:14.5px;cursor:pointer;}
      .ps-home .ps-riga:first-child{border-top:0;}
      .ps-home .ps-griglia{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px;}
      .ps-home .ps-btn{background:#0E5A7A;color:#fff;border:0;border-radius:14px;padding:16px 10px;font-size:15px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:6px;}
      .ps-home .ps-btn i{font-style:normal;font-size:24px;}
    </style>`;
}
