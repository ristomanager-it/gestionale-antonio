import "../supabaseClient.js";
import "../state.js";

export async function render(container) {

  const azienda = window.state.azienda;

  if (!azienda) {
    container.innerHTML = `<div class="view"><h3>Nessuna azienda attiva</h3></div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">
        <h3 style="margin:0;">Ordini Fornitore</h3>

        <div style="margin-left:auto; display:flex; gap:8px;">
          <button class="app-button tiny gray" id="btn-ordini-refresh">↻ Aggiorna</button>
          <button class="app-button tiny green" id="btn-ordini-nuovo">+ Nuovo Ordine</button>
        </div>
      </div>

      <input id="ordini-search" class="input-pill"
        placeholder="🔎 Cerca numero ordine o fornitore..." />

      <div id="ordini-table" style="margin-top:12px;"></div>

    </div>
  `;

  const state = {
    ordini: [],
    ordiniFiltrati: []
  };

  const search = document.getElementById("ordini-search");
  const btnRefresh = document.getElementById("btn-ordini-refresh");
  const btnNuovo = document.getElementById("btn-ordini-nuovo");

  btnRefresh?.addEventListener("click", async () => {
    await loadOrdini(state);
    renderOrdiniTable(state);
  });

  btnNuovo?.addEventListener("click", () => {
    window.location.hash = "#/ordine";
  });

  search?.addEventListener("input", () => {

    const q = (search.value || "").toLowerCase().trim();

    if (!q) {
      state.ordiniFiltrati = [...state.ordini];
    } else {
      state.ordiniFiltrati = state.ordini.filter(o =>
        (o.numero_ordine || "").toLowerCase().includes(q) ||
        (o.fornitori?.ragione_sociale || "").toLowerCase().includes(q)
      );
    }

    renderOrdiniTable(state);

  });

  await loadOrdini(state);
  state.ordiniFiltrati = [...state.ordini];

  renderOrdiniTable(state);

  async function loadOrdini(st) {

    const { data, error } = await window.supabaseClient
      .from("ordini_fornitore")
      .select(`
        id,
        numero_ordine,
        data_ordine,
        stato,
        fornitori ( ragione_sociale )
      `)
      .eq("azienda_id", azienda.id)
      .order("data_ordine", { ascending: false });

    if (error) {
      console.error("Errore load ordini:", error);
      st.ordini = [];
      return;
    }

    st.ordini = data || [];

  }

  function renderOrdiniTable(st) {

    const wrap = document.getElementById("ordini-table");
    if (!wrap) return;

    const rows = st.ordiniFiltrati || [];

    if (!rows.length) {
      wrap.innerHTML = `<div class="small-muted">Nessun ordine.</div>`;
      return;
    }

    wrap.innerHTML = `
      <table class="table-timbrature">
        <thead>
          <tr>
            <th>Numero</th>
            <th>Data</th>
            <th>Fornitore</th>
            <th>Stato</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          ${rows.map(o => `
            <tr>

              <td>${escapeHtml(o.numero_ordine || "-")}</td>

              <td>${escapeHtml(o.data_ordine || "")}</td>

              <td>${escapeHtml(o.fornitori?.ragione_sociale || "-")}</td>

              <td>${escapeHtml(o.stato)}</td>

              <td>
                <button
                  class="app-button tiny gray btn-ordine-open"
                  data-id="${escapeHtml(o.id)}"
                >
                  Apri
                </button>
              </td>

            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll(".btn-ordine-open").forEach(btn => {

      btn.addEventListener("click", () => {

        const id = btn.getAttribute("data-id");

        window.location.hash = `#/ordine?id=${id}`;

      });

    });

  }

}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
