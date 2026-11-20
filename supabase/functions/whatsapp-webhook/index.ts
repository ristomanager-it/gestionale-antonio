// ============================================================
// WHATSAPP WEBHOOK v26 — Ristoflow.AI
// Riceve messaggi da Meta WhatsApp Business API e instrada:
//   - contesto della connessione = ristorante -> flusso prenotazione tavolo
//   - contesto della connessione = hotel      -> link booking.html
//   - contesto della connessione = notifiche  -> NESSUN bot (numero di servizio): il messaggio si salva e basta
//   - altrimenti, dal tipo_app dell'azienda:
//       solo ristorante  -> flusso prenotazione tavolo
//       solo hotel       -> link booking.html
//       entrambi         -> menu hub con sessione 2h (wa_sessioni_hub)
// v9..v19: vedi storico (contesto per sede, provenienza, sessioni, doppioni, registro conversazioni,
//      numero notifiche, feste, silenzio del bot, limiti e chiusure, foto/documenti senza risposta).
// v20: il bot sta zitto se una persona ha risposto nelle ultime 24 ore o se il cliente ha gia' una prenotazione attiva.
// v21: gli allegati si scaricano e si vedono nella Inbox.
// v22: pulsanti Confermo / Annulla del riepilogo ordine anticipato.
// v23: CLIENTI CHE NON SI PERDONO (caso Umberto 09/11):
//      - orari capiti come li scrive la gente: "alle 13", "all'una e mezza", "verso le 8", "13e30", "tra mezz'ora", "subito"
//      - persone capite anche a parole: "siamo in quattro", "2 adulti e 2 bambini", "coppia"
//      - esempio dell'orario adatto al momento (13:00 prima delle 15, 20:30 dopo)
//      - PRENOTAZIONE PER OGGI = avviso immediato allo staff (notifica + push) gia' alla data, e di nuovo con l'orario
//        se mancano meno di 2 ore e mezza; al cliente si dice che la sala e' avvisata e si da' il numero della sede
//      - orario di oggi gia' passato: si dice, non si prenota
//      - INTENT DI USCITA ("non serve piu'", "lascia stare", "ho gia' prenotato"...): il bot chiude con garbo invece di
//        insistere, il messaggio resta da leggere e il cliente finisce in wa_lead_persi con il passo a cui si e' fermato
// v25: BOT AI (Centralino AI): se la sede ha bot_wa_ai attivo i messaggi del flusso ristorante li gestisce
//      centralino-bot (stesse azioni della voce: prenota, info, menu, link, asporto).
// v26: con il bot AI acceso il vecchio bot a domande NON parte mai (niente due bot diversi): se l'AI non risponde il cliente
//      riceve una sola frase e lo staff un avviso. Codici campagna e annunci Meta passano all'AI, che li mette nella prenotazione.
// v24: SPUNTE — gli avvisi di consegna e lettura di Meta si salvano sul messaggio (wa_registra_stato):
//      in conversazione si vede se il cliente ha ricevuto e letto.
// Deploy: Supabase Edge Functions, JWT verification OFF
// ============================================================

// ---------- CONFIG ----------
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("MY_SERVICE_KEY") ?? "";
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const VERIFY_TOKEN =
  Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "ristoflow-verify-2026";
const GRAPH_VERSION = "v21.0";
const HOTEL_BOOKING_BASE = "https://hotel.ristoflow-ai.com/booking.html";
const ADMIN_WA_NUMBER = Deno.env.get("ADMIN_WA_NUMBER") ?? ""; // opzionale: notifica admin

// ---------- HELPER DB (PostgREST via fetch) ----------
const dbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function dbSelect(table: string, query: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: dbHeaders,
  });
  if (!r.ok) {
    console.error(`DB SELECT ${table} error:`, r.status, await r.text());
    return [];
  }
  return await r.json();
}

async function dbInsert(table: string, row: Record<string, unknown> | Record<string, unknown>[]): Promise<any | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...dbHeaders, Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  const text = await r.text();
  if (!r.ok) {
    console.error(`DB INSERT ${table} error:`, r.status, text);
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return {};
  }
}

async function dbUpdate(table: string, query: string, patch: Record<string, unknown>): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: { ...dbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    console.error(`DB UPDATE ${table} error:`, r.status, await r.text());
    return false;
  }
  return true;
}

async function dbDelete(table: string, query: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "DELETE",
    headers: dbHeaders,
  });
}

// ---------- v21: ALLEGATI (foto, PDF, vocali, video) ----------
const MEDIA_TIPI = ["image", "document", "audio", "video", "sticker"];

async function scaricaMedia(conn: any, msg: any): Promise<void> {
  try {
    const m = msg?.[msg?.type];
    if (!MEDIA_TIPI.includes(msg?.type) || !m?.id || !msg?.id) return;
    const token = conn.meta_access_token || WHATSAPP_TOKEN;
    const ri = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${m.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const info: any = await ri.json().catch(() => ({}));
    if (!info?.url) { console.error("media info:", ri.status, JSON.stringify(info)); return; }
    const bin = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!bin.ok) { console.error("media download:", bin.status); return; }
    const mime = String(info.mime_type || m.mime_type || "application/octet-stream").split(";")[0].trim();
    const est = (mime.split("/")[1] || "bin").replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
    const nome = m.filename ? String(m.filename).replace(/[^\w.\-]/g, "_").slice(-80) : `${msg.type}.${est}`;
    const path = `whatsapp/${conn.azienda_id}/${Date.now()}-${crypto.randomUUID().slice(0, 12)}-${nome}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/media-aziende/${path}`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": mime, "x-upsert": "true" },
      body: await bin.arrayBuffer(),
    });
    if (!up.ok) { console.error("media upload:", up.status, await up.text()); return; }
    const patch: Record<string, unknown> = {
      media_url: `${SUPABASE_URL}/storage/v1/object/public/media-aziende/${path}`,
      media_mime: mime,
    };
    const didascalia = m.caption || (m.filename ? `📎 ${m.filename}` : null);
    if (didascalia) patch.testo = didascalia;
    await dbUpdate("whatsapp_messaggi", `message_id=eq.${encodeURIComponent(msg.id)}`, patch);
  } catch (e) {
    console.error("scaricaMedia:", String(e));
  }
}

// ---------- v14: REGISTRO DELLE CONVERSAZIONI ----------
const uscite = new Map<string, any[]>();

function registraUscita(phoneNumberId: string, to: string, voce: Record<string, unknown>): void {
  const a = uscite.get(`${phoneNumberId}|${to}`);
  if (a) a.push(voce);
}

