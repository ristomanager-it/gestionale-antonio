const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

export async function render(container){

const user = window.state?.user
const ruolo = window.state?.ruolo
const azienda = window.state?.azienda
const sede = window.state?.sedeAttiva
const isSuperadmin = window.state?.isSuperadmin === true

updateHeader(azienda,sede)
initTopbar(user)

container.innerHTML = `

<div class="home-container">

${renderAdminDashboard()}

${renderTonyAvatar()}

${renderFooter()}

</div>

<style>

.home-container{
max-width:1300px;
margin:auto;
padding:16px;
padding-bottom:90px;
}

.dashboard-grid{
display:grid;
grid-template-columns:1fr;
gap:20px;
}

@media(min-width:900px){
.dashboard-grid{
grid-template-columns:1fr 1fr;
}
}

.card{
background:white;
padding:20px;
border-radius:14px;
box-shadow:0 4px 14px rgba(0,0,0,0.06);
}

.incassi-value{
font-size:34px;
font-weight:700;
margin-top:10px;
}

.kpi-row{
display:flex;
justify-content:space-between;
margin-top:8px;
}

.prodotti-row{
display:flex;
justify-content:space-between;
padding:6px 0;
border-bottom:1px solid #eee;
}

</style>

`

if(ruolo==="admin" || isSuperadmin){
loadAdminDashboard()
}

}

/* ===============================
HEADER
=============================== */

function updateHeader(azienda,sede){

const nomeBox = document.getElementById("header-azienda-nome")

if(!nomeBox) return

if(sede){
nomeBox.innerText = sede.nome
return
}

if(azienda){
nomeBox.innerText = azienda.nome
return
}

nomeBox.innerText="Ristoflow"

}

/* ===============================
TOPBAR
=============================== */

function initTopbar(user){

const salutoBox = document.getElementById("topbar-saluto")
const dataBox = document.getElementById("topbar-data")

if(!salutoBox) return

const ora = new Date().getHours()

let saluto="Buongiorno"

if(ora>=12 && ora<18) saluto="Buon pomeriggio"
if(ora>=18) saluto="Buonasera"

const nome = user?.nome || ""

salutoBox.innerText=`${saluto} ${nome}`

const giorni=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"]
const mesi=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"]

const now=new Date()

dataBox.innerText=`${giorni[now.getDay()]} ${now.getDate()} ${mesi[now.getMonth()]}`

hydrateWeather()

}

/* ===============================
DASHBOARD ADMIN
=============================== */

function renderAdminDashboard(){

const ruolo = window.state?.ruolo
const isSuperadmin = window.state?.isSuperadmin === true

if(!(ruolo==="admin" || isSuperadmin)) return ""

return `

<div class="dashboard-grid">

<div class="card">

<div>Incassi netti</div>

<div class="incassi-value" id="incassiTotali">€0</div>

<div style="font-size:13px;color:#6b7280;margin-top:6px">
con IVA <span id="incassiIva">€0</span>
</div>

<div style="margin-top:10px">

<button onclick="loadIncassi('giorno')">GG</button>
<button onclick="loadIncassi('mese')">MM</button>
<button onclick="loadIncassi('anno')">AAAA</button>

</div>

</div>

<div class="card">

<canvas id="margineGauge"></canvas>

</div>

<div class="card">

<div class="kpi-row">
<span>Materie prime</span>
<strong id="mpValue">€0</strong>
</div>

<div class="kpi-row">
<span>Personale</span>
<strong id="lavoroValue">€0</strong>
</div>

<div class="kpi-row">
<span>Costi fissi</span>
<strong id="speseValue">€0</strong>
</div>

</div>

<div class="card">

<div class="kpi-row">
<span>Margine netto</span>
<strong id="margineValue">€0</strong>
</div>

<div class="kpi-row">
<span>BEP</span>
<strong id="bepValue">€0</strong>
</div>

</div>

<div class="card">

<h3>Vendite per prodotto</h3>

<select id="prodottiFiltro">

<option value="incasso">Incasso</option>
<option value="margine">Margine</option>
<option value="numero">Numero</option>

</select>

<div id="prodottiVenduti"></div>

</div>

</div>

`

}

/* ===============================
LOAD DASHBOARD
=============================== */

function loadAdminDashboard(){

const incasso = 12000
const iva = 14400

const mp = 3500
const lavoro = 3000
const spese = 1500

const costi = mp + lavoro + spese
const margine = incasso - costi

const perc = Math.round((margine/incasso)*100)

document.getElementById("incassiTotali").innerHTML="€ "+incasso
document.getElementById("incassiIva").innerHTML="€ "+iva

document.getElementById("mpValue").innerHTML="€ "+mp
document.getElementById("lavoroValue").innerHTML="€ "+lavoro
document.getElementById("speseValue").innerHTML="€ "+spese

document.getElementById("margineValue").innerHTML="€ "+margine
document.getElementById("bepValue").innerHTML="€ "+costi

renderGauge(perc)

renderProdotti()

}

/* ===============================
GAUGE
=============================== */

function renderGauge(percentuale){

const ctx=document.getElementById("margineGauge")

new Chart(ctx,{
type:"doughnut",
data:{
datasets:[{
data:[percentuale,100-percentuale],
backgroundColor:["#22c55e","#e5e7eb"],
borderWidth:0
}]
},
options:{
rotation:-90,
circumference:180,
cutout:"70%",
plugins:{legend:{display:false}}
}
})

}

/* ===============================
PRODOTTI
=============================== */

function renderProdotti(){

const prodotti=[
{nome:"Carbonara",incasso:3200,margine:1200,numero:140},
{nome:"Amatriciana",incasso:2100,margine:900,numero:100},
{nome:"Tiramisù",incasso:1500,margine:700,numero:80}
]

const container=document.getElementById("prodottiVenduti")

container.innerHTML=prodotti.map(p=>`

<div class="prodotti-row">

<div>${p.nome}</div>
<div>€${p.incasso}</div>

</div>

`).join("")

}

/* ===============================
TONY
=============================== */

function renderTonyAvatar(){

return`

<div style="
position:fixed;
bottom:90px;
right:20px;
width:60px;
height:60px;
border-radius:50%;
background:#111827;
display:flex;
align-items:center;
justify-content:center;
color:white;
font-size:26px;
cursor:pointer;
box-shadow:0 6px 16px rgba(0,0,0,0.2);
"
onclick="location.hash='#/ai'">

🤖

</div>

`

}

/* ===============================
FOOTER
=============================== */

function renderFooter(){

return`

<div class="home-footer">

<div onclick="location.hash='#/produzione'">🏭</div>
<div onclick="location.hash='#/magazzino'">📦</div>
<div onclick="location.hash='#/ricettario'">📖</div>
<div onclick="location.hash='#/venduto'">📊</div>
<div onclick="location.hash='#/ai'">🤖</div>

</div>

`

}

/* ===============================
METEO
=============================== */

async function hydrateWeather(){

const box=document.getElementById("topbar-weather")

let lat=41.9
let lon=12.49

try{

const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m`

const res = await fetch(url)
const data = await res.json()

const temp=Math.round(data.current.temperature_2m)

box.innerHTML=`🌤 ${temp}°`

}catch{

box.innerHTML="☁️"

}

}
