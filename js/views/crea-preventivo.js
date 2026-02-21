export async function render(container) {
  container.innerHTML = `
    <section class="view">
      <h2>Crea Nuovo Preventivo</h2>

      <form id="create-preventivo-form">
        <div>
          <label for="cliente-nome">Nome Cliente:</label>
          <input type="text" id="cliente-nome" required />
        </div>
        <div>
          <label for="titolo-evento">Titolo Evento:</label>
          <input type="text" id="titolo-evento" required />
        </div>
        <div>
          <label for="data-evento">Data Evento:</label>
          <input type="date" id="data-evento" required />
        </div>
        <div>
          <label for="totale">Totale:</label>
          <input type="number" id="totale" required />
        </div>
        <button type="submit" class="app-button green">Crea Preventivo</button>
      </form>
    </section>
  `;

  const form = document.getElementById('create-preventivo-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createPreventivo();
  });
}

async function createPreventivo() {
  const clienteNome = document.getElementById('cliente-nome').value;
  const titoloEvento = document.getElementById('titolo-evento').value;
  const dataEvento = document.getElementById('data-evento').value;
  const totale = document.getElementById('totale').value;

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  const { data, error } = await supabase
    .from('preventivi')
    .insert([
      {
        cliente_id: 1,  // ID cliente, da impostare a seconda del cliente selezionato
        titolo_evento: titoloEvento,
        data_evento: dataEvento,
        totale: totale,
        azienda_id: aziendaId,
      }
    ]);

  if (error) {
    console.error("Errore creazione preventivo:", error);
    return;
  }

  window.location.hash = "#/preventivi";  // Torna alla lista dei preventivi
}
