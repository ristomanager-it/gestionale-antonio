// js/views/home.js
export function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  // sicurezza
  if (!user) {
    window.location.hash = "#/login";
    return;
  }

  // se per qualche motivo non è ancora settata, riprova
  if (!azienda) {
    container.innerHTML = `
      <div style="padding:20px">
        <p>Caricamento azienda...</p>
      </div>
    `;
    return;
  }

  // === PIATTAFORMA ===
  if (azienda.stato === "piattaforma") {
    container.innerHTML = `
      <div style="padding:20px; max-width:700px; margin:0 auto;">
        <h1>Dashboard Ristoflow</h1>

        <p>
          Utente: <strong>${user.email}</strong>
        </p>

        <p>
          Piattaforma attiva:
          <strong>${azienda.nome}</strong>
        </p>

        <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
          <button class="app-button green" id="btn-crea-azienda">
            ➕ Crea azienda cliente
          </button>

          <button class="app-button" id="btn-gestione-aziende">
            🏢 Gestione aziende
          </button>

          <button class="app-button" id="btn-logout">
            Logout
          </button>
        </div>
      </div>
    `;

    document.getElementById("btn-crea-azienda").onclick = () => {
      window.location.hash = "#/crea-azienda";
    };

    document.getElementById("btn-gestione-aziende").onclick = () => {
      window.location.hash = "#/gestione-aziende";
    };

    document.getElementById("btn-logout").onclick = async () => {
      await window.supabaseClient.auth.signOut();
      window.location.hash = "#/login";
    };

    return;
  }

  // === AZIENDA CLIENTE (più avanti) ===
  container.innerHTML = `
    <div style="padding:20px">
      <h2>${azienda.nome}</h2>
      <p>Home azienda cliente (in sviluppo)</p>
    </div>
  `;
}
