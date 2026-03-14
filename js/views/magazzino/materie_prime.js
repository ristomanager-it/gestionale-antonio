export async function renderMateriePrime(container, azienda) {

  container.innerHTML = `

  <div class="modal-overlay" id="modal-magazzino">

    <div class="modal-box">

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h3>Materie Prime</h3>
        <button class="app-button tiny gray" id="close-modal">Chiudi</button>
      </div>

      <div style="display:flex; gap:10px; margin-bottom:15px;">

        <button class="app-button tiny" id="tab-cerca">
          🔎 Cerca prodotto
        </button>

        <button class="app-button tiny gray" id="tab-sottoscorta">
          ⚠️ Sottoscorta
        </button>

      </div>

      <div id="contenuto-magazzino"></div>

    </div>

  </div>

  `;

  const contenuto = document.getElementById("contenuto-magazzino");

  document.getElementById("close-modal").onclick = () => {
    container.innerHTML = "";
  };

  loadRicerca(contenuto, azienda);

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
      id="search-mp"
      class="input-pill"
      placeholder="Cerca materia prima..."
      style="width:100%; margin-bottom:10px;"
    >

    <div id="risultati-mp"></div>

  `;

  const input = document.getElementById("search-mp");
  const risultati = document.getElementById("risultati-mp");

  input.addEventListener("input", async () => {

    const term = input.value.trim();

    if (term.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, descrizione")
      .eq("azienda_id", azienda.id)
      .eq("tipo_prodotto", "materia_prima")
      .ilike("descrizione", `%${term}%`)
      .limit(10);

    if (error) {
      risultati.innerHTML = "Errore ricerca";
      return;
    }

    risultati.innerHTML = data.map(p => `

      <div class="list-row" data-id="${p.id}">
        ${p.descrizione}
      </div>

    `).join("");

  });

}

async function loadSottoscorta(box, azienda) {

  box.innerHTML = "Caricamento...";

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_materie_prime")
    .select("prodotto_id, descrizione, giacenza_attuale, scorta_minima")
    .eq("azienda_id", azienda.id)
    .lte("giacenza_attuale", "scorta_minima");

  if (error) {
    box.innerHTML = "Errore caricamento";
    return;
  }

  if (!data.length) {
    box.innerHTML = "Nessun prodotto sottoscorta 🎉";
    return;
  }

  box.innerHTML = data.map(p => `

    <div class="list-row">

      <div style="display:flex; justify-content:space-between;">

        <div>
          <strong>${p.descrizione}</strong>
        </div>

        <div style="color:red;">
          ${p.giacenza_attuale} / ${p.scorta_minima}
        </div>

      </div>

    </div>

  `).join("");

}
