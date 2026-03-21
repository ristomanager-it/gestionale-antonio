import { renderFooter } from "../components/footer.js";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function render(container) {

  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;
  const user = window.state?.user;

  if (!window.state?.sedeAttiva) {
    window.location.hash = "#/prehome-sedi";
    return;
  }

  const today = new Date().toISOString().slice(0,10);

  let servizioOggi = null;

  try {
    const { data } = await supabase
      .from("servizi")
      .select("*")
      .eq("azienda_id", azienda.id)
      .eq("data_servizio", today)
      .limit(1)
      .single();

    servizioOggi = data;

  } catch(e){}

  container.innerHTML = `

  <div class="view operatore-home-new">

    <!-- HEADER -->
    <div class="op-header">
      <div>
        <div class="saluto" id="home-saluto"></div>
        <div class="utente">${user?.email || ""}</div>
      </div>

      <div class="header-right">
        <div id="home-data"></div>
        <div id="home-weather">☁️</div>
      </div>
    </div>

    <!-- STATO GIORNATA -->
    <div class="card stato-card">
      <div class="card-title">📅 Oggi</div>
      <div class="card-sub">
        ${servizioOggi ? servizioOggi.tipo_servizio : "Nessun servizio programmato"}
      </div>
    </div>

    <!-- TASK -->
    <div class="card">
      <div class="card-title">📋 I tuoi compiti</div>

      <div class="task">✔ Timbra ingresso</div>
      <div class="task">✔ Controlla preparazioni</div>
      <div class="task">✔ Verifica servizio</div>
    </div>

    <!-- TONY -->
    <div class="card tony-card">
      <div class="card-title">🤖 Tony</div>
      <div class="card-sub">
        Oggi servizio ${servizioOggi?.tipo_servizio || "standard"}.
        Controlla le preparazioni prima del servizio.
      </div>
    </div>

  </div>

  <style>

  .operatore-home-new{
    padding-bottom:90px;
  }

  .op-header{
    display:flex;
    justify-content:space-between;
    margin-bottom:16px;
  }

  .task{
    font-size:14px;
    padding:6px 0;
  }

  .stato-card{
    background:#f0f9ff;
  }

  .tony-card{
    background:#eef2ff;
  }

  </style>
  `;

  container.innerHTML += renderFooter();

  initHeader();
  hydrateWeather();

}

/* HEADER */

function initHeader(){
  const salutoBox = document.getElementById("home-saluto");
  const dataBox = document.getElementById("home-data");

  const ora = new Date().getHours();

  let saluto = "Buongiorno";
  if (ora >= 12 && ora < 18) saluto = "Buon pomeriggio";
  if (ora >= 18) saluto = "Buonasera";

  salutoBox.innerText = saluto;

  dataBox.innerText = new Date().toLocaleDateString("it-IT", {
    weekday:"long",
    day:"numeric",
    month:"long",
    year:"numeric"
  });
}

async function hydrateWeather(){
  const box = document.getElementById("home-weather");
  if(!box) return;

  try{
    const res = await fetch(
      `${OPEN_METEO_URL}?latitude=41.9&longitude=12.49&current=temperature_2m`
    );
    const data = await res.json();
    box.innerHTML = "🌤 " + Math.round(data.current.temperature_2m) + "°";
  }catch{
    box.innerHTML = "☁️";
  }
}
