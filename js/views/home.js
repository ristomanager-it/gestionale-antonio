// js/views/home.js

export async function render(container) {
  const state = window.state;
  const azienda = state.azienda;
  const user = state.user;

  const userName =
    user.user_metadata?.full_name ||
    user.email ||
    "Utente";

  // HOME PIATTAFORMA
  if (azienda.stato === "piattaforma") {
    container.innerHTML = `
      <div class="home">
        <header class="home-header">
          <div>
            <h1>Ristoflow</h1>
            <span class="badge badge-platform">Piattaforma</span>
          </div>
          <div class="utente-info">👤 ${userName}</div>
        </header>

        <div class="card">
          <button id="btn-crea-azienda" class="app-button green">
            ➕ Crea azienda
          </button>
          <button id="btn-lista-aziende" class="app-button secondary">
            📋 Lista aziende
          </button>
        </div>
      </div>
    `;

    document.getElementById("btn-crea-azienda").onclick = () => {
      window.location.hash = "#/creaAzienda";
    };
    document.getElementById("btn-lista-aziende").onclick = () => {
      window.location.hash = "#/listaAziende";
    };
    return;
  }

  // HOME AZIENDA CLIENTE
  container.innerHTML = `
    <div class="home">
      <h1>${azienda.nome}</h1>
      <p class="muted">Azienda cliente</p>
    </div>
  `;
}
