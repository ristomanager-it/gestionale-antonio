export async function renderPreparazioni(container, azienda) {

  container.innerHTML = `<p>Caricamento preparazioni...</p>`;

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_preparazioni")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("descrizione");

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h3>Magazzino Preparazioni</h3>

    <table class="table-timbrature">
      <thead>
        <tr>
          <th>Preparazione</th>
          <th>Giacenza</th>
          <th>Ricetta</th>
        </tr>
      </thead>
      <tbody>
        ${(data || []).map(p => `
          <tr>
            <td>${p.descrizione}</td>
            <td>${Number(p.giacenza_attuale).toFixed(3)}</td>
            <td>${p.ricetta_nome || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

}
