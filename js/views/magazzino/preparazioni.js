export async function renderPreparazioni(container, azienda, startTab = "cerca") {

  container.innerHTML = `

  <div class="modal-overlay">

    <div class="modal-box">

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Preparazioni</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <div style="margin-top:15px; display:flex; gap:10px;">

        <button class="app-button tiny" id="tab-cerca">
          🔎 Cerca preparazione
        </button>

        <button class="app-button tiny gray" id="tab-sottoscorta">
          ⚠️ Sottoscorta
        </button>

      </div>

      <div id="contenuto-preparazioni" style="margin-top:15px;"></div>

    </div>

  </div>

  `;

  const contenuto = document.getElementById("contenuto-preparazioni");

  document.getElementById("close-modal").onclick = () => {
    container.innerHTML = "";
  };

  if (startTab === "sottoscorta") {
    loadSottoscorta(contenuto, azienda);
  } else {
    loadRicerca(contenuto, azienda);
  }

  document.getElementById("tab-cerca").onclick = () => {
    loadRicerca(contenuto, azienda);
  };

  document.getElementById("tab-sottoscorta").onclick = () => {
    loadSottoscorta(contenuto, azienda);
  };

}

function loadRicerca(box, azienda) {

  box.innerHTML = `

    <input
      id="search-prep"
      class="input-pill"
      placeholder="Cerca preparazione..."
      style="width:100%; margin-bottom:10px;"
    >

    <div id="risultati-prep"></div>

  `;

  const input = document.getElementById("search-prep");
  const risultati = document.getElementById("risultati-prep");

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
      .limit(10);

    risultati.innerHTML = data.map(r => `

      <div class="list-row" data-id="${r.id}" style="cursor:pointer;">
        ${r.nome}
      </div>

    `).join("");

    risultati.querySelectorAll(".list-row").forEach(row => {

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

  if (!data.length) {
    box.innerHTML = "Nessuna preparazione sottoscorta 🎉";
    return;
  }

  box.innerHTML = data.map(p => `

    <div class="list-row" data-id="${p.prodotto_id}" style="cursor:pointer;">

      <div style="display:flex; justify-content:space-between;">
        <strong>${p.descrizione}</strong>
        <span style="color:red;">
          ${p.giacenza_attuale} / ${p.scorta_minima}
        </span>
      </div>

    </div>

  `).join("");

}
