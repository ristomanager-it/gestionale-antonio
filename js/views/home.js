import { getTonyInsights } from "../ai/tony-service.js"

export async function render(container) {

  container.innerHTML = `
    <div class="home">

      <div id="home-header"></div>

      <div id="home-tony"></div>

      <div id="home-kpi"></div>

      <div id="home-actions"></div>

    </div>

    <style>
      .home{padding:16px;display:flex;flex-direction:column;gap:14px;}

      .header{
        background:#0E5A7A;
        color:white;
        padding:16px;
        border-radius:14px;
      }

      .card{
        background:white;
        padding:14px;
        border-radius:12px;
      }

      .actions div{
        padding:10px;
        background:#eef2f7;
        border-radius:8px;
        margin-top:6px;
        cursor:pointer;
      }
    </style>
  `

  renderHeader()
  renderTonyFast()
  renderKPI()
  renderActions()

  loadTonyAsync()
}


// =======================================
// HEADER
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
      <div style="margin-top:6px;">
        ${data}
      </div>
      <div style="margin-top:6px;font-size:13px;">
        ☀️ Meteo in caricamento...
      </div>
    </div>
  `
}


// =======================================
// TONY FAST
// =======================================

function renderTonyFast(){

  const ruolo = window.state?.ruolo

  let msg = "Sistema operativo pronto"

  if(ruolo === "manager"){
    msg = "Controlla operatività e vendite oggi"
  }

  if(ruolo === "operatore"){
    msg = "Hai attività operative assegnate"
  }

  if(ruolo === "admin"){
    msg = "Controlla margini e costi"
  }

  document.getElementById("home-tony").innerHTML = `
    <div class="card">
      <b>Tony</b>
      <div id="tony-msg">${msg}</div>
    </div>
  `
}


// =======================================
// TONY ASYNC
// =======================================

async function loadTonyAsync(){

  try{
    const insights = await getTonyInsights()
    if(!insights.length) return
    document.getElementById("tony-msg").innerText = insights[0].message
  }catch(e){
    console.error(e)
  }

}


// =======================================
// KPI (LOGICA RUOLI)
// =======================================

function renderKPI(){

  const ruolo = window.state?.ruolo

  // 👨‍💼 MANAGER → SOLO VENDITE
  if(ruolo === "manager"){
    document.getElementById("home-kpi").innerHTML = `
      <div class="card">
        <b>Vendite oggi</b>
        <div>€ 1.200</div>
      </div>
    `
    return
  }

  // 👑 ADMIN → COMPLETO
  if(ruolo === "admin" || ruolo === "superadmin"){
    document.getElementById("home-kpi").innerHTML = `
      <div class="card">
        <b>KPI</b>
        <div>Vendite: € 1.200</div>
        <div>Margine: € 320</div>
        <div>Costi: € 880</div>
      </div>
    `
    return
  }

  // 👤 OPERATORE → niente KPI
  document.getElementById("home-kpi").innerHTML = ""
}


// =======================================
// AZIONI
// =======================================

function renderActions(){

  const ruolo = window.state?.ruolo
  const actions = []

  // 👨‍💼 MANAGER → operativo
  if(ruolo === "manager"){
    actions.push({label:"Produzione", route:"produzione"})
    actions.push({label:"Fatture", route:"fatture"})
    actions.push({label:"Team", route:"dipendenti"})
  }

  // 👑 ADMIN → tutto
  if(ruolo === "admin" || ruolo === "superadmin"){
    actions.push({label:"Fatture", route:"fatture"})
    actions.push({label:"Acquisti", route:"acquisti"})
    actions.push({label:"Dipendenti", route:"dipendenti"})
  }

  // 👤 OPERATORE
  if(ruolo === "operatore"){
    actions.push({label:"Produzione", route:"produzione"})
    actions.push({label:"Timbratura", route:"timbratura"})
  }

  if(!actions.length){
    document.getElementById("home-actions").innerHTML = ""
    return
  }

  document.getElementById("home-actions").innerHTML = `
    <div class="card actions">
      <b>Azioni</b>
      ${actions.map(a=>`
        <div onclick="location.hash='#/${a.route}'">${a.label}</div>
      `).join("")}
    </div>
  `
}
