// js/views/home.js
// =======================================
// Dashboard Reparti - 4 Card Principali
// Piattaforma come pulsante (solo superadmin)
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
      key: "operativo",
      label: "Operativo",
      icon: "🏭",
      moduli: ["produzione", "magazzino", "ricettario", "preparazioni", "timbrature"]
    },
    {
      key: "amministrazione",
      label: "Amministrazione",
      icon: "🧾",
      moduli: ["acquisti", "dipendenti", "preventivi"]
    },
    {
      key: "gestione",
      label: "Gestione",
      icon: "📊",
      moduli: ["margini", "report"]
    },
    {
      key: "marketing",
      label: "Marketing",
      icon: "📢",
      moduli: []
    }
  ];

  const saluto = getSaluto();

  const repartiVisibili = REPARTI.map(rep => {
    if (ruolo === "superadmin") return rep;

    const moduliFiltrati = rep.moduli.filter(m =>
      hasFeature(m) && hasPermission(m)
    );

    return { ...rep, moduli: moduliFiltrati };
  }).filter(rep => ruolo === "superadmin" || rep.moduli.length > 0);

  container.innerHTML = `
    <div class="view" style="padding:0;">

      <!-- HERO BLU -->
      <div style="
        background: var(--color-primary);
        color: white;
        padding: 40px 32px 60px 32px;
        border-bottom-left-radius: 32px;
        border-bottom-right-radius: 32px;
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          
          <div>
            <h2 style="margin:0; font-weight:600;">
              ${saluto} 👋
            </h2>
            <p style="margin:8px 0 0 0; opacity:0.9;">
              Seleziona un reparto per iniziare
            </p>
          </div>

          ${
            ruolo === "superadmin"
              ? `
                <button
                  onclick="window.location.hash='#/homePiattaforma'"
                  style="
                    background:white;
                    color:var(--color-primary);
                    border:none;
                    padding:10px 18px;
                    border-radius:14px;
                    font-weight:600;
                    cursor:pointer;
                    box-shadow:0 8px 20px rgba(0,0,0,0.15);
                    transition:all 0.2s ease;
                  "
                  onmouseover="this.style.transform='translateY(-2px)'"
                  onmouseout="this.style.transform='translateY(0)'"
                >
                  ⚙ Piattaforma
                </button>
              `
              : ``
          }

        </div>
      </div>

      <!-- CARD REPARTI -->
      <div style="
        padding: 0 32px 40px 32px;
        margin-top:-40px;
        display:grid;
        gap:24px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      ">

        ${
          repartiVisibili.map((rep, index) => `
              <div
                onclick="window.location.hash='#/${rep.key}'"
                style="
                  background:white;
                  padding:40px 24px;
                  border-radius:24px;
                  box-shadow:0 12px 30px rgba(0,0,0,0.06);
                  text-align:center;
                  cursor:pointer;
                  transition: all 0.25s ease;
                  animation: fadeInUp 0.4s ease forwards;
                  animation-delay:${index * 0.08}s;
                  opacity:0;
                "
                onmouseover="this.style.transform='translateY(-6px)'; this.style.boxShadow='0 18px 40px rgba(0,0,0,0.10)'"
                onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 12px 30px rgba(0,0,0,0.06)'"
              >
                <div style="font-size:42px; margin-bottom:18px;">
                  ${rep.icon}
                </div>
                <div style="font-size:18px; font-weight:600;">
                  ${rep.label}
                </div>
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
