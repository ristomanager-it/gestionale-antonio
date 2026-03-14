export async function renderRiordino(container, azienda) {

  const supabase = window.supabaseClient;

  container.innerHTML = `
  <div class="card">

    <h3>Riordino prodotti sotto scorta</h3>

    <div style="margin-top:12px; display:flex; gap:8px;">
      <button id="btn-manda-ordini" class="btn-primary">
        Manda a ordini
      </button>
    </div>

    <div id="riordino-results" style="margin-top:16px;"></div>

  </div>
  `;

  const results = container.querySelector("#riordino-results");

  async function loadRiordino(){

    const { data, error } = await supabase
      .from("vw_riordino_prodotti")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("nome");

    if(error){
      results.innerHTML = `<div class="rf-empty">Errore caricamento riordino</div>`;
      return;
    }

    const prodotti = (data || []).filter(p => Number(p.sotto_scorta) === 1);

    if(!prodotti.length){
      results.innerHTML = `<div class="rf-empty">Nessun prodotto sotto scorta</div>`;
      return;
    }

    results.innerHTML = prodotti.map(p => `

      <div class="card rf-riordino-item">

        <div style="display:flex; justify-content:space-between; align-items:center">

          <strong>${p.nome}</strong>

          <input
            type="checkbox"
            class="chk-riordino"
            data-id="${p.prodotto_id}"
            data-nome="${p.nome}"
          >

        </div>

        <div class="rf-grid" style="margin-top:10px">

          <div>
            <label>Giacenza</label>
            <div>${Number(p.giacenza_attuale || 0).toFixed(2)}</div>
          </div>

          <div>
            <label>Scorta minima</label>
            <div>${Number(p.scorta_minima || 0).toFixed(2)}</div>
          </div>

          <div>
            <label>Da ordinare</label>
            <input
              type="number"
              class="input qta-riordino"
              data-id="${p.prodotto_id}"
              value="${Number(p.quantita_da_ordinare || 0).toFixed(2)}"
            >
          </div>

        </div>

      </div>

    `).join("");

  }

  function mandaAOrdini(){

    const righe = [];

    container.querySelectorAll(".chk-riordino:checked")
      .forEach(c => {

        const id = c.dataset.id;
        const nome = c.dataset.nome;

        const input = container.querySelector(
          `.qta-riordino[data-id="${id}"]`
        );

        const qta = parseFloat(input.value || 0);

        if(qta > 0){

          righe.push({
            prodotto_id:id,
            nome:nome,
            quantita:qta
          });

        }

      });

    if(!righe.length){
      alert("Seleziona almeno un prodotto");
      return;
    }

    window.state = window.state || {};
    window.state.ordineDraft = righe;

    const tabOrdini = document.querySelector('[data-tab="ordini"]');

    if(tabOrdini){
      tabOrdini.click();
    }

  }

  container
    .querySelector("#btn-manda-ordini")
    .addEventListener("click", mandaAOrdini);

  loadRiordino();

}
