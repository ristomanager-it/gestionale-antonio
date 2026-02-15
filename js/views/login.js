// js/views/login.js
// =======================================
// Login view – versione definitiva stabile
// Con reset password integrato
// =======================================

export async function render(container) {
  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">

        <div class="login-logo">
          <img src="Logo Gestionale Antonio.png" alt="Ristoflow" />
        </div>

        <h2 style="text-align:center">Accesso</h2>

        <form id="login-form">
          <label>
            Email
            <input
              id="login-email"
              type="email"
              class="input-pill"
              required
              autocomplete="email"
            />
          </label>

          <label>
            Password
            <input
              id="login-pass"
              type="password"
              class="input-pill"
              required
              autocomplete="current-password"
            />
          </label>

          <div style="text-align:right; margin-top:6px;">
            <button
              type="button"
              id="btn-reset-password"
              style="background:none;border:none;color:#2563eb;font-size:13px;cursor:pointer;padding:0;"
            >
              Password dimenticata?
            </button>
          </div>

          <div class="login-actions" style="margin-top:14px;">
            <button type="submit" class="app-button login-primary">
              Entra
            </button>
          </div>
        </form>

        <p id="login-error" class="login-error"></p>
        <p id="login-success" style="color:#16a34a;font-size:13px;"></p>
      </div>
    </div>
  `;

  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  const successEl = document.getElementById("login-success");
  const resetBtn = document.getElementById("btn-reset-password");

  // 🔐 LOGIN
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    successEl.textContent = "";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-pass").value;

    try {
      const { error } =
        await window.supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

      if (error) throw error;

      const base =
        window.location.origin + window.location.pathname;

      window.location.href = `${base}#/home`;
      window.location.reload();

    } catch (err) {
      console.error("Errore login:", err);
      errorEl.textContent =
        err.message || "Errore di accesso";
    }
  });

  // 🔁 RESET PASSWORD
  resetBtn.addEventListener("click", async () => {
    errorEl.textContent = "";
    successEl.textContent = "";

    const email = document.getElementById("login-email").value.trim();

    if (!email) {
      errorEl.textContent =
        "Inserisci la tua email per ricevere il link di reset.";
      return;
    }

    try {
      const { error } =
        await window.supabaseClient.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              window.location.origin +
              window.location.pathname +
              "#/setPassword",
          }
        );

      if (error) throw error;

      successEl.textContent =
        "Email di reset inviata. Controlla la tua casella di posta.";
    } catch (err) {
      console.error("Errore reset:", err);
      errorEl.textContent =
        err.message || "Errore durante il reset.";
    }
  });
}
