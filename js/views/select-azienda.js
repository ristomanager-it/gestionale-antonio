// js/views/select-azienda.js
// =================================
// View: Selezione Azienda
// =================================

export async function render(container) {
  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Seleziona azienda</h2>
        <p class="login-subtitle">
          Scegli l’azienda con cui lavorare
        </p>

        <div id="aziende-list"></div>

        <p id="azienda-error" class="login-error"></p>
      </div>
    </div>
  `;

  const listEl = document.getElementById("aziende-list");
  const errorEl = document.getElementById("azienda-error");

  const user = window.state.user;
  if (!user) {
    window.location.hash = "#/login";
    return;
  }

  const supabase = window.supabaseClient;

  // Carica aziende collegate all'utente
  const { data, error } = await supabase
    .from("utenti_aziende")
    .select(`
      ruolo,
      aziende (
        id,
        nome
      )
    `)
    .eq("user_id", user.id)
    .eq("attivo", true);

  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  if (!data || data.length === 0) {
    errorEl.textContent =
      "Nessuna azienda associata a questo utente.";
    return;
  }

  // Una sola azienda → entra diretto
  if (data.length === 1) {
    const record = data[0];
    window.stateActions.setAziende(data);
    window.stateActions.setAzienda(record.aziende);
    window.stateActions.setRuolo(record.ruolo);
    window.location.hash = "#/home";
    return;
  }

  // Più aziende → scelta manuale
  data.forEach((record) => {
    const btn = document.createElement("button");
    btn.className = "app-button";
    btn.textContent = record.aziende.nome;

    btn.addEventListener("click", () => {
      window.stateActions.setAziende(data);
      window.stateActions.setAzienda(record.aziende);
      window.stateActions.setRuolo(record.ruolo);
      window.location.hash = "#/home";
    });

    listEl.appendChild(btn);
  });
}
