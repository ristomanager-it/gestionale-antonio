// RISTOFLOW - haccp-alert-ritardi
// Estende alert-produzioni-aperte: avvisa PER SEDE (manager di competenza da
// alert_manager_sede) + l'operatore firmatario, quando una fase HACCP non e'
// firmata entro (tempo previsto in ricetta + margine 50%). Notifica in-app + WhatsApp.
// Alert per singola fase (non un flag unico per lotto). Chiamata dal cron.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FATTORE_FASE = 1.5;     // tempo previsto + 50%
const MIN_FASE_ALERT = 15;    // sotto i 15 min non allerto (rumore)
const TETTO_ORE = 48;         // scadenze oltre 48h dall'apertura = dato sospetto, ignoro
const WA_TEMPLATE = "produzione_aperta_alert";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(payload: any, status?: number) {
  return new Response(JSON.stringify(payload), { status: status || 200, headers: Object.assign({}, cors, { "Content-Type": "application/json" }) });
}
function normTel(t: any) { let s = String(t || "").replace(/[^0-9]/g, ""); if (!s) return ""; if (s.length === 10 && s[0] === "3") s = "39" + s; return s; }
function minTra(a: number, b: number) { return Math.floor((a - b) / 60000); }

Deno.serve(async function (req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = Date.now();

  // 1) lotti aperti
  const { data: lotti, error } = await supabase
    .from("produzione_lotti")
    .select("id, azienda_id, lotto_uuid, ricetta_id, sede_uuid, operatore_id, created_at, codice_lotto, ricette(nome)")
    .eq("stato", "aperta");
  if (error) return json({ success: false, error: error.message }, 500);
  if (!lotti || !lotti.length) return json({ success: true, avvisi: 0 });

  // 2) durate per ordine/tipo, per ricetta
  const ricetteIds = Array.from(new Set(lotti.map(function (l) { return l.ricetta_id; }).filter(Boolean)));
  const durataByRicettaOrdine: any = {};
  const durataByRicettaTipo: any = {};
  if (ricetteIds.length) {
    const { data: fasiMeta } = await supabase.from("ricette_preparazione_fasi")
      .select("ricetta_id, ordine, tipo_fase, durata_min").in("ricetta_id", ricetteIds);
    (fasiMeta || []).forEach(function (f: any) {
      const d = Number(f.durata_min) || 0;
      if (d <= 0) return;
      durataByRicettaOrdine[f.ricetta_id + "_" + f.ordine] = d;
      if (f.tipo_fase) durataByRicettaTipo[f.ricetta_id + "_" + String(f.tipo_fase).toLowerCase()] = d;
    });
  }

  // 3) fasi HACCP per lotto
  const uuids = lotti.map(function (l) { return l.lotto_uuid; }).filter(Boolean);
  const fasiByLotto: any = {};
  if (uuids.length) {
    const { data: haccp } = await supabase.from("produzione_log_haccp")
      .select("id, lotto_id, fase_ordine, fase_nome, fase_tipo, firmato, alert_ritardo_inviato_at").in("lotto_id", uuids);
    (haccp || []).forEach(function (h: any) { (fasiByLotto[h.lotto_id] = fasiByLotto[h.lotto_id] || []).push(h); });
  }

  const esiti: any[] = [];

  for (const l of lotti) {
    const aperturaMs = new Date(l.created_at).getTime();
    if (!aperturaMs) continue;
    const fasi = (fasiByLotto[l.lotto_uuid] || []).slice().sort(function (a: any, b: any) { return (a.fase_ordine || 0) - (b.fase_ordine || 0); });
    if (!fasi.length) continue;

    let cumulativoMin = 0;
    for (const f of fasi) {
      const durMin = durataByRicettaOrdine[l.ricetta_id + "_" + f.fase_ordine]
        || durataByRicettaTipo[l.ricetta_id + "_" + String(f.fase_tipo || "").toLowerCase()]
        || 0;
      const inizioFaseMs = aperturaMs + cumulativoMin * 60000;
      cumulativoMin += durMin;

      if (f.firmato) continue;
      if (durMin <= 0) continue;
      if (f.alert_ritardo_inviato_at) continue;

      const scadenzaMs = inizioFaseMs + durMin * FATTORE_FASE * 60000;
      if ((scadenzaMs - aperturaMs) > TETTO_ORE * 3600000) continue;   // tetto sicurezza
      if (now < scadenzaMs) continue;                                   // non scaduta
      const ritardoMin = minTra(now, scadenzaMs);
      if (ritardoMin < MIN_FASE_ALERT) continue;

      const nomeRic = (l.ricette && l.ricette.nome) ? l.ricette.nome : "Ricetta";
      const titolo = "Ritardo fase HACCP";
      const codice = l.codice_lotto || String(l.lotto_uuid).slice(0, 8);
      const msg = nomeRic + " (lotto " + codice + "): la fase \"" + (f.fase_nome || f.fase_tipo) +
        "\" non e' stata firmata in tempo (previsto " + durMin + " min + 50%). Ritardo ~" + ritardoMin + " min.";

      await inviaAvvisi(supabase, l, titolo, msg, ritardoMin);

      await supabase.from("produzione_log_haccp")
        .update({ alert_ritardo_inviato_at: new Date().toISOString(), scadenza_prevista: new Date(scadenzaMs).toISOString() })
        .eq("id", f.id);

      esiti.push({ lotto: codice, fase: f.fase_nome, ritardoMin: ritardoMin });
    }
  }

  return json({ success: true, avvisi: esiti.length, dettaglio: esiti });
});

