import { supabase } from "../supabaseClient.js";

export async function render(container) {

  // ── Se utente già loggato → mostra wizard direttamente ──
  const user = window.state?.user;
  const azienda = window.state?.azienda;

  if (user && azienda && (!azienda.profilo_completato || azienda.stato_attivazione === "bozza")) {
    document.querySelector(".app-header")?.style.setProperty("display","none");
    document.querySelector(".topbar-global")?.style.setProperty("display","none");
    await renderWizard(container, azienda);
    return;
  }

  // ── Altrimenti mostra form login/registrazione ──
  document.querySelector(".app-header")?.style.setProperty("display","none");
  document.querySelector(".topbar-global")?.style.setProperty("display","none");

  container.innerHTML = `
<div class="login-page">
  <div class="login-box">

    <div class="login-logo-wrap">
      <img src="assets/favicon-192.png" class="login-logo">
    </div>

    <div style="display:flex;border-bottom:2px solid #e5e7eb;margin-bottom:20px;">
      <button id="tab-login" style="flex:1;padding:10px;border:none;background:none;font-weight:700;font-size:0.95rem;cursor:pointer;color:#0E5A7A;border-bottom:2px solid #0E5A7A;margin-bottom:-2px;">Accedi</button>
      <button id="tab-register" style="flex:1;padding:10px;border:none;background:none;font-weight:700;font-size:0.95rem;cursor:pointer;color:#9ca3af;border-bottom:2px solid transparent;margin-bottom:-2px;">Registrati gratis</button>
    </div>

    <div id="form-login" class="login-form">
      <div class="form-group">
        <input id="login-email" class="input" type="email" placeholder="Email">
      </div>
      <div class="form-group" style="position:relative;">
        <input id="login-password" class="input" type="password" placeholder="Password">
        <span id="toggle-password" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:14px;color:#6b7280;">👁</span>
      </div>
      <button id="login-btn" class="app-button primary login-btn">Accedi</button>
      <div id="login-msg" class="form-result"></div>
      <div class="login-reset">
        <button id="reset-btn" class="login-reset-btn">Recupera accesso</button>
      </div>
    </div>

    <div id="form-register" class="login-form" style="display:none;">
      <div style="background:#e8f4f8;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:0.85rem;color:#0E5A7A;font-weight:500;">
        🎁 30 giorni gratis — nessuna carta di credito richiesta
      </div>
      <div class="form-group"><input id="reg-nome" class="input" type="text" placeholder="Nome e cognome"></div>
      <div class="form-group"><input id="reg-locale" class="input" type="text" placeholder="Nome del ristorante / locale"></div>
      <div class="form-group">
        <select id="reg-tipo" class="input" style="color:#374151;">
          <option value="">Tipo di locale...</option>
          <option value="ristorante">Ristorante</option>
          <option value="pizzeria">Pizzeria</option>
          <option value="trattoria">Trattoria</option>
          <option value="bar_bistrot">Bar / Bistrot</option>
          <option value="catering_eventi">Catering / Eventi</option>
          <option value="fast_casual">Fast casual / Street food</option>
          <option value="hotel_restaurant">Ristorante d'albergo</option>
          <option value="altro">Altro</option>
        </select>
      </div>
      <div class="form-group"><input id="reg-email" class="input" type="email" placeholder="Email"></div>
      <div class="form-group" style="position:relative;">
        <input id="reg-password" class="input" type="password" placeholder="Password (min. 8 caratteri)">
        <span id="toggle-reg-password" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:14px;color:#6b7280;">👁</span>
      </div>
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:16px;">
        <input type="checkbox" id="reg-privacy" style="margin-top:3px;flex-shrink:0;">
        <label for="reg-privacy" style="font-size:0.78rem;color:#6b7280;line-height:1.5;">
          Accetto la <a href="https://ristoflow-ai.com/privacy.html" target="_blank" style="color:#0E5A7A;">Privacy Policy</a> e i <a href="https://ristoflow-ai.com/terms.html" target="_blank" style="color:#0E5A7A;">Termini di servizio</a>
        </label>
      </div>
      <button id="reg-btn" class="app-button primary login-btn">Crea account gratis →</button>
      <div id="reg-msg" class="form-result"></div>
    </div>

  </div>
</div>`;

  initTabs();
  initLogin(container);
  initRegister(container);
}

