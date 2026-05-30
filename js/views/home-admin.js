const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

let gaugeChart = null;
let currentPeriod = "day";
let currentProducts = [];
let currentMetrics = null;

const PERIOD_LABELS = {
  day: "Giorno",
  week: "Settimana",
  month: "Mese",
  year: "Anno",
  custom: "Personalizzato"
};

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

        <div class="admin-kpi-row">
          <div class="admin-kpi-col">
            <div class="admin-kpi-name">MP</div>
            <div class="admin-kpi-euro" id="materiaPrimaValore" style="cursor:pointer;text-decoration:underline dotted;" title="Clicca per dettaglio">€ 0</div>
            <div class="admin-kpi-perc" id="materiaPrimaPerc">0%</div>
            <div id="acquisti-breakdown" style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.6;"></div>
          </div>

          <div class="admin-kpi-col">
            <div class="admin-kpi-name">SF</div>
            <div class="admin-kpi-euro" id="speseFisseValore" style="cursor:pointer;text-decoration:underline dotted;" title="Clicca per dettaglio">€ 0</div>
            <div class="admin-kpi-perc" id="speseFissePerc">0%</div>
          </div>

          <div class="admin-kpi-col">
            <div class="admin-kpi-name">CL</div>
            <div class="admin-kpi-euro" id="costoLavoroValore" style="cursor:pointer;text-decoration:underline dotted;" title="Clicca per dettaglio">€ 0</div>
            <div class="admin-kpi-perc" id="costoLavoroPerc">0%</div>
          </div>

          <div class="admin-kpi-col admin-kpi-col-strong">
            <div class="admin-kpi-name">Margine</div>
            <div class="admin-kpi-euro" id="margineValore">€ 0</div>
            <div class="admin-kpi-perc" id="marginePerc">0%</div>
          </div>
        </div>
      </section>

      <section class="card admin-sales-card">
        <div class="admin-sales-head">
          <div>
            <h3>Prodotti venduti</h3>
            <div class="admin-sales-subtitle">Ordina l’elenco per KPI e filtra per categoria</div>
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

    ${renderTony()}
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
      margin-bottom:16px;
      color:var(--color-text);
    }

    .admin-kpi-row{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:12px;
      align-items:start;
      text-align:center;
    }

    .admin-kpi-col{
      padding:0 4px;
    }

    .admin-kpi-col-strong .admin-kpi-euro,
    .admin-kpi-col-strong .admin-kpi-perc{
      color:var(--color-primary);
    }

    .admin-kpi-name{
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:800;
      text-transform:uppercase;
      letter-spacing:0.4px;
    }

    .admin-kpi-euro{
      margin-top:6px;
      font-size:18px;
      font-weight:800;
      color:var(--color-text);
      line-height:1.1;
    }

    .admin-kpi-perc{
      margin-top:4px;
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:700;
      line-height:1.1;
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
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:14px;
      border:1px solid var(--color-border);
      border-radius:14px;
      padding:12px 14px;
      background:#fff;
    }

    .admin-sales-left{
      min-width:0;
      flex:1;
    }

    .admin-sales-name{
      font-size:15px;
      font-weight:800;
      color:var(--color-text);
      line-height:1.1;
    }

    .admin-sales-category{
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:700;
      margin-top:4px;
    }

    .admin-sales-value-card{
      min-width:110px;
      padding:10px 12px;
      border-radius:12px;
      background:#EEF2F7;
      text-align:center;
      flex-shrink:0;
    }

    .admin-sales-value-label{
      font-size:11px;
      color:var(--color-text-muted);
      font-weight:800;
      text-transform:uppercase;
      letter-spacing:0.4px;
      line-height:1;
    }

    .admin-sales-value{
      margin-top:6px;
      font-size:14px;
      font-weight:800;
      color:var(--color-text);
      line-height:1.1;
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

      .admin-gauge-wrap{
        height:180px;
      }

      .admin-kpi-row{
        grid-template-columns:repeat(2,1fr);
        gap:14px 10px;
      }

      .admin-sales-row{
        align-items:flex-start;
      }

      .admin-sales-value-card{
        min-width:92px;
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
  await refreshDashboard("day");
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
    btn.onclick = async () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      await refreshDashboard(btn.dataset.period || "day");
    };
  });

  if (applyBtn) {
    applyBtn.onclick = async () => {
      buttons.forEach((b) => b.classList.remove("active"));
      await refreshDashboard("custom");
    };
  }
}

