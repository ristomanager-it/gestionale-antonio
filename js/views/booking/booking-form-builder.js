export async function render(container) {

  const aziendaId = window.state.azienda?.id;
  const sedeId = window.state.sedeSelezionata?.id;

  container.innerHTML = `
    <div style="padding:16px; max-width:600px; margin:0 auto;">

      <h2>Booking Form Builder</h2>

      <input id="nome" class="input" placeholder="Nome form">

      <hr>

      <h3>Branding</h3>

      <label>
        <input type="checkbox" id="logo_enabled" checked>
        Mostra logo
      </label>

      <input id="bg_color" class="input" placeholder="Colore sfondo (#f7f9fc)">

      <hr>

      <h3>Testi</h3>

      <input id="title" class="input" placeholder="Titolo">
      <input id="subtitle" class="input" placeholder="Sottotitolo">

      <hr>

      <h3>Campi</h3>

      <label><input type="checkbox" id="allergie"> Allergie</label><br>
      <label><input type="checkbox" id="note" checked> Note</label>

      <hr>

      <h3>Disponibilità</h3>

      <input id="orari_start" class="input" placeholder="Ora inizio (19:00)">
      <input id="orari_end" class="input" placeholder="Ora fine (23:00)">

      <hr>

      <h3>Policy</h3>

      <label><input type="checkbox" id="policy_enabled"> Attiva policy</label>
      <textarea id="policy_text" class="input" placeholder="Testo policy"></textarea>

      <hr>

      <button id="save" class="app-button primary">Salva</button>

      <div id="msg"></div>

    </div>
  `;

  document.getElementById("save").onclick = async () => {

    const config = {
      branding: {
        logo_enabled: document.getElementById("logo_enabled").checked,
        background_color: document.getElementById("bg_color").value || "#f7f9fc"
      },
      text: {
        title: document.getElementById("title").value,
        subtitle: document.getElementById("subtitle").value
      },
      fields: {
        allergie: document.getElementById("allergie").checked,
        note: document.getElementById("note").checked,
        custom: []
      },
      availability: {
        giorni: [1,2,3,4,5,6],
        orari: [{
          start: document.getElementById("orari_start").value,
          end: document.getElementById("orari_end").value
        }]
      },
      policy: {
        enabled: document.getElementById("policy_enabled").checked,
        text: document.getElementById("policy_text").value
      }
    };

    const nome = document.getElementById("nome").value;

    const { data: form, error } = await window.supabaseClient
      .from("booking_forms")
      .insert([{
        azienda_id: aziendaId,
        sede_id: sedeId,
        nome,
        config
      }])
      .select()
      .single();

    if (error) {
      document.getElementById("msg").innerText = error.message;
      return;
    }

    // 🔥 CREA VERSIONE 1
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