/* ══════════════════════════════════════════════
   WIZARD COMPLETAMENTO AZIENDA
══════════════════════════════════════════════ */

async function renderWizard(container, azienda) {
  const az = azienda;

  // Carica dati esistenti
  const { data: profilo } = await supabase
    .from("aziende")
    .select("*")
    .eq("id", az.id)
    .single();

  const { data: sede } = await supabase
    .from("sedi")
    .select("*")
    .eq("azienda_id", az.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const p = profilo || {};
  const s = sede || {};
  const esc = v => String(v || "").replace(/"/g, "&quot;");

  container.innerHTML = `
<div style="min-height:100vh;background:linear-gradient(135deg,#0E5A7A 0%,#1a8fb5 100%);display:flex;align-items:flex-start;justify-content:center;padding:20px;box-sizing:border-box;">
  <div style="background:white;border-radius:24px;width:100%;max-width:640px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.2);margin:auto;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0E5A7A,#1a8fb5);padding:28px 28px 20px;color:white;">
      <img src="assets/favicon-192.png" style="width:44px;height:44px;border-radius:12px;margin-bottom:12px;">
      <div style="font-size:22px;font-weight:800;margin-bottom:4px;">Completa il profilo</div>
      <div style="font-size:14px;opacity:.85;">${esc(p.nome)} — configura i dati base per iniziare</div>
    </div>

    <!-- Tabs step -->
    <div style="display:flex;border-bottom:2px solid #e5e7eb;padding:0 20px;background:#f9fafb;">
      <button class="wz-tab active" data-step="1" style="flex:1;padding:14px 8px;border:none;background:none;font-weight:700;font-size:13px;cursor:pointer;color:#0E5A7A;border-bottom:2px solid #0E5A7A;margin-bottom:-2px;">1. Locale</button>
      <button class="wz-tab" data-step="2" style="flex:1;padding:14px 8px;border:none;background:none;font-weight:700;font-size:13px;cursor:pointer;color:#9ca3af;border-bottom:2px solid transparent;margin-bottom:-2px;">2. Sede</button>
      <button class="wz-tab" data-step="3" style="flex:1;padding:14px 8px;border:none;background:none;font-weight:700;font-size:13px;cursor:pointer;color:#9ca3af;border-bottom:2px solid transparent;margin-bottom:-2px;">3. Fiscale</button>
      <button class="wz-tab" data-step="4" style="flex:1;padding:14px 8px;border:none;background:none;font-weight:700;font-size:13px;cursor:pointer;color:#9ca3af;border-bottom:2px solid transparent;margin-bottom:-2px;">4. Contatti</button>
      <button class="wz-tab" data-step="5" style="flex:1;padding:14px 8px;border:none;background:none;font-weight:700;font-size:13px;cursor:pointer;color:#9ca3af;border-bottom:2px solid transparent;margin-bottom:-2px;">5. Verifica</button>
    </div>

    <!-- Step 1 — Info locale -->
    <div class="wz-step" data-step="1" style="padding:24px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:16px;color:#0f172a;">🍽️ Informazioni sul locale</div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Nome del locale *</label>
        <input id="wz-nome" class="input" value="${esc(p.nome)}" placeholder="Es. Ristorante Da Mario">
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Tipo di locale *</label>
        <select id="wz-tipo" class="input">
          <option value="">Seleziona...</option>
          ${["ristorante","pizzeria","trattoria","bar_bistrot","catering_eventi","fast_casual","hotel_restaurant","altro"].map(t =>
            `<option value="${t}" ${p.tipo_locale === t ? "selected" : ""}>${t.replace(/_/g," ")}</option>`
          ).join("")}
        </select>
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Descrizione breve</label>
        <textarea id="wz-desc" class="input" rows="3" placeholder="Cosa rende speciale il tuo locale...">${esc(p.descrizione)}</textarea>
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Numero di coperti</label>
        <input id="wz-coperti" class="input" type="number" value="${esc(p.coperti_totali)}" placeholder="Es. 60">
      </div>
    </div>

    <!-- Step 2 — Sede principale -->
    <div class="wz-step" data-step="2" style="padding:24px;display:none;">
      <div style="font-size:15px;font-weight:700;margin-bottom:16px;color:#0f172a;">📍 Sede principale</div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Nome sede</label>
        <input id="wz-sede-nome" class="input" value="${esc(s.nome || p.nome)}" placeholder="Es. Sede centrale">
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Indirizzo *</label>
        <input id="wz-indirizzo" class="input" value="${esc(s.indirizzo)}" placeholder="Via Roma 1">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:#64748b;">Città *</label>
          <input id="wz-citta" class="input" value="${esc(s.citta)}" placeholder="Roma">
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:#64748b;">CAP</label>
          <input id="wz-cap" class="input" value="${esc(s.cap)}" placeholder="00100">
        </div>
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Provincia</label>
        <input id="wz-provincia" class="input" value="${esc(s.provincia)}" placeholder="RM">
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-top:12px;">
        <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">Posizione sulla mappa</div>
        <div style="font-size:12px;color:#64748b;line-height:1.5;margin-bottom:10px;">
          Serve alla timbratura per riconoscere chi &egrave; sul posto. Se sei nel locale usa la posizione attuale: &egrave; molto pi&ugrave; precisa dell&apos;indirizzo.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="wz-gps" type="button" class="app-button small primary">&#128205; Usa posizione attuale</button>
          <button id="wz-geocode" type="button" class="app-button small gray">Cerca dall&apos;indirizzo</button>
        </div>
        <div id="wz-geo-esito" style="font-size:12px;margin-top:10px;color:#64748b;">
          ${(s.latitudine != null && s.longitudine != null && !(Number(s.latitudine) === 0 && Number(s.longitudine) === 0))
            ? "Posizione registrata: " + Number(s.latitudine).toFixed(6) + ", " + Number(s.longitudine).toFixed(6)
            : "Nessuna posizione registrata"}
        </div>
        <input id="wz-lat" type="hidden" value="${esc(s.latitudine)}">
        <input id="wz-lon" type="hidden" value="${esc(s.longitudine)}">
      </div>
    </div>

    <!-- Step 3 — Dati fiscali -->
    <div class="wz-step" data-step="3" style="padding:24px;display:none;">
      <div style="font-size:15px;font-weight:700;margin-bottom:16px;color:#0f172a;">🧾 Dati fiscali</div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Ragione sociale</label>
        <input id="wz-ragione" class="input" value="${esc(p.ragione_sociale)}" placeholder="Es. Mario Rossi S.r.l.">
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Partita IVA</label>
        <input id="wz-piva" class="input" value="${esc(p.partita_iva)}" placeholder="IT12345678901">
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Codice fiscale</label>
        <input id="wz-cf" class="input" value="${esc(p.codice_fiscale)}" placeholder="RSSMRA80A01H501U">
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Codice SDI / PEC</label>
        <input id="wz-sdi" class="input" value="${esc(p.codice_sdi)}" placeholder="Es. XXXXXXX o pec@domain.it">
      </div>
    </div>

    <!-- Step 4 — Contatti -->
    <div class="wz-step" data-step="4" style="padding:24px;display:none;">
      <div style="font-size:15px;font-weight:700;margin-bottom:16px;color:#0f172a;">📞 Contatti pubblici</div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Telefono</label>
        <input id="wz-telefono" class="input" value="${esc(p.telefono)}" placeholder="+39 06 1234567">
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Email pubblica</label>
        <input id="wz-email" class="input" type="email" value="${esc(p.email_pubblica || p.email)}" placeholder="info@mioristorante.it">
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Sito web</label>
        <input id="wz-sito" class="input" value="${esc(p.sito_web)}" placeholder="https://www.mioristorante.it">
      </div>
      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Instagram</label>
        <input id="wz-instagram" class="input" value="${esc(p.instagram)}" placeholder="@mioristorante">
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;margin-top:8px;font-size:13px;color:#15803d;">
        Ancora un passaggio: su <strong>Verifica</strong> controlliamo insieme cosa manca.
      </div>
    </div>

    <!-- STEP 5: verifica dei requisiti, calcolata sui dati salvati -->
    <div class="wz-step" data-step="5" style="padding:24px;display:none;">
      <h3 style="margin:0 0 6px;font-size:16px;">Cosa manca per lavorare bene</h3>
      <div style="font-size:13px;color:#64748b;line-height:1.55;margin-bottom:16px;">
        Ogni voce si accende da sola quando il dato c&apos;&egrave;. Puoi entrare comunque e completare pi&ugrave; avanti: le voci rosse ti aspettano in home.
      </div>
      <div id="wz-requisiti">
        <div style="font-size:13px;color:#94a3b8;">Controllo in corso...</div>
      </div>
    </div>

    <!-- Footer navigazione -->
    <div style="padding:16px 24px 24px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb;">
      <button id="wz-prev" class="app-button small gray" style="display:none;">← Indietro</button>
      <div style="flex:1;"></div>
      <div id="wz-error" style="font-size:13px;color:#dc2626;margin-right:12px;"></div>
      <button id="wz-next" class="app-button primary">Avanti →</button>
      <button id="wz-save" class="app-button primary" style="display:none;">Entra nella dashboard →</button>
    </div>

  </div>
</div>`;

  // ── Logica navigazione step ──
  let currentStep = 1;
  const totalSteps = 5;

  function showStep(n) {
    currentStep = n;
    container.querySelectorAll(".wz-step").forEach(el => {
      el.style.display = el.dataset.step == n ? "" : "none";
    });
    container.querySelectorAll(".wz-tab").forEach(tab => {
      const active = tab.dataset.step == n;
      tab.style.color = active ? "#0E5A7A" : "#9ca3af";
      tab.style.borderBottomColor = active ? "#0E5A7A" : "transparent";
    });
    container.querySelector("#wz-prev").style.display = n > 1 ? "" : "none";
    container.querySelector("#wz-next").style.display = n < totalSteps ? "" : "none";
    container.querySelector("#wz-save").style.display = n === totalSteps ? "" : "none";
    container.querySelector("#wz-error").textContent = "";
  }

  // Click tab
  container.querySelectorAll(".wz-tab").forEach(tab => {
    tab.onclick = () => showStep(parseInt(tab.dataset.step));
  });

  // Avanti. Passando al 5 si salva davvero: la verifica deve leggere i dati
  // dal database, non i campi del modulo, altrimenti certifica cio' che spera.
  container.querySelector("#wz-next").onclick = async () => {
    const err = validateStep(currentStep);
    if (err) { container.querySelector("#wz-error").textContent = err; return; }
    if (currentStep >= totalSteps) return;

    if (currentStep === 4) {
      const btn = container.querySelector("#wz-next");
      btn.disabled = true;
      const testo = btn.textContent;
      btn.textContent = "Salvataggio...";
      const esito = await salvaDatiWizard(container, az);
      btn.disabled = false;
      btn.textContent = testo;
      if (!esito.ok) { container.querySelector("#wz-error").textContent = esito.errore; return; }
      showStep(5);
      mostraRequisiti(container, az.id);
      return;
    }

    showStep(currentStep + 1);
  };

  // Posizione della sede: presa dal GPS o cercata dall'indirizzo appena scritto
  const setGeo = (lat, lon, testo) => {
    const latEl = container.querySelector("#wz-lat");
    const lonEl = container.querySelector("#wz-lon");
    const esitoEl = container.querySelector("#wz-geo-esito");
    if (latEl) latEl.value = lat;
    if (lonEl) lonEl.value = lon;
    if (esitoEl) esitoEl.textContent = testo;
  };

  const gpsBtn = container.querySelector("#wz-gps");
  if (gpsBtn) {
    gpsBtn.onclick = () => {
      const esitoEl = container.querySelector("#wz-geo-esito");
      if (!navigator.geolocation) {
        if (esitoEl) esitoEl.textContent = "Questo dispositivo non sa dire dove si trova.";
        return;
      }
      if (esitoEl) esitoEl.textContent = "Lettura posizione...";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude);
          const lon = Number(pos.coords.longitude);
          const prec = Math.round(Number(pos.coords.accuracy) || 0);
          setGeo(lat, lon, "Posizione presa sul posto: " + lat.toFixed(6) + ", " + lon.toFixed(6) + " (precisione " + prec + " m)");
        },
        () => {
          if (esitoEl) esitoEl.textContent = "Posizione non disponibile: controlla che il telefono possa usare il GPS, oppure cercala dall'indirizzo.";
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    };
  }

  const geoBtn = container.querySelector("#wz-geocode");
  if (geoBtn) {
    geoBtn.onclick = async () => {
      const esitoEl = container.querySelector("#wz-geo-esito");
      const parti = [
        container.querySelector("#wz-indirizzo")?.value?.trim(),
        container.querySelector("#wz-cap")?.value?.trim(),
        container.querySelector("#wz-citta")?.value?.trim(),
        container.querySelector("#wz-provincia")?.value?.trim(),
      ].filter(Boolean);
      if (!parti.length) {
        if (esitoEl) esitoEl.textContent = "Scrivi prima l'indirizzo.";
        return;
      }
      if (esitoEl) esitoEl.textContent = "Ricerca in corso...";
      try {
        const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(parti.join(", ")));
        const lista = await res.json();
        const trovato = lista && lista[0];
        if (!trovato) {
          if (esitoEl) esitoEl.textContent = "Indirizzo non trovato. Se sei nel locale usa la posizione attuale.";
          return;
        }
        const lat = Number(trovato.lat);
        const lon = Number(trovato.lon);
        setGeo(lat, lon, "Posizione dall'indirizzo: " + lat.toFixed(6) + ", " + lon.toFixed(6) + " - da correggere sul posto quando puoi.");
      } catch (e) {
        console.error("wizard geocode:", e);
        if (esitoEl) esitoEl.textContent = "Ricerca non riuscita. Se sei nel locale usa la posizione attuale.";
      }
    };
  }

  // Indietro
  container.querySelector("#wz-prev").onclick = () => {
    if (currentStep > 1) showStep(currentStep - 1);
  };

  // Il pulsante finale non salva piu': i dati sono gia' stati scritti entrando
  // nella verifica. Qui si entra e basta.
  container.querySelector("#wz-save").onclick = () => vaiInDashboard(az);

  showStep(1);
}

