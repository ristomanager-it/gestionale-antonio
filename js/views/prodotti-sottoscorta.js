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
        <h3 style="margin:0;">Prodotti Sottoscorta</h3>

        <div style="margin-left:auto;">
          <button class="app-button tiny gray" id="btn-refresh">↻ Aggiorna</button>
        </div>
      </div>

      <div id="table-wrap"></div>

    </div>
  `;

  const state = {
    rows: []
  };

  const btnRefresh = document.getElementById("btn-refresh");

  btnRefresh?.addEventListener("click", async () => {
    await loadData(state);
    renderTable(state);
  });

  await loadData(state);
  renderTable(state);

  async function loadData(st) {

    const { data, error } = await window.supabaseClient
      .from("v_magazzino_giacenze")
      .select(`
        prodotto_id,
        giacenza,
        prodotti (
          nome,
          scorta_minima,
          quantita_riordino,
          unita_misura,
          fornitori ( ragione_sociale )
        )
      `)
      .eq("azienda_id", azienda.id);

    if (error) {
      console.error("Errore load sottoscorta:", error);
      st.rows = [];
      return;
    }

    const rows = data || [];

    st.rows = rows.filter(r => {
      const scorta = r.prodotti?.scorta_minima ?? 0;
      return r.giacenza <= scorta;
    });

  }

  function renderTable(st) {

    const wrap = document.getElementById("table-wrap");
    if (!wrap) return;

    if (!st.rows.length) {
      wrap.innerHTML = `
        <div class="small-muted">
          Nessun prodotto sottoscorta ✔
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <table class="table-timbrature">
        <thead>
          <tr>
            <th>Prodotto</th>
            <th>Giacenza</th>
            <th>Scorta Minima</th>
            <th>UM</th>
            <th>Fornitore</th>
            <th>Riordino</th>
          </tr>
        </thead>

        <tbody>
          ${st.rows.map(r => {

            const p = r.prodotti || {};
            const qRiordino = p.quantita_riordino || "-";

            return `
              <tr>

                <td>${escapeHtml(p.nome || "")}</td>

                <td>${Number(r.giacenza ?? 0)}</td>

                <td>${Number(p.scorta_minima ?? 0)}</td>

                <td>${escapeHtml(p.unita_misura || "")}</td>

                <td>${escapeHtml(p.fornitori?.ragione_sociale || "-")}</td>

                <td>${qRiordino}</td>

              </tr>
            `;

          }).join("")}
        </tbody>
      </table>
    `;
  }

}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
