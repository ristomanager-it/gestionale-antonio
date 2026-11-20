/* =========================================================
   TONY CENTRALINO — Tony monta il centralino AI parlando con l'admin.
   Strumenti per Claude:
   - stato_centralino: configurazione attuale della sede, voci disponibili, menu della sede
   - salva_centralino: salva i campi decisi e aggiorna la voce su ElevenLabs (via centralino-agenti,
     con il token dell'utente: vale il controllo "solo admin del locale")
   Chiamato dall'app (js/views/ai.js) quando si parla di centralino; risponde con fonte "centralino" cosi' i messaggi dopo restano qui,
   e con rimanda=true quando la domanda parla d'altro (l'app la gira al Tony generale).
========================================================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function anthropicKey(): string {
  const env = Deno.env.toObject();
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_KEY", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY_AI"]) {
    if (env[k] && String(env[k]).trim()) return String(env[k]).trim();
  }
  for (const [, v] of Object.entries(env)) {
    if (typeof v === "string" && v.trim().startsWith("sk-ant-")) return v.trim();
  }
  return "";
}
const ANTHROPIC_KEY = anthropicKey();
const MODELLO = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function agenti(auth: string, body: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/centralino-agenti`, {
    method: "POST", headers: { Authorization: auth, apikey: SERVICE_ROLE, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { errore: t.slice(0, 300) }; }
}

const STRUMENTI = [
  {
    name: "fuori_tema",
    description: "L'ultimo messaggio dell'admin chiede chiaramente un'altra cosa che non c'entra col centralino (es. incassi, ricette, magazzino, campagne): chiamalo subito e basta, la domanda passa al Tony generale. NON usarlo per le risposte alle tue domande (sì, no, numeri, voci, parcheggio, asporto, menu).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "stato_centralino",
    description: "Legge com'è configurato ora il centralino AI della sede, le voci disponibili (le italiane per prime), i menu, il profilo del locale e le domande dei clienti rimaste senza risposta.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "salva_centralino",
    description: "Salva le impostazioni decise con l'admin e aggiorna la voce al telefono. Passa SOLO i campi da cambiare. Usalo solo dopo che l'admin ha confermato il riepilogo.",
    input_schema: {
      type: "object",
      properties: {
        ai_attivo: { type: "boolean", description: "accende o spegne la voce AI al telefono (solo se modulo_voce e' true)" },
        bot_wa_ai: { type: "boolean", description: "accende o spegne il bot WhatsApp con AI (incluso nel piano)" },
        voce_ai: { type: "string", description: "voice_id scelto dall'elenco voci" },
        voce_ai_nome: { type: "string", description: "nome della voce scelta" },
        saluto_ai: { type: "string", description: "prima frase quando risponde (max 300 caratteri)" },
        info_extra: { type: "string", description: "testo completo delle cose da sapere: parcheggio, animali, ferie, servizi... (sostituisce quello attuale: includi anche quello che va tenuto)" },
        numero_trasferimento: { type: "string", description: "numero a cui passare le chiamate, con prefisso" },
        max_persone_ai: { type: "number", description: "oltre quante persone passa la chiamata a una persona" },
        menu_id_voce: { type: "string", description: "id del menu da usare (dall'elenco menu_disponibili)" },
        asporto_attivo: { type: "boolean", description: "la voce prende ordini da asporto al telefono" },
      },
    },
  },
  {
    name: "rispondi_domande",
    description: "Salva le risposte dell'admin alle domande dei clienti rimaste senza risposta (domande_aperte): entrano da sole nelle informazioni del locale e il centralino da adesso le sa. ignora=true se l'admin dice che non serve.",
    input_schema: {
      type: "object",
      properties: {
        risposte: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "id della domanda (da domande_aperte)" },
              risposta: { type: "string", description: "risposta breve e chiara, come la direbbe il locale al cliente" },
              ignora: { type: "boolean" },
            },
            required: ["id"],
          },
        },
      },
      required: ["risposte"],
    },
  },
];

function istruzioni(sedeNome: string) {
  return `Sei Tony, l'assistente di Ristoflow. Stai aiutando l'admin del locale "${sedeNome}" a montare il CENTRALINO AI: la voce che risponde al telefono, prende le prenotazioni, risponde su orari, parcheggio e menu, manda il link del menu su WhatsApp, prende ordini da asporto (se attivo) e passa la chiamata a una persona quando serve.

DUE SERVIZI
- BOT WHATSAPP (incluso nel piano): risponde in chat con le stesse capacità (prenotazioni, orari, menu, link, asporto). Si accende con bot_wa_ai e prende il posto del vecchio bot a domande ("Per quale data?"), che da quel momento non risponde più.
- VOCE AL TELEFONO (modulo a pagamento): se in stato_centralino modulo_voce è false, la voce non è attiva per questo locale: non chiedere voce, saluto, numero di trasferimento né di accenderla; di' che è un servizio a parte che si attiva chiedendo a Ristoflow, e configura il bot WhatsApp (cose da sapere, menu, asporto, bot_wa_ai).
- La voce può anche essere quella del titolare: si registra in Configurazione › Centralino › "Usa la mia voce" (lo fa lui dall'app, tu non puoi).

COME LAVORI
- Comincia chiamando stato_centralino per vedere cosa c'è già.
- PARTI DA QUELLO CHE L'APP SA GIÀ: profilo_locale contiene tipo di locale, cucina, sale con capienza, categorie del menu, piatti senza glutine, menu bambini, asporto e consegna, sito. Usalo per proporre tu le risposte ("Vedo che avete la sala Giardino da 80 posti e piatti senza glutine: lo scrivo?"), così l'admin conferma o corregge invece di dover ricordare tutto.
- DOMANDE DEI CLIENTI SENZA RISPOSTA: se domande_aperte non è vuoto, parti da lì: "I clienti hanno chiesto N cose a cui il centralino non sapeva rispondere". Chiedile una alla volta, proponendo tu una risposta quando l'app la sa già. Con le risposte chiama rispondi_domande (anche a gruppi). Entrano da sole nelle cose da sapere: non ricopiarle in info_extra. Se l'admin chiede solo di rispondere alle domande, fai solo questo.
- Fai UNA domanda alla volta, breve, in italiano semplice, e proponi tu una risposta di default così l'admin può dire solo "sì".
- Ordine dei punti (salta quelli già a posto, se l'admin non vuole cambiarli):
  1. Voce: proponi 3-4 voci italiane per nome (donna e uomo). Se non ci sono voci italiane, di' che vanno aggiunte dalla Voice Library di ElevenLabs e intanto usa quella predefinita.
  2. Saluto: proponi "Buongiorno, ${sedeNome}! Come posso aiutarla?" o simile.
  3. Cose da sapere: domande DIVERSE secondo il tipo di locale (da profilo_locale), una alla volta, al massimo 5-6, saltando quelle che l'app sa già:
     - per tutti: parcheggio, animali, giorni di chiusura o ferie;
     - pizzeria o asporto: consegna a domicilio e zona, forno a legna, impasti speciali o senza glutine, tempi d'attesa per il ritiro;
     - ristorante o trattoria: menu bambini e seggioloni, intolleranze, giardino o dehors, gruppi e cene aziendali;
     - locale per eventi, ricevimenti, agriturismo: sale e capienza, feste private, menu per eventi, visite del locale, a chi passare chi chiede un preventivo;
     - bar, bistrot, pub: colazioni, aperitivo, musica o partite;
     - hotel con ristorante: ristorante aperto anche a chi non dorme lì, mezza pensione.
     Chiudi sempre con: "C'è qualcosa che i clienti chiedono spesso al telefono?". Scrivi tu le risposte in frasi brevi e chiare.
  4. Menu: quale menu deve leggere e mandare come link (se ce n'è più di uno attivo, proponi quello alla carta).
  5. ASPORTO — DOMANDA OBBLIGATORIA, non saltarla mai: se in menu_disponibili c'è un menu con ordinabile=true e ritiro_attivo=true, chiedi sempre "Prendete ordini da asporto? Vuoi che li prenda anche il centralino (si paga in contanti al ritiro, il cliente conferma su WhatsApp)?" nominando quel menu. Se nessun menu ha il ritiro attivo, chiedi comunque se fanno asporto e, se sì, spiega che prima va attivato il ritiro sul menu in Menu › Ordini online.
  6. A chi passare le chiamate: numero di cellulare e da quante persone in su (default 12).
  7. Accendere il bot WhatsApp e, se c'è il modulo, la voce.
- Quando hai le risposte, fai un riepilogo puntato con TUTTI i punti (asporto compreso, anche se è "no") e chiedi "Confermi?". Solo dopo il sì chiama salva_centralino con i campi decisi.
- Le risposte brevi dell'admin (sì, no, un numero, un nome di voce, un orario, una frase sul parcheggio) sono risposte alle tue domande: NON sono fuori tema.
- Dopo il salvataggio di' che la voce è aggiornata e che può provarla in Configurazione › Centralino › "Prova la voce".
- Orari, indirizzo e menu del giorno NON vanno scritti: la voce li legge dall'app.
- Se l'admin cambia una sola cosa ("metti un'altra voce", "aggiungi che abbiamo il parcheggio"), fai solo quella, conferma e salva.
- Non inventare voci o menu: usa solo quelli di stato_centralino. Non mostrare mai id tecnici all'admin.
- Il collegamento del numero di telefono (operatore e trunk SIP) lo fa Ristoflow: se chiede, di' che il numero si collega a parte.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const body = await req.json().catch(() => ({}));
    const azienda = String(body.azienda_id || ""), sede = String(body.sede_id || body.sede_uuid || "");
    if (!azienda || !sede) return json(200, { success: false, reply: "📞 Per montare il centralino scegli prima la sede in alto, poi riscrivimi." });
    if (!ANTHROPIC_KEY) return json(200, { success: false, reply: "📞 In questo momento non riesco a ragionare sul centralino: riprova tra poco." });

    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: any) => m && String(m.content || "").trim())
      .slice(-16)
      .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length) messages.push({ role: "user", content: "Montiamo il centralino" });

    const st0 = await agenti(auth, { azione: "stato", azienda_id: azienda, sede_id: sede, profilo: true });
    if (st0?.errore) return json(200, { success: false, reply: "📞 " + (String(st0.errore).includes("admin") ? "Il centralino lo può montare solo l'admin del locale." : "Non riesco a leggere il centralino: " + st0.errore) });
    const sedeNome = st0?.sede || "il locale";

    let salvato = false;
    for (let giro = 0; giro < 6; giro++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODELLO, max_tokens: 1500, system: istruzioni(sedeNome), tools: STRUMENTI, messages }),
      });
      if (!r.ok) return json(200, { success: false, reply: "📞 Non riesco a rispondere adesso (" + r.status + "): riprova tra poco, non ho cambiato niente." });
      const d = await r.json();
      const blocchi = d.content || [];
      const usi = blocchi.filter((b: any) => b.type === "tool_use");
      if (usi.some((x: any) => x.name === "fuori_tema")) return json(200, { success: true, rimanda: true, fonte: "altro", reply: "" });
      if (!usi.length) {
        const testo = blocchi.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
        return json(200, { success: true, fonte: "centralino", attesa: true, reply: "📞 " + testo.replace(/^📞\s*/, ""), fatto: salvato ? "centralino_salvato" : null });
      }
      messages.push({ role: "assistant", content: blocchi });
      const risultati = [];
      for (const u of usi) {
        let out: any;
        if (u.name === "stato_centralino") {
          const voci = await agenti(auth, { azione: "voci", azienda_id: azienda, sede_id: sede });
          out = {
            ...st0,
            voci: Array.isArray(voci?.voci) ? voci.voci.slice(0, 40).map((v: any) => ({ voice_id: v.voice_id, nome: v.nome, genere: v.genere, italiana: v.italiana, accento: v.accento })) : { errore: voci?.errore || "voci non disponibili" },
          };
        } else if (u.name === "salva_centralino") {
          out = await agenti(auth, { azione: "salva", azienda_id: azienda, sede_id: sede, ...(u.input || {}) });
          if (out?.ok) { salvato = true; out = { ok: true, trasferimento: out.trasferimento }; }
        } else if (u.name === "rispondi_domande") {
          out = await agenti(auth, { azione: "rispondi_domande", azienda_id: azienda, sede_id: sede, risposte: (u.input as any)?.risposte || [] });
          if (out?.ok) salvato = true;
        } else out = { errore: "strumento sconosciuto" };
        risultati.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out).slice(0, 12000) });
      }
      messages.push({ role: "user", content: risultati });
    }
    return json(200, { success: false, reply: "📞 Mi sono perso nei passaggi: dimmi di nuovo cosa vuoi cambiare nel centralino." });
  } catch (e) {
    console.error("TONY CENTRALINO:", e);
    return json(200, { success: false, reply: "📞 C'è stato un problema tecnico, non ho cambiato niente. Riprova tra poco." });
  }
});