function validateStep(step) {
  if (step === 1) {
    if (!document.getElementById("wz-nome")?.value.trim()) return "Inserisci il nome del locale";
    if (!document.getElementById("wz-tipo")?.value) return "Seleziona il tipo di locale";
  }
  if (step === 2) {
    if (!document.getElementById("wz-indirizzo")?.value.trim()) return "Inserisci l'indirizzo";
    if (!document.getElementById("wz-citta")?.value.trim()) return "Inserisci la città";
  }
  // Blocco duro solo qui: senza partita IVA non si emette un documento fiscale,
  // e chi entra senza pensa di poter fatturare. Tutto il resto si completa dopo.
  if (step === 3) {
    if (!document.getElementById("wz-piva")?.value.trim()) return "La partita IVA serve per fatture e preventivi: senza, l'attività non può emettere documenti.";
  }
  return null;
}

/* Salva i dati del modulo. Tre correzioni rispetto a prima:
   - l'indirizzo va anche su aziende: le colonne aziende.indirizzo/citta/cap/provincia
     sono quelle che finiscono su fatture e preventivi, e restavano vuote per sempre
   - email e Instagram su entrambe le colonne doppie, finche' non le unifichiamo:
     il modulo riempiva una faccia e il resto dell'app leggeva l'altra
   - profilo_completato NON si mette piu' a true per decreto: lo decide
     stato_requisiti() guardando i dati appena scritti. */
