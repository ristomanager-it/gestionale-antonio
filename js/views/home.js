// js/views/home.js
// =======================================
// Dashboard Reparti + Header Smart
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
    window.stateActions.setSedeAttiva(sedi[0].id);
  }

  const REPARTI = [
    {
      key: "operativo",
      label: "Operativo",
      icon: "🏭",
      moduli: ["produzione", "magazzino", "ricettario", "preparazioni", "timbrature"]
    },
    {
      key: "amministrazione",
      label: "Amministrazione",
      icon: "🧾",
      moduli: ["acquisti", "dipendenti", "preventivi"]
    },
    {
      key: "gestione",
      label: "Gestione",
      icon: "📊",
      moduli: ["margini", "report"]
    },
    {
      key: "marketing",
      label: "Marketing",
      icon: "📢",
      moduli: []
    },
    {
      key: "ai",
      label: "AI Ristoflow",
      icon: "🤖",
      moduli: []
    }
  ];

  const saluto = getSaluto();
  const dataOggi = getDataFormattata();

  const repartiVisibili = REPARTI.map(rep => {

    if (ruolo === "superadmin") return rep;

    const moduliFiltrati = rep.moduli.filter(m =>
      hasFeature(m) && hasPermission(m)
    );

    return { ...rep, moduli: moduliFiltrati };

  }).filter(rep =>
    ruolo === "superadmin" ||
    rep.moduli.length > 0 ||
    rep.key === "ai"
  );

  container.innerHTML = `
  <div class="view" style="padding:0;">

    <div class="home-header">

      <div class="home-header-left">

        <h2 class="home-title">
          ${saluto} 👋
        </h2>

        <div class="home-meta">
<span style="font-size:15px;">
          <span>${dataOggi}</span>

          <span id="home-weather-inline">
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

        ${
          ruolo === "superadmin"
            ? `
            <button
              onclick="window.location.hash='#/homePiattaforma'"
              class="btn-platform"
            >
              ⚙ Piattaforma
            </button>
            `
            : ``
        }

      </div>

    </div>

    ${
      window.state.sedeAttiva
        ? `
        <div class="home-grid">

          ${
            repartiVisibili.map((rep,index)=>`

              <div
                onclick="window.location.hash='#/${rep.key}'"
                class="home-card"
                style="animation-delay:${index * 0.08}s"
              >

                <div class="home-card-icon">
                  ${rep.icon}
                </div>

                <div class="home-card-title">
                  ${rep.label}
                </div>

              </div>

            `).join("")}

        </div>
        `
        : `
        <div class="home-empty">

          Seleziona una sede per accedere ai moduli operativi.

        </div>
        `
    }

  </div>

  <style>

  .home-header{
    background:var(--color-primary);
    color:white;
    padding:24px;
    border-bottom-left-radius:24px;
    border-bottom-right-radius:24px;

    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:16px;
  }

  .home-title{
    margin:0;
    font-weight:600;
  }

  .home-meta{
    margin-top:4px;
    font-size:14px;
    opacity:0.9;

    display:flex;
    gap:10px;
    align-items:center;
  }

  .home-sede{
    margin-top:4px;
    font-size:14px;
    opacity:0.9;
  }

  .home-header-right{
    display:flex;
    gap:10px;
    align-items:center;
    flex-wrap:wrap;
  }

  .btn-platform{
    background:white;
    color:var(--color-primary);
    border:none;
    padding:8px 14px;
    border-radius:12px;
    font-weight:600;
    cursor:pointer;
  }

  .home-grid{
    padding:28px;
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
    gap:20px;
  }

  .home-card{
    background:white;
    border-radius:20px;
    padding:30px;
    text-align:center;
    cursor:pointer;

    box-shadow:0 10px 30px rgba(0,0,0,0.08);

    transition:all .25s ease;

    animation:fadeInUp .4s ease forwards;
    opacity:0;
  }

  .home-card:hover{
    transform:translateY(-4px);
    box-shadow:0 16px 40px rgba(0,0,0,0.12);
  }

  .home-card-icon{
    font-size:36px;
    margin-bottom:12px;
  }

  .home-card-title{
    font-size:16px;
    font-weight:600;
  }

  .home-empty{
    padding:60px;
    text-align:center;
    font-size:18px;
    opacity:0.7;
  }

  @keyframes fadeInUp{
    from{transform:translateY(12px);opacity:0}
    to{transform:translateY(0);opacity:1}
  }

  </style>
  `;

  hydrateWeather();
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
    box.textContent = "📍";
    return;
  }

  try{

    const url =
      `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;

    const res = await fetch(url);
    const data = await res.json();

    const temp = Math.round(data?.current?.temperature_2m);
    const code = data?.current?.weather_code;

    box.textContent =
      mapWeatherCodeToIcon(code) + " " + temp + "°";

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

function hasFeature(area){
  return window.state?.featuresEffettive?.[area] === true;
}

function hasPermission(area){

  const ruolo = window.state?.ruolo;
  const override = window.state?.permessiOverride || {};

  if(ruolo === "superadmin") return true;

  if(Object.prototype.hasOwnProperty.call(override,area)){
    return override[area] === true;
  }

  const rolePermissions = {
    admin:["*"],
    segreteria:["dipendenti","acquisti","report","margini"],
    manager_cucina:["produzione","margini"],
    manager_sala:["produzione","margini"],
    addetto_cucina:[],
    cameriere:[]
  };

  if(rolePermissions[ruolo]?.includes("*")) return true;

  return rolePermissions[ruolo]?.includes(area) === true;
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
