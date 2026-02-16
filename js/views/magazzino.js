import "../supabaseClient.js";
import "../state.js";

export async function render(container) {
  const azienda = window.state.azienda;

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <h3>Nessuna azienda attiva</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <h2>Modulo Magazzino</h2>

      <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
        <button class="app-button tiny tab-btn active" data-tab="prodotti">Prodotti</button>
        <button class="app-button tiny tab-btn" data-tab="mapping">Mapping Fornitori</button>
        <button class="app-button tiny tab-btn" data-tab="movimenti">Movimenti</button>
        <button class="app-button tiny tab-btn" data-tab="scorte">Scorte Critiche</button>
      </div>

      <div id="magazzino-content"></div>

    </div>
  `;

  const content = document.getElementById("magazzino-content");
  const tabButtons = document.querySelectorAll(".tab-btn");

  function setActive(tab) {
    tabButtons.forEach(b => {
      b.classList.remove("active");
      if (b.dataset.tab === tab) b.classList.add("active");
    });
  }

  function renderTab(tab) {
    setActive(tab);

    if (tab === "prodotti") renderProdotti(content, azienda);
    if (tab === "mapping") renderMapping(content, azienda);
    if (tab === "movimenti") renderMovimenti(content, azienda);
    if (tab === "scorte") renderScorte(content, azienda);
  }

  tabButtons.forEach(btn =>
    btn.addEventListener("click", () => renderTab(btn.dataset.tab))
  );

  renderTab("prodotti");
}

/* ===================================================== */
/* ===================== PRODOTTI ======================= */
/* ===================================================== */

async function renderProdotti(container, azienda) {
  container.innerHTML = `<p>Caricamento prodotti...</p>`;

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_giacenze")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("descrizione");

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h3>Anagrafica Prodotti</h3>

    <table class="table-timbrature">
      <thead>
        <tr>
          <th>Codice</th>
          <th>Descrizione</th>
          <th>Giacenza</th>
          <th>Scorta Min.</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr ${p.giacenza_attuale <= p.scorta_minima ? "style='background:#fee2e2;'" : ""}>
            <td>${p.codice_interno || ""}</td>
            <td>${p.descrizione}</td>
            <td>${Number(p.giacenza_attuale).toFixed(3)}</td>
            <td>${p.scorta_minima || 0}</td>
            <td>
              <button class="app-button tiny" onclick="window.location.hash='#/magazzino?prodotto=${p.prodotto_id}'">
                Dettaglio
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ===================================================== */
/* =================== MAPPING FORNITORI =============== */
/* ===================================================== */

async function renderMapping(container, azienda) {
  container.innerHTML = `<p>Caricamento mapping...</p>`;

  const { data, error } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select(`
      id,
      codice_fornitore,
      descrizione_fornitore,
      prezzo_ultimo_acquisto,
      fattore_conversione,
      fornitori:fornitore_id ( ragione_sociale ),
      prodotti:prodotto_id ( descrizione )
    `)
    .eq("azienda_id", azienda.id)
    .eq("attivo", true);

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h3>Mapping Fornitori</h3>

    <table class="table-timbrature">
      <thead>
        <tr>
          <th>Prodotto Interno</th>
          <th>Fornitore</th>
          <th>Codice Fornitore</th>
          <th>Ultimo Prezzo</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(m => `
          <tr>
            <td>${m.prodotti?.descrizione || ""}</td>
            <td>${m.fornitori?.ragione_sociale || ""}</td>
            <td>${m.codice_fornitore || ""}</td>
            <td>${m.prezzo_ultimo_acquisto || 0}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ===================================================== */
/* ====================== MOVIMENTI ===================== */
/* ===================================================== */

async function renderMovimenti(container, azienda) {
  container.innerHTML = `<p>Caricamento movimenti...</p>`;

  const { data, error } = await window.supabaseClient
    .from("magazzino_movimenti")
    .select(`
      data_movimento,
      tipo_movimento,
      quantita,
      prodotti:prodotto_id ( descrizione )
    `)
    .eq("azienda_id", azienda.id)
    .order("data_movimento", { ascending: false })
    .limit(50);

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h3>Ultimi Movimenti</h3>

    <table class="table-timbrature">
      <thead>
        <tr>
          <th>Data</th>
          <th>Prodotto</th>
          <th>Tipo</th>
          <th>Quantità</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(m => `
          <tr>
            <td>${m.data_movimento}</td>
            <td>${m.prodotti?.descrizione || ""}</td>
            <td>${m.tipo_movimento}</td>
            <td>${m.quantita}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ===================================================== */
/* =================== SCORTE CRITICHE ================== */
/* ===================================================== */

async function renderScorte(container, azienda) {
  container.innerHTML = `<p>Verifica scorte...</p>`;

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_giacenze")
    .select("*")
    .eq("azienda_id", azienda.id);

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  const critici = data.filter(p => p.giacenza_attuale <= p.scorta_minima);

  container.innerHTML = `
    <h3>Prodotti sotto scorta minima</h3>

    ${critici.length === 0
      ? "<p>Tutte le scorte sono regolari.</p>"
      : `
        <table class="table-timbrature">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Giacenza</th>
              <th>Scorta Min.</th>
            </tr>
          </thead>
          <tbody>
            ${critici.map(p => `
              <tr style="background:#fee2e2;">
                <td>${p.descrizione}</td>
                <td>${p.giacenza_attuale}</td>
                <td>${p.scorta_minima}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}
  `;
}
