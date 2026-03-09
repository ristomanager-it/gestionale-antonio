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

      /* -------------------------
         LOGIN SUPABASE
      ------------------------- */

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (signInError) {
        errorBox.textContent = signInError.message;
        resetLoginButton();
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        errorBox.textContent = "Errore recupero utente.";
        resetLoginButton();
        return;
      }

      await aggiornaAccessoUtente(user.id);

      /* -------------------------
         CARICA RELAZIONI AZIENDE
      ------------------------- */

      const { data: relazioni, error: relError } =
        await supabase
          .from("utenti_aziende")
          .select("azienda_id, ruolo, attivo")
          .eq("user_id", user.id)
          .eq("attivo", true);

      if (relError) {
        console.error(relError);
        errorBox.textContent = "Errore caricamento relazione azienda.";
        resetLoginButton();
        return;
      }

      if (!relazioni || relazioni.length === 0) {
        errorBox.textContent = "Nessuna azienda associata.";
        resetLoginButton();
        return;
      }

      /* -------------------------
         PRIORITÀ SUPERADMIN
      ------------------------- */

      let relazione =
        relazioni.find(r => r.ruolo === "superadmin") ||
        relazioni[0];

      /* -------------------------
         CARICA AZIENDA
      ------------------------- */

      const { data: azienda, error: aziendaError } =
        await supabase
          .from("aziende")
          .select("*")
          .eq("id", relazione.azienda_id)
          .maybeSingle();

      if (aziendaError) {
        console.error(aziendaError);
        errorBox.textContent = "Errore caricamento azienda.";
        resetLoginButton();
        return;
      }

      if (!azienda) {
        errorBox.textContent = "Azienda non trovata.";
        resetLoginButton();
        return;
      }

      /* -------------------------
         SALVA STATO APP
      ------------------------- */

      window.state.user = user;
      window.state.azienda = azienda;

      localStorage.setItem("ristoflow_user", JSON.stringify(user));
      localStorage.setItem("azienda_session", JSON.stringify(azienda));

      /* -------------------------
         ROUTING
      ------------------------- */

      if (azienda.stato === "piattaforma") {
        window.location.hash = "#/homePiattaforma";
        return;
      }

      if (!azienda.profilo_completato) {
        window.location.hash = "#/completaAzienda";
      } else {
        window.location.hash = "#/home";
      }

    } catch (err) {

      console.error("Errore login:", err);
      errorBox.textContent =
        err?.message || "Errore durante il login.";
      resetLoginButton();

    }

  };

  const resetPassword = async () => {

    const email = emailInput.value.trim();

    if (!email) {
      errorBox.textContent = "Inserisci prima la tua email.";
      return;
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://ristoflow-ai.com/#/setPassword",
      });

    if (error) {
      errorBox.textContent = error.message;
      return;
    }

    errorBox.style.color = "#16a34a";
    errorBox.textContent =
      "Email di reset inviata. Controlla la tua posta.";
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
