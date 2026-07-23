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

  const schizzo = String(dati?.stile || "foto").toLowerCase() === "schizzo";

  const apertura = schizzo
    ? [
        "Hand-drawn pencil sketch of a plated restaurant dish, a chef's plating design study.",
        "Graphite on white paper, visible pencil strokes, light cross-hatching for shadows and volume, no colour.",
        "Loose but precise, like a chef sketching the plate on a notebook before service.",
      ].join(" ")
    : "Professional food photography of a plated restaurant dish.";

  const parti = [
    apertura,
    "Three-quarter perspective view, slightly from above, with visible depth and height.",
    "The dish: " + String(dati?.nome || "plated dish") + ".",
    "Served on " + piatto + ".",
    descrizioni.length ? ("Components, in order: " + descrizioni.join("; ") + ".") : "",
    dati?.descrizione ? ("Style note: " + String(dati.descrizione).slice(0, 200)) : "",
    "Include the fine finishing touches a chef adds at the pass: microgreens, edible flowers where fitting, delicate garnish.",
    schizzo
      ? "Plain white paper background. It must look drawn by hand with a pencil, not rendered, not a photograph."
      : "Clean neutral background, soft natural light, shallow depth of field, oil sheen, appetising and realistic.",
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

    // 1. genero l'illustrazione.
    // I modelli immagine di OpenAI cambiano parametri nel tempo: provo il classico
    // e, se rifiuta, passo al piu' recente. Cosi' non si rompe al prossimo giro.
    const tentativi = [
      { model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024", quality: "hd" },
      { model: "gpt-image-1", prompt: prompt, n: 1, size: "1024x1024", quality: "high" },
      { model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024" },
    ];

    let genData: any = null;
    let erroriProva: string[] = [];

    for (const corpo of tentativi) {
      const gen = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Authorization": "Bearer " + OPENAI_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (gen.ok) { genData = await gen.json(); break; }
      const t = await gen.text();
      erroriProva.push(corpo.model + ": " + t.slice(0, 160));
    }

    if (!genData) {
      return json(502, { success: false, error: "Generazione fallita. " + erroriProva.join(" | ") });
    }

    const primo = genData?.data?.[0] || {};
    const urlTemporaneo = primo.url || null;
    const base64 = primo.b64_json || null;
    const promptUsato = primo.revised_prompt || prompt;
    if (!urlTemporaneo && !base64) return json(502, { success: false, error: "Nessuna immagine restituita" });

    // 2. porto l'immagine in memoria: da URL (che scade) o da base64
    let bytes: Uint8Array;
    if (base64) {
      const bin = atob(base64);
      bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
    } else {
      const img = await fetch(urlTemporaneo as string);
      if (!img.ok) return json(502, { success: false, error: "Immagine non scaricabile" });
      bytes = new Uint8Array(await img.arrayBuffer());
    }

    const tipo = String(body?.stile || "foto").toLowerCase() === "schizzo" ? "schizzi" : "disegni";
    const nomeFile = tipo + "/" + (ricettaId || "tmp") + "-" + Date.now() + ".png";
    const { error: upErr } = await supabase.storage
      .from("ricette")
      .upload(nomeFile, bytes, { contentType: "image/png", upsert: true });

    if (upErr) {
      // se lo storage rifiuta: se ho un URL temporaneo lo passo, altrimenti fallisco chiaro
      if (urlTemporaneo) {
        return json(200, {
          success: true, url: urlTemporaneo, permanente: false,
          nota: "Immagine non salvata: " + upErr.message, prompt: promptUsato,
        });
      }
      return json(502, { success: false, error: "Immagine generata ma non salvata: " + upErr.message });
    }

    const { data: pub } = supabase.storage.from("ricette").getPublicUrl(nomeFile);
    const urlFinale = pub?.publicUrl || urlTemporaneo || "";
    if (!urlFinale) return json(502, { success: false, error: "URL immagine non disponibile" });

    // 3. la lego alla ricetta
    if (ricettaId) {
      const campo = String(body?.stile || "foto").toLowerCase() === "schizzo" ? "schizzo_url" : "disegno_url";
      const agg: any = {};
      agg[campo] = urlFinale;
      await supabase.from("ricette").update(agg).eq("id", ricettaId);
    }

    return json(200, { success: true, url: urlFinale, permanente: true, prompt: promptUsato });
  } catch (err) {
    console.error("DISEGNO PIATTO ERROR:", err);
    return json(500, { success: false, error: err instanceof Error ? err.message : "Errore interno" });
  }
});
