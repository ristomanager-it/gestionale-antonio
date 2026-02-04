// js/views/home.js
// =======================================
// Home SaaS - Hub aziende e servizi
// =======================================

export function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;
  const aziende = window.state.aziende || [];

  // 🔥 AUTO-CARICAMENTO SE ESISTE UNA SOLA AZIENDA
  if (!azienda && aziende.length === 1) {
    const record = aziende[0];

    // normalizziamo SEMPRE l’oggetto azienda
    const aziendaPulita = record.aziende
      ? record.aziende
      : record;

    window.stateActions.setAzienda(aziendaPulita);
    render(container);
    return;
  }

  container.innerHTML = `
    <div class="home-wrapper">
      <h1>
        ${azienda?.nome ? `Benvenuto in ${azienda.nome}` : "Benvenuto"}
      </h1>

      <p class="home-subtitle">
        Accesso riuscito 🎉 ${user?.email ? `(${user.email})` : ""}
      </p>

      <hr />

      ${
        !azienda
          ? `
            <p>Nessuna azienda selezionata.</p>

            <div class="home-actions">
              <button id="btn-crea-azienda" class="app-button green">
                ➕ Crea nuova azienda
              </button>

              <button id="btn-carica-azienda" class="app-button">
                📂 Carica azienda
              </button>
            </div>
          `
          : `
            <p>
              Azienda attiva:
              <strong>${azienda.nome}</strong>
            </p>

            <h3>Servizi disponibili</h3>
            <div id="servizi-list" class="home-actions"></div>

            <button id="btn-cambia-azienda" class="app-button">
              🔁 Cambia azienda
            </button>
          `
      }
    </div>
  `;

  // === PULSANTI NO AZIENDA ===
  document.getElementById("btn-crea-azienda")?.addEventListener("click", () => {
    window.location.hash = "#/crea-azienda";
  });

  document.getElementById("btn-carica-azienda")?.addEventListener("click", () => {
    window.location.hash = "#/carica-azienda";
  });

  // === SERVIZI ===
  if (azienda?.features) {
    const servizi = [
      { key: "timbrature", label: "Timbrature", route: "timbrature" },
      { key: "dipendenti", label: "Dipendenti", route: "dipendenti" },
      { key: "ricette", label: "Ricette", route: "ricette" },
      { key: "ricettario", label: "Ricettario", route: "ricettario" },
      { key: "magazzino", label: "Magazzino", route: "magazzino" },
      { key: "acquisti", label: "Acquisti", route: "acquisti" },
      { key: "preventivi", label: "Preventivi", route: "preventivi" },
      { key: "venduto", label: "Venduto", route: "venduto" },
      { key: "report", label: "Report", route: "report" },
    ];

    const listEl = document.getElementById("servizi-list");

    servizi.forEach((s) => {
      if (azienda.features[s.key] !== true) return;

      const btn = document.createElement("button");
      btn.className = "app-button";
      btn.textContent = s.label;
      btn.onclick = () => (window.location.hash = `#/${s.route}`);
      listEl.appendChild(btn);
    });
  }

  document.getElementById("btn-cambia-azienda")?.addEventListener("click", () => {
    window.location.hash = "#/carica-azienda";
  });
}
