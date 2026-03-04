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
          fornitore_preferito_id,
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
            <th></th>
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

                <td>
                  <button
                    class="app-button tiny green btn-riordina"
                    data-id="${r.prodotto_id}">
                    ➕ Crea Ordine
                  </button>
                </td>

              </tr>
            `;

          }).join("")}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll(".btn-riordina").forEach(btn => {

      btn.addEventListener("click", async () => {

        const prodottoId = btn.getAttribute("data-id");

        const row = state.rows.find(r => r.prodotto_id == prodottoId);
        const p = row?.prodotti;

        if (!p?.fornitore_preferito_id) {
          alert("Prodotto senza fornitore preferito.");
          return;
        }

        const quantita =
          p.quantita_riordino ||
          Math.max((p.scorta_minima || 0) - (row.giacenza || 0), 1);

        const { data: ordine, error } = await window.supabaseClient
          .from("ordini_fornitore")
          .insert({
            azienda_id: azienda.id,
            fornitore_id: p.fornitore_preferito_id,
            stato: "bozza"
          })
          .select()
          .single();

        if (error) {
          console.error("Errore creazione ordine:", error);
          alert("Errore creazione ordine.");
          return;
        }

        const { error: errRiga } = await window.supabaseClient
          .from("ordini_fornitore_righe")
          .insert({
            azienda_id: azienda.id,
            ordine_id: ordine.id,
            prodotto_id: prodottoId,
            quantita: quantita,
            unita_misura: p.unita_misura
          });

        if (errRiga) {
          console.error("Errore creazione riga ordine:", errRiga);
          alert("Errore creazione riga ordine.");
          return;
        }

        alert("Ordine creato ✔");

        window.location.hash = `#/ordine?id=${ordine.id}`;

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
