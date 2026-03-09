// js/views/home.js
// =======================================
// Home operativa ruolo-based con:
// - header con nome utente + meteo
// - briefing Tony
// - task operativi
// - accesso rapido
// - mini chat Tony
// =======================================

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

  const briefingTony = getTonyBriefing(ruolo);

  const tasks = getTasksByRole(ruolo);

  container.innerHTML = `

  <div class="view" style="padding:0;display:flex;flex-direction:column;height:100%;">

    <!-- HEADER -->

    <div class="home-header">

      <div class="home-header-left">

        <h2 class="home-title">
          ${saluto} ${nomeUtente} 👋
        </h2>

        <div class="home-meta">

          <span class="home-date">
            ${dataOggi}
          </span>

          <span id="home-weather-inline" class="home-weather">
            ⏳
          </span>

        </div>

        <div class="home-sede">

          ${
            window.state.sedeAttiva
              ? `Sede: <strong>${window.state.sedeAttiva.nome}</strong>`
              : `Seleziona una sede`
          }

        </div>

      </div>

      <div class="home-header-right">

        ${renderSedeSelector()}

      </div>

    </div>


    <!-- BRIEFING TONY -->

    <div class="home-tony">

      <div class="home-tony-icon">
        🤖
      </div>

      <div class="home-tony-text">
        ${briefingTony}
      </div>

    </div>


    <!-- TASK OPERATIVI -->

    <div class="home-tasks">

      <div class="tasks-title">
        Compiti assegnati
      </div>

      ${tasks.map(task=>`

        <div class="task-card">

          <div class="task-icon">
            ${task.icon}
          </div>

          <div class="task-body">

            <div class="task-title">
              ${task.title}
            </div>

            <div class="task-desc">
              ${task.desc}
            </div>

          </div>

          <button
            onclick="window.location.hash='${task.route}'"
            class="task-btn"
          >
            Apri
          </button>

        </div>

      `).join("")}

    </div>


    <!-- CHAT TONY -->

    <div class="home-chat">

      <div class="chat-header">
        🤖 Tony
      </div>

      <div class="chat-body">
        Hai bisogno di aiuto? Chiedi a Tony.
      </div>

      <div class="chat-input">

        <input
          placeholder="Scrivi a Tony..."
          onclick="window.location.hash='#/ai'"
        />

      </div>

    </div>

  </div>

  <style>

  .home-header{
    background:var(--color-primary);
    color:white;
    padding:22px;
    border-bottom-left-radius:22px;
    border-bottom-right-radius:22px;

    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:16px;
  }

  .home-title{
    margin:0;
    font-weight:600;
    font-size:20px;
  }

  .home-meta{
    margin-top:4px;
    display:flex;
    gap:12px;
    align-items:center;
  }

  .home-weather{
    font-size:20px;
  }

  .home-tony{
    margin:20px;
    background:white;
    border-radius:16px;
    padding:18px;

    display:flex;
    gap:12px;

    box-shadow:0 8px 20px rgba(0,0,0,0.06);
  }

  .home-tony-icon{
    font-size:24px;
  }

  .home-tony-text{
    font-size:14px;
    line-height:1.4;
  }

  .home-tasks{
    padding:20px;
    display:flex;
    flex-direction:column;
    gap:12px;
  }

  .tasks-title{
    font-weight:600;
    margin-bottom:6px;
  }

  .task-card{
    background:white;
    border-radius:12px;
    padding:14px;

    display:flex;
    align-items:center;
    gap:12px;

    box-shadow:0 4px 14px rgba(0,0,0,0.05);
  }

  .task-icon{
    font-size:20px;
  }

  .task-body{
    flex:1;
  }

  .task-title{
    font-weight:600;
    font-size:14px;
  }

  .task-desc{
    font-size:13px;
    opacity:0.7;
  }

  .task-btn{
    background:var(--color-primary);
    color:white;
    border:none;
    padding:6px 10px;
    border-radius:8px;
    cursor:pointer;
  }

  .home-chat{
    margin:20px;
    background:#0f172a;
    color:white;
    border-radius:16px;
    padding:16px;
  }

  .chat-header{
    font-weight:600;
    margin-bottom:8px;
  }

  .chat-input input{
    width:100%;
    padding:8px;
    border-radius:8px;
    border:none;
  }

  </style>
  `;

  hydrateWeather();
}


