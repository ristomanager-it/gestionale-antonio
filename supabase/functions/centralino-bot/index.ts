// centralino-bot — il bot WhatsApp con AI (incluso nel piano): stesse azioni della voce al telefono
// (posti liberi, prenotazione, orari/info, menu alla carta, menu del giorno, link del menu, ordini da asporto).
// Chiamato da whatsapp-webhook con header x-centralino-key quando la sede ha bot_wa_ai = true.
// POST { azienda_id, sede_id, telefono, testo, nome, campagna? }  ->  { gestito, risposta, passa_a_persona }
// campagna = da dove arriva il cliente (codice "rif:" di una campagna, annuncio Meta): resta valida per tutta la conversazione
// e finisce nella prenotazione (source / riferimento), come faceva il vecchio bot a domande.
// verify_jwt = false (chiamata server-server protetta dalla chiave).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_KEY") ?? "";
const CENTRALINO_KEY = Deno.env.get("CENTRALINO_KEY") ?? "";
const MODELLO = Deno.env.get("CENTRALINO_BOT_MODEL") || "claude-haiku-4-5-20251001";

function anthropicKey(): string {
  const env = Deno.env.toObject();
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_KEY", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY_AI"]) if (env[k] && String(env[k]).trim()) return String(env[k]).trim();
  for (const [, v] of Object.entries(env)) if (typeof v === "string" && v.trim().startsWith("sk-ant-")) return v.trim();
  return "";
}
const ANTHROPIC_KEY = anthropicKey();

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
    { name: "passa_a_persona", description: "Il cliente chiede una persona, o è un gruppo numeroso, un evento, un reclamo, o una domanda a cui gli strumenti non rispondono: avvisa lo staff, che risponderà qui in chat.",
      input_schema: { type: "object", properties: { motivo: { type: "string" } }, required: ["motivo"] } },
  ];
  if (asporto) t.push({ name: "ordina", description: "Ordine da asporto (ritiro al locale, si paga al ritiro). Prima conferma=false per riepilogo e totale, poi conferma=true dopo il sì del cliente.",
    input_schema: { type: "object", properties: {
      ordine: { type: "string", description: "Piatti separati da punto e virgola, quantità davanti: 2 margherita; 1 diavola senza piccante" },
      conferma: { type: "boolean" }, orario: { type: "string", description: "HH:MM di ritiro" }, nome: { type: "string" }, allergie: { type: "string" } },
      required: ["ordine", "conferma"] } });
  return t;
}

function istruzioni(locale: string, c: any, nome: string | null, camp: any) {
  const maxP = Number(c.max_persone_ai) || 12;
  const extra = String(c.info_extra || "").trim().slice(0, 4000);
  return `Sei l'assistente WhatsApp di "${locale}", un ristorante italiano. Rispondi ai clienti in chat.

STILE
- Messaggi brevi da chat (2-5 righe), cordiali, qualche emoji con misura. Niente elenchi lunghi: riassumi e chiedi se vuole altro.
- Rispondi nella lingua del cliente. Dai del Lei, a meno che il cliente non dia del tu.
- Il numero di telefono del cliente lo conosci già (scrive da WhatsApp): non chiederlo.${nome ? `\n- Il nome sul suo profilo WhatsApp è "${nome}": usalo per la prenotazione, chiedendo conferma solo se sembra un soprannome.` : ""}

COSA FAI
- PRENOTAZIONI: chiedi giorno, ora e persone; usa verifica_disponibilita; se pieno proponi al massimo tre orari liberi. Chiedi intolleranze o richieste. Fai un riepilogo e solo dopo il sì chiama prenota. Poi conferma che è registrata.
- Per "domani", "sabato" ecc. se non sai la data di oggi chiama info_locale.
- ORARI, INDIRIZZO, PIATTO/MENU DEL GIORNO, TIPO DI CUCINA: info_locale.
- MENU ALLA CARTA E PREZZI: menu_locale (per categoria o cercando il piatto).
- Se vuole VEDERE il menu o prenotare da solo: chiama link e scrivigli il link.
${c.asporto_attivo ? "- ORDINI DA ASPORTO: usa ordina, prima con conferma=false (riepilogo e totale), chiedi orario di ritiro e nome, poi conferma=true dopo il sì. Si paga al ritiro. La consegna a domicilio non la prendi in chat: manda il link del menu." : "- Ordini da asporto in chat non si prendono: manda il link del menu."}
- DOMANDE A CUI NON SAI RISPONDERE (non sono negli strumenti né nelle informazioni del locale): chiama domanda_senza_risposta, poi di' che chiedi al personale e gli rispondono qui. Non inventare mai.
- PERSONA DEL LOCALE: gruppi oltre ${maxP} persone, eventi, catering, reclami, domande senza risposta, o se lo chiede: chiama passa_a_persona e scrivi che a breve gli risponde qualcuno del locale.

REGOLE
- Non inventare mai disponibilità, prezzi, piatti, orari o informazioni: usa solo gli strumenti e le informazioni qui sotto.
- Se uno strumento risponde errore_tecnico, scusati e usa passa_a_persona.
- Non dire di essere un modello o un software: sei l'assistente di ${locale}.${camp ? `\n\nDA DOVE ARRIVA IL CLIENTE\n${camp.nota ? `- Arriva dalla campagna "${camp.nota}"${camp.codice ? " (codice " + camp.codice + ")" : ""}: è quello che gli interessa, parti da lì e ricordalo nel riepilogo. Nella prenotazione metti "${camp.nota}" all'inizio delle note.` : camp.fonte === "meta_ads" ? `- Arriva da un annuncio${camp.ads?.annuncio ? ' ("' + camp.ads.annuncio + '")' : ""}: accoglilo e aiutalo a prenotare.` : `- Arriva da: ${camp.fonte || camp.codice}.`}${camp.flusso === "menu_business" ? "\n- Menu business: vale dal lunedì al venerdì, a pranzo e a cena. Se chiede un altro giorno diglielo con garbo." : ""}` : ""}${extra ? `\n\nINFORMAZIONI DEL LOCALE (scritte dal ristorante):\n${extra}` : ""}`;
}

