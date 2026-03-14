export async function renderMateriePrime(container, azienda, startTab = "cerca") {

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal">

      <div class="rf-modal-header">

        <h3 class="rf-modal-title">Materie Prime</h3>

        <button class="btn-secondary" id="close-modal">
          Chiudi
        </button>

      </div>

      <div class="rf-modal-body">

        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">

          <button type="button" class="btn-primary" id="tab-cerca">
            Cerca prodotto
          </button>

          <button type="button" class="btn-secondary" id="tab-sottoscorta">
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

  modal.querySelector("#close-modal").onclick = () => {
    modal.remove();
  };

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

    <div class="form-group">

      <label>Cerca materia prima</label>

      <input
        id="search-mp"
        class="input"
        placeholder="Cerca per codice o descrizione..."
      >

    </div>

    <div id="risultati-mp"></div>

  `;

  const input = box.querySelector("#search-mp");
  const risultati = box.querySelector("#risultati-mp");

  input.addEventListener("input", async () => {

    const term = input.value.trim();

    if (term.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("prodotti")
      .select("id, meta, descrizione")
      .eq("azienda_id", azienda.id)
      .eq("tipo_prodotto", "materia_prima")
      .or(`descrizione.ilike.%${term}%,meta.ilike.%${term}%`)
      .limit(15);

    if (!data || !data.length) {

      risultati.innerHTML = `
        <div class="rf-empty-righe">
          Nessun prodotto trovato
        </div>
      `;

      return;
    }

    risultati.innerHTML = `

      <table class="app-table">

        <thead>
          <tr>
            <th>Codice</th>
            <th>Descrizione</th>
          </tr>
        </thead>

        <tbody>

          ${data.map(p => `

            <tr data-id="${p.id}" style="cursor:pointer;">

              <td>${p.meta || ""}</td>
              <td>${p.descrizione || ""}</td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    `;

    risultati.querySelectorAll("tbody tr").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;

        apriSchedaProdotto(box, azienda, id);

      };

    });

  });

}

async function loadSottoscorta(box, azienda) {

  box.innerHTML = `

    <div class="card">
      Caricamento prodotti sottoscorta...
    </div>

  `;

  const { data } = await window.supabaseClient
    .from("v_magazzino_materie_prime")
    .select("prodotto_id, descrizione, giacenza_attuale, scorta_minima")
    .eq("azienda_id", azienda.id)
    .lte("giacenza_attuale", "scorta_minima");

  if (!data || !data.length) {

    box.innerHTML = `
      <div class="rf-empty-righe">
        Nessun prodotto sottoscorta
      </div>
    `;

    return;
  }

  box.innerHTML = `

    <table class="app-table">

      <thead>
        <tr>
          <th>Prodotto</th>
          <th>Giacenza</th>
          <th>Scorta minima</th>
        </tr>
      </thead>

      <tbody>

        ${data.map(p => `

          <tr data-id="${p.prodotto_id}" style="cursor:pointer;">

            <td>${p.descrizione}</td>

            <td style="color:#b42318;">
              ${p.giacenza_attuale}
            </td>

            <td>
              ${p.scorta_minima}
            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;

  box.querySelectorAll("tbody tr").forEach(row => {

    row.onclick = () => {

      const id = row.dataset.id;

      apriSchedaProdotto(box, azienda, id);

    };

  });

}

async function apriSchedaProdotto(box, azienda, prodottoId) {

  box.innerHTML = `

    <div class="card">
      Caricamento scheda prodotto...
    </div>

  `;

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

  if (!data) {

    box.innerHTML = `
      <div class="rf-empty-righe">
        Prodotto non trovato
      </div>
    `;

    return;
  }

  box.innerHTML = `

    <div class="card">

      <h3 style="margin-top:0;">
        ${data.descrizione}
      </h3>

      <div style="margin-top:10px;">

        <div>
          Giacenza: <strong>${data.giacenza_attuale}</strong>
        </div>

        <div>
          Scorta minima: ${data.scorta_minima}
        </div>

      </div>

      <div style="margin-top:16px;">

        <strong>Fornitore preferito</strong><br>

        ${mapping?.fornitori?.ragione_sociale || "—"}

        <br><br>

        <strong>Ultimo prezzo</strong><br>

        ${mapping?.prezzo_ultimo_acquisto || "—"}

      </div>

      <div style="margin-top:18px;">

        <strong>Ultimi movimenti</strong>

        <div style="margin-top:8px; font-size:13px;">

          ${(movimenti || []).map(m => `
            <div>
              ${m.tipo_movimento} — ${m.quantita}
            </div>
          `).join("")}

        </div>

      </div>

      <div style="margin-top:16px; display:flex; gap:8px;">

        <button class="btn-secondary" id="btn-indietro">
          Indietro
        </button>

      </div>

    </div>

  `;

  box.querySelector("#btn-indietro").onclick = () => {
    loadRicerca(box, azienda);
  };

}
