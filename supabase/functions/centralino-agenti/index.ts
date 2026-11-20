// centralino-agenti — la voce AI del centralino configurata dal locale stesso (pagina "Centralino AI").
// Chi puo': admin dell'azienda o superadmin. verify_jwt = true.
// POST { azione: "voci" }                                    -> elenco voci con anteprima
// POST { azione: "salva", azienda_id, sede_id, ...campi }    -> salva centralino_config e crea/aggiorna gli agenti IT/EN su ElevenLabs
// POST { azione: "chiamate", azienda_id }                    -> sincronizza le chiamate da ElevenLabs e restituisce il riepilogo del mese
// POST { azione: "clona", azienda_id, sede_id, audio_base64, mime, consenso, nome } -> crea la voce del titolare (modulo voce)
// POST { azione: "elimina_voce", azienda_id, sede_id }        -> cancella la voce clonata del locale
// POST { azione: "stato", azienda_id, sede_id, profilo? }     -> configurazione, menu, domande aperte (+ profilo del locale per Tony)
// POST { azione: "impara", azienda_id, sede_id }             -> rifa' subito la scheda del locale (centralino-impara)
// POST { azione: "paga_voce", azienda_id, sede_id }          -> pagamento Stripe una tantum per registrare la voce del titolare
// Tipi di centralino (tipo_centralino): ristorante (prenota tavoli), eventi (location: informazioni e richiamata del responsabile),
// ristoflow (commerciale: informazioni, attivazione, lead nel CRM). lingue = lingue del numero: l'agente italiano passa da solo a quella di chi chiama.
// Server-server: header x-deploy-key (deploy_config) vale come superadmin.
// POST { azione: "richiamata_fatta", azienda_id, id }          -> il cliente e' stato richiamato
// POST { azione: "rispondi_domande", azienda_id, sede_id, risposte:[{id,risposta|ignora}] } -> le risposte entrano nelle info del locale
// Il bot WhatsApp (bot_wa_ai) e' incluso nel piano; la voce al telefono e' il modulo a pagamento "centralino_voce".
// Gli agenti hanno il bursting attivo: nei picchi le chiamate oltre il limite del piano ElevenLabs passano (fino a 3x, pagate il doppio).
// asporto_pezzi_fascia: massimo di pezzi da asporto per fascia di 15 minuti (lo controlla centralino-strumenti).
// Secrets: ELEVENLABS_API_KEY, CENTRALINO_KEY.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_KEY") ?? "";
const EL_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
const CENTRALINO_KEY = Deno.env.get("CENTRALINO_KEY") ?? "";
const SUPERADMIN = "5da91398-947a-4f13-bdaa-f2a593c03e54";

function stripeKey(): string {
  const env = Deno.env.toObject();
  for (const k of ["STRIPE_SECRET_KEY", "STRIPE_API_KEY", "STRIPE_SK", "STRIPE_KEY"]) if (env[k] && String(env[k]).trim()) return String(env[k]).trim();
  for (const [, v] of Object.entries(env)) if (typeof v === "string" && v.trim().startsWith("sk_")) return v.trim();
  return "";
}

