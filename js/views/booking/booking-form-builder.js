export async function render(container) {

  const aziendaId = window.state.azienda?.id;
  const sedeId = window.state.sedeSelezionata?.id;

  let currentForm = null;
  let customFields = [];
  let fasceOrarie = [];

  container.innerHTML = `
  <div style="padding:16px; max-width:800px; margin:0 auto;">

    <h2>Booking Forms</h2>

    <div id="forms-list"></div>

    <hr>

    <h2>Editor</h2>

    <input id="nome" class="input" placeholder="Nome form">

    <h3>Branding</h3>
    <label><input type="checkbox" id="logo_enabled"> Mostra logo</label>
    <input id="logo_url" class="input" placeholder="Logo URL">
    <input id="bg_color" class="input" placeholder="Colore sfondo">
    <input id="bg_image" class="input" placeholder="Immagine sfondo">

    <h3>Testi</h3>
    <input id="title" class="input" placeholder="Titolo">
    <input id="subtitle" class="input" placeholder="Sottotitolo">

    <h3>Campi</h3>
    <label><input type="checkbox" id="allergie"> Allergie</label><br>
    <label><input type="checkbox" id="note"> Note</label>

    <h4>Custom</h4>
    <div id="custom-list"></div>
    <button id="add-custom">+ Campo</button>

    <h3>Disponibilità</h3>

    <div id="giorni"></div>

    <h4>Fasce</h4>
    <div id="fasce-list"></div>
    <button id="add-fascia">+ Fascia</button>

    <h3>Tag</h3>
    <input id="tags" class="input">

    <h3>Policy</h3>
    <label><input type="checkbox" id="policy_enabled"> Attiva</label>
    <textarea id="policy_text" class="input"></textarea>

    <button id="save" class="app-button primary">SALVA</button>

    <div id="msg"></div>

  </div>
  `;

  // 🔥 CARICA FORM LISTA

  async function loadForms() {
    const { data } = await window.supabaseClient
      .from("booking_forms")
      .select("*")
      .eq("azienda_id", aziendaId);

    document.getElementById("forms-list").innerHTML = data.map(f => `
      <div style="border:1px solid #ccc; padding:8px; margin:5px 0; cursor:pointer;"
           data-id="${f.id}">
        ${f.nome}
      </div>
    `).join("");

    document.querySelectorAll("#forms-list div").forEach(el=>{
      el.onclick = () => loadForm(el.dataset.id);
    });
  }

  // 🔥 CARICA SINGOLO FORM

  async function loadForm(id) {

    currentForm = id;

    const { data: form } = await window.supabaseClient
      .from("booking_forms")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { data: version } = await window.supabaseClient
      .from("booking_form_versions")
      .select("*")
      .eq("form_id", id)
      .order("versione", { ascending: false })
      .limit(1)
      .maybeSingle();

    const config = version?.config || form.config || {};

    // POPOLA

    document.getElementById("nome").value = form.nome || "";

    document.getElementById("logo_enabled").checked = config.branding?.logo_enabled;
    document.getElementById("logo_url").value = config.branding?.logo_url || "";
    document.getElementById("bg_color").value = config.branding?.background_color || "";
    document.getElementById("bg_image").value = config.branding?.background_image || "";

    document.getElementById("title").value = config.text?.title || "";
    document.getElementById("subtitle").value = config.text?.subtitle || "";

    document.getElementById("allergie").checked = config.fields?.allergie;
    document.getElementById("note").checked = config.fields?.note;

    customFields = config.fields?.custom || [];
    fasceOrarie = config.availability?.orari || [];

    renderCustom();
    renderFasce();
  }

  // 🔥 CUSTOM

  document.getElementById("add-custom").onclick = () => {
    customFields.push({ label:"", type:"text", required:false });
    renderCustom();
  };

  function renderCustom() {
    const list = document.getElementById("custom-list");

    list.innerHTML = customFields.map((f,i)=>`
      <div>
        <input value="${f.label}" data-i="${i}" class="cf-label">
        <select data-i="${i}" class="cf-type">
          <option value="text">text</option>
          <option value="checkbox">checkbox</option>
        </select>
      </div>
    `).join("");
  }

  // 🔥 FASCE

  document.getElementById("add-fascia").onclick = () => {
    fasceOrarie.push({ start:"", end:"" });
    renderFasce();
  };

  function renderFasce() {
    const list = document.getElementById("fasce-list");

    list.innerHTML = fasceOrarie.map((f,i)=>`
      <div>
        <input value="${f.start}" data-i="${i}" class="fascia-start">
        <input value="${f.end}" data-i="${i}" class="fascia-end">
      </div>
    `).join("");
  }

  // 🔥 SAVE

  document.getElementById("save").onclick = async () => {

    const config = {
      branding: {
        logo_enabled: document.getElementById("logo_enabled").checked,
        logo_url: document.getElementById("logo_url").value,
        background_color: document.getElementById("bg_color").value,
        background_image: document.getElementById("bg_image").value
      },
      text: {
        title: document.getElementById("title").value,
        subtitle: document.getElementById("subtitle").value
      },
      fields: {
        allergie: document.getElementById("allergie").checked,
        note: document.getElementById("note").checked,
        custom: customFields
      },
      availability: {
        orari: fasceOrarie
      },
      tags: document.getElementById("tags").value.split(","),
      policy: {
        enabled: document.getElementById("policy_enabled").checked,
        text: document.getElementById("policy_text").value
      }
    };

    if (!currentForm) {
      const { data: form } = await window.supabaseClient
        .from("booking_forms")
        .insert([{ azienda_id: aziendaId, sede_id: sedeId, nome: document.getElementById("nome").value, config }])
        .select()
        .single();

      currentForm = form.id;
    }

    const { data: last } = await window.supabaseClient
      .from("booking_form_versions")
      .select("versione")
      .eq("form_id", currentForm)
      .order("versione", { ascending:false })
      .limit(1)
      .maybeSingle();

    const versione = (last?.versione || 0) + 1;

    await window.supabaseClient
      .from("booking_form_versions")
      .insert([{ form_id: currentForm, versione, config }]);

    document.getElementById("msg").innerText = "✅ Salvato (v" + versione + ")";

  };

  loadForms();
}
