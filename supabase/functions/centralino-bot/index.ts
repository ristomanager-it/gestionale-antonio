// centralino-bot — il bot WhatsApp con AI (incluso nel piano): stesse azioni della voce al telefono
// (posti liberi, prenotazione, orari/info, menu alla carta, menu del giorno, link del menu, ordini da asporto).
// Chiamato da whatsapp-webhook con header x-centralino-key quando la sede ha bot_wa_ai = true.
// POST { azienda_id, sede_id, telefono, testo, nome, campagna?, vocale? }  ->  { gestito, risposta, passa_a_persona, audio_b64?, link? }
// vocale = il cliente ha mandato un vocale (trascritto): se il locale ha la voce (modulo a pagamento) e risposta_vocale e' acceso,
// la risposta torna anche come audio nella voce del locale (ElevenLabs, formato ogg/opus per i vocali WhatsApp).
// campagna = da dove arriva il cliente (codice "rif:" di una campagna, annuncio Meta): resta valida per tutta la conversazione
// e finisce nella prenotazione (source / riferimento), come faceva il vecchio bot a domande.
// verify_jwt = false (chiamata server-server protetta dalla chiave).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_KEY") ?? "";
const CENTRALINO_KEY = Deno.env.get("CENTRALINO_KEY") ?? "";
const MODELLO = Deno.env.get("CENTRALINO_BOT_MODEL") || "claude-haiku-4-5-20251001";
// il bot commerciale di Ristoflow vende: modello piu' bravo nelle conversazioni (se non risponde si torna a MODELLO)
const MODELLO_VENDITA = Deno.env.get("CENTRALINO_BOT_MODEL_VENDITA") || "claude-sonnet-4-5";

function anthropicKey(): string {
  const env = Deno.env.toObject();
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_KEY", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY_AI"]) if (env[k] && String(env[k]).trim()) return String(env[k]).trim();
  for (const [, v] of Object.entries(env)) if (typeof v === "string" && v.trim().startsWith("sk-ant-")) return v.trim();
  return "";
}
const ANTHROPIC_KEY = anthropicKey();
const EL_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";

/* modulo voce (a pagamento): sull'azienda o sul suo piano */
async function moduloVoce(azienda: string): Promise<boolean> {
  try {
    const a = (await rest(`aziende?id=eq.${azienda}&select=features,piano_id&limit=1`))?.[0] || {};
    if (a.features?.centralino_voce === true) return true;
    if (!a.piano_id) return false;
    const p = (await rest(`piani_abbonamento?id=eq.${a.piano_id}&select=features&limit=1`))?.[0];
    return p?.features?.centralino_voce === true;
  } catch { return false; }
}

