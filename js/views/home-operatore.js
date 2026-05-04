import { renderFooter, initFooter } from "../components/footer.js"

export async function render(container){

const supabase = window.supabaseClient
const azienda = window.state?.azienda
const user = window.state?.user

if (!window.state?.sedeAttiva) {
  window.location.hash = "#/prehome-sedi"
  return
}

const today = new Date().toISOString().slice(0,10)

let servizioOggi = null

try{
  const { data } = await supabase
    .from("servizi")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("data_servizio", today)
    .limit(1)

  servizioOggi = data?.[0] || null

}catch(e){}

const statoServizio = servizioOggi?.tipo_servizio
  ? servizioOggi.tipo_servizio
  : "⚠️ Nessun servizio configurato"

container.innerHTML = `

<div id="subheader-timbratura"></div>

<div class="view operatore-home-new">

  <div class="card stato-card">
    <div class="card-title">📅 Oggi</div>
    <div class="card-sub">${statoServizio}</div>
  </div>

  <div class="card">
    <div class="card-title">📋 Cosa devi fare</div>
    ${renderTasks(servizioOggi)}
  </div>

  <div class="card tony-card">

    <div class="card-title">🤖 Tony</div>

    <div class="tony-message">
      ${getTonyMessage(servizioOggi)}
    </div>

    <div class="tony-actions">
      ${getTonyActions(servizioOggi).map(a=>`
        <button class="tony-btn" data-route="${a.route}">
          ${a.label}
        </button>
      `).join("")}
    </div>

    <div class="tony-input-wrap">
      <input id="tony-input" placeholder="Chiedi a Tony..." />
    </div>

  </div>

</div>

<style>
.operatore-home-new{ padding-bottom:90px; }

.timbratura-bar{
  position:sticky;
  top:0;
  z-index:10;
  background:white;
  padding:10px;
  display:flex;
  gap:8px;
  border-bottom:1px solid #eee;
}

.tb-btn{
  flex:1;
  border:none;
  padding:12px;
  border-radius:10px;
  color:white;
  font-weight:600;
  cursor:pointer;
}

.tb-btn.green{ background:#16a34a; }
.tb-btn.gray{ background:#6b7280; }
.tb-btn.red{ background:#dc2626; }

.task{ font-size:14px; padding:8px 0; cursor:pointer; }
.task:active{ opacity:0.6; transform:scale(0.98); }

.stato-card{ background:#f0f9ff; }
.tony-card{ background:#eef2ff; }

.tony-message{ margin-top:6px; font-size:14px; }

.tony-actions{
  margin-top:10px;
  display:flex;
  gap:6px;
  flex-wrap:wrap;
}

.tony-btn{
  background:#0E5A7A;
  color:white;
  border:none;
  padding:6px 10px;
  border-radius:10px;
  font-size:12px;
  cursor:pointer;
}

.tony-input-wrap{ margin-top:10px; }

.tony-input-wrap input{
  width:100%;
  padding:8px;
  border-radius:10px;
  border:1px solid #ddd;
}
</style>
`

container.innerHTML += renderFooter()

initFooter()
initTasks()
initTony()
renderTimbraturaBar()

}

// =========================
// TIMBRATURA REAL
// =========================

async function renderTimbraturaBar(){

  const el = document.getElementById("subheader-timbratura")
  if(!el) return

  const supabase = window.supabaseClient
  const aziendaId = window.state?.azienda?.id
  const userId = window.state?.user?.id
  const today = new Date().toISOString().slice(0,10)

  let stato = "none"

  try{
    const { data } = await supabase
      .from("timbrature")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("user_id", userId)
      .eq("data", today)
      .order("created_at", { ascending: false })
      .limit(1)

    const last = data?.[0]

    if(last){
      if(last.tipo === "entrata") stato = "in"
      if(last.tipo === "pausa") stato = "pausa"
      if(last.tipo === "fine") stato = "out"
    }

  }catch(e){}

  el.innerHTML = getTimbraturaUI(stato)

  el.querySelectorAll(".tb-btn").forEach(btn=>{
    btn.onclick = async ()=>{
      const action = btn.dataset.action

      try{
        await supabase.from("timbrature").insert({
          azienda_id: aziendaId,
          user_id: userId,
          data: today,
          tipo: action
        })

        renderTimbraturaBar()

      }catch(e){
        alert("Errore timbratura")
      }
    }
  })
}

function getTimbraturaUI(stato){

  if(stato === "none"){
    return `
      <div class="timbratura-bar">
        <button class="tb-btn green" data-action="entrata">Inizia turno</button>
      </div>
    `
  }

  if(stato === "in"){
    return `
      <div class="timbratura-bar">
        <button class="tb-btn gray" data-action="pausa">Pausa</button>
        <button class="tb-btn red" data-action="fine">Fine turno</button>
      </div>
    `
  }

  if(stato === "pausa"){
    return `
      <div class="timbratura-bar">
        <button class="tb-btn green" data-action="entrata">Riprendi</button>
        <button class="tb-btn red" data-action="fine">Fine turno</button>
      </div>
    `
  }

  return `
    <div class="timbratura-bar">
      <button class="tb-btn green" data-action="entrata">Nuovo turno</button>
    </div>
  `
}

// =========================
// NAV
// =========================

function go(route){
if(window.router?.go){
  window.router.go(route)
}else{
  window.location.hash = "#/" + route
}
}

// =========================
// TASK
// =========================

function renderTasks(servizio){

const tasks = []

tasks.push({label:"⏱ Timbra ingresso", route:"timbrature"})

if(servizio){
  tasks.push({label:"🍳 Controlla preparazioni", route:"produzione"})
  tasks.push({label:"🍽 Vai al servizio", route:"servizi"})
}else{
  tasks.push({label:"⚠️ Nessun servizio pianificato", route:"calendario"})
}

return tasks.map(t=>`
  <div class="task" data-route="${t.route}">
    ${t.label}
  </div>
`).join("")

}

function initTasks(){
document.querySelectorAll(".task").forEach(el=>{
  el.onclick = ()=>{
    const route = el.dataset.route
    if(route) go(route)
  }
})
}

// =========================
// TONY
// =========================

function getTonyMessage(servizio){

if(!servizio){
  return "Non vedo servizi oggi. Verifica con il responsabile."
}

return `Oggi hai ${servizio.tipo_servizio}. Inizia dalle preparazioni.`

}

function getTonyActions(servizio){

if(!servizio){
  return [
    {label:"Apri calendario", route:"calendario"}
  ]
}

return [
  {label:"Preparazioni", route:"produzione"},
  {label:"Servizio", route:"servizi"}
]

}

function initTony(){

document.querySelectorAll(".tony-btn").forEach(btn=>{
  btn.onclick = ()=>{
    const route = btn.dataset.route
    if(route) go(route)
  }
})

const input = document.getElementById("tony-input")

if(input){
  input.addEventListener("keydown",(e)=>{
    if(e.key === "Enter"){
      alert("Tony sta imparando 😉")
      input.value = ""
    }
  })
}

}
