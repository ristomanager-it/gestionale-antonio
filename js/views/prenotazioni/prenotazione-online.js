export async function render(container) {
  document.querySelector(".app-header")?.style.setProperty("display", "none");
  document.querySelector(".topbar-global")?.style.setProperty("display", "none");

  const params = new URLSearchParams(window.location.search);

  let formId = params.get("form_id");
  let aziendaId = params.get("azienda");
  let sedeId = params.get("sede");

  const source = params.get("src") || "web";
  const tagParam = params.get("tag") || "🌐";
  const ref = params.get("ref") || null;

  let form = null;
  let version = null;
  let config = null;

  const hash = window.location.hash;
  const slug = hash.split("/booking/")[1]?.split("?")[0];

  if (!formId && slug) {
    const { data: link, error: linkError } = await window.supabaseClient
      .from("booking_links")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (linkError) {
      console.error("Errore booking_links:", linkError);
    }

    if (link) {
      formId = link.form_id;
      aziendaId = aziendaId || link.azienda_id;
      sedeId = sedeId || link.sede_id;
    }
  }

  if (formId) {
    const { data: formData, error: formError } = await window.supabaseClient
      .from("booking_forms")
      .select("*")
      .eq("id", formId)
      .eq("attivo", true)
      .maybeSingle();

    if (formError) {
      console.error("Errore caricamento form:", formError);
      container.innerHTML = `<div class="page">Errore caricamento form</div>`;
      return;
    }

    if (!formData) {
      container.innerHTML = `<div class="page">Form non trovato o non attivo</div>`;
      return;
    }

    form = formData;

    aziendaId = aziendaId || form.azienda_id;
    sedeId = sedeId || form.sede_id;

    const { data: versionData, error: versionError } = await window.supabaseClient
      .from("booking_form_versions")
      .select("*")
      .eq("form_id", form.id)
      .order("versione", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      console.error("Errore caricamento versione form:", versionError);
    }

    version = versionData || null;
    config = version?.config || form.config || {};
  }

  if (!aziendaId) {
    console.error("ERRORE: aziendaId mancante", { slug, formId });
    container.innerHTML = `<div class="page">Errore: link non valido</div>`;
    return;
  }

  console.log("BOOKING DEBUG:", {
    slug,
    formId,
    aziendaId,
    sedeId
  });

  const defaultConfig = {
    branding: {
      logo_enabled: true,
      logo_url: null,
      background_color: "#f7f9fc",
      background_image: null
    },
    text: {
      title: "Prenota il tuo tavolo",
      subtitle: ""
    },
    fields: {
      allergie: false,
      note: true,
      custom: []
    },
    availability: {
      giorni: [1, 2, 3, 4, 5, 6],
      orari: [
        { start: "19:00", end: "23:00" }
      ]
    },
    tags: [],
    policy: {
      enabled: false,
      text: ""
    }
  };

  config = mergeConfig(defaultConfig, config || {});

  let logo = null;
  let nomeAzienda = "Prenotazione";

  try {
    if (sedeId) {
      const { data: sede } = await window.supabaseClient
        .from("sedi")
        .select("*")
        .eq("id", sedeId)
        .maybeSingle();

      if (sede) {
        nomeAzienda = sede.nome || nomeAzienda;

        if (sede.logo_url) {
          logo = sede.logo_url;
        }
      }
    }

    const { data: azienda } = await window.supabaseClient
      .from("aziende")
      .select("*")
      .eq("id", aziendaId)
      .maybeSingle();

    if (azienda) {
      if (nomeAzienda === "Prenotazione") {
        nomeAzienda = azienda.nome || nomeAzienda;
      }

      if (!logo && azienda.logo_url) {
        logo = azienda.logo_url;
      }
    }
  } catch (e) {
    console.warn("Errore caricamento branding:", e);
  }

  if (config.branding?.logo_url) {
    logo = config.branding.logo_url;
  }

  if (!logo) {
    logo = "https://dummyimage.com/150x60/cccccc/000000&text=Logo";
  }

  const lang = navigator.language.startsWith("it") ? "it" : "en";

  const t = {
    it: {
      titolo: "Prenota il tuo tavolo",
      nome: "Nome",
      cognome: "Cognome",
      telefono: "Telefono",
      data: "Data",
      ora: "Ora",
      coperti: "Coperti",
      note: "Note",
      allergie: "Allergie o intolleranze",
      invia: "Invia richiesta",
      errore: "Compila i campi obbligatori",
      ok: "✅ Richiesta inviata",
      policyTitle: "Policy prenotazione",
      policyAccept: "Ho letto e accetto la booking policy",
      policyRequired: "Devi accettare la booking policy per inviare la richiesta",
      conferma: "Conferma invio",
      annulla: "Annulla",
      giornoNonDisponibile: "Il giorno selezionato non è prenotabile",
      oraNonDisponibile: "L'orario selezionato non è prenotabile"
    },
    en: {
      titolo: "Book your table",
      nome: "Name",
      cognome: "Surname",
      telefono: "Phone",
      data: "Date",
      ora: "Time",
      coperti: "Guests",
      note: "Notes",
      allergie: "Allergies or intolerances",
      invia: "Send request",
      errore: "Fill required fields",
      ok: "✅ Request sent",
      policyTitle: "Booking policy",
      policyAccept: "I have read and accept the booking policy",
      policyRequired: "You must accept the booking policy before sending the request",
      conferma: "Confirm",
      annulla: "Cancel",
      giornoNonDisponibile: "The selected day is not bookable",
      oraNonDisponibile: "The selected time is not bookable"
    }
  };

  const defaultPrefix = lang === "it" ? "+39" : "+44";

  const title = config.text?.title || t[lang].titolo;
  const subtitle = config.text?.subtitle || "";
  const backgroundColor = config.branding?.background_color || "#f7f9fc";
  const backgroundImage = config.branding?.background_image || null;
  const logoEnabled = config.branding?.logo_enabled !== false;

  const customFields = Array.isArray(config.fields?.custom) ? config.fields.custom : [];
  const tags = Array.isArray(config.tags) ? config.tags : [];

  const backgroundStyle = backgroundImage
    ? `background:${backgroundColor} url('${escapeAttribute(backgroundImage)}') center/cover no-repeat;`
    : `background:${backgroundColor};`;

  container.innerHTML = `
  <div style="
    min-height:100vh;
    display:flex;
    flex-direction:column;
    ${backgroundStyle}
    overflow-y:auto;
  ">

    <div style="
      padding:20px 16px 10px;
      text-align:center;
    ">
      ${logoEnabled ? `
        <img src="${escapeAttribute(logo)}" style="height:100px; object-fit:contain; margin-bottom:12px;">
      ` : ""}

      <div style="font-weight:700; font-size:18px; color:#111;">
        ${escapeHtml(nomeAzienda)}
      </div>
    </div>

    <div style="
      flex:1;
      padding:16px 16px 28px;
      max-width:480px;
      margin:0 auto;
      width:100%;
    ">

      <div style="
        background:#fff;
        border-radius:18px;
        padding:20px;
        box-shadow:0 4px 14px rgba(0,0,0,0.08);
      ">

        <h2 style="text-align:center;margin:0 0 8px;">
          ${escapeHtml(title)}
        </h2>

        ${subtitle ? `
          <p style="text-align:center;margin:0 0 16px;color:#6b7280;font-size:13px;">
            ${escapeHtml(subtitle)}
          </p>
        ` : ""}

        <div style="display:flex; flex-direction:column; gap:10px;">

          <input id="nome" class="input" placeholder="${escapeAttribute(t[lang].nome)}">
          <input id="cognome" class="input" placeholder="${escapeAttribute(t[lang].cognome)}">

          <div style="display:flex; gap:6px;">
            <select id="prefisso" class="input" style="max-width:110px;">
              <option value="+39">🇮🇹 +39</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+34">🇪🇸 +34</option>
            </select>

            <input id="telefono" class="input" placeholder="${escapeAttribute(t[lang].telefono)}">
          </div>

          <input type="date" id="data" class="input">
          <select id="ora" class="input">
            <option value="">-- Seleziona orario --</option>
          </select>
          <div id="slot-avviso" style="display:none;font-size:12px;color:#dc2626;padding:4px 0;">⚠️ Orario non disponibile</div>
          <input type="number" id="coperti" class="input" value="2" min="1">

          ${config.fields?.allergie ? `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <input type="checkbox" id="allergie">
              ${escapeHtml(t[lang].allergie)}
            </label>
          ` : ""}

          ${config.fields?.note ? `
            <textarea id="note_cliente" class="input" rows="3" placeholder="${escapeAttribute(t[lang].note)}"></textarea>
          ` : ""}

          ${customFields.map(renderCustomField).join("")}

          <button id="btn-invia" class="app-button primary login-btn">
            ${escapeHtml(t[lang].invia)}
          </button>

          <div id="msg" class="form-result"></div>

        </div>

      </div>
    </div>

    ${renderPolicyModal()}
  </div>
  `;

  document.getElementById("data").value = new Date().toISOString().split("T")[0];
  document.getElementById("prefisso").value = defaultPrefix;

  // Carica slot configurati
  const { data: slotCfg } = await window.supabaseClient
    .from("prenotazioni_slot_config")
    .select("*")
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  const slotMinuti = slotCfg?.slot_minuti || 30;
  const maxCoperti = slotCfg?.max_coperti_slot || 30;
  const orariBase = slotCfg?.orari || ["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00","21:30"];

  async function aggiornaSlot() {
    const data = document.getElementById("data").value;
    const coperti = parseInt(document.getElementById("coperti").value) || 2;
    const selectOra = document.getElementById("ora");
    const valPrecedente = selectOra.value;

    if (!data) return;

    // Per ogni slot calcola coperti occupati
    const oraFine = (ora) => {
      const d = new Date(`${data}T${ora}`);
      d.setMinutes(d.getMinutes() + slotMinuti);
      return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    };

    const { data: prenSlot } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("ora, coperti")
      .eq("azienda_id", aziendaId)
      .eq("data", data)
      .in("stato", ["nuova","confermata","arrivata"]);

    selectOra.innerHTML = `<option value="">-- Seleziona orario --</option>`;

    for (const slot of orariBase) {
      const fine = oraFine(slot);
      const occupati = (prenSlot || [])
        .filter(p => p.ora >= slot && p.ora < fine)
        .reduce((s, p) => s + (Number(p.coperti) || 0), 0);
      const liberi = maxCoperti - occupati;
      const disponibile = liberi >= coperti;

      const opt = document.createElement("option");
      opt.value = slot;
      if (disponibile) {
        opt.textContent = `${slot} — ${liberi} posti liberi`;
        opt.style.color = "#111827";
      } else {
        opt.textContent = `${slot} — Non disponibile`;
        opt.disabled = true;
        opt.style.color = "#9ca3af";
      }
      selectOra.appendChild(opt);
    }

    // Ripristina selezione precedente se ancora disponibile
    if (valPrecedente) selectOra.value = valPrecedente;
  }

  document.getElementById("data").addEventListener("change", aggiornaSlot);
  document.getElementById("coperti").addEventListener("change", aggiornaSlot);
  aggiornaSlot();

  const btnInvia = document.getElementById("btn-invia");
  const policyModal = document.getElementById("policy-modal");
  const btnPolicyCancel = document.getElementById("policy-cancel");
  const btnPolicyConfirm = document.getElementById("policy-confirm");

  btnInvia.onclick = async () => {
    const validation = validateBooking();

    if (!validation.ok) {
      showMessage(validation.message, true);
      return;
    }

    if (config.policy?.enabled) {
      policyModal.style.display = "flex";
      return;
    }

    await submitBooking();
  };

  if (btnPolicyCancel) {
    btnPolicyCancel.onclick = () => {
      policyModal.style.display = "none";
    };
  }

  if (btnPolicyConfirm) {
    btnPolicyConfirm.onclick = async () => {
      const accepted = document.getElementById("policy_accept")?.checked;

      if (!accepted) {
        showMessage(t[lang].policyRequired, true);
        return;
      }

      policyModal.style.display = "none";
      await submitBooking();
    };
  }

  async function submitBooking() {
    const msg = document.getElementById("msg");
    const btn = document.getElementById("btn-invia");

    const nome = document.getElementById("nome").value.trim();
    const cognome = document.getElementById("cognome").value.trim();

    const prefisso = document.getElementById("prefisso").value;
    const telefonoRaw = document.getElementById("telefono").value.trim();
    const telefono = (prefisso + telefonoRaw).replace(/[^\d+]/g, "");

    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;
    const coperti = Number(document.getElementById("coperti").value);

    const noteCliente = document.getElementById("note_cliente")?.value?.trim() || "";
    const allergie = document.getElementById("allergie")?.checked || false;
    const customValues = collectCustomValues();

    const riferimentoPayload = {
      ref,
      note_cliente: noteCliente,
      allergie,
      custom: customValues,
      policy_accepted: !!config.policy?.enabled,
      form_name: form?.nome || null,
      form_version: version?.versione || null
    };

    const finalTag = [
      tagParam,
      ...tags
    ].filter(Boolean).join(",");

    btn.disabled = true;
    btn.textContent = "...";

    const { error } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .insert([{
        azienda_id: aziendaId,
        sede_id: sedeId,
        form_id: form?.id || formId || null,
        form_version_id: version?.id || null,

        cliente_nome: `${nome} ${cognome}`.trim(),
        cliente_telefono: telefono,
        data,
        ora,
        coperti,

        stato: "in_attesa",
        canale: "online",

        source,
        riferimento: JSON.stringify(riferimentoPayload),
        tag: finalTag
      }]);

    btn.disabled = false;
    btn.textContent = t[lang].invia;

    if (error) {
      console.error(error);
      msg.innerHTML = `<span class="error-text">${escapeHtml(error.message)}</span>`;
      return;
    }

    msg.innerHTML = `<span class="success-text">${escapeHtml(t[lang].ok)}</span>`;

    clearFormAfterSuccess();
  }

  function validateBooking() {
    const nome = document.getElementById("nome").value.trim();
    const telefonoRaw = document.getElementById("telefono").value.trim();
    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;

    if (!nome || !telefonoRaw || !data || !ora) {
      return { ok: false, message: t[lang].errore };
    }

    if (!isDayBookable(data)) {
      return { ok: false, message: t[lang].giornoNonDisponibile };
    }

    if (!isTimeBookable(ora)) {
      return { ok: false, message: t[lang].oraNonDisponibile };
    }

    for (const field of customFields) {
      if (!field.required) continue;

      const id = getCustomFieldId(field);
      const el = document.getElementById(id);

      if (!el) continue;

      if (field.type === "checkbox") {
        if (!el.checked) {
          return { ok: false, message: `Campo obbligatorio: ${field.label}` };
        }
      } else if (!String(el.value || "").trim()) {
        return { ok: false, message: `Campo obbligatorio: ${field.label}` };
      }
    }

    return { ok: true };
  }

  function isDayBookable(dateString) {
    const giorni = config.availability?.giorni;

    if (!Array.isArray(giorni) || !giorni.length) {
      return true;
    }

    const d = new Date(dateString + "T00:00:00");
    const jsDay = d.getDay();
    const mapped = jsDay === 0 ? 7 : jsDay;

    return giorni.includes(mapped);
  }

  function isTimeBookable(timeString) {
    const orari = config.availability?.orari;

    if (!Array.isArray(orari) || !orari.length) {
      return true;
    }

    return orari.some((slot) => {
      if (!slot.start || !slot.end) return false;
      return timeString >= slot.start && timeString <= slot.end;
    });
  }

  function renderCustomField(field, index) {
    const id = getCustomFieldId(field, index);
    const label = field.label || `Campo ${index + 1}`;
    const type = field.type || "text";
    const required = field.required ? "data-required='true'" : "";

    if (type === "checkbox") {
      return `
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
          <input type="checkbox" id="${escapeAttribute(id)}" data-custom-field="true" data-label="${escapeAttribute(label)}" ${required}>
          ${escapeHtml(label)}
        </label>
      `;
    }

    if (type === "select" && Array.isArray(field.options)) {
      return `
        <select id="${escapeAttribute(id)}" class="input" data-custom-field="true" data-label="${escapeAttribute(label)}" ${required}>
          <option value="">${escapeHtml(label)}</option>
          ${field.options.map((opt) => `<option value="${escapeAttribute(opt)}">${escapeHtml(opt)}</option>`).join("")}
        </select>
      `;
    }

    return `
      <input id="${escapeAttribute(id)}" class="input" data-custom-field="true" data-label="${escapeAttribute(label)}" placeholder="${escapeAttribute(label)}" ${required}>
    `;
  }

  function collectCustomValues() {
    const result = [];

    document.querySelectorAll("[data-custom-field='true']").forEach((el) => {
      const label = el.dataset.label || el.id;

      if (el.type === "checkbox") {
        result.push({
          label,
          type: "checkbox",
          value: el.checked
        });
      } else {
        result.push({
          label,
          type: el.tagName.toLowerCase() === "select" ? "select" : "text",
          value: el.value
        });
      }
    });

    return result;
  }

  function getCustomFieldId(field, index = 0) {
    const base = field.id || field.label || `custom_${index}`;
    return "custom_" + String(base)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function renderPolicyModal() {
    if (!config.policy?.enabled) {
      return "";
    }

    return `
      <div id="policy-modal" style="
        display:none;
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.45);
        z-index:9999;
        align-items:center;
        justify-content:center;
        padding:16px;
      ">
        <div style="
          width:100%;
          max-width:460px;
          max-height:80vh;
          overflow-y:auto;
          background:#fff;
          border-radius:18px;
          padding:18px;
          box-shadow:0 20px 40px rgba(0,0,0,0.25);
        ">
          <h3 style="margin:0 0 10px;">${escapeHtml(t[lang].policyTitle)}</h3>

          <div style="
            font-size:13px;
            line-height:1.5;
            color:#374151;
            white-space:pre-wrap;
            margin-bottom:14px;
          ">${escapeHtml(config.policy.text || "")}</div>

          <label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;margin-bottom:14px;">
            <input type="checkbox" id="policy_accept" style="margin-top:3px;">
            <span>${escapeHtml(t[lang].policyAccept)}</span>
          </label>

          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" id="policy-cancel" class="app-button">
              ${escapeHtml(t[lang].annulla)}
            </button>
            <button type="button" id="policy-confirm" class="app-button primary">
              ${escapeHtml(t[lang].conferma)}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function clearFormAfterSuccess() {
    document.getElementById("nome").value = "";
    document.getElementById("cognome").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("coperti").value = "2";

    const note = document.getElementById("note_cliente");
    if (note) note.value = "";

    const allergie = document.getElementById("allergie");
    if (allergie) allergie.checked = false;

    document.querySelectorAll("[data-custom-field='true']").forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = false;
      } else {
        el.value = "";
      }
    });
  }

  function showMessage(message, isError = false) {
    const msg = document.getElementById("msg");
    msg.innerHTML = `<span class="${isError ? "error-text" : "success-text"}">${escapeHtml(message)}</span>`;
  }

  function mergeConfig(base, override) {
    return {
      ...base,
      ...override,
      branding: {
        ...(base.branding || {}),
        ...(override.branding || {})
      },
      text: {
        ...(base.text || {}),
        ...(override.text || {})
      },
      fields: {
        ...(base.fields || {}),
        ...(override.fields || {})
      },
      availability: {
        ...(base.availability || {}),
        ...(override.availability || {})
      },
      policy: {
        ...(base.policy || {}),
        ...(override.policy || {})
      }
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
}
