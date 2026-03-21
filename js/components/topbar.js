// js/components/topbar.js

import { getWeather } from "../utils/weather.js"

export function initTopbar(){

  let bar = document.querySelector(".topbar-info")

  if(!bar){
    bar = document.createElement("div")
    bar.className = "topbar-info"
    document.body.appendChild(bar)
  }

  renderTopbar()
}


async function renderTopbar(){

  const nome = window.state?.user?.email || "Utente"
  const ruolo = window.state?.viewAs || window.state?.ruolo

  const now = new Date()

  const data = now.toLocaleDateString("it-IT", {
    weekday:"short",
    day:"numeric",
    month:"short"
  })

  const saluto = getSaluto()

  const meteo = await getWeather()

  document.querySelector(".topbar-info").innerHTML = `
    <div class="topbar-left">
      <span>${saluto} ${nome.split("@")[0]}</span>
      <span>•</span>
      <span>${data}</span>
    </div>

    <div class="topbar-right">
      <span>${meteo}</span>
      <span>• ${ruolo}</span>
    </div>
  `
}


function getSaluto(){

  const h = new Date().getHours()

  if(h < 12) return "Buongiorno"
  if(h < 18) return "Buon pomeriggio"
  return "Buonasera"
}
