export async function render(container) {

  container.innerHTML = `
  <div class="view operatore-home">

    <div class="operatore-grid">

      <div onclick="location.hash='#/timbrature'">
        ⏱ Timbratura
      </div>

      <div>
        📋 Compiti
      </div>

      <div onclick="location.hash='#/servizi'">
        🍽 Servizio oggi
      </div>

      <div onclick="location.hash='#/produzione'">
        🍳 Produzioni
      </div>

      <div>
        🏖 Permessi
      </div>

    </div>

  </div>
  `;
}
