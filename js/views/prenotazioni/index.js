import { eseguiAutomazioni } from "../../services/automazioni.js";

export async function render(container) {

  const aziendaId = window.state?.azienda?.id;
  const sede = window.state?.sedeAttiva;

  // 🔥 memoria locale anti-spam
  const automazioniEseguite = new Set();

  container.innerHTML = `
    <div class="view pren-view">

      <style>
        .topbar-global,
        .topbar-azienda{
          display:none !important;
        }

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
          cursor:pointer;
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

        .confirm{
          background:#22c55e;
          color:#fff;
        }
      </style>

      <div class="pren-header">
        <div class="pren-header-top">
          <button id="menu-btn">☰</button>
          <div class="pren-title">${sede?.nome || "Prenotazioni"}</div>
          <button id="actions-btn">⋮</button>
        </div>
        <div id="pren-days" class="pren-days"></div>
      </div>

      <div id="lista"></div>

    </div>
  `;

  const lista = document.getElementById("lista");
  const daysBox = document.getElementById("pren-days");

  const today = new Date();
  let selectedDate = today.toISOString().split("T")[0];

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

  function formatOra(ora){
    if(!ora) return "--:--";
    return ora.slice(0,5);
  }

  async function confermaPrenotazione(pren){

    await window.supabaseClient
      .from("prenotazioni_tavoli")
      .update({ stato: "confermata" })
      .eq("id", pren.id);

    // 🔥 AUTOMAZIONE IMMEDIATA
    eseguiAutomazioni("prenotazione_confermata", pren);

    load();
  }

  async function load(){

    lista.innerHTML = "Caricamento...";

    const {data,error} = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("data", selectedDate)
      .order("ora",{ascending:true});

    if(error){
      lista.innerHTML = "Errore";
      return;
    }

    if(!data?.length){
      lista.innerHTML = "Nessuna prenotazione";
      return;
    }

    // 🔥 AUTOMAZIONI CON TIMING (REMINDER)
    data.forEach(p => {

      const key = p.id + "_reminder";

      if(!automazioniEseguite.has(key)){
        automazioniEseguite.add(key);
        eseguiAutomazioni("prenotazione_confermata", p);
      }

    });

    lista.innerHTML = data.map(p=>`
      <div class="pren-card">
        <div class="pren-left">
          <div class="pren-time">${formatOra(p.ora)}</div>

          <div>
            <div class="pren-name cliente-link" data-id="${p.contatto_id || ""}">
              ${p.cliente_nome || "Cliente"}
            </div>
            <div class="pren-meta">
              👥 ${p.coperti || 0}
              ${p.cliente_telefono ? " · 📞" : ""}
            </div>
          </div>
        </div>

        <div class="pren-actions">
          <button class="pren-btn call" data-phone="${p.cliente_telefono || ""}">📞</button>
          <button class="pren-btn confirm" data-id="${p.id}">✅</button>
        </div>
      </div>
    `).join("");

    document.querySelectorAll(".call").forEach(btn=>{
      btn.onclick = ()=>{
        const phone = btn.dataset.phone;
        if(phone){
          window.location.href = "tel:" + phone;
        }
      };
    });

    document.querySelectorAll(".confirm").forEach(btn=>{
      btn.onclick = ()=>{
        const pren = data.find(p => p.id == btn.dataset.id);
        confermaPrenotazione(pren);
      };
    });

    document.querySelectorAll(".cliente-link").forEach(el=>{
      el.onclick = ()=>{
        const id = el.dataset.id;
        if(id){
          window.location.hash = "#/contatto-dettaglio?id=" + id;
        }
      };
    });

  }

  renderDays();
  load();
}