async function salvaDatiWizard(container, az) {
  try {
    const val = (id) => (document.getElementById(id)?.value || "").trim();
    const nome = val("wz-nome");
    const tipo_locale = document.getElementById("wz-tipo").value;
    const coperti_totali = parseInt(val("wz-coperti")) || null;
    const email = val("wz-email");
    const instagram = val("wz-instagram");

    const indirizzo = val("wz-indirizzo");
    const citta = val("wz-citta");
    const cap = val("wz-cap");
    const provincia = val("wz-provincia");
    const lat = Number(val("wz-lat"));
    const lon = Number(val("wz-lon"));
    const haCoordinate = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0) && val("wz-lat") !== "";

    const { error: azErr } = await supabase
      .from("aziende")
      .update({
        nome,
        tipo_locale,
        descrizione: val("wz-desc") || null,
        coperti_totali,
        ragione_sociale: val("wz-ragione") || null,
        partita_iva: val("wz-piva") || null,
        codice_fiscale: val("wz-cf") || null,
        codice_sdi: val("wz-sdi") || null,
        telefono: val("wz-telefono") || null,
        email: email || null,
        email_pubblica: email || null,
        sito_web: val("wz-sito") || null,
        instagram: instagram || null,
        instagram_url: instagram || null,
        indirizzo: indirizzo || null,
        citta: citta || null,
        cap: cap || null,
        provincia: provincia || null,
        stato_attivazione: "attiva",
      })
      .eq("id", az.id);

    if (azErr) throw azErr;

    const { data: sedeEsistente } = await supabase
      .from("sedi").select("id").eq("azienda_id", az.id)
      .order("created_at").limit(1).maybeSingle();

    const sedeDati = {
      azienda_id: az.id,
      nome: val("wz-sede-nome") || nome,
      indirizzo: indirizzo || null,
      citta: citta || null,
      cap: cap || null,
      provincia: provincia || null,
    };
    if (haCoordinate) { sedeDati.latitudine = lat; sedeDati.longitudine = lon; }

    if (sedeEsistente) {
      const { error: sErr } = await supabase.from("sedi").update(sedeDati).eq("id", sedeEsistente.id);
      if (sErr) throw sErr;
    } else {
      const { error: sErr } = await supabase.from("sedi").insert(sedeDati);
      if (sErr) throw sErr;
    }

    // Ora che i dati ci sono, il completamento si CALCOLA
    let completo = false;
    try {
      const { data: req } = await supabase.rpc("stato_requisiti", { p_azienda_id: az.id });
      const obbligatori = (req || []).filter((r) => r.obbligatorio);
      completo = obbligatori.length > 0 && obbligatori.every((r) => r.completato);
    } catch (e) {
      console.error("wizard stato_requisiti:", e);
    }
    await supabase.from("aziende").update({ profilo_completato: completo }).eq("id", az.id);

    if (window.stateActions?.setAzienda) {
      window.stateActions.setAzienda({ ...az, nome, profilo_completato: completo, stato_attivazione: "attiva" });
    }

    return { ok: true, completo };
  } catch (err) {
    console.error("WIZARD salvataggio:", err);
    return { ok: false, errore: err.message || "Errore salvataggio" };
  }
}