async function registraConsumo(azienda: string, usage: any, ms: number, rif: string) {
  try {
    const l = (await rest(`ai_listino?modello=eq.${encodeURIComponent(MODELLO)}&select=input_per_mtok,output_per_mtok&order=valido_dal.desc&limit=1`))?.[0];
    const costo = l ? (usage.input / 1e6) * Number(l.input_per_mtok) + (usage.output / 1e6) * Number(l.output_per_mtok) : null;
    await rest("ai_consumi", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
      azienda_id: azienda, funzione: "centralino_bot", modello: MODELLO, input_tokens: usage.input, output_tokens: usage.output,
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
    const s = (await rest(`sedi?id=eq.${sede}&select=nome&limit=1`))?.[0];
    const locale = s?.nome || "il ristorante";

    // ultimi messaggi della conversazione (memoria di 3 ore)
    const da = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    const storia = (await rest(`centralino_bot_messaggi?azienda_id=eq.${azienda}&telefono=eq.${telefono}&created_at=gte.${da}&select=ruolo,contenuto&order=created_at.desc&limit=12`)) || [];
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
    for (let giro = 0; giro < 6; giro++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODELLO, max_tokens: 900, system: istruzioni(locale, c, b.nome || null, camp), tools: strumenti(!!c.asporto_attivo), messages: pulita }),
      });
      if (!r.ok) { console.error("Claude", r.status, (await r.text()).slice(0, 300)); return json({ gestito: false }); }
      const d = await r.json();
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
        else if (u.name === "passa_a_persona") { passa = String(i.motivo || "richiesta del cliente"); out = { ok: true }; }
        else out = { errore: "strumento sconosciuto" };
        risultati.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out).slice(0, 12000) });
      }
      pulita.push({ role: "user", content: risultati });
    }
    if (!risposta) return json({ gestito: false });

    await rest("centralino_bot_messaggi", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([
      { azienda_id: azienda, sede_id: sede, telefono, ruolo: "user", contenuto: testo, contesto: b.campagna && typeof b.campagna === "object" ? b.campagna : null },
      { azienda_id: azienda, sede_id: sede, telefono, ruolo: "assistant", contenuto: risposta.slice(0, 4000), contesto: null },
    ]) });
    await registraConsumo(azienda, usage, Date.now() - t0, telefono.slice(-4));
    return json({ gestito: true, risposta, passa_a_persona: passa });
  } catch (e) {
    console.error("centralino-bot:", e);
    return json({ gestito: false });
  }
});
