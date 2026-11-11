// TONY-CAMPAGNE v7 - Tony analizza e sistema le campagne Google Ads dell'azienda.
// v7 (11/11): PIU' VELOCE. Con molte campagne superava i 150 secondi e finiva in 504 ("Non sono riuscito ad analizzare le campagne: errore"):
//     le letture da Google (numeri, ricerche, parole, visite alle pagine) e le modifiche ora partono in parallelo invece che una dopo l'altra;
//     il modello scrive motivi corti e solo le campagne con qualcosa da dire.
// v6: risposta lunga con tante campagne: max_tokens 16000 (a 6000 il JSON arrivava tagliato a meta').
// v5: se il JSON di Claude e' rotto si riprova una volta invece di fallire.
// v4: per le campagne rivolte a stranieri l'Italia centrale (Toscana, Umbria, Lazio) non si esclude mai.
// v3: ogni voce torna con il suo id (Approva/No dalla chat di Tony); Tony sa dove si trova il locale e non esclude luoghi vicini.
// v2: numeri della settimana letti con una query semplice: la v1 li perdeva per un campo non valido.
// Regola decisa da Antonio (4/11/2026):
//  - DA SOLO: escludere ricerche che non c'entrano, aggiungere parole chiave simili a quelle che funzionano.
//  - SOLO CON OK (Approva): budget, tetto CPC, pausa, accensione. Budget mai sopra 30 EUR/giorno. Nessuna campagna nuova.
// Accesso: admin, superadmin, addetto_marketing dell'azienda (token utente) oppure piattaforma (header x-prova).
// body: { azione:'analizza', azienda_id, prova?:true }   -> analisi ultimi 7 giorni; prova = simula, non tocca Google
//       { azione:'decidi', azienda_id, id, approva:true|false } -> applica o scarta una proposta
//       { azione:'tutte' } (solo x-prova, dal cron del lunedi') -> analizza tutte le aziende con Google collegato
// Niente template literal. Niente temperature (claude-sonnet-5 la rifiuta).
import { createClient } from "npm:@supabase/supabase-js@2";
const SB = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
const V = "v23";
const MODELLO = "claude-sonnet-5";
const BUDGET_MAX = 30;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-prova", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(b: unknown, s?: number) { return new Response(JSON.stringify(b), { status: s || 200, headers: Object.assign({}, cors, { "Content-Type": "application/json" }) }); }
function n(x: unknown) { return Number(x || 0); }
function eur(m: unknown) { return Math.round(n(m) / 1e4) / 100; }
function chiaveClaude() { const env = Deno.env.toObject(); for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_KEY", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY_AI"]) { if (env[k] && String(env[k]).trim()) return String(env[k]).trim(); } for (const k of Object.keys(env)) { const v = String(env[k] || ""); if (v.trim().indexOf("sk-ant-") === 0) return v.trim(); } return ""; }
function giorno(d: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d); }

async function chi(req: Request, az: string): Promise<{ ok: boolean; uid: string | null; piattaforma: boolean }> {
  const k = req.headers.get("x-prova") || "";
  if (k) { const c = (await SB.from("deploy_config").select("chiave").eq("id", 1).maybeSingle()).data; if (c && c.chiave === k) return { ok: true, uid: null, piattaforma: true }; }
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t || !az) return { ok: false, uid: null, piattaforma: false };
  const u = (await SB.auth.getUser(t)).data; const uid = u && u.user ? u.user.id : null;
  if (!uid) return { ok: false, uid: null, piattaforma: false };
  const m = (await SB.from("utenti_aziende").select("ruolo").eq("user_id", uid).eq("azienda_id", az).eq("attivo", true).limit(5)).data || [];
  const ok = m.some(function (r: any) { return ["admin", "superadmin", "addetto_marketing"].indexOf(String(r.ruolo).toLowerCase()) >= 0; });
  return { ok: ok, uid: uid, piattaforma: false };
}

