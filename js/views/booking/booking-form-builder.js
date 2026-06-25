export async function render(container) {
  const aziendaId =
    window.state?.azienda?.id ||
    window.state?.aziendaAttiva?.id ||
    null;

  const sedeId =
    window.state?.sedeSelezionata?.id ||
    window.state?.sedeAttiva?.id ||
    null;

  let currentForm = null;
  let tempFormId = null;
  let tempSlug = null;

  let customFields = [];
  let fasceOrarie = [];
  let currentLink = null;

  const BASE_PUBLIC_URL = "https://app.ristoflow-ai.com";
  const STORAGE_BUCKET = "loghi-aziende";

  container.innerHTML = `
 <div style="padding:12px; max-width:960px; margin:0 auto; width:100%; box-sizing:border-box;">

    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; align-items:center; gap:10px; flex-wrap:wrap;">
      <h2 style="margin:0;">Booking Forms</h2>
      <button id="new-form" class="app-button primary" type="button">+ Nuovo Form</button>
    </div>

    <div id="forms-list" style="margin-top:12px;"></div>

    <hr>

    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; align-items:center; gap:10px; flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <h2 style="margin:0;">Editor</h2>
        <span id="draft-status" style="font-size:12px;color:#6b7280;"></span>
      </div>
      <div id="actions-box"></div>
    </div>

    <label style="display:block;margin-top:10px;font-size:12px;font-weight:600;">Nome form</label>
    <input id="nome" class="input" placeholder="Es. Cena degustazione / Evento matrimonio">

    <label style="display:block;margin-top:10px;font-size:12px;font-weight:600;">Slug personalizzato</label>
    <input id="slug" class="input" placeholder="es. matrimonio-giulia-luca">

    <label style="display:block;margin-top:10px;font-size:12px;font-weight:600;">Emoji identificativa</label>
    <input id="emoji" class="input" placeholder="es. 🍷 🎂 💍">

    <label style="display:flex;align-items:center;gap:8px;margin-top:10px;">
      <input type="checkbox" id="attivo" checked>
      Form attivo

    <div style="margin-top:16px;">
      <label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">Sorgente / Canale</label>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">Traccia da dove arrivano le prenotazioni di questo form</div>
      <select id="sorgente" class="input" style="width:100%;">
        <option value="gestionale">🖥️ Gestionale (interno)</option>
        <option value="sito_web">🌐 Sito web</option>
        <option value="whatsapp">💬 WhatsApp</option>
        <option value="rfbook">📱 RistoflowBook (social)</option>
        <option value="qr_sala">📲 QR Code sala</option>
        <option value="instagram">📷 Instagram</option>
        <option value="google">🔍 Google</option>
        <option value="telefono">📞 Telefono</option>
        <option value="altro">➕ Altro</option>
      </select>
      <div id="rfbook-info" style="display:none;margin-top:8px;background:#e8f4f8;border-radius:8px;padding:10px 12px;font-size:12px;color:#0E5A7A;font-weight:600;">
        📱 Questo form sarà collegato a RistoflowBook — gli utenti social vedranno questo form quando prenotano e riceveranno punti fidelity automaticamente.
      </div>
    </div>
    </label>

    <div id="link-box"></div>

    <hr>

    <h3>Branding</h3>

    <label style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" id="logo_enabled" checked>
      Mostra logo
    </label>

    <div style="margin-top:8px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;">
      <input type="file" id="logo_file" accept="image/png,image/jpeg,image/jpg" class="input">
      <button id="upload-logo" class="app-button" type="button">Carica logo</button>
    </div>

    <input id="logo_url" class="input" placeholder="Logo URL generato" readonly>
    <div id="logo-preview" style="margin-top:8px;"></div>

    <h4>Colore sfondo</h4>
    <div id="palette" style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;"></div>

    <div style="display:grid;grid-template-columns:70px 1fr;gap:8px;align-items:center;">
      <input type="color" id="bg_color_picker" value="#f7f9fc" style="width:70px;height:42px;">
      <input id="bg_color" class="input" placeholder="#f7f9fc">
    </div>

    <h4>Immagine sfondo</h4>
    <div style="margin-top:8px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;">
      <input type="file" id="bg_file" accept="image/png,image/jpeg,image/jpg" class="input">
      <button id="upload-bg" class="app-button" type="button">Carica sfondo</button>
    </div>

    <input id="bg_image" class="input" placeholder="URL immagine sfondo generato" readonly>
    <div id="bg-preview" style="margin-top:8px;"></div>

    <h4 style="margin-top:16px;">📸 Foto di copertina <span style="font-size:11px;color:#94a3b8;font-weight:400;">(appare in cima al form)</span></h4>
    <div style="margin-top:8px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;">
      <input type="file" id="cover_file" accept="image/png,image/jpeg,image/jpg" class="input">
      <button id="upload-cover" class="app-button" type="button">Carica cover</button>
    </div>
    <input id="cover_url" class="input" placeholder="URL cover generato" readonly style="margin-top:8px;">
    <div id="cover-preview" style="margin-top:8px;"></div>

    <hr>

    <h3>Testi</h3>

    <label style="display:block;margin-top:10px;font-size:12px;font-weight:600;">Titolo</label>
    <input id="title" class="input" placeholder="Prenota il tuo tavolo">

    <label style="display:block;margin-top:10px;font-size:12px;font-weight:600;">Sottotitolo</label>
    <input id="subtitle" class="input" placeholder="Es. Ti aspettiamo per una serata speciale">

    <hr>

    <h3>Campi standard</h3>

    <label><input type="checkbox" id="allergie"> Allergie / intolleranze</label><br>
    <label><input type="checkbox" id="note" checked> Note cliente</label>

    <h3>Campi custom avanzati</h3>

    <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">
      Usa i campi custom per domande specifiche. Se abiliti "taggabile", la risposta viene salvata come dato strutturato utile per filtri, statistiche e AI.
    </div>

    <div id="custom-list"></div>

    <button id="add-custom" class="app-button" type="button">+ Campo custom</button>

    <hr>

    <h3>Disponibilità</h3>

    <h4>Giorni prenotabili</h4>
    <div id="giorni-box" style="display:flex;gap:8px;flex-wrap:wrap;"></div>

    <h4>Fasce orarie guidate</h4>
    <div id="fasce-list"></div>

    <button id="add-fascia" class="app-button" type="button">+ Fascia oraria</button>

    <hr>

    <h3>Tag form</h3>
    <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">
      I tag identificano origine o tipo del form: evento, matrimonio, estate, instagram, QR sala. Verranno salvati sulla prenotazione.
    </div>
    <input id="tags" class="input" placeholder="evento, estate, matrimonio">

    <hr>

    <h3>📋 Booking Policy & Consensi</h3>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px;margin-bottom:14px;font-size:12px;color:#0369a1;line-height:1.6;">
      Questa sezione appare come <strong>ultima schermata prima del tasto Prenota</strong>, su tutti i form costruiti con questo builder.
      Il cliente deve accettare policy e privacy per procedere. Il consenso marketing è libero.
    </div>

    <!-- POLICY ATTIVA -->
    <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <input type="checkbox" id="policy_enabled" style="accent-color:#0E5A7A;width:18px;height:18px;">
      <span style="font-size:14px;font-weight:600;">Mostra schermata policy prima dell'invio</span>
    </label>

    <div id="policy-editor-wrap">
      <!-- TIPO POLICY -->
      <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;">Tipo documento</label>
      <select id="policy_tipo" class="input" style="margin-bottom:12px;">
        <option value="booking">📅 Booking policy (condizioni prenotazione)</option>
        <option value="cancellazione">❌ Policy di cancellazione</option>
        <option value="caparra">💳 Policy caparra / deposito</option>
        <option value="evento">🎉 Condizioni evento speciale</option>
        <option value="personalizzata">✏️ Testo personalizzato</option>
      </select>

      <!-- TESTO POLICY -->
      <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;">Testo policy <span style="color:#94a3b8;font-weight:400;">(supporta a capo)</span></label>
      <textarea id="policy_text" class="input" rows="8" style="font-size:13px;line-height:1.6;resize:vertical;"
        placeholder="Es. La prenotazione si intende confermata solo dopo il pagamento della caparra...&#10;Cancellazioni entro 24 ore prima sono gratuite...&#10;Ritardi oltre 15 minuti comportano la perdita del tavolo..."></textarea>

      <!-- PREVIEW POLICY -->
      <div style="margin-top:8px;">
        <button type="button" id="btn-preview-policy" class="app-button" style="font-size:12px;padding:6px 14px;">
          👁️ Anteprima come la vede il cliente
        </button>
      </div>

      <div id="policy-preview-box" style="display:none;margin-top:10px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;max-height:200px;overflow-y:auto;font-size:13px;color:#374151;line-height:1.7;white-space:pre-wrap;"></div>
    </div>

    <hr>

    <!-- CONSENSI -->
    <h3>✅ Consensi</h3>

    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:16px;">

      <!-- Privacy GDPR — sempre obbligatorio -->
      <div style="border-bottom:1px solid #f1f5f9;padding-bottom:14px;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="background:#dcfce7;border-radius:8px;padding:4px 8px;font-size:11px;font-weight:700;color:#15803d;white-space:nowrap;margin-top:2px;">OBBLIGATORIO</div>
          <div>
            <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🔒 Trattamento dati personali (GDPR)</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:8px;">Il cliente deve spuntare per procedere. Testo del consenso:</div>
            <textarea id="consenso_privacy_testo" class="input" rows="2" style="font-size:12px;resize:none;"
              placeholder="Ho letto e accetto l'informativa sul trattamento dei dati personali ai sensi del GDPR (Reg. UE 2016/679)."></textarea>
            <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;">
              <input type="checkbox" id="consenso_privacy_link_enabled" style="accent-color:#0E5A7A;">
              Aggiungi link all'informativa privacy
            </label>
            <input id="consenso_privacy_link" class="input" style="margin-top:6px;font-size:12px;"
              placeholder="https://tuosito.it/privacy" />
          </div>
        </div>
      </div>

      <!-- Policy prenotazione — obbligatorio se policy attiva -->
      <div style="border-bottom:1px solid #f1f5f9;padding-bottom:14px;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="background:#dbeafe;border-radius:8px;padding:4px 8px;font-size:11px;font-weight:700;color:#1d4ed8;white-space:nowrap;margin-top:2px;">SE POLICY ATTIVA</div>
          <div>
            <div style="font-size:14px;font-weight:700;margin-bottom:4px;">📋 Accettazione booking policy</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:8px;">Appare automaticamente se hai attivato la policy sopra. Testo del consenso:</div>
            <textarea id="consenso_policy_testo" class="input" rows="2" style="font-size:12px;resize:none;"
              placeholder="Ho letto e accetto le condizioni di prenotazione."></textarea>
          </div>
        </div>
      </div>

      <!-- Marketing — libero -->
      <div>
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="background:#fef3c7;border-radius:8px;padding:4px 8px;font-size:11px;font-weight:700;color:#92400e;white-space:nowrap;margin-top:2px;">LIBERO</div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-size:14px;font-weight:700;">📣 Consenso marketing</span>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b;">
                <input type="checkbox" id="consenso_marketing_enabled" style="accent-color:#0E5A7A;"> Includi
              </label>
            </div>
            <div style="font-size:12px;color:#64748b;margin-bottom:8px;">Facoltativo. Il cliente può non spuntare e prenotare comunque.</div>
            <textarea id="consenso_marketing_testo" class="input" rows="2" style="font-size:12px;resize:none;"
              placeholder="Acconsento a ricevere comunicazioni promozionali, offerte e novità via WhatsApp e email. Potrò revocare il consenso in qualsiasi momento."></textarea>
          </div>
        </div>
      </div>

    </div>

    <hr>

    <hr>

    <!-- ════════════════════════════════════════
         SEZIONE PAGAMENTO STRIPE
         ════════════════════════════════════════ -->
    <h3>💳 Pagamento online</h3>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px;margin-bottom:14px;font-size:12px;color:#0369a1;line-height:1.6;">
      Se attivato, il cliente deve pagare la caparra o il saldo <strong>prima</strong> che la prenotazione venga confermata.
      Richiede Stripe configurato nella sezione <strong>Pagamenti</strong> del gestionale.
    </div>

    <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <input type="checkbox" id="pagamento_attivo" style="accent-color:#0E5A7A;width:18px;height:18px;">
      <span style="font-size:14px;font-weight:600;">Richiedi pagamento prima della conferma</span>
    </label>

    <div id="pagamento-editor-wrap" style="display:none;">

      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:14px;">

        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:6px;">Tipo importo</label>
          <select id="pagamento_tipo" class="input" style="width:100%;">
            <option value="fisso">💶 Importo fisso (es. €50 caparra totale)</option>
            <option value="persona">👥 Per persona (es. €20 a testa)</option>
            <option value="percentuale">📊 Percentuale sul totale stimato</option>
          </select>
        </div>

        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:6px;" id="pagamento_importo_label">Importo (€)</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="number" id="pagamento_importo" class="input" style="max-width:160px;" min="0" step="0.01" placeholder="Es. 30">
            <span id="pagamento_importo_suffix" style="font-size:13px;color:#64748b;">€</span>
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;" id="pagamento_importo_hint">
            Importo fisso che il cliente pagherà indipendentemente dal numero di coperti.
          </div>
        </div>

        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:6px;">Etichetta pulsante pagamento</label>
          <input id="pagamento_label_btn" class="input" placeholder="Es. Paga caparra e conferma · Completa il pagamento" value="Paga la caparra e conferma">
        </div>

        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:6px;">Descrizione visibile al cliente</label>
          <input id="pagamento_descrizione" class="input" placeholder="Es. Caparra prenotazione — Campo Antico Ricevimenti">
        </div>

        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:6px;">Note aggiuntive (opzionale)</label>
          <textarea id="pagamento_note" class="input" rows="2" placeholder="Es. La caparra verrà scalata dal conto finale. Non rimborsabile in caso di no-show."></textarea>
        </div>

        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400e;">
          ⚠️ Assicurati che Stripe sia configurato e attivo nella sezione <strong>Configurazione → Pagamenti</strong>.
          Se Stripe non è attivo, il form tornerà al flusso senza pagamento.
        </div>

      </div>

    </div>

    <hr>

    <button id="save" class="app-button primary" type="button">SALVA FORM</button>

    <div id="msg" style="margin-top:12px;"></div>

  </div>
  `;

  renderPalette();
  renderGiorni([1, 2, 3, 4, 5, 6]);
  renderCustom();
  renderFasce();

  document.getElementById("new-form").onclick = startNewForm;
  document.getElementById("save").onclick = saveForm;
  document.getElementById("add-custom").onclick = addCustomField;
  document.getElementById("add-fascia").onclick = addFascia;
  document.getElementById("upload-logo").onclick = uploadLogo;
  document.getElementById("upload-bg").onclick = uploadBackground;
  document.getElementById("upload-cover").onclick = uploadCover;

  // Preview policy
  document.getElementById("btn-preview-policy").onclick = () => {
    const box = document.getElementById("policy-preview-box");
    const testo = document.getElementById("policy_text").value.trim();
    if (!testo) { box.style.display = "none"; return; }
    box.textContent = testo;
    box.style.display = box.style.display === "none" ? "" : "none";
  };

  // Toggle visibilità editor policy
  document.getElementById("policy_enabled").onchange = (e) => {
    document.getElementById("policy-editor-wrap").style.display = e.target.checked ? "" : "none";
  };
  // Stato iniziale
  document.getElementById("policy-editor-wrap").style.display =
    document.getElementById("policy_enabled").checked ? "" : "none";

  // Toggle visibilità editor pagamento
  document.getElementById("pagamento_attivo").onchange = (e) => {
    document.getElementById("pagamento-editor-wrap").style.display = e.target.checked ? "" : "none";
  };
  document.getElementById("pagamento-editor-wrap").style.display =
    document.getElementById("pagamento_attivo").checked ? "" : "none";

  // Aggiorna label/hint in base al tipo
  document.getElementById("pagamento_tipo").addEventListener("change", aggiornaPagamentoUI);

  function aggiornaPagamentoUI() {
    const tipo = document.getElementById("pagamento_tipo").value;
    const label = document.getElementById("pagamento_importo_label");
    const suffix = document.getElementById("pagamento_importo_suffix");
    const hint = document.getElementById("pagamento_importo_hint");
    if (tipo === "fisso") {
      label.textContent = "Importo fisso (€)";
      suffix.textContent = "€";
      hint.textContent = "Importo fisso che il cliente pagherà indipendentemente dal numero di coperti.";
    } else if (tipo === "persona") {
      label.textContent = "Importo per persona (€)";
      suffix.textContent = "€ / persona";
      hint.textContent = "Verrà moltiplicato per il numero di coperti indicato nel form.";
    } else {
      label.textContent = "Percentuale (%)";
      suffix.textContent = "%";
      hint.textContent = "Percentuale applicata al totale stimato (coperti × prezzo medio configurato).";
    }
  }

  document.getElementById("sorgente")?.addEventListener("change", function(){
    const rfInfo = document.getElementById('rfbook-info');
    if (rfInfo) rfInfo.style.display = this.value === 'rfbook' ? '' : 'none';
  });

  document.getElementById("nome").addEventListener("input", () => {
    if (!currentForm && tempFormId) {
      if (!document.getElementById("slug").value.trim()) {
        tempSlug = makeSlug(document.getElementById("nome").value || "form") + "-" + shortId();
      }
      renderDraftLink();
    }
  });

  document.getElementById("slug").addEventListener("input", () => {
    if (!currentForm && tempFormId) {
      renderDraftLink();
    } else if (currentForm) {
      renderExistingSlugPreview();
    }
  });

  document.getElementById("bg_color_picker").addEventListener("input", (event) => {
    document.getElementById("bg_color").value = event.target.value;
  });

  document.getElementById("bg_color").addEventListener("input", (event) => {
    const value = event.target.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      document.getElementById("bg_color_picker").value = value;
    }
  });

  await loadForms();

  function startNewForm() {
    currentForm = null;
    currentLink = null;
    tempFormId = crypto.randomUUID();
    tempSlug = makeSlug(document.getElementById("nome").value || "form") + "-" + shortId();

    document.getElementById("nome").value = "";
    document.getElementById("slug").value = "";
    document.getElementById("emoji").value = "";
    document.getElementById("attivo").checked = true;

    document.getElementById("logo_enabled").checked = true;
    document.getElementById("logo_url").value = "";
    document.getElementById("bg_color").value = "#f7f9fc";
    document.getElementById("bg_color_picker").value = "#f7f9fc";
    document.getElementById("bg_image").value = "";

    document.getElementById("title").value = "Prenota il tuo tavolo";
    document.getElementById("subtitle").value = "";

    document.getElementById("allergie").checked = false;
    document.getElementById("note").checked = true;

    document.getElementById("tags").value = "";
    document.getElementById("policy_enabled").checked = false;
    document.getElementById("policy_tipo").value = "booking";
    document.getElementById("policy_text").value = "";
    document.getElementById("consenso_privacy_testo").value = "";
    document.getElementById("consenso_privacy_link_enabled").checked = false;
    document.getElementById("consenso_privacy_link").value = "";
    document.getElementById("consenso_policy_testo").value = "";
    document.getElementById("consenso_marketing_enabled").checked = false;
    document.getElementById("consenso_marketing_testo").value = "";

    // Reset pagamento
    document.getElementById("pagamento_attivo").checked = false;
    document.getElementById("pagamento-editor-wrap").style.display = "none";
    document.getElementById("pagamento_tipo").value = "fisso";
    document.getElementById("pagamento_importo").value = "";
    document.getElementById("pagamento_label_btn").value = "Paga la caparra e conferma";
    document.getElementById("pagamento_descrizione").value = "";
    document.getElementById("pagamento_note").value = "";

    customFields = [];
    fasceOrarie = [
      { start: "19:00", end: "23:00", max_coperti: "" }
    ];

    renderGiorni([1, 2, 3, 4, 5, 6]);
    renderCustom();
    renderFasce();
    renderPreviews();

    document.getElementById("draft-status").innerText = "Nuovo form non salvato";
    document.getElementById("actions-box").innerHTML = "";
    document.getElementById("msg").innerText = "Bozza creata. Link e QR saranno attivi solo dopo il salvataggio.";

    renderDraftLink();
  }

  async function loadForms() {
    const { data, error } = await window.supabaseClient
      .from("booking_forms")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      document.getElementById("forms-list").innerHTML = `<div style="color:#dc2626;">Errore caricamento form</div>`;
      return;
    }

    if (!data || !data.length) {
      document.getElementById("forms-list").innerHTML = `<div style="color:#6b7280;">Nessun form creato</div>`;
      return;
    }

    document.getElementById("forms-list").innerHTML = data.map((f) => `
      <div style="
        border:1px solid #e5e7eb;
        background:#fff;
        padding:10px;
        margin:6px 0;
        border-radius:12px;
        cursor:pointer;
        display:flex;
        justify-content:space-between;
        gap:8px;
        align-items:center;
      " data-id="${escapeAttribute(f.id)}">
        <div>
          <div style="font-weight:600;">${escapeHtml(f.nome || "Form senza nome")}</div>
          <div style="font-size:11px;color:#6b7280;">${f.attivo === false ? "Disattivo" : "Attivo"}</div>
        </div>
        <div style="font-size:18px;">✏️</div>
      </div>
    `).join("");

    document.querySelectorAll("#forms-list [data-id]").forEach((el) => {
      el.onclick = () => loadForm(el.dataset.id);
    });
  }

  async function loadForm(id) {
    currentForm = id;
    currentLink = null;
    tempFormId = null;
    tempSlug = null;

    const { data: form, error: formError } = await window.supabaseClient
      .from("booking_forms")
      .select("*")
      .eq("id", id)
      .eq("azienda_id", aziendaId)
      .maybeSingle();

    if (formError || !form) {
      console.error(formError);
      document.getElementById("msg").innerText = "Errore caricamento form";
      return;
    }

    document.getElementById("actions-box").innerHTML = `
      <div style="display:flex;justify-content:flex-end;">
        <button id="delete-form" class="app-button" style="background:#dc2626;color:#fff;" type="button">
          🗑️ Elimina form
        </button>
      </div>
    `;

    document.getElementById("delete-form").onclick = deleteForm;

    const { data: version, error: versionError } = await window.supabaseClient
      .from("booking_form_versions")
      .select("*")
      .eq("form_id", id)
      .order("versione", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      console.error(versionError);
    }

    const config = version?.config || form.config || {};

    document.getElementById("nome").value = form.nome || "";
    document.getElementById("slug").value = "";
    document.getElementById('sorgente').value = form.sorgente || 'gestionale';
    const rfInfo = document.getElementById('rfbook-info');
    if (rfInfo) rfInfo.style.display = form.sorgente === 'rfbook' ? '' : 'none';
    document.getElementById("emoji").value = config.emoji || "";
    document.getElementById("attivo").checked = form.attivo !== false;

    document.getElementById("logo_enabled").checked = config.branding?.logo_enabled !== false;
    document.getElementById("logo_url").value = config.branding?.logo_url || "";
    document.getElementById("bg_color").value = config.branding?.background_color || "#f7f9fc";
    document.getElementById("bg_color_picker").value = config.branding?.background_color || "#f7f9fc";
    document.getElementById("bg_image").value = config.branding?.background_image || "";
    document.getElementById("cover_url").value = config.branding?.cover_url || "";
    // Preview cover
    const coverPreview = document.getElementById("cover-preview");
    if (config.branding?.cover_url && coverPreview) {
      coverPreview.innerHTML = `<img src="${config.branding.cover_url}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-top:4px;">`;
    }

    document.getElementById("title").value = config.text?.title || "";
    document.getElementById("subtitle").value = config.text?.subtitle || "";

    document.getElementById("allergie").checked = !!config.fields?.allergie;
    document.getElementById("note").checked = config.fields?.note !== false;

    document.getElementById("tags").value = Array.isArray(config.tags) ? config.tags.join(", ") : "";
    document.getElementById("policy_enabled").checked = !!config.policy?.enabled;
    document.getElementById("policy_tipo").value = config.policy?.tipo || "booking";
    document.getElementById("policy_text").value = config.policy?.text || "";

    // Consensi
    const c = config.consensi || {};
    document.getElementById("consenso_privacy_testo").value = c.privacy?.testo || "";
    document.getElementById("consenso_privacy_link_enabled").checked = !!c.privacy?.link_enabled;
    document.getElementById("consenso_privacy_link").value = c.privacy?.link || "";
    document.getElementById("consenso_policy_testo").value = c.policy?.testo || "";
    document.getElementById("consenso_marketing_enabled").checked = !!c.marketing?.enabled;
    document.getElementById("consenso_marketing_testo").value = c.marketing?.testo || "";

    customFields = Array.isArray(config.fields?.custom) ? config.fields.custom : [];
    fasceOrarie = Array.isArray(config.availability?.orari) ? config.availability.orari : [];

    // Pagamento
    const pag = config.pagamento || {};
    document.getElementById("pagamento_attivo").checked = !!pag.attivo;
    document.getElementById("pagamento-editor-wrap").style.display = pag.attivo ? "" : "none";
    document.getElementById("pagamento_tipo").value = pag.tipo || "fisso";
    document.getElementById("pagamento_importo").value = pag.importo != null ? pag.importo : "";
    document.getElementById("pagamento_label_btn").value = pag.label_btn || "Paga la caparra e conferma";
    document.getElementById("pagamento_descrizione").value = pag.descrizione || "";
    document.getElementById("pagamento_note").value = pag.note || "";
    aggiornaPagamentoUI();

    renderGiorni(config.availability?.giorni || [1, 2, 3, 4, 5, 6]);
    renderCustom();
    renderFasce();
    renderPreviews();

    document.getElementById("draft-status").innerText = "Form esistente";
    document.getElementById("msg").innerText = "";

    await loadLink();
  }

  function getDraftSlug() {
    const slugInput = document.getElementById("slug").value.trim();
    return slugInput ? makeSlug(slugInput) : tempSlug;
  }

  function renderDraftLink() {
    const finalSlug = getDraftSlug();
    const url = `${BASE_PUBLIC_URL}/#/booking/${finalSlug}`;

    document.getElementById("link-box").innerHTML = `
      <div style="margin-top:12px; padding:12px; background:#fef3c7; border-radius:12px; border:1px solid #fde68a;">
        <b>Preview link e QR</b><br>
        <div style="font-size:12px;color:#92400e;margin:4px 0 8px;">Attivo solo dopo salvataggio</div>

        <input class="input" value="${escapeAttribute(url)}" readonly>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <button type="button" class="app-button" id="copy-preview-link">Copia link</button>
          <a class="app-button" href="${qrUrl(url, 300)}" download="qr-booking.png" target="_blank">Scarica QR</a>
        </div>

        <div style="margin-top:10px;">
          <img src="${qrUrl(url, 180)}" style="width:180px;height:180px;border-radius:12px;background:#fff;">
        </div>
      </div>
    `;

    const copyBtn = document.getElementById("copy-preview-link");
    if (copyBtn) copyBtn.onclick = () => copyText(url);
  }

  function renderExistingSlugPreview() {
    if (!currentForm) return;

    const slugInput = document.getElementById("slug").value.trim();
    const slug = slugInput ? makeSlug(slugInput) : currentLink?.slug;

    if (!slug) return;

    const url = `${BASE_PUBLIC_URL}/#/booking/${slug}`;

    document.getElementById("link-box").innerHTML = `
      <div style="margin-top:12px; padding:12px; background:#eff6ff; border-radius:12px; border:1px solid #bfdbfe;">
        <b>Nuovo link dopo salvataggio</b><br>
        <div style="font-size:12px;color:#1d4ed8;margin:4px 0 8px;">La modifica dello slug sarà attiva dopo SALVA FORM</div>

        <input class="input" value="${escapeAttribute(url)}" readonly>

        <div style="margin-top:10px;">
          <img src="${qrUrl(url, 180)}" style="width:180px;height:180px;border-radius:12px;background:#fff;">
        </div>
      </div>
    `;
  }

  async function loadLink() {
    if (!currentForm) return;

    const { data: link, error } = await window.supabaseClient
      .from("booking_links")
      .select("*")
      .eq("form_id", currentForm)
      .eq("azienda_id", aziendaId)
      .maybeSingle();

    if (error) {
      console.error(error);
    }

    currentLink = link || null;

    if (!link) {
      document.getElementById("link-box").innerHTML = `
        <div style="margin-top:12px; padding:12px; background:#f3f4f6; border-radius:12px;">
          Nessun link generato. Salva il form per crearne uno.
        </div>
      `;
      return;
    }

    document.getElementById("slug").value = link.slug || "";

    const url = `${BASE_PUBLIC_URL}/#/booking/${link.slug}`;

    document.getElementById("link-box").innerHTML = `
      <div style="margin-top:12px; padding:12px; background:#ecfdf5; border-radius:12px; border:1px solid #bbf7d0;">
        <b>Link pubblico attivo</b><br>

        <input class="input" value="${escapeAttribute(url)}" readonly>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <button type="button" class="app-button" id="copy-live-link">Copia link</button>
          <button type="button" class="app-button" id="btn-download-qr">⬇️ Scarica QR</button>
          <a class="app-button primary" href="${escapeAttribute(url)}" target="_blank">Apri</a>
        </div>

        <div style="margin-top:10px;">
          <img id="qr-img-preview" src="${qrUrl(url, 300)}" style="width:180px;height:180px;border-radius:12px;background:#fff;" crossorigin="anonymous">
        </div>
      </div>
    `;

    const copyBtn = document.getElementById("copy-live-link");
    if (copyBtn) copyBtn.onclick = () => copyText(url);

    const dlBtn = document.getElementById("btn-download-qr");
    if (dlBtn) dlBtn.onclick = async () => {
      try {
        const qrSrc = qrUrl(url, 600);
        const resp = await fetch(qrSrc);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "qr-prenotazione.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch(e) {
        console.error("Errore download QR:", e);
        window.open(qrUrl(url, 600), "_blank");
      }
    };
  }

  function renderPalette() {
    const colors = ["#f7f9fc", "#ffffff", "#0E5A7A", "#111827", "#fef3c7", "#ecfdf5", "#fee2e2", "#eff6ff"];

    document.getElementById("palette").innerHTML = colors.map((color) => `
      <button type="button" data-color="${color}" style="
        width:34px;
        height:34px;
        border-radius:10px;
        border:1px solid #d1d5db;
        background:${color};
        cursor:pointer;
      "></button>
    `).join("");

    document.querySelectorAll("#palette [data-color]").forEach((btn) => {
      btn.onclick = () => {
        document.getElementById("bg_color").value = btn.dataset.color;
        document.getElementById("bg_color_picker").value = btn.dataset.color;
      };
    });
  }

  function renderGiorni(selectedDays) {
    const labels = [
      { id: 1, label: "Lun" },
      { id: 2, label: "Mar" },
      { id: 3, label: "Mer" },
      { id: 4, label: "Gio" },
      { id: 5, label: "Ven" },
      { id: 6, label: "Sab" },
      { id: 7, label: "Dom" }
    ];

    document.getElementById("giorni-box").innerHTML = labels.map((day) => `
      <label style="
        border:1px solid #e5e7eb;
        border-radius:10px;
        padding:8px 10px;
        background:#fff;
        display:flex;
        gap:6px;
        align-items:center;
      ">
        <input type="checkbox" class="giorno-check" value="${day.id}" ${selectedDays.includes(day.id) ? "checked" : ""}>
        ${day.label}
      </label>
    `).join("");
  }

  function addCustomField() {
    customFields.push({
      id: crypto.randomUUID(),
      label: "",
      type: "text",
      required: false,
      taggable: false,
      tag_prefix: "",
      options: []
    });

    renderCustom();
  }

  function renderCustom() {
    const list = document.getElementById("custom-list");

    if (!customFields.length) {
      list.innerHTML = `<div style="font-size:12px;color:#6b7280;">Nessun campo custom</div>`;
      return;
    }

    list.innerHTML = customFields.map((field, index) => `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin:8px 0;background:#fff;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
          <b>Campo ${index + 1}</b>
          <button type="button" class="remove-custom app-button" data-i="${index}">Elimina</button>
        </div>

        <label style="display:block;margin-top:8px;font-size:12px;font-weight:600;">Domanda / label</label>
        <input class="input cf-label" data-i="${index}" value="${escapeAttribute(field.label || "")}" placeholder="Es. Preferisci tavolo esterno?">

        <label style="display:block;margin-top:8px;font-size:12px;font-weight:600;">Tipo risposta</label>
        <select class="input cf-type" data-i="${index}">
          <option value="text" ${field.type === "text" ? "selected" : ""}>Testo libero</option>
          <option value="textarea" ${field.type === "textarea" ? "selected" : ""}>Testo lungo</option>
          <option value="checkbox" ${field.type === "checkbox" ? "selected" : ""}>Checkbox sì/no</option>
          <option value="select" ${field.type === "select" ? "selected" : ""}>Scelta singola</option>
          <option value="radio" ${field.type === "radio" ? "selected" : ""}>Radio</option>
        </select>

        <label style="display:block;margin-top:8px;font-size:12px;font-weight:600;">Opzioni risposta</label>
        <input class="input cf-options" data-i="${index}" value="${escapeAttribute((field.options || []).join(", "))}" placeholder="Solo per select/radio: sì, no, forse">

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
          <label><input type="checkbox" class="cf-required" data-i="${index}" ${field.required ? "checked" : ""}> Obbligatorio</label>
          <label><input type="checkbox" class="cf-taggable" data-i="${index}" ${field.taggable ? "checked" : ""}> Risposta taggabile</label>
        </div>

        <label style="display:block;margin-top:8px;font-size:12px;font-weight:600;">Prefisso tag</label>
        <input class="input cf-tag-prefix" data-i="${index}" value="${escapeAttribute(field.tag_prefix || "")}" placeholder="Es. preferenza, allergia, evento">
      </div>
    `).join("");

    document.querySelectorAll(".remove-custom").forEach((btn) => {
      btn.onclick = () => {
        customFields.splice(Number(btn.dataset.i), 1);
        renderCustom();
      };
    });

    bindCustomInputs();
  }

  function bindCustomInputs() {
    document.querySelectorAll(".cf-label").forEach((el) => {
      el.oninput = () => {
        customFields[Number(el.dataset.i)].label = el.value;
      };
    });

    document.querySelectorAll(".cf-type").forEach((el) => {
      el.onchange = () => {
        customFields[Number(el.dataset.i)].type = el.value;
      };
    });

    document.querySelectorAll(".cf-options").forEach((el) => {
      el.oninput = () => {
        customFields[Number(el.dataset.i)].options = el.value
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      };
    });

    document.querySelectorAll(".cf-required").forEach((el) => {
      el.onchange = () => {
        customFields[Number(el.dataset.i)].required = el.checked;
      };
    });

    document.querySelectorAll(".cf-taggable").forEach((el) => {
      el.onchange = () => {
        customFields[Number(el.dataset.i)].taggable = el.checked;
      };
    });

    document.querySelectorAll(".cf-tag-prefix").forEach((el) => {
      el.oninput = () => {
        customFields[Number(el.dataset.i)].tag_prefix = el.value;
      };
    });
  }

  function addFascia() {
    fasceOrarie.push({ start: "", end: "", max_coperti: "" });
    renderFasce();
  }

  function renderFasce() {
    const list = document.getElementById("fasce-list");

    if (!fasceOrarie.length) {
      list.innerHTML = `<div style="font-size:12px;color:#6b7280;">Nessuna fascia inserita</div>`;
      return;
    }

    list.innerHTML = fasceOrarie.map((slot, index) => `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin:8px 0;background:#fff;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
          <b>Fascia ${index + 1}</b>
          <button type="button" class="remove-fascia app-button" data-i="${index}">Elimina</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px;">
          <div>
            <label style="font-size:12px;font-weight:600;">Da</label>
            <input type="time" class="input fascia-start" data-i="${index}" value="${escapeAttribute(slot.start || "")}">
          </div>

          <div>
            <label style="font-size:12px;font-weight:600;">A</label>
            <input type="time" class="input fascia-end" data-i="${index}" value="${escapeAttribute(slot.end || "")}">
          </div>

          <div>
            <label style="font-size:12px;font-weight:600;">Max coperti</label>
            <input type="number" class="input fascia-max" data-i="${index}" value="${escapeAttribute(slot.max_coperti || "")}" placeholder="opz.">
          </div>
        </div>
      </div>
    `).join("");

    document.querySelectorAll(".remove-fascia").forEach((btn) => {
      btn.onclick = () => {
        fasceOrarie.splice(Number(btn.dataset.i), 1);
        renderFasce();
      };
    });

    bindFasceInputs();
  }

  function bindFasceInputs() {
    document.querySelectorAll(".fascia-start").forEach((el) => {
      el.oninput = () => {
        fasceOrarie[Number(el.dataset.i)].start = el.value;
      };
    });

    document.querySelectorAll(".fascia-end").forEach((el) => {
      el.oninput = () => {
        fasceOrarie[Number(el.dataset.i)].end = el.value;
      };
    });

    document.querySelectorAll(".fascia-max").forEach((el) => {
      el.oninput = () => {
        fasceOrarie[Number(el.dataset.i)].max_coperti = el.value;
      };
    });
  }

  async function uploadLogo() {
    const file = document.getElementById("logo_file").files?.[0];

    if (!file) {
      alert("Seleziona un file logo");
      return;
    }

    const url = await uploadImage(file, "booking-logo");

    if (!url) return;

    document.getElementById("logo_url").value = url;
    renderPreviews();
  }

  async function uploadBackground() {
    const file = document.getElementById("bg_file").files?.[0];

    if (!file) {
      alert("Seleziona un file sfondo");
      return;
    }

    const url = await uploadImage(file, "booking-bg");

    if (!url) return;

    document.getElementById("bg_image").value = url;
    renderPreviews();
  }

  async function uploadCover() {
    const file = document.getElementById("cover_file").files?.[0];

    if (!file) {
      alert("Seleziona un file cover");
      return;
    }

    const url = await uploadImage(file, "booking-cover");

    if (!url) return;

    document.getElementById("cover_url").value = url;
    const preview = document.getElementById("cover-preview");
    if (preview) preview.innerHTML = `<img src="${url}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-top:4px;">`;
  }

  async function uploadImage(file, prefix) {
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      alert("Formato non valido. Usa PNG o JPG.");
      return null;
    }

    const ext = file.name.split(".").pop() || "png";
    const safeName = `${prefix}/${aziendaId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error } = await window.supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(safeName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) {
      console.error(error);
      alert("Errore upload file");
      return null;
    }

    const { data } = window.supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(safeName);

    return data?.publicUrl || null;
  }

  function renderPreviews() {
    const logoUrl = document.getElementById("logo_url").value;
    const bgUrl = document.getElementById("bg_image").value;

    document.getElementById("logo-preview").innerHTML = logoUrl
      ? `<img src="${escapeAttribute(logoUrl)}" style="max-height:80px;max-width:220px;object-fit:contain;border:1px solid #e5e7eb;border-radius:10px;padding:6px;background:#fff;">`
      : "";

    document.getElementById("bg-preview").innerHTML = bgUrl
      ? `<div style="height:90px;border-radius:12px;background:url('${escapeAttribute(bgUrl)}') center/cover;border:1px solid #e5e7eb;"></div>`
      : "";
  }

  async function saveForm() {
    const nome = document.getElementById("nome").value.trim();

    if (!nome) {
      alert("Inserisci il nome del form");
      return;
    }

    if (!currentForm && !tempFormId) {
      tempFormId = crypto.randomUUID();
    }

    if (!currentForm && !tempSlug) {
      tempSlug = makeSlug(nome) + "-" + shortId();
      renderDraftLink();
    }

    const slugInput = document.getElementById("slug").value.trim();
    const finalSlug = slugInput ? makeSlug(slugInput) : makeSlug(nome);

    if (!finalSlug) {
      alert("Slug non valido");
      return;
    }

    const { data: existingSlug, error: slugError } = await window.supabaseClient
      .from("booking_links")
      .select("form_id")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (slugError) {
      console.error(slugError);
      alert("Errore controllo slug");
      return;
    }

    if (existingSlug && String(existingSlug.form_id) !== String(currentForm || tempFormId)) {
      alert("Slug già esistente. Scegli un altro link.");
      return;
    }

    const sorgente = document.getElementById('sorgente')?.value || 'gestionale';
    const config = collectConfig();
    const finalId = currentForm || tempFormId;

    if (!currentForm) {
      const { data: form, error } = await window.supabaseClient
        .from("booking_forms")
        .insert([{
          id: finalId,
          azienda_id: aziendaId,
          sede_id: sedeId,
          nome,
          sorgente,
          rfbook_attivo: sorgente === 'rfbook',
          attivo: document.getElementById("attivo").checked,
          config
        }])
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Errore creazione form");
        return;
      }

      currentForm = form.id;
    } else {
      const { error } = await window.supabaseClient
        .from("booking_forms")
        .update({
          nome,
          sorgente,
          rfbook_attivo: sorgente === 'rfbook',
          attivo: document.getElementById("attivo").checked,
          config
        })
        .eq("id", currentForm)
        .eq("azienda_id", aziendaId);

      if (error) {
        console.error(error);
        alert("Errore aggiornamento form");
        return;
      }
    }

    const { data: existingLinks, error: checkError } = await window.supabaseClient
      .from("booking_links")
      .select("*")
      .eq("form_id", currentForm)
      .eq("azienda_id", aziendaId);

    if (checkError) {
      console.error("Errore check link", checkError);
      alert("Errore verifica link");
      return;
    }

    if (!existingLinks || existingLinks.length === 0) {
      const { error: insertError } = await window.supabaseClient
        .from("booking_links")
        .insert([{
          form_id: currentForm,
          slug: finalSlug,
          azienda_id: aziendaId,
          attivo: true
        }]);

      if (insertError) {
        console.error("Errore insert link", insertError);
        alert("Errore creazione link");
        return;
      }
    } else {
      const { error: updateError } = await window.supabaseClient
        .from("booking_links")
        .update({
          slug: finalSlug,
          attivo: true
        })
        .eq("form_id", currentForm)
        .eq("azienda_id", aziendaId);

      if (updateError) {
        console.error("Errore update link", updateError);
        alert("Errore aggiornamento link");
        return;
      }
    }

    tempFormId = null;
    tempSlug = null;

    document.getElementById("draft-status").innerText = "Form salvato";
    document.getElementById("msg").innerText = "✅ Form salvato";

    await loadForms();
    await loadLink();
  }

  function collectConfig() {
    const giorni = Array.from(document.querySelectorAll(".giorno-check:checked"))
      .map((el) => Number(el.value));

    if (!giorni.length) {
      alert("Seleziona almeno un giorno prenotabile");
    }

    const cleanFasce = fasceOrarie
      .map((slot) => ({
        start: slot.start || "",
        end: slot.end || "",
        max_coperti: slot.max_coperti ? Number(slot.max_coperti) : null
      }))
      .filter((slot) => {
        if (!slot.start || !slot.end) return false;

        if (slot.start >= slot.end) {
          alert("Errore fascia oraria: ora fine deve essere maggiore dell'ora inizio");
          return false;
        }

        return true;
      });

    if (!cleanFasce.length) {
      alert("Inserisci almeno una fascia oraria valida");
    }

    const cleanCustom = customFields
      .map((field) => ({
        id: field.id || crypto.randomUUID(),
        label: field.label || "",
        type: field.type || "text",
        required: !!field.required,
        taggable: !!field.taggable,
        tag_prefix: field.tag_prefix || "",
        options: Array.isArray(field.options) ? field.options : []
      }))
      .filter((field) => field.label);

    return {
      branding: {
        logo_enabled: document.getElementById("logo_enabled").checked,
        logo_url: document.getElementById("logo_url").value || null,
        background_color: document.getElementById("bg_color").value || "#f7f9fc",
        background_image: document.getElementById("bg_image").value || null,
        cover_url: document.getElementById("cover_url").value || null
      },
      text: {
        title: document.getElementById("title").value || "Prenota il tuo tavolo",
        subtitle: document.getElementById("subtitle").value || ""
      },
      fields: {
        allergie: document.getElementById("allergie").checked,
        note: document.getElementById("note").checked,
        custom: cleanCustom
      },
      availability: {
        giorni,
        orari: cleanFasce
      },
      tags: document.getElementById("tags").value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      policy: {
        enabled: document.getElementById("policy_enabled").checked,
        tipo: document.getElementById("policy_tipo").value || "booking",
        text: document.getElementById("policy_text").value || ""
      },
      consensi: {
        privacy: {
          testo: document.getElementById("consenso_privacy_testo").value.trim() ||
            "Ho letto e accetto l'informativa sul trattamento dei dati personali ai sensi del GDPR (Reg. UE 2016/679).",
          link_enabled: document.getElementById("consenso_privacy_link_enabled").checked,
          link: document.getElementById("consenso_privacy_link").value.trim() || ""
        },
        policy: {
          testo: document.getElementById("consenso_policy_testo").value.trim() ||
            "Ho letto e accetto le condizioni di prenotazione."
        },
        marketing: {
          enabled: document.getElementById("consenso_marketing_enabled").checked,
          testo: document.getElementById("consenso_marketing_testo").value.trim() ||
            "Acconsento a ricevere comunicazioni promozionali via WhatsApp e email."
        }
      },
      emoji: document.getElementById("emoji").value || "",
      pagamento: {
        attivo: document.getElementById("pagamento_attivo").checked,
        tipo: document.getElementById("pagamento_tipo").value || "fisso",
        importo: parseFloat(document.getElementById("pagamento_importo").value) || 0,
        label_btn: document.getElementById("pagamento_label_btn").value.trim() || "Paga la caparra e conferma",
        descrizione: document.getElementById("pagamento_descrizione").value.trim() || "",
        note: document.getElementById("pagamento_note").value.trim() || ""
      }
    };
  }

  function qrUrl(url, size) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
  }

  function makeSlug(value) {
    return String(value || "form")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "form";
  }

  function shortId() {
    return Date.now().toString(36);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      document.getElementById("msg").innerText = "Link copiato";
    } catch (e) {
      console.warn(e);
      alert(value);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  async function deleteForm() {
    if (!currentForm) return;

    const conferma = confirm("⚠️ Eliminare questo form? Operazione irreversibile.");

    if (!conferma) return;

    const formIdToDelete = currentForm;

    try {
      const { error: linkError } = await window.supabaseClient
        .from("booking_links")
        .delete()
        .eq("form_id", formIdToDelete)
        .eq("azienda_id", aziendaId);

      if (linkError) {
        console.error(linkError);
        alert("Errore eliminazione link");
        return;
      }

      const { error: versionError } = await window.supabaseClient
        .from("booking_form_versions")
        .delete()
        .eq("form_id", formIdToDelete);

      if (versionError) {
        console.error(versionError);
        alert("Errore eliminazione versioni");
        return;
      }

      const { data: deletedForms, error: formError } = await window.supabaseClient
        .from("booking_forms")
        .delete()
        .eq("id", formIdToDelete)
        .eq("azienda_id", aziendaId)
        .select("id");

      if (formError) {
        console.error(formError);
        alert("Errore eliminazione form");
        return;
      }

      if (!deletedForms || !deletedForms.length) {
        alert("Nessun form eliminato. Controlla RLS Supabase o azienda_id.");
        return;
      }

      currentForm = null;
      tempFormId = null;
      tempSlug = null;
      currentLink = null;

      document.getElementById("nome").value = "";
      document.getElementById("slug").value = "";
      document.getElementById("emoji").value = "";

      document.getElementById("actions-box").innerHTML = "";
      document.getElementById("link-box").innerHTML = "";
      document.getElementById("draft-status").innerText = "";
      document.getElementById("msg").innerText = "Form eliminato";

      await loadForms();
    } catch (e) {
      console.error(e);
      alert("Errore eliminazione");
    }
  }
}
