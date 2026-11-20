// centralino-agenti — la voce AI del centralino configurata dal locale stesso (pagina "Centralino AI").
// Chi puo': admin dell'azienda o superadmin. verify_jwt = true.
// POST { azione: "voci" }                                    -> elenco voci con anteprima
// POST { azione: "salva", azienda_id, sede_id, ...campi }    -> salva centralino_config e crea/aggiorna gli agenti IT/EN su ElevenLabs
// POST { azione: "chiamate", azienda_id }                    -> sincronizza le chiamate da ElevenLabs e restituisce il riepilogo del mese
// POST { azione: "clona", azienda_id, sede_id, audio_base64, mime, consenso, nome } -> crea la voce del titolare (modulo voce)
// POST { azione: "elimina_voce", azienda_id, sede_id }        -> cancella la voce clonata del locale
// POST { azione: "stato", azienda_id, sede_id, profilo? }     -> configurazione, menu, domande aperte (+ profilo del locale per Tony)
// POST { azione: "impara", azienda_id, sede_id }             -> rifa' subito la scheda del locale (centralino-impara)
// POST { azione: "rispondi_domande", azienda_id, sede_id, risposte:[{id,risposta|ignora}] } -> le risposte entrano nelle info del locale
// Il bot WhatsApp (bot_wa_ai) e' incluso nel piano; la voce al telefono e' il modulo a pagamento "centralino_voce".
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

/* ---------- modulo voce (a pagamento): sull'azienda o sul suo piano ---------- */
async function moduloVoce(azienda: string): Promise<boolean> {
  const a = (await rest(`aziende?id=eq.${azienda}&select=features,piano_id&limit=1`))?.[0] || {};
  if (a.features?.centralino_voce === true) return true;
  if (!a.piano_id) return false;
  const p = (await rest(`piani_abbonamento?id=eq.${a.piano_id}&select=features&limit=1`))?.[0];
  return p?.features?.centralino_voce === true;
}

/* ---------- voci ---------- */
async function voci(propria: string | null = null) {
  const d = await el("GET", "/v2/voices?page_size=100");
  // le voci clonate sono dei singoli locali: si vede solo quella del proprio locale
  const tutte = (d.voices || []).filter((v: any) => v.category !== "cloned" || (propria && v.voice_id === propria));
  const lista = tutte.map((v: any) => {
    const l = v.labels || {};
    const lingue = [l.language, ...(v.verified_languages || []).map((x: any) => x.language)].filter(Boolean).map(String);
    const italiana = lingue.some((x) => x.toLowerCase().startsWith("it")) || /ital/i.test(String(l.accent || "") + " " + String(v.name || ""));
    return {
      voice_id: v.voice_id, nome: v.name, anteprima: v.preview_url || null,
      genere: l.gender || null, accento: l.accent || null, descrizione: l.description || l.descriptive || null,
      italiana: italiana || v.voice_id === propria, propria: v.voice_id === propria,
    };
  });
  lista.sort((a: any, b: any) => Number(b.propria) - Number(a.propria) || Number(b.italiana) - Number(a.italiana) || String(a.nome).localeCompare(String(b.nome)));
  return { voci: lista };
}

