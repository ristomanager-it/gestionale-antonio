// js/views/home-piattaforma.js
// =======================================
// HOME PIATTAFORMA – SUPERADMIN (DEFINITIVA)
// =======================================

export async function render(container) {

  const user = window.state.user;
  const azienda = window.state.azienda;
  const ruolo = window.state?.ruolo;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view piattaforma">

      <!-- HEADER -->
      <div class="header">

        <div>
          <h2>Ristoflow – Piattaforma</h2>
          <p class="sub">Controllo SaaS e gestione aziende</p>
        </div>

        <div class="header-actions">

          ${ruolo === "superadmin" ? `
          <div class="view-switch">
            <button id="view-admin" class="active">Admin</button>
            <button id="view-manager">Manager</button>
            <button id="view-operatore">Operatore</button>
          </div>
          ` : ""}

          <button id="btn-logout" class="logout">Esci</button>

        </div>

      </div>

      <!-- GRID -->
      <div class="grid">

        <!-- CREA AZIENDA -->
        <div class="card" data-route="creaAzienda">
          <div>
            <div class="label">Provisioning</div>
            <div class="title">Crea Azienda</div>
            <div class="desc">Nuovo cliente + admin</div>
          </div>
          <div class="icon">➕</div>
        </div>

        <!-- GESTIONE AZIENDE -->
        <div class="card" data-route="gestioneAziende">
          <div>
            <div class="label">Clienti</div>
            <div class="title">Gestione Aziende</div>
            <div class="desc">Stato, scadenze, sospensioni</div>
          </div>
          <div class="icon">🏢</div>
        </div>

        <!-- PIANI -->
        <div class="card" data-route="gestionePiani">
          <div>
            <div class="label">SaaS</div>
            <div class="title">Gestione Piani</div>
            <div class="desc">Prezzi, feature, limiti</div>
          </div>
          <div class="icon">🧩</div>
        </div>

        <!-- SWITCH OPERATIVO -->
        <div class="card dark" id="enter-operativo">
          <div>
            <div class="label">Operatività</div>
            <div class="title">Entra nel gestionale</div>
            <div class="desc">Usa azienda attiva</div>
          </div>
          <div class="icon">🧪</div>
        </div>

        <!-- SWITCH AZIENDA -->
        <div class="card" id="switch-azienda">
          <div>
            <div class="label">Contesto</div>
            <div class="title">Cambia Azienda</div>
            <div class="desc">Seleziona azienda attiva</div>
          </div>
          <div class="icon">🔁</div>
        </div>

        <!-- TONY -->
        <div class="card blue" id="tony-piattaforma">
          <div>
            <div class="label">AI Manager</div>
            <div class="title">Tony Piattaforma</div>
            <div class="desc">Insight su clienti e sistema</div>
          </div>
          <div class="icon">🤖</div>
        </div>

      </div>

      <!-- TONY OUTPUT -->
      <div id="tony-output" class="tony-box"></div>

    </div>

    <style>
      .piattaforma{padding:16px;}
      .header{display:flex;justify-content:space-between;flex-wrap:wrap;margin-bottom:20px;}
      .sub{color:#6b7280;font-size:13px;}
      .header-actions{display:flex;gap:10px;align-items:center;}

      .view-switch{
        display:flex;
        background:#f3f4f6;
        padding:6px;
        border-radius:10px;
      }

      .view-switch button{
        border:none;
        padding:6px 10px;
        cursor:pointer;
        background:transparent;
      }

      .view-switch .active{
        background:white;
        border-radius:6px;
      }

      .logout{
        background:#ef4444;
        color:white;
        border:none;
        padding:8px 12px;
        border-radius:8px;
        cursor:pointer;
      }

      .grid{
        display:grid;
        gap:16px;
        grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
      }

      .card{
        background:white;
        padding:20px;
        border-radius:18px;
        cursor:pointer;
        display:flex;
        justify-content:space-between;
        box-shadow:0 8px 20px rgba(0,0,0,0.05);
        transition:0.2s;
      }

      .card:hover{transform:translateY(-5px);}

      .card.dark{background:#111827;color:white;}
      .card.blue{background:#0ea5e9;color:white;}

      .label{font-size:13px;opacity:0.7;}
      .title{font-weight:700;margin-top:6px;}
      .desc{font-size:13px;margin-top:6px;opacity:0.7;}

      .icon{font-size:26px;}

      .tony-box{
        margin-top:20px;
        background:white;
        border-radius:14px;
        padding:16px;
      }
    </style>
  `;

  bindEvents();

}


// =========================================
// EVENTS
// =========================================

function bindEvents(){

  // NAV CARDS
  document.querySelectorAll(".card[data-route]").forEach(card=>{
    card.onclick=()=>{
      window.location.hash = "#/" + card.dataset.route
    }
  })

  // LOGOUT
  document.getElementById("btn-logout")?.addEventListener("click", async ()=>{
    await window.supabaseClient.auth.signOut()
    window.state = {}
    window.location.hash = "#/login"
  })

  // VIEW SWITCH
  bindView("view-admin","admin")
  bindView("view-manager","manager")
  bindView("view-operatore","operatore")

  // ENTER OPERATIVO
  document.getElementById("enter-operativo")?.addEventListener("click", ()=>{
    window.location.hash = "#/home"
  })

  // SWITCH AZIENDA (base)
  document.getElementById("switch-azienda")?.addEventListener("click", async ()=>{
    alert("Qui inseriremo selezione aziende (step successivo)")
  })

  // TONY
  document.getElementById("tony-piattaforma")?.addEventListener("click", runTony)

}


// =========================================
// VIEW SWITCH
// =========================================

function bindView(id, ruolo){
  const el = document.getElementById(id)
  if(!el) return

  el.onclick=()=>{
    window.state.viewAs = ruolo
    window.location.hash = "#/home"
  }
}


// =========================================
// TONY PIATTAFORMA
// =========================================

async function runTony(){

  const output = document.getElementById("tony-output")

  output.innerHTML = "Tony sta analizzando..."

  try{

    const { data, error } = await window.supabaseClient.functions.invoke(
      "assistente-ai-piattaforma",
      {
        body: {
          azienda_id: window.state.azienda.id,
          azienda: window.state.azienda.nome,
          ruolo: "superadmin",
          messages:[
            { role:"user", content:"Dammi analisi SaaS, clienti, problemi e opportunità" }
          ]
        }
      }
    )

    if(error) throw error

    output.innerHTML = formatTony(data?.reply)

  }catch(e){
    console.error(e)
    output.innerHTML = "Errore Tony"
  }

}


// =========================================
// FORMAT TONY
// =========================================

function formatTony(text){

  if(!text) return "Nessun dato"

  return text.split("\n").map(l=>`<div>• ${l}</div>`).join("")
}
