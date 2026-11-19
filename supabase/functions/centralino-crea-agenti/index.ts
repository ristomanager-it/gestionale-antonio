// centralino-crea-agenti — crea o aggiorna su ElevenLabs gli agenti vocali (italiano e inglese) di un locale.
// Secrets: ELEVENLABS_API_KEY, CENTRALINO_KEY. Solo superadmin (JWT) — verify_jwt = true.
// Crea:     POST { azienda_id, sede_id, nome_locale }                          -> { it, en }
// Aggiorna: POST { azienda_id, sede_id, nome_locale, agenti: { it, en } }      -> { aggiornati }
// Il numero per "passo un collega" si legge da centralino_opzioni (azione 'inoltra') della sede.

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
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function utente(req: Request) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: req.headers.get("Authorization") || "" },
  });
  return r.ok ? await r.json() : null;
}

async function numeroInoltro(sede: string): Promise<string | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/centralino_config?sede_id=eq.${sede}&select=centralino_opzioni(azione,numero_inoltro,attivo)`, { headers: H });
  const d = r.ok ? await r.json() : [];
  for (const c of d || []) for (const o of c.centralino_opzioni || []) {
    if (o.azione === "inoltra" && o.numero_inoltro && o.attivo !== false) {
      let n = String(o.numero_inoltro).replace(/[^\d+]/g, "");
      if (n.startsWith("00")) n = "+" + n.slice(2);
      if (!n.startsWith("+")) n = "+39" + n;
      return n;
    }
  }
  return null;
}

const TESTI = {
  it: {
    nome: (l: string) => `${l} — Prenotazioni (IT)`,
    primo: (l: string) => `Buongiorno, ${l}! Sono l'assistente per le prenotazioni. Come posso aiutarla?`,
    prompt: (l: string) => `Sei la voce che risponde al telefono di "${l}", un ristorante italiano. Parli in italiano, con tono cordiale, frasi brevi e naturali, dando del Lei.

COMPITI: prendere prenotazioni di tavoli e rispondere alle domande sul locale.

PRENOTAZIONE
1. Chiedi giorno, ora e numero di persone. Se il cliente dice "domani", "sabato" ecc. e non conosci la data di oggi, chiama info_locale: la risposta contiene la data di oggi.
2. Chiama verifica_disponibilita con data (AAAA-MM-GG), ora (HH:MM) e persone.
   - "disponibile": prosegui.
   - "pieno" o "scegli_orario": proponi al massimo tre degli orari_liberi; se non ce ne sono, dillo con gentilezza e proponi un altro giorno.
3. Chiedi nome e cognome. Il numero da cui chiama è {{system__caller_id}}: chiedi conferma che sia quello giusto per la prenotazione, altrimenti fatti dettare il numero.
4. Chiedi se ci sono intolleranze o allergie, o richieste particolari (seggiolone, compleanno).
5. Ripeti il riepilogo (giorno, ora, persone, nome) e chiedi conferma. Solo dopo il sì chiama prenota.
6. A prenotazione fatta: conferma che è registrata e che riceverà la conferma su WhatsApp. Saluta e chiudi la chiamata.

DOMANDE SUL LOCALE (orari, indirizzo, menu del giorno, prezzo, tipo di cucina)
- Chiama info_locale (con la data se chiede il menu di un altro giorno) e rispondi solo con quello che restituisce, in modo breve e parlato: non leggere elenchi lunghi, riassumi e chiedi se vuole altri dettagli.
- Se l'informazione non c'è (parcheggio, animali, prezzi alla carta, eventi, allergeni di un piatto...), non inventare: proponi di passare la chiamata a un collega.

PASSARE A UN COLLEGA
- Gruppi oltre 12 persone, eventi, catering, reclami, domande a cui non sai rispondere, o se il cliente chiede una persona: avvisa "Le passo subito un collega" e usa transfer_to_number.
- Se uno strumento risponde "errore_tecnico", scusati e passa la chiamata a un collega.

REGOLE
- Non inventare mai disponibilità, prezzi, piatti o orari: usa solo le risposte degli strumenti.
- Se il cliente parla inglese, continua in inglese.
- Non dire mai di essere un modello o un software: sei l'assistente prenotazioni di ${l}.`,
  },
  en: {
    nome: (l: string) => `${l} — Bookings (EN)`,
    primo: (l: string) => `Hello, welcome to ${l}! I'm the booking assistant. How can I help you?`,
    prompt: (l: string) => `You are the voice answering the phone for "${l}", an Italian restaurant. Speak English, warm and polite, short natural sentences.

TASKS: take table bookings and answer questions about the restaurant.

BOOKING
1. Ask for day, time and number of guests. If the guest says "tomorrow", "Saturday" etc. and you don't know today's date, call info_locale: the reply contains today's date.
2. Call verifica_disponibilita with data (YYYY-MM-DD), ora (HH:MM) and persone.
   - "disponibile": continue.
   - "pieno" or "scegli_orario": offer up to three of the orari_liberi; if there are none, say so kindly and suggest another day.
3. Ask for first and last name. The caller's number is {{system__caller_id}}: ask if it's the right number for the booking, otherwise ask them to spell it out with the country code.
4. Ask about allergies, intolerances or special requests (high chair, birthday).
5. Repeat the summary (day, time, guests, name) and ask for confirmation. Only after a yes call prenota.
6. When booked: confirm it is registered and that a WhatsApp confirmation will follow. Say goodbye and end the call.

QUESTIONS ABOUT THE RESTAURANT (opening hours, address, menu of the day, price, cuisine)
- Call info_locale (with the date if they ask about another day's menu) and answer only with what it returns, briefly: the data is in Italian, translate dish names naturally, summarise instead of reading long lists.
- If the information is not there (parking, pets, à la carte prices, events, allergens of a dish...), don't invent: offer to transfer to a colleague.

TRANSFER TO A COLLEAGUE
- Groups over 12, events, catering, complaints, questions you can't answer, or if the guest asks for a person: say "I'll put you through to a colleague" and use transfer_to_number.
- If a tool replies "errore_tecnico", apologise and transfer to a colleague.

RULES
- Never invent availability, prices, dishes or opening hours: only use tool results.
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
      description: "Controlla se c'è posto per un giorno, un'ora e un numero di persone. Se è pieno restituisce gli orari liberi.",
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
    {
      type: "webhook",
      name: "info_locale",
      description: "Informazioni sul locale: indirizzo, telefono, orari di apertura, tipo di cucina, menu del giorno con prezzo, e la data di oggi.",
      api_schema: {
        url: `${base}&azione=info`, method: "POST", request_headers: headers,
        request_body_schema: {
          type: "object",
          properties: {
            data: { type: "string", description: "Giorno di cui si chiede il menu, AAAA-MM-GG. Vuoto = oggi." },
          },
        },
      },
    },
  ];
}

function sistema(numero: string | null) {
  const t: Record<string, unknown> = {
    end_call: { name: "end_call", description: "Chiude la chiamata quando la conversazione è finita.", params: { system_tool_type: "end_call" } },
  };
  if (numero) {
    t.transfer_to_number = {
      name: "transfer_to_number",
      description: "Passa la chiamata a un collega del ristorante.",
      params: {
        system_tool_type: "transfer_to_number",
        transfers: [],
        transfer_rules: [{
          condition: "Gruppi oltre 12 persone, eventi, catering, reclami, domande senza risposta negli strumenti, o il cliente chiede una persona.",
          provider_configs: [{
            type: "sip_trunk",
            config: { type: "sip_cold_conference_transfer", transfer_destination: { type: "phone", destination: numero } },
          }],
        }],
      },
    };
  }
  return t;
}

function corpo(lingua: "it" | "en", locale: string, azienda: string, sede: string, numero: string | null, voce?: string) {
  const t = TESTI[lingua];
  const cc: any = {
    agent: {
      language: lingua,
      first_message: t.primo(locale),
      prompt: { prompt: t.prompt(locale), tools: strumenti(azienda, sede), built_in_tools: sistema(numero) },
    },
  };
  if (voce) cc.tts = { voice_id: voce };
  return { name: t.nome(locale), conversation_config: cc };
}

async function el(method: string, path: string, body: unknown, lingua: string) {
  const r = await fetch(`https://api.elevenlabs.io${path}`, {
    method, headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${lingua}: ${r.status} ${JSON.stringify(out).slice(0, 700)}`);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const u = await utente(req);
  if (u?.id !== SUPERADMIN) return json({ errore: "solo superadmin" }, 403);
  if (!EL_KEY) return json({ errore: "Manca il secret ELEVENLABS_API_KEY" }, 400);
  if (!CENTRALINO_KEY) return json({ errore: "Manca il secret CENTRALINO_KEY" }, 400);
  const b = await req.json().catch(() => ({}));
  const { azienda_id, sede_id, nome_locale, agenti, voce_it, voce_en } = b;
  if (!azienda_id || !sede_id || !nome_locale) return json({ errore: "Servono azienda_id, sede_id e nome_locale" }, 400);
  try {
    const numero = await numeroInoltro(sede_id);
    if (agenti?.it || agenti?.en) {
      const fatti: string[] = [];
      if (agenti.it) { await el("PATCH", `/v1/convai/agents/${agenti.it}`, corpo("it", nome_locale, azienda_id, sede_id, numero, voce_it), "it"); fatti.push("it"); }
      if (agenti.en) { await el("PATCH", `/v1/convai/agents/${agenti.en}`, corpo("en", nome_locale, azienda_id, sede_id, numero, voce_en), "en"); fatti.push("en"); }
      return json({ ok: true, aggiornati: fatti, trasferimento: numero ? "attivo" : "manca il numero di inoltro" });
    }
    const it = (await el("POST", "/v1/convai/agents/create", corpo("it", nome_locale, azienda_id, sede_id, numero, voce_it), "it")).agent_id;
    const en = (await el("POST", "/v1/convai/agents/create", corpo("en", nome_locale, azienda_id, sede_id, numero, voce_en), "en")).agent_id;
    return json({ ok: true, it, en, trasferimento: numero ? "attivo" : "manca il numero di inoltro" });
  } catch (e) {
    return json({ errore: String(e) }, 502);
  }
});
