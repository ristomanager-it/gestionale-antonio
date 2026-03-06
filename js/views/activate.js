import { supabase } from "../supabaseClient.js";

function getHashParams() {
  const hash = window.location.hash.substring(1); // rimuove #

  const parts = hash.split("&");

  const params = {};

  for (const part of parts) {
    const [key, value] = part.split("=");

    if (key && value) {
      params[key] = decodeURIComponent(value);
    }
  }

  return params;
}

export async function render(container) {

  container.innerHTML = `
    <div class="view" style="text-align:center">

      <div style="margin-bottom:20px">
        <img src="/assets/logo-ristoflow.png" height="60">
      </div>

      <h2>Attivazione account</h2>

      <p style="margin-top:10px">
        Stiamo verificando il tuo invito...
      </p>

    </div>
  `;

  try {

    const params = getHashParams();

    const access_token = params.access_token;
    const refresh_token = params.refresh_token;

    if (access_token && refresh_token) {

      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      window.location.hash = "#/setPassword";
      return;

    }

  } catch (err) {

    console.error("Errore attivazione:", err);

  }

  container.innerHTML = `
    <div class="view" style="text-align:center">

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
