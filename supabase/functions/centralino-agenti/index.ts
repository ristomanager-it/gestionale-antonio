// centralino-agenti — la voce AI del centralino configurata dal locale stesso (pagina "Centralino AI").
// Chi puo': admin dell'azienda o superadmin. verify_jwt = true.
// POST { azione: "voci" }                                    -> elenco voci con anteprima
// POST { azione: "salva", azienda_id, sede_id, ...campi }    -> salva centralino_config e crea/aggiorna gli agenti IT/EN su ElevenLabs
// Secrets: ELEVENLABS_API_KEY, CENTRALINO_KEY.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_KEY") ?? "";
const EL_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
const CENTRALINO_KEY = Deno.env.get("CENTRALINO_KEY") ?? "";
const SUPERADMIN = "5da91398-947a-4f13-bdaa-f2a593c03e54";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path.split("?")[0]}: ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

async function utente(req: Request) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: req.headers.get("Authorization") || "" },
  });
  return r.ok ? await r.json() : null;
}
async function puoGestire(uid: string, azienda: string) {
  if (uid === SUPERADMIN) return true;
  const r = await rest(`utenti_aziende?user_id=eq.${uid}&azienda_id=eq.${azienda}&attivo=eq.true&select=ruolo`);
  return (r || []).some((x: any) => ["admin", "superadmin"].includes(x.ruolo));
}

const e164 = (t: string | null | undefined) => {
  let n = String(t || "").replace(/[^\d+]/g, "");
  if (!n) return null;
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (!n.startsWith("+")) n = "+39" + n;
  return n.length >= 9 ? n : null;
};

async function el(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.elevenlabs.io${path}`, {
    method, headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${JSON.stringify(out).slice(0, 600)}`);
  return out;
}

/* ---------- voci ---------- */
async function voci() {
  const d = await el("GET", "/v2/voices?page_size=100");
  const lista = (d.voices || []).map((v: any) => {
    const l = v.labels || {};
    const lingue = [l.language, ...(v.verified_languages || []).map((x: any) => x.language)].filter(Boolean).map(String);
    const italiana = lingue.some((x) => x.toLowerCase().startsWith("it")) || /ital/i.test(String(l.accent || "") + " " + String(v.name || ""));
    return {
      voice_id: v.voice_id, nome: v.name, anteprima: v.preview_url || null,
      genere: l.gender || null, accento: l.accent || null, descrizione: l.description || l.descriptive || null, italiana,
    };
  });
  lista.sort((a: any, b: any) => Number(b.italiana) - Number(a.italiana) || String(a.nome).localeCompare(String(b.nome)));
  return { voci: lista };
}

/* ---------- testi degli agenti ---------- */
function promptIt(l: string, maxP: number, extra: string) {
  return `Sei la voce che risponde al telefono di "${l}", un ristorante italiano. Parli in italiano, con tono cordiale, frasi brevi e naturali, dando del Lei.

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
- Usa anche le INFORMAZIONI DEL LOCALE qui sotto, se ci sono.
- Se l'informazione non c'è, non inventare: proponi di passare la chiamata a un collega.

PASSARE A UN COLLEGA
- Gruppi oltre ${maxP} persone, eventi, catering, reclami, domande a cui non sai rispondere, o se il cliente chiede una persona: avvisa "Le passo subito un collega" e usa transfer_to_number. Se lo strumento non c'è, chiedi nome e numero e dì che verrà richiamato al più presto.
- Se uno strumento risponde "errore_tecnico", scusati e passa la chiamata a un collega.

REGOLE
- Non inventare mai disponibilità, prezzi, piatti o orari: usa solo le risposte degli strumenti e le informazioni qui sotto.
- Se il cliente parla inglese, continua in inglese.
- Non dire mai di essere un modello o un software: sei l'assistente prenotazioni di ${l}.${extra ? `\n\nINFORMAZIONI DEL LOCALE (scritte dal ristorante, usale per rispondere):\n${extra}` : ""}`;
}
function promptEn(l: string, maxP: number, extra: string) {
  return `You are the voice answering the phone for "${l}", an Italian restaurant. Speak English, warm and polite, short natural sentences.

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
- Also use the RESTAURANT INFORMATION below, if present (it is written in Italian: translate it).
- If the information is not there, don't invent: offer to transfer to a colleague.

TRANSFER TO A COLLEAGUE
- Groups over ${maxP}, events, catering, complaints, questions you can't answer, or if the guest asks for a person: say "I'll put you through to a colleague" and use transfer_to_number. If the tool is not available, take name and number and say someone will call back shortly.
- If a tool replies "errore_tecnico", apologise and transfer to a colleague.

RULES
- Never invent availability, prices, dishes or opening hours: only use tool results and the information below.
- If the guest speaks Italian, switch to Italian.
- Never say you are a model or software: you are ${l}'s booking assistant.${extra ? `\n\nRESTAURANT INFORMATION (written by the restaurant in Italian):\n${extra}` : ""}`;
}

