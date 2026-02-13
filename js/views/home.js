// js/views/home.js
// =======================================
// Dashboard principale
// =======================================

export async function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  if (!user || !azienda) {
    container.innerHTML = `<p>Errore caricamento dashboard</p>`;
    return;
  }

  const isPiattaforma = azienda.stato === "piattaforma";

  container.innerHTML = `
    <div class="view">

      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 style="margin-top:0;">Dashboard</h2>
          <p class="small-muted">
            Azienda attiva: <strong>${azienda.nome}</strong>
          </p>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="app-button small gray" id="btn-carica">
            🔄 Carica azienda
          </button>

          ${isPiattaforma ? `
            <button class="app-button small" id="btn-gestione">
              🏢 Gestione aziende
            </button>

            <button class="app-button small green" id="btn-crea">
              + Crea azienda
            </button>
          ` : ""}
        </div>
      </div>

      <hr style="margin:16px 0;" />

      <div id="home-moduli" style="display:flex; flex-direction:column; gap:12px;"></div>

    </div>
  `;

  // Pulsanti top
  document.getElementById("btn-carica").onclick = () => {
    window.location.hash = "#/caricaAzienda";
  };

  if (isPiattaforma) {
    document.getElementById("btn-gestione").onclick = () => {
      window.location.hash = "#/gestioneAziende";
    };

    document.getElementById("btn-crea").onclick = () => {
      window.location.hash = "#/creaAzienda";
    };
  }

  // Moduli azienda
  const moduliContainer = document.getElementById("home-moduli");

  if (isPiattaforma) {
    moduliContainer.innerHTML = `
      <div class="kpi-card">
        <h3>Piattaforma Ristoflow</h3>
        <p class="small-muted">
          Gestisci clienti, scadenze, feature e configurazioni SaaS.
        </p>
      </div>
    `;
    return;
  }

  // 👇 Azienda normale
  const features = azienda.features || {};

  const moduli = [
    { key: "timbrature", label: "Timbrature" },
    { key: "dipendenti", label: "Dipendenti" },
    { key: "ricette", label: "Ricette" },
    { key: "ricettario", label: "Ricettario" },
    { key: "magazzino", label: "Magazzino" },
    { key: "acquisti", label: "Acquisti" },
    { key: "preventivi", label: "Preventivi" },
    { key: "venduto", label: "Venduto" },
    { key: "report", label: "Report" },
  ];

  const attivi = moduli.filter(m => features[m.key] !== false);

  if (attivi.length === 0) {
    moduliContainer.innerHTML = `
      <div class="kpi-card">
        <h3>Nessun modulo attivo</h3>
        <p class="small-muted">
          Attiva le feature dalla piattaforma.
        </p>
      </div>
    `;
    return;
  }

  moduliContainer.innerHTML = attivi.map(m => `
    <button 
      class="app-button"
      style="width:100%;"
      onclick="window.location.hash='#/${m.key}'"
    >
      ${m.label}
    </button>
  `).join("");
}
