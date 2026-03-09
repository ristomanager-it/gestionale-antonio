// js/views/home.js

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

export async function render(container){

const user = window.state.user
const ruolo = window.state?.ruolo

updateTopBar(user)

container.innerHTML = `

<div class="home-container">

${renderAdminDashboard(ruolo)}

${renderTonyMiniChat()}

${renderFooter()}

</div>

<style>

.home-container{
max-width:1400px;
margin:auto;
padding:20px;
padding-bottom:120px;
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
border-radius:16px;
box-shadow:0 6px 16px rgba(0,0,0,0.06);
}

.incassi-main{
font-size:40px;
font-weight:700;
margin-top:10px;
}

.incassi-sub{
color:#666;
font-size:14px;
}

.filter-row{
margin-top:10px;
display:flex;
gap:10px;
}

.filter-row button{
padding:6px 10px;
border-radius:8px;
border:1px solid #ddd;
background:white;
cursor:pointer;
}

.kpi-row{
display:flex;
justify-content:space-between;
padding:6px 0;
border-bottom:1px solid #eee;
}

.cost-grid{
display:grid;
grid-template-columns:1fr 1fr;
gap:12px;
margin-top:10px;
}

.cost-box{
background:#f8fafc;
padding:12px;
border-radius:10px;
}

.cost-value{
font-size:20px;
font-weight:600;
}

.bep-box{
text-align:center;
}

.bep-value{
font-size:34px;
font-weight:700;
}

.coperto-box{
text-align:center;
}

.coperto-value{
font-size:30px;
font-weight:700;
}

.gauge-box{
display:flex;
justify-content:center;
}

.home-chat{
background:#0f172a;
color:white;
padding:16px;
border-radius:12px;
margin-top:20px;
}

.home-footer{
position:fixed;
bottom:0;
left:0;
right:0;
background:white;
border-top:1px solid #eee;
display:flex;
justify-content:space-around;
padding:12px 0;
box-shadow:0 -4px 12px rgba(0,0,0,0.08);
}

.home-footer div{
font-size:22px;
cursor:pointer;
}

</style>

`

if(ruolo==="admin"||ruolo==="superadmin"){
loadAdminDashboard()
}

}

function renderAdminDashboard(ruolo){

if(!(ruolo==="admin"||ruolo==="superadmin")) return ""

return `

<div class="dashboard-grid">

<div class="card">

<h3>Incassi netti</h3>

<div class="incassi-main" id="incassiNetti">€0</div>

<div class="incassi-sub" id="incassiIva">IVA inclusa €0</div>

<div class="filter-row">

<button onclick="loadIncassi('giorno')">GG</button>
<button onclick="loadIncassi('mese')">MM</button>
<button onclick="loadIncassi('anno')">AAAA</button>

</div>

</div>

<div class="card gauge-box">

<canvas id="margineGauge"></canvas>

</div>

<div class="card bep-box">

<h3>BEP</h3>

<div class="bep-value" id="bepValue">€0</div>

</div>

<div class="card">

<h3>Costi</h3>

<div class="cost-grid">

<div class="cost-box">
<div>Margine</div>
<div id="marginePerc" class="cost-value">0%</div>
</div>

<div class="cost-box">
<div>Materie prime</div>
<div id="mpPerc" class="cost-value">0%</div>
</div>

<div class="cost-box">
<div>Costo personale</div>
<div id="lavoroPerc" class="cost-value">0%</div>
</div>

<div class="cost-box">
<div>Costi fissi</div>
<div id="fissiPerc" class="cost-value">0%</div>
</div>

</div>

</div>

<div class="card coperto-box">

<h3>Margine a coperto</h3>

<div class="coperto-value" id="copertoValue">€0</div>

</div>

<div class="card">

<h3>Vendite prodotti</h3>

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

function loadAdminDashboard(){

const incassoNetto = 12000
const incassoIva = 14640

const mp = 3600
const lavoro = 3100
const fissi = 1500

const coperti = 480

const costi = mp + lavoro + fissi
const margine = incassoNetto - costi

const marginePerc = Math.round((margine/incassoNetto)*100)
const mpPerc = Math.round((mp/incassoNetto)*100)
const lavoroPerc = Math.round((lavoro/incassoNetto)*100)
const fissiPerc = Math.round((fissi/incassoNetto)*100)

const margineCoperto = (margine/coperti).toFixed(2)

document.getElementById("incassiNetti").innerHTML="€ "+incassoNetto
document.getElementById("incassiIva").innerHTML="IVA inclusa € "+incassoIva

document.getElementById("bepValue").innerHTML="€ "+costi

document.getElementById("marginePerc").innerHTML=marginePerc+"%"
document.getElementById("mpPerc").innerHTML=mpPerc+"%"
document.getElementById("lavoroPerc").innerHTML=lavoroPerc+"%"
document.getElementById("fissiPerc").innerHTML=fissiPerc+"%"

document.getElementById("copertoValue").innerHTML="€ "+margineCoperto

renderGauge(marginePerc)

renderProdotti()

}

function renderGauge(percentuale){

const ctx=document.getElementById("margineGauge")

new Chart(ctx,{
type:"doughnut",
data:{
datasets:[{
data:[percentuale,100-percentuale],
backgroundColor:["#16a34a","#e5e7eb"],
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

function renderProdotti(){

const prodotti=[

{nome:"Carbonara",incasso:3200},
{nome:"Amatriciana",incasso:2100},
{nome:"Tiramisù",incasso:1500}

]

const container=document.getElementById("prodottiVenduti")

container.innerHTML=prodotti.map(p=>`

<div class="kpi-row">

<div>${p.nome}</div>
<div>€${p.incasso}</div>

</div>

`).join("")

}

function renderTonyMiniChat(){

return`

<div class="home-chat">

<strong>🤖 Tony</strong>

<div>Vuoi un consiglio sulla gestione di oggi?</div>

<input
placeholder="Chiedi a Tony..."
onclick="window.location.hash='#/ai'"
style="width:100%;padding:10px;border-radius:8px;border:none;margin-top:10px"
/>

</div>

`

}

function renderFooter(){

return`

<div class="home-footer">

<div onclick="location.hash='#/produzione'">🏭</div>
<div onclick="location.hash='#/magazzino'">📦</div>
<div onclick="location.hash='#/ricette'">📖</div>
<div onclick="location.hash='#/report'">📊</div>
<div onclick="location.hash='#/ai'">🤖</div>

</div>

`

}

function updateTopBar(user){

const saluto = getSaluto()
const nome = getUserName(user)
const data = getDataFormattata()

document.getElementById("topbar-saluto").innerHTML=`${saluto} ${nome}`
document.getElementById("topbar-data").innerHTML=data

hydrateWeather()

}

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

function getUserName(user){

if(!user) return ""

if(user.nome) return user.nome

if(user.email) return user.email.split("@")[0]

return ""

}

function getSaluto(){

const ora=new Date().getHours()

if(ora<12) return "Buongiorno"
if(ora<18) return "Buon pomeriggio"

return "Buonasera"

}

function getDataFormattata(){

const giorni=["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"]
const mesi=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"]

const now=new Date()

return `${giorni[now.getDay()]} ${now.getDate()} ${mesi[now.getMonth()]} ${now.getFullYear()}`

}
