// TONY-CAMPAGNE-CHAT — lo specialista di Tony per le campagne Meta e Google, dalla chat.
// Come gli altri strumenti di Tony: PROPONE con una scheda (Anteprima / Conferma / Annulla) e SOLO al tocco di Conferma pubblica.
//  - proponi_campagna: crea la campagna di un modello pronto (menu business, compleanni) su Meta e/o Google, SEMPRE IN PAUSA
//  - proponi_campagna_piatto: promuove UN piatto in due modalita':
//      'prenotazione' = landing con modulo di prenotazione (tabella landing_promo, pagina /promo-piatto.html)
//      'promo'        = PROMO CON COUPON del modulo Promo (tabella promo, pagina /promo.html): coupon scaricabile, giorni validi, regolamento, QR in cassa
//    In entrambe: post Meta lungo in schema AIDA, annunci Google Display, recensioni vere, foto del piatto.
//  - proponi_landing: SOLO la landing di prenotazione, sul MODELLO DELLA CASA (piatto, menu/offerta, evento), senza campagne
//  - elenco_media: foto e video della libreria della sede, per scegliere l'hero (sola lettura)
//  - proponi_stato_campagna: accende o mette in pausa una campagna esistente (anche questa con scheda)
//  - stato_campagne: legge stato e numeri (sola lettura)
//  - analisi_visite: visite VERE alle landing (persone vs robot), cosa toccano, passi di preventivo e visita, risultati (sola lettura)
//  - interazioni_campagne: reazioni, commenti, condivisioni, salvataggi, video visti (Meta) e spesa/clic (Meta e Google) di oggi, ieri, 7 o 30 giorni (sola lettura)
//  - termini_ricerca: le ricerche vere che hanno fatto comparire gli annunci di Google Ricerca (sola lettura)
//  - proponi_esclusioni: pulizia delle parole chiave di una campagna Google Ricerca (parole escluse, parole nuove), con scheda; alla Conferma chiama google-ads-ottimizza
// La chat (js/views/ai.js) manda qui i messaggi su campagne e pubblicita' (scritti o dettati); la conferma torna qui con { conferma }.
// Solo un amministratore dell'azienda puo' usarlo. Il motore e' Claude con ripiego su un secondo modello.
// v2: niente 'temperature'. v4: nome del LOCALE, non inventa ingredienti. v5: mai "Fatto." a vuoto. v6: periodo (inizio/durata) calcolato dal sistema.
// v7: promo di un piatto su Google = DISPLAY. v8: i fatti (sconti, 2x1, prezzi...) solo dall'utente o dai dati veri del locale. v9: AIDA lungo + landing.
// v10: modalita' 'promo' con coupon, cosa da' il coupon detto dall'UTENTE (controllo del sistema).
// v11: ANTEPRIMA PRIMA DELLA CONFERMA: alla proposta si crea una BOZZA della landing/promo (visibile col suo link, non emette coupon ne' prenotazioni),
//      l'anteprima UFFICIALE del post Meta (generatepreviews) e la pagina riepilogo con la simulazione Google Display (campagne_bozze + /anteprima-campagna.html).
//      Alla Conferma la bozza viene ATTIVATA (non ricreata) e partono le campagne in pausa. Le bozze non confermate si cancellano da sole dopo 12 ore.
// v12: MODELLO LANDING DELLA CASA (dal Menu business della Trattoria): proponi_landing (tipi piatto/menu/evento) con etichetta, offerta in evidenza
//      (prezzo SOLO se detto dall'utente, cosa comprende, orari), contenuto/menu, secondo bottone, hero foto o VIDEO dalla libreria media (elenco_media).
//      Le regole in pagina sono la BOOKING POLICY del modulo di prenotazione della sede (la legge la pagina), non piu' un regolamento scritto qui.
// v13: MENU DEL GIORNO COLLEGATO (menu_dinamico='menu_giorno'): la landing mostra da sola i piatti del giorno scritti nell'app e si aggiorna ogni giorno.
//      Hero pulito: sul video/foto solo etichetta, titolo e prezzo; il sottotitolo va sotto.
// v16: analisi_visite (funzione del database analisi_visite): persone vere contro robot e controlli di Meta, sezioni viste, clic,
//      domande aperte, passi del preventivo online e della prenotazione visite, preventivi e visite davvero arrivati.
// v17: PIU' VELOCE: memoria delle istruzioni (prompt caching): strumenti e regole fisse restano in cache 5 minuti, la seconda chiamata
//      dello stesso giro e le domande che seguono non le rileggono da capo. In prova restituisce anche i tempi e i token letti dalla cache.
// v18: interazioni_campagne: legge da Meta (insights per campagna) reazioni, commenti, condivisioni, salvataggi, video visti, clic sul link,
//      persone raggiunte, e da Google spesa/clic/impression, per oggi, ieri, 7 o 30 giorni. Prima Tony diceva di non poterli leggere.
//      Regola nuova: Tony non dice mai di aver preparato una scheda o fatto una modifica se non ha chiamato davvero uno strumento proponi_.
// v20 (unione della v19 con lo streaming): con { stream: true } la risposta arriva a pezzi mentre il modello la scrive (eventi testo / azzera / fine);
//      risposte di LETTURA (visite, andamento, interazioni) al massimo 5 righe corte; dati del locale (metodo, identita', recensioni) in memoria 5 minuti.
// v21: streaming sistemato: niente blocchi di testo vuoti rimandati al modello (davano "text content blocks must be non-empty" con piu' strumenti),
//      risposta di Anthropic chiesta non compressa (la decompressione tratteneva i pezzi), pacchetto iniziale perche' le intestazioni partano subito.
// v22: PULIZIA PAROLE CHIAVE GOOGLE dalla chat: termini_ricerca (legge search_term_view via google-ads-leggi) e proponi_esclusioni (scheda,
//      alla Conferma google-ads-ottimizza: escluse a frase a livello campagna + parole nuove nel gruppo). Prima Tony diceva di non poterlo fare.
//      ATTENZIONE: questa funzione e' stata modificata da due sessioni in parallelo: prima di ripubblicarla leggere SEMPRE la versione attiva.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const sb = createClient(SUPABASE_URL, SERVICE);
const LANDING_BASE = "https://app.ristoflow-ai.com/promo-piatto.html";
const PROMO_BASE = "https://app.ristoflow-ai.com/promo.html";
const ANTEPRIMA_BASE = "https://app.ristoflow-ai.com/anteprima-campagna.html";
const GN = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];
const GP = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"]; // promo: 1 = lunedi ... 7 = domenica

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-prova",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function firma(testo: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SERVICE), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(testo));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const testoAzione = (a: any, uid: string, az: string) => JSON.stringify([a.tipo, a.dati, uid, az]);

function chiaveAnthropic(): string {
  for (const n of ["ANTHROPIC_API_KEY", "ANTHROPIC_KEY", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY_AI"]) { const v = Deno.env.get(n); if (v) return v.trim(); }
  const tutte = Deno.env.toObject();
  for (const k of Object.keys(tutte)) if (String(tutte[k]).startsWith("sk-ant-")) return String(tutte[k]).trim();
  return "";
}

type Ctx = { aziendaId: string; uid: string; sedeId: string | null; token: string; prova: string; azienda: string; proposte: any[]; testoUtente: string; fattiAmmessi: string; immagini?: string[] };

async function chiamaInterna(c: Ctx, nome: string, corpo: any): Promise<any> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (c.prova) h["x-prova"] = c.prova; else h["Authorization"] = "Bearer " + c.token;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${nome}`, { method: "POST", headers: h, body: JSON.stringify(corpo) });
    return await r.json();
  } catch (e) { return { success: false, error: "funzione non raggiungibile: " + (e instanceof Error ? e.message : e) }; }
}

const eur = (v: number) => (Math.round(v * 100) / 100).toLocaleString("it-IT") + " \u20ac";
const citta = (s: unknown) => String(s || "").replace(/\s*\(.*?\)\s*/g, " ").trim();
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const PAROLE_NUM = ["", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci", "undici", "dodici"];
// un numero e' stato detto dall'utente se compare in cifre o in lettere (1-12)
function numeroDetto(n: number, u: string): boolean {
  const cifre = new RegExp("(^|[^0-9])" + String(n).replace(".", "[.,]") + "([^0-9]|$)");
  if (cifre.test(u)) return true;
  return Number.isInteger(n) && n >= 1 && n <= 12 && new RegExp("\\b" + PAROLE_NUM[n] + "\\b").test(u);
}
const etichettaCoupon = (cp: any) => cp.tipo === "2x1" ? "2\u00d71" : cp.tipo === "sconto_perc" ? `-${cp.valore}%` : cp.tipo === "sconto_euro" ? `-${cp.valore} \u20ac` : "omaggio";

// dettagli commerciali (sconti, 2x1, prezzi, percentuali, omaggi) presenti nel testo ma NON detti dall'utente ne' presenti nei dati veri del locale
function dettagliInventati(copy: string, fattiAmmessi: string): string[] {
  const t = copy.toLowerCase();
  const u = fattiAmmessi.toLowerCase().replace(/\s+/g, " ");
  const uc = u.replace(/\s/g, "");
  const pattern: RegExp[] = [
    /\b\d+\s*[x\u00d7]\s*\d+\b/g,
    /\b\d+\s*\+\s*\d+\b/g,
    /\d+\s*%/g,
    /\b\d+(?:[.,]\d+)?\s*(?:\u20ac|euro)/g,
    /\b(?:sconto|scontat\w*|gratis|gratuit\w*|omaggio|in regalo|offerta|offerte|prezzo speciale|prezzo bloccato|due al prezzo di uno|uno gratis|1 gratis|paghi uno)\b/g,
  ];
  const trovati = new Set<string>();
  for (const re of pattern) {
    for (const m of t.matchAll(re)) {
      const s = m[0].trim();
      if (!u.includes(s) && !uc.includes(s.replace(/\s/g, ""))) trovati.add(s);
    }
  }
  return [...trovati];
}

// ---- metodo del titolare + identita' + fatti veri, letti dal database (in memoria 5 minuti) ----
async function caricaMetodo(aziendaId: string, sedeId: string | null): Promise<{ testo: string; ammessi: string }> {
  const ammessi: string[] = [];
  const parti: string[] = [];
  try {
    const { data: kb } = await sb.from("tony_knowledge_base").select("titolo, contenuto")
      .or("titolo.ilike.AIDA per ristorazione*,titolo.ilike.Regola copy*,titolo.ilike.Golden Circle prima*,titolo.ilike.Post social che convertono*");
    if (kb?.length) parti.push("METODO DEL TITOLARE (scritto da lui nel database: vale piu' di ogni tua abitudine)\n" + kb.map((k: any) => `## ${k.titolo}\n${k.contenuto}`).join("\n\n"));
  } catch { /* il metodo e' un di piu' */ }
  try {
    const [{ data: idn }, { data: ris }, { data: sid }] = await Promise.all([
      sb.from("azienda_identita").select("gc_why,gc_how,gc_what,posizionamento,promessa_cliente,tone_of_voice,cliente_ideale,differenziazione").eq("azienda_id", aziendaId).maybeSingle(),
      sb.from("azienda_identita_risposte").select("domanda_chiave,risposta,ordine").eq("azienda_id", aziendaId).order("ordine"),
      sedeId ? sb.from("sede_identita").select("mission,posizionamento,cliente_ideale,tone_of_voice").eq("sede_id", sedeId).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);
    const righe: string[] = [];
    const et: Record<string, string> = { perche: "Perche' esiste (il WHY)", ricordo: "Il ricordo che vuole far vivere", diverso: "Cosa lo rende diverso" };
    for (const r of ris || []) if (r.risposta && String(r.risposta).trim()) righe.push(`- ${et[r.domanda_chiave] || r.domanda_chiave}: ${String(r.risposta).trim()}`);
    const campi: Record<string, string> = { gc_why: "Golden Circle - WHY", gc_how: "Golden Circle - HOW", gc_what: "Golden Circle - WHAT", posizionamento: "Posizionamento", promessa_cliente: "Promessa al cliente", tone_of_voice: "Tono di voce", cliente_ideale: "Cliente ideale", differenziazione: "Differenziazione" };
    for (const [k, l] of Object.entries(campi)) { const v = (idn as any)?.[k]; if (v && String(v).trim()) righe.push(`- ${l}: ${String(v).trim()}`); }
    for (const [k, l] of Object.entries({ mission: "Missione della sede", posizionamento: "Posizionamento della sede", cliente_ideale: "Cliente ideale della sede", tone_of_voice: "Tono di voce della sede" })) { const v = (sid as any)?.[k]; if (v && String(v).trim()) righe.push(`- ${l}: ${String(v).trim()}`); }
    if (righe.length) { parti.push("IDENTITA' DEL LOCALE (scritta dal titolare: e' l'UNICA fonte del 'perche' del locale; non aggiungere altro)\n" + righe.join("\n")); ammessi.push(righe.join(" ")); }
  } catch { /* idem */ }
  try {
    let q = sb.from("recensioni").select("autore,voto,testo").eq("azienda_id", aziendaId).eq("visibile", true).eq("verificata", true).not("voto", "is", null).order("created_at", { ascending: false }).limit(40);
    if (sedeId) q = q.eq("sede_id", sedeId);
    const { data: rv } = await q;
    if (rv?.length) {
      const media = Math.round((rv.reduce((s: number, r: any) => s + Number(r.voto || 0), 0) / rv.length) * 10) / 10;
      const esempi = rv.filter((r: any) => Number(r.voto) >= 4 && String(r.testo || "").trim()).slice(0, 4).map((r: any) => `"${String(r.testo).trim().slice(0, 200)}" (${r.autore || "un ospite"}, ${r.voto}/5)`);
      parti.push(`FATTI VERI PER LA PROVA SOCIALE: ${rv.length} recensioni verificate, media ${String(media).replace(".", ",")} su 5. Esempi (citabili solo cosi', senza cambiarli):\n` + esempi.map((e: string) => "- " + e).join("\n"));
      ammessi.push(`${rv.length} recensioni media ${media} su 5 ` + esempi.join(" "));
    }
  } catch { /* idem */ }
  // v23: lo STILE DEI POST della pagina, deciso dal titolare (stile_post): lo usa proponi_post
  try {
    const { data: st } = await sb.from("stile_post").select("usa_emoji,usa_grassetto,struttura,da_evitare,firma_finale").eq("azienda_id", aziendaId).maybeSingle();
    if (st) {
      const r: string[] = [];
      if (st.struttura) r.push(String(st.struttura));
      r.push(st.usa_emoji ? "Emoji ammesse, con misura." : "Niente emoji.");
      if (!st.usa_grassetto) r.push("Niente grassetto.");
      if (st.da_evitare) r.push("DA EVITARE: " + String(st.da_evitare));
      if (st.firma_finale) r.push("Chiusura: " + String(st.firma_finale));
      parti.push("STILE DEI POST DELLA PAGINA (deciso dal titolare: vale per proponi_post)\n" + r.join("\n"));
    }
  } catch { /* lo stile e' un di piu' */ }
  return { testo: parti.join("\n\n"), ammessi: ammessi.join(" ") };
}
const CACHE_METODO = new Map<string, { t: number; v: { testo: string; ammessi: string } }>();
async function caricaMetodoVeloce(aziendaId: string, sedeId: string | null) {
  const k = aziendaId + "|" + (sedeId || "");
  const x = CACHE_METODO.get(k);
  if (x && Date.now() - x.t < 300000) return x.v;
  const v = await caricaMetodo(aziendaId, sedeId);
  CACHE_METODO.set(k, { t: Date.now(), v: v });
  return v;
}

// ---- date (ora di Roma) ----
const oggiRoma = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const piuGiorni = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dataBreve = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
const dataLunga = (iso: string) => iso.split("-").reverse().join("/");
function periodo(inizioIn: unknown, durata: unknown): { inizio: string | null; fine: string | null; errore?: string } {
  const oggi = oggiRoma();
  const s = String(inizioIn ?? "").trim().toLowerCase();
  let ini: string | null = null;
  if (s === "domani") ini = piuGiorni(oggi, 1);
  else if (s === "dopodomani") ini = piuGiorni(oggi, 2);
  else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) ini = s;
  if (ini && ini < oggi) return { inizio: null, fine: null, errore: "la data di inizio e' gia' passata" };
  const n = Math.round(Number(durata) || 0);
  if (n > 120) return { inizio: null, fine: null, errore: "la durata massima e' 120 giorni" };
  const base = ini || oggi;
  return { inizio: ini && ini > oggi ? ini : null, fine: n > 0 ? piuGiorni(base, n - 1) : null };
}
const testoPeriodo = (p: { inizio: string | null; fine: string | null }) =>
  p.inizio && p.fine ? ` \u00b7 dal ${dataBreve(p.inizio)} al ${dataBreve(p.fine)}` : p.inizio ? ` \u00b7 da ${dataBreve(p.inizio)}` : p.fine ? ` \u00b7 fino al ${dataBreve(p.fine)}` : "";

