export async function renderRiordino(container, azienda) {

  const supabase = window.supabaseClient;

  container.innerHTML = `
  <div class="card">

    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h3>Riordino prodotti sotto scorta</h3>

      <button id="btn-manda-ordini" class="app-button green">
        MANDA A ORDINI
      </button>
    </div>

    <div id="riordino-table" style="margin-top:16px"></div>

  </div>
  `;

  const tableWrap = container.querySelector("#riordino-table");

  async function loadRiordino() {

    const { data, error } = await supabase
      .from("vw_riordino_prodotti")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("nome");

    if (error) {

      console.error(error);

      tableWrap.innerHTML = `
      <div>Errore caricamento riordino</div>
      `;

      return;
    }

    const prodotti = (data || []).filter(p => Number(p.sotto_scorta) === 1);

    if (!prodotti.length) {

      tableWrap.innerHTML = `
      <div>Nessun prodotto sotto scorta</div>
      `;

      return;
    }

    tableWrap.innerHTML = `
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
              data-nome="${p.nome}"
            >
          </td>

          <td>${p.nome}</td>

          <td>${Number(p.giacenza_attuale || 0).toFixed(2)}</td>

          <td>${Number(p.scorta_minima || 0).toFixed(2)}</td>

          <td>
            <input
              type="number"
              class="qta-riordino"
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

  function mandaAOrdini() {

    const righe = [];

    container.querySelectorAll(".chk-riordino:checked")
      .forEach(c => {

        const id = c.dataset.id;
        const nome = c.dataset.nome;

        const input = container.querySelector(
          `.qta-riordino[data-id="${id}"]`
        );

        const qta = parseFloat(input.value || 0);

        if (qta > 0) {

          righe.push({
            prodotto_id: id,
            nome: nome,
            quantita: qta
          });

        }

      });

    if (!righe.length) {

      alert("Seleziona almeno un prodotto");
      return;

    }

    // salva nello stato globale
    window.state = window.state || {};
    window.state.ordineDraft = righe;

    // cambia tab verso ORDINI
    const tabOrdini = document.querySelector('[data-tab="ordini"]');

    if (tabOrdini) {
      tabOrdini.click();
    }

  }

  container
    .querySelector("#btn-manda-ordini")
    .addEventListener("click", mandaAOrdini);

  loadRiordino();

}