/* ---------- testi degli agenti ---------- */
function promptIt(l: string, maxP: number, extra: string, asporto: boolean) {
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

DOMANDE SUL LOCALE (orari, indirizzo, parcheggio, animali, servizi, offerte, eventi, piatto o menu del giorno, prezzo, tipo di cucina)
- Chiama info_locale (con la data se chiede il menu di un altro giorno) e rispondi solo con quello che restituisce, in modo breve e parlato: non leggere elenchi lunghi, riassumi e chiedi se vuole altri dettagli.
- La risposta di info_locale contiene anche scheda_del_locale (servizi, offerte, promozioni, eventi, sale: ricavata dall'app) e cose_da_sapere_dal_locale (scritte dal ristorante, valgono di più): cercala lì prima di dire che non lo sai.
- Se l'informazione non c'è, non inventare: chiama domanda_senza_risposta con la domanda del cliente (così il locale la completa), poi proponi di passare la chiamata a un collega o di farlo richiamare.

MENU ALLA CARTA
- Per le portate e i prezzi chiama menu_locale: con "categoria" (es. "pizze", "primi", "dolci") o "cerca" (es. "senza glutine", "carbonara") per avere solo quello che serve. Non elencare mai tutto il menu: di' le categorie e chiedi cosa gli interessa, poi al massimo 5-6 piatti alla volta.
- Se vuole vedere il menu, chiama invia_link con cosa="menu" e il numero del cliente ({{system__caller_id}}, chiedi conferma che abbia WhatsApp su quel numero). Di' "gliel'ho mandato su WhatsApp" solo se la risposta dice inviato=true.
${asporto ? `
ORDINI DA ASPORTO (ritiro al locale, pagamento in contanti al ritiro)
1. Fatti dire i piatti e le quantità; se serve usa menu_locale per verificare che esistano e il prezzo.
2. Chiama ordina con "ordine" scritto così: "2 margherita; 1 diavola senza piccante; 1 tiramisù" (punto e virgola tra i piatti, note dopo il nome) e conferma=false.
   - "da_chiarire": chiedi quale intende tra i piatti in "forse", poi richiama.
   - "da_confermare": leggi il riepilogo e il totale, chiedi a che ora passa a ritirare (tieni conto del tempo di preparazione) e il nome.
3. Solo dopo il sì del cliente richiama ordina con conferma=true, orario (HH:MM), nome e telefono.
4. Dì che l'ordine è registrato e che riceverà il riepilogo su WhatsApp da confermare con «Confermo».
- Consegna a domicilio: non la prendi al telefono, proponi di mandare il link del menu con invia_link per ordinare online.` : `
ORDINI
- Al telefono non si prendono ordini da asporto: proponi di mandare il link del menu con invia_link.`}

PASSARE A UN COLLEGA
- Gruppi oltre ${maxP} persone, eventi, catering, reclami, domande a cui non sai rispondere, o se il cliente chiede una persona: avvisa "Le passo subito un collega" e usa transfer_to_number. Se lo strumento non c'è, chiedi nome e numero e dì che verrà richiamato al più presto.
- Se uno strumento risponde "errore_tecnico", scusati e passa la chiamata a un collega.

REGOLE
- Non inventare mai disponibilità, prezzi, piatti o orari: usa solo le risposte degli strumenti e le informazioni qui sotto.
- Se il cliente parla inglese, continua in inglese.
- Non dire mai di essere un modello o un software: sei l'assistente prenotazioni di ${l}.${extra ? `\n\nINFORMAZIONI DEL LOCALE (scritte dal ristorante, usale per rispondere):\n${extra}` : ""}`;
}
function promptEn(l: string, maxP: number, extra: string, asporto: boolean) {
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
- The info_locale reply also contains scheda_del_locale (services, offers, promotions, events, rooms) and cose_da_sapere_dal_locale (written by the restaurant, it wins): look there before saying you don't know (it is in Italian: translate it).
- If the information is not there, don't invent: call domanda_senza_risposta with the guest's question written in Italian (so the restaurant can complete it), then offer to transfer to a colleague or a call back.

À LA CARTE MENU
- For dishes and prices call menu_locale with "categoria" (e.g. "pizze", "primi", "dolci" — category names are Italian) or "cerca" to get only what is needed. Never read the whole menu: name the categories and ask what they'd like, then at most 5-6 dishes at a time, translating names naturally.
- If they want to see the menu, call invia_link with cosa="menu" and the caller's number ({{system__caller_id}}, check they have WhatsApp on it). Say it was sent only if the reply says inviato=true.
${asporto ? `
TAKEAWAY ORDERS (pick-up at the restaurant, cash on pick-up)
1. Get dishes and quantities; use menu_locale to check they exist and the price.
2. Call ordina with "ordine" written in Italian dish names like "2 margherita; 1 diavola senza piccante" and conferma=false.
   - "da_chiarire": ask which one they mean among "forse", then call again.
   - "da_confermare": read back the summary and total, ask pick-up time and name.
3. Only after a yes call ordina with conferma=true, orario (HH:MM), nome and telefono.
4. Say the order is registered and they'll get a WhatsApp summary to confirm.
- Home delivery: not by phone, offer the menu link with invia_link to order online.` : `
ORDERS
- Takeaway orders are not taken by phone: offer to send the menu link with invia_link.`}

TRANSFER TO A COLLEAGUE
- Groups over ${maxP}, events, catering, complaints, questions you can't answer, or if the guest asks for a person: say "I'll put you through to a colleague" and use transfer_to_number. If the tool is not available, take name and number and say someone will call back shortly.
- If a tool replies "errore_tecnico", apologise and transfer to a colleague.

RULES
- Never invent availability, prices, dishes or opening hours: only use tool results and the information below.
- If the guest speaks Italian, switch to Italian.
- Never say you are a model or software: you are ${l}'s booking assistant.${extra ? `\n\nRESTAURANT INFORMATION (written by the restaurant in Italian):\n${extra}` : ""}`;
}

function strumenti(azienda: string, sede: string, asporto: boolean) {
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
    w("menu_locale", "Menu alla carta del locale con i prezzi, diviso per categorie. Usa categoria o cerca per avere solo una parte.", "menu", {
      categoria: { type: "string", description: "Categoria da elencare, es. pizze, antipasti, primi, secondi, dolci, vini" },
      cerca: { type: "string", description: "Parole da cercare nel nome o nella descrizione, es. carbonara, senza glutine" },
    }),
    w("invia_link", "Manda al cliente su WhatsApp il link del menu (cosa=menu) o della prenotazione online (cosa=prenota).", "invia_link", {
      cosa: { type: "string", description: "menu oppure prenota" },
      telefono: { type: "string", description: "Numero WhatsApp del cliente con prefisso internazionale" },
    }, ["cosa", "telefono"]),
    w("domanda_senza_risposta", "Annota per il locale una domanda del cliente a cui non trovi risposta negli strumenti né nelle informazioni del locale (es. cani ammessi, sala per feste, POS). Chiamalo prima di dire che non lo sai.", "domanda", {
      domanda: { type: "string", description: "La domanda del cliente, breve e in italiano" },
      telefono: { type: "string", description: "Numero del cliente ({{system__caller_id}})" },
    }, ["domanda"]),
    ...(asporto ? [w("ordina", "Ordine da asporto. Prima con conferma=false per avere riepilogo e totale, poi con conferma=true per registrarlo.", "ordina", {
      ordine: { type: "string", description: "Piatti separati da punto e virgola, quantità davanti, note dopo: 2 margherita; 1 diavola senza piccante" },
      conferma: { type: "boolean", description: "false = solo riepilogo e totale; true = registra l'ordine (solo dopo il sì del cliente)" },
      orario: { type: "string", description: "Orario di ritiro HH:MM (obbligatorio con conferma=true)" },
      nome: { type: "string", description: "Nome del cliente (obbligatorio con conferma=true)" },
      telefono: { type: "string", description: "Telefono del cliente con prefisso (obbligatorio con conferma=true)" },
      allergie: { type: "string", description: "Allergie o intolleranze, se ci sono" },
    }, ["ordine", "conferma"])] : []),
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
        prompt: lingua === "it" ? promptIt(locale, maxP, extra, !!c.asporto_attivo) : promptEn(locale, maxP, extra, !!c.asporto_attivo),
        tools: strumenti(c.azienda_id, c.sede_id, !!c.asporto_attivo),
        built_in_tools: sistema(numero, maxP),
      },
    },
  };
  if (c.voce_ai) cc.tts = { voice_id: c.voce_ai };
  return { name: `${locale} — ${lingua === "it" ? "Prenotazioni (IT)" : "Bookings (EN)"}`, conversation_config: cc };
}

