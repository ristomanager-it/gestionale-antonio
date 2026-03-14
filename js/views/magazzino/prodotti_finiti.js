export async function renderProdottiFiniti(container, azienda) {

  container.innerHTML = `<p>Caricamento prodotti finiti...</p>`;

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_prodotti_finiti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("descrizione");

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h3>Prodotti Finiti</h3>

    <table class="table-timbrature">
      <thead>
        <tr>
          <th>Piatto</th>
          <th>Costo Materia Prima</th>
          <th>Prezzo Vendita</th>
          <th>Giacenza</th>
        </tr>
      </thead>
      <tbody>
        ${(data || []).map(p => `
          <tr>
            <td>${p.descrizione}</td>
            <td>${Number(p.costo_materia_prima).toFixed(2)}</td>
            <td>${Number(p.prezzo_vendita).toFixed(2)}</td>
            <td>${Number(p.giacenza_attuale).toFixed(3)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

}
