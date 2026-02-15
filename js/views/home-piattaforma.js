// js/views/home-piattaforma.js
export async function render(container) {
  const azienda = window.state.azienda;

  container.innerHTML = `
    <div class="view">

      <div style="margin-bottom:30px;">
        <h2 style="margin:0;">Piattaforma SaaS</h2>
        <p class="small-muted" style="margin-top:6px;">
          Gestione clienti, abbonamenti e controllo sistema
        </p>
      </div>

      <div 
        style="
          display:grid;
          gap:18px;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        "
      >

        <!-- Dashboard Operativa -->
        <div class="app-button"
          style="padding:26px; text-align:center;"
          onclick="window.location.hash='#/home'"
        >
          <div style="font-size:28px;">🏠</div>
          <div style="margin-top:10px;">Dashboard Operativa</div>
        </div>

        <!-- Gestione Aziende -->
        <div class="app-button"
          style="padding:26px; text-align:center;"
          onclick="window.location.hash='#/gestioneAziende'"
        >
          <div style="font-size:28px;">🏢</div>
          <div style="margin-top:10px;">Gestione Aziende</div>
        </div>

        <!-- Crea Azienda -->
        <div class="app-button"
          style="padding:26px; text-align:center;"
          onclick="window.location.hash='#/creaAzienda'"
        >
          <div style="font-size:28px;">➕</div>
          <div style="margin-top:10px;">Crea Azienda</div>
        </div>

      </div>

    </div>
  `;
}
