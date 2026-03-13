export async function renderDDT(container, azienda) {

  const { data, error } = await window.supabaseClient
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
    .order("data_ddt", { ascending: false });

  if (error) {
    container.innerHTML = `<div class="card">Errore caricamento DDT</div>`;
    return;
  }

  container.innerHTML = `
  <div class="card">

    <h3>DDT / Bolle di consegna</h3>

    <table class="app-table">
      <thead>
        <tr>
          <th>Numero</th>
          <th>Data</th>
          <th>Fornitore</th>
        </tr>
      </thead>

      <tbody>
        ${(data || []).map(d => `
          <tr>
            <td>${d.numero_ddt || ""}</td>
            <td>${d.data_ddt || ""}</td>
            <td>${d.fornitori?.ragione_sociale || ""}</td>
          </tr>
        `).join("")}
      </tbody>

    </table>

  </div>
  `;
}