/* ---------- stato: configurazione attuale, menu della sede, profilo del locale, domande aperte ---------- */
const pulito = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && !v.length)));

async function profiloLocale(azienda: string, sede: string, menu: any[]) {
  const ids = (menu || []).map((m: any) => m.id);
  const inMenu = ids.length ? `&menu_id=in.(${ids.join(",")})` : "&menu_id=is.null";
  const [a, s, sale, cat, voci] = await Promise.all([
    rest(`aziende?id=eq.${azienda}&select=tipo_locale,tipo_app,tipo_cucina,descrizione,tags,sito_web,fascia_prezzo&limit=1`).catch(() => []),
    rest(`sedi?id=eq.${sede}&select=nome,tipo,descrizione,tipo_cucina,tags,fascia_prezzo,sito_web,indirizzo,citta&limit=1`).catch(() => []),
    rest(`sale?azienda_id=eq.${azienda}&sede_id=eq.${sede}&attiva=eq.true&select=nome,capienza_max,descrizione`).catch(() => []),
    rest(`menu_categorie?azienda_id=eq.${azienda}${inMenu}&attivo=eq.true&select=nome&order=ordine`).catch(() => []),
    rest(`menu_voci?azienda_id=eq.${azienda}${inMenu}&attivo=eq.true&select=tags,nome&limit=600`).catch(() => []),
  ]);
  const tags = new Set<string>();
  for (const v of voci || []) for (const t of (Array.isArray(v.tags) ? v.tags : [])) if (t) tags.add(String(t).toLowerCase());
  const cerca = (re: RegExp) => (voci || []).some((v: any) => re.test(String(v.nome || "")));
  return pulito({
    azienda: pulito(a?.[0] || {}),
    sede: pulito(s?.[0] || {}),
    sale: (sale || []).map((x: any) => pulito(x)),
    categorie_menu: [...new Set((cat || []).map((c: any) => c.nome))].slice(0, 40),
    etichette_piatti: [...tags].slice(0, 30),
    piatti_senza_glutine: cerca(/glutin|celiac/i) || tags.has("senza glutine") || tags.has("gluten free"),
    menu_bambini: cerca(/bambin|baby|kids/i),
    asporto_menu: (menu || []).filter((m: any) => m.ordinabile && m.ritiro_attivo).map((m: any) => m.nome),
    consegna_menu: (menu || []).filter((m: any) => m.ordinabile && m.consegna_attiva).map((m: any) => m.nome),
  });
}

