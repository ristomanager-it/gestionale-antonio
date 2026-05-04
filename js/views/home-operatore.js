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

// =========================
// TIMBRATURA
// =========================

let stato = "none"

try{
  const { data } = await supabase
    .from("timbrature")
    .select("tipo, timestamp")
    .eq("azienda_id", azienda.id)
    .eq("dipendente_id", user.id)
    .order("timestamp", { ascending:false })
    .limit(1)

  const last = data?.[0]

  if(last){
    if(last.tipo === "inizio_turno" || last.tipo === "fine_pausa") stato = "in"
    if(last.tipo === "inizio_pausa") stato = "pausa"
    if(last.tipo === "fine_turno") stato = "out"
  }

}catch(e){}

// =========================
// SERVIZIO
// =========================

let servizio = null

try{
  const { data } = await supabase
    .from("servizi")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("data_servizio", today)
    .limit(1)

  servizio = data?.[0] || null

}catch(e){}

// =========================
// LABELS
// =========================

const statoLabel = {
  in: "🟢 In turno",
  pausa: "🟡 In pausa",
  out: "🔴 Turno chiuso",
  none: "⚪ Non timbrato"
}[stato]

const servizioLabel = servizio?.tipo_servizio || "Nessun servizio"

// =========================
// RENDER
// =========================

container.innerHTML = `

<div class="view operatore-home">

  <!-- ⏱ STATO -->
  <div class="card stato-card">
    <div class="card-title">⏱ Stato</div>
    <div class="big">${statoLabel}</div>
  </div>

  <!-- 📅 SERVIZIO -->
  <div class="card">
    <div class="card-title">📅 Oggi</div>
    <div class="big">${servizioLabel}</div>
  </div>

  <!-- ⚡ AZIONI -->
  <div class="grid">

    <div class="card action" data-route="timbrature">
      <div class="card-title">Timbratura</div>
      <div class="card-sub">Entrata / pausa</div>
    </div>

    <div class="card action" data-route="planning-lavoro">
      <div class="card-title">Planning</div>
      <div class="card-sub">Turni</div>
    </div>

    <div class="card action" data-route="prenotazioni">
      <div class="card-title">Prenotazioni</div>
      <div class="card-sub">Servizio</div>
    </div>

  </div>

</div>

<style>

.operatore-home{ padding-bottom:90px; }

.big{
  font-size:20px;
  font-weight:800;
  margin-top:6px;
}

.grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  margin-top:10px;
}

.card{
  background:white;
  padding:14px;
  border-radius:12px;
  box-shadow:0 3px 8px rgba(0,0,0,0.05);
}

.card-title{
  font-weight:700;
}

.card-sub{
  font-size:12px;
  color:#6b7280;
}

.stato-card{
  background:#f0f9ff;
}

.action:active{
  transform:scale(0.97);
  opacity:0.7;
}

</style>
`

container.innerHTML += renderFooter()

initFooter()
initActions()

}

// =========================
// CLICK
// =========================

function initActions(){
  document.querySelectorAll(".action").forEach(el=>{
    el.onclick = ()=>{
      const route = el.dataset.route
      if(route){
        window.location.hash = "#/" + route
      }
    }
  })
}
