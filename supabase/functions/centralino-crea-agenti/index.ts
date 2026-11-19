// centralino-crea-agenti — crea su ElevenLabs gli agenti vocali (italiano e inglese) di un locale.
// Secrets: ELEVENLABS_API_KEY, CENTRALINO_KEY. Solo superadmin (JWT) — verify_jwt = true.
// POST { azienda_id, sede_id, nome_locale, telefono_staff? }  ->  { it: agent_id, en: agent_id }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_KEY") ?? "";
const EL_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
const CENTRALINO_KEY = Deno.env.get("CENTRALINO_KEY") ?? "";
const SUPERADMIN = "5da91398-947a-4f13-bdaa-f2a593c03e54";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function utente(req: Request) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: req.headers.get("Authorization") || "" },
  });
  return r.ok ? await r.json() : null;
}

const TESTI = {
  it: {
    nome: (l: string) => `${l} — Prenotazioni (IT)`,
    primo: (l: string) => `Buongiorno, ${l}! Sono l'assistente per le prenotazioni. Per quante persone e per quando vorrebbe prenotare?`,
    prompt: (l: string) => `Sei la voce che risponde al telefono di "${l}", un ristorante italiano. Parli in italiano, con tono cordiale, frasi brevi e naturali, dando del Lei.

COMPITO: prendere prenotazioni di tavoli.
1. Chiedi giorno, ora e numero di persone. Se il cliente dice "domani", "sabato" ecc. e non conosci la data di oggi, chiama verifica_disponibilita senza data: la risposta contiene la data di oggi.
2. Chiama verifica_disponibilita con data (AAAA-MM-GG), ora (HH:MM) e persone.
   - "disponibile": prosegui.
   - "pieno" o "scegli_orario": proponi al massimo tre degli orari_liberi; se non ce ne sono, dillo con gentilezza e proponi un altro giorno.
3. Chiedi nome e cognome. Il numero da cui chiama è {{system__caller_id}}: chiedi conferma che sia quello giusto per la prenotazione, altrimenti fatti dettare il numero.
4. Chiedi se ci sono intolleranze o allergie, o richieste particolari (seggiolone, compleanno).
5. Ripeti il riepilogo (giorno, ora, persone, nome) e chiedi conferma. Solo dopo il sì chiama prenota.
6. A prenotazione fatta: conferma che è registrata e che riceverà la conferma su WhatsApp. Saluta e chiudi la chiamata.

REGOLE:
- Non inventare mai disponibilità, prezzi, piatti o orari: usa solo le risposte degli strumenti.
- Gruppi oltre 12 persone, eventi, catering, reclami, o se il cliente chiede una persona: dì che passi la chiamata a un collega.
- Se uno strumento risponde "errore_tecnico", scusati e passa la chiamata a un collega.
- Se il cliente parla inglese, continua in inglese.
- Non dire mai di essere un modello o un software: sei l'assistente prenotazioni di ${l}.`,
  },
  en: {
    nome: (l: string) => `${l} — Bookings (EN)`,
    primo: (l: string) => `Hello, welcome to ${l}! I'm the booking assistant. For how many people and when would you like to book?`,
    prompt: (l: string) => `You are the voice answering the phone for "${l}", an Italian restaurant. Speak English, warm and polite, short natural sentences.

TASK: take table bookings.
1. Ask for day, time and number of guests. If the guest says "tomorrow", "Saturday" etc. and you don't know today's date, call verifica_disponibilita without a date: the reply contains today's date.
2. Call verifica_disponibilita with data (YYYY-MM-DD), ora (HH:MM) and persone.
   - "disponibile": continue.
   - "pieno" or "scegli_orario": offer up to three of the orari_liberi; if there are none, say so kindly and suggest another day.
3. Ask for first and last name. The caller's number is {{system__caller_id}}: ask if it's the right number for the booking, otherwise ask them to spell it out with the country code.
4. Ask about allergies, intolerances or special requests (high chair, birthday).
5. Repeat the summary (day, time, guests, name) and ask for confirmation. Only after a yes call prenota.
6. When booked: confirm it is registered and that a WhatsApp confirmation will follow. Say goodbye and end the call.

RULES:
- Never invent availability, prices, dishes or opening hours: only use tool results.
- Groups over 12, events, catering, complaints, or if the guest asks for a person: say you'll transfer them to a colleague.
- If a tool replies "errore_tecnico", apologise and transfer to a colleague.
- If the guest speaks Italian, switch to Italian.
- Never say you are a model or software: you are ${l}'s booking assistant.`,
  },
};

