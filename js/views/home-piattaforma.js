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

      <div style="margin-bottom:32px;">
        <h2 style="margin:0;">Ristoflow – Piattaforma</h2>
        <p class="small-muted" style="margin-top:6px;">
          Controllo SaaS e gestione clienti
        </p>
      </div>

      <div 
        style="
          display:grid;
          gap:20px;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        "
      >

        <!-- CREA AZIENDA -->
        <div 
          onclick="window.location.hash='#/creaAzienda'"
          style="
            background:white;
            padding:28px;
            border-radius:22px;
            text-align:center;
            cursor:pointer;
            box-shadow:0 10px 30px rgba(0,0,0,0.05);
            transition: all 0.25s ease;
          "
          onmouseover="this.style.transform='translateY(-6px)'"
          onmouseout="this.style.transform='translateY(0px)'"
        >
          <div style="font-size:32px;">➕</div>
          <div style="margin-top:12px; font-weight:600;">
            Crea Azienda
          </div>
        </div>

        <!-- GESTIONE AZIENDE -->
        <div 
          onclick="window.location.hash='#/gestioneAziende'"
          style="
            background:white;
            padding:28px;
            border-radius:22px;
            text-align:center;
            cursor:pointer;
            box-shadow:0 10px 30px rgba(0,0,0,0.05);
            transition: all 0.25s ease;
          "
          onmouseover="this.style.transform='translateY(-6px)'"
          onmouseout="this.style.transform='translateY(0px)'"
        >
          <div style="font-size:32px;">🏢</div>
          <div style="margin-top:12px; font-weight:600;">
            Gestione Aziende
          </div>
        </div>

        <!-- DASHBOARD OPERATIVA -->
        <div 
          onclick="window.location.hash='#/home'"
          style="
            background:#111827;
            color:white;
            padding:28px;
            border-radius:22px;
            text-align:center;
            cursor:pointer;
            box-shadow:0 10px 30px rgba(0,0,0,0.12);
            transition: all 0.25s ease;
          "
          onmouseover="this.style.transform='translateY(-6px)'"
          onmouseout="this.style.transform='translateY(0px)'"
        >
          <div style="font-size:32px;">🧪</div>
          <div style="margin-top:12px; font-weight:600;">
            Dashboard Operativa
          </div>
        </div>

      </div>

    </div>
  `;
}
