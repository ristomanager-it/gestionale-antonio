// js/views/home.js
// =======================================
// Dashboard Operativa Dinamica SaaS
// =======================================

export async function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento dashboard</div>`;
    return;
  }

  const MODULI = [
    { key: "produzione", label: "Produzione", icon: "🏭" },
    { key: "magazzino", label: "Magazzino", icon: "📦" },
    { key: "acquisti", label: "Acquisti", icon: "🧾" },
    { key: "dipendenti", label: "Dipendenti", icon: "👥" },
    { key: "ricettario", label: "Ricettario", icon: "📖" },
    { key: "preparazioni", label: "Preparazioni", icon: "🥣" },
    { key: "report", label: "Report", icon: "📊" }
  ];

  const saluto = getSaluto();

  // 🔥 Se piattaforma → mostra tutto
  let moduliAttivi;

  if (azienda.stato === "piattaforma") {
    moduliAttivi = MODULI;
  } else {
    moduliAttivi = MODULI.filter(m =>
      hasFeature(m.key) && hasPermission(m.key)
    );
  }

  container.innerHTML = `
    <div class="view">

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">

        ${
          azienda.stato === "piattaforma"
            ? `
          <button 
            class="app-button small gray"
            onclick="window.location.hash='#/homePiattaforma'"
          >
            ⬅ Torna alla Piattaforma
          </button>
        `
            : `<div></div>`
        }

        <button 
          id="btn-logout-dashboard"
          class="app-button small red"
        >
          Esci
        </button>

      </div>

      <div style="
        display:flex;
        align-items:center;
        gap:16px;
        margin-bottom:32px;
        flex-wrap:wrap;
      ">

        ${
          azienda.logo_url
            ? `<img 
                src="${azienda.logo_url}" 
                style="
                  width:64px;
                  height:64px;
                  object-fit:cover;
                  border-radius:18px;
                  box-shadow:0 6px 18px rgba(0,0,0,0.08);
                "
              />`
            : `<div style="
                  width:64px;
                  height:64px;
                  border-radius:18px;
                  background:linear-gradient(135deg,#e5e7eb,#f3f4f6);
                "></div>`
        }

        <div>
          <h2 style="margin:0; font-weight:600;">
            ${azienda.nome}
          </h2>
          <p class="small-muted" style="margin:6px 0 0 0;">
            ${saluto} 👋 Benvenuto nella dashboard operativa
          </p>
        </div>

      </div>

      ${
        moduliAttivi.length === 0
          ? `<p class="small-muted">Nessun modulo attivo per questo utente.</p>`
          : `
      <div 
        style="
          display:grid;
          gap:18px;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        "
      >
        ${
          moduliAttivi.map((m, index) => `
            <div 
              onclick="window.location.hash='#/${m.key}'"
              style="
                background:white;
                padding:28px 18px;
                border-radius:22px;
                text-align:center;
                cursor:pointer;
                box-shadow:0 10px 30px rgba(0,0,0,0.05);
                transition: all 0.25s ease;
                animation: fadeInUp 0.4s ease forwards;
                animation-delay:${index * 0.05}s;
                opacity:0;
              "
              onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 18px 40px rgba(0,0,0,0.08)'"
              onmouseout="this.style.transform='translateY(0px)';this.style.boxShadow='0 10px 30px rgba(0,0,0,0.05)'"
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

      <style>
        @keyframes fadeInUp {
          from {
            transform: translateY(15px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
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

// 🔹 FEATURE AZIENDA
function hasFeature(area) {
  return window.state?.azienda?.features?.[area] === true;
}

// 🔹 PERMESSO UTENTE
function hasPermission(area) {
  const ruolo = window.state?.ruolo;
  const override = window.state?.permessiOverride || {};

  if (override.hasOwnProperty(area)) {
    return override[area] === true;
  }

  const rolePermissions = {
    admin: ["*"],
    segreteria: ["dipendenti", "acquisti", "report"],
    manager_cucina: ["produzione"],
    manager_sala: ["produzione"],
    addetto_cucina: [],
    cameriere: []
  };

  if (rolePermissions[ruolo]?.includes("*")) return true;

  return rolePermissions[ruolo]?.includes(area);
}

function getSaluto() {
  const ora = new Date().getHours();
  if (ora < 12) return "Buongiorno";
  if (ora < 18) return "Buon pomeriggio";
  return "Buonasera";
}
