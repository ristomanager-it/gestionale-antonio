import { supabase } from "../supabaseClient.js";

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

    const hash = window.location.hash;

    if (hash.includes("access_token")) {

      const params =
        new URLSearchParams(hash.split("?")[1]);

      const access_token =
        params.get("access_token");

      const refresh_token =
        params.get("refresh_token");

      if (access_token && refresh_token) {

        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        window.location.hash = "#/setPassword";
        return;

      }

    }

  } catch (err) {

    console.error(err);

  }

  container.innerHTML = `
    <div class="view" style="text-align:center">

      <h2>Link non valido</h2>

      <p>
        Il link di attivazione è scaduto.
      </p>

      <p>
        Contatta il supporto Ristoflow.
      </p>

    </div>
  `;
}
