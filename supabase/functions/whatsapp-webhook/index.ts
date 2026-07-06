// ============================================================
// WHATSAPP WEBHOOK v7 — Ristoflow.AI
// Riceve messaggi da Meta WhatsApp Business API e instrada:
//   - solo ristorante  -> flusso prenotazione tavolo
//   - solo hotel       -> link booking.html
//   - entrambi         -> menu hub con sessione 2h (wa_sessioni_hub)
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

async function dbInsert(table: string, row: Record<string, unknown>): Promise<any | null> {
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
  if (!r.ok) {
    console.error("WA SEND error:", r.status, await r.text());
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

// Accetta: "oggi", "domani", "dopodomani", "15/07", "15/07/2026", "15-07", "15 07"
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
  // se la data e' gia' passata e l'anno non era esplicito, assume anno prossimo
  if (!m[3] && data < new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())) {
    data.setFullYear(anno + 1);
  }
  return toISODate(data);
}

// Accetta: "20:30", "20.30", "20 30", "20", "8:30"
function parseOra(input: string): string | null {
  const t = input.trim().toLowerCase().replace(/[.\s]/g, ":");
  const m = t.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return null;
  const ore = parseInt(m[1], 10);
  const minuti = m[2] ? parseInt(m[2], 10) : 0;
  if (ore > 23 || minuti > 59) return null;
  return `${pad(ore)}:${pad(minuti)}`;
}

function isSi(t: string): boolean {
  return ["si", "sì", "s", "yes", "certo", "ok"].includes(t.trim().toLowerCase());
}
function isNo(t: string): boolean {
  return ["no", "n", "nessuna", "nessuno", "niente"].includes(t.trim().toLowerCase());
}

// ---------- FLUSSO RISTORANTE ----------
// Step: data -> ora -> coperti -> nome -> cognome -> intolleranze_check ->
//       intolleranze_dett -> bambini_check -> bambini_dett -> altro -> conferma
interface Sessione {
  id: string;
  numero_telefono: string;
  azienda_id: string;
  step_corrente: string;
  dati_raccolti: Record<string, any>;
}

const MSG_BENVENUTO =
  "Ciao! 👋 Sono l'assistente prenotazioni.\n\nPer quale *data* vuoi prenotare?\n(es. _oggi_, _domani_, oppure _15/07_)";

