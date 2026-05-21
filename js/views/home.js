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

      ${await renderFooter()}

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

      .home-header{margin-bottom:16px;}

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
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:8px;
        font-size:14px;
      }

      .tony-item.correzione{color:#dc2626;font-weight:600;}
      .tony-item.incitamento{color:#2563eb;}
      .tony-item.positivo{color:#16a34a;}

      .tony-action{
        background:#111827;
        color:white;
        border:none;
        padding:6px 10px;
        border-radius:6px;
        cursor:pointer;
        font-size:12px;
      }

      .grid{display:grid;gap:12px;}

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
      .footer-icon{font-size:18px;position:relative;}
      .badge{
        position:absolute;
        width:8px;
        height:8px;
        background:#dc2626;
        border-radius:50%;
        margin-left:2px;
      }
    </style>
  `

  bindEvents()
  initFooter()
  loadTony(ruolo)

  // ✅ FIX CRITICO
  await loadProduzioniHome()
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
// TONY
// =====================================

async function loadTony(ruolo){

  const supabase = window.supabaseClient
  const aziendaId = window.state?.azienda?.id

  if(!aziendaId) return

  let insights = []
  const today = new Date().toISOString().slice(0,10)
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = tomorrowDate.toISOString().slice(0,10)

  if(ruolo === "operatore"){

    const { data } = await supabase
      .from("timbrature")
      .select("id")
      .eq("azienda_id", aziendaId)
     const dipendenteId =
  window.state?.dipendente?.id ||
  null;

if (!dipendenteId) {
  return;
}

.eq("dipendente_id", dipendenteId)
      .gte("timestamp", `${today}T00:00:00`)
      .lt("timestamp", `${tomorrow}T00:00:00`)

    if(!data || data.length === 0){

      insights.push({
        tone:"correzione",
        text:"Non hai ancora timbrato il turno",
        action:"timbrature",
        actionLabel:"Timbra ora"
      })

      insights.push({
        tone:"incitamento",
        text:"Inizia subito il turno",
        action:"timbrature"
      })

    }else{

      insights.push({
        tone:"positivo",
        text:"Turno attivo, continua così"
      })

    }

  }

  if(ruolo === "manager"){

    const { data } = await supabase
      .from("turni")
      .select("id")
      .eq("azienda_id", aziendaId)
      .eq("data", today)

    if(!data || data.length === 0){

      insights.push({
        tone:"correzione",
        text:"Nessun turno assegnato oggi",
        action:"turni",
        actionLabel:"Assegna turni"
      })

      insights.push({
        tone:"incitamento",
        text:"Organizza il personale ora",
        action:"dipendenti"
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
          ${i.action ? `
            <button class="tony-action" data-action="${i.action}">
              ${i.actionLabel || "Apri"}
            </button>
          ` : ""}
        </div>
      `).join("")}
    </div>
  `

  bindTonyActions()
}

function getIcon(tone){
  if(tone==="correzione") return "⚠️"
  if(tone==="incitamento") return "🚀"
  if(tone==="positivo") return "✅"
  return "•"
}

function bindTonyActions(){
  document.querySelectorAll(".tony-action").forEach(btn => {
    btn.onclick = () => {
      const route = btn.dataset.action
      if(window.router?.go){
        window.router.go(route)
      }else{
        window.location.hash = "#/" + route
      }
    }
  })
}


// =====================================
// ROLE UI
// =====================================

function renderByRole(ruolo){
  return `
    <div class="grid">

      <div class="card">
        <div class="card-title">👨‍🍳 Oggi</div>
        <div id="oggi-list">Caricamento...</div>
      </div>

      <div class="card">
        <div class="card-title">📅 Settimana</div>
        <div id="settimana-list">Caricamento...</div>
      </div>

      <div class="card">
        <div class="card-title">Planning</div>
        <button class="btn" data-route="planner-produzione">
          Apri planner
        </button>
      </div>

    </div>
  `
}


// =====================================
// PRODUZIONI (FIX)
// =====================================

async function loadProduzioniHome(){

  const oggiEl = document.getElementById("oggi-list")
  const settimanaEl = document.getElementById("settimana-list")

  if (!oggiEl || !settimanaEl) {
    console.warn("DOM non pronto per produzioni home")
    return
  }

  const supabase = window.supabaseClient
  const userId = window.state.user.id

  const today = new Date().toISOString().slice(0,10)

  const start = new Date()
  start.setDate(start.getDate() - start.getDay())

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const { data: oggi } = await supabase
    .from("produzioni_settimanali")
    .select("*")
    .eq("dipendente_id", userId)
    .eq("data", today)

  const { data: settimana } = await supabase
    .from("produzioni_settimanali")
    .select("*")
    .eq("dipendente_id", userId)
    .gte("data", start.toISOString().slice(0,10))
    .lte("data", end.toISOString().slice(0,10))

  oggiEl.innerHTML =
    (oggi || []).length === 0
      ? "Nessuna lavorazione"
      : oggi.map(r => `
          <div>${r.prodotto} (${r.quantita})</div>
        `).join("")

  settimanaEl.innerHTML =
    (settimana || []).map(r => `
      <div>${r.data} - ${r.prodotto}</div>
    `).join("")
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
