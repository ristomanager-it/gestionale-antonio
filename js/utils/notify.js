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

    for(const user_id of destinatari){

      // 🔥 CERCA NOTIFICA ESISTENTE
      const { data: existing } = await supabase
        .from("notifiche")
        .select("id")
        .eq("azienda_id", azienda.id)
        .eq("user_id", user_id)
        .eq("tipo", tipo)
        .eq("riferimento_id", riferimento_id)
        .eq("letto", false)
        .limit(1)
        .maybeSingle()

      // =====================================
      // 🔁 SE ESISTE → UPDATE
      // =====================================
      if(existing){

        const { error: updateError } = await supabase
          .from("notifiche")
          .update({
            messaggio,
            priorita,
            created_at: new Date().toISOString()
          })
          .eq("id", existing.id)

        if(updateError){
          console.error("Errore update notifica:", updateError)
        }

        continue
      }

      // =====================================
      // ➕ SE NON ESISTE → INSERT
      // =====================================
      const { error: insertError } = await supabase
        .from("notifiche")
        .insert({
          azienda_id: azienda.id,
          user_id,
          tipo,
          titolo,
          messaggio,
          riferimento_id,
          riferimento_tipo,
          priorita
        })

      if(insertError){
        console.error("Errore notifica:", insertError)
      }

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
