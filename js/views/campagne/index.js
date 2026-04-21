import { generaMessaggio, apriWhatsApp } from "/services/messaggi.js";

export async function render(container){

  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = `
    <div class="view">

      <div class="card">
        <h2>📢 Campagne</h2>

        <div class="form-group">
          <label>Tag</label>
          <input id="tag" class="input" placeholder="es. vip o capelli_rossi"/>
        </div>

        <div class="form-group">
          <label>Messaggio</label>
          <textarea id="msg" class="input" rows="4"
            placeholder="Ciao @@nome@@, promo speciale per te..."></textarea>
        </div>

        <button id="cerca" class="app-button primary">
          Cerca clienti
        </button>
      </div>

      <div id="lista" class="card"></div>

    </div>
  `;

  const lista = document.getElementById("lista");

  document.getElementById("cerca").onclick = async ()=>{

    const tag = document.getElementById("tag").value.trim();

    if(!tag){
      lista.innerHTML = "Inserisci un tag";
      return;
    }

    // 🔥 CERCA CLIENTI PER TAG
    const { data } = await window.supabaseClient
      .from("contatti")
      .select("id, nome, telefono, tag, tag_manuali")
      .eq("azienda_id", aziendaId);

    const filtrati = (data || []).filter(c => {

      const auto = c.tag || [];
      const manuali = c.tag_manuali || [];

      return auto.includes(tag) || manuali.includes(tag);
    });

    if(!filtrati.length){
      lista.innerHTML = "Nessun cliente trovato";
      return;
    }

    lista.innerHTML = filtrati.map(c => `
      <div class="pren-card">
        <div>
          <strong>${c.nome || "Cliente"}</strong><br/>
          ${c.telefono || ""}
        </div>

        <button class="send" data-id="${c.id}">
          💬 Invia
        </button>
      </div>
    `).join("");

    document.querySelectorAll(".send").forEach(btn=>{
      btn.onclick = async ()=>{

        const cliente = filtrati.find(x => x.id == btn.dataset.id);

        const testo = document.getElementById("msg").value;

        if(!testo){
          alert("Inserisci messaggio");
          return;
        }

        // 🔥 SOSTITUZIONE BASE
        const msgFinale = testo.replace("@@nome@@", cliente.nome || "");

        apriWhatsApp(cliente.telefono, msgFinale);
      };
    });

  };

}
