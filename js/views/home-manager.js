const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function render(container) {

  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;
  const user = window.state?.user;

  if (!window.state?.sedeAttiva) {
    window.location.hash = "#/scegli-sede";
    return;
  }

  const today = new Date()
    .toISOString()
    .slice(0,10);

  const sedeUuid = window.state?.sedeAttiva?.id || null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowStr = tomorrow
    .toISOString()
    .slice(0,10);

  let servizi = [];
  let staff = [];
  let timbrature = [];

  try {

    const { data: serviziData } = await supabase
      .from("servizi")
      .select("*")
      .eq("azienda_id", azienda.id)
      .eq("data_servizio", today)
      .order("ora_inizio");

    servizi = serviziData || [];

    const { data: staffData } = await supabase
      .from("servizio_staff")
      .select("*")
      .eq("azienda_id", azienda.id);

    staff = staffData || [];

    let timbratureQuery = supabase
      .from("timbrature")
      .select("*")
      .eq("azienda_id", azienda.id)
      .gte("timestamp", `${today}T00:00:00`)
      .lt("timestamp", `${tomorrowStr}T00:00:00`);

    if (sedeUuid) {
      timbratureQuery = timbratureQuery.eq("sede_id", sedeUuid);
    }

    const { data: tData } = await timbratureQuery;

    timbrature = tData || [];

  } catch(e) {
    console.error(e);
  }

  // =========================
  // STATO STAFF LIVE
  // =========================

  const statoDip = {};

  timbrature.forEach(t => {
    statoDip[t.dipendente_id] = t.tipo;
  });

  const inTurno = Object
    .values(statoDip)
    .filter(t =>
      t === "inizio_turno" ||
      t === "fine_pausa"
    ).length;

  const inPausa = Object
    .values(statoDip)
    .filter(t => t === "inizio_pausa")
    .length;

  const fuori = Math.max(
    0,
    staff.length - inTurno - inPausa
  );

  // =========================
  // STATO SERVIZIO
  // =========================

  const copertiTotali = servizi.reduce(
    (acc, s) =>
      acc + (s.coperti_previsti || 0),
    0
  );

  let alertServizio =
    "✔ Tutto sotto controllo";

  if (copertiTotali > 50 && inTurno < 4) {
    alertServizio =
      "⚠️ Staff insufficiente";
  }

  if (servizi.length === 0) {
    alertServizio =
      "⚠️ Nessun servizio pianificato";
  }

  const serviziHtml = servizi.map(s => {

    const staffCount = staff.filter(
      st => st.servizio_id === s.id
    ).length;

    return `
      <div class="servizio-row">

        <div>
          ${s.tipo_servizio}
        </div>

        <div>
          ${s.coperti_previsti || 0} coperti
        </div>

        <div>
          👥 ${staffCount}
        </div>

      </div>
    `;

  }).join("");

  // =========================
  // RENDER
  // =========================

  container.innerHTML = `

  <div class="view manager-home">

    <!-- HEADER -->
    <div class="header">

      <div>

        <div
          class="saluto"
          id="home-saluto"
        >
        </div>

        <div class="utente">
          ${user?.email || ""}
        </div>

      </div>

      <div class="header-right">

        <div id="home-data"></div>

        <div id="home-weather">
          ☁️
        </div>

      </div>

    </div>

    <!-- 👥 STATO STAFF -->
    <div class="card">

      <div class="card-title">
        👥 Stato squadra
      </div>

      <div class="staff-grid">

        <div class="staff-box green">

          <div class="num">
            ${inTurno}
          </div>

          <div class="label">
            In turno
          </div>

        </div>

        <div class="staff-box yellow">

          <div class="num">
            ${inPausa}
          </div>

          <div class="label">
            In pausa
          </div>

        </div>

        <div class="staff-box red">

          <div class="num">
            ${fuori}
          </div>

          <div class="label">
            Fuori
          </div>

        </div>

      </div>

    </div>

    <!-- 🍽 SERVIZIO -->
    <div class="card">

      <div class="card-title">
        🍽 Servizio oggi
      </div>

      <div class="card-sub">
        ${copertiTotali} coperti previsti
      </div>

      <div class="card-sub">
        ${servizi.length} servizi
      </div>

      <div class="alert">
        ${alertServizio}
      </div>

      <div style="margin-top:10px;">
        ${serviziHtml || "Nessun servizio"}
      </div>

    </div>

    <!-- ⚡ AZIONI -->
    <div class="grid">

      <div
        class="card action-card"
        data-route="prenotazioni"
      >
        <div class="card-title">
          Prenotazioni
        </div>

        <div class="card-sub">
          Gestisci tavoli
        </div>
      </div>

      <div
        class="card action-card"
        data-route="planning-lavoro"
      >
        <div class="card-title">
          Planning
        </div>

        <div class="card-sub">
          Turni e orari
        </div>
      </div>

      <div
        class="card action-card"
        data-route="dipendenti"
      >
        <div class="card-title">
          Brigata
        </div>

        <div class="card-sub">
          ${staff.length} assegnati
        </div>
      </div>

      <div
        class="card action-card"
        data-route="timbrature"
      >
        <div class="card-title">
          Timbrature
        </div>

        <div class="card-sub">
          Controllo presenze
        </div>
      </div>

      <div
        class="card action-card"
        data-route="mansionario-sala"
      >
        <div class="card-title">
          🪑 Mansionario Sala
        </div>

        <div class="card-sub">
          Procedure & formazione
        </div>
      </div>

      <div
        class="card action-card"
        data-route="mansionario-controllo"
      >
        <div class="card-title">
          📊 Controllo Sala
        </div>

        <div class="card-sub">
          Esecuzioni & valutazioni
        </div>
      </div>

    </div>

    <!-- 🤖 -->
    <div
      class="tony-avatar"
      onclick="location.hash='#/ai'"
    >
      🤖
    </div>

  </div>

  <style>

  .manager-home{
    padding:16px;
    padding-bottom:100px;
  }

  .header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:12px;
    margin-bottom:20px;
  }

  .saluto{
    font-size:22px;
    font-weight:800;
    line-height:1.1;
  }

  .utente{
    margin-top:4px;
    font-size:13px;
    color:#6b7280;
  }

  .header-right{
    text-align:right;
    font-size:13px;
    color:#6b7280;
    font-weight:600;
  }

  .grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
    gap:12px;
    margin-top:12px;
  }

  .card{
    background:white;
    padding:16px;
    border-radius:14px;
    box-shadow:0 4px 12px rgba(0,0,0,0.05);
  }

  .card-title{
    font-weight:700;
  }

  .card-sub{
    font-size:12px;
    color:#6b7280;
    margin-top:4px;
  }

  .staff-grid{
    display:flex;
    gap:10px;
    margin-top:10px;
  }

  .staff-box{
    flex:1;
    border-radius:12px;
    padding:12px;
    text-align:center;
    color:white;
  }

  .staff-box.green{
    background:#16a34a;
  }

  .staff-box.yellow{
    background:#eab308;
  }

  .staff-box.red{
    background:#dc2626;
  }

  .staff-box .num{
    font-size:20px;
    font-weight:800;
  }

  .alert{
    margin-top:6px;
    font-size:13px;
    font-weight:600;
  }

  .servizio-row{
    display:flex;
    justify-content:space-between;
    font-size:13px;
    padding:6px 0;
    gap:10px;
  }

  .action-card{
    cursor:pointer;
    transition:0.15s;
  }

  .action-card:active{
    transform:scale(0.97);
    opacity:0.7;
  }

  .tony-avatar{
    position:fixed;
    right:18px;
    bottom:90px;
    width:56px;
    height:56px;
    border-radius:50%;
    background:#0ea5e9;
    color:white;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:24px;
    box-shadow:0 10px 24px rgba(14,165,233,0.28);
    z-index:50;
    cursor:pointer;
  }

  @media (max-width:767px){

    .manager-home{
      padding:12px;
      padding-bottom:100px;
    }

    .grid{
      grid-template-columns:1fr;
    }

    .staff-grid{
      flex-direction:column;
    }

    .saluto{
      font-size:20px;
    }

  }

  </style>
  `;

  initHeader();
  hydrateWeather();
  initActions();
}

// =========================
// HEADER
// =========================

function initHeader(){

  const salutoBox =
    document.getElementById("home-saluto");

  const dataBox =
    document.getElementById("home-data");

  const ora = new Date().getHours();

  let saluto = "Buongiorno";

  if (ora >= 12 && ora < 18) {
    saluto = "Buon pomeriggio";
  }

  if (ora >= 18) {
    saluto = "Buonasera";
  }

  if (salutoBox) {
    salutoBox.innerText = saluto;
  }

  if (dataBox) {

    dataBox.innerText = new Date()
      .toLocaleDateString(
        "it-IT",
        {
          weekday:"long",
          day:"numeric",
          month:"long",
          year:"numeric"
        }
      );

  }
}

// =========================
// ACTIONS
// =========================

function initActions(){

  document
    .querySelectorAll(".action-card")
    .forEach(card => {

      card.onclick = () => {

        const route =
          card.dataset.route;

        if (route) {
          window.location.hash =
            "#/" + route;
        }

      };

    });

}

// =========================
// METEO
// =========================

async function hydrateWeather(){

  const box =
    document.getElementById("home-weather");

  if(!box) return;

  box.innerHTML = "☁️";

}
