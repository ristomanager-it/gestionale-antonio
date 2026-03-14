export async function renderPreparazioni(container, azienda, startTab = "cerca") {

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal">

      <div class="rf-modal-header">

        <h3 class="rf-modal-title">Preparazioni</h3>

        <button class="btn-secondary" id="close-modal">
          Chiudi
        </button>

      </div>

      <div class="rf-modal-body">

        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">

          <button type="button" class="btn-primary" id="tab-cerca">
            Cerca preparazione
          </button>

          <button type="button" class="btn-secondary" id="tab-sottoscorta">
            Sottoscorta
          </button>

        </div>

        <div id="contenuto-preparazioni"></div>

      </div>

    </div>

  </div>

  `;

  document.body.appendChild(modal);

  const contenuto = modal.querySelector("#contenuto-preparazioni");

  modal.querySelector("#close-modal").onclick = () => {
    modal.remove();
  };

  if (startTab === "sottoscorta") {
    loadSottoscorta(contenuto, azienda);
  } else {
    loadRicerca(contenuto, azienda);
  }

  modal.querySelector("#tab-cerca").onclick = () => {
    loadRicerca(contenuto, azienda);
  };

  modal.querySelector("#tab-sottoscorta").onclick = () => {
    loadSottoscorta(contenuto, azienda);
  };

}

function loadRicerca(box, azienda) {

  box.innerHTML = `

    <div class="form-group">

      <label>Cerca preparazione</label>

      <input
        id="search-prep"
        class="input"
        placeholder="Cerca per nome..."
      >

    </div>

    <div id="risultati-prep"></div>

  `;

  const input = box.querySelector("#search-prep");
  const risultati = box.querySelector("#risultati-prep");

  input.addEventListener("input", async () => {

    const term = input.value.trim();

    if (term.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("ricette")
      .select("id, nome")
      .eq("azienda_id", azienda.id)
      .ilike("nome", `%${term}%`)
      .limit(15);

    if (!data || !data.length) {

      risultati.innerHTML = `
        <div class="rf-empty-righe">
          Nessuna preparazione trovata
        </div>
      `;

      return;
    }

    risultati.innerHTML = `

      <table class="app-table">

        <thead>
          <tr>
            <th>Preparazione</th>
          </tr>
        </thead>

        <tbody>

          ${data.map(r => `

            <tr data-id="${r.id}" style="cursor:pointer;">

              <td>${r.nome}</td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    `;

    risultati.querySelectorAll("tbody tr").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;

        apriSchedaPreparazione(box, azienda, id);

      };

    });

  });

}

async function loadSottoscorta(box, azienda) {

  box.innerHTML = `

    <div class="card">
      Caricamento preparazioni sottoscorta...
    </div>

  `;

  const { data } = await window.supabaseClient
    .from("v_magazzino_preparazioni")
    .select("prodotto_id, descrizione, giacenza_attuale, scorta_minima")
    .eq("azienda_id", azienda.id)
    .lte("giacenza_attuale", "scorta_minima");

  if (!data || !data.length) {

    box.innerHTML = `
      <div class="rf-empty-righe">
        Nessuna preparazione sottoscorta
      </div>
    `;

    return;
  }

  box.innerHTML = `

    <table class="app-table">

      <thead>
        <tr>
          <th>Preparazione</th>
          <th>Giacenza</th>
          <th>Scorta minima</th>
        </tr>
      </thead>

      <tbody>

        ${data.map(p => `

          <tr data-id="${p.prodotto_id}" style="cursor:pointer;">

            <td>${p.descrizione}</td>

            <td style="color:#b42318;">
              ${p.giacenza_attuale}
            </td>

            <td>
              ${p.scorta_minima}
            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;

  box.querySelectorAll("tbody tr").forEach(row => {

    row.onclick = () => {

      const id = row.dataset.id;

      apriSchedaPreparazione(box, azienda, id);

    };

  });

}

async function apriSchedaPreparazione(box, azienda, preparazioneId) {

  box.innerHTML = `

    <div class="card">
      Caricamento scheda preparazione...
    </div>

  `;

  const { data } = await window.supabaseClient
    .from("v_magazzino_preparazioni")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("prodotto_id", preparazioneId)
    .single();

  if (!data) {

    box.innerHTML = `
      <div class="rf-empty-righe">
        Preparazione non trovata
      </div>
    `;

    return;
  }

  box.innerHTML = `

    <div class="card">

      <h3 style="margin-top:0;">
        ${data.descrizione}
      </h3>

      <div style="margin-top:10px;">

        <div>
          Giacenza: <strong>${data.giacenza_attuale}</strong>
        </div>

        <div>
          Scorta minima: ${data.scorta_minima}
        </div>

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
