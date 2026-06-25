// ── Tracking: inietta Meta Pixel e GTM dinamicamente ──
async function injectTracking(aziendaId) {
  try {
    const { data } = await window.supabaseClient
      .from('azienda_identita')
      .select('meta_pixel_id, gtm_id')
      .eq('azienda_id', aziendaId)
      .maybeSingle();
    if (!data) return;
    if (data.meta_pixel_id) {
      const pid = data.meta_pixel_id.trim();
      const s = document.createElement('script');
      s.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pid}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
    if (data.gtm_id) {
      const gid = data.gtm_id.trim();
      const s = document.createElement('script');
      s.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gid}');`;
      document.head.appendChild(s);
    }
  } catch(e) { console.warn('Tracking init error:', e); }
}

export async function render(container) {
  document.querySelector(".app-header")?.style.setProperty("display", "none");
  document.querySelector(".topbar-global")?.style.setProperty("display", "none");

  const params = new URLSearchParams(window.location.search);
  let formId    = params.get("form_id");
  let aziendaId = params.get("azienda");
  let sedeId    = params.get("sede");
  const source  = params.get("src") || "web";
  const tagParam= params.get("tag") || "🌐";
  const ref     = params.get("ref") || null;

  let form = null, version = null, config = null;

  const hash = window.location.hash;
  const slug  = hash.split("/booking/")[1]?.split("?")[0];

  if (!formId && slug) {
    const { data: link } = await window.supabaseClient
      .from("booking_links").select("*").eq("slug", slug).maybeSingle();
    if (link) { formId = link.form_id; aziendaId = aziendaId || link.azienda_id; sedeId = sedeId || link.sede_id; }
  }

  if (formId) {
    const { data: formData, error: formError } = await window.supabaseClient
      .from("booking_forms").select("*").eq("id", formId).eq("attivo", true).maybeSingle();
    if (formError || !formData) { container.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b;">Form non trovato</div>`; return; }
    form = formData;
    aziendaId = aziendaId || form.azienda_id;
    sedeId    = sedeId    || form.sede_id;
    const { data: versionData } = await window.supabaseClient
      .from("booking_form_versions").select("*").eq("form_id", form.id)
      .order("versione", { ascending: false }).limit(1).maybeSingle();
    version = versionData || null;
    config  = version?.config || form.config || {};
  }

  if (!aziendaId) { container.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b;">Link non valido</div>`; return; }

  const defaultConfig = {
    branding:     { logo_enabled:true, logo_url:null, background_color:"#f7f9fc", background_image:null },
    text:         { title:"Prenota il tuo tavolo", subtitle:"" },
    fields:       { allergie:false, note:true, custom:[] },
    availability: { giorni:[1,2,3,4,5,6], orari:[{ start:"12:00", end:"23:00" }] },
    tags:         [],
    policy:       { enabled:false, text:"" },
    caparra:      { attiva:false }
  };
  config = mergeConfig(defaultConfig, config || {});

  // ── Branding dati ──────────────────────────────────────────
  let logo = null, cover = null, nomeLocale = "Prenota", colore = "#0E5A7A";
  let indirizzo = null, telefono = null;

  try {
    if (sedeId) {
      const { data: sede } = await window.supabaseClient.from("sedi").select("*").eq("id", sedeId).maybeSingle();
      if (sede) {
        nomeLocale = sede.nome || nomeLocale;
        logo  = sede.logo_url  || logo;
        cover = sede.cover_url || cover;
        indirizzo = [sede.indirizzo, sede.citta].filter(Boolean).join(", ") || null;
        telefono  = sede.telefono || null;
      }
    }
    const { data: az } = await window.supabaseClient.from("aziende").select("*").eq("id", aziendaId).maybeSingle();
    if (az) {
      if (!logo)   logo  = az.logo_url;
      if (!cover)  cover = az.cover_url;
      if (nomeLocale === "Prenota") nomeLocale = az.nome || nomeLocale;
      if (az.colore_brand) colore = az.colore_brand;
      if (!indirizzo) indirizzo = [az.indirizzo, az.citta].filter(Boolean).join(", ") || null;
      if (!telefono)  telefono  = az.telefono || null;
    }
  } catch(e) { console.warn("Errore branding:", e); }

  if (config.branding?.logo_url)  logo  = config.branding.logo_url;
  if (config.branding?.cover_url) cover = config.branding.cover_url;
  else if (config.branding?.background_image) cover = config.branding.background_image;

  const lang   = navigator.language.startsWith("it") ? "it" : "en";
  const title  = config.text?.title    || (lang === "it" ? "Prenota il tuo tavolo" : "Book your table");
  const subtitle = config.text?.subtitle || "";
  const customFields = Array.isArray(config.fields?.custom) ? config.fields.custom : [];
  const tags   = Array.isArray(config.tags) ? config.tags : [];

  const t = {
    it: { nome:"Nome *", cognome:"Cognome", telefono:"Telefono *", data:"Data *", coperti:"Quante persone?", note:"Note o richieste speciali", allergie:"Allergie/intolleranze", invia:"Prenota ora", errore:"Compila i campi obbligatori", ok:"✅ Prenotazione inviata!", policyAccept:"Ho letto e accetto la booking policy", policyRequired:"Accetta la booking policy per procedere.", giornoND:"Il giorno selezionato non è prenotabile", oraNd:"L'orario selezionato non è prenotabile" },
    en: { nome:"Name *", cognome:"Surname", telefono:"Phone *", data:"Date *", coperti:"Guests", note:"Special requests", allergie:"Allergies", invia:"Book now", errore:"Fill required fields", ok:"✅ Booking sent!", policyAccept:"I accept the booking policy", policyRequired:"Accept the booking policy to continue.", giornoND:"The selected day is not bookable", oraNd:"The selected time is not bookable" }
  };

  // ── Caparra HTML ───────────────────────────────────────────
  const caparraHtml = config.pagamento?.attivo ? (() => {
    const pag = config.pagamento;
    const imp = pag.tipo==='fisso' ? `€${Number(pag.importo||0).toFixed(2)}` :
      pag.tipo==='persona' ? `€${Number(pag.importo||0).toFixed(2)} a persona` : `${pag.importo||0}%`;
    return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px;margin-bottom:4px;">
      <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:4px;">💳 Pagamento richiesto — ${imp}</div>
      <div style="font-size:12px;color:#92400e;margin-top:6px;padding:8px;background:#fef3c7;border-radius:8px;">Verrai reindirizzato al pagamento sicuro. La prenotazione si conferma dopo il pagamento.</div>
    </div>`;
  })() : config.caparra?.attiva ? (() => {
    const cap = config.caparra;
    const imp = cap.tipo==='fisso' ? `€${Number(cap.importo||0).toFixed(2)}` : cap.tipo==='persona' ? `€${Number(cap.importo||0).toFixed(2)} a persona` : `${cap.importo||0}%`;
    return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px;margin-bottom:4px;">
      <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:4px;">💳 Caparra richiesta — ${imp}</div>
      <div style="font-size:12px;color:#78350f;">${cap.note || "Ti contatteremo per i dettagli del pagamento."}</div>
    </div>`;
  })() : '';

  // ── Rendering ──────────────────────────────────────────────
  container.innerHTML = `
  <style>
    .pren-page { min-height:100vh; display:flex; flex-direction:column; background:#f4f6f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .pren-hero { position:relative; width:100%; height:200px; overflow:visible; background:${colore}; }
    .pren-hero img.cover { width:100%; height:200px; object-fit:cover; display:block; }
    .pren-hero .overlay { position:absolute; inset:0; height:200px; background:linear-gradient(to bottom, rgba(0,0,0,0.0) 50%, rgba(0,0,0,0.3) 100%); }
    .pren-logo-wrap { position:absolute; bottom:-28px; left:20px; z-index:2; }
    .pren-logo { width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid white; background:white; box-shadow:0 2px 12px rgba(0,0,0,0.2); display:block; }
    .pren-logo-placeholder { width:80px; height:80px; border-radius:50%; background:${colore}; border:3px solid white; display:flex; align-items:center; justify-content:center; font-size:30px; box-shadow:0 2px 12px rgba(0,0,0,0.2); }
    .pren-header { padding:40px 20px 16px 20px; }
    .pren-header h1 { margin:0 0 2px; font-size:22px; font-weight:800; color:#111827; }
    .pren-header .pren-title { font-size:14px; font-weight:500; color:#64748b; margin:0 0 4px; }
    .pren-header .pren-subtitle { font-size:13px; color:#94a3b8; margin:0; line-height:1.5; }
    .pren-card { background:white; border-radius:20px; padding:24px; margin:0 16px 16px; box-shadow:0 4px 20px rgba(0,0,0,0.07); }
    .pren-section-title { font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; margin:0 0 12px; }
    .pren-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .pren-field { display:flex; flex-direction:column; gap:6px; }
    .pren-label { font-size:12px; font-weight:600; color:#374151; }
    .pren-input { width:100%; padding:12px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:14px; color:#111827; background:#f9fafb; box-sizing:border-box; transition:border-color .2s; outline:none; -webkit-appearance:none; appearance:none; }
    .pren-input:focus { border-color:${colore}; background:white; }
    .pren-input::placeholder { color:#94a3b8; }
    .pren-tel-row { display:flex; gap:8px; }
    .pren-prefisso { width:90px; flex-shrink:0; }
    .pren-select-ora { width:100%; padding:12px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:14px; color:#111827; background:#f9fafb; box-sizing:border-box; outline:none; -webkit-appearance:none; appearance:none; cursor:pointer; }
    .pren-select-ora:focus { border-color:${colore}; background:white; }
    .pren-slot-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
    .pren-slot { padding:10px 4px; border:1.5px solid #e5e7eb; border-radius:10px; text-align:center; font-size:13px; font-weight:600; color:#374151; cursor:pointer; background:#f9fafb; transition:all .15s; }
    .pren-slot:hover:not(.disabled) { border-color:${colore}; color:${colore}; background:#f0f9ff; }
    .pren-slot.selected { border-color:${colore}; background:${colore}; color:white; }
    .pren-slot.disabled { opacity:.4; cursor:not-allowed; text-decoration:line-through; }
    .pren-coperti-row { display:flex; align-items:center; gap:12px; }
    .pren-coperti-btn { width:40px; height:40px; border-radius:50%; border:1.5px solid #e5e7eb; background:white; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#374151; transition:all .15s; flex-shrink:0; }
    .pren-coperti-btn:hover { border-color:${colore}; color:${colore}; }
    .pren-coperti-val { font-size:22px; font-weight:800; color:#111827; min-width:40px; text-align:center; }
    .pren-coperti-label { font-size:13px; color:#64748b; }
    .pren-consensi { background:#f8fafc; border-radius:14px; padding:16px; }
    .pren-check-row { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
    .pren-check-row:last-child { margin-bottom:0; }
    .pren-check-row input[type=checkbox] { margin-top:2px; accent-color:${colore}; flex-shrink:0; width:16px; height:16px; cursor:pointer; }
    .pren-check-row span { font-size:12px; color:#374151; line-height:1.5; }
    .pren-btn { width:100%; padding:15px; background:${colore}; color:white; border:none; border-radius:14px; font-size:16px; font-weight:800; cursor:pointer; transition:opacity .2s; letter-spacing:.3px; }
    .pren-btn:hover { opacity:.9; }
    .pren-btn:disabled { opacity:.6; cursor:not-allowed; }
    .pren-msg { margin-top:12px; text-align:center; font-size:13px; }
    .pren-error { color:#dc2626; background:#fef2f2; border-radius:8px; padding:10px; }
    .pren-success { color:#15803d; background:#f0fdf4; border-radius:8px; padding:10px; }
    .pren-footer { text-align:center; padding:20px; font-size:11px; color:#94a3b8; margin-top:auto; }
    @media(max-width:380px) { .pren-slot-grid { grid-template-columns:repeat(2,1fr); } .pren-grid-2 { grid-template-columns:1fr; } }
  </style>

  <div class="pren-page">

    <!-- HERO COVER -->
    <div class="pren-hero">
      ${cover ? `<img class="cover" src="${escapeAttribute(cover)}" alt="Cover">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${colore},${colore}cc);"></div>`}
      <div class="overlay"></div>
      <div class="pren-logo-wrap">
        ${logo ? `<img class="pren-logo" src="${escapeAttribute(logo)}" alt="Logo">` : `<div class="pren-logo-placeholder">🍽️</div>`}
      </div>
    </div>

    <!-- HEADER -->
    <div class="pren-header">
      <h1>${escapeHtml(nomeLocale)}</h1>
      ${title ? `<div class="pren-title">${escapeHtml(title)}</div>` : ""}
      ${subtitle ? `<p class="pren-subtitle">${escapeHtml(subtitle)}</p>` : ""}
    </div>

    <!-- FORM CARD -->
    <div class="pren-card">

      <!-- Chi sei -->
      <div class="pren-section-title">👤 I tuoi dati</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        <div class="pren-grid-2">
          <div class="pren-field">
            <label class="pren-label">Nome *</label>
            <input id="nome" class="pren-input" placeholder="Mario" autocomplete="given-name">
          </div>
          <div class="pren-field">
            <label class="pren-label">Cognome</label>
            <input id="cognome" class="pren-input" placeholder="Rossi" autocomplete="family-name">
          </div>
        </div>
        <div class="pren-field">
          <label class="pren-label">Telefono *</label>
          <div class="pren-tel-row">
            <select id="prefisso" class="pren-input pren-prefisso" autocomplete="tel-country-code">
              <option value="+39">🇮🇹 +39</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+34">🇪🇸 +34</option>
            </select>
            <input id="telefono" class="pren-input" placeholder="333 123 4567" autocomplete="tel-national" type="tel" style="flex:1;">
          </div>
        </div>
        <div class="pren-field">
          <label class="pren-label">Email *</label>
          <input id="email" class="pren-input" placeholder="mario@email.com" type="email" autocomplete="email">
        </div>
      </div>

      <!-- Quando -->
      <div class="pren-section-title">📅 Quando vieni?</div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
        <div class="pren-field">
          <label class="pren-label">Data *</label>
          <input id="data" class="pren-input" type="date">
        </div>
        <div class="pren-field">
          <label class="pren-label">Orario *</label>
          <div id="slot-container" class="pren-slot-grid"></div>
          <input type="hidden" id="ora">
        </div>
      </div>

      <!-- Quanti -->
      <div class="pren-section-title">👥 Quante persone?</div>
      <div style="margin-bottom:20px;">
        <div class="pren-coperti-row">
          <button class="pren-coperti-btn" id="btn-meno" type="button">−</button>
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div class="pren-coperti-val" id="coperti-val">2</div>
            <div class="pren-coperti-label">persone</div>
          </div>
          <button class="pren-coperti-btn" id="btn-piu" type="button">+</button>
        </div>
        <input type="hidden" id="coperti" value="2">
      </div>

      ${config.fields?.allergie ? `
      <!-- Allergie -->
      <div class="pren-section-title">🥗 Allergie/intolleranze</div>
      <div style="margin-bottom:20px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer;">
          <input type="checkbox" id="allergie" style="accent-color:${colore};width:16px;height:16px;">
          Segnala allergie o intolleranze
        </label>
      </div>` : ""}

      ${config.fields?.note ? `
      <!-- Note -->
      <div class="pren-section-title">📝 Note</div>
      <div style="margin-bottom:20px;">
        <textarea id="note_cliente" class="pren-input" rows="3" placeholder="Occasione speciale? Richieste particolari?" style="resize:vertical;"></textarea>
      </div>` : ""}

      ${customFields.length ? `
      <div class="pren-section-title">📋 Informazioni aggiuntive</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        ${customFields.map(renderCustomField).join("")}
      </div>` : ""}

      ${caparraHtml}

      <!-- Consensi -->
      <div class="pren-consensi" style="margin-bottom:16px;">
        <div class="pren-check-row">
          <input type="checkbox" id="consenso-gdpr">
          <span>* Accetto il trattamento dei dati personali per la gestione della prenotazione (GDPR).</span>
        </div>
        <div class="pren-check-row">
          <input type="checkbox" id="consenso-network">
          <span>Entro nel <strong>Ristoflow Network</strong> — ottieni la tessera fidelity con punti bonus! 🎁</span>
        </div>
        <div class="pren-check-row">
          <input type="checkbox" id="consenso-marketing">
          <span>Acconsento a ricevere offerte e comunicazioni via WhatsApp/email.</span>
        </div>
      </div>

      <!-- CTA -->
      <button id="btn-invia" class="pren-btn">${config.pagamento?.attivo ? escapeHtml(config.pagamento?.label_btn || 'Paga e conferma') : '🦅 Prenota ora'}</button>
      <div id="msg" class="pren-msg"></div>

    </div>

    ${renderPolicyModal()}

    <div class="pren-footer">Powered by <a href="https://ristoflow-ai.com" target="_blank" style="color:${colore};font-weight:700;text-decoration:none;">Ristoflow.AI</a></div>
  </div>`;

  // ── Init ───────────────────────────────────────────────────
  document.getElementById("data").value = new Date().toISOString().split("T")[0];
  document.getElementById("prefisso").value = lang === "it" ? "+39" : "+44";

  // Preriempimento da localStorage (sessioni precedenti)
  const saved = (() => { try { return JSON.parse(localStorage.getItem("pren_cliente") || "{}"); } catch { return {}; } })();
  if (saved.nome)    document.getElementById("nome").value    = saved.nome;
  if (saved.cognome) document.getElementById("cognome").value = saved.cognome;
  if (saved.telefono){ const m = saved.telefono.match(/^(\+\d{1,3})(\d+)$/); if (m) { document.getElementById("prefisso").value = m[1]; document.getElementById("telefono").value = m[2]; } }
  if (saved.email)   document.getElementById("email").value   = saved.email;

  // Slot config
  const { data: slotCfg } = await window.supabaseClient
    .from("prenotazioni_slot_config").select("*").eq("azienda_id", aziendaId).maybeSingle();
  const slotMinuti = slotCfg?.slot_minuti || 30;
  const maxCoperti = slotCfg?.max_coperti_slot || 30;
  const orariBase  = slotCfg?.orari || ["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00","21:30"];

  let oraSelezionata = "";

  async function aggiornaSlot() {
    const data    = document.getElementById("data").value;
    const coperti = parseInt(document.getElementById("coperti").value) || 2;
    const container2 = document.getElementById("slot-container");
    if (!data || !container2) return;

    const oraFine = (ora) => {
      const d = new Date(`${data}T${ora}`);
      d.setMinutes(d.getMinutes() + slotMinuti);
      return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    };

    const { data: prenSlot } = await window.supabaseClient
      .from("prenotazioni_tavoli").select("ora, coperti")
      .eq("azienda_id", aziendaId).eq("data", data).in("stato", ["nuova","confermata","arrivata"]);

    // Filtra orari per disponibilità config
    const orariDisponibili = orariBase.filter(slot => {
      if (!isDayBookable(data)) return false;
      return isTimeBookable(slot);
    });

    container2.innerHTML = orariDisponibili.length ? orariDisponibili.map(slot => {
      const fine = oraFine(slot);
      const occupati = (prenSlot || []).filter(p => p.ora >= slot && p.ora < fine).reduce((s,p) => s + (Number(p.coperti)||0), 0);
      const disponibile = (maxCoperti - occupati) >= coperti;
      const isSelected  = slot === oraSelezionata;
      return `<div class="pren-slot${!disponibile?" disabled":""}${isSelected?" selected":""}" data-ora="${escapeAttribute(slot)}" onclick="selezionaSlot('${escapeAttribute(slot)}',${disponibile})">${slot}</div>`;
    }).join("") : `<div style="font-size:13px;color:#94a3b8;grid-column:1/-1;text-align:center;padding:12px;">Nessun orario disponibile per questa data</div>`;
  }

  window.selezionaSlot = function(ora, disponibile) {
    if (!disponibile) return;
    oraSelezionata = ora;
    document.getElementById("ora").value = ora;
    document.querySelectorAll(".pren-slot").forEach(el => {
      el.classList.toggle("selected", el.dataset.ora === ora);
    });
  };

  // Coperti stepper
  let copertiVal = 2;
  document.getElementById("btn-meno").onclick = () => {
    if (copertiVal <= 1) return;
    copertiVal--;
    document.getElementById("coperti-val").textContent = copertiVal;
    document.getElementById("coperti").value = copertiVal;
    aggiornaSlot();
  };
  document.getElementById("btn-piu").onclick = () => {
    if (copertiVal >= 30) return;
    copertiVal++;
    document.getElementById("coperti-val").textContent = copertiVal;
    document.getElementById("coperti").value = copertiVal;
    aggiornaSlot();
  };

  document.getElementById("data").addEventListener("change", () => { oraSelezionata = ""; document.getElementById("ora").value = ""; aggiornaSlot(); });
  aggiornaSlot();

  // Policy modal
  const policyModal = document.getElementById("policy-modal");
  document.getElementById("btn-invia").onclick = async () => {
    const validation = validateBooking();
    if (!validation.ok) { showMessage(validation.message, true); return; }
    if (config.policy?.enabled) { policyModal.style.display = "flex"; return; }
    await submitBooking();
  };
  document.getElementById("policy-cancel")?.addEventListener("click", () => policyModal.style.display = "none");
  document.getElementById("policy-confirm")?.addEventListener("click", async () => {
    if (!document.getElementById("policy_accept")?.checked) { showMessage("Accetta la policy per procedere.", true); return; }
    policyModal.style.display = "none";
    await submitBooking();
  });

  // ── Submit ─────────────────────────────────────────────────
  async function submitBooking() {
    const msg    = document.getElementById("msg");
    const btn    = document.getElementById("btn-invia");
    const nome   = document.getElementById("nome").value.trim();
    const cognome= document.getElementById("cognome").value.trim();
    const prefisso = document.getElementById("prefisso").value;
    const telRaw = document.getElementById("telefono").value.trim();
    const telefono2 = (prefisso + telRaw).replace(/[^\d+]/g, "");
    const data   = document.getElementById("data").value;
    const ora    = document.getElementById("ora").value;
    const coperti= Number(document.getElementById("coperti").value);
    const emailVal = document.getElementById("email")?.value.trim() || "";
    const noteCliente = document.getElementById("note_cliente")?.value?.trim() || "";
    const allergie = document.getElementById("allergie")?.checked || false;
    const customValues = collectCustomValues();
    const consensoNetwork = document.getElementById("consenso-network")?.checked || false;

    if (!emailVal || !emailVal.includes("@")) { showMessage("Email obbligatoria", true); return; }

    // Salva in localStorage per riuso futuro
    try { localStorage.setItem("pren_cliente", JSON.stringify({ nome, cognome, telefono: telefono2, email: emailVal })); } catch {}

    const riferimentoPayload = {
      ref, note_cliente: noteCliente, allergie, custom: customValues,
      policy_accepted: !!config.policy?.enabled,
      form_name: form?.nome || null, form_version: version?.versione || null,
      consenso_gdpr: document.getElementById("consenso-gdpr")?.checked || false,
      consenso_network: consensoNetwork,
      consenso_marketing: document.getElementById("consenso-marketing")?.checked || false
    };

    const finalTag = [tagParam, ...tags].filter(Boolean).join(",");
    btn.disabled = true; btn.textContent = "⏳ Invio in corso...";

    const pag = config.pagamento || {};
    const pagamentoRichiesto = !!pag.attivo && pag.importo > 0;

    let importoCentesimi = 0;
    if (pagamentoRichiesto) {
      if (pag.tipo === "fisso") importoCentesimi = Math.round((pag.importo||0)*100);
      else if (pag.tipo === "persona") importoCentesimi = Math.round((pag.importo||0)*coperti*100);
      else importoCentesimi = Math.round((pag.importo||0)*100);
    }

    const statoIniziale = pagamentoRichiesto ? "in_attesa_pagamento" : "in_attesa";

    const { data: pren, error } = await window.supabaseClient.from("prenotazioni_tavoli").insert([{
      azienda_id: aziendaId, sede_id: sedeId,
      form_id: form?.id || formId || null, form_version_id: version?.id || null,
      cliente_nome: `${nome} ${cognome}`.trim(), cliente_telefono: telefono2,
      cliente_email: emailVal || null,
      data, ora, coperti, stato: statoIniziale, canale: "online",
      source, riferimento: JSON.stringify(riferimentoPayload), tag: finalTag
    }]).select("id, token_pubblico").single();

    btn.disabled = false; btn.textContent = config.pagamento?.attivo ? escapeHtml(config.pagamento?.label_btn || 'Paga e conferma') : '🦅 Prenota ora';

    if (error) { showMessage(error.message, true); return; }

    // Notifica WhatsApp + Email (fire & forget)
    if (pren?.id) {
      fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/prenotazione-notifica-tavolo", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0" },
        body: JSON.stringify({ prenotazione_id: pren.id })
      }).catch(e => console.warn("Notifica:", e));
    }

    if (!pagamentoRichiesto) {
      const tokenPub = pren?.token_pubblico;
      if (tokenPub) {
        showMessage("✅ Prenotazione inviata! Reindirizzamento...", false);
        setTimeout(() => { window.location.href = `/prenotazione.html?token=${encodeURIComponent(tokenPub)}`; }, 800);
      } else {
        _mostraSuccesso(consensoNetwork, msg);
        clearForm();
      }
      return;
    }

    // Stripe
    showMessage("⏳ Reindirizzamento al pagamento...", false);
    try {
      const descrizione = pag.descrizione || `Caparra — ${new Date(data).toLocaleDateString("it-IT")} ore ${ora} · ${coperti} coperti`;
      const res = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action:"create_session", azienda_id:aziendaId, tipo:"tavolo", riferimento_id:pren.id, importo_centesimi:importoCentesimi, descrizione, cliente_nome:`${nome} ${cognome}`.trim(), metadata:{ form_id:form?.id||formId||"", data, ora, coperti:String(coperti) } })
      });
      const result = await res.json();
      if (!res.ok || !result.checkout_url) {
        await window.supabaseClient.from("prenotazioni_tavoli").update({ stato:"in_attesa" }).eq("id", pren.id);
        _mostraSuccesso(consensoNetwork, msg); clearForm(); return;
      }
      window.location.href = result.checkout_url;
    } catch(e) {
      await window.supabaseClient.from("prenotazioni_tavoli").update({ stato:"in_attesa" }).eq("id", pren.id);
      _mostraSuccesso(consensoNetwork, msg); clearForm();
    }
  }

  function _mostraSuccesso(consensoNetwork, msg) {
    if (consensoNetwork && aziendaId) {
      msg.innerHTML = `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;text-align:left;margin-top:12px;">
        <div style="font-size:15px;font-weight:800;color:#15803d;margin-bottom:6px;">✅ Prenotazione inviata!</div>
        <div style="font-size:13px;color:#166534;margin-bottom:12px;">Riceverai una conferma a breve.</div>
        <div style="background:#fff;border-radius:10px;padding:12px;border:1px solid #d1fae5;">
          <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:6px;">🎁 Ottieni la tessera fidelity!</div>
          <a href="${"https://app.ristoflow-ai.com/fidelity.html?a=" + aziendaId}" target="_blank" style="display:block;background:#059669;color:white;border-radius:10px;padding:10px;text-align:center;text-decoration:none;font-size:13px;font-weight:700;">📲 Attiva la tessera fidelity</a>
        </div>
      </div>`;
    } else {
      msg.innerHTML = `<div class="pren-success">✅ Prenotazione inviata! Riceverai una conferma a breve.</div>`;
    }
  }

  function validateBooking() {
    const nome   = document.getElementById("nome").value.trim();
    const telRaw = document.getElementById("telefono").value.trim();
    const data   = document.getElementById("data").value;
    const ora    = document.getElementById("ora").value;
    const email  = document.getElementById("email")?.value.trim() || "";
    if (!nome)   return { ok:false, message:"Inserisci il tuo nome" };
    if (!telRaw) return { ok:false, message:"Inserisci il tuo telefono" };
    if (!email || !email.includes("@")) return { ok:false, message:"Inserisci un'email valida" };
    if (!data)   return { ok:false, message:"Seleziona la data" };
    if (!ora)    return { ok:false, message:"Seleziona un orario" };
    if (!document.getElementById("consenso-gdpr")?.checked) return { ok:false, message:"Devi accettare il trattamento dei dati personali per procedere." };
    if (!isDayBookable(data)) return { ok:false, message:"Il giorno selezionato non è prenotabile" };
    for (const field of customFields) {
      if (!field.required) continue;
      const id = getCustomFieldId(field);
      const el = document.getElementById(id);
      if (!el) continue;
      if (field.type === "checkbox" && !el.checked) return { ok:false, message:`Campo obbligatorio: ${field.label}` };
      else if (field.type !== "checkbox" && !String(el.value||"").trim()) return { ok:false, message:`Campo obbligatorio: ${field.label}` };
    }
    return { ok:true };
  }

  function isDayBookable(dateString) {
    const giorni = config.availability?.giorni;
    if (!Array.isArray(giorni) || !giorni.length) return true;
    const d = new Date(dateString + "T00:00:00");
    const jsDay = d.getDay();
    return giorni.includes(jsDay === 0 ? 7 : jsDay);
  }

  function isTimeBookable(timeString) {
    const orari = config.availability?.orari;
    if (!Array.isArray(orari) || !orari.length) return true;
    return orari.some(slot => slot.start && slot.end && timeString >= slot.start && timeString <= slot.end);
  }

  function renderCustomField(field, index) {
    const id = getCustomFieldId(field, index);
    const label = field.label || `Campo ${index+1}`;
    const type  = field.type  || "text";
    if (type === "checkbox") return `<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;"><input type="checkbox" id="${escapeAttribute(id)}" data-custom-field="true" data-label="${escapeAttribute(label)}" style="accent-color:${colore};width:16px;height:16px;">${escapeHtml(label)}</label>`;
    if (type === "select" && Array.isArray(field.options)) return `<select id="${escapeAttribute(id)}" class="pren-input" data-custom-field="true" data-label="${escapeAttribute(label)}"><option value="">${escapeHtml(label)}</option>${field.options.map(o=>`<option value="${escapeAttribute(o)}">${escapeHtml(o)}</option>`).join("")}</select>`;
    return `<input id="${escapeAttribute(id)}" class="pren-input" data-custom-field="true" data-label="${escapeAttribute(label)}" placeholder="${escapeAttribute(label)}">`;
  }

  function collectCustomValues() {
    const result = [];
    document.querySelectorAll("[data-custom-field='true']").forEach(el => {
      const label = el.dataset.label || el.id;
      if (el.type === "checkbox") result.push({ label, type:"checkbox", value:el.checked });
      else result.push({ label, type:el.tagName.toLowerCase()==="select"?"select":"text", value:el.value });
    });
    return result;
  }

  function getCustomFieldId(field, index = 0) {
    const base = field.id || field.label || `custom_${index}`;
    return "custom_" + String(base).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  }

  function renderPolicyModal() {
    if (!config.policy?.enabled) return "";
    return `<div id="policy-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;align-items:center;justify-content:center;padding:16px;">
      <div style="width:100%;max-width:460px;max-height:80vh;overflow-y:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 20px 40px rgba(0,0,0,0.25);">
        <h3 style="margin:0 0 10px;">Policy prenotazione</h3>
        <div style="font-size:13px;line-height:1.5;color:#374151;white-space:pre-wrap;margin-bottom:14px;">${escapeHtml(config.policy.text||"")}</div>
        <label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;margin-bottom:14px;cursor:pointer;">
          <input type="checkbox" id="policy_accept" style="margin-top:3px;accent-color:${colore};">
          <span>Ho letto e accetto la booking policy</span>
        </label>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" id="policy-cancel" class="app-button">Annulla</button>
          <button type="button" id="policy-confirm" class="app-button primary">Conferma</button>
        </div>
      </div>
    </div>`;
  }

  function clearForm() {
    ["nome","cognome","telefono","email"].forEach(id => { const el = document.getElementById(id); if(el) el.value=""; });
    document.getElementById("coperti").value = "2";
    copertiVal = 2;
    document.getElementById("coperti-val").textContent = "2";
    const note = document.getElementById("note_cliente");
    if (note) note.value = "";
    document.querySelectorAll("[data-custom-field='true']").forEach(el => { if(el.type==="checkbox") el.checked=false; else el.value=""; });
  }

  function showMessage(message, isError = false) {
    const el = document.getElementById("msg");
    el.innerHTML = `<div class="${isError?"pren-error":"pren-success"}">${escapeHtml(message)}</div>`;
  }

  function mergeConfig(base, override) {
    return { ...base, ...override,
      branding:     { ...(base.branding||{}),     ...(override.branding||{}) },
      text:         { ...(base.text||{}),          ...(override.text||{}) },
      fields:       { ...(base.fields||{}),        ...(override.fields||{}) },
      availability: { ...(base.availability||{}),  ...(override.availability||{}) },
      policy:       { ...(base.policy||{}),        ...(override.policy||{}) },
      caparra:      { ...(base.caparra||{}),        ...(override.caparra||{}) }
    };
  }

  function escapeHtml(value) {
    return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function escapeAttribute(value) { return escapeHtml(value); }

  // Tracking
  injectTracking(aziendaId).catch(() => {});
}
