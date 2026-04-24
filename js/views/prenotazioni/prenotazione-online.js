export async function render(container) {

  document.querySelector(".app-header")?.style.setProperty("display","none");
  document.querySelector(".topbar-global")?.style.setProperty("display","none");

  const params = new URLSearchParams(window.location.search);

  const aziendaId = params.get("azienda");
  const sedeId = params.get("sede");

  const source = params.get("src") || "web";
  const tag = params.get("tag") || "🌐";
  const ref = params.get("ref") || null;

  if (!aziendaId) {
    container.innerHTML = `<div class="page">Errore: link non valido</div>`;
    return;
  }

  // 🔥 LOGO + NOME FIX DEFINITIVO
  let logo = null;
  let nomeAzienda = "Prenotazione";

  try {

    // 🔹 1. SEDE
    const { data: sede } = await window.supabaseClient
      .from("sedi")
      .select("*")
      .eq("id", sedeId)
      .single();

    if (sede) {
      nomeAzienda = sede.nome || nomeAzienda;

      if (sede.logo_url) {
        logo = sede.logo_url;
      }
    }

    // 🔹 2. FALLBACK AZIENDA (SEMPRE SE NON HO LOGO)
    if (!logo) {
      const { data: azienda } = await window.supabaseClient
        .from("aziende")
        .select("*")
        .eq("id", aziendaId)
        .single();

      if (azienda) {
        nomeAzienda = nomeAzienda || azienda.nome;

        if (azienda.logo_url) {
          logo = azienda.logo_url;
        }
      }
    }

  } catch (e) {
    console.warn("Errore caricamento logo", e);
  }

  // 🔹 3. FALLBACK FINALE
  if (!logo) {
    logo = "https://via.placeholder.com/150?text=Logo";
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
      invia: "Invia richiesta",
      errore: "Compila i campi obbligatori",
      ok: "✅ Richiesta inviata"
    },
    en: {
      titolo: "Book your table",
      nome: "Name",
      cognome: "Surname",
      telefono: "Phone",
      data: "Date",
      ora: "Time",
      coperti: "Guests",
      invia: "Send request",
      errore: "Fill required fields",
      ok: "✅ Request sent"
    }
  };

  const defaultPrefix = lang === "it" ? "+39" : "+44";

  container.innerHTML = `
  <div style="
    min-height:100vh;
    display:flex;
    flex-direction:column;
    background:#f7f9fc;
    overflow-y:auto;
  ">

    <!-- HEADER -->
    <div style="
      padding:20px 16px 10px;
      text-align:center;
    ">
      <img src="${logo}" style="height:60px; object-fit:contain; margin-bottom:10px;">
      <div style="font-weight:600; font-size:16px; color:#111;">
        ${nomeAzienda}
      </div>
    </div>

    <!-- FORM -->
    <div style="
      flex:1;
      padding:16px;
      max-width:480px;
      margin:0 auto;
      width:100%;
    ">

      <div style="
        background:#fff;
        border-radius:16px;
        padding:20px;
        box-shadow:0 4px 12px rgba(0,0,0,0.06);
      ">

        <h2 style="text-align:center;margin-bottom:16px;">
          ${t[lang].titolo}
        </h2>

        <div style="display:flex; flex-direction:column; gap:10px;">

          <input id="nome" class="input" placeholder="${t[lang].nome}">
          <input id="cognome" class="input" placeholder="${t[lang].cognome}">

          <div style="display:flex; gap:6px;">
            <select id="prefisso" class="input" style="max-width:110px;">
              <option value="+39">🇮🇹 +39</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+34">🇪🇸 +34</option>
            </select>

            <input id="telefono" class="input" placeholder="${t[lang].telefono}">
          </div>

          <input type="date" id="data" class="input">
          <input type="time" id="ora" class="input">
          <input type="number" id="coperti" class="input" value="2">

          <button id="btn-invia" class="app-button primary login-btn">
            ${t[lang].invia}
          </button>

          <div id="msg" class="form-result"></div>

        </div>

      </div>
    </div>
  </div>
  `;

  document.getElementById("data").value = new Date().toISOString().split("T")[0];
  document.getElementById("prefisso").value = defaultPrefix;

  document.getElementById("btn-invia").onclick = async () => {

    const msg = document.getElementById("msg");

    const nome = document.getElementById("nome").value.trim();
    const cognome = document.getElementById("cognome").value.trim();

    const prefisso = document.getElementById("prefisso").value;
    const telefonoRaw = document.getElementById("telefono").value.trim();
    const telefono = (prefisso + telefonoRaw).replace(/[^\d+]/g, "");

    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;
    const coperti = Number(document.getElementById("coperti").value);

    if (!nome || !telefonoRaw) {
      msg.innerHTML = `<span class="error-text">${t[lang].errore}</span>`;
      return;
    }

    const { error } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .insert([{
        azienda_id: aziendaId,
        sede_id: sedeId,
        cliente_nome: nome + " " + cognome,
        cliente_telefono: telefono,
        data,
        ora,
        coperti,
        stato: "in_attesa",
        canale: "online",
        source: source,
        riferimento: ref,
        tag: tag
      }]);

    if (error) {
      msg.innerHTML = `<span class="error-text">${error.message}</span>`;
      return;
    }

    msg.innerHTML = `<span class="success-text">${t[lang].ok}</span>`;
  };
}
