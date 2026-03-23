export async function render(app) {
  app.innerHTML = `
    <section class="view">

      <div style="margin-bottom:12px;">
        <button class="app-button small gray"
          onclick="window.location.hash='#/home'">
          ← Dashboard
        </button>
      </div>

      <h2>🏭 Centro Produzione</h2>

      <p class="small-muted" style="margin-bottom:18px;">
        Gestisci creazione ricette, pianificazione e preparazioni.
      </p>

      <div style="
        display:flex;
        flex-direction:column;
        gap:12px;
        margin-top:10px;
      ">

        <!-- 🔥 NUOVO -->
        <button class="app-button"
          style="padding:16px; font-size:16px;"
          onclick="window.location.hash='#/planner-produzione'">
          📅 Planning Produzione
        </button>


        <button class="app-button"
          style="padding:16px; font-size:16px;"
          onclick="window.location.hash='#/creaRicetta'">
          ➕ Crea Ricetta
        </button>

        <button class="app-button"
          style="padding:16px; font-size:16px;"
          onclick="window.location.hash='#/ricettario'">
          📖 Ricettario
        </button>

        <button class="app-button"
          style="padding:16px; font-size:16px;"
          onclick="window.location.hash='#/preparazioni'">
          🏷️ Preparazioni / Lotti
        </button>

      </div>

    </section>
  `;
}