/* ---------- voce del titolare a pagamento: prima il pagamento (Stripe), poi la registrazione ---------- */
async function prezzoVoce(): Promise<number> {
  const p = (await rest(`centralino_prezzi?id=eq.1&select=prezzo_voce_eur`))?.[0];
  return Number(p?.prezzo_voce_eur ?? 9.9) || 0;
}
async function vocePagata(azienda: string, sede: string, uid: string): Promise<boolean> {
  if (uid === SUPERADMIN) return true;
  if ((await prezzoVoce()) <= 0) return true;
  const c = (await rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=voce_clonata_pagata,voce_clonata_id&limit=1`))?.[0];
  return c?.voce_clonata_pagata === true || !!c?.voce_clonata_id; // chi l'aveva gia' prima del pagamento la puo' rifare
}
async function pagaVoce(b: any) {
  const azienda = String(b.azienda_id || ""), sede = String(b.sede_id || "");
  if (!(await moduloVoce(azienda))) return { errore: "La voce al telefono non è attiva per questo locale" };
  const prezzo = await prezzoVoce();
  if (prezzo <= 0) return { ok: true, gratis: true };
  const SK = stripeKey();
  if (!SK) return { errore: "Pagamenti non configurati" };
  const [s, az] = await Promise.all([
    rest(`sedi?id=eq.${sede}&azienda_id=eq.${azienda}&select=nome&limit=1`),
    rest(`aziende?id=eq.${azienda}&select=nome&limit=1`),
  ]);
  if (!s?.[0]) return { errore: "Sede non trovata" };
  const ritorno = String(b.ritorno || "https://app.ristoflow-ai.com/#/centralino-ai");
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("success_url", ritorno + (ritorno.includes("?") ? "&" : "?") + "voce=pagata");
  f.set("cancel_url", ritorno + (ritorno.includes("?") ? "&" : "?") + "voce=annullata");
  f.set("client_reference_id", azienda);
  f.set("line_items[0][quantity]", "1");
  f.set("line_items[0][price_data][currency]", "eur");
  f.set("line_items[0][price_data][unit_amount]", String(Math.round(prezzo * 100)));
  f.set("line_items[0][price_data][product_data][name]", `Voce del locale — ${s[0].nome}`);
  f.set("line_items[0][price_data][product_data][description]", "Registrazione e creazione della tua voce per il centralino: telefono e vocali WhatsApp.");
  f.set("metadata[tipo]", "voce_clonata");
  f.set("metadata[azienda_id]", azienda);
  f.set("metadata[sede_id]", sede);
  f.set("metadata[azienda_nome]", String(az?.[0]?.nome || ""));
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST", headers: { Authorization: "Bearer " + SK, "Content-Type": "application/x-www-form-urlencoded" }, body: f.toString(),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { errore: d?.error?.message || ("Stripe " + r.status) };
  return { ok: true, url: d.url, prezzo };
}

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
   - "fascia_piena": a quell'ora la cucina è piena. Proponi il primo degli orari_liberi ("per le 20:00 siamo pieni, posso dargliela alle 20:30?"); se accetta richiama ordina con conferma=true e il nuovo orario, altrimenti proponi gli altri.
4. Dì che l'ordine è registrato e che riceverà il riepilogo su WhatsApp da confermare con «Confermo».
- Consegna a domicilio: non la prendi al telefono, proponi di mandare il link del menu con invia_link per ordinare online.` : `
ORDINI
- Al telefono non si prendono ordini da asporto: proponi di mandare il link del menu con invia_link.`}

EVENTI E RICHIESTE PARTICOLARI (feste, compleanni, ricevimenti, catering, gruppi oltre ${maxP} persone, menu personalizzati, torte)
1. Fatti dire in breve cosa vuole organizzare: occasione, data indicativa, quante persone.
2. Chiedi se va bene farlo richiamare dal nostro responsabile: eventi (feste, ricevimenti, catering, gruppi), cucina (menu su misura, diete, torte) o sala (tavoli e allestimenti).
3. Se dice sì: prendi nome e cognome e conferma che il numero {{system__caller_id}} è quello giusto, poi chiama richiedi_richiamata.
4. Digli che il responsabile (usa il suo nome se lo strumento lo restituisce) lo richiama al più presto. Se preferisce parlarci subito, passa la chiamata a un collega.

PASSARE A UN COLLEGA
- Reclami, domande a cui non sai rispondere, o se il cliente chiede una persona: avvisa "Le passo subito un collega" e usa transfer_to_number. Se lo strumento non c'è, chiedi nome e numero e dì che verrà richiamato al più presto.
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
   - "fascia_piena": the kitchen is full at that time. Offer the first of orari_liberi; if they accept call ordina again with conferma=true and the new time.
4. Say the order is registered and they'll get a WhatsApp summary to confirm.
- Home delivery: not by phone, offer the menu link with invia_link to order online.` : `
ORDERS
- Takeaway orders are not taken by phone: offer to send the menu link with invia_link.`}

EVENTS AND SPECIAL REQUESTS (parties, birthdays, weddings, catering, groups over ${maxP}, custom menus, cakes)
1. Ask briefly what they want to organise: occasion, approximate date, number of guests.
2. Ask if they'd like to be called back by our manager: eventi (parties, weddings, catering, groups), cucina (custom menus, diets, cakes) or sala (tables and set-up).
3. If yes: take first and last name, check {{system__caller_id}} is the right number, then call richiedi_richiamata (write motivo in Italian).
4. Tell them the manager (use the name if the tool returns it) will call them back shortly. If they want to talk now, transfer to a colleague.

TRANSFER TO A COLLEAGUE
- Complaints, questions you can't answer, or if the guest asks for a person: say "I'll put you through to a colleague" and use transfer_to_number. If the tool is not available, take name and number and say someone will call back shortly.
- If a tool replies "errore_tecnico", apologise and transfer to a colleague.

RULES
- Never invent availability, prices, dishes or opening hours: only use tool results and the information below.
- If the guest speaks Italian, switch to Italian.
- Never say you are a model or software: you are ${l}'s booking assistant.${extra ? `\n\nRESTAURANT INFORMATION (written by the restaurant in Italian):\n${extra}` : ""}`;
}

