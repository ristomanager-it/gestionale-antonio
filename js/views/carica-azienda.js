// js/views/carica-azienda.js
// =======================================
// Carica azienda - cambio azienda attiva
// =======================================

export function render(container) {
  const aziende = window.state.aziende || [];

  container.innerHTML = `
    <div style="padding: 20px; max-width: 600px; margin: 0 auto;">
      <h2>Carica azienda</h2>
      <p>Seleziona l’azienda con cui lavorare</p>

      <div id="aziende-list" style="display:flex; flex-direction:column; gap:10px; margin-top:16px;"></div>

      <button
        id="btn-back-home"
        class="app-button"
        style="margin-top:20px;"
      >
        ⬅️ Torna alla Home
      </button>
    </div>
  `;

  const listEl = document.getElementById("aziende-list");

  if (aziende.length === 0) {
    listEl.innerHTML = "<p>Nessuna azienda disponibile</p>";
    return;
  }

  aziende.forEach((record) => {
    // supporta struttura utenti_aziende → aziende
    const azienda = record.aziende || record;

    const btn = document.createElement("button");
    btn.className = "app-button";
    btn.textContent = azienda.nome;

    btn.addEventListener("click", () => {
      window.stateActions.setAzienda(azienda);
      window.location.hash = "#/home";
    });

    listEl.appendChild(btn);
  });

  document
    .getElementById("btn-back-home")
    .addEventListener("click", () => {
      window.location.hash = "#/home";
    });
}
