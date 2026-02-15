// js/views/login.js
import { supabase } from "../supabaseClient.js";

export async function render(container) {
  container.innerHTML = `
    <div class="login-wrapper-modern">

      <div class="login-card-modern">

        <!-- LOGO -->
        <div class="login-logo">
          <img src="Logo Gestionale Antonio.png" alt="Logo" />
        </div>

        <h2>Accedi al gestionale</h2>

        <div class="login-field">
          <label>Email</label>
          <input 
            id="login-email" 
            type="email" 
            placeholder="Inserisci email"
          />
        </div>

        <div class="login-field">
          <label>Password</label>
          <input 
            id="login-password" 
            type="password" 
            placeholder="Inserisci password"
          />
        </div>

        <button class="login-button" id="btn-login">
          Entra
        </button>

        <div id="login-error" class="login-error"></div>

      </div>

      <style>
        .login-wrapper-modern {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          padding: 20px;
        }

        .login-card-modern {
          background: white;
          padding: 40px 32px;
          border-radius: 24px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          text-align: center;
          animation: fadeIn 0.5s ease;
        }

        .login-logo img {
          width: 90px;
          height: 90px;
          object-fit: contain;
          margin-bottom: 20px;
        }

        .login-card-modern h2 {
          margin-bottom: 28px;
          font-weight: 600;
          color: #111827;
        }

        .login-field {
          text-align: left;
          margin-bottom: 18px;
        }

        .login-field label {
          display: block;
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 6px;
        }

        .login-field input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .login-field input:focus {
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
        }

        .login-button {
          width: 100%;
          padding: 14px;
          border-radius: 16px;
          border: none;
          background: #2563eb;
          color: white;
          font-weight: 600;
          font-size: 15px;
          margin-top: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .login-button:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
        }

        .login-button:disabled {
          background: #93c5fd;
          cursor: not-allowed;
          transform: none;
        }

        .login-error {
          margin-top: 16px;
          color: #dc2626;
          font-size: 14px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      </style>

    </div>
  `;

  const btn = document.getElementById("btn-login");
  const errorBox = document.getElementById("login-error");

  btn.onclick = async () => {
    errorBox.textContent = "";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
      errorBox.textContent = "Inserisci email e password.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Accesso in corso...";

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      errorBox.textContent = error.message;
      btn.disabled = false;
      btn.textContent = "Entra";
      return;
    }

    window.location.hash = "#/home";
  };
}
