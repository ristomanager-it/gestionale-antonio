export async function renderMateriePrime(container, azienda, startTab = "cerca") {

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal" style="max-width:420px;height:auto;">

      <div class="rf-modal-header">
        <h3 class="rf-modal-title">Materie Prime</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <div class="rf-modal-body" style="display:flex;flex-direction:column;gap:12px;">

        <div style="display:flex;gap:8px;flex-wrap:wrap;">

          <button class="app-button tiny" id="tab-cerca">
            Cerca prodotto
          </button>

          <button class="app-button tiny gray" id="tab-sottoscorta">
            Sottoscorta
          </button>

        </div>

        <div id="contenuto-magazzino"></div>

      </div>

    </div>

  </div>

  `;

  document.body.appendChild(modal);

  const contenuto = modal.querySelector("#contenuto-magazzino");

  modal.querySelector("#close-modal").onclick = () => modal.remove();

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
      id="search-mp"
      class="input"
      placeholder="Cerca materia prima..."
      autocomplete="off"
    >

    <div id="autocomplete-results"></div>

    <div id="scheda-prodotto"></div>

  `;

  const input = box.querySelector("#search-mp");
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
      .eq("tipo_prodotto", "materia_prima")
      .or(`meta.ilike.%${term}%,descrizione.ilike.%${term}%`)
      .limit(8);

    results.innerHTML = `

      <div class="rf-doc-list">

      ${(data || []).map(p => `

        <div class="rf-doc-item autocomplete-item"
             data-id="${p.id}"
             data-um="${p.um || ""}"
             data-label="${(p.meta || "")} — ${p.descrizione}">

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

        apriSchedaProdotto(scheda, azienda, id, row.dataset.um, row.dataset.label);

      };

    });

  });

}

async function loadSottoscorta(box, azienda) {

  box.innerHTML = "Caricamento...";

  const { data } = await window.supabaseClient
    .from("v_magazzino_materie_prime")
    .select("prodotto_id, descrizione, giacenza_attuale, scorta_minima")
    .eq("azienda_id", azienda.id)
    .lte("giacenza_attuale", "scorta_minima");

  if (!data || !data.length) {
    box.innerHTML = "Nessun prodotto sottoscorta";
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

  box.querySelectorAll(".sottoscorta").forEach(row => {

    row.onclick = () => {

      const id = row.dataset.id;
      apriSchedaProdotto(box, azienda, id);

    };

  });

}

async function apriSchedaProdotto(box, azienda, prodottoId, um = "-", label = "") {

  box.innerHTML = "Caricamento scheda...";

  const { data } = await window.supabaseClient
    .from("v_magazzino_materie_prime")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("prodotto_id", prodottoId)
    .single();

  const { data: movimenti } = await window.supabaseClient
    .from("magazzino_movimenti")
    .select("tipo_movimento, quantita, created_at")
    .eq("prodotto_id", prodottoId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: mapping } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select("prezzo_ultimo_acquisto, fornitori:fornitore_id (ragione_sociale)")
    .eq("prodotto_id", prodottoId)
    .limit(1)
    .maybeSingle();

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

      <div class="rf-doc-meta">
        <span>Fornitore: ${mapping?.fornitori?.ragione_sociale || "—"}</span>
        <span>Ultimo prezzo: ${mapping?.prezzo_ultimo_acquisto || "—"}</span>
      </div>

      <div style="margin-top:8px;font-size:13px;">
        <strong>Ultimi movimenti</strong>

        ${(movimenti || []).map(m => `
          <div>${m.tipo_movimento} — ${m.quantita}</div>
        `).join("")}

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