/* La verifica legge il database, non i campi del modulo. Ogni voce rossa
   porta con se' la strada per risolverla: un elenco di mancanze senza il
   percorso e' solo un rimprovero. */
async function mostraRequisiti(container, aziendaId) {
  const box = container.querySelector("#wz-requisiti");
  if (!box) return;

  const { data, error } = await supabase.rpc("stato_requisiti", { p_azienda_id: aziendaId });
  if (error) {
    console.error("stato_requisiti:", error);
    box.innerHTML = '<div style="font-size:13px;color:#b45309;">Non sono riuscito a controllare i requisiti. Puoi entrare comunque.</div>';
    return;
  }

  const righe = data || [];
  const obbligatori = righe.filter((r) => r.obbligatorio);
  const fatti = obbligatori.filter((r) => r.completato).length;
  const perc = obbligatori.length ? Math.round((fatti * 100) / obbligatori.length) : 0;

  const etichetteModuli = {
    base: "Dati dell'attivit\u00e0", persone: "Personale", cucina: "Cucina",
    sala: "Sala e servizio", marketing: "Marketing", fatturazione: "Fatturazione elettronica",
    pagamenti: "Incassi online",
  };

  const mancanti = righe.filter((r) => !r.completato);
  const gruppi = {};
  mancanti.forEach((r) => { (gruppi[r.modulo] = gruppi[r.modulo] || []).push(r); });

  let html = '<div style="margin-bottom:18px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">'
    + '<span>Configurazione</span><span>' + perc + '%</span></div>'
    + '<div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;">'
    + '<div style="height:100%;width:' + perc + '%;background:' + (perc === 100 ? "#16a34a" : "#0E5A7A") + ';"></div></div>'
    + '<div style="font-size:12px;color:#64748b;margin-top:6px;">' + fatti + ' voci su ' + obbligatori.length + ' necessarie sono a posto.</div>'
    + '</div>';

  if (!mancanti.length) {
    html += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;font-size:14px;color:#15803d;font-weight:600;">Tutto a posto. Puoi entrare.</div>';
    box.innerHTML = html;
    return;
  }

  Object.keys(gruppi).forEach((modulo) => {
    html += '<div style="margin-bottom:16px;">'
      + '<div style="font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">'
      + (etichetteModuli[modulo] || modulo) + '</div>';

    gruppi[modulo].forEach((r) => {
      const colore = r.obbligatorio ? "#dc2626" : "#d97706";
      const sfondo = r.obbligatorio ? "#fef2f2" : "#fffbeb";
      const bordo = r.obbligatorio ? "#fecaca" : "#fde68a";
      html += '<div style="background:' + sfondo + ';border:1px solid ' + bordo + ';border-radius:10px;padding:12px;margin-bottom:8px;">'
        + '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">'
        + '<div style="flex:1;">'
        + '<div style="font-size:14px;font-weight:700;color:' + colore + ';">' + escapeTesto(r.etichetta) + '</div>'
        + '<div style="font-size:12px;color:#64748b;line-height:1.45;margin-top:2px;">' + escapeTesto(r.descrizione || "") + '</div>'
        + '</div>'
        + '<a href="#/' + escapeTesto(r.rotta) + '" class="app-button small gray" style="white-space:nowrap;text-decoration:none;">'
        + escapeTesto(r.etichetta_azione) + '</a>'
        + '</div></div>';
    });

    html += '</div>';
  });

  box.innerHTML = html;
}

