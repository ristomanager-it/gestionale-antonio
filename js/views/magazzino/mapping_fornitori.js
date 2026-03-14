export async function renderMapping(container, azienda) {

  container.innerHTML = `

  <div class="modal-overlay">

    <div class="modal-box">

      <div style="display:flex; justify-content:space-between;">
        <h3>Mapping Fornitori</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <input
        id="search-mapping"
        class="input-pill"
        placeholder="Cerca prodotto..."
        style="width:100%; margin-top:15px;"
      >

      <div id="risultati-mapping" style="margin-top:10px;"></div>

    </div>

  </div>

  `;

  const risultati = document.getElementById("risultati-mapping");

  document.getElementById("close-modal").onclick = () => {
    container.innerHTML = "";
  };

  const input = document.getElementById("search-mapping");

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

    risultati.innerHTML = data.map(p => `

      <div class="list-row" data-id="${p.id}" style="cursor:pointer;">
        ${p.descrizione}
      </div>

    `).join("");

    risultati.querySelectorAll(".list-row").forEach(row => {

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

  if (!data.length) {
    box.innerHTML = "Nessun mapping trovato";
    return;
  }

  box.innerHTML = `

    <h4>Mapping fornitori</h4>

    ${data.map(m => `

      <div class="list-row">

        <strong>${m.fornitori?.ragione_sociale || ""}</strong>

        <div style="font-size:13px;">
          Codice: ${m.codice_fornitore || ""}
        </div>

        <div style="font-size:13px;">
          Prezzo: ${m.prezzo_ultimo_acquisto || ""}
        </div>

      </div>

    `).join("")}

  `;

}
