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
  const social = visione.social || {};

  const pianoNome = azienda.piano_nome || azienda.piano || "Starter";

  container.innerHTML = `

  <div class="view">

    <div style="max-width:820px;margin:auto;">

      <div style="margin-bottom:18px;">
        <div style="font-size:13px;color:#6b7280;">Configurazione</div>
        <h2 style="margin:4px 0 0 0;">${titolo}</h2>
      </div>

      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Dati azienda
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

      </div>

      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Presenza digitale
        </div>

        <div class="form-group">
          <label>Sito web *</label>
          <input id="sito_web" class="input" placeholder="https://..." value="${visione.sito_web || ""}">
        </div>

        <div class="form-group">
          <label>Instagram</label>
          <input id="instagram" class="input" value="${social.instagram || ""}">
        </div>

        <div class="form-group">
          <label>Facebook</label>
          <input id="facebook" class="input" value="${social.facebook || ""}">
        </div>

        <div class="form-group">
          <label>TikTok</label>
          <input id="tiktok" class="input" value="${social.tiktok || ""}">
        </div>

      </div>

      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Vision aziendale *
        </div>

        <div class="form-group">
          <label>Descrivi la tua identità, filosofia e obiettivi</label>
          <textarea id="vision" class="input" style="min-height:100px;">${visione.vision || ""}</textarea>
        </div>

      </div>

      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Posizionamento *
        </div>

        <div class="form-group">
          <label>Target clienti, fascia prezzo, stile del locale</label>
          <textarea id="posizionamento" class="input" style="min-height:100px;">${visione.posizionamento || ""}</textarea>
        </div>

      </div>

      <div style="margin-top:20px;">
        <button id="salva-azienda" class="app-button primary" style="width:100%;">
          ${btnText}
        </button>
      </div>

      <div id="msg" style="margin-top:14px;"></div>

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
      "tipo_locale",
      "sito_web",
      "vision",
      "posizionamento"
    ];

    for (const id of required) {
      if (!document.getElementById(id).value.trim()) {
        msg.innerHTML = "<span style='color:#dc2626;'>Compila tutti i campi obbligatori</span>";
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
        tipo_locale: document.getElementById("tipo_locale").value,
        sito_web: document.getElementById("sito_web").value,
        social: {
          instagram: document.getElementById("instagram").value,
          facebook: document.getElementById("facebook").value,
          tiktok: document.getElementById("tiktok").value
        },
        vision: document.getElementById("vision").value,
        posizionamento: document.getElementById("posizionamento").value
      },

      profilo_completato: true,
      stato_attivazione: "attiva",
      stato: "attiva" // 🔥 FIX CRITICO

    };

    const { data, error } = await supabase
      .from("aziende")
      .update(payload)
      .eq("id", azienda.id)
      .select();

    if (error) {

      msg.innerHTML = "<span style='color:#dc2626;'>" + error.message + "</span>";

      btn.disabled = false;
      btn.innerText = btnText;
      return;

    }

    // 🔥 AGGIORNA STATE
    window.stateActions.setAzienda(data);

    msg.innerHTML = "<span style='color:#16a34a;'>Azienda attivata</span>";

    // redirect immediato corretto
    window.location.hash = "#/home";

  };

}
