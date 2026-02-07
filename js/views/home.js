// js/views/home.js
// ⚠️ NESSUN IMPORT QUI

export async function render(container) {
  const state = window.state;

  if (!state?.user || !state?.azienda) {
    container.innerHTML = `<p class="error">Stato non disponibile</p>`;
    return;
  }

  const azienda = state.azienda;
  const userName =
    state.user.user_metadata?.full_name || state.user.email;

  // =========================
  // HOME PIATTAFORMA
  // =========================
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

  // =========================
  // HOME AZIENDA CLIENTE
  // =========================
  container.innerHTML = `
    <div class="home">
      <h1>${azienda.nome}</h1>
      <p class="muted">Azienda cliente</p>
    </div>
  `;
}
