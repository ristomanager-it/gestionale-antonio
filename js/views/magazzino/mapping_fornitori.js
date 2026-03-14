export async function renderMapping(container, azienda) {

  container.innerHTML = `<p>Caricamento mapping...</p>`;

  const { data, error } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select(`
      codice_fornitore,
      descrizione_fornitore,
      prezzo_ultimo_acquisto,
      fornitori:fornitore_id ( ragione_sociale ),
      prodotti:prodotto_id ( descrizione, codice_interno )
    `)
    .eq("azienda_id", azienda.id)
    .eq("attivo", true);

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h3>Mapping Fornitori</h3>

    <button class="app-button tiny gray" id="btn-back-mag-home">← Menu Magazzino</button>

    <table class="table-timbrature" style="margin-top:10px;">
      <thead>
        <tr>
          <th>Prodotto</th>
          <th>Fornitore</th>
          <th>Codice Fornitore</th>
          <th>Descrizione Fattura</th>
          <th>Ultimo Prezzo</th>
        </tr>
      </thead>
      <tbody>
        ${(data || []).map(m => `
          <tr>
            <td>${escapeHtml((m.prodotti?.codice_interno || "") + " " + (m.prodotti?.descrizione || ""))}</td>
            <td>${escapeHtml(m.fornitori?.ragione_sociale || "")}</td>
            <td>${escapeHtml(m.codice_fornitore || "")}</td>
            <td>${escapeHtml(m.descrizione_fornitore || "")}</td>
            <td>${Number(m.prezzo_ultimo_acquisto || 0).toFixed(2)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document
    .getElementById("btn-back-mag-home")
    ?.addEventListener("click", () => {
      window.location.hash = "#/magazzino";
    });

}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
