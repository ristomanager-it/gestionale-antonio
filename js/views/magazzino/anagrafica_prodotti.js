export async function renderAnagraficaProdotti(container) {

  const azienda = window.state?.azienda;

  if (!azienda) return;

  const modal = document.createElement("div");

  modal.innerHTML = `
  
  <div class="rf-modal-backdrop">

    <div class="rf-modal rf-modal-small">

      <div class="rf-modal-header">

        <h3 class="rf-modal-title">Anagrafica Prodotti</h3>

        <button class="btn-secondary" id="close-modal">
          Chiudi
        </button>

      </div>

      <div class="rf-modal-body">

        <div class="form-group">

          <label>Cerca prodotto</label>

          <input
            id="search-prodotti"
            class="input"
            placeholder="Cerca per codice o descrizione..."
          >

        </div>

        <div id="risultati-prodotti"></div>

      </div>

    </div>

  </div>

  `;

  document.body.appendChild(modal);

  const risultati = modal.querySelector("#risultati-prodotti");
  const input = modal.querySelector("#search-prodotti");

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
      .select("id, meta, descrizione, tipo_prodotto")
      .eq("azienda_id", azienda.id)
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
            <th>Tipo</th>
          </tr>
        </thead>

        <tbody>

          ${data.map(p => `
          
            <tr data-id="${p.id}" style="cursor:pointer;">

              <td>${p.meta || ""}</td>
              <td>${p.descrizione || ""}</td>
              <td>${p.tipo_prodotto || ""}</td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    `;

    risultati.querySelectorAll("tbody tr").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;

        apriSchedaProdotto(modal, azienda, id);

      };

    });

  });

}

async function apriSchedaProdotto(modal, azienda, prodottoId) {

  const { data } = await window.supabaseClient
    .from("prodotti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("id", prodottoId)
    .single();

  const body = modal.querySelector(".rf-modal-body");

  body.innerHTML = `

    <div class="card">

      <h3 style="margin-top:0;">
        ${data.meta || ""} — ${data.descrizione}
      </h3>

      <div class="form-group">

        <label>Unità di misura</label>
        <input id="um" class="input" value="${data.um || ""}">

      </div>

      <div class="form-group">

        <label>Scorta minima</label>
        <input id="scorta" class="input" value="${data.scorta_minima || ""}">

      </div>

      <div style="margin-top:14px; display:flex; gap:8px;">

        <button class="btn-primary" id="salva-prodotto">
          Salva
        </button>

        <button class="btn-secondary" id="indietro">
          Indietro
        </button>

      </div>

    </div>

  `;

  body.querySelector("#indietro").onclick = () => {
    modal.remove();
    renderAnagraficaProdotti(document.body);
  };

  body.querySelector("#salva-prodotto").onclick = async () => {

    const um = body.querySelector("#um").value;
    const scorta = body.querySelector("#scorta").value;

    await window.supabaseClient
      .from("prodotti")
      .update({
        um,
        scorta_minima: scorta
      })
      .eq("id", prodottoId);

    alert("Prodotto salvato");

  };

}
