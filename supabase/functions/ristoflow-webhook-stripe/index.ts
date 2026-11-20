// supabase/functions/ristoflow-webhook-stripe/index.ts
// Riceve eventi Stripe e aggiorna abbonamenti SaaS
// formula nei metadata dell'abbonamento: mensile | annuale | 3rate.
// 3rate = annuale in 3 rate mensili: dopo la terza rata l'abbonamento Stripe si ferma ma il piano resta attivo per l'anno.

async function stripeGet(path: string) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { "Authorization": `Bearer ${STRIPE_SK}` } });
  return await r.json();
}
const fineCiclo = (sub: any) => Number(sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end || 0);
const giorno = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 10);
const traUnAnno = (sec: number) => { const d = new Date(sec * 1000); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const STRIPE_SK             = Deno.env.get("STRIPE_RISTOFLOW_SK") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_RISTOFLOW_WEBHOOK_SECRET") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body      = await req.text();
    const signature = req.headers.get("stripe-signature") ?? "";

    // Verifica firma webhook Stripe
    let event: any;
    try {
      event = await verificaFirma(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (e) {
      console.error("Firma webhook non valida:", e);
      return new Response("Firma non valida", { status: 400 });
    }

    console.log("Evento Stripe:", event.type);

    switch (event.type) {

      // ── Checkout completato ─────────────────────────────
      case "checkout.session.completed": {
        const session    = event.data.object;
        const aziendaId  = session.metadata?.azienda_id;
        const pianoId    = session.metadata?.piano_id;
        const subId      = session.subscription;
        if (!aziendaId || !pianoId) break;
        const formula   = session.metadata?.formula || "mensile";

        // Calcola scadenza
        let scadeIl: string | null = null;
        if (subId) {
          const sub = await stripeGet(`subscriptions/${subId}`);
          if (formula === "3rate") {
            // tre rate mensili: l'abbonamento Stripe si ferma dopo la terza (circa 75 giorni), il piano vale un anno
            const inizio = Number(sub.start_date || sub.created || Math.floor(Date.now() / 1000));
            await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${STRIPE_SK}`, "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ cancel_at: String(inizio + 75 * 86400), proration_behavior: "none" }),
            });
            scadeIl = traUnAnno(inizio);
          } else {
            scadeIl = giorno(fineCiclo(sub));
          }
        } else {
          // One-time — scade tra 1 anno
          const d = new Date(); d.setFullYear(d.getFullYear() + 1);
          scadeIl = d.toISOString().slice(0, 10);
        }

        await supabase.from("aziende").update({
          piano_id:               pianoId,
          stripe_subscription_id: subId || null,
          abbonamento_stato:      "attivo",
          abbonamento_scade_il:   scadeIl,
        }).eq("id", aziendaId);

        // Notifica superadmin
        await supabase.from("notifiche").insert({
          azienda_id: "aa568c35-477a-474d-9bc3-97a954d78d8d", // superadmin
          tipo: "nuovo_abbonamento",
          titolo: `💳 Nuovo abbonamento — ${aziendaId}`,
          messaggio: `Piano attivato (${formula === "3rate" ? "annuale in 3 rate" : formula}). Scade: ${scadeIl}`,
          letto: false,
        });
        break;
      }

      // ── Abbonamento rinnovato ───────────────────────────
      case "invoice.payment_succeeded": {
        const invoice   = event.data.object;
        const subId     = invoice.subscription || invoice.parent?.subscription_details?.subscription;
        if (!subId) break;

        // Trova azienda per subscription_id
        const { data: az } = await supabase
          .from("aziende")
          .select("id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();
        if (!az) break;

        // Aggiorna scadenza (con le 3 rate la scadenza resta quella annuale)
        const sub = await stripeGet(`subscriptions/${subId}`);
        const agg: Record<string, string> = { abbonamento_stato: "attivo" };
        if (sub?.metadata?.formula !== "3rate") agg.abbonamento_scade_il = giorno(fineCiclo(sub));
        await supabase.from("aziende").update(agg).eq("id", az.id);
        break;
      }

      // ── Pagamento fallito ───────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId   = invoice.subscription || invoice.parent?.subscription_details?.subscription;
        if (!subId) break;

        const { data: az } = await supabase
          .from("aziende").select("id")
          .eq("stripe_subscription_id", subId).maybeSingle();
        if (!az) break;

        await supabase.from("aziende").update({
          abbonamento_stato: "pagamento_fallito",
        }).eq("id", az.id);

        await supabase.from("notifiche").insert({
          azienda_id: "aa568c35-477a-474d-9bc3-97a954d78d8d",
          tipo: "pagamento_fallito",
          titolo: `⚠️ Pagamento fallito — ${az.id}`,
          messaggio: `Abbonamento con pagamento fallito. Verificare.`,
          letto: false,
        });
        break;
      }

      // ── Abbonamento cancellato ──────────────────────────
      case "customer.subscription.deleted": {
        const sub     = event.data.object;
        const { data: az } = await supabase
          .from("aziende").select("id")
          .eq("stripe_subscription_id", sub.id).maybeSingle();
        if (!az) break;

        // 3 rate tutte pagate: e' la fine prevista delle rate, il piano resta attivo fino alla scadenza annuale
        if (sub?.metadata?.formula === "3rate") {
          const pagate = await stripeGet(`invoices?subscription=${sub.id}&status=paid&limit=10`);
          if ((pagate?.data || []).length >= 3) {
            await supabase.from("aziende").update({ stripe_subscription_id: null }).eq("id", az.id);
            break;
          }
        }

        await supabase.from("aziende").update({
          abbonamento_stato:      "cancellato",
          stripe_subscription_id: null,
        }).eq("id", az.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("WEBHOOK ERROR:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

// Verifica firma Stripe senza libreria
async function verificaFirma(payload: string, signature: string, secret: string): Promise<any> {
  if (!secret) {
    // In sviluppo senza secret — accetta tutto
    return JSON.parse(payload);
  }
  const parts     = signature.split(",").reduce((acc: any, p) => { const [k,v]=p.split("="); acc[k]=v; return acc; }, {});
  const timestamp = parts.t;
  const sig       = parts.v1;
  const toSign    = `${timestamp}.${payload}`;
  const key       = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const signed    = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  const expected  = Array.from(new Uint8Array(signed)).map(b=>b.toString(16).padStart(2,"0")).join("");
  if (expected !== sig) throw new Error("Firma non valida");
  return JSON.parse(payload);
}
