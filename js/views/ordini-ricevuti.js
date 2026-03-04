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

      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0;">Ordini Ricevuti</h3>

        <div style="margin-left:auto; display:flex; gap:8px;">
          <button class="app-button tiny gray" id="btn-refresh">↻ Aggiorna</button>
        </div>
      </div>

      <input id="search" class="input-pill"
        placeholder="🔎 Cerca fornitore o numero ordine..." />

      <div id="table-wrap" style="margin-top:12px;"></div>

    </div>
  `;

  const state = {
    ordini: [],
    filtrati: []
  };

  const search = document.getElementById("search");
  const btnRefresh = document.getElementById("btn-refresh");

  btnRefresh?.addEventListener("click", async () => {
    await loadOrdini(state);
    renderTable(state);
  });

  search?.addEventListener("input", () => {

    const q = (search.value || "").toLowerCase();

    if (!q) {
      state.filtrati = [...state.ordini];
    } else {
      state.filtrati = state.ordini.filter(o =>
        (o.numero_ordine || "").toLowerCase().includes(q) ||
        (o.fornitori?.ragione_sociale || "").toLowerCase().includes(q)
      );
    }

    renderTable(state);

  });

  await loadOrdini(state);
  state.filtrati = [...state.ordini];

  renderTable(state);

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
      .in("stato", ["parziale", "ricevuto"])
      .order("data_ordine", { ascending: false });

    if (error) {
      console.error("Errore load ordini ricevuti:", error);
      st.ordini = [];
      return;
    }

    st.ordini = data || [];
  }

  function renderTable(st) {

    const wrap = document.getElementById("table-wrap");
    if (!wrap) return;

    if (!st.filtrati.length) {
      wrap.innerHTML = `<div class="small-muted">Nessun ordine ricevuto.</div>`;
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
          ${st.filtrati.map(o => `
            <tr>

              <td>${escapeHtml(o.numero_ordine || "-")}</td>

              <td>${escapeHtml(o.data_ordine || "")}</td>

              <td>${escapeHtml(o.fornitori?.ragione_sociale || "-")}</td>

              <td>${renderStato(o.stato)}</td>

              <td>
                <button
                  class="app-button tiny gray btn-open"
                  data-id="${o.id}">
                  Apri
                </button>
              </td>

            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll(".btn-open").forEach(btn => {

      btn.addEventListener("click", () => {

        const id = btn.getAttribute("data-id");

        window.location.hash = `#/ordine?id=${id}`;

      });

    });

  }

}

function renderStato(stato) {

  if (stato === "ricevuto")
    return `<span class="pill" style="background:#d7f7df;">Ricevuto</span>`;

  if (stato === "parziale")
    return `<span class="pill" style="background:#fff4cc;">Parziale</span>`;

  return stato;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
