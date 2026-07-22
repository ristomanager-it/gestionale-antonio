/* =========================================================
   TONY ROUTER — sta davanti a Tony generale.
   1) Se la domanda e' di CUCINA la gira allo specialista
      (tony-ricetta-claude, modo consulenza).
   2) Altrimenti inoltra tutto ad assistente-ai, invariato.
   3) In ogni caso RIPULISCE la risposta: se Tony restituisce
      JSON grezzo dentro reply, lo trasforma in testo leggibile
      invece di stamparlo a schermo.
   assistente-ai NON viene modificata.
========================================================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY_AI") ?? "";

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
const MODELLO_RAPIDO = "claude-haiku-4-5-20251001";

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

/* ── Parole che decidono subito, senza scomodare il classificatore ── */
const PAROLE_GESTIONALE = [
  "briefing", "incasso", "incassi", "prenotazion", "magazzino", "fornitor", "ordine", "ordini",
  "vendite", "venduto", "hotel", "camera", "camere", "coperti", "timbratur", "food cost",
  "scorte", "sottoscorta", "fattur", "promo", "dipendent", "turni", "ferie", "margine",
  "spese fisse", "costo lavoro", "quanto ho", "quanto abbiamo", "statistic",
];
const PAROLE_CUCINA = [
  "ricetta", "impasto", "cottura", "cuocere", "friggere", "frittura", "abbattitore",
  "abbattiment", "lievita", "marinat", "besciamella", "amido", "gelatinizz", "panatura",
  "sottovuoto", "emulsion", "salsa", "brodo", "fondo bruno", "glassa", "farcia", "farcitura",
  "stampo", "bimby", "mantecatura", "ripieno", "sfoglia", "pasta fresca", "come faccio a fare",
  "come posso fare", "che ci faccio", "cosa ci faccio", "mi avanza", "mi avanzano", "eccedenza",
  "scarti", "bucce", "purea", "croccante", "gommoso", "grumi",
];

function contiene(testo: string, parole: string[]): boolean {
  const t = testo.toLowerCase();
  for (const p of parole) { if (t.indexOf(p) >= 0) return true; }
  return false;
}

async function classificaConAI(testo: string): Promise<string> {
  if (!ANTHROPIC_KEY) return "gestionale";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELLO_RAPIDO,
        max_tokens: 10,
        temperature: 0,
        system: "Classifica il messaggio del ristoratore. Rispondi UNA SOLA PAROLA: 'cucina' se chiede aiuto su una preparazione, una tecnica, un impasto, una ricetta, come valorizzare un ingrediente o un'eccedenza; 'gestionale' per tutto il resto (numeri, magazzino, prenotazioni, hotel, personale, marketing, configurazione). Nessun'altra parola.",
        messages: [{ role: "user", content: testo }],
      }),
    });
    if (!res.ok) return "gestionale";
    const data = await res.json();
    const blocchi = Array.isArray(data.content) ? data.content : [];
    const out = blocchi.map(function (c: any) { return String(c?.text || ""); }).join("").toLowerCase();
    return out.indexOf("cucina") >= 0 ? "cucina" : "gestionale";
  } catch (_e) { return "gestionale"; }
}

async function decidi(testo: string): Promise<string> {
  if (!testo) return "gestionale";
  if (contiene(testo, PAROLE_GESTIONALE)) return "gestionale";
  if (contiene(testo, PAROLE_CUCINA)) return "cucina";
  return await classificaConAI(testo);
}

/* ── Trascrizione audio, cosi' il routing funziona anche a voce ── */
async function trascrivi(base64Audio: string): Promise<string> {
  if (!base64Audio || !OPENAI_KEY) return "";
  try {
    const pulito = base64Audio.indexOf(",") >= 0 ? String(base64Audio.split(",").pop()) : base64Audio;
    const bin = atob(pulito);
    const bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
    const fd = new FormData();
    fd.append("file", new File([bytes], "audio.webm", { type: "audio/webm" }));
    fd.append("model", "whisper-1");
    fd.append("language", "it");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + OPENAI_KEY },
      body: fd,
    });
    if (!res.ok) return "";
    const data = await res.json();
    return String(data?.text || "").trim();
  } catch (_e) { return ""; }
}

