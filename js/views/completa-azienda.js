import { supabase } from "../supabaseClient.js";

export async function render(container) {

  const azienda = window.state?.azienda;

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <h2>Errore</h2>
        <p>Azienda non trovata.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
  <div class="view">

    <h1>Completa configurazione azienda</h1>

    <p style="margin-bottom:20px;">
      Inserisci i dati fiscali e amministrativi per attivare il gestionale.
    </p>

    <div class="form-grid">

      <label>Ragione sociale</label>
      <input id="ragione_sociale" type="text">

      <label>Partita IVA</label>
      <input id="partita_iva" type="text">

      <label>Codice fiscale</label>
      <input id="codice_fiscale" type="text">

      <label>Indirizzo</label>
      <input id="indirizzo" type="text">

      <label>Città</label>
      <input id="citta" type="text">

      <label>CAP</label>
      <input id="cap" type="text">

      <label>Provincia</label>
      <input id="provincia" type="text">

      <label>PEC</label>
      <input id="pec" type="text">

      <label>Codice univoco SDI</label>
      <input id="codice_univoco" type="text">

      <label>Referente</label>
      <input id="referente" type="text">

      <label>Telefono</label>
      <input id="telefono" type="text">

    </div>

    <div style="margin-top:30px;">
      <button id="salva-azienda" class="btn-primary">
        Attiva azienda
      </button>
    </div>

    <div id="msg" style="margin-top:20px;"></div>

  </div>
  `;

  const btn = document.getElementById("salva-azienda");
  const msg = document.getElementById("msg");

  btn.onclick = async () => {

    btn.disabled = true;
    btn.innerText = "Salvataggio...";

    const payload = {

      ragione_sociale: document.getElementById("ragione_sociale").value,
      partita_iva: document.getElementById("partita_iva").value,
      codice_fiscale: document.getElementById("codice_fiscale").value,

      indirizzo: document.getElementById("indirizzo").value,
      citta: document.getElementById("citta").value,
      cap: document.getElementById("cap").value,
      provincia: document.getElementById("provincia").value,

      pec: document.getElementById("pec").value,
      codice_univoco: document.getElementById("codice_univoco").value,

      referente: document.getElementById("referente").value,
      telefono: document.getElementById("telefono").value,

      profilo_completato: true,
      stato_attivazione: "attiva"

    };

    const { error } = await supabase
      .from("aziende")
      .update(payload)
      .eq("id", azienda.id);

    if (error) {

      msg.innerHTML = `
        <div style="color:red;">
          Errore: ${error.message}
        </div>
      `;

      btn.disabled = false;
      btn.innerText = "Attiva azienda";

      return;
    }

    msg.innerHTML = `
      <div style="color:green;">
        Azienda attivata correttamente.
      </div>
    `;

    setTimeout(() => {
      window.location.hash = "#/home";
    }, 1200);

  };

}
