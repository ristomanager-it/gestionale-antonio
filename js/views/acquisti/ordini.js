export async function renderOrdini(container, azienda) {

  const supabase = window.supabaseClient;

  container.innerHTML = `

  <div class="card">

    <h3>Scrivi ordine</h3>

    <div id="lista-ordine"></div>

    <div style="margin-top:12px">
      <button id="btn-add-riga" class="btn-primary">
        Aggiungi riga
      </button>
    </div>

  </div>

  <div id="ordini-generati" style="margin-top:16px"></div>

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

    row.className = "card";

    row.innerHTML = `

      <div class="rf-grid">

        <div>
          <label>Prodotto</label>

          <input 
            class="input input-prodotto"
            list="prodotti-list"
            placeholder="Scrivi o scegli prodotto"
          >

          <datalist id="prodotti-list">

            ${prodotti.map(p=>`
              <option value="${p.nome}">
            `).join("")}

          </datalist>

        </div>

        <div>
          <label>UM</label>
          <div class="um-prodotto"></div>
        </div>

        <div>
          <label>Quantità</label>
          <input class="input qta-prodotto" type="number" value="${qta}">
        </div>

      </div>

      <div class="fornitore-missing" style="margin-top:8px"></div>

    `;

    lista.appendChild(row);

    const input=row.querySelector(".input-prodotto");
    const um=row.querySelector(".um-prodotto");

    input.addEventListener("input",()=>{

      const nome=input.value.toLowerCase();

      const prod=prodotti.find(p=>p.nome.toLowerCase()===nome);

      um.innerText=prod?.unita_misura||"";

      generaOrdini();

    });

    if(prodottoId){

      const prod=prodotti.find(p=>p.id==prodottoId);

      if(prod){
        input.value=prod.nome;
        um.innerText=prod.unita_misura||"";
      }

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

  container.addEventListener("input", generaOrdini);

  function generaOrdini(){

    const ordini={};

    document.querySelectorAll("#lista-ordine > .card").forEach(r=>{

      const nome=r.querySelector(".input-prodotto").value.trim().toLowerCase();
      const qta=parseFloat(r.querySelector(".qta-prodotto").value||0);

      if(!nome || qta<=0) return;

      const prodotto=prodotti.find(p=>p.nome.toLowerCase()===nome);

      if(!prodotto) return;

      const fornId=prodotto.fornitore_preferito_id;

      if(!fornId){
        renderSelectFornitore(r,prodotto.id);
        return;
      }

      if(!ordini[fornId]){
        ordini[fornId]=[];
      }

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

    let html="";

    for(const fid in ordini){

      const forn=fornitori.find(f=>f.id==fid);

      const prodottiForn=ordini[fid];

      const testoMail = prodottiForn
        .map(p=>`${p.nome} ${p.quantita} ${p.um}`)
        .join("\\n");

      html+=`

      <div class="card">

        <strong>${forn?.ragione_sociale||"Fornitore non assegnato"}</strong>

        <div style="font-size:13px;color:#666">

          ${forn?.telefono_referente_ordini||""}<br>
          ${forn?.email_referente_ordini||""}

        </div>

        ${prodottiForn.map(p=>`

          <div class="rf-grid" style="margin-top:8px">

            <div>${p.nome}</div>
            <div>${p.quantita}</div>
            <div>${p.um||""}</div>

          </div>

        `).join("")}

        <div style="margin-top:10px">

          <button class="btn-primary"
            onclick="window.location.href='mailto:${forn?.email_referente_ordini}?subject=Ordine&body=${encodeURIComponent(testoMail)}'">

            Invia ordine

          </button>

        </div>

      </div>

      `;

    }

    wrapperOrdini.innerHTML=html;

  }

  await loadData();
  await initOrdineDraft();

}
