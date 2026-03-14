export async function renderAnagraficaProdotti(container) {

  const azienda = window.state?.azienda;

  container.innerHTML = `

  <div class="modal-overlay">

    <div class="modal-box">

      <div style="display:flex; justify-content:space-between;">
        <h3>Anagrafica Prodotti</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <input
        id="search-prodotti"
        class="input-pill"
        placeholder="Cerca prodotto..."
        style="width:100%; margin-top:15px;"
      >

      <div id="risultati-prodotti" style="margin-top:10px;"></div>

    </div>

  </div>

  `;

  const risultati = document.getElementById("risultati-prodotti");

  document.getElementById("close-modal").onclick = () => {
    container.innerHTML = "";
  };

  const input = document.getElementById("search-prodotti");

  input.addEventListener("input", async () => {

    const term = input.value.trim();

    if (term.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("prodotti")
      .select("id, descrizione, tipo_prodotto")
      .eq("azienda_id", azienda.id)
      .ilike("descrizione", `%${term}%`)
      .limit(15);

    risultati.innerHTML = data.map(p => `

      <div class="list-row" data-id="${p.id}" style="cursor:pointer;">

        <div style="display:flex; justify-content:space-between;">
          <strong>${p.descrizione}</strong>
          <span style="font-size:12px;">${p.tipo_prodotto}</span>
        </div>

      </div>

    `).join("");

    risultati.querySelectorAll(".list-row").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;
        apriSchedaProdotto(risultati, azienda, id);

      };

    });

  });

}

async function apriSchedaProdotto(box, azienda, prodottoId) {

  const { data } = await window.supabaseClient
    .from("prodotti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("id", prodottoId)
    .single();

  box.innerHTML = `

    <h4>${data.descrizione}</h4>

    <div style="margin-top:15px;">

      <label>Unità di misura</label>
      <input id="um" class="input-pill" value="${data.um || ""}">

      <label style="margin-top:10px;">Scorta minima</label>
      <input id="scorta" class="input-pill" value="${data.scorta_minima || ""}">

    </div>

    <div style="margin-top:15px; display:flex; gap:10px;">

      <button class="app-button tiny" id="salva-prodotto">
        Salva
      </button>

      <button class="app-button tiny gray" id="indietro">
        Indietro
      </button>

    </div>

  `;

  document.getElementById("indietro").onclick = () => {
    renderAnagraficaProdotti(box.parentElement.parentElement.parentElement);
  };

  document.getElementById("salva-prodotto").onclick = async () => {

    const um = document.getElementById("um").value;
    const scorta = document.getElementById("scorta").value;

    await window.supabaseClient
      .from("prodotti")
      .update({
        um,
        scorta_minima: scorta
      })
      .eq("id", prodottoId);

    alert("Salvato");

  };

}
