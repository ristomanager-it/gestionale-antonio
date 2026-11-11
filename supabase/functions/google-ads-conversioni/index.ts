// GOOGLE-ADS-CONVERSIONI v1 (11/11/2026) - comunica a Google Ads le conversioni vere di Ristoflow.
// Perche': le campagne risultavano a zero conversioni (le azioni contavano pagine dei siti vecchi; l'evento delle pagine nuove andava
// solo ad Analytics, con il nome sbagliato e solo con i cookie accettati).
// Come: le pagine salvano il codice del clic di Google (gclid/gbraid/wbraid) nella prenotazione (riferimento) o nella bozza del
// preventivo online; questa funzione lo carica su Google con uploadClickConversions:
//   - "Prenotazione pagata (Ristoflow)": prenotazioni con acconto pagato, valore = acconto
//   - "Richiesta inviata (Ristoflow)": preventivi online completati
// azioni (solo admin di piattaforma, header x-prova; il cron orario la chiama con { azione:'carica' }):
//   { azione:'prepara', azienda_id }  crea le due azioni di conversione se mancano
//   { azione:'rimuovi_azioni', azienda_id, ids:[...] } toglie azioni vecchie dei siti dismessi (mai quelle di Ristoflow)
//   { azione:'carica', azienda_id? }  carica le conversioni nuove (tutte le aziende con Google collegato se manca azienda_id)
// Niente template literal.
import { createClient } from "npm:@supabase/supabase-js@2";
const SB = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
const V = "v23";
function json(b: unknown, s?: number) { return new Response(JSON.stringify(b), { status: s || 200, headers: { "Content-Type": "application/json" } }); }

async function google(az: string) {
  const conn = ((await SB.from("google_ads_connessioni").select("customer_id, refresh_token").eq("azienda_id", az).eq("attivo", true).limit(1)).data || [])[0];
  if (!conn || !conn.refresh_token) return null;
  const cust = String(conn.customer_id || "").replace(/\D/g, "");
  const t = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: conn.refresh_token, client_id: Deno.env.get("GOOGLE_ADS_CLIENT_ID") || "", client_secret: Deno.env.get("GOOGLE_ADS_CLIENT_SECRET") || "", grant_type: "refresh_token" }) });
  const tj: any = await t.json().catch(function () { return {}; });
  if (!tj.access_token || !cust) return null;
  const H: Record<string, string> = { Authorization: "Bearer " + tj.access_token, "Content-Type": "application/json" };
  const dev = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || ""; if (dev) H["developer-token"] = dev;
  const login = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID") || ""; if (login) H["login-customer-id"] = login.replace(/\D/g, "");
  const base = "https://googleads.googleapis.com/" + V + "/customers/" + cust;
  const post = async function (path: string, body: any) { const r = await fetch(base + path, { method: "POST", headers: H, body: JSON.stringify(body) }); const j: any = await r.json().catch(function () { return {}; }); return { ok: r.status === 200, j: j }; };
  const q = async function (g: string) { const x = await post("/googleAds:search", { query: g }); return x.ok ? (x.j.results || []) : []; };
  return { cust: cust, post: post, q: q };
}

const AZIONI = [
  { chiave: "azione_prenotazione", nome: "Prenotazione pagata (Ristoflow)", categoria: "PURCHASE" },
  { chiave: "azione_richiesta", nome: "Richiesta inviata (Ristoflow)", categoria: "SUBMIT_LEAD_FORM" },
];

