const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

let gaugeChart = null;

const PERIOD_LABELS = {
  day: "Giorno",
  week: "Settimana",
  month: "Mese",
  year: "Anno",
  custom: "Personalizzato"
};

const FIXED_COST_CATEGORIES_YEAR = [
  { nome: "Affitto", totale: 18000 },
  { nome: "Utenze", totale: 7200 },
  { nome: "Software", totale: 1800 },
  { nome: "Commercialista", totale: 2400 },
  { nome: "Assicurazioni", totale: 1200 },
  { nome: "Pulizie", totale: 4380 }
];

const SALES_DATA = [
  { nome: "Margherita", categoria: "Pizze", incassoDay: 420, quantitaDay: 28, foodCostPct: 0.28 },
  { nome: "Diavola", categoria: "Pizze", incassoDay: 390, quantitaDay: 22, foodCostPct: 0.31 },
  { nome: "Carbonara", categoria: "Primi", incassoDay: 310, quantitaDay: 18, foodCostPct: 0.29 },
  { nome: "Amatriciana", categoria: "Primi", incassoDay: 250, quantitaDay: 15, foodCostPct: 0.27 },
  { nome: "Tagliata", categoria: "Secondi", incassoDay: 360, quantitaDay: 12, foodCostPct: 0.34 },
  { nome: "Cheesecake", categoria: "Dolci", incassoDay: 160, quantitaDay: 14, foodCostPct: 0.24 },
  { nome: "Spritz", categoria: "Bar", incassoDay: 210, quantitaDay: 30, foodCostPct: 0.19 },
  { nome: "Acqua", categoria: "Bevande", incassoDay: 95, quantitaDay: 38, foodCostPct: 0.08 }
];

/* =========================================================
   RENDER VIEW
========================================================= */

