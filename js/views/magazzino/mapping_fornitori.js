export async function renderMapping(container, azienda) {

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal rf-modal-small">

      <div class="rf-modal-header">

        <h3 class="rf-modal-title">Mapping Fornitori</h3>

        <button class="btn-secondary" id="close-modal">
          Chiudi
        </button>

      </div>

      <div class="rf-modal-body">

        <div class="form-group">

          <label>Cerca prodotto</label>

          <input
            id="search-mapping"
            class="input"
            placeholder="Cerca per codice o descrizione..."
          >

        </div>

        <div id="risultati-mapping"></div>

      </div>

    </div>

  </div>

  `;

  document.body.appendChild(modal);

  const risultati = modal.querySelector("#risultati-mapping");
  const input = modal.querySelector("#search-mapping");

  modal.querySelector("#close-modal").onclick = () => {
    modal.remove();
  };

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

        apriMapping(modal, azienda, id);

      };

    });

  });

}

async function apriMapping(modal, azienda, prodottoId) {

  const { data } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select(`
      codice_fornitore,
      descrizione_fornitore,
      prezzo_ultimo_acquisto,
      fornitori:fornitore_id (ragione_sociale)
    `)
    .eq("prodotto_id", prodottoId)
    .limit(10);

  const body = modal.querySelector(".rf-modal-body");

  if (!data || !data.length) {

    body.innerHTML = `

      <div class="card">

        <h3 style="margin-top:0;">Mapping fornitori</h3>

        <div class="rf-empty-righe">
          Nessun mapping trovato per questo prodotto
        </div>

        <div style="margin-top:12px;">
          <button class="btn-secondary" id="indietro">
            Indietro
          </button>
        </div>

      </div>

    `;

    body.querySelector("#indietro").onclick = () => {
      modal.remove();
    };

    return;
  }

  body.innerHTML = `

    <div class="card">

      <h3 style="margin-top:0;">Mapping fornitori</h3>

      <table class="app-table">

        <thead>
          <tr>
            <th>Fornitore</th>
            <th>Codice Fornitore</th>
            <th>Prezzo Ultimo Acquisto</th>
          </tr>
        </thead>

        <tbody>

          ${data.map(m => `

            <tr>

              <td>${m.fornitori?.ragione_sociale || ""}</td>

              <td>${m.codice_fornitore || ""}</td>

              <td>${m.prezzo_ultimo_acquisto || ""}</td>

            </tr>

          `).join("")}

        </tbody>

      </table>

      <div style="margin-top:12px;">
        <button class="btn-secondary" id="indietro">
          Indietro
        </button>
      </div>

    </div>

  `;

  body.querySelector("#indietro").onclick = () => {
    modal.remove();
  };

}
