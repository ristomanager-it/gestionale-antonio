export async function trovaOCreaContatto({ nome, cognome, telefono }) {

  const aziendaId = window.state?.azienda?.id;

  if (!telefono) return null;

  const telefonoPulito = telefono.replace(/[^\d]/g, "");

  // 🔍 1. CERCA CONTATTO ESISTENTE
  const { data: esistente, error: errFind } = await window.supabaseClient
    .from("contatti")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("telefono", telefonoPulito)
    .limit(1)
    .single();

  if (errFind && errFind.code !== "PGRST116") {
    console.error("Errore ricerca contatto", errFind);
  }

  if (esistente) {
    return esistente;
  }

  // ➕ 2. CREA NUOVO CONTATTO
  const { data: nuovo, error: errCreate } = await window.supabaseClient
    .from("contatti")
    .insert([{
      azienda_id: aziendaId,
      nome: nome || "",
      cognome: cognome || "",
      telefono: telefonoPulito
    }])
    .select()
    .single();

  if (errCreate) {
    console.error("Errore creazione contatto", errCreate);
    return null;
  }

  return nuovo;
}
