import { generaMessaggio, apriWhatsApp } from "./messaggi.js";

const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

async function emailDaContatto(contattoId){
  if(!contattoId) return null;
  try {
    const { data } = await window.supabaseClient.from("contatti").select("email").eq("id", contattoId).maybeSingle();
    return data?.email || null;
  } catch(e){ return null; }
}

export async function eseguiAutomazioni(evento, pren){

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  // 🔥 PRENDI TEMPLATE ATTIVI PER EVENTO
  const { data: templates } = await supabase
    .from("messaggi_template")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .eq("trigger_evento", evento);

  if(!templates || !templates.length) return;

  const now = new Date();

  for(const t of templates){

    let invia = false;

    // 🔥 SUBITO
    if(t.timing_tipo === "subito"){
      invia = true;
    }

    // 🔥 PRIMA / DOPO
    if(t.timing_tipo === "prima" || t.timing_tipo === "dopo"){

      if(!pren.data || !pren.ora) continue;

      const dataPren = new Date(`${pren.data}T${pren.ora}`);

      let diffMs = dataPren - now;

      if(t.timing_tipo === "dopo"){
        diffMs = now - dataPren;
      }

      let diffMin = diffMs / 60000;

      let targetMin = t.timing_valore;

      if(t.timing_unita === "ore") targetMin *= 60;
      if(t.timing_unita === "giorni") targetMin *= 1440;

      // 🔥 tolleranza ±10 minuti
      if(diffMin > (targetMin - 10) && diffMin < (targetMin + 10)){
        invia = true;
      }
    }

    if(!invia) continue;

    // 📧 EMAIL: invio reale via edge (Resend)
    if(t.tipo === "email"){
      if(t.invia_email === false){ continue; }
      const dest = pren.cliente_email || pren.email || await emailDaContatto(pren.contatto_id);
      if(dest){
        try {
          const { data: sess } = await supabase.auth.getSession();
          const token = sess?.session?.access_token || ANON_KEY;
          await fetch(SUPABASE_URL + "/functions/v1/invia-email-momento", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, "apikey": ANON_KEY },
            body: JSON.stringify({
              azienda_id: aziendaId,
              template_id: t.id,
              destinatario: dest,
              mittente_nome: window.state?.azienda?.nome || "Ristoflow",
              dati: {
                nome: pren.cliente_nome,
                cognome: pren.cognome,
                nome_completo: [pren.cliente_nome, pren.cognome].filter(Boolean).join(" "),
                data: pren.data, data_prenotazione: pren.data,
                ora: pren.ora, ora_prenotazione: pren.ora,
                num_persone: pren.coperti, coperti: pren.coperti,
                nome_ristorante: window.state?.azienda?.nome || ""
              }
            })
          });
        } catch(e){ console.error("Email momento:", e); }
      }
      continue;
    }

    // 🔥 GENERA MESSAGGIO
    const testo = await generaMessaggio(t.tipo, {
      nome: pren.cliente_nome,
      data: pren.data,
      ora: pren.ora,
      coperti: pren.coperti
    });

    if(testo){
      apriWhatsApp(pren.cliente_telefono, testo);
    }
  }
}