function escapeTesto(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function vaiInDashboard(az) {
  localStorage.removeItem("active_azienda_id");
  document.querySelector(".app-header")?.style.removeProperty("display");
  document.querySelector(".topbar-global")?.style.removeProperty("display");
  window.location.hash = "#/home";
}

/* ══════════════════════════════════════════════
   LOGIN / REGISTRAZIONE (utente non loggato)
══════════════════════════════════════════════ */

function initTabs() {
  const tabLogin = document.getElementById("tab-login");
  const tabReg = document.getElementById("tab-register");
  const formLogin = document.getElementById("form-login");
  const formReg = document.getElementById("form-register");

  tabLogin.onclick = () => {
    formLogin.style.display = "";
    formReg.style.display = "none";
    tabLogin.style.color = "#0E5A7A";
    tabLogin.style.borderBottomColor = "#0E5A7A";
    tabReg.style.color = "#9ca3af";
    tabReg.style.borderBottomColor = "transparent";
  };
  tabReg.onclick = () => {
    formLogin.style.display = "none";
    formReg.style.display = "";
    tabReg.style.color = "#0E5A7A";
    tabReg.style.borderBottomColor = "#0E5A7A";
    tabLogin.style.color = "#9ca3af";
    tabLogin.style.borderBottomColor = "transparent";
  };
  if (window.location.hash.includes("register")) tabReg.click();
}

function initLogin(container) {
  document.getElementById("login-btn").onclick = doLogin.bind(null, container);
  document.getElementById("reset-btn").onclick = resetPassword;
  document.getElementById("toggle-password").onclick = () => {
    const el = document.getElementById("login-password");
    el.type = el.type === "password" ? "text" : "password";
    document.getElementById("toggle-password").innerText = el.type === "password" ? "👁" : "🙈";
  };
  document.getElementById("login-password").addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin(container);
  });
}

