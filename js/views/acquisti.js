import "../supabaseClient.js";
import "../state.js";

export async function render(container) {
  const azienda = window.state.azienda;

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <h3>Nessuna azienda attiva</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2>Fattura di Acquisto</h2>

      <div style="margin-bottom:12px;">
        <label>Numero fattura</label>
        <input id="fattura-numero" class="input-pill" />

        <label>Data</label>
        <input id="fattura-data" type="date" class="input-pill" />

        <label>Note</label>
        <input id="fattura-note" class="input-pill" />
      </div>

      <h3>Righe fattura</h3>
      <div id="righe-container"></div>

      <button id="btn-add-riga" class="app-button small gray">
        + Aggiungi Riga
      </button>

      <hr style="margin:16px 0;" />

      <button id="btn-salva-fattura" class="app-button small green">
        Salva e Processa
      </button>

      <div id="fattura-feedback" style="margin-top:10px;"></div>
    </div>
  `;

  const righeContainer = document.getElementById("righe-container");
  const btnAddRiga = document.getElementById("btn-add-riga");
  const btnSalva = document.getElementById("btn-salva-fattura");
  const feedback = document.getElementById("fattura-feedback");

  let righe = [];

  function renderRighe() {
    righeContainer.innerHTML = "";

    righe.forEach((riga, index) => {
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "10px";

      wrapper.innerHTML = `
        <input 
          type="number" 
          placeholder="ID Prodotto" 
          value="${riga.prodotto_id || ""}" 
          data-index="${index}"
          class="input-pill riga-prodotto" 
        />

        <input 
          type="number" 
          step="0.001"
          placeholder="Quantità" 
          value="${riga.quantita || ""}" 
          data-index="${index}"
          class="input-pill riga-quantita" 
        />

        <input 
          type="number" 
          step="0.0001"
          placeholder="Costo unitario" 
          value="${riga.prezzo_unitario || ""}" 
          data-index="${index}"
          class="input-pill riga-prezzo" 
        />
      `;

      righeContainer.appendChild(wrapper);
    });
  }

  btnAddRiga.addEventListener("click", () => {
    righe.push({
      prodotto_id: null,
      quantita: 0,
      prezzo_unitario: 0
    });

    renderRighe();
  });

  righeContainer.addEventListener("input", (e) => {
    const index = e.target.dataset.index;
    if (index === undefined) return;

    if (e.target.classList.contains("riga-prodotto")) {
      righe[index].prodotto_id = Number(e.target.value);
    }

    if (e.target.classList.contains("riga-quantita")) {
      righe[index].quantita = Number(e.target.value);
    }

    if (e.target.classList.contains("riga-prezzo")) {
      righe[index].prezzo_unitario = Number(e.target.value);
    }
  });

  btnSalva.addEventListener("click", async () => {
    feedback.innerHTML = "Salvataggio in corso...";

    try {
      // 1️⃣ Inserimento header fattura
      const { data: fattura, error: errHeader } =
        await window.supabaseClient
          .from("fatture_acquisto")
          .insert({
            azienda_id: azienda.id,
            numero: document.getElementById("fattura-numero").value,
            data: document.getElementById("fattura-data").value,
            note: document.getElementById("fattura-note").value,
          })
          .select()
          .single();

      if (errHeader) throw errHeader;

      // 2️⃣ Inserimento righe
      const righePulite = righe
        .filter(r => r.prodotto_id && r.quantita > 0)
        .map(r => ({
          azienda_id: azienda.id,
          fattura_id: fattura.id,
          prodotto_id: r.prodotto_id,
          quantita: r.quantita,
          prezzo_unitario: r.prezzo_unitario,
        }));

      if (righePulite.length > 0) {
        const { error: errRighe } =
          await window.supabaseClient
            .from("fatture_acquisto_righe")
            .insert(righePulite);

        if (errRighe) throw errRighe;
      }

      // 3️⃣ Processamento ERP (movimenti + costo medio)
      const { error: errRpc } =
        await window.supabaseClient.rpc(
          "processa_fattura_acquisto",
          {
            p_azienda_id: azienda.id,
            p_fattura_id: fattura.id
          }
        );

      if (errRpc) throw errRpc;

      feedback.innerHTML =
        "<span style='color:green;'>Fattura salvata e processata correttamente.</span>";

      // Reset stato locale
      righe = [];
      renderRighe();

    } catch (err) {
      console.error(err);
      feedback.innerHTML =
        "<span style='color:red;'>Errore: " + err.message + "</span>";
    }
  });
}
