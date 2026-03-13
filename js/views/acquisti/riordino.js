export async function renderRiordino(container, azienda) {

  const supabase = window.supabaseClient;

  async function loadRiordino() {

    const { data, error } = await supabase
      .from("vw_riordino_prodotti")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("nome", { ascending: true });

    if (error) {
      container.innerHTML = `
        <div class="card">
          <h3>Errore caricamento riordino</h3>
          <pre>${error.message}</pre>
        </div>
      `;
      return;
    }

    const prodotti = (data || []).filter(p => Number(p.quantita_da_ordinare) > 0);

    container.innerHTML = `

    <div class="card">

      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h3>Riordino prodotti</h3>

        <button id="btn-crea-ordine" class="app-button green">
          CREA ORDINE
        </button>
      </div>

      <table class="app-table" style="margin-top:16px">

        <thead>
          <tr>
            <th></th>
            <th>Prodotto</th>
            <th>Giacenza</th>
            <th>Scorta Minima</th>
            <th>Da Ordinare</th>
          </tr>
        </thead>

        <tbody>

          ${prodotti.map(p => `
            <tr>
              <td>
                <input type="checkbox" class="chk-riordino" data-id="${p.prodotto_id}">
              </td>

              <td>${p.nome || ""}</td>

              <td>${Number(p.giacenza_attuale || 0).toFixed(2)}</td>

              <td>${Number(p.scorta_minima || 0).toFixed(2)}</td>

              <td>
                <input 
                  type="number"
                  class="input-ordine"
                  data-id="${p.prodotto_id}"
                  value="${Number(p.quantita_da_ordinare || 0).toFixed(2)}"
                  style="width:80px"
                >
              </td>
            </tr>
          `).join("")}

        </tbody>

      </table>

    </div>

    `;

    document
      .getElementById("btn-crea-ordine")
      .addEventListener("click", creaOrdine);
  }

  async function creaOrdine() {

    const checkboxes = document.querySelectorAll(".chk-riordino:checked");

    if (!checkboxes.length) {
      alert("Seleziona almeno un prodotto");
      return;
    }

    const righe = [];

    checkboxes.forEach(c => {

      const id = c.dataset.id;

      const input = document.querySelector(`.input-ordine[data-id="${id}"]`);

      const qta = parseFloat(input.value || 0);

      if (qta > 0) {

        righe.push({
          prodotto_id: id,
          quantita: qta
        });

      }

    });

    if (!righe.length) {
      alert("Quantità non valide");
      return;
    }

    const { data: ordine, error: erroreOrdine } = await supabase
      .from("ordini_fornitore")
      .insert({
        azienda_id: azienda.id,
        stato: "bozza",
        data_ordine: new Date().toISOString()
      })
      .select()
      .single();

    if (erroreOrdine) {
      alert("Errore creazione ordine");
      return;
    }

    const ordineId = ordine.id;

    const righeInsert = righe.map(r => ({
      ordine_id: ordineId,
      prodotto_id: r.prodotto_id,
      quantita: r.quantita
    }));

    const { error: erroreRighe } = await supabase
      .from("ordini_fornitore_righe")
      .insert(righeInsert);

    if (erroreRighe) {
      alert("Errore inserimento righe ordine");
      return;
    }

    alert("Ordine creato");

    loadRiordino();
  }

  loadRiordino();
}
