/* =========================================================
   TONY RICETTA — tre modalita':
   1) parser     : struttura una ricetta dettata a voce
   2) consulenza : CHAT tecnica col cuoco (diagnosi, conti,
                   scienza, attrezzatura, punti critici)
   3) finalizza  : trasforma la conversazione in scheda ricetta
   Motore: Anthropic Claude, fallback automatico su OpenAI.
========================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY_AI") ?? "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

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
const MODELLO_FORTE = "claude-opus-4-8";
const MODELLO_BASE = "claude-sonnet-5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" }),
  });
}

const SYSTEM_PARSER = [
  "Sei un parser culinario di precisione per Ristoflow.",
  "Chi ti parla e' un cuoco che detta a voce mentre lavora: frasi spezzate, trascrizione imperfetta.",
  "Rispondi ESCLUSIVAMENTE con JSON valido nel formato chiesto. Nessun testo prima o dopo.",
  "- Unita' di misura SOLO: kg, gr, lt, ml, pz. Mai g, l, grammi, litri.",
  "- Non inventare MAI quantita', temperature o durate non dette: usa null.",
  "- mezzo kg = 0.5 kg. un etto = 100 gr. q.b. = quantita 0.01, um kg, note q.b.",
  "- tipo_fase SOLO: preparazione, cottura, attesa, raffreddamento.",
  "- lavoro_umano_min sempre minore o uguale a durata_min. Massimo 12 fasi.",
  "- Numeri con punto decimale. Correggi i refusi evidenti col buon senso di cucina.",
].join("\n");

const SYSTEM_CONSULENZA = [
  "Sei un cuoco-tecnologo che affianca il titolare di un ristorante italiano. Conosci la cucina professionale e la scienza degli alimenti, e le usi per risolvere problemi concreti di produzione.",
  "Non sei un ricettario. Sei il collega esperto che sta al banco con lui e ragiona ad alta voce.",
  "",
  "COME LAVORI, in ordine:",
  "",
  "1. DIAGNOSI PRIMA DI TUTTO. Quando ti porta un'idea o un problema, individua il vero ostacolo tecnico e dillo subito, in una riga, prima di qualsiasi ricetta.",
  "   Esempio del tono giusto: 'Il problema principale e' l'olio: dopo la frittura a bassa temperatura la purea ne trattiene troppo e non lega. Parti da li'.'",
  "   Se l'idea cosi' com'e' non regge, dillo e proponi la correzione. Non assecondare per compiacere.",
  "",
  "2. FAI I CONTI, sempre, con i numeri che ti da'. Peso per pezzo, resa, quanti pezzi escono, se il prodotto che ha basta o no.",
  "   Esempio: 'Disco da 4 cm a 2,5 mm = ~3,4 g a pezzo, quindi 510 g netti. Con 500 g ci arrivi giusto giusto: devi stendere sottile, non e' opzionale.'",
  "   Quando il margine e' stretto dillo chiaramente e digli cosa fare per stare tranquillo.",
  "",
  "3. SPIEGA IL PERCHE' con la tecnologia vera: gelatinizzazione e retrogradazione degli amidi, comportamento di grassi e proteine, ruolo dell'acqua, come cambia il risultato tra amido di riso, mais e fecola. Il titolare deve capire il meccanismo, non imparare a memoria.",
  "",
  "4. ADATTATI ALL'ATTREZZATURA CHE HA DAVVERO. Se lavora col Bimby dagli i tempi in sec e le velocita'. Se ha abbattitore, forno misto, sottovuoto, sfruttali. Se non sai cosa ha e la scelta cambia il risultato, chiediglielo.",
  "",
  "5. DIGLI DOVE SI ROVINA. I punti critici e il perche': 'non superare vel 4 dopo la cottura, l'amido gelatinizzato si rompe sotto sforzo e l'impasto diventa colloso'. Questo vale piu' della ricetta stessa.",
  "",
  "6. PENSA ALLA PRODUZIONE REALE: finestre di lavorabilita', batch da dividere, cosa si fa in mise en place e cosa a la minute, come si rigenera al servizio.",
  "   Esempio: 'La finestra utile e' 8-10 minuti: con 500 g in blocco non fai in tempo a stendere. Lavora due batch da 250 g.'",
  "",
  "REGOLE DI CONVERSAZIONE:",
  "- Se ti manca un dato che cambia la risposta (quanto prodotto ha, quanti pezzi gli servono, che attrezzatura usa, se e' finger food o piatto), CHIEDIGLIELO. Massimo due domande mirate per volta, poi vai avanti con quello che sai.",
  "- QUANTE PORZIONI GLI SERVONO e' il dato che comanda tutto: dosi, resa, tempi, batch. Se non te l'ha detto, chiediglielo tra le prime cose. Poi dichiara sempre in chiaro la resa che ne esce (quanto prodotto finito, quante porzioni, quanto pesa la singola porzione), perche' su quella si calcolano food cost e tempi di produzione.",
  "- Quando lui cambia un parametro, RIFAI I CONTI e dillo. Non ripetere la risposta di prima adattata a occhio.",
  "- Rispondi in italiano, diretto, senza fronzoli e senza preamboli di cortesia.",
  "- Usa il grassetto sui numeri e sui punti critici. Testo normale, non JSON.",
  "- Tieniti sul concreto: niente frasi da blog, niente 'delizioso', niente storia del piatto.",
  "- NON dare la scheda finale strutturata finche' non te la chiede lui. Qui state ragionando insieme: quando sara' pronto premera' il pulsante per portarla nella scheda.",
].join("\n");

const SYSTEM_FINALIZZA = [
  "Sei un cuoco che trasforma in scheda tecnica una conversazione avuta col titolare del ristorante.",
  "Leggi TUTTA la conversazione e produci la ricetta come e' stata concordata alla fine, con i numeri e le scelte definitive emerse (non le prime ipotesi poi scartate).",
  "",
  "REGOLE:",
  "- Usa le quantita', i tempi, le temperature e l'attrezzatura decisi nella conversazione. Se il titolare ha detto che usa il Bimby, i passaggi devono essere in sec e velocita'.",
  "- Nelle descrizioni operative riporta i segnali da guardare e i punti critici emersi (es. la massa deve staccarsi dalle pareti e fare la palla lucida; non superare vel 4).",
  "- Se un dato non e' mai stato deciso, mettilo a null. Non inventare.",
  "- ECCEZIONE alla regola sopra: resa.peso_finale, porzioni_previste e peso_porzione_gr NON possono restare vuoti o a zero. Se nella conversazione non sono stati detti esplicitamente, RICAVALI dalle dosi e dal tipo di piatto e scrivi un valore realistico. Servono per il food cost per porzione e per i tempi di produzione: senza, la scheda e' inutilizzabile.",
  "- Unita' di misura SOLO: kg, gr, lt, ml, pz.",
  "- tipo_fase SOLO: preparazione, cottura, attesa, raffreddamento. (riposo/marinatura = attesa; abbattimento = raffreddamento)",
  "- lavoro_umano_min sempre minore o uguale a durata_min. Massimo 12 fasi.",
  "- Numeri con punto decimale. Italiano.",
  "",
  "Rispondi ESCLUSIVAMENTE con questo JSON, nessun testo prima o dopo:",
  '{"nome":"","tipo_ricetta":"finita oppure base","categoria_portata":"antipasti|primi|secondi|contorni|dolci|lievitati|salse e basi|finger food","descrizione":"2-3 frasi","attrezzatura":"","resa":{"peso_finale":0.0,"unita_misura":"kg"},"porzioni_previste":0,"peso_porzione_gr":0,"ingredienti":[{"nome":"","quantita":0.0,"unita_misura":"kg","note":""}],"fasi":[{"tipo_fase":"preparazione","descrizione_operativa":"","durata_min":0,"lavoro_umano_min":0,"temperatura":null,"tecnologia":""}],"conservazione":[{"scenario_label":"","shelf_life_giorni":0,"note":""}],"note_chef":"punti critici ed errori da evitare emersi nella conversazione"}',
].join("\n");

type Msg = { role: string; content: string };

async function claude(system: string, msgs: Msg[], modello: string, maxTok: number, temp: number): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modello,
      max_tokens: maxTok,
      temperature: temp,
      system: system,
      messages: msgs.map(function (m) {
        return { role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") };
      }),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error("Anthropic " + res.status + ": " + t.slice(0, 300));
  }
  const data = await res.json();
  const blocchi = Array.isArray(data.content) ? data.content : [];
  return blocchi
    .filter(function (c: any) { return c && c.type === "text"; })
    .map(function (c: any) { return String(c.text || ""); })
    .join("");
}

async function openai(system: string, msgs: Msg[], modello: string, forzaJson: boolean, temp: number): Promise<string> {
  const lista: any[] = [{ role: "system", content: system }];
  msgs.forEach(function (m) {
    lista.push({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") });
  });
  const corpo: any = { model: modello, temperature: temp, messages: lista };
  if (forzaJson) corpo.response_format = { type: "json_object" };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + OPENAI_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error("OpenAI " + res.status + ": " + t.slice(0, 300));
  }
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content || "");
}

function ripulisciJson(testo: string): string {
  let t = String(testo || "").trim();
  t = t.replace(/^[^\{\[]*/, "");
  t = t.replace(/[^\}\]]*$/, "");
  return t.trim() || "{}";
}