async function google(az: string) {
  const conn = ((await SB.from("google_ads_connessioni").select("customer_id, refresh_token").eq("azienda_id", az).eq("attivo", true).limit(1)).data || [])[0];
  if (!conn || !conn.refresh_token) return null;
  const cust = String(conn.customer_id || "").replace(/\D/g, "");
  const t = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: conn.refresh_token, client_id: Deno.env.get("GOOGLE_ADS_CLIENT_ID") || "", client_secret: Deno.env.get("GOOGLE_ADS_CLIENT_SECRET") || "", grant_type: "refresh_token" }) });
  const tj: any = await t.json().catch(function () { return {}; });
  if (!tj.access_token || !cust) return null;
  const H = { Authorization: "Bearer " + tj.access_token, "Content-Type": "application/json" };
  const base = "https://googleads.googleapis.com/" + V + "/customers/" + cust;
  const q = async function (g: string) { const r = await fetch(base + "/googleAds:search", { method: "POST", headers: H, body: JSON.stringify({ query: g }) }); const j: any = await r.json().catch(function () { return {}; }); return r.status === 200 ? (j.results || []) : []; };
  const mut = async function (op: any) { const r = await fetch(base + "/googleAds:mutate", { method: "POST", headers: H, body: JSON.stringify({ mutateOperations: [op] }) }); const j: any = await r.json().catch(function () { return {}; });
    let e = ""; if (r.status !== 200) { const er = j && j.error; const d: string[] = []; ((er && er.details) || []).forEach(function (x: any) { (x.errors || []).forEach(function (y: any) { d.push(y.message || ""); }); }); e = (d.join(" | ") || (er && er.message) || "errore").slice(0, 200); }
    return { ok: r.status === 200, err: e }; };
  return { cust: cust, q: q, mut: mut };
}

async function claude(system: string, testo: string) {
  const k = chiaveClaude(); if (!k) throw new Error("manca la chiave Claude");
  // ogni tanto il modello sbaglia una virgola nel JSON: si riprova una volta chiedendo JSON valido
  for (let giro = 0; giro < 2; giro++) {
    const extra = giro ? "\n\nATTENZIONE: rispondi con JSON valido, senza testo prima o dopo, virgolette interne con il backslash." : "";
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": k, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODELLO, max_tokens: 12000, system: system + extra, messages: [{ role: "user", content: testo }] }) });
    if (!r.ok) throw new Error("Claude " + r.status + ": " + (await r.text()).slice(0, 200));
    const j: any = await r.json();
    const t = (j.content || []).filter(function (c: any) { return c.type === "text"; }).map(function (c: any) { return c.text; }).join("");
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { if (giro === 1) throw e; }
  }
}

