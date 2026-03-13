export async function renderPagamenti(container, azienda) {

  const { data, error } = await window.supabaseClient
    .from("vw_fatture_acquisto_pagamenti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("data_documento", { ascending: false });

  if (error) {
    container.innerHTML = `<div class="card">Errore caricamento pagamenti</div>`;
    return;
  }

  container.innerHTML = `
  <div class="card">

    <h3>Pagamenti fatture</h3>

    <table class="app-table">
      <thead>
        <tr>
          <th>Fattura</th>
          <th>Fornitore</th>
          <th>Totale</th>
          <th>Pagato</th>
          <th>Residuo</th>
        </tr>
      </thead>

      <tbody>
        ${(data || []).map(f => `
          <tr>
            <td>${f.numero_documento || ""}</td>
            <td>${f.ragione_sociale || ""}</td>
            <td>${f.totale || 0}</td>
            <td>${f.importo_pagato || 0}</td>
            <td>${f.residuo || 0}</td>
          </tr>
        `).join("")}
      </tbody>

    </table>

  </div>
  `;
}
