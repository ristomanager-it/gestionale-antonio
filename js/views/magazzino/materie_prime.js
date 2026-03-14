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

    const { data } = await window.supabaseClient
      .from("prodotti")
      .select("id, descrizione")
      .eq("azienda_id", azienda.id)
      .eq("tipo_prodotto", "materia_prima")
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

async function loadSottoscorta(box, azienda) {

  box.innerHTML = "Caricamento...";

  const { data } = await window.supabaseClient
    .from("v_magazzino_materie_prime")
    .select("prodotto_id, descrizione, giacenza_attuale, scorta_minima")
    .eq("azienda_id", azienda.id)
    .lte("giacenza_attuale", "scorta_minima");

  if (!data.length) {
    box.innerHTML = "Nessun prodotto sottoscorta 🎉";
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

  box.querySelectorAll(".list-row").forEach(row => {

    row.onclick = () => {

      const id = row.dataset.id;
      apriSchedaProdotto(box, azienda, id);

    };

  });

}

async function apriSchedaProdotto(box, azienda, prodottoId) {

  box.innerHTML = "Caricamento scheda...";

  const { data } = await window.supabaseClient
    .from("v_magazzino_materie_prime")
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

      <div>Giacenza: <strong>${data.giacenza_attuale}</strong></div>
      <div>Scorta minima: ${data.scorta_minima}</div>

    </div>

    <div style="margin-top:15px; display:flex; gap:10px;">

      <button class="app-button tiny" id="btn-carico">
        + Carico
      </button>

      <button class="app-button tiny gray" id="btn-indietro">
        ← Indietro
      </button>

    </div>

  `;

  document.getElementById("btn-indietro").onclick = () => {
    loadRicerca(box, azienda);
  };

  document.getElementById("btn-carico").onclick = () => {
    apriCarico(box, azienda, prodottoId, data.descrizione);
  };

}

function apriCarico(box, azienda, prodottoId, nome) {

  box.innerHTML = `

    <h4>Carico ${nome}</h4>

    <input
      id="quantita-carico"
      class="input-pill"
      type="number"
      step="0.01"
      placeholder="Quantità"
      style="margin-top:10px;"
    >

    <div style="margin-top:15px; display:flex; gap:10px;">

      <button class="app-button tiny" id="salva-carico">
        Salva
      </button>

      <button class="app-button tiny gray" id="annulla-carico">
        Annulla
      </button>

    </div>

  `;

  document.getElementById("annulla-carico").onclick = () => {
    renderMateriePrime(box.parentElement.parentElement.parentElement, azienda);
  };

  document.getElementById("salva-carico").onclick = async () => {

    const q = document.getElementById("quantita-carico").value;

    if (!q) return alert("Inserisci quantità");

    await window.supabaseClient
      .from("magazzino_movimenti")
      .insert({
        azienda_id: azienda.id,
        prodotto_id: prodottoId,
        tipo_movimento: "CARICO",
        quantita: q
      });

    alert("Carico registrato");

    renderMateriePrime(box.parentElement.parentElement.parentElement, azienda);

  };

}
