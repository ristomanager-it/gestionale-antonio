export async function renderAnagraficaProdotti(container) {

  const azienda = window.state?.azienda;

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal">

      <div class="rf-modal-header">

        <h3 class="rf-modal-title">Anagrafica Prodotti</h3>

        <button class="app-button tiny gray" id="close-modal">
          Chiudi
        </button>

      </div>

      <div class="rf-modal-body">

        <input
          id="search-prodotti"
          class="input"
          placeholder="Cerca codice o descrizione..."
          style="width:100%; margin-bottom:10px;"
        >

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
        <div style="font-size:13px; padding:8px;">
          Nessun prodotto trovato
        </div>
      `;

      return;
    }

    risultati.innerHTML = data.map(p => `

      <div 
        data-id="${p.id}" 
        style="padding:6px 4px; cursor:pointer; font-size:13px; border-bottom:1px solid #eee;"
        class="risultato-prodotto"
      >

        <div style="display:flex; justify-content:space-between;">

          <div>
            <strong>${p.meta || ""}</strong> — ${p.descrizione}
          </div>

          <div style="font-size:11px; opacity:0.7;">
            ${p.tipo_prodotto || ""}
          </div>

        </div>

      </div>

    `).join("");

    risultati.querySelectorAll(".risultato-prodotto").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;
        apriSchedaProdotto(modal, azienda, id);

      };

    });

  });

}

async function apriSchedaProdotto(modal, azienda, prodottoId) {

  const body = modal.querySelector(".rf-modal-body");

  body.innerHTML = `
    <div style="font-size:13px;">Caricamento...</div>
  `;

  const { data } = await window.supabaseClient
    .from("prodotti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("id", prodottoId)
    .single();

  if (!data) {
    body.innerHTML = `<div style="font-size:13px;">Prodotto non trovato</div>`;
    return;
  }

  body.innerHTML = `

    <div style="font-size:14px; font-weight:600; margin-bottom:10px;">
      ${data.meta || ""} — ${data.descrizione}
    </div>

    <div style="display:flex; flex-direction:column; gap:6px; font-size:13px;">

      <label>Unità di misura</label>
      <input id="um" class="input" value="${data.um || ""}">

      <label style="margin-top:6px;">Scorta minima</label>
      <input id="scorta" class="input" value="${data.scorta_minima || ""}">

    </div>

    <div style="margin-top:12px; display:flex; gap:8px;">

      <button class="app-button tiny" id="salva-prodotto">
        Salva
      </button>

      <button class="app-button tiny gray" id="indietro">
        Indietro
      </button>

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

    alert("Salvato");

  };

}