async function doLogin(container) {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const msg = document.getElementById("login-msg");
  msg.innerHTML = "Accesso in corso...";

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { msg.innerHTML = `<span class='error-text'>${error.message}</span>`; return; }

  if (window.stateActions?.setUser) window.stateActions.setUser(data.user);

  await redirectPostLogin(data.user, container);
}

async function redirectPostLogin(user, container) {
  try {
    const { data: rels } = await supabase
      .from("utenti_aziende")
      .select("azienda_id, ruolo, aziende(id, nome, profilo_completato, stato_attivazione)")
      .eq("user_id", user.id)
      .eq("attivo", true);

    if (!rels || rels.length === 0) { window.location.hash = "#/login"; return; }

    const bozza = rels.find(r =>
      !r.aziende?.profilo_completato || r.aziende?.stato_attivazione === "bozza"
    );

    if (bozza) {
      localStorage.setItem("active_azienda_id", bozza.azienda_id);
      const az = { id: bozza.azienda_id, ...bozza.aziende };
      if (window.stateActions?.setAzienda) window.stateActions.setAzienda(az);
      document.querySelector(".app-header")?.style.removeProperty("display");
      document.querySelector(".topbar-global")?.style.removeProperty("display");
      // Mostra wizard direttamente senza navigare
      await renderWizard(container, az);
      return;
    }

    document.querySelector(".app-header")?.style.removeProperty("display");
    document.querySelector(".topbar-global")?.style.removeProperty("display");
    window.location.hash = "#/home";
  } catch {
    window.location.hash = "#/home";
  }
}