function initSalesFilters() {
  const categorySelect = document.getElementById("sales-category-filter");
  const sortSelect = document.getElementById("sales-sort-filter");

  if (!categorySelect || !sortSelect) return;

  categorySelect.onchange = () => renderSalesList();
  sortSelect.onchange = () => renderSalesList();
}

function populateSalesCategoryFilter(items = []) {
  const categorySelect = document.getElementById("sales-category-filter");
  if (!categorySelect) return;

  const currentValue = categorySelect.value || "all";
  const categories = Array.from(
    new Set(
      items
        .map((item) => item.categoria || "Senza categoria")
        .filter(Boolean)
    )
  ).sort((a, b) => String(a).localeCompare(String(b), "it"));

  categorySelect.innerHTML = `<option value="all">Tutte le categorie</option>`;

  categories.forEach((categoria) => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    categorySelect.appendChild(option);
  });

  if (categories.includes(currentValue)) {
    categorySelect.value = currentValue;
  } else {
    categorySelect.value = "all";
  }
}

/* =========================================================
   KPI / DASHBOARD
========================================================= */

async function refreshDashboard(period) {
  currentPeriod = period;

  const { from: _f, to: _t } = getDateRange(period);
  _drillFrom = _f || _drillFrom;
  _drillTo = _t || _drillTo;
  const metrics = await fetchDashboardData(period);

  if (!metrics) {
    setText("period-label", "Periodo: " + getPeriodLabel(period, getDaysByPeriod(period)));
    setText("incassoTotale", formatCurrency(0));
    setText("incassoIva", formatCurrency(0));
    setText("bepValore", formatCurrency(0));

    setText("materiaPrimaValore", formatCurrency(0));
    setText("speseFisseValore", formatCurrency(0));
    setText("costoLavoroValore", formatCurrency(0));
    setText("margineValore", formatCurrency(0));

    setText("materiaPrimaPerc", "0%");
    setText("speseFissePerc", "0%");
    setText("costoLavoroPerc", "0%");
    setText("marginePerc", "0%");

    currentMetrics = {
      label: getPeriodLabel(period, getDaysByPeriod(period)),
      incasso: 0,
      incassoIva: 0,
      materiaPrima: 0,
      speseFisse: 0,
      costoLavoro: 0,
      margine: 0,
      bep: 0,
      materiaPrimaPerc: 0,
      speseFissePerc: 0,
      costoLavoroPerc: 0,
      marginePerc: 0
    };
    currentProducts = [];
    populateSalesCategoryFilter(currentProducts);
    renderGauge(currentMetrics);
    renderSalesList();
    return;
  }

  currentMetrics = metrics;
  currentProducts = Array.isArray(metrics.prodotti) ? metrics.prodotti : [];

  setText("period-label", "Periodo: " + metrics.label);
  setText("incassoTotale", formatCurrency(metrics.incasso));
  setText("incassoIva", formatCurrency(metrics.incassoIva));
  setText("bepValore", formatCurrency(metrics.bep));

  setText("materiaPrimaValore", formatCurrency(metrics.materiaPrima));
  const breakdownEl = document.getElementById("acquisti-breakdown");
  if (breakdownEl) {
    if (metrics.acquisti_categorie?.length) {
      breakdownEl.innerHTML = metrics.acquisti_categorie
        .map(a => `<span>${a.categoria}: <b>${formatCurrency(a.totale)}</b></span>`)
        .join("<br>");
    } else {
      breakdownEl.innerHTML = "";
    }
  }
  setText("speseFisseValore", formatCurrency(metrics.speseFisse));
  setText("costoLavoroValore", formatCurrency(metrics.costoLavoro));
  setText("margineValore", formatCurrency(metrics.margine));

  setText("materiaPrimaPerc", metrics.materiaPrimaPerc + "%");
  setText("speseFissePerc", metrics.speseFissePerc + "%");
  setText("costoLavoroPerc", metrics.costoLavoroPerc + "%");
  setText("marginePerc", metrics.marginePerc + "%");

  populateSalesCategoryFilter(currentProducts);
  renderGauge(metrics);
  renderSalesList();
}

