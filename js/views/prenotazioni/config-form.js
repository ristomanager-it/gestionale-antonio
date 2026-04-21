export async function render(container){

  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = `<div class="page">Caricamento...</div>`;

  // 🔥 CARICA CONFIG
  const { data: config } = await window.supabaseClient
    .from("config_prenotazione_online")
    .select("*")
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  const campiDefault = [
    { key: "nome", label: "Nome" },
    { key: "cognome", label: "Cognome" },
    { key: "telefono", label: "Telefono" },
    { key: "email", label: "Email" },
    { key: "cap", label: "CAP" },
    { key: "data_nascita", label: "Data nascita" }
  ];

  let campi = config?.campi || campiDefault.map(c => ({
    ...c,
    enabled: c.key === "nome" || c.key === "telefono",
    required: c.key === "nome" || c.key === "telefono"
  }));

  let logo = config?.logo_url || "";

  container.innerHTML = `
    <div class="page">

      <div class="page-header">
        <h1>⚙️ Configura Form Prenotazione Online</h1>
      </div>

      <div class="card">

        <h3>Logo azienda</h3>
        <input id="logo_url" class="input" placeholder="URL logo" value="${logo}"/>

        <h3 style="margin-top:20px;">Campi form</h3>

        <div id="campi-box"></div>

        <div style="margin-top:20px;">
          <button class="app-button" id="btn-salva">Salva configurazione</button>
        </div>

        <div id="msg"></div>

      </div>

    </div>
  `;

  const box = document.getElementById("campi-box");

  function renderCampi(){
    box.innerHTML = campi.map((c, i) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">

        <input type="checkbox" ${c.enabled ? "checked" : ""} data-i="${i}" class="chk-enabled"/>
        <div style="flex:1;">${c.label}</div>

        <label>Obbligatorio</label>
        <input type="checkbox" ${c.required ? "checked" : ""} data-i="${i}" class="chk-required"/>

      </div>
    `).join("");

    box.querySelectorAll(".chk-enabled").forEach(el=>{
      el.onchange = ()=>{
        const i = el.dataset.i;
        campi[i].enabled = el.checked;
      };
    });

    box.querySelectorAll(".chk-required").forEach(el=>{
      el.onchange = ()=>{
        const i = el.dataset.i;
        campi[i].required = el.checked;
      };
    });
  }

  renderCampi();

  document.getElementById("btn-salva").onclick = async ()=>{

    const msg = document.getElementById("msg");

    const logo_url = document.getElementById("logo_url").value;

    const campiFinali = campi.filter(c => c.enabled);

    const { error } = await window.supabaseClient
      .from("config_prenotazione_online")
      .upsert([{
        azienda_id: aziendaId,
        campi: campiFinali,
        logo_url
      }], { onConflict: "azienda_id" });

    if(error){
      msg.innerHTML = "Errore salvataggio";
      return;
    }

    msg.innerHTML = "✅ Configurazione salvata";

  };

}
