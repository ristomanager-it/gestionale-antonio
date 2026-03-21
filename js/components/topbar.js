import { getWeather } from "../utils/weather.js"

export function initTopbar(){

  let bar = document.querySelector(".topbar-info")

  if(!bar){
    bar = document.createElement("div")
    bar.className = "topbar-info"
    bar.id = "topbar-info"
    document.body.appendChild(bar)
  }

  renderTopbar()
}

// 🔥 ESPONIAMO GLOBALMENTE
window.refreshTopbar = renderTopbar


async function renderTopbar(){

  const el = document.getElementById("topbar-info")
  if(!el) return

  const nome = window.state?.user?.email || "Utente"
  const ruolo = window.state?.viewAs || window.state?.ruolo || "-"

  const now = new Date()

  const data = now.toLocaleDateString("it-IT", {
    weekday:"short",
    day:"numeric",
    month:"short"
  })

  const saluto = getSaluto()

  // 🔥 fallback immediato
  el.innerHTML = `
    <div class="topbar-left">
      <span>${saluto} ${nome.split("@")[0]}</span>
      <span>•</span>
      <span>${data}</span>
    </div>

    <div class="topbar-right">
      <span>⏳</span>
      <span>• ${ruolo}</span>
    </div>
  `

  // 🔥 meteo async
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
