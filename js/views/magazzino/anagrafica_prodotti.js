export async function renderAnagraficaProdotti(container) {

  const azienda = window.state?.azienda;

  const modal = document.createElement("div");

  modal.innerHTML = `

  <div class="rf-modal-backdrop">

    <div class="rf-modal" style="max-width:420px;height:auto;">

      <div class="rf-modal-header">

        <h3 class="rf-modal-title">Anagrafica Prodotti</h3>

        <button class="app-button tiny gray" id="close-modal">
          Chiudi
        </button>

      </div>

      <div class="rf-modal-body" style="display:flex;flex-direction:column;gap:12px;">

        <input
          id="search-prodotti"
          class="input"
          placeholder="Cerca codice o descrizione..."
          autocomplete="off"
        />

        <div id="risultati-prodotti"></div>

        <div id="scheda-prodotto"></div>

      </div>

    </div>

  </div>

  `;

  document.body.appendChild(modal);

  const risultati = modal.querySelector("#risultati-prodotti");
  const scheda = modal.querySelector("#scheda-prodotto");
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
      .select("id, meta, descrizione, tipo_prodotto, um")
      .eq("azienda_id", azienda.id)
      .or(`descrizione.ilike.%${term}%,meta.ilike.%${term}%`)
      .limit(15);

    if (!data || !data.length) {

      risultati.innerHTML = `
        <div style="font-size:13px;">
          Nessun prodotto trovato
        </div>
      `;

      return;
    }

    risultati.innerHTML = `

      <div class="rf-doc-list">

        ${data.map(p => `

          <div class="rf-doc-item risultato-prodotto"
               data-id="${p.id}"
               data-label="${(p.meta || "")} — ${p.descrizione}"
               data-um="${p.um || ""}"
               data-tipo="${p.tipo_prodotto || ""}">

            <div class="rf-doc-title">
              ${(p.meta || "")} — ${p.descrizione}
            </div>

            <div class="rf-doc-meta">
              <span>${p.tipo_prodotto || ""}</span>
              <span>${p.um || "-"}</span>
            </div>

          </div>

        `).join("")}

      </div>

    `;

    risultati.querySelectorAll(".risultato-prodotto").forEach(row => {

      row.onclick = () => {

        const id = row.dataset.id;

        input.value = row.dataset.label;

        risultati.innerHTML = "";

        apriSchedaProdotto(
          scheda,
          azienda,
          id,
          row.dataset.label,
          row.dataset.um,
          row.dataset.tipo
        );

      };

    });

  });

}



async function apriSchedaProdotto(box, azienda, prodottoId, label, um, tipo) {

  box.innerHTML = "Caricamento...";

  const { data } = await window.supabaseClient
    .from("prodotti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("id", prodottoId)
    .single();

  if (!data) {
    box.innerHTML = "Prodotto non trovato";
    return;
  }

  box.innerHTML = `

    <div class="rf-doc-item">

      <div class="rf-doc-title">
        ${label || (data.meta || "") + " — " + data.descrizione}
      </div>

      <div class="rf-doc-meta">
        <span>Tipo: ${tipo || data.tipo_prodotto || "-"}</span>
        <span>UM: ${um || data.um || "-"}</span>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">

        <label>Unità di misura</label>
        <input id="um" class="input" value="${data.um || ""}">

        <label>Scorta minima</label>
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

    </div>

  `;

  box.querySelector("#indietro").onclick = () => {

    box.innerHTML = "";

  };

  box.querySelector("#salva-prodotto").onclick = async () => {

    const umVal = box.querySelector("#um").value;
    const scortaVal = box.querySelector("#scorta").value;

    await window.supabaseClient
      .from("prodotti")
      .update({
        um: umVal,
        scorta_minima: scortaVal
      })
      .eq("id", prodottoId);

    alert("Salvato");

  };

}
