export async function aggiornaTagCliente(contattoId){

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  // 🔥 PRENOTAZIONI CLIENTE
  const { data: pren } = await supabase
    .from("prenotazioni_tavoli")
    .select("stato, coperti")
    .eq("contatto_id", contattoId);

  if(!pren) return;

  const totale = pren.length;
  const noShow = pren.filter(p => p.stato === "no_show").length;

  let nuoviTag = [];

  // 🔥 LOGICA TAG

  if(totale === 1){
    nuoviTag.push("nuovo_cliente");
  }

  if(totale >= 3){
    nuoviTag.push("abituale");
  }

  if(totale >= 10){
    nuoviTag.push("vip");
  }

  if(noShow >= 2){
    nuoviTag.push("no_show_rischio");
  }

  // 🔥 PRENDI TAG ATTUALI
  const { data: contatto } = await supabase
    .from("contatti")
    .select("tag")
    .eq("id", contattoId)
    .single();

  const vecchiTag = contatto?.tag || [];

  // 🔥 CONFRONTO
  const aggiunti = nuoviTag.filter(t => !vecchiTag.includes(t));
  const rimossi = vecchiTag.filter(t => !nuoviTag.includes(t));

  // 🔥 LOG SOLO SE CAMBIA QUALCOSA
  if(aggiunti.length || rimossi.length){

    const log = [];

    aggiunti.forEach(t=>{
      log.push({
        contatto_id: contattoId,
        azienda_id: aziendaId,
        tag: t,
        azione: "aggiunto"
      });
    });

    rimossi.forEach(t=>{
      log.push({
        contatto_id: contattoId,
        azienda_id: aziendaId,
        tag: t,
        azione: "rimosso"
      });
    });

    if(log.length){
      await supabase
        .from("contatti_tag_log")
        .insert(log);
    }
  }

  // 🔥 SALVA TAG AGGIORNATI
  await supabase
    .from("contatti")
    .update({ tag: nuoviTag })
    .eq("id", contattoId);
}
