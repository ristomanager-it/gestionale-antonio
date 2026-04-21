export async function generaMessaggio(templateNome, dati) {

  const aziendaId = window.state?.azienda?.id;

  const { data, error } = await window.supabaseClient
    .from("messaggi_template")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("nome", templateNome)
    .eq("attivo", true)
    .single();

  if (error || !data) {
    console.error("Template non trovato", error);
    return null;
  }

  let testo = data.contenuto;

  Object.keys(dati).forEach(key => {
    const regex = new RegExp(`@@${key}@@`, "g");
    testo = testo.replace(regex, dati[key] || "");
  });

  return testo;
}


export function apriWhatsApp(telefono, messaggio){

  if(!telefono) return;

  const clean = telefono.replace(/[^\d]/g, "");

  const url = `https://wa.me/${clean}?text=${encodeURIComponent(messaggio)}`;

  window.open(url, "_blank");
}
