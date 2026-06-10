import { supabase } from "../supabaseClient.js";

export async function render(container) {

  // Carica azienda da DB se lo state non è ancora pronto
  let azienda = window.state?.azienda;

  if (!azienda) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rel } = await supabase
          .from("utenti_aziende")
          .select("azienda_id, aziende(*)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (rel?.aziende) {
          azienda = rel.aziende;
          // Aggiorna lo state globale
          if (window.stateActions?.setAzienda) window.stateActions.setAzienda(azienda);
        }
      }
    } catch (e) {
      console.error("completa-azienda: errore caricamento azienda", e);
    }
  }

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

  const isTrial = azienda.stato_attivazione === "trial";
  const trialScadenza = azienda.trial_scadenza
    ? new Date(azienda.trial_scadenza).toLocaleDateString("it-IT")
    : null;

  container.innerHTML = `

  <div class="view">

    <div style="max-width:820px;margin:auto;">

      ${isTrial ? `
      <div style="background:#e8f4f8;border:1px solid #0E5A7A;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.4rem;">🎁</span>
        <div>
          <strong style="color:#0E5A7A;">Trial gratuito attivo</strong>
          <div style="font-size:0.85rem;color:#374151;">Hai accesso completo fino al ${trialScadenza ?? "30 giorni"}. Completa il profilo per sbloccare tutte le funzionalità.</div>
        </div>
      </div>
      ` : ""}

      <div style="margin-bottom:18px;">
        <div style="font-size:13px;color:#6b7280;">Configurazione</div>
        <h2 style="margin:4px 0 0 0;">${titolo}</h2>
      </div>

      <!-- DATI AZIENDA -->
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
          <label>Partita IVA <span style="color:#9ca3af;font-weight:400;font-size:0.8rem;">(opzionale in trial)</span></label>
          <input id="partita_iva" class="input" value="${azienda.partita_iva || ""}" placeholder="IT00000000000">
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

      </div>

      <!-- 🔥 NUOVA CARD SEDI -->
      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Sedi operative
        </div>

        <div style="font-size:14px;color:#6b7280;margin-bottom:12px;">
          Gestisci le sedi della tua azienda (punti vendita, cucine, laboratori).
        </div>

        <button id="btn-sedi" class="app-button" style="width:100%;">
          🏢 Gestione sedi
        </button>

      </div>

      <!-- VISION GUIDATA -->
      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Vision aziendale
        </div>

        <div class="form-group">
          <label>Tipo locale *</label>
          <select id="tipo_locale" class="input">
            <option value="">Seleziona</option>
            <option ${visione.tipo_locale === "Ristorante" ? "selected" : ""}>Ristorante</option>
            <option ${visione.tipo_locale === "Pizzeria" ? "selected" : ""}>Pizzeria</option>
            <option ${visione.tipo_locale === "Bar" ? "selected" : ""}>Bar</option>
            <option ${visione.tipo_locale === "Fast casual" ? "selected" : ""}>Fast casual</option>
            <option ${visione.tipo_locale === "Gourmet" ? "selected" : ""}>Gourmet</option>
          </select>
        </div>

        <div class="form-group">
          <label>Esperienza cliente *</label>
          <textarea id="esperienza" class="input" style="min-height:80px;">${visione.esperienza_cliente || ""}</textarea>
        </div>

        <div class="form-group">
          <label>Valori (separati da virgola)</label>
          <input id="valori" class="input" value="${(visione.valori || []).join(", ")}">
        </div>

        <div class="form-group">
          <label>Vision libera</label>
          <textarea id="vision" class="input" style="min-height:80px;">${visione.vision_testo || ""}</textarea>
        </div>

      </div>

      <!-- REGOLAMENTO -->
      <div class="card">

        <div style="font-weight:700;margin-bottom:12px;">
          Regolamento aziendale
        </div>

        <div class="form-group">
          <label>Regolamento (testo)</label>
          <textarea id="regolamento" class="input" style="min-height:100px;">${visione.regolamento_testo || ""}</textarea>
        </div>

        <div class="form-group">
          <label>Carica file regolamento (PDF)</label>
          <input type="file" id="file-regolamento" class="input">
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

  // 🔥 EVENTO SEDI
  const btnSedi = document.getElementById("btn-sedi");
  if(btnSedi){
    btnSedi.onclick = () => {
      window.location.hash = "#/gestione-sedi";
    }
  }

  btn.onclick = async () => {

    msg.innerHTML = "";

    const required = [
      "ragione_sociale",
      "indirizzo",
      "citta",
      "telefono",
      "tipo_locale",
      "esperienza"
    ];

    for (const id of required) {
      if (!document.getElementById(id).value.trim()) {
        msg.innerHTML = "<span style='color:#dc2626;'>Compila tutti i campi obbligatori</span>";
        return;
      }
    }

    btn.disabled = true;
    btn.innerText = "Salvataggio...";

    const valori = document.getElementById("valori").value
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);

    let fileUrl = visione.regolamento_file_url || null;

    const file = document.getElementById("file-regolamento").files[0];

    if (file) {
      const path = `${azienda.id}/regolamento-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("aziende-documenti")
        .upload(path, file);

      if (!uploadError) {
        const { data } = supabase.storage
          .from("aziende-documenti")
          .getPublicUrl(path);

        fileUrl = data.publicUrl;
      }
    }

    const payload = {

      ragione_sociale: document.getElementById("ragione_sociale").value,
      partita_iva: document.getElementById("partita_iva").value,
      indirizzo: document.getElementById("indirizzo").value,
      citta: document.getElementById("citta").value,
      telefono: document.getElementById("telefono").value,

      visione_ai: {
        tipo_locale: document.getElementById("tipo_locale").value,
        esperienza_cliente: document.getElementById("esperienza").value,
        valori,
        vision_testo: document.getElementById("vision").value,
        regolamento_testo: document.getElementById("regolamento").value,
        regolamento_file_url: fileUrl,
        social: {
          instagram: social.instagram || "",
          facebook: social.facebook || "",
          tiktok: social.tiktok || ""
        }
      },

      profilo_completato: true,
      stato_attivazione: "attiva",
      stato: "attiva"

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

    window.stateActions.setAzienda(data);

    msg.innerHTML = "<span style='color:#16a34a;'>Salvato ✔</span>";

    window.location.hash = "#/home";

  };

}
