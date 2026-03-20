import { supabase } from "../supabaseClient.js";

export default function renderCompletaProfilo() {

  return `
  <div class="view">

    <div style="max-width:700px;margin:auto;">

      <div style="margin-bottom:18px;">
        <div style="font-size:13px;color:#6b7280;">Profilo</div>
        <h2 style="margin:4px 0 0 0;">Completa il tuo profilo</h2>
      </div>

      <!-- CARD ANAGRAFICA -->
      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Dati personali
        </div>

        <div class="form-group">
          <label>Fotografia</label>
          <input type="file" id="fotoDipendente" accept="image/*" class="input">
          <img id="previewFoto" style="width:100px;margin-top:10px;border-radius:10px">
        </div>

        <div class="form-group">
          <label>Data nascita</label>
          <input type="date" id="data_nascita" class="input">
        </div>

        <div class="form-group">
          <label>Residenza</label>
          <input type="text" id="residenza" class="input">
        </div>

        <div class="form-group">
          <label>IBAN</label>
          <input type="text" id="iban" class="input">
        </div>

      </div>

      <!-- CARD AI - OBIETTIVI -->
      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Obiettivi professionali *
        </div>

        <div class="form-group">
          <label>Cosa vuoi migliorare o raggiungere nel lavoro?</label>
          <textarea id="obiettivi" class="input" style="min-height:100px;"></textarea>
        </div>

      </div>

      <!-- CARD AI - CRESCITA -->
      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Crescita professionale
        </div>

        <div class="form-group">
          <label>Ruolo che vuoi raggiungere (opzionale)</label>
          <input id="ruolo_target" class="input">
        </div>

      </div>

      <div style="margin-top:20px;">
        <button id="salvaProfilo" class="app-button primary" style="width:100%;">
          Salva profilo
        </button>
      </div>

      <div id="msg" style="margin-top:14px;"></div>

    </div>

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

  const profiloAI = dipendente.profilo_ai || {}

  // prefill
  if (dipendente.data_nascita)
    document.getElementById("data_nascita").value = dipendente.data_nascita

  if (dipendente.residenza)
    document.getElementById("residenza").value = dipendente.residenza

  if (dipendente.iban)
    document.getElementById("iban").value = dipendente.iban

  if (profiloAI.obiettivi)
    document.getElementById("obiettivi").value = profiloAI.obiettivi

  if (profiloAI.ruolo_target)
    document.getElementById("ruolo_target").value = profiloAI.ruolo_target

  if (dipendente.foto_url)
    document.getElementById("previewFoto").src = dipendente.foto_url

  document.getElementById("fotoDipendente")
    .addEventListener("change", function(e){

      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()

      reader.onload = function(ev){
        document.getElementById("previewFoto").src = ev.target.result
      }

      reader.readAsDataURL(file)

    })

  document.getElementById("salvaProfilo")
    .addEventListener("click", async ()=>{

      const msg = document.getElementById("msg")
      msg.innerHTML = ""

      const obiettivi = document.getElementById("obiettivi").value.trim()

      if (!obiettivi) {
        msg.innerHTML = "<span style='color:#dc2626;'>Inserisci i tuoi obiettivi</span>"
        return
      }

      const file = document.getElementById("fotoDipendente").files[0]

      let foto_url = dipendente.foto_url || null

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

        profilo_ai: {
          obiettivi,
          ruolo_target: document.getElementById("ruolo_target").value
        },

        profilo_completato: true
      }

      if(foto_url) update.foto_url = foto_url

      await supabase
        .from("dipendenti")
        .update(update)
        .eq("id", window.dipendente.id)

      msg.innerHTML = "<span style='color:#16a34a;'>Profilo salvato</span>"

      setTimeout(()=>{
        window.location.hash = "#/home"
      }, 800)

    })

}
