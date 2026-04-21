import { trovaOCreaContatto } from "../../services/contatti.js";
import { eseguiAutomazioni } from "../../services/automazioni.js";

export async function render(container) {

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>➕ Nuova Prenotazione</h1>
      </div>

      <div class="card">

        <div class="form-grid">

          <!-- AUTOCOMPLETE -->
          <div style="position:relative;">
            <label>Cerca cliente</label>
            <input id="cliente_search" class="input" placeholder="Nome o telefono"/>
            <div id="suggestions" class="dropdown"></div>
          </div>

          <!-- NOME -->
          <div>
            <label>Nome</label>
            <input id="cliente_nome" class="input"/>
          </div>

          <!-- COGNOME -->
          <div>
            <label>Cognome</label>
            <input id="cliente_cognome" class="input"/>
          </div>

          <!-- TELEFONO CON PREFISSO -->
          <div style="display:flex; gap:6px;">
            <div style="width:110px;">
              <label>Prefisso</label>
              <select id="prefisso" class="input">
                <option value="+39">🇮🇹 +39</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+34">🇪🇸 +34</option>
              </select>
            </div>
            <div style="flex:1;">
              <label>Telefono *</label>
              <input id="cliente_telefono" class="input"/>
            </div>
          </div>

          <!-- DATA -->
          <div>
            <label>Data</label>
            <input type="date" id="data" class="input"/>
          </div>

          <!-- ORA -->
          <div>
            <label>Ora</label>
            <input type="time" id="ora" class="input"/>
          </div>

          <!-- COPERTI -->
          <div>
            <label>Coperti</label>
            <input type="number" id="coperti" class="input" min="1" value="2"/>
          </div>

          <!-- NOTE -->
          <div style="grid-column:1 / -1;">
            <label>Note</label>
            <textarea id="note" class="input" rows="3"></textarea>
          </div>

        </div>

        <div style="margin-top:20px;display:flex;gap:10px;">
          <button class="app-button" id="btn-salva">Salva</button>
          <button class="app-button gray" id="btn-annulla">Annulla</button>
        </div>

        <div id="form-msg"></div>

      </div>
    </div>
  `;

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  document.getElementById("data").value = new Date().toISOString().split("T")[0];

  let clienteSelezionato = null;

  // 🔍 AUTOCOMPLETE
  document.getElementById("cliente_search").oninput = async (e) => {

    const term = e.target.value.trim();
    const box = document.getElementById("suggestions");

    if (term.length < 2) {
      box.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("contatti")
      .select("id, nome, cognome, telefono")
      .or(`nome.ilike.%${term}%,telefono.ilike.%${term}%`)
      .limit(5);

    if (!data || !data.length) {
      box.innerHTML = `<div class="dropdown-item">Nessun cliente</div>`;
      return;
    }

    box.innerHTML = data.map(c => `
      <div class="dropdown-item" data-id="${c.id}">
        ${(c.nome || "") + " " + (c.cognome || "")} ${c.telefono ? "· " + c.telefono : ""}
      </div>
    `).join("");

    box.querySelectorAll(".dropdown-item").forEach(el => {
      el.onclick = async () => {

        const c = data.find(x => x.id == el.dataset.id);

        clienteSelezionato = String(c.id); // 🔥 UUID sicuro

        document.getElementById("cliente_nome").value = c.nome || "";
        document.getElementById("cliente_cognome").value = c.cognome || "";
        document.getElementById("cliente_telefono").value = c.telefono || "";

        box.innerHTML = "";
      };
    });
  };

  document.getElementById("btn-annulla").onclick = () => {
    window.location.hash = "#/prenotazioni";
  };

  // 💾 SALVATAGGIO
  document.getElementById("btn-salva").onclick = async () => {

    const nome = document.getElementById("cliente_nome").value.trim();
    const cognome = document.getElementById("cliente_cognome").value.trim();
    const prefisso = document.getElementById("prefisso").value;
    const telefonoRaw = document.getElementById("cliente_telefono").value.trim();

    const telefono = (prefisso + telefonoRaw).replace(/[^\d+]/g, "");

    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;
    const coperti = Number(document.getElementById("coperti").value);
    const note = document.getElementById("note").value;

    const msg = document.getElementById("form-msg");
    msg.innerHTML = "";

    if (!telefonoRaw) {
      msg.innerHTML = "Telefono obbligatorio";
      return;
    }

    let contatto = null;

    if (!clienteSelezionato) {
      contatto = await trovaOCreaContatto({
        nome,
        cognome,
        telefono
      });
    }

    let contattoId = clienteSelezionato || contatto?.id || null;

    // 🔥 PROTEZIONE UUID
    if (contattoId && contattoId.length < 20) {
      contattoId = null;
    }

    const { data: pren, error } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .insert([{
        azienda_id: aziendaId,
        sede_id: sedeId,
        contatto_id: contattoId,
        cliente_nome: nome,
        cliente_telefono: telefono,
        data,
        ora,
        coperti,
        stato: "nuova",
        note
      }])
      .select()
      .single();

    if (error) {
      console.error(error);
      msg.innerHTML = "Errore salvataggio";
      return;
    }

    await eseguiAutomazioni("prenotazione_creata", pren);

    msg.innerHTML = "✅ Salvato";

    setTimeout(() => {
      window.location.hash = "#/prenotazioni";
    }, 800);
  };
}
