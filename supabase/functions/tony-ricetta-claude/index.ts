/* =========================================================
   TONY RICETTA — parser di precisione per dettatura ricette
   Motore: Anthropic Claude, con fallback automatico su OpenAI
   se la chiave Anthropic manca o la chiamata fallisce.
   Contratto IDENTICO al ramo "estrai_ricetta" di assistente-ai:
     IN  { azienda_id, messages:[{role,content}] }
     OUT { success, reply, motore }
========================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY_AI") ?? "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Trova la chiave Anthropic comunque sia stata chiamata nei Secrets.
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

const SYSTEM_PARSER = [
  "Sei un parser culinario di precisione per Ristoflow, il gestionale di un ristorante italiano vero.",
  "Chi ti parla e' un cuoco che detta a voce mentre lavora: frasi spezzate, dialetto, rumore di fondo, trascrizione imperfetta.",
  "Il tuo compito e' trasformare quel parlato in dati puliti e affidabili.",
  "",
  "Rispondi ESCLUSIVAMENTE con JSON valido nel formato chiesto dall'utente. Nessun testo prima o dopo, nessun blocco di codice, nessuna spiegazione.",
  "",
  "REGOLE FERREE:",
  "- Unita' di misura canoniche: kg, gr, lt, ml, pz. MAI g, l, L, grammi, litri, chili.",
  "- Non inventare MAI quantita', temperature o durate che non sono state dette: usa null. Un dato inventato in una scheda HACCP e' un danno, un null e' solo un campo da completare.",
  "- mezzo kg = 0.5 kg. un etto = 100 gr. due etti e mezzo = 250 gr. q.b. = quantita 0.01, um kg, note q.b.",
  "- Solidi in kg/gr, liquidi in lt/ml, uova e unita' contabili in pz.",
  "- Numeri con punto decimale, mai virgola.",
  "- Correggi i refusi evidenti della trascrizione vocale usando il buon senso di cucina (pomodoro pelato non pelago, besciamella non bella sciamella, soffritto non sof fritto).",
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

async function chiamaClaude(richiesta: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELLO_CLAUDE,
      max_tokens: 4000,
      temperature: 0,
      system: SYSTEM_PARSER,
      messages: [{ role: "user", content: richiesta }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error("Anthropic " + res.status + ": " + t.slice(0, 300));
  }
  const data = await res.json();
  const blocchi = Array.isArray(data.content) ? data.content : [];
  const testo = blocchi
    .filter(function (c: any) { return c && c.type === "text"; })
    .map(function (c: any) { return String(c.text || ""); })
    .join("");
  return testo;
}

async function chiamaOpenAi(richiesta: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + OPENAI_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PARSER },
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

// Claude a volte incornicia il JSON: ripuliamo delimitatori e testo attorno.
function ripulisciJson(testo: string): string {
  let t = String(testo || "").trim();
  t = t.replace(/^[^\{\[]*/, "");
  t = t.replace(/[^\}\]]*$/, "");
  return t.trim() || "{}";
}

Deno.serve(async function (req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(function () { return {}; });
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const ultimo = messages.filter(function (m: any) { return m && m.role === "user"; }).pop();
    const richiesta = String((ultimo && ultimo.content) || "").trim();

    if (!richiesta) return json(400, { success: false, error: "Nessuna richiesta ricevuta" });

    let reply = "";
    let motore = "";
    let erroreClaude: string | null = null;

    if (ANTHROPIC_KEY) {
      try {
        reply = ripulisciJson(await chiamaClaude(richiesta));
        motore = "claude";
      } catch (e) {
        erroreClaude = e instanceof Error ? e.message : String(e);
        console.error("CLAUDE FALLITO, uso OpenAI:", erroreClaude);
      }
    } else {
      erroreClaude = "Chiave Anthropic non trovata nei Secrets";
    }

    if (!reply) {
      reply = ripulisciJson(await chiamaOpenAi(richiesta));
      motore = "openai";
    }

    return json(200, { success: true, reply: reply, motore: motore, nota_motore: erroreClaude });
  } catch (err) {
    console.error("TONY RICETTA ERROR:", err);
    return json(500, { success: false, error: err instanceof Error ? err.message : "Errore interno" });
  }
});