async function prepara(az: string) {
  const g = await google(az); if (!g) return { ok: false, errore: "Google Ads non collegato" };
  const esistenti = await g.q("select conversion_action.resource_name, conversion_action.name, conversion_action.status from conversion_action where conversion_action.status != 'REMOVED'");
  const conf: Record<string, string> = {};
  const fatti: string[] = [];
  for (const a of AZIONI) {
    const c = esistenti.filter(function (x: any) { return x.conversionAction.name === a.nome; })[0];
    if (c) { conf[a.chiave] = c.conversionAction.resourceName; continue; }
    const r = await g.post("/conversionActions:mutate", { operations: [{ create: { name: a.nome, type: "UPLOAD_CLICKS", category: a.categoria, status: "ENABLED", primaryForGoal: true,
      countingType: "ONE_PER_CLICK", clickThroughLookbackWindowDays: 90, valueSettings: { defaultValue: 0, defaultCurrencyCode: "EUR", alwaysUseDefaultValue: false } } }] });
    if (!r.ok) return { ok: false, errore: "creazione " + a.nome + ": " + JSON.stringify(r.j).slice(0, 400) };
    conf[a.chiave] = r.j.results[0].resourceName; fatti.push(a.nome);
  }
  await SB.from("google_ads_conversioni_config").upsert({ azienda_id: az, azione_prenotazione: conf.azione_prenotazione, azione_richiesta: conf.azione_richiesta, aggiornato_at: new Date().toISOString() });
  return { ok: true, create: fatti, azioni: conf };
}

// data e ora come le vuole Google: "2026-11-11 22:30:00+01:00" (ora italiana)
function quando(d: string | null) {
  const x = new Date(d || Date.now());
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(x);
  const off = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", timeZoneName: "shortOffset" }).formatToParts(x).filter(function (t) { return t.type === "timeZoneName"; })[0];
  const o = String(off ? off.value : "GMT+1").replace("GMT", "") || "+0";
  const m = o.match(/([+-])(\d+)(?::(\d+))?/);
  const ofs = m ? m[1] + String(m[2]).padStart(2, "0") + ":" + String(m[3] || "00").padStart(2, "0") : "+01:00";
  return p.replace("T", " ") + ofs;
}
function codiceClic(r: any) {
  const x = (r && r.clic_google) || r || {};
  if (x.gclid) return { gclid: String(x.gclid) };
  if (x.gbraid) return { gbraid: String(x.gbraid) };
  if (x.wbraid) return { wbraid: String(x.wbraid) };
  return null;
}

async function carica(az: string) {
  let conf: any = (await SB.from("google_ads_conversioni_config").select("*").eq("azienda_id", az).maybeSingle()).data;
  if (!conf || !conf.azione_prenotazione) { const p: any = await prepara(az); if (!p.ok) return p; conf = { azione_prenotazione: p.azioni.azione_prenotazione, azione_richiesta: p.azioni.azione_richiesta }; }
  const g = await google(az); if (!g) return { ok: false, errore: "Google Ads non collegato" };
  const conv: any[] = [], quale: any[] = [];
  // prenotazioni con acconto pagato e codice del clic, non ancora comunicate (ultimi 60 giorni)
  const pr = (await SB.from("prenotazioni_tavoli").select("id, token_pubblico, acconto_importo, importo_totale, riferimento, modificata_il, created_at").eq("azienda_id", az)
    .eq("stato_pagamento", "pagato").is("google_conv_at", null).is("collegata_a", null).like("riferimento", "%\"clic_google\":{%").gte("created_at", new Date(Date.now() - 60 * 864e5).toISOString()).limit(200)).data || [];
  for (const p of pr) {
    let r: any = {}; try { r = JSON.parse(p.riferimento || "{}"); } catch (_) { r = {}; }
    const c = codiceClic(r); if (!c) continue;
    conv.push(Object.assign({ conversionAction: conf.azione_prenotazione, conversionDateTime: quando(p.modificata_il || p.created_at), conversionValue: Number(p.acconto_importo || 0), currencyCode: "EUR", orderId: "pren-" + p.id }, c));
    quale.push({ t: "prenotazioni_tavoli", id: p.id });
  }
  // preventivi online completati con codice del clic
  const bz = (await SB.from("preventivi_online_bozze").select("id, clic, updated_at, preventivo_id").eq("azienda_id", az).eq("completata", true).is("google_conv_at", null)
    .gte("updated_at", new Date(Date.now() - 60 * 864e5).toISOString()).limit(200)).data || [];
  for (const b of bz) {
    const c = codiceClic(b.clic || {}); if (!c) continue;
    conv.push(Object.assign({ conversionAction: conf.azione_richiesta, conversionDateTime: quando(b.updated_at), conversionValue: 0, currencyCode: "EUR", orderId: "prev-" + b.id }, c));
    quale.push({ t: "preventivi_online_bozze", id: b.id });
  }
  if (!conv.length) return { ok: true, caricate: 0 };
  const r = await g.post(":uploadClickConversions", { conversions: conv, partialFailure: true });
  if (!r.ok) return { ok: false, errore: JSON.stringify(r.j).slice(0, 500) };
  // con partialFailure gli errori sono per riga: si segnano come fatte solo quelle accettate
  const errati = new Set<number>();
  const det = (r.j.partialFailureError && r.j.partialFailureError.details) || [];
  for (const d of det) for (const e of (d.errors || [])) { const idx = (((e.location || {}).fieldPathElements || [])[1] || {}).index; if (typeof idx === "number") errati.add(idx); }
  const ora = new Date().toISOString();
  for (let i = 0; i < quale.length; i++) { if (errati.has(i)) continue; await SB.from(quale[i].t).update({ google_conv_at: ora }).eq("id", quale[i].id); }
  return { ok: true, caricate: quale.length - errati.size, rifiutate: errati.size, errore: errati.size ? JSON.stringify(r.j.partialFailureError).slice(0, 400) : undefined };
}

