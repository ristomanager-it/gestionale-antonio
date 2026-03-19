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

    // 🔥 CICLO DESTINATARI (DEDUPLICA PER UTENTE)
    const rows = []

    for(const user_id of destinatari){

      // 🔥 CHECK DUPLICATO (stesso tipo + riferimento + non letto)
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

      // 👉 se esiste → skip
      if(existing) continue

      rows.push({
        azienda_id: azienda.id,
        user_id,
        tipo,
        titolo,
        messaggio,
        riferimento_id,
        riferimento_tipo,
        priorita
      })

    }

    // 👉 se nulla da inserire → stop
    if(!rows.length) return

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
