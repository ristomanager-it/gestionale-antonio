import { renderFooter, initFooter } from "../components/footer.js"

export async function render(container){

  const ruolo = window.state?.viewAs || window.state?.ruolo

  container.innerHTML = `
    <div class="view home">

      <div class="home-body">

        ${renderHeader(ruolo)}

        <div id="tony-container"></div>

        <div class="home-content">
          ${renderByRole(ruolo)}
        </div>

      </div>

      ${renderFooter()}

    </div>

    <style>
      .home{
        display:flex;
        flex-direction:column;
        height:100vh;
      }

      .home-body{
        flex:1;
        overflow:auto;
        padding:16px;
        padding-bottom:80px;
      }

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

      .tony-box{
        background:#f9fafb;
        border:1px solid #e5e7eb;
        padding:12px;
        border-radius:12px;
        margin-bottom:16px;
      }

      .tony-title{
        font-weight:600;
        margin-bottom:6px;
      }

      .tony-item{
        font-size:14px;
        margin-bottom:6px;
      }

      .tony-item.correzione{color:#dc2626;font-weight:600;}
      .tony-item.incitamento{color:#2563eb;}
      .tony-item.positivo{color:#16a34a;}

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

      .app-footer{
        position:fixed;
        bottom:0;
        left:0;
        width:100%;
        background:white;
        border-top:1px solid #e5e7eb;
        display:flex;
        justify-content:space-around;
        padding:8px 0;
        z-index:100;
      }

      .footer-item{text-align:center;font-size:12px;cursor:pointer;}
      .footer-icon{font-size:18px;}
    </style>
  `

  bindEvents()
  initFooter()
  loadTony(ruolo)

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
// 🧠 TONY AVANZATO
// =====================================

async function loadTony(ruolo){

  const supabase = window.supabaseClient
  const aziendaId = window.state?.azienda?.id

  if(!aziendaId) return

  let insights = []

  // 👨‍🍳 OPERATORE
  if(ruolo === "operatore"){

    const today = new Date().toISOString().slice(0,10)

    const { data } = await supabase
      .from("timbrature")
      .select("id")
      .eq("azienda_id", aziendaId)
      .eq("user_id", window.state.user.id)
      .eq("data", today)

    if(!data || data.length === 0){

      insights.push({
        tone:"correzione",
        text:"Non hai ancora timbrato il turno"
      })

      insights.push({
        tone:"incitamento",
        text:"Inizia subito il turno per evitare problemi"
      })

    }else{

      insights.push({
        tone:"positivo",
        text:"Turno attivo, continua così"
      })

    }

  }

  // 👨‍💼 MANAGER
  if(ruolo === "manager"){

    const today = new Date().toISOString().slice(0,10)

    const { data } = await supabase
      .from("turni")
      .select("id")
      .eq("azienda_id", aziendaId)
      .eq("data", today)

    if(!data || data.length === 0){

      insights.push({
        tone:"correzione",
        text:"Nessun turno assegnato oggi"
      })

      insights.push({
        tone:"incitamento",
        text:"Assegna subito il personale"
      })

    }else{

      insights.push({
        tone:"positivo",
        text:"Turni sotto controllo"
      })

    }

  }

  renderTony(insights)

}


// =====================================
// RENDER TONY
// =====================================

function renderTony(insights){

  const container = document.getElementById("tony-container")
  if(!container) return

  if(!insights.length){
    container.innerHTML = ""
    return
  }

  container.innerHTML = `
    <div class="tony-box">
      <div class="tony-title">🤖 Tony operativo</div>

      ${insights.map(i => `
        <div class="tony-item ${i.tone}">
          ${getIcon(i.tone)} ${i.text}
        </div>
      `).join("")}

    </div>
  `
}

function getIcon(tone){
  if(tone==="correzione") return "⚠️"
  if(tone==="incitamento") return "🚀"
  if(tone==="positivo") return "✅"
  return "•"
}


// =====================================
// ROLE UI
// =====================================

function renderByRole(ruolo){

  if(ruolo === "operatore") return renderOperatore()
  if(ruolo === "manager") return renderManager()
  if(ruolo === "admin" || ruolo === "superadmin") return renderAdmin()

  return `<div>Ruolo non gestito</div>`
}


// =====================================
// UI RUOLI
// =====================================

function renderOperatore(){
  return `
    <div class="grid">
      <div class="card">
        <div class="card-title">Turno</div>
        <button class="btn" data-route="timbrature">Vai</button>
      </div>
    </div>
  `
}

function renderManager(){
  return `
    <div class="grid">
      <div class="card">
        <div class="card-title">Servizi</div>
        <button class="btn" data-route="servizi">Apri</button>
      </div>
    </div>
  `
}

function renderAdmin(){
  return `
    <div class="grid">
      <div class="card">
        <div class="card-title">KPI</div>
        <button class="btn" data-route="kpi">Apri</button>
      </div>
    </div>
  `
}


// =====================================
// EVENTS
// =====================================

function bindEvents(){

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

}