async function salvaRicevuto(row: Record<string, unknown>): Promise<"nuovo" | "duplicato" | "errore"> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messaggi?on_conflict=message_id`, {
      method: "POST",
      headers: { ...dbHeaders, Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    const text = await r.text();
    if (!r.ok) {
      console.error("DB INSERT whatsapp_messaggi error:", r.status, text);
      return "errore";
    }
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) && parsed.length === 0 ? "duplicato" : "nuovo";
  } catch (e) {
    console.error("salvaRicevuto:", String(e));
    return "errore";
  }
}

async function chiudiScambio(conn: any, from: string, msgId: string | null, phoneNumberId: string, nome: string | null): Promise<void> {
  const chiave = `${phoneNumberId}|${from}`;
  const v = uscite.get(chiave) ?? [];
  uscite.delete(chiave);
  if (!v.length) return;
  try {
    if (msgId) {
      await dbUpdate("whatsapp_messaggi", `message_id=eq.${encodeURIComponent(msgId)}`, {
        risposta_inviata: v.some((x) => x.ok),
        risposta_testo: v.map((x) => x.testo).join("\n\n"),
      });
    }
    for (const x of v) {
      await dbInsert("whatsapp_messaggi_log", {
        azienda_id: conn.azienda_id,
        connessione_id: conn.id ?? null,
        numero_dest: from,
        nome_dest: nome,
        tipo: "testo",
        testo: x.testo,
        contesto: "bot_prenotazioni",
        stato: x.ok ? "inviato" : "errore",
        meta_message_id: x.id ?? null,
        errore_msg: x.err ?? null,
      });
    }
  } catch (e) {
    console.error("chiudiScambio:", String(e));
  }
}

// ---------- HELPER INVIO WHATSAPP ----------
async function sendText(phoneNumberId: string, token: string, to: string, body: string): Promise<void> {
  const r = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    },
  );
  const txt = await r.text();
  let esito: any = null;
  try { esito = JSON.parse(txt); } catch { /* risposta non JSON */ }
  registraUscita(phoneNumberId, to, {
    testo: body,
    ok: r.ok,
    id: esito?.messages?.[0]?.id ?? null,
    err: r.ok ? null : (esito?.error?.message ?? `HTTP ${r.status}`),
  });
  if (!r.ok) {
    console.error("WA SEND error:", r.status, txt);
  }
}

async function sendButtons(
  phoneNumberId: string,
  token: string,
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<void> {
  const r = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: buttons.map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      }),
    },
  );
  const txt = await r.text();
  let esito: any = null;
  try { esito = JSON.parse(txt); } catch { /* risposta non JSON */ }
  registraUscita(phoneNumberId, to, {
    testo: `${body}\n[${buttons.map((b) => b.title).join(" | ")}]`,
    ok: r.ok,
    id: esito?.messages?.[0]?.id ?? null,
    err: r.ok ? null : (esito?.error?.message ?? `HTTP ${r.status}`),
  });
  if (!r.ok) {
    console.error("WA SEND BUTTONS error:", r.status, txt);
  }
}

// ---------- v22: RISPOSTA AL RIEPILOGO DELL'ORDINE ----------
// true = era la risposta a un ordine in attesa ed e' stata gestita
async function rispostaOrdine(conn: any, from: string, conferma: boolean, msgId: string | null): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ordine_risposta_cliente`, {
      method: "POST",
      headers: dbHeaders,
      body: JSON.stringify({ p_telefono: from, p_conferma: conferma }),
    });
    if (!r.ok) { console.error("ordine_risposta_cliente:", r.status, await r.text()); return false; }
    const esito: any = await r.json();
    if (!esito?.ok) return false;
    const nome = String(esito.nome || "").split(" ")[0];
    const token = conn.meta_access_token || WHATSAPP_TOKEN;
    await sendText(
      conn.meta_phone_number_id, token, from,
      esito.esito === "confermato"
        ? `Perfetto${nome ? " " + nome : ""}, ordine confermato ✅\nE' tutto pronto per l'orario che hai scelto.`
        : `Ordine annullato ❌\nSe vuoi, puoi rifarlo quando preferisci dal nostro menu.`,
    );
    if (msgId) {
      await dbUpdate("whatsapp_messaggi", `message_id=eq.${encodeURIComponent(msgId)}`, {
        intent: esito.esito === "confermato" ? "ordine_confermato" : "ordine_annullato",
        letto: true,
      });
    }
    return true;
  } catch (e) {
    console.error("rispostaOrdine:", String(e));
    return false;
  }
}

// ---------- UTILITA' DATE/ORE ----------
function nowRome(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }),
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDataIT(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseData(input: string): string | null {
  const t = input.trim().toLowerCase();
  const oggi = nowRome();
  if (t === "oggi" || t === "stasera" || t === "stanotte") return toISODate(oggi);
  if (t === "domani") {
    const d = new Date(oggi); d.setDate(d.getDate() + 1); return toISODate(d);
  }
  if (t === "dopodomani") {
    const d = new Date(oggi); d.setDate(d.getDate() + 2); return toISODate(d);
  }
  const m = t.match(/^(\d{1,2})[\/\-\. ](\d{1,2})(?:[\/\-\. ](\d{2,4}))?$/);
  if (!m) return null;
  const giorno = parseInt(m[1], 10);
  const mese = parseInt(m[2], 10);
  let anno = m[3] ? parseInt(m[3], 10) : oggi.getFullYear();
  if (anno < 100) anno += 2000;
  if (giorno < 1 || giorno > 31 || mese < 1 || mese > 12) return null;
  const data = new Date(anno, mese - 1, giorno);
  if (!m[3] && data < new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())) {
    data.setFullYear(anno + 1);
  }
  return toISODate(data);
}

// v23: orari scritti come li scrive la gente
const NUM_ORE: Record<string, number> = {
  una: 1, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, mezzogiorno: 12,
};