export async function render(container) {
  const user = window.state?.user;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;

  destroyGauge();
  updateHeader(azienda, sede);
  hideLegacyTopbar();

  container.innerHTML = `
  <div class="view home-admin">
    <div class="home-grid">
      <section class="card admin-kpi-card">
        <div class="admin-kpi-top">
          <div>
            <div class="admin-saluto" id="home-saluto"></div>
            <div class="admin-utente" id="home-utente"></div>
          </div>
          <div class="admin-top-right">
            <div class="admin-data" id="home-data"></div>
            <div class="admin-meteo" id="home-weather">☁️</div>
          </div>
        </div>

        <div class="admin-filters">
          <div class="admin-filter-buttons">
            <button type="button" class="period-btn active" data-period="day">Giorno</button>
            <button type="button" class="period-btn" data-period="week">Settimana</button>
            <button type="button" class="period-btn" data-period="month">Mese</button>
            <button type="button" class="period-btn" data-period="year">Anno</button>
          </div>

          <div class="admin-filter-range">
            <label>
              <span>Dal</span>
              <input id="filter-from" type="date">
            </label>
            <label>
              <span>Al</span>
              <input id="filter-to" type="date">
            </label>
            <button type="button" id="apply-custom-range" class="range-btn">Applica</button>
          </div>
        </div>

        <div class="admin-period-label" id="period-label">Periodo: Giorno</div>

        <div class="admin-incasso-row">
          <div>
            <div class="admin-incasso-label">Incasso</div>
            <div class="admin-incasso-value" id="incassoTotale">€ 0</div>
            <div class="admin-incasso-iva">Con IVA <span id="incassoIva">€ 0</span></div>
          </div>
        </div>

        <div class="admin-gauge-wrap">
          <canvas id="admin-gauge"></canvas>
        </div>

        <div class="admin-bep">
          BEP giornaliero <span id="bepValore">€ 0</span>
        </div>

        <div class="admin-kpi-grid">
          <div class="admin-kpi-item">
            <div class="admin-kpi-name">Materia prima</div>
            <div class="admin-kpi-value" id="materiaPrimaValore">€ 0</div>
            <div class="admin-kpi-perc" id="materiaPrimaPerc">0%</div>
          </div>

          <div class="admin-kpi-item">
            <div class="admin-kpi-name">Spese fisse</div>
            <div class="admin-kpi-value" id="speseFisseValore">€ 0</div>
            <div class="admin-kpi-perc" id="speseFissePerc">0%</div>
          </div>

          <div class="admin-kpi-item">
            <div class="admin-kpi-name">Costo lavoro</div>
            <div class="admin-kpi-value" id="costoLavoroValore">€ 0</div>
            <div class="admin-kpi-perc" id="costoLavoroPerc">0%</div>
          </div>

          <div class="admin-kpi-item admin-kpi-item-strong">
            <div class="admin-kpi-name">Margine</div>
            <div class="admin-kpi-value" id="margineValore">€ 0</div>
            <div class="admin-kpi-perc" id="marginePerc">0%</div>
          </div>
        </div>
      </section>

      <section class="card admin-sales-card">
        <div class="admin-sales-head">
          <div>
            <h3>Prodotti venduti</h3>
            <div class="admin-sales-subtitle">Filtro per categoria e ordinamento per KPI</div>
          </div>

          <div class="admin-sales-filters">
            <select id="sales-category-filter">
              <option value="all">Tutte le categorie</option>
            </select>

            <select id="sales-sort-filter">
              <option value="incasso">Incasso</option>
              <option value="numero">Numero</option>
              <option value="margine">Margine</option>
            </select>
          </div>
        </div>

        <div id="sales-list" class="admin-sales-list"></div>
      </section>
    </div>
  </div>

  <style>
    .home-admin{
      padding:16px !important;
    }

    .home-grid{
      display:grid;
      grid-template-columns:1.2fr 0.9fr;
      gap:16px;
      align-items:start;
    }

    .admin-kpi-card,
    .admin-sales-card{
      padding:18px !important;
      border-radius:18px;
    }

    .admin-kpi-top{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:16px;
      margin-bottom:14px;
    }

    .admin-saluto{
      font-size:22px;
      line-height:1.1;
      font-weight:800;
      color:var(--color-text);
    }

    .admin-utente{
      margin-top:4px;
      font-size:13px;
      color:var(--color-text-muted);
    }

    .admin-top-right{
      text-align:right;
      display:flex;
      flex-direction:column;
      gap:4px;
      min-width:110px;
    }

    .admin-data{
      font-size:13px;
      color:var(--color-text-muted);
      font-weight:600;
    }

    .admin-meteo{
      font-size:16px;
      font-weight:700;
      color:var(--color-text);
    }

    .admin-filters{
      display:flex;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom:10px;
    }

    .admin-filter-buttons{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }

    .period-btn,
    .range-btn{
      border:none;
      background:#EEF2F7;
      color:var(--color-text);
      padding:8px 12px;
      border-radius:10px;
      font-size:13px;
      font-weight:700;
      cursor:pointer;
    }

    .period-btn.active{
      background:var(--color-primary);
      color:#fff;
    }

    .admin-filter-range{
      display:flex;
      align-items:end;
      gap:8px;
      flex-wrap:wrap;
    }

    .admin-filter-range label{
      display:flex;
      flex-direction:column;
      gap:4px;
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:700;
    }

    .admin-filter-range input{
      border:1px solid var(--color-border);
      background:#fff;
      border-radius:10px;
      padding:8px 10px;
      min-height:36px;
      font-size:13px;
    }

    .admin-period-label{
      font-size:13px;
      color:var(--color-text-muted);
      margin-bottom:14px;
      font-weight:700;
    }

    .admin-incasso-row{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      margin-bottom:12px;
    }

    .admin-incasso-label{
      font-size:12px;
      color:var(--color-text-muted);
      text-transform:uppercase;
      letter-spacing:0.4px;
      font-weight:700;
    }

    .admin-incasso-value{
      font-size:28px;
      line-height:1;
      font-weight:900;
      margin-top:4px;
      color:var(--color-text);
    }

    .admin-incasso-iva{
      margin-top:6px;
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:600;
    }

    .admin-gauge-wrap{
      position:relative;
      height:220px;
      margin:4px 0 6px;
    }

    .admin-bep{
      text-align:center;
      font-size:14px;
      font-weight:800;
      margin-bottom:14px;
      color:var(--color-text);
    }

    .admin-kpi-grid{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:10px;
    }

    .admin-kpi-item{
      background:#f8fafc;
      border:1px solid var(--color-border);
      border-radius:14px;
      padding:12px;
      text-align:center;
    }

    .admin-kpi-item-strong{
      background:rgba(14,90,122,0.08);
    }

    .admin-kpi-name{
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:700;
      min-height:32px;
    }

    .admin-kpi-value{
      font-size:18px;
      font-weight:800;
      margin-top:6px;
      color:var(--color-text);
    }

    .admin-kpi-perc{
      margin-top:4px;
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:700;
    }

    .admin-sales-head{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:16px;
      flex-wrap:wrap;
      margin-bottom:14px;
    }

    .admin-sales-head h3{
      margin:0;
      font-size:20px;
      line-height:1.1;
    }

    .admin-sales-subtitle{
      margin-top:4px;
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:600;
    }

    .admin-sales-filters{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }

    .admin-sales-filters select{
      border:1px solid var(--color-border);
      background:#fff;
      border-radius:10px;
      padding:8px 10px;
      min-height:38px;
      font-size:13px;
      font-weight:700;
    }

    .admin-sales-list{
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .admin-sales-row{
      border:1px solid var(--color-border);
      border-radius:14px;
      padding:12px 14px;
      background:#fff;
    }

    .admin-sales-row-top{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
    }

    .admin-sales-name{
      font-size:15px;
      font-weight:800;
      color:var(--color-text);
    }

    .admin-sales-category{
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:700;
      margin-top:3px;
    }

    .admin-sales-badge{
      font-size:12px;
      font-weight:800;
      background:#EEF2F7;
      color:var(--color-text);
      border-radius:999px;
      padding:6px 10px;
      white-space:nowrap;
    }

    .admin-sales-meta{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:10px;
      margin-top:10px;
    }

    .admin-sales-meta-item{
      background:#f8fafc;
      border-radius:10px;
      padding:8px 10px;
      text-align:center;
    }

    .admin-sales-meta-label{
      font-size:11px;
      color:var(--color-text-muted);
      font-weight:700;
    }

    .admin-sales-meta-value{
      margin-top:4px;
      font-size:14px;
      font-weight:800;
      color:var(--color-text);
    }

    .tony-avatar{
      position:fixed;
      right:18px;
      bottom:90px;
      width:56px;
      height:56px;
      border-radius:50%;
      background:var(--color-primary);
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:24px;
      cursor:pointer;
      box-shadow:0 10px 24px rgba(14,90,122,0.28);
      z-index:60;
    }

    @media (max-width: 1100px){
      .home-grid{
        grid-template-columns:1fr;
      }
    }

    @media (max-width: 767px){
      .home-admin{
        padding:12px !important;
      }

      .admin-kpi-card,
      .admin-sales-card{
        padding:14px !important;
      }

      .admin-saluto{
        font-size:18px;
      }

      .admin-kpi-grid{
        grid-template-columns:repeat(2,1fr);
      }

      .admin-sales-meta{
        grid-template-columns:1fr;
      }

      .admin-gauge-wrap{
        height:180px;
      }

      .tony-avatar{
        width:52px;
        height:52px;
        right:14px;
        bottom:84px;
      }
    }
  </style>
  `;

  initTopbar(user);
  initDateRangeDefaults();
  initPeriodFilter();
  initSalesFilters();
  hydrateWeather();
  refreshDashboard("day");
}

