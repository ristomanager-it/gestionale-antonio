export async function render(container){

  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;
  const user = window.state?.user;

  if (!window.state?.sedeAttiva) {
    window.location.hash = "#/scegli-sede";
    return;
  }

  const today = new Date().toISOString().slice(0,10);

  // =========================
  // TIMBRATURA
  // =========================

  let stato = "none";

  try {

    const { data } = await supabase
      .from("timbrature")
      .select("tipo, timestamp")
      .eq("azienda_id", azienda.id)
      .eq("dipendente_id", user.id)
      .order("timestamp", { ascending:false })
      .limit(1);

    const last = data?.[0];

    if (last) {

      if (
        last.tipo === "inizio_turno" ||
        last.tipo === "fine_pausa"
      ) {
        stato = "in";
      }

      if (last.tipo === "inizio_pausa") {
        stato = "pausa";
      }

      if (last.tipo === "fine_turno") {
        stato = "out";
      }
    }

  } catch(e) {
    console.error(e);
  }

  // =========================
  // SERVIZIO
  // =========================

  let servizio = null;

  try {

    const { data } = await supabase
      .from("servizi")
      .select("*")
      .eq("azienda_id", azienda.id)
      .eq("data_servizio", today)
      .limit(1);

    servizio = data?.[0] || null;

  } catch(e) {
    console.error(e);
  }

  // =========================
  // LABELS
  // =========================

  const statoLabel = {
    in: "🟢 In turno",
    pausa: "🟡 In pausa",
    out: "🔴 Turno chiuso",
    none: "⚪ Non timbrato"
  }[stato];

  const servizioLabel =
    servizio?.tipo_servizio || "Nessun servizio";

  // =========================
  // RENDER
  // =========================

  container.innerHTML = `

  <div class="view operatore-home">

    <!-- HEADER -->
    <div class="home-header">

      <div>
        <div class="saluto" id="home-saluto"></div>
        <div class="utente">
          ${user?.email || ""}
        </div>
      </div>

      <div class="header-right">
        <div id="home-data"></div>
      </div>

    </div>

    <!-- ⏱ STATO -->
    <div class="card stato-card">

      <div class="card-title">
        ⏱ Stato
      </div>

      <div class="big">
        ${statoLabel}
      </div>

    </div>

    <!-- 📅 SERVIZIO -->
    <div class="card">

      <div class="card-title">
        📅 Oggi
      </div>

      <div class="big">
        ${servizioLabel}
      </div>

    </div>

    <!-- ⚡ AZIONI -->
    <div class="grid">

      <div class="card action" data-route="timbrature">
        <div class="card-title">Timbratura</div>
        <div class="card-sub">Entrata / pausa</div>
      </div>

      <div class="card action" data-route="planning-lavoro">
        <div class="card-title">Planning</div>
        <div class="card-sub">Turni</div>
      </div>

      <div class="card action" data-route="prenotazioni">
        <div class="card-title">Prenotazioni</div>
        <div class="card-sub">Servizio</div>
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

  .operatore-home{
    padding:16px;
    padding-bottom:100px;
  }

  .home-header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    margin-bottom:18px;
    gap:12px;
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

  .big{
    font-size:20px;
    font-weight:800;
    margin-top:6px;
  }

  .grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
    margin-top:10px;
  }

  .card{
    background:white;
    padding:14px;
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

  .stato-card{
    background:#f0f9ff;
  }

  .action{
    cursor:pointer;
    transition:0.15s;
  }

  .action:active{
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

    .operatore-home{
      padding:12px;
      padding-bottom:100px;
    }

    .grid{
      grid-template-columns:1fr;
    }

    .saluto{
      font-size:20px;
    }

  }

  </style>
  `;

  initHeader();
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
    dataBox.innerText = new Date().toLocaleDateString(
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
// CLICK
// =========================

function initActions(){

  document
    .querySelectorAll(".action")
    .forEach(el => {

      el.onclick = () => {

        const route = el.dataset.route;

        if (route) {
          window.location.hash = "#/" + route;
        }

      };

    });

}
