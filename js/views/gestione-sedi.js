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
CREAZIONE PRIMA SEDE
========================= */

function renderWizardPrimaSede(container, aziendaId){

  container.innerHTML = `
    <div class="view">

      <h2>Crea sede</h2>

      <div class="card">

        <input id="nome" class="input" placeholder="Nome sede" />
        <input id="indirizzo" class="input" placeholder="Indirizzo" />
        <input id="logo" class="input" placeholder="URL logo (opzionale)" />

        <button id="save" class="app-button">Crea sede</button>

      </div>

    </div>
  `;

  document.getElementById("save").onclick = async () => {

    const nome = document.getElementById("nome").value;
    const indirizzo = document.getElementById("indirizzo").value;
    const logo = document.getElementById("logo").value;

    if(!nome){
      alert("Nome obbligatorio");
      return;
    }

    const { data, error } = await supabase
      .from("sedi")
      .insert({
        azienda_id: aziendaId,
        nome,
        indirizzo,
        logo_url: logo || null,
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
MODIFICA COMPLETA
========================= */

window.editSede = async function(id){

  const sede = window.state.sedi.find(s => String(s.id) === String(id));
  if(!sede) return;

  const nome = prompt("Nome sede", sede.nome);
  if(!nome) return;

  const indirizzo = prompt("Indirizzo", sede.indirizzo || "");
  const logo = prompt("URL logo", sede.logo_url || "");

  const { error } = await supabase
    .from("sedi")
    .update({
      nome,
      indirizzo,
      logo_url: logo || null
    })
    .eq("id", id);

  if(error){
    console.error(error);
    alert("Errore aggiornamento sede");
    return;
  }

  await window.stateActions.caricaSedi();

  // 🔥 aggiorna subito header/logo se sede attiva
  if (window.state?.sedeAttiva?.id === id) {
    window.stateActions.setSedeAttiva(id);
  }

  location.reload();
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