function strumenti(azienda: string, sede: string) {
  const base = `${SUPABASE_URL}/functions/v1/centralino-strumenti?azienda=${azienda}&sede=${sede}`;
  const headers = { "x-centralino-key": CENTRALINO_KEY };
  const w = (name: string, description: string, azione: string, properties: Record<string, unknown>, required?: string[]) => ({
    type: "webhook", name, description,
    api_schema: { url: `${base}&azione=${azione}`, method: "POST", request_headers: headers,
      request_body_schema: { type: "object", properties, ...(required ? { required } : {}) } },
  });
  return [
    w("verifica_disponibilita", "Controlla se c'è posto per un giorno, un'ora e un numero di persone. Se è pieno restituisce gli orari liberi.", "disponibilita", {
      data: { type: "string", description: "Giorno della prenotazione, formato AAAA-MM-GG" },
      ora: { type: "string", description: "Orario, formato HH:MM (24 ore)" },
      persone: { type: "number", description: "Numero di persone" },
    }, ["persone"]),
    w("prenota", "Registra la prenotazione. Da chiamare solo dopo che il cliente ha confermato il riepilogo.", "prenota", {
      data: { type: "string", description: "AAAA-MM-GG" },
      ora: { type: "string", description: "HH:MM" },
      persone: { type: "number", description: "Numero di persone" },
      nome: { type: "string", description: "Nome del cliente" },
      cognome: { type: "string", description: "Cognome del cliente" },
      telefono: { type: "string", description: "Telefono del cliente con prefisso internazionale" },
      intolleranze: { type: "string", description: "Allergie o intolleranze, se ci sono" },
      note: { type: "string", description: "Richieste particolari" },
    }, ["data", "ora", "persone", "nome", "telefono"]),
    w("info_locale", "Informazioni sul locale: indirizzo, telefono, orari di apertura, tipo di cucina, menu del giorno con prezzo, e la data di oggi.", "info", {
      data: { type: "string", description: "Giorno di cui si chiede il menu, AAAA-MM-GG. Vuoto = oggi." },
    }),
  ];
}

function sistema(numero: string | null, maxP: number) {
  const t: Record<string, unknown> = {
    end_call: { name: "end_call", description: "Chiude la chiamata quando la conversazione è finita.", params: { system_tool_type: "end_call" } },
  };
  if (numero) {
    t.transfer_to_number = {
      name: "transfer_to_number", description: "Passa la chiamata a un collega del ristorante.",
      params: {
        system_tool_type: "transfer_to_number", transfers: [],
        transfer_rules: [{
          condition: `Gruppi oltre ${maxP} persone, eventi, catering, reclami, domande senza risposta, o il cliente chiede una persona.`,
          provider_configs: [{ type: "sip_trunk", config: { type: "sip_cold_conference_transfer", transfer_destination: { type: "phone", destination: numero } } }],
        }],
      },
    };
  }
  return t;
}