Deno.serve(async function (req) {
  try {
    const cfg = (await SB.from("deploy_config").select("chiave").eq("id", 1).maybeSingle()).data;
    if (!cfg || req.headers.get("x-prova") !== cfg.chiave) return json({ ok: false, errore: "non autorizzato" }, 401);
    const b = await req.json().catch(function () { return {}; });
    if (b.azione === "prepara") return json(await prepara(String(b.azienda_id || "")));
    if (b.azione === "carica") {
      if (b.azienda_id) return json(await carica(String(b.azienda_id)));
      const lista = (await SB.from("google_ads_connessioni").select("azienda_id").eq("attivo", true)).data || [];
      const out: any[] = [];
      for (const x of lista) { try { out.push(Object.assign({ azienda: x.azienda_id }, await carica(String(x.azienda_id)))); } catch (e) { out.push({ azienda: x.azienda_id, ok: false, errore: String(e).slice(0, 200) }); } }
      return json({ ok: true, aziende: out });
    }
    // toglie da Google Ads azioni di conversione vecchie (siti dismessi); mai quelle di Ristoflow
    if (b.azione === "rimuovi_azioni") {
      const g = await google(String(b.azienda_id || "")); if (!g) return json({ ok: false, errore: "Google Ads non collegato" });
      const ids: string[] = (b.ids || []).map(function (x: any) { return String(x).replace(/\D/g, ""); }).filter(Boolean);
      const nomi = await g.q("select conversion_action.id, conversion_action.name from conversion_action where conversion_action.id in (" + (ids.join(",") || "0") + ")");
      const ok: string[] = [], ko: string[] = [];
      for (const n of nomi) {
        const nome = String(n.conversionAction.name || "");
        if (/Ristoflow/i.test(nome)) { ko.push(nome + ": e' di Ristoflow, non si toglie"); continue; }
        const r = await g.post("/conversionActions:mutate", { operations: [{ remove: "customers/" + g.cust + "/conversionActions/" + n.conversionAction.id }] });
        if (r.ok) ok.push(nome); else ko.push(nome + ": " + JSON.stringify(r.j).slice(0, 200));
      }
      return json({ ok: true, rimosse: ok, non_rimosse: ko });
    }
    return json({ ok: false, errore: "azione sconosciuta" }, 400);
  } catch (e) { return json({ ok: false, errore: String(e).slice(0, 300) }, 500); }
});
