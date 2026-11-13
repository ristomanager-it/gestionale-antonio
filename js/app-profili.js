// APP PER REPARTO — una sola base, tante app separate (Comande, Produzione, Marketing...).
// Tablet di sala e cassa: Comande e Prenotazioni (le prenotazioni di oggi sono gia'
// sui tavoli delle Comande) piu' la Cassa. La produzione sta sullo schermo cucina.
// Come si attiva un'app:
//   1) dall'indirizzo: ?app=comande  -> e' cosi' che partono l'icona installata e l'app nativa.
//      Ogni app installata ha la sua finestra, quindi sullo stesso telefono convivono.
//   2) dal dispositivo bloccato (tablet ordini / cassa): localStorage per azienda,
//      impostato dall'admin in Configurazione > Cassa.
// Le app restringono e basta: ogni rotta resta soggetta a hasPermission del ruolo.

export const APP_PROFILI = {
  "tablet-ordini": {
    nome: "Tablet sala", titolo: "📱 TABLET SALA", icona: "📱", inizio: "bo-comande",
    voci: [
      { label: "🪑 Comande", route: "bo-comande" },
      { label: "📅 Prenotazioni", route: "prenotazioni" },
      { label: "💳 Cassa", route: "cassa-libera" },
      { label: "🧾 Chiusura cassa", route: "chiusura-cassa" },
    ],
    extra: ["comanda", "sala", "prenotazioni-dettaglio", "prenotazioni-form", "prenotazione-tavolo-form", "prenotazioni-rifiutate"],
  },
  "cassa": {
    nome: "Cassa", titolo: "💳 CASSA", icona: "💳", inizio: "cassa-libera",
    voci: [
      { label: "🪑 Comande", route: "bo-comande" },
      { label: "📅 Prenotazioni", route: "prenotazioni" },
      { label: "💳 Cassa", route: "cassa-libera" },
      { label: "🧾 Chiusura cassa", route: "chiusura-cassa" },
    ],
    extra: ["comanda", "sala", "prenotazioni-dettaglio", "prenotazioni-form", "prenotazione-tavolo-form", "prenotazioni-rifiutate"],
  },
  "cucina": {
    nome: "Schermo cucina", titolo: "🏭 SCHERMO CUCINA", icona: "🏭", inizio: "kds-produzioni",
    voci: [
      { label: "🏭 Schermo produzioni", route: "kds-produzioni" },
      { label: "🟢 Produzioni aperte", route: "produzioni-aperte" },
    ],
    extra: ["preparazioni", "app-produzione"],
  },
  "comande": {
    nome: "Comande", titolo: "🪑 COMANDE", icona: "🪑", inizio: "bo-comande",
    voci: [
      { label: "🪑 Comande", route: "bo-comande" },
      { label: "🗺️ Mappa sala", route: "sala" },
      { label: "🖨 Menu da tavolo", route: "menu-tavolo" },
    ],
    extra: ["comanda"],
  },
  "prenotazioni": {
    nome: "Prenotazioni", titolo: "📅 PRENOTAZIONI", icona: "📅", inizio: "prenotazioni",
    voci: [
      { label: "📅 Prenotazioni", route: "prenotazioni" },
      { label: "➕ Nuova prenotazione", route: "prenotazioni-form" },
      { label: "🚫 Rifiutate", route: "prenotazioni-rifiutate" },
      { label: "🗺️ Mappa sala", route: "sala" },
    ],
    extra: ["prenotazioni-dettaglio", "prenotazione-tavolo-form"],
  },
  "produzione": {
    nome: "Planning e produzione", titolo: "🏭 PLANNING E PRODUZIONE", icona: "🏭", inizio: "planner-produzione",
    voci: [
      { label: "📋 Planning", route: "planner-produzione" },
      { label: "🏭 Produzione", route: "produzione" },
      { label: "🟢 Produzioni aperte", route: "produzioni-aperte" },
      { label: "🧪 Preparazioni", route: "preparazioni" },
      { label: "📒 Registro lotti", route: "registro-lotti" },
      { label: "📷 Lotti in arrivo", route: "lotti-fornitore" },
      { label: "🔪 Sezionatura", route: "sezionatura" },
      { label: "⏰ Scadenze", route: "scadenze" },
      { label: "📖 Ricettario", route: "ricettario" },
      { label: "🍽️ Menu del giorno", route: "menu-giorno" },
      { label: "🏭 Schermo produzioni", route: "kds-produzioni" },
    ],
    extra: ["home-cucina", "app-produzione", "produzioni-storico", "crea-ricetta", "crea-ricetta-avanzata",
            "scheda-evento", "giorni-lavorazione", "cotture-cbt", "banchetto-foto", "cc-sedi", "modelli-buffet"],
  },
  "marketing": {
    nome: "Marketing", titolo: "📣 MARKETING", icona: "📣", inizio: "bo-marketing",
    voci: [
      { label: "📣 Campagne", route: "bo-marketing" },
      { label: "📈 Risultati campagne", route: "bo-risultati-campagne" },
      { label: "🔥 Clienti caldi", route: "bo-clienti-caldi" },
      { label: "🎁 Promo", route: "bo-promo" },
      { label: "📧 Mail marketing", route: "mail-marketing" },
      { label: "🎫 Fidelity", route: "bo-fidelity" },
      { label: "⭐ Recensioni ricevute", route: "recensioni-ricevute" },
      { label: "📱 WhatsApp", route: "bo-whatsapp" },
      { label: "📅 Calendario editoriale", route: "bo-calendario" },
      { label: "📱 Storie", route: "bo-storie" },
      { label: "🌐 Sito web", route: "bo-sito" },
      { label: "🖼️ Media", route: "bo-media" },
    ],
    extra: ["bo-analytics", "bo-promo-analisi", "bo-voucher", "bo-catenarie", "bo-shortlink", "bo-template",
            "bo-chatbot", "registro-messaggi", "bo-tag", "bo-sondaggi-clienti", "recensioni", "bo-menzioni",
            "bo-crediti", "promemoria", "richiami", "ai"],
  },
  "eventi": {
    nome: "Eventi", titolo: "🎪 EVENTI", icona: "🎪", inizio: "preventivi",
    voci: [
      { label: "📑 Preventivi", route: "preventivi" },
      { label: "🌍 Richieste dal sito", route: "richieste-sito" },
      { label: "🍽 Modelli di menu", route: "menu-tipo" },
      { label: "🌐 Preventivo online", route: "preventivo-online" },
      { label: "🎪 Servizi e personale", route: "servizi-eventi" },
    ],
    extra: ["creaPreventivo", "bo-location-ricevimenti", "isole-buffet", "menu-componibile"],
  },
  "personale": {
    nome: "Personale", titolo: "👥 PERSONALE", icona: "👥", inizio: "timbrature",
    voci: [
      { label: "🕒 Timbratura", route: "timbrature" },
      { label: "📆 Planning lavoro", route: "planning-lavoro" },
      { label: "👨‍💼 Dipendenti", route: "dipendenti" },
      { label: "📋 Cartellino ore", route: "bo-presenze" },
      { label: "📆 Ferie", route: "hr-admin" },
      { label: "💶 Buste paga", route: "hr-buste-paga" },
      { label: "📁 I miei documenti", route: "hr-documenti-me" },
    ],
    extra: ["dipendente", "crea-dipendente", "hr-richieste", "hr-fascicolo", "hr-documenti", "hr-costi", "profilo"],
  },
  "magazzino": {
    nome: "Magazzino", titolo: "📦 MAGAZZINO", icona: "📦", inizio: "magazzino",
    voci: [
      { label: "📦 Magazzino", route: "magazzino" },
      { label: "🛒 Ordini fornitori", route: "acquisti?tab=ordini" },
      { label: "🧾 Fatture", route: "acquisti?tab=fatture" },
      { label: "🧰 Attrezzature", route: "magazzino-attrezzature" },
    ],
    extra: ["acquisti", "bo-magazzino"],
  },
};

