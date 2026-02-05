export function render(container) {
  const { user, azienda } = window.state;

  container.innerHTML = `
    <div style="padding:20px; max-width:700px; margin:0 auto;">
      <h1>
        ${azienda ? `Benvenuto in ${azienda.nome}` : "Benvenuto"}
      </h1>

      <p style="margin-bottom:16px;">
        Accesso riuscito 🎉 (${user.email})
      </p>

      ${
        azienda?.stato === "piattaforma"
          ? `
            <h2>Dashboard Superadmin</h2>
            <p>Gestione piattaforma Ristoflow</p>

            <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
              <button id="btn-crea-azienda" class="app-button green">
                ➕ Crea nuova azienda cliente
              </button>

              <button id="btn-gestione-aziende" class="app-button">
                🏢 Gestione aziende
              </button>
            </div>
          `
          : `
            <p>
              Azienda attiva:
              <strong>${azienda?.nome || "-"}</strong>
            </p>

            <h3>Servizi disponibili</h3>
            <div id="servizi-list"></div>
          `
      }
    </div>
  `;

  if (azienda?.stato === "piattaforma") {
    document.getElementById("btn-crea-azienda").onclick =
      () => (window.location.hash = "#/crea-azienda");

    document.getElementById("btn-gestione-aziende").onclick =
      () => (window.location.hash = "#/gestione-aziende");

    return;
  }

  renderServiziAzienda(azienda);
}
