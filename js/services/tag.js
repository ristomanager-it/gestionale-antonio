export async function aggiornaTagCliente(contattoId){

  const supabase = window.supabaseClient;

  // 🔥 PRENOTAZIONI CLIENTE
  const { data: pren } = await supabase
    .from("prenotazioni_tavoli")
    .select("stato, coperti")
    .eq("contatto_id", contattoId);

  if(!pren) return;

  const totale = pren.length;
  const noShow = pren.filter(p => p.stato === "no_show").length;

  let tag = [];

  // 🔥 LOGICA TAG

  if(totale === 1){
    tag.push("nuovo_cliente");
  }

  if(totale >= 3){
    tag.push("abituale");
  }

  if(totale >= 10){
    tag.push("vip");
  }

  if(noShow >= 2){
    tag.push("no_show_rischio");
  }

  // 🔥 SALVA TAG
  await supabase
    .from("contatti")
    .update({ tag })
    .eq("id", contattoId);
}
