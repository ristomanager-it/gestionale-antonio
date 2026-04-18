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

  const nome = window.state?.user?.email || "Utente"
  const ruolo = window.state?.viewAs || window.state?.ruolo || "-"
  const azienda = window.state?.azienda || null

  const now = new Date()

  const data = now.toLocaleDateString("it-IT", {
    weekday:"short",
    day:"numeric",
    month:"short"
  })

  const saluto = getSaluto()

  // 🔥 LOGO + NOME AZIENDA
  const logoUrl = azienda?.logo_url || null
  const nomeAzienda = azienda?.nome || ""

  el.innerHTML = `
    <div class="topbar-left">

      ${
        logoUrl
        ? `<img src="${logoUrl}" class="topbar-logo">`
        : `<div class="topbar-logo placeholder">🏢</div>`
      }

      ${
        nomeAzienda
        ? `<span class="topbar-azienda">${nomeAzienda}</span>`
        : ``
      }

      <span class="topbar-divider">•</span>

      <span>${saluto} ${nome.split("@")[0]}</span>
      <span>•</span>
      <span>${data}</span>
    </div>

    <div class="topbar-right">
      <span>⏳</span>
      <span>• ${ruolo}</span>
    </div>
  `

  const meteo = await getWeather()

  const right = el.querySelector(".topbar-right")
  if(right){
    right.innerHTML = `
      <span>${meteo}</span>
      <span>• ${ruolo}</span>
    `
  }
}


function getSaluto(){
  const h = new Date().getHours()
  if(h < 12) return "Buongiorno"
  if(h < 18) return "Buon pomeriggio"
  return "Buonasera"
}