async function inviaAvvisi(supabase: any, lotto: any, titolo: string, messaggio: string, ritardoMin: number) {
  // destinatari: manager della sede + operatore firmatario
  const dest: any[] = [];

  const { data: mgr } = await supabase.from("alert_manager_sede")
    .select("user_id, telefono, riceve_whatsapp, riceve_inapp")
    .eq("azienda_id", lotto.azienda_id).eq("sede_uuid", lotto.sede_uuid).eq("attivo", true);
  (mgr || []).forEach(function (m: any) {
    dest.push({ user_id: m.user_id, telefono: m.telefono, inapp: m.riceve_inapp !== false, wa: m.riceve_whatsapp !== false && !!m.telefono });
  });

  if (lotto.operatore_id) {
    const { data: op } = await supabase.from("dipendenti").select("user_id, telefono").eq("user_id", lotto.operatore_id).maybeSingle();
    if (op) dest.push({ user_id: op.user_id, telefono: op.telefono, inapp: true, wa: !!op.telefono });
  }

  // notifiche in-app
  for (const d of dest) {
    if (!d.inapp) continue;
    await supabase.from("notifiche_inapp").insert({
      azienda_id: lotto.azienda_id, sede_uuid: lotto.sede_uuid, user_id: d.user_id || null,
      tipo: "ritardo_fase_haccp", titolo: titolo, messaggio: messaggio, riferimento_id: lotto.lotto_uuid,
    });
  }

  // WhatsApp via connessione Meta dell'azienda (stesso pattern di alert-produzioni-aperte)
  try {
    const { data: connAll } = await supabase.from("whatsapp_connessioni").select("*")
      .eq("azienda_id", lotto.azienda_id).eq("modalita", "meta").eq("attivo", true);
    const conn = (connAll || []).find(function (c: any) { return !c.sede_id; }) || (connAll && connAll[0]) || null;
    if (conn && conn.meta_access_token && conn.meta_phone_number_id) {
      const numeri = Array.from(new Set(dest.filter(function (d: any) { return d.wa; }).map(function (d: any) { return normTel(d.telefono); }).filter(Boolean)));
      for (const tel of numeri) {
        try {
          await fetch("https://graph.facebook.com/v21.0/" + conn.meta_phone_number_id + "/messages", {
            method: "POST",
            headers: { "Authorization": "Bearer " + conn.meta_access_token, "Content-Type": "application/json" },
            body: JSON.stringify({ messaging_product: "whatsapp", to: tel, type: "template", template: { name: WA_TEMPLATE, language: { code: "it" }, components: [{ type: "body", parameters: [{ type: "text", text: "1" }, { type: "text", text: messaggio.slice(0, 90) }] }] } }),
          });
        } catch (_e) { /* best-effort */ }
      }
    }
  } catch (_e) { /* best-effort */ }
}
