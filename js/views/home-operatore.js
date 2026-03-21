import { renderFooter, initFooter } from "../components/footer.js"

export async function render(container){

const supabase = window.supabaseClient
const azienda = window.state?.azienda

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

.operatore-home-new{
padding-bottom:90px;
}

.task{
font-size:14px;
padding:8px 0;
cursor:pointer;
}

/* 🔥 FIX CLICK FEEDBACK */
.task:active{
opacity:0.6;
transform:scale(0.98);
}

.stato-card{
background:#f0f9ff;
}

.tony-card{
background:#eef2ff;
}

.tony-message{
margin-top:6px;
font-size:14px;
}

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

.tony-input-wrap{
margin-top:10px;
}

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
