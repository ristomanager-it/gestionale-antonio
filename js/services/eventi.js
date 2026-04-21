export async function registraEvento({ prenotazione_id, tipo }) {

  const aziendaId = window.state?.azienda?.id;

  await window.supabaseClient
    .from("eventi_prenotazione")
    .insert([{
      azienda_id: aziendaId,
      prenotazione_id,
      tipo_evento: tipo
    }]);

}