/* ---------- lingue: una sola linea di telefono, la voce passa alla lingua di chi chiama ---------- */
const LINGUE: Record<string, string> = { it: "italiano", en: "inglese", es: "spagnolo", de: "tedesco", fr: "francese", nl: "olandese" };
const lingueOk = (l: any) => {
  const a = (Array.isArray(l) ? l : ["it", "en"]).map((x: any) => String(x).toLowerCase()).filter((x: string) => LINGUE[x]);
  return [...new Set(["it", ...a])];
};
function saluti(tipo: string, l: string): Record<string, string> {
  if (tipo === "eventi") return {
    it: `Buongiorno, ${l}! Come posso aiutarla per il suo evento?`,
    en: `Hello, this is ${l}! How can I help you with your wedding or event?`,
    es: `¡Hola, le atiende ${l}! ¿En qué puedo ayudarle con su boda o su evento?`,
    de: `Guten Tag, hier ist ${l}! Wie kann ich Ihnen bei Ihrer Hochzeit oder Ihrem Fest helfen?`,
    fr: `Bonjour, ici ${l} ! Comment puis-je vous aider pour votre mariage ou votre événement ?`,
    nl: `Goedendag, met ${l}! Hoe kan ik u helpen met uw bruiloft of evenement?`,
  };
  if (tipo === "ristoflow") return {
    it: `Ciao, sono l'assistente di Ristoflow! Come posso aiutarti?`,
    en: `Hi, this is the Ristoflow assistant! How can I help you?`,
    es: `¡Hola, soy el asistente de Ristoflow! ¿En qué puedo ayudarte?`,
    de: `Hallo, hier ist der Assistent von Ristoflow! Wie kann ich helfen?`,
    fr: `Bonjour, ici l'assistant de Ristoflow ! Comment puis-je vous aider ?`,
    nl: `Hallo, met de assistent van Ristoflow! Waarmee kan ik helpen?`,
  };
  return {
    it: `Buongiorno, ${l}! Sono l'assistente per le prenotazioni. Come posso aiutarla?`,
    en: `Hello, welcome to ${l}! I'm the booking assistant. How can I help you?`,
    es: `¡Hola, bienvenido a ${l}! Soy el asistente de reservas. ¿En qué puedo ayudarle?`,
    de: `Guten Tag, willkommen bei ${l}! Ich bin der Reservierungsassistent. Wie kann ich Ihnen helfen?`,
    fr: `Bonjour, bienvenue chez ${l} ! Je suis l'assistant des réservations. Comment puis-je vous aider ?`,
    nl: `Goedendag, welkom bij ${l}! Ik ben de reserveringsassistent. Waarmee kan ik helpen?`,
  };
}
const regolaLingue = (lingue: string[]) => lingue.length > 1
  ? `\n- Lingue: rispondi nella lingua di chi chiama tra ${lingue.map((x) => LINGUE[x]).join(", ")}. Se parla una di queste, passa subito alla sua lingua (strumento language_detection) e resta in quella. I dati degli strumenti sono in italiano: traducili in modo naturale. Quello che passi agli strumenti (domande, motivo) scrivilo in italiano.`
  : "";