const SISTEMA = [
  "Sei Tony, il consulente pubblicitario interno di un'azienda di ristorazione ed eventi italiana. Analizzi le campagne Google Ads dell'ultima settimana e decidi cosa sistemare.",
  "Capisci dal nome della campagna e dalla pagina di destinazione cosa vende (es. matrimoni per sposi stranieri vicino a Roma, tour enogastronomico, menu di pranzo, cene aziendali, capodanno).",
  "REGOLE:",
  "- escludi: SOLO ricerche presenti nei dati che chiaramente non c'entrano con cio' che la campagna vende (altri luoghi lontani, nomi di altre strutture o concorrenti, lavoro/offerte di lavoro, fai-da-te, gratis, ricette se si vende un ristorante). Scrivi la parola o frase breve da escludere (es. 'lake como', 'lavora con noi'). Mai escludere ricerche che possono portare clienti veri. Massimo 15 per campagna.",
  "- Tieni conto di DOVE si trova il locale (nei dati come 'Sede'): non escludere mai luoghi raggiungibili in 1-2 ore (regioni e citta' confinanti), perche' chi li cerca puo' diventare cliente. Escludi solo luoghi lontani o nomi di altre strutture. Per le campagne rivolte a stranieri (matrimoni, tour, inglese/tedesco) tutta l'Italia centrale e' vicina: Toscana, Umbria, Lazio e Roma non si escludono mai.",
  "- parole: nuove parole chiave a corrispondenza a frase, varianti vicine di ricerche che hanno avuto clic o sono chiaramente in target. Massimo 5 per campagna. Solo per campagne SEARCH. Non ripetere parole gia' presenti.",
  "- proposte (richiedono l'ok del titolare): tipo budget (valore = nuovo budget giornaliero in euro, tra 1 e 30), cpc (valore = nuovo tetto per clic in euro, tra 0.3 e 6, solo se la campagna usa Massimizza clic), pausa, attiva (solo per campagne in pausa: non usarlo).",
  "- Con pochi dati (meno di 100 impressioni nella settimana) NON proporre budget o pausa: scrivi nella sintesi che servono altri giorni.",
  "- Proponi pausa solo se la campagna spende da almeno 7 giorni, ha speso almeno 30 euro, zero conversioni e i visitatori non interagiscono con la pagina.",
  "- Proponi di alzare il budget solo se la campagna ha conversioni o contatti e spende tutto il budget.",
  "- Motivi brevissimi: massimo 6 parole ciascuno. Sintesi di ogni campagna: 1 frase.",
  "- Riepilogo: 2-3 frasi, italiano semplice, numeri concreti, cosa va e cosa no. Niente frasi difensive, niente gergo.",
  "Rispondi SOLO con questo JSON: {\"riepilogo\":\"\",\"campagne\":[{\"id\":\"\",\"sintesi\":\"\",\"escludi\":[{\"testo\":\"\",\"motivo\":\"\"}],\"parole\":[{\"testo\":\"\",\"motivo\":\"\"}],\"proposte\":[{\"tipo\":\"budget|cpc|pausa\",\"valore\":\"\",\"motivo\":\"\"}]}]}"
].join("\n");

