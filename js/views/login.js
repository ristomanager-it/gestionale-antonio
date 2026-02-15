// js/views/login.js
import { supabase } from "../supabaseClient.js";

export async function render(container) {
  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">

        <h2 style="margin-top:0;">Accesso</h2>

        <div style="margin-top:16px;">
          <label class="small-muted">Email</label>
          <input 
            id="login-email" 
            type="email" 
            class="input-pill" 
            placeholder="Inserisci email"
          />
        </div>

        <div style="margin-top:12px;">
          <label class="small-muted">Password</label>
          <input 
            id="login-password" 
            type="password" 
            class="input-pill" 
            placeholder="Inserisci password"
          />
        </div>

        <div style="margin-top:20px;">
          <button class="app-button" id="btn-login">
            Accedi
          </button>
        </div>

        <div id="login-error" style="margin-top:14px;"></div>

      </div>
    </div>
  `;

  const btn = document.getElementById("btn-login");
  const errorBox = document.getElementById("login-error");

  btn.onclick = async () => {
    errorBox.innerHTML = "";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
      errorBox.innerHTML = `
        <span style="color:#dc2626;">
          Inserisci email e password.
        </span>
      `;
      return;
    }

    btn.disabled = true;
    btn.textContent = "Accesso in corso...";

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      errorBox.innerHTML = `
        <span style="color:#dc2626;">
          ${error.message}
        </span>
      `;
      btn.disabled = false;
      btn.textContent = "Accedi";
      return;
    }

    // Login ok → router gestirà redirect
    window.location.hash = "#/home";
  };
}
