const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function render(container) {

  const user = window.state?.user;
  const ruolo = window.state?.ruolo;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;
  const isSuperadmin = window.state?.isSuperadmin === true;

  updateHeader(azienda, sede);
  initTopbar(user);

  container.innerHTML = `
  
  <div class="view home-view">

    ${renderAdminDashboard(ruolo, isSuperadmin)}

    <div class="tony-avatar" onclick="location.hash='#/ai'">
      🤖
    </div>

  </div>

  <style>

  .home-view{
    max-width:1200px;
    margin:auto;
    padding:16px;
    padding-bottom:90px;
  }

  .card{
    background:white;
    padding:16px;
    border-radius:14px;
    box-shadow:0 4px 14px rgba(0,0,0,0.06);
    margin-bottom:16px;
  }

  .incassi-value{
    font-size:22px;
    font-weight:700;
    margin-top:6px;
  }

  .kpi-row{
    display:flex;
    justify-content:space-between;
    font-size:13px;
    margin-top:4px;
  }

  .tony-avatar{
    position:fixed;
    bottom:80px;
    right:18px;
    width:56px;
    height:56px;
    border-radius:50%;
    background:#111827;
    color:white;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:24px;
    cursor:pointer;
  }

  </style>
  
  `;

  if (ruolo === "admin" || isSuperadmin) {
    loadAdminDashboard();
  }

}

/* HEADER */

function updateHeader(azienda, sede) {

  const box = document.getElementById("header-azienda-nome");

  if (!box) return;

  if (sede) {
    box.innerText = sede.nome;
    return;
  }

  if (azienda) {
    box.innerText = azienda.nome;
    return;
  }

  box.innerText = "Ristoflow";

}

/* TOPBAR */

function initTopbar(user) {

  const salutoBox = document.getElementById("topbar-saluto");
  const dataBox = document.getElementById("topbar-data");

  if (!salutoBox) return;

  const ora = new Date().getHours();

  let saluto = "Buongiorno";

  if (ora >= 12 && ora < 18) saluto = "Buon pomeriggio";
  if (ora >= 18) saluto = "Buonasera";

  const nome = user?.email?.split("@")[0] || "";

  salutoBox.innerText = `${saluto} ${nome}`;

  const giorni = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
  const mesi = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

  const now = new Date();

  dataBox.innerText = `${giorni[now.getDay()]} ${now.getDate()} ${mesi[now.getMonth()]}`;

  hydrateWeather();

}

/* DASHBOARD */

function renderAdminDashboard(ruolo, isSuperadmin){

  if(!(ruolo==="admin" || isSuperadmin)) return "";

  return `

  <div class="card">

    <div>Incassi netti</div>

    <div class="incassi-value" id="incassiTotali">€0</div>

    <div style="font-size:12px;color:#6b7280">
      con IVA <span id="incassiIva">€0</span>
    </div>

  </div>

  <div class="card">

    <canvas id="margineGauge"></canvas>

    <div class="kpi-row">
      <span>Materie prime</span>
      <span id="mpValue">€0</span>
    </div>

    <div class="kpi-row">
      <span>Personale</span>
      <span id="lavoroValue">€0</span>
    </div>

    <div class="kpi-row">
      <span>Costi fissi</span>
      <span id="speseValue">€0</span>
    </div>

    <div class="kpi-row">
      <strong>Margine</strong>
      <strong id="margineValue">€0</strong>
    </div>

  </div>

  `;

}

/* LOAD DASHBOARD */

function loadAdminDashboard(){

  const incasso = 12000;
  const iva = 14400;

  const mp = 3500;
  const lavoro = 3000;
  const spese = 1500;

  const costi = mp + lavoro + spese;
  const margine = incasso - costi;

  document.getElementById("incassiTotali").innerHTML = "€ " + incasso;
  document.getElementById("incassiIva").innerHTML = "€ " + iva;

  document.getElementById("mpValue").innerHTML = "€ " + mp;
  document.getElementById("lavoroValue").innerHTML = "€ " + lavoro;
  document.getElementById("speseValue").innerHTML = "€ " + spese;

  document.getElementById("margineValue").innerHTML = "€ " + margine;

  renderGauge();

}

/* GAUGE */

function renderGauge(){

  const ctx = document.getElementById("margineGauge");

  if (!ctx) return;

  new Chart(ctx,{
    type:"doughnut",
    data:{
      datasets:[{
        data:[25,25,25,25],
        backgroundColor:[
          "#ef4444",
          "#f97316",
          "#eab308",
          "#22c55e"
        ],
        borderWidth:0
      }]
    },
    options:{
      rotation:-90,
      circumference:180,
      cutout:"70%",
      plugins:{legend:{display:false}}
    }
  });

}

/* METEO */

async function hydrateWeather(){

  const box=document.getElementById("topbar-weather");

  if(!box) return;

  try{

    const url=`${OPEN_METEO_URL}?latitude=41.9&longitude=12.49&current=temperature_2m`;

    const res=await fetch(url);
    const data=await res.json();

    const temp=Math.round(data.current.temperature_2m);

    box.innerHTML=`🌤 ${temp}°`;

  }catch{

    box.innerHTML="☁️";

  }

}
