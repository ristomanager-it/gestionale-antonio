// js/views/gestione.js

export async function render(container) {
  const ruolo = window.state?.ruolo;

  const MODULI = [
    {
      key: "margini",
      feature: "margini",
      label: "Margini",
      icon: "💰",
      desc: "Controllo food cost, margini e redditività."
    },
    {
      key: "menu-intelligence",
      feature: "menu_intelligence",
      label: "Menu Intelligence AI",
      icon: "🍽️",
      desc: "Menu engineering, margini piatti, simulatore prezzi e suggerimenti AI."
    },
    {
      key: "report",
      feature: "report",
      label: "Report",
      icon: "📊",
      desc: "Analisi economiche e operative."
    }
  ];

  const moduliVisibili = MODULI.filter(m =>
    ruolo === "superadmin" ||
    window.state?.isSuperadmin === true ||
    (
      hasFeature(m.feature || m.key) &&
      hasPermission(m.key)
    )
  );

  container.innerHTML = `
    <div class="view">

      <div style="
        background: linear-gradient(135deg, var(--color-primary), #123F5D);
        color: white;
        padding: 32px;
        border-radius: 24px;
        margin-bottom: 32px;
      ">
        <h2 style="margin:0;">Gestione</h2>
        <p style="margin:8px 0 0 0; opacity:0.9;">
          Controllo economico, margini e analisi intelligenti
        </p>
      </div>

      ${
        moduliVisibili.length === 0
          ? `<p class="small-muted">Nessun modulo disponibile.</p>`
          : `
            <div style="
              display:grid;
              gap:24px;
              grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            ">
              ${moduliVisibili.map(m => `
                <div
                  onclick="window.location.hash='#/${m.key}'"
                  style="
                    background:white;
                    padding:30px 20px;
                    border-radius:22px;
                    text-align:center;
                    cursor:pointer;
                    box-shadow:0 10px 30px rgba(0,0,0,0.05);
                    transition: all 0.25s ease;
                    border:1px solid rgba(0,0,0,0.04);
                    min-height:178px;
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                  "
                  onmouseover="this.style.transform='translateY(-6px)'; this.style.boxShadow='0 18px 40px rgba(0,0,0,0.08)'"
                  onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 10px 30px rgba(0,0,0,0.05)'"
                >
                  <div style="font-size:36px; margin-bottom:14px;">${m.icon}</div>
                  <div style="font-weight:800;font-size:15px;color:#111827;">${m.label}</div>
                  <div style="font-size:12px;color:#6b7280;margin-top:8px;line-height:1.45;max-width:230px;">${m.desc || ""}</div>
                </div>
              `).join("")}
            </div>
          `
      }

    </div>
  `;
}

function hasFeature(area) {
  const features =
    window.state?.featuresEffettive ||
    window.state?.azienda?.features ||
    {};

  if (features?.[area] === true) return true;

  const aliases = {
    menu_intelligence: ["menu-intelligence", "margini", "gestione"],
    "menu-intelligence": ["menu_intelligence", "margini", "gestione"]
  };

  return (aliases[area] || []).some(k => features?.[k] === true);
}

function hasPermission(area) {
  if (window.state?.isSuperadmin) return true;

  const permessi = window.state?.permessi || {};
  const override = window.state?.permessiOverride || {};

  if (Object.prototype.hasOwnProperty.call(override, area)) {
    return override[area] === true;
  }

  if (area === "menu-intelligence") {
    return (
      permessi["menu-intelligence.read"] === true ||
      permessi["menu_intelligence.read"] === true ||
      permessi["margini.read"] === true ||
      window.state?.ruolo === "admin" ||
      window.state?.ruolo === "manager"
    );
  }

  return permessi[`${area}.read`] === true;
}
