let ricette = []
let dipendenti = []

export async function render(container){

  const supabase = window.supabaseClient
  const azienda = window.state.azienda
  const sedeObj = window.state.sedeAttiva
  const reparto = window.state.repartoAttivo

  const sedeId = sedeObj?.id || sedeObj

  // 🔥 FIX: fallback intelligente
  if(!azienda || !sedeId){
    container.innerHTML = `<div class="view">Errore dati azienda/sede</div>`
    return
  }

  if(!reparto){
    container.innerHTML = `
      <div class="view">
        <h2>⚠️ Nessun reparto selezionato</h2>
        <p>Devi creare e selezionare un reparto (cucina / sala)</p>
      </div>
    `
    return
  }

  await loadRicette()
  await loadDipendenti()

  const { data } = await supabase
    .from("produzioni_settimanali")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("sede_id", sedeId)
    .eq("reparto_id", reparto.id)
    .order("data", { ascending: true })

  const righe = data || []

  container.innerHTML = `
    <div class="view">

      <h2>📅 Planner produzione</h2>

      <div id="list"></div>

      <button id="add" class="app-button primary">
        + Nuova lavorazione
      </button>

    </div>

    <style>
      .row{
        display:grid;
        gap:6px;
        margin-bottom:10px;
      }

      .row input, .row select{
        padding:6px;
        border-radius:6px;
        border:1px solid #ddd;
      }

      .row button{
        padding:6px;
        border:none;
        border-radius:6px;
        cursor:pointer;
      }

      .open{
        background:#2563eb;
        color:white;
      }
    </style>
  `

  renderList(righe)

  document.getElementById("add").onclick = createRow
}


// =========================
// LOAD DATI
// =========================

async function loadRicette(){
  const supabase = window.supabaseClient
  const azienda = window.state.azienda

  const { data } = await supabase
    .from("ricette")
    .select("id, nome")
    .eq("azienda_id", azienda.id)
    .eq("attivo", true)
    .order("nome")

  ricette = data || []
}

async function loadDipendenti(){
  const supabase = window.supabaseClient
  const azienda = window.state.azienda
  const sedeObj = window.state.sedeAttiva
  const reparto = window.state.repartoAttivo

  const sedeId = sedeObj?.id || sedeObj

  if(!reparto){
    dipendenti = []
    return
  }

  const { data } = await supabase
    .from("dipendenti")
    .select("id, nome, cognome")
    .eq("azienda_id", azienda.id)
    .eq("attivo", true)
    .eq("sede_id", sedeId)
    .eq("reparto_id", reparto.id)

  dipendenti = data || []
}


// =========================
// RENDER LIST
// =========================

function renderList(righe){

  const container = document.getElementById("list")

  container.innerHTML = righe.map(r => renderRow(r)).join("")

  bindRowEvents()
}


// =========================
// ROW
// =========================

function renderRow(r){

  return `
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

      <input class="quantita" type="number"
        value="${r.quantita || 1}">

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
        Apri lavorazione
      </button>

    </div>
  `
}


// =========================
// CREATE ROW
// =========================

async function createRow(){

  const supabase = window.supabaseClient
  const azienda = window.state.azienda
  const sedeObj = window.state.sedeAttiva
  const reparto = window.state.repartoAttivo

  const sedeId = sedeObj?.id || sedeObj

  if(!reparto){
    alert("Seleziona un reparto prima")
    return
  }

  const today = new Date().toISOString().slice(0,10)

  const { data } = await supabase
    .from("produzioni_settimanali")
    .insert({
      azienda_id: azienda.id,
      sede_id: sedeId,
      reparto_id: reparto.id,
      data: today,
      quantita: 1,
      stato: "da_fare"
    })
    .select()
    .single()

  if(data){
    location.reload()
  }
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
