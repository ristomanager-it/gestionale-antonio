// js/views/login.js
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
            <input id="login-email" type="email" class="input-pill" required />
          </label>

          <label>
            Password
            <input id="login-pass" type="password" class="input-pill" required />
          </label>

          <div class="login-actions">
            <button id="btn-login" class="app-button primary" type="submit">
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

      // ✅ NON forziamo la rotta
      // lasciamo che il router rilegga la sessione
      setTimeout(() => {
        window.router.init();
      }, 0);
    } catch (err) {
      errorEl.textContent = err.message || "Errore di accesso";
    }
  });
}