// la pagina e' davvero online?
async function urlOnline(url: string) {
  try { const r = await fetch(url, { method: "HEAD", redirect: "follow" }); return r.ok; } catch { return false; }
}
async function paginaOnline(aziendaId: string, sedeId: string | null, percorso: string) {
  const q = sb.from("sito_config").select("dominio").eq("azienda_id", aziendaId);
  const { data } = await (sedeId ? q.eq("sede_id", sedeId) : q).limit(1);
  const dom = data?.[0]?.dominio;
  if (!dom) return { url: null, ok: false };
  const url = `https://${dom}${percorso}`;
  return { url, ok: await urlOnline(url) };
}

// foto della landing (quella leggera creata alla pubblicazione), per l'annuncio
async function immagineLanding(aziendaId: string): Promise<string | null> {
  try {
    const { data } = await sb.storage.from("media-aziende").list(`sito/${aziendaId}`, { limit: 100, search: "landing-" });
    const f = (data || []).filter((x: any) => /^landing-.*\.(jpg|jpeg|png|webp)$/i.test(x.name)).sort((a: any, b: any) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))[0];
    return f ? sb.storage.from("media-aziende").getPublicUrl(`sito/${aziendaId}/${f.name}`).data.publicUrl : null;
  } catch { return null; }
}

// foto del piatto: dalla ricetta (o dalla voce di menu con lo stesso nome)
async function fotoPiatto(aziendaId: string, piatto: string): Promise<string | null> {
  const parole = piatto.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (!parole.length) return null;
  const cerca = async (tabella: string) => {
    const { data } = await sb.from(tabella).select("nome, foto_url").eq("azienda_id", aziendaId).not("foto_url", "is", null).ilike("nome", `%${parole[0]}%`).limit(20);
    const tutte = (data || []).filter((r: any) => r.foto_url);
    const buona = tutte.find((r: any) => parole.every((w) => String(r.nome).toLowerCase().includes(w)));
    return (buona || tutte[0])?.foto_url || null;
  };
  return (await cerca("ricette")) || (await cerca("menu_voci"));
}

// libreria media della sede: foto e video con descrizione, per scegliere l'hero della landing
async function elencoMedia(c: Ctx, cerca: string, tipo: string): Promise<any[]> {
  let q = sb.from("media_library").select("id,tipo,nome,descrizione,soggetti,adatta_a,qualita,orientamento,durata_sec")
    .eq("azienda_id", c.aziendaId).or("archiviata.is.null,archiviata.eq.false");
  if (c.sedeId) q = q.or(`sede_id.eq.${c.sedeId},sede_id.is.null`);
  if (tipo === "immagine" || tipo === "video") q = q.eq("tipo", tipo);
  const parola = String(cerca || "").toLowerCase().replace(/[^a-z\u00e0-\u00f9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3)[0];
  if (parola) q = q.or(`descrizione.ilike.%${parola}%,nome.ilike.%${parola}%`);
  const { data } = await q.order("qualita", { ascending: false, nullsFirst: false }).limit(30);
  return (data || []).map((m: any) => ({ id: m.id, tipo: m.tipo, nome: m.nome, descrizione: String(m.descrizione || "").slice(0, 160) || null, soggetti: m.soggetti, adatta_a: m.adatta_a, qualita: m.qualita, orientamento: m.orientamento, durata_sec: m.durata_sec }));
}

// la sede scrive il menu del giorno nell'app? (ultime 2 settimane)
async function haMenuGiorno(sedeId: string | null): Promise<boolean> {
  if (!sedeId) return false;
  const { data } = await sb.from("menu_giorno").select("id").eq("sede_id", sedeId).gte("data", piuGiorni(oggiRoma(), -14)).limit(1);
  return !!data?.length;
}

async function elencoLive(c: Ctx, piattaforma: "meta" | "google") {
  if (piattaforma === "google") {
    const j = await chiamaInterna(c, "google-ads-campagne", { azienda_id: c.aziendaId, azione: "elenco" });
    if (!j.success) return { errore: j.error || "Google non risponde", codice: j.codice };
    return { totali_30g: j.totali, campagne: (j.campagne || []).map((x: any) => ({ id: x.id, nome: x.nome, stato: x.stato === "ENABLED" ? "attiva" : "in pausa", tipo: x.tipo, budget_giorno_eur: x.budget_eur, spesa_30g_eur: x.spesa_eur, clic_30g: x.clic })) };
  }
  const j = await chiamaInterna(c, "meta-ads-campagne", { azienda_id: c.aziendaId, sede_id: c.sedeId, azione: "elenco" });
  if (!j.success) return { errore: j.error || "Meta non risponde", codice: j.codice };
  const tutte = (j.campagne || []).map((x: any) => ({ id: x.id, nome: x.nome, stato: x.stato === "ACTIVE" ? "attiva" : "in pausa", budget_giorno_eur: x.budget_eur, spesa_30g_eur: x.spesa_eur, clic_30g: x.clic }));
  return { campagne: [...tutte.filter((x: any) => x.stato === "attiva"), ...tutte.filter((x: any) => x.stato !== "attiva").slice(0, 8)] };
}

// ---- v18: interazioni vere delle campagne (Meta: reazioni, commenti, condivisioni, salvataggi, video; Google: spesa e clic) per oggi/ieri/7/30 giorni ----
const PERIODI_INT: Record<string, { meta: string; google: string; testo: string }> = {
  oggi: { meta: "today", google: "TODAY", testo: "oggi" },
  ieri: { meta: "yesterday", google: "YESTERDAY", testo: "ieri" },
  "7_giorni": { meta: "last_7d", google: "LAST_7_DAYS", testo: "ultimi 7 giorni (oggi escluso)" },
  "30_giorni": { meta: "last_30d", google: "LAST_30_DAYS", testo: "ultimi 30 giorni (oggi escluso)" },
};
const AZIONI_META: Record<string, string> = {
  post_reaction: "reazioni_mi_piace", comment: "commenti", post: "condivisioni", "onsite_conversion.post_save": "salvataggi",
  video_view: "video_visti_3s", like: "nuovi_mi_piace_pagina", link_click: "clic_sul_link", post_engagement: "interazioni_totali",
};
async function interazioniCampagne(c: Ctx, periodoIn: string): Promise<any> {
  const p = PERIODI_INT[periodoIn] || PERIODI_INT.oggi;
  const out: any = { periodo: p.testo, meta: null, google: null };
  // META
  try {
    const { data: conns } = await sb.from("meta_ads_connessioni").select("account_id, access_token").eq("azienda_id", c.aziendaId).eq("attivo", true);
    const visti: Record<string, boolean> = {};
    const campagne: any[] = [];
    const errori: string[] = [];
    for (const cn of conns || []) {
      const acc = String(cn.account_id || "").replace(/^act_/, "");
      if (!acc || !cn.access_token || visti[acc]) continue;
      visti[acc] = true;
      const url = "https://graph.facebook.com/v21.0/act_" + acc + "/insights?level=campaign&date_preset=" + p.meta +
        "&fields=campaign_id,campaign_name,spend,reach,impressions,inline_link_clicks,actions&limit=200&access_token=" + encodeURIComponent(cn.access_token);
      const r = await fetch(url);
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok || j.error) { errori.push("account " + acc + ": " + (j?.error?.message || ("HTTP " + r.status))); continue; }
      for (const x of j.data || []) {
        const riga: any = { campagna: x.campaign_name, spesa_eur: Math.round(Number(x.spend || 0) * 100) / 100, persone_raggiunte: Number(x.reach || 0), impression: Number(x.impressions || 0) };
        for (const k of Object.keys(AZIONI_META)) riga[AZIONI_META[k]] = 0;
        for (const a of x.actions || []) { const n = AZIONI_META[a.action_type]; if (n) riga[n] = Number(a.value || 0); }
        if (!riga.clic_sul_link && x.inline_link_clicks) riga.clic_sul_link = Number(x.inline_link_clicks);
        campagne.push(riga);
      }
    }
    campagne.sort((a, b) => b.interazioni_totali - a.interazioni_totali || b.spesa_eur - a.spesa_eur);
    const totali: any = { spesa_eur: 0, impression: 0 };
    for (const k of Object.keys(AZIONI_META)) totali[AZIONI_META[k]] = 0;
    for (const r of campagne) for (const k of Object.keys(totali)) totali[k] += Number(r[k] || 0);
    totali.spesa_eur = Math.round(totali.spesa_eur * 100) / 100;
    out.meta = { totali, campagne, nota: "persone_raggiunte non si somma tra campagne (la stessa persona puo' vederne piu' di una). Interazioni solo dei post SPONSORIZZATI.", ...(errori.length ? { errori } : {}) };
    if (!(conns || []).length) out.meta = { errore: "Meta non e' collegato" };
  } catch (e) { out.meta = { errore: "non riesco a leggere Meta: " + (e instanceof Error ? e.message : String(e)) }; }
  // GOOGLE (sulla Rete di ricerca non esistono like o condivisioni: solo impression, clic, spesa)
  try {
    const j = await chiamaInterna(c, "google-ads-leggi", { azienda_id: c.aziendaId, query: ["select campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions from campaign where segments.date DURING " + p.google + " and metrics.impressions > 0"] });
    const ris = j?.risultati?.[0];
    if (!j?.success || !ris?.ok) out.google = { errore: (ris && ris.errore) || j?.error || "Google non risponde" };
    else {
      const camp = (ris.righe || []).map((x: any) => ({ campagna: x.campaign?.name, spesa_eur: Math.round(Number(x.metrics?.costMicros || 0) / 10000) / 100, clic: Number(x.metrics?.clicks || 0), impression: Number(x.metrics?.impressions || 0) }))
        .sort((a: any, b: any) => b.spesa_eur - a.spesa_eur);
      const tot = camp.reduce((s: any, r: any) => ({ spesa_eur: Math.round((s.spesa_eur + r.spesa_eur) * 100) / 100, clic: s.clic + r.clic, impression: s.impression + r.impression }), { spesa_eur: 0, clic: 0, impression: 0 });
      out.google = { totali: tot, campagne: camp };
    }
  } catch (e) { out.google = { errore: "non riesco a leggere Google: " + (e instanceof Error ? e.message : String(e)) }; }
  return out;
}

const MODELLI: Record<string, { nome: string; piattaforme: string[]; raggio: number; budget: Record<string, number> }> = {
  menu_business: { nome: "Menu business", piattaforme: ["meta", "google"], raggio: 25, budget: { meta: 5, google: 8 } },
  compleanni: { nome: "Compleanni", piattaforme: ["meta"], raggio: 30, budget: { meta: 10 } },
};
const BUDGET_MAX = 30;

const PERIODO_PROPS = {
  inizio: { type: "string", description: "quando parte: 'oggi', 'domani', 'dopodomani' oppure una data YYYY-MM-DD. Solo se l'utente lo dice" },
  durata_giorni: { type: "number", description: "per quanti giorni resta in corso (es. 30). Solo se l'utente lo dice; senza, non ha una data di fine" },
};

const AIDA_LANDING_PROPS = {
  landing_titolo: { type: "string", description: "titolo grande della landing, MAX 60 caratteri: CORTO e POTENTE, sta sopra il video/foto (es. 'Pausa pranzo fatta bene.')" },
  landing_sottotitolo: { type: "string", description: "frase di apertura, MAX 140 caratteri: se c'e' il prezzo va SOTTO l'hero, non sopra il video" },
  landing_attenzione: { type: "string", description: "AIDA - ATTENZIONE: una domanda o frase forte che apre la pagina, MAX 200 caratteri" },
  landing_interesse: { type: "string", description: "AIDA - INTERESSE: il problema comune e il contrasto positivo, da 150 a 700 caratteri, anche su due paragrafi" },
  landing_desiderio: { type: "string", description: "AIDA - DESIDERIO: il perche' del locale (dall'IDENTITA' DEL LOCALE) e cosa vive chi viene, da 200 a 800 caratteri, anche su due paragrafi" },
  landing_azione: { type: "string", description: "AIDA - AZIONE: invito specifico con il beneficio, MAX 250 caratteri (promo: scarica il coupon; prenotazione: prenota). Mai 'ti aspettiamo'" },
};

