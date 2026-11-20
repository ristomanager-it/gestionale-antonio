// evento-benvenuto — serata di presentazione Ristoflow: messaggio di prenotazione e vocale di ringraziamento con la voce di Antonio.
// verify_jwt = false; accesso con header x-deploy-key (deploy_config).
// POST { azione: "crea_template" }            -> crea il modello WhatsApp "serata_prenotazione_ricevuta" sul numero Ristoflow
// POST { azione: "prenotazione", id }         -> manda subito il messaggio di prenotazione (modello con pulsante "Ci sarò!")
// POST { azione: "vocali" }                   -> manda i vocali programmati arrivati all'ora (cron ogni minuto)
// POST { azione: "prova_vocale", id }         -> manda subito il vocale (per provare)
// Il vocale si puo' mandare solo dentro le 24 ore da un messaggio della persona: lo programma centralino-bot
// quando la persona tocca "Ci sarò!" o risponde (vocale_programmato_il = adesso + vocale_ritardo_min).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EL_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const GRAPH = "https://graph.facebook.com/v21.0";
const CONN_RISTOFLOW = "5daa1b3c-516a-4403-940e-82f7a62a4f5f";
const SEDE_RISTOFLOW = "dbf6377a-ab45-4912-899b-49cd3cc50246";
const WABA_RISTOFLOW = "969232959308152";
const TEMPLATE = "serata_prenotazione_ricevuta";

