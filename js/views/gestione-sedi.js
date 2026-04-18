import { supabase } from "../supabaseClient.js";

export async function render(container) {

  const azienda = window.state?.azienda;
  const mode = window.routeParams?.mode || "select";

  if (!azienda?.id) {
    container.innerHTML = `<div class="view">Nessuna azienda attiva</div>`;
    return;
  }

  await window.stateActions.caricaSedi();

  const sedi = window.state.sedi || [];

  if (sedi.length === 0 || mode === "first") {
    renderWizardPrimaSede(container, azienda.id);
    return;
  }

  if (mode === "manage") {
    renderGestioneSedi(container, sedi);
    return;
  }

  renderSelezioneSede(container, sedi);
}


/* =========================
SELEZIONE
========================= */

function renderSelezioneSede(container, sedi) {

  container.innerHTML = `
    <div class="view">
      <h2>Seleziona sede</h2>

      ${sedi.map(s => `
        <div class="card" style="margin-bottom:10px; cursor:pointer;"
          onclick="selectSede('${s.id}')">

          <div style="font-weight:700;">${s.nome}</div>
          <div style="font-size:12px; opacity:0.7;">${s.indirizzo || ""}</div>

        </div>
      `).join("")}

    </div>
  `;
}

window.selectSede = function(id){
  window.stateActions.setSedeAttiva(id);
  window.location.hash = "#/home";
};


/* =========================
GESTIONE
========================= */

function renderGestioneSedi(container, sedi){

  container.innerHTML = `
    <div class="view">

      <h2>Gestione sedi</h2>

      ${sedi.map(s => `
        <div class="card" style="margin-bottom:10px;">

          <div style="font-weight:700;">${s.nome}</div>
          <div style="font-size:12px; opacity:0.7;">${s.indirizzo || ""}</div>

          ${s.logo_url ? `<img src="${s.logo_url}" style="height:40px; margin-top:6px;" />` : ""}

          <div style="margin-top:8px; display:flex; gap:8px;">
            <button onclick="editSede('${s.id}')">Modifica</button>
            <button onclick="disattivaSede('${s.id}')">Disattiva</button>
          </div>

        </div>
      `).join("")}

      <button class="app-button" onclick="window.location.hash='#/home'">
        ← Torna
      </button>

    </div>
  `
}


/* =========================
CREAZIONE
========================= */

function renderWizardPrimaSede(container, aziendaId){

  container.innerHTML = `
    <div class="view">

      <h2>Crea sede</h2>

      <div class="card">

        <input id="nome" class="input" placeholder="Nome sede" />
        <input id="indirizzo" class="input" placeholder="Indirizzo" />
        <input type="file" id="logoFile" />

        <button id="save" class="app-button">Crea sede</button>

      </div>

    </div>
  `;

  document.getElementById("save").onclick = async () => {

    const nome = document.getElementById("nome").value;
    const indirizzo = document.getElementById("indirizzo").value;
    const file = document.getElementById("logoFile").files[0];

    if(!nome){
      alert("Nome obbligatorio");
      return;
    }

    let logo_url = null;

    if (file) {
      logo_url = await uploadLogo(file, aziendaId);
    }

    const { data, error } = await supabase
      .from("sedi")
      .insert({
        azienda_id: aziendaId,
        nome,
        indirizzo,
        logo_url,
        attiva: true
      })
      .select()
      .single();

    if(error){
      console.error(error);
      alert("Errore creazione sede");
      return;
    }

    await window.stateActions.caricaSedi();
    window.stateActions.setSedeAttiva(data.id);

    window.location.hash = "#/home";
  };
}


/* =========================
MODIFICA
========================= */

window.editSede = async function(id){

  const sede = window.state.sedi.find(s => String(s.id) === String(id));
  if(!sede) return;

  const html = `
    <div class="view">
      <h3>Modifica sede</h3>

      <input id="edit-nome" value="${sede.nome}" />
      <input id="edit-indirizzo" value="${sede.indirizzo || ""}" />
      <input type="file" id="edit-logo" />

      <button id="saveEdit">Salva</button>
    </div>
  `;

  document.body.innerHTML = html;

  document.getElementById("saveEdit").onclick = async () => {

    const nome = document.getElementById("edit-nome").value;
    const indirizzo = document.getElementById("edit-indirizzo").value;
    const file = document.getElementById("edit-logo").files[0];

    let logo_url = sede.logo_url;

    if (file) {
      logo_url = await uploadLogo(file, sede.azienda_id);
    }

    const { error } = await supabase
      .from("sedi")
      .update({
        nome,
        indirizzo,
        logo_url
      })
      .eq("id", id);

    if(error){
      console.error(error);
      alert("Errore aggiornamento");
      return;
    }

    await window.stateActions.caricaSedi();

    if (window.state?.sedeAttiva?.id === id) {
      window.stateActions.setSedeAttiva(id);
    }

    location.reload();
  };
}


/* =========================
UPLOAD LOGO
========================= */

async function uploadLogo(file, aziendaId){

  const fileExt = file.name.split(".").pop();
  const fileName = `${aziendaId}_${Date.now()}.${fileExt}`;
  const filePath = `loghi/${fileName}`;

  const { error } = await supabase.storage
    .from("loghi-aziende")
    .upload(filePath, file, {
      upsert: true
    });

  if(error){
    console.error(error);
    alert("Errore upload logo");
    return null;
  }

  const { data } = supabase.storage
    .from("loghi-aziende")
    .getPublicUrl(filePath);

  return data.publicUrl;
}


/* =========================
DISATTIVA
========================= */

window.disattivaSede = async function(id){

  if(!confirm("Disattivare sede?")) return;

  await supabase
    .from("sedi")
    .update({ attiva: false })
    .eq("id", id);

  await window.stateActions.caricaSedi();
  location.reload();
}