async function analizza(az: string, prova: boolean) {
  const g = await google(az); if (!g) return { success: false, error: "Google Ads non collegato" };
  const oggi = new Date(); const da = giorno(new Date(oggi.getTime() - 7 * 864e5)); const a = giorno(new Date(oggi.getTime() - 864e5));
  const per = "segments.date between '" + da + "' and '" + a + "'";
  // v7: le letture iniziali tutte insieme
  const [camp, attive, offerte, urls, az0, sediR] = await Promise.all([
    g.q("select campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions from campaign where campaign.status = 'ENABLED' and " + per),
    g.q("select campaign.id, campaign.name, campaign.advertising_channel_type, campaign_budget.amount_micros from campaign where campaign.status = 'ENABLED'"),
    g.q("select campaign.id, campaign.bidding_strategy_type, campaign.target_spend.cpc_bid_ceiling_micros from campaign where campaign.status = 'ENABLED'"),
    g.q("select campaign.id, ad_group_ad.ad.final_urls from ad_group_ad where campaign.status = 'ENABLED' and ad_group_ad.status = 'ENABLED'"),
    SB.from("aziende").select("nome").eq("id", az).maybeSingle(),
    SB.from("sedi").select("nome, citta").eq("azienda_id", az).limit(10),
  ]);
  const off: Record<string, any> = {}; offerte.forEach(function (r: any) { off[r.campaign.id] = r.campaign; });
  const met: Record<string, any> = {}; camp.forEach(function (r: any) { met[r.campaign.id] = r; });
  // v7: per ogni campagna ricerche, parole, gruppo di annunci e visite alla pagina in parallelo
  const elenco: any[] = await Promise.all(attive.map(async function (r: any) {
    const id = String(r.campaign.id); const m = met[id] || {}; const mm = m.metrics || {};
    const fu = urls.filter(function (u: any) { return String(u.campaign.id) === id; }).map(function (u: any) { return ((u.adGroupAd && u.adGroupAd.ad && u.adGroupAd.ad.finalUrls) || [])[0]; }).filter(Boolean)[0] || "";
    let utm = ""; try { utm = new URL(fu).searchParams.get("utm_campaign") || ""; } catch (_) { utm = ""; }
    const c: any = { id: id, nome: r.campaign.name, tipo: r.campaign.advertisingChannelType, budget_giorno: eur(r.campaignBudget && r.campaignBudget.amountMicros),
      strategia: off[id] ? off[id].biddingStrategyType : null, tetto_cpc: off[id] && off[id].targetSpend ? eur(off[id].targetSpend.cpcBidCeilingMicros) : null,
      pagina: fu, impressioni: n(mm.impressions), clic: n(mm.clicks), spesa: eur(mm.costMicros), conversioni: n(mm.conversions) };
    const lavori: Promise<any>[] = [];
    if (c.tipo === "SEARCH") {
      lavori.push(g.q("select search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions from search_term_view where campaign.id = " + id + " and " + per + " order by metrics.impressions desc limit 40").then(function (st: any[]) {
        c.ricerche = st.map(function (x: any) { return { r: x.searchTermView.searchTerm, imp: n(x.metrics.impressions), clic: n(x.metrics.clicks), spesa: eur(x.metrics.costMicros) }; }); }));
      lavori.push(g.q("select ad_group_criterion.keyword.text, metrics.impressions, metrics.clicks from keyword_view where campaign.id = " + id + " and " + per + " order by metrics.impressions desc limit 40").then(function (kw: any[]) {
        c.parole_attuali = kw.map(function (x: any) { return x.adGroupCriterion.keyword.text; }); }));
      lavori.push(g.q("select ad_group.resource_name from ad_group where campaign.id = " + id + " and ad_group.status = 'ENABLED' limit 1").then(function (gr: any[]) {
        Object.defineProperty(c, "_gruppo", { value: gr[0] ? gr[0].adGroup.resourceName : null, enumerable: false }); }));
    }
    if (utm) {
      lavori.push(Promise.resolve(SB.from("page_analytics").select("session_id, tipo, elemento, valore").eq("azienda_id", az).eq("utm_campaign", utm).gte("created_at", da + "T00:00:00Z").limit(5000)).then(function (res: any) {
        const pa = res.data || [];
        const s = new Set(pa.map(function (x: any) { return x.session_id; }));
        const sc50 = new Set(pa.filter(function (x: any) { return x.tipo === "scroll" && n(x.elemento) >= 50; }).map(function (x: any) { return x.session_id; }));
        const wa = pa.filter(function (x: any) { return x.tipo === "submit"; }).length;
        const tempi = pa.filter(function (x: any) { return x.tipo === "tempo" && x.elemento === "_pagina"; }).map(function (x: any) { return n(x.valore); });
        c.pagina_visite = { sessioni: s.size, arrivati_meta_pagina: sc50.size, contatti_whatsapp: wa, secondi_medi: tempi.length ? Math.round(tempi.reduce(function (p, v) { return p + v; }, 0) / tempi.length) : null };
      }));
    }
    await Promise.all(lavori);
    return c;
  }));
  if (!elenco.length) return { success: true, vuoto: true, riepilogo: "Nessuna campagna accesa." };
  const sedi = (sediR && sediR.data) || [];
  const dove = sedi.map(function (x: any) { return x.nome + (x.citta ? " (" + x.citta + ")" : ""); }).join(", ");
  const out: any = await claude(SISTEMA, "Azienda: " + ((az0 && az0.data && az0.data.nome) || "") + "\nSede: " + dove + "\nPeriodo: " + da + " - " + a + "\nCampagne accese:\n" + JSON.stringify(elenco));
  const an = (await SB.from("tony_campagne_analisi").insert({ azienda_id: az, da: da, a: a, prova: prova, riepilogo: String(out.riepilogo || ""), dati: { campagne: elenco, risposta: out } }).select("id").single()).data;
  // v7: le modifiche su Google partono in parallelo, l'ordine delle righe resta quello della risposta
  const blocchi: any[][] = await Promise.all((out.campagne || []).map(async function (c: any) {
    const righe: any[] = [];
    const base = elenco.filter(function (x: any) { return x.id === String(c.id); })[0]; if (!base) return righe;
    const ricerche = (base.ricerche || []).map(function (x: any) { return String(x.r).toLowerCase(); });
    const cr = "customers/" + g.cust + "/campaigns/" + base.id;
    if (c.sintesi) righe.push({ tipo: "nota", campagna: base, valore: null, motivo: String(c.sintesi), stato: "applicato" });
    const ops: Promise<any>[] = [];
    for (const e of (c.escludi || []).slice(0, 15)) {
      const t = String(e.testo || "").toLowerCase().trim(); if (!t || t.length > 60) continue;
      if (!ricerche.some(function (r: string) { return r.indexOf(t) >= 0; })) continue; // solo cose viste davvero
      const riga: any = { tipo: "escludi", campagna: base, valore: t, motivo: String(e.motivo || ""), stato: "simulato", esito: "" };
      righe.push(riga);
      if (!prova) ops.push(g.mut({ campaignCriterionOperation: { create: { campaign: cr, negative: true, keyword: { text: t, matchType: "PHRASE" } } } }).then(function (r: any) { riga.stato = r.ok ? "applicato" : "errore"; riga.esito = r.err; }));
    }
    if (base.tipo === "SEARCH") {
      const gruppo = base._gruppo || null;
      const giaPresenti = (base.parole_attuali || []).map(function (x: string) { return x.toLowerCase(); });
      for (const p of (c.parole || []).slice(0, 5)) {
        const t = String(p.testo || "").toLowerCase().trim(); if (!t || t.length > 80 || giaPresenti.indexOf(t) >= 0) continue;
        const riga: any = { tipo: "parola", campagna: base, valore: t, motivo: String(p.motivo || ""), stato: "simulato", esito: "" };
        righe.push(riga);
        if (!prova && gruppo) ops.push(g.mut({ adGroupCriterionOperation: { create: { adGroup: gruppo, status: "ENABLED", keyword: { text: t, matchType: "PHRASE" } } } }).then(function (r: any) { riga.stato = r.ok ? "applicato" : "errore"; riga.esito = r.err; }));
      }
    }
    for (const p of (c.proposte || []).slice(0, 3)) {
      const tipo = String(p.tipo || ""); if (["budget", "cpc", "pausa"].indexOf(tipo) < 0) continue;
      let v = String(p.valore || "").replace(",", ".").replace(/[^\d.]/g, "");
      if (tipo === "budget") { const x = Math.min(BUDGET_MAX, Math.max(1, n(v))); if (!x) continue; v = String(x); }
      if (tipo === "cpc") { const x = Math.min(6, Math.max(0.3, n(v))); if (!x) continue; v = String(x); }
      if (tipo === "pausa") v = "";
      righe.push({ tipo: tipo, campagna: base, valore: v, motivo: String(p.motivo || ""), stato: prova ? "simulato" : "proposto" });
    }
    await Promise.all(ops);
    return righe;
  }));
  const righe: any[] = [].concat.apply([], blocchi as any);
  let ids: any[] = [];
  if (righe.length) ids = ((await SB.from("tony_campagne_suggerimenti").insert(righe.map(function (r: any) { return { analisi_id: an && an.id, azienda_id: az, piattaforma: "google", campagna_id: r.campagna.id, campagna_nome: r.campagna.nome, tipo: r.tipo, valore: r.valore, motivo: r.motivo, stato: r.stato, esito: r.esito || null }; })).select("id")).data || []);
  return { success: true, analisi_id: an && an.id, prova: prova, periodo: { da: da, a: a }, riepilogo: out.riepilogo, voci: righe.map(function (r: any, i: number) { return { id: ids[i] ? ids[i].id : null, campagna: r.campagna.nome, tipo: r.tipo, valore: r.valore, motivo: r.motivo, stato: r.stato, esito: r.esito || "" }; }) };
}