function parseOra(input: string): string | null {
  let t = " " + norm(input).replace(/[’'`]/g, " ").replace(/[^a-z0-9:.,]+/g, " ").trim() + " ";
  // relativi: subito, adesso, tra mezz'ora, tra un'ora, tra 20 minuti (arrotondati al quarto d'ora)
  let rel: number | null = null;
  if (/\b(subito|adesso|il prima possibile|appena possibile)\b/.test(t)) rel = 15;
  else if (/\b(tra|fra)\s+mezz\s*ora\b/.test(t)) rel = 30;
  else if (/\b(tra|fra)\s+(un|1)\s+ora\b/.test(t)) rel = 60;
  else {
    const r = t.match(/\b(?:tra|fra)\s+(\d{1,3})\s*min/);
    if (r) rel = parseInt(r[1], 10);
  }
  if (rel !== null) {
    const d = new Date(nowRome().getTime() + rel * 60000);
    const q = Math.ceil(d.getMinutes() / 15) * 15;
    d.setMinutes(0);
    d.setMinutes(q);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const mattina = /\b(mattina|mattino)\b/.test(t);
  t = t.replace(/\b(una|uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|mezzogiorno)\b/g, (w) => String(NUM_ORE[w]));
  t = t.replace(/\be\s+mezz[ao]\b/g, ":30").replace(/\be\s+(un|1)\s+quarto\b/g, ":15").replace(/\be\s+3\s+quarti\b/g, ":45");
  let meno = false;
  if (/\bmeno\s+(un|1)\s+quarto\b/.test(t)) {
    meno = true;
    t = t.replace(/\bmeno\s+(un|1)\s+quarto\b/, "");
  }
  let m = t.match(/(?:^|[^\d])(\d{1,2})\s*(?:[:.,h]|e)\s*(\d{2})(?!\d)/);
  if (!m) m = t.match(/(?:^|[^\d])(\d{1,2})\s+(00|15|30|45)(?!\d)/);
  if (!m) m = t.match(/(?:^|[^\d])(\d{1,2})(?!\d)/);
  if (!m) return null;
  let ore = parseInt(m[1], 10);
  let minuti = m[2] ? parseInt(m[2], 10) : 0;
  if (meno) { ore -= 1; minuti = 45; }
  if (ore < 0 || ore > 23 || minuti > 59) return null;
  // al ristorante "alle 8" e' sera e "all'una" e' pranzo
  if (!mattina && ore >= 1 && ore <= 11) ore += 12;
  return `${pad(ore)}:${pad(minuti)}`;
}

// v23: persone anche a parole
const NUM_PERS: Record<string, number> = {
  uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12,
  tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20,
};

function parsePersone(input: string): number | null {
  const t = norm(input);
  const nums: number[] = [];
  for (const w of t.split(/[^a-z0-9]+/)) {
    if (/^\d{1,3}$/.test(w)) nums.push(parseInt(w, 10));
    else if (NUM_PERS[w]) nums.push(NUM_PERS[w]);
  }
  if (nums.length > 1 && /adult|bambin|ragazz|piccol/.test(t)) return nums.reduce((a, b) => a + b, 0);
  if (nums.length) return nums[0];
  if (/\bcoppia\b|\bin due\b/.test(t)) return 2;
  if (/\b(da solo|da sola|solo io|sono solo|sono sola)\b/.test(t)) return 1;
  return null;
}

// v23: esempio d'orario adatto al momento della giornata
function esempioOra(): string {
  return nowRome().getHours() < 15 ? "13:00" : "20:30";
}

function minutiDaAdesso(ora: string): number {
  const n = nowRome();
  const [h, m] = ora.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m - (n.getHours() * 60 + n.getMinutes());
}

function isSi(t: string): boolean {
  return ["si", "sì", "s", "yes", "certo", "ok"].includes(t.trim().toLowerCase());
}
function isNo(t: string): boolean {
  return ["no", "n", "nessuna", "nessuno", "niente"].includes(t.trim().toLowerCase());
}

// ---------- v10/v11/v12: PROVENIENZA E MENU BUSINESS ----------
const GN = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

function norm(s: string): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ---------- v23: AVVISI ALLO STAFF, USCITE, LEAD PERSI ----------
const USCITA = /\b(non (mi |ci )?serve( piu)?|lascia(mo)? (stare|perdere)|(ho|abbiamo) risolto|non importa( piu)?|(ho|abbiamo) (gia )?prenotato|(ho|abbiamo) (gia )?(chiamato|telefonato)|grazie lo stesso|non fa niente|cambio di programma|(ho|abbiamo) cambiato idea|non (veniamo|vengo) piu|annullo)\b/;
const USCITA_SECCA = /^(no grazie|niente grazie|nulla grazie)$/;
const STEP_CON_USCITA = ["data", "turno", "ora", "coperti", "nome_cognome"];

function eUscita(testo: string): boolean {
  const t = norm(testo).replace(/[^a-z0-9]+/g, " ").trim();
  return !!t && (USCITA.test(t) || USCITA_SECCA.test(t));
}

const telefoniSede = new Map<string, string>();
async function telefonoSede(conn: any): Promise<string> {
  if (!conn.sede_id) return "";
  if (telefoniSede.has(conn.sede_id)) return telefoniSede.get(conn.sede_id)!;
  const r = await dbSelect("sedi", `id=eq.${conn.sede_id}&select=telefono&limit=1`);
  const tel = String(r[0]?.telefono ?? "").trim();
  telefoniSede.set(conn.sede_id, tel);
  return tel;
}

// notifica in app (e push sul telefono, via trigger su notifiche) a chi gestisce le prenotazioni
async function avvisaStaff(conn: any, chiave: string, titolo: string, messaggio: string, msgId: string | null): Promise<void> {
  try {
    if (msgId) {
      await dbUpdate("whatsapp_messaggi", `message_id=eq.${encodeURIComponent(msgId)}`, { letto: false, intent: "prenotazione_urgente" });
    }
    const rif = `wa:${chiave}`;
    const da = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const gia = await dbSelect(
      "notifiche",
      `azienda_id=eq.${conn.azienda_id}&riferimento_tipo=eq.${encodeURIComponent(rif)}&created_at=gte.${encodeURIComponent(da)}&select=id&limit=1`,
    );
    if (gia.length) return;
    const cfg = (await dbSelect("avvisi_config", `azienda_id=eq.${conn.azienda_id}&select=*&limit=1`))[0];
    if (cfg && cfg.prenotazioni_attivo === false) return;
    const ruoli: string[] = cfg?.ruoli_prenotazioni?.length ? cfg.ruoli_prenotazioni : ["admin", "manager", "manager_sala"];
    const utenti = await dbSelect(
      "utenti_aziende",
      `azienda_id=eq.${conn.azienda_id}&attivo=eq.true&ruolo=in.(${ruoli.map(encodeURIComponent).join(",")})&select=user_id`,
    );
    const ids = [...new Set(utenti.map((u) => u.user_id).filter(Boolean))];
    if (ids.length) {
      await dbInsert("notifiche", ids.map((uid) => ({
        azienda_id: conn.azienda_id,
        user_id: uid,
        sede_id: conn.sede_id ?? null,
        tipo: "prenotazione",
        titolo,
        messaggio,
        riferimento_tipo: rif,
        priorita: "alta",
        letto: false,
      })));
    }
    if (ADMIN_WA_NUMBER) {
      await sendText(conn.meta_phone_number_id, conn.meta_access_token || WHATSAPP_TOKEN, ADMIN_WA_NUMBER, `${titolo}\n${messaggio}`);
    }
  } catch (e) {
    console.error("avvisaStaff:", String(e));
  }
}

// ---------- v17/v20: QUANDO IL BOT STA ZITTO ----------
const CORTESIA = /^(ok|okay|okk+|va bene|perfetto|grazie|grazie mille|mille grazie|grazie a voi|ok grazie|ok grazie mille|perfetto grazie|benissimo|ottimo|ciao|buongiorno|buonasera|buona serata|buona giornata|a presto|certo|d accordo|daccordo|ricevuto|si grazie|gentilissimi|gentilissimo|gentilissima)$/;

// true = il bot non risponde: il messaggio resta da leggere per lo staff
async function botZitto(conn: any, from: string, testo: string, msgId: string | null): Promise<boolean> {
  try {
    const t = norm(testo).replace(/[^a-z0-9]+/g, " ").trim();
    let zitto = !!t && CORTESIA.test(t);
    const da = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const n9 = String(from).replace(/\D/g, "").slice(-9);
    if (!zitto) {
      const umani = await dbSelect(
        "whatsapp_messaggi_log",
        `azienda_id=eq.${conn.azienda_id}&numero_dest=like.*${n9}&created_at=gte.${encodeURIComponent(da)}` +
          `&contesto=in.(manuale,tony,risposta_manuale,inbox)&stato=neq.errore&select=id&limit=1`,
      );
      zitto = umani.length > 0;
    }
    if (!zitto) {
      const inbox = await dbSelect(
        "whatsapp_messaggi",
        `azienda_id=eq.${conn.azienda_id}&numero_cliente=like.*${n9}&intent=eq.risposta_manuale` +
          `&created_at=gte.${encodeURIComponent(da)}&select=id&limit=1`,
      );
      zitto = inbox.length > 0;
    }
    if (!zitto) {
      const oggi = toISODate(nowRome());
      const pren = await dbSelect(
        "prenotazioni_tavoli",
        `azienda_id=eq.${conn.azienda_id}&cliente_telefono=like.*${n9}&data=gte.${oggi}` +
          `&stato=not.in.(annullata,rifiutata,cancellata,no_show)` +
          `&or=(stato_pagamento.is.null,stato_pagamento.neq.scaduto)&select=id&limit=1`,
      );
      zitto = pren.length > 0;
    }
    if (!zitto) return false;
    await dbDelete("wa_sessioni_prenota", `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}`);
    if (msgId) await dbUpdate("whatsapp_messaggi", `message_id=eq.${encodeURIComponent(msgId)}`, { letto: false });
    return true;
  } catch (e) {
    console.error("botZitto:", String(e));
    return false;
  }
}

// ---------- v16: FESTE (Capodanno, Natale...) ----------
async function rispondiEvento(conn: any, from: string, testo: string, msgId: string | null): Promise<boolean> {
  try {
    const t = " " + norm(testo).replace(/[^a-z0-9]+/g, " ").trim() + " ";
    if (!t.trim()) return false;
    const sess = await dbSelect(
      "wa_sessioni_prenota",
      `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}&select=step_corrente,updated_at,created_at&order=created_at.desc&limit=1`,
    );
    const s = sess[0];
    if (s && s.step_corrente !== "data" &&
        Date.now() - new Date(s.updated_at ?? s.created_at ?? 0).getTime() < 2 * 60 * 60 * 1000) return false;
    const oggi = toISODate(nowRome());
    const eventi = await dbSelect("wa_eventi_info", `azienda_id=eq.${conn.azienda_id}&attivo=eq.true&select=*`);
    const ev = eventi.find((e) =>
      (!e.valido_fino || String(e.valido_fino) >= oggi) &&
      (e.parole || []).some((p: string) => t.includes(" " + norm(p).replace(/[^a-z0-9]+/g, " ").trim())),
    );
    if (!ev) return false;
    const intent = "evento: " + ev.nome;
    const da = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const gia = await dbSelect(
      "whatsapp_messaggi",
      `azienda_id=eq.${conn.azienda_id}&from_numero=eq.${from}&intent=eq.${encodeURIComponent(intent)}&risposta_inviata=eq.true&created_at=gte.${encodeURIComponent(da)}&select=id&limit=1`,
    );
    await dbDelete("wa_sessioni_prenota", `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}`);
    if (!gia.length) {
      await sendText(conn.meta_phone_number_id, conn.meta_access_token || WHATSAPP_TOKEN, from, ev.messaggio);
    }
    if (msgId) await dbUpdate("whatsapp_messaggi", `message_id=eq.${encodeURIComponent(msgId)}`, { letto: false, intent });
    return true;
  } catch (e) {
    console.error("rispondiEvento:", String(e));
    return false;
  }
}

function estraiCodice(testo: string): string | null {
  const m = testo.match(/rif\.?\s*:?\s*([A-Za-z0-9]{3,12})/i);
  return m ? m[1].toUpperCase() : null;
}

async function trovaCodice(conn: any, testo: string): Promise<any | null> {
  const cod = estraiCodice(testo);
  if (cod) {
    const r = await dbSelect(
      "whatsapp_codici",
      `azienda_id=eq.${conn.azienda_id}&codice=ilike.${encodeURIComponent(cod)}&attivo=eq.true&select=*&limit=1`,
    );
    if (r[0]) return r[0];
  }
  const t = norm(testo);
  if (!t) return null;
  const tutti = await dbSelect(
    "whatsapp_codici",
    `azienda_id=eq.${conn.azienda_id}&attivo=eq.true&frase=not.is.null&select=*`,
  );
  return tutti
    .filter((c) => c.frase && t.includes(norm(c.frase)))
    .sort((a, b) => String(b.frase).length - String(a.frase).length)[0] ?? null;
}

async function leggiCfgSlot(aziendaId: string): Promise<any | null> {
  const r = await dbSelect("prenotazioni_slot_config", `azienda_id=eq.${aziendaId}&select=*&limit=1`);
  return r[0] ?? null;
}

async function occupatiGiorno(aziendaId: string, sedeId: string | null, data: string): Promise<any[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/slot_occupati`, {
      method: "POST",
      headers: dbHeaders,
      body: JSON.stringify({ p_azienda: aziendaId, p_data: data, p_sede: sedeId }),
    });
    if (!r.ok) return [];
    const a = await r.json();
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function plus(s: string, min: number): string {
  const p = s.split(":");
  const m = parseInt(p[0], 10) * 60 + parseInt(p[1], 10) + min;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

function orariTurno(cfg: any, turno: string): string[] {
  const base: string[] = cfg?.orari ?? ["12:00", "12:30", "13:00", "13:30", "14:00", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];
  return turno === "cena"
    ? base.filter((s) => s >= "19:00" && s <= "21:30")
    : base.filter((s) => s >= "12:00" && s <= "14:00");
}

async function slotLiberi(conn: any, data: string, persone: number, turno: string): Promise<string[]> {
  const cfg = await leggiCfgSlot(conn.azienda_id);
  const occ = await occupatiGiorno(conn.azienda_id, conn.sede_id ?? null, data);
  const min = cfg?.slot_minuti ?? 30;
  const max = cfg?.max_coperti_slot ?? 30;
  const n = nowRome();
  const oggi = toISODate(n);
  const lim = plus(`${pad(n.getHours())}:${pad(n.getMinutes())}`, 30);
  return orariTurno(cfg, turno).filter((s) => {
    const f = plus(s, min);
    const presi = occ
      .filter((p) => { const o = String(p.ora).slice(0, 5); return o >= s && o < f; })
      .reduce((t, p) => t + (Number(p.coperti) || 0), 0);
    return (max - presi) >= persone && !(data === oggi && s < lim);
  });
}

async function giornoChiuso(conn: any, iso: string): Promise<boolean> {
  try {
    const sedeQ = conn.sede_id ? `&or=(sede_id.is.null,sede_id.eq.${conn.sede_id})` : "";
    const r = await dbSelect(
      "sede_chiusure",
      `azienda_id=eq.${conn.azienda_id}&attivo=eq.true&data=eq.${iso}${sedeQ}&select=id&limit=1`,
    );
    if (r.length) return true;
    const cfg = await leggiCfgSlot(conn.azienda_id);
    const w = new Date(iso + "T12:00:00").getDay();
    const t = cfg?.turni_per_giorno?.[String(w)];
    return Array.isArray(t) && t.length === 0;
  } catch {
    return false;
  }
}

async function erroreGiornoMenu(conn: any, iso: string): Promise<string | null> {
  const cfg = await leggiCfgSlot(conn.azienda_id);
  const w = new Date(iso + "T12:00:00").getDay();
  const att: string[] = cfg?.giorni_attivi ?? [];
  const chi: string[] = cfg?.giorni_chiusura ?? [];
  if (w < 1 || w > 5) return "Il menu business è dal *lunedì al venerdì*.";
  if ((att.length && !att.includes(GN[w])) || chi.includes(GN[w])) return "Quel giorno siamo chiusi.";
  if (await giornoChiuso(conn, iso)) return "Quel giorno siamo chiusi.";
  const n = nowRome();
  const oggi = toISODate(n);
  if (iso < oggi) return "Quella data è già passata.";
  return null;
}

async function trovaDoppione(conn: any, from: string, d: Record<string, any>): Promise<any | null> {
  const cifre = (s: unknown) => String(s ?? "").replace(/\D/g, "");
  const ultime = (s: unknown) => cifre(s).slice(-9);
  const pulisci = (s: unknown) => norm(String(s ?? "")).replace(/\s+/g, " ").trim();
  const da = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const sedeQ = conn.sede_id ? `&sede_id=eq.${conn.sede_id}` : "";
  const r = await dbSelect(
    "prenotazioni_tavoli",
    `azienda_id=eq.${conn.azienda_id}${sedeQ}&data=eq.${d.data_prenotazione}&coperti=eq.${d.num_persone}` +
      `&stato=not.in.(rifiutata,no_show)&created_at=gte.${encodeURIComponent(da)}` +
      `&select=id,ora,cliente_nome,cliente_telefono,stato&limit=30`,
  );
  const nome = pulisci(d.nome_completo);
  return r.find((p) =>
    String(p.ora).slice(0, 5) === d.ora_prenotazione &&
    ((ultime(p.cliente_telefono) !== "" && ultime(p.cliente_telefono) === ultime(from)) || (nome !== "" && pulisci(p.cliente_nome) === nome)),
  ) ?? null;
}

// ---------- FLUSSO RISTORANTE ----------
interface Sessione {
  id: string;
  numero_telefono: string;
  azienda_id: string;
  step_corrente: string;
  dati_raccolti: Record<string, any>;
  updated_at?: string;
  created_at?: string;
}

interface Ctx {
  msgId: string | null;
  nome: string | null;
}

const MSG_BENVENUTO =
  "Ciao! 👋 Sono l'assistente prenotazioni.\n\nPer quale *data* vuoi prenotare?\n(es. _oggi_, _domani_, oppure _15/07_)";

const MSG_MENU =
  "Ciao! 👋 *Menu business 25 €*: antipasto, primo, secondo, acqua e caffè, a pranzo (12:00–14:30) e a cena (19:00–22:00), da lunedì a venerdì.\n\nPer quale *giorno* vuoi prenotare?\n(es. _domani_, oppure _28/10_)";

const BTN_TURNO = [
  { id: "pranzo", title: "☀️ Pranzo" },
  { id: "cena", title: "🌙 Cena" },
];

// ---------- v25: BOT AI DEL CENTRALINO ----------
const CENTRALINO_KEY = Deno.env.get("CENTRALINO_KEY") ?? "";
const botAiCache = new Map<string, { on: boolean; t: number }>();
async function botAiAttivo(conn: any): Promise<boolean> {
  if (!conn.sede_id || !CENTRALINO_KEY) return false;
  const k = conn.azienda_id + "|" + conn.sede_id;
  const c = botAiCache.get(k);
  if (c && Date.now() - c.t < 60_000) return c.on;
  const r = await dbSelect("centralino_config", `azienda_id=eq.${conn.azienda_id}&sede_id=eq.${conn.sede_id}&bot_wa_ai=eq.true&select=id&limit=1`);
  const on = r.length > 0;
  botAiCache.set(k, { on, t: Date.now() });
  return on;
}
// true = messaggio gestito dal bot AI (risposta gia' mandata)
async function botAi(conn: any, from: string, testo: string, ctx: Ctx, campagna: any = null): Promise<boolean> {
  try {
    if (!testo.trim()) return false;
    const r = await fetch(`${SUPABASE_URL}/functions/v1/centralino-bot`, {
      method: "POST",
      headers: { "x-centralino-key": CENTRALINO_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ azienda_id: conn.azienda_id, sede_id: conn.sede_id, telefono: from, testo, nome: ctx.nome, campagna }),
    });
    const d = await r.json().catch(() => ({}));
    if (!d?.gestito || !d.risposta) return false;
    await sendText(conn.meta_phone_number_id, conn.meta_access_token || WHATSAPP_TOKEN, from, String(d.risposta));
    if (d.passa_a_persona) {
      const chi = `${ctx.nome ? ctx.nome + " " : ""}(+${String(from).replace(/\D/g, "")})`;
      await avvisaStaff(conn, `persona:${from}`, "💬 Un cliente chiede una persona su WhatsApp", `${chi}: ${d.passa_a_persona}`, ctx.msgId);
    }
    return true;
  } catch (e) {
    console.error("botAi:", String(e));
    return false;
  }
}

async function gestisciFlussoRistorante(
  conn: any,
  from: string,
  testo: string,
  referral: any = null,
  ctx: Ctx = { msgId: null, nome: null },
): Promise<void> {
  const token = conn.meta_access_token || WHATSAPP_TOKEN;
  const reply = (msg: string) => sendText(conn.meta_phone_number_id, token, from, msg);

  // v26: con il bot AI acceso risponde solo lui; il vecchio bot a domande resta per chi non l'ha acceso
  if (await botAiAttivo(conn)) {
    await dbDelete("wa_sessioni_prenota", `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}`);
    const cod = testo.trim() ? await trovaCodice(conn, testo) : null;
    const campagna = cod
      ? { codice: cod.codice, flusso: cod.flusso ?? null, fonte: cod.fonte ?? null, nota: cod.nota ?? null }
      : referral
        ? { fonte: "meta_ads", ads: { annuncio: referral.headline ?? null, url: referral.source_url ?? null, id: referral.source_id ?? null } }
        : null;
    if (await botAi(conn, from, testo.trim() || "Vorrei prenotare un tavolo", ctx, campagna)) return;
    // l'AI non ha risposto (problema tecnico): una frase sola, poi risponde una persona
    await reply("Grazie per il messaggio! 🙏 Ti rispondiamo a breve.");
    const chiAi = `${ctx.nome ? ctx.nome + " " : ""}(+${String(from).replace(/\D/g, "")})`;
    await avvisaStaff(conn, `ai_ko:${from}`, "💬 Messaggio WhatsApp da gestire a mano", `${chiAi}: il bot AI non ha potuto rispondere. Rispondi dalla Inbox.`, ctx.msgId);
    return;
  }

  const t = testo.trim();
  const tLower = t.toLowerCase();
  const chi = `${ctx.nome ? ctx.nome + " " : ""}(+${String(from).replace(/\D/g, "")})`;

  if (["annulla", "ricomincia", "reset", "stop"].includes(tLower)) {
    await dbDelete(
      "wa_sessioni_prenota",
      `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}`,
    );
    await reply("Prenotazione annullata. ❌\nScrivimi quando vuoi per ricominciare!");
    return;
  }

  const sessioni = await dbSelect(
    "wa_sessioni_prenota",
    `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}&select=*&order=created_at.desc&limit=1`,
  );
  let sess: Sessione | null = sessioni[0] ?? null;

  if (sess) {
    const updated = new Date(sess.updated_at ?? sess.created_at ?? 0).getTime();
    if (Date.now() - updated > 2 * 60 * 60 * 1000) {
      await dbDelete("wa_sessioni_prenota", `id=eq.${sess.id}`);
      sess = null;
    }
  }

  const codNuovo = await trovaCodice(conn, t);
  if (sess && codNuovo && sess.dati_raccolti?.codice !== codNuovo.codice) {
    await dbDelete("wa_sessioni_prenota", `id=eq.${sess.id}`);
    sess = null;
  }

  if (!sess) {
    const cod = codNuovo;
    const iniz: Record<string, any> = cod
      ? { codice: cod.codice, flusso: cod.flusso, fonte: cod.fonte, nota: cod.nota ?? null }
      : referral
        ? { fonte: "meta_ads", ads: { annuncio: referral.headline ?? null, url: referral.source_url ?? null, id: referral.source_id ?? null } }
        : {};
    await dbInsert("wa_sessioni_prenota", {
      numero_telefono: from,
      azienda_id: conn.azienda_id,
      step_corrente: "data",
      dati_raccolti: iniz,
    });
    await reply(cod?.flusso === "menu_business" ? MSG_MENU : MSG_BENVENUTO);
    return;
  }

  const dati = sess.dati_raccolti ?? {};
  const biz = dati.flusso === "menu_business";
  const salva = (step: string, nuoviDati: Record<string, any>) =>
    dbUpdate(`wa_sessioni_prenota`, `id=eq.${sess!.id}`, {
      step_corrente: step,
      dati_raccolti: { ...dati, ...nuoviDati },
      updated_at: new Date().toISOString(),
    });

  // v23: il cliente rinuncia -> si chiude con garbo, niente domande insistenti
  if (STEP_CON_USCITA.includes(sess.step_corrente) && eUscita(t)) {
    await dbDelete("wa_sessioni_prenota", `id=eq.${sess.id}`);
    await dbInsert("wa_lead_persi", {
      azienda_id: conn.azienda_id,
      sede_id: conn.sede_id ?? null,
      numero: from,
      nome: ctx.nome,
      step: sess.step_corrente,
      dati,
      motivo: t.slice(0, 300),
      urgente: !!dati.urgente,
    });
    if (ctx.msgId) {
      await dbUpdate("whatsapp_messaggi", `message_id=eq.${encodeURIComponent(ctx.msgId)}`, { letto: false, intent: "lead_perso" });
    }
    const tel = await telefonoSede(conn);
    await reply(
      "Nessun problema 👍 Ho chiuso la richiesta.\n" +
        (tel ? `Quando ti serve un tavolo scrivici pure, oppure chiamaci al ${tel}.` : "Quando ti serve un tavolo scrivici pure."),
    );
    return;
  }

  switch (sess.step_corrente) {
    case "data": {
      const data = parseData(t);
      if (!data) {
        await reply("Non ho capito la data 😅\nScrivila cosi': _oggi_, _domani_ oppure _15/07_");
        return;
      }
      if (biz) {
        const err = await erroreGiornoMenu(conn, data);
        if (err) {
          await reply(err + "\nScegli un altro giorno (es. _domani_ oppure _28/10_)");
          return;
        }
        const pr = await slotLiberi(conn, data, 1, "pranzo");
        const ce = await slotLiberi(conn, data, 1, "cena");
        if (!pr.length && !ce.length) {
          await reply("Quel giorno siamo al completo 😕\nScegli un altro giorno.");
          return;
        }
        await salva("turno", { data_prenotazione: data });
        await sendButtons(conn.meta_phone_number_id, token, from, `Perfetto, ${formatDataIT(data)} 📅\n\nPranzo o cena?`, BTN_TURNO);
        return;
      }
      if (await giornoChiuso(conn, data)) {
        await reply("Quel giorno siamo chiusi 😕\nScegli un altro giorno (es. _domani_ oppure _15/07_)");
        return;
      }
      const perOggi = data === toISODate(nowRome());
      await salva("ora", { data_prenotazione: data, ...(perOggi ? { urgente: true } : {}) });
      if (perOggi) {
        // v23: chi vuole un tavolo per oggi non deve aspettare il bot
        await avvisaStaff(
          conn,
          `oggi:${from}:${data}`,
          "📲 Tavolo per OGGI da WhatsApp",
          `${chi} vuole prenotare per oggi. Il bot gli sta chiedendo orario e persone: se puoi, chiamalo tu.`,
          ctx.msgId,
        );
        await reply(`Perfetto, oggi ${formatDataIT(data)} 📅\n\nA che *ora*? (es. _${esempioOra()}_)`);
        return;
      }
      await reply(`Perfetto, ${formatDataIT(data)} 📅\n\nA che *ora*? (es. _${esempioOra()}_)`);
      return;
    }
    case "turno": {
      const turno = (tLower.includes("pranzo") || t === "1") ? "pranzo" : (tLower.includes("cena") || t === "2") ? "cena" : null;
      if (!turno) {
        await sendButtons(conn.meta_phone_number_id, token, from, "Pranzo o cena?", BTN_TURNO);
        return;
      }
      const lib = await slotLiberi(conn, dati.data_prenotazione, 1, turno);
      if (!lib.length) {
        await sendButtons(
          conn.meta_phone_number_id, token, from,
          `A ${turno} quel giorno siamo al completo 😕\nProva l'altro turno, oppure scrivi _annulla_ e scegli un altro giorno.`,
          BTN_TURNO,
        );
        return;
      }
      await salva("ora", { turno });
      await reply(
        `Ottimo! ${turno === "cena" ? "🌙" : "☀️"}\n\nOrari disponibili: ${lib.join(", ")}\nScrivi quello che preferisci (es. _${lib[0]}_)`,
      );
      return;
    }
    case "ora": {
      const ora = parseOra(t);
      if (!ora) {
        await reply(`Non ho capito l'orario 😅\nScrivimi solo l'ora, ad esempio _${esempioOra()}_`);
        return;
      }
      const perOggi = dati.data_prenotazione === toISODate(nowRome());
      const mancano = perOggi ? minutiDaAdesso(ora) : 9999;
      if (perOggi && mancano < -10) {
        await reply(`Le ${ora} di oggi sono già passate 😅\nA che ora vuoi venire?`);
        return;
      }
      if (biz) {
        const lib = await slotLiberi(conn, dati.data_prenotazione, dati.num_persone ?? 1, dati.turno);
        if (!lib.includes(ora)) {
          await reply(
            `A quell'ora non c'è posto 😕\nOrari disponibili: ${lib.join(", ") || "nessuno"}` +
              (lib.length ? `\nScrivi uno di questi (es. _${lib[0]}_)` : "\nScrivi _annulla_ e riprova con un altro giorno."),
          );
          return;
        }
        if (dati.num_persone) {
          await salva("nome_cognome", { ora_prenotazione: ora });
          await reply("Ottimo! ⏰\n\nA nome di chi? (*nome e cognome*)");
          return;
        }
      }
      const urgente = perOggi && mancano <= 150;
      await salva("coperti", { ora_prenotazione: ora, ...(urgente ? { urgente: true } : {}) });
      if (urgente) {
        // v23: mancano meno di 2 ore e mezza -> la sala lo sa subito, con l'orario
        await avvisaStaff(
          conn,
          `ora:${from}:${dati.data_prenotazione}:${ora}`,
          `⚡ Tavolo OGGI alle ${ora} da WhatsApp`,
          `${chi} vuole un tavolo oggi alle ${ora} (tra ${Math.max(mancano, 0)} minuti). Il bot gli sta chiedendo quante persone: chiamalo per chiudere subito.`,
          ctx.msgId,
        );
        const tel = await telefonoSede(conn);
        await reply(
          `Ottimo, oggi alle ${ora}! ⏰ Ho già avvisato la sala.\n\nIn *quante persone* siete?` +
            (tel ? `\n\n_Se fai prima, chiamaci al ${tel}_` : ""),
        );
        return;
      }
      await reply("Ottimo! ⏰\n\nIn *quante persone* siete?");
      return;
    }
    case "coperti": {
      const n = parsePersone(t);
      if (!n || n < 1 || n > 200) {
        await reply("In quante persone siete? Scrivimi solo il numero (es. _4_) 🙏");
        return;
      }
      if (biz) {
        const lib = await slotLiberi(conn, dati.data_prenotazione, n, dati.turno);
        if (!lib.includes(dati.ora_prenotazione)) {
          await salva("ora", { num_persone: n });
          await reply(
            `Per ${n} persone alle ${dati.ora_prenotazione} non c'è posto 😕\nOrari con posto: ${lib.join(", ") || "nessuno"}` +
              (lib.length ? `\nScrivi un altro orario (es. _${lib[0]}_)` : "\nScrivi _annulla_ e riprova con un altro giorno."),
          );
          return;
        }
      }
      await salva("nome_cognome", { num_persone: n });
      await reply("Perfetto! 👥\n\nA nome di chi? (*nome e cognome*)");
      return;
    }
    case "nome_cognome": {
      if (t.length < 2) {
        await reply("Scrivimi nome e cognome 🙏");
        return;
      }
      const parti = t.split(/\s+/);
      const nome = parti[0];
      const cognome = parti.slice(1).join(" ") || "";
      await salva("richieste", { nome, cognome, nome_completo: t });
      await reply(
        "Grazie! ✅\n\nCi sono *intolleranze, allergie, bambini* o altre richieste?\nScrivi pure tutto insieme, oppure _no_",
      );
      return;
    }
    case "richieste": {
      const note = isNo(tLower) ? null : t;
      const d = { ...dati, note };

      const riepilogo =
        `📋 *Riepilogo prenotazione*\n\n` +
        (d.nota ? `🍽️ ${d.nota}\n` : "") +
        (d.turno ? `🕒 ${d.turno === "cena" ? "Cena" : "Pranzo"}\n` : "") +
        `📅 Data: ${formatDataIT(d.data_prenotazione)}\n` +
        `⏰ Ora: ${d.ora_prenotazione}\n` +
        `👥 Persone: ${d.num_persone}\n` +
        `👤 ${d.nome_completo}\n` +
        (note ? `📝 ${note}\n` : "") +
        `\nConfermi?`;

      await salva("conferma", { note });
      await sendButtons(conn.meta_phone_number_id, token, from, riepilogo, [
        { id: "confirm", title: "✅ Conferma" },
        { id: "cancel", title: "❌ Annulla" },
      ]);
      return;
    }
    case "conferma": {
      const confermato = t === "1" || tLower === "confirm" || tLower.includes("conferma") || isSi(tLower);
      const annullato = t === "2" || tLower === "cancel" || tLower.includes("annulla") || isNo(tLower);

      if (confermato) {
        const gia = await trovaDoppione(conn, from, dati);
        if (gia) {
          await dbUpdate("prenotazioni_tavoli", `id=eq.${gia.id}`, { cliente_telefono: `+${String(from).replace(/\D/g, "")}` });
          await dbDelete("wa_sessioni_prenota", `id=eq.${sess.id}`);
          await reply(
            `✅ *Hai già una prenotazione registrata!*\n\n` +
            (dati.nota ? `🍽️ ${dati.nota}\n` : "") +
            `${formatDataIT(dati.data_prenotazione)} alle ${dati.ora_prenotazione} per ${dati.num_persone} persone.\n\n` +
            `Non serve altro: è tutto a posto. A presto, ${dati.nome}! 🍽️`,
          );
          return;
        }

        const pren = await dbInsert("prenotazioni_tavoli", {
          azienda_id: conn.azienda_id,
          sede_id: conn.sede_id ?? null,
          cliente_nome: dati.nome_completo,
          cognome: dati.cognome || null,
          cliente_telefono: from,
          data: dati.data_prenotazione,
          ora: dati.ora_prenotazione,
          coperti: dati.num_persone,
          note: [dati.nota, dati.turno, dati.note].filter(Boolean).join(" · ") || null,
          stato: "in_attesa",
          canale: "whatsapp",
          source: dati.fonte || "whatsapp",
          riferimento: JSON.stringify({ via: "whatsapp", codice: dati.codice ?? null, flusso: dati.flusso ?? null, ads: dati.ads ?? null }),
        });
        await dbDelete("wa_sessioni_prenota", `id=eq.${sess.id}`);

        if (pren) {
          await reply(
            `✅ *Prenotazione ricevuta!*\n\n` +
            (dati.nota ? `🍽️ ${dati.nota}\n` : "") +
            `${formatDataIT(dati.data_prenotazione)} alle ${dati.ora_prenotazione} per ${dati.num_persone} persone.\n\n` +
            `Riceverai conferma a breve. A presto, ${dati.nome}! 🍽️`,
          );
          if (ADMIN_WA_NUMBER) {
            await sendText(
              conn.meta_phone_number_id,
              conn.meta_access_token || WHATSAPP_TOKEN,
              ADMIN_WA_NUMBER,
              `🔔 Nuova prenotazione WA${dati.codice ? ` (${dati.codice})` : ""}:\n${dati.nome_completo} — ${formatDataIT(dati.data_prenotazione)} ${dati.ora_prenotazione} x${dati.num_persone}\nTel: ${from}${dati.note ? `\n${dati.note}` : ""}`,
            );
          }
        } else {
          await reply(
            "⚠️ C'è stato un problema tecnico nel salvare la prenotazione.\nChiamaci direttamente e la sistemiamo subito!",
          );
        }
        return;
      }
      if (annullato) {
        await dbDelete("wa_sessioni_prenota", `id=eq.${sess.id}`);
        await reply("Prenotazione annullata. ❌\nScrivimi quando vuoi per ricominciare!");
        return;
      }
      await sendButtons(conn.meta_phone_number_id, token, from, "Confermi la prenotazione?", [
        { id: "confirm", title: "✅ Conferma" },
        { id: "cancel", title: "❌ Annulla" },
      ]);
      return;
    }
    default: {
      await dbDelete("wa_sessioni_prenota", `id=eq.${sess.id}`);
      await reply(MSG_BENVENUTO);
      return;
    }
  }
}

