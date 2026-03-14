export async function renderOrdini(container, azienda) {

  const supabase = window.supabaseClient;

  container.innerHTML = `

  <div class="card">

    <h3>Scrivi ordine</h3>

    <div id="lista-ordine"></div>

    <div style="margin-top:10px">
      <button id="btn-add-riga" class="app-button">
        + aggiungi riga
      </button>
    </div>

  </div>

  <div id="ordini-generati"></div>

  `;

  const lista = container.querySelector("#lista-ordine");
  const wrapperOrdini = container.querySelector("#ordini-generati");

  let prodotti = [];
  let fornitori = [];

  async function loadData(){

    const { data:prodottiData } = await supabase
      .from("prodotti")
      .select("id,nome,fornitore_preferito_id")
      .eq("azienda_id", azienda.id)
      .eq("attivo", true);

    prodotti = prodottiData || [];

    const { data:fornitoriData } = await supabase
      .from("fornitori")
      .select("id,ragione_sociale,email_referente_ordini,telefono_referente_ordini")
      .eq("azienda_id", azienda.id);

    fornitori = fornitoriData || [];

  }

  function addRiga(nome="", qta=1){

    const row = document.createElement("div");

    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.marginBottom = "8px";
    row.style.flexWrap = "wrap";

    row.innerHTML = `

      <input class="input nome-prodotto" placeholder="Prodotto" value="${nome}">

      <input class="input qta-prodotto" type="number" value="${qta}" style="width:80px">

      <div class="fornitore-missing"></div>

    `;

    lista.appendChild(row);

  }

  document
    .getElementById("btn-add-riga")
    .addEventListener("click", () => addRiga());

  async function initOrdineDraft(){

    const draft = window.state?.ordineDraft || [];

    if(!draft.length){
      addRiga();
      return;
    }

    draft.forEach(r => {
      addRiga(r.nome, r.quantita);
    });

    generaOrdini();

  }

  container.addEventListener("input", generaOrdini);

  async function generaOrdini(){

    const righe = [];

    document.querySelectorAll("#lista-ordine > div").forEach(r => {

      const nome = r.querySelector(".nome-prodotto").value.trim();
      const qta = parseFloat(r.querySelector(".qta-prodotto").value || 0);

      if(nome && qta > 0){

        righe.push({
          nome,
          quantita:qta,
          element:r
        });

      }

    });

    if(!righe.length){

      wrapperOrdini.innerHTML="";
      return;

    }

    const ordini = {};

    for(const r of righe){

      const prodotto = prodotti.find(p =>
        p.nome.toLowerCase() === r.nome.toLowerCase()
      );

      if(!prodotto){

        r.element.querySelector(".fornitore-missing").innerHTML="";
        continue;

      }

      let fornitoreId = prodotto.fornitore_preferito_id;

      if(!fornitoreId){

        renderSelectFornitore(r.element, prodotto.id);
        continue;

      }

      if(!ordini[fornitoreId]){
        ordini[fornitoreId] = [];
      }

      ordini[fornitoreId].push({
        nome:r.nome,
        quantita:r.quantita
      });

    }

    renderOrdiniFornitori(ordini);

  }

  function renderSelectFornitore(element, prodottoId){

    const div = element.querySelector(".fornitore-missing");

    div.innerHTML = `

      <select class="input select-fornitore">

        <option value="">Scegli fornitore</option>

        ${fornitori.map(f => `
          <option value="${f.id}">
            ${f.ragione_sociale}
          </option>
        `).join("")}

      </select>

    `;

    div.querySelector("select")
      .addEventListener("change", async e => {

        const fornitoreId = e.target.value;

        if(!fornitoreId) return;

        await supabase
          .from("prodotti")
          .update({
            fornitore_preferito_id:fornitoreId
          })
          .eq("id", prodottoId);

        const prod = prodotti.find(p => p.id === prodottoId);

        if(prod){
          prod.fornitore_preferito_id = fornitoreId;
        }

        generaOrdini();

      });

  }

  function renderOrdiniFornitori(ordini){

    let html = `<div class="card"><h3>Ordini generati</h3>`;

    for(const fornitoreId in ordini){

      const fornitore = fornitori.find(f => f.id == fornitoreId);

      html += `

      <div class="card" style="margin-top:16px">

        <strong>${fornitore?.ragione_sociale || "Fornitore non assegnato"}</strong>

        <div style="font-size:13px;color:#666">

          ${fornitore?.telefono_referente_ordini || ""}<br>
          ${fornitore?.email_referente_ordini || ""}

        </div>

        <table class="app-table" style="margin-top:8px">

          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Quantità</th>
            </tr>
          </thead>

          <tbody>

          ${ordini[fornitoreId].map(p => `
            <tr>
              <td>${p.nome}</td>
              <td>${p.quantita}</td>
            </tr>
          `).join("")}

          </tbody>

        </table>

      </div>

      `;

    }

    html += "</div>";

    wrapperOrdini.innerHTML = html;

  }

  await loadData();

  await initOrdineDraft();

}