function strumenti(azienda: string, sede: string) {
  const base = `${SUPABASE_URL}/functions/v1/centralino-strumenti?azienda=${azienda}&sede=${sede}`;
  const headers = { "x-centralino-key": CENTRALINO_KEY };
  return [
    {
      type: "webhook",
      name: "verifica_disponibilita",
      description: "Controlla se c'è posto per un giorno, un'ora e un numero di persone. Senza data restituisce la data di oggi.",
      api_schema: {
        url: `${base}&azione=disponibilita`, method: "POST", request_headers: headers,
        request_body_schema: {
          type: "object",
          properties: {
            data: { type: "string", description: "Giorno della prenotazione, formato AAAA-MM-GG" },
            ora: { type: "string", description: "Orario, formato HH:MM (24 ore)" },
            persone: { type: "number", description: "Numero di persone" },
          },
          required: ["persone"],
        },
      },
    },
    {
      type: "webhook",
      name: "prenota",
      description: "Registra la prenotazione. Da chiamare solo dopo che il cliente ha confermato il riepilogo.",
      api_schema: {
        url: `${base}&azione=prenota`, method: "POST", request_headers: headers,
        request_body_schema: {
          type: "object",
          properties: {
            data: { type: "string", description: "AAAA-MM-GG" },
            ora: { type: "string", description: "HH:MM" },
            persone: { type: "number", description: "Numero di persone" },
            nome: { type: "string", description: "Nome del cliente" },
            cognome: { type: "string", description: "Cognome del cliente" },
            telefono: { type: "string", description: "Telefono del cliente con prefisso internazionale" },
            intolleranze: { type: "string", description: "Allergie o intolleranze, se ci sono" },
            note: { type: "string", description: "Richieste particolari" },
          },
          required: ["data", "ora", "persone", "nome", "telefono"],
        },
      },
    },
  ];
}

async function creaAgente(lingua: "it" | "en", locale: string, azienda: string, sede: string) {
  const t = TESTI[lingua];
  const body = {
    name: t.nome(locale),
    conversation_config: {
      agent: {
        language: lingua,
        first_message: t.primo(locale),
        prompt: { prompt: t.prompt(locale), tools: strumenti(azienda, sede), built_in_tools: { end_call: { name: "end_call", description: "Chiude la chiamata quando la conversazione è finita.", params: { system_tool_type: "end_call" } } } },
      },
    },
  };
  const r = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${lingua}: ${r.status} ${JSON.stringify(out).slice(0, 500)}`);
  return out.agent_id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const u = await utente(req);
  if (u?.id !== SUPERADMIN) return json({ errore: "solo superadmin" }, 403);
  if (!EL_KEY) return json({ errore: "Manca il secret ELEVENLABS_API_KEY" }, 400);
  if (!CENTRALINO_KEY) return json({ errore: "Manca il secret CENTRALINO_KEY" }, 400);
  const b = await req.json().catch(() => ({}));
  const { azienda_id, sede_id, nome_locale } = b;
  if (!azienda_id || !sede_id || !nome_locale) return json({ errore: "Servono azienda_id, sede_id e nome_locale" }, 400);
  try {
    const it = await creaAgente("it", nome_locale, azienda_id, sede_id);
    const en = await creaAgente("en", nome_locale, azienda_id, sede_id);
    return json({ ok: true, it, en });
  } catch (e) {
    return json({ errore: String(e) }, 502);
  }
});