async function decidi(az: string, id: string, approva: boolean, uid: string | null) {
  const s = (await SB.from("tony_campagne_suggerimenti").select("*").eq("id", id).eq("azienda_id", az).maybeSingle()).data;
  if (!s || s.stato !== "proposto") return { success: false, error: "proposta non trovata o gia' decisa" };
  if (!approva) { await SB.from("tony_campagne_suggerimenti").update({ stato: "rifiutato", deciso_da: uid, deciso_at: new Date().toISOString() }).eq("id", id); return { success: true, stato: "rifiutato" }; }
  const g = await google(az); if (!g) return { success: false, error: "Google Ads non collegato" };
  const cr = "customers/" + g.cust + "/campaigns/" + s.campagna_id;
  let r = { ok: false, err: "tipo non gestito" };
  if (s.tipo === "pausa") r = await g.mut({ campaignOperation: { update: { resourceName: cr, status: "PAUSED" }, updateMask: "status" } });
  if (s.tipo === "cpc") r = await g.mut({ campaignOperation: { update: { resourceName: cr, targetSpend: { cpcBidCeilingMicros: String(Math.round(Math.min(6, n(s.valore)) * 1e6)) } }, updateMask: "target_spend.cpc_bid_ceiling_micros" } });
  if (s.tipo === "budget") {
    const b = (await g.q("select campaign_budget.resource_name from campaign where campaign.id = " + s.campagna_id))[0];
    const v = Math.min(BUDGET_MAX, n(s.valore));
    if (b && v > 0) r = await g.mut({ campaignBudgetOperation: { update: { resourceName: b.campaignBudget.resourceName, amountMicros: String(Math.round(v * 1e6)) }, updateMask: "amount_micros" } });
  }
  await SB.from("tony_campagne_suggerimenti").update({ stato: r.ok ? "approvato" : "errore", esito: r.err || null, deciso_da: uid, deciso_at: new Date().toISOString() }).eq("id", id);
  await SB.from("campagne_azioni").insert({ azienda_id: az, user_id: uid, piattaforma: "google", campagna_id: s.campagna_id, nome: s.campagna_nome, azione: "TONY_" + String(s.tipo).toUpperCase() }).then(function () {}, function () {});
  return { success: r.ok, stato: r.ok ? "approvato" : "errore", errore: r.err };
}

