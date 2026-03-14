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

        <div id="mapping-risultati"></div>

        <div id="mapping-card-prodotto" style="display:none;"></div>

        <div id="mapping-fornitori"></div>

      </div>

    </div>

  </div>

  `;

  document.body.appendChild(modal);

  const input = modal.querySelector("#search-mapping");
  const risultati = modal.querySelector("#mapping-risultati");
  const cardProdotto = modal.querySelector("#mapping-card-prodotto");
  const fornitoriBox = modal.querySelector("#mapping-fornitori");

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
      .select("id, meta, descrizione, um")
      .eq("azienda_id", azienda.id)
      .ilike("descrizione", `%${term}%`)
      .limit(10);

    risultati.innerHTML = `

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

    risultati.querySelectorAll(".autocomplete-item").forEach(row => {

      row.onclick = async () => {

        const prodottoId = row.dataset.id;

        input.value = row.dataset.label;

        risultati.innerHTML = "";

        cardProdotto.innerHTML = `

          <div class="rf-doc-item">

            <div class="rf-doc-title">
              ${row.dataset.label}
            </div>

            <div class="rf-doc-meta">
              <span>UM: ${row.dataset.um || "-"}</span>
            </div>

          </div>

        `;

        cardProdotto.style.display = "block";

        caricaFornitori(fornitoriBox, prodottoId);

      };

    });

  });

}

async function caricaFornitori(box, prodottoId) {

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

  if (!data || !data.length) {

    box.innerHTML = "Nessun fornitore associato";

    return;

  }

  box.innerHTML = `

    <div class="rf-doc-list">

      ${data.map(f => `

        <div class="rf-doc-item">

          <div class="rf-doc-title">
            ${f.fornitori?.ragione_sociale || ""}
          </div>

          <div class="rf-doc-meta">
            <span>Codice: ${f.codice_fornitore || "-"}</span>
            <span>Prezzo: ${f.prezzo_ultimo_acquisto || "-"}</span>
          </div>

        </div>

      `).join("")}

    </div>

  `;

}
