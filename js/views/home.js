export async function render(container){

  const ruolo = window.state?.viewAs || window.state?.ruolo

  container.innerHTML = `
    <div class="view home">

      ${renderHeader(ruolo)}

      <div class="home-content">
        ${renderByRole(ruolo)}
      </div>

    </div>

    <style>
      .home{padding:16px;}

      .home-header{
        margin-bottom:16px;
      }

      .role-badge{
        display:inline-block;
        padding:4px 10px;
        border-radius:999px;
        font-size:12px;
        background:#111827;
        color:white;
        margin-top:6px;
      }

      .grid{
        display:grid;
        gap:12px;
      }

      .card{
        background:white;
        padding:16px;
        border-radius:12px;
      }

      .card-title{
        font-weight:600;
        margin-bottom:6px;
      }

      .btn{
        margin-top:10px;
        padding:10px;
        border:none;
        border-radius:8px;
        background:#111827;
        color:white;
        cursor:pointer;
        width:100%;
      }
    </style>
  `

  bindEvents()

}


// =====================================
// HEADER
// =====================================

function renderHeader(ruolo){

  return `
    <div class="home-header">
      <h2>Dashboard</h2>
      <div class="role-badge">
        ${ruolo?.toUpperCase() || "UNKNOWN"}
      </div>
    </div>
  `
}


// =====================================
// ROLE SWITCH RENDER
// =====================================

function renderByRole(ruolo){

  if(ruolo === "operatore") return renderOperatore()
  if(ruolo === "manager") return renderManager()
  if(ruolo === "admin" || ruolo === "superadmin") return renderAdmin()

  return `<div>Ruolo non gestito</div>`
}


// =====================================
// 👨‍🍳 OPERATORE
// =====================================

function renderOperatore(){
  return `
    <div class="grid">

      <div class="card">
        <div class="card-title">Turno</div>
        <div>Inizia o termina il turno</div>
        <button class="btn" data-action="timbratura">Avvia turno</button>
      </div>

      <div class="card">
        <div class="card-title">Preparazioni</div>
        <div>Controlla le preparazioni attive</div>
        <button class="btn" data-route="produzione">Vai</button>
      </div>

    </div>
  `
}


// =====================================
// 👨‍💼 MANAGER
// =====================================

function renderManager(){
  return `
    <div class="grid">

      <div class="card">
        <div class="card-title">Servizi oggi</div>
        <div>Controlla andamento servizio</div>
        <button class="btn" data-route="servizi">Apri</button>
      </div>

      <div class="card">
        <div class="card-title">Personale</div>
        <div>Gestione staff attivo</div>
        <button class="btn" data-route="dipendenti">Gestisci</button>
      </div>

      <div class="card">
        <div class="card-title">Produzione</div>
        <div>Stato lavorazioni</div>
        <button class="btn" data-route="produzione">Vai</button>
      </div>

    </div>
  `
}


// =====================================
// 👨‍💻 ADMIN
// =====================================

function renderAdmin(){
  return `
    <div class="grid">

      <div class="card">
        <div class="card-title">KPI</div>
        <div>Analisi performance</div>
        <button class="btn" data-route="kpi">Apri</button>
      </div>

      <div class="card">
        <div class="card-title">Margini</div>
        <div>Controllo redditività</div>
        <button class="btn" data-route="margini">Vai</button>
      </div>

      <div class="card">
        <div class="card-title">Costi</div>
        <div>Monitoraggio costi</div>
        <button class="btn" data-route="costi">Apri</button>
      </div>

    </div>
  `
}


// =====================================
// EVENTS
// =====================================

function bindEvents(){

  // ROUTE BUTTON
  document.querySelectorAll("[data-route]").forEach(el=>{
    el.onclick = ()=>{
      const route = el.dataset.route

      if(window.router?.go){
        window.router.go(route)
      }else{
        window.location.hash = "#/" + route
      }
    }
  })

  // AZIONI
  document.querySelectorAll("[data-action]").forEach(el=>{
    el.onclick = ()=>{
      const action = el.dataset.action

      if(action === "timbratura"){
        if(window.router?.go){
          window.router.go("timbrature")
        }else{
          window.location.hash = "#/timbrature"
        }
      }
    }
  })

}
