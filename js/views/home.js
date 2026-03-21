import { getTonyInsights } from "../ai/tony-service.js"

export async function render(container) {

  container.innerHTML = `
    <div class="home">

      <div id="home-header"></div>

      <div id="home-tony"></div>

      <div id="home-main"></div>

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

      .item{
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
  renderMain()

  loadTonyAsync()
}


// =======================================
// HEADER (SALUTO + DATA)
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
    msg = "Controlla servizio, turni e personale"
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
// MAIN LOGICA RUOLI
// =======================================

function renderMain(){

  const ruolo = window.state?.ruolo
  const box = document.getElementById("home-main")

  // 👨‍💼 MANAGER
  if(ruolo === "manager"){

    box.innerHTML = `
      <div class="card">
        <b>Operatività</b>

        <div class="item" onclick="location.hash='#/dipendenti'">
          Gestione personale
        </div>

        <div class="item" onclick="location.hash='#/turni'">
          Turni
        </div>

        <div class="item" onclick="location.hash='#/prenotazioni'">
          Prenotazioni
        </div>

        <div class="item" onclick="location.hash='#/produzione'">
          Produzione
        </div>

      </div>
    `
    return
  }

  // 👑 ADMIN
  if(ruolo === "admin" || ruolo === "superadmin"){

    box.innerHTML = `
      <div class="card">
        <b>Controllo economico</b>

        <div>Margine: € 320</div>
        <div>Costi: € 880</div>
        <div>Vendite: € 1.200</div>

      </div>

      <div class="card">
        <b>Azioni</b>

        <div class="item" onclick="location.hash='#/fatture'">
          Fatture
        </div>

        <div class="item" onclick="location.hash='#/acquisti'">
          Acquisti
        </div>

        <div class="item" onclick="location.hash='#/dipendenti'">
          Dipendenti
        </div>

      </div>
    `
    return
  }

  // 👤 OPERATORE
  if(ruolo === "operatore"){

    box.innerHTML = `
      <div class="card">
        <b>Operatività</b>

        <div class="item" onclick="location.hash='#/produzione'">
          Produzione
        </div>

        <div class="item" onclick="location.hash='#/timbratura'">
          Timbratura
        </div>

      </div>
    `
    return
  }

}
