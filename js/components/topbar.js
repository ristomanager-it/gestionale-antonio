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
  // HEADER LOGO (FIX COMPLETO)
  // =========================

  const headerLogo = document.getElementById("header-logo")

  if (headerLogo) {

    let src = "assets/favicon-192.png"

    if (sedeAttiva?.logo_url) {
      src = sedeAttiva.logo_url
    } else if (azienda.logo_url) {
      src = azienda.logo_url
    }

    headerLogo.src = src + "?t=" + Date.now()
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
EVENT LISTENER (FIX COMPLETO)
========================= */

document.addEventListener("change", function(e){

  if(e.target.id === "sede-switcher"){

    const sedeId = e.target.value

    localStorage.setItem("active_sede_id", sedeId)

    // 🔥 aggiorna sede nello stato (NO reset)
    const sede = window.state.sedi.find(s => String(s.id) === String(sedeId))

    if (sede) {
      window.state.sedeAttiva = sede
    }

    // 🔥 aggiorna subito UI
    if (window.refreshTopbar) {
      window.refreshTopbar()
    }

    if (window.renderAziendaUI) {
      window.renderAziendaUI()
    }
  }

})


function getSaluto(){
  const h = new Date().getHours()
  if(h < 12) return "Buongiorno"
  if(h < 18) return "Buon pomeriggio"
  return "Buonasera"
}
