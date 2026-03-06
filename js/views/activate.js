import { supabase } from "../supabaseClient.js";

export async function render(container) {

  container.innerHTML = `
    <div class="view" style="text-align:center">

      <div style="margin-bottom:20px">
        <img src="/assets/logo-ristoflow.png" height="60">
      </div>

      <h2>Attivazione account</h2>

      <p style="margin-top:10px">
        Verifica del link in corso...
      </p>

    </div>
  `;

  try {

    const hash = window.location.hash;

    const params =
      new URLSearchParams(hash.split("?")[1]);

    const token_hash = params.get("token_hash");
    const type = params.get("type");

    if (!token_hash) {
      throw new Error("Token mancante");
    }

    const { error } =
  await supabase.auth.verifyOtp({
    token_hash,
    type: "invite"
  });

    if (error) {
      throw error;
    }

    window.location.hash = "#/setPassword";

  } catch (err) {

    console.error(err);

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

}
