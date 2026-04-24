export async function render(container) {

  // 🔥 NASCONDE HEADER
  document.querySelector(".app-header")?.style.setProperty("display","none");
  document.querySelector(".topbar-global")?.style.setProperty("display","none");

  // 🔥 PARAMETRI DA URL (FIX PRINCIPALE)
  const params = new URLSearchParams(window.location.search);

  const aziendaId = params.get("azienda");
  const sedeId = params.get("sede");

  const source = params.get("src") || "web";
  const tag = params.get("tag") || "🌐";
  const ref = params.get("ref") || null;

  console.log("AZIENDA ID:", aziendaId);
  console.log("SEDE ID:", sedeId);
  console.log("SOURCE:", source, "TAG:", tag, "REF:", ref);

  if (!aziendaId) {
    container.innerHTML = `<div class="page">Errore: link non valido</div>`;
    return;
  }

  // 🌍 LINGUA
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
  const logo = "assets/favicon-192.png";

  container.innerHTML = `
  <div class="login-page">
    <div class="login-box">
      <div class="login-logo-wrap">
        <img src="${logo}" class="login-logo">
      </div>

      <div class="login-form">
        <h2 style="text-align:center;margin-bottom:10px;">
          ${t[lang].titolo}
        </h2>

        <div class="form-group">
          <input id="nome" class="input" placeholder="${t[lang].nome}">
        </div>

        <div class="form-group">
          <input id="cognome" class="input" placeholder="${t[lang].cognome}">
        </div>

        <div class="form-group" style="display:flex; gap:6px;">
          <select id="prefisso" class="input" style="max-width:110px;">
            <option value="+39">🇮🇹 +39</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+33">🇫🇷 +33</option>
            <option value="+49">🇩🇪 +49</option>
            <option value="+34">🇪🇸 +34</option>
          </select>

          <input id="telefono" class="input" placeholder="${t[lang].telefono}">
        </div>

        <div class="form-group">
          <input type="date" id="data" class="input">
        </div>

        <div class="form-group">
          <input type="time" id="ora" class="input">
        </div>

        <div class="form-group">
          <input type="number" id="coperti" class="input" value="2">
        </div>

        <button id="btn-invia" class="app-button primary login-btn">
          ${t[lang].invia}
        </button>

        <div id="msg" class="form-result"></div>
      </div>
    </div>
  </div>
  `;

  document.getElementById("data").value = new Date().toISOString().split("T")[0];
  document.getElementById("prefisso").value = defaultPrefix;

  // 🔥 INVIO
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
        sede_id: sedeId, // 🔥 FIX MULTI-SEDE

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
      console.error(error);
      msg.innerHTML = `<span class="error-text">${error.message}</span>`;
      return;
    }

    msg.innerHTML = `<span class="success-text">${t[lang].ok}</span>`;
  };
}
