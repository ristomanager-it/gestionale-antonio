import { getWeather } from "../utils/weather.js"

export function initTopbar(){
  renderTopbar()
}

window.refreshTopbar = renderTopbar

async function renderTopbar(){

  const azienda = window.state?.azienda || {}
  const profilo = window.state?.profilo || {}
  const sedi = window.state?.sedi || []
  const sedeAttiva = window.state?.sedeAttiva

  const nomeUtente = profilo.nome || window.state?.user?.email?.split("@")[0] || "Utente"

  const now = new Date()

  const data = now.toLocaleDateString("it-IT", {
    weekday:"short",
    day:"numeric",
    month:"short"
  })

  const saluto = getSaluto()

  // =========================
  // HEADER LOGO
  // =========================

  const headerLogo = document.getElementById("header-logo")
  if(headerLogo && azienda.logo_url){
    headerLogo.src = azienda.logo_url
  }

  // =========================
  // NOME AZIENDA
  // =========================

  const nomeEl = document.getElementById("azienda-nome")
  if(nomeEl){
    nomeEl.innerHTML = `
      ${azienda.nome || ""}
      ${renderSedeSwitcher(sedi, sedeAttiva)}
    `
  }

  // =========================
  // SALUTO
  // =========================

  const salutoEl = document.getElementById("topbar-saluto")
  if(salutoEl){
    salutoEl.textContent = `${saluto} ${nomeUtente}`
  }

  // =========================
  // DATA
  // =========================

  const dataEl = document.getElementById("topbar-data")
  if(dataEl){
    dataEl.textContent = data
  }

  // =========================
  // METEO
  // =========================

  const meteoEl = document.getElementById("topbar-weather")

  if(meteoEl){
    meteoEl.innerHTML = "⏳"

    try{
      const meteo = await getWeather()
      meteoEl.innerHTML = meteo
    }catch(e){
      meteoEl.innerHTML = "☀️"
    }
  }

}


/* =========================
SWITCHER SEDE
========================= */

function renderSedeSwitcher(sedi, sedeAttiva){

  if(!sedi || sedi.length <= 1) return ""

  return `
    <div style="margin-top:4px; font-size:12px;">
      <select id="sede-switcher" style="padding:2px 6px; border-radius:6px;">
        ${sedi.map(s => `
          <option value="${s.id}" ${sedeAttiva?.id === s.id ? "selected" : ""}>
            📍 ${s.nome}
          </option>
        `).join("")}
      </select>
    </div>
  `
}


/* =========================
EVENT LISTENER
========================= */

document.addEventListener("change", function(e){

  if(e.target.id === "sede-switcher"){

    const sedeId = e.target.value

    localStorage.setItem("active_sede_id", sedeId)

    // 🔥 reset stato sede
    window.state.sedeAttiva = null

    // 🔥 reload app pulito
    window.router.reloadCurrentRoute()
  }

})


function getSaluto(){
  const h = new Date().getHours()
  if(h < 12) return "Buongiorno"
  if(h < 18) return "Buon pomeriggio"
  return "Buonasera"
}
