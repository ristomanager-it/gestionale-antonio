import { supabase } from "../supabaseClient.js";

export async function render(container) {

  const azienda = window.state?.azienda;

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <div class="login-wrapper">
          <h2 class="login-title">Errore</h2>
          <div class="login-subtitle">Azienda non trovata</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <div class="login-wrapper">
        <h2 class="login-title">Caricamento...</h2>
      </div>
    </div>
  `;

  /* =========================
     CARICA SEDI
  ========================= */

  const { data: sedi, error } = await supabase
    .from("sedi")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("created_at");

  if (error) {
    container.innerHTML = `
      <div class="view">
        <div class="login-wrapper">
          <h2 class="login-title">Errore</h2>
          <div class="login-subtitle">${error.message}</div>
        </div>
      </div>
    `;
    return;
  }

  /* =========================
     RENDER UI
  ========================= */

  container.innerHTML = `

  <div class="view">

    <div class="login-wrapper">

      <div class="login-logo-wrap">
        <img src="assets/favicon-192.png" class="login-logo">
      </div>

      <h2 class="login-title">Le tue sedi</h2>

      <div class="login-subtitle">
        Seleziona una sede oppure creane una nuova
      </div>

      <div id="lista-sedi"></div>

      <div class="form-actions" style="margin-top:20px;">
        <button id="nuova-sede" class="app-button primary">
          + Nuova sede
        </button>
      </div>

    </div>

  </div>

  `;

  const lista = document.getElementById("lista-sedi");

  /* =========================
     LISTA SEDI
  ========================= */

  if (!sedi || sedi.length === 0) {

    lista.innerHTML = `
      <div class="login-subtitle" style="margin-top:20px;">
        Nessuna sede ancora creata
      </div>
    `;

  } else {

    lista.innerHTML = sedi.map(s => `
      <div class="form-group" style="margin-top:15px;">
        <button class="app-button" data-id="${s.id}">
          ${s.nome} - ${s.citta || ""}
        </button>
      </div>
    `).join("");

    lista.querySelectorAll("button").forEach(btn => {

      btn.onclick = () => {

        const sedeId = btn.dataset.id;

        // salva sede attiva
        if(window.stateActions?.setSede){
          window.stateActions.setSede(sedeId);
        }

        window.location.hash = "#/home";

      };

    });

  }

  /* =========================
     CREA NUOVA SEDE
  ========================= */

  document.getElementById("nuova-sede").onclick = () => {
    window.location.hash = "#/onboarding-sede";
  };

}
