const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

/* =========================================================
   RENDER VIEW
========================================================= */

export async function render(container){

  const user = window.state?.user;
  const ruolo = window.state?.ruolo;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;
  const isSuperadmin = window.state?.isSuperadmin === true;

  updateHeader(azienda,sede);
  initTopbar(user);

  container.innerHTML = `

 <div class="view home-compact">

    ${renderKpiCard(ruolo,isSuperadmin)}

    ${renderVenditeCard()}

    ${renderTony()}

  </div>

  <style>

  /* ================= KPI CARD ================= */

  .kpi-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:12px;
    font-size:14px;
    color:var(--color-text-muted);
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

  /* ================= VENDITE ================= */

  .vendite-header{
    display:flex;
    justify-content:space-between;
    margin-bottom:12px;
  }

  .vendite-row{
    padding:10px 0;
    border-bottom:1px solid var(--color-border);
  }

  .vendite-name{
    font-weight:600;
  }

  .vendite-meta{
    font-size:12px;
    color:var(--color-text-muted);
  }

  /* ================= TONY ================= */

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
  }

  </style>
  `;

  if(ruolo==="admin" || ruolo==="superadmin" || isSuperadmin){
    loadDashboard();
  }

}

/* =========================================================
   HEADER UPDATE
========================================================= */

function updateHeader(azienda,sede){

  const box=document.getElementById("header-azienda-nome");

  if(!box) return;

  if(sede){
    box.innerText=sede.nome;
    return;
  }

  if(azienda){
    box.innerText=azienda.nome;
    return;
  }

  box.innerText="Ristoflow";

}

/* =========================================================
   TOPBAR
========================================================= */

function initTopbar(user){

  const salutoBox=document.getElementById("topbar-saluto");
  const dataBox=document.getElementById("topbar-data");

  if(!salutoBox) return;

  const ora=new Date().getHours();

  let saluto="Buongiorno";

  if(ora>=12 && ora<18) saluto="Buon pomeriggio";
  if(ora>=18) saluto="Buonasera";

  const nome=user?.email?.split("@")[0] || "";

  salutoBox.innerText=`${saluto} ${nome}`;

  const now=new Date();

  dataBox.innerText=now.toLocaleDateString("it-IT",{
    weekday:"short",
    day:"numeric",
    month:"short"
  });

  hydrateWeather();

}

/* =========================================================
   KPI CARD
========================================================= */

function renderKpiCard(ruolo,isSuperadmin){

if(!(ruolo==="admin" || ruolo==="superadmin" || isSuperadmin)) return "";

return`

<div class="card">

<div class="kpi-header">

<div id="topbar-saluto"></div>
<div id="topbar-data"></div>
<div id="topbar-weather"></div>

</div>

<div class="period-filter">

<button>Day</button>
<button>Week</button>
<button>Month</button>
<button>Year</button>

<input type="date">

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

function renderVenditeCard(){

return`

<div class="card">

<div class="vendite-header">

<h3>Vendite</h3>

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
   LOAD DASHBOARD
========================================================= */

function loadDashboard(){

const incasso=12000;
const iva=14400;

const mp=3500;
const pers=3000;
const fix=1500;

const costi=mp+pers+fix;
const marg=incasso-costi;

document.getElementById("incassiTotali").innerText="€ "+incasso;
document.getElementById("incassiIva").innerText="€ "+iva;

document.getElementById("mp").innerText="€ "+mp;
document.getElementById("pers").innerText="€ "+pers;
document.getElementById("fix").innerText="€ "+fix;
document.getElementById("marg").innerText="€ "+marg;

document.getElementById("bep").innerText=costi;

document.getElementById("mpPerc").innerText=Math.round(mp/incasso*100)+"%";
document.getElementById("persPerc").innerText=Math.round(pers/incasso*100)+"%";
document.getElementById("fixPerc").innerText=Math.round(fix/incasso*100)+"%";
document.getElementById("margPerc").innerText=Math.round(marg/incasso*100)+"%";

renderGauge();
renderVendite();

}

/* =========================================================
   GAUGE
========================================================= */

function renderGauge(){

const ctx=document.getElementById("gauge");

new Chart(ctx,{
type:"doughnut",
data:{
datasets:[{
data:[20,20,20,20,20],
backgroundColor:[
"#ef4444",
"#f97316",
"#eab308",
"#22c55e",
"#16a34a"
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

/* =========================================================
   VENDITE
========================================================= */

function renderVendite(){

const prodotti=[
{nome:"Carbonara",incasso:3200,margine:1200,numero:140},
{nome:"Amatriciana",incasso:2100,margine:900,numero:100},
{nome:"Tiramisù",incasso:1500,margine:700,numero:80}
];

const box=document.getElementById("venditeList");

box.innerHTML=prodotti.map(p=>`

<div class="vendite-row">

<div class="vendite-name">${p.nome}</div>

<div class="vendite-meta">
€${p.incasso} • margine €${p.margine} • ${p.numero} pz
</div>

</div>

`).join("");

}

/* =========================================================
   TONY
========================================================= */

function renderTony(){

return`

<div class="tony-avatar" onclick="location.hash='#/ai'">
🤖
</div>

`;

}

/* =========================================================
   METEO
========================================================= */

async function hydrateWeather(){

const box=document.getElementById("topbar-weather");

try{

const res=await fetch(`${OPEN_METEO_URL}?latitude=41.9&longitude=12.49&current=temperature_2m`);
const data=await res.json();

box.innerHTML="🌤 "+Math.round(data.current.temperature_2m)+"°";

}catch{

box.innerHTML="☁️";

}

}