function promptEventi(l: string, extra: string, lingue: string[]) {
  return `Sei la voce che risponde al telefono di "${l}", location per matrimoni, ricevimenti ed eventi privati e aziendali. Tono caldo, elegante e cordiale, frasi brevi e naturali, dai del Lei.

COMPITI: rispondere a chi vuole organizzare un evento, dare le informazioni sulla location e fissare una richiamata con il responsabile eventi. Non prendi prenotazioni di tavoli.

INFORMAZIONI
- Per location, sale, capienze, camere, servizi, pacchetti, prezzi, distanze e come arrivare chiama info_locale: rispondi solo con quello che contiene (scheda_del_locale e cose_da_sapere_dal_locale, che valgono di più). Riassumi, non leggere elenchi.
- I prezzi sono sempre "a partire da": dillo così e spiega che il preventivo preciso lo prepara il responsabile in base a data, invitati e servizi.
- Non sai quali date sono libere: non confermare mai una data. Dì che la verifica il responsabile eventi.
- Se un'informazione non c'è, non inventare: chiama domanda_senza_risposta e proponi la richiamata.

LA RICHIESTA (raccogli con naturalezza, senza interrogatorio)
1. Che evento è (matrimonio, compleanno, battesimo, comunione, laurea, festa aziendale...), la data o il periodo, quanti invitati, se servono camere per gli ospiti.
2. Nome e cognome, e da che paese chiama se parla un'altra lingua.
3. Chiedi se va bene essere richiamato dal nostro responsabile eventi (nella sua lingua, se è straniero). Il numero è {{system__caller_id}}: chiedi conferma.
4. Se dice sì chiama richiedi_richiamata con area "eventi" e tutti i dettagli. Poi digli che il responsabile lo richiama al più presto (usa il nome se lo strumento lo restituisce) e che di solito la proposta arriva entro due giorni.
5. Se vuole vedere foto, pacchetti e il calcolatore, chiama invia_link con cosa="sito" e il suo numero WhatsApp. Dì che l'hai mandato solo se la risposta dice inviato=true.

PASSARE A UN COLLEGA
- Se vuole parlare subito con una persona, o è un fornitore o un reclamo: usa transfer_to_number. Se non c'è, prendi nome e numero con richiedi_richiamata.

REGOLE
- Non inventare mai prezzi, date libere, servizi o informazioni.
- Non dire mai di essere un modello o un software: sei l'assistente di ${l}.${regolaLingue(lingue)}${extra ? `\n\nINFORMAZIONI DEL LOCALE (scritte dalla location, usale per rispondere):\n${extra}` : ""}`;
}

function promptRistoflow(l: string, extra: string, lingue: string[]) {
  return `Sei la voce che risponde al telefono di Ristoflow, il gestionale per la ristorazione nato in cucina: creato da un ristoratore e usato ogni giorno nei suoi locali. Tono amichevole e professionale, frasi brevi, dai del Lei finché il cliente non dà del tu.

CHI CHIAMA: titolari e gestori di bar, ristoranti, pizzerie, catering, hotel, pro loco che vogliono informazioni, prezzi o attivare Ristoflow. Ogni tanto clienti già attivi che hanno bisogno di aiuto.

INFORMAZIONI
- Per funzioni, piani, prezzi, demo ed eventi chiama info_locale e rispondi solo con quello che contiene (cose_da_sapere_dal_locale valgono di più). Prezzi IVA esclusa. Riassumi in due o tre frasi, poi chiedi che locale ha per dirgli il piano giusto.
- Se una cosa non c'è, non inventare: chiama domanda_senza_risposta e proponi la richiamata.

COSA FAI
1. Capisci che locale ha: tipo (bar, ristorante, pizzeria, catering ed eventi, hotel, hotel con ristorante, tasting o pro loco), città, quanti coperti o sedi, cosa usa oggi e cosa gli serve (conti e food cost, personale, clienti e marketing, prenotazioni, fatture).
2. Dagli il piano adatto con il prezzo (mensile; annuale in un'unica soluzione -20%; annuale in 3 rate nei primi 3 mesi -10%). Le demo non si fanno: a chi attiva il pacchetto facciamo la formazione online, per lui e per il suo staff.
3. Prendi nome e cognome, nome del locale e conferma il numero {{system__caller_id}}. Chiedi se va bene essere richiamato per attivare il pacchetto.
4. Se dice sì chiama richiedi_richiamata con area "commerciale" e tutti i dettagli. Poi dì che lo richiamano al più presto.
5. Se vuole guardare il sito, chiama invia_link con cosa="sito" e il suo numero WhatsApp.
- Cliente già attivo con un problema: prendi nome, locale e il problema, e chiama richiedi_richiamata con area "commerciale" scrivendo "assistenza" nel motivo.

REGOLE
- Non inventare mai prezzi, funzioni, sconti o date.
- Non dire mai di essere un modello o un software: sei l'assistente di Ristoflow.${regolaLingue(lingue)}${extra ? `\n\nINFORMAZIONI SU RISTOFLOW (scritte da Ristoflow):\n${extra}` : ""}`;
}