// ---------- FLUSSO HOTEL ----------
async function gestisciFlussoHotel(conn: any, from: string): Promise<void> {
  const token = conn.meta_access_token || WHATSAPP_TOKEN;
  const link = `${HOTEL_BOOKING_BASE}?azienda=${conn.azienda_id}`;
  await sendText(
    conn.meta_phone_number_id,
    token,
    from,
    `Ciao! 👋 Benvenuto!\n\nPer prenotare una *camera* usa il nostro sistema di booking online:\n\n🔗 ${link}\n\nTrovi disponibilità in tempo reale, prezzi e conferma immediata. 🏨`,
  );
}

// ---------- HUB (azienda mista ristorante+hotel) ----------
async function gestisciHub(conn: any, from: string, testo: string, referral: any = null, ctx: Ctx = { msgId: null, nome: null }): Promise<void> {
  const token = conn.meta_access_token || WHATSAPP_TOKEN;
  const reply = (msg: string) => sendText(conn.meta_phone_number_id, token, from, msg);
  const t = testo.trim().toLowerCase();

  const sessioni = await dbSelect(
    "wa_sessioni_hub",
    `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}&scade_at=gt.${new Date().toISOString()}&select=*&order=scade_at.desc&limit=1`,
  );
  const hub = sessioni[0] ?? null;

  if (t === "menu" || t === "cambia") {
    if (hub) await dbDelete("wa_sessioni_hub", `id=eq.${hub.id}`);
    await dbDelete(
      "wa_sessioni_prenota",
      `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}`,
    );
    await inviaMenuHub(conn, from);
    return;
  }

  if (!hub) {
    await inviaMenuHub(conn, from);
    return;
  }

  if (!hub.tipo_selezionato) {
    if (t === "1" || t.includes("ristorante") || t.includes("tavolo")) {
      await dbUpdate("wa_sessioni_hub", `id=eq.${hub.id}`, { tipo_selezionato: "ristorante" });
      await gestisciFlussoRistorante(conn, from, "", referral, ctx);
      return;
    }
    if (t === "2" || t.includes("hotel") || t.includes("camera")) {
      await dbUpdate("wa_sessioni_hub", `id=eq.${hub.id}`, { tipo_selezionato: "hotel" });
      await gestisciFlussoHotel(conn, from);
      return;
    }
    await reply("Rispondi *1* per il Ristorante 🍽️ o *2* per l'Hotel 🏨");
    return;
  }

  if (hub.tipo_selezionato === "ristorante") {
    await gestisciFlussoRistorante(conn, from, testo, referral, ctx);
  } else {
    await gestisciFlussoHotel(conn, from);
  }
}

