// js/views/margini.js
// =======================================
// Modulo Margini + AI Insight Livello 1
// =======================================

export async function render(container) {
  const azienda = window.state.azienda;

  if (!azienda) {
    container.innerHTML = `<div class="view">Azienda non disponibile</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <h2 style="margin-bottom:20px;">💰 Margini & Profit Intelligence</h2>

      <!-- KPI SUMMARY -->
      <div id="kpi-summary" style="
        display:grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap:16px;
        margin-bottom:30px;
      "></div>

      <!-- TAB NAV -->
      <div style="display:flex; gap:12px; margin-bottom:20px;">
        <button class="app-button small" id="tab-kpi">KPI Giorno</button>
        <button class="app-button small gray" id="tab-articoli">Marginalità Articoli</button>
        <button class="app-button small gray" id="tab-ai">AI Insight</button>
      </div>

      <!-- CONTENT -->
      <div id="tab-content"></div>

    </div>
  `;

  const tabKpi = document.getElementById("tab-kpi");
  const tabArticoli = document.getElementById("tab-articoli");
  const tabAi = document.getElementById("tab-ai");
  const content = document.getElementById("tab-content");

  function setActive(button) {
    [tabKpi, tabArticoli, tabAi].forEach(b => {
      b.classList.remove("gray");
    });
    if (button !== tabKpi) tabKpi.classList.add("gray");
    if (button !== tabArticoli) tabArticoli.classList.add("gray");
    if (button !== tabAi) tabAi.classList.add("gray");
  }

  async function loadKpiSummary() {
    const { data } = await window.supabaseClient
      .from("vw_kpi_margine_giorno_canale")
      .select("*")
      .eq("azienda_id", azienda.id);

    if (!data || data.length === 0) return;

    const fatturato = data.reduce((a, r) => a + Number(r.fatturato || 0), 0);
    const margine = data.reduce((a, r) => a + Number(r.margine_totale || 0), 0);
    const marginePerc = fatturato > 0 ? (margine / fatturato) * 100 : 0;

    const kpiDiv = document.getElementById("kpi-summary");
    kpiDiv.innerHTML = `
      ${kpiBox("Fatturato Totale", formatEuro(fatturato))}
      ${kpiBox("Margine Totale", formatEuro(margine))}
      ${kpiBox("Margine %", marginePerc.toFixed(2) + "%")}
    `;
  }

  function kpiBox(label, value) {
    return `
      <div style="
        background:white;
        padding:18px;
        border-radius:16px;
        box-shadow:0 8px 20px rgba(0,0,0,0.05);
      ">
        <div class="small-muted">${label}</div>
        <div style="font-size:18px; font-weight:600; margin-top:6px;">
          ${value}
        </div>
      </div>
    `;
  }

  async function renderKpiTable() {
    const { data } = await window.supabaseClient
      .from("vw_kpi_margine_giorno_canale")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("data_vendita", { ascending: false })
      .limit(60);

    if (!data || data.length === 0) {
      content.innerHTML = "<p>Nessun dato disponibile</p>";
      return;
    }

    content.innerHTML = buildTable([
      "Data",
      "Canale",
      "Fatturato",
      "Costo",
      "Margine",
      "Margine %"
    ], data.map(r => [
      r.data_vendita,
      r.canale,
      formatEuro(r.fatturato),
      formatEuro(r.costo_totale),
      formatEuro(r.margine_totale),
      (r.margine_percentuale || 0).toFixed(2) + "%"
    ]));
  }

  async function renderArticoliTable() {
    const { data } = await window.supabaseClient
      .from("vw_marginalita_articolo")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("margine_totale", { ascending: false })
      .limit(100);

    if (!data || data.length === 0) {
      content.innerHTML = "<p>Nessun dato disponibile</p>";
      return;
    }

    content.innerHTML = buildTable([
      "Articolo",
      "Tipo",
      "Quantità",
      "Fatturato",
      "Margine",
      "Margine %"
    ], data.map(r => [
      r.nome_articolo,
      r.tipo_articolo,
      r.quantita_totale,
      formatEuro(r.fatturato),
      formatEuro(r.margine_totale),
      (r.margine_percentuale || 0).toFixed(2) + "%"
    ]));
  }

  async function renderAiInsight() {
    const { data } = await window.supabaseClient
      .from("vw_kpi_margine_giorno_canale")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("data_vendita", { ascending: false })
      .limit(14);

    if (!data || data.length < 7) {
      content.innerHTML = "<p>Dati insufficienti per AI Insight</p>";
      return;
    }

    const ultimi7 = data.slice(0, 7);
    const precedenti7 = data.slice(7, 14);

    const mediaUltimi = avg(ultimi7.map(r => r.margine_percentuale || 0));
    const mediaPrecedenti = avg(precedenti7.map(r => r.margine_percentuale || 0));

    const trend = mediaUltimi - mediaPrecedenti;

    content.innerHTML = `
      <div style="
        background:white;
        padding:20px;
        border-radius:18px;
        box-shadow:0 8px 20px rgba(0,0,0,0.05);
      ">
        <h3 style="margin-top:0;">📊 Analisi Trend Margine</h3>
        <p>Media ultimi 7 giorni: <strong>${mediaUltimi.toFixed(2)}%</strong></p>
        <p>Media 7 precedenti: <strong>${mediaPrecedenti.toFixed(2)}%</strong></p>
        <p>Trend: 
          <strong style="color:${trend >= 0 ? "green" : "red"};">
            ${trend >= 0 ? "+" : ""}${trend.toFixed(2)}%
          </strong>
        </p>
      </div>
    `;
  }

  function buildTable(headers, rows) {
    return `
      <div style="overflow:auto;">
        <table class="app-table">
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map(r =>
              `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`
            ).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function formatEuro(val) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(Number(val || 0));
  }

  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + Number(b || 0), 0) / arr.length;
  }

  tabKpi.onclick = () => {
    setActive(tabKpi);
    renderKpiTable();
  };

  tabArticoli.onclick = () => {
    setActive(tabArticoli);
    renderArticoliTable();
  };

  tabAi.onclick = () => {
    setActive(tabAi);
    renderAiInsight();
  };

  await loadKpiSummary();
  renderKpiTable();
}
