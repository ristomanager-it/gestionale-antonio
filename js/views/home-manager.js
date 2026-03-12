const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function render(container, reparto) {

  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;
  const user = window.state?.user;

  const today = new Date().toISOString().slice(0,10);

  let servizi = [];
  let staff = [];

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

  } catch(e) {
    console.error(e);
  }

  const serviziHtml = servizi.map(s => {

    const staffCount = staff.filter(st => st.servizio_id === s.id).length;

    return `
      <div class="servizio-row">
        <div>${s.tipo_servizio}</div>
        <div>${s.coperti_previsti || 0} coperti</div>
        <div>brigata ${staffCount}</div>
      </div>
    `;

  }).join("");

  container.innerHTML = `

  <div class="view manager-home">

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

    <div class="card">
      <div class="card-title">Servizi oggi</div>
      ${serviziHtml || "Nessun servizio"}
    </div>

    <div class="grid">

      <div class="card" onclick="location.hash='#/servizi'">
        <div class="card-title">Servizi</div>
        <div class="card-sub">${servizi.length} oggi</div>
      </div>

      <div class="card" onclick="location.hash='#/produzione'">
        <div class="card-title">Produzioni</div>
        <div class="card-sub">Lavorazioni cucina</div>
      </div>

      <div class="card" onclick="location.hash='#/dipendenti'">
        <div class="card-title">Brigata</div>
        <div class="card-sub">${staff.length} assegnati</div>
      </div>

      <div class="card" onclick="location.hash='#/timbrature'">
        <div class="card-title">Timbrature</div>
        <div class="card-sub">Controllo presenze</div>
      </div>

    </div>

    <div class="card tony" id="tony-card">
      <div class="card-title">Tony 🤖</div>
      <div class="card-sub">Suggerimenti operativi</div>
    </div>

  </div>

  <style>

  .header{
    display:flex;
    justify-content:space-between;
    align-items:center;
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
    color:#6b7280;
  }

  .grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
    gap:12px;
    margin-top:12px;
  }

  .card{
    background:white;
    padding:16px;
    border-radius:14px;
    box-shadow:0 4px 12px rgba(0,0,0,0.05);
    cursor:pointer;
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
