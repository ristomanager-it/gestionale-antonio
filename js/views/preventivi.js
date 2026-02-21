import { sb } from "../supabaseClient.js"; // Importa il client Supabase

const preventiviListContainer = document.getElementById('preventivi-list');
const preventivoForm = document.getElementById('preventivo-form');
const inputPrevId = document.getElementById('preventivo-id');
const btnSavePreventivo = document.getElementById('btn-save-preventivo');
const btnNewPreventivo = document.getElementById('btn-new-preventivo');
const inputClienteId = document.getElementById('preventivo-cliente-id');

// Gestione della visualizzazione dei preventivi
async function loadPreventivi() {
  preventiviListContainer.innerHTML = '<p class="small-muted">Caricamento preventivi...</p>';

  const { data, error } = await sb
    .from('preventivi')
    .select(`
      id,
      titolo_evento,
      data_evento,
      n_invitati,
      stato,
      totale,
      contatti:cliente_id (
        id,
        nome,
        cognome
      )
    `)
    .eq('azienda_id', window.state.azienda.id) // Filtro per azienda
    .order('data_evento', { ascending: true });

  if (error) {
    console.error('Errore nel caricamento dei preventivi:', error);
    preventiviListContainer.innerHTML = '<p class="text-error">Errore nel caricamento dei preventivi.</p>';
    return;
  }

  renderPreventiviList(data);
}

// Funzione per renderizzare la lista dei preventivi
function renderPreventiviList(preventivi) {
  preventiviListContainer.innerHTML = preventivi.length
    ? preventivi.map(p => `
        <div class="preventivo-list-item" data-id="${p.id}">
          <span class="preventivo-titolo">${p.titolo_evento}</span>
          <span class="preventivo-data">${new Date(p.data_evento).toLocaleDateString()}</span>
          <span class="preventivo-stato">${p.stato}</span>
        </div>
      `).join('')
    : '<p class="small-muted">Nessun preventivo trovato.</p>';

  // Aggiungi il listener per aprire il preventivo selezionato
  document.querySelectorAll('.preventivo-list-item').forEach(item => {
    item.addEventListener('click', () => openPreventivo(item.dataset.id));
  });
}

// Funzione per aprire un preventivo (per modifica o dettaglio)
async function openPreventivo(id) {
  const { data: preventivo, error } = await sb
    .from('preventivi')
    .select('*')
    .eq('id', id)
    .eq('azienda_id', window.state.azienda.id) // Verifica che l'azienda sia corretta
    .single();

  if (error || !preventivo) {
    alert('Preventivo non trovato o non appartiene all\'azienda.');
    return;
  }

  fillPreventivoForm(preventivo);
}

// Funzione per riempire il form con i dati del preventivo
function fillPreventivoForm(preventivo) {
  inputPrevId.value = preventivo.id;
  inputClienteId.value = preventivo.cliente_id;

  // Popola i campi del form con i dati del preventivo
  document.getElementById('preventivo-titolo').value = preventivo.titolo_evento;
  document.getElementById('preventivo-data-evento').value = preventivo.data_evento;
  document.getElementById('preventivo-n-invitati').value = preventivo.n_invitati;
  document.getElementById('preventivo-location').value = preventivo.location;
  document.getElementById('preventivo-stato').value = preventivo.stato;
  document.getElementById('preventivo-acconto').value = preventivo.acconto;
  document.getElementById('preventivo-totale').value = preventivo.totale;
}

// Funzione per creare un nuovo preventivo
function createNewPreventivo() {
  preventivoForm.reset();
  inputPrevId.value = '';
  loadPreventivi(); // Ricarica la lista per vedere il nuovo preventivo appena creato
}

// Funzione per salvare un preventivo
async function savePreventivo() {
  const clienteId = inputClienteId.value;
  const titoloEvento = document.getElementById('preventivo-titolo').value;
  const dataEvento = document.getElementById('preventivo-data-evento').value;
  const nInvitati = document.getElementById('preventivo-n-invitati').value;
  const stato = document.getElementById('preventivo-stato').value;
  const totale = document.getElementById('preventivo-totale').value;

  const preventivoData = {
    cliente_id: clienteId,
    titolo_evento: titoloEvento,
    data_evento: dataEvento,
    n_invitati: nInvitati,
    stato: stato,
    totale: totale,
    azienda_id: window.state.azienda.id // Associa l'azienda attiva
  };

  if (inputPrevId.value) {
    // Modifica un preventivo esistente
    await sb.from('preventivi').update(preventivoData).eq('id', inputPrevId.value);
  } else {
    // Crea un nuovo preventivo
    await sb.from('preventivi').insert(preventivoData);
  }

  loadPreventivi(); // Ricarica la lista dei preventivi
}

// Ascoltatore per il salvataggio del preventivo
btnSavePreventivo.addEventListener('click', savePreventivo);

// Ascoltatore per il nuovo preventivo
btnNewPreventivo.addEventListener('click', createNewPreventivo);

// Inizializza la vista dei preventivi al caricamento della pagina
loadPreventivi();
