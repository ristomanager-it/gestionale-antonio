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
          <img src="favicon-192.png?v=7" alt="Ristoflow Logo" />
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
          height: 100dvh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            180deg,
            #0E5A7A 0%,
            #0C4E6A 50%,
            #083E55 100%
          );
          padding: 32px; /* stessa fascia su tutti i lati */
          box-sizing: border-box;
        }

        .login-card-modern {
          background: white;
          padding: 42px 60px; /* più grande lateralmente */
          border-radius: 24px;
          width: 100%;
          max-width: 640px; /* più larga */
          box-shadow: 0 30px 70px rgba(0,0,0,0.25);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .login-logo {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-bottom: 22px;
        }

        .login-logo img {
          width: 130px; /* logo più grande */
          height: 130px;
          object-fit: contain;
        }

        .login-card-modern h2 {
          margin-bottom: 26px;
          font-weight: 600;
          font-size: 26px;
          color: #1f2937;
        }

        .login-field {
          width: 100%;
          text-align: left;
          margin-bottom: 18px;
        }

        .login-field label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #6B7280;
          margin-bottom: 6px;
        }

        .login-field input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid #E5E7EB;
          font-size: 16px;
        }

        .login-field input:focus {
          border-color: #0E5A7A;
          outline: none;
          box-shadow: 0 0 0 3px rgba(14,90,122,0.15);
        }

        .login-button {
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          border: none;
          background: #0E5A7A;
          color: white;
          font-weight: 600;
          font-size: 16px;
          margin-top: 18px;
          cursor: pointer;
        }

        .login-button:hover {
          background: #083E55;
        }

        .login-error {
          margin-top: 16px;
          color: #dc2626;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .login-wrapper-modern {
            padding: 24px;
          }

          .login-card-modern {
            max-width: 100%;
            padding: 32px 26px;
          }

          .login-logo img {
            width: 110px;
            height: 110px;
          }

          .login-card-modern h2 {
            font-size: 22px;
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
