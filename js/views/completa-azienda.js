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

  const titolo = azienda.profilo_completato
    ? "Modifica dati azienda"
    : "Completa configurazione";

  const btnText = azienda.profilo_completato
    ? "Salva modifiche"
    : "Attiva azienda";

  const visione = azienda.visione_ai || {};
  const pianoNome = azienda.piano_nome || azienda.piano || "Starter";

  container.innerHTML = `

  <div class="view">

    <div class="login-wrapper">

      <div class="login-logo-wrap">
        <img src="assets/favicon-192.png" class="login-logo">
      </div>

      <h2 class="login-title">${titolo}</h2>

      <div class="login-subtitle">
        Inserisci i dati per completare l’attivazione
      </div>

      <div class="form-group">
        <label>Piano attivo</label>
        <input class="input" value="${pianoNome}" disabled>
      </div>

      <div class="form-group">
        <label>Ragione sociale *</label>
        <input id="ragione_sociale" class="input" value="${azienda.ragione_sociale || ""}">
      </div>

      <div class="form-group">
        <label>Partita IVA *</label>
        <input id="partita_iva" class="input" value="${azienda.partita_iva || ""}">
      </div>

      <div class="form-group">
        <label>Indirizzo *</label>
        <input id="indirizzo" class="input" value="${azienda.indirizzo || ""}">
      </div>

      <div class="form-group">
        <label>Città *</label>
        <input id="citta" class="input" value="${azienda.citta || ""}">
      </div>

      <div class="form-group">
        <label>Telefono *</label>
        <input id="telefono" class="input" value="${azienda.telefono || ""}">
      </div>

      <div class="form-group">
        <label>Tipo locale *</label>
        <select id="tipo_locale" class="input">
          <option value="">Seleziona</option>
          <option ${visione.tipo_locale === "Ristorante" ? "selected" : ""}>Ristorante</option>
          <option ${visione.tipo_locale === "Pizzeria" ? "selected" : ""}>Pizzeria</option>
          <option ${visione.tipo_locale === "Bar" ? "selected" : ""}>Bar</option>
        </select>
      </div>

      <div class="form-actions">
        <button id="salva-azienda" class="app-button primary">
          ${btnText}
        </button>
      </div>

      <div id="msg" class="form-result"></div>

    </div>

  </div>

  `;

  const btn = document.getElementById("salva-azienda");
  const msg = document.getElementById("msg");

  btn.onclick = async () => {

    msg.innerHTML = "";

    const required = [
      "ragione_sociale",
      "partita_iva",
      "indirizzo",
      "citta",
      "telefono",
      "tipo_locale"
    ];

    for (const id of required) {
      if (!document.getElementById(id).value.trim()) {
        msg.innerHTML = "<span class='error-text'>Compila tutti i campi obbligatori</span>";
        return;
      }
    }

    btn.disabled = true;
    btn.innerText = "Salvataggio...";

    const payload = {

      ragione_sociale: document.getElementById("ragione_sociale").value,
      partita_iva: document.getElementById("partita_iva").value,
      indirizzo: document.getElementById("indirizzo").value,
      citta: document.getElementById("citta").value,
      telefono: document.getElementById("telefono").value,

      visione_ai: {
        tipo_locale: document.getElementById("tipo_locale").value
      },

      profilo_completato: true,
      stato_attivazione: "attiva"

    };

    const { error } = await supabase
      .from("aziende")
      .update(payload)
      .eq("id", azienda.id);

    if (error) {

      msg.innerHTML = "<span class='error-text'>" + error.message + "</span>";

      btn.disabled = false;
      btn.innerText = btnText;
      return;

    }

    msg.innerHTML = "<span class='success-text'>Azienda attivata</span>";

    setTimeout(() => {
      window.location.hash = "#/home";
    }, 800);

  };

}
