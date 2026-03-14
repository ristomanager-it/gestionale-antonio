export async function renderPagamenti(container, azienda) {

  container.innerHTML = `
  <div class="card">

    <h3>Pagamenti fatture</h3>

    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-top:10px;">

      <div>
        <label style="font-size:13px;">Fornitore</label>
        <input id="pagamenti-fornitore" class="input" placeholder="Cerca fornitore">
      </div>

      <div>
        <label style="font-size:13px;">Data dal</label>
        <input id="pagamenti-data-da" type="date" class="input">
      </div>

      <div>
        <label style="font-size:13px;">Data al</label>
        <input id="pagamenti-data-a" type="date" class="input">
      </div>

    </div>

    <div style="margin-top:12px; display:flex; gap:8px;">
      <button id="pagamenti-cerca" class="btn-primary">Cerca</button>
      <button id="pagamenti-reset" class="btn-secondary">Reset</button>
    </div>

    <div id="pagamenti-feedback" style="margin-top:12px; font-size:13px; color:#667085;">
      Inserisci i filtri e premi cerca.
    </div>

    <div id="pagamenti-results" style="margin-top:16px;"></div>

  </div>
  `;

  const inputFornitore = container.querySelector("#pagamenti-fornitore");
  const inputDataDa = container.querySelector("#pagamenti-data-da");
  const inputDataA = container.querySelector("#pagamenti-data-a");
  const btnCerca = container.querySelector("#pagamenti-cerca");
  const btnReset = container.querySelector("#pagamenti-reset");
  const results = container.querySelector("#pagamenti-results");
  const feedback = container.querySelector("#pagamenti-feedback");

  function renderResults(rows){

    if(!rows.length){
      results.innerHTML = `
        <div class="rf-empty-righe">
          Nessun pagamento trovato.
        </div>
      `;
      return;
    }

    results.innerHTML = `
      <table class="app-table">

        <thead>
          <tr>
            <th>Fattura</th>
            <th>Data</th>
            <th>Fornitore</th>
            <th>Totale</th>
            <th>Pagato</th>
            <th>Residuo</th>
          </tr>
        </thead>

        <tbody>
          ${rows.map(f => `
            <tr>
              <td>${f.numero_documento || ""}</td>
              <td>${f.data_documento || ""}</td>
              <td>${f.ragione_sociale || ""}</td>
              <td>${f.totale || 0}</td>
              <td>${f.importo_pagato || 0}</td>
              <td>${f.residuo || 0}</td>
            </tr>
          `).join("")}
        </tbody>

      </table>
    `;
  }

  btnCerca.addEventListener("click", async ()=>{

    const fornitore = inputFornitore.value.trim();
    const dataDa = inputDataDa.value;
    const dataA = inputDataA.value;

    if(!fornitore && !dataDa && !dataA){
      feedback.textContent = "Inserisci almeno un filtro.";
      return;
    }

    feedback.textContent = "Ricerca in corso...";

    let query = window.supabaseClient
      .from("vw_fatture_acquisto_pagamenti")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("data_documento", { ascending:false });

    if(dataDa){
      query = query.gte("data_documento", dataDa);
    }

    if(dataA){
      query = query.lte("data_documento", dataA);
    }

    const { data, error } = await query;

    if(error){
      feedback.textContent = "Errore ricerca pagamenti";
      return;
    }

    let rows = data || [];

    if(fornitore){
      const needle = fornitore.toLowerCase();
      rows = rows.filter(r =>
        (r.ragione_sociale || "").toLowerCase().includes(needle)
      );
    }

    feedback.textContent = `Trovati ${rows.length} pagamenti`;

    renderResults(rows);

  });

  btnReset.addEventListener("click", ()=>{
    inputFornitore.value="";
    inputDataDa.value="";
    inputDataA.value="";
    results.innerHTML="";
    feedback.textContent="Filtri azzerati.";
  });

}
