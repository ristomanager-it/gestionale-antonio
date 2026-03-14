export async function renderProdottiFiniti(container, azienda) {

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal" style="max-width:420px;height:auto;">

      <div class="rf-modal-header">
        <h3 class="rf-modal-title">Prodotti Finiti</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <div class="rf-modal-body" style="display:flex;flex-direction:column;gap:12px;">

        <div style="display:flex; gap:8px; flex-wrap:wrap;">

          <button class="app-button tiny" id="tab-cerca">
            Cerca prodotto
          </button>

          <button class="app-button tiny gray" id="tab-disponibili">
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

    <input
      id="search-pf"
      class="input"
      placeholder="Cerca prodotto finito..."
      autocomplete="off"
    >

    <div id="autocomplete-results"></div>

    <div id="scheda-prodotto"></div>

  `;

  const input = box.querySelector("#search-pf");
  const results = box.querySelector("#autocomplete-results");
  const scheda = box.querySelector("#scheda-prodotto");

  input.addEventListener("input", async () => {

    const term = input.value.trim();

    if (term.length < 2) {
      results.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("prodotti")
      .select("id, meta, descrizione, um")
      .eq("azienda_id", azienda.id)
      .eq("tipo_prodotto", "prodotto_finito")
      .ilike("descrizione", `%${term}%`)
      .limit(10);

    results.innerHTML = `

      <div class="rf-doc-list">

        ${(data || []).map(p => `

          <div class="rf-doc-item autocomplete-item"
               data-id="${p.id}"
               data-label="${(p.meta || "")} — ${p.descrizione}"
               data-um="${p.um || ""}">

            <div class="rf-doc-title">
              ${(p.meta || "")} — ${p.descrizione}
            </div>

          </div>

        `).join("")}

      </div>

    `;

    results.querySelectorAll(".autocomplete-item").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;

        input.value = row.dataset.label;

        results.innerHTML = "";

        apriSchedaProdotto(
          scheda,
          azienda,
          id,
          row.dataset.label,
          row.dataset.um
        );

      };

    });

  });

}

async function loadDisponibili(box, azienda) {

  box.innerHTML = "Caricamento...";

  const { data } = await window.supabaseClient
    .from("v_magazzino_prodotti_finiti")
    .select("prodotto_id, descrizione, giacenza_attuale")
    .eq("azienda_id", azienda.id)
    .gt("giacenza_attuale", 0)
    .order("giacenza_attuale", { ascending:false });

  if (!data || !data.length) {
    box.innerHTML = "Nessun prodotto disponibile";
    return;
  }

  box.innerHTML = `

    <div class="rf-doc-list">

      ${data.map(p => `

        <div class="rf-doc-item disponibile"
             data-id="${p.prodotto_id}"
             data-label="${p.descrizione}">

          <div class="rf-doc-title">
            ${p.descrizione}
          </div>

          <div class="rf-doc-meta">
            <span>Disponibili</span>
            <span>${p.giacenza_attuale}</span>
          </div>

        </div>

      `).join("")}

    </div>

  `;

  box.querySelectorAll(".disponibile").forEach(row => {

    row.onclick = () => {

      apriSchedaProdotto(
        box,
        azienda,
        row.dataset.id,
        row.dataset.label
      );

    };

  });

}

async function apriSchedaProdotto(box, azienda, prodottoId, label = "", um = "-") {

  box.innerHTML = "Caricamento...";

  const { data } = await window.supabaseClient
    .from("v_magazzino_prodotti_finiti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("prodotto_id", prodottoId)
    .single();

  if (!data) {
    box.innerHTML = "Prodotto non trovato";
    return;
  }

  box.innerHTML = `

    <div class="rf-doc-item">

      <div class="rf-doc-title">
        ${label || data.descrizione}
      </div>

      <div class="rf-doc-meta">
        <span>UM: ${um || "-"}</span>
      </div>

      <div class="rf-doc-meta">
        <span>Disponibili</span>
        <span>${data.giacenza_attuale}</span>
      </div>

      <div style="margin-top:10px;">
        <button class="app-button tiny gray" id="btn-indietro">
          ← Indietro
        </button>
      </div>

    </div>

  `;

  document.getElementById("btn-indietro").onclick = () => {
    loadRicerca(box, azienda);
  };

}