async function gestisciFlussoRistorante(
  conn: any,
  from: string,
  testo: string,
): Promise<void> {
  const token = conn.meta_access_token || WHATSAPP_TOKEN;
  const reply = (msg: string) => sendText(conn.meta_phone_number_id, token, from, msg);

  const t = testo.trim();
  const tLower = t.toLowerCase();

  // comandi globali
  if (["annulla", "ricomincia", "reset", "stop"].includes(tLower)) {
    await dbDelete(
      "chatbot_sessioni",
      `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}`,
    );
    await reply("Prenotazione annullata. ❌\nScrivimi quando vuoi per ricominciare!");
    return;
  }

  // carica o crea sessione
  const sessioni = await dbSelect(
    "chatbot_sessioni",
    `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}&select=*&order=created_at.desc&limit=1`,
  );
  let sess: Sessione | null = sessioni[0] ?? null;

  // sessione scaduta (>2h) -> ricomincia
  if (sess) {
    const updated = new Date(sess.updated_at ?? sess.created_at ?? 0).getTime();
    if (Date.now() - updated > 2 * 60 * 60 * 1000) {
      await dbDelete("chatbot_sessioni", `id=eq.${sess.id}`);
      sess = null;
    }
  }

  if (!sess) {
    await dbInsert("chatbot_sessioni", {
      numero_telefono: from,
      azienda_id: conn.azienda_id,
      step_corrente: "data",
      dati_raccolti: {},
    });
    await reply(MSG_BENVENUTO);
    return;
  }

  const dati = sess.dati_raccolti ?? {};
  const salva = (step: string, nuoviDati: Record<string, any>) =>
    dbUpdate(`chatbot_sessioni`, `id=eq.${sess!.id}`, {
      step_corrente: step,
      dati_raccolti: { ...dati, ...nuoviDati },
      updated_at: new Date().toISOString(),
    });

  switch (sess.step_corrente) {
    case "data": {
      const data = parseData(t);
      if (!data) {
        await reply("Non ho capito la data 😅\nScrivila cosi': _oggi_, _domani_ oppure _15/07_");
        return;
      }
      await salva("ora", { data_prenotazione: data });
      await reply(`Perfetto, ${formatDataIT(data)} 📅\n\nA che *ora*? (es. _20:30_)`);
      return;
    }
    case "ora": {
      const ora = parseOra(t);
      if (!ora) {
        await reply("Non ho capito l'orario 😅\nScrivilo cosi': _20:30_");
        return;
      }
      await salva("coperti", { ora_prenotazione: ora });
      await reply("Ottimo! ⏰\n\nIn *quante persone* siete?");
      return;
    }
    case "coperti": {
      const n = parseInt(t.replace(/\D/g, ""), 10);
      if (!n || n < 1 || n > 200) {
        await reply("Scrivimi solo il numero di persone (es. _4_) 🙏");
        return;
      }
      await salva("nome", { num_persone: n });
      await reply("Perfetto! 👥\n\nQual è il tuo *nome*?");
      return;
    }
    case "nome": {
      if (t.length < 2) {
        await reply("Scrivimi il tuo nome 🙏");
        return;
      }
      await salva("cognome", { nome: t });
      await reply(`Grazie ${t}! E il *cognome*?`);
      return;
    }
    case "cognome": {
      if (t.length < 2) {
        await reply("Scrivimi il tuo cognome 🙏");
        return;
      }
      await salva("intolleranze_check", { cognome: t });
      await reply("Ci sono *intolleranze o allergie* nel gruppo? (sì / no)");
      return;
    }
    case "intolleranze_check": {
      if (isSi(tLower)) {
        await salva("intolleranze_dett", {});
        await reply("Quali intolleranze/allergie? ✍️");
        return;
      }
      if (isNo(tLower)) {
        await salva("bambini_check", { intolleranze: null });
        await reply("Ci sono *bambini*? (sì / no)");
        return;
      }
      await reply("Rispondi *sì* oppure *no* 🙏");
      return;
    }
    case "intolleranze_dett": {
      await salva("bambini_check", { intolleranze: t });
      await reply("Segnato! ✅\n\nCi sono *bambini*? (sì / no)");
      return;
    }
    case "bambini_check": {
      if (isSi(tLower)) {
        await salva("bambini_dett", {});
        await reply("Quanti bambini? Servono seggioloni? ✍️");
        return;
      }
      if (isNo(tLower)) {
        await salva("altro", { bambini: null });
        await reply("Hai *altre richieste*? (scrivi pure, oppure _no_)");
        return;
      }
      await reply("Rispondi *sì* oppure *no* 🙏");
      return;
    }
    case "bambini_dett": {
      await salva("altro", { bambini: t });
      await reply("Perfetto! ✅\n\nHai *altre richieste*? (scrivi pure, oppure _no_)");
      return;
    }
    case "altro": {
      const altro = isNo(tLower) ? null : t;
      const d = { ...dati, altro };
      const note = [
        d.intolleranze ? `Intolleranze: ${d.intolleranze}` : null,
        d.bambini ? `Bambini: ${d.bambini}` : null,
        d.altro ? `Note: ${d.altro}` : null,
      ].filter(Boolean).join(" | ");

      const riepilogo =
        `📋 *Riepilogo prenotazione*\n\n` +
        `📅 Data: ${formatDataIT(d.data_prenotazione)}\n` +
        `⏰ Ora: ${d.ora_prenotazione}\n` +
        `👥 Persone: ${d.num_persone}\n` +
        `👤 ${d.nome} ${d.cognome}\n` +
        (note ? `📝 ${note}\n` : "") +
        `\nConfermi? Rispondi:\n*1* = ✅ Conferma\n*2* = ❌ Annulla`;

      await salva("conferma", { altro, note });
      await reply(riepilogo);
      return;
    }
    case "conferma": {
      if (t === "1" || isSi(tLower)) {
        const pren = await dbInsert("prenotazioni", {
          azienda_id: conn.azienda_id,
          sede_id: conn.sede_id ?? null,
          nome: dati.nome,
          cognome: dati.cognome,
          telefono: from,
          data_prenotazione: dati.data_prenotazione,
          ora_prenotazione: dati.ora_prenotazione,
          num_persone: dati.num_persone,
          note: dati.note || null,
          stato: "in_attesa",
          canale: "whatsapp",
        });
        await dbDelete("chatbot_sessioni", `id=eq.${sess.id}`);

        if (pren) {
          await reply(
            `✅ *Prenotazione ricevuta!*\n\n` +
            `${formatDataIT(dati.data_prenotazione)} alle ${dati.ora_prenotazione} per ${dati.num_persone} persone.\n\n` +
            `Riceverai conferma a breve. A presto, ${dati.nome}! 🍽️`,
          );
          // notifica admin (opzionale)
          if (ADMIN_WA_NUMBER) {
            await sendText(
              conn.meta_phone_number_id,
              conn.meta_access_token || WHATSAPP_TOKEN,
              ADMIN_WA_NUMBER,
              `🔔 Nuova prenotazione WA:\n${dati.nome} ${dati.cognome} — ${formatDataIT(dati.data_prenotazione)} ${dati.ora_prenotazione} x${dati.num_persone}\nTel: ${from}${dati.note ? `\n${dati.note}` : ""}`,
            );
          }
        } else {
          await reply(
            "⚠️ C'è stato un problema tecnico nel salvare la prenotazione.\nChiamaci direttamente e la sistemiamo subito!",
          );
        }
        return;
      }
      if (t === "2" || isNo(tLower)) {
        await dbDelete("chatbot_sessioni", `id=eq.${sess.id}`);
        await reply("Prenotazione annullata. ❌\nScrivimi quando vuoi per ricominciare!");
        return;
      }
      await reply("Rispondi *1* per confermare o *2* per annullare 🙏");
      return;
    }
    default: {
      // step sconosciuto -> reset
      await dbDelete("chatbot_sessioni", `id=eq.${sess.id}`);
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
async function gestisciHub(conn: any, from: string, testo: string): Promise<void> {
  const token = conn.meta_access_token || WHATSAPP_TOKEN;
  const reply = (msg: string) => sendText(conn.meta_phone_number_id, token, from, msg);
  const t = testo.trim().toLowerCase();

  // sessione hub attiva?
  const sessioni = await dbSelect(
    "wa_sessioni_hub",
    `numero_telefono=eq.${from}&azienda_id=eq.${conn.azienda_id}&scade_at=gt.${new Date().toISOString()}&select=*&order=scade_at.desc&limit=1`,
  );
  const hub = sessioni[0] ?? null;

  // comando per cambiare contesto
  if (t === "menu" || t === "cambia") {
    if (hub) await dbDelete("wa_sessioni_hub", `id=eq.${hub.id}`);
    await dbDelete(
      "chatbot_sessioni",
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
    // aspetta la selezione 1/2
    if (t === "1" || t.includes("ristorante") || t.includes("tavolo")) {
      await dbUpdate("wa_sessioni_hub", `id=eq.${hub.id}`, { tipo_selezionato: "ristorante" });
      await gestisciFlussoRistorante(conn, from, ""); // avvia flusso (crea sessione + benvenuto)
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

  // contesto già scelto
  if (hub.tipo_selezionato === "ristorante") {
    await gestisciFlussoRistorante(conn, from, testo);
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

  // ===== GET: verifica webhook Meta =====
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ===== POST: messaggi in arrivo =====
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      console.log("Webhook payload:", JSON.stringify(payload));

      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      // ignora status update (sent/delivered/read)
      if (!value?.messages || value.messages.length === 0) {
        return new Response("ok", { status: 200 });
      }

      const msg = value.messages[0];
      const from: string = msg.from;
      const phoneNumberId: string = value.metadata?.phone_number_id ?? "";

      // solo messaggi di testo e interactive (per ora)
      let testo = "";
      if (msg.type === "text") testo = msg.text?.body ?? "";
      else if (msg.type === "interactive") {
        testo =
          msg.interactive?.button_reply?.title ??
          msg.interactive?.list_reply?.title ?? "";
      } else if (msg.type === "button") {
        testo = msg.button?.text ?? "";
      } else {
        // audio, immagini ecc. -> risposta generica
        testo = "";
      }

      // trova la connessione azienda dal phone_number_id
      const connessioni = await dbSelect(
        "whatsapp_connessioni",
        `meta_phone_number_id=eq.${phoneNumberId}&attivo=eq.true&select=*&limit=1`,
      );
      const conn = connessioni[0];
      if (!conn) {
        console.error("Nessuna connessione attiva per phone_number_id:", phoneNumberId);
        return new Response("ok", { status: 200 });
      }

      // messaggio non testuale -> rispondi e stop
      if (!testo && msg.type !== "text") {
        await sendText(
          conn.meta_phone_number_id,
          conn.meta_access_token || WHATSAPP_TOKEN,
          from,
          "Al momento posso gestire solo messaggi di testo ✍️\nScrivimi cosa ti serve!",
        );
        return new Response("ok", { status: 200 });
      }

      // determina tipo_app dell'azienda
      const aziende = await dbSelect(
        "aziende",
        `id=eq.${conn.azienda_id}&select=id,tipo_app&limit=1`,
      );
      const tipoApp: string[] = aziende[0]?.tipo_app ?? ["ristorante"];
      const haRistorante = tipoApp.includes("ristorante") || tipoApp.includes("restaurant");
      const haHotel = tipoApp.includes("hotel");

      if (haRistorante && haHotel) {
        await gestisciHub(conn, from, testo);
      } else if (haHotel) {
        await gestisciFlussoHotel(conn, from);
      } else {
        await gestisciFlussoRistorante(conn, from, testo);
      }

      return new Response("ok", { status: 200 });
    } catch (err) {
      console.error("Errore webhook:", err);
      // SEMPRE 200 a Meta, altrimenti disabilita il webhook dopo troppi errori
      return new Response("ok", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
