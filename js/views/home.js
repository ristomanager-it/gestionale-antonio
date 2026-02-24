// js/views/home.js
// =======================================
// Dashboard Reparti SaaS - Ristoflow
// Versione con Hero blu + divisione per reparti
// =======================================

export async function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;
  const ruolo = window.state?.ruolo;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento dashboard</div>`;
    return;
  }

  const REPARTI = [
    {
      label: "Operativo",
      moduli: [
        { key: "produzione", label: "Produzione", icon: "🏭" },
        { key: "magazzino", label: "Magazzino", icon: "📦" },
        { key: "ricettario", label: "Ricettario", icon: "📖" },
        { key: "preparazioni", label: "Preparazioni", icon: "🥣" },
        { key: "timbrature", label: "Timbrature", icon: "🕒" }
      ]
    },
    {
      label: "Amministrazione",
      moduli: [
        { key: "acquisti", label: "Acquisti", icon: "🧾" },
        { key: "dipendenti", label: "Dipendenti", icon: "👥" },
        { key: "preventivi", label: "Preventivi", icon: "📑" }
      ]
    },
    {
      label: "Gestione",
      moduli: [
        { key: "margini", label: "Margini", icon: "💰" },
        { key: "report", label: "Report", icon: "📊" }
      ]
    },
    {
      label: "Marketing",
      moduli: []
    }
  ];

  const saluto = getSaluto();

  let repartiAttivi;

  if (ruolo === "superadmin") {
    repartiAttivi = REPARTI;
  } else {
    repartiAttivi = REPARTI.map(reparto => ({
      ...reparto,
      moduli: reparto.moduli.filter(m =>
        hasFeature(m.key) && hasPermission(m.key)
      )
    })).filter(reparto => reparto.moduli.length > 0);
  }

  container.innerHTML = `
    <div class="view" style="padding:0;">

      <!-- HERO BLU -->
      <div style="
        background: var(--color-primary);
        color: white;
        padding: 40px 32px 80px 32px;
        border-bottom-left-radius: 32px;
        border-bottom-right-radius: 32px;
        position: relative;
      ">

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">

          <div>
            <h2 style="margin:0; font-weight:600;">
              ${saluto} 👋
            </h2>
            <p style="margin:8px 0 0 0; opacity:0.9;">
              Benvenuto nella dashboard operativa
            </p>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            ${
              ruolo === "superadmin"
                ? `
                <button 
                  class="app-button small"
                  style="background:white; color:var(--color-primary);"
                  onclick="window.location.hash='#/homePiattaforma'"
                >
                  ⚙ Piattaforma
                </button>
              `
                : ``
            }

            <button 
              id="btn-logout-dashboard"
              class="app-button small"
              style="background:rgba(255,255,255,0.15); color:white; border:1px solid rgba(255,255,255,0.3);"
            >
              Esci
            </button>
          </div>

        </div>
      </div>

      <!-- CONTENUTO REPARTI -->
      <div style="padding: 0 32px 40px 32px; margin-top:-60px;">

        ${
          repartiAttivi.length === 0
            ? `<p class="small-muted">Nessun modulo attivo per questo utente.</p>`
            : repartiAttivi.map((reparto, rIndex) => `

          <div style="
            background:white;
            padding:28px;
            border-radius:24px;
            box-shadow:0 10px 30px rgba(0,0,0,0.05);
            margin-bottom:28px;
            animation: fadeInUp 0.4s ease forwards;
            animation-delay:${rIndex * 0.08}s;
            opacity:0;
          ">

            <h3 style="
              margin:0 0 20px 0;
              font-weight:600;
              border-left:4px solid var(--color-primary);
              padding-left:12px;
            ">
              ${reparto.label}
            </h3>

            ${
              reparto.moduli.length === 0
                ? `<p class="small-muted">Nessun modulo disponibile.</p>`
                : `
                  <div style="
                    display:grid;
                    gap:18px;
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                  ">
                    ${
                      reparto.moduli.map((m, index) => `
                        <div 
                          onclick="window.location.hash='#/${m.key}'"
                          style="
                            background:#ffffff;
                            padding:26px 18px;
                            border-radius:20px;
                            text-align:center;
                            cursor:pointer;
                            box-shadow:0 8px 24px rgba(0,0,0,0.04);
                            transition: all 0.25s ease;
                          "
                          onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 36px rgba(0,0,0,0.08)'"
                          onmouseout="this.style.transform='translateY(0px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.04)'"
                        >
                          <div style="font-size:30px; margin-bottom:14px;">
                            ${m.icon}
                          </div>
                          <div style="font-weight:500;">
                            ${m.label}
                          </div>
                        </div>
                      `).join("")
                    }
                  </div>
                `
            }

          </div>

        `).join("")
        }

      </div>

      <style>
        @keyframes fadeInUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>

    </div>
  `;

  const btnLogout = document.getElementById("btn-logout-dashboard");

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await window.supabaseClient.auth.signOut();
        window.state.user = null;
        window.state.azienda = null;
        localStorage.removeItem("ristoflow_user");
        window.location.hash = "#/login";
      } catch (err) {
        console.error("Errore logout:", err);
      }
    });
  }
}

function hasFeature(area) {
  return window.state?.azienda?.features?.[area] === true;
}

function hasPermission(area) {
  const ruolo = window.state?.ruolo;
  const override = window.state?.permessiOverride || {};

  if (ruolo === "superadmin") return true;

  if (override.hasOwnProperty(area)) {
    return override[area] === true;
  }

  const rolePermissions = {
    admin: ["*"],
    segreteria: ["dipendenti", "acquisti", "report", "margini"],
    manager_cucina: ["produzione", "margini"],
    manager_sala: ["produzione", "margini"],
    addetto_cucina: [],
    cameriere: []
  };

  if (rolePermissions[ruolo]?.includes("*")) return true;

  return rolePermissions[ruolo]?.includes(area) === true;
}

function getSaluto() {
  const ora = new Date().getHours();
  if (ora < 12) return "Buongiorno";
  if (ora < 18) return "Buon pomeriggio";
  return "Buonasera";
}