async function fetchDashboardData(period) {
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;
  const supabase = window.supabaseClient;

  if (!azienda || !supabase) return null;

  const { from, to } = getDateRange(period);
  const days = getDaysByPeriod(period);

  const payload = {
    azienda_id: azienda.id,
    data_da: from,
    data_a: to
  };

  if (sede?.id != null) {
    payload.sede_id = sede.id;
  }

  try {
    const { data, error } = await supabase.functions.invoke("dashboard-kpi", {
      body: payload
    });

    if (error) {
      console.error("dashboard-kpi invoke error:", error);
      return null;
    }

    const incasso = toNumber(data?.incasso);
    const incassoIva = data?.incasso_iva != null ? toNumber(data.incasso_iva) : Math.round(incasso * 1.1);
    // Legge acquisti reali da v_contabilita_categorie per il mese corrente
    let materiaPrima = toNumber(data?.materia_prima);
    let acquisti_categorie = [];
    try {
      // Usa il range del periodo selezionato
      const { data: acquisti } = await supabase
        .from("magazzino_movimenti")
        .select("categoria_bilancio_id, quantita, costo, categorie_bilancio(nome)")
        .eq("azienda_id", azienda.id)
        .eq("tipo_movimento", "carico")
        .gte("created_at", from)
        .lte("created_at", to)
        .limit(5000);

      if (acquisti?.length) {
        // Aggrega per categoria
        const map = new Map();
        for (const r of acquisti) {
          const cat = r.categorie_bilancio?.nome || "Altro";
          const val = (Number(r.quantita || 0) * Number(r.costo || 0));
          map.set(cat, (map.get(cat) || 0) + val);
        }
        acquisti_categorie = [...map.entries()].map(([categoria, totale]) => ({ categoria, totale: Math.round(totale * 100) / 100 }));
        const totaleAcquisti = acquisti_categorie.reduce((s, r) => s + r.totale, 0);
        if (totaleAcquisti > 0) materiaPrima = Math.round(totaleAcquisti * 100) / 100;
      }
    } catch(e) { console.warn("Errore lettura acquisti:", e); }
    const speseFisse = toNumber(data?.spese_fisse);
    const costoLavoro = toNumber(data?.costo_lavoro);
    const margine = data?.margine != null
      ? toNumber(data.margine)
      : roundCurrency(incasso - materiaPrima - speseFisse - costoLavoro);
    const bep = data?.bep != null
      ? toNumber(data.bep)
      : roundCurrency(materiaPrima + speseFisse + costoLavoro);

    const prodotti = normalizeProducts(data?.prodotti || []);

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
      marginePerc: toPercent(margine, incasso),
      acquisti_categorie,
      prodotti
    };
  } catch (err) {
    console.error("dashboard-kpi unexpected error:", err);
    return null;
  }
}

