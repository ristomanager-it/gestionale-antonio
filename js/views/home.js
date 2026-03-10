const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

let gaugeChart = null;

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
            <div class="admin-kpi-euro" id="materiaPrimaValore">€ 0</div>
            <div class="admin-kpi-perc" id="materiaPrimaPerc">0%</div>
          </div>

          <div class="admin-kpi-col">
            <div class="admin-kpi-name">SF</div>
            <div class="admin-kpi-euro" id="speseFisseValore">€ 0</div>
            <div class="admin-kpi-perc" id="speseFissePerc">0%</div>
          </div>

          <div class="admin-kpi-col">
            <div class="admin-kpi-name">CL</div>
            <div class="admin-kpi-euro" id="costoLavoroValore">€ 0</div>
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
          <h3>Prodotti venduti</h3>
        </div>
        <div id="sales-list" class="admin-sales-list"></div>
      </section>
    </div>
  </div>
  `;

  initTopbar(user);
  initDateRangeDefaults();
  initPeriodFilter();
  hydrateWeather();

  await refreshDashboard("day");
}

/* =========================================================
   DASHBOARD DATA
========================================================= */

async function fetchDashboardData(period){

  const azienda = window.state?.azienda;
  if(!azienda) return null;

  const {from,to} = getDateRange(period);

  const res = await fetch(
    `${window.supabaseUrl}/functions/v1/dashboard-kpi`,
    {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        azienda_id:azienda.id,
        data_da:from,
        data_a:to
      })
    }
  );

  if(!res.ok) return null;

  return await res.json();
}

async function refreshDashboard(period){

  const data = await fetchDashboardData(period);
  if(!data) return;

  const incasso = data.incasso || 0;
  const materiaPrima = data.materia_prima || 0;
  const speseFisse = data.spese_fisse || 0;
  const costoLavoro = data.costo_lavoro || 0;
  const margine = data.margine || 0;
  const bep = data.bep || 0;

  setText("incassoTotale",formatCurrency(incasso));
  setText("incassoIva",formatCurrency(Math.round(incasso*1.1)));

  setText("materiaPrimaValore",formatCurrency(materiaPrima));
  setText("speseFisseValore",formatCurrency(speseFisse));
  setText("costoLavoroValore",formatCurrency(costoLavoro));
  setText("margineValore",formatCurrency(margine));

  setText("bepValore",formatCurrency(bep));

  setText("materiaPrimaPerc",toPercent(materiaPrima,incasso)+"%");
  setText("speseFissePerc",toPercent(speseFisse,incasso)+"%");
  setText("costoLavoroPerc",toPercent(costoLavoro,incasso)+"%");
  setText("marginePerc",toPercent(margine,incasso)+"%");

  renderGauge({
    materiaPrima,
    speseFisse,
    costoLavoro,
    margine,
    marginePerc:toPercent(margine,incasso)
  });

  renderSales(data.prodotti || []);
}

/* =========================================================
   SALES LIST
========================================================= */

function renderSales(prodotti){

  const box = document.getElementById("sales-list");
  if(!box) return;

  box.innerHTML = prodotti.map(p=>`
    <div class="admin-sales-row">
      <div class="admin-sales-left">
        <div class="admin-sales-name">Prodotto ${p.prodotto_id}</div>
      </div>
      <div class="admin-sales-value-card">
        <div class="admin-sales-value-label">Incasso</div>
        <div class="admin-sales-value">${formatCurrency(p.incasso)}</div>
      </div>
    </div>
  `).join("");
}

/* =========================================================
   GAUGE
========================================================= */

function renderGauge(metrics){

  const canvas=document.getElementById("admin-gauge");
  if(!canvas || typeof Chart==="undefined") return;

  destroyGauge();

  gaugeChart=new Chart(canvas,{
    type:"doughnut",
    data:{
      datasets:[{
        data:[
          metrics.materiaPrima,
          metrics.speseFisse,
          metrics.costoLavoro,
          Math.max(metrics.margine,0)
        ],
        backgroundColor:[
          "#f97316",
          "#8b5cf6",
          "#ef4444",
          "#22c55e"
        ],
        borderWidth:0
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      rotation:-90,
      circumference:180,
      cutout:"72%"
    }
  });

}

function destroyGauge(){
  if(gaugeChart){
    try{ gaugeChart.destroy(); }catch{}
    gaugeChart=null;
  }
}

/* =========================================================
   HEADER
========================================================= */

function hideLegacyTopbar(){
  const bar=document.querySelector(".topbar-info");
  if(bar) bar.style.display="none";
}

function updateHeader(azienda,sede){
  const box=document.getElementById("header-azienda-nome");
  if(!box) return;

  if(sede?.nome) box.innerText=sede.nome;
  else if(azienda?.nome) box.innerText=azienda.nome;
  else box.innerText="Ristoflow";
}

function initTopbar(user){

  const salutoBox=document.getElementById("home-saluto");
  const utenteBox=document.getElementById("home-utente");
  const dataBox=document.getElementById("home-data");

  const ora=new Date().getHours();

  let saluto="Buongiorno";
  if(ora>=12 && ora<18) saluto="Buon pomeriggio";
  if(ora>=18) saluto="Buonasera";

  const nome=(user?.email || "utente").split("@")[0];

  salutoBox.innerText=saluto;
  utenteBox.innerText=nome;

  dataBox.innerText=new Date().toLocaleDateString("it-IT",{
    weekday:"long",
    day:"numeric",
    month:"long",
    year:"numeric"
  });

}

/* =========================================================
   DATE RANGE
========================================================= */

function initDateRangeDefaults(){

  const from=document.getElementById("filter-from");
  const to=document.getElementById("filter-to");

  const today=new Date();
  const prior=new Date();
  prior.setDate(today.getDate()-6);

  from.value=toISODate(prior);
  to.value=toISODate(today);

}

function getDateRange(period){

  const today=new Date();

  if(period==="day"){
    const d=toISODate(today);
    return {from:d,to:d};
  }

  if(period==="week"){
    const from=new Date();
    from.setDate(today.getDate()-6);
    return {from:toISODate(from),to:toISODate(today)};
  }

  if(period==="month"){
    const from=new Date();
    from.setDate(today.getDate()-29);
    return {from:toISODate(from),to:toISODate(today)};
  }

  if(period==="year"){
    const from=new Date();
    from.setDate(today.getDate()-364);
    return {from:toISODate(from),to:toISODate(today)};
  }

  const fromInput=document.getElementById("filter-from");
  const toInput=document.getElementById("filter-to");

  return {from:fromInput.value,to:toInput.value};
}

/* =========================================================
   METEO
========================================================= */

async function hydrateWeather(){

  const box=document.getElementById("home-weather");
  if(!box) return;

  try{

    const res=await fetch(`${OPEN_METEO_URL}?latitude=41.9&longitude=12.49&current=temperature_2m`);
    const data=await res.json();

    if(data?.current?.temperature_2m!=null){
      box.innerHTML="🌤 "+Math.round(data.current.temperature_2m)+"°";
      return;
    }

    box.innerHTML="☁️";

  }catch{
    box.innerHTML="☁️";
  }

}

/* =========================================================
   HELPERS
========================================================= */

function setText(id,value){
  const el=document.getElementById(id);
  if(el) el.innerText=value;
}

function formatCurrency(value){
  return new Intl.NumberFormat("it-IT",{
    style:"currency",
    currency:"EUR",
    maximumFractionDigits:0
  }).format(value || 0);
}

function toPercent(value,total){
  if(!total) return 0;
  return Math.round((value/total)*100);
}

function toISODate(date){
  return date.toISOString().slice(0,10);
}
