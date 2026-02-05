// js/views/login.js
export async function render(container) {
  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Login SaaS</h2>
        <p class="login-subtitle">Accesso admin/superadmin (email + password)</p>

        <form id="login-form">
          <label>
            Email
            <input id="login-email" type="email" class="input-pill" required />
          </label>

          <label>
            Password
            <input id="login-pass" type="password" class="input-pill" required />
          </label>

          <button class="app-button green" type="submit">Entra</button>
        </form>

        <p id="login-error" class="login-error"></p>
      </div>
    </div>
  `;

  const form = document.getElementById("login-form");
  const errEl = document.getElementById("login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-pass").value;

    try {
      const { error } = await window.supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      window.location.hash = "#/home";
    } catch (err) {
      console.error(err);
      errEl.textContent = err.message || "Errore login";
    }
  });
}
