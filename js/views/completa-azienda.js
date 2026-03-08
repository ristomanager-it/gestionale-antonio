```javascript
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

  const titolo = azienda.profilo_completato
    ? "Modifica dati azienda"
    : "Completa configurazione azienda";

  const btnText = azienda.profilo_completato
    ? "Salva modifiche"
    : "Attiva azienda";

  const visione = azienda.visione_ai || {};

  container.innerHTML = `
  <div class="view">

    <h1>${titolo}</h1>

    <p style="margin-bottom:20px;">
      Inserisci o modifica i dati aziendali.
    </p>

    <h3>Dati fiscali</h3>

    <div class="form-grid">

      <label>Ragione sociale *</label>
      <input id="ragione_sociale" type="text" value="${azienda.ragione_sociale || ""}">

      <label>Partita IVA *</label>
      <input id="partita_iva" type="text" value="${azienda.partita_iva || ""}">

      <label>Codice fiscale</label>
      <input id="codice_fiscale" type="text" value="${azienda.codice_fiscale || ""}">

      <label>Indirizzo *</label>
      <input id="indirizzo" type="text" value="${azienda.indirizzo || ""}">

      <label>Città *</label>
      <input id="citta" type="text" value="${azienda.citta || ""}">

      <label>CAP *</label>
      <input id="cap" type="text" value="${azienda.cap || ""}">

      <label>Provincia *</label>
      <input id="provincia" type="text" value="${azienda.provincia || ""}">

      <label>PEC</label>
      <input id="pec" type="text" value="${azienda.pec || ""}">

      <label>Codice univoco SDI</label>
      <input id="codice_univoco" type="text" value="${azienda.codice_univoco || ""}">

      <label>Referente *</label>
      <input id="referente" type="text" value="${azienda.referente || ""}">

      <label>Telefono *</label>
      <input id="telefono" type="text" value="${azienda.telefono || ""}">

    </div>


    <h3 style="margin-top:40px;">Visione aziendale (AI Tony)</h3>

    <p style="margin-bottom:16px;color:#6b7280;">
      Queste informazioni aiutano l'assistente AI a capire il tuo locale.
    </p>

    <div class="form-grid">

      <label>Chi siete?</label>
      <textarea id="chi_siamo">${visione.chi_siamo || ""}</textarea>

      <label>Tipo di locale *</label>
      <select id="tipo_locale">
        <option value="">Seleziona</option>
        <option ${visione.tipo_locale === "Ristorante" ? "selected" : ""}>Ristorante</option>
        <option ${visione.tipo_locale === "Pizzeria" ? "selected" : ""}>Pizzeria</option>
        <option ${visione.tipo_locale === "Bar" ? "selected" : ""}>Bar</option>
        <option ${visione.tipo_locale === "Bistrot" ? "selected" : ""}>Bistrot</option>
        <option ${visione.tipo_locale === "Street food" ? "selected" : ""}>Street food</option>
      </select>

      <label>Target clienti</label>
      <textarea id="target_clienti">${visione.target_clienti || ""}</textarea>

      <label>Tono comunicazione</label>
      <select id="tono">
        <option value="">Seleziona</option>
        <option ${visione.tono === "Elegante" ? "selected" : ""}>Elegante</option>
        <option ${visione.tono === "Amichevole" ? "selected" : ""}>Amichevole</option>
        <option ${visione.tono === "Familiare" ? "selected" : ""}>Familiare</option>
        <option ${visione.tono === "Professionale" ? "selected" : ""}>Professionale</option>
      </select>

      <label>Valori del locale</label>
      <textarea id="valori">${visione.valori || ""}</textarea>

      <label>Esperienza cliente</label>
      <textarea id="esperienza">${visione.esperienza || ""}</textarea>

      <label>Posizionamento</label>
      <select id="posizionamento">
        <option value="">Seleziona</option>
        <option ${visione.posizionamento === "Economico" ? "selected" : ""}>Economico</option>
        <option ${visione.posizionamento === "Medio" ? "selected" : ""}>Medio</option>
        <option ${visione.posizionamento === "Premium" ? "selected" : ""}>Premium</option>
      </select>

    </div>

    <div style="margin-top:30px;">
      <button id="salva-azienda" class="btn-primary">
        ${btnText}
      </button>
    </div>

    <div id="msg" style="margin-top:20px;"></div>

  </div>
  `;

  const btn = document.getElementById("salva-azienda");
  const msg = document.getElementById("msg");

  btn.onclick = async () => {

    msg.innerHTML = "";

    const requiredFields = [
      { id: "ragione_sociale", label: "Ragione sociale" },
      { id: "partita_iva", label: "Partita IVA" },
      { id: "indirizzo", label: "Indirizzo" },
      { id: "citta", label: "Città" },
      { id: "cap", label: "CAP" },
      { id: "provincia", label: "Provincia" },
      { id: "referente", label: "Referente" },
      { id: "telefono", label: "Telefono" },
      { id: "tipo_locale", label: "Tipo locale" }
    ];

    for (const field of requiredFields) {

      const value = document.getElementById(field.id)?.value.trim();

      if (!value) {
        msg.innerHTML = `
          <div style="color:red;">
            Il campo "${field.label}" è obbligatorio.
          </div>
        `;
        return;
      }
    }

    btn.disabled = true;
    btn.innerText = "Salvataggio...";

    const visioneAI = {

      chi_siamo: document.getElementById("chi_siamo").value,
      tipo_locale: document.getElementById("tipo_locale").value,
      target_clienti: document.getElementById("target_clienti").value,
      tono: document.getElementById("tono").value,
      valori: document.getElementById("valori").value,
      esperienza: document.getElementById("esperienza").value,
      posizionamento: document.getElementById("posizionamento").value

    };

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

      visione_ai: visioneAI,

      profilo_completato: true,
      stato_attivazione: azienda.stato_attivazione || "attiva"

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
      btn.innerText = btnText;
      return;

    }

    msg.innerHTML = `
      <div style="color:green;">
        Dati azienda salvati correttamente.
      </div>
    `;

    setTimeout(() => {
      window.location.hash = "#/home";
    }, 1200);

  };

}
```
