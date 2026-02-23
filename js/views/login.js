// js/views/login.js
import { supabase } from "../supabaseClient.js";

/* =========================================================
   TRACKING ACCESSI CORRETTO (NO EMAIL)
========================================================= */

async function aggiornaAccessoUtente(userId) {
  if (!userId) return;

  const { data, error } = await supabase
    .from("utenti_aziende")
    .select("numero_accessi, azienda_id")
    .eq("user_id", userId)
    .eq("attivo", true)
    .single();

  if (error || !data) return;

  await supabase
    .from("utenti_aziende")
    .update({
      ultimo_accesso: new Date().toISOString(),
      numero_accessi: (data.numero_accessi || 0) + 1,
      stato_invito: "attivo",
    })
    .eq("user_id", userId)
    .eq("azienda_id", data.azienda_id);
}

/* =========================================================
   RENDER LOGIN
========================================================= */

export async function render(container) {
  container.innerHTML = `
    <div class="login-wrapper-modern">

      <div class="login-card-modern">

        <div class="login-logo">
          <img src="favicon-192.png?v=2" alt="Ristoflow Logo" />
        </div>

        <h2>Accedi a Ristoflow</h2>

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
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #3E4D1F 0%,
            #344219 50%,
            #2B3514 100%
          );
          padding: 24px;
        }

        .login-card-modern {
          background: white;
          padding: 48px 40px;
          border-radius: 28px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.15);
          text-align: center;
          animation: fadeIn 0.4s ease;
        }

        .login-logo img {
          width: 120px;
          height: 120px;
          object-fit: contain;
          margin-bottom: 28px;
        }

        .login-card-modern h2 {
          margin-bottom: 32px;
          font-weight: 700;
          font-size: 24px;
          color: #2F2F2F;
        }

        .login-field {
          text-align: left;
          margin-bottom: 22px;
        }

        .login-field label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #6B7280;
          margin-bottom: 8px;
        }

        .login-field input {
          width: 100%;
          padding: 16px 18px;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .login-field input:focus {
          border-color: #4F6228;
          outline: none;
          box-shadow: 0 0 0 4px rgba(79,98,40,0.15);
        }

        .login-button {
          width: 100%;
          padding: 16px;
          border-radius: 18px;
          border: none;
          background: #4F6228;
          color: white;
          font-weight: 700;
          font-size: 17px;
          margin-top: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .login-button:hover {
          background: #3E4D1F;
          transform: translateY(-2px);
        }

        .login-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
        }

        .login-error {
          margin-top: 18px;
          color: #dc2626;
          font-size: 15px;
        }

        @media (max-width: 768px) {
          .login-card-modern {
            padding: 56px 28px;
            max-width: 100%;
            border-radius: 24px;
          }

          .login-logo img {
            width: 140px;
            height: 140px;
          }

          .login-card-modern h2 {
            font-size: 26px;
          }

          .login-field input {
            padding: 18px;
            font-size: 17px;
          }

          .login-button {
            padding: 18px;
            font-size: 18px;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      errorBox.textContent = "Errore recupero utente.";
      btn.disabled = false;
      btn.textContent = "Entra";
      return;
    }

    await aggiornaAccessoUtente(user.id);

    const { data: utenteAzienda, error: uaError } = await supabase
      .from("utenti_aziende")
      .select("azienda_id, ruolo")
      .eq("user_id", user.id)
      .eq("attivo", true)
      .single();

    if (uaError || !utenteAzienda) {
      errorBox.textContent = "Utente non associato ad azienda attiva.";
      btn.disabled = false;
      btn.textContent = "Entra";
      return;
    }

    const { data: permessiEffettivi } = await supabase.rpc(
      "permessi_effettivi",
      {
        p_user_id: user.id,
        p_azienda_id: utenteAzienda.azienda_id,
      }
    );

    window.state.user = user;
    window.state.azienda = { id: utenteAzienda.azienda_id };
    window.state.ruolo = utenteAzienda.ruolo;
    window.state.permessi = permessiEffettivi || {};

    window.location.hash = "#/home";
  };
}
