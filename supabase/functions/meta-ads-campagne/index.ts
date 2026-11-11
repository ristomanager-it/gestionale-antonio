// META-ADS-CAMPAGNE — per l'app: elenco delle campagne Meta con numeri del periodo e stato; accende o mette in pausa UNA campagna.
// body: { azienda_id, sede_id?, azione: 'elenco', da?, a? }   da/a = giorni YYYY-MM-DD inclusi; senza = ultimi 30 giorni
//       { azienda_id, sede_id?, azione: 'stato', campaign_id, stato: 'ACTIVE'|'PAUSED' }
// Chi puo' chiamarla: un admin dell'azienda (token utente) oppure l'admin di piattaforma (header x-prova).
// Ogni accensione/pausa viene scritta in campagne_azioni.
// v2: ACCENDERE significa accendere TUTTI E TRE I LIVELLI di Meta (campagna, gruppi di inserzioni, inserzioni). Prima si accendeva solo la campagna:
//     gruppo e inserzione restavano in pausa e non partiva nessuna consegna (nessuna impressione, nessuna spesa). Mettere in PAUSA ferma la campagna.
// v3: periodo da/a come google-ads-campagne e totali (spesa, clic, impressioni), per la schermata Analytics.
// v6: il periodo predefinito comprende oggi; insights letti su tutte le pagine.
// v7 (11/11): i gruppi e le inserzioni in pausa non tornavano nell'elenco di Meta (filtro predefinito sullo stato): ora si chiedono
//     esplicitamente tutti gli stati non cancellati e, se l'elenco arriva vuoto (campagne appena create), si riprova dopo 2,5 secondi;
//     se Meta non risponde o non elenca gruppi l'errore finisce in 'problemi' invece di dire "0 accesi" senza motivo.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GRAPH = "https://graph.facebook.com/v21.0";
const STATI = JSON.stringify(["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED", "PENDING_REVIEW", "IN_PROCESS", "WITH_ISSUES", "DISAPPROVED", "PREAPPROVED", "PENDING_BILLING_INFO"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-prova",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function autorizzato(sb: any, req: Request, aziendaId: string): Promise<{ ok: boolean; uid: string | null }> {
  const chiave = req.headers.get("x-prova") || "";
  if (chiave) {
    const { data: cfg } = await sb.from("deploy_config").select("chiave").eq("id", 1).maybeSingle();
    if (cfg?.chiave && chiave === cfg.chiave) return { ok: true, uid: null };
  }
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, uid: null };
  const { data: u } = await sb.auth.getUser(token);
  const uid = u?.user?.id;
  if (!uid) return { ok: false, uid: null };
  const { data: m } = await sb.from("utenti_aziende").select("ruolo").eq("user_id", uid).eq("azienda_id", aziendaId).eq("attivo", true).limit(5);
  const ok = (m || []).some((r: any) => ["admin", "superadmin"].includes(String(r.ruolo).toLowerCase()));
  return { ok, uid };
}

