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

      <!-- Pulsante Crea Nuovo Preventivo -->
      <div style="margin-bottom: 20px;">
        <button class="app-button large green"
          onclick="window.location.hash='#/creaPreventivo'">
          + Crea Nuovo Preventivo
        </button>
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
      n_invitati,
      cliente_nome,
      cliente_cognome,
      cliente_telefono,
      scadenza_il,
      confermato_il,
      costo_stimato,
      costo_lavoro,
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

  const oggi = new Date().toISOString().slice(0, 10);

  const html = filteredPreventivi
    .map((p) => {
      // il nome sta quasi sempre sul preventivo, non nell'anagrafica collegata:
      // prima si leggeva solo cliente_id e usciva "Senza cliente"
      const clienteNome = [p.cliente_nome, p.cliente_cognome].filter(Boolean).join(" ")
        || (p.cliente_id ? `${p.cliente_id.nome || ""} ${p.cliente_id.cognome || ""}`.trim() : "")
        || "Cliente da completare";

      const dataEvento = p.data_evento
        ? new Date(p.data_evento + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long" })
        : "data da fissare";

      const totale = Number(p.totale || 0);
      const costi = Number(p.costo_stimato || 0) + Number(p.costo_lavoro || 0);
      const margine = totale - costi;
      const marginePerc = totale > 0 ? Math.round((margine / totale) * 100) : null;

      const scaduto = p.stato === "inviato" && p.scadenza_il && String(p.scadenza_il).slice(0, 10) < oggi;
      const colore = p.confermato_il ? "#16a34a" : (scaduto ? "#dc2626" : (p.stato === "inviato" ? "#f59e0b" : "#94a3b8"));
      const statoTxt = p.confermato_il ? "confermato" : (scaduto ? "scaduto" : (p.stato || "bozza"));

      return `
        <div class="preventivo-list-item" data-id="${p.id}"
          style="background:#fff;border:1px solid #e5e7eb;border-left:5px solid ${colore};
                 border-radius:14px;padding:14px 16px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;">
            <div style="min-width:0;flex:1;">
              <div style="font-weight:800;font-size:16px;line-height:1.3;">
                ${p.titolo_evento || "(evento senza nome)"}
              </div>
              <div style="color:#64748b;font-size:14px;margin-top:3px;">
                ${dataEvento}${p.n_invitati ? " · " + p.n_invitati + " invitati" : ""}
              </div>
              <div style="color:#64748b;font-size:14px;margin-top:2px;">
                ${clienteNome}${p.cliente_telefono ? " · " + p.cliente_telefono : ""}
              </div>
              <div style="margin-top:8px;display:flex;gap:14px;flex-wrap:wrap;align-items:baseline;">
                <span style="font-size:19px;font-weight:800;">€ ${totale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                ${marginePerc !== null && costi > 0
                  ? `<span style="font-size:13px;color:${margine > 0 ? "#166534" : "#b91c1c"};font-weight:700;">
                       margine ${marginePerc}% · € ${margine.toLocaleString("it-IT", { maximumFractionDigits: 0 })}</span>`
                  : `<span style="font-size:13px;color:#b45309;">costi non stimati</span>`}
                <span style="background:${colore}1a;color:${colore};padding:2px 10px;border-radius:999px;
                             font-size:12px;font-weight:700;">${statoTxt}</span>
              </div>
            </div>
            <button class="app-button small" data-apri="${p.id}" style="flex:none;">Apri</button>
          </div>
        </div>
      `;
    })
    .join('');

  preventiviListContainer.innerHTML = html;

  const apri = (id) => { window.location.hash = '#/creaPreventivo?id=' + id; };

  preventiviListContainer.querySelectorAll('[data-apri]').forEach((b) => {
    b.addEventListener('click', (e) => { e.stopPropagation(); apri(Number(b.dataset.apri)); });
  });

  preventiviListContainer.querySelectorAll('.preventivo-list-item').forEach((el) => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => apri(Number(el.getAttribute('data-id'))));
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