Deno.serve(async function (req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const b = await req.json().catch(function () { return {}; });
    const az = String(b.azienda_id || "");
    const u = await chi(req, az);
    if (b.azione === "tutte") {
      if (!u.piattaforma) return json({ success: false, error: "non autorizzato" }, 401);
      const lista = (await SB.from("google_ads_connessioni").select("azienda_id").eq("attivo", true)).data || [];
      const fatti: any[] = [];
      for (const r of lista) { try { const x = await analizza(String(r.azienda_id), false); fatti.push({ azienda: r.azienda_id, ok: x.success }); } catch (e) { fatti.push({ azienda: r.azienda_id, ok: false, errore: String(e).slice(0, 200) }); } }
      return json({ success: true, fatti: fatti });
    }
    if (!u.ok) return json({ success: false, error: "Solo admin o addetto marketing" }, 401);
    if (b.azione === "analizza") { const t0 = Date.now(); const x: any = await analizza(az, b.prova === true); x.ms = Date.now() - t0; return json(x); }
    if (b.azione === "decidi") return json(await decidi(az, String(b.id || ""), b.approva === true, u.uid));
    return json({ success: false, error: "azione sconosciuta" }, 400);
  } catch (e) { return json({ success: false, error: String(e).slice(0, 300) }, 500); }
});
