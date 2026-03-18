const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function render(container) {

  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;
  const user = window.state?.user;

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

  <div class="view operatore-home">

    <div class="header">

      <div>
        <div class="saluto" id="home-saluto"></div>
        <div class="utente">${user?.email || ""}</div>
      </div>

      <div class="header-right">
        <div id="home-data"></div>
        <div id="home-weather">☁️</div>
      </div>

    </div>

    <div class="grid">

      <div class="card big" onclick="location.hash='#/timbrature'">
        ⏱ Timbratura
      </div>

      <div class="card">
        <div class="card-title">Servizio oggi</div>
        <div class="card-sub">
          ${servizioOggi ? servizioOggi.tipo_servizio : "Nessun servizio"}
        </div>
      </div>

      <div class="card" onclick="location.hash='#/produzione'">
        <div class="card-title">Produzioni</div>
        <div class="card-sub">Preparazioni</div>
      </div>

      <div class="card" onclick="location.hash='#/permessi'">
        <div class="card-title">Permessi e ferie</div>
        <div class="card-sub">Richiedi / controlla</div>
      </div>

    </div>

    <div class="card tony">
      <div class="card-title">Tony 🤖</div>
      <div class="card-sub">Chiedi assistenza</div>
    </div>

  </div>

  <style>

  .header{
    display:flex;
    justify-content:space-between;
    margin-bottom:20px;
  }

  .saluto{
    font-size:22px;
    font-weight:800;
  }

  .utente{
    font-size:13px;
    color:#6b7280;
  }

  .header-right{
    text-align:right;
    font-size:13px;
  }

  .grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
    gap:12px;
  }

  .card{
    background:white;
    padding:16px;
    border-radius:14px;
    box-shadow:0 4px 12px rgba(0,0,0,0.05);
  }

  .big{
    font-size:18px;
    font-weight:700;
    text-align:center;
  }

  .card-title{
    font-weight:700;
  }

  .card-sub{
    font-size:12px;
    color:#6b7280;
  }

  .tony{
    margin-top:16px;
    background:#0ea5e9;
    color:white;
  }

  </style>
  `;

  initHeader();
  hydrateWeather();

}

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