const gGet = async (path: string, token: string, params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params);
  q.set("access_token", token);
  const r = await fetch(GRAPH + path + "?" + q.toString());
  return await r.json();
};
const impostaStato = async (id: string, token: string, stato: string) => {
  const r = await fetch(GRAPH + "/" + id, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ status: stato, access_token: token }).toString() });
  const j: any = await r.json().catch(() => ({}));
  return { ok: !!j?.success, errore: j?.error?.error_user_msg || j?.error?.message || "" };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(SUPABASE_URL, SERVICE);
  const body = await req.json().catch(() => ({}));
  const aziendaId = body.azienda_id;
  if (!aziendaId) return json({ success: false, error: "azienda_id obbligatorio" }, 400);
  const aut = await autorizzato(sb, req, aziendaId);
  if (!aut.ok) return json({ success: false, error: "Non autorizzato: serve un amministratore dell'azienda" }, 401);

  const { data: righe } = await sb.from("meta_ads_connessioni").select("*").eq("azienda_id", aziendaId).eq("attivo", true);
  const conns = (righe || []).filter((c: any) => c.access_token && c.account_id);
  if (!conns.length) return json({ success: false, error: "Meta non collegato", codice: "NON_COLLEGATO" }, 400);
  const conn = (body.sede_id && conns.find((c: any) => c.sede_id === body.sede_id)) || conns[0];
  const token = conn.access_token;
  const accountNum = String(conn.account_id).replace("act_", "");
  const act = "/act_" + accountNum;

  if (body.azione === "stato") {
    const id = String(body.campaign_id || "").replace(/\D/g, "");
    const nuovo = body.stato === "ACTIVE" ? "ACTIVE" : "PAUSED";
    if (!id) return json({ success: false, error: "campaign_id obbligatorio" }, 400);
    const c: any = await gGet("/" + id, token, { fields: "id,name,account_id,status,effective_status" });
    if (!c?.id || String(c.account_id) !== accountNum) return json({ success: false, error: "Campagna non trovata in questo account" }, 404);
    const r = await impostaStato(id, token, nuovo);
    if (!r.ok) return json({ success: false, error: r.errore || "Meta ha rifiutato la modifica", codice: "META" }, 400);

    let gruppi = 0, inserzioni = 0; const problemi: string[] = [];
    if (nuovo === "ACTIVE") {
      const leggi = () => Promise.all([
        gGet("/" + id + "/adsets", token, { fields: "id,name,status", limit: "100", effective_status: STATI }),
        gGet("/" + id + "/ads", token, { fields: "id,name,status", limit: "200", effective_status: STATI }),
      ]);
      let [gs, as]: any[] = await leggi();
      // campagne appena create: Meta a volte non elenca ancora gruppi e inserzioni, si riprova una volta
      if (!(gs?.data || []).length || !(as?.data || []).length) { await new Promise((r) => setTimeout(r, 2500)); [gs, as] = await leggi(); }
      if (!(gs?.data || []).length) problemi.push("Meta non ha elencato nessun gruppo di inserzioni: controlla che la campagna ne abbia uno");
      if (gs?.error) problemi.push("elenco gruppi: " + (gs.error.message || "errore"));
      if (as?.error) problemi.push("elenco inserzioni: " + (as.error.message || "errore"));
      for (const g of gs?.data || []) { if (g.status === "ACTIVE") continue; const x = await impostaStato(g.id, token, "ACTIVE"); if (x.ok) gruppi++; else problemi.push("gruppo " + g.name + ": " + x.errore); }
      for (const a of as?.data || []) { if (a.status === "ACTIVE") continue; const x = await impostaStato(a.id, token, "ACTIVE"); if (x.ok) inserzioni++; else problemi.push("inserzione " + a.name + ": " + x.errore); }
    }
    await sb.from("campagne_azioni").insert({ azienda_id: aziendaId, user_id: aut.uid, piattaforma: "meta", campagna_id: id, nome: c.name, azione: nuovo === "ACTIVE" ? "ENABLED" : "PAUSED" });
    const dopo: any = await gGet("/" + id, token, { fields: "status,effective_status" });
    return json({ success: problemi.length === 0, campaign_id: id, nome: c.name, stato: dopo.status, stato_effettivo: dopo.effective_status, gruppi_accesi: gruppi, inserzioni_accese: inserzioni, problemi, ...(problemi.length ? { error: problemi.join(" | ") } : {}) });
  }

  // elenco: periodo da/a (giorni inclusi) oppure ultimi 30 giorni
  const reData = /^\d{4}-\d{2}-\d{2}$/;
  const da = reData.test(String(body.da || "")) ? String(body.da) : null;
  const a = reData.test(String(body.a || "")) ? String(body.a) : null;
  // v6: "last_30d" di Meta NON comprende oggi: le campagne partite ieri sera o oggi risultavano a zero.
  //     Senza da/a si usa un intervallo esplicito di 30 giorni che finisce OGGI (ora italiana).
  const oggi = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const giorno = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const inizio = new Date(oggi.getTime() - 29 * 86400000);
  const periodo: Record<string, string> = { time_range: JSON.stringify(da && a ? { since: da, until: a } : { since: giorno(inizio), until: giorno(oggi) }) };
  const camp: any = await gGet(act + "/campaigns", token, { fields: "id,name,status,effective_status,daily_budget,objective,created_time", limit: "60" });
  if (camp.error) return json({ success: false, error: camp.error.message || "Meta non ha risposto", codice: "META" }, 400);
  // v6: tutte le pagine di risultati (prima si leggevano solo le prime 100 righe)
  const perId: Record<string, any> = {};
  let ins: any = await gGet(act + "/insights", token, { level: "campaign", fields: "campaign_id,impressions,clicks,spend", limit: "200", ...periodo });
  for (let giro = 0; giro < 10; giro++) {
    for (const r of ins.data || []) perId[r.campaign_id] = r;
    const prossima = ins?.paging?.next;
    if (!prossima) break;
    ins = await (await fetch(prossima)).json();
  }
  const n = (x: unknown) => Number(x || 0);
  const campagne = (camp.data || []).map((c: any) => {
    const k = perId[c.id] || {};
    return {
      id: c.id, nome: c.name, stato: c.status, stato_effettivo: c.effective_status, obiettivo: c.objective,
      budget_eur: n(c.daily_budget) / 100, spesa_eur: n(k.spend), clic: n(k.clicks), impressioni: n(k.impressions), creata: c.created_time,
    };
  }).sort((x: any, y: any) => (y.stato === "ACTIVE" ? 1 : 0) - (x.stato === "ACTIVE" ? 1 : 0) || String(y.creata).localeCompare(String(x.creata)));
  const totali = campagne.reduce((t: any, c: any) => ({ spesa_eur: t.spesa_eur + c.spesa_eur, clic: t.clic + c.clic, impressioni: t.impressioni + c.impressioni }), { spesa_eur: 0, clic: 0, impressioni: 0 });
  return json({ success: true, account: accountNum, pagina: conn.pagina_nome, periodo: da && a ? { da, a } : "ultimi 30 giorni, oggi compreso", totali, campagne });
});
