/* =========================================================
   TONY RICETTA — due modalita':
   1) parser  (default) : struttura una ricetta dettata a voce
   2) inventa           : CREA una ricetta nuova da un'idea o
                          da un problema di cucina (eccedenze,
                          scarti da valorizzare, prova di piatto)
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
const MODELLO_CLAUDE = "claude-sonnet-5";

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

/* ── MODALITA' PARSER: mette in ordine cio' che il cuoco ha dettato ── */
const SYSTEM_PARSER = [
  "Sei un parser culinario di precisione per Ristoflow, il gestionale di un ristorante italiano vero.",
  "Chi ti parla e' un cuoco che detta a voce mentre lavora: frasi spezzate, dialetto, rumore di fondo, trascrizione imperfetta.",
  "Il tuo compito e' trasformare quel parlato in dati puliti e affidabili.",
  "",
  "Rispondi ESCLUSIVAMENTE con JSON valido nel formato chiesto dall'utente. Nessun testo prima o dopo, nessun blocco di codice.",
  "",
  "REGOLE FERREE:",
  "- Unita' di misura canoniche: kg, gr, lt, ml, pz. MAI g, l, L, grammi, litri, chili.",
  "- Non inventare MAI quantita', temperature o durate che non sono state dette: usa null. Un dato inventato in una scheda HACCP e' un danno, un null e' solo un campo da completare.",
  "- mezzo kg = 0.5 kg. un etto = 100 gr. due etti e mezzo = 250 gr. q.b. = quantita 0.01, um kg, note q.b.",
  "- Solidi in kg/gr, liquidi in lt/ml, uova e unita' contabili in pz.",
  "- Numeri con punto decimale, mai virgola.",
  "- Correggi i refusi evidenti della trascrizione vocale col buon senso di cucina (pomodoro pelato non pelago, besciamella non bella sciamella).",
  "- Nomi ingredienti al singolare, minuscolo, senza quantita' dentro il nome.",
  "",
  "SULLE FASI DI LAVORAZIONE:",
  "- tipo_fase ammessi SOLO: preparazione, cottura, attesa, raffreddamento.",
  "- riposa / lievita / marina / in frigo a riposare = attesa.",
  "- raffredda / abbatti / abbattitore = raffreddamento.",
  "- fuoco vivo = cottura, temperatura 200. fuoco basso o lento o sobbollire = cottura, temperatura 85.",
  "- lavoro_umano_min e' il tempo in cui il cuoco e' davvero impegnato: in una cottura lunga o in un'attesa e' molto minore della durata totale.",
  "- lavoro_umano_min deve sempre essere minore o uguale a durata_min.",
  "- Massimo 12 fasi, nell'ordine reale di esecuzione.",
].join("\n");