/* ── Il pezzo che risolve il JSON grezzo a schermo ── */
function oggettoInTesto(o: any, liv: number): string {
  if (o === null || o === undefined) return "";
  if (typeof o === "string" || typeof o === "number" || typeof o === "boolean") return String(o);
  const rientro = "  ".repeat(liv);
  if (Array.isArray(o)) {
    return o.map(function (v) {
      const t = oggettoInTesto(v, liv + 1);
      return t ? (rientro + "• " + t) : "";
    }).filter(Boolean).join("\n");
  }
  const righe: string[] = [];
  for (const [k, v] of Object.entries(o)) {
    const etichetta = k.replace(/_/g, " ");
    const t = oggettoInTesto(v, liv + 1);
    if (!t) continue;
    if (typeof v === "object" && v !== null) righe.push(rientro + etichetta.toUpperCase() + ":\n" + t);
    else righe.push(rientro + etichetta + ": " + t);
  }
  return righe.join("\n");
}

function ripulisciReply(reply: any): string {
  if (reply && typeof reply === "object") return oggettoInTesto(reply, 0);
  let t = String(reply == null ? "" : reply).trim();
  if (!t) return "";
  // Tony a volte restituisce l'intero JSON come stringa: lo apriamo e prendiamo il testo
  if (t.charAt(0) === "{" && t.indexOf("\"reply\"") >= 0) {
    try {
      const p = JSON.parse(t);
      if (p && typeof p === "object" && "reply" in p) {
        const dentro = (p as any).reply;
        return typeof dentro === "object" ? oggettoInTesto(dentro, 0) : String(dentro || "").trim();
      }
    } catch (_e) { /* non era JSON valido: lo lasciamo com'e' */ }
  }
  return t;
}

async function chiamaEdge(slug: string, payload: unknown, auth: string) {
  const res = await fetch(SUPABASE_URL + "/functions/v1/" + slug, {
    method: "POST",
    headers: {
      "Authorization": auth || ("Bearer " + SERVICE_ROLE),
      "apikey": SERVICE_ROLE,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const txt = await res.text();
  try { return { ok: res.ok, data: JSON.parse(txt) }; }
  catch (_e) { return { ok: false, data: { success: false, error: txt.slice(0, 300) } }; }
}

Deno.serve(async function (req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") || "";

  try {
    const body: any = await req.json().catch(function () { return {}; });
    const tipo = String(body.tipo_messaggio || "");

    // Modalita' speciali (voce sintetica, parser ricetta, promo, benvenuto):
    // passano dritte a Tony generale senza toccare nulla.
    if (tipo && tipo !== "chat") {
      const r = await chiamaEdge("assistente-ai", body, auth);
      if (r.data && typeof r.data === "object" && "reply" in r.data && tipo !== "tts") {
        (r.data as any).reply = ripulisciReply((r.data as any).reply);
      }
      return json(200, r.data);
    }

    const messages: any[] = Array.isArray(body.messages) ? body.messages : [];

    // Se parla a voce, trascrivo qui: cosi' posso instradare anche il vocale.
    let vocale = "";
    if (body.audio_base64) {
      vocale = await trascrivi(String(body.audio_base64));
      if (vocale) messages.push({ role: "user", content: vocale });
    }

    const ultimo = messages.filter(function (m) { return m && m.role === "user"; }).pop();
    const testo = String((ultimo && ultimo.content) || "").trim();

    const destinazione = await decidi(testo);

    if (destinazione === "cucina") {
      const r = await chiamaEdge("tony-ricetta-claude", {
        azienda_id: body.azienda_id,
        modo: "consulenza",
        messages: messages.map(function (m) {
          return { role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") };
        }),
      }, auth);
      const testoRisposta = ripulisciReply(r.data?.reply);
      if (testoRisposta) {
        return json(200, {
          success: true, reply: testoRisposta, action: null,
          voice_input: vocale || null, fonte: "cucina",
        });
      }
      // se lo specialista non risponde, non lascio l'utente a bocca asciutta
    }

    const inoltro = Object.assign({}, body, { messages: messages, audio_base64: null });
    const r = await chiamaEdge("assistente-ai", inoltro, auth);
    const data: any = (r.data && typeof r.data === "object") ? r.data : { success: false, error: "Risposta non valida" };
    if ("reply" in data) data.reply = ripulisciReply(data.reply);
    if (vocale && !data.voice_input) data.voice_input = vocale;
    data.fonte = "gestionale";
    return json(200, data);

  } catch (err) {
    console.error("TONY ROUTER ERROR:", err);
    return json(500, { success: false, error: err instanceof Error ? err.message : "Errore interno" });
  }
});
