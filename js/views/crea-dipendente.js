import { supabase } from "../supabaseClient.js";

export async function render(container) {

  const azienda = window.state?.azienda;
  const sedeId = window.state?.sedeAttiva;

  if (!azienda || !sedeId) {
    container.innerHTML = `
      <div class="view">
        <div class="login-wrapper">
          <h2 class="login-title">Errore</h2>
          <div class="login-subtitle">Azienda o sede non trovata</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `

  <div class="view">

    <div class="login-wrapper">

      <div class="login-logo-wrap">
        <img src="assets/favicon-192.png" class="login-logo">
      </div>

      <h2 class="login-title">Nuovo dipendente</h2>

      <div class="login-subtitle">
        Inserisci i dati per invitare un nuovo membro del team
      </div>

      <div class="form-group">
        <label>Nome *</label>
        <input id="nome" class="input">
      </div>

      <div class="form-group">
        <label>Cognome *</label>
        <input id="cognome" class="input">
      </div>

      <div class="form-group">
        <label>Email *</label>
        <input id="email" class="input" type="email">
      </div>

      <div class="form-group">
        <label>Telefono</label>
        <input id="telefono" class="input">
      </div>

      <div class="form-group">
        <label>Ruolo *</label>
        <select id="ruolo" class="input">
          <option value="">Seleziona</option>
          <option value="operatore">Operatore</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      <div class="form-actions">
        <button id="crea" class="app-button primary">
          Invia invito
        </button>
      </div>

      <div id="msg" class="form-result"></div>

    </div>

  </div>
  `;

  const btn = document.getElementById("crea");
  const msg = document.getElementById("msg");

  btn.onclick = async () => {

    msg.innerHTML = "";

    const nome = document.getElementById("nome").value.trim();
    const cognome = document.getElementById("cognome").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const ruolo = document.getElementById("ruolo").value;

    if (!nome || !cognome || !email || !ruolo) {
      msg.innerHTML = "<span class='error-text'>Compila i campi obbligatori</span>";
      return;
    }

    btn.disabled = true;
    btn.innerText = "Invio in corso...";

    try {

      const res = await fetch(
        "https://YOUR_PROJECT.supabase.co/functions/v1/invita-dipendente",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            nome,
            cognome,
            email,
            telefono,
            ruolo,
            sede_id: sedeId,
            azienda_id: azienda.id
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore invito");
      }

      msg.innerHTML = "<span class='success-text'>Invito inviato</span>";

      setTimeout(() => {
        window.location.hash = "#/dipendenti";
      }, 1000);

    } catch (err) {

      msg.innerHTML = "<span class='error-text'>" + err.message + "</span>";

      btn.disabled = false;
      btn.innerText = "Invia invito";
    }

  };

}
