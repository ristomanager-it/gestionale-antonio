export async function render(container) {

  const aziendaId = window.state?.azienda?.id;
  const sede = window.state?.sedeAttiva;

  container.innerHTML = `
    <div class="view pren-view">

      <style>
        /* 🔴 NASCONDE SOTTOHEADER GLOBALE */
        .topbar-global,
        .topbar-azienda{
          display:none !important;
        }

        /* HEADER */
        .pren-header{
          position:sticky;
          top:0;
          background:#fff;
          z-index:10;
          padding:8px;
          border-bottom:1px solid #eee;
        }

        .pren-header-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
        }

        .pren-title{
          font-size:14px;
          font-weight:700;
        }

        /* GIORNI */
        .pren-days{
          display:flex;
          gap:6px;
          overflow-x:auto;
          margin-top:6px;
        }

        .pren-day{
          min-width:48px;
          padding:6px;
          font-size:11px;
          text-align:center;
          border-radius:10px;
          background:#f3f4f6;
          cursor:pointer;
        }

        .pren-day.active{
          background:#0E5A7A;
          color:#fff;
        }

        /* LISTA */
        .pren-card{
          display:flex;
          justify-content:space-between;
          padding:10px;
          border-bottom:1px solid #eee;
          background:#fff;
        }

        .pren-left{
          display:flex;
          gap:10px;
        }

        .pren-time{
          font-weight:800;
          font-size:14px;
        }

        .pren-name{
          font-weight:700;
          font-size:13px;
        }

        .pren-meta{
          font-size:11px;
          color:#666;
        }

        .pren-actions{
          display:flex;
          gap:6px;
        }

        .pren-btn{
          border:none;
          background:#eef2f7;
          border-radius:8px;
          padding:6px 8px;
          cursor:pointer;
        }
      </style>

      <!-- HEADER -->
      <div class="pren-header">
        <div class="pren-header-top">
          <button id="menu-btn">☰</button>
          <div class="pren-title">${sede?.nome || "Prenotazioni"}</div>
          <button id="actions-btn">⋮</button>
        </div>
        <div id="pren-days" class="pren-days"></div>
      </div>

      <!-- LISTA -->
      <div id="lista"></div>

    </div>
  `;

  const lista = document.getElementById("lista");
  const daysBox = document.getElementById("pren-days");

  const today = new Date();
  let selectedDate = today.toISOString().split("T")[0];

  // GIORNI
  function renderDays(){
    daysBox.innerHTML = "";
    for(let i=-2;i<5;i++){
      const d = new Date();
      d.setDate(today.getDate()+i);

      const dateStr = d.toISOString().split("T")[0];

      const el = document.createElement("div");
      el.className = "pren-day";
      if(dateStr === selectedDate) el.classList.add("active");

      el.innerText = d.getDate();

      el.onclick = ()=>{
        selectedDate = dateStr;
        renderDays();
        load();
      };

      daysBox.appendChild(el);
    }
  }

  // FORMAT ORA
  function formatOra(ora){
    if(!ora) return "--:--";
    return ora.slice(0,5);
  }

  async function load(){

    lista.innerHTML = "Caricamento...";

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("data", selectedDate)
      .order("ora",{ascending:true});

    const {data,error} = await query;

    if(error){
      lista.innerHTML = "Errore";
      return;
    }

    if(!data?.length){
      lista.innerHTML = "Nessuna prenotazione";
      return;
    }

    lista.innerHTML = data.map(p=>`
      <div class="pren-card">
        <div class="pren-left">
          <div class="pren-time">${formatOra(p.ora)}</div>

          <div>
            <div class="pren-name">${p.cliente_nome || "Cliente"}</div>
            <div class="pren-meta">
              👥 ${p.coperti || 0}
              ${p.cliente_telefono ? " · 📞" : ""}
            </div>
          </div>
        </div>

        <div class="pren-actions">
          <button class="pren-btn">🪑</button>
          <button class="pren-btn">📞</button>
        </div>
      </div>
    `).join("");
  }

  renderDays();
  load();
}