function normalizeProducts(list) {
  return (Array.isArray(list) ? list : []).map((item) => {
    const nome = item?.nome || item?.nome_prodotto || item?.descrizione || `Prodotto ${item?.prodotto_id ?? ""}`.trim();
    const categoria = item?.categoria || item?.categoria_nome || item?.categoria_portata || "Senza categoria";
    const incasso = toNumber(item?.incasso);
    const numero = toNumber(item?.numero ?? item?.pezzi ?? item?.quantita);
    const margine = item?.margine != null ? toNumber(item.margine) : incasso;

    return {
      prodotto_id: item?.prodotto_id ?? null,
      nome,
      categoria,
      incasso,
      numero,
      margine
    };
  });
}

/* =========================================================
   GAUGE
========================================================= */

function renderGauge(metrics) {
  const canvas = document.getElementById("admin-gauge");
  if (!canvas) return;
  if (typeof Chart === "undefined") return;

  destroyGauge();

  gaugeChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Materia prima", "Spese fisse", "Costo lavoro", "Margine"],
      datasets: [
        {
          data: [
            metrics.materiaPrima || 0,
            metrics.speseFisse || 0,
            metrics.costoLavoro || 0,
            Math.max(metrics.margine || 0, 0)
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
    }
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

function renderSalesList() {
  const box = document.getElementById("sales-list");
  const categoryFilter = document.getElementById("sales-category-filter");
  const sortFilter = document.getElementById("sales-sort-filter");

  if (!box) return;

  const category = categoryFilter?.value || "all";
  const sortBy = sortFilter?.value || "incasso";

  let items = Array.isArray(currentProducts) ? [...currentProducts] : [];

  if (category !== "all") {
    items = items.filter((item) => (item.categoria || "Senza categoria") === category);
  }

  items.sort((a, b) => {
    if (sortBy === "numero") return toNumber(b.numero) - toNumber(a.numero);
    if (sortBy === "margine") return toNumber(b.margine) - toNumber(a.margine);
    return toNumber(b.incasso) - toNumber(a.incasso);
  });

  if (!items.length) {
    box.innerHTML = `
      <div class="admin-sales-row">
        <div class="admin-sales-left">
          <div class="admin-sales-name">Nessun prodotto nel periodo</div>
          <div class="admin-sales-category">Prova a cambiare filtro o intervallo date</div>
        </div>
      </div>
    `;
    return;
  }

  box.innerHTML = items.map((item) => {
    return `
      <div class="admin-sales-row">
        <div class="admin-sales-left">
          <div class="admin-sales-name">${escapeHtml(item.nome)}</div>
          <div class="admin-sales-category">${escapeHtml(item.categoria || "Senza categoria")}</div>
        </div>

        <div class="admin-sales-value-card">
          <div class="admin-sales-value-label">${sortByLabel(sortBy)}</div>
          <div class="admin-sales-value">${sortBy === "numero" ? formatNumber(item.numero) : formatCurrency(item[sortBy])}</div>
        </div>
      </div>
    `;
  }).join("");
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
  }).format(toNumber(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function toPercent(value, total) {
  const safeTotal = toNumber(total);
  if (!safeTotal) return 0;
  return Math.round((toNumber(value) / safeTotal) * 100);
}

function roundCurrency(value) {
  return Math.round(toNumber(value));
}

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(period) {
  const today = new Date();

  if (period === "day") {
    const d = toISODate(today);
    return { from: d, to: d };
  }

  if (period === "week") {
    const from = new Date();
    from.setDate(today.getDate() - 6);
    return { from: toISODate(from), to: toISODate(today) };
  }

  if (period === "month") {
    const from = new Date();
    from.setDate(today.getDate() - 29);
    return { from: toISODate(from), to: toISODate(today) };
  }

  if (period === "year") {
    const from = new Date();
    from.setDate(today.getDate() - 364);
    return { from: toISODate(from), to: toISODate(today) };
  }

  const fromInput = document.getElementById("filter-from");
  const toInput = document.getElementById("filter-to");

  return {
    from: fromInput?.value || toISODate(today),
    to: toInput?.value || toISODate(today)
  };
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

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
