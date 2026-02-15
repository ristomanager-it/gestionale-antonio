// js/views/home.js
// =======================================
// Dashboard Operativa – Dark Premium
// =======================================

export async function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento dashboard</div>`;
    return;
  }

  // Redirect piattaforma
  if (azienda.stato === "piattaforma") {
    window.location.hash = "#/homePiattaforma";
    return;
  }

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
  const saluto = getSaluto();

  container.innerHTML = `
    <div class="view dashboard-dark">

      <!-- HEADER -->
      <div class="dashboard-header">
        ${
          azienda.logo_url
            ? `<img src="${azienda.logo_url}" class="dashboard-logo" />`
            : `<div class="dashboard-logo-placeholder"></div>`
        }

        <div>
          <h2>${azienda.nome}</h2>
          <p class="small-muted">
            ${saluto} 👋 Benvenuto nella tua dashboard
          </p>
        </div>
      </div>

      <!-- GRID -->
      <div class="dashboard-grid">
        ${
          attivi.length === 0
            ? `
              <div class="kpi-card">
                <h3>Nessun modulo attivo</h3>
                <p class="small-muted">
                  Attiva le feature dalla piattaforma.
                </p>
              </div>
            `
            : attivi.map((m, index) => `
                <div 
                  class="dashboard-card"
                  style="animation-delay:${index * 0.06}s"
                  onclick="window.location.hash='#/${m.key}'"
                >
                  <div class="card-icon">${m.icon}</div>
                  <div class="card-label">${m.label}</div>
                </div>
              `).join("")
        }
      </div>

    </div>

    <style>
      /* DARK BASE */
      .dashboard-dark {
        background: linear-gradient(135deg, #0f172a, #111827);
        padding: 28px;
        border-radius: 24px;
        color: #f9fafb;
      }

      .dashboard-header {
        display: flex;
        align-items: center;
        gap: 18px;
        margin-bottom: 36px;
      }

      .dashboard-logo {
        width: 68px;
        height: 68px;
        object-fit: cover;
        border-radius: 20px;
        box-shadow: 0 12px 30px rgba(0,0,0,0.4);
      }

      .dashboard-logo-placeholder {
        width: 68px;
        height: 68px;
        border-radius: 20px;
        background: linear-gradient(135deg,#1f2937,#111827);
      }

      .dashboard-header h2 {
        margin: 0;
        font-weight: 600;
      }

      .dashboard-grid {
        display: grid;
        gap: 22px;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      }

      .dashboard-card {
        background: rgba(255,255,255,0.05);
        backdrop-filter: blur(8px);
        padding: 30px 18px;
        border-radius: 22px;
        text-align: center;
        cursor: pointer;
        border: 1px solid rgba(255,255,255,0.05);
        transition: all 0.25s ease;
        opacity: 0;
        transform: translateY(20px);
        animation: fadeUp 0.5s ease forwards;
      }

      .dashboard-card:hover {
        transform: translateY(-8px);
        background: rgba(255,255,255,0.08);
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      }

      .card-icon {
        font-size: 30px;
        margin-bottom: 14px;
      }

      .card-label {
        font-weight: 500;
      }

      @keyframes fadeUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  `;
}

function getSaluto() {
  const ora = new Date().getHours();
  if (ora < 12) return "Buongiorno";
  if (ora < 18) return "Buon pomeriggio";
  return "Buonasera";
}
