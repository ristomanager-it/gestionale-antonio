export async function renderPreparazioni(container, azienda, startTab = "cerca") {

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal">

      <div class="rf-modal-header">
        <h3 class="rf-modal-title">Preparazioni</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <div class="rf-modal-body">

        <div style="display:flex; gap:8px; flex-wrap:wrap;">

          <button class="app-button tiny" id="tab-cerca">
            Cerca preparazione
          </button>

          <button class="app-button tiny gray" id="tab-sottoscorta">
            Sottoscorta
          </button>

        </div>

        <div id="contenuto-preparazioni" style="margin-top:12px;"></div>

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

    <input
      id="search-prep"
      class="input"
      placeholder="Cerca preparazione..."
      autocomplete="off"
      style="width:100%;"
    >

    <div id="autocomplete-results" style="margin-top:8px;"></div>

  `;

  const input = box.querySelector("#search-prep");
  const results = box.querySelector("#autocomplete-results");

  input.addEventListener("input", async () => {

    const term = input.value.trim();

    if (term.length < 2) {
      results.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("ricette")
      .select("id, nome")
      .eq("azienda_id", azienda.id)
      .ilike("nome", `%${term}%`)
      .limit(10);

    results.innerHTML = `

      <div class="rf-doc-list">

        ${(data || []).map(r => `

          <div class="rf-doc-item autocomplete-item" data-id="${r.id}">

            <div class="rf-doc-title">
              ${r.nome}
            </div>

          </div>

        `).join("")}

      </div>

    `;

    results.querySelectorAll(".autocomplete-item").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;
        apriSchedaPreparazione(box, azienda, id);

      };

    });

  });

}

async function loadSottoscorta(box, azienda) {

  box.innerHTML = "Caricamento...";

  const { data } = await window.supabaseClient
    .from("v_magazzino_preparazioni")
    .select("prodotto_id, descrizione, giacenza_attuale, scorta_minima")
    .eq("azienda_id", azienda.id)
    .lte("giacenza_attuale", "scorta_minima");

  if (!data || !data.length) {
    box.innerHTML = "Nessuna preparazione sottoscorta";
    return;
  }

  box.innerHTML = `

    <div class="rf-doc-list">

      ${data.map(p => `

        <div class="rf-doc-item sottoscorta" data-id="${p.prodotto_id}">

          <div class="rf-doc-title">
            ${p.descrizione}
          </div>

          <div class="rf-doc-meta">
            <span>Giacenza: ${p.giacenza_attuale}</span>
            <span>Min: ${p.scorta_minima}</span>
          </div>

        </div>

      `).join("")}

    </div>

  `;

}
