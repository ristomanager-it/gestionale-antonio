// js/views/login.js
// =======================================
// Login SaaS con Supabase Auth + Ricordami
// =======================================

import { supabase } from "../config.js";

export function render(container) {
  container.innerHTML = `
    <section class="view login-view">
      <div class="login-wrapper">
        <div class="login-card">

          <div class="login-logo">
            <img src="Logo Gestionale Antonio.png" class="login-logo-img" />
          </div>

          <h2>Accesso</h2>
          <p class="login-subtitle">Accedi con email e password</p>

          <form id="login-form" class="login-form">
            <label>
              Email
              <input
                type="email"
                id="login-email"
                class="input-pill"
                required
                autocomplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                id="login-password"
                class="input-pill"
                required
                autocomplete="current-password"
              />
            </label>

            <label class="remember-label">
              <input type="checkbox" id="login-remember" />
              Ricordami
            </label>

            <button
              type="submit"
              class="app-button login-button"
            >
              Entra
            </button>
          </form>

          <p
            id="login-error"
            style="margin-top:10px; color:#dc2626; font-size:13px; display:none;"
          ></p>

        </div>
      </div>
    </section>
  `;

  const form = document.getElementById("login-form");
  const errorBox = document.getElementById("login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const remember = document.getElementById("login-remember").checked;

    try {
      // 🔥 Imposta il tipo di persistenza sessione
      await supabase.auth.setSession(null); // reset sicurezza

      supabase.auth._persistSession = true;
      supabase.auth._storage =
        remember ? localStorage : sessionStorage;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Login ok → router gestisce il resto
      window.location.hash = "#/home";

    } catch (err) {
      console.error("Errore login:", err);
      errorBox.textContent =
        err.message || "Errore durante il login";
      errorBox.style.display = "block";
    }
  });
}
