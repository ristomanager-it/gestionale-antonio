import { supabase } from "../supabaseClient.js";

async function aggiornaAccessoUtente(userId) {
  if (!userId) return;

  const { data, error } = await supabase
    .from("utenti_aziende")
    .select("azienda_id, numero_accessi")
    .eq("user_id", userId)
    .eq("attivo", true);

  if (error || !Array.isArray(data)) return;

  for (const row of data) {
    try {
      await supabase
        .from("utenti_aziende")
        .update({
          ultimo_accesso: new Date().toISOString(),
          numero_accessi: (row.numero_accessi || 0) + 1,
          stato_invito: "attivo",
        })
        .eq("user_id", userId)
        .eq("azienda_id", row.azienda_id);
    } catch (e) {
      console.error("Errore aggiornamento accesso:", e);
    }
  }
}

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
            autocomplete="username"
          />
        </div>

        <div class="login-field">
          <label>Password</label>
          <input 
            id="login-password" 
            type="password" 
            placeholder="Inserisci password"
            autocomplete="current-password"
          />
        </div>

        <button class="login-button" id="btn-login">
          Entra
        </button>

        <div class="login-forgot">
          <button id="btn-reset" class="reset-button">
            Password dimenticata?
          </button>
        </div>

        <div id="login-error" class="login-error"></div>

      </div>

      <style>
        .login-wrapper-modern {
          min-height: 100dvh;
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
          padding: 32px;
          box-sizing: border-box;
        }

        .login-card-modern {
          background: white;
          padding: 42px 60px;
          border-radius: 24px;
          width: 100%;
          max-width: 640px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.25);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }

        .login-logo {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-bottom: 22px;
        }

        .login-logo img {
          width: 130px;
          height: 130px;
          object-fit: contain;
        }

        .login-card-modern h2 {
          margin: 0 0 26px 0;
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
          box-sizing: border-box;
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
          transition: background 0.2s ease, opacity 0.2s ease;
        }

        .login-button:hover {
          background: #083E55;
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-forgot {
          margin-top: 14px;
        }

        .reset-button {
          background: none;
          border: none;
          color: #0E5A7A;
          font-size: 14px;
          cursor: pointer;
          text-decoration: underline;
          transition: opacity 0.2s ease;
        }

        .reset-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-error {
          margin-top: 16px;
          color: #dc2626;
          font-size: 14px;
          min-height: 20px;
        }

        @media (max-width: 768px) {
          .login-wrapper-modern {
            padding: 20px;
          }

          .login-card-modern {
            padding: 28px 22px;
            border-radius: 20px;
            max-width: 100%;
          }

          .login-logo img {
            width: 100px;
            height: 100px;
          }

          .login-card-modern h2 {
            font-size: 22px;
            margin-bottom: 22px;
          }

          .login-field label {
            font-size: 13px;
          }

          .login-field input {
            font-size: 16px;
            padding: 13px 14px;
          }

          .login-button {
            font-size: 15px;
            padding: 14px;
            border-radius: 14px;
          }

          .reset-button {
            font-size: 13px;
          }
        }
      </style>

    </div>
  `;

  const btn = document.getElementById("btn-login");
  const resetBtn = document.getElementById("btn-reset");
  const errorBox = document.getElementById("login-error");
  const emailInput = document.getElementById("login-email");
  const passInput = document.getElementById("login-password");

  const resetLoginButton = () => {
    btn.disabled = false;
    btn.textContent = "Entra";
  };

  const doLogin = async () => {
    errorBox.style.color = "#dc2626";
    errorBox.textContent = "";

    const email = emailInput.value.trim().toLowerCase();
    const password = passInput.value.trim();

    if (!email || !password) {
      errorBox.textContent = "Inserisci email e password.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Accesso in corso...";

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        errorBox.textContent = signInError.message || "Credenziali non valide.";
        resetLoginButton();
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        errorBox.textContent = "Errore recupero utente.";
        resetLoginButton();
        return;
      }

      await aggiornaAccessoUtente(user.id);

      const { data: relazioni, error: relError } = await supabase
        .from("utenti_aziende")
        .select("azienda_id, ruolo, attivo")
        .eq("user_id", user.id)
        .eq("attivo", true);

      if (relError) {
        console.error("Errore lettura utenti_aziende:", relError);
        errorBox.textContent = "Errore caricamento relazione azienda.";
        resetLoginButton();
        return;
      }

      if (!relazioni || relazioni.length === 0) {
        errorBox.textContent = "Azienda non trovata.";
        resetLoginButton();
        return;
      }

      const relazione = relazioni[0];

      const { data: azienda, error: aziendaError } = await supabase
        .from("aziende")
        .select("*")
        .eq("id", relazione.azienda_id)
        .single();

      if (aziendaError) {
        console.error("Errore lettura azienda:", aziendaError);
        errorBox.textContent = "Errore caricamento azienda.";
        resetLoginButton();
        return;
      }

      if (!azienda) {
        errorBox.textContent = "Azienda non trovata.";
        resetLoginButton();
        return;
      }

      window.state.user = user;
      window.state.azienda = azienda;

      localStorage.setItem("ristoflow_user", JSON.stringify(user));
      localStorage.setItem("azienda_session", JSON.stringify(azienda));

      if (azienda.stato === "piattaforma") {
        window.location.hash = "#/homePiattaforma";
        return;
      }

      if (!azienda.profilo_completato) {
        window.location.hash = "#/completa-azienda";
      } else {
        window.location.hash = "#/home";
      }
    } catch (err) {
      console.error("Errore login:", err);
      errorBox.textContent = err?.message || "Errore durante il login.";
      resetLoginButton();
    }
  };

  const resetPassword = async () => {
    errorBox.style.color = "#dc2626";
    errorBox.textContent = "";

    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
      errorBox.textContent = "Inserisci prima la tua email.";
      return;
    }

    resetBtn.disabled = true;
    resetBtn.textContent = "Invio email...";

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://ristoflow-ai.com/#/setPassword",
      });

      if (error) {
        errorBox.textContent = error.message || "Errore invio email reset.";
        resetBtn.disabled = false;
        resetBtn.textContent = "Password dimenticata?";
        return;
      }

      errorBox.style.color = "#16a34a";
      errorBox.textContent = "Email di reset inviata. Controlla la tua posta.";

      resetBtn.disabled = false;
      resetBtn.textContent = "Password dimenticata?";
    } catch (err) {
      console.error("Errore reset password:", err);
      errorBox.textContent = err?.message || "Errore durante il reset password.";
      resetBtn.disabled = false;
      resetBtn.textContent = "Password dimenticata?";
    }
  };

  btn.onclick = doLogin;
  resetBtn.onclick = resetPassword;

  passInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });

  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
}