/* =========================================================
   HEADER / TOPBAR
========================================================= */

function hideLegacyTopbar() {
  const bar = document.querySelector(".topbar-info");
  if (bar) {
    bar.style.display = "none";
  }
}

function updateHeader(azienda, sede) {
  const box = document.getElementById("header-azienda-nome");

  if (!box) return;

  if (sede && sede.nome) {
    box.innerText = sede.nome;
    return;
  }

  if (azienda && azienda.nome) {
    box.innerText = azienda.nome;
    return;
  }

  box.innerText = "Ristoflow";
}

function initTopbar(user) {
  const salutoBox = document.getElementById("home-saluto");
  const utenteBox = document.getElementById("home-utente");
  const dataBox = document.getElementById("home-data");

  if (!salutoBox || !utenteBox || !dataBox) return;

  const ora = new Date().getHours();

  let saluto = "Buongiorno";
  if (ora >= 12 && ora < 18) saluto = "Buon pomeriggio";
  if (ora >= 18) saluto = "Buonasera";

  const email = user?.email || "";
  const nomeUtente = email ? email.split("@")[0] : "utente";

  salutoBox.innerText = saluto;
  utenteBox.innerText = nomeUtente;

  dataBox.innerText = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/* =========================================================
   FILTERS
========================================================= */

function initDateRangeDefaults() {
  const fromInput = document.getElementById("filter-from");
  const toInput = document.getElementById("filter-to");

  if (!fromInput || !toInput) return;

  const today = new Date();
  const prior = new Date();
  prior.setDate(today.getDate() - 6);

  fromInput.value = toISODate(prior);
  toInput.value = toISODate(today);
}

function initPeriodFilter() {
  const buttons = Array.from(document.querySelectorAll(".period-btn"));
  const applyBtn = document.getElementById("apply-custom-range");

  buttons.forEach((btn) => {
    btn.onclick = () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      refreshDashboard(btn.dataset.period || "day");
    };
  });

  if (applyBtn) {
    applyBtn.onclick = () => {
      buttons.forEach((b) => b.classList.remove("active"));
      refreshDashboard("custom");
    };
  }
}

