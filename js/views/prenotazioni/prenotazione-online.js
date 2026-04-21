export async function render(container) {

  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = `<div class="page">Caricamento...</div>`;

  // 🔥 CONFIG AZIENDA (CAMPI + LOGO)
  const { data: config } = await window.supabaseClient
    .from("config_prenotazione_online")
    .select("*")
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  const campi = config?.campi || [
    { key: "nome", label: "Nome", required: true },
    { key: "telefono", label: "Telefono", required: true }
  ];

  const logo = config?.logo_url || "";

  container.innerHTML = `
    <div class="page">

      <div style="text-align:center;margin-bottom:20px;">
        ${logo ? `<img src="${logo}" style="max-width:140px;">` : ""}
        <h2>Prenota il tuo tavolo</h2>
      </div>

      <div class="card">

        <div id="dynamic-fields"></div>

        <div class="form-grid" style="margin-top:15px;">

          <div>
            <label>Data</label>
            <input type="date" id="data" class="input"/>
          </div>

          <div>
            <label>Ora</label>
            <input type="time" id="ora" class="input"/>
          </div>

          <div>
            <label>Coperti</label>
            <input type="number" id="coperti" class="input" value="2"/>
          </div>

        </div>

        <div style="margin-top:20px;">
          <button class="app-button" id="btn-invia">Invia richiesta</button>
        </div>

        <div id="msg"></div>

      </div>

    </div>
  `;

  const fieldsBox = document.getElementById("dynamic-fields");

  // 🔥 GENERAZIONE CAMPI DINAMICI
  fieldsBox.innerHTML = campi.map(c => `
    <div style="margin-bottom:10px;">
      <label>${c.label}</label>
      <input class="input dyn-field" data-key="${c.key}" ${c.required ? "required" : ""}/>
    </div>
  `).join("");

  document.getElementById("data").value = new Date().toISOString().split("T")[0];

  // 🔥 SALVATAGGIO
  document.getElementById("btn-invia").onclick = async () => {

    const msg = document.getElementById("msg");

    const extra = {};

    document.querySelectorAll(".dyn-field").forEach(el => {
      extra[el.dataset.key] = el.value;
    });

    const nome = extra.nome || "";
    const telefono = extra.telefono || "";

    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;
    const coperti = Number(document.getElementById("coperti").value);

    if (!nome || !telefono) {
      msg.innerHTML = "Compila i campi obbligatori";
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
        origine: "online",
        extra_dati: extra
      }]);

    if (error) {
      msg.innerHTML = "Errore invio";
      return;
    }

    msg.innerHTML = "✅ Richiesta inviata. Attendi conferma.";

  };

}