async function domandeAperte(azienda: string, sede: string) {
  return (await rest(`centralino_domande?azienda_id=eq.${azienda}&sede_id=eq.${sede}&stato=eq.aperta&select=id,domanda,canale,created_at&order=created_at.desc&limit=30`)) || [];
}

async function stato(b: any) {
  const azienda = String(b.azienda_id || ""), sede = String(b.sede_id || "");
  const [cfg, menu, s, dom] = await Promise.all([
    rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=ai_attivo,bot_wa_ai,voce_ai,voce_ai_nome,voce_clonata_id,saluto_ai,info_extra,info_auto,info_auto_at,info_auto_fonti,numero_trasferimento,max_persone_ai,menu_id_voce,asporto_attivo,agente_it,agente_en,ai_aggiornato_at&limit=1`),
    rest(`menu?azienda_id=eq.${azienda}&sede_id=eq.${sede}&attivo=eq.true&select=id,nome,ordinabile,ritiro_attivo,consegna_attiva`),
    rest(`sedi?id=eq.${sede}&azienda_id=eq.${azienda}&select=nome&limit=1`),
    domandeAperte(azienda, sede),
  ]);
  const out: any = { sede: s?.[0]?.nome || null, config: cfg?.[0] || null, menu_disponibili: menu || [], modulo_voce: await moduloVoce(azienda), domande_aperte: dom };
  if (b.profilo) {
    out.profilo_locale = await profiloLocale(azienda, sede, menu || []);
    // per Tony la scheda deve essere fresca: se manca o ha piu' di un giorno la rifaccio adesso
    const c0 = out.config;
    if (!c0?.info_auto_at || Date.now() - new Date(c0.info_auto_at).getTime() > 86400 * 1000) {
      const r = await imparaOra(azienda, sede);
      if (r?.ok) out.config = { ...(c0 || {}), info_auto: r.scheda, info_auto_at: r.aggiornata, info_auto_fonti: r.fonti };
    }
  }
  return out;
}

/* ---------- scheda del locale scritta dall'app (centralino-impara) ---------- */
async function imparaOra(azienda: string, sede: string) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/centralino-impara`, {
    method: "POST", headers: { "x-centralino-key": CENTRALINO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ azienda_id: azienda, sede_id: sede }),
  });
  return await r.json().catch(() => ({ errore: "risposta non valida" }));
}

