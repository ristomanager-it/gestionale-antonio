// js/views/home.js
// =======================================
// Dashboard moderna unificata
// =======================================

export async function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento dashboard</div>`;
    return;
  }

  const isPiattaforma = azienda.stato === "piattaforma";
  const features = azienda.features || {};

  const moduli = [
    { key: "timbrature", label: "Timbrature", icon: "⏱️" },
    { key: "dipendenti", label: "Dipendenti", icon: "👥" },
    { key: "ricette", label: "Ricette", icon: "🍽️" },
    { key: "magazzino", label: "Magazzino", icon: "📦" },
    { key: "acquisti", label: "Acquisti", icon: "🧾" },
    { key: "preventivi", label: "Preventivi", icon: "📑" },
    { key: "eventi", label: "Eventi", icon: "🎉" },
    { key: "report", label: "Report", icon: "📊" },
    { key: "impostazioni", label: "Impostazioni", icon: "⚙️" }
  ];

  const attivi = moduli.filter(m => features[m.key] !== false);

  container.innerHTML = `
    <div class="view">

      <!-- HEADER COMPATTO -->
      <div style="display:flex; align-items:center; gap:14px; margin-bottom:22px;">
        ${
          azienda.logo_url
            ? `<img 
                src="${azienda.logo_url}" 
                style="width:52px; height:52px; object-fit:cover; border-radius:14px; background:#e5e7eb;"
              />`
            : `<div style="width:52px; height:52px; border-radius:14px; background:#e5e7eb;"></div>`
        }

        <div>
          <h2 style="margin:0;">${azienda.nome}</h2>
          <p class="small-muted" style="margin:4px 0 0 0;">
            Dashboard operativa
          </p>
        </div>
      </div>

      <!-- GRID MODULI -->
      <div 
        style="
          display:grid;
          gap:14px;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        "
      >
        ${attivi.map(m => `
          <div 
            class="app-button"
            style="
              padding:22px 16px;
              text-align:center;
              border-radius:18px;
              font-size:14px;
              transition: all 0.2s ease;
            "
            onclick="window.location.hash='#/${m.key}'"
          >
            <div style="font-size:24px; margin-bottom:8px;">
              ${m.icon}
            </div>
            ${m.label}
          </div>
        `).join("")}

        ${
          isPiattaforma
            ? `
          <div 
            class="app-button"
            style="
              padding:22px 16px;
              text-align:center;
              border-radius:18px;
              background:#111827;
              color:white;
            "
            onclick="window.location.hash='#/gestioneAziende'"
          >
            <div style="font-size:24px; margin-bottom:8px;">
              🏢
            </div>
            Aziende
          </div>
        `
            : ""
        }

      </div>

    </div>
  `;
}
