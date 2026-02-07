// js/views/home.js
// =======================================
// HOME – con logo azienda e nome utente
// =======================================

export function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  const nomeUtente =
    user?.user_metadata?.full_name ||
    user?.email ||
    "Utente";

  container.innerHTML = `
    <section class="view">
      <div style="padding:30px; background:#fff; color:#111;">

        <!-- HEADER AZIENDA -->
        <div
          style="
            display:flex;
            align-items:center;
            gap:16px;
            margin-bottom:24px;
          "
        >
          ${
            azienda?.logo_url
              ? `
                <img
                  src="${azienda.logo_url}"
                  alt="${azienda.nome}"
                  style="
                    width:64px;
                    height:64px;
                    object-fit:contain;
                    border-radius:8px;
                    border:1px solid #ddd;
                  "
                />
              `
              : `
                <div
                  style="
                    width:64px;
                    height:64px;
                    border-radius:8px;
                    background:#eee;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-weight:bold;
                    color:#666;
                  "
                >
                  ${azienda?.nome?.charAt(0) || "?"}
                </div>
              `
          }

          <div>
            <h1 style="margin:0;">
              ${azienda?.nome || "Nessuna azienda"}
            </h1>

            <p style="margin:4px 0 0; opacity:0.7;">
              ${azienda?.stato === "piattaforma"
                ? "Piattaforma Ristoflow"
                : "Azienda cliente"}
            </p>
          </div>
        </div>

        <!-- INFO UTENTE -->
        <p style="margin-bottom:24px;">
          Benvenuto,
          <strong>${nomeUtente}</strong>
        </p>

        <!-- CONTENUTO BASE -->
        <p>
          Home operativa in costruzione.
        </p>

      </div>
    </section>
  `;
}
