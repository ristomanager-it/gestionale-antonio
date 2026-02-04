// js/views/home.js
// =======================================
// Home SaaS - Superadmin / Azienda
// =======================================

export function render(container) {
  const user = window.state.user;
  const aziende = window.state.aziende || [];
  let azienda = window.state.azienda;

  // 🔥 AUTO-SET AZIENDA LOGICA
  if (!azienda && aziende.length > 0) {
    // 1️⃣ cerco azienda piattaforma (superadmin)
    const piattaforma = aziende.find(
      (r) => (r.aziende || r).stato === "piattaforma"
    );

    if (piattaforma) {
      azienda = piattaforma.aziende || piattaforma;
      window.stateActions.setAzienda(azienda);
    }
    // 2️⃣ se non esiste piattaforma ma ce n’è una sola → auto
    else if (aziende.length === 1) {
      azienda = aziende[0].aziende || aziende[0];
      window.stateActions.setAzienda(azienda);
    }

    // ricarico la view con stato corretto
    render(container);
    return;
  }

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
            <div id="servizi-list" style="display:flex; flex-direction:column; gap:8px;"></div>
          `
      }
    </div>
  `;

  // === SUPERADMIN ===
  if (azienda?.stato === "piattaforma") {
    document
      .getElementById("btn-crea-azienda")
      ?.addEventListener("click", () => {
        window.location.hash = "#/crea-azienda";
      });

    document
      .getElementById("btn-gestione-aziende")
      ?.addEventListener("click", () => {
        window.location.hash = "#/gestione-aziende";
      });

    return;
  }

  // === AZIENDA CLIENTE ===
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

    const list = document.getElementById("servizi-list");

    servizi.forEach((s) => {
      if (azienda.features[s.key] !== true) return;

      const btn = document.createElement("button");
      btn.className = "app-button";
      btn.textContent = s.label;
      btn.onclick = () => (window.location.hash = `#/${s.route}`);
      list.appendChild(btn);
    });
  }
}
