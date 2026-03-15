export async function renderPreparazioni(container, azienda) {

  const existing = document.getElementById("rf-overlay-preparazioni");
  if(existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id="rf-overlay-preparazioni";

  overlay.innerHTML=`
  <div class="rf-overlay-backdrop">

    <div class="rf-overlay-card">

      <div class="rf-overlay-header">
        <h3 class="rf-overlay-title">Preparazioni</h3>
        <button class="app-button tiny gray" data-close-overlay>Chiudi</button>
      </div>

      <div class="rf-overlay-body">

        <div class="rf-field">
          <label>Ricerca preparazione</label>
          <input
            id="search-prep"
            class="input"
            placeholder="Codice o descrizione..."
            autocomplete="off"
          />
        </div>

        <div id="prep-results"></div>

        <div id="prep-scheda" class="rf-section-spacer"></div>

      </div>

    </div>

  </div>
  `;

  document.body.appendChild(overlay);

  const backdrop = overlay.querySelector(".rf-overlay-backdrop");
  const results = overlay.querySelector("#prep-results");
  const scheda = overlay.querySelector("#prep-scheda");
  const input = overlay.querySelector("#search-prep");

  const close = ()=>overlay.remove();

  overlay.querySelector("[data-close-overlay]").onclick=close;

  backdrop.onclick=(e)=>{
    if(e.target===backdrop) close();
  };

  input.oninput = async()=>{

    const term = input.value.trim();

    if(term.length<2){
      results.innerHTML="";
      scheda.innerHTML="";
      return;
    }

    const {data,error} = await window.supabaseClient
      .from("prodotti")
      .select("id,codice_interno,descrizione,unita_base")
      .eq("azienda_id",azienda.id)
      .or(`codice_interno.ilike.%${term}%,descrizione.ilike.%${term}%`)
      .limit(10);

    if(error){
      console.error(error);
      results.innerHTML=`<div class="rf-empty-state">Errore ricerca</div>`;
      return;
    }

    if(!data?.length){
      results.innerHTML=`<div class="rf-empty-state">Nessuna preparazione trovata</div>`;
      return;
    }

    results.innerHTML=`
    <div class="rf-search-list">
      ${data.map(p=>`
        <div class="rf-search-item">

          <div class="rf-search-row">

            <div class="rf-search-main">
              <div class="rf-search-code">${escapeHtml(p.codice_interno||"-")}</div>
              <div class="rf-search-title">${escapeHtml(p.descrizione)}</div>
              <div class="rf-search-subtitle">
                UM ${escapeHtml(p.unita_base||"-")}
              </div>
            </div>

            <button
              class="rf-search-action open-prep"
              data-id="${p.id}"
            >🔍</button>

          </div>

        </div>
      `).join("")}
    </div>
    `;

    results.querySelectorAll(".open-prep").forEach(btn=>{

      btn.onclick=()=>{
        const id = Number(btn.dataset.id);
        openScheda(id);
        results.innerHTML="";
      };

    });

  };

  async function openScheda(prodottoId){

    scheda.innerHTML="Caricamento...";

    const sedeId = window.state?.sedeAttiva?.id;

    const {data,error} = await window.supabaseClient
      .from("v_magazzino_giacenze")
      .select("*")
      .eq("azienda_id",azienda.id)
      .eq("sede_id",sedeId)
      .eq("prodotto_id",prodottoId)
      .single();

    if(error || !data){
      scheda.innerHTML=`<div class="rf-empty-state">Preparazione non trovata</div>`;
      return;
    }

    const {data:movimenti} = await window.supabaseClient
      .from("magazzino_movimenti")
      .select("tipo_movimento,quantita,data_movimento")
      .eq("azienda_id",azienda.id)
      .eq("sede_id",sedeId)
      .eq("prodotto_id",prodottoId)
      .order("data_movimento",{ascending:false})
      .limit(5);

    const canEdit = ["admin","manager"].includes(window.state?.ruolo);

    scheda.innerHTML=`
    <div class="rf-product-card">

      <div class="rf-product-heading">
        <div class="rf-product-code">${escapeHtml(data.codice_interno)}</div>
        <div class="rf-product-title">${escapeHtml(data.descrizione)}</div>
      </div>

      <div class="rf-product-grid">

        <div class="rf-product-field">
          <span class="rf-product-label">UM</span>
          <div class="rf-product-value">${escapeHtml(data.unita_base)}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Giacenza</span>
          <div class="rf-product-value">${formatNumber(data.giacenza_attuale)}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Scorta minima</span>
          <div class="rf-product-value">${formatNumber(data.scorta_minima)}</div>
        </div>

      </div>

      <div class="rf-product-section-title">Ultimi movimenti</div>

      <div class="rf-mov-list">
      ${
        movimenti?.length
        ? movimenti.map(m=>`
          <div class="rf-mov-item">
            <div class="rf-mov-main">
              ${escapeHtml(m.tipo_movimento)} · ${formatNumber(m.quantita)}
            </div>
            <div class="rf-mov-meta">${formatDateTime(m.data_movimento)}</div>
          </div>
        `).join("")
        : `<div class="rf-empty-state">Nessun movimento</div>`
      }
      </div>

      ${
        canEdit
        ? `<button class="app-button tiny" style="margin-top:10px;">Modifica</button>`
        : ""
      }

    </div>
    `;

  }

}

function formatNumber(v){
  const n=Number(v||0);
  return n.toLocaleString("it-IT",{maximumFractionDigits:3});
}

function formatDateTime(v){
  if(!v) return "-";
  return new Date(v).toLocaleString("it-IT");
}

function escapeHtml(v){
  return String(v??"")
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;");
}
