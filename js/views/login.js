// js/views/login.js
// =======================================
// Login view – versione definitiva stabile
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

          <div class="login-actions">
            <button type="submit" class="app-button login-primary">
              Entra
            </button>
          </div>
        </form>

        <p id="login-error" class="login-error"></p>
      </div>
    </div>
  `;

  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-pass").value;

    try {
      const { error } =
        await window.supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

      if (error) throw error;

      // 🔥 FIX DEFINITIVO
      // ricarichiamo la SPA con hash home
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
}