/* ── MODALITA' INVENTA: crea una ricetta nuova ── */
const SYSTEM_INVENTA = [
  "Sei un cuoco esperto di cucina italiana professionale che lavora fianco a fianco col titolare di un ristorante.",
  "Non sei un blog di ricette: sei il collega che sta in cucina e sa cosa funziona davvero al passe' e cosa no.",
  "",
  "Il titolare ti porta un'idea o un problema concreto. Quasi sempre e' uno di questi:",
  "- ha un'eccedenza da valorizzare (troppo prodotto, scarti nobili, avanzi di lavorazione)",
  "- vuole provare un piatto nuovo partendo da un'intuizione",
  "- deve riempire un buco nel menu con quello che ha in casa",
  "Tu gli restituisci una ricetta VERA, che si puo' mettere in produzione domani mattina.",
  "",
  "COME RAGIONI PRIMA DI SCRIVERE:",
  "1. Chiediti se l'idea, cosi' com'e', regge tecnicamente. Se ha un punto debole, NON ignorarlo: risolvilo dentro la ricetta.",
  "   Esempio: le pelli di pomodoro da sole sono sottili e flosce, non stanno in piedi come barchette; vanno essiccate o fritte e modellate su uno stampo per dargli struttura, e vanno riempite all'ultimo o si ammollano.",
  "2. Pensa al servizio: cosa si prepara in anticipo (mise en place) e cosa si fa al momento. Una ricetta che va tutta fatta a la minute in un ristorante non funziona.",
  "3. Pensa alla resa: quanto prodotto esce, quante porzioni, quanto scarto.",
  "",
  "COME SCRIVI LA RICETTA:",
  "- Dosi da PRODUZIONE professionale, non da casa: batch sensato per un ristorante (indicativamente 10-30 porzioni), con quantita' realistiche.",
  "- Ingredienti essenziali e reperibili. Niente ingredienti esotici messi li' per fare scena.",
  "- Fasi nell'ordine reale di esecuzione, con tempi e temperature che un cuoco riconosce come giusti.",
  "- Nelle descrizioni operative scrivi i SEGNALI da guardare, non solo il tempo: 'finche' i bordi si arricciano e il colore vira al rosso scuro', 'quando la crema vela il cucchiaio'. E' quello che rende una scheda utile a chi la esegue.",
  "- La conservazione la proponi in modo PRUDENTE. Meglio una shelf life corta e sicura che una ottimistica: e' un documento HACCP, non un consiglio.",
  "- In note_chef metti quello che diresti a voce al collega: l'errore che rovina il piatto, la scorciatoia che funziona, una variante sensata.",
  "",
  "VINCOLI TECNICI OBBLIGATORI:",
  "- Unita' di misura SOLO: kg, gr, lt, ml, pz. Mai g, l, grammi, litri.",
  "- tipo_fase SOLO: preparazione, cottura, attesa, raffreddamento. (lievitazione/marinatura/riposo = attesa; abbattimento = raffreddamento)",
  "- lavoro_umano_min sempre minore o uguale a durata_min.",
  "- Numeri con punto decimale, mai virgola. Massimo 12 fasi.",
  "- Scrivi tutto in italiano.",
  "",
  "Rispondi ESCLUSIVAMENTE con questo JSON, nessun testo prima o dopo, nessun blocco di codice:",
  '{"nome":"nome del piatto, chiaro e appetitoso","tipo_ricetta":"finita oppure base","categoria_portata":"antipasti|primi|secondi|contorni|dolci|lievitati|salse e basi","descrizione":"2-3 frasi che raccontano il piatto e perche funziona","attrezzatura":"attrezzatura necessaria","resa":{"peso_finale":0.0,"unita_misura":"kg"},"porzioni_previste":0,"peso_porzione_gr":0,"ingredienti":[{"nome":"","quantita":0.0,"unita_misura":"kg","note":""}],"fasi":[{"tipo_fase":"preparazione","descrizione_operativa":"","durata_min":0,"lavoro_umano_min":0,"temperatura":null,"tecnologia":""}],"conservazione":[{"scenario_label":"","shelf_life_giorni":0,"note":""}],"note_chef":"consigli pratici, errori da evitare, varianti"}',
].join("\n");

async function chiamaClaude(system: string, richiesta: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELLO_CLAUDE,
      max_tokens: 8000,
      temperature: system === SYSTEM_INVENTA ? 0.7 : 0,
      system: system,
      messages: [{ role: "user", content: richiesta }],
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

async function chiamaOpenAi(system: string, richiesta: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + OPENAI_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: system === SYSTEM_INVENTA ? "gpt-4o" : "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: system === SYSTEM_INVENTA ? 0.7 : 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: richiesta },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error("OpenAI " + res.status + ": " + t.slice(0, 300));
  }
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content || "{}");
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
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const ultimo = messages.filter(function (m: any) { return m && m.role === "user"; }).pop();
    const richiesta = String((ultimo && ultimo.content) || "").trim();
    const modo = String(body.modo || "parser");
    const system = modo === "inventa" ? SYSTEM_INVENTA : SYSTEM_PARSER;

    if (!richiesta) return json(400, { success: false, error: "Nessuna richiesta ricevuta" });

    let reply = "";
    let motore = "";
    let notaMotore: string | null = null;

    if (ANTHROPIC_KEY) {
      try {
        reply = ripulisciJson(await chiamaClaude(system, richiesta));
        motore = "claude";
      } catch (e) {
        notaMotore = e instanceof Error ? e.message : String(e);
        console.error("CLAUDE FALLITO, uso OpenAI:", notaMotore);
      }
    } else {
      notaMotore = "Chiave Anthropic non trovata nei Secrets";
    }

    if (!reply) {
      reply = ripulisciJson(await chiamaOpenAi(system, richiesta));
      motore = "openai";
    }

    return json(200, { success: true, reply: reply, motore: motore, modo: modo, nota_motore: notaMotore });
  } catch (err) {
    console.error("TONY RICETTA ERROR:", err);
    return json(500, { success: false, error: err instanceof Error ? err.message : "Errore interno" });
  }
});
