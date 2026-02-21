export async function render(container) {
  container.innerHTML = `
    <section class="view">
      <h2>Crea Nuovo Preventivo</h2>

      <form id="preventivo-form">
        <div>
          <label for="preventivo-cliente-nome">Nome Cliente:</label>
          <input type="text" id="preventivo-cliente-nome" required placeholder="Nome Cliente">
        </div>
        <div>
          <label for="preventivo-cliente-cognome">Cognome Cliente:</label>
          <input type="text" id="preventivo-cliente-cognome" required placeholder="Cognome Cliente">
        </div>
        <div>
          <label for="preventivo-cliente-email">Email Cliente:</label>
          <input type="email" id="preventivo-cliente-email" required placeholder="Email Cliente">
        </div>
        <div>
          <label for="preventivo-titolo">Titolo Evento:</label>
          <input type="text" id="preventivo-titolo" required placeholder="Titolo Evento">
        </div>
        <div>
          <label for="preventivo-tipo-servizio">Tipo Servizio:</label>
          <input type="text" id="preventivo-tipo-servizio" required placeholder="Tipo di Servizio">
        </div>
        <div>
          <label for="preventivo-data-evento">Data Evento:</label>
          <input type="date" id="preventivo-data-evento" required>
        </div>
        <div>
          <label for="preventivo-n-invitati">Numero Invitati:</label>
          <input type="number" id="preventivo-n-invitati" required>
        </div>
        <div>
          <label for="preventivo-location">Location:</label>
          <input type="text" id="preventivo-location" required placeholder="Location">
        </div>
        <div>
          <label for="preventivo-note">Note:</label>
          <textarea id="preventivo-note" placeholder="Eventuali Note"></textarea>
        </div>
        <div>
          <label for="preventivo-acconto">Acconto (€):</label>
          <input type="number" id="preventivo-acconto" value="0">
        </div>
        <div>
          <label for="preventivo-totale">Totale (€):</label>
          <input type="number" id="preventivo-totale" value="0" readonly>
        </div>
        <div>
          <label for="preventivo-sconto-menu">Sconto Menù (%):</label>
          <select id="preventivo-sconto-menu">
            <option value="0">0%</option>
            <option value="10">10%</option>
            <option value="20">20%</option>
          </select>
        </div>

        <!-- Tabelle per Menù e Servizi Extra -->
        <div>
          <h3>Menu</h3>
          <table id="preventivo-menu">
            <thead>
              <tr>
                <th>Nome Piatto</th>
                <th>Quantità</th>
                <th>Costo Unitario (€)</th>
                <th>Costo Totale (€)</th>
              </tr>
            </thead>
            <tbody id="preventivo-menu-tbody"></tbody>
          </table>
          <button type="button" id="btn-add-menu-row">Aggiungi Menu</button>
        </div>

        <div>
          <h3>Extra</h3>
          <table id="preventivo-extra">
            <thead>
              <tr>
                <th>Descrizione</th>
                <th>Quantità</th>
                <th>Prezzo Unitario (€)</th>
                <th>Costo Totale (€)</th>
              </tr>
            </thead>
            <tbody id="preventivo-extra-tbody"></tbody>
          </table>
          <button type="button" id="btn-add-extra-row">Aggiungi Extra</button>
        </div>

        <button type="submit" id="btn-save-preventivo" class="app-button green">Salva Preventivo</button>
      </form>
    </section>
  `;

  const btnSavePreventivo = document.getElementById('btn-save-preventivo');
  const btnAddMenuRow = document.getElementById('btn-add-menu-row');
  const btnAddExtraRow = document.getElementById('btn-add-extra-row');

  let menuRows = [];
  let extraRows = [];

  // Event listeners
  btnSavePreventivo.addEventListener('click', async (e) => {
    e.preventDefault();
    await savePreventivo();
  });

  btnAddMenuRow.addEventListener('click', () => {
    addMenuRow();
  });

  btnAddExtraRow.addEventListener('click', () => {
    addExtraRow();
  });

  function addMenuRow() {
    menuRows.push({
      nome_piatto: '',
      quantita: 1,
      costo_unitario: 0,
      costo_totale: 0,
    });
    renderMenuRows();
  }

  function addExtraRow() {
    extraRows.push({
      descrizione: '',
      quantita: 1,
      prezzo_unitario: 0,
      costo_totale: 0,
    });
    renderExtraRows();
  }

  function renderMenuRows() {
    const menuTableBody = document.getElementById('preventivo-menu-tbody');
    menuTableBody.innerHTML = menuRows
      .map((row, index) => {
        return `
          <tr>
            <td><input type="text" value="${row.nome_piatto}" placeholder="Nome piatto" onchange="menuRows[${index}].nome_piatto = this.value"></td>
            <td><input type="number" value="${row.quantita}" onchange="menuRows[${index}].quantita = this.value; recalcPreventivoTotali()"></td>
            <td><input type="number" value="${row.costo_unitario}" onchange="menuRows[${index}].costo_unitario = this.value; recalcPreventivoTotali()"></td>
            <td><input type="number" value="${row.costo_totale}" disabled></td>
          </tr>
        `;
      })
      .join('');
    recalcPreventivoTotali();
  }

  function renderExtraRows() {
    const extraTableBody = document.getElementById('preventivo-extra-tbody');
    extraTableBody.innerHTML = extraRows
      .map((row, index) => {
        return `
          <tr>
            <td><input type="text" value="${row.descrizione}" placeholder="Descrizione" onchange="extraRows[${index}].descrizione = this.value"></td>
            <td><input type="number" value="${row.quantita}" onchange="extraRows[${index}].quantita = this.value; recalcPreventivoTotali()"></td>
            <td><input type="number" value="${row.prezzo_unitario}" onchange="extraRows[${index}].prezzo_unitario = this.value; recalcPreventivoTotali()"></td>
            <td><input type="number" value="${row.costo_totale}" disabled></td>
          </tr>
        `;
      })
      .join('');
    recalcPreventivoTotali();
  }

  function recalcPreventivoTotali() {
    let totaleMenu = 0;
    menuRows.forEach(row => {
      row.costo_totale = row.quantita * row.costo_unitario;
      totaleMenu += row.costo_totale;
    });

    let totaleExtra = 0;
    extraRows.forEach(row => {
      row.costo_totale = row.quantita * row.prezzo_unitario;
      totaleExtra += row.costo_totale;
    });

    const totaleAcconto = parseFloat(document.getElementById('preventivo-acconto').value || 0);
    const totale = totaleMenu + totaleExtra;

    document.getElementById('preventivo-totale').value = totale.toFixed(2);
    const saldo = totale - totaleAcconto;
    document.getElementById('preventivo-saldo').value = saldo.toFixed(2);
  }

  async function savePreventivo() {
    const clienteNome = document.getElementById('preventivo-cliente-nome').value;
    const clienteCognome = document.getElementById('preventivo-cliente-cognome').value;
    const clienteEmail = document.getElementById('preventivo-cliente-email').value;
    const titoloEvento = document.getElementById('preventivo-titolo').value;
    const tipoServizio = document.getElementById('preventivo-tipo-servizio').value;
    const dataEvento = document.getElementById('preventivo-data-evento').value;
    const nInvitati = document.getElementById('preventivo-n-invitati').value;
    const location = document.getElementById('preventivo-location').value;
    const note = document.getElementById('preventivo-note').value;
    const acconto = document.getElementById('preventivo-acconto').value;

    const { data, error } = await supabase.from('preventivi').insert([{
      cliente_id: 1, // Utilizzare l'ID cliente che si vuole associare
      titolo_evento: titoloEvento,
      tipo_servizio: tipoServizio,
      data_evento: dataEvento,
      n_invitati: nInvitati,
      location: location,
      note: note,
      acconto: acconto,
      totale: document.getElementById('preventivo-totale').value
    }]);

    if (error) {
      console.error(error);
      alert("Errore nel salvataggio del preventivo");
      return;
    }

    alert("Preventivo creato correttamente!");
    window.location.hash = "#/preventivi";
  }
}
// Funzione per inviare il preventivo via email
async function emailCurrentPreventivoViaMailto() {
  const clienteEmail = document.getElementById('preventivo-cliente-email').value;
  if (!clienteEmail) {
    alert("Inserisci l'email del cliente.");
    return;
  }

  const clienteNome = document.getElementById('preventivo-cliente-nome').value;
  const clienteCognome = document.getElementById('preventivo-cliente-cognome').value;
  const dataEvento = document.getElementById('preventivo-data-evento').value;
  const tipologiaEvento = document.getElementById('preventivo-titolo').value;
  const totale = document.getElementById('preventivo-totale').value;

  const subject = `Preventivo per il tuo evento - ${tipologiaEvento}`;
  const body = `
    Gentile ${clienteNome} ${clienteCognome},<br><br>
    Ti inviamo il preventivo per il tuo evento:<br>
    Tipo di evento: ${tipologiaEvento}<br>
    Data evento: ${dataEvento}<br>
    Totale: €${totale}<br><br>
    Grazie,<br>Il team.
  `;

  const mailtoLink = `mailto:${clienteEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}
// Funzione per la stampa del preventivo
function printCurrentPreventivo() {
  const clienteNome = document.getElementById('preventivo-cliente-nome').value;
  const clienteCognome = document.getElementById('preventivo-cliente-cognome').value;
  const dataEvento = document.getElementById('preventivo-data-evento').value;
  const tipologiaEvento = document.getElementById('preventivo-titolo').value;
  const totale = document.getElementById('preventivo-totale').value;

  const menuElenco = currentPreventivoMenu.map(r => r.nome_piatto).join(', ');

  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head><title>Preventivo</title></head>
      <body>
        <h1>Preventivo per il tuo evento</h1>
        <p><strong>Cliente:</strong> ${clienteNome} ${clienteCognome}</p>
        <p><strong>Data evento:</strong> ${dataEvento}</p>
        <p><strong>Tipo evento:</strong> ${tipologiaEvento}</p>
        <p><strong>Menù proposto:</strong> ${menuElenco}</p>
        <p><strong>Totale:</strong> €${totale}</p>
        <button onclick="window.print()">Stampa</button>
      </body>
    </html>
  `);
  win.document.close();
}
