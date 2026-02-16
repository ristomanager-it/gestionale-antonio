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

      <h2>Modulo Acquisti</h2>

      <div style="
        display:flex;
        gap:10px;
        margin-bottom:20px;
        flex-wrap:wrap;
      ">
        <button class="app-button tiny tab-btn active" data-tab="fatture">Fatture</button>
        <button class="app-button tiny tab-btn" data-tab="fornitori">Fornitori</button>
        <button class="app-button tiny tab-btn" data-tab="ordini">Ordini</button>
        <button class="app-button tiny tab-btn" data-tab="riordino">Riordino</button>
      </div>

      <div id="acquisti-content"></div>

    </div>
  `;

  const content = document.getElementById("acquisti-content");
  const tabButtons = document.querySelectorAll(".tab-btn");

  function setActiveTab(tab) {
    tabButtons.forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.tab === tab) btn.classList.add("active");
    });
  }

  function renderTab(tab) {
    setActiveTab(tab);

    if (tab === "fatture") renderFatture(content, azienda);
    if (tab === "fornitori") renderFornitori(content, azienda);
    if (tab === "ordini") renderOrdini(content);
    if (tab === "riordino") renderRiordino(content);
  }

  tabButtons.forEach(btn =>
    btn.addEventListener("click", () => renderTab(btn.dataset.tab))
  );

  renderTab("fatture");
}

/* ===================================================== */
/* ================== TAB FATTURE ====================== */
/* ===================================================== */

function renderFatture(container, azienda) {
  container.innerHTML = `
    <h3>Nuova Fattura</h3>

    <div style="margin-bottom:12px;">
      <label>Numero</label>
      <input id="fattura-numero" class="input-pill" />

      <label>Data</label>
      <input id="fattura-data" type="date" class="input-pill" />
    </div>

    <div id="righe-container"></div>

    <button id="btn-add-riga" class="app-button small gray">
      + Riga
    </button>

    <hr style="margin:16px 0;" />

    <button id="btn-salva-fattura" class="app-button small green">
      Salva e Processa
    </button>

    <div id="fattura-feedback" style="margin-top:10px;"></div>
  `;

  const righeContainer = document.getElementById("righe-container");
  const btnAddRiga = document.getElementById("btn-add-riga");
  const btnSalva = document.getElementById("btn-salva-fattura");
  const feedback = document.getElementById("fattura-feedback");

  let righe = [];

  function renderRighe() {
    righeContainer.innerHTML = "";

    righe.forEach((r, i) => {
      const row = document.createElement("div");
      row.style.marginBottom = "10px";

      row.innerHTML = `
        <input type="number" placeholder="ID Prodotto"
          data-i="${i}" class="input-pill riga-prodotto" />

        <input type="number" step="0.001" placeholder="Quantità"
          data-i="${i}" class="input-pill riga-quantita" />

        <input type="number" step="0.0001" placeholder="Costo Unitario"
          data-i="${i}" class="input-pill riga-prezzo" />
      `;

      righeContainer.appendChild(row);
    });
  }

  btnAddRiga.addEventListener("click", () => {
    righe.push({});
    renderRighe();
  });

  righeContainer.addEventListener("input", e => {
    const i = e.target.dataset.i;
    if (i === undefined) return;

    if (e.target.classList.contains("riga-prodotto")) {
      righe[i].prodotto_id = Number(e.target.value);
    }
    if (e.target.classList.contains("riga-quantita")) {
      righe[i].quantita = Number(e.target.value);
    }
    if (e.target.classList.contains("riga-prezzo")) {
      righe[i].prezzo_unitario = Number(e.target.value);
    }
  });

  btnSalva.addEventListener("click", async () => {
    feedback.innerHTML = "Salvataggio...";

    try {
      const { data: fattura, error: err1 } =
        await window.supabaseClient
          .from("fatture_acquisto")
          .insert({
            azienda_id: azienda.id,
            numero: document.getElementById("fattura-numero").value,
            data: document.getElementById("fattura-data").value
          })
          .select()
          .single();

      if (err1) throw err1;

      const righePulite = righe
        .filter(r => r.prodotto_id && r.quantita)
        .map(r => ({
          azienda_id: azienda.id,
          fattura_id: fattura.id,
          prodotto_id: r.prodotto_id,
          quantita: r.quantita,
          prezzo_unitario: r.prezzo_unitario || 0
        }));

      if (righePulite.length > 0) {
        const { error: err2 } =
          await window.supabaseClient
            .from("fatture_acquisto_righe")
            .insert(righePulite);

        if (err2) throw err2;
      }

      const { error: err3 } =
        await window.supabaseClient.rpc(
          "processa_fattura_acquisto",
          {
            p_azienda_id: azienda.id,
            p_fattura_id: fattura.id
          }
        );

      if (err3) throw err3;

      feedback.innerHTML =
        "<span style='color:green;'>Fattura processata.</span>";

      righe = [];
      renderRighe();

    } catch (err) {
      feedback.innerHTML =
        "<span style='color:red;'>" + err.message + "</span>";
    }
  });
}

/* ===================================================== */
/* ================== TAB FORNITORI ==================== */
/* ===================================================== */

async function renderFornitori(container, azienda) {
  container.innerHTML = `<p>Caricamento fornitori...</p>`;

  const { data, error } = await window.supabaseClient
    .from("fornitori")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("ragione_sociale");

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h3>Fornitori</h3>

    <div style="margin-bottom:16px;">
      <button id="btn-nuovo-fornitore" class="app-button small green">
        + Nuovo Fornitore
      </button>
    </div>

    <table class="table-timbrature">
      <thead>
        <tr>
          <th>Ragione Sociale</th>
          <th>Referente</th>
          <th>Email</th>
          <th>Lead Time</th>
          <th>Min. Ordine</th>
          <th>Attivo</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(f => `
          <tr>
            <td>${f.ragione_sociale}</td>
            <td>${f.referente_ordini || "-"}</td>
            <td>${f.email_referente_ordini || "-"}</td>
            <td>${f.lead_time_giorni || 0} gg</td>
            <td>${f.minimo_ordine || 0}</td>
            <td>${f.attivo ? "Sì" : "No"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("btn-nuovo-fornitore")
    .addEventListener("click", () => apriFormFornitore(container, azienda));
}

