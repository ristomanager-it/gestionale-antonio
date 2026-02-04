import { supabase } from "../config.js";

export function render(container) {
  container.innerHTML = `
    <section class="view login-view">
      <div class="login-card">
        <div class="login-logo">
          <img src="Logo Gestionale Antonio.png" class="login-logo-img" />
        </div>

        <h2>Accesso</h2>
        <p class="login-subtitle">Accedi con email e password</p>

        <form id="login-form" class="login-form">
          <input type="email" id="login-email" class="input-pill" placeholder="Email" required />
          <input type="password" id="login-password" class="input-pill" placeholder="Password" required />

          <label class="remember-label">
            <input type="checkbox" id="login-remember" checked />
            Ricordami
          </label>

          <button class="app-button login-button" type="submit">
            Entra
          </button>
        </form>

        <p id="login-error" style="display:none;color:#dc2626;"></p>
      </div>
    </section>
  `;

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const errorBox = document.getElementById("login-error");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      errorBox.textContent = error.message;
      errorBox.style.display = "block";
      return;
    }

    window.location.hash = "#/home";
  });
}
