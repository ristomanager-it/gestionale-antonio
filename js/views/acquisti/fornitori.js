export async function renderFornitori(container, azienda) {

  const supabase = window.supabaseClient;

  async function loadFornitori() {

    const { data, error } = await supabase
      .from("fornitori")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("ragione_sociale", { ascending: true });

    if (error) {
      container.innerHTML = `<div class="card">Errore caricamento fornitori</div>`;
      return;
    }

    container.innerHTML = `
    
    <div class="card">

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Fornitori</h3>

        <button id="btn-nuovo-fornitore" class="app-button small green">
          Nuovo fornitore
        </button>
      </div>

      <table class="app-table" style="margin-top:16px">

        <thead>
          <tr>
            <th>Ragione sociale</th>
            <th>Telefono</th>
            <th>Email</th>
            <th>Referente ordini</th>
            <th>Pagamento</th>
            <th>Lead time</th>
          </tr>
        </thead>

        <tbody>

          ${(data || []).map(f => `
          
            <tr>
              <td>${f.ragione_sociale || ""}</td>
              <td>${f.telefono || ""}</td>
              <td>${f.email_amministrativa || ""}</td>
              <td>${f.nome_referente_ordini || ""}</td>
              <td>${f.condizione_pagamento || ""}</td>
              <td>${f.lead_time_giorni || ""} gg</td>
            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>

    <div id="fornitore-form"></div>
    
    `;

    document
      .getElementById("btn-nuovo-fornitore")
      .addEventListener("click", openForm);
  }

  function openForm() {

    const form = document.getElementById("fornitore-form");

    form.innerHTML = `

    <div class="card">

      <h3>Nuovo fornitore</h3>

      <div class="form-grid">

        <div class="form-group">
          <label>Ragione sociale</label>
          <input id="f-ragione" class="input">
        </div>

        <div class="form-group">
          <label>Partita IVA</label>
          <input id="f-piva" class="input">
        </div>

        <div class="form-group">
          <label>Telefono</label>
          <input id="f-tel" class="input">
        </div>

        <div class="form-group">
          <label>Email amministrativa</label>
          <input id="f-email" class="input">
        </div>

        <div class="form-group">
          <label>Referente ordini</label>
          <input id="f-referente" class="input">
        </div>

        <div class="form-group">
          <label>Email referente ordini</label>
          <input id="f-email-ref" class="input">
        </div>

        <div class="form-group">
          <label>Telefono referente</label>
          <input id="f-tel-ref" class="input">
        </div>

        <div class="form-group">
          <label>Lead time (giorni)</label>
          <input id="f-lead" type="number" class="input">
        </div>

        <div class="form-group">
          <label>Condizione pagamento</label>

          <select id="f-pagamento" class="input">

            <option value="">-- seleziona --</option>
            <option value="contanti">Contanti</option>
            <option value="bonifico_immediato">Bonifico immediato</option>
            <option value="30_fm">30 gg fine mese</option>
            <option value="60_fm">60 gg fine mese</option>
            <option value="90_fm">90 gg fine mese</option>

          </select>

        </div>

      </div>

      <div class="form-actions">

        <button id="save-fornitore" class="app-button green">
          Salva
        </button>

      </div>

      <div id="fornitore-feedback"></div>

    </div>
    
    `;

    document
      .getElementById("save-fornitore")
      .addEventListener("click", saveFornitore);
  }

  async function saveFornitore() {

    const ragione = document.getElementById("f-ragione").value.trim();

    if (!ragione) return;

    const payload = {

      azienda_id: azienda.id,
      ragione_sociale: ragione,
      partita_iva: document.getElementById("f-piva").value,
      telefono: document.getElementById("f-tel").value,
      email_amministrativa: document.getElementById("f-email").value,

      nome_referente_ordini: document.getElementById("f-referente").value,
      email_referente_ordini: document.getElementById("f-email-ref").value,
      telefono_referente_ordini: document.getElementById("f-tel-ref").value,

      lead_time_giorni: parseInt(document.getElementById("f-lead").value || 0),

      condizione_pagamento: document.getElementById("f-pagamento").value,

      attivo: true

    };

    const { error } = await supabase
      .from("fornitori")
      .insert(payload);

    if (error) {

      document.getElementById("fornitore-feedback").innerHTML =
        `<span style="color:red;">Errore salvataggio</span>`;

      return;
    }

    loadFornitori();
  }

  loadFornitori();
}
