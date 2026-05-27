export async function getTonyInsights(){

  const supabase = window.supabaseClient
  const azienda = window.state?.azienda
  const sede = window.state?.sedeAttiva

  if(!supabase || !azienda) return []

  try{

    const { data, error } = await supabase.functions.invoke("assistente-ai", {
      body: {
        messages: [
          {
            role: "user",
            content: "Dammi un riassunto operativo breve: alert, priorità e azioni"
          }
        ],
        azienda_id: azienda.id,
        azienda: azienda.nome,
        lat: sede?.latitudine,
        lon: sede?.longitudine
      }
    })

    if(error){
      console.error("Tony error:", error)
      return []
    }

    return normalizeTony(data)

  }catch(err){
    console.error("Tony crash:", err)
    return []
  }

}

function normalizeTony(data){

  if(!data) return []

  const reply = data?.reply || ""

  if(!reply) return []

  const lines = reply.split("\n").filter(l => l.trim())

  return lines.slice(0,5).map(line => ({
    type: "info",
    message: line
  }))
}
