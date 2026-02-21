// ============================================================
// PREVENTIVI – Lista e Dettaglio Preventivo
// ============================================================

let preventiviCache = [];
let filteredPreventivi = [];

export async function render(app) {

  app.innerHTML = `
    <section class="view">

      <div style="margin-bottom:12px;">
        <button class="app-button small gray"
          onclick="window.location.hash='#/home'">
          ← Torna alla Home
        </button>
      </div>

      <h2>📑 Preventivi</h2>

      <!-- Barra di ricerca -->
      <div style="margin-bottom: 20px;">
        <input type="text" id="search-preventivi" placeholder="Cerca per nome cliente, evento, data..." class="input-pill" style="width: 100%; max-width: 400px;">
      </div>

      <div id="preventivi-list"></div> <!-- Qui visualizzeremo la lista dei preventivi -->

    </section>
  `;

  // Carichiamo i preventivi
  await loadPreventivi();

  // Aggiungi evento di ricerca
  const searchInput = document.getElementById("search-preventivi");
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    filterPreventivi(searchTerm);
  });
}

/* ============================================================ */
/* LOAD PREVENTIVI */
/* ============================================================ */

async function loadPreventivi() {

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    console.warn("Nessuna azienda attiva per i preventivi");
    preventiviCache = [];
    return;
  }

  const { data, error } = await supabase
    .from("preventivi")
    .select(`
      id,
      titolo_evento,
      data_evento,
      totale,
      stato,
      cliente_id (
        nome,
        cognome
      )
    `)
    .eq("azienda_id", aziendaId)  // Filtro per azienda
    .order("data_evento", { ascending: true });

  if (error) {
    console.error("Errore caricamento preventivi:", error);
    preventiviCache = [];
    return;
  }

  preventiviCache = data || [];
  filteredPreventivi = preventiviCache;  // Inizialmente visualizziamo tutti i preventivi

  renderPreventiviList();
}

/* ============================================================ */
/* FILTRARE I PREVENTIVI IN BASE AL TERMINE DI RICERCA */
/* ============================================================ */

function filterPreventivi(searchTerm) {
  // Filtra i preventivi in base al termine di ricerca
  filteredPreventivi = preventiviCache.filter((p) => {
    const clienteNome = p.cliente_id
      ? `${p.cliente_id.nome || ''} ${p.cliente_id.cognome || ''}`.toLowerCase()
      : '';
    const titoloEvento = p.titolo_evento ? p.titolo_evento.toLowerCase() : '';
    const dataEvento = p.data_evento ? new Date(p.data_evento).toLocaleDateString().toLowerCase() : '';
    
    // Verifica se uno dei campi contiene il termine di ricerca
    return (
      clienteNome.includes(searchTerm) ||
      titoloEvento.includes(searchTerm) ||
      dataEvento.includes(searchTerm)
    );
  });

  renderPreventiviList();
}

/* ============================================================ */
/* RENDER LISTA PREVENTIVI */
/* ============================================================ */

function renderPreventiviList() {
  const preventiviListContainer = document.getElementById("preventivi-list");
  if (!preventiviListContainer) return;

  if (!filteredPreventivi.length) {
    preventiviListContainer.innerHTML = `
      <p class="small-muted">Nessun preventivo trovato.</p>
    `;
    return;
  }

  const html = filteredPreventivi
    .map((p) => {
      const clienteNome = p.cliente_id
        ? `${p.cliente_id.nome || ''} ${p.cliente_id.cognome || ''}`.trim()
        : 'Senza cliente';
      const dataEvento = p.data_evento
        ? new Date(p.data_evento).toLocaleDateString()
        : '—';
      const totale = Number(p.totale || 0).toFixed(2);

      return `
        <div class="preventivo-list-item" data-id="${p.id}">
          <div class="preventivo-list-main">
            <span class="preventivo-data">${dataEvento}</span>
            <span class="preventivo-titolo">${p.titolo_evento || '(Senza tipologia)'}</span>
          </div>
          <div class="preventivo-list-sub">
            <span class="preventivo-cliente">${clienteNome}</span>
            <span class="preventivo-totale">€ ${totale}</span>
            <span class="preventivo-stato badge stato-${p.stato}">${p.stato}</span>
          </div>
        </div>
      `;
    })
    .join('');

  preventiviListContainer.innerHTML = html;

  preventiviListContainer.querySelectorAll('.preventivo-list-item').forEach((el) => {
    el.addEventListener('click', () => {
      const id = Number(el.getAttribute('data-id'));
      openPreventivo(id);  // Funzione per aprire il preventivo
    });
  });
}

/* ============================================================ */
/* VISUALIZZAZIONE DETTAGLI PREVENTIVO */
/* ============================================================ */

async function openPreventivo(preventivoId) {
  // Funzione per caricare e mostrare i dettagli di un preventivo
  const supabase = window.supabaseClient;

  const { data: preventivo, error } = await supabase
    .from('preventivi')
    .select('*')
    .eq('id', preventivoId)
    .single();

  if (error || !preventivo) {
    alert('Preventivo non trovato.');
    return;
  }

  // Render dettagli preventivo
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="view">
      <h2>Preventivo #${preventivoId}</h2>
      <p><strong>Cliente:</strong> ${preventivo.cliente_id.nome} ${preventivo.cliente_id.cognome}</p>
      <p><strong>Data evento:</strong> ${new Date(preventivo.data_evento).toLocaleDateString()}</p>
      <p><strong>Totale:</strong> € ${preventivo.totale}</p>
      <button class="app-button small gray" onclick="window.location.hash='#/preventivi'">← Indietro</button>
    </section>
  `;
}
