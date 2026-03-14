export async function renderAnagraficaProdotti(container) {

  const azienda = window.state?.azienda;

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <h3>Nessuna azienda attiva</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = `

    <h3>Anagrafica Prodotti</h3>

    <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap;">

      <input
        id="search-prodotto"
        class="input-pill"
        placeholder="🔎 Cerca prodotto..."
        style="flex:1; min-width:220px;"
      />

      <button class="app-button tiny gray" id="btn-back-mag-home">
        ← Menu Magazzino
      </button>

    </div>

    <div id="lista-prodotti"></div>

  `;

  document
    .getElementById("btn-back-mag-home")
    ?.addEventListener("click", () => {
      window.location.hash = "#/magazzino";
    });

  const searchInput = document.getElementById("search-prodotto");
  const lista = document.getElementById("lista-prodotti");

  searchInput.addEventListener("input", async () => {

    const term = searchInput.value.trim();

    if (term.length < 2) {
      lista.innerHTML = "";
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, codice_interno, descrizione")
      .eq("azienda_id", azienda.id)
      .ilike("descrizione", `%${term}%`)
      .limit(20);

    if (error) {
      lista.innerHTML = `
        <p style="color:red;">
          Errore: ${error.message}
        </p>
      `;
      return;
    }

    lista.innerHTML = `

      <table class="table-timbrature">

        <thead>
          <tr>
            <th>Codice</th>
            <th>Descrizione</th>
          </tr>
        </thead>

        <tbody>

          ${(data || []).map(p => `
            <tr>
              <td>${escapeHtml(p.codice_interno || "")}</td>
              <td>${escapeHtml(p.descrizione || "")}</td>
            </tr>
          `).join("")}

        </tbody>

      </table>

    `;

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

