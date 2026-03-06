import { supabase } from "../supabaseClient.js";

function readSupabaseTokensFromHash() {
  const hash = window.location.hash || "";

  let tokenString = "";

  if (hash.startsWith("#/setPassword#")) {
    tokenString = hash.slice("#/setPassword#".length);
  } else if (hash.startsWith("#/setPassword?")) {
    tokenString = hash.slice("#/setPassword?".length);
  } else if (hash.startsWith("#access_token=")) {
    tokenString = hash.slice(1);
  } else if (hash.includes("access_token=")) {
    tokenString = hash.substring(hash.indexOf("access_token="));
  }

  const params = new URLSearchParams(tokenString);

  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
  };
}

export async function render(container) {
  container.innerHTML = `
    <div class="view">
      <h2>Verifica in corso...</h2>
    </div>
  `;

  const showForm = () => {
    container.innerHTML = `
      <div class="view">
        <div style="text-align:center;margin-bottom:20px">
          <img src="/assets/logo-ristoflow.png" height="50" alt="Ristoflow">
        </div>

        <h2>Crea la tua password</h2>

        <form id="set-password-form" class="form-stack">
          <label>
            Nuova password
            <input id="new-password" type="password" class="input-pill" required minlength="8">
          </label>

          <label>
            Conferma password
            <input id="confirm-password" type="password" class="input-pill" required minlength="8">
          </label>

          <button type="submit" class="app-button green">
            Salva password
          </button>
        </form>

        <p id="password-error" style="color:#dc2626"></p>
      </div>
    `;

    document
      .getElementById("set-password-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById("new-password").value.trim();
        const confirmPassword = document.getElementById("confirm-password").value.trim();
        const errorEl = document.getElementById("password-error");

        errorEl.textContent = "";

        if (newPassword.length < 8) {
          errorEl.textContent = "La password deve contenere almeno 8 caratteri.";
          return;
        }

        if (newPassword !== confirmPassword) {
          errorEl.textContent = "Le password non coincidono.";
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          errorEl.textContent = error.message;
          return;
        }

        alert("Password impostata correttamente");
        window.location.hash = "#/home";
      });
  };

  try {
    const { access_token, refresh_token } = readSupabaseTokensFromHash();

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        throw error;
      }

      showForm();
      return;
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (data?.session) {
      showForm();
      return;
    }

    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        showForm();
      }
    });
  } catch (err) {
    console.error("Errore set-password:", err);
  }

  container.innerHTML = `
    <div class="view" style="text-align:center">
      <div style="margin-bottom:20px">
        <img src="/assets/logo-ristoflow.png" height="60" alt="Ristoflow">
      </div>

      <h2>Sessione non valida</h2>

      <p>
        Apri di nuovo il link ricevuto via email.
      </p>
    </div>
  `;
}