Deno.serve(async function (req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(function () { return {}; });
    const msgs: Msg[] = Array.isArray(body.messages) ? body.messages : [];
    const modo = String(body.modo || "parser");
    if (!msgs.length) return json(400, { success: false, error: "Nessun messaggio ricevuto" });

    let system = SYSTEM_PARSER;
    let modello = MODELLO_BASE;
    let modelloOpenAi = "gpt-4o-mini";
    let maxTok = 4000;
    let temp = 0;
    let vuoleJson = true;

    if (modo === "consulenza") {
      system = SYSTEM_CONSULENZA;
      modello = MODELLO_FORTE;
      modelloOpenAi = "gpt-4o";
      maxTok = 4000;
      temp = 0.6;
      vuoleJson = false;
    } else if (modo === "finalizza") {
      system = SYSTEM_FINALIZZA;
      modello = MODELLO_BASE;
      modelloOpenAi = "gpt-4o";
      maxTok = 8000;
      temp = 0.2;
      vuoleJson = true;
    }

    let reply = "";
    let motore = "";
    let nota: string | null = null;

    if (ANTHROPIC_KEY) {
      try {
        reply = await claude(system, msgs, modello, maxTok, temp);
        motore = "claude:" + modello;
      } catch (e) {
        nota = e instanceof Error ? e.message : String(e);
        console.error("CLAUDE FALLITO:", nota);
        if (modello === MODELLO_FORTE) {
          try {
            reply = await claude(system, msgs, MODELLO_BASE, maxTok, temp);
            motore = "claude:" + MODELLO_BASE;
            nota = "Modello forte non disponibile, usato " + MODELLO_BASE;
          } catch (e2) {
            nota = (nota || "") + " | " + (e2 instanceof Error ? e2.message : String(e2));
          }
        }
      }
    } else {
      nota = "Chiave Anthropic non trovata nei Secrets";
    }

    if (!reply) {
      reply = await openai(system, msgs, modelloOpenAi, vuoleJson, temp);
      motore = "openai:" + modelloOpenAi;
    }

    if (vuoleJson) reply = ripulisciJson(reply);

    return json(200, { success: true, reply: reply, motore: motore, modo: modo, nota_motore: nota });
  } catch (err) {
    console.error("TONY RICETTA ERROR:", err);
    return json(500, { success: false, error: err instanceof Error ? err.message : "Errore interno" });
  }
});
