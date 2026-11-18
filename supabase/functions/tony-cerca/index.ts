/* =========================================================
   TONY CERCA — risponde dalla barra "Cerca" quando chi lavora
   tocca "Chiedi a Tony". Legge le regole e le ricette con la
   ricerca cerca_sapere (con le policy dell'utente, non con la
   chiave di servizio) e risponde breve, citando la fonte.
   Tempi e temperature: solo quelli scritti nelle ricette.
========================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function anthropicKey(): string {
  const env = Deno.env.toObject();
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_KEY", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY_AI"]) {
    if (env[k] && String(env[k]).trim()) return String(env[k]).trim();
  }
  return "";
}
const ANTHROPIC_KEY = anthropicKey();
// veloce prima di tutto: si chiede in cucina col servizio in corso
const MODELLI = ["claude-haiku-5-5", "claude-sonnet-5"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: Object.assign({}, cors, { "Content-Type": "application/json" }) });
}

const SYSTEM = [
  "Sei Tony, l'assistente di un'azienda di ristorazione italiana. Ti scrive chi lavora in cucina o in sala, spesso dal telefono durante il servizio.",
  "Ricevi la domanda e le FONTI DEL LOCALE (regole e ricette scritte dall'azienda).",
  "",
  "REGOLE:",
  "- Rispondi in italiano, breve: al massimo 5 righe o un elenco di 3-5 punti. Niente premesse.",
  "- Se le fonti rispondono, usa quelle e chiudi con 'Fonte: <titolo>'.",
  "- Tempi, temperature, grammature e conservazioni: SOLO quelli scritti nelle fonti. Se non ci sono, dillo e non inventarli: suggerisci di chiedere al responsabile di cucina.",
  "- Se le fonti non rispondono e la domanda è di buon senso (sala, clienti, organizzazione), dai un'indicazione generale e comincia con 'Indicazione generale:'.",
  "- Non dire mai chi deve fare una cosa per nome. Non citare nomi di persone.",
].join("\n");

function fontiTesto(righe: any[]): string {
  if (!righe || !righe.length) return "(nessuna fonte trovata)";
  const out: string[] = [];
  righe.slice(0, 6).forEach(function (r: any) {
    let t = "[" + r.fonte + "] " + r.titolo + " (" + r.azienda + ")";
    if (r.fonte === "ricetta") {
      const fasi = (r.dettagli && r.dettagli.fasi) || [];
      fasi.forEach(function (f: any) {
        t += "\n  fase " + f.ordine + ": " + (f.nome || "") +
          (f.temperatura != null ? " — " + f.temperatura + " °C" : "") +
          (f.minuti != null ? " — " + f.minuti + " min" : "") +
          (f.descrizione ? " — " + String(f.descrizione).slice(0, 300) : "");
      });
      const cons = (r.dettagli && r.dettagli.conservazione) || [];
      cons.forEach(function (c: any) {
        t += "\n  conservazione: " + (c.titolo || "") + (c.temperatura != null ? " — " + c.temperatura + " °C" : "") +
          (c.minuti != null ? " — " + c.minuti + " min" : "");
      });
      if (!fasi.length) t += "\n  (ricetta senza fasi scritte)";
    } else {
      t += "\n  " + String(r.testo || "").slice(0, 600);
    }
    out.push(t);
  });
  return out.join("\n\n");
}

async function chiediClaude(domanda: string, fonti: string): Promise<string> {
  let ultimo = "";
  for (const modello of MODELLI) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: modello,
          max_tokens: 500,
          system: SYSTEM,
          messages: [{ role: "user", content: "DOMANDA: " + domanda + "\n\nFONTI DEL LOCALE:\n" + fonti }],
        }),
      });
      const j = await res.json();
      if (res.ok && j && j.content && j.content[0] && j.content[0].text) return String(j.content[0].text).trim();
      ultimo = modello + " " + res.status + " " + JSON.stringify(j).slice(0, 200);
    } catch (e) {
      ultimo = modello + " " + String(e);
    }
  }
  throw new Error(ultimo || "nessuna risposta");
}

Deno.serve(async function (req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return json(401, { errore: "Accesso richiesto" });
    const body = await req.json().catch(function () { return {}; });
    const domanda = String(body.domanda || "").trim().slice(0, 400);
    const aziendaId = body.azienda_id || null;
    if (domanda.length < 3) return json(400, { errore: "Domanda troppo corta" });
    if (!ANTHROPIC_KEY) return json(500, { errore: "Chiave Tony mancante" });

    // client con il token di chi chiede: valgono le sue policy, vede solo le sue aziende
    const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: utente } = await sb.auth.getUser();
    if (!utente || !utente.user) return json(401, { errore: "Accesso scaduto" });

    const { data: righe, error } = await sb.rpc("cerca_sapere", { p_q: domanda, p_azienda: aziendaId });
    if (error) return json(500, { errore: "Ricerca non riuscita: " + error.message });

    const risposta = await chiediClaude(domanda, fontiTesto(righe || []));
    const generica = !(righe && righe.length) || /^indicazione generale/i.test(risposta);

    if (aziendaId) {
      await sb.from("ricerca_domande").insert({ azienda_id: aziendaId, domanda: domanda, n_risultati: (righe || []).length, chiesto_tony: true });
    }
    return json(200, { risposta: risposta, generica: generica, n_fonti: (righe || []).length });
  } catch (e) {
    return json(500, { errore: String((e && (e as any).message) || e) });
  }
});
