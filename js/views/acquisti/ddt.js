export async function renderDDT(container, azienda) {

  container.innerHTML = `
  <div class="card">

    <h3>DDT / Bolle di consegna</h3>

    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-top:10px;">

      <div>
        <label style="font-size:13px;">Fornitore</label>
        <input id="ddt-fornitore" class="input" placeholder="Cerca fornitore">
      </div>

      <div>
        <label style="font-size:13px;">Data dal</label>
        <input id="ddt-data-da" type="date" class="input">
      </div>

      <div>
        <label style="font-size:13px;">Data al</label>
        <input id="ddt-data-a" type="date" class="input">
      </div>

    </div>

    <div style="margin-top:12px; display:flex; gap:8px;">
      <button id="ddt-cerca" class="btn-primary">Cerca</button>
      <button id="ddt-reset" class="btn-secondary">Reset</button>
    </div>

    <div id="ddt-feedback" style="margin-top:12px; font-size:13px; color:#667085;">
      Inserisci i filtri e premi cerca.
    </div>

    <div id="ddt-results" style="margin-top:16px;"></div>

  </div>
  `;

  const inputFornitore = container.querySelector("#ddt-fornitore");
  const inputDataDa = container.querySelector("#ddt-data-da");
  const inputDataA = container.querySelector("#ddt-data-a");
  const btnCerca = container.querySelector("#ddt-cerca");
  const btnReset = container.querySelector("#ddt-reset");
  const results = container.querySelector("#ddt-results");
  const feedback = container.querySelector("#ddt-feedback");

  function renderResults(rows){

    if(!rows.length){
      results.innerHTML = `
        <div class="rf-empty-righe">
          Nessun DDT trovato.
        </div>
      `;
      return;
    }

    results.innerHTML = `
      <table class="app-table">

        <thead>
          <tr>
            <th>Numero</th>
            <th>Data</th>
            <th>Fornitore</th>
          </tr>
        </thead>

        <tbody>
          ${rows.map(d => `
            <tr>
              <td>${d.numero_ddt || ""}</td>
              <td>${d.data_ddt || ""}</td>
              <td>${d.fornitori?.ragione_sociale || ""}</td>
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
      .from("ddt_acquisto")
      .select(`
        id,
        numero_ddt,
        data_ddt,
        fornitori:fornitore_id (
          ragione_sociale
        )
      `)
      .eq("azienda_id", azienda.id)
      .order("data_ddt", { ascending:false });

    if(dataDa){
      query = query.gte("data_ddt", dataDa);
    }

    if(dataA){
      query = query.lte("data_ddt", dataA);
    }

    const { data, error } = await query;

    if(error){
      feedback.textContent = "Errore ricerca DDT";
      return;
    }

    let rows = data || [];

    if(fornitore){
      const needle = fornitore.toLowerCase();
      rows = rows.filter(r =>
        (r.fornitori?.ragione_sociale || "").toLowerCase().includes(needle)
      );
    }

    feedback.textContent = `Trovati ${rows.length} DDT`;

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
