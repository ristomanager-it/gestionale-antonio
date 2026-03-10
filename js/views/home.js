const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
let gaugeInitialized = false
/* =========================================================
   RENDER VIEW
========================================================= */

export async function render(container) {
  const user = window.state?.user;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;

  updateHeader(azienda, sede);

  container.innerHTML = `
  <div class="view home-compact">
    ${renderKpiCard()}
    ${renderVenditeCard()}
    ${renderTony()}
  </div>

  <style>
  .kpi-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    margin-bottom:12px;
    font-size:14px;
    color:var(--color-text-muted);
    flex-wrap:wrap;
  }

  .period-filter{
    display:flex;
    gap:8px;
    flex-wrap:wrap;
    margin-bottom:14px;
  }

  .period-filter button{
    border:none;
    background:#EEF2F7;
    padding:6px 12px;
    border-radius:10px;
    cursor:pointer;
    font-size:13px;
  }

  .period-filter button.active{
    background:var(--color-primary);
    color:#fff;
  }

  .period-filter input[type="date"]{
    border:1px solid var(--color-border);
    background:#fff;
    padding:6px 10px;
    border-radius:10px;
    min-height:34px;
  }

  .incassi-value{
    font-size:20px;
    font-weight:700;
  }

  .incassi-iva{
    font-size:12px;
    color:var(--color-text-muted);
  }

  .kpi-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:12px;
    margin-top:18px;
    text-align:center;
  }

  .kpi-name{
    font-size:12px;
    color:var(--color-text-muted);
  }

  .kpi-value{
    font-size:15px;
    font-weight:700;
  }

  .kpi-perc{
    font-size:11px;
    color:var(--color-text-muted);
  }

  .bep{
    margin-top:10px;
    text-align:center;
    font-weight:700;
    font-size:14px;
  }

  .vendite-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    margin-bottom:12px;
    flex-wrap:wrap;
  }

  .vendite-row{
    padding:10px 0;
    border-bottom:1px solid var(--color-border);
  }

  .vendite-row:last-child{
    border-bottom:none;
  }

  .vendite-name{
    font-weight:600;
  }

  .vendite-meta{
    font-size:12px;
    color:var(--color-text-muted);
  }

  .tony-avatar{
    position:fixed;
    bottom:90px;
    right:20px;
    width:58px;
    height:58px;
    border-radius:50%;
    background:var(--color-primary);
    color:white;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:24px;
    cursor:pointer;
    box-shadow:0 10px 24px rgba(14,90,122,0.28);
    z-index:50;
  }

  @media (max-width: 767px){
    .kpi-header{
      align-items:flex-start;
      flex-direction:column;
      gap:6px;
    }

    .kpi-grid{
      grid-template-columns:repeat(2,1fr);
      gap:10px;
    }

    .tony-avatar{
      width:54px;
      height:54px;
      right:16px;
      bottom:84px;
    }
  }
  </style>
  `;

  initTopbar(user);
  initPeriodFilter();
  loadDashboard("day");
}

/* =========================================================
   HEADER UPDATE
========================================================= */

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

/* =========================================================
   TOPBAR
========================================================= */

function initTopbar(user) {
  const salutoBox = document.getElementById("topbar-saluto");
  const dataBox = document.getElementById("topbar-data");

  if (!salutoBox || !dataBox) return;

  const ora = new Date().getHours();

  let saluto = "Buongiorno";

  if (ora >= 12 && ora < 18) saluto = "Buon pomeriggio";
  if (ora >= 18) saluto = "Buonasera";

  const nome = user?.email ? user.email.split("@")[0] : "";

  salutoBox.innerText = `${saluto} ${nome}`.trim();

  const now = new Date();

  dataBox.innerText = now.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  hydrateWeather();
}

/* =========================================================
   KPI CARD
========================================================= */

function renderKpiCard() {
  return `
  <div class="card">
    <div class="kpi-header">
      <div id="topbar-saluto"></div>
      <div id="topbar-data"></div>
      <div id="topbar-weather"></div>
    </div>

    <div class="period-filter">
      <button type="button" data-period="day" class="active">Day</button>
      <button type="button" data-period="week">Week</button>
      <button type="button" data-period="month">Month</button>
      <button type="button" data-period="year">Year</button>
      <input id="period-date" type="date">
    </div>

    <div>
      <div class="incassi-value" id="incassiTotali">€0</div>
      <div class="incassi-iva">
        con IVA <span id="incassiIva">€0</span>
      </div>
    </div>

    <div style="margin-top:18px">
      <canvas id="gauge"></canvas>
    </div>

    <div class="bep">
      BEP € <span id="bep">0</span>
    </div>

    <div class="kpi-grid">
      <div>
        <div class="kpi-name">Materie prime</div>
        <div class="kpi-value" id="mp">0</div>
        <div class="kpi-perc" id="mpPerc">0%</div>
      </div>

      <div>
        <div class="kpi-name">Personale</div>
        <div class="kpi-value" id="pers">0</div>
        <div class="kpi-perc" id="persPerc">0%</div>
      </div>

      <div>
        <div class="kpi-name">Costi fissi</div>
        <div class="kpi-value" id="fix">0</div>
        <div class="kpi-perc" id="fixPerc">0%</div>
      </div>

      <div>
        <div class="kpi-name">Margine</div>
        <div class="kpi-value" id="marg">0</div>
        <div class="kpi-perc" id="margPerc">0%</div>
      </div>
    </div>
  </div>
  `;
}

