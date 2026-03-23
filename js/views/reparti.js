export async function render(container){

  const supabase = window.supabaseClient
  const azienda = window.state.azienda

  const { data } = await supabase
    .from("reparti")
    .select("*")
    .eq("azienda_id", azienda.id)

  const reparti = data || []

  container.innerHTML = `
    <div class="view">

      <h2>Reparti</h2>

      <div id="list"></div>

      <input id="nome" placeholder="Nuovo reparto (es. cucina)">
      <button id="add">Aggiungi</button>

    </div>
  `

  document.getElementById("list").innerHTML =
    reparti.map(r => `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span>${r.nome}</span>
        <button onclick="selectReparto('${r.id}', '${r.nome}')">
          Usa
        </button>
      </div>
    `).join("")

  document.getElementById("add").onclick = async () => {
    const nome = document.getElementById("nome").value

    if(!nome) return

    await supabase.from("reparti").insert({
      nome,
      azienda_id: azienda.id
    })

    location.reload()
  }

}

window.selectReparto = function(id, nome){
  window.state.repartoAttivo = { id, nome }

  // 🔥 persistenza minima (fondamentale)
  localStorage.setItem("reparto_attivo", JSON.stringify({ id, nome }))

  alert("Reparto selezionato: " + nome)
}
