export async function renderPreparazioni(container, azienda) {

  container.innerHTML = `<p>Caricamento preparazioni...</p>`;

  const { data, error } = await window.supabaseClient
    .from("vw_lotti_disponibili")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("data_produzione", { ascending: false });

  if (error) {
    container.innerHTML = `
      <p style="color:red;">
        Errore: ${error.message}
      </p>
    `;
    return;
  }

  container.innerHTML = `

    <h3>Preparazioni (Lotti Produzione)</h3>

    <button class="app-button tiny gray" id="btn-back-mag-home">
      ← Menu Magazzino
    </button>

    <table class="table-timbrature" style="margin-top:10px;">

      <thead>
        <tr>
          <th>Preparazione</th>
          <th>Lotto</th>
          <th>Data Produzione</th>
          <th>Giacenza</th>
        </tr>
      </thead>

      <tbody>

        ${(data || []).map(l => `
          <tr>

            <td>
              ${escapeHtml(l.prodotto_nome || l.descrizione || "")}
            </td>

            <td>
              ${escapeHtml(l.codice_lotto || "")}
            </td>

            <td>
              ${formatDate(l.data_produzione)}
            </td>

            <td>
              ${Number(l.giacenza || 0).toFixed(3)}
            </td>

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

function formatDate(date) {

  if (!date) return "";

  const d = new Date(date);

  return d.toLocaleDateString("it-IT");

}

function escapeHtml(str) {

  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}