const TOOLS = [
  { name: "stato_campagne", description: "Legge lo stato reale delle campagne (attive o in pausa) con spesa e click degli ultimi 30 giorni, su Meta e su Google. Sola lettura.",
    input_schema: { type: "object", properties: { piattaforma: { type: "string", enum: ["meta", "google", "entrambe"] } } } },
  { name: "interazioni_campagne", description: "Legge le INTERAZIONI VERE delle campagne in un periodo (sola lettura). Da Meta, campagna per campagna: spesa, persone raggiunte, impression, reazioni e mi piace ai post sponsorizzati, commenti, condivisioni, salvataggi, video visti (3 secondi), clic sul link, nuovi mi piace alla pagina, interazioni totali. Da Google: spesa, clic e impression dello stesso periodo (sulla Rete di ricerca like e condivisioni non esistono). Usalo per domande su like, mi piace, reazioni, commenti, condivisioni, salvataggi, video, persone raggiunte, e per spesa e clic di OGGI o di IERI.",
    input_schema: { type: "object", properties: { periodo: { type: "string", enum: ["oggi", "ieri", "7_giorni", "30_giorni"], description: "il periodo detto dall'utente; se non lo dice: oggi" } } } },
  { name: "analisi_visite", description: "Analizza le VISITE VERE alle landing del locale e alle pagine del preventivo online e della prenotazione visite (sola lettura). Per ogni pagina separa le PERSONE vere (hanno scorso la pagina o fatto un passo) dai robot e dalle 'solo aperture' (spesso i controlli di Meta sugli annunci nuovi); dice da quale campagna arrivano le persone, quanto restano, quali sezioni guardano, se fanno partire il video, aprono la galleria o le domande (e quali), se cliccano Preventivo, Visita o WhatsApp; poi quante persone arrivano a ogni passo del preventivo online e della prenotazione visite, e quanti preventivi e visite sono davvero arrivati. Usalo per domande su visite, visitatori, traffico, chi ha visto o toccato cosa, dove si fermano.",
    input_schema: { type: "object", properties: {
      giorni: { type: "number", description: "quanti giorni guardare all'indietro: 1 = oggi e le ultime 24 ore. Se l'utente non lo dice: 7" },
      filtro: { type: "string", description: "una parola della pagina o della campagna, se l'utente parla di una sola (es. 'roma', 'tuscia', '18-anni', 'capodanno'). Vuoto = tutte" } } } },
  { name: "elenco_media", description: "Elenca foto e video della LIBRERIA MEDIA della sede (sola lettura), con descrizione, soggetti e qualita', ordinati dai migliori. Usalo PRIMA di proponi_landing per scegliere l'hero: preferisci un VIDEO se l'utente lo chiede o se ce n'e' uno adatto, altrimenti la foto piu' adatta e di qualita' piu' alta.",
    input_schema: { type: "object", properties: { cerca: { type: "string", description: "una parola su cosa cerchi (es. 'pranzo', 'carbonara', 'sala')" }, tipo: { type: "string", enum: ["immagine", "video", "tutti"] } } } },
  { name: "proponi_campagna", description: "PROPONE di creare una campagna di un modello gia' pronto (menu business, compleanni), su Meta e/o Google. Mostra una scheda con il pulsante Conferma: la campagna nasce SEMPRE IN PAUSA.",
    input_schema: { type: "object", properties: {
      modello: { type: "string", enum: ["menu_business", "compleanni"] },
      piattaforme: { type: "array", items: { type: "string", enum: ["meta", "google"] }, description: "dove crearla; se l'utente non dice nulla: tutte quelle disponibili per il modello" },
      budget_meta_eur: { type: "number", description: "euro al giorno su Meta (solo se l'utente lo indica)" },
      budget_google_eur: { type: "number", description: "euro al giorno su Google (solo se l'utente lo indica)" },
      raggio_km: { type: "number", description: "raggio dalla sede (solo se l'utente lo indica)" }, ...PERIODO_PROPS }, required: ["modello"] } },
  { name: "proponi_landing", description: "PROPONE una LANDING DI PRENOTAZIONE sul MODELLO DELLA CASA, SENZA campagne: per un piatto, per un menu/offerta (es. menu business a prezzo fisso) o per un evento/serata (es. Capodanno). Struttura fissa: header col locale; hero PULITO con foto o video e sopra SOLO etichetta, titolo e prezzo (se c'e'), piu' i bottoni; sotto: frase di apertura, cosa comprende e orari, testi AIDA, menu (fisso, oppure il MENU DEL GIORNO collegato che si aggiorna da solo), galleria, recensioni vere, modulo di prenotazione con la BOOKING POLICY della sede, WhatsApp e Chiama, piede. Il sistema crea una BOZZA visibile col pulsante Anteprima: nulla e' pubblico finche' l'utente non preme Conferma. Se lo strumento risponde con un errore, correggi e richiamalo; se dice di chiedere qualcosa all'utente, chiedi in UNA riga e fermati.",
    input_schema: { type: "object", properties: {
      tipo: { type: "string", enum: ["piatto", "menu", "evento"], description: "piatto = un piatto; menu = un menu o un'offerta (pranzo business, menu degustazione); evento = una serata o una data (Capodanno, San Valentino)" },
      argomento: { type: "string", description: "di cosa si tratta, con le parole dell'utente (es. 'Menu business', 'Cena di Capodanno', 'Tagliatelle alla Norcina')" },
      menu_dinamico: { type: "string", enum: ["menu_giorno"], description: "'menu_giorno' quando la landing e' del MENU BUSINESS / MENU DEL GIORNO che il locale scrive ogni giorno nell'app: la pagina mostra da sola i piatti del giorno e si aggiorna ogni giorno. In quel caso NON compilare 'contenuto'" },
      media_id: { type: "string", description: "id della foto o del video scelto con elenco_media per l'hero. Se manca, il sistema usa la foto del piatto o la foto migliore della sede" },
      etichetta: { type: "string", description: "etichetta piccola sopra il titolo, MAX 40 caratteri (es. 'Menu business', '31 dicembre \u00b7 cena')" },
      prezzo: { type: "number", description: "prezzo in euro SOLO se l'utente lo ha detto (es. 25): e' il gancio, va grande sopra il video. Se non l'ha detto non metterlo" },
      prezzo_nota: { type: "string", description: "accanto al prezzo, MAX 60 caratteri (es. 'a persona, tutto compreso'), solo se c'e' il prezzo" },
      comprende: { type: "array", items: { type: "string" }, description: "cosa comprende l'offerta, voci corte (MAX 40 caratteri l'una, max 8), SOLO se l'utente l'ha detto (es. ['Antipasto','Primo','Secondo','Acqua','Caff\u00e8'])" },
      orari_testo: { type: "string", description: "giorni e orari dell'offerta, MAX 60 caratteri (es. 'Lun\u2013ven 12:00\u201314:30'), solo se detti dall'utente o dagli orari della sede" },
      contenuto_titolo: { type: "string", description: "titolo della sezione contenuto fisso, MAX 40 caratteri (es. 'Il menu della serata')" },
      contenuto: { type: "array", items: { type: "object", properties: { titolo: { type: "string" }, voci: { type: "array", items: { type: "string" } } } }, description: "menu FISSO o programma a gruppi (es. [{titolo:'Antipasti', voci:[...]}]). SOLO piatti che l'utente ha detto. Non usarlo con menu_dinamico" },
      cta2_testo: { type: "string", description: "testo del secondo bottone che porta al menu, MAX 30 caratteri (es. 'Il menu di oggi'). Solo se c'e' un menu (fisso o del giorno)" },
      ...AIDA_LANDING_PROPS,
      validita_testo: { type: "string", description: "quando vale, con le parole dell'utente (es. 'Ogni venerdi a cena'), MAX 40 caratteri. Solo se l'utente lo ha detto" },
      giorni_validi: { type: "array", items: { type: "string", enum: GN }, description: "giorni prenotabili dalla landing (es. ['lunedi','martedi']). Solo se l'utente lo ha detto" },
      turno: { type: "string", enum: ["pranzo", "cena"], description: "pranzo o cena. Solo se l'utente lo ha detto" },
      ...PERIODO_PROPS },
      required: ["tipo", "argomento"] } },
  { name: "proponi_campagna_piatto", description: "PROPONE una campagna per far conoscere UN PIATTO specifico su Meta e/o Google Display, con post Meta LUNGO in schema AIDA e una LANDING. Due modalita': 'prenotazione' (landing con modulo di prenotazione, NESSUN coupon) e 'promo' (PROMO CON COUPON del modulo Promo: il cliente scarica il coupon e lo usa nei giorni validi; richiede che l'utente abbia detto cosa da' il coupon). Tutti i testi li scrivi TU, seguendo il METODO DEL TITOLARE. Il sistema prepara subito un'ANTEPRIMA (bozza della landing, anteprima ufficiale del post Meta, simulazione Google) con il pulsante \uD83D\uDC41 Anteprima nella scheda: nulla e' pubblicato finche' l'utente non preme Conferma. Se lo strumento risponde con un errore (limiti di caratteri, dettagli non detti dall'utente), correggi e richiamalo subito; se l'errore dice di chiedere qualcosa all'utente, chiedi in UNA riga e fermati.",
    input_schema: { type: "object", properties: {
      piatto: { type: "string", description: "nome del piatto come lo chiama l'utente" },
      modalita: { type: "string", enum: ["prenotazione", "promo"], description: "'promo' se l'utente parla di promo, coupon, offerta; 'prenotazione' se vuole solo far prenotare" },
      piattaforme: { type: "array", items: { type: "string", enum: ["meta", "google"] }, description: "se l'utente non dice nulla: entrambe" },
      budget_meta_eur: { type: "number" }, budget_google_eur: { type: "number" }, raggio_km: { type: "number", description: "raggio dalla sede (solo se l'utente lo indica)" },
      coupon_tipo: { type: "string", enum: ["2x1", "sconto_perc", "sconto_euro", "omaggio"], description: "SOLO modalita' promo: cosa da' il coupon. Lo deve aver detto l'utente: se non l'ha detto NON chiamare lo strumento, chiedilo" },
      coupon_valore: { type: "number", description: "per sconto_perc (es. 20) o sconto_euro (es. 5): il numero detto dall'utente" },
      coupon_cosa: { type: "string", description: "SOLO promo: cosa da' il coupon, a parole, con le parole dell'utente (es. 'due tagliatelle alla Norcina al prezzo di una'), max 120 caratteri" },
      min_persone: { type: "number", description: "SOLO promo: minimo di persone al tavolo. Solo se l'utente lo dice" },
      nr_disponibili: { type: "number", description: "SOLO promo: quanti coupon al massimo. Solo se l'utente lo dice" },
      titolo_meta: { type: "string", description: "titolo dell'annuncio Meta, MAX 40 caratteri" },
      testo_meta: { type: "string", description: "POST META ELABORATO, NON corto: da 700 a 1300 caratteri, in 4 blocchi separati da una riga vuota nell'ordine ATTENZIONE (prima riga: gancio forte, max 120 caratteri), INTERESSE, DESIDERIO, AZIONE (invito specifico con il beneficio e la validita'; mai 'ti aspettiamo'). In promo l'AZIONE e' scaricare il coupon e deve dire cosa da' e quando vale; in prenotazione e' prenotare. Usa SOLO fatti dell'utente o dei dati veri del locale: niente sconti, 2x1, prezzi o offerte che non ha detto lui" },
      titoli_google: { type: "array", items: { type: "string" }, description: "Display: da 3 a 5 titoli corti, ognuno MAX 30 caratteri" },
      titolo_lungo_google: { type: "string", description: "Display: un titolo lungo, MAX 90 caratteri" },
      descrizioni_google: { type: "array", items: { type: "string" }, description: "Display: 1 o 2 descrizioni, ognuna MAX 90 caratteri" },
      ...AIDA_LANDING_PROPS,
      validita_testo: { type: "string", description: "quando vale la promo, con le parole dell'utente (es. 'Ogni venerdi a cena'), MAX 40 caratteri. Solo se l'utente lo ha detto" },
      giorni_validi: { type: "array", items: { type: "string", enum: GN }, description: "giorni in cui vale il coupon / si puo' prenotare (es. ['venerdi']). Solo se l'utente lo ha detto" },
      turno: { type: "string", enum: ["pranzo", "cena"], description: "pranzo o cena. Solo se l'utente lo ha detto" },
      regole_extra: { type: "string", description: "regole della promo dette dall'utente (es. 'non cumulabile'): vanno nel regolamento. Solo se le ha dette lui" },
      ...PERIODO_PROPS },
      required: ["piatto", "modalita"] } },
  { name: "termini_ricerca", description: "Legge le RICERCHE VERE che hanno fatto comparire gli annunci di Google Ricerca (termini di ricerca), campagna per campagna, con clic, impression, spesa e conversioni, e se sono gia' parole chiave o gia' escluse (sola lettura). Usalo PRIMA di proporre esclusioni o nuove parole chiave, e per domande su cosa cercano le persone, parole chiave, ricerche sbagliate, pulizia delle parole.",
    input_schema: { type: "object", properties: {
      campagna: { type: "string", description: "nome (anche parziale) o id della campagna; vuoto = tutte le campagne" },
      giorni: { type: "number", enum: [7, 30], description: "periodo: 7 o 30 giorni (se l'utente non lo dice: 30)" } } } },
  { name: "proponi_esclusioni", description: "PROPONE di PULIRE le parole chiave di UNA campagna Google Ricerca: aggiunge parole ESCLUSE (corrispondenza a frase) a livello di campagna, per non pagare piu' ricerche che non c'entrano, e se serve aggiunge parole chiave buone al gruppo di annunci. Mostra una scheda con il pulsante Conferma: nulla cambia finche' l'utente non conferma. Usa SOLO ricerche lette con termini_ricerca o parole dette dall'utente.",
    input_schema: { type: "object", properties: {
      campagna: { type: "string", description: "nome (anche parziale) o id della campagna di Ricerca" },
      escludere: { type: "array", items: { type: "string" }, description: "parole o frasi da ESCLUDERE (max 50), corte e precise (es. 'gelsomino', 'albergo', 'lavoro', 'ricetta')" },
      aggiungere: { type: "array", items: { type: "string" }, description: "parole chiave buone da AGGIUNGERE (max 20), solo se molto pertinenti al locale" },
      motivo: { type: "string", description: "in una riga, perche' (es. 'ricerche di altri locali e di alberghi')" } }, required: ["campagna"] } },
  { name: "proponi_post", description: "PROPONE un POST NORMALE per la pagina Facebook e Instagram della sede (non sponsorizzato, nessun budget). Usalo quando l'utente chiede un post, anche a voce. Il testo segue lo STILE DEI POST DELLA PAGINA e l'IDENTITA' DEL LOCALE; numeri e fatti solo se detti dall'utente o dati veri. Foto: se l'utente ha allegato foto in chat usa foto='chat:1' (chat:2, ...); altrimenti usa prima elenco_media e passa foto='media:<id>'. Mostra una scheda con la foto, il testo e il pulsante per pubblicare: con quando='ora' esce subito su Facebook e Instagram, con data e ora esce a quell'ora. Se l'utente chiede modifiche, richiamalo con il testo corretto.",
    input_schema: { type: "object", properties: {
      testo: { type: "string", description: "il post completo, esattamente come uscira'" },
      titolo: { type: "string", description: "promemoria interno, massimo 8 parole" },
      angolo: { type: "string", enum: ["perche", "come", "cosa"], description: "perche = chi siamo e come la pensiamo; come = metodo e dietro le quinte; cosa = un piatto o una proposta" },
      foto: { type: "string", description: "chat:N per una foto allegata in chat, media:<id> per una foto della galleria, vuoto per nessuna foto" },
      quando: { type: "string", description: "'ora' oppure data e ora italiane nel formato AAAA-MM-GGTHH:MM" },
      canali: { type: "array", items: { type: "string", enum: ["facebook", "instagram"] }, description: "di solito tutti e due" } },
      required: ["testo", "quando"] } },
  { name: "stato_post", description: "Legge gli ultimi post della pagina (sola lettura): se sono usciti, quando, con il link, oppure perche' non sono usciti. Usalo quando l'utente chiede se un post e' uscito o com'e' andato.",
    input_schema: { type: "object", properties: {} } },
  { name: "proponi_stato_campagna", description: "PROPONE di ACCENDERE o di METTERE IN PAUSA una campagna esistente. Mostra una scheda con il pulsante Conferma.",
    input_schema: { type: "object", properties: {
      piattaforma: { type: "string", enum: ["meta", "google"] },
      campagna: { type: "string", description: "nome (anche parziale) o id della campagna" },
      stato: { type: "string", enum: ["attiva", "pausa"] } }, required: ["piattaforma", "campagna", "stato"] } },
];
// memoria delle istruzioni: il segno di cache sull'ultimo strumento tiene in cache tutti gli strumenti
const TOOLS_CACHE = TOOLS.map((t: any, i: number) => i === TOOLS.length - 1 ? Object.assign({}, t, { cache_control: { type: "ephemeral" } }) : t);

async function proponi(c: Ctx, tipo: string, dati: any, riepilogo: string, anteprima?: string | null) {
  const az = { tipo, dati, riepilogo };
  c.proposte.push({ ...az, ...(anteprima ? { anteprima } : {}), firma: await firma(testoAzione(az, c.uid, c.aziendaId)) });
  return { ok: true, proposta: riepilogo, ...(anteprima ? { anteprima_url: anteprima } : {}), nota: "c'e' il pulsante Conferma: non chiedere conferma a parole e non dire che e' gia' fatto" };
}

// collegamenti, sede e citta': comuni a tutti i modelli
async function prepara(c: Ctx, piattaforme: string[]): Promise<{ errore?: string; sede?: any; cit?: string }> {
  const [{ data: mc }, { data: gc }] = await Promise.all([
    sb.from("meta_ads_connessioni").select("id").eq("azienda_id", c.aziendaId).eq("attivo", true).limit(1),
    sb.from("google_ads_connessioni").select("id, customer_id").eq("azienda_id", c.aziendaId).eq("attivo", true).limit(1),
  ]);
  const manca: string[] = [];
  if (piattaforme.includes("meta") && !mc?.length) manca.push("Meta (Marketing > Connessioni)");
  if (piattaforme.includes("google") && (!gc?.length || !String(gc[0].customer_id || "").replace(/\D/g, ""))) manca.push("Google Ads (Configurazione > Integrazioni)");
  if (manca.length) return { errore: "manca il collegamento a: " + manca.join(" e ") };
  const { data: sede } = c.sedeId ? await sb.from("sedi").select("id,nome,citta").eq("id", c.sedeId).maybeSingle() : { data: null };
  const cit = citta(sede?.citta);
  if (!cit) return { errore: "la sede non ha la citta': impostala nella scheda sede" };
  return { sede, cit };
}

// regolamento della landing di PRENOTAZIONE (resta salvato per storico; in pagina si mostra la booking policy della sede)
function costruisciRegolamento(d: any): string {
  const l = d.landing || {};
  const r: string[] = [`Regolamento della promozione \u00ab${l.titolo}\u00bb`];
  let n = 1;
  if (d.inizio && d.fine) r.push(`${n++}. Periodo: dal ${dataLunga(d.inizio)} al ${dataLunga(d.fine)}.`);
  else if (d.fine) r.push(`${n++}. Periodo: fino al ${dataLunga(d.fine)}.`);
  else if (d.inizio) r.push(`${n++}. Periodo: dal ${dataLunga(d.inizio)}.`);
  if (l.validita_testo) r.push(`${n++}. Validit\u00e0: ${String(l.validita_testo).charAt(0).toLowerCase() + String(l.validita_testo).slice(1)}.`);
  r.push(`${n++}. Come partecipare: prenotando il tavolo dal modulo di questa pagina.`);
  r.push(`${n++}. La prenotazione \u00e8 soggetta alla disponibilit\u00e0 dei posti.`);
  if (l.regole_extra) r.push(`${n++}. ${String(l.regole_extra).trim()}`);
  r.push(`${n++}. Il locale pu\u00f2 modificare o sospendere l'iniziativa dandone avviso su questa pagina.`);
  r.push(`${n++}. I dati inseriti nel modulo sono usati solo per gestire la prenotazione.`);
  return r.join("\n");
}

// regolamento della PROMO CON COUPON: giorni, turno, minimo persone e scadenza li aggiunge da soli la pagina promo (dai campi della promo)
function regolamentoPromo(d: any): string {
  const l = d.landing || {}, cp = d.coupon || {};
  const r: string[] = [`Regolamento della promozione \u00ab${l.titolo}\u00bb`];
  let n = 1;
  if (cp.cosa) r.push(`${n++}. Il coupon d\u00e0 diritto a: ${cp.cosa}.`);
  r.push(`${n++}. Il coupon si ottiene scaricandolo dal modulo di questa pagina: \u00e8 personale e arriva su WhatsApp e per email.`);
  r.push(`${n++}. Ogni contatto (telefono o email) pu\u00f2 scaricare il coupon una sola volta.`);
  r.push(`${n++}. Si usa mostrando il codice o il QR al personale del locale, nei giorni, nei turni e alle condizioni indicati in questa pagina.`);
  if (l.regole_extra) r.push(`${n++}. ${String(l.regole_extra).trim()}`);
  r.push(`${n++}. Il locale pu\u00f2 modificare o sospendere l'iniziativa dandone avviso su questa pagina.`);
  r.push(`${n++}. I dati inseriti nel modulo sono usati per emettere il coupon e, se acconsenti, per comunicazioni del locale.`);
  return r.join("\n");
}