function getTasksByRole(ruolo){

  if(ruolo === "manager_cucina"){
    return [
      { icon:"🍳", title:"Produzione cucina", desc:"Controlla produzioni di oggi", route:"#/produzione" },
      { icon:"📦", title:"Scorte cucina", desc:"Verifica ingredienti critici", route:"#/magazzino" }
    ];
  }

  if(ruolo === "segreteria"){
    return [
      { icon:"🧾", title:"Registrare fatture", desc:"Gestione amministrativa", route:"#/acquisti" },
      { icon:"👥", title:"Fornitori", desc:"Gestisci fornitori", route:"#/fornitori" }
    ];
  }

  if(ruolo === "admin"){
    return [
      { icon:"📊", title:"Controllo margini", desc:"Analisi economica", route:"#/margini" },
      { icon:"🧾", title:"Ordini fornitori", desc:"Gestisci acquisti", route:"#/acquisti" }
    ];
  }

  return [
    { icon:"🏭", title:"Produzione", desc:"Gestione operativa", route:"#/produzione" }
  ];

}


function getTonyBriefing(ruolo){

  if(ruolo === "admin"){
    return "Tony: oggi controlla margini e andamento vendite.";
  }

  if(ruolo === "manager_cucina"){
    return "Tony: controlla produzioni e ingredienti sottoscorta.";
  }

  if(ruolo === "segreteria"){
    return "Tony: verifica fatture e ordini fornitori.";
  }

  return "Tony: briefing operativo del giorno.";
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

  const sedi = window.state.sedi || [];

  if(sedi.length <= 1) return "";

  return `
  <select
    onchange="window.stateActions.setSedeAttiva(this.value)"
    style="
      padding:8px 10px;
      border-radius:10px;
      border:none;
      font-weight:500;
    "
  >

    ${
      sedi.map(s=>`
        <option
          value="${s.id}"
          ${window.state.sedeAttiva?.id == s.id ? "selected" : ""}
        >
          ${s.nome}
        </option>
      `).join("")
    }

  </select>
  `;
}


async function hydrateWeather(){

  const box = document.getElementById("home-weather-inline");
  if(!box) return;

  let lat;
  let lon;

  try{

    const pos = await new Promise((resolve,reject)=>{
      navigator.geolocation.getCurrentPosition(
        p=>resolve(p.coords),
        ()=>reject()
      );
    });

    lat = pos.latitude;
    lon = pos.longitude;

  }catch{

    lat = window.state?.sedeAttiva?.latitudine;
    lon = window.state?.sedeAttiva?.longitudine;

  }

  if(!lat || !lon){
    box.innerHTML = "📍";
    return;
  }

  try{

    const url =
      `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;

    const res = await fetch(url);
    const data = await res.json();

    const temp = Math.round(data?.current?.temperature_2m);
    const code = data?.current?.weather_code;

    const icon = mapWeatherCodeToIcon(code);

    box.innerHTML =
      `<span style="font-size:22px">${icon}</span>
       <span style="font-size:18px;font-weight:600">${temp}°</span>`;

  }catch{

    box.textContent = "☁️";

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

  const ora = new Date().getHours();

  if(ora < 12) return "Buongiorno";
  if(ora < 18) return "Buon pomeriggio";

  return "Buonasera";
}


function getDataFormattata(){

  const giorni = [
    "Domenica","Lunedì","Martedì","Mercoledì",
    "Giovedì","Venerdì","Sabato"
  ];

  const mesi = [
    "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
    "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
  ];

  const now = new Date();

  return `${giorni[now.getDay()]} ${now.getDate()} ${mesi[now.getMonth()]} ${now.getFullYear()}`;
}
