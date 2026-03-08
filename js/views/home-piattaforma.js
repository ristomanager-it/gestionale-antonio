```javascript
// js/views/home-piattaforma.js
// =======================================
// Home Piattaforma (Superadmin)
// =======================================

export async function render(container) {

  const user = window.state.user;
  const azienda = window.state.azienda;

  if (!user || !azienda || azienda.stato !== "piattaforma") {
    container.innerHTML = `
      <div class="view">
        <h2>Accesso non autorizzato</h2>
        <p>Questa sezione è riservata alla piattaforma.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:28px;
        flex-wrap:wrap;
        gap:12px;
      ">
        <div>
          <h2 style="margin:0;font-size:26px;">Ristoflow – Piattaforma</h2>
          <p class="small-muted" style="margin-top:6px;font-size:14px;">
            Controllo SaaS e gestione clienti
          </p>
        </div>

        <button 
          id="btn-logout-piattaforma"
          class="app-button small red"
        >
          Esci
        </button>
      </div>

      <div style="
        display:grid;
        gap:20px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      ">

        <div 
          onclick="window.location.hash='#/creaAzienda'"
          class="piattaforma-card"
        >
          <div class="piattaforma-card-content">
            <div>
              <div class="card-label">Provisioning</div>
              <div class="card-title">Crea Azienda</div>
              <div class="card-desc">
                Nuovo cliente + admin
              </div>
            </div>
            <div class="card-icon">➕</div>
          </div>
        </div>

        <div 
          onclick="window.location.hash='#/gestioneAziende'"
          class="piattaforma-card"
        >
          <div class="piattaforma-card-content">
            <div>
              <div class="card-label">Clienti</div>
              <div class="card-title">Gestione Aziende</div>
              <div class="card-desc">
                Stato, scadenze, assistenza
              </div>
            </div>
            <div class="card-icon">🏢</div>
          </div>
        </div>

        <div 
          onclick="window.location.hash='#/gestionePiani'"
          class="piattaforma-card"
        >
          <div class="piattaforma-card-content">
            <div>
              <div class="card-label">SaaS</div>
              <div class="card-title">Gestione Piani</div>
              <div class="card-desc">
                Prezzi, sedi, feature
              </div>
            </div>
            <div class="card-icon">🧩</div>
          </div>
        </div>

        <div 
          onclick="window.location.hash='#/home'"
          class="piattaforma-card dark"
        >
          <div class="piattaforma-card-content">
            <div>
              <div class="card-label light">Operatività</div>
              <div class="card-title">Dashboard Operativa</div>
              <div class="card-desc light">
                Entra nel gestionale
              </div>
            </div>
            <div class="card-icon">🧪</div>
          </div>
        </div>

      </div>

      <style>

        .piattaforma-card{
          background:white;
          padding:26px;
          border-radius:24px;
          cursor:pointer;
          box-shadow:0 10px 30px rgba(0,0,0,0.05);
          transition: all 0.25s ease;
        }

        .piattaforma-card:hover{
          transform:translateY(-6px);
          box-shadow:0 18px 40px rgba(0,0,0,0.08);
        }

        .piattaforma-card.dark{
          background:#111827;
          color:white;
        }

        .piattaforma-card-content{
          display:flex;
          align-items:center;
          justify-content:space-between;
        }

        .card-label{
          font-size:14px;
          color:#6b7280;
        }

        .card-label.light{
          opacity:0.8;
        }

        .card-title{
          margin-top:6px;
          font-weight:700;
          font-size:20px;
        }

        .card-desc{
          margin-top:6px;
          font-size:14px;
          color:#6b7280;
        }

        .card-desc.light{
          opacity:0.8;
        }

        .card-icon{
          font-size:30px;
        }

      </style>

    </div>
  `;

  const btnLogout = document.getElementById("btn-logout-piattaforma");

  if (btnLogout) {

    btnLogout.addEventListener("click", async () => {

      try {

        await window.supabaseClient.auth.signOut();

        window.state.user = null;
        window.state.azienda = null;

        localStorage.removeItem("ristoflow_user");
        localStorage.removeItem("ristoflow_azienda");

        window.location.hash = "#/login";

      } catch (err) {

        console.error("Errore logout:", err);

      }

    });

  }

}
```
