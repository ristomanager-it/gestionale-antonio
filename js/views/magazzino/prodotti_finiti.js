export async function renderProdottiFiniti(container, azienda) {

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal rf-modal-small">

      <div class="rf-modal-header">

        <h3 class="rf-modal-title">Prodotti Finiti</h3>

        <button class="btn-secondary" id="close-modal">
          Chiudi
        </button>

      </div>

      <div class="rf-modal-body">

        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">

          <button type="button" class="btn-primary" id="tab-cerca">
            Cerca prodotto
          </button>

          <button type="button" class="btn-secondary" id="tab-disponibili">
            Disponibili
          </button>

        </div>

        <div id="contenuto-prodotti-finiti"></div>

      </div>

    </div>

  </div>

  `;

  document.body.appendChild(modal);

  const contenuto = modal.querySelector("#contenuto-prodotti-finiti");

  modal.querySelector("#close-modal").onclick = () => {
    modal.remove();
  };

  loadRicerca(contenuto, azienda);

  modal.querySelector("#tab-cerca").onclick = () => {
    loadRicerca(contenuto, azienda);
  };

  modal.querySelector("#tab-disponibili").onclick = () => {
    loadDisponibili(contenuto, azienda);
  };

}

function loadRicerca(box, azienda) {

  box.innerHTML = `

    <div class="form-group">

      <label>Cerca prodotto finito</label>

      <input
        id="search-pf"
        class="input"
        placeholder="Cerca per codice o descrizione..."
      >

    </div>

    <div id="risultati-pf"></div>

  `;

  const input = box.querySelector("#search-pf");
  const risultati = box.querySelector("#risultati-pf");

  input.addEventListener("input", async () => {

    const term = input.value.trim();

    if (term.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("prodotti")
      .select("id, meta, descrizione")
      .eq("azienda_id", azienda.id)
      .eq("tipo_prodotto", "prodotto_finito")
      .or(`descrizione.ilike.%${term}%,meta.ilike.%${term}%`)
      .limit(15);

    if (!data || !data.length) {

      risultati.innerHTML = `
        <div class="rf-empty-righe">
          Nessun prodotto trovato
        </div>
      `;

      return;
    }

    risultati.innerHTML = `

      <table class="app-table">

        <thead>
          <tr>
            <th>Codice</th>
            <th>Descrizione</th>
          </tr>
        </thead>

        <tbody>

          ${data.map(p => `

            <tr data-id="${p.id}" style="cursor:pointer;">

              <td>${p.meta || ""}</td>
              <td>${p.descrizione || ""}</td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    `;

    risultati.querySelectorAll("tbody tr").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;

        apriSchedaProdotto(box, azienda, id);

      };

    });

  });

}

async function loadDisponibili(box, azienda) {

  box.innerHTML = `

    <div class="card">
      Caricamento prodotti disponibili...
    </div>

  `;

  const { data } = await window.supabaseClient
    .from("v_magazzino_prodotti_finiti")
    .select("prodotto_id, descrizione, giacenza_attuale")
    .eq("azienda_id", azienda.id)
    .gt("giacenza_attuale", 0)
    .order("giacenza_attuale", { ascending: false });

  if (!data || !data.length) {

    box.innerHTML = `
      <div class="rf-empty-righe">
        Nessun prodotto disponibile
      </div>
    `;

    return;
  }

  box.innerHTML = `

    <table class="app-table">

      <thead>
        <tr>
          <th>Prodotto</th>
          <th>Disponibili</th>
        </tr>
      </thead>

      <tbody>

        ${data.map(p => `

          <tr data-id="${p.prodotto_id}" style="cursor:pointer;">

            <td>${p.descrizione}</td>
            <td>${p.giacenza_attuale}</td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;

  box.querySelectorAll("tbody tr").forEach(row => {

    row.onclick = () => {

      const id = row.dataset.id;

      apriSchedaProdotto(box, azienda, id);

    };

  });

}

async function apriSchedaProdotto(box, azienda, prodottoId) {

  box.innerHTML = `

    <div class="card">
      Caricamento scheda prodotto...
    </div>

  `;

  const { data } = await window.supabaseClient
    .from("v_magazzino_prodotti_finiti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("prodotto_id", prodottoId)
    .single();

  if (!data) {

    box.innerHTML = `
      <div class="rf-empty-righe">
        Prodotto non trovato
      </div>
    `;

    return;
  }

  box.innerHTML = `

    <div class="card">

      <h3 style="margin-top:0;">
        ${data.descrizione}
      </h3>

      <div style="margin-top:10px; font-size:14px;">

        Disponibili: <strong>${data.giacenza_attuale}</strong>

      </div>

      <div style="margin-top:16px; display:flex; gap:8px;">

        <button class="btn-secondary" id="btn-indietro">
          Indietro
        </button>

      </div>

    </div>

  `;

  box.querySelector("#btn-indietro").onclick = () => {
    loadRicerca(box, azienda);
  };

}
