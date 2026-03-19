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
