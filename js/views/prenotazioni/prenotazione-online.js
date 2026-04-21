export async function render(container) {

  // 🔥 AZIENDA DA URL (FIX FINALE)
  const aziendaId = window.routeParams?.azienda;

  console.log("AZIENDA ID:", aziendaId);

  if (!aziendaId) {
    container.innerHTML = `<div class="page">Errore: azienda non trovata</div>`;
    return;
  }

  container.innerHTML = `<div class="page">Caricamento...</div>`;

  // 🌍 LINGUA AUTOMATICA
  const lang = navigator.language.startsWith("it") ? "it" : "en";

  const t = {
    it: {
      titolo: "Prenota il tuo tavolo",
      data: "Data",
      ora: "Ora",
      coperti: "Coperti",
      invia: "Invia richiesta",
      errore: "Compila i campi obbligatori",
      ok: "✅ Richiesta inviata. Attendi conferma."
    },
    en: {
      titolo: "Book your table",
      data: "Date",
      ora: "Time",
      coperti: "Guests",
      invia: "Send request",
      errore: "Please fill required fields",
      ok: "✅ Request sent. Please wait confirmation."
    }
  };

  // 🌍 PREFISSO AUTOMATICO
  const defaultPrefix = lang === "it" ? "+39" : "+44";

  // 🔥 CONFIG DISATTIVATA (per ora)
  const campi = [
    { key: "nome", label: "Nome", required: true }
  ];

  const logo = "";

  container.innerHTML = `
    <div class="page">

      <div style="text-align:center;margin-bottom:20px;">
        ${logo ? `<img src="${logo}" style="max-width:140px;">` : ""}
        <h2>${t[lang].titolo}</h2>
      </div>

      <div class="card">

        <div id="dynamic-fields"></div>

        <div class="form-grid" style="margin-top:15px;">

          <div style="display:flex; gap:6px;">
            <div style="width:110px;">
              <label>Prefisso</label>
              <select id="prefisso" class="input">
                <option value="+39">🇮🇹 +39</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+34">🇪🇸 +34</option>
              </select>
            </div>
            <div style="flex:1;">
              <label>Telefono *</label>
              <input id="telefono_input" class="input"/>
            </div>
          </div>

          <div>
            <label>${t[lang].data}</label>
            <input type="date" id="data" class="input"/>
          </div>

          <div>
            <label>${t[lang].ora}</label>
            <input type="time" id="ora" class="input"/>
          </div>

          <div>
            <label>${t[lang].coperti}</label>
            <input type="number" id="coperti" class="input" value="2"/>
          </div>

        </div>

        <div style="margin-top:20px;">
          <button class="app-button" id="btn-invia">${t[lang].invia}</button>
        </div>

        <div id="msg"></div>

      </div>

    </div>
  `;

  const fieldsBox = document.getElementById("dynamic-fields");

  // 🔥 CAMPI DINAMICI
  fieldsBox.innerHTML = campi.map(c => `
    <div style="margin-bottom:10px;">
      <label>${c.label}</label>
      <input class="input dyn-field" data-key="${c.key}" ${c.required ? "required" : ""}/>
    </div>
  `).join("");

  document.getElementById("data").value = new Date().toISOString().split("T")[0];

  document.getElementById("prefisso").value = defaultPrefix;

  // 🔥 INVIO
  document.getElementById("btn-invia").onclick = async () => {

    const msg = document.getElementById("msg");

    const extra = {};
    document.querySelectorAll(".dyn-field").forEach(el => {
      extra[el.dataset.key] = el.value;
    });

    const nome = extra.nome || "";

    const prefisso = document.getElementById("prefisso").value;
    const telefonoRaw = document.getElementById("telefono_input").value.trim();

    const telefono = (prefisso + telefonoRaw).replace(/[^\d+]/g, "");

    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;
    const coperti = Number(document.getElementById("coperti").value);

    if (!nome || !telefonoRaw) {
      msg.innerHTML = t[lang].errore;
      return;
    }

    const { error } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .insert([{
        azienda_id: aziendaId,
        cliente_nome: nome,
        cliente_telefono: telefono,
        data,
        ora,
        coperti,
        stato: "nuova",
        origine: "online"
      }]);

    if (error) {
      console.error(error);
      msg.innerHTML = "Errore invio";
      return;
    }

    msg.innerHTML = t[lang].ok;

  };

}
