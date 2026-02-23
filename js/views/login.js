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
          <img src="favicon-192.png?v=3" alt="Ristoflow Logo" />
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
