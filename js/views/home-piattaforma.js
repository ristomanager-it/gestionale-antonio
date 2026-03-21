// js/views/home-piattaforma.js
// =======================================
// HOME PIATTAFORMA – SWITCH AZIENDA UI PRO
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
          <button id="btn-logout" class="logout">Esci</button>
        </div>
      </div>

      <!-- AZIENDA ATTIVA -->
      <div class="azienda-attiva">
        <div>
          <div class="label">Azienda attiva</div>
          <div class="title">${azienda?.nome || "Nessuna"}</div>
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
          </div>
          <div class="icon">➕</div>
        </div>

        <div class="card" data-route="gestioneAziende">
          <div>
            <div class="label">Clienti</div>
            <div class="title">Gestione Aziende</div>
          </div>
          <div class="icon">🏢</div>
        </div>

        <div class="card dark" id="enter-operativo">
          <div>
            <div class="label">Operatività</div>
            <div class="title">Entra nel gestionale</div>
          </div>
          <div class="icon">🧪</div>
        </div>

      </div>

      <!-- MODALE -->
      <div id="azienda-modal" class="modal hidden">
        <div class="modal-box">

          <div class="modal-header">
            <div>Seleziona Azienda</div>
            <button id="close-modal">✖</button>
          </div>

          <input 
            id="search-azienda"
            placeholder="Cerca azienda..."
            class="search"
          />

          <div id="azienda-list" class="list"></div>

        </div>
      </div>

    </div>

    <style>
      .piattaforma{padding:16px;}

      .header{
        display:flex;
        justify-content:space-between;
        margin-bottom:20px;
      }

      .sub{color:#6b7280;font-size:13px;}

      .azienda-attiva{
        display:flex;
        justify-content:space-between;
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
        border-radius:16px;
        display:flex;
        justify-content:space-between;
        cursor:pointer;
      }

      .card.dark{background:#111827;color:white;}

      .modal{
        position:fixed;
        top:0;
        left:0;
        width:100%;
        height:100%;
        background:rgba(0,0,0,0.4);
        display:flex;
        align-items:center;
        justify-content:center;
      }

      .hidden{display:none;}

      .modal-box{
        background:white;
        width:400px;
        max-height:80vh;
        border-radius:14px;
        padding:16px;
        overflow:auto;
      }

      .modal-header{
        display:flex;
        justify-content:space-between;
        margin-bottom:10px;
      }

      .search{
        width:100%;
        padding:10px;
        border-radius:8px;
        border:1px solid #ddd;
        margin-bottom:10px;
      }

      .list-item{
        padding:10px;
        border-bottom:1px solid #eee;
        cursor:pointer;
      }

      .list-item:hover{
        background:#f3f4f6;
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

  document.getElementById("btn-logout").onclick = async ()=>{
    await window.supabaseClient.auth.signOut()
    window.state = {}
    window.location.hash = "#/login"
  }

  document.getElementById("enter-operativo").onclick = ()=>{
    window.location.hash = "#/home"
  }

  document.getElementById("btn-switch-azienda").onclick = openModal
  document.getElementById("close-modal").onclick = closeModal

  document.getElementById("search-azienda").oninput = filterAziende

  loadAziende()

}


// =========================================
// MODAL
// =========================================

function openModal(){
  document.getElementById("azienda-modal").classList.remove("hidden")
}

function closeModal(){
  document.getElementById("azienda-modal").classList.add("hidden")
}


// =========================================
// LOAD AZIENDE
// =========================================

let aziendeCache = []

async function loadAziende(){

  const supabase = window.supabaseClient
  const user = window.state.user

  const { data } = await supabase
    .from("utenti_aziende")
    .select("azienda_id, aziende(nome)")
    .eq("user_id", user.id)

  aziendeCache = data || []

  renderLista(aziendeCache)

}


// =========================================
// RENDER LISTA
// =========================================

function renderLista(list){

  const container = document.getElementById("azienda-list")

  container.innerHTML = list.map(a => `
    <div class="list-item" data-id="${a.azienda_id}">
      ${a.aziende?.nome || "Senza nome"}
    </div>
  `).join("")

  container.querySelectorAll(".list-item").forEach(el=>{
    el.onclick = () => selectAzienda(el.dataset.id)
  })

}


// =========================================
// FILTER
// =========================================

function filterAziende(e){

  const q = e.target.value.toLowerCase()

  const filtered = aziendeCache.filter(a =>
    (a.aziende?.nome || "").toLowerCase().includes(q)
  )

  renderLista(filtered)

}


// =========================================
// SELECT AZIENDA
// =========================================

function selectAzienda(id){

  const azienda = aziendeCache.find(a => a.azienda_id === id)

  if(!azienda) return

  window.state.azienda = {
    id: azienda.azienda_id,
    nome: azienda.aziende?.nome
  }

  localStorage.setItem("azienda_attiva", JSON.stringify(window.state.azienda))

  window.location.reload()

}