const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path.split("?")[0]}: ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
const aggiorna = (id: string, campi: Record<string, unknown>) =>
  rest(`evento_iscrizioni?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(campi) });

const tel = (t: string) => {
  let n = String(t || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (/^3\d{8,9}$/.test(n)) n = "39" + n;
  return n;
};
const primoNome = (s: string) => {
  const p = String(s || "").trim().split(/\s+/)[0] || "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
};

async function connessione() {
  const c = (await rest(`whatsapp_connessioni?id=eq.${CONN_RISTOFLOW}&select=meta_phone_number_id,meta_access_token,meta_waba_id&limit=1`))?.[0];
  if (!c?.meta_phone_number_id) throw new Error("numero WhatsApp Ristoflow non collegato");
  return { phone: c.meta_phone_number_id as string, token: (c.meta_access_token || WA_TOKEN) as string, waba: (c.meta_waba_id || WABA_RISTOFLOW) as string };
}

async function config() {
  return (await rest(`evento_config?select=*&limit=1`))?.[0] || {};
}
function quando(cfg: any) {
  if (!cfg.data_ora) return "lunedì 18 gennaio";
  const d = new Date(cfg.data_ora);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", ...o }).format(d);
  return `${f({ weekday: "long", day: "numeric", month: "long" })} dalle ${f({ hour: "2-digit", minute: "2-digit" })}`;
}

/* ---------- modello WhatsApp ---------- */
async function creaTemplate() {
  const c = await connessione();
  const body = {
    name: TEMPLATE, language: "it", category: "UTILITY",
    components: [
      { type: "BODY",
        text: "Ciao {{1}}, abbiamo ricevuto la tua prenotazione per la serata di presentazione di Ristoflow: {{2}} a {{3}}, per {{4}}.\n\nQui trovi i dettagli e puoi modificarla quando vuoi: {{5}}\n\nTi aspettiamo! Tocca qui sotto per confermarci che ci sarai.",
        example: { body_text: [["Marco", "lunedì 18 gennaio dalle 19:30", "Campo Antico, Orte", "2 persone", "https://app.ristoflow-ai.com/#/evento-prenotazione?t=abc123"]] } },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Ci sarò!" }] },
    ],
  };
  const r = await fetch(`${GRAPH}/${c.waba}/message_templates`, {
    method: "POST", headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: r.status, risposta: await r.json().catch(() => ({})) };
}

/* ---------- messaggio di prenotazione ---------- */
async function prenotazione(id: string) {
  const i = (await rest(`evento_iscrizioni?id=eq.${id}&select=*&limit=1`))?.[0];
  if (!i) return { errore: "iscrizione non trovata" };
  if (i.messaggio_inviato_il) return { ok: true, gia_inviato: true };
  const to = tel(i.telefono);
  if (to.length < 10) { await aggiorna(id, { messaggio_errore: "numero non valido" }); return { errore: "numero non valido" }; }
  const cfg = await config();
  const c = await connessione();
  const link = `https://app.ristoflow-ai.com/#/evento-prenotazione?t=${i.token_pubblico}`;
  const persone = Number(i.persone) || 1;
  const parametri = [primoNome(i.nome) || "e benvenuto", quando(cfg), String(cfg.luogo || "Campo Antico, Orte"), persone === 1 ? "1 persona" : `${persone} persone`, link];
  const r = await fetch(`${GRAPH}/${c.phone}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template",
      template: { name: TEMPLATE, language: { code: "it" }, components: [{ type: "body", parameters: parametri.map((t) => ({ type: "text", text: t })) }] } }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = String(d?.error?.message || r.status).slice(0, 300);
    await aggiorna(id, { messaggio_errore: err });
    return { errore: err };
  }
  await aggiorna(id, { messaggio_inviato_il: new Date().toISOString(), messaggio_errore: null });
  return { ok: true };
}

/* ---------- vocale con la voce di Antonio ---------- */
async function testoVocale(i: any, cfg: any) {
  let segn = "";
  if (i.invito_codice) {
    const inv = (await rest(`evento_inviti?codice=ilike.${encodeURIComponent(i.invito_codice)}&select=tipo,etichetta&limit=1`).catch(() => []))?.[0];
    if (inv && ["agente", "segnalatore"].includes(String(inv.tipo)) && inv.etichetta) segn = primoNome(inv.etichetta);
  }
  const nome = primoNome(i.nome);
  return String(cfg.testo_vocale || "")
    .replace(/\{segnalatore\}/g, segn ? String(cfg.testo_segnalatore || "").replace(/\{segnalatore\}/g, segn) : "")
    .replace(/\{nome\}/g, nome)
    .replace(/Ciao !/, "Ciao!")
    .replace(/\s+/g, " ").trim();
}

async function vocale(i: any) {
  const cfg = await config();
  const voce = (await rest(`centralino_config?sede_id=eq.${SEDE_RISTOFLOW}&select=voce_clonata_id,voce_ai&limit=1`))?.[0];
  const voiceId = voce?.voce_clonata_id || voce?.voce_ai;
  if (!voiceId || !EL_KEY) throw new Error("voce non disponibile");
  const testo = await testoVocale(i, cfg);
  const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=opus_48000_64`, {
    method: "POST", headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json", Accept: "audio/ogg" },
    body: JSON.stringify({ text: testo, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.35 } }),
  });
  if (!tts.ok) throw new Error("voce: " + tts.status + " " + (await tts.text()).slice(0, 200));
  const audio = new Uint8Array(await tts.arrayBuffer());
  const c = await connessione();
  const fd = new FormData();
  fd.append("messaging_product", "whatsapp");
  fd.append("type", "audio/ogg");
  fd.append("file", new File([audio], "antonio.ogg", { type: "audio/ogg" }));
  const up = await fetch(`${GRAPH}/${c.phone}/media`, { method: "POST", headers: { Authorization: `Bearer ${c.token}` }, body: fd });
  const u = await up.json().catch(() => ({}));
  if (!up.ok || !u?.id) throw new Error("caricamento: " + JSON.stringify(u).slice(0, 200));
  const manda = (voice: boolean) => fetch(`${GRAPH}/${c.phone}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: tel(i.telefono), type: "audio", audio: voice ? { id: u.id, voice: true } : { id: u.id } }),
  });
  let r = await manda(true);
  if (!r.ok) r = await manda(false);
  if (!r.ok) throw new Error("invio: " + (await r.text()).slice(0, 200));
  return testo;
}

async function vocaliDovuti() {
  const lista = await rest(`evento_iscrizioni?vocale_programmato_il=lte.${new Date().toISOString()}&vocale_inviato_il=is.null&vocale_errore=is.null&select=*&limit=20`);
  const esiti: any[] = [];
  for (const i of lista || []) {
    // segno subito come in corso, cosi' il giro del minuto dopo non lo manda due volte
    await aggiorna(i.id, { vocale_inviato_il: new Date().toISOString() });
    try { const t = await vocale(i); esiti.push({ id: i.id, ok: true, testo: t }); }
    catch (e) {
      await aggiorna(i.id, { vocale_inviato_il: null, vocale_errore: String((e as Error).message || e).slice(0, 300) });
      esiti.push({ id: i.id, errore: String(e) });
    }
  }
  return { ok: true, esiti };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ errore: "solo POST" }, 405);
  const dk = String(req.headers.get("x-deploy-key") || "").trim();
  const k = (await rest(`deploy_config?id=eq.1&select=chiave&limit=1`).catch(() => []))?.[0];
  if (!dk || !k?.chiave || String(k.chiave).trim() !== dk) return json({ errore: "non autorizzato" }, 401);
  const b = await req.json().catch(() => ({}));
  try {
    if (b.azione === "crea_template") return json(await creaTemplate());
    if (b.azione === "prenotazione") return json(await prenotazione(String(b.id || "")));
    if (b.azione === "vocali") return json(await vocaliDovuti());
    if (b.azione === "prova_vocale") {
      const i = (await rest(`evento_iscrizioni?id=eq.${b.id}&select=*&limit=1`))?.[0];
      if (!i) return json({ errore: "iscrizione non trovata" }, 404);
      return json({ ok: true, testo: await vocale(i) });
    }
    if (b.azione === "anteprima_testo") {
      const cfg = await config();
      return json({ testo: await testoVocale({ nome: b.nome || "Marco", invito_codice: b.codice || null }, cfg) });
    }
    return json({ errore: "azione sconosciuta" }, 400);
  } catch (e) {
    console.error(e);
    return json({ errore: String((e as Error).message || e) }, 502);
  }
});
