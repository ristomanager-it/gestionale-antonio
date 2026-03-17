export async function render(container){

  const state = window.state
  const ruolo = state.ruolo

  container.innerHTML = `
    <div class="view">

      <h2>Richieste da approvare</h2>

      <div id="lista"></div>

    </div>
  `

  await carica()

  async function carica(){

    const { data } = await window.supabaseClient
      .from("richieste_assenze")
      .select("*")
      .eq("stato","richiesto")
      .order("created_at", { ascending:false })

    const box = document.getElementById("lista")
    box.innerHTML = ""

    data.forEach(r => {

      const row = document.createElement("div")
      row.className = "row"

      row.innerHTML = `
        <div>
          ${r.tipo} - ${r.data_inizio} → ${r.data_fine}
        </div>
        <div>
          <button data-id="${r.id}" class="ok">Approva</button>
          <button data-id="${r.id}" class="no">Rifiuta</button>
        </div>
      `

      box.appendChild(row)

    })

    document.querySelectorAll(".ok").forEach(btn=>{
      btn.onclick = () => aggiorna(btn.dataset.id,"approvato")
    })

    document.querySelectorAll(".no").forEach(btn=>{
      btn.onclick = () => aggiorna(btn.dataset.id,"rifiutato")
    })

  }

  async function aggiorna(id, stato){

    await window.supabaseClient
      .from("richieste_assenze")
      .update({
        stato,
        approvato_da: window.state.user.id
      })
      .eq("id", id)

    await carica()
  }

}
