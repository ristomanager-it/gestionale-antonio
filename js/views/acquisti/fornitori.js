export async function renderFornitori(container, azienda) {

  const supabase = window.supabaseClient;

  container.innerHTML = `

  <div class="card">

    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3>Fornitori</h3>

      <button id="btn-nuovo-fornitore" class="app-button small green">
        Nuovo fornitore
      </button>
    </div>

    <div style="margin-top:12px">

      <input
        id="fornitore-search"
        class="input"
        placeholder="Cerca fornitore..."
      >

    </div>

    <div id="fornitori-results" style="margin-top:16px"></div>

  </div>

  <div id="fornitore-form"></div>

  `;

  const inputSearch = container.querySelector("#fornitore-search");
  const results = container.querySelector("#fornitori-results");

  document
    .getElementById("btn-nuovo-fornitore")
    .addEventListener("click", () => openForm());

  inputSearch.addEventListener("input", async () => {

    const value = inputSearch.value.trim();

    if (value.length < 2) {
      results.innerHTML = "";
      return;
    }

    const { data, error } = await supabase
      .from("fornitori")
      .select("*")
      .eq("azienda_id", azienda.id)
      .ilike("ragione_sociale", `%${value}%`)
      .order("ragione_sociale", { ascending: true })
      .limit(20);

    if (error) {
      results.innerHTML = "Errore ricerca";
      return;
    }

    if (!data.length) {
      results.innerHTML = `<div>Nessun fornitore trovato</div>`;
      return;
    }

    results.innerHTML = `

      <table class="app-table">

        <thead>
          <tr>
            <th>Ragione sociale</th>
            <th>Telefono</th>
            <th>Email</th>
          </tr>
        </thead>

        <tbody>

        ${data.map(f => `

          <tr class="fornitore-row" data-id="${f.id}">
            <td>${f.ragione_sociale || ""}</td>
            <td>${f.telefono || ""}</td>
            <td>${f.email_amministrativa || ""}</td>
          </tr>

        `).join("")}

        </tbody>

      </table>

    `;

    results.querySelectorAll(".fornitore-row").forEach(row => {

      row.addEventListener("click", async () => {

        const id = row.dataset.id;

        const { data: fornitore } = await supabase
          .from("fornitori")
          .select("*")
          .eq("id", id)
          .single();

        openForm(fornitore);

      });

    });

  });

  function openForm(f = null) {

    const form = document.getElementById("fornitore-form");

    form.innerHTML = `

    <div class="card">

      <h3>${f ? "Modifica fornitore" : "Nuovo fornitore"}</h3>

      <div class="form-grid">

        <div class="form-group">
          <label>Ragione sociale</label>
          <input id="f-ragione" class="input" value="${f?.ragione_sociale || ""}">
        </div>

        <div class="form-group">
          <label>Partita IVA</label>
          <input id="f-piva" class="input" value="${f?.partita_iva || ""}">
        </div>

        <div class="form-group">
          <label>Telefono</label>
          <input id="f-tel" class="input" value="${f?.telefono || ""}">
        </div>

        <div class="form-group">
          <label>Email amministrativa</label>
          <input id="f-email" class="input" value="${f?.email_amministrativa || ""}">
        </div>

        <div class="form-group">
          <label>Referente ordini</label>
          <input id="f-referente" class="input" value="${f?.nome_referente_ordini || ""}">
        </div>

        <div class="form-group">
          <label>Email referente ordini</label>
          <input id="f-email-ref" class="input" value="${f?.email_referente_ordini || ""}">
        </div>

        <div class="form-group">
          <label>Telefono referente</label>
          <input id="f-tel-ref" class="input" value="${f?.telefono_referente_ordini || ""}">
        </div>

        <div class="form-group">
          <label>Lead time (giorni)</label>
          <input id="f-lead" type="number" class="input" value="${f?.lead_time_giorni || ""}">
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

    if (f?.condizione_pagamento) {
      document.getElementById("f-pagamento").value = f.condizione_pagamento;
    }

    document
      .getElementById("save-fornitore")
      .addEventListener("click", async () => {

        const payload = {

          azienda_id: azienda.id,
          ragione_sociale: document.getElementById("f-ragione").value,
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

        let error;

        if (f) {

          ({ error } = await supabase
            .from("fornitori")
            .update(payload)
            .eq("id", f.id));

        } else {

          ({ error } = await supabase
            .from("fornitori")
            .insert(payload));

        }

        const feedback = document.getElementById("fornitore-feedback");

        if (error) {
          feedback.innerHTML = `<span style="color:red;">Errore salvataggio</span>`;
          return;
        }

        feedback.innerHTML = `<span style="color:green;">Salvato</span>`;

      });

  }

}
