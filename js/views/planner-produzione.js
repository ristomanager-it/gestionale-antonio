let ricette = []
let reparti = []

let currentDate = new Date()
let repartoAttivoId = null

export async function render(container){

  const azienda = window.state.azienda
  const sede = window.state.sedeAttiva

  if(!azienda || !sede){
    container.innerHTML = `<div class="view">Errore azienda/sede</div>`
    return
  }

  await loadRicette()
  await loadReparti()

  container.innerHTML = `
    <div class="view">

      <h2>📅 Planning Produzione</h2>

      <div style="display:flex; gap:8px; margin-bottom:10px;">
        ${reparti.map(r => `
          <button onclick="setReparto('${r.id}')">${r.nome}</button>
        `).join("")}
      </div>

      <div style="display:flex; gap:8px; margin-bottom:10px;">
        <button onclick="prevWeek()">←</button>
        <button onclick="nextWeek()">→</button>
      </div>

      <div id="calendar"></div>

    </div>

    <style>
      .calendar{
        display:grid;
        grid-template-columns: repeat(7, 1fr);
        gap:10px;
      }

      .day{
        border:1px solid #ddd;
        border-radius:8px;
        padding:8px;
        min-height:140px;
      }

      .day-header{
        font-weight:bold;
        margin-bottom:6px;
      }

      .day-load{
        font-size:12px;
        margin-bottom:6px;
        color:#666;
      }

      .card-prod{
        padding:6px;
        border-radius:6px;
        margin-bottom:6px;
        cursor:grab;
        font-size:13px;
      }

      .stato-da_fare{ background:#f1f5f9; }
      .stato-in_corso{ background:#fde68a; }
      .stato-completato{ background:#bbf7d0; }

      .add-btn{
        margin-top:6px;
        font-size:12px;
        cursor:pointer;
        color:#2563eb;
      }
    </style>
  `

  renderWeek()
}


// =========================
// LOAD
// =========================

async function loadRicette(){
  const { data } = await window.supabaseClient
    .from("ricette")
    .select("id, nome")
    .eq("azienda_id", window.state.azienda.id)

  ricette = data || []
}

async function loadReparti(){
  const { data } = await window.supabaseClient
    .from("reparti")
    .select("*")
    .eq("azienda_id", window.state.azienda.id)

  reparti = data || []

  if(reparti.length && !repartoAttivoId){
    repartoAttivoId = reparti[0].id
  }
}


// =========================
// NAV
// =========================

window.setReparto = function(id){
  repartoAttivoId = id
  renderWeek()
}

window.prevWeek = function(){
  currentDate.setDate(currentDate.getDate() - 7)
  renderWeek()
}

window.nextWeek = function(){
  currentDate.setDate(currentDate.getDate() + 7)
  renderWeek()
}


// =========================
// RENDER WEEK
// =========================

async function renderWeek(){

  const supabase = window.supabaseClient
  const azienda = window.state.azienda
  const sede = window.state.sedeAttiva

  const start = new Date(currentDate)
  start.setDate(start.getDate() - start.getDay())

  const days = []

  for(let i=0;i<7;i++){
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }

  const startStr = days[0].toISOString().slice(0,10)
  const endStr = days[6].toISOString().slice(0,10)

  const { data } = await supabase
    .from("produzioni_settimanali")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("sede_id", sede.id)
    .eq("reparto_id", repartoAttivoId)
    .gte("data", startStr)
    .lte("data", endStr)

  const righe = data || []

  document.getElementById("calendar").innerHTML = `
    <div class="calendar">
      ${days.map(day => renderDay(day, righe)).join("")}
    </div>
  `

  bindEvents(righe)
}


// =========================
// DAY
// =========================

function renderDay(day, righe){

  const dateStr = day.toISOString().slice(0,10)

  const items = righe.filter(r => r.data === dateStr)

  const totaleMinuti = items.reduce((sum, r) => {
    return sum + (r.tempo_stimato_minuti || 0)
  }, 0)

  return `
    <div class="day" data-date="${dateStr}">

      <div class="day-header">
        ${day.toLocaleDateString()}
      </div>

      <div class="day-load">
        ⏱ ${totaleMinuti} min
      </div>

      ${items.map(r => `
        <div 
          class="card-prod stato-${r.stato}" 
          draggable="true"
          data-id="${r.id}"
        >
          ${r.prodotto || "—"} (${r.quantita})
        </div>
      `).join("")}

      <div class="add-btn" data-date="${dateStr}">
        + aggiungi
      </div>

    </div>
  `
}


// =========================
// EVENTS
// =========================

function bindEvents(righe){

  // DRAG START
  document.querySelectorAll(".card-prod").forEach(card => {
    card.ondragstart = e => {
      e.dataTransfer.setData("id", card.dataset.id)
    }
  })

  // DROP
  document.querySelectorAll(".day").forEach(day => {

    day.ondragover = e => e.preventDefault()

    day.ondrop = async e => {
      e.preventDefault()

      const id = e.dataTransfer.getData("id")
      const newDate = day.dataset.date

      await window.supabaseClient
        .from("produzioni_settimanali")
        .update({ data: newDate })
        .eq("id", id)

      renderWeek()
    }

  })

  // ADD
  document.querySelectorAll(".add-btn").forEach(btn => {

    btn.onclick = () => {
      openCreate(btn.dataset.date)
    }

  })

  // OPEN
  document.querySelectorAll(".card-prod").forEach(card => {

    card.onclick = () => {
      const id = card.dataset.id
      window.location.hash = `#/preparazioni?planner_id=${id}`
    }

  })

}


// =========================
// CREATE
// =========================

function openCreate(date){

  document.getElementById("calendar").innerHTML = `
    <div class="view">

      <h3>Nuova Produzione</h3>

      <input id="prodotto" placeholder="Prodotto">
      <input id="quantita" type="number" value="1">

      <select id="ricetta">
        <option value="">Ricetta</option>
        ${ricette.map(r => `
          <option value="${r.id}">${r.nome}</option>
        `).join("")}
      </select>

      <button onclick="saveProduzione('${date}')">
        Salva
      </button>

      <button onclick="renderWeek()">
        Annulla
      </button>

    </div>
  `
}


// =========================
// SAVE
// =========================

window.saveProduzione = async function(date){

  const azienda = window.state.azienda
  const sede = window.state.sedeAttiva

  const prodotto = document.getElementById("prodotto").value
  const quantita = Number(document.getElementById("quantita").value)
  const ricetta_id = document.getElementById("ricetta").value || null

  await window.supabaseClient
    .from("produzioni_settimanali")
    .insert({
      azienda_id: azienda.id,
      sede_id: sede.id,
      reparto_id: repartoAttivoId,
      data: date,
      prodotto,
      quantita,
      ricetta_id
    })

  renderWeek()
}
