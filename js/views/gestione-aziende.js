if (!aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h3>Accesso negato</h3>
        <p>Sezione riservata alla piattaforma.</p>
      </div>
    </div>
  `;
  return;
}
