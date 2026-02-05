// js/views/login.js
export async function render(container) {
  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-logo">
          <img src="Logo Gestionale Antonio.png" alt="RistoManager" />
        </div>

        <h2>Accesso</h2>
        <p class="login-subtitle">
          Inserisci email e password
        </p>

        <form id="login-form">
          <label>
            Email
            <input id="login-email" type="email" class="input-pill" required />
          </label>

          <label>
            Password
            <input id="login-pass" type="password" class="input-pill" required />
          </label>

          <button class="app-button green" type="submit">
            Entra
          </button>
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

      // 🔁 DOPO LOGIN → HOME
      window.location.hash = "#/home";
    } catch (err) {
      errorEl.textContent = err.message || "Errore di accesso";
    }
  });
}