function strumentiExtra(azienda: string, sede: string, tipo: string) {
  const base = `${SUPABASE_URL}/functions/v1/centralino-strumenti?azienda=${azienda}&sede=${sede}`;
  const headers = { "x-centralino-key": CENTRALINO_KEY };
  const w = (name: string, description: string, azione: string, properties: Record<string, unknown>, required?: string[]) => ({
    type: "webhook", name, description,
    api_schema: { url: `${base}&azione=${azione}`, method: "POST", request_headers: headers,
      request_body_schema: { type: "object", properties, ...(required ? { required } : {}) } },
  });
  const comuni = [
    w("info_locale", "Tutte le informazioni da usare per rispondere, e la data di oggi.", "info", {
      data: { type: "string", description: "Vuoto = oggi" },
    }),
    w("invia_link", "Manda al cliente su WhatsApp il link del sito (cosa=sito).", "invia_link", {
      cosa: { type: "string", description: "sito" },
      telefono: { type: "string", description: "Numero WhatsApp del cliente con prefisso internazionale" },
    }, ["cosa", "telefono"]),
    w("domanda_senza_risposta", "Annota una domanda a cui non trovi risposta nelle informazioni. Chiamalo prima di dire che non lo sai.", "domanda", {
      domanda: { type: "string", description: "La domanda del cliente, breve e in italiano" },
      telefono: { type: "string", description: "Numero del cliente ({{system__caller_id}})" },
    }, ["domanda"]),
  ];
  if (tipo === "ristoflow") return [...comuni,
    w("richiedi_richiamata", "Il cliente accetta di essere richiamato per attivare il pacchetto o per assistenza: avvisa subito chi segue i clienti.", "richiamata", {
      area: { type: "string", description: "commerciale" },
      nome: { type: "string", description: "Nome e cognome" },
      telefono: { type: "string", description: "Numero su cui richiamarlo, con prefisso ({{system__caller_id}} se confermato)" },
      motivo: { type: "string", description: "Cosa gli serve, in breve e in italiano (attivazione, prezzi, assistenza...)" },
      nome_locale: { type: "string", description: "Nome del locale" },
      tipo_locale: { type: "string", description: "bar, ristorante, pizzeria, catering, hotel, hotel con ristorante, tasting" },
      citta: { type: "string", description: "Città o zona" },
      coperti: { type: "number", description: "Coperti (o camere) indicativi" },
      piano: { type: "string", description: "Piano che gli interessa, se l'ha detto" },
      lingua: { type: "string", description: "Lingua della telefonata (it, en...)" },
    }, ["area", "telefono", "motivo"])];
  return [...comuni,
    w("richiedi_richiamata", "Il cliente accetta di essere richiamato dal responsabile eventi: lo avvisa subito con tutti i dettagli.", "richiamata", {
      area: { type: "string", description: "eventi" },
      nome: { type: "string", description: "Nome e cognome" },
      telefono: { type: "string", description: "Numero su cui richiamarlo, con prefisso ({{system__caller_id}} se confermato)" },
      motivo: { type: "string", description: "Cosa vuole organizzare, in breve e in italiano" },
      tipo_evento: { type: "string", description: "matrimonio, compleanno, battesimo, comunione, aziendale..." },
      data_evento: { type: "string", description: "Data AAAA-MM-GG o periodo (es. giugno 2027)" },
      invitati: { type: "number", description: "Numero di invitati" },
      camere: { type: "boolean", description: "Servono camere per gli ospiti" },
      paese: { type: "string", description: "Paese da cui chiama, se straniero" },
      lingua: { type: "string", description: "Lingua in cui richiamarlo (it, en, es, de...)" },
    }, ["area", "telefono", "motivo"])];
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
    w("richiedi_richiamata", "Il cliente accetta di essere richiamato da un responsabile del locale: avvisa subito il responsabile di turno dell'area (eventi, cucina o sala).", "richiamata", {
      area: { type: "string", description: "eventi (feste, ricevimenti, catering, gruppi), cucina (menu su misura, diete, torte) o sala (tavoli, allestimenti)" },
      nome: { type: "string", description: "Nome e cognome del cliente" },
      telefono: { type: "string", description: "Numero su cui richiamarlo, con prefisso ({{system__caller_id}} se confermato)" },
      motivo: { type: "string", description: "Cosa vuole organizzare, in breve e in italiano: occasione, data indicativa, persone" },
    }, ["area", "telefono", "motivo"]),
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
  const tipo = String(c.tipo_centralino || "ristorante");
  const lingue = lingueOk(c.lingue);
  const sal = saluti(tipo, locale);
  // l'agente italiano e' quello del numero: sa tutte le lingue scelte e passa da solo alla lingua di chi chiama
  const multi = lingua === "it" ? lingue : ["en"];
  const testo = tipo === "eventi" ? promptEventi(locale, extra, multi)
    : tipo === "ristoflow" ? promptRistoflow(locale, extra, multi)
    : (lingua === "it" ? promptIt(locale, maxP, extra, !!c.asporto_attivo) + regolaLingue(multi) : promptEn(locale, maxP, extra, !!c.asporto_attivo));
  const testoFinale = tipo !== "ristorante" && lingua === "en" ? testo + "\n- Questo numero e' in inglese: parla in inglese (se il cliente parla italiano, passa all'italiano)." : testo;
  const sistemi: any = sistema(numero, maxP);
  if (multi.length > 1) sistemi.language_detection = { type: "system", name: "language_detection", description: "", params: { system_tool_type: "language_detection" } };
  const cc: any = {
    agent: {
      language: lingua,
      first_message: lingua === "it" ? (String(c.saluto_ai || "").trim() || sal.it) : sal.en,
      prompt: {
        prompt: testoFinale,
        tools: tipo === "ristorante" ? strumenti(c.azienda_id, c.sede_id, !!c.asporto_attivo) : strumentiExtra(c.azienda_id, c.sede_id, tipo),
        built_in_tools: sistemi,
      },
    },
  };
  if (multi.length > 1) {
    cc.language_presets = Object.fromEntries(multi.filter((x) => x !== lingua).map((x) => [x, { overrides: { agent: { first_message: sal[x] } } }]));
  }
  if (c.voce_ai) cc.tts = { voice_id: c.voce_ai };
  const etichetta = tipo === "ristorante" ? (lingua === "it" ? "Prenotazioni (IT)" : "Bookings (EN)") : (lingua === "it" ? "Centralino (" + multi.join("/").toUpperCase() + ")" : "Phone (EN)");
  // nei picchi (sabato sera, asporto) le chiamate oltre il limite del piano non vengono rifiutate
  return { name: `${locale} — ${etichetta}`, conversation_config: cc, platform_settings: { call_limits: { bursting_enabled: true } } };
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
    rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=tipo_centralino,lingue,responsabili,voce_clonata_pagata,ai_attivo,bot_wa_ai,risposta_vocale,voce_ai,voce_ai_nome,voce_clonata_id,saluto_ai,info_extra,info_auto,info_auto_at,info_auto_fonti,numero_trasferimento,max_persone_ai,menu_id_voce,asporto_attivo,asporto_pezzi_fascia,agente_it,agente_en,ai_aggiornato_at&limit=1`),
    rest(`menu?azienda_id=eq.${azienda}&sede_id=eq.${sede}&attivo=eq.true&select=id,nome,ordinabile,ritiro_attivo,consegna_attiva`),
    rest(`sedi?id=eq.${sede}&azienda_id=eq.${azienda}&select=nome&limit=1`),
    domandeAperte(azienda, sede),
  ]);
  const [dip, rich] = await Promise.all([
    rest(`dipendenti?azienda_id=eq.${azienda}&attivo=eq.true&select=id,nome,cognome,telefono,user_id,sede_id&order=nome`).catch(() => []),
    rest(`centralino_richiamate?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=id,area,nome,telefono,motivo,responsabile_nome,stato,created_at&order=created_at.desc&limit=15`).catch(() => []),
  ]);
  const out: any = { sede: s?.[0]?.nome || null, config: cfg?.[0] || null,
    persone: (dip || []).map((d: any) => ({ id: d.id, nome: [d.nome, d.cognome].filter(Boolean).join(" "), whatsapp: !!d.telefono, app: !!d.user_id, sede_id: d.sede_id })),
    richiamate: rich || [], menu_disponibili: menu || [], modulo_voce: await moduloVoce(azienda), domande_aperte: dom, prezzo_voce_eur: await prezzoVoce() };
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

/* ---------- chi richiama i clienti: { eventi:[dipendente_id], cucina:[...], sala:[...] } ---------- */
function pulisciResponsabili(r: any) {
  const out: Record<string, string[]> = {};
  for (const a of ["eventi", "cucina", "sala", "commerciale"]) {
    const l = Array.isArray(r?.[a]) ? r[a] : [];
    out[a] = [...new Set(l.map(String).filter((x: string) => /^[0-9a-f-]{36}$/i.test(x)))].slice(0, 4) as string[];
  }
  return out;
}
async function richiamataFatta(b: any, uid: string) {
  if (!/^[0-9a-f-]{36}$/i.test(String(b.id || ""))) return { errore: "id mancante" };
  await rest(`centralino_richiamate?id=eq.${b.id}&azienda_id=eq.${b.azienda_id}`, { method: "PATCH", body: JSON.stringify({ stato: "richiamato", chiusa_at: new Date().toISOString(), chiusa_da: uid }) });
  return { ok: true };
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
    asporto_pezzi_fascia: Number(b.asporto_pezzi_fascia) > 0 ? Math.min(500, Math.round(Number(b.asporto_pezzi_fascia))) : null,
    bot_wa_ai: !!b.bot_wa_ai,
    risposta_vocale: b.risposta_vocale !== false,
    responsabili: pulisciResponsabili(b.responsabili),
    tipo_centralino: ["ristorante", "eventi", "ristoflow"].includes(String(b.tipo_centralino)) ? String(b.tipo_centralino) : "ristorante",
    lingue: lingueOk(b.lingue),
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
  if (!(await vocePagata(azienda, sede, u.id))) return { errore: "Prima va fatto il pagamento della voce", da_pagare: true };
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
  // una voce in piu' su ElevenLabs: ricontrollo subito quante ne restano libere nel piano
  fetch(`${SUPABASE_URL}/functions/v1/centralino-voci-piattaforma`, { method: "POST", headers: { "x-centralino-key": CENTRALINO_KEY, "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
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
    let u = await utente(req);
    const dk = String(req.headers.get("x-deploy-key") || "").trim();
    if (!u?.id && dk) {
      const k = (await rest(`deploy_config?id=eq.1&select=chiave&limit=1`).catch(() => []))?.[0];
      if (k?.chiave && String(k.chiave).trim() === dk) u = { id: SUPERADMIN, email: "deploy" };
    }
    if (!u?.id) return json({ errore: "Accesso non valido" }, 401);
    if (!EL_KEY || !CENTRALINO_KEY) return json({ errore: "Centralino AI non configurato sulla piattaforma" }, 400);
    const b = await req.json().catch(() => ({}));
    if (b.azione === "voci") {
      let propria: string | null = null;
      if (b.azienda_id && b.sede_id) propria = (await rest(`centralino_config?azienda_id=eq.${b.azienda_id}&sede_id=eq.${b.sede_id}&select=voce_clonata_id&limit=1`))?.[0]?.voce_clonata_id || null;
      return json(await voci(propria));
    }
    if (b.azione === "paga_voce") {
      if (!b.azienda_id || !b.sede_id) return json({ errore: "Servono azienda_id e sede_id" }, 400);
      if (!(await puoGestire(u.id, b.azienda_id))) return json({ errore: "Solo l'admin del locale" }, 403);
      return json(await pagaVoce(b));
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
    if (b.azione === "richiamata_fatta") {
      if (!b.azienda_id) return json({ errore: "Serve azienda_id" }, 400);
      if (!(await puoGestire(u.id, b.azienda_id))) return json({ errore: "Solo l'admin del locale" }, 403);
      return json(await richiamataFatta(b, u.id));
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
