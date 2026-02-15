import { supabase } from "../supabaseClient.js";

export async function render(container) {
  // 🔎 Verifica che esista sessione attiva
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    container.innerHTML = `
      <div class="view">
        <h3>Sessione non valida</h3>
        <p>Apri il link ricevuto via email per impostare la password.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Crea la tua password</h2>

      <form id="set-password-form" class="form-stack">

        <label>
          Nuova password
          <input 
            id="new-password" 
            type="password" 
            class="input-pill" 
            required 
            minlength="8"
          />
        </label>

        <label>
          Conferma password
          <input 
            id="confirm-password" 
            type="password" 
            class="input-pill" 
            required 
            minlength="8"
          />
        </label>

        <button type="submit" class="app-button green">
          Salva password
        </button>

      </form>

      <p id="password-error" style="color:#dc2626;"></p>
    </div>
  `;

  document
    .getElementById("set-password-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const newPassword =
        document.getElementById("new-password").value.trim();
      const confirmPassword =
        document.getElementById("confirm-password").value.trim();
      const errorEl = document.getElementById("password-error");

      errorEl.textContent = "";

      if (newPassword.length < 8) {
        errorEl.textContent =
          "La password deve contenere almeno 8 caratteri.";
        return;
      }

      if (newPassword !== confirmPassword) {
        errorEl.textContent = "Le password non coincidono.";
        return;
      }

      // 🔐 Aggiornamento password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_set_password: false,
        },
      });

      if (error) {
        errorEl.textContent = error.message;
        return;
      }

      // 🔄 Reindirizza dopo successo
      window.location.hash = "#/home";
    });
}
