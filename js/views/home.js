// js/views/home.js

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function render(container) {

  const user = window.state.user;
  const azienda = window.state.azienda;
  const ruolo = window.state?.ruolo;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento dashboard</div>`;
    return;
  }

  if (!window.state.sedi || window.state.sedi.length === 0) {
    await window.stateActions.caricaSedi();
  }

  const sedi = window.state.sedi || [];

  if (sedi.length === 1 && !window.state.sedeAttiva) {
    window.stateActions.setSedeAttiva(sedi[0]);
  }

  const saluto = getSaluto();
  const dataOggi = getDataFormattata();
  const nomeUtente = getUserName(user);

  container.innerHTML = `

  <div class="view home-view">

    <div class="home-header">

      <div>

        <div class="home-title">
          ${saluto} ${nomeUtente} 👋
        </div>

        <div class="home-meta">

          <span>${dataOggi}</span>

          <span id="home-weather-inline">⏳</span>

        </div>

        <div class="home-sede">

          ${
            window.state.sedeAttiva
              ? `Sede: <strong>${window.state.sedeAttiva.nome}</strong>`
              : `Seleziona una sede`
          }

        </div>

      </div>

      <div>
        ${renderSedeSelector()}
      </div>

    </div>

    ${renderMainSection(ruolo)}

    ${renderTonyMiniChat()}

    ${renderFooterNav(ruolo)}

  </div>

<style>

.home-view{
display:flex;
flex-direction:column;
height:100%;
}

.home-header{

background:var(--color-primary);
color:white;

padding:22px;

border-bottom-left-radius:22px;
border-bottom-right-radius:22px;

}

.home-title{
font-size:20px;
font-weight:600;
}

.home-meta{
margin-top:6px;
display:flex;
gap:14px;
}

.home-sede{
margin-top:6px;
font-size:14px;
opacity:0.9;
}

.home-main{
padding:20px;
}

.task-card{

background:white;

padding:16px;

border-radius:12px;

margin-bottom:10px;

box-shadow:0 4px 16px rgba(0,0,0,0.06);

display:flex;
justify-content:space-between;
align-items:center;

}

.task-title{
font-weight:600;
}

.home-chat{

margin:20px;

background:#0f172a;

color:white;

padding:16px;

border-radius:14px;

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

.admin-chart{

background:white;

padding:20px;

border-radius:14px;

box-shadow:0 4px 16px rgba(0,0,0,0.06);

margin:20px;

}

</style>

`;

hydrateWeather();

if(ruolo === "admin" || ruolo === "superadmin"){
renderAdminChart();
}

}

function renderMainSection(ruolo){

if(ruolo === "admin" || ruolo === "superadmin"){

return `

<div class="admin-chart">

<h3>Margini azienda</h3>

<canvas id="marginiChart"></canvas>

</div>

`;

}

const tasks = getTasksByRole(ruolo);

return `

<div class="home-main">

<h3>Compiti assegnati</h3>

${tasks.map(t=>`

<div class="task-card">

<div>

<div class="task-title">${t.title}</div>

<div>${t.desc}</div>

</div>

<button onclick="window.location.hash='${t.route}'">

Apri

</button>

</div>

`).join("")}

</div>

`;

}

function renderTonyMiniChat(){

return `

<div class="home-chat">

<strong>🤖 Tony</strong>

<div>

Hai bisogno di aiuto? Scrivi a Tony.

</div>

<input
placeholder="Scrivi a Tony..."
onclick="window.location.hash='#/ai'"
style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:none"
/>

</div>

`;

}

function renderFooterNav(ruolo){

if(ruolo === "admin" || ruolo === "superadmin"){

return `

<div class="home-footer">

<div onclick="location.hash='#/dashboard'">📊</div>

<div onclick="location.hash='#/acquisti'">🧾</div>

<div onclick="location.hash='#/magazzino'">📦</div>

<div onclick="location.hash='#/dipendenti'">👥</div>

<div onclick="location.hash='#/ai'">🤖</div>

</div>

`;

}

if(ruolo === "manager_cucina"){

return `

<div class="home-footer">

<div onclick="location.hash='#/produzione'">🏭</div>

<div onclick="location.hash='#/magazzino'">📦</div>

<div onclick="location.hash='#/report'">📊</div>

<div onclick="location.hash='#/eventi'">📅</div>

<div onclick="location.hash='#/ai'">🤖</div>

</div>

`;

}

if(ruolo === "segreteria"){

return `

<div class="home-footer">

<div onclick="location.hash='#/acquisti'">🧾</div>

<div onclick="location.hash='#/fornitori'">👥</div>

<div onclick="location.hash='#/report'">📊</div>

<div onclick="location.hash='#/fatture'">📄</div>

<div onclick="location.hash='#/ai'">🤖</div>

</div>

`;

}

return `

<div class="home-footer">

<div onclick="location.hash='#/timbrature'">⌚</div>

<div onclick="location.hash='#/produzione'">🏭</div>

<div onclick="location.hash='#/magazzino'">📦</div>

<div onclick="location.hash='#/ricette'">📖</div>

<div onclick="location.hash='#/ai'">🤖</div>

</div>

`;

}

function getTasksByRole(ruolo){

if(ruolo === "manager_cucina"){

return [

{title:"Produzione cucina",desc:"Controlla preparazioni oggi",route:"#/produzione"},

{title:"Scorte ingredienti",desc:"Verifica magazzino",route:"#/magazzino"}

];

}

if(ruolo === "segreteria"){

return [

{title:"Registrare fatture",desc:"Gestione amministrativa",route:"#/acquisti"},

{title:"Controllare fornitori",desc:"Aggiornamento fornitori",route:"#/fornitori"}

];

}

return [

{title:"Produzione",desc:"Gestione operativa",route:"#/produzione"}

];

}

function renderAdminChart(){

const ctx=document.getElementById("marginiChart");

if(!ctx) return;

new Chart(ctx,{

type:"doughnut",

data:{

labels:["Materie prime","Lavoro","Spese generali","Margine"],

datasets:[{

data:[30,25,20,25]

}]

}

});

}

function getUserName(user){

if(!user) return "";

if(user.nome) return user.nome;

if(user.email){

return user.email.split("@")[0];

}

return "";

}

function renderSedeSelector(){

const sedi=window.state.sedi || [];

if(sedi.length<=1) return "";

return `

<select

onchange="window.stateActions.setSedeAttiva(this.value)"

style="padding:8px;border-radius:10px;border:none"

>

${sedi.map(s=>`

<option

value="${s.id}"

${window.state.sedeAttiva?.id==s.id?"selected":""}

>

${s.nome}

</option>

`).join("")}

</select>

`;

}

async function hydrateWeather(){

const box=document.getElementById("home-weather-inline");

if(!box) return;

let lat;

let lon;

try{

const pos=await new Promise((resolve,reject)=>{

navigator.geolocation.getCurrentPosition(

p=>resolve(p.coords),

()=>reject()

);

});

lat=pos.latitude;

lon=pos.longitude;

}catch{

lat=41.9028;

lon=12.4964;

}

try{

const url=\`\${OPEN_METEO_URL}?latitude=\${lat}&longitude=\${lon}&current=temperature_2m,weather_code\`;

const res=await fetch(url);

const data=await res.json();

const temp=Math.round(data?.current?.temperature_2m);

const code=data?.current?.weather_code;

const icon=mapWeatherCodeToIcon(code);

box.innerHTML=\`\${icon} \${temp}°\`;

}catch{

box.innerHTML="☁️";

}

}

function mapWeatherCodeToIcon(code){

if([0,1].includes(code)) return "☀️";

if([2,3,45,48].includes(code)) return "☁️";

if([51,53,55,61,63,65,80,81,82].includes(code)) return "🌧️";

if([95,96,99].includes(code)) return "⛈️";

return "☁️";

}

function getSaluto(){

const ora=new Date().getHours();

if(ora<12) return "Buongiorno";

if(ora<18) return "Buon pomeriggio";

return "Buonasera";

}

function getDataFormattata(){

const giorni=["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];

const mesi=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

const now=new Date();

return \`\${giorni[now.getDay()]} \${now.getDate()} \${mesi[now.getMonth()]} \${now.getFullYear()}\`;

}
