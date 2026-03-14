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

    <h4>${data.descrizione}</h4>

    <div style="margin-top:10px;">
      <div>Giacenza: <strong>${data.giacenza_attuale}</strong></div>
      <div>Scorta minima: ${data.scorta_minima}</div>
    </div>

    <div style="margin-top:15px;">

      <strong>Fornitore preferito</strong><br>
      ${mapping?.fornitori?.ragione_sociale || "—"}

      <br><br>

      <strong>Ultimo prezzo</strong><br>
      ${mapping?.prezzo_ultimo_acquisto || "—"}

    </div>

    <div style="margin-top:20px;">

      <strong>Ultimi movimenti</strong>

      <div style="margin-top:8px;">

        ${(movimenti || []).map(m => `

          <div style="font-size:13px; padding:4px 0;">

            ${m.tipo_movimento} — ${m.quantita}

          </div>

        `).join("")}

      </div>

    </div>

    <div style="margin-top:20px; display:flex; gap:10px;">

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

}