async function inviaMenuHub(conn: any, from: string): Promise<void> {
  const token = conn.meta_access_token || WHATSAPP_TOKEN;
  const scadenza = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  await dbInsert("wa_sessioni_hub", {
    numero_telefono: from,
    azienda_id: conn.azienda_id,
    tipo_selezionato: null,
    scade_at: scadenza,
  });
  await sendText(
    conn.meta_phone_number_id,
    token,
    from,
    `Ciao! 👋 Come possiamo aiutarti?\n\n*1* — 🍽️ Prenotare un tavolo al Ristorante\n*2* — 🏨 Prenotare una camera in Hotel\n\nRispondi con *1* o *2*`,
  );
}

// ---------- HANDLER PRINCIPALE ----------
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    try {
      const payload = await req.json();
      console.log("Webhook payload:", JSON.stringify(payload));

      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      // v26: con il bot AI acceso il vecchio bot a domande NON parte mai (niente due bot diversi): se l'AI non risponde il cliente
//      riceve una sola frase e lo staff un avviso. Codici campagna e annunci Meta passano all'AI, che li mette nella prenotazione.
// v24: SPUNTE — avvisi di Meta sui messaggi inviati (inviato, consegnato, letto, non consegnato)
      if (Array.isArray(value?.statuses) && value.statuses.length) {
        for (const st of value.statuses) {
          try {
            const quando = st.timestamp ? new Date(Number(st.timestamp) * 1000).toISOString() : new Date().toISOString();
            const err0 = Array.isArray(st.errors) && st.errors[0] ? String(st.errors[0].title || st.errors[0].message || "") : null;
            await fetch(SUPABASE_URL + "/rest/v1/rpc/wa_registra_stato", {
              method: "POST",
              headers: dbHeaders,
              body: JSON.stringify({ p_id: st.id ?? null, p_stato: st.status ?? null, p_quando: quando, p_errore: err0 }),
            });
          } catch (e) {
            console.error("stato messaggio:", String(e));
          }
        }
      }

      if (!value?.messages || value.messages.length === 0) {
        return new Response("ok", { status: 200 });
      }

      const msg = value.messages[0];
      const from: string = msg.from;
      const phoneNumberId: string = value.metadata?.phone_number_id ?? "";
      const referral = msg.referral ?? null;

      let testo = "";
      if (msg.type === "text") testo = msg.text?.body ?? "";
      else if (msg.type === "interactive") {
        testo =
          msg.interactive?.button_reply?.title ??
          msg.interactive?.list_reply?.title ?? "";
      } else if (msg.type === "button") {
        testo = msg.button?.text ?? "";
      } else {
        testo = "";
      }

      const connessioni = await dbSelect(
        "whatsapp_connessioni",
        `meta_phone_number_id=eq.${phoneNumberId}&attivo=eq.true&select=*&limit=1`,
      );
      const conn = connessioni[0];
      if (!conn) {
        console.error("Nessuna connessione attiva per phone_number_id:", phoneNumberId);
        return new Response("ok", { status: 200 });
      }
      const contesto = String(conn.contesto ?? "").toLowerCase().trim();

      const nomeProfilo: string | null = value.contacts?.[0]?.profile?.name ?? null;
      const ctx: Ctx = { msgId: msg.id ?? null, nome: nomeProfilo };
      uscite.set(`${phoneNumberId}|${from}`, []);
      const esitoSalvataggio = await salvaRicevuto({
        azienda_id: conn.azienda_id,
        phone_number_id: phoneNumberId,
        from_numero: from,
        from_nome: nomeProfilo,
        message_id: msg.id ?? null,
        tipo: msg.type ?? "text",
        testo: testo || null,
        intent: contesto === "notifiche" ? "notifica" : "prenotazione",
        risposta_inviata: false,
        letto: contesto === "notifiche" ? false : !!testo,
        numero_cliente: from,
      });
      if (esitoSalvataggio === "duplicato") {
        uscite.delete(`${phoneNumberId}|${from}`);
        return new Response("ok", { status: 200 });
      }

      if (MEDIA_TIPI.includes(msg.type)) await scaricaMedia(conn, msg);

      try {
        if (msg.type === "button" || msg.type === "interactive") {
          const scelta = norm(testo).replace(/[^a-z]+/g, " ").trim();
          if (scelta === "confermo" || scelta === "annulla") {
            if (await rispostaOrdine(conn, from, scelta === "confermo", msg.id ?? null)) {
              return new Response("ok", { status: 200 });
            }
          }
        }

        if (contesto === "notifiche") {
          return new Response("ok", { status: 200 });
        }

        if (!testo && msg.type !== "text") {
          return new Response("ok", { status: 200 });
        }

        if (await botZitto(conn, from, testo, msg.id ?? null)) {
          return new Response("ok", { status: 200 });
        }

        if (contesto !== "hotel" && await rispondiEvento(conn, from, testo, msg.id ?? null)) {
          return new Response("ok", { status: 200 });
        }

        if (contesto === "ristorante") {
          await gestisciFlussoRistorante(conn, from, testo, referral, ctx);
          return new Response("ok", { status: 200 });
        }
        if (contesto === "hotel") {
          await gestisciFlussoHotel(conn, from);
          return new Response("ok", { status: 200 });
        }

        const aziende = await dbSelect(
          "aziende",
          `id=eq.${conn.azienda_id}&select=id,tipo_app&limit=1`,
        );
        const tipoApp: string[] = aziende[0]?.tipo_app ?? ["ristorante"];
        const haRistorante = tipoApp.includes("ristorante") || tipoApp.includes("restaurant");
        const haHotel = tipoApp.includes("hotel");

        if (haRistorante && haHotel) {
          await gestisciHub(conn, from, testo, referral, ctx);
        } else if (haHotel) {
          await gestisciFlussoHotel(conn, from);
        } else {
          await gestisciFlussoRistorante(conn, from, testo, referral, ctx);
        }

        return new Response("ok", { status: 200 });
      } finally {
        await chiudiScambio(conn, from, msg.id ?? null, phoneNumberId, nomeProfilo);
      }
    } catch (err) {
      console.error("Errore webhook:", err);
      return new Response("ok", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