function initSalesFilters() {
  const categorySelect = document.getElementById("sales-category-filter");
  const sortSelect = document.getElementById("sales-sort-filter");

  if (!categorySelect || !sortSelect) return;

  const categories = Array.from(new Set(SALES_DATA.map((item) => item.categoria))).sort();

  categories.forEach((categoria) => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    categorySelect.appendChild(option);
  });

  categorySelect.onchange = () => renderSalesList();
  sortSelect.onchange = () => renderSalesList();
}

/* =========================================================
   KPI / DASHBOARD
========================================================= */

function refreshDashboard(period) {
  const metrics = buildMetrics(period);

  setText("period-label", "Periodo: " + metrics.label);
  setText("incassoTotale", formatCurrency(metrics.incasso));
  setText("incassoIva", formatCurrency(metrics.incassoIva));
  setText("bepValore", formatCurrency(metrics.bep));

  setText("materiaPrimaValore", formatCurrency(metrics.materiaPrima));
  setText("speseFisseValore", formatCurrency(metrics.speseFisse));
  setText("costoLavoroValore", formatCurrency(metrics.costoLavoro));
  setText("margineValore", formatCurrency(metrics.margine));

  setText("materiaPrimaPerc", metrics.materiaPrimaPerc + "%");
  setText("speseFissePerc", metrics.speseFissePerc + "%");
  setText("costoLavoroPerc", metrics.costoLavoroPerc + "%");
  setText("marginePerc", metrics.marginePerc + "%");

  renderGauge(metrics);
  renderSalesList(period);
}

function buildMetrics(period) {
  const days = getDaysByPeriod(period);
  const sales = buildSalesByPeriod(days);

  const incasso = sales.reduce((acc, item) => acc + item.incasso, 0);
  const incassoIva = Math.round(incasso * 1.1);

  const materiaPrima = sales.reduce((acc, item) => acc + item.foodCost, 0);
  const costoLavoroDay = 280;
  const costoLavoro = roundCurrency(costoLavoroDay * days);

  const speseFisseDay = roundCurrency(
    FIXED_COST_CATEGORIES_YEAR.reduce((acc, item) => acc + item.totale, 0) / 365
  );
  const speseFisse = roundCurrency(speseFisseDay * days);

  const margine = roundCurrency(incasso - materiaPrima - speseFisse - costoLavoro);
  const bep = roundCurrency(materiaPrima + speseFisse + costoLavoro);

  return {
    label: getPeriodLabel(period, days),
    days,
    incasso,
    incassoIva,
    materiaPrima,
    speseFisse,
    costoLavoro,
    margine,
    bep,
    materiaPrimaPerc: toPercent(materiaPrima, incasso),
    speseFissePerc: toPercent(speseFisse, incasso),
    costoLavoroPerc: toPercent(costoLavoro, incasso),
    marginePerc: toPercent(margine, incasso)
  };
}

/* =========================================================
   GAUGE
========================================================= */

function renderGauge(metrics) {
  const canvas = document.getElementById("admin-gauge");
  if (!canvas) return;
  if (typeof Chart === "undefined") return;

  destroyGauge();

  const centerTextPlugin = {
    id: "homeCenterText",
    afterDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;

      const x = chart.getDatasetMeta(0).data[0].x;
      const y = chart.getDatasetMeta(0).data[0].y + 12;
      const ctx = chart.ctx;

      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#1F2937";
      ctx.font = "700 14px system-ui";
      ctx.fillText("Margine", x, y - 12);
      ctx.font = "800 20px system-ui";
      ctx.fillText(metrics.marginePerc + "%", x, y + 16);
      ctx.restore();
    }
  };

  gaugeChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Materia prima", "Spese fisse", "Costo lavoro", "Margine"],
      datasets: [
        {
          data: [
            metrics.materiaPrima,
            metrics.speseFisse,
            metrics.costoLavoro,
            Math.max(metrics.margine, 0)
          ],
          backgroundColor: [
            "#f97316",
            "#8b5cf6",
            "#ef4444",
            "#22c55e"
          ],
          borderWidth: 0,
          hoverOffset: 0
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      rotation: -90,
      circumference: 180,
      cutout: "72%",
      events: [],
      interaction: {
        mode: null
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        tooltip: {
          enabled: false
        }
      }
    },
    plugins: [centerTextPlugin]
  });
}

