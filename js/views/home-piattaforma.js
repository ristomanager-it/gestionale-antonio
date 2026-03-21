// js/views/home-piattaforma.js
// =======================================
// HOME PIATTAFORMA – SUPERADMIN + SWITCH AZIENDA
// =======================================

export async function render(container) {

  const user = window.state.user;
  const azienda = window.state.azienda;
  const ruolo = window.state?.ruolo;

  if (!user) {
    container.innerHTML = `<div class="view">Errore caricamento</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view piattaforma">

      <!-- HEADER -->
      <div class="header">

        <div>
          <h2>Ristoflow – Piattaforma</h2>
          <p class="sub">Gestione SaaS e aziende</p>
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

      <!-- AZIENDA ATTIVA -->
      <div class="azienda-attiva">
        <div>
          <div class="label">Azienda attiva</div>
          <div class="title">${azienda?.nome || "Nessuna selezionata"}</div>
        </div>

        <button id="btn-switch-azienda" class="switch-btn">
          Cambia
        </button>
      </div>

      <!-- GRID -->
      <div class="grid">

        <div class="card" data-route="creaAzienda">
          <div>
            <div class="label">Provisioning</div>
            <div class="title">Crea Azienda</div>
            <div class="desc">Nuovo cliente</div>
          </div>
          <div class="icon">➕</div>
        </div>

        <div class="card" data-route="gestioneAziende">
          <div>
            <div class="label">Clienti</div>
            <div class="title">Gestione Aziende</div>
            <div class="desc">Controllo completo</div>
          </div>
          <div class="icon">🏢</div>
        </div>

        <div class="card" data-route="gestionePiani">
          <div>
            <div class="label">SaaS</div>
            <div class="title">Piani</div>
            <div class="desc">Abbonamenti</div>
          </div>
          <div class="icon">🧩</div>
        </div>

        <div class="card dark" id="enter-operativo">
          <div>
            <div class="label">Operatività</div>
            <div class="title">Entra nel gestionale</div>
          </div>
          <div class="icon">🧪</div>
        </div>

        <div class="card blue" id="tony">
          <div>
            <div class="label">AI</div>
            <div class="title">Tony SaaS</div>
          </div>
          <div class="icon">🤖</div>
        </div>

      </div>

      <!-- TONY OUTPUT -->
      <div id="tony-output" class="tony-box"></div>

    </div>

    <style>
      .piattaforma{padding:16px;}
      .header{display:flex;justify-content:space-between;margin-bottom:20px;}
      .sub{color:#6b7280;font-size:13px;}

      .azienda-attiva{
        display:flex;
        justify-content:space-between;
        align-items:center;
        background:white;
        padding:14px;
        border-radius:12px;
        margin-bottom:16px;
      }

      .switch-btn{
        background:#111827;
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
      }

      .card.dark{background:#111827;color:white;}
      .card.blue{background:#0ea5e9;color:white;}

      .label{font-size:12px;opacity:0.7;}
      .title{font-weight:700;margin-top:6px;}
      .desc{font-size:12px;opacity:0.7;}

      .icon{font-size:24px;}

      .tony-box{
        margin-top:20px;
        background:white;
        padding:14px;
        border-radius:12px;
      }
    </style>
  `;

  bindEvents();

}


// =========================================
// EVENTS
// =========================================

function bindEvents(){

  document.querySelectorAll(".card[data-route]").forEach(card=>{
    card.onclick=()=>{
      window.location.hash = "#/" + card.dataset.route
    }
  })

  document.getElementById("btn-logout")?.onclick = async ()=>{
    await window.supabaseClient.auth.signOut()
    window.state = {}
    window.location.hash = "#/login"
  }

  bindView("view-admin","admin")
  bindView("view-manager","manager")
  bindView("view-operatore","operatore")

  document.getElementById("enter-operativo")?.onclick = ()=>{
    window.location.hash = "#/home"
  }

  document.getElementById("btn-switch-azienda")?.onclick = openAziendaSelector

  document.getElementById("tony")?.onclick = runTony

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
// SWITCH AZIENDA REALE
// =========================================

async function openAziendaSelector(){

  const supabase = window.supabaseClient
  const user = window.state.user

  const { data, error } = await supabase
    .from("utenti_aziende")
    .select("azienda_id, aziende(nome)")
    .eq("user_id", user.id)

  if(error){
    alert("Errore caricamento aziende")
    return
  }

  const list = data || []

  const scelta = prompt(
    "Seleziona azienda:\n\n" +
    list.map((a,i)=> `${i+1}. ${a.aziende?.nome}`).join("\n")
  )

  const index = parseInt(scelta) - 1

  if(!list[index]) return

  const selected = list[index]

  // 🔥 CAMBIO CONTESTO
  window.state.azienda = {
    id: selected.azienda_id,
    nome: selected.aziende?.nome
  }

  // 🔥 RICARICA APP
  window.location.reload()
}


// =========================================
// TONY
// =========================================

async function runTony(){

  const box = document.getElementById("tony-output")

  box.innerHTML = "Tony sta analizzando..."

  try{

    const { data } = await window.supabaseClient.functions.invoke(
      "assistente-ai-piattaforma",
      {
        body:{
          azienda_id: window.state.azienda.id,
          messages:[{role:"user",content:"Analisi SaaS"}]
        }
      }
    )

    box.innerHTML = (data?.reply || "Nessun dato")
      .split("\n")
      .map(l=>`<div>• ${l}</div>`)
      .join("")

  }catch{
    box.innerHTML = "Errore Tony"
  }

}
