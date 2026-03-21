import { getTonyInsights } from "../ai/tony-service.js"

export async function render(container) {

  container.innerHTML = `
    <div class="home">

      <div id="home-header"></div>

      <div id="home-kpi"></div>

      <div id="home-tony"></div>

      <div id="home-main"></div>

    </div>

    <style>
      .home{
        padding:10px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .header{
        padding:6px 2px;
      }

      .card{
        background:white;
        padding:12px;
        border-radius:12px;
      }

      .kpi-big{
        font-size:22px;
        font-weight:700;
      }

      .chart{
        margin-top:10px;
        height:120px;
        background:linear-gradient(to top, #0ea5e9, #67e8f9);
        border-radius:8px;
      }

      .item{
        padding:12px;
        background:#f3f4f6;
        border-radius:10px;
        margin-top:6px;
        cursor:pointer;
      }
    </style>
  `

  renderHeader()
  renderKPI()
  renderTonyFast()
  renderMain()

  loadTonyAsync()
}


// =======================================
// HEADER (MINIMALE)
// =======================================

function renderHeader(){

  const nome = window.state?.user?.email || "Utente"
  const now = new Date()

  const data = now.toLocaleDateString("it-IT", {
    weekday:"long",
    day:"numeric",
    month:"long"
  })

  document.getElementById("home-header").innerHTML = `
    <div class="header">
      <div style="font-size:18px;font-weight:700;">
        Ciao ${nome.split("@")[0]} 👋
      </div>
      <div style="font-size:13px;color:#6b7280;">
        ${data} • ☀️ --
      </div>
    </div>
  `
}


// =======================================
// KPI (MANAGER + ADMIN)
// =======================================

function renderKPI(){

  const ruolo = window.state?.ruolo
  const box = document.getElementById("home-kpi")

  // 👨‍💼 MANAGER → KPI OPERATIVO + GRAFICO
  if(ruolo === "manager"){

    box.innerHTML = `
      <div class="card">

        <div class="kpi-big">120 coperti oggi</div>
        <div style="font-size:13px;color:#6b7280;">
          Servizio in linea
        </div>

        <div class="chart"></div>

      </div>
    `
    return
  }

  // 👑 ADMIN → ECONOMICO
  if(ruolo === "admin" || ruolo === "superadmin"){

    box.innerHTML = `
      <div class="card">

        <div class="kpi-big">€ 1.200 vendite</div>
        <div style="font-size:13px;color:#6b7280;">
          Margine € 320
        </div>

        <div class="chart"></div>

      </div>
    `
    return
  }

  box.innerHTML = ""
}


// =======================================
// TONY
// =======================================

function renderTonyFast(){

  const ruolo = window.state?.ruolo

  let msg = "Sistema pronto"

  if(ruolo === "manager"){
    msg = "Controlla servizio e personale"
  }

  if(ruolo === "operatore"){
    msg = "Hai attività assegnate"
  }

  if(ruolo === "admin"){
    msg = "Controlla andamento costi"
  }

  document.getElementById("home-tony").innerHTML = `
    <div class="card">
      <b>Tony</b>
      <div id="tony-msg">${msg}</div>
    </div>
  `
}


async function loadTonyAsync(){

  try{
    const insights = await getTonyInsights()
    if(!insights.length) return
    document.getElementById("tony-msg").innerText = insights[0].message
  }catch(e){}
}


// =======================================
// MAIN
// =======================================

function renderMain(){

  const ruolo = window.state?.ruolo
  const box = document.getElementById("home-main")

  if(ruolo === "manager"){

    box.innerHTML = `
      <div class="card">
        <b>Operatività</b>

        <div class="item" onclick="location.hash='#/dipendenti'">Personale</div>
        <div class="item" onclick="location.hash='#/turni'">Turni</div>
        <div class="item" onclick="location.hash='#/prenotazioni'">Prenotazioni</div>
        <div class="item" onclick="location.hash='#/produzione'">Produzione</div>

      </div>
    `
    return
  }

  if(ruolo === "operatore"){

    box.innerHTML = `
      <div class="card">
        <b>Operatività</b>

        <div class="item" onclick="location.hash='#/produzione'">Produzione</div>
        <div class="item" onclick="location.hash='#/timbratura'">Timbratura</div>

      </div>
    `
    return
  }

  box.innerHTML = ""
}