// il testo da dire a voce: niente link, emoji, asterischi; i link si mandano scritti a parte
function perLaVoce(t: string) {
  const link = [...new Set((t.match(/https?:\/\/\S+/g) || []).map((x) => x.replace(/[).,;]+$/, "")))];
  let v = t.replace(/https?:\/\/\S+/g, link.length ? "il link è qui sotto" : "")
    .replace(/[*_~`#>]/g, "")
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "")
    .replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
  return { voce: v.slice(0, 900), link };
}

async function sintesi(voiceId: string, testo: string) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=opus_48000_64`, {
    method: "POST", headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json", Accept: "audio/ogg" },
    body: JSON.stringify({ text: testo, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
  });
  if (!r.ok) { console.error("tts:", r.status, (await r.text()).slice(0, 300)); return null; }
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path.split("?")[0]}: ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

async function strumento(azienda: string, sede: string, azione: string, body: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/centralino-strumenti?azienda=${azienda}&sede=${sede}&azione=${azione}&canale=whatsapp`, {
    method: "POST", headers: { "x-centralino-key": CENTRALINO_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { esito: "errore_tecnico", dettaglio: t.slice(0, 200) }; }
}

function strumenti(asporto: boolean) {
  const t: any[] = [
    { name: "verifica_disponibilita", description: "Controlla se c'è posto per un giorno, un'ora e un numero di persone. Se è pieno restituisce gli orari liberi.",
      input_schema: { type: "object", properties: {
        data: { type: "string", description: "AAAA-MM-GG" }, ora: { type: "string", description: "HH:MM" }, persone: { type: "number" } }, required: ["persone"] } },
    { name: "prenota", description: "Registra la prenotazione. Solo dopo che il cliente ha confermato il riepilogo.",
      input_schema: { type: "object", properties: {
        data: { type: "string" }, ora: { type: "string" }, persone: { type: "number" }, nome: { type: "string" }, cognome: { type: "string" },
        intolleranze: { type: "string" }, note: { type: "string" } }, required: ["data", "ora", "persone", "nome"] } },
    { name: "info_locale", description: "Indirizzo, telefono, orari di apertura, tipo di cucina, menu del giorno con prezzo e data di oggi.",
      input_schema: { type: "object", properties: { data: { type: "string", description: "AAAA-MM-GG del menu del giorno richiesto; vuoto = oggi" } } } },
    { name: "menu_locale", description: "Menu alla carta con i prezzi, per categoria o cercando un piatto.",
      input_schema: { type: "object", properties: { categoria: { type: "string" }, cerca: { type: "string" } } } },
    { name: "link", description: "Restituisce il link da scrivere al cliente: cosa=menu (menu online, anche per ordinare a domicilio) o cosa=prenota (prenotazione online).",
      input_schema: { type: "object", properties: { cosa: { type: "string", enum: ["menu", "prenota"] } }, required: ["cosa"] } },
    { name: "domanda_senza_risposta", description: "Il cliente chiede qualcosa che non trovi negli strumenti né nelle informazioni del locale (es. cani ammessi, sala per feste, POS, seggioloni): annota la domanda per il locale. Chiamalo PRIMA di dire che non lo sai.",
      input_schema: { type: "object", properties: { domanda: { type: "string", description: "la domanda del cliente, breve e chiara" } }, required: ["domanda"] } },
    { name: "richiedi_richiamata", description: "Il cliente accetta di essere richiamato da un responsabile del locale: avvisa subito il responsabile di turno dell'area (eventi = feste, ricevimenti, catering, gruppi numerosi; cucina = menu personalizzati, diete particolari, torte; sala = tavoli speciali, allestimenti, servizio). Il numero del cliente lo conosci già.",
      input_schema: { type: "object", properties: {
        area: { type: "string", enum: ["eventi", "cucina", "sala"] },
        nome: { type: "string", description: "nome e cognome del cliente" },
        motivo: { type: "string", description: "cosa vuole organizzare, in breve: occasione, data indicativa, persone" } }, required: ["area", "motivo"] } },
    { name: "passa_a_persona", description: "Il cliente chiede di scrivere con una persona, fa un reclamo, o chiede qualcosa a cui gli strumenti non rispondono: avvisa lo staff, che risponderà qui in chat. Per eventi e gruppi numerosi usa prima richiedi_richiamata.",
      input_schema: { type: "object", properties: { motivo: { type: "string" } }, required: ["motivo"] } },
  ];
  if (asporto) t.push({ name: "ordina", description: "Ordine da asporto (ritiro al locale, si paga al ritiro). Prima conferma=false per riepilogo e totale, poi conferma=true dopo il sì del cliente.",
    input_schema: { type: "object", properties: {
      ordine: { type: "string", description: "Piatti separati da punto e virgola, quantità davanti: 2 margherita; 1 diavola senza piccante" },
      conferma: { type: "boolean" }, orario: { type: "string", description: "HH:MM di ritiro" }, nome: { type: "string" }, allergie: { type: "string" } },
      required: ["ordine", "conferma"] } });
  return t;
}

/* ---------- location eventi e Ristoflow: altri compiti, altre domande ---------- */
const T_INFO = { name: "info_locale", description: "Tutte le informazioni da usare per rispondere (scheda e cose da sapere), il link del sito e la data di oggi.",
  input_schema: { type: "object", properties: {} } };
const T_LINK_SITO = { name: "link", description: "Restituisce il link del sito da scrivere al cliente (cosa=sito).",
  input_schema: { type: "object", properties: { cosa: { type: "string", enum: ["sito"] } }, required: ["cosa"] } };
const T_DOMANDA = { name: "domanda_senza_risposta", description: "Annota una domanda a cui non trovi risposta nelle informazioni. Chiamalo PRIMA di dire che non lo sai.",
  input_schema: { type: "object", properties: { domanda: { type: "string", description: "la domanda, in italiano" } }, required: ["domanda"] } };
const T_PERSONA = { name: "passa_a_persona", description: "Il cliente vuole scrivere con una persona adesso, o un reclamo: avvisa lo staff, che risponde qui in chat.",
  input_schema: { type: "object", properties: { motivo: { type: "string" } }, required: ["motivo"] } };
function strumentiPer(tipo: string, asporto: boolean) {
  if (tipo === "eventi") return [T_INFO, T_LINK_SITO, T_DOMANDA, T_PERSONA,
    { name: "richiedi_richiamata", description: "Il cliente accetta di essere ricontattato dal responsabile eventi: lo avvisa subito con tutti i dettagli. Il numero lo conosci già.",
      input_schema: { type: "object", properties: {
        area: { type: "string", enum: ["eventi"] }, nome: { type: "string" }, motivo: { type: "string", description: "cosa vuole organizzare, in italiano" },
        tipo_evento: { type: "string" }, data_evento: { type: "string", description: "AAAA-MM-GG o periodo" }, invitati: { type: "number" },
        camere: { type: "boolean" }, paese: { type: "string" }, lingua: { type: "string", description: "it, en, es, de..." } },
        required: ["area", "motivo"] } }];
  if (tipo === "ristoflow") return [T_INFO, T_LINK_SITO, T_DOMANDA, T_PERSONA,
    { name: "richiedi_richiamata", description: "Il cliente accetta di essere ricontattato per attivare il pacchetto o per assistenza: avvisa subito chi segue i clienti e lo mette nel CRM.",
      input_schema: { type: "object", properties: {
        area: { type: "string", enum: ["commerciale"] }, nome: { type: "string" }, motivo: { type: "string", description: "attivazione, prezzi, assistenza..., in italiano" },
        nome_locale: { type: "string" }, tipo_locale: { type: "string" }, citta: { type: "string" }, coperti: { type: "number" }, piano: { type: "string" },
        lingua: { type: "string" } }, required: ["area", "motivo"] } }];
  return strumenti(asporto);
}

function intestazione(ora: Date) {
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", ...o }).format(ora);
  const iso = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(ora);
  return `OGGI E' ${fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" })} (${iso}), SONO LE ${fmt({ hour: "2-digit", minute: "2-digit" })}.`;
}
const STILE_COMUNE = `- Messaggi brevi da chat (2-5 righe), cordiali, qualche emoji con misura. Niente elenchi lunghi.
- Formattazione WhatsApp: grassetto con UN solo asterisco (*così*), mai due.
- LINGUA: rispondi SEMPRE nella lingua in cui scrive il cliente (italiano, inglese, spagnolo, tedesco, francese, olandese...) e resta in quella. Le informazioni qui sotto sono in italiano: traducile in modo naturale. Quello che passi agli strumenti scrivilo in italiano.
- Non iniziare con "Perfetto", "Ottimo" se il cliente non ha appena confermato qualcosa. Rispondi SOLO all'ultimo messaggio, senza ripetere quello già detto.
- Se scrive solo "ok", "grazie" a conversazione finita: saluta in una riga; se l'hai già salutato rispondi esattamente [NESSUNA_RISPOSTA].
- Il numero di telefono del cliente lo conosci già: non chiederlo.`;

function istruzioniExtra(tipo: string, locale: string, c: any, nome: string | null, camp: any, vocale: boolean) {
  const extra = String(c.info_extra || "").trim().slice(0, 12000);
  const scheda = String(c.info_auto || "").trim().slice(0, 3200);
  const voc = vocale ? `\n- Il cliente ti ha mandato un VOCALE (trascritto): rispondi come se parlassi, niente elenchi né emoji; i link alla fine. Se il senso non è chiaro, chiedi cosa intende.` : "";
  const nm = nome ? `\n- Il nome sul suo profilo WhatsApp è "${nome}".` : "";
  const cmp = camp ? `\n\nDA DOVE ARRIVA IL CLIENTE\n- ${camp.nota ? `Dalla campagna "${camp.nota}"${camp.codice ? " (codice " + camp.codice + ")" : ""}: parti da lì e scrivilo nel motivo della richiamata.` : camp.fonte === "meta_ads" ? `Da un annuncio${camp.ads?.annuncio ? ' ("' + camp.ads.annuncio + '")' : ""}: è una campagna, spesso dall'estero. Accoglilo nella sua lingua e scrivi la campagna nel motivo della richiamata.` : `Da: ${camp.fonte || camp.codice}.`}` : "";
  const info = `${scheda ? `\n\nSCHEDA (ricavata dall'app):\n${scheda}` : ""}${extra ? `\n\nCOSE DA SAPERE (valgono di più):\n${extra}` : ""}`;
  if (tipo === "ristoflow") return `Sei l'assistente WhatsApp di Ristoflow, il gestionale per la ristorazione nato in cucina: creato da un ristoratore e usato ogni giorno nei suoi locali. Dai del tu se il cliente lo fa, altrimenti del Lei.

${intestazione(new Date())}

STILE
${STILE_COMUNE}${voc}${nm}

COME VENDI (sei un consulente che conosce la ristorazione, non un volantino)
1. Parti dal SUO problema. Se dice cosa non va (personale, turni, buste paga, food cost, magazzino, fatture, prenotazioni, clienti che non tornano, campagne), rispondi prima su quello: 2-3 righe concrete su come Ristoflow lo risolve nella pratica di tutti i giorni, con un esempio da ristoratore. Mai l'elenco di tutte le funzioni.
2. Una sola domanda per messaggio per capire il locale: tipo (bar, ristorante, pizzeria, catering ed eventi, hotel, hotel con ristorante, tasting o pro loco), coperti o dipendenti, sedi, cosa usa oggi.
3. Il prezzo dallo per il piano adatto a lui, non tutto il listino: mensile, annuale unico -20%, 3 rate -10%, e il costo al giorno. Prendi le cifre esatte dalle informazioni.
4. Chiudi ogni messaggio con un passo avanti: una domanda sul suo locale oppure "vuoi che ti richiamiamo per attivarlo?".
5. Se vuole attivare o essere ricontattato: chiedi nome e nome del locale e chiama richiedi_richiamata (area "commerciale") con tutti i dettagli, poi digli che lo ricontattiamo al più presto. Le demo non si fanno: a chi attiva il pacchetto facciamo la formazione online, per lui e per il suo staff.

OBIEZIONI (ascolta, dai ragione sul punto giusto, poi rendi concreto)
- "È caro": è un investimento, giusto chiederselo. Poi: costo al giorno del suo piano e cosa sostituisce (gestionale di cassa, ore su fatture e magazzino, consulente per le campagne, fogli Excel dei turni). Proponi la formula annuale o a 3 rate e chiedi quale problema oggi gli costa di più.
- "Ci devo pensare": chiedi con garbo cosa lo frena (prezzo, tempo per imparare, cambiare sistema). Imparare: formazione online compresa per lui e lo staff. Partire: operativi in pochi giorni.
- "Ho già un gestionale": chiedi quale e cosa non gli fa. Ristoflow mette cassa, magazzino, personale e marketing in un'app sola dal telefono. Accenna che per chi passa da un altro gestionale ci sono offerte dedicate molto vantaggiose e che il passaggio lo segue uno dei nostri consulenti: proponi di farlo richiamare (richiedi_richiamata, motivo "passaggio da <gestionale>"). Non dire mai cifre o sconti delle offerte: le presenta il consulente.
- Non promettere mai sconti, prove gratuite o funzioni che non sono nelle informazioni.
- NON FARE CONTI: usa solo le cifre già scritte nelle informazioni (prezzi, rate, costo al giorno, quanto si risparmia). Se una cifra non c'è, non calcolarla.
- Se vuole vedere il sito: chiama link e scrivigli il link.
- Cliente già attivo con un problema: richiedi_richiamata con "assistenza" nel motivo.
- Domande senza risposta nelle informazioni: domanda_senza_risposta, poi di' che lo ricontattiamo. Non inventare mai prezzi, sconti o funzioni.
- Non dire di essere un modello o un software: sei l'assistente di Ristoflow.${cmp}${info}`;
  return `Sei l'assistente WhatsApp di "${locale}", location per matrimoni, ricevimenti ed eventi privati e aziendali. Tono caldo ed elegante, dai del Lei se il cliente non dà del tu.

${intestazione(new Date())}

STILE
${STILE_COMUNE}${voc}${nm}

COSA FAI
- Rispondi su location, spazi, capienze, camere, servizi, pacchetti, prezzi, distanze e come arrivare usando solo le informazioni qui sotto (o info_locale). I prezzi sono "a partire da": il preventivo preciso lo prepara il responsabile in base a data, invitati e servizi.
- Non sai quali date sono libere: non confermare mai una data, la verifica il responsabile eventi.
- Raccogli con naturalezza: che evento è, data o periodo, quanti invitati, se servono camere, nome, e il paese se scrive da fuori Italia.
- Poi chiedi se va bene essere ricontattato dal responsabile eventi (su questo numero WhatsApp o con una chiamata, nella sua lingua). Se dice sì chiama richiedi_richiamata (area "eventi") con tutti i dettagli e digli che di solito la proposta arriva entro due giorni.
- Se vuole vedere foto, pacchetti e il calcolatore: chiama link e scrivigli il link del sito.
- Domande senza risposta nelle informazioni: domanda_senza_risposta, poi di' che chiedi al responsabile e gli rispondete qui. Non inventare mai prezzi, date libere o servizi.
- Se vuole scrivere subito con una persona o è un reclamo: passa_a_persona.
- Non dire di essere un modello o un software: sei l'assistente di ${locale}.${cmp}${info}`;
}

function istruzioni(locale: string, c: any, nome: string | null, camp: any, vocale = false) {
  const tipo = String(c.tipo_centralino || "ristorante");
  if (tipo !== "ristorante") return istruzioniExtra(tipo, locale, c, nome, camp, vocale);
  const maxP = Number(c.max_persone_ai) || 12;
  const extra = String(c.info_extra || "").trim().slice(0, 12000);
  const scheda = String(c.info_auto || "").trim().slice(0, 3200);
  const ora = new Date();
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", ...o }).format(ora);
  const iso = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d);
  const domani = new Date(ora.getTime() + 86400000);
  return `Sei l'assistente WhatsApp di "${locale}", un ristorante italiano. Rispondi ai clienti in chat.

OGGI E' ${fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" })} (${iso(ora)}), SONO LE ${fmt({ hour: "2-digit", minute: "2-digit" })}. Domani e' ${iso(domani)}.
Calcola sempre le date partendo da qui ("oggi", "domani", "sabato", "il 5") e passale agli strumenti come AAAA-MM-GG. Non usare mai date passate.

STILE
- Messaggi brevi da chat (2-5 righe), cordiali, qualche emoji con misura. Niente elenchi lunghi: riassumi e chiedi se vuole altro.
- Formattazione WhatsApp: grassetto con UN solo asterisco (*così*), mai due. Non scrivere mai numeri o codici interni (id della prenotazione).
- Nel riepilogo della prenotazione scrivi sempre il giorno con la data (es. "venerdì 20 novembre alle 14:00"), mai solo "oggi".
- LINGUA: rispondi sempre nella lingua in cui scrive il cliente (italiano, inglese, spagnolo, tedesco...) e resta in quella; le informazioni sono in italiano, traducile. Dai del Lei, a meno che il cliente non dia del tu.
- Se il cliente saluta e basta ("Ciao", "Buongiorno"), saluta e chiedi come puoi aiutarlo (prenotare, menu, informazioni).
- Non iniziare con "Perfetto", "Ottimo" o simili se il cliente non ha appena confermato qualcosa: rispondi subito nel merito.
- Se scrive solo "ok", "grazie" e simili a conversazione finita: saluta in una riga; se l'hai già salutato rispondi esattamente [NESSUNA_RISPOSTA].
- Rispondi SOLO all'ultimo messaggio del cliente: quello che hai già risposto prima non va ripetuto.
- Il numero di telefono del cliente lo conosci già (scrive da WhatsApp): non chiederlo.${vocale ? `\n- Il cliente ti ha mandato un VOCALE (qui trascritto): rispondi come se parlassi, frasi semplici e naturali, niente elenchi né emoji; se devi dare un link mettilo alla fine.\n- La trascrizione di un vocale può essere imprecisa o tagliata: se il senso non è chiaro o sembra un pezzo di frase, non tirare a indovinare (e non dare per scontato che voglia prenotare): chiedi in una frase cosa intende.` : ""}${nome ? `\n- Il nome sul suo profilo WhatsApp è "${nome}": usalo per la prenotazione, chiedendo conferma solo se sembra un soprannome.` : ""}

COSA FAI
- PRENOTAZIONI: chiedi giorno, ora e persone; usa verifica_disponibilita; se pieno proponi al massimo tre orari liberi. Chiedi intolleranze o richieste. Fai un riepilogo e solo dopo il sì chiama prenota. Poi conferma che è registrata.
- Per "domani", "sabato" ecc. se non sai la data di oggi chiama info_locale.
- ORARI, INDIRIZZO, PIATTO/MENU DEL GIORNO, TIPO DI CUCINA: info_locale.
- MENU ALLA CARTA E PREZZI: menu_locale (per categoria o cercando il piatto).
- Se vuole VEDERE il menu o prenotare da solo: chiama link e scrivigli il link.
- Se chiede il menu o "cosa c'è da mangiare": rispondi su quello (menu del giorno con info_locale, alla carta con menu_locale, e il link del menu). Non portare il discorso sulla prenotazione: proponila al massimo una volta, in chiusura, e solo se ha senso.
${c.asporto_attivo ? "- ORDINI DA ASPORTO: usa ordina, prima con conferma=false (riepilogo e totale), chiedi orario di ritiro e nome, poi conferma=true dopo il sì. Se risponde fascia_piena la cucina in quella fascia oraria è piena: proponi il primo degli orari_liberi e richiama con il nuovo orario. Si paga al ritiro. La consegna a domicilio non la prendi in chat: manda il link del menu." : "- Ordini da asporto in chat non si prendono: manda il link del menu."}
- Prima di dire che non sai una cosa, guarda la SCHEDA DEL LOCALE e le COSE DA SAPERE qui sotto.
- DOMANDE A CUI NON SAI RISPONDERE (non sono negli strumenti, nella scheda né nelle cose da sapere): chiama domanda_senza_risposta, poi scrivi in modo naturale che chiedi al personale e gli rispondono qui a breve (es. "Bella domanda! Chiedo subito in sala e le rispondiamo qui a breve."). Non inventare mai.
- EVENTI E RICHIESTE PARTICOLARI (feste, compleanni, ricevimenti, catering, gruppi oltre ${maxP} persone, menu personalizzati): fatti dire in breve cosa vuole organizzare (occasione, data indicativa, persone), poi chiedi se va bene farlo richiamare dal responsabile (eventi, cucina o sala, quello giusto per la richiesta). Se dice sì e hai il nome, chiama richiedi_richiamata e digli che il responsabile lo richiama al più presto su questo numero (usa il nome del responsabile se lo strumento lo restituisce). Se preferisce scrivere, usa passa_a_persona.
- PERSONA DEL LOCALE: reclami, domande senza risposta, o se lo chiede: chiama passa_a_persona e scrivi che a breve gli risponde qualcuno del locale.

REGOLE
- Non inventare mai disponibilità, prezzi, piatti, orari o informazioni: usa solo gli strumenti e le informazioni qui sotto.
- Se uno strumento risponde errore_tecnico, scusati e usa passa_a_persona.
- Non dire di essere un modello o un software: sei l'assistente di ${locale}.${camp ? `\n\nDA DOVE ARRIVA IL CLIENTE\n${camp.nota ? `- Arriva dalla campagna "${camp.nota}"${camp.codice ? " (codice " + camp.codice + ")" : ""}: è quello che gli interessa, parti da lì e ricordalo nel riepilogo. Nella prenotazione metti "${camp.nota}" all'inizio delle note.` : camp.fonte === "meta_ads" ? `- Arriva da un annuncio${camp.ads?.annuncio ? ' ("' + camp.ads.annuncio + '")' : ""}: accoglilo e aiutalo a prenotare.` : `- Arriva da: ${camp.fonte || camp.codice}.`}${camp.flusso === "menu_business" ? "\n- Menu business: vale dal lunedì al venerdì, a pranzo e a cena. Se chiede un altro giorno diglielo con garbo." : ""}` : ""}${scheda ? `\n\nSCHEDA DEL LOCALE (ricavata dall'app: sito, landing, promo, eventi, menu, servizi):\n${scheda}` : ""}${extra ? `\n\nCOSE DA SAPERE SCRITTE DAL RISTORANTE (se contraddicono la scheda, valgono queste):\n${extra}` : ""}`;
}

async function registraConsumo(azienda: string, usage: any, ms: number, rif: string, mod = MODELLO) {
  try {
    const l = (await rest(`ai_listino?modello=eq.${encodeURIComponent(mod)}&select=input_per_mtok,output_per_mtok&order=valido_dal.desc&limit=1`))?.[0];
    const costo = l ? (usage.input / 1e6) * Number(l.input_per_mtok) + (usage.output / 1e6) * Number(l.output_per_mtok) : null;
    await rest("ai_consumi", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
      azienda_id: azienda, funzione: "centralino_bot", modello: mod, input_tokens: usage.input, output_tokens: usage.output,
      cache_read: 0, costo_usd: costo, riferimento: rif, esito: "ok", ms,
    }) });
  } catch (e) { console.warn("consumo:", (e as Error).message); }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ errore: "solo POST" }, 405);
  if (!CENTRALINO_KEY || req.headers.get("x-centralino-key") !== CENTRALINO_KEY) return json({ errore: "non autorizzato" }, 401);
  const t0 = Date.now();
  try {
    const b = await req.json().catch(() => ({}));
    const azienda = String(b.azienda_id || ""), sede = String(b.sede_id || "");
    const telefono = String(b.telefono || "").replace(/\D/g, "");
    const testo = String(b.testo || "").trim().slice(0, 2000);
    if (!azienda || !sede || !telefono || !testo || !ANTHROPIC_KEY) return json({ gestito: false });

    const c = (await rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&bot_wa_ai=eq.true&select=*&limit=1`))?.[0];
    if (!c) return json({ gestito: false });
    // la campagna arriva col primo messaggio; per i successivi la riprendo dalla conversazione
    let camp: any = b.campagna && typeof b.campagna === "object" ? b.campagna : null;
    if (!camp) {
      const da6 = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      camp = (await rest(`centralino_bot_messaggi?azienda_id=eq.${azienda}&telefono=eq.${telefono}&contesto=not.is.null&created_at=gte.${da6}&select=contesto&order=created_at.desc&limit=1`))?.[0]?.contesto || null;
    }
    // la scheda del locale manca o e' vecchia: la faccio rifare per i prossimi messaggi (senza aspettare)
    if (!c.info_auto_at || Date.now() - new Date(c.info_auto_at).getTime() > 3 * 86400 * 1000) {
      fetch(`${SUPABASE_URL}/functions/v1/centralino-impara`, { method: "POST", headers: { "x-centralino-key": CENTRALINO_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ azienda_id: azienda, sede_id: sede }) }).catch(() => {});
    }
    const s = (await rest(`sedi?id=eq.${sede}&select=nome&limit=1`))?.[0];
    const locale = s?.nome || "il ristorante";

    // ultimi messaggi della conversazione (memoria di 3 ore)
    const da = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    const storia = (await rest(`centralino_bot_messaggi?azienda_id=eq.${azienda}&telefono=eq.${telefono}&created_at=gte.${da}&select=ruolo,contenuto&order=created_at.desc,ruolo.asc&limit=12`)) || [];
    const messages: any[] = storia.reverse().map((m: any) => ({ role: m.ruolo, content: m.contenuto }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    // ruoli alternati: unisco eventuali messaggi consecutivi dello stesso ruolo
    const pulita: any[] = [];
    for (const m of messages) {
      if (pulita.length && pulita[pulita.length - 1].role === m.role) pulita[pulita.length - 1].content += "\n" + m.content;
      else pulita.push({ ...m });
    }
    if (pulita.length && pulita[pulita.length - 1].role === "user") pulita[pulita.length - 1].content += "\n" + testo;
    else pulita.push({ role: "user", content: testo });

    const usage = { input: 0, output: 0 };
    let passa: string | null = null;
    let risposta = "";
    const sistemaTesto = istruzioni(locale, c, b.nome || null, camp, !!b.vocale);
    const attrezzi = strumentiPer(String(c.tipo_centralino || "ristorante"), !!c.asporto_attivo);
    let modello = String(c.tipo_centralino) === "ristoflow" ? MODELLO_VENDITA : MODELLO;
    const chiedi = async (conStrumenti: boolean) => {
      for (let t = 0; t < 2; t++) {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: modello, max_tokens: 900, system: sistemaTesto, tools: attrezzi, ...(conStrumenti ? {} : { tool_choice: { type: "none" } }), messages: pulita }),
        });
        if (r.ok) return await r.json();
        console.error("Claude", modello, r.status, (await r.text()).slice(0, 300));
        if (modello === MODELLO) return null;
        modello = MODELLO; // il modello di vendita non risponde: riprovo con quello di base
      }
      return null;
    };
    for (let giro = 0; giro < 6; giro++) {
      const d = await chiedi(true);
      if (!d) return json({ gestito: false });
      usage.input += d.usage?.input_tokens || 0; usage.output += d.usage?.output_tokens || 0;
      const blocchi = d.content || [];
      const usi = blocchi.filter((x: any) => x.type === "tool_use");
      if (!usi.length) { risposta = blocchi.filter((x: any) => x.type === "text").map((x: any) => x.text).join("\n").trim(); break; }
      pulita.push({ role: "assistant", content: blocchi });
      const risultati: any[] = [];
      for (const u of usi) {
        const i = u.input || {};
        let out: any;
        if (u.name === "verifica_disponibilita") out = await strumento(azienda, sede, "disponibilita", i);
        else if (u.name === "prenota") out = await strumento(azienda, sede, "prenota", { ...i, telefono: "+" + telefono,
          ...(camp ? { fonte: camp.fonte || "whatsapp", riferimento: { via: "whatsapp_ai", codice: camp.codice ?? null, flusso: camp.flusso ?? null, ads: camp.ads ?? null } } : {}) });
        else if (u.name === "info_locale") out = await strumento(azienda, sede, "info", i);
        else if (u.name === "menu_locale") out = await strumento(azienda, sede, "menu", i);
        else if (u.name === "link") out = await strumento(azienda, sede, "invia_link", { cosa: i.cosa, solo_link: true, telefono: "+" + telefono });
        else if (u.name === "ordina") out = await strumento(azienda, sede, "ordina", { ...i, telefono: "+" + telefono });
        else if (u.name === "domanda_senza_risposta") { out = await strumento(azienda, sede, "domanda", { domanda: i.domanda, telefono: "+" + telefono }); passa = passa || ("domanda: " + String(i.domanda || "").slice(0, 200)); }
        else if (u.name === "richiedi_richiamata") out = await strumento(azienda, sede, "richiamata", { ...i, nome: i.nome || b.nome || null, telefono: "+" + telefono });
        else if (u.name === "passa_a_persona") { passa = String(i.motivo || "richiesta del cliente"); out = { ok: true }; }
        else out = { errore: "strumento sconosciuto" };
        risultati.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out).slice(0, 12000) });
      }
      pulita.push({ role: "user", content: risultati });
    }
    // finiti i giri con gli strumenti senza una risposta: la chiedo adesso, senza strumenti
    if (!risposta) {
      const d = await chiedi(false);
      if (d) {
        usage.input += d.usage?.input_tokens || 0; usage.output += d.usage?.output_tokens || 0;
        risposta = (d.content || []).filter((x: any) => x.type === "text").map((x: any) => x.text).join("\n").trim();
      }
    }
    if (!risposta) return json({ gestito: false });
    risposta = risposta.replace(/\*\*(.+?)\*\*/g, "*$1*").replace(/^#+\s*/gm, "");
    const silenzio = /^\[?NESSUNA_RISPOSTA\]?$/i.test(risposta.trim());
    if (silenzio) risposta = "";

    await rest("centralino_bot_messaggi", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([
      // orari distinti: domanda e risposta devono rileggersi sempre nell'ordine giusto
      { azienda_id: azienda, sede_id: sede, telefono, ruolo: "user", contenuto: testo, contesto: b.campagna && typeof b.campagna === "object" ? b.campagna : null, created_at: new Date(t0).toISOString() },
      { azienda_id: azienda, sede_id: sede, telefono, ruolo: "assistant", contenuto: (risposta || "(nessuna risposta)").slice(0, 4000), contesto: null, created_at: new Date(Math.max(Date.now(), t0 + 1)).toISOString() },
    ]) });
    await registraConsumo(azienda, usage, Date.now() - t0, telefono.slice(-4), modello);

    // al vocale si risponde a voce: serve la voce al telefono (modulo a pagamento), l'opzione accesa e una voce scelta
    const voceId = c.voce_ai || c.voce_clonata_id;
    if (b.vocale && risposta && c.risposta_vocale !== false && voceId && EL_KEY && await moduloVoce(azienda)) {
      const { voce, link } = perLaVoce(risposta);
      const audio = voce ? await sintesi(voceId, voce) : null;
      if (audio) {
        rest("ai_consumi", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
          azienda_id: azienda, funzione: "centralino_vocale", modello: "elevenlabs_multilingual_v2", input_tokens: voce.length, output_tokens: 0,
          cache_read: 0, costo_usd: null, riferimento: telefono.slice(-4), esito: "ok" }) }).catch(() => {});
        return json({ gestito: true, risposta, passa_a_persona: passa, audio_b64: audio, audio_mime: "audio/ogg", testo_parlato: voce, link });
      }
    }
    return json({ gestito: true, risposta, passa_a_persona: passa });
  } catch (e) {
    console.error("centralino-bot:", e);
    return json({ gestito: false });
  }
});