// Tablet bloccato: il codice sta in locale, lo stato vero nel database (tablet_bloccati).
// Nessuna uscita dal tablet, nemmeno per un admin: si sblocca dal telefono dell'admin.
const DA_BLOCCO = { ordini: "tablet-ordini", cassa: "cassa", cucina: "cucina" };
function chiaviBlocco(aid) { return { tok: "rf_tablet_token_" + aid, tipo: "rf_tablet_tipo_" + aid }; }

export function appBloccoDispositivo() {
  // Prima del caricamento dell'azienda vale quella salvata sul dispositivo:
  // il blocco deve agire gia' dalla prima rotta, non dopo il contesto.
  const aid = window.state?.azienda?.id || window.__rfAziendaSalvata || null;
  if (!aid) return null;
  const k = chiaviBlocco(aid);
  if (!localStorage.getItem(k.tok)) return null;
  return DA_BLOCCO[localStorage.getItem(k.tipo)] || null;
}

export function salvaBlocco(aid, token, tipo) {
  const k = chiaviBlocco(aid);
  localStorage.setItem(k.tok, token);
  localStorage.setItem(k.tipo, tipo);
}

// Chiede al database se il tablet e' ancora bloccato. Sbloccato dall'admin -> torna Ristoflow normale.
async function verificaBlocco() {
  const aid = window.state?.azienda?.id;
  const sb = window.supabaseClient || window.supabase;
  if (!aid || !sb?.rpc) return;
  const k = chiaviBlocco(aid);
  const tok = localStorage.getItem(k.tok);
  if (!tok) return;
  const { data, error } = await sb.rpc("stato_tablet", { p_token: tok });
  if (error) return;                       // rete assente: resta bloccato
  if (!data) {
    localStorage.removeItem(k.tok); localStorage.removeItem(k.tipo); localStorage.removeItem("rf_tablet_sede_" + aid);
    // Account del locale (attivato con codice): sbloccato il tablet, si esce
    try {
      const { data: u } = await sb.auth.getUser();
      if (u?.user?.email && /@dispositivi\.ristoflow-ai\.com$/.test(u.user.email)) await sb.auth.signOut();
    } catch (e) {}
    window.location.hash = "#/login"; location.reload();
    return;
  }
  let ricarica = false;
  if (data.tipo !== localStorage.getItem(k.tipo)) { localStorage.setItem(k.tipo, data.tipo); ricarica = true; }
  if (data.sede_id && localStorage.getItem("rf_tablet_sede_" + aid) !== data.sede_id) {
    localStorage.setItem("rf_tablet_sede_" + aid, data.sede_id);
    ricarica = true;
  }
  if (data.sede_id && localStorage.getItem("active_sede_id") !== data.sede_id) {
    localStorage.setItem("active_sede_id", data.sede_id);
    ricarica = true;
  }
  if (ricarica) location.reload();
}

