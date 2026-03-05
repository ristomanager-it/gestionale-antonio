export default function renderCompletaProfilo() {

  return `
  <div class="card">
    <h2>Completa il tuo profilo</h2>

    <div>
      <label>Fotografia</label>
      <input type="file" id="fotoDipendente" accept="image/*">
      <img id="previewFoto" style="width:120px;margin-top:10px;border-radius:8px">
    </div>

    <div>
      <label>Data nascita</label>
      <input type="date" id="data_nascita">
    </div>

    <div>
      <label>Residenza</label>
      <input type="text" id="residenza">
    </div>

    <div>
      <label>IBAN</label>
      <input type="text" id="iban">
    </div>

    <button id="salvaProfilo">Salva profilo</button>
  </div>
  `
}

export async function initCompletaProfilo(){

  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  const { data: dipendente } = await supabase
  .from("dipendenti")
  .select("*")
  .eq("user_id", user.id)
  .single()

  window.dipendente = dipendente


  document.getElementById("fotoDipendente")
  .addEventListener("change", function(e){

    const file = e.target.files[0]
    const reader = new FileReader()

    reader.onload = function(ev){
      document.getElementById("previewFoto").src = ev.target.result
    }

    reader.readAsDataURL(file)

  })


  document.getElementById("salvaProfilo")
  .addEventListener("click", async ()=>{

    const file = document.getElementById("fotoDipendente").files[0]

    let foto_url = null

    if(file){

      const path = `dipendenti/${window.dipendente.id}/foto.jpg`

      await supabase.storage
      .from("dipendenti-foto")
      .upload(path, file, { upsert:true })

      const { data } = supabase.storage
      .from("dipendenti-foto")
      .getPublicUrl(path)

      foto_url = data.publicUrl

    }

    const update = {
      data_nascita: document.getElementById("data_nascita").value,
      residenza: document.getElementById("residenza").value,
      iban: document.getElementById("iban").value,
      profilo_completato: true
    }

    if(foto_url) update.foto_url = foto_url

    await supabase
    .from("dipendenti")
    .update(update)
    .eq("id", window.dipendente.id)

    window.location.hash = "#/dashboard"

  })

}