// ---- creazione della promo (modulo Promo) e della landing di prenotazione: usate sia per la BOZZA sia, in passato, alla conferma ----
async function creaPromoDaDati(c: Ctx, d: any, bozza: boolean): Promise<{ id?: string; errore?: string }> {
  const l = d.landing, cp = d.coupon;
  const blocchi = [
    { tipo: "hero", contenuto: d.foto || "", kicker: l.validita_testo || "", titolo: l.titolo, sottotitolo: l.sottotitolo || "", cta: "Scarica il coupon" },
    { tipo: "testo", contenuto: l.attenzione },
    { tipo: "sezione", titolo: "", contenuto: l.interesse },
    { tipo: "galleria", foto: [] },
    { tipo: "sezione", titolo: "Perch\u00e9 da noi", contenuto: l.desiderio },
    { tipo: "recensioni" },
    { tipo: "box_offerta" },
    { tipo: "validita" },
    { tipo: "testo", contenuto: l.azione },
    { tipo: "urgenza" },
    { tipo: "form" },
  ];
  const codiceLabel = (slugify(d.piatto).replace(/-/g, "").toUpperCase().slice(0, 10) + (cp.tipo === "2x1" ? "2X1" : cp.tipo === "sconto_perc" ? String(cp.valore) : cp.tipo === "sconto_euro" ? "E" + cp.valore : "OMAGGIO")).slice(0, 18);
  const msgWA = `Ciao {{nome}}! \uD83C\uDF7D\n\nEcco il tuo coupon: {{promo_nome}}${cp.cosa ? "\n" + cp.cosa : ""}${l.validita_testo ? "\n" + l.validita_testo : ""}\n\nCodice: {{codice}} \u00b7 scade il {{scadenza}}\n\uD83D\uDC49 Il tuo coupon: {{link_promo}}`;
  const { data: pr, error } = await sb.from("promo").insert({
    azienda_id: c.aziendaId, sede_id: d.sede_id || null, nome: l.titolo, descrizione: cp.cosa || l.sottotitolo || null,
    tipo: cp.tipo, valore: cp.valore, codice: codiceLabel, canale: "whatsapp", messaggio_wa: msgWA, attiva: true, immagine_url: d.foto || null,
    regolamento: regolamentoPromo(d), data_scadenza: d.fine || null, nr_disponibili: cp.nr_disponibili || null,
    giorni_disponibili: cp.giorni && cp.giorni.length ? cp.giorni : null, turni: cp.turni && cp.turni.length ? cp.turni : null, min_persone: cp.min_persone || null,
    privacy_richiesta: true, consenso_marketing: true, landing_config: { blocks: blocchi },
    bozza, bozza_di: bozza ? c.uid : null,
  }).select("id").single();
  if (error || !pr) return { errore: error?.message || "errore" };
  return { id: pr.id };
}

async function creaLandingDaDati(c: Ctx, d: any, bozza: boolean): Promise<{ slug?: string; errore?: string }> {
  const l = d.landing;
  const m = d.media || {};
  const slug = `${slugify(d.piatto)}-${crypto.randomUUID().replace(/-/g, "").slice(0, bozza ? 10 : 4)}`;
  const { error } = await sb.from("landing_promo").insert({
    azienda_id: c.aziendaId, sede_id: d.sede_id || null, slug, piatto: d.piatto, titolo: l.titolo, sottotitolo: l.sottotitolo || null, hero_url: d.foto || null,
    attenzione: l.attenzione, interesse: l.interesse, desiderio: l.desiderio, azione: l.azione, validita_testo: l.validita_testo || null,
    giorni_validi: Array.isArray(l.giorni_validi) && l.giorni_validi.length ? l.giorni_validi : null, turno: l.turno || null,
    data_inizio: d.inizio || null, data_fine: d.fine || null, regolamento: costruisciRegolamento(d), attiva: true, created_by: c.uid,
    tipo: d.tipo || "piatto", etichetta: l.etichetta || null, prezzo: l.prezzo ?? null, prezzo_nota: l.prezzo_nota || null,
    comprende: Array.isArray(l.comprende) && l.comprende.length ? l.comprende : null, orari_testo: l.orari_testo || null,
    contenuto_titolo: l.contenuto_titolo || null, contenuto: Array.isArray(l.contenuto) && l.contenuto.length ? l.contenuto : null,
    menu_dinamico: l.menu_dinamico || null,
    media_url: m.url || null, media_tipo: m.tipo || null, media_poster: m.poster || null, cta2_testo: l.cta2_testo || null,
    bozza, bozza_di: bozza ? c.uid : null,
  });
  if (error) return { errore: error.message };
  return { slug };
}

// toglie le bozze precedenti non confermate di questa persona (a ogni nuova proposta ne resta una sola)
async function pulisciBozzeMie(c: Ctx) {
  try {
    await Promise.all([
      sb.from("promo").delete().eq("azienda_id", c.aziendaId).eq("bozza", true).eq("bozza_di", c.uid),
      sb.from("landing_promo").delete().eq("azienda_id", c.aziendaId).eq("bozza", true).eq("bozza_di", c.uid),
      sb.from("campagne_bozze").delete().eq("azienda_id", c.aziendaId).eq("creata_da", c.uid),
    ]);
  } catch { /* la pulizia automatica ogni ora fa il resto */ }
}

// controlli comuni dei testi AIDA della landing
function controllaAida(inp: any): { errore?: string; lt: string; ls: string; la: string; li: string; ld: string; laz: string } {
  const lt = String(inp.landing_titolo || "").trim(), ls = String(inp.landing_sottotitolo || "").trim();
  const la = String(inp.landing_attenzione || "").trim(), li = String(inp.landing_interesse || "").trim(), ld = String(inp.landing_desiderio || "").trim(), laz = String(inp.landing_azione || "").trim();
  const r = { lt, ls, la, li, ld, laz };
  if (!lt || lt.length > 60) return { ...r, errore: `landing_titolo obbligatorio, max 60 caratteri (adesso: ${lt.length})` };
  if (ls.length > 140) return { ...r, errore: `landing_sottotitolo max 140 caratteri (adesso: ${ls.length})` };
  if (!la || la.length > 200) return { ...r, errore: `landing_attenzione obbligatorio, max 200 caratteri (adesso: ${la.length})` };
  if (li.length < 100 || li.length > 800) return { ...r, errore: `landing_interesse deve avere da 150 a 700 caratteri (adesso: ${li.length})` };
  if (ld.length < 150 || ld.length > 900) return { ...r, errore: `landing_desiderio deve avere da 200 a 800 caratteri (adesso: ${ld.length})` };
  if (!laz || laz.length > 250) return { ...r, errore: `landing_azione obbligatorio, max 250 caratteri (adesso: ${laz.length})` };
  return r;
}