function apriFormFornitore(container, azienda) {
  container.innerHTML = `
    <h3>Nuovo Fornitore</h3>

    <div style="display:grid; gap:10px; max-width:500px;">
      <input id="f-ragione" class="input-pill" placeholder="Ragione Sociale" />
      <input id="f-referente" class="input-pill" placeholder="Referente Ordini" />
      <input id="f-email" class="input-pill" placeholder="Email Referente" />
      <input id="f-telefono" class="input-pill" placeholder="Telefono" />
      <input id="f-lead" type="number" class="input-pill" placeholder="Lead Time (giorni)" />
      <input id="f-minimo" type="number" class="input-pill" placeholder="Minimo Ordine" />

      <button id="btn-salva-fornitore" class="app-button small green">
        Salva
      </button>

      <button id="btn-annulla" class="app-button small gray">
        Annulla
      </button>
    </div>
  `;

  document.getElementById("btn-salva-fornitore")
    .addEventListener("click", async () => {
      try {
        const { error } = await window.supabaseClient
          .from("fornitori")
          .insert({
            azienda_id: azienda.id,
            ragione_sociale: document.getElementById("f-ragione").value,
            referente_ordini: document.getElementById("f-referente").value,
            email_referente_ordini: document.getElementById("f-email").value,
            telefono_referente_ordini: document.getElementById("f-telefono").value,
            lead_time_giorni: Number(document.getElementById("f-lead").value) || 0,
            minimo_ordine: Number(document.getElementById("f-minimo").value) || 0,
            attivo: true
          });

        if (error) throw error;

        alert("Fornitore salvato");
        renderFornitori(container, azienda);

      } catch (err) {
        alert("Errore: " + err.message);
      }
    });

  document.getElementById("btn-annulla")
    .addEventListener("click", () => renderFornitori(container, azienda));
}

/* ===================================================== */
/* ================== TAB ORDINI ======================= */
/* ===================================================== */

function renderOrdini(container) {
  container.innerHTML = `
    <h3>Ordini Fornitore</h3>
    <p>Sezione in costruzione</p>
  `;
}

/* ===================================================== */
/* ================== TAB RIORDINO ===================== */
/* ===================================================== */

function renderRiordino(container) {
  container.innerHTML = `
    <h3>Riordino Automatico</h3>
    <p>Sezione in costruzione</p>
  `;
}
