export async function render(container) {

  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = `
    <div class="view">

      <div class="card">
        <h2>💬 Messaggi automatici</h2>

        <div style="margin-top:10px;">
          <button class="app-button primary" id="btn-new">
            ➕ Nuovo messaggio
          </button>
        </div>
      </div>

      <div class="card">
        <div id="lista-template">Caricamento...</div>
      </div>

      <!-- MODAL -->
      <div id="modal" style="display:none;">
        <div class="card">

          <h3 id="modal-title">Nuovo Messaggio</h3>

          <div class="form-group">
            <label>Nome template</label>
            <input id="nome" class="input"/>
          </div>

          <div class="form-group">
            <label>Tipo</label>
            <select id="tipo" class="input">
              <option value="conferma_prenotazione">Conferma prenotazione</option>
              <option value="richiesta_prenotazione">Richiesta prenotazione</option>
              <option value="conferma_online">Conferma online</option>
              <option value="reminder">Reminder</option>
              <option value="promo">Promo / Offerta</option>
            </select>
          </div>

          <div class="form-group">
            <label>Contenuto</label>
            <textarea id="contenuto" class="input" rows="5"></textarea>
          </div>

          <div class="card" style="background:#f8fafc;">
            <strong>Variabili disponibili:</strong><br/>
            @@nome@@, @@data@@, @@ora@@, @@coperti@@
          </div>

          <div class="card">
            <strong>Anteprima:</strong>
            <div id="preview" style="margin-top:6px;color:#333;"></div>
          </div>

          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="app-button primary" id="save">
              💾 Salva
            </button>
            <button class="app-button gray" id="close">
              Chiudi
            </button>
          </div>

        </div>
      </div>

    </div>
  `;

  const lista = document.getElementById("lista-template");
  const modal = document.getElementById("modal");

  let currentId = null;

  // 🔥 LOAD TEMPLATE
  async function load(){

    const { data, error } = await window.supabaseClient
      .from("messaggi_template")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("created_at", { ascending:false });

    if(error){
      lista.innerHTML = "Errore caricamento";
      return;
    }

    if(!data.length){
      lista.innerHTML = "Nessun messaggio";
      return;
    }

    lista.innerHTML = data.map(t => `
      <div class="card">

        <div style="font-weight:700;">
          ${t.nome}
        </div>

        <div style="font-size:12px;color:#666;">
          ${t.tipo}
        </div>

        <div style="margin-top:6px;">
          ${t.contenuto}
        </div>

        <div style="margin-top:10px;">
          <button class="app-button tiny edit" data-id="${t.id}">
            ✏️ Modifica
          </button>
        </div>

      </div>
    `).join("");

    document.querySelectorAll(".edit").forEach(btn=>{
      btn.onclick = ()=> openEdit(btn.dataset.id);
    });
  }

  // 🔥 APRI MODAL NUOVO
  document.getElementById("btn-new").onclick = ()=>{
    currentId = null;
    modal.style.display = "block";

    document.getElementById("modal-title").innerText = "Nuovo Messaggio";
    document.getElementById("nome").value = "";
    document.getElementById("tipo").value = "conferma_prenotazione";
    document.getElementById("contenuto").value = "";

    updatePreview();
  };

  // 🔥 MODIFICA
  async function openEdit(id){

    const { data } = await window.supabaseClient
      .from("messaggi_template")
      .select("*")
      .eq("id", id)
      .single();

    if(!data) return;

    currentId = id;

    modal.style.display = "block";

    document.getElementById("modal-title").innerText = "Modifica Messaggio";
    document.getElementById("nome").value = data.nome;
    document.getElementById("tipo").value = data.tipo;
    document.getElementById("contenuto").value = data.contenuto;

    updatePreview();
  }

  // 🔥 PREVIEW
  function updatePreview(){

    let text = document.getElementById("contenuto").value;

    text = text
      .replaceAll("@@nome@@", "Mario")
      .replaceAll("@@data@@", "12/10/2026")
      .replaceAll("@@ora@@", "20:30")
      .replaceAll("@@coperti@@", "4");

    document.getElementById("preview").innerText = text;
  }

  document.getElementById("contenuto").oninput = updatePreview;

  // 🔥 SALVA
  document.getElementById("save").onclick = async ()=>{

    const nome = document.getElementById("nome").value;
    const tipo = document.getElementById("tipo").value;
    const contenuto = document.getElementById("contenuto").value;

    if(!nome || !contenuto){
      alert("Compila i campi");
      return;
    }

    // 🔥 CONTROLLO DUPLICATI (SOLO NUOVO)
    if(!currentId){

      const { data: esiste } = await window.supabaseClient
        .from("messaggi_template")
        .select("id")
        .eq("azienda_id", aziendaId)
        .eq("tipo", tipo)
        .maybeSingle();

      if(esiste){
        alert("Esiste già un messaggio per questo tipo");
        return;
      }
    }

    if(currentId){
      await window.supabaseClient
        .from("messaggi_template")
        .update({ nome, tipo, contenuto })
        .eq("id", currentId);
    }else{
      await window.supabaseClient
        .from("messaggi_template")
        .insert([{
          azienda_id: aziendaId,
          nome,
          tipo,
          contenuto
        }]);
    }

    modal.style.display = "none";
    load();
  };

  // 🔥 CHIUDI
  document.getElementById("close").onclick = ()=>{
    modal.style.display = "none";
  };

  load();
}
