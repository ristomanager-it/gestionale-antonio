let ricette = []
let dipendenti = []
let reparti = []
let viewMode = "week"
let currentDate = new Date()
let repartoAttivoId = null

export async function render(container){

  const supabase = window.supabaseClient
  const azienda = window.state.azienda
  const sedeObj = window.state.sedeAttiva

  const sedeId = sedeObj?.id || sedeObj

  if(!azienda || !sedeId){
    container.innerHTML = `<div class="view">Errore dati azienda/sede</div>`
    return
  }

  await loadRicette()
  await loadReparti()
  await loadDipendenti()

  container.innerHTML = `
    <div class="view">

      <h2>📅 Planner Produzione</h2>

      <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
        <button onclick="setView('day')">Day</button>
        <button onclick="setView('week')">Week</button>
        <button onclick="setView('month')">Month</button>
      </div>

      <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
        ${reparti.map(r => `
          <button onclick="setReparto('${r.id}')">
            ${r.nome}
          </button>
        `).join("")}
      </div>

      <div style="margin-bottom:12px;">
        <button id="add" class="app-button primary">
          ➕ Nuova Produzione
        </button>
      </div>

      <div id="planner-content"></div>

    </div>
  `

  document.getElementById("add").onclick = createRow

  renderPlanner()
}


// =========================
// LOAD DATI
// =========================

async function loadRicette(){
  const { data } = await window.supabaseClient
    .from("ricette")
    .select("id, nome")
    .eq("azienda_id", window.state.azienda.id)
    .eq("attivo", true)
    .order("nome")

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

async function loadDipendenti(){

  if(!repartoAttivoId){
    dipendenti = []
    return
  }

  const { data } = await window.supabaseClient
    .from("dipendenti")
    .select("id, nome, cognome")
    .eq("azienda_id", window.state.azienda.id)
    .eq("sede_id", window.state.sedeAttiva.id)
    .eq("reparto_id", repartoAttivoId)

  dipendenti = data || []
}


// =========================
// VIEW SWITCH
// =========================

window.setView = function(mode){
  viewMode = mode
  renderPlanner()
}

window.setReparto = async function(id){
  repartoAttivoId = id
  await loadDipendenti()
  renderPlanner()
}


// =========================
// RENDER PLANNER
// =========================

async function renderPlanner(){

  const supabase = window.supabaseClient
  const azienda = window.state.azienda
  const sedeId = window.state.sedeAttiva.id

  if(!repartoAttivoId){
    document.getElementById("planner-content").innerHTML = "Seleziona reparto"
    return
  }

  const { data } = await supabase
    .from("produzioni_settimanali")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("sede_id", sedeId)
    .eq("reparto_id", repartoAttivoId)
    .order("data")

  const righe = data || []

  if(viewMode === "day"){
    renderDay(righe)
  }

  if(viewMode === "week"){
    renderWeek(righe)
  }

  if(viewMode === "month"){
    renderMonth(righe)
  }
}


// =========================
// DAY VIEW
// =========================

function renderDay(righe){

  const today = new Date().toISOString().slice(0,10)

  const filtered = righe.filter(r => r.data === today)

  renderList(filtered)
}


// =========================
// WEEK VIEW
// =========================

function renderWeek(righe){

  const start = new Date(currentDate)
  start.setDate(start.getDate() - start.getDay())

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const filtered = righe.filter(r => {
    const d = new Date(r.data)
    return d >= start && d <= end
  })

  renderList(filtered)
}


// =========================
// MONTH VIEW
// =========================

function renderMonth(righe){

  const month = currentDate.getMonth()
  const year = currentDate.getFullYear()

  const filtered = righe.filter(r => {
    const d = new Date(r.data)
    return d.getMonth() === month && d.getFullYear() === year
  })

  renderList(filtered)
}


// =========================
// LIST
// =========================

function renderList(righe){

  const container = document.getElementById("planner-content")

  container.innerHTML = righe.map(r => `
    <div class="card row" data-id="${r.id}">

      <input class="data" type="date" value="${r.data || ""}">

      <select class="ricetta">
        <option value="">Ricetta</option>
        ${ricette.map(rc => `
          <option value="${rc.id}" ${r.ricetta_id===rc.id?"selected":""}>
            ${rc.nome}
          </option>
        `).join("")}
      </select>

      <input class="quantita" type="number" value="${r.quantita || 1}">

      <select class="dipendente">
        <option value="">Operatore</option>
        ${dipendenti.map(d => `
          <option value="${d.id}" ${r.dipendente_id===d.id?"selected":""}>
            ${d.nome} ${d.cognome || ""}
          </option>
        `).join("")}
      </select>

      <input class="tempo" type="number"
        placeholder="min"
        value="${r.tempo_stimato_minuti || ""}">

      <select class="stato">
        <option value="da_fare" ${r.stato==="da_fare"?"selected":""}>Da fare</option>
        <option value="in_corso" ${r.stato==="in_corso"?"selected":""}>In corso</option>
        <option value="completato" ${r.stato==="completato"?"selected":""}>Completato</option>
      </select>

      <button class="open" data-id="${r.id}">
        Apri
      </button>

    </div>
  `).join("")

  bindRowEvents()
}


// =========================
// CREATE
// =========================

async function createRow(){

  const supabase = window.supabaseClient
  const azienda = window.state.azienda
  const sedeId = window.state.sedeAttiva.id

  if(!repartoAttivoId){
    alert("Seleziona reparto")
    return
  }

  const today = new Date().toISOString().slice(0,10)

  await supabase
    .from("produzioni_settimanali")
    .insert({
      azienda_id: azienda.id,
      sede_id: sedeId,
      reparto_id: repartoAttivoId,
      data: today,
      quantita: 1,
      stato: "da_fare"
    })

  renderPlanner()
}


// =========================
// EVENTS
// =========================

function bindRowEvents(){

  const supabase = window.supabaseClient

  document.querySelectorAll(".row").forEach(row => {

    const id = row.dataset.id

    row.querySelectorAll("input, select").forEach(el => {

      el.onchange = async () => {

        const payload = {
          data: row.querySelector(".data").value,
          ricetta_id: row.querySelector(".ricetta").value || null,
          quantita: parseFloat(row.querySelector(".quantita").value || 0),
          dipendente_id: row.querySelector(".dipendente").value || null,
          tempo_stimato_minuti: parseInt(row.querySelector(".tempo").value || 0),
          stato: row.querySelector(".stato").value
        }

        await supabase
          .from("produzioni_settimanali")
          .update(payload)
          .eq("id", id)

      }

    })

  })

  document.querySelectorAll(".open").forEach(btn => {

    btn.onclick = () => {
      const id = btn.dataset.id
      window.location.hash = `#/preparazioni?planner_id=${id}`
    }

  })

}
