// supabase/functions/ristoflow-crea-abbonamento/index.ts
// Crea una sessione Checkout Stripe per abbonamento SaaS
// + invia automaticamente WhatsApp e email all'admin dell'azienda
// formula: "mensile" (prezzo pieno, ogni mese) | "annuale" (unica soluzione, -20%) | "3rate" (annuale in 3 rate mensili nei primi 3 mesi, -10%)
// Le 3 rate sono un abbonamento mensile che il webhook ferma dopo la terza: il piano resta attivo per l'anno intero.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_SK     = Deno.env.get("STRIPE_RISTOFLOW_SK") ?? "";
const WA_TOKEN      = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const WA_PHONE_ID   = "1079292468608484";
const RESEND_KEY    = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL       = "https://app.ristoflow-ai.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { azienda_id, piano_id } = body;
    if (!azienda_id || !piano_id) return json({ error: "Parametri mancanti" }, 400);

    // Carica azienda, piano e admin in parallelo
    const [azRes, pianoRes, adminRes] = await Promise.all([
      supabase.from("aziende").select("id, nome, stripe_customer_id, whatsapp, telefono").eq("id", azienda_id).maybeSingle(),
      supabase.from("piani_abbonamento").select("*").eq("id", piano_id).maybeSingle(),
      supabase.from("utenti_aziende").select("email").eq("azienda_id", azienda_id).eq("ruolo", "admin").eq("stato_invito", "attivo").maybeSingle(),
    ]);

    const az    = azRes.data;
    const piano = pianoRes.data;
    if (!az || !piano) return json({ error: "Azienda o piano non trovato" }, 404);

    const adminEmail = adminRes.data?.email ?? null;

    // Formula di pagamento: se non indicata vale quella del piano (es. Fondatore = annuale)
    let formula = ["mensile", "annuale", "3rate"].includes(String(body.formula)) ? String(body.formula)
      : (piano.tipo_fatturazione === "annuale" ? "annuale" : "mensile");
    if (piano.tipo_fatturazione === "annuale" && formula === "mensile") formula = "annuale";

    // Riga da pagare: il mensile usa il prezzo salvato su Stripe; annuale e 3 rate si calcolano dal listino
    const riga: Record<string, string> = { "line_items[0][quantity]": "1" };
    let descrizione = "";
    if (formula === "mensile" && piano.stripe_price_id_mensile) {
      riga["line_items[0][price]"] = piano.stripe_price_id_mensile;
      descrizione = `${piano.prezzo_mensile} € al mese`;
    } else {
      let importo = 0, intervallo = "month", nome = `Ristoflow ${piano.nome}`;
      if (formula === "annuale") {
        importo = Number(piano.prezzo_annuale) || 0; intervallo = "year";
        nome += " — annuale (unica soluzione)";
        descrizione = `${importo} € l'anno, unica soluzione`;
      } else if (formula === "3rate") {
        const tot = Number(piano.prezzo_3rate) || 0;
        importo = Math.round(tot / 3); intervallo = "month";
        nome += " — annuale in 3 rate";
        descrizione = `3 rate mensili da ${importo} € (annuale ${tot} €)`;
      } else {
        importo = Number(piano.prezzo_mensile) || 0;
        descrizione = `${importo} € al mese`;
      }
      if (importo <= 0) return json({ error: "Prezzo non configurato per questa formula" }, 400);
      riga["line_items[0][price_data][currency]"] = "eur";
      riga["line_items[0][price_data][unit_amount]"] = String(Math.round(importo * 100));
      riga["line_items[0][price_data][recurring][interval]"] = intervallo;
      riga["line_items[0][price_data][product_data][name]"] = nome;
    }

    // Crea o recupera customer Stripe
    let customerId = az.stripe_customer_id;
    if (!customerId) {
      const custRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: { "Authorization": `Bearer ${STRIPE_SK}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          name: az.nome,
          ...(adminEmail ? { email: adminEmail } : {}),
          "metadata[azienda_id]": azienda_id,
        }),
      });
      const cust = await custRes.json();
      if (!custRes.ok) return json({ error: cust.error?.message }, 400);
      customerId = cust.id;
      await supabase.from("aziende").update({ stripe_customer_id: customerId }).eq("id", azienda_id);
    }

    // Crea sessione Checkout
    const checkoutRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${STRIPE_SK}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        customer:                     customerId,
        mode:                         "subscription",
        ...riga,
        success_url:                  `${APP_URL}/#/gestione-aziende?abbonamento=success&az=${azienda_id}`,
        cancel_url:                   `${APP_URL}/#/gestione-aziende?abbonamento=cancel`,
        "metadata[azienda_id]":       azienda_id,
        "metadata[piano_id]":         piano_id,
        "metadata[formula]":          formula,
        "metadata[tipo]":             "saas_abbonamento",
        "allow_promotion_codes":      "true",
        "subscription_data[metadata][azienda_id]": azienda_id,
        "subscription_data[metadata][piano_id]":   piano_id,
        "subscription_data[metadata][formula]":    formula,
      }),
    });

    const checkout = await checkoutRes.json();
    if (!checkoutRes.ok) return json({ error: checkout.error?.message }, 400);

    const checkoutUrl = checkout.url;

    // Salva piano in attesa
    await supabase.from("aziende").update({
      piano_id,
      abbonamento_stato: "in_attesa_pagamento",
    }).eq("id", azienda_id);

    // ── Invia notifiche in parallelo (non bloccanti) ──────────────
    const notifiche: Promise<void>[] = [];
    const pianoTesto = `${piano.nome} — ${descrizione}`;

    const waNumero = az.whatsapp || az.telefono;
    if (waNumero && WA_TOKEN) {
      const waClean = waNumero.replace(/\D/g, "");
      const waFull = waClean.startsWith("39") ? waClean : `39${waClean}`;
      notifiche.push(inviaWhatsApp(waFull, az.nome, pianoTesto, checkoutUrl));
    }
    if (adminEmail && RESEND_KEY) {
      notifiche.push(inviaEmail(adminEmail, az.nome, pianoTesto, checkoutUrl));
    }
    await Promise.allSettled(notifiche);

    return json({ url: checkoutUrl, formula, descrizione, email_inviata: !!adminEmail, wa_inviato: !!(waNumero && WA_TOKEN) });

  } catch (e) {
    console.error("ERRORE:", e);
    return json({ error: String(e) }, 500);
  }
});

