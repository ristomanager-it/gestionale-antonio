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

          <!-- 🔥 AUTOMAZIONI -->
          <div class="card" style="background:#f1f5f9;">
            <strong>⚙️ Automazione</strong>

            <div class="form-group">
              <label>
                <input type="checkbox" id="attivo" checked/>
                Attivo
              </label>
            </div>

            <div class="form-group">
              <label>Evento</label>
              <select id="trigger_evento" class="input">
                <option value="prenotazione_creata">Creazione prenotazione</option>
                <option value="prenotazione_confermata">Conferma prenotazione</option>
                <option value="post_servizio">Post servizio</option>
              </select>
            </div>

            <div class="form-group">
              <label>Quando</label>
              <select id="timing_tipo" class="input">
                <option value="subito">Subito</option>
                <option value="prima">Prima</option>
                <option value="dopo">Dopo</option>
              </select>
            </div>

            <div style="display:flex; gap:6px;">
              <input type="number" id="timing_valore" class="input" value="1" style="width:80px"/>
              <select id="timing_unita" class="input">
                <option value="minuti">Minuti</option>
                <option value="ore">Ore</option>
                <option value="giorni">Giorni</option>
              </select>
            </div>

          </div>

          <div class="card" style="background:#f8fafc;">
            <strong>Variabili disponibili:</strong><br/>
            @@nome@@, @@data@@, @@ora@@, @@coperti@@
          </div>

          <div class="card">
            <strong>Anteprima:</strong>
            <div id="preview"></div>
          </div>

          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="app-button primary" id="save">💾 Salva</button>
            <button class="app-button gray" id="close">Chiudi</button>
          </div>

        </div>
      </div>

    </div>
  `;

  const lista = document.getElementById("lista-template");
  const modal = document.getElementById("modal");

  let currentId = null;

  async function load(){

    const { data } = await window.supabaseClient
      .from("messaggi_template")
      .select("*")
      .eq("azienda_id", aziendaId);

    if(!data || !data.length){
      lista.innerHTML = "Nessun messaggio";
      return;
    }

    lista.innerHTML = data.map(t => `
      <div class="card">
        <div><strong>${t.nome}</strong></div>
        <div>${t.tipo}</div>
        <div>${t.contenuto}</div>
        <div style="font-size:11px;color:#666;">
          ${t.trigger_evento || ""} · ${t.timing_tipo || ""} ${t.timing_valore || ""} ${t.timing_unita || ""}
        </div>
        <button class="edit" data-id="${t.id}">Modifica</button>
      </div>
    `).join("");

    document.querySelectorAll(".edit").forEach(btn=>{
      btn.onclick = ()=> openEdit(btn.dataset.id);
    });
  }

  document.getElementById("btn-new").onclick = ()=>{
    currentId = null;
    modal.style.display = "block";
  };

  async function openEdit(id){

    const { data } = await window.supabaseClient
      .from("messaggi_template")
      .select("*")
      .eq("id", id)
      .single();

    currentId = id;

    modal.style.display = "block";

    document.getElementById("nome").value = data.nome;
    document.getElementById("tipo").value = data.tipo;
    document.getElementById("contenuto").value = data.contenuto;

    document.getElementById("attivo").checked = data.attivo;
    document.getElementById("trigger_evento").value = data.trigger_evento;
    document.getElementById("timing_tipo").value = data.timing_tipo;
    document.getElementById("timing_valore").value = data.timing_valore;
    document.getElementById("timing_unita").value = data.timing_unita;
  }

  document.getElementById("save").onclick = async ()=>{

    const payload = {
      azienda_id: aziendaId,
      nome: document.getElementById("nome").value,
      tipo: document.getElementById("tipo").value,
      contenuto: document.getElementById("contenuto").value,
      attivo: document.getElementById("attivo").checked,
      trigger_evento: document.getElementById("trigger_evento").value,
      timing_tipo: document.getElementById("timing_tipo").value,
      timing_valore: Number(document.getElementById("timing_valore").value),
      timing_unita: document.getElementById("timing_unita").value
    };

    if(currentId){
      await window.supabaseClient
        .from("messaggi_template")
        .update(payload)
        .eq("id", currentId);
    }else{
      await window.supabaseClient
        .from("messaggi_template")
        .insert([payload]);
    }

    modal.style.display = "none";
    load();
  };

  document.getElementById("close").onclick = ()=>{
    modal.style.display = "none";
  };

  load();
}