async function resetPassword() {
  const email = document.getElementById("login-email").value.trim();
  const msg = document.getElementById("login-msg");
  if (!email) { msg.innerHTML = "<span class='error-text'>Inserisci prima la tua email</span>"; return; }
  msg.innerHTML = "Invio email...";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "#/set-password"
  });
  if (error) { msg.innerHTML = `<span class='error-text'>${error.message}</span>`; return; }
  msg.innerHTML = "<span class='success-text'>Email inviata ✔</span>";
}

function initRegister(container) {
  document.getElementById("toggle-reg-password").onclick = () => {
    const el = document.getElementById("reg-password");
    el.type = el.type === "password" ? "text" : "password";
    document.getElementById("toggle-reg-password").innerText = el.type === "password" ? "👁" : "🙈";
  };
  document.getElementById("reg-btn").onclick = () => doRegister(container);
}

async function doRegister(container) {
  const nome = document.getElementById("reg-nome").value.trim();
  const locale = document.getElementById("reg-locale").value.trim();
  const tipo = document.getElementById("reg-tipo").value;
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  const privacy = document.getElementById("reg-privacy").checked;
  const msg = document.getElementById("reg-msg");
  const btn = document.getElementById("reg-btn");

  if (!nome) { msg.innerHTML = "<span class='error-text'>Inserisci il tuo nome</span>"; return; }
  if (!locale) { msg.innerHTML = "<span class='error-text'>Inserisci il nome del locale</span>"; return; }
  if (!tipo) { msg.innerHTML = "<span class='error-text'>Seleziona il tipo di locale</span>"; return; }
  if (!email) { msg.innerHTML = "<span class='error-text'>Inserisci l'email</span>"; return; }
  if (password.length < 8) { msg.innerHTML = "<span class='error-text'>Password minimo 8 caratteri</span>"; return; }
  if (!privacy) { msg.innerHTML = "<span class='error-text'>Accetta la privacy policy</span>"; return; }

  btn.disabled = true;
  btn.textContent = "Creazione account...";

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password, options: { data: { nome_completo: nome } }
    });
    if (authError) throw new Error(authError.message);
    if (!authData?.user) throw new Error("Errore creazione utente");

    const userId = authData.user.id;
    const trialScadenza = new Date();
    trialScadenza.setDate(trialScadenza.getDate() + 30);

    const { data: aziendaData, error: aziendaError } = await supabase
      .from("aziende")
      .insert({ nome: locale, tipo_locale: tipo, stato_attivazione: "trial", trial_scadenza: trialScadenza.toISOString(), profilo_completato: false })
      .select("id").single();
    if (aziendaError) throw new Error("Errore creazione azienda: " + aziendaError.message);

    await supabase.from("utenti_aziende").insert({ user_id: userId, azienda_id: aziendaData.id, ruolo: "admin" });
    await supabase.from("ristoflow_leads").upsert({ nome, email, tipo_locale: tipo, stato: "demo", fonte: "app_registrazione" }, { onConflict: "email" });

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      msg.innerHTML = "<span class='success-text'>✅ Account creato! Controlla la tua email.</span>";
      btn.disabled = false; btn.textContent = "Crea account gratis →";
      return;
    }

    if (window.stateActions?.setUser) window.stateActions.setUser(loginData.user);
    const az = { id: aziendaData.id, nome: locale, tipo_locale: tipo, profilo_completato: false, stato_attivazione: "trial" };
    localStorage.setItem("active_azienda_id", az.id);
    if (window.stateActions?.setAzienda) window.stateActions.setAzienda(az);
    document.querySelector(".app-header")?.style.removeProperty("display");
    document.querySelector(".topbar-global")?.style.removeProperty("display");
    await renderWizard(container, az);

  } catch (err) {
    msg.innerHTML = `<span class='error-text'>${err.message || "Errore registrazione"}</span>`;
    btn.disabled = false; btn.textContent = "Crea account gratis →";
  }
}