function corpo(lingua: "it" | "en", c: any, locale: string, numero: string | null) {
  const maxP = Number(c.max_persone_ai) || 12;
  const extra = String(c.info_extra || "").trim().slice(0, 4000);
  const cc: any = {
    agent: {
      language: lingua,
      first_message: lingua === "it"
        ? (String(c.saluto_ai || "").trim() || `Buongiorno, ${locale}! Sono l'assistente per le prenotazioni. Come posso aiutarla?`)
        : `Hello, welcome to ${locale}! I'm the booking assistant. How can I help you?`,
      prompt: {
        prompt: lingua === "it" ? promptIt(locale, maxP, extra) : promptEn(locale, maxP, extra),
        tools: strumenti(c.azienda_id, c.sede_id),
        built_in_tools: sistema(numero, maxP),
      },
    },
  };
  if (c.voce_ai) cc.tts = { voice_id: c.voce_ai };
  return { name: `${locale} — ${lingua === "it" ? "Prenotazioni (IT)" : "Bookings (EN)"}`, conversation_config: cc };
}

/* ---------- salva ---------- */
async function salva(b: any) {
  const azienda = String(b.azienda_id || ""), sede = String(b.sede_id || "");
  const s = (await rest(`sedi?id=eq.${sede}&azienda_id=eq.${azienda}&select=nome`))?.[0];
  if (!s) throw new Error("Sede non trovata");
  const campi = {
    ai_attivo: !!b.ai_attivo,
    voce_ai: b.voce_ai || null,
    voce_ai_nome: b.voce_ai_nome || null,
    saluto_ai: String(b.saluto_ai || "").trim().slice(0, 300) || null,
    info_extra: String(b.info_extra || "").trim().slice(0, 4000) || null,
    numero_trasferimento: e164(b.numero_trasferimento),
    max_persone_ai: Math.min(100, Math.max(2, Number(b.max_persone_ai) || 12)),
    updated_at: new Date().toISOString(),
  };
  let c = (await rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=*&limit=1`))?.[0];
  if (c) c = (await rest(`centralino_config?id=eq.${c.id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(campi) }))[0];
  else c = (await rest(`centralino_config`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ azienda_id: azienda, sede_id: sede, ...campi }) }))[0];

  const numero = c.numero_trasferimento || null;
  const ids: Record<string, string> = { it: c.agente_it, en: c.agente_en };
  for (const lingua of ["it", "en"] as const) {
    const body = corpo(lingua, c, s.nome, numero);
    if (ids[lingua]) {
      try { await el("PATCH", `/v1/convai/agents/${ids[lingua]}`, body); continue; }
      catch (e) { if (!/ 404/.test(String(e))) throw e; } // agente cancellato su ElevenLabs: lo ricreo
    }
    ids[lingua] = (await el("POST", "/v1/convai/agents/create", body)).agent_id;
  }
  const fin = (await rest(`centralino_config?id=eq.${c.id}`, {
    method: "PATCH", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ agente_it: ids.it, agente_en: ids.en, ai_aggiornato_at: new Date().toISOString() }),
  }))[0];
  return { ok: true, config: fin, trasferimento: numero ? "attivo" : "senza numero: la voce prende nome e numero per farli richiamare" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const u = await utente(req);
    if (!u?.id) return json({ errore: "Accesso non valido" }, 401);
    if (!EL_KEY || !CENTRALINO_KEY) return json({ errore: "Centralino AI non configurato sulla piattaforma" }, 400);
    const b = await req.json().catch(() => ({}));
    if (b.azione === "voci") return json(await voci());
    if (b.azione === "salva") {
      if (!b.azienda_id || !b.sede_id) return json({ errore: "Servono azienda_id e sede_id" }, 400);
      if (!(await puoGestire(u.id, b.azienda_id))) return json({ errore: "Solo l'admin del locale può cambiare il centralino" }, 403);
      return json(await salva(b));
    }
    return json({ errore: "azione sconosciuta" }, 400);
  } catch (e) {
    console.error(e);
    return json({ errore: String((e as Error)?.message || e) }, 502);
  }
});
