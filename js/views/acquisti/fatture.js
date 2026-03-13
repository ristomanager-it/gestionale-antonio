import { escapeHtml } from "./utils.js";

export async function renderFatture(container, azienda) {

  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("fatture_acquisto")
    .select(`
      id,
      numero_documento,
      data_documento,
      totale,
      stato,
      fornitori:fornitore_id (
        ragione_sociale
      )
    `)
    .eq("azienda_id", azienda.id)
    .order("data_documento", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = `
      <div class="card">
        <h3>Errore caricamento fatture</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = `
  <div class="card">

    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3>Fatture acquisto</h3>

      <button id="btn-nuova-fattura" class="btn-primary">
        Nuova fattura
      </button>
    </div>

    <table class="app-table" style="margin-top:16px">

      <thead>
        <tr>
          <th>Numero</th>
          <th>Data</th>
          <th>Fornitore</th>
          <th>Totale</th>
          <th>Stato</th>
        </tr>
      </thead>

      <tbody>

        ${(data || []).map(f => `
          <tr>
            <td>${escapeHtml(f.numero_documento)}</td>
            <td>${f.data_documento || ""}</td>
            <td>${escapeHtml(f.fornitori?.ragione_sociale)}</td>
            <td>${f.totale || 0}</td>
            <td>${escapeHtml(f.stato)}</td>
          </tr>
        `).join("")}

      </tbody>

    </table>

  </div>
  `;

}
