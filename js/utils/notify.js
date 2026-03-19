// js/utils/notify.js

window.notify = async function({
  tipo,
  titolo,
  messaggio,
  destinatari = [],
  riferimento_id = null,
  riferimento_tipo = null,
  priorita = "normale"
}) {

  try {

    const azienda = window.state?.azienda
    const supabase = window.supabaseClient

    if(!azienda || !destinatari.length) return

    const rows = destinatari.map(user_id => ({
      azienda_id: azienda.id,
      user_id,
      tipo,
      titolo,
      messaggio,
      riferimento_id,
      riferimento_tipo,
      priorita
    }))

    const { error } = await supabase
      .from("notifiche")
      .insert(rows)

    if(error){
      console.error("Errore notifica:", error)
    }

  } catch(e){
    console.error("notify error:", e)
  }

}


// ================================
// HELPER RUOLI
// ================================

window.getUsersByRuolo = async function(ruolo){

  const supabase = window.supabaseClient
  const azienda = window.state?.azienda

  if(!azienda) return []

  const { data } = await supabase
    .from("utenti_aziende")
    .select("user_id, ruolo")
    .eq("azienda_id", azienda.id)

  return (data || [])
    .filter(u => u.ruolo === ruolo)
    .map(u => u.user_id)

}
