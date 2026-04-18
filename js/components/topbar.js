import { getWeather } from "../utils/weather.js"

export function initTopbar(){
  renderTopbar()
}

window.refreshTopbar = renderTopbar

async function renderTopbar(){

  const azienda = window.state?.azienda || {}
  const profilo = window.state?.profilo || {}

  const nomeUtente = profilo.nome || window.state?.user?.email?.split("@")[0] || "Utente"

  const now = new Date()

  const data = now.toLocaleDateString("it-IT", {
    weekday:"short",
    day:"numeric",
    month:"short"
  })

  const saluto = getSaluto()

  // =========================
  // HEADER (LOGO + NOME)
  // =========================

  const headerLogo = document.getElementById("header-logo")
  const headerNome = document.getElementById("header-azienda-nome")

  if(headerLogo && azienda.logo_url){
    headerLogo.src = azienda.logo_url
  }

  if(headerNome){
    headerNome.textContent = azienda.nome || ""
  }

  // =========================
  // SOTTOHEADER
  // =========================

  const nomeEl = document.getElementById("azienda-nome")
  if(nomeEl){
    nomeEl.textContent = azienda.nome || ""
  }

  const salutoEl = document.getElementById("topbar-saluto")
  if(salutoEl){
    salutoEl.textContent = `${saluto} ${nomeUtente}`
  }

  const dataEl = document.getElementById("topbar-data")
  if(dataEl){
    dataEl.textContent = data
  }

  // =========================
  // METEO (QUI TORNA A FUNZIONARE)
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

function getSaluto(){
  const h = new Date().getHours()
  if(h < 12) return "Buongiorno"
  if(h < 18) return "Buon pomeriggio"
  return "Buonasera"
}
