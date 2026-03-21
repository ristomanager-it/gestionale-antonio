import { getTonyInsights } from "../ai/tony-service.js"

export async function render(container) {

  const user = window.state?.user
  const ruolo = window.state?.ruolo

  container.innerHTML = `
    <div class="view home-ai">

      <div id="home-tony"></div>

      <div id="home-stato"></div>

      <div id="home-alert"></div>

      <div id="home-kpi"></div>

      <div id="home-azioni"></div>

    </div>

    <style>
      .home-ai{
        display:flex;
        flex-direction:column;
        gap:14px;
        padding:16px;
      }

      .card{
        background:white;
        border-radius:14px;
        padding:16px;
        box-shadow:0 4px 12px rgba(0,0,0,0.05);
      }

      .card-title{
        font-weight:800;
        margin-bottom:6px;
      }

      .alert{
        color:#dc2626;
        font-weight:700;
      }

      .action{
        cursor:pointer;
        padding:10px;
        border-radius:10px;
        background:#eef2f7;
        margin-top:6px;
      }

      .tony-item{
        margin-top:6px;
      }
    </style>
  `

  await renderTony()
  renderStato()
  renderAlert()
  renderKPI()
  renderAzioni()

}


// ======================================================
// 🤖 TONY (REALE)
// ======================================================

async function renderTony(){

  const box = document.getElementById("home-tony")

  box.innerHTML = `
    <div class="card">
      <div class="card-title">Tony</div>
      <div id="tony-list">Caricamento...</div>
    </div>
  `

  const list = document.getElementById("tony-list")

  try{

    const insights = await getTonyInsights()

    if(!insights.length){
      list.innerHTML = "Nessun insight disponibile"
      return
    }

    list.innerHTML = insights.map(i => `
      <div class="tony-item">
        • ${i.message}
      </div>
    `).join("")

  }catch(e){
    console.error(e)
    list.innerHTML = "Errore caricamento Tony"
  }
}


// ======================================================
// 📊 STATO GIORNATA
// ======================================================

function renderStato(){

  const box = document.getElementById("home-stato")

  box.innerHTML = `
    <div class="card">
      <div class="card-title">Oggi</div>
      <div>Operatività in corso</div>
    </div>
  `
}


// ======================================================
// 🚨 ALERT
// ======================================================

function renderAlert(){

  const box = document.getElementById("home-alert")

  let alerts = []

  if(window.hasPermesso("price_alert.read")){
    alerts.push("Anomalia prezzo materie prime")
  }

  if(window.hasPermesso("fatture.validate")){
    alerts.push("Fatture da validare")
  }

  if(window.hasPermesso("magazzino.read")){
    alerts.push("Controlla giacenze basse")
  }

  if(!alerts.length){
    box.innerHTML = ""
    return
  }

  box.innerHTML = `
    <div class="card">
      <div class="card-title">Alert</div>
      ${alerts.map(a => `<div class="alert">${a}</div>`).join("")}
    </div>
  `
}


// ======================================================
// 📈 KPI
// ======================================================

function renderKPI(){

  const box = document.getElementById("home-kpi")

  if(!window.hasPermesso("report.read")){
    box.innerHTML = ""
    return
  }

  box.innerHTML = `
    <div class="card">
      <div class="card-title">KPI</div>
      <div>Caricamento dati...</div>
    </div>
  `
}


// ======================================================
// ⚡ AZIONI
// ======================================================

function renderAzioni(){

  const box = document.getElementById("home-azioni")

  const actions = []

  if(window.hasPermesso("fatture.create")){
    actions.push({ label:"Carica fattura", route:"fatture" })
  }

  if(window.hasPermesso("acquisti.create")){
    actions.push({ label:"Nuovo acquisto", route:"acquisti" })
  }

  if(window.hasPermesso("produzione.read")){
    actions.push({ label:"Vai in produzione", route:"produzione" })
  }

  if(window.hasPermesso("dipendenti.read")){
    actions.push({ label:"Gestisci dipendenti", route:"dipendenti" })
  }

  if(!actions.length){
    box.innerHTML = ""
    return
  }

  box.innerHTML = `
    <div class="card">
      <div class="card-title">Azioni rapide</div>
      ${actions.map(a => `
        <div class="action" onclick="location.hash='#/${a.route}'">
          ${a.label}
        </div>
      `).join("")}
    </div>
  `
}
