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
max-width:1200px;
margin:auto;
padding:16px;
padding-bottom:90px;
}

.topbar-info{
margin-top:64px;
padding:6px 16px;
font-size:13px;
display:flex;
gap:12px;
align-items:center;
}

.dashboard-grid{
display:grid;
grid-template-columns:1fr;
gap:20px;
}

.card{
background:white;
padding:16px;
border-radius:14px;
box-shadow:0 4px 14px rgba(0,0,0,0.06);
}

.incassi-value{
font-size:24px;
font-weight:700;
margin-top:6px;
}

.kpi-bar{
display:grid;
grid-template-columns:repeat(5,1fr);
gap:10px;
margin-top:14px;
text-align:center;
}

.kpi-name{
font-size:12px;
color:#6b7280;
}

.kpi-value{
font-weight:600;
}

.kpi-perc{
font-size:11px;
color:#6b7280;
}

.prodotti-row{
display:flex;
justify-content:space-between;
padding:6px 0;
border-bottom:1px solid #eee;
}

.home-footer{
position:fixed;
bottom:0;
left:0;
right:0;
background:white;
border-top:1px solid #eee;
display:flex;
flex-direction:row;
justify-content:space-around;
align-items:center;
padding:10px 0;
}

.home-footer div{
font-size:22px;
cursor:pointer;
}

</style>

`

if(ruolo==="admin" || isSuperadmin){
loadAdminDashboard()
}

}

/* HEADER */

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

/* TOPBAR */

function initTopbar(user){

const salutoBox = document.getElementById("topbar-saluto")
const dataBox = document.getElementById("topbar-data")

if(!salutoBox) return

const ora = new Date().getHours()

let saluto="Buongiorno"

if(ora>=12 && ora<18) saluto="Buon pomeriggio"
if(ora>=18) saluto="Buonasera"

const nome = user?.email?.split("@")[0] || ""

salutoBox.innerText=`${saluto} ${nome}`

const giorni=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"]
const mesi=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"]

const now=new Date()

dataBox.innerText=`${giorni[now.getDay()]} ${now.getDate()} ${mesi[now.getMonth()]}`

hydrateWeather()

}

/* DASHBOARD */

function renderAdminDashboard(){

const ruolo = window.state?.ruolo
const isSuperadmin = window.state?.isSuperadmin === true

if(!(ruolo==="admin" || isSuperadmin)) return ""

return`

<div class="dashboard-grid">

<div class="card">

<div>Incassi netti</div>

<div class="incassi-value" id="incassiTotali">€0</div>

<div style="font-size:12px;color:#6b7280">
con IVA <span id="incassiIva">€0</span>
</div>

<div style="margin-top:6px">

<button onclick="loadIncassi('giorno')">GG</button>
<button onclick="loadIncassi('mese')">MM</button>
<button onclick="loadIncassi('anno')">AAAA</button>

</div>

</div>

<div class="card">

<canvas id="margineGauge"></canvas>

<div style="text-align:center;margin-top:10px;font-weight:600">
BEP € <span id="bepValue">0</span>
</div>

<div class="kpi-bar">

<div>
<div class="kpi-name">MP</div>
<div class="kpi-value" id="mpValue">0</div>
<div class="kpi-perc" id="mpPerc">0%</div>
</div>

<div>
<div class="kpi-name">Personale</div>
<div class="kpi-value" id="lavoroValue">0</div>
<div class="kpi-perc" id="lavoroPerc">0%</div>
</div>

<div>
<div class="kpi-name">Costi fissi</div>
<div class="kpi-value" id="speseValue">0</div>
<div class="kpi-perc" id="spesePerc">0%</div>
</div>

<div>
<div class="kpi-name">Margine</div>
<div class="kpi-value" id="margineValue">0</div>
<div class="kpi-perc" id="marginePerc">0%</div>
</div>

</div>

</div>

<div class="card">

<h3>Vendite</h3>

<select id="prodottiFiltro">
<option value="incasso">Incasso</option>
<option value="numero">Numero</option>
<option value="margine">Margine</option>
</select>

<div id="prodottiVenduti"></div>

</div>

</div>

`

}

/* LOAD DASHBOARD */

function loadAdminDashboard(){

const incasso = 12000
const iva = 14400

const mp = 3500
const lavoro = 3000
const spese = 1500

const costi = mp+lavoro+spese
const margine = incasso-costi

document.getElementById("incassiTotali").innerHTML="€"+incasso
document.getElementById("incassiIva").innerHTML="€"+iva

document.getElementById("mpValue").innerHTML="€"+mp
document.getElementById("lavoroValue").innerHTML="€"+lavoro
document.getElementById("speseValue").innerHTML="€"+spese
document.getElementById("margineValue").innerHTML="€"+margine
document.getElementById("bepValue").innerHTML=costi

document.getElementById("mpPerc").innerHTML=Math.round(mp/incasso*100)+"%"
document.getElementById("lavoroPerc").innerHTML=Math.round(lavoro/incasso*100)+"%"
document.getElementById("spesePerc").innerHTML=Math.round(spese/incasso*100)+"%"
document.getElementById("marginePerc").innerHTML=Math.round(margine/incasso*100)+"%"

renderGauge(Math.round(margine/incasso*100))
renderProdotti()

document
.getElementById("prodottiFiltro")
.addEventListener("change",renderProdotti)

}

/* GAUGE */

function renderGauge(percentuale){

const ctx=document.getElementById("margineGauge")

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
})

}

/* PRODOTTI */

function renderProdotti(){

const filtro=document.getElementById("prodottiFiltro").value

let prodotti=[
{nome:"Carbonara",incasso:3200,margine:1200,numero:140},
{nome:"Amatriciana",incasso:2100,margine:900,numero:100},
{nome:"Tiramisù",incasso:1500,margine:700,numero:80}
]

prodotti.sort((a,b)=>b[filtro]-a[filtro])

const container=document.getElementById("prodottiVenduti")

container.innerHTML=prodotti.map(p=>`

<div class="prodotti-row">
<div>${p.nome}</div>
<div>${p[filtro]}</div>
</div>

`).join("")

}

/* TONY */

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
"
onclick="location.hash='#/ai'">

🤖

</div>

`

}

/* FOOTER */

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

/* METEO */

async function hydrateWeather(){

const box=document.getElementById("topbar-weather")

let lat=41.9
let lon=12.49

try{

const url=\`${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m\`

const res=await fetch(url)
const data=await res.json()

const temp=Math.round(data.current.temperature_2m)

box.innerHTML=\`🌤 ${temp}°\`

}catch{

box.innerHTML="☁️"

}

}
