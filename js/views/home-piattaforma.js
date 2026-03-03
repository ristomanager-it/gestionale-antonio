// js/views/home-piattaforma.js
// =======================================
// Home Piattaforma (Superadmin)
// =======================================

export async function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 style="margin:0;">Ristoflow – Piattaforma</h2>
          <p class="small-muted" style="margin-top:6px;">
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

      <div style="display:grid; gap:18px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">

        <div 
          onclick="window.location.hash='#/creaAzienda'"
          style="
            background:white;
            padding:22px;
            border-radius:22px;
            cursor:pointer;
            box-shadow:0 10px 30px rgba(0,0,0,0.05);
            transition: all 0.25s ease;
          "
          onmouseover="this.style.transform='translateY(-6px)'"
          onmouseout="this.style.transform='translateY(0px)'"
        >
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:14px; color:#6b7280;">Provisioning</div>
              <div style="margin-top:6px; font-weight:700; font-size:18px;">Crea Azienda</div>
              <div style="margin-top:6px; font-size:13px; color:#6b7280;">
                Nuovo cliente + admin
              </div>
            </div>
            <div style="font-size:28px;">➕</div>
          </div>
        </div>

        <div 
          onclick="window.location.hash='#/gestioneAziende'"
          style="
            background:white;
            padding:22px;
            border-radius:22px;
            cursor:pointer;
            box-shadow:0 10px 30px rgba(0,0,0,0.05);
            transition: all 0.25s ease;
          "
          onmouseover="this.style.transform='translateY(-6px)'"
          onmouseout="this.style.transform='translateY(0px)'"
        >
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:14px; color:#6b7280;">Clienti</div>
              <div style="margin-top:6px; font-weight:700; font-size:18px;">Gestione Aziende</div>
              <div style="margin-top:6px; font-size:13px; color:#6b7280;">
                Stato, scadenze, sospensioni
              </div>
            </div>
            <div style="font-size:28px;">🏢</div>
          </div>
        </div>

        <div 
          onclick="window.location.hash='#/gestionePiani'"
          style="
            background:white;
            padding:22px;
            border-radius:22px;
            cursor:pointer;
            box-shadow:0 10px 30px rgba(0,0,0,0.05);
            transition: all 0.25s ease;
          "
          onmouseover="this.style.transform='translateY(-6px)'"
          onmouseout="this.style.transform='translateY(0px)'"
        >
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:14px; color:#6b7280;">SaaS</div>
              <div style="margin-top:6px; font-weight:700; font-size:18px;">Gestione Piani</div>
              <div style="margin-top:6px; font-size:13px; color:#6b7280;">
                Prezzi, sedi, feature
              </div>
            </div>
            <div style="font-size:28px;">🧩</div>
          </div>
        </div>

        <div 
          onclick="window.location.hash='#/home'"
          style="
            background:#111827;
            color:white;
            padding:22px;
            border-radius:22px;
            cursor:pointer;
            box-shadow:0 10px 30px rgba(0,0,0,0.12);
            transition: all 0.25s ease;
          "
          onmouseover="this.style.transform='translateY(-6px)'"
          onmouseout="this.style.transform='translateY(0px)'"
        >
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:14px; opacity:0.8;">Operatività</div>
              <div style="margin-top:6px; font-weight:700; font-size:18px;">Dashboard Operativa</div>
              <div style="margin-top:6px; font-size:13px; opacity:0.8;">
                Entra nel gestionale
              </div>
            </div>
            <div style="font-size:28px;">🧪</div>
          </div>
        </div>

      </div>

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

        window.location.hash = "#/login";
      } catch (err) {
        console.error("Errore logout:", err);
      }
    });
  }
}
