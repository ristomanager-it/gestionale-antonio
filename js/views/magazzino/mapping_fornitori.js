export async function renderMapping(container, azienda) {

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal" style="max-width:420px;height:auto;">

      <div class="rf-modal-header">
        <h3 class="rf-modal-title">Mapping Fornitori</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <div class="rf-modal-body" style="display:flex;flex-direction:column;gap:12px;">

        <input
          id="search-mapping"
          class="input"
          placeholder="Cerca prodotto..."
          autocomplete="off"
        >

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
      .select("id, descrizione")
      .eq("azienda_id", azienda.id)
      .ilike("descrizione", `%${term}%`)
      .limit(10);

    risultati.innerHTML = `

      <div class="rf-doc-list">

        ${(data || []).map(p => `

          <div class="rf-doc-item autocomplete-item" data-id="${p.id}">

            <div class="rf-doc-title">
              ${p.descrizione}
            </div>

          </div>

        `).join("")}

      </div>

    `;

    risultati.querySelectorAll(".autocomplete-item").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;
        apriMapping(risultati, azienda, id);

      };

    });

  });

}

async function apriMapping(box, azienda, prodottoId) {

  const { data } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select(`
      codice_fornitore,
      descrizione_fornitore,
      prezzo_ultimo_acquisto,
      fornitori:fornitore_id (ragione_sociale)
    `)
    .eq("prodotto_id", prodottoId)
    .limit(5);

  if (!data || !data.length) {
    box.innerHTML = "Nessun mapping trovato";
    return;
  }

  box.innerHTML = `

    <div class="rf-doc-list">

      ${data.map(m => `

        <div class="rf-doc-item">

          <div class="rf-doc-title">
            ${m.fornitori?.ragione_sociale || ""}
          </div>

          <div class="rf-doc-meta">
            <span>Codice: ${m.codice_fornitore || ""}</span>
            <span>Prezzo: ${m.prezzo_ultimo_acquisto || ""}</span>
          </div>

        </div>

      `).join("")}

    </div>

  `;

}
