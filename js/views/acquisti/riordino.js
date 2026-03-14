export async function renderRiordino(container, azienda) {

  const supabase = window.supabaseClient;

  container.innerHTML = `

  <div class="card">

    <div style="display:flex;justify-content:space-between;align-items:center">

      <h3>Prodotti sotto scorta</h3>

      <button id="btn-manda-a-ordini" class="app-button green">
        MANDA A ORDINI
      </button>

    </div>

    <div id="riordino-results" style="margin-top:16px"></div>

  </div>

  `;

  const results = container.querySelector("#riordino-results");

  async function loadRiordino() {

    const { data, error } = await supabase
      .from("vw_riordino_prodotti")
      .select("*")
      .order("nome", { ascending:true });

    if (error) {

      results.innerHTML = `
        <div>Errore caricamento riordino</div>
      `;

      console.error(error);
      return;

    }

    const prodotti = (data || []).filter(p => Number(p.sotto_scorta) > 0);

    if (!prodotti.length) {

      results.innerHTML = `
        <div>Nessun prodotto sotto scorta</div>
      `;

      return;

    }

    results.innerHTML = `

    <table class="app-table">

      <thead>
        <tr>
          <th></th>
          <th>Prodotto</th>
          <th>Giacenza</th>
          <th>Scorta minima</th>
          <th>Da ordinare</th>
        </tr>
      </thead>

      <tbody>

      ${prodotti.map(p => `

        <tr>

          <td>

            <input
              type="checkbox"
              class="chk-riordino"
              data-id="${p.prodotto_id}"
            >

          </td>

          <td>${p.nome}</td>

          <td>${Number(p.giacenza_attuale || 0).toFixed(2)}</td>

          <td>${Number(p.scorta_minima || 0).toFixed(2)}</td>

          <td>

            <input
              type="number"
              class="input-qta"
              data-id="${p.prodotto_id}"
              value="${Number(p.quantita_da_ordinare || 0).toFixed(2)}"
              style="width:80px"
            >

          </td>

        </tr>

      `).join("")}

      </tbody>

    </table>

    `;

  }

  function mandaAOrdini(){

    const righe = [];

    container
      .querySelectorAll(".chk-riordino:checked")
      .forEach(c => {

        const id = c.dataset.id;

        const input = container.querySelector(
          `.input-qta[data-id="${id}"]`
        );

        const qta = parseFloat(input.value || 0);

        if(qta > 0){

          righe.push({
            prodotto_id:id,
            quantita:qta
          });

        }

      });

    if(!righe.length){

      alert("Seleziona almeno un prodotto");
      return;

    }

    window.state.ordineDraft = righe;

    window.location.hash = "#/acquisti/ordini";

  }

  document
    .getElementById("btn-manda-a-ordini")
    .addEventListener("click", mandaAOrdini);

  loadRiordino();

}
