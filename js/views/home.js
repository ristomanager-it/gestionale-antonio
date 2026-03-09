// js/views/home.js

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

export async function render(container){

const user = window.state.user
const ruolo = window.state?.ruolo

const saluto = getSaluto()
const nome = getUserName(user)
const data = getDataFormattata()

container.innerHTML = `

<div class="home-container">

<header class="home-header">

<div class="header-left">

<div class="home-title">
${saluto} ${nome} 👋
</div>

<div class="home-meta">
<span>${data}</span>
<span id="home-weather-inline">⏳</span>
</div>

</div>

</header>

${renderAdminDashboard(ruolo)}

${renderTonyMiniChat()}

${renderFooter(ruolo)}

</div>

<style>

.home-container{
max-width:1400px;
margin:auto;
padding-bottom:90px;
}

.home-header{
background:var(--color-primary);
color:white;
padding:20px;
border-radius:18px;
margin-bottom:20px;
}

.home-title{
font-size:22px;
font-weight:600;
}

.home-meta{
margin-top:6px;
display:flex;
gap:12px;
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

.gauge-box{
display:flex;
justify-content:center;
}

.prodotti-row{
display:flex;
justify-content:space-between;
padding:6px 0;
border-bottom:1px solid #eee;
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
padding:10px 0;
box-shadow:0 -4px 12px rgba(0,0,0,0.08);
}

.home-footer div{
font-size:22px;
cursor:pointer;
}

</style>

`

hydrateWeather()

if(ruolo==="admin"||ruolo==="superadmin"){
loadAdminDashboard()
}

}

function renderAdminDashboard(ruolo){

if(!(ruolo==="admin"||ruolo==="superadmin")) return ""

return `

<div class="dashboard-grid">

<div class="card">

<div>Incassi</div>

<div class="incassi-value" id="incassiTotali">€0</div>

<div>

<button onclick="loadIncassi('giorno')">GG</button>
<button onclick="loadIncassi('mese')">MM</button>
<button onclick="loadIncassi('anno')">AAAA</button>

</div>

</div>

<div class="card gauge-box">

<canvas id="margineGauge"></canvas>

</div>

<div class="card">

<div class="kpi-row">
<span>Materie prime</span>
<strong id="mpValue">€0</strong>
</div>

<div class="kpi-row">
<span>Costo lavoro</span>
<strong id="lavoroValue">€0</strong>
</div>

<div class="kpi-row">
<span>Spese generali</span>
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

<h3>Prodotti venduti</h3>

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

const incasso = 12000
const mp = 3500
const lavoro = 3000
const spese = 1500

const costi = mp + lavoro + spese
const margine = incasso - costi

const perc = Math.round((margine/incasso)*100)

document.getElementById("incassiTotali").innerHTML="€ "+incasso
document.getElementById("mpValue").innerHTML="€ "+mp
document.getElementById("lavoroValue").innerHTML="€ "+lavoro
document.getElementById("speseValue").innerHTML="€ "+spese
document.getElementById("margineValue").innerHTML="€ "+margine
document.getElementById("bepValue").innerHTML="€ "+costi

renderGauge(perc)

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

function renderTonyMiniChat(){

return`

<div class="home-chat">

<strong>🤖 Tony</strong>

<div>Hai bisogno di aiuto?</div>

<input
placeholder="Scrivi a Tony..."
onclick="window.location.hash='#/ai'"
style="width:100%;padding:8px;border-radius:8px;border:none;margin-top:8px"
/>

</div>

`

}

function renderFooter(ruolo){

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

async function hydrateWeather(){

const box=document.getElementById("home-weather-inline")

let lat=41.9
let lon=12.49

try{

const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`

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
