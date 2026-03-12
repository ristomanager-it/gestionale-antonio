const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function render(container) {

  const user = window.state?.user;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;

  updateHeader(azienda, sede);

  container.innerHTML = `
  <div class="view home-admin">

    <div class="admin-header">
      <div>
        <div class="admin-saluto" id="home-saluto"></div>
        <div class="admin-utente" id="home-utente"></div>
      </div>

      <div class="admin-header-right">
        <div class="admin-data" id="home-data"></div>
        <div class="admin-meteo" id="home-weather">☁️</div>
      </div>
    </div>

    <div class="admin-dashboard">

      <div class="admin-card" onclick="location.hash='#/venduto'">
        <div class="admin-card-title">Vendite</div>
        <div class="admin-card-desc">Analisi prodotti venduti</div>
      </div>

      <div class="admin-card" onclick="location.hash='#/margini'">
        <div class="admin-card-title">Margini</div>
        <div class="admin-card-desc">Marginalità e costi</div>
      </div>

      <div class="admin-card" onclick="location.hash='#/magazzino'">
        <div class="admin-card-title">Magazzino</div>
        <div class="admin-card-desc">Controllo scorte</div>
      </div>

      <div class="admin-card" onclick="location.hash='#/dipendenti'">
        <div class="admin-card-title">Dipendenti</div>
        <div class="admin-card-desc">Gestione personale</div>
      </div>

    </div>

    ${renderTony()}

  </div>

  <style>

  .admin-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:20px;
  }

  .admin-saluto{
    font-size:22px;
    font-weight:800;
  }

  .admin-utente{
    font-size:13px;
    color:#6b7280;
  }

  .admin-data{
    font-size:13px;
    color:#6b7280;
  }

  .admin-dashboard{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    gap:16px;
  }

  .admin-card{
    background:white;
    padding:22px;
    border-radius:16px;
    cursor:pointer;
    box-shadow:0 6px 20px rgba(0,0,0,0.05);
  }

  .admin-card-title{
    font-weight:700;
  }

  .admin-card-desc{
    font-size:12px;
    color:#6b7280;
  }

  </style>
  `;

  initTopbar(user);
  hydrateWeather();
}

function renderTony() {
  return `<div class="tony-avatar" onclick="location.hash='#/ai'">🤖</div>`;
}

function updateHeader(azienda, sede) {
  const box = document.getElementById("header-azienda-nome");

  if (!box) return;

  if (sede && sede.nome) {
    box.innerText = sede.nome;
    return;
  }

  if (azienda && azienda.nome) {
    box.innerText = azienda.nome;
    return;
  }

  box.innerText = "Ristoflow";
}

function initTopbar(user) {

  const salutoBox = document.getElementById("home-saluto");
  const utenteBox = document.getElementById("home-utente");
  const dataBox = document.getElementById("home-data");

  const ora = new Date().getHours();

  let saluto = "Buongiorno";
  if (ora >= 12 && ora < 18) saluto = "Buon pomeriggio";
  if (ora >= 18) saluto = "Buonasera";

  const email = user?.email || "";
  const nomeUtente = email ? email.split("@")[0] : "utente";

  if (salutoBox) salutoBox.innerText = saluto;
  if (utenteBox) utenteBox.innerText = nomeUtente;

  if (dataBox) {
    dataBox.innerText = new Date().toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
}

async function hydrateWeather() {

  const box = document.getElementById("home-weather");
  if (!box) return;

  try {

    const res = await fetch(
      `${OPEN_METEO_URL}?latitude=41.9&longitude=12.49&current=temperature_2m`
    );

    const data = await res.json();

    if (data?.current?.temperature_2m != null) {
      box.innerHTML = "🌤 " + Math.round(data.current.temperature_2m) + "°";
      return;
    }

    box.innerHTML = "☁️";

  } catch {

    box.innerHTML = "☁️";

  }
}
