// CREDITI-WEBHOOK v4 — Stripe conferma il pagamento, qui si accreditano i crediti.
// verify_jwt DEVE restare false: chi chiama e' Stripe, non un utente.
// v3: salva anche l'importo incassato sul movimento, cosi' in piattaforma
//     si confronta subito ricavo e costo.
// v4: pagamento "voce del locale" (metadata.tipo = voce_clonata, da centralino-agenti):
//     sblocca la registrazione della voce del titolare per quella sede.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
function json(s: number, b: unknown) {
  return new Response(JSON.stringify(b), {
    status: s, headers: Object.assign({}, cors, { "Content-Type": "application/json" })
  });
}

function esadecimale(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}

async function firmaValida(payload: string, header: string, segreto: string) {
  if (!header) return false;
  let t = "";
  const v1: string[] = [];
  for (const pezzo of header.split(",")) {
    const i = pezzo.indexOf("=");
    if (i === -1) continue;
    const k = pezzo.slice(0, i).trim();
    const v = pezzo.slice(i + 1).trim();
    if (k === "t") t = v;
    if (k === "v1") v1.push(v);
  }
  if (!t || !v1.length) return false;

  const eta = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (isNaN(eta) || eta > 300) return false;

  const chiave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(segreto),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const firma = await crypto.subtle.sign("HMAC", chiave, new TextEncoder().encode(t + "." + payload));
  return v1.indexOf(esadecimale(firma)) !== -1;
}

async function segretoWebhook(): Promise<string> {
  const daEnv = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  if (daEnv) return daEnv;
  const { data } = await supabase.from("stripe_piattaforma")
    .select("webhook_secret").eq("id", 1).maybeSingle();
  return data && data.webhook_secret ? String(data.webhook_secret) : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const segreto = await segretoWebhook();
    const payload = await req.text();
    const header = req.headers.get("stripe-signature") || "";

    if (!segreto) {
      console.error("segreto webhook mancante: evento rifiutato");
      return json(500, { received: false, error: "webhook non configurato" });
    }
    if (!(await firmaValida(payload, header, segreto))) {
      console.error("firma Stripe non valida");
      return json(400, { received: false, error: "firma non valida" });
    }

    const evento = JSON.parse(payload);
    const tipo = String(evento.type || "");
    if (tipo !== "checkout.session.completed") {
      return json(200, { received: true, ignorato: tipo });
    }

    const s = evento.data && evento.data.object ? evento.data.object : {};
    if (String(s.payment_status || "") !== "paid") {
      return json(200, { received: true, nota: "sessione non pagata" });
    }

    const meta = s.metadata || {};

    // v4: voce del locale pagata -> si puo' registrare
    if (String(meta.tipo || "") === "voce_clonata") {
      const az = String(meta.azienda_id || ""), sede = String(meta.sede_id || "");
      if (!az || !sede) return json(200, { received: true, errore: "metadata voce mancanti" });
      const pagamento = { sessione: String(s.id || ""), importo_eur: Number(s.amount_total || 0) / 100, il: new Date().toISOString() };
      const { data: c } = await supabase.from("centralino_config").select("id").eq("azienda_id", az).eq("sede_id", sede).maybeSingle();
      const campi = { voce_clonata_pagata: true, voce_clonata_pagamento: pagamento };
      const r = c
        ? await supabase.from("centralino_config").update(campi).eq("id", c.id)
        : await supabase.from("centralino_config").insert({ azienda_id: az, sede_id: sede, ...campi });
      if (r.error) {
        console.error("voce pagata, salvataggio fallito", r.error.message);
        return json(500, { received: false, error: r.error.message });
      }
      return json(200, { received: true, voce_pagata: true, azienda: az, sede });
    }

    const aziendaId = String(meta.azienda_id || s.client_reference_id || "");
    const crediti = Number(meta.crediti || 0);
    if (!aziendaId || !crediti) {
      console.error("metadata insufficienti", JSON.stringify(meta).slice(0, 200));
      return json(200, { received: true, errore: "metadata mancanti" });
    }

    const importo = Number(s.amount_total || 0) / 100;
    const sessione = String(s.id || "");

    const { data, error } = await supabase.rpc("ai_credito_ricarica", {
      p_azienda: aziendaId,
      p_crediti: crediti,
      p_riferimento: sessione,
      p_nota: "Stripe " + String(meta.pacchetto || "") + " — " +
              importo.toFixed(2) + " " + String(s.currency || "eur").toUpperCase(),
      p_tipo: "ricarica"
    });

    if (error) {
      console.error("accredito fallito", error.message);
      return json(500, { received: false, error: error.message });
    }

    // l'importo incassato sul movimento appena creato
    if (importo > 0 && sessione) {
      await supabase.from("ai_credito_movimenti")
        .update({ importo_eur: importo })
        .eq("azienda_id", aziendaId).eq("riferimento", sessione).eq("tipo", "ricarica");
    }

    return json(200, { received: true, azienda: aziendaId, crediti: crediti, importo_eur: importo, saldo: data });

  } catch (err) {
    console.error("CREDITI-WEBHOOK:", err);
    return json(500, { received: false, error: err instanceof Error ? err.message : "Errore interno" });
  }
});
