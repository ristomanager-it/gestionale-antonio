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
    </style>
  `

  renderTony()
  renderStato()
  renderAlert()
  renderKPI()
  renderAzioni()

}

// ======================================================
// 🤖 TONY (CENTRALE)
// ======================================================

function renderTony(){

  const box = document.getElementById("home-tony")

  box.innerHTML = `
    <div class="card">
      <div class="card-title">Tony</div>
      <div id="tony-msg">Caricamento...</div>
    </div>
  `

  const msg = generateTonyMessage()

  document.getElementById("tony-msg").innerText = msg
}

function generateTonyMessage(){

  const ruolo = window.state?.ruolo

  if(ruolo === "manager"){
    return "Hai 2 fatture da verificare e 1 anomalia prezzi."
  }

  if(ruolo === "operatore"){
    return "Hai un turno oggi e 2 preparazioni assegnate."
  }

  if(ruolo === "segreteria"){
    return "Nuove fatture inserite da validare."
  }

  return "Sistema operativo pronto."
}

// ======================================================
// 📊 STATO GIORNATA
// ======================================================

function renderStato(){

  const box = document.getElementById("home-stato")

  box.innerHTML = `
    <div class="card">
      <div class="card-title">Oggi</div>
      <div>Turno attivo</div>
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
    alerts.push("Anomalia prezzo materia prima")
  }

  if(window.hasPermesso("fatture.validate")){
    alerts.push("Fatture da validare")
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
// 📈 KPI (semplici per ora)
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
      <div>Margine oggi: € 320</div>
    </div>
  `
}

// ======================================================
// ⚡ AZIONI RAPIDE (IMPORTANTISSIMO)
// ======================================================

function renderAzioni(){

  const box = document.getElementById("home-azioni")

  const actions = []

  if(window.hasPermesso("fatture.create")){
    actions.push({
      label:"Carica fattura",
      route:"fatture"
    })
  }

  if(window.hasPermesso("produzione.read")){
    actions.push({
      label:"Vai in produzione",
      route:"produzione"
    })
  }

  if(window.hasPermesso("dipendenti.read")){
    actions.push({
      label:"Gestisci dipendenti",
      route:"dipendenti"
    })
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
