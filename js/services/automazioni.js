import { generaMessaggio, apriWhatsApp } from "/services/messaggi.js";

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