async function inviaWhatsApp(numero: string, nomeAzienda: string, nomePiano: string, url: string): Promise<void> {
  const testo =
    `Ciao! 👋\n\n` +
    `Il tuo account *${nomeAzienda}* su Ristoflow.AI è pronto per essere attivato.\n\n` +
    `Piano selezionato: *${nomePiano}*\n\n` +
    `Clicca qui per completare il pagamento e attivare subito la piattaforma:\n${url}\n\n` +
    `Dopo il pagamento ti contattiamo per la formazione online, compresa nel pacchetto.\n` +
    `Il link è valido per 24 ore. Per qualsiasi informazione rispondi a questo messaggio. 🙏`;
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: numero, type: "text", text: { body: testo } }),
    });
    const data = await res.json();
    if (!res.ok) console.error("WhatsApp error:", JSON.stringify(data));
  } catch (e) {
    console.error("inviaWhatsApp errore:", e);
  }
}

async function inviaEmail(email: string, nomeAzienda: string, nomePiano: string, url: string): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="https://app.ristoflow-ai.com/img/logo.png" alt="Ristoflow.AI" style="height:40px;" />
      </div>
      <h2 style="color:#0E5A7A;margin-bottom:8px;">Attiva il tuo abbonamento</h2>
      <p style="color:#374151;">Ciao! Il tuo account <strong>${nomeAzienda}</strong> su Ristoflow.AI è pronto per essere attivato.</p>
      <p style="color:#374151;">Piano selezionato: <strong>${nomePiano}</strong></p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${url}" style="background:#0E5A7A;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
          💳 Completa il pagamento
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Il link è valido per 24 ore. Dopo il pagamento la piattaforma è attiva subito e ti contattiamo per la formazione online, compresa nel pacchetto.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:12px;text-align:center;">Ristoflow.AI — La piattaforma gestionale per la ristorazione italiana</p>
    </div>
  `;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Ristoflow.AI <noreply@ristoflow-ai.com>",
        to: [email],
        subject: `Attiva il tuo abbonamento — Ristoflow.AI`,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) console.error("Resend error:", JSON.stringify(data));
  } catch (e) {
    console.error("inviaEmail errore:", e);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
