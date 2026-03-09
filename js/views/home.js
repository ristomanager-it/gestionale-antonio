// js/views/home.js

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

export async function render(container){

const user = window.state.user
const ruolo = window.state?.ruolo
const azienda = window.state?.azienda

const saluto = getSaluto()
const nome = getUserName(user)
const data = getDataFormattata()

const nomeLocale = azienda?.nome || "Ristoflow"

container.innerHTML = `

<div class="home-container">

<div class="app-header">

<div class="header-left">

<div class="hamburger" onclick="toggleMenu()">☰</div>

<div class="logo">🍝</div>

<div class="locale-name">
${nomeLocale}
</div>

</div>

</div>

<div class="menu-overlay" id="hamburgerMenu">

<div class="menu-content">

${renderMenuSection("OPERATIVO",[
["Produzione","#/produzione"],
["Magazzino","#/magazzino"],
["Ricette","#/ricette"],
["Preparazioni","#/preparazioni"],
["Vendite","#/vendite"]
])}

${renderMenuSection("AMMINISTRAZIONE",[
["Acquisti","#/acquisti"],
["Fornitori","#/fornitori"],
["Dipendenti","#/dipendenti"]
])}

${renderMenuSection("GESTIONE",[
["Margini","#/margini"],
["Report","#/report"],
["BEP","#/bep"]
])}

${renderMenuSection("MARKETING",[
["Promo","#/promo"],
["Clienti","#/clienti"]
])}

${renderMenuSection("AI",[
["Tony","#/ai"]
])}

<div class="menu-bottom">

<div onclick="logoutUser()">Logout</div>

</div>

</div>

</div>

<header class="home-header">

<div class="home-title">
${saluto} ${nome} 👋
</div>

<div class="home-meta">
<span>${data}</span>
<span id="home-weather-inline">⏳</span>
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

.app-header{
height:56px;
display:flex;
align-items:center;
padding:0 16px;
background:#111827;
color:white;
}

.header-left{
display:flex;
align-items:center;
gap:10px;
}

.hamburger{
font-size:22px;
cursor:pointer;
}

.logo{
font-size:20px;
}

.locale-name{
font-weight:600;
}

.menu-overlay{
position:fixed;
top:0;
left:-100%;
width:260px;
height:100%;
background:white;
box-shadow:4px 0 16px rgba(0,0,0,0.1);
transition:0.3s;
z-index:999;
padding:20px;
overflow:auto;
}

.menu-overlay.open{
left:0;
}

.menu-section{
margin-bottom:14px;
}

.menu-title{
font-weight:700;
cursor:pointer;
padding:8px 0;
}

.menu-items{
display:none;
padding-left:10px;
}

.menu-items div{
padding:6px 0;
cursor:pointer;
color:#374151;
}

.menu-items.open{
display:block;
}

.menu-bottom{
margin-top:30px;
border-top:1px solid #eee;
padding-top:14px;
font-weight:600;
cursor:pointer;
}

.home-header{
background:var(--color-primary);
color:white;
padding:16px;
border-radius:14px;
margin:16px;
}

.home-title{
font-size:20px;
font-weight:600;
}

.home-meta{
margin-top:4px;
display:flex;
gap:10px;
font-size:14px;
}

.dashboard-grid{
display:grid;
grid-template-columns:1fr;
gap:20px;
padding:16px;
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

function renderMenuSection(titolo,items){

return`

<div class="menu-section">

<div class="menu-title" onclick="toggleSection(this)">
${titolo}
</div>

<div class="menu-items">

${items.map(i=>`<div onclick="location.hash='${i[1]}'">${i[0]}</div>`).join("")}

</div>

</div>

`

}

window.toggleMenu=function(){

const menu=document.getElementById("hamburgerMenu")

menu.classList.toggle("open")

}

window.toggleSection=function(el){

const box=el.nextElementSibling

box.classList.toggle("open")

}

window.logoutUser=async function(){

await window.supabaseClient.auth.signOut()

localStorage.removeItem("ristoflow_user")

window.location.hash="#/login"

}

function renderAdminDashboard(ruolo){

if(!(ruolo==="admin"||ruolo==="superadmin")) return ""

return`

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

</div>

`

}

function renderTonyMiniChat(){

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

async function hydrateWeather(){

const box=document.getElementById("home-weather-inline")

let lat=41.9
let lon=12.49

try{

const url = \`\${OPEN_METEO_URL}?latitude=\${lat}&longitude=\${lon}&current=temperature_2m,weather_code\`

const res = await fetch(url)
const data = await res.json()

const temp=Math.round(data.current.temperature_2m)

box.innerHTML=\`🌤 \${temp}°\`

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

return \`\${giorni[now.getDay()]} \${now.getDate()} \${mesi[now.getMonth()]} \${now.getFullYear()}\`

}
