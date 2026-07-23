/* =========================================================
   TONY DISEGNO PIATTO
   Trasforma il progetto di montaggio (fatto da Claude) in
   un'illustrazione del piatto, generata con DALL-E 3.
   L'immagine viene salvata nel bucket "ricette" e resta li':
   gli URL di OpenAI scadono dopo un'ora.
========================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY_AI") ?? "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

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

// Il piatto su cui si posa cambia il disegno: lo traduco per il generatore.
const PIATTI: Record<string, string> = {
  tondo: "a round white porcelain plate",
  fondo: "a deep white porcelain bowl",
  rettangolare: "a rectangular white ceramic plate",
  tagliere: "a rustic wooden serving board",
  bicchiere: "a clear glass verrine",
  monoporzione: "a small single-portion glass",
};

// Come si presenta ogni elemento, detto in modo che il disegno lo renda.
const FORME: Record<string, string> = {
  specchio: "spread as a smooth sauce mirror on the base",
  crema: "piped as a round mound of cream",
  quenelle: "shaped into a neat quenelle",
  pezzo: "a single compact piece",
  fetta: "overlapping slices",
  cubetti: "scattered small diced cubes",
  gocce: "separate dots of sauce",
  filo: "drizzled in a thin zigzag line",
  polvere: "dusted as fine powder",
  erbe: "fresh herb sprigs and micro leaves",
  croccante: "a crisp tuile standing upright",
  nido: "twirled into a nest",
  pasta_lunga: "long pasta twirled into a neat nest",
  pasta_corta: "short pasta pieces arranged naturally",
  risotto: "spread in a smooth wave",
  zuppa: "filling the bowl as a soup",
  affettato: "draped cured meat slices in soft folds",
  formaggio: "cheese wedges and shavings",
  insalata: "a light pile of leaves",
  pane: "slices of bread on the side",
};

const DIMENSIONI: Record<string, string> = {
  piccolo: "small",
  medio: "medium-sized",
  grande: "generous",
};

function costruisciPrompt(dati: any): string {
  const imp = dati?.impiattamento || {};
  const piatto = PIATTI[String(imp.forma_piatto || "tondo").toLowerCase()] || PIATTI.tondo;
  const elementi = Array.isArray(imp.elementi) ? imp.elementi.slice(0, 8) : [];

  const descrizioni = elementi.map(function (el: any) {
    const forma = FORME[String(el?.forma || "").toLowerCase()] || "arranged neatly";
    const dim = DIMENSIONI[String(el?.dimensione || "medio").toLowerCase()] || "medium-sized";
    const zona = String(el?.zona || "centro")
      .replace("alto-sinistra", "top left").replace("alto-destra", "top right")
      .replace("basso-sinistra", "bottom left").replace("basso-destra", "bottom right")
      .replace("alto", "top").replace("basso", "bottom")
      .replace("sinistra", "left").replace("destra", "right")
      .replace("centro", "center");
    return dim + " " + String(el?.nome || "") + ", " + forma + ", placed " + zona;
  }).filter(Boolean);

  const parti = [
    "Professional food illustration of a plated restaurant dish.",
    "Three-quarter perspective view, slightly from above, with visible depth and height.",
    "The dish: " + String(dati?.nome || "plated dish") + ".",
    "Served on " + piatto + ".",
    descrizioni.length ? ("Components, in order: " + descrizioni.join("; ") + ".") : "",
    dati?.descrizione ? ("Style note: " + String(dati.descrizione).slice(0, 200)) : "",
    "Include the fine finishing touches a chef adds at the pass: microgreens, edible flowers where fitting, oil sheen, delicate garnish.",
    "Clean neutral background, soft natural light, shallow depth of field, appetising but realistic.",
    "Italian restaurant cuisine, refined but not artificial. No text, no logos, no cutlery, no hands.",
  ];
  return parti.filter(Boolean).join(" ");
}

Deno.serve(async function (req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_KEY) return json(500, { success: false, error: "Chiave OpenAI non configurata" });

    const body = await req.json().catch(function () { return {}; });
    const ricettaId = body?.ricetta_id ?? null;
    const prompt = costruisciPrompt(body);

    // 1. genero l'illustrazione
    const gen = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Authorization": "Bearer " + OPENAI_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural",
      }),
    });

    if (!gen.ok) {
      const t = await gen.text();
      return json(502, { success: false, error: "Generazione fallita: " + t.slice(0, 300) });
    }

    const genData = await gen.json();
    const urlTemporaneo = genData?.data?.[0]?.url;
    const promptUsato = genData?.data?.[0]?.revised_prompt || prompt;
    if (!urlTemporaneo) return json(502, { success: false, error: "Nessuna immagine restituita" });

    // 2. la scarico e la metto nello storage: l'URL di OpenAI scade
    const img = await fetch(urlTemporaneo);
    if (!img.ok) return json(502, { success: false, error: "Immagine non scaricabile" });
    const bytes = new Uint8Array(await img.arrayBuffer());

    const nomeFile = "disegni/" + (ricettaId || "tmp") + "-" + Date.now() + ".png";
    const { error: upErr } = await supabase.storage
      .from("ricette")
      .upload(nomeFile, bytes, { contentType: "image/png", upsert: true });

    if (upErr) {
      // se lo storage rifiuta, restituisco comunque l'URL temporaneo
      return json(200, {
        success: true, url: urlTemporaneo, permanente: false,
        nota: "Immagine non salvata: " + upErr.message, prompt: promptUsato,
      });
    }

    const { data: pub } = supabase.storage.from("ricette").getPublicUrl(nomeFile);
    const urlFinale = pub?.publicUrl || urlTemporaneo;

    // 3. la lego alla ricetta
    if (ricettaId) {
      await supabase.from("ricette").update({ disegno_url: urlFinale }).eq("id", ricettaId);
    }

    return json(200, { success: true, url: urlFinale, permanente: true, prompt: promptUsato });
  } catch (err) {
    console.error("DISEGNO PIATTO ERROR:", err);
    return json(500, { success: false, error: err instanceof Error ? err.message : "Errore interno" });
  }
});
