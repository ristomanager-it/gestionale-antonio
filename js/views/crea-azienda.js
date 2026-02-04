// js/views/crea-azienda.js
// =======================================
// Creazione nuova azienda (SaaS)
// =======================================

export async function render(container) {
  const user = window.state.user;
  const supabase = window.supabaseClient;

  if (!user) {
    window.location.hash = "#/login";
    return;
  }

  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Crea nuova azienda</h2>
        <p class="login-subtitle">
          Inserisci i dati dell’azienda
        </p>

        <form id="azienda-form">
          <label>
            Nome azienda
            <input id="az-nome" class="input-pill" required />
          </label>

          <label>
            Codice azienda (univoco)
            <input id="az-codice" class="input-pill" required />
          </label>

          <label>
            PIN accesso
            <input id="az-pin" class="input-pill" required />
          </label>

          <button class="app-button green" type="submit">
            Crea azienda
          </button>
        </form>

        <p id="azienda-error" class="login-error"></p>
      </div>
    </div>
  `;

  const form = document.getElementById("azienda-form");
  const errorEl = document.getElementById("azienda-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("az-nome").value.trim();
    const codice = document.getElementById("az-codice").value.trim();
    const pin = document.getElementById("az-pin").value.trim();

    if (!nome || !codice || !pin) {
      errorEl.textContent = "Compila tutti i campi.";
      return;
    }

    // 1️⃣ Crea azienda
    const { data: azienda, error: errAzienda } = await supabase
      .from("aziende")
      .insert({
        nome,
        codice,
        pin_accesso: pin
      })
      .select()
      .single();

    if (errAzienda) {
      errorEl.textContent = errAzienda.message;
      return;
    }

    // 2️⃣ Collega utente → azienda
    const { error: errRel } = await supabase
      .from("utenti_aziende")
      .insert({
        user_id: user.id,
        azienda_id: azienda.id,
        ruolo: "admin",
        attivo: true
      });

    if (errRel) {
      errorEl.textContent = errRel.message;
      return;
    }

    // 3️⃣ Set stato globale
    window.stateActions.setAzienda(azienda);
    window.stateActions.setRuolo("admin");

    // 4️⃣ Torna alla home
    window.location.hash = "#/home";
  });
}
