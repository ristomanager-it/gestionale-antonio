// js/views/home.js
// =======================================
// Dashboard intelligente ruolo-based
// =======================================

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function render(container) {

  const user = window.state.user;
  const azienda = window.state.azienda;
  const ruolo = window.state?.ruolo;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento dashboard</div>`;
    return;
  }

  if (!window.state.sedi || window.state.sedi.length === 0) {
    await window.stateActions.caricaSedi();
  }

  const sedi = window.state.sedi || [];

  if (sedi.length === 1 && !window.state.sedeAttiva) {
    window.stateActions.setSedeAttiva(sedi[0].id);
  }

  const saluto = getSaluto();
  const dataOggi = getDataFormattata();

  const briefingTony = getTonyBriefing(ruolo);

  const repartiVisibili = getRepartiVisibili(ruolo);

  container.innerHTML = `

  <div class="view" style="padding:0;">

    <!-- HEADER -->

    <div class="home-header">

      <div class="home-header-left">

        <h2 class="home-title">
          ${saluto} 👋
        </h2>

        <div class="home-meta">

          <span class="home-date">
            ${dataOggi}
          </span>

          <span id="home-weather-inline" class="home-weather">
            ⏳
          </span>

        </div>

        <div class="home-sede">

          ${
            window.state.sedeAttiva
              ? `Sede: <strong>${window.state.sedeAttiva.nome}</strong>`
              : `Seleziona una sede`
          }

        </div>

      </div>

      <div class="home-header-right">

        ${renderSedeSelector()}

        ${
          ruolo === "superadmin"
            ? `
            <button
              onclick="window.location.hash='#/homePiattaforma'"
              class="btn-platform"
            >
              ⚙ Piattaforma
            </button>
            `
            : ``
        }

      </div>

    </div>

    <!-- TONY BRIEFING -->

    <div class="home-tony">

      <div class="home-tony-icon">
        🤖
      </div>

      <div class="home-tony-text">
        ${briefingTony}
      </div>

    </div>

    <!-- ACCESSO RAPIDO SETTORI -->

    ${
      window.state.sedeAttiva
        ? `
        <div class="home-grid">

          ${
            repartiVisibili.map((rep,index)=>`

              <div
                onclick="window.location.hash='#/${rep.key}'"
                class="home-card"
                style="animation-delay:${index * 0.08}s"
              >

                <div class="home-card-icon">
                  ${rep.icon}
                </div>

                <div class="home-card-title">
                  ${rep.label}
                </div>

              </div>

            `).join("")}

        </div>
        `
        : `
        <div class="home-empty">
          Seleziona una sede per accedere ai moduli operativi.
        </div>
        `
    }

    <!-- CARD OPERATIVE RUOLO -->

    <div class="home-role-cards">

      ${renderRoleCards(ruolo)}

    </div>

    <!-- CHAT TONY -->

    <div class="home-tony-chat">

      <div class="home-tony-chat-title">
        🤖 Tony AI
      </div>

      <div class="home-tony-chat-body">
        Hai bisogno di aiuto operativo?
      </div>

      <button
        onclick="window.location.hash='#/ai'"
        class="btn-tony-chat"
      >
        Apri Tony
      </button>

    </div>

  </div>

  <style>

  .home-header{
    background:var(--color-primary);
    color:white;
    padding:22px;
    border-bottom-left-radius:22px;
    border-bottom-right-radius:22px;

    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:16px;
  }

  .home-title{
    margin:0;
    font-weight:600;
    font-size:20px;
  }

  .home-meta{
    margin-top:4px;
    display:flex;
    align-items:center;
    gap:14px;
  }

  .home-date{
    font-size:14px;
  }

  .home-weather{
    font-size:22px;
  }

  .home-tony{
    margin:24px;
    background:#fff;
    border-radius:18px;
    padding:20px;

    display:flex;
    gap:16px;
    align-items:flex-start;

    box-shadow:0 10px 30px rgba(0,0,0,0.08);
  }

  .home-tony-icon{
    font-size:28px;
  }

  .home-tony-text{
    font-size:15px;
    line-height:1.5;
  }

  .home-grid{
    padding:28px;
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
    gap:20px;
  }

  .home-card{
    background:white;
    border-radius:20px;
    padding:30px;
    text-align:center;
    cursor:pointer;

    box-shadow:0 10px 30px rgba(0,0,0,0.08);
    transition:all .25s ease;

    animation:fadeInUp .4s ease forwards;
    opacity:0;
  }

  .home-card:hover{
    transform:translateY(-4px);
  }

  .home-card-icon{
    font-size:36px;
    margin-bottom:12px;
  }

  .home-card-title{
    font-size:16px;
    font-weight:600;
  }

  .home-role-cards{
    padding:20px;
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
    gap:18px;
  }

  .role-card{
    background:white;
    padding:18px;
    border-radius:14px;
    box-shadow:0 6px 20px rgba(0,0,0,0.06);
  }

  .home-tony-chat{
    margin:30px;
    padding:20px;
    background:#0f172a;
    color:white;
    border-radius:16px;
  }

  .btn-tony-chat{
    margin-top:10px;
    padding:10px 14px;
    border:none;
    border-radius:10px;
    background:white;
    color:black;
    cursor:pointer;
  }

  @keyframes fadeInUp{
    from{transform:translateY(12px);opacity:0}
    to{transform:translateY(0);opacity:1}
  }

  </style>
  `;

  hydrateWeather();
}

function renderRoleCards(ruolo){

  if(ruolo === "admin"){

    return `
    <div class="role-card">
      <strong>📊 Controllo azienda</strong>
      <div>Controlla KPI e marginalità.</div>
    </div>

    <div class="role-card">
      <strong>🧾 Ordini fornitori</strong>
      <div>Gestisci ordini e acquisti.</div>
    </div>
    `;
  }

  if(ruolo === "manager_cucina" || ruolo === "manager_sala"){

    return `
    <div class="role-card">
      <strong>👨‍🍳 Produzione oggi</strong>
      <div>Controlla preparazioni e produzioni.</div>
    </div>

    <div class="role-card">
      <strong>📦 Scorte critiche</strong>
      <div>Controlla materie prime.</div>
    </div>
    `;
  }

  if(ruolo === "segreteria"){

    return `
    <div class="role-card">
      <strong>🧾 Fatture</strong>
      <div>Gestione amministrativa.</div>
    </div>
    `;
  }

  return `
  <div class="role-card">
    <strong>📋 Attività operative</strong>
    <div>Consulta i moduli operativi.</div>
  </div>
  `;
}

function getTonyBriefing(ruolo){

  if(ruolo === "admin"){
    return "Buongiorno. Oggi controlla margini, ordini fornitori e andamento vendite.";
  }

  if(ruolo === "manager_cucina"){
    return "Briefing cucina: verifica produzioni e scorte critiche.";
  }

  if(ruolo === "segreteria"){
    return "Briefing amministrazione: controlla ordini, fornitori e contabilità.";
  }

  return "Briefing operativo del giorno.";
}

function getRepartiVisibili(ruolo){

  const REPARTI = [
    { key:"operativo", label:"Operativo", icon:"🏭" },
    { key:"amministrazione", label:"Amministrazione", icon:"🧾" },
    { key:"gestione", label:"Gestione", icon:"📊" },
    { key:"marketing", label:"Marketing", icon:"📢" },
    { key:"ai", label:"AI Ristoflow", icon:"🤖" }
  ];

  if(ruolo === "admin") return REPARTI;

  if(ruolo === "manager_cucina"){
    return REPARTI.filter(r =>
      ["operativo","gestione","ai"].includes(r.key)
    );
  }

  if(ruolo === "segreteria"){
    return REPARTI.filter(r =>
      ["amministrazione","gestione"].includes(r.key)
    );
  }

  return REPARTI.filter(r =>
    ["operativo","ai"].includes(r.key)
  );
}

function renderSedeSelector(){

  const sedi = window.state.sedi || [];

  if(sedi.length <= 1) return "";

  return `
  <select
    onchange="window.stateActions.setSedeAttiva(this.value)"
    style="
      padding:8px 10px;
      border-radius:10px;
      border:none;
      font-weight:500;
    "
  >

    ${
      sedi.map(s=>`
        <option
          value="${s.id}"
          ${window.state.sedeAttiva?.id == s.id ? "selected" : ""}
        >
          ${s.nome}
        </option>
      `).join("")
    }

  </select>
  `;
}

function getSaluto(){

  const ora = new Date().getHours();

  if(ora < 12) return "Buongiorno";
  if(ora < 18) return "Buon pomeriggio";

  return "Buonasera";
}

function getDataFormattata(){

  const giorni = [
    "Domenica","Lunedì","Martedì","Mercoledì",
    "Giovedì","Venerdì","Sabato"
  ];

  const mesi = [
    "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
    "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
  ];

  const now = new Date();

  return `${giorni[now.getDay()]} ${now.getDate()} ${mesi[now.getMonth()]} ${now.getFullYear()}`;
}
