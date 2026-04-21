export async function render(container) {

  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;

  container.innerHTML = `
    <div class="view">

      <!-- HEADER -->
      <div class="pren-header">
        <div class="pren-header-top">
          <button id="pren-menu-btn">☰</button>
          <div class="pren-title">${sede?.nome || "Prenotazioni"}</div>
          <button id="pren-actions-btn">⋮</button>
        </div>

        <div class="pren-days" id="pren-days"></div>
      </div>

      <!-- TABS -->
      <div class="pren-tabs">
        <div class="pren-tab active">Prenotazioni</div>
        <div class="pren-tab">Arrivi</div>
        <div class="pren-tab">Piantina</div>
      </div>

      <!-- TOOLBAR -->
      <div class="pren-toolbar">
        <button id="qr-btn">📷</button>

        <select id="filtro-servizio">
          <option value="">Tutti</option>
          <option value="pranzo">🌞 Pranzo</option>
          <option value="cena">🌙 Cena</option>
        </select>

        <input type="date" id="filtro-data" class="input"/>
      </div>

      <!-- LISTA -->
      <div id="lista-prenotazioni"></div>

      <!-- MENU OPERATIVO -->
      <div id="pren-menu" class="pren-menu">
        <div class="pren-menu-content">
          <div class="pren-menu-item">⚙️ Preferenze conferma</div>
          <div class="pren-menu-item">📥 Richieste prenotazione</div>
          <div class="pren-menu-item">⏳ Overbooking</div>
          <div class="pren-menu-item">➡️ Arrivati</div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="app-footer">
        <div class="footer-item" onclick="location.hash='#/prenotazioni'">
          <div class="footer-icon">📅</div>
          <div class="footer-label">Agenda</div>
        </div>

        <div class="footer-item" id="new-pren">
          <div class="footer-icon">➕</div>
          <div class="footer-label">Nuovo</div>
        </div>

        <div class="footer-item">
          <div class="footer-icon">💬</div>
          <div class="footer-label">Messaggi</div>
        </div>
      </div>

    </div>
  `;

  const lista = document.getElementById("lista-prenotazioni");
  const filtroData = document.getElementById("filtro-data");

  filtroData.value = new Date().toISOString().split("T")[0];

  document.getElementById("new-pren").onclick = () => {
    window.location.hash = "#/prenotazione-tavolo-form";
  };

  // MENU OPERATIVO
  const menu = document.getElementById("pren-menu");
  document.getElementById("pren-actions-btn").onclick = () => {
    menu.classList.toggle("open");
  };
  menu.onclick = () => menu.classList.remove("open");

  // GIORNI SCORREVOLI
  const daysContainer = document.getElementById("pren-days");
  const today = new Date();

  for(let i=-2;i<5;i++){
    const d = new Date();
    d.setDate(today.getDate()+i);

    const el = document.createElement("div");
    el.className = "pren-day";
    el.innerText = d.getDate();
    el.onclick = () => {
      filtroData.value = d.toISOString().split("T")[0];
      load();
    };

    daysContainer.appendChild(el);
  }

  let prenotazioni = [];

  async function load(){

    lista.innerHTML = "Caricamento...";

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("azienda_id", azienda?.id);

    if(sede?.id){
      query = query.eq("sede_id", sede.id);
    }

    if(filtroData.value){
      query = query.eq("data", filtroData.value);
    }

    query = query.order("ora", {ascending:true});

    const {data,error} = await query;

    if(error){
      lista.innerHTML = "Errore";
      return;
    }

    prenotazioni = data || [];

    if(!prenotazioni.length){
      lista.innerHTML = "Nessuna prenotazione";
      return;
    }

    lista.innerHTML = prenotazioni.map(renderRow).join("");

    attachEvents();
  }

  function renderRow(p){

    const statoColor = {
      nuova:"#fbbf24",
      confermata:"#3b82f6",
      arrivata:"#22c55e",
      no_show:"#ef4444",
      annullata:"#9ca3af"
    }[p.stato] || "#ccc";

    return `
      <div class="pren-card">
        <div class="pren-left">
          <div class="pren-time">${p.ora || "--:--"}</div>
        </div>

        <div class="pren-center">
          <div class="pren-name">${p.cliente_nome || "Cliente"}</div>
          <div class="pren-meta">
            👥 ${p.coperti || 0}
            ${p.cliente_telefono ? " · 📞" : ""}
          </div>
        </div>

        <div class="pren-right">
          <div class="pren-stato" style="background:${statoColor}"></div>
          <button class="assegna" data-id="${p.id}">🪑</button>
        </div>
      </div>
    `;
  }

  function attachEvents(){

    document.querySelectorAll(".assegna").forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.dataset.id;

        const {data:tavoli} = await window.supabaseClient
          .from("tavoli")
          .select("*")
          .eq("azienda_id", azienda?.id);

        if(!tavoli?.length) return;

        const t = tavoli[0];

        await window.supabaseClient
          .from("prenotazioni_tavoli")
          .update({tavolo_id:t.id})
          .eq("id",id);

        load();
      };
    });

  }

  load();
}