/* ---------- risposte alle domande dei clienti: entrano nelle informazioni del locale ---------- */
async function rispondiDomande(b: any) {
  const azienda = String(b.azienda_id || ""), sede = String(b.sede_id || "");
  const lista: any[] = Array.isArray(b.risposte) ? b.risposte.slice(0, 30) : [];
  const ids = lista.map((x) => String(x.id || "")).filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  if (!ids.length) return { errore: "Nessuna domanda" };
  const dom = await rest(`centralino_domande?id=in.(${ids.join(",")})&azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=id,domanda`);
  const per = new Map((dom || []).map((d: any) => [d.id, d.domanda]));
  const righe: string[] = [];
  let fatte = 0;
  for (const x of lista) {
    const q = per.get(String(x.id));
    if (!q) continue;
    const risp = String(x.risposta || "").replace(/\s+/g, " ").trim().slice(0, 400);
    const ignora = x.ignora === true || !risp;
    await rest(`centralino_domande?id=eq.${x.id}`, { method: "PATCH", body: JSON.stringify({ stato: ignora ? "ignorata" : "risposta", risposta: ignora ? null : risp, risolta_at: new Date().toISOString() }) });
    if (!ignora) righe.push(`- ${q.replace(/[?\s]+$/, "")}? ${risp}`);
    fatte++;
  }
  if (righe.length) {
    const c = (await rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=info_extra&limit=1`))?.[0];
    const prima = String(c?.info_extra || "").trim();
    const info = (prima ? prima + "\n" : "") + righe.join("\n");
    await salva({ azienda_id: azienda, sede_id: sede, info_extra: info.slice(-4000) });
  }
  return { ok: true, fatte, aggiunte: righe.length, domande_aperte: await domandeAperte(azienda, sede) };
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
    menu_id_voce: /^[0-9a-f-]{36}$/i.test(String(b.menu_id_voce || "")) ? b.menu_id_voce : null,
    asporto_attivo: !!b.asporto_attivo,
    bot_wa_ai: !!b.bot_wa_ai,
    updated_at: new Date().toISOString(),
  };
  const modulo = await moduloVoce(azienda);
  if (!modulo) (campi as any).ai_attivo = false; // senza modulo la voce resta spenta
  // campi non passati restano come sono (Tony puo' cambiarne solo alcuni)
  for (const k of Object.keys(campi)) if (k !== "updated_at" && !(k in b)) delete (campi as any)[k];
  let c = (await rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=*&limit=1`))?.[0];
  if (c) c = (await rest(`centralino_config?id=eq.${c.id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(campi) }))[0];
  else c = (await rest(`centralino_config`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ azienda_id: azienda, sede_id: sede, ...campi }) }))[0];

  if (!modulo) return { ok: true, config: c, modulo_voce: false, trasferimento: "voce non attiva: salvato solo il bot WhatsApp e le informazioni" };
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
  return { ok: true, config: fin, modulo_voce: true, trasferimento: numero ? "attivo" : "senza numero: la voce prende nome e numero per farli richiamare" };
}

/* ---------- chiamate: sincronizzo da ElevenLabs e riassumo il mese ---------- */
async function chiamate(azienda: string, superadmin: boolean) {
  const cfgs = await rest(`centralino_config?azienda_id=eq.${azienda}&select=sede_id,agente_it,agente_en`);
  const prezzi = (await rest(`centralino_prezzi?id=eq.1&select=*`))?.[0] || {};
  const costoMin = Number(prezzi.costo_minuto_usd) || 0.08;
  const righe: any[] = [];
  for (const c of cfgs || []) {
    for (const [lingua, agente] of [["it", c.agente_it], ["en", c.agente_en]] as const) {
      if (!agente) continue;
      let cursor = "", giri = 0;
      do {
        const d = await el("GET", `/v1/convai/conversations?agent_id=${agente}&page_size=100${cursor ? "&cursor=" + cursor : ""}`);
        for (const x of d.conversations || []) {
          const durata = Number(x.call_duration_secs) || 0;
          righe.push({
            conversation_id: x.conversation_id, azienda_id: azienda, sede_id: c.sede_id, agente_id: agente, lingua,
            inizio: x.start_time_unix_secs ? new Date(x.start_time_unix_secs * 1000).toISOString() : null,
            durata_sec: durata, stato: x.status || null, esito: x.call_successful || null,
            costo_usd: Math.round(durata / 60 * costoMin * 10000) / 10000,
            dati: { messaggi: x.message_count ?? null, titolo: x.call_summary_title ?? null, direzione: x.direction ?? null },
          });
        }
        cursor = d.has_more ? d.next_cursor || "" : "";
      } while (cursor && ++giri < 10);
    }
  }
  if (righe.length) {
    await rest(`centralino_chiamate_ai?on_conflict=conversation_id`, {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(righe),
    });
  }
  const inizioMese = new Date(); inizioMese.setUTCDate(1); inizioMese.setUTCHours(0, 0, 0, 0);
  const mese = await rest(`centralino_chiamate_ai?azienda_id=eq.${azienda}&inizio=gte.${inizioMese.toISOString()}&select=durata_sec,costo_usd,sede_id,inizio,esito&order=inizio.desc`);
  const min = (mese || []).reduce((t: number, r: any) => t + (r.durata_sec || 0), 0) / 60;
  const out: any = {
    ok: true,
    mese: { chiamate: (mese || []).length, minuti: Math.round(min * 10) / 10, media_min: mese?.length ? Math.round(min / mese.length * 10) / 10 : 0 },
    ultime: (mese || []).slice(0, 10).map((r: any) => ({ inizio: r.inizio, minuti: Math.round((r.durata_sec || 0) / 6) / 10, esito: r.esito })),
    pacchetto: { minuti_inclusi: prezzi.minuti_inclusi ?? null, canone_mensile_eur: prezzi.canone_mensile_eur ?? null },
  };
  if (superadmin) out.mese.costo_usd = Math.round((mese || []).reduce((t: number, r: any) => t + Number(r.costo_usd || 0), 0) * 100) / 100;
  return out;
}

/* ---------- voce del titolare (clonazione istantanea) ---------- */
async function clona(b: any, u: any) {
  const azienda = String(b.azienda_id || ""), sede = String(b.sede_id || "");
  if (!(await moduloVoce(azienda))) return { errore: "La voce al telefono non è attiva per questo locale" };
  if (b.consenso !== true) return { errore: "Serve il consenso di chi registra la propria voce" };
  const b64 = String(b.audio_base64 || "").split(",").pop() || "";
  if (b64.length < 120_000) return { errore: "Registrazione troppo corta: leggi tutto il testo (almeno un minuto)" };
  const s = (await rest(`sedi?id=eq.${sede}&azienda_id=eq.${azienda}&select=nome`))?.[0];
  if (!s) return { errore: "Sede non trovata" };
  const mime = String(b.mime || "audio/webm");
  const est = /mp4|m4a|aac/.test(mime) ? "m4a" : /ogg/.test(mime) ? "ogg" : /wav/.test(mime) ? "wav" : "webm";
  const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  let c = (await rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=*&limit=1`))?.[0];
  // una sola voce per locale: la vecchia si cancella
  if (c?.voce_clonata_id) await fetch(`https://api.elevenlabs.io/v1/voices/${c.voce_clonata_id}`, { method: "DELETE", headers: { "xi-api-key": EL_KEY } }).catch(() => {});
  const fd = new FormData();
  fd.append("name", `${s.nome} — voce del locale`.slice(0, 90));
  fd.append("description", `Voce clonata col consenso di ${String(b.nome || u.email || "titolare")} per il centralino di ${s.nome}`);
  fd.append("remove_background_noise", "true");
  fd.append("labels", JSON.stringify({ language: "it", uso: "centralino", azienda }));
  fd.append("files", new File([bytes], "voce." + est, { type: mime }));
  const r = await fetch("https://api.elevenlabs.io/v1/voices/add", { method: "POST", headers: { "xi-api-key": EL_KEY }, body: fd });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) return { errore: `ElevenLabs ${r.status}: ${JSON.stringify(out).slice(0, 300)}` };
  const consenso = { user_id: u.id, email: u.email || null, nome: String(b.nome || "").slice(0, 120), testo: String(b.testo_consenso || "").slice(0, 500), data: new Date().toISOString() };
  const campi = { voce_clonata_id: out.voice_id, voce_clonata_consenso: consenso, voce_ai: out.voice_id, voce_ai_nome: "La tua voce", updated_at: new Date().toISOString() };
  if (c) await rest(`centralino_config?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify(campi) });
  else await rest(`centralino_config`, { method: "POST", body: JSON.stringify({ azienda_id: azienda, sede_id: sede, ...campi }) });
  // aggiorno subito gli agenti con la voce nuova
  const agg = await salva({ azienda_id: azienda, sede_id: sede });
  return { ok: true, voice_id: out.voice_id, agenti: agg?.ok === true };
}

async function eliminaVoce(b: any) {
  const azienda = String(b.azienda_id || ""), sede = String(b.sede_id || "");
  const c = (await rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=id,voce_clonata_id,voce_ai&limit=1`))?.[0];
  if (!c?.voce_clonata_id) return { ok: true };
  await fetch(`https://api.elevenlabs.io/v1/voices/${c.voce_clonata_id}`, { method: "DELETE", headers: { "xi-api-key": EL_KEY } }).catch(() => {});
  const campi: any = { voce_clonata_id: null, voce_clonata_consenso: null, updated_at: new Date().toISOString() };
  if (c.voce_ai === c.voce_clonata_id) { campi.voce_ai = null; campi.voce_ai_nome = null; }
  await rest(`centralino_config?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify(campi) });
  await salva({ azienda_id: azienda, sede_id: sede });
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const u = await utente(req);
    if (!u?.id) return json({ errore: "Accesso non valido" }, 401);
    if (!EL_KEY || !CENTRALINO_KEY) return json({ errore: "Centralino AI non configurato sulla piattaforma" }, 400);
    const b = await req.json().catch(() => ({}));
    if (b.azione === "voci") {
      let propria: string | null = null;
      if (b.azienda_id && b.sede_id) propria = (await rest(`centralino_config?azienda_id=eq.${b.azienda_id}&sede_id=eq.${b.sede_id}&select=voce_clonata_id&limit=1`))?.[0]?.voce_clonata_id || null;
      return json(await voci(propria));
    }
    if (["chiamate", "clona", "elimina_voce"].includes(b.azione)) {
      if (!b.azienda_id) return json({ errore: "Serve azienda_id" }, 400);
      if (!(await puoGestire(u.id, b.azienda_id))) return json({ errore: "Solo l'admin del locale" }, 403);
      if (b.azione === "chiamate") return json(await chiamate(b.azienda_id, u.id === SUPERADMIN));
      if (!b.sede_id) return json({ errore: "Serve sede_id" }, 400);
      if (b.azione === "clona") return json(await clona(b, u));
      return json(await eliminaVoce(b));
    }
    if (b.azione === "stato") {
      if (!b.azienda_id || !b.sede_id) return json({ errore: "Servono azienda_id e sede_id" }, 400);
      if (!(await puoGestire(u.id, b.azienda_id))) return json({ errore: "Solo l'admin del locale" }, 403);
      return json(await stato(b));
    }
    if (b.azione === "impara") {
      if (!b.azienda_id || !b.sede_id) return json({ errore: "Servono azienda_id e sede_id" }, 400);
      if (!(await puoGestire(u.id, b.azienda_id))) return json({ errore: "Solo l'admin del locale" }, 403);
      return json(await imparaOra(b.azienda_id, b.sede_id));
    }
    if (b.azione === "rispondi_domande") {
      if (!b.azienda_id || !b.sede_id) return json({ errore: "Servono azienda_id e sede_id" }, 400);
      if (!(await puoGestire(u.id, b.azienda_id))) return json({ errore: "Solo l'admin del locale" }, 403);
      return json(await rispondiDomande(b));
    }
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