async function eseguiStrumento(c: Ctx, nome: string, inp: any): Promise<any> {
  if (nome === "stato_campagne") {
    const p = inp.piattaforma || "entrambe";
    const [g, m] = await Promise.all([p !== "meta" ? elencoLive(c, "google") : null, p !== "google" ? elencoLive(c, "meta") : null]);
    return { google: g, meta: m };
  }

  if (nome === "interazioni_campagne") {
    return await interazioniCampagne(c, String(inp.periodo || "oggi"));
  }

  if (nome === "analisi_visite") {
    const giorni = Math.max(1, Math.min(90, Math.round(Number(inp.giorni) || 7)));
    const filtro = String(inp.filtro || "").trim().slice(0, 40) || null;
    const { data, error } = await sb.rpc("analisi_visite", { p_azienda: c.aziendaId, p_giorni: giorni, p_filtro: filtro });
    if (error) return { errore: "non riesco a leggere le visite: " + error.message };
    return data;
  }

  if (nome === "elenco_media") {
    const lista = await elencoMedia(c, String(inp.cerca || ""), String(inp.tipo || "tutti"));
    if (!lista.length && inp.cerca) return { media: await elencoMedia(c, "", String(inp.tipo || "tutti")), nota: "nessun risultato per quella parola: ecco i migliori della sede" };
    return { media: lista, nota: lista.length ? "scegli l'id da passare come media_id" : "la libreria della sede e' vuota: la landing usera' la foto del piatto, se c'e'" };
  }

  if (nome === "proponi_post") {
    const testo = String(inp.testo || "").trim();
    if (testo.length < 20) return { errore: "il testo del post e' vuoto o troppo corto" };
    if (!c.sedeId) return { errore: "manca la sede: di' all'utente di scegliere il locale in alto nell'app" };
    const { data: sd } = await sb.from("sedi").select("nome, meta_pagina_id, meta_pagina_nome").eq("id", c.sedeId).maybeSingle();
    if (!sd || !sd.meta_pagina_id) return { errore: "la sede non ha una pagina Facebook collegata: di' all'utente di collegarla da Marketing > Connessioni" };
    const { data: mc } = await sb.from("meta_ads_connessioni").select("id").eq("azienda_id", c.aziendaId).eq("attivo", true).limit(1);
    if (!mc || !mc.length) return { errore: "Meta non e' collegato: di' all'utente di collegarlo da Marketing > Connessioni" };
    const quando = String(inp.quando || "ora").trim();
    let data = oggiRoma(), ora = "00:00";
    if (quando !== "ora") {
      const m = quando.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
      if (!m) return { errore: "quando deve essere 'ora' oppure AAAA-MM-GGTHH:MM" };
      data = m[1]; ora = m[2] + ":" + m[3];
      if (data < oggiRoma()) return { errore: "la data e' gia' passata: chiedi all'utente quando" };
    }
    const canali: string[] = (Array.isArray(inp.canali) && inp.canali.length ? inp.canali : ["facebook", "instagram"])
      .map((x: unknown) => String(x)).filter((x: string) => x === "facebook" || x === "instagram");
    let url = "";
    const f = String(inp.foto || "").trim();
    if (f.indexOf("chat:") === 0) {
      const i = parseInt(f.slice(5), 10) - 1;
      const b64 = (c.immagini || [])[i];
      if (!b64) return { errore: "in questo messaggio non c'e' la foto " + f + ": chiedi all'utente di riallegarla" };
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
      const path = c.aziendaId + "/chat/" + Date.now() + "-" + (i + 1) + ".jpg";
      const up = await sb.storage.from("media-aziende").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
      if (up.error) return { errore: "non riesco a salvare la foto: " + up.error.message };
      url = SUPABASE_URL + "/storage/v1/object/public/media-aziende/" + path;
      await sb.from("media_library").insert({ azienda_id: c.aziendaId, sede_id: c.sedeId, nome: "Foto dalla chat di Tony " + oggiRoma(),
        url: url, path: path, tipo: "immagine", origine: "caricamento", caricata_da: c.uid });
    } else if (f.indexOf("media:") === 0) {
      const { data: m } = await sb.from("media_library").select("url").eq("id", f.slice(6)).eq("azienda_id", c.aziendaId).maybeSingle();
      if (!m || !m.url) return { errore: "foto non trovata nella galleria di questa azienda" };
      url = String(m.url);
    }
    if (canali.indexOf("instagram") !== -1 && !url) return { errore: "Instagram non pubblica senza foto: scegli una foto oppure pubblica solo su Facebook" };
    const angolo = ["perche", "come", "cosa"].indexOf(String(inp.angolo)) !== -1 ? String(inp.angolo) : "perche";
    const titolo = String(inp.titolo || "").trim().slice(0, 80) || testo.split("\n")[0].slice(0, 60);
    const { data: riga, error } = await sb.from("calendario_editoriale").insert({
      azienda_id: c.aziendaId, sede_id: c.sedeId, data: data, ora_pubblicazione: ora, angolo: angolo, titolo: titolo, testo: testo,
      media_url: url || null, canale: canali[0] || "facebook", canali: canali, formato: "foto", grafica_modo: "foto",
      foto_bloccata: !!url, stato: "bozza", istruzioni: "Creato da Tony nella chat"
    }).select("id").single();
    if (error || !riga) return { errore: "non riesco a preparare il post: " + (error ? error.message : "errore") };
    const pagina = String(sd.meta_pagina_nome || sd.nome || "la pagina");
    const quandoTxt = quando === "ora" ? "esce subito" : "esce il " + dataLunga(data) + " alle " + ora;
    return await proponi(c, "post", { giorno_id: riga.id, quando: quando === "ora" ? "ora" : data + "T" + ora },
      "Post per " + pagina + " (" + canali.join(" e ") + "), " + quandoTxt + ":\n\n" + testo, url || null);
  }

  if (nome === "stato_post") {
    let q = sb.from("calendario_editoriale").select("id, data, ora_pubblicazione, titolo, stato, meta_post_id, pubblicato_at")
      .eq("azienda_id", c.aziendaId).not("testo", "is", null);
    if (c.sedeId) q = q.eq("sede_id", c.sedeId);
    const { data: righe } = await q.order("created_at", { ascending: false }).limit(6);
    const ids = (righe || []).map((r: any) => r.id);
    const { data: log } = ids.length ? await sb.from("pubblicazioni_log").select("giorno_id, pagina_nome, esito, errore").in("giorno_id", ids) : { data: [] as any[] };
    return { post: (righe || []).map((r: any) => {
      const l = (log || []).filter((x: any) => x.giorno_id === r.id);
      return { titolo: r.titolo, stato: r.stato, giorno: r.data, ora: String(r.ora_pubblicazione || "").slice(0, 5),
        uscito_il: r.pubblicato_at, link: r.meta_post_id ? "https://www.facebook.com/" + r.meta_post_id : null,
        canali_usciti: l.filter((x: any) => x.esito === "pubblicato").map((x: any) => x.pagina_nome === "Instagram" ? "Instagram" : "Facebook"),
        errori: l.filter((x: any) => x.esito !== "pubblicato").map((x: any) => x.errore).filter(Boolean) };
    }) };
  }

  if (nome === "termini_ricerca") {
    const giorni = Number(inp.giorni) === 7 ? 7 : 30;
    const q = String(inp.campagna || "").trim().toLowerCase();
    let filtroId = "";
    if (q) {
      const el: any = await elencoLive(c, "google");
      if (el.errore) return { errore: el.errore };
      const tr = (el.campagne || []).filter((x: any) => String(x.id) === q || String(x.nome).toLowerCase().includes(q));
      if (!tr.length) return { errore: "nessuna campagna Google con quel nome", campagne_disponibili: (el.campagne || []).map((x: any) => x.nome) };
      if (tr.length > 1) return { errore: "piu' campagne corrispondono: chiedi quale", candidate: tr.map((x: any) => x.nome) };
      filtroId = String(tr[0].id).replace(/\D/g, "");
    }
    const query = "select campaign.id, campaign.name, search_term_view.search_term, search_term_view.status, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions from search_term_view where segments.date DURING " + (giorni === 7 ? "LAST_7_DAYS" : "LAST_30_DAYS") + " and metrics.impressions > 0" + (filtroId ? " and campaign.id = " + filtroId : "") + " order by metrics.cost_micros desc limit 150";
    const j = await chiamaInterna(c, "google-ads-leggi", { azienda_id: c.aziendaId, query: [query] });
    const ris = j?.risultati?.[0];
    if (!j?.success || !ris?.ok) return { errore: (ris && ris.errore ? JSON.stringify(ris.errore).slice(0, 200) : "") || j?.error || "Google non risponde" };
    const STATO: Record<string, string> = { ADDED: "gia' parola chiave", EXCLUDED: "gia' esclusa", ADDED_EXCLUDED: "aggiunta ed esclusa", NONE: "" };
    const righe = (ris.righe || []).map((x: any) => ({ campagna: x.campaign?.name, campagna_id: x.campaign?.id, ricerca: x.searchTermView?.searchTerm, stato: STATO[x.searchTermView?.status] ?? "", clic: Number(x.metrics?.clicks || 0), impression: Number(x.metrics?.impressions || 0), spesa_eur: Math.round(Number(x.metrics?.costMicros || 0) / 10000) / 100, conversioni: Number(x.metrics?.conversions || 0) }));
    const spesa = Math.round(righe.reduce((s: number, r: any) => s + r.spesa_eur, 0) * 100) / 100;
    return { periodo: "ultimi " + giorni + " giorni", ricerche: righe.length, spesa_totale_eur: spesa, righe: righe.slice(0, 120), nota: righe.length ? "ordinate per spesa: proponi di escludere solo quelle che non portano clienti a questo locale" : "nessuna ricerca nel periodo: la campagna e' ferma o non ha avuto impression" };
  }

  if (nome === "proponi_esclusioni") {
    const el: any = await elencoLive(c, "google");
    if (el.errore) return { errore: el.errore };
    const q = String(inp.campagna || "").trim().toLowerCase();
    const tr = (el.campagne || []).filter((x: any) => String(x.id) === q || String(x.nome).toLowerCase().includes(q));
    if (!tr.length) return { errore: "nessuna campagna Google con quel nome", campagne_disponibili: (el.campagne || []).map((x: any) => x.nome) };
    if (tr.length > 1) return { errore: "piu' campagne corrispondono: chiedi quale", candidate: tr.map((x: any) => x.nome) };
    const k = tr[0];
    if (k.tipo && !/SEARCH/i.test(String(k.tipo))) return { errore: "la campagna \u00ab" + k.nome + "\u00bb non e' di Ricerca (" + k.tipo + "): le parole escluse si mettono solo sulle campagne di Ricerca. Dillo all'utente in una riga" };
    const pulisci = (a: any, max: number) => [...new Set((Array.isArray(a) ? a : []).map((x: any) => String(x ?? "").toLowerCase().replace(/["\[\]+]/g, " ").replace(/\s+/g, " ").trim()).filter((x: string) => x.length >= 2 && x.length <= 80))].slice(0, max) as string[];
    const escl = pulisci(inp.escludere, 50), agg = pulisci(inp.aggiungere, 20);
    if (!escl.length && !agg.length) return { errore: "nessuna parola da escludere o da aggiungere" };
    const conflitto = escl.filter((x) => agg.includes(x));
    if (conflitto.length) return { errore: "le stesse parole sono sia da escludere sia da aggiungere: " + conflitto.join(", ") };
    const motivo = String(inp.motivo || "").trim().slice(0, 140);
    const dati = { campagna_id: String(k.id), nome: k.nome, escludere: escl, aggiungere: agg };
    const riepilogo = "\uD83E\uDDF9 Pulizia parole di \u00ab" + k.nome + "\u00bb su Google" + (escl.length ? " \u00b7 escludi (" + escl.length + "): " + escl.join(", ") : "") + (agg.length ? " \u00b7 aggiungi (" + agg.length + "): " + agg.join(", ") : "") + (motivo ? " \u00b7 " + motivo : "");
    return await proponi(c, "parole_google", dati, riepilogo);
  }

  if (nome === "proponi_campagna") {
    const mod = MODELLI[inp.modello];
    if (!mod) return { errore: "modello non disponibile" };
    const piattaforme: string[] = Array.isArray(inp.piattaforme) && inp.piattaforme.length ? inp.piattaforme : mod.piattaforme;
    const nonSupp = piattaforme.filter((p) => !mod.piattaforme.includes(p));
    if (nonSupp.length) return { errore: `il modello ${mod.nome} su ${nonSupp.join(", ")} non e' ancora disponibile (disponibile su: ${mod.piattaforme.join(", ")})` };
    const budget: Record<string, number> = {
      meta: Number(inp.budget_meta_eur) > 0 ? Number(inp.budget_meta_eur) : mod.budget.meta,
      google: Number(inp.budget_google_eur) > 0 ? Number(inp.budget_google_eur) : mod.budget.google,
    };
    for (const p of piattaforme) if (budget[p] > BUDGET_MAX) return { errore: `il budget massimo per una campagna e' ${BUDGET_MAX} euro al giorno` };
    const raggio = Number(inp.raggio_km) > 0 ? Number(inp.raggio_km) : mod.raggio;
    const per = periodo(inp.inizio, inp.durata_giorni);
    if (per.errore) return { errore: per.errore };

    const prep = await prepara(c, piattaforme);
    if (prep.errore) return { errore: prep.errore };

    // la pagina di destinazione deve essere online
    let nota = "";
    if (inp.modello === "menu_business") {
      const l = await paginaOnline(c.aziendaId, c.sedeId, "/l/menu-business");
      if (!l.url) return { errore: "manca la pagina Menu business: pubblicala dal Sito" };
      if (!l.ok) nota = `ATTENZIONE: la pagina ${l.url} adesso non risponde: dillo all'utente, la campagna porterebbe a una pagina vuota`;
    }

    const dati = { modello: inp.modello, piattaforme, budget: { meta: Math.round(budget.meta * 100), google: Math.round(budget.google * 100) }, raggio_km: raggio, citta: prep.cit, sede_id: c.sedeId, sede: prep.sede?.nome || null, inizio: per.inizio, fine: per.fine };
    const parti = piattaforme.map((p) => `${p === "meta" ? "Meta" : "Google"} ${eur(budget[p])}/giorno`);
    const riepilogo = `\uD83D\uDCE3 Campagna ${mod.nome}: ${parti.join(" + ")} \u00b7 ${raggio} km da ${prep.cit}${testoPeriodo(per)} \u00b7 nasce IN PAUSA`;
    const r: any = await proponi(c, "campagna", dati, riepilogo);
    if (nota) r.nota_attenzione = nota;
    return r;
  }

  if (nome === "proponi_landing") {
    const tipo = ["piatto", "menu", "evento"].includes(inp.tipo) ? inp.tipo : "menu";
    const argomento = String(inp.argomento || "").trim().slice(0, 80);
    if (argomento.length < 3) return { errore: "di cosa e' la landing? (un piatto, un menu o un evento)" };
    if (!c.sedeId) return { errore: "serve la sede: chiedi all'utente di scegliere la sede in alto nell'app, poi riprova" };
    const per = periodo(inp.inizio, inp.durata_giorni);
    if (per.errore) return { errore: per.errore };
    const a = controllaAida(inp);
    if (a.errore) return { errore: a.errore };
    const u = c.testoUtente + " " + c.fattiAmmessi;
    const note: string[] = [];

    // menu del giorno collegato: la pagina lo legge ogni giorno da sola
    const menuDin = inp.menu_dinamico === "menu_giorno" ? "menu_giorno" : null;
    const sedeHaMenu = await haMenuGiorno(c.sedeId);
    if (menuDin && !sedeHaMenu) return { errore: "questa sede non ha il menu del giorno scritto nell'app nelle ultime due settimane: non si puo' collegare. Togli menu_dinamico e dillo all'utente in una riga" };

    const etichetta = String(inp.etichetta || "").trim();
    if (etichetta.length > 40) return { errore: `etichetta max 40 caratteri (adesso: ${etichetta.length})` };
    let prezzo: number | null = null;
    if (inp.prezzo !== undefined && inp.prezzo !== null && String(inp.prezzo) !== "") {
      const n = Number(inp.prezzo);
      if (!(n > 0) || n > 1000) return { errore: "prezzo non valido" };
      if (!numeroDetto(n, c.testoUtente)) return { errore: `l'utente non ha detto il prezzo ${n} euro: NON metterlo. Togli il prezzo, oppure chiedi all'utente in UNA riga quanto costa e fermati.` };
      prezzo = Math.round(n * 100) / 100;
    }
    const prezzoNota = prezzo !== null ? String(inp.prezzo_nota || "").trim().slice(0, 60) : "";
    const comprende = [...new Set((Array.isArray(inp.comprende) ? inp.comprende : []).map((x: any) => String(x ?? "").trim()).filter(Boolean))].slice(0, 8) as string[];
    if (comprende.some((x) => x.length > 40)) return { errore: "ogni voce di 'comprende' deve avere max 40 caratteri" };
    const orari = String(inp.orari_testo || "").trim();
    if (orari.length > 60) return { errore: `orari_testo max 60 caratteri (adesso: ${orari.length})` };
    const contenuto = menuDin ? [] : (Array.isArray(inp.contenuto) ? inp.contenuto : []).slice(0, 6).map((g: any) => ({
      titolo: String(g?.titolo || "").trim().slice(0, 40),
      voci: (Array.isArray(g?.voci) ? g.voci : []).map((v: any) => String(v ?? "").trim()).filter(Boolean).slice(0, 12),
    })).filter((g: any) => g.voci.length);
    if (contenuto.some((g: any) => g.voci.some((v: string) => v.length > 90))) return { errore: "ogni voce del contenuto deve avere max 90 caratteri" };
    const contTitolo = contenuto.length ? String(inp.contenuto_titolo || "").trim().slice(0, 40) : "";
    const cta2 = (contenuto.length || menuDin) ? String(inp.cta2_testo || "").trim().slice(0, 30) : "";
    const valid = String(inp.validita_testo || "").trim().slice(0, 40);
    const giorniNomi: string[] = (Array.isArray(inp.giorni_validi) ? inp.giorni_validi : []).filter((g: string) => GN.includes(g));
    const turno = inp.turno === "pranzo" || inp.turno === "cena" ? inp.turno : null;
    if (!menuDin && tipo === "menu" && !contenuto.length && sedeHaMenu) note.push("la sede scrive il menu del giorno nell'app: se questa landing e' il menu business / menu del giorno, richiama lo strumento con menu_dinamico='menu_giorno' cosi' i piatti si aggiornano da soli");

    // dettagli commerciali solo se detti dall'utente (o dati veri del locale); il prezzo e' gia' controllato sopra
    const fatti = u + (prezzo !== null ? ` ${prezzo} euro ${prezzo} \u20ac` : "");
    const inventati = dettagliInventati([etichetta, a.lt, a.ls, a.la, a.li, a.ld, a.laz, prezzoNota, orari, valid, contTitolo, cta2, ...comprende, ...contenuto.flatMap((g: any) => [g.titolo, ...g.voci])].join(" | "), fatti);
    if (inventati.length) return { errore: `nei testi ci sono dettagli che l'UTENTE non ha detto: ${inventati.map((x) => `"${x}"`).join(", ")}. Toglili e riscrivi usando solo cio' che l'utente ha detto o i dati veri del locale.` };

    // hero: il media scelto dalla libreria, altrimenti la foto del piatto, altrimenti la foto migliore della sede
    let media: any = null;
    let foto: string | null = null;
    if (inp.media_id) {
      const { data: mm } = await sb.from("media_library").select("id,url,tipo,thumb_url").eq("id", String(inp.media_id)).eq("azienda_id", c.aziendaId).maybeSingle();
      if (!mm) return { errore: "media_id non trovato nella libreria di questa azienda: usa elenco_media e scegli un id valido" };
      media = { url: mm.url, tipo: mm.tipo === "video" ? "video" : "immagine", poster: mm.tipo === "video" ? (mm.thumb_url || null) : null };
      foto = mm.tipo === "video" ? (mm.thumb_url || null) : mm.url;
    }
    if (!media && tipo === "piatto") { foto = await fotoPiatto(c.aziendaId, argomento); if (foto) media = { url: foto, tipo: "immagine", poster: null }; }
    if (!media) {
      const { data: best } = await sb.from("media_library").select("url").eq("azienda_id", c.aziendaId).eq("sede_id", c.sedeId).eq("tipo", "immagine").or("archiviata.is.null,archiviata.eq.false").order("qualita", { ascending: false, nullsFirst: false }).limit(1);
      if (best?.[0]?.url) { foto = best[0].url; media = { url: foto, tipo: "immagine", poster: null }; note.push("non hai scelto il media: ho messo la foto migliore della sede; di' all'utente che puo' chiederne un'altra o un video"); }
      else note.push("nessuna foto o video disponibile: l'hero restera' senza immagine; suggerisci di caricare foto o video nella libreria media");
    }

    // la booking policy la mette la pagina dal modulo di prenotazione della sede: avvisa se manca
    const { data: bf } = await sb.from("booking_forms").select("id,config").eq("azienda_id", c.aziendaId).eq("sede_id", c.sedeId).limit(20);
    const conPolicy = (bf || []).some((f: any) => f?.config?.policy?.enabled && String(f?.config?.policy?.text || "").trim());
    if (!conPolicy) note.push("la sede non ha una booking policy attiva nel modulo di prenotazione online: la sezione 'Condizioni di prenotazione' non comparira'. Dillo all'utente in una riga");

    const { data: sd } = await sb.from("sedi").select("nome").eq("id", c.sedeId).maybeSingle();
    const dati: any = {
      modello: "landing", tipo, piatto: argomento, sede_id: c.sedeId, sede: sd?.nome || null, foto, media, inizio: per.inizio, fine: per.fine,
      landing: { titolo: a.lt, sottotitolo: a.ls, attenzione: a.la, interesse: a.li, desiderio: a.ld, azione: a.laz, validita_testo: valid, giorni_validi: giorniNomi.map((g) => GN.indexOf(g)), turno, regole_extra: "",
        etichetta, prezzo, prezzo_nota: prezzoNota, comprende, orari_testo: orari, contenuto_titolo: contTitolo, contenuto, menu_dinamico: menuDin, cta2_testo: cta2 },
    };
    await pulisciBozzeMie(c);
    const r = await creaLandingDaDati(c, dati, true);
    if (!r.slug) return { errore: "non riesco a preparare la landing di anteprima: " + r.errore };
    dati.bozza = { tipo: "landing", slug: r.slug };
    const linkBozza = `${LANDING_BASE}?p=${r.slug}`;
    const nomeTipo = tipo === "piatto" ? "piatto" : tipo === "evento" ? "evento" : "menu/offerta";
    const riepilogo = `\uD83E\uDDFE Landing \u00ab${a.lt}\u00bb (${nomeTipo}${sd?.nome ? ", " + sd.nome : ""})${prezzo !== null ? " \u00b7 " + eur(prezzo) : ""}${media ? " \u00b7 hero: " + (media.tipo === "video" ? "video" : "foto") : ""}${menuDin ? " \u00b7 menu del giorno collegato (si aggiorna da solo)" : contenuto.length ? " \u00b7 menu fisso" : ""}${testoPeriodo(per)} \u00b7 prenotazione con le condizioni della sede \u00b7 NON ANCORA PUBBLICATA: guarda l'anteprima`;
    const out: any = await proponi(c, "campagna", dati, riepilogo, linkBozza);
    out.in_pagina = { hero: media ? media.tipo : "nessuno", etichetta: !!etichetta, prezzo: prezzo !== null, comprende: comprende.length, orari: !!orari, menu: menuDin ? "menu del giorno collegato" : contenuto.length ? "menu fisso" : "nessuno", secondo_bottone: !!(menuDin || contenuto.length) };
    if (note.length) out.note_attenzione = note;
    return out;
  }

  if (nome === "proponi_campagna_piatto") {
    const piatto = String(inp.piatto || "").trim();
    if (piatto.length < 3) return { errore: "di quale piatto si tratta?" };
    const modalita = inp.modalita === "promo" ? "promo" : "prenotazione";
    const piattaforme: string[] = Array.isArray(inp.piattaforme) && inp.piattaforme.length ? inp.piattaforme.filter((p: string) => p === "meta" || p === "google") : ["meta", "google"];
    const budget: Record<string, number> = { meta: Number(inp.budget_meta_eur) > 0 ? Number(inp.budget_meta_eur) : 5, google: Number(inp.budget_google_eur) > 0 ? Number(inp.budget_google_eur) : 8 };
    for (const p of piattaforme) if (budget[p] > BUDGET_MAX) return { errore: `il budget massimo per una campagna e' ${BUDGET_MAX} euro al giorno` };
    const raggio = Number(inp.raggio_km) > 0 ? Number(inp.raggio_km) : 25;
    const per = periodo(inp.inizio, inp.durata_giorni);
    if (per.errore) return { errore: per.errore };
    const u = c.testoUtente.toLowerCase();

    // PROMO CON COUPON: cosa da' il coupon lo deve aver detto l'utente (controllo del sistema)
    let coupon: any = null;
    const giorniNomi: string[] = (Array.isArray(inp.giorni_validi) ? inp.giorni_validi : []).filter((g: string) => GN.includes(g));
    const turno = inp.turno === "pranzo" || inp.turno === "cena" ? inp.turno : null;
    if (modalita === "promo") {
      const ct = String(inp.coupon_tipo || "");
      if (!["2x1", "sconto_perc", "sconto_euro", "omaggio"].includes(ct)) return { errore: "per una PROMO serve sapere COSA DA' il coupon (2x1, sconto in percentuale, sconto in euro oppure omaggio) e l'utente non l'ha detto. NON inventarlo e NON richiamare lo strumento: chiedi all'utente in UNA riga che coupon vuole e in quali giorni vale, poi fermati." };
      if (ct === "2x1" && !/\b2\s*[x\u00d7]\s*1\b|due\s+per\s+uno|\b2\s+per\s+1\b|uno\s+gratis|paghi\s+uno|il\s+secondo\s+(\u00e8\s+|e'\s+)?(gratis|omaggio|offerto|regalato)/.test(u)) return { errore: "l'utente NON ha detto che il coupon e' un 2x1 (quel 2x1 viene da una vecchia risposta dell'assistente). NON richiamare lo strumento: chiedi all'utente in UNA riga che coupon vuole (2x1, sconto in %, sconto in euro, omaggio) e in quali giorni vale." };
      const val = Number(inp.coupon_valore);
      if (ct === "sconto_perc" || ct === "sconto_euro") {
        if (!(val > 0) || (ct === "sconto_perc" && val > 90)) return { errore: "coupon_valore non valido: serve il numero detto dall'utente (percentuale max 90)" };
        if (!numeroDetto(val, u)) return { errore: `l'utente non ha detto il valore ${val}: chiedigli quanto deve valere lo sconto, poi fermati.` };
      }
      if (ct === "omaggio" && !/omaggio|regal|offr|gratis|gratuit/.test(u)) return { errore: "l'utente non ha parlato di un omaggio: chiedigli cosa regala il coupon, poi fermati." };
      const cosa = String(inp.coupon_cosa || "").trim().slice(0, 120);
      if (!cosa) return { errore: "serve coupon_cosa: cosa da' il coupon, a parole, con le parole dell'utente" };
      const minp = Math.round(Number(inp.min_persone) || 0), nrd = Math.round(Number(inp.nr_disponibili) || 0);
      if (minp > 1 && !numeroDetto(minp, u)) return { errore: `l'utente non ha detto un minimo di ${minp} persone: toglilo.` };
      if (nrd > 0 && !numeroDetto(nrd, u)) return { errore: `l'utente non ha detto che i coupon sono ${nrd}: toglilo.` };
      coupon = { tipo: ct, valore: ct === "sconto_perc" || ct === "sconto_euro" ? val : null, cosa, giorni: giorniNomi.map((g) => GP.indexOf(g) + 1), turni: turno ? [turno] : [], min_persone: minp > 1 ? minp : null, nr_disponibili: nrd > 0 ? nrd : null };
    }

    // testi: i limiti li fa rispettare il sistema, non si fida del modello
    const tm = String(inp.titolo_meta || "").trim(), xm = String(inp.testo_meta || "").trim();
    if (piattaforme.includes("meta")) {
      if (!tm) return { errore: "scrivi titolo_meta" };
      if (tm.length > 40) return { errore: `titolo_meta troppo lungo (${tm.length} caratteri, max 40): accorcialo e riprova` };
      if (xm.length < 600) return { errore: `il post Meta e' troppo corto (${xm.length} caratteri): il titolare lo vuole ELABORATO, da 700 a 1300 caratteri, in 4 blocchi AIDA (attenzione, interesse, desiderio, azione). Riscrivilo piu' ricco, senza inventare fatti.` };
      if (xm.length > 1800) return { errore: `il post Meta e' troppo lungo (${xm.length} caratteri): massimo 1300-1800. Accorcialo.` };
    }
    const uniq = (a: any) => [...new Set((Array.isArray(a) ? a : []).map((x: any) => String(x ?? "").trim()).filter(Boolean))];
    const titoliTutti = uniq(inp.titoli_google), descrTutte = uniq(inp.descrizioni_google);
    const titoli = titoliTutti.filter((t) => t.length <= 30).slice(0, 5);
    const descrizioni = descrTutte.filter((t) => t.length <= 90).slice(0, 5);
    const lungo = String(inp.titolo_lungo_google || "").trim();
    if (piattaforme.includes("google")) {
      if (titoli.length < 3) return { errore: `servono almeno 3 titoli Google Display di max 30 caratteri (validi: ${titoli.length} su ${titoliTutti.length}; troppo lunghi: ${titoliTutti.filter((t) => t.length > 30).map((t) => `"${t}" ${t.length}`).join("; ")}): riscrivili piu' corti` };
      if (!lungo || lungo.length > 90) return { errore: `serve un titolo_lungo_google di max 90 caratteri (adesso: ${lungo.length})` };
      if (descrizioni.length < 1) return { errore: `serve almeno 1 descrizione Google Display di max 90 caratteri (troppo lunghe: ${descrTutte.filter((t) => t.length > 90).map((t) => t.length).join(", ")}): riscrivila piu' corta` };
    }

    // landing: copy AIDA completo
    const a = controllaAida(inp);
    if (a.errore) return { errore: a.errore };
    const { lt, ls, la, li, ld, laz } = a;
    const valid = String(inp.validita_testo || "").trim().slice(0, 40);
    const regole = String(inp.regole_extra || "").trim().slice(0, 600);

    // i dettagli commerciali devono averli detti l'utente (o essere dati veri del locale): controllo del sistema
    const inventati = dettagliInventati([tm, xm, lungo, ...titoliTutti, ...descrTutte, lt, ls, la, li, ld, laz, valid, regole, coupon ? coupon.cosa : ""].join(" | "), c.testoUtente + " " + c.fattiAmmessi);
    if (inventati.length) return { errore: `nei testi ci sono dettagli che l'UTENTE non ha detto: ${inventati.map((x) => `"${x}"`).join(", ")}. Possono venire da vecchie risposte dell'assistente nella conversazione. Toglili e riscrivi usando solo cio' che l'utente ha detto nei suoi messaggi o i dati veri del locale. Nella risposta all'utente di' che non sai in che cosa consiste la promo e chiedigli di dirtelo (es. uno sconto, un menu) se vuole che compaia nell'annuncio.` };

    const prep = await prepara(c, piattaforme);
    if (prep.errore) return { errore: prep.errore };
    const online = await urlOnline(modalita === "promo" ? PROMO_BASE : LANDING_BASE);
    const foto = await fotoPiatto(c.aziendaId, piatto);
    const note: string[] = [];
    if (!online) note.push(`ATTENZIONE: la pagina della landing adesso non risponde: dillo all'utente`);
    if (!foto) note.push("nessuna foto di questo piatto nella ricetta o nel menu: annunci e landing useranno foto generiche della libreria; dillo all'utente e suggerisci di caricare la foto del piatto");

    const dati: any = {
      modello: "piatto", modalita, piatto, piattaforme, budget: { meta: Math.round(budget.meta * 100), google: Math.round(budget.google * 100) }, raggio_km: raggio,
      citta: prep.cit, sede_id: c.sedeId, sede: prep.sede?.nome || null, foto, inizio: per.inizio, fine: per.fine, tipo: "piatto",
      media: foto ? { url: foto, tipo: "immagine", poster: null } : null,
      contenuti: { titolo_meta: tm, testo_meta: xm, titoli, titolo_lungo: lungo, descrizioni },
      landing: { titolo: lt, sottotitolo: ls, attenzione: la, interesse: li, desiderio: ld, azione: laz, validita_testo: valid, giorni_validi: giorniNomi.map((g) => GN.indexOf(g)), turno, regole_extra: regole },
      coupon,
    };

    // ---- ANTEPRIMA: bozza della landing/promo + anteprima ufficiale del post Meta + pagina riepilogo ----
    await pulisciBozzeMie(c);
    let linkBozza: string;
    if (modalita === "promo") {
      const r = await creaPromoDaDati(c, dati, true);
      if (!r.id) return { errore: "non riesco a preparare la promo di anteprima: " + r.errore };
      dati.bozza = { tipo: "promo", id: r.id };
      linkBozza = `${PROMO_BASE}?id=${r.id}`;
    } else {
      const r = await creaLandingDaDati(c, dati, true);
      if (!r.slug) return { errore: "non riesco a preparare la landing di anteprima: " + r.errore };
      dati.bozza = { tipo: "landing", slug: r.slug };
      linkBozza = `${LANDING_BASE}?p=${r.slug}`;
    }
    let metaUrl: string | null = null;
    if (piattaforme.includes("meta")) {
      const m = await chiamaInterna(c, "tony-meta-anteprima", { azienda_id: c.aziendaId, sede_id: c.sedeId, titolo: tm, messaggio: xm, link: linkBozza, immagine: foto, cta: modalita === "promo" ? "GET_OFFER" : "BOOK_NOW" });
      metaUrl = m?.success ? m.url : null;
      if (!metaUrl) note.push("l'anteprima ufficiale di Meta non e' disponibile adesso: nella pagina di anteprima c'e' una simulazione");
    }
    const { data: bz, error: bzErr } = await sb.from("campagne_bozze").insert({ azienda_id: c.aziendaId, creata_da: c.uid, dati, meta_anteprima_url: metaUrl, landing_url: linkBozza }).select("id").single();
    if (bzErr || !bz) return { errore: "non riesco a preparare la pagina di anteprima: " + (bzErr?.message || "errore") };
    dati.bozza.anteprima_id = bz.id;
    const anteprimaUrl = `${ANTEPRIMA_BASE}?b=${bz.id}`;

    const parti = piattaforme.map((p) => `${p === "meta" ? "Meta" : "Google Display"} ${eur(budget[p])}/giorno`);
    const gancio = xm.split("\n")[0].slice(0, 130);
    const quando = coupon ? ` \u00b7 vale ${giorniNomi.length ? giorniNomi.join("/") : "tutti i giorni"}${turno ? " a " + turno : ""}` : "";
    const riepilogo = modalita === "promo"
      ? `\uD83C\uDF9F Promo con coupon \u00ab${piatto}\u00bb (${etichettaCoupon(coupon)})${quando}: ${parti.join(" + ")} \u00b7 ${raggio} km da ${prep.cit}${testoPeriodo(per)} \u00b7 IN PAUSA \u00b7 + landing promo con coupon, giorni validi, recensioni vere e regolamento${piattaforme.includes("meta") ? ` \u00b7 Post: \u00ab${gancio}\u2026\u00bb (${xm.length} caratteri)` : ""} \u00b7 NON ANCORA PUBBLICATO: guarda l'anteprima`
      : `\uD83C\uDF5D Campagna \u00ab${piatto}\u00bb: ${parti.join(" + ")} \u00b7 ${raggio} km da ${prep.cit}${testoPeriodo(per)} \u00b7 IN PAUSA \u00b7 + landing con foto, recensioni vere, condizioni di prenotazione e modulo${piattaforme.includes("meta") ? ` \u00b7 Post: \u00ab${gancio}\u2026\u00bb (${xm.length} caratteri)` : ""} \u00b7 NON ANCORA PUBBLICATO: guarda l'anteprima`;
    const r: any = await proponi(c, "campagna", dati, riepilogo, anteprimaUrl);
    if (note.length) r.note_attenzione = note;
    return r;
  }

  if (nome === "proponi_stato_campagna") {
    const piatt = inp.piattaforma === "google" ? "google" : "meta";
    const el: any = await elencoLive(c, piatt);
    if (el.errore) return { errore: el.errore };
    const q = String(inp.campagna || "").trim().toLowerCase();
    const trovate = (el.campagne || []).filter((x: any) => x.id === q || String(x.nome).toLowerCase().includes(q));
    if (!trovate.length) return { errore: "nessuna campagna con quel nome", campagne_disponibili: (el.campagne || []).map((x: any) => x.nome) };
    if (trovate.length > 1) return { errore: "piu' campagne corrispondono: chiedi quale", candidate: trovate.map((x: any) => `${x.nome} (${x.stato})`) };
    const k = trovate[0];
    const accendi = inp.stato === "attiva";
    if (accendi && k.stato === "attiva") return { errore: "e' gia' attiva" };
    if (!accendi && k.stato !== "attiva") return { errore: "e' gia' in pausa" };
    const dati = { piattaforma: piatt, campagna_id: k.id, nome: k.nome, stato: accendi ? "attiva" : "pausa", budget_eur: k.budget_giorno_eur };
    const riepilogo = accendi
      ? `\u25B6\uFE0F ACCENDI \u00ab${k.nome}\u00bb su ${piatt === "meta" ? "Meta" : "Google"}: inizia a spendere ${eur(k.budget_giorno_eur)}/giorno`
      : `\u23F8 Metti in pausa \u00ab${k.nome}\u00bb su ${piatt === "meta" ? "Meta" : "Google"}`;
    return await proponi(c, "stato_campagna", dati, riepilogo);
  }
  return { errore: "strumento sconosciuto" };
}

// ---- esecuzione alla conferma ----
async function eseguiConferma(c: Ctx, a: any): Promise<{ ok: boolean; messaggio: string; link?: string; landing?: string }> {
  const d = a.dati || {};
  if (a.tipo === "campagna" && d.modello === "landing") {
    // solo la landing: la bozza guardata in anteprima diventa pubblica, nessuna campagna
    const { data: att } = await sb.from("landing_promo").update({ bozza: false, bozza_di: null }).eq("slug", d.bozza?.slug || "").eq("azienda_id", c.aziendaId).eq("bozza", true).select("slug").maybeSingle();
    if (!att) return { ok: false, messaggio: "\u274C L'anteprima e' scaduta o e' gia' stata confermata. Chiedi di nuovo a Tony." };
    const link = `${LANDING_BASE}?p=${att.slug}`;
    return { ok: true, messaggio: "\u2705 Landing pubblicata: guardala col pulsante qui sotto. Il link si puo' usare nelle campagne e nei post.", landing: link };
  }
  if (a.tipo === "campagna") {
    const piatto = d.modello === "piatto";
    const isPromo = piatto && d.modalita === "promo" && d.coupon;
    const img = piatto ? (d.foto || null) : (d.modello === "menu_business" ? await immagineLanding(c.aziendaId) : null);
    const periodoCorpo = { ...(d.inizio ? { inizio: d.inizio } : {}), ...(d.fine ? { fine: d.fine } : {}) };

    // prima la landing / la promo (le campagne portano li'); se non si riesce, non si crea nessuna campagna
    let linkLanding: string | null = null;
    if (piatto && d.bozza && d.bozza.tipo === "promo") {
      // la bozza viene ATTIVATA: e' la stessa pagina che hai guardato in anteprima
      const { data: att } = await sb.from("promo").update({ bozza: false, bozza_di: null }).eq("id", d.bozza.id).eq("azienda_id", c.aziendaId).eq("bozza", true).select("id").maybeSingle();
      if (!att) return { ok: false, messaggio: "\u274C L'anteprima e' scaduta o e' gia' stata confermata. Chiedi di nuovo a Tony: nessuna campagna creata." };
      linkLanding = `${PROMO_BASE}?id=${att.id}`;
    } else if (piatto && d.bozza && d.bozza.tipo === "landing") {
      const { data: att } = await sb.from("landing_promo").update({ bozza: false, bozza_di: null }).eq("slug", d.bozza.slug).eq("azienda_id", c.aziendaId).eq("bozza", true).select("slug").maybeSingle();
      if (!att) return { ok: false, messaggio: "\u274C L'anteprima e' scaduta o e' gia' stata confermata. Chiedi di nuovo a Tony: nessuna campagna creata." };
      linkLanding = `${LANDING_BASE}?p=${att.slug}`;
    } else if (isPromo) {
      const r = await creaPromoDaDati(c, d, false);
      if (!r.id) return { ok: false, messaggio: `\u274C Non sono riuscito a creare la promo: ${r.errore}. Nessuna campagna creata.` };
      linkLanding = `${PROMO_BASE}?id=${r.id}`;
    } else if (piatto && d.landing) {
      const r = await creaLandingDaDati(c, d, false);
      if (!r.slug) return { ok: false, messaggio: `\u274C Non sono riuscito a creare la landing: ${r.errore}. Nessuna campagna creata.` };
      linkLanding = `${LANDING_BASE}?p=${r.slug}`;
    }
    if (d.bozza?.anteprima_id) { try { await sb.from("campagne_bozze").delete().eq("id", d.bozza.anteprima_id).eq("azienda_id", c.aziendaId); } catch { /* la pulizia automatica fa il resto */ } }
    const linkCorpo = linkLanding ? { link_url: linkLanding } : {};

    const lavori = (d.piattaforme || []).map(async (p: string) => {
      if (p === "meta") {
        const corpo: any = { azienda_id: c.aziendaId, sede_id: d.sede_id, tipo: d.modello, citta: d.citta, budget_cent: d.budget?.meta, raggio_km: d.raggio_km, ...periodoCorpo, ...linkCorpo, ...(isPromo ? { cta: "GET_OFFER" } : {}), ...(img ? { image_url: img } : {}) };
        if (piatto) { corpo.piatto = d.piatto; corpo.titolo = d.contenuti?.titolo_meta; corpo.messaggio = d.contenuti?.testo_meta; }
        const j = await chiamaInterna(c, "tony-meta-campagne", corpo);
        return j.success ? `\u2705 Meta: creata in pausa (${eur((d.budget?.meta || 0) / 100)}/giorno)` : `\u274C Meta: ${typeof j.error === "string" ? j.error : (j.error?.error_user_msg || j.error?.message || "non riuscita")}`;
      }
      const corpoG: any = { azienda_id: c.aziendaId, sede_id: d.sede_id, modello: d.modello, citta: d.citta, budget_cent: d.budget?.google, raggio_km: d.raggio_km, ...periodoCorpo, ...linkCorpo, ...(piatto && img ? { image_url: img } : {}) };
      if (piatto) { corpoG.piatto = d.piatto; corpoG.contenuti = { titoli: d.contenuti?.titoli, titolo_lungo: d.contenuti?.titolo_lungo, descrizioni: d.contenuti?.descrizioni }; }
      const j = await chiamaInterna(c, "tony-google-campagne", corpoG);
      const nomeG = piatto ? "Google Display" : "Google";
      return j.success ? `\u2705 ${nomeG}: creata in pausa (${eur((d.budget?.google || 0) / 100)}/giorno)` : `\u274C ${nomeG}: ${typeof j.error === "string" ? j.error : "non riuscita"}`;
    });
    const righe: string[] = await Promise.all(lavori);
    if (linkLanding) righe.unshift(isPromo ? "\u2705 Promo con coupon pubblicata: guardala col pulsante qui sotto" : "\u2705 Landing pubblicata: guardala col pulsante qui sotto");
    const ok = righe.length > 0 && righe.every((r) => r.startsWith("\u2705"));
    const qualcuna = righe.some((r) => r.startsWith("\u2705") && !r.startsWith("\u2705 Landing") && !r.startsWith("\u2705 Promo"));
    return { ok, messaggio: righe.join(" \u00b7 ") + (qualcuna ? " \u00b7 Per accenderle chiedimelo qui o usa Marketing > Messaggi > Campagne." : ""), link: qualcuna ? "#/bo-template?tab=metaads" : undefined, landing: linkLanding || undefined };
  }
  if (a.tipo === "parole_google") {
    const j = await chiamaInterna(c, "google-ads-ottimizza", { azienda_id: c.aziendaId, campaign_id: d.campagna_id, negative: d.escludere || [], keywords: d.aggiungere || [] });
    if (!j.success) return { ok: false, messaggio: "\u274C Non riuscito: " + (j.error || "errore") };
    const e = j.esito || {};
    const p: string[] = [];
    if ((e.escluse || []).length) p.push("\u2705 Escluse " + e.escluse.length + ": " + e.escluse.join(", "));
    if ((e.parole_aggiunte || []).length) p.push("\u2705 Aggiunte " + e.parole_aggiunte.length + ": " + e.parole_aggiunte.join(", "));
    const scartate = (e.escluse_scartate || []).concat(e.parole_scartate || []);
    if (scartate.length) p.push("\u26A0\uFE0F Non accettate da Google " + scartate.length + ": " + scartate.join("; "));
    if ((d.aggiungere || []).length && !j.gruppo) p.push("\u26A0\uFE0F La campagna non ha un gruppo di annunci attivo: parole non aggiunte");
    return { ok: !scartate.length && p.length > 0, messaggio: (p.join(" \u00b7 ") || "Nessuna modifica") + " \u00b7 \u00ab" + d.nome + "\u00bb" };
  }
  if (a.tipo === "stato_campagna") {
    const accendi = d.stato === "attiva";
    const j = d.piattaforma === "google"
      ? await chiamaInterna(c, "google-ads-campagne", { azienda_id: c.aziendaId, azione: "stato", campaign_id: d.campagna_id, stato: accendi ? "ENABLED" : "PAUSED" })
      : await chiamaInterna(c, "meta-ads-campagne", { azienda_id: c.aziendaId, sede_id: c.sedeId, azione: "stato", campaign_id: d.campagna_id, stato: accendi ? "ACTIVE" : "PAUSED" });
    if (!j.success) return { ok: false, messaggio: `\u274C Non riuscito: ${j.error || "errore"}` };
    return { ok: true, messaggio: accendi ? `\u25B6\uFE0F \u00ab${d.nome}\u00bb e' ATTIVA: da adesso spende il suo budget` : `\u23F8 \u00ab${d.nome}\u00bb e' in pausa` };
  }
  if (a.tipo === "post") {
    const id = Number(d.giorno_id);
    const { data: g } = await sb.from("calendario_editoriale").select("id, stato").eq("id", id).eq("azienda_id", c.aziendaId).maybeSingle();
    if (!g) return { ok: false, messaggio: "\u274C Post non trovato: chiedilo di nuovo a Tony." };
    if (g.stato === "pubblicato") return { ok: true, messaggio: "Il post era gia' uscito." };
    const aperta = await sb.rpc("pubblicazione_consentita", { p_azienda: c.aziendaId });
    if (aperta.data !== true) return { ok: false, messaggio: "\u274C La pubblicazione per questa azienda e' chiusa: si riapre dal Calendario editoriale." };
    const subito = d.quando === "ora";
    const agg: Record<string, unknown> = { stato: "approvato", approvato_da: c.uid, approvato_at: new Date().toISOString() };
    if (subito) { agg.data = oggiRoma(); agg.ora_pubblicazione = "00:00"; }
    await sb.from("calendario_editoriale").update(agg).eq("id", id).eq("azienda_id", c.aziendaId);
    if (!subito) {
      const q = String(d.quando || "");
      return { ok: true, messaggio: "\uD83D\uDDD3\uFE0F Programmato: esce il " + dataLunga(q.slice(0, 10)) + " alle " + q.slice(11, 16) + ". Te lo confermo quando chiedi lo stato del post." };
    }
    const { data: cfg } = await sb.from("deploy_config").select("chiave").eq("id", 1).maybeSingle();
    try {
      await fetch(SUPABASE_URL + "/functions/v1/pubblica-programmati", { method: "POST",
        headers: { "Content-Type": "application/json", "x-deploy-key": String((cfg && cfg.chiave) || "") }, body: "{}" });
    } catch (_e) { /* il giro automatico ogni 15 minuti lo ripubblica */ }
    const { data: dopo } = await sb.from("calendario_editoriale").select("stato, meta_post_id").eq("id", id).maybeSingle();
    const { data: log } = await sb.from("pubblicazioni_log").select("pagina_nome, esito, errore").eq("giorno_id", id);
    const usciti = (log || []).filter((x: any) => x.esito === "pubblicato").map((x: any) => x.pagina_nome === "Instagram" ? "Instagram" : "Facebook");
    if (dopo && dopo.stato === "pubblicato") {
      return { ok: true, messaggio: "\u2705 Uscito su " + usciti.join(" e ") + ". Guardalo col pulsante qui sotto.",
        landing: dopo.meta_post_id ? "https://www.facebook.com/" + dopo.meta_post_id : undefined };
    }
    const err = (log || []).filter((x: any) => x.esito !== "pubblicato").map((x: any) => x.errore).filter(Boolean)[0];
    return { ok: false, messaggio: "\u274C Non e' uscito" + (err ? ": " + String(err).slice(0, 160) : ": riprovo da solo entro 15 minuti, poi chiedimi lo stato del post.") };
  }
  return { ok: false, messaggio: "Azione non riconosciuta" };
}

const SISTEMA = (azienda: string, locale: string, cittaLocale: string, metodo: string) => `Sei Tony, l'assistente marketing di ${azienda} (app Ristoflow). Aiuti a creare e controllare le campagne pubblicitarie su Meta (Facebook e Instagram) e su Google, e le LANDING del locale.

Oggi e' ${oggiRoma()}.
IL LOCALE DA PUBBLICIZZARE e': ${locale}${cittaLocale ? " a " + cittaLocale : ""}. Nei testi degli annunci usa SEMPRE questo nome (mai il nome dell'azienda o di altre sedi) e non nominare altri locali.

${metodo ? metodo + "\n\n" : ""}REGOLE:
- POST DELLA PAGINA (non sponsorizzati): se l'utente chiede un post, anche a voce, usa proponi_post e NON una campagna. Il testo segue lo STILE DEI POST DELLA PAGINA e l'IDENTITA' DEL LOCALE; se lo stile non c'e': frasi corte, niente iperboli, un solo invito alla fine. Foto: se l'utente ne ha allegate usa chat:1; altrimenti cerca con elenco_media e scegli la migliore (persone al lavoro se il post parla del perche'). Se l'utente corregge, richiama proponi_post col testo nuovo. Per sapere se un post e' uscito usa stato_post.
- MODELLO LANDING DELLA CASA (deciso dal titolare, sul modello del Menu business della Trattoria): header col locale; HERO PULITO con foto o VIDEO e sopra SOLO l'etichetta piccola, un TITOLO CORTO E POTENTE e il PREZZO grande come gancio (se l'utente l'ha detto), piu' i due bottoni (Prenota + quello verso il menu); sul video NON va altro testo, la frase di apertura va sotto. Poi: cosa comprende e orari, testi AIDA, il menu, galleria, recensioni vere, modulo di prenotazione con le CONDIZIONI DI PRENOTAZIONE della sede (le mette il sistema dal modulo di prenotazione online: tu non le scrivi), WhatsApp e Chiama, piede con indirizzo.
- MENU DEL GIORNO COLLEGATO: se la landing e' del MENU BUSINESS o del MENU DEL GIORNO che il locale scrive ogni giorno nell'app, passa menu_dinamico='menu_giorno' e NON compilare 'contenuto': la pagina mostra da sola i piatti di oggi (dopo le 15 quelli di domani, se gia' scritti) e si aggiorna ogni giorno senza toccare la landing. In questo caso nei testi spiega il vantaggio con le parole dell'utente (es. che il menu cambia ogni giorno), senza inventare piatti.
- QUANDO L'UTENTE CHIEDE UNA LANDING (per un menu, un'offerta, una serata, un evento o un piatto) SENZA campagne: prima usa elenco_media per scegliere foto o video dell'hero (preferisci un video se lo chiede o se ce n'e' uno adatto), poi proponi_landing. Per una CAMPAGNA su un piatto usa invece proponi_campagna_piatto, che crea anche la sua landing.
- PREZZO, COSA COMPRENDE, ORARI e MENU FISSO nella landing: SOLO se l'utente li ha detti (o sono dati veri del locale). Se l'utente non ha detto il prezzo NON metterlo; se non ha detto i piatti e non c'e' il menu del giorno, NON mettere il menu. Se mancano dati importanti (prezzo, piatti), chiedili in UNA riga prima di proporre, oppure proponi senza e dillo.
- DOPO proponi_landing descrivi SOLO cio' che c'e' davvero in pagina: leggi il campo 'in_pagina' del risultato (hero, prezzo, menu, secondo_bottone) e non nominare elementi che li' risultano assenti.
- ANTEPRIMA PRIMA DI CONFERMARE: con proponi_landing e proponi_campagna_piatto il sistema prepara una BOZZA visibile col pulsante "\uD83D\uDC41 Anteprima" nella scheda. NULLA e' pubblicato finche' l'utente non preme Conferma. Nella risposta di' sempre, in una riga, di toccare "\uD83D\uDC41 Anteprima" per vedere com'e' venuto prima di confermare.
- DUE COSE DIVERSE: una LANDING DI PRENOTAZIONE (la persona prenota un tavolo, nessun coupon; in fondo ci sono le condizioni di prenotazione della sede) e una PROMO (la persona scarica un COUPON e lo usa nei giorni validi, con il suo regolamento). Se l'utente parla di "promo", "coupon", "offerta" con coupon usa proponi_campagna_piatto in modalita' 'promo'; se vuole solo far prenotare, la landing di prenotazione. Lo schema AIDA vale SEMPRE.
- PROMO CON COUPON: prima di usare lo strumento servono due cose dette dall'UTENTE: COSA DA' il coupon (2x1, sconto in % o in euro con il numero, omaggio con cosa regala) e IN QUALI GIORNI vale (ed eventuale turno, minimo di persone, quantita'). Se manca anche solo il contenuto del coupon, NON chiamare lo strumento e NON proporre nulla: chiedi in UNA riga (es. "Che coupon e'? 2x1, sconto in % o in euro, oppure un omaggio? E in quali giorni vale?") e fermati. Mai dedurlo da vecchie risposte dell'assistente.
- FONTE DEI FATTI: nella conversazione ci sono anche vecchie risposte dell'assistente, che possono arrivare da un altro motore e contenere cose inventate (es. "promo 2x1", sconti, prezzi). I FATTI per annunci e landing li prendi SOLO dai messaggi dell'UTENTE e dai dati veri qui sopra (identita' del locale, recensioni verificate).
- POST META ELABORATO (la regola piu' importante per le campagne): il titolare lo vuole LUNGO e ragionato, non uno slogan. Da 700 a 1300 caratteri, in 4 blocchi separati da una riga vuota, nello schema AIDA del METODO qui sopra: ATTENZIONE (la prima riga e' il gancio: una provocazione o un problema vero del cliente, max 120 caratteri, perche' e' l'unica parte che si vede prima di 'Altro'), INTERESSE (la negativita' comune del settore e il contrasto positivo: parla del modo di fare ristorazione, senza accusare nessuno e senza inventare), DESIDERIO (il perche' del locale preso dall'IDENTITA' DEL LOCALE, cosa vive chi viene, i dati che l'utente ti ha dato; eventuale prova sociale SOLO con i fatti veri qui sopra), AZIONE (invito specifico e urgente, con il beneficio e la validita'; in promo e' scaricare il coupon e deve dire COSA da' e QUANDO vale; in prenotazione e' prenotare). Si parte dal PERCHE' (Golden Circle), non dal cosa. Poche emoji. Mai "ti aspettiamo".
- TESTI DELLA LANDING: tu scrivi titolo, sottotitolo, etichetta, attenzione, interesse, desiderio, azione (e, se l'utente li ha detti, prezzo, cosa comprende, orari, menu fisso). Foto/video, galleria, recensioni vere, menu del giorno, condizioni o regolamento e modulo li aggiunge il sistema. La landing ripete la storia del post ma piu' spiegata.
- Una campagna o una landing si crea SOLO con uno strumento "proponi_...": compare una scheda col pulsante Conferma. Non chiedere conferma a parole e non dire mai che e' gia' fatta: dopo lo strumento di' solo cosa hai preparato.
- Ogni campagna nasce SEMPRE IN PAUSA e non spende finche' non viene accesa. Accenderla e metterla in pausa sono passi a parte, con proponi_stato_campagna (anche questi con scheda). Se ha una data di inizio, quando la accendi parte da quella data.
- PERIODO: se l'utente dice quando parte ("domani") e per quanto tempo ("per 30 giorni") passa inizio e durata_giorni agli strumenti: le date le calcola il sistema, tu non fare conti sulle date. Nella risposta riporta il periodo come lo trovi nella scheda.
- VALIDITA' DELLA PROMO: se l'utente dice che la promo/coupon vale in certi momenti (es. "ogni venerdi a cena") scrivilo nel testo dell'annuncio e passa validita_testo, giorni_validi e turno. NON significa che la pubblicita' debba girare solo quel giorno: l'annuncio gira tutti i giorni del periodo, a meno che l'utente dica esplicitamente di mostrarlo solo in certi giorni o orari; in quel caso di' con sincerita' che i giorni e gli orari della pubblicita' per ora non si impostano.
- Per far conoscere UN PIATTO con una campagna usa proponi_campagna_piatto e scrivi TU i testi nei limiti di caratteri indicati (titolo Meta max 40, titoli Google Display max 30, titolo lungo Google max 90, descrizioni Google max 90). Su Google le promo si fanno in DISPLAY (annunci con la foto del piatto), non in Ricerca. Il RETARGETING si aggiunge piu' avanti con i pixel e i tag: non proporlo adesso; le landing li montano da sole quando saranno configurati.
- NEI TESTI NON INVENTARE NIENTE: niente ingredienti, metodi (fatte a mano, fresche, artigianali), provenienza, prezzi, premi o promozioni che l'UTENTE non ha detto. Se l'utente ti da' i dettagli, usali; se dice di NON nominare qualcosa (un'azienda, un fornitore), non nominarlo mai. L'utente parla a voce: il testo trascritto puo' avere errori (es. "Clem" per "creiamo", "l'amo" per "l'amo/gancio"): capisci l'intento.
- Dopo proponi_campagna_piatto riporta nella risposta il POST META COMPLETO (la scheda ne mostra solo l'inizio), il titolo lungo di Google e, in una riga, cosa conterra' la landing (in promo: il coupon e quando vale), cosi' l'utente legge tutto; poi invitalo a toccare "\uD83D\uDC41 Anteprima". In questo caso la risposta puo' essere lunga. Dopo proponi_landing riassumi in 2-3 righe cosa c'e' nella pagina e cosa manca perche' l'utente non l'ha detto.
- Altri modelli pronti: "menu_business" (Meta e Google Ricerca: pranzo e cena a prezzo fisso, porta alla pagina Menu business) e "compleanni" (solo Meta: torta in regalo per chi compie gli anni). Per altre idee di campagna di' con sincerita' che per ora non c'e' il modello e proponi il piu' vicino.
- Usa i valori di partenza (25 km, 5 euro al giorno su Meta, 8 su Google) e cambia solo cio' che l'utente dice (es. "a 30 km", "6 euro al giorno"). Se l'utente da' UN solo budget senza dire la piattaforma, applicalo a entrambe e dillo nella risposta con il totale. Chiedi al massimo UNA cosa, e solo se serve davvero.
- Per sapere come stanno andando le campagne usa stato_campagne e riporta SOLO i numeri letti. Se la spesa e' zero o i click sono pochi, dillo cosi': non commentare come se ci fossero dati. Non inventare mai numeri.
- INTERAZIONI E NUMERI DI OGGI O DI IERI: per mi piace, reazioni, commenti, condivisioni, salvataggi, video visti, persone raggiunte, e per spesa e clic di OGGI o di IERI (anche su Google), usa interazioni_campagne con il periodo detto dall'utente (se non lo dice: oggi). Racconta i totali e le 2-3 campagne con piu' interazioni, con i numeri letti. Le persone raggiunte di campagne diverse NON si sommano. Se una piattaforma risponde con un errore, dillo in una riga. Questi sono numeri di Meta e Google: le visite alle pagine e le prenotazioni vere sono un'altra cosa (analisi_visite).
- PAROLE CHIAVE DI GOOGLE (pulizia): quando l'utente chiede di pulire o controllare le parole chiave, le ricerche o le esclusioni, prima usa termini_ricerca (la campagna che dice lui, o tutte), poi proponi_esclusioni, una campagna per volta. Escludi solo le ricerche che non porteranno clienti a QUESTA campagna: nomi di ALTRI locali, alberghi, agriturismi o aziende, lavoro e assunzioni, ricette e "come si fa", luoghi lontani, servizi che il locale non offre, gratis, e le ricerche di un tipo di evento diverso da quello della campagna. MAI escludere il nome del locale, la sua citta' o le parole del suo servizio (es. 'ristorante', 'pranzo', 'matrimonio' nella campagna giusta). Usa parole corte e precise (es. 'gelsomino', non la frase intera), max 20 per volta. Aggiungi parole chiave nuove solo se tra le ricerche ce ne sono di molto pertinenti con clic. Dopo la scheda di' in 2-3 righe quante ricerche hai guardato, quanto e' costato negli ultimi giorni quello che escludi e perche'. Se la campagna non e' di Ricerca, dillo.
- COSA PUOI FARE DAVVERO: solo quello che fanno i tuoi strumenti. Pubblici, budget di una campagna esistente e testi di annunci gia' pubblicati NON li modifichi tu: se te lo chiedono dillo subito in una riga, senza promettere. Non dire MAI di aver preparato una scheda, una proposta o una modifica se in questa risposta non hai chiamato davvero uno strumento proponi_ che l'ha creata, e non riportare numeri che non vengono da uno strumento chiamato in questa conversazione.
- VISITE ALLE PAGINE: per domande su visite, visitatori, traffico, chi ha guardato o toccato cosa, dove si fermano nel preventivo o nella prenotazione della visita, usa analisi_visite (giorni = il periodo che dice l'utente, oggi = 1; filtro = la pagina o la campagna di cui parla). Le visite VERE sono le 'persone'; 'robot_riconosciuti' e 'solo_aperture' NON sono clienti: sono soprattutto i controlli automatici di Meta quando si creano annunci nuovi, anteprime e chi chiude subito. Dillo in mezza riga quando le sessioni sono molte piu' delle persone. Se una pagina ha misura 'non misurabile' registra solo le aperture: non dire quante persone vere ci sono. Se serve confrontare con la spesa e i clic usa anche stato_campagne. Numeri piccoli = pochi dati: dillo, e non trarre conclusioni forti prima di qualche giorno.
- RISPOSTE DI LETTURA (visite, andamento delle campagne, interazioni, spese, numeri): MASSIMO 5 righe corte, circa 400 caratteri in tutto: i numeri chiave e UNA cosa pratica da fare. Niente titoli, niente elenchi puntati, niente tabelle, non ripetere la domanda e non spiegare come leggi i dati. Il dettaglio solo se l'utente lo chiede.
- Prima di accendere una campagna ricorda in una riga che da quel momento spende il budget giornaliero.
- Le altre risposte sono brevi (2-4 frasi) TRANNE quando riporti il post: li' mostra il testo completo. Niente elenchi lunghi. Non fare promesse sui risultati.
- Non puoi modificare altro dell'app: se te lo chiedono, di' che non e' il tuo compito.`;

const URL_ANTHROPIC = "https://api.anthropic.com/v1/messages";
function intestazioni(chiave: string) { return { "x-api-key": chiave, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }; }
// i blocchi di testo vuoti (capitano in streaming prima di uno strumento) non vanno rimandati al modello: li rifiuta
function senzaVuoti(blocchi: any[]): any[] { return (blocchi || []).filter(function (b: any) { return !(b && b.type === "text" && !String(b.text || "").trim()); }); }

async function chiamaClaude(chiave: string, sistema: string, messaggi: any[]): Promise<{ ok: boolean; j?: any; errore?: string }> {
  let ultimo = "";
  // istruzioni e strumenti con il segno di cache: restano in memoria 5 minuti, le chiamate successive non le rileggono
  const sistemaCache = [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }];
  for (const modello of ["claude-sonnet-5-5", "claude-sonnet-5", "claude-haiku-5-5"]) {
    const r = await fetch(URL_ANTHROPIC, {
      method: "POST",
      headers: intestazioni(chiave),
      body: JSON.stringify({ model: modello, max_tokens: 6000, system: sistemaCache, tools: TOOLS_CACHE, messages: messaggi }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, j };
    ultimo = `${modello}: ${j?.error?.message || ("HTTP " + r.status)}`;
    // si passa al modello successivo solo se questo non esiste o e' sovraccarico
    if (!(r.status === 404 || r.status === 429 || r.status >= 500)) break;
  }
  return { ok: false, errore: ultimo || "nessun modello disponibile" };
}

// come chiamaClaude, ma riceve la risposta a pezzi e passa il testo a suTesto mentre arriva.
// Se lo streaming non parte (errore, modello non disponibile) ripiega sulla chiamata normale.
async function chiamaClaudeStream(chiave: string, sistema: string, messaggi: any[], suTesto: (t: string) => void): Promise<{ ok: boolean; j?: any; errore?: string }> {
  const sistemaCache = [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }];
  let r: Response;
  try {
    r = await fetch(URL_ANTHROPIC, {
      method: "POST",
      headers: Object.assign({}, intestazioni(chiave), { "Accept-Encoding": "identity", "Accept": "text/event-stream" }),
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 6000, system: sistemaCache, tools: TOOLS_CACHE, messages: messaggi, stream: true }),
    });
  } catch (_e) { return await chiamaClaude(chiave, sistema, messaggi); }
  if (!r.ok || !r.body) return await chiamaClaude(chiave, sistema, messaggi);
  const lettore = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const blocchi: any[] = [];
  const jsonParziale: Record<number, string> = {};
  let stop: string | null = null;
  const uso: any = {};
  while (true) {
    const pezzo = await lettore.read();
    if (pezzo.done) break;
    buf += dec.decode(pezzo.value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const riga = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (riga.indexOf("data:") !== 0) continue;
      let ev: any;
      try { ev = JSON.parse(riga.slice(5).trim()); } catch (_e) { continue; }
      if (ev.type === "message_start" && ev.message && ev.message.usage) Object.assign(uso, ev.message.usage);
      else if (ev.type === "content_block_start") {
        const cb = ev.content_block || {};
        blocchi[ev.index] = cb.type === "tool_use" ? { type: "tool_use", id: cb.id, name: cb.name, input: {} } : { type: "text", text: "" };
      } else if (ev.type === "content_block_delta") {
        const d = ev.delta || {};
        if (d.type === "text_delta" && blocchi[ev.index]) { blocchi[ev.index].text += d.text; suTesto(d.text); }
        else if (d.type === "input_json_delta") jsonParziale[ev.index] = (jsonParziale[ev.index] || "") + (d.partial_json || "");
      } else if (ev.type === "content_block_stop") {
        const b = blocchi[ev.index];
        if (b && b.type === "tool_use") { try { b.input = jsonParziale[ev.index] ? JSON.parse(jsonParziale[ev.index]) : {}; } catch (_e) { b.input = {}; } }
      } else if (ev.type === "message_delta") {
        if (ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
        if (ev.usage) Object.assign(uso, ev.usage);
      } else if (ev.type === "error") {
        return { ok: false, errore: (ev.error && ev.error.message) || "errore nello streaming" };
      }
    }
  }
  return { ok: true, j: { content: senzaVuoti(blocchi.filter(Boolean)), stop_reason: stop, usage: uso } };
}

// il giro di chat: il modello sceglie gli strumenti, il sistema li esegue, il modello risponde.
// suTesto (facoltativo) riceve il testo mentre arriva; azzera() dice che il testo arrivato prima di uno strumento va tolto.
async function rispondi(c: Ctx, chiave: string, sistema: string, conv: any[], prova: string, tInizio: number, tDati: number, suTesto: ((t: string) => void) | null, azzera: (() => void) | null): Promise<any> {
  let testo = "";
  let ultimoErrore = "";
  const debug: any[] = [];
  for (let giro = 0; giro < 7; giro++) {
    const t0 = Date.now();
    const r = suTesto ? await chiamaClaudeStream(chiave, sistema, conv, suTesto) : await chiamaClaude(chiave, sistema, conv);
    if (!r.ok) return { success: false, error: "Tony non riesce a rispondere: " + r.errore, ...(prova ? { debug } : {}) };
    if (prova) debug.push({ giro, modello_ms: Date.now() - t0, dati_iniziali_ms: giro === 0 ? tDati : undefined, token_da_cache: r.j?.usage?.cache_read_input_tokens || 0, token_scritti_in_cache: r.j?.usage?.cache_creation_input_tokens || 0, token_nuovi: r.j?.usage?.input_tokens || 0, token_risposta: r.j?.usage?.output_tokens || 0 });
    const blocchi: any[] = senzaVuoti(r.j.content || []);
    testo = blocchi.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const usi = blocchi.filter((b) => b.type === "tool_use");
    if (r.j.stop_reason !== "tool_use" || !usi.length) break;
    if (azzera) azzera();
    conv.push({ role: "assistant", content: blocchi });
    const risultati: any[] = [];
    for (const u of usi) {
      let out: any;
      const ts = Date.now();
      try { out = await eseguiStrumento(c, u.name, u.input || {}); } catch (e) { out = { errore: e instanceof Error ? e.message : "errore" }; }
      if (out?.errore) ultimoErrore = String(out.errore);
      if (prova) debug.push({ giro, strumento: u.name, strumento_ms: Date.now() - ts, input: JSON.stringify(u.input || {}).slice(0, 1800), esito: JSON.stringify(out).slice(0, 300) });
      risultati.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out).slice(0, 12000) });
    }
    conv.push({ role: "user", content: risultati });
    testo = ""; // se i giri finiscono qui, non c'e' nessuna risposta vera
  }
  if (!testo) {
    testo = c.proposte.length
      ? "Ho preparato la scheda: tocca \"Anteprima\" per vedere com'\u00e8 venuto, poi conferma."
      : "Non sono riuscito a preparare la proposta" + (ultimoErrore ? ": " + ultimoErrore : "") + ". Riprova, o dimmi in modo piu' semplice cosa vuoi.";
  }
  return { success: true, reply: testo, azioni: c.proposte, fonte: "campagne", ...(prova ? { debug, totale_ms: Date.now() - tInizio } : {}) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const aziendaId = body.azienda_id;
    if (!aziendaId) return json({ success: false, error: "azienda_id obbligatorio" }, 400);

    // chi e'
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let prova = "";
    let uid: string | null = null;
    const chiaveProva = req.headers.get("x-prova") || "";
    if (chiaveProva) {
      const { data: cfg } = await sb.from("deploy_config").select("chiave").eq("id", 1).maybeSingle();
      if (cfg?.chiave && chiaveProva === cfg.chiave) { prova = chiaveProva; uid = body.test_uid || null; }
    }
    if (!uid) {
      const { data: u } = await sb.auth.getUser(token);
      uid = u?.user?.id || null;
    }
    if (!uid) return json({ success: false, error: "Accesso non valido" }, 401);
    const { data: ua } = await sb.from("utenti_aziende").select("ruolo").eq("user_id", uid).eq("azienda_id", aziendaId).eq("attivo", true).limit(5);
    const admin = (ua || []).some((r: any) => ["admin", "superadmin"].includes(String(r.ruolo).toLowerCase()));
    if (!admin) return json({ success: true, reply: "Le campagne le puo' creare e gestire solo un amministratore. Chiedi a lui, oppure dimmi pure altro che posso fare per te.", fonte: "campagne" });

    const { data: az } = await sb.from("aziende").select("nome").eq("id", aziendaId).maybeSingle();
    const messaggiIn: any[] = Array.isArray(body.messages) ? body.messages : [];
    const testoUtente = messaggiIn.filter((m) => m?.role === "user").map((m) => String(m?.content ?? "")).join(" \n ");
    const c: Ctx = { aziendaId, uid, sedeId: body.sede_id || null, token, prova, azienda: az?.nome || "questo locale", proposte: [], testoUtente, fattiAmmessi: "" };

    // conferma di una scheda
    if (body.conferma) {
      const a = body.conferma;
      if (!a?.firma || a.firma !== await firma(testoAzione({ tipo: a.tipo, dati: a.dati }, uid, aziendaId))) return json({ success: false, error: "Conferma non valida" }, 400);
      const esito = await eseguiConferma(c, a);
      await sb.from("tony_registro").insert({ azienda_id: aziendaId, user_id: uid, tipo: a.tipo, dati: a.dati, esito: esito.messaggio, ok: esito.ok });
      return json({ success: esito.ok, reply: esito.messaggio, link: esito.link || null, landing: esito.landing || null });
    }

    // chat
    const chiave = chiaveAnthropic();
    if (!chiave) return json({ success: false, error: "motore non configurato" }, 500);
    const tInizio = Date.now();
    const [{ data: sd }, metodo] = await Promise.all([
      c.sedeId ? sb.from("sedi").select("nome,citta").eq("id", c.sedeId).maybeSingle() : Promise.resolve({ data: null } as any),
      caricaMetodoVeloce(aziendaId, c.sedeId),
    ]);
    const locale = sd?.nome || c.azienda;
    const cittaLocale = citta(sd?.citta);
    c.fattiAmmessi = metodo.ammessi;
    const tDati = Date.now() - tInizio;
    const conv: any[] = [];
    for (const m of messaggiIn.slice(-12)) {
      const role = m?.role === "assistant" ? "assistant" : "user";
      const text = String(m?.content ?? "").trim();
      if (!text) continue;
      if (conv.length && conv[conv.length - 1].role === role) conv[conv.length - 1].content += "\n" + text; else conv.push({ role, content: text });
    }
    while (conv.length && conv[0].role !== "user") conv.shift();
    if (!conv.length) return json({ success: true, reply: "Dimmi che campagna o che landing vuoi: per esempio il menu business, una serata, o un piatto da far conoscere.", fonte: "campagne" });
    const sistema = SISTEMA(c.azienda, locale, cittaLocale, metodo.testo);

    if (!body.stream) return json(await rispondi(c, chiave, sistema, conv, prova, tInizio, tDati, null, null));

    // STREAMING: eventi 'testo' (pezzi della risposta), 'azzera' (togli il testo mostrato finora) e 'fine' (la risposta completa).
    // Il primo pacchetto (un commento vuoto) fa partire subito le intestazioni; il lavoro gira in parallelo.
    const enc = new TextEncoder();
    const flusso = new ReadableStream({
      start(ctrl) {
        const manda = (evento: string, dati: unknown) => { try { ctrl.enqueue(enc.encode("event: " + evento + "\ndata: " + JSON.stringify(dati) + "\n\n")); } catch (_e) { /* chiuso */ } };
        ctrl.enqueue(enc.encode(":" + " ".repeat(2048) + "\n\n"));
        (async function () {
          try {
            const fine = await rispondi(c, chiave, sistema, conv, prova, tInizio, tDati, (t: string) => manda("testo", { t: t }), () => manda("azzera", {}));
            manda("fine", fine);
          } catch (e) {
            manda("fine", { success: false, error: e instanceof Error ? e.message : "Errore interno" });
          }
          try { ctrl.close(); } catch (_e) { /* gia' chiuso */ }
        })();
      },
    });
    return new Response(flusso, { headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
  } catch (err) {
    console.error("TONY-CAMPAGNE-CHAT:", err);
    return json({ success: false, error: err instanceof Error ? err.message : "Errore interno" }, 500);
  }
});
