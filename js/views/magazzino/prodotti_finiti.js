export async function renderProdottiFiniti(container, azienda) {

  container.innerHTML = `

  <div class="modal-overlay">

    <div class="modal-box">

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Prodotti Finiti</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <div style="margin-top:15px; display:flex; gap:10px;">

        <button class="app-button tiny" id="tab-cerca">
          🔎 Cerca prodotto
        </button>

        <button class="app-button tiny gray" id="tab-disponibili">
          📦 Disponibili
        </button>

      </div>

      <div id="contenuto-prodotti-finiti" style="margin-top:15px;"></div>

    </div>

  </div>

  `;

  const contenuto = document.getElementById("contenuto-prodotti-finiti");

  document.getElementById("close-modal").onclick = () => {
    container.innerHTML = "";
  };

  loadRicerca(contenuto, azienda);

  document.getElementById("tab-cerca").onclick = () => {
    loadRicerca(contenuto, azienda);
  };

  document.getElementById("tab-disponibili").onclick = () => {
    loadDisponibili(contenuto, azienda);
  };

}

function loadRicerca(box, azienda) {

  box.innerHTML = `

    <input
      id="search-pf"
      class="input-pill"
      placeholder="Cerca prodotto finito..."
      style="width:100%; margin-bottom:10px;"
    >

    <div id="risultati-pf"></div>

  `;

  const input = document.getElementById("search-pf");
  const risultati = document.getElementById("risultati-pf");

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
      .eq("tipo_prodotto", "prodotto_finito")
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
        apriSchedaProdotto(box, azienda, id);

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

  if (!data.length) {
    box.innerHTML = "Nessun prodotto disponibile";
    return;
  }

  box.innerHTML = data.map(p => `

    <div class="list-row" data-id="${p.prodotto_id}" style="cursor:pointer;">

      <div style="display:flex; justify-content:space-between;">
        <strong>${p.descrizione}</strong>
        <span>${p.giacenza_attuale}</span>
      </div>

    </div>

  `).join("");

  box.querySelectorAll(".list-row").forEach(row => {

    row.onclick = () => {

      const id = row.dataset.id;
      apriSchedaProdotto(box, azienda, id);

    };

  });

}

async function apriSchedaProdotto(box, azienda, prodottoId) {

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

    <h4>${data.descrizione}</h4>

    <div style="margin-top:10px;">
      Disponibili: <strong>${data.giacenza_attuale}</strong>
    </div>

    <div style="margin-top:20px; display:flex; gap:10px;">

      <button class="app-button tiny gray" id="btn-indietro">
        ← Indietro
      </button>

    </div>

  `;

  document.getElementById("btn-indietro").onclick = () => {
    loadRicerca(box, azienda);
  };

}
