export async function render(container){

  const supabase = window.supabaseClient
  const azienda = window.state.azienda
  const sedeId = window.state.sedeAttiva
  const reparto = window.state.reparto

  if(!azienda || !sedeId || !reparto){
    container.innerHTML = `<div class="view">Errore dati</div>`
    return
  }

  // 🔥 LOAD DATI
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

      <h2>Planner produzione</h2>

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

      .start{
        background:#16a34a;
        color:white;
      }
    </style>
  `

  renderList(righe)

  document.getElementById("add").onclick = createRow
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

      <input class="prodotto" placeholder="Prodotto"
        value="${r.prodotto || ""}">

      <input class="quantita" type="number"
        value="${r.quantita || 1}">

      <input class="tempo" type="number"
        placeholder="min"
        value="${r.tempo_stimato_minuti || ""}">

      <select class="stato">
        <option value="da_fare" ${r.stato==="da_fare"?"selected":""}>Da fare</option>
        <option value="in_corso" ${r.stato==="in_corso"?"selected":""}>In corso</option>
        <option value="completato" ${r.stato==="completato"?"selected":""}>Completato</option>
      </select>

      <button class="start" data-id="${r.id}">
        Avvia produzione
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
  const sedeId = window.state.sedeAttiva
  const reparto = window.state.reparto

  const today = new Date().toISOString().slice(0,10)

  const { data } = await supabase
    .from("produzioni_settimanali")
    .insert({
      azienda_id: azienda.id,
      sede_id: sedeId,
      reparto_id: reparto.id,
      data: today,
      prodotto: "",
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
// UPDATE + EVENTS
// =========================

function bindRowEvents(){

  const supabase = window.supabaseClient

  document.querySelectorAll(".row").forEach(row => {

    const id = row.dataset.id

    // UPDATE
    row.querySelectorAll("input, select").forEach(el => {

      el.onchange = async () => {

        const payload = {
          data: row.querySelector(".data").value,
          prodotto: row.querySelector(".prodotto").value,
          quantita: parseFloat(row.querySelector(".quantita").value || 0),
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

  // START PRODUZIONE
  document.querySelectorAll(".start").forEach(btn => {

    btn.onclick = async () => {

      const id = btn.dataset.id

      const { data: row } = await supabase
        .from("produzioni_settimanali")
        .select("*")
        .eq("id", id)
        .single()

      if(!row) return

      await supabase
        .from("produzioni")
        .insert({
          azienda_id: window.state.azienda.id,
          sede_id: window.state.sedeAttiva,
          reparto_id: window.state.reparto.id,

          produzione_settimanale_id: row.id,

          data: row.data,
          prodotto: row.prodotto,
          quantita: row.quantita,
          dipendente_id: row.dipendente_id,

          stato: "in_corso",
          start_at: new Date().toISOString()
        })

      alert("Produzione avviata 🚀")

    }

  })

}