function destroyGauge() {
  if (gaugeChart) {
    try {
      gaugeChart.destroy();
    } catch (e) {
      console.warn("Gauge destroy error:", e);
    }
    gaugeChart = null;
  }
}

/* =========================================================
   SALES
========================================================= */

function renderSalesList(period = "day") {
  const box = document.getElementById("sales-list");
  const categoryFilter = document.getElementById("sales-category-filter");
  const sortFilter = document.getElementById("sales-sort-filter");

  if (!box) return;

  const category = categoryFilter?.value || "all";
  const sortBy = sortFilter?.value || "incasso";
  const days = getDaysByPeriod(period);

  let items = buildSalesByPeriod(days);

  if (category !== "all") {
    items = items.filter((item) => item.categoria === category);
  }

  items.sort((a, b) => {
    if (sortBy === "numero") return b.numero - a.numero;
    if (sortBy === "margine") return b.margine - a.margine;
    return b.incasso - a.incasso;
  });

  box.innerHTML = items.map((item) => {
    return `
      <div class="admin-sales-row">
        <div class="admin-sales-row-top">
          <div>
            <div class="admin-sales-name">${item.nome}</div>
            <div class="admin-sales-category">${item.categoria}</div>
          </div>
          <div class="admin-sales-badge">${sortByLabel(sortBy)}: ${sortBy === "numero" ? item.numero : formatCurrency(item[sortBy])}</div>
        </div>

        <div class="admin-sales-meta">
          <div class="admin-sales-meta-item">
            <div class="admin-sales-meta-label">Incasso</div>
            <div class="admin-sales-meta-value">${formatCurrency(item.incasso)}</div>
          </div>

          <div class="admin-sales-meta-item">
            <div class="admin-sales-meta-label">Numero</div>
            <div class="admin-sales-meta-value">${item.numero}</div>
          </div>

          <div class="admin-sales-meta-item">
            <div class="admin-sales-meta-label">Margine</div>
            <div class="admin-sales-meta-value">${formatCurrency(item.margine)}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function buildSalesByPeriod(days) {
  return SALES_DATA.map((item) => {
    const incasso = roundCurrency(item.incassoDay * days);
    const numero = Math.round(item.quantitaDay * days);
    const foodCost = roundCurrency(incasso * item.foodCostPct);
    const margine = roundCurrency(incasso - foodCost);

    return {
      nome: item.nome,
      categoria: item.categoria,
      incasso,
      numero,
      foodCost,
      margine
    };
  });
}

/* =========================================================
   TONY
========================================================= */

function renderTony() {
  return `
    <div class="tony-avatar" onclick="location.hash='#/ai'">🤖</div>
  `;
}

/* =========================================================
   METEO
========================================================= */

async function hydrateWeather() {
  const box = document.getElementById("home-weather");
  if (!box) return;

  try {
    const res = await fetch(
      `${OPEN_METEO_URL}?latitude=41.9&longitude=12.49&current=temperature_2m`
    );
    const data = await res.json();

    if (data?.current?.temperature_2m != null) {
      box.innerHTML = "🌤 " + Math.round(data.current.temperature_2m) + "°";
      return;
    }

    box.innerHTML = "☁️";
  } catch {
    box.innerHTML = "☁️";
  }
}

/* =========================================================
   HELPERS
========================================================= */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function toPercent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function roundCurrency(value) {
  return Math.round(value);
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function getDaysByPeriod(period) {
  if (period === "week") return 7;
  if (period === "month") return 30;
  if (period === "year") return 365;
  if (period === "custom") {
    const fromInput = document.getElementById("filter-from");
    const toInput = document.getElementById("filter-to");

    if (!fromInput?.value || !toInput?.value) return 1;

    const from = new Date(fromInput.value + "T00:00:00");
    const to = new Date(toInput.value + "T00:00:00");

    const diff = Math.round((to - from) / 86400000) + 1;

    return diff > 0 ? diff : 1;
  }

  return 1;
}

function getPeriodLabel(period, days) {
  if (period !== "custom") return PERIOD_LABELS[period] || "Giorno";

  const fromInput = document.getElementById("filter-from");
  const toInput = document.getElementById("filter-to");

  if (!fromInput?.value || !toInput?.value) {
    return PERIOD_LABELS.custom;
  }

  return `Dal ${fromInput.value} al ${toInput.value} (${days} gg)`;
}

function sortByLabel(sortBy) {
  if (sortBy === "numero") return "Numero";
  if (sortBy === "margine") return "Margine";
  return "Incasso";
}
