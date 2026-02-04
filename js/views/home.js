// js/views/home.js
// =======================================
// Home SaaS - Hub aziende e servizi
// =======================================

export function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;
  const aziende = window.state.aziende || [];

  // 🔥 AUTO-CARICAMENTO AZIENDA SE UNICA
  if (!azienda && aziende.length === 1) {
    window.stateActions.setAzienda(aziende[0]);
    render(container);
    return;
  }

  container.innerHTML = `
    <div style="padding: 20px; max-width: 600px; margin: 0 auto;">
      <h1>
        ${azienda ? `Benvenuto in ${azienda.nome}` : "Benvenuto"}
      </h1>

      <p style="margin-top: 4px;">
        Accesso riuscito 🎉
        ${user?.email ? `(${user.email})` : ""}
      </p>

      <hr style="margin: 20px 0;" />

      ${
        !azienda
          ? `
            <p>Non hai ancora un’azienda selezionata.</p>

            <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
              <button id="btn-crea-azienda" class="app-button green">
                ➕ Crea nuova azienda
              </button>

              <button id="btn-carica-azienda" class="app-button">
                📂 Carica azienda esistente
              </button>
            </div>
          `
          : `
            <p>
              Azienda attiva:
              <strong>${azienda.nome}</strong>
            </p>

            <h3 style="margin-top:20px;">Servizi disponibili</h3>
            <div
              id="servizi-list"
              style="display:flex; flex-direction:column; gap:8px; margin-top:10px;"
            ></div>

            <div style="margin-top:20px;">
              <button id="btn-cambia-azienda" class="app-button">
                🔁 Cambia azienda
              </button>
            </div>
          `
      }
    </div>
  `;

  // === NESSUNA AZIENDA ===
  const btnCrea = document.getElementById("btn-crea-azienda");
  if (btnCrea) {
    btnCrea.addEventListener("click", () => {
      window.location.hash = "#/crea-azienda";
    });
  }

  const btnCarica = document.getElementById("btn-carica-azienda");
  if (btnCarica) {
    btnCarica.addEventListener("click", () => {
      window.location.hash = "#/carica-azienda";
    });
  }

  // === AZIENDA SELEZIONATA ===
  if (azienda) {
    const servizi = [
      { key: "timbrature", label: "Timbrature", route: "timbrature" },
      { key: "dipendenti", label: "Dipendenti", route: "dipendenti" },
      { key: "ricette", label: "Ricette", route: "ricette" },
      { key: "ricettario", label: "Ricettario", route: "ricettario" },
      { key: "magazzino", label: "Magazzino", route: "magazzino" },
      { key: "acquisti", label: "Acquisti", route: "acquisti" },
      { key: "preventivi", label: "Preventivi", route: "preventivi" },
      { key: "venduto", label: "Venduto del giorno", route: "venduto" },
      { key: "report", label: "Report", route: "report" },
    ];

    const features = azienda.features || {};
    const listEl = document.getElementById("servizi-list");

    servizi.forEach((servizio) => {
      if (!features[servizio.key]) return;

      const btn = document.createElement("button");
      btn.className = "app-button";
      btn.textContent = servizio.label;

      btn.addEventListener("click", () => {
        window.location.hash = `#/${servizio.route}`;
      });

      listEl.appendChild(btn);
    });

    const btnCambia = document.getElementById("btn-cambia-azienda");
    if (btnCambia) {
      btnCambia.addEventListener("click", () => {
        window.location.hash = "#/carica-azienda";
      });
    }
  }
}
