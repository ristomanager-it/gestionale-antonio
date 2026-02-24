// js/views/gestione.js

export async function render(container) {
  const ruolo = window.state?.ruolo;

  const MODULI = [
    { key: "margini", label: "Margini", icon: "💰" },
    { key: "report", label: "Report", icon: "📊" }
  ];

  const moduliVisibili = MODULI.filter(m =>
    ruolo === "superadmin" ||
    (hasFeature(m.key) && hasPermission(m.key))
  );

  container.innerHTML = `
    <div class="view">

      <div style="
        background: var(--color-primary);
        color: white;
        padding: 32px;
        border-radius: 24px;
        margin-bottom: 32px;
      ">
        <h2 style="margin:0;">Gestione</h2>
        <p style="margin:8px 0 0 0; opacity:0.9;">
          Controllo economico e analisi
        </p>
      </div>

      ${
        moduliVisibili.length === 0
          ? `<p class="small-muted">Nessun modulo disponibile.</p>`
          : `
            <div style="
              display:grid;
              gap:24px;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
                  "
                  onmouseover="this.style.transform='translateY(-6px)'; this.style.boxShadow='0 18px 40px rgba(0,0,0,0.08)'"
                  onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 10px 30px rgba(0,0,0,0.05)'"
                >
                  <div style="font-size:34px; margin-bottom:14px;">${m.icon}</div>
                  <div style="font-weight:600;">${m.label}</div>
                </div>
              `).join("")}
            </div>
          `
      }

    </div>
  `;
}

function hasFeature(area) {
  return window.state?.azienda?.features?.[area] === true;
}

function hasPermission(area) {
  if (window.state?.isSuperadmin) return true;

  const permessi = window.state?.permessi || {};
  const override = window.state?.permessiOverride || {};

  if (Object.prototype.hasOwnProperty.call(override, area)) {
    return override[area] === true;
  }

  return permessi[`${area}.read`] === true;
}
