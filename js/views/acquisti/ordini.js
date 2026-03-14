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
      .select("id,nome,fornitore_preferito_id,unita_misura")
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .order("nome");

    prodotti = prodottiData || [];

    const { data:fornitoriData } = await supabase
      .from("fornitori")
      .select("id,ragione_sociale,email_referente_ordini,telefono_referente_ordini")
      .eq("azienda_id", azienda.id);

    fornitori = fornitoriData || [];

  }

  function addRiga(prodottoId=null, qta=1){

    const row = document.createElement("div");

    row.style.display="flex";
    row.style.gap="8px";
    row.style.marginBottom="8px";
    row.style.flexWrap="wrap";
    row.style.alignItems="center";

    row.innerHTML=`

      <select class="input select-prodotto">

        <option value="">Seleziona prodotto</option>

        ${prodotti.map(p=>`
          <option value="${p.id}">
            ${p.nome}
          </option>
        `).join("")}

      </select>

      <span class="um-prodotto" style="min-width:40px;color:#666"></span>

      <input class="input qta-prodotto" type="number" value="${qta}" style="width:80px">

      <div class="fornitore-missing"></div>

    `;

    lista.appendChild(row);

    const select=row.querySelector(".select-prodotto");
    const um=row.querySelector(".um-prodotto");

    select.addEventListener("change",()=>{

      const prod=prodotti.find(p=>p.id==select.value);

      um.innerText=prod?.unita_misura||"";

      generaOrdini();

    });

    if(prodottoId){

      select.value=prodottoId;

      const prod=prodotti.find(p=>p.id==prodottoId);

      um.innerText=prod?.unita_misura||"";

    }

  }

  document
    .getElementById("btn-add-riga")
    .addEventListener("click",()=>addRiga());

  async function initOrdineDraft(){

    const draft = window.state?.ordineDraft || [];

    if(!draft.length){

      addRiga();
      return;

    }

    draft.forEach(r=>{
      addRiga(r.prodotto_id,r.quantita);
    });

    generaOrdini();

  }

  container.addEventListener("change", generaOrdini);
  container.addEventListener("input", generaOrdini);

  async function generaOrdini(){

    const ordini={};

    document.querySelectorAll("#lista-ordine > div").forEach(r=>{

      const prodottoId=r.querySelector(".select-prodotto").value;
      const qta=parseFloat(r.querySelector(".qta-prodotto").value||0);

      if(!prodottoId||qta<=0) return;

      const prodotto=prodotti.find(p=>p.id==prodottoId);

      const fornId=prodotto?.fornitore_preferito_id;

      if(!fornId){

        renderSelectFornitore(r,prodottoId);
        return;

      }

      if(!ordini[fornId]) ordini[fornId]=[];

      ordini[fornId].push({
        nome:prodotto.nome,
        quantita:qta,
        um:prodotto.unita_misura
      });

    });

    renderOrdiniFornitori(ordini);

  }

  function renderSelectFornitore(element, prodottoId){

    const div=element.querySelector(".fornitore-missing");

    div.innerHTML=`

      <select class="input">

        <option value="">Scegli fornitore</option>

        ${fornitori.map(f=>`
          <option value="${f.id}">
            ${f.ragione_sociale}
          </option>
        `).join("")}

      </select>

    `;

    div.querySelector("select")
      .addEventListener("change",async e=>{

        const fornId=e.target.value;

        if(!fornId) return;

        await supabase
          .from("prodotti")
          .update({fornitore_preferito_id:fornId})
          .eq("id",prodottoId);

        const prod=prodotti.find(p=>p.id==prodottoId);

        if(prod) prod.fornitore_preferito_id=fornId;

        generaOrdini();

      });

  }

  function renderOrdiniFornitori(ordini){

    let html=`<div class="card"><h3>Ordini generati</h3>`;

    for(const fid in ordini){

      const forn=fornitori.find(f=>f.id==fid);

      html+=`

      <div class="card" style="margin-top:16px">

        <strong>${forn?.ragione_sociale||"Fornitore non assegnato"}</strong>

        <div style="font-size:13px;color:#666">

          ${forn?.telefono_referente_ordini||""}<br>
          ${forn?.email_referente_ordini||""}

        </div>

        <table class="app-table" style="margin-top:8px">

          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Quantità</th>
              <th>UM</th>
            </tr>
          </thead>

          <tbody>

          ${ordini[fid].map(p=>`
            <tr>
              <td>${p.nome}</td>
              <td>${p.quantita}</td>
              <td>${p.um||""}</td>
            </tr>
          `).join("")}

          </tbody>

        </table>

      </div>

      `;

    }

    html+="</div>";

    wrapperOrdini.innerHTML=html;

  }

  await loadData();

  await initOrdineDraft();

}
