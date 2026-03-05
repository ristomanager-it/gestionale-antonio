import { supabase } from "../supabaseClient.js";

export async function render(container) {

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Verifica in corso...</h2>
      <p>Attendere qualche secondo...</p>
    </div>
  `;

  const showForm = () => {
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Crea la tua password</h2>

        <form id="set-password-form" class="form-stack">

          <label>
            Nuova password
            <input 
              id="new-password" 
              type="password" 
              class="input-pill" 
              required 
              minlength="8"
            />
          </label>

          <label>
            Conferma password
            <input 
              id="confirm-password" 
              type="password" 
              class="input-pill" 
              required 
              minlength="8"
            />
          </label>

          <button type="submit" class="app-button green">
            Salva password
          </button>

        </form>

        <p id="password-error" style="color:#dc2626;"></p>
      </div>
    `;

    document
      .getElementById("set-password-form")
      .addEventListener("submit", async (e) => {

        e.preventDefault();

        const newPassword =
          document.getElementById("new-password").value.trim();

        const confirmPassword =
          document.getElementById("confirm-password").value.trim();

        const errorEl = document.getElementById("password-error");

        errorEl.textContent = "";

        if (newPassword.length < 8) {
          errorEl.textContent =
            "La password deve contenere almeno 8 caratteri.";
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

        alert("Password impostata correttamente.");

        window.location.hash = "#/home";
      });
  };

  /* ============================
     RECOVERY FLOW SUPABASE
  ============================ */

  try {

    const { data, error } = await supabase.auth.getSession();

    if (data?.session) {
      showForm();
      return;
    }

    const hash = window.location.hash || "";

    if (hash.includes("access_token")) {

      const params = new URLSearchParams(hash.substring(1));

      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (access_token && refresh_token) {

        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        showForm();
        return;
      }
    }

  } catch (err) {
    console.error(err);
  }

  /* ============================
     EVENTI AUTH
  ============================ */

  supabase.auth.onAuthStateChange((event, session) => {

    if (event === "PASSWORD_RECOVERY") {
      showForm();
    }

    if (event === "SIGNED_IN") {
      showForm();
    }

  });

}