export function avviaControlloBlocco() {
  if (window.__rfBloccoCtl || !appBloccoDispositivo()) return;
  window.__rfBloccoCtl = true;
  verificaBlocco();
  setInterval(verificaBlocco, 120000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) verificaBlocco(); });
}

export function appDaIndirizzo() {
  const id = new URLSearchParams(window.location.search).get("app");
  return id && APP_PROFILI[id] ? id : null;
}

// L'app attiva: prima l'indirizzo (icona installata / app nativa), poi il blocco del dispositivo.
export function appAttiva() {
  const id = appDaIndirizzo() || appBloccoDispositivo();
  return id ? Object.assign({ id: id, bloccata: !appDaIndirizzo() }, APP_PROFILI[id]) : null;
}

export function rotteApp(p) {
  const s = new Set(p.extra || []);
  (p.voci || []).forEach(function (v) { s.add(String(v.route).split("?")[0]); });
  return s;
}

// ── PALLINO SULL'ICONA: quante cose aspettano in questa app ──
// Conta con le regole RLS dell'utente collegato, quindi ognuno vede solo il suo.
// Si aggiorna all'apertura, ogni minuto e quando si torna sull'app.
const CONTEGGI = {
  // comande aperte o in corso della sede
  comande: function (sb, aid, sede) {
    let q = sb.from("comande").select("id", { count: "exact", head: true })
      .eq("azienda_id", aid).in("stato", ["aperta", "in_corso"]);
    if (sede) q = q.eq("sede_id", sede);
    return q;
  },
  // prenotazioni da oggi in poi ancora da confermare o da pagare
  prenotazioni: function (sb, aid, sede) {
    const oggi = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
    let q = sb.from("prenotazioni_tavoli").select("id", { count: "exact", head: true })
      .eq("azienda_id", aid).in("stato", ["in_attesa", "in_attesa_pagamento"]).gte("data", oggi);
    if (sede) q = q.eq("sede_id", sede);
    return q;
  },
  // produzioni iniziate e non ancora chiuse
  produzione: function (sb, aid) {
    return sb.from("produzione_lotti").select("id", { count: "exact", head: true })
      .eq("azienda_id", aid).eq("stato", "aperta");
  },
  // richieste di ferie/permessi in attesa
  personale: function (sb, aid) {
    return sb.from("hr_richieste").select("id", { count: "exact", head: true })
      .eq("azienda_id", aid).eq("stato", "in_attesa");
  },
};
const CONTA_PER_APP = {
  "tablet-ordini": "comande", "cassa": "comande", "comande": "comande", "cucina": "produzione",
  "prenotazioni": "prenotazioni", "produzione": "produzione", "personale": "personale",
};

async function aggiornaPallino() {
  try {
    const app = appAttiva();
    if (!app || !("setAppBadge" in navigator)) return;
    const chiave = CONTA_PER_APP[app.id];
    const aid = window.state?.azienda?.id;
    const sb = window.supabaseClient || window.supabase;
    if (!chiave || !aid || !sb?.from) return;
    const { count, error } = await CONTEGGI[chiave](sb, aid, window.state?.sedeAttiva?.id || null);
    if (error) return;
    if (count > 0) navigator.setAppBadge(count); else navigator.clearAppBadge();
  } catch (e) { /* il pallino non deve mai bloccare l'app */ }
}

export function avviaPallino() {
  if (window.__rfPallino) return;
  window.__rfPallino = true;
  aggiornaPallino();
  setInterval(aggiornaPallino, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) aggiornaPallino(); });
}
