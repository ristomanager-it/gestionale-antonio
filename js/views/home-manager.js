export async function render(container, reparto) {

  container.innerHTML = `
  <div class="view manager-home">

    <div class="agenda-card">
      <div class="agenda-title">Programma oggi</div>

      <div class="agenda-row">12:00 — Servizio pranzo</div>
      <div class="agenda-row">15:30 — Produzioni cucina</div>
      <div class="agenda-row">18:30 — Preparazione servizio</div>
      <div class="agenda-row">19:30 — Servizio cena</div>
    </div>

    <div class="urgenze-card">
      <div class="agenda-title">Urgenze</div>

      <div class="urgenza">⚠ Brigata incompleta</div>
      <div class="urgenza">⚠ Produzione in ritardo</div>
      <div class="urgenza">⚠ Prenotazioni sotto media</div>
    </div>

    <div class="manager-grid">

      <div class="card" onclick="location.hash='#/servizi'">
        Servizi
      </div>

      <div class="card" onclick="location.hash='#/produzione'">
        Produzioni
      </div>

      <div class="card" onclick="location.hash='#/dipendenti'">
        Brigata
      </div>

      <div class="card" onclick="location.hash='#/timbrature'">
        Timbrature
      </div>

    </div>

  </div>
  `;
}
