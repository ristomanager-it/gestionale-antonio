// js/views/home.js
// =======================================
// HOME – Piattaforma / Azienda cliente
// =======================================

export function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;
  const aziende = window.state.aziende || [];

  container.innerHTML = `
    <section class="view">
      <div style="padding:20px; max-width:900px; margin:0 auto;">

        <header style="margin-bottom:24px;">
          <h1 style="margin-bottom:4px;">
            ${azienda ? azienda.nome : "Home"}
          </h1>

          <p style="opacity:0.7;">
            Utente: <strong>${user?.email || "-"}</strong>
          </p>
        </header>

        ${
          azienda?.stato === "piattaforma"
            ? renderPiattaforma()
            : renderAziendaCliente(azienda)
        }

        <div style="margin-top:40px; text-align:center;">
          <button id="logout" class="app-button">
            Logout
          </button>
        </div>

      </div>
    </section>
  `;

  // LOGOUT
  document.getElementById("logout").onclick = async () => {
    await window.supabaseClient.auth.signOut();
    window.location.hash = "#/login";
  };

  // BOTTONI PIATTAFORMA
  if (azienda?.stato === "piattaforma") {
    document.getElementById("btn-gestione-aziende")?.addEventListener(
      "click",
      () => {
        window.location.hash = "#/gestione-aziende";
      }
    );

    document.getElementById("btn-crea-azienda")?.addEventListener(
      "click",
      () => {
        window.location.hash = "#/crea-azienda";
      }
    );
  }
}

/* ============================= */
/* SEZIONI */
/* ============================= */

function renderPiattaforma() {
  return `
    <h2>Dashboard Ristoflow</h2>
    <p style="margin-bottom:16px;">
      Gestione piattaforma e aziende clienti
    </p>

    <div style="display:flex; flex-direction:column; gap:12px; max-width:300px;">
      <button id="btn-gestione-aziende" class="app-button">
        🏢 Gestione aziende
      </button>

      <button id="btn-crea-azienda" class="app-button green">
        ➕ Crea nuova azienda
      </button>
    </div>
  `;
}

function renderAziendaCliente(azienda) {
  if (!azienda || !azienda.features) {
    return `<p>Nessun servizio disponibile</p>`;
  }

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

  return `
    <h2>Moduli attivi</h2>

    <div
      style="
        display:grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap:12px;
        margin-top:16px;
      "
    >
      ${servizi
        .filter((s) => azienda.features[s.key] === true)
        .map(
          (s) => `
          <button
            class="app-button"
            onclick="window.location.hash='#/${s.route}'"
          >
            ${s.label}
          </button>
        `
        )
        .join("")}
    </div>
  `;
}
