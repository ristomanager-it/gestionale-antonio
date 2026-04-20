export async function render(container) {

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>➕ Nuova Prenotazione</h1>
      </div>

      <div class="card">

        <div class="form-grid">

          <div>
            <label>Nome cliente</label>
            <input id="cliente_nome" class="input" placeholder="Mario Rossi"/>
          </div>

          <div>
            <label>Telefono</label>
            <input id="cliente_telefono" class="input" placeholder="3331234567"/>
          </div>

          <div>
            <label>Data</label>
            <input type="date" id="data" class="input"/>
          </div>

          <div>
            <label>Ora</label>
            <input type="time" id="ora" class="input"/>
          </div>

          <div>
            <label>Coperti</label>
            <input type="number" id="coperti" class="input" min="1" value="2"/>
          </div>

          <div>
            <label>Stato</label>
            <select id="stato" class="input">
              <option value="nuova">Nuova</option>
              <option value="confermata">Confermata</option>
              <option value="arrivata">Arrivata</option>
            </select>
          </div>

          <div style="grid-column:1 / -1;">
            <label>Note</label>
            <textarea id="note" class="input" rows="3"></textarea>
          </div>

        </div>

        <div style="margin-top:20px;display:flex;gap:10px;">
          <button class="app-button" id="btn-salva">Salva</button>
          <button class="app-button gray" id="btn-annulla">Annulla</button>
        </div>

        <div id="form-msg" style="margin-top:10px;"></div>

      </div>
    </div>
  `;

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("data").value = today;

  document.getElementById("btn-annulla").onclick = () => {
    window.location.hash = "#/prenotazioni-tavoli";
  };

  document.getElementById("btn-salva").onclick = async () => {

    const cliente_nome = document.getElementById("cliente_nome").value.trim();
    const cliente_telefono = document.getElementById("cliente_telefono").value.trim();
    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;
    const coperti = Number(document.getElementById("coperti").value);
    const stato = document.getElementById("stato").value;
    const note = document.getElementById("note").value;

    const msg = document.getElementById("form-msg");
    msg.innerHTML = "";

    // VALIDAZIONE BASE
    if (!cliente_nome) {
      msg.innerHTML = "Inserisci nome cliente";
      return;
    }

    if (!data || !ora) {
      msg.innerHTML = "Inserisci data e ora";
      return;
    }

    if (!coperti || coperti <= 0) {
      msg.innerHTML = "Coperti non validi";
      return;
    }

    const { error } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .insert([{
        azienda_id: aziendaId,
        sede_id: sedeId,
        cliente_nome,
        cliente_telefono,
        data,
        ora,
        coperti,
        stato,
        note
      }]);

    if (error) {
      console.error(error);
      msg.innerHTML = "Errore salvataggio";
      return;
    }

    msg.innerHTML = "✅ Prenotazione salvata";

    setTimeout(() => {
      window.location.hash = "#/prenotazioni-tavoli";
    }, 800);
  };
}
