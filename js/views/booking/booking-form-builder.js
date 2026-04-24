export async function render(container) {

  const aziendaId = window.state.azienda?.id;
  const sedeId = window.state.sedeSelezionata?.id;

  let customFields = [];
  let fasceOrarie = [];

  container.innerHTML = `
  <div style="padding:16px; max-width:700px; margin:0 auto;">

    <h2>Booking Form Builder</h2>

    <input id="nome" class="input" placeholder="Nome form">

    <hr>

    <h3>Branding</h3>

    <label>
      <input type="checkbox" id="logo_enabled" checked> Mostra logo
    </label>

    <input id="logo_url" class="input" placeholder="Logo URL (opzionale)">
    <input id="bg_color" class="input" placeholder="Colore sfondo (#f7f9fc)">
    <input id="bg_image" class="input" placeholder="Immagine sfondo URL">

    <hr>

    <h3>Testi</h3>

    <input id="title" class="input" placeholder="Titolo">
    <input id="subtitle" class="input" placeholder="Sottotitolo">

    <hr>

    <h3>Campi</h3>

    <label><input type="checkbox" id="allergie"> Allergie</label><br>
    <label><input type="checkbox" id="note" checked> Note</label>

    <h4>Campi Custom</h4>

    <div id="custom-list"></div>

    <button id="add-custom">+ Aggiungi campo</button>

    <hr>

    <h3>Disponibilità</h3>

    <div>
      Giorni:<br>
      ${["L","M","M","G","V","S","D"].map((d,i)=>`
        <label>
          <input type="checkbox" class="giorno" value="${i+1}" checked> ${d}
        </label>
      `).join("")}
    </div>

    <h4>Fasce orarie</h4>

    <div id="fasce-list"></div>

    <button id="add-fascia">+ Aggiungi fascia</button>

    <hr>

    <h3>Tag</h3>

    <input id="tags" class="input" placeholder="evento, estate, matrimonio">

    <hr>

    <h3>Policy</h3>

    <label>
      <input type="checkbox" id="policy_enabled"> Attiva policy
    </label>

    <textarea id="policy_text" class="input" placeholder="Testo policy"></textarea>

    <hr>

    <button id="save" class="app-button primary">Salva Form</button>

    <div id="msg"></div>

  </div>
  `;

  // 🔥 CUSTOM FIELDS

  document.getElementById("add-custom").onclick = () => {
    const id = Date.now();

    customFields.push({ id, label: "", type: "text", required: false });

    renderCustom();
  };

  function renderCustom() {
    const list = document.getElementById("custom-list");

    list.innerHTML = customFields.map(f => `
      <div style="border:1px solid #ccc; padding:8px; margin:5px 0;">
        <input placeholder="Label" value="${f.label}" data-id="${f.id}" class="cf-label">

        <select data-id="${f.id}" class="cf-type">
          <option value="text" ${f.type==="text"?"selected":""}>Testo</option>
          <option value="checkbox" ${f.type==="checkbox"?"selected":""}>Checkbox</option>
        </select>

        <label>
          <input type="checkbox" data-id="${f.id}" class="cf-required" ${f.required?"checked":""}>
          Obbligatorio
        </label>
      </div>
    `).join("");
  }

  // 🔥 FASCE ORARIE

  document.getElementById("add-fascia").onclick = () => {
    fasceOrarie.push({ start: "", end: "" });
    renderFasce();
  };

  function renderFasce() {
    const list = document.getElementById("fasce-list");

    list.innerHTML = fasceOrarie.map((f,i) => `
      <div style="margin:5px 0;">
        <input placeholder="start" class="fascia-start" data-i="${i}" value="${f.start}">
        <input placeholder="end" class="fascia-end" data-i="${i}" value="${f.end}">
      </div>
    `).join("");
  }

  // 🔥 SAVE

  document.getElementById("save").onclick = async () => {

    // aggiorna custom
    document.querySelectorAll(".cf-label").forEach(el=>{
      const f = customFields.find(x=>x.id == el.dataset.id);
      if (f) f.label = el.value;
    });

    document.querySelectorAll(".cf-type").forEach(el=>{
      const f = customFields.find(x=>x.id == el.dataset.id);
      if (f) f.type = el.value;
    });

    document.querySelectorAll(".cf-required").forEach(el=>{
      const f = customFields.find(x=>x.id == el.dataset.id);
      if (f) f.required = el.checked;
    });

    // aggiorna fasce
    document.querySelectorAll(".fascia-start").forEach(el=>{
      fasceOrarie[el.dataset.i].start = el.value;
    });

    document.querySelectorAll(".fascia-end").forEach(el=>{
      fasceOrarie[el.dataset.i].end = el.value;
    });

    const giorni = Array.from(document.querySelectorAll(".giorno:checked"))
      .map(el=>Number(el.value));

    const config = {
      branding: {
        logo_enabled: document.getElementById("logo_enabled").checked,
        logo_url: document.getElementById("logo_url").value || null,
        background_color: document.getElementById("bg_color").value || "#f7f9fc",
        background_image: document.getElementById("bg_image").value || null
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
        giorni,
        orari: fasceOrarie
      },
      tags: document.getElementById("tags").value
        .split(",")
        .map(t=>t.trim())
        .filter(Boolean),
      policy: {
        enabled: document.getElementById("policy_enabled").checked,
        text: document.getElementById("policy_text").value
      }
    };

    const nome = document.getElementById("nome").value;

    const { data: form } = await window.supabaseClient
      .from("booking_forms")
      .insert([{
        azienda_id: aziendaId,
        sede_id: sedeId,
        nome,
        config
      }])
      .select()
      .single();

    await window.supabaseClient
      .from("booking_form_versions")
      .insert([{
        form_id: form.id,
        versione: 1,
        config
      }]);

    document.getElementById("msg").innerText = "✅ Form creato";

  };

}
