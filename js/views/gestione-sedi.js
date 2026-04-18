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

  const sediMax = azienda?.sedi_max || 1;
  const sediUsate = sedi.length;
  const canCreate = sediUsate < sediMax;

  // 👉 PRIMA SEDE
  if (sedi.length === 0 || mode === "first") {
    renderWizardPrimaSede(container, azienda.id);
    return;
  }

  // 👉 GESTIONE
  if (mode === "manage") {
    renderGestioneSedi(container, sedi);
    return;
  }

  // 👉 AUTOSELECT INTELLIGENTE
  if (!window.state.sedeAttiva) {
    if (sedi.length === 1) {
      window.stateActions.setSedeAttiva(sedi[0].id);
      window.location.hash = "#/home";
      return;
    }

    const stored = localStorage.getItem("active_sede_id");
    if (stored) {
      window.stateActions.setSedeAttiva(stored);
      window.location.hash = "#/home";
      return;
    }
  }

  renderSelezioneSede(container, sedi, { sediMax, sediUsate, canCreate });
}


/* =========================
SELEZIONE
========================= */

function renderSelezioneSede(container, sedi, meta) {

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

      ${meta.canCreate ? `
        <button class="app-button" onclick="window.location.hash='#/gestione-sedi?mode=first'">
          + Nuova sede
        </button>
      ` : ""}

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

          <div style="margin-top:8px; display:flex; gap:8px;">
            <button onclick="editSede('${s.id}','${s.nome}')">Modifica</button>
            <button onclick="disattivaSede('${s.id}')">Disattiva</button>
          </div>

        </div>
      `).join("")}

      <button class="app-button" onclick="window.location.hash='#/gestione-sedi'">
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

      <h2>Crea prima sede</h2>

      <div class="card">

        <input id="nome" class="input" placeholder="Nome sede" />
        <input id="indirizzo" class="input" placeholder="Indirizzo" />

        <button id="save" class="app-button">Crea sede</button>

      </div>

    </div>
  `;

  document.getElementById("save").onclick = async () => {

    const nome = document.getElementById("nome").value;
    const indirizzo = document.getElementById("indirizzo").value;

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
        attiva: true
      })
      .select()
      .single();

    if(error){
      console.error(error);
      alert("Errore creazione sede");
      return;
    }

    // 👉 aggiorna stato centrale
    await window.stateActions.caricaSedi();

    // 👉 setta attiva automaticamente
    window.stateActions.setSedeAttiva(data.id);

    window.location.hash = "#/home";
  };
}


/* =========================
EDIT
========================= */

window.editSede = async function(id, nome){

  const nuovo = prompt("Nuovo nome", nome);
  if(!nuovo) return;

  await supabase
    .from("sedi")
    .update({ nome: nuovo })
    .eq("id", id);

  await window.stateActions.caricaSedi();
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
