import { supabase } from "../supabaseClient.js";

function readTokensFromCurrentUrl() {
  const hash = window.location.hash || "";

  let tokenString = "";

  if (hash.startsWith("#/activate?")) {
    tokenString = hash.slice("#/activate?".length);
  } else if (hash.startsWith("#/activate#")) {
    tokenString = hash.slice("#/activate#".length);
  } else if (hash.startsWith("#access_token=")) {
    tokenString = hash.slice(1);
  } else if (hash.includes("access_token=")) {
    tokenString = hash.slice(hash.indexOf("access_token="));
  }

  const params = new URLSearchParams(tokenString);

  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    expires_in: params.get("expires_in"),
    expires_at: params.get("expires_at"),
    token_type: params.get("token_type"),
    type: params.get("type"),
  };
}

export async function render(container) {
  container.innerHTML = `
    <div class="view" style="text-align:center">
      <div style="margin-bottom:20px">
        <img src="/assets/logo-ristoflow.png" height="60" alt="Ristoflow">
      </div>

      <h2>Attivazione account</h2>

      <p style="margin-top:10px">
        Stiamo verificando il tuo invito...
      </p>
    </div>
  `;

  try {
    const {
      access_token,
      refresh_token,
    } = readTokensFromCurrentUrl();

    if (access_token && refresh_token) {
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (setSessionError) {
        throw setSessionError;
      }

      window.location.hash = "#/setPassword";
      return;
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (data?.session) {
      window.location.hash = "#/setPassword";
      return;
    }
  } catch (err) {
    console.error("Errore attivazione:", err);
  }

  container.innerHTML = `
    <div class="view" style="text-align:center">
      <div style="margin-bottom:20px">
        <img src="/assets/logo-ristoflow.png" height="60" alt="Ristoflow">
      </div>

      <h2>Link non valido</h2>

      <p>
        Il link di attivazione è scaduto o non valido.
      </p>

      <p>
        Contatta il supporto Ristoflow.
      </p>
    </div>
  `;
}
