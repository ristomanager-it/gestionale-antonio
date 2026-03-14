export async function renderPreparazioni(container, azienda, startTab = "cerca") {

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal" style="max-width:420px;height:auto;">

      <div class="rf-modal-header">
        <h3 class="rf-modal-title">Preparazioni</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <div class="rf-modal-body" style="display:flex;flex-direction:column;gap:12px;">

        <div style="display:flex; gap:8px; flex-wrap:wrap;">

          <button class="app-button tiny" id="tab-cerca">
            Cerca preparazione
          </button>

          <button class="app-button tiny gray" id="tab-sottoscorta">
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

    <input
      id="search-prep"
      class="input"
      placeholder="Cerca preparazione..."
      autocomplete="off"
    >

    <div id="autocomplete-results"></div>

    <div id="scheda-preparazione"></div>

  `;

  const input = box.querySelector("#search-prep");
  const results = box.querySelector("#autocomplete-results");
  const scheda = box.querySelector("#scheda-preparazione");

  input.addEventListener("input", async () => {

    const term = input.value.trim();

    if (term.length < 2) {
      results.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("ricette")
      .select("id, nome, um")
      .eq("azienda_id", azienda.id)
      .ilike("nome", `%${term}%`)
      .limit(10);

    results.innerHTML = `

      <div class="rf-doc-list">

        ${(data || []).map(r => `

          <div class="rf-doc-item autocomplete-item"
               data-id="${r.id}"
               data-label="${r.nome}"
               data-um="${r.um || ""}">

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

        input.value = row.dataset.label;

        results.innerHTML = "";

        apriSchedaPreparazione(
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

        <div class="rf-doc-item sottoscorta"
             data-id="${p.prodotto_id}"
             data-label="${p.descrizione}">

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

  box.querySelectorAll(".sottoscorta").forEach(row => {

    row.onclick = () => {

      apriSchedaPreparazione(
        box,
        azienda,
        row.dataset.id,
        row.dataset.label
      );

    };

  });

}

async function apriSchedaPreparazione(box, azienda, preparazioneId, label = "", um = "-") {

  box.innerHTML = "Caricamento scheda...";

  const { data } = await window.supabaseClient
    .from("v_magazzino_preparazioni")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("prodotto_id", preparazioneId)
    .single();

  const { data: movimenti } = await window.supabaseClient
    .from("magazzino_movimenti")
    .select("tipo_movimento, quantita, created_at")
    .eq("prodotto_id", preparazioneId)
    .order("created_at", { ascending: false })
    .limit(5);

  box.innerHTML = `

    <div class="rf-doc-item">

      <div class="rf-doc-title">
        ${label || data.descrizione}
      </div>

      <div class="rf-doc-meta">
        <span>UM: ${um || "-"}</span>
      </div>

      <div class="rf-doc-meta">
        <span>Giacenza: ${data.giacenza_attuale}</span>
        <span>Scorta minima: ${data.scorta_minima}</span>
      </div>

      <div style="margin-top:8px;font-size:13px;">
        <strong>Ultimi movimenti</strong>

        ${(movimenti || []).map(m => `
          <div>${m.tipo_movimento} — ${m.quantita}</div>
        `).join("")}

      </div>

      <div style="margin-top:10px;">
        <button class="app-button tiny gray" id="btn-indietro-prep">
          ← Indietro
        </button>
      </div>

    </div>

  `;

  document.getElementById("btn-indietro-prep").onclick = () => {
    loadRicerca(box, azienda);
  };

}
