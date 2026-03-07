// js/views/home.js
// =======================================
// Dashboard Reparti + Selettore Sede
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

      <div style="
        background: var(--color-primary);
        color: white;
        padding: 40px 32px 88px 32px;
        border-bottom-left-radius: 32px;
        border-bottom-right-radius: 32px;
      ">

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">

          <div>
            <h2 style="margin:0; font-weight:600;">
              ${saluto} 👋
            </h2>

            <p style="margin:8px 0 0 0; opacity:0.9;">
              ${
                window.state.sedeAttiva
                  ? `Stai gestendo: <strong>${window.state.sedeAttiva.nome}</strong>`
                  : `Seleziona una sede per iniziare`
              }
            </p>
          </div>

          <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">

            ${renderSedeSelector()}

            ${
              ruolo === "superadmin"
                ? `
                <button
                  onclick="window.location.hash='#/homePiattaforma'"
                  style="
                    background:white;
                    color:var(--color-primary);
                    border:none;
                    padding:10px 18px;
                    border-radius:14px;
                    font-weight:600;
                    cursor:pointer;
                    box-shadow:0 8px 20px rgba(0,0,0,0.15);
                  "
                >
                  ⚙ Piattaforma
                </button>
                `
                : ``
            }

          </div>

        </div>

      </div>

      <div style="
        display:flex;
        justify-content:center;
        gap:40px;
        margin-top:-34px;
        margin-bottom:24px;
        padding:0 20px;
        flex-wrap:wrap;
      ">

        ${renderToolbarItem("home-weather","⏳","Meteo","#/meteo")}
        ${renderToolbarItem("home-dish","🍽️","Piatto del giorno","#/ai")}
        ${renderToolbarItem("home-calendar","📅","Calendario","#/calendario")}

      </div>

      ${
        window.state.sedeAttiva
          ? `
          <div style="
            padding:0 32px 40px 32px;
            display:grid;
            gap:24px;
            grid-template-columns: repeat(auto-fit, minmax(220px,1fr));
          ">

            ${
              repartiVisibili.map((rep,index)=>`
                <div
                  onclick="window.location.hash='#/${rep.key}'"
                  style="
                    background:white;
                    padding:40px 24px;
                    border-radius:24px;
                    box-shadow:0 12px 30px rgba(0,0,0,0.06);
                    text-align:center;
                    cursor:pointer;
                    transition:all 0.25s ease;
                    animation:fadeInUp 0.4s ease forwards;
                    animation-delay:${index * 0.08}s;
                    opacity:0;
                  "
                >
                  <div style="font-size:42px;margin-bottom:18px;">
                    ${rep.icon}
                  </div>

                  <div style="font-size:18px;font-weight:600;">
                    ${rep.label}
                  </div>
                </div>
              `).join("")}
          </div>
        `
          : `
          <div style="padding:60px 32px;text-align:center;">
            <p style="font-size:18px;opacity:0.7;">
              Seleziona una sede per accedere ai moduli operativi.
            </p>
          </div>
        `
      }

      <style>
        @keyframes fadeInUp{
          from{transform:translateY(15px);opacity:0;}
          to{transform:translateY(0);opacity:1;}
        }
      </style>

    </div>
  `;

  await hydrateToolbar();
}

function renderToolbarItem(id,icon,label,route){

  return `
    <div
      id="${id}"
      onclick="window.location.hash='${route}'"
      style="
        min-width:92px;
        cursor:pointer;
        text-align:center;
        user-select:none;
      "
    >

      <div style="
        width:58px;
        height:58px;
        margin:0 auto 8px auto;
        border-radius:18px;
        background:white;
        box-shadow:0 10px 25px rgba(0,0,0,0.10);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:24px;
      ">
        ${icon}
      </div>

      <div style="
        font-size:12px;
        font-weight:600;
        color:#111827;
      ">
        ${label}
      </div>

      <div style="
        margin-top:4px;
        font-size:12px;
        color:#6b7280;
        min-height:28px;
      ">
        Caricamento...
      </div>

    </div>
  `;
}

async function hydrateToolbar(){

  await Promise.allSettled([
    hydrateWeatherWidget(),
    hydrateDishWidget(),
    hydrateCalendarWidget()
  ]);

}

async function hydrateWeatherWidget(){

  const root = document.getElementById("home-weather");
  if(!root) return;

  const detail = root.querySelector("div:last-child");
  const iconBox = root.querySelector("div:first-child");

  function getPosition(){
    return new Promise((resolve,reject)=>{

      if(!navigator.geolocation){
        reject();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos=>resolve({
          lat:pos.coords.latitude,
          lon:pos.coords.longitude
        }),
        ()=>reject(),
        {enableHighAccuracy:true}
      );

    });
  }

  let lat;
  let lon;

  try{

    const pos = await getPosition();

    lat = pos.lat;
    lon = pos.lon;

  }catch{

    lat = window.state?.sedeAttiva?.latitudine;
    lon = window.state?.sedeAttiva?.longitudine;

  }

  if(!lat || !lon){

    if(detail) detail.textContent = "Posizione";
    if(iconBox) iconBox.textContent = "📍";

    return;
  }

  try{

    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();

    const temperature = data?.current?.temperature_2m;
    const weatherCode = data?.current?.weather_code;

    if(detail) detail.textContent = `${Math.round(temperature)}°`;

    if(iconBox) iconBox.textContent = mapWeatherCodeToIcon(weatherCode);

  }catch{

    if(detail) detail.textContent = "Errore";
    if(iconBox) iconBox.textContent = "☁️";

  }

}

async function hydrateDishWidget(){

  const root = document.getElementById("home-dish");
  if(!root) return;

  const detail = root.querySelector("div:last-child");

  try{

    const res = await fetch(
      "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/operandi-ai",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          prompt:"Suggerisci un piatto del giorno per ristorante",
          azienda:window.state?.azienda?.nome
        })
      }
    );

    const data = await res.json();

    if(detail) detail.textContent = data.reply?.slice(0,40) || "Piatto AI";

  }catch{

    if(detail) detail.textContent = "Suggerisci";

  }

}

async function hydrateCalendarWidget(){

  const root = document.getElementById("home-calendar");
  if(!root) return;

  const detail = root.querySelector("div:last-child");

  const label = getCalendarPreviewLabel();

  if(detail) detail.textContent = label;

}

function getCalendarPreviewLabel(){

  const today = new Date();
  const thisYear = today.getFullYear();

  const fixedEvents = [
    {nome:"San Valentino",mese:2,giorno:14},
    {nome:"Ferragosto",mese:8,giorno:15},
    {nome:"Halloween",mese:10,giorno:31},
    {nome:"Natale",mese:12,giorno:25},
    {nome:"Capodanno",mese:12,giorno:31}
  ];

  const candidates = fixedEvents.map(e=>{

    const date = new Date(thisYear,e.mese-1,e.giorno);

    if(date < today){
      date.setFullYear(thisYear+1);
    }

    return {...e,date};

  });

  candidates.sort((a,b)=>a.date-b.date);

  const next = candidates[0];
  const days = diffInDays(today,next.date);

  if(days <= 30){
    return `${days} gg · ${next.nome}`;
  }

  return "30 giorni";

}

function diffInDays(a,b){

  const start = new Date(a.getFullYear(),a.getMonth(),a.getDate());
  const end = new Date(b.getFullYear(),b.getMonth(),b.getDate());

  const ms = end.getTime() - start.getTime();

  return Math.round(ms/86400000);

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
        padding:8px 12px;
        border-radius:10px;
        border:none;
        font-weight:500;
      "
    >
      <option value="">Seleziona sede</option>

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
