export async function render(container){

  const state = window.state
  const user = state.user
  const azienda = state.azienda
  const sede = state.sedeAttiva

  container.innerHTML = `
    <div class="view">

      <h2>Permessi e Ferie</h2>

      <div class="card">

        <h3>Nuova richiesta</h3>

        <select id="tipo">
          <option value="ferie">Ferie</option>
          <option value="permesso">Permesso</option>
        </select>

        <input type="date" id="data_inizio" />
        <input type="date" id="data_fine" />

        <textarea id="note" placeholder="Note"></textarea>

        <button id="btn-invia">Invia richiesta</button>

      </div>

      <div class="card">

        <h3>Le mie richieste</h3>

        <div id="lista"></div>

      </div>

    </div>
  `

  document.getElementById("btn-invia").onclick = creaRichiesta

  await caricaRichieste()

  async function creaRichiesta(){

    const tipo = document.getElementById("tipo").value
    const data_inizio = document.getElementById("data_inizio").value
    const data_fine = document.getElementById("data_fine").value
    const note = document.getElementById("note").value

    if(!data_inizio || !data_fine){
      alert("Inserisci le date")
      return
    }

    const { error } = await window.supabaseClient
      .from("richieste_assenze")
      .insert({
        azienda_id: azienda.id,
        sede_id: sede?.id || null,
        dipendente_id: user.id,
        tipo,
        data_inizio,
        data_fine,
        note,
        richiesto_da: user.id
      })

    if(error){
      alert("Errore")
      console.error(error)
      return
    }

    await caricaRichieste()
  }

  async function caricaRichieste(){

    const { data, error } = await window.supabaseClient
      .from("richieste_assenze")
      .select("*")
      .eq("dipendente_id", user.id)
      .order("created_at", { ascending:false })

    if(error){
      console.error(error)
      return
    }

    const box = document.getElementById("lista")
    box.innerHTML = ""

    data.forEach(r => {

      const row = document.createElement("div")
      row.className = "row"

      row.innerHTML = `
        <div>
          <strong>${r.tipo}</strong>
          ${r.data_inizio} → ${r.data_fine}
        </div>
        <div>${r.stato}</div>
      `

      box.appendChild(row)

    })

  }

}
