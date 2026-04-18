import { getWeather } from "../utils/weather.js"

export function initTopbar(){

  let bar = document.getElementById("topbar-global")

  if(!bar){
    bar = document.createElement("div")
    bar.id = "topbar-global"
    bar.className = "topbar-global"
    document.body.appendChild(bar)
  }

  renderTopbar()
}

window.refreshTopbar = renderTopbar


async function renderTopbar(){

  const el = document.getElementById("topbar-global")
  if(!el) return

  const azienda = window.state?.azienda || {}
  const profilo = window.state?.profilo || {}

  const nomeUtente = profilo.nome || window.state?.user?.email?.split("@")[0] || "Utente"
  const ruolo = window.state?.viewAs || window.state?.ruolo || "-"

  const now = new Date()

  const data = now.toLocaleDateString("it-IT", {
    weekday:"short",
    day:"numeric",
    month:"short"
  })

  const saluto = getSaluto()

  const logoUrl = azienda?.logo_url || null
  const nomeAzienda = azienda?.nome || ""

  el.innerHTML = `
    
    <!-- 🔹 HEADER AZIENDA -->
    <div class="topbar-main">

      <div class="topbar-azienda-box">
        ${
          logoUrl
          ? `<img src="${logoUrl}" class="topbar-logo">`
          : `<div class="topbar-logo placeholder">🏢</div>`
        }

        <span class="topbar-azienda-nome">
          ${nomeAzienda}
        </span>
      </div>

    </div>


    <!-- 🔹 SUBHEADER UTENTE -->
    <div class="topbar-sub">

      <div class="topbar-sub-left">
        <span>${saluto} ${nomeUtente}</span>
        <span>•</span>
        <span>${data}</span>
      </div>

      <div class="topbar-sub-right">
        <span id="meteo">⏳</span>
        <span>• ${ruolo}</span>
      </div>

    </div>
  `

  const meteo = await getWeather()

  const meteoEl = document.getElementById("meteo")
  if(meteoEl){
    meteoEl.innerHTML = meteo
  }
}


function getSaluto(){
  const h = new Date().getHours()
  if(h < 12) return "Buongiorno"
  if(h < 18) return "Buon pomeriggio"
  return "Buonasera"
}