/* =========================================================
   VENDITE CARD
========================================================= */

function renderVenditeCard() {
  return `
  <div class="card">
    <div class="vendite-header">
      <h3 style="margin:0;">Vendite</h3>
      <select id="venditeFiltro">
        <option value="incasso">Incasso</option>
        <option value="numero">Numero</option>
        <option value="margine">Margine</option>
      </select>
    </div>

    <div id="venditeList"></div>
  </div>
  `;
}

/* =========================================================
   PERIOD FILTER
========================================================= */

function initPeriodFilter() {
  const buttons = document.querySelectorAll(".period-filter button");
  const dateInput = document.getElementById("period-date");

  buttons.forEach((btn) => {
    btn.onclick = () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadDashboard(btn.dataset.period || "day");
    };
  });

  if (dateInput) {
    dateInput.onchange = () => {
      buttons.forEach((b) => b.classList.remove("active"));
      loadDashboard("custom");
    };
  }
}

/* =========================================================
   LOAD DASHBOARD
========================================================= */

function loadDashboard(period = "day") {
  let incasso = 12000;
  let iva = 14400;
  let mp = 3500;
  let pers = 3000;
  let fix = 1500;

  if (period === "week") {
    incasso = 52000;
    iva = 62400;
    mp = 15000;
    pers = 13000;
    fix = 7000;
  }

  if (period === "month") {
    incasso = 210000;
    iva = 252000;
    mp = 62000;
    pers = 54000;
    fix = 30000;
  }

  if (period === "year") {
    incasso = 2520000;
    iva = 3024000;
    mp = 744000;
    pers = 648000;
    fix = 360000;
  }

  const costi = mp + pers + fix;
  const marg = incasso - costi;

  setText("incassiTotali", "€ " + incasso);
  setText("incassiIva", "€ " + iva);

  setText("mp", "€ " + mp);
  setText("pers", "€ " + pers);
  setText("fix", "€ " + fix);
  setText("marg", "€ " + marg);

  setText("bep", String(costi));

  setText("mpPerc", Math.round((mp / incasso) * 100) + "%");
  setText("persPerc", Math.round((pers / incasso) * 100) + "%");
  setText("fixPerc", Math.round((fix / incasso) * 100) + "%");
  setText("margPerc", Math.round((marg / incasso) * 100) + "%");

  renderGauge(marg, costi);
  renderVendite();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

/* =========================================================
   GAUGE
========================================================= */

function renderGauge(marg, costi){

  if(gaugeInitialized) return
  gaugeInitialized = true

  const canvas = document.getElementById("gauge")

  if(!canvas) return
  if(typeof Chart === "undefined") return

  const total = marg + costi || 1

  new Chart(canvas,{
    type:"doughnut",
    data:{
      datasets:[
        {
          data:[marg,costi],
          backgroundColor:["#22c55e","#e5e7eb"],
          borderWidth:0
        }
      ]
    },
    options:{
      animation:false,
      responsive:true,
      maintainAspectRatio:false,
      rotation:-90,
      circumference:180,
      cutout:"70%",
      plugins:{
        legend:{display:false},
        tooltip:{enabled:false}
      },
      events:[]   // ← IMPORTANTISSIMO
    }
  })

}
/* =========================================================
   VENDITE
========================================================= */

function renderVendite() {
  const prodotti = [
    { nome: "Carbonara", incasso: 3200, margine: 1200, numero: 140 },
    { nome: "Amatriciana", incasso: 2100, margine: 900, numero: 100 },
    { nome: "Tiramisù", incasso: 1500, margine: 700, numero: 80 }
  ];

  const box = document.getElementById("venditeList");
  const filtro = document.getElementById("venditeFiltro");

  if (!box) return;

  const renderList = () => {
    const criterio = filtro?.value || "incasso";

    const ordinati = [...prodotti].sort((a, b) => {
      return (b[criterio] || 0) - (a[criterio] || 0);
    });

    box.innerHTML = ordinati
      .map(
        (p) => `
      <div class="vendite-row">
        <div class="vendite-name">${p.nome}</div>
        <div class="vendite-meta">
          €${p.incasso} • margine €${p.margine} • ${p.numero} pz
        </div>
      </div>
    `
      )
      .join("");
  };

  renderList();

  if (filtro) {
    filtro.onchange = renderList;
  }
}

/* =========================================================
   TONY
========================================================= */

function renderTony() {
  return `
  <div class="tony-avatar" onclick="location.hash='#/ai'">
    🤖
  </div>
  `;
}

/* =========================================================
   METEO
========================================================= */

async function hydrateWeather() {
  const box = document.getElementById("topbar-weather");
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
