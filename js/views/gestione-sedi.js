import { supabase } from "../supabaseClient.js";

function ruoloAttivo() {
  const raw = window.state?.viewAs || window.state?.ruolo;
  return window.normalizeRuolo ? window.normalizeRuolo(raw) : raw;
}

function puoGestireSedi() {
  return ["admin", "superadmin"].includes(ruoloAttivo());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function backButtonHtml(fallback = "#/home") {
  return `<button class="app-button tiny gray rf-back-button" data-back-fallback="${fallback}">← Indietro</button>`;
}

function bindBackButton(container) {
  const btn = container.querySelector(".rf-back-button");
  if (!btn) return;
  btn.onclick = () => {
    const fallback = btn.dataset.backFallback || "#/home";
    if (window.history.length > 1) {
      window.history.back();
      setTimeout(() => {
        if (!window.location.hash || window.location.hash === "#/gestione-sedi") {
          window.location.hash = fallback;
        }
      }, 200);
    } else {
      window.location.hash = fallback;
    }
  };
}


export async function render(container) {

  const azienda = window.state?.azienda;
  const mode = window.routeParams?.mode || "select";

  if (!azienda?.id) {
    container.innerHTML = `<div class="view">Nessuna azienda attiva</div>`;
    return;
  }

  await window.stateActions.caricaSedi();

  const sedi = window.state.sedi || [];

  if ((sedi.length === 0 || mode === "first") && puoGestireSedi()) {
    renderWizardPrimaSede(container, azienda.id);
    return;
  }

  if (mode === "manage" && puoGestireSedi()) {
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
      ${backButtonHtml("#/home")}
      <h2>Seleziona sede</h2>

      ${sedi.map(s => `
        <div class="card" style="margin-bottom:10px; cursor:pointer;"
          onclick="selectSede('${s.id}')">

          <div style="font-weight:700;">${escapeHtml(s.nome)}</div>
          <div style="font-size:12px; opacity:0.7;">${escapeHtml(s.indirizzo || "")}</div>

        </div>
      `).join("")}

    </div>
  `;

  bindBackButton(container);
}

window.selectSede = function(id){
  window.stateActions.setSedeAttiva(id);
  window.location.hash = "#/home";
};


/* =========================
GESTIONE
========================= */

function renderGestioneSedi(container, sedi){
  if (!puoGestireSedi()) {
    renderSelezioneSede(container, sedi);
    return;
  }

  container.innerHTML = `
    <div class="view">
      ${backButtonHtml("#/gestione-sedi")}

      <h2>Gestione sedi</h2>

      ${sedi.map(s => `
        <div class="card" style="margin-bottom:10px;">

          <div style="font-weight:700;">${escapeHtml(s.nome)}</div>
          <div style="font-size:12px; opacity:0.7;">${escapeHtml(s.indirizzo || "")}</div>

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
  `;

  bindBackButton(container);
}


/* =========================
CREAZIONE
========================= */

function renderWizardPrimaSede(container, aziendaId){
  if (!puoGestireSedi()) {
    window.location.hash = "#/gestione-sedi";
    return;
  }

  container.innerHTML = `
    <div class="view">
      ${backButtonHtml("#/gestione-sedi")}

      <h2>Crea sede</h2>

      <div class="card">

        <input id="nome" class="input" placeholder="Nome sede" />
        <input id="indirizzo" class="input" placeholder="Indirizzo" />
        <input type="file" id="logoFile" />

        <button id="save" class="app-button">Crea sede</button>

      </div>

    </div>
  `;

  bindBackButton(container);

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
  if (!puoGestireSedi()) {
    alert("Non hai i permessi per modificare le sedi.");
    return;
  }

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

    const nuovaSede = window.state.sedi.find(s => String(s.id) === String(id));

    if (nuovaSede) {
      window.state.sedeAttiva = nuovaSede;
      localStorage.setItem("active_sede_id", nuovaSede.id);
    }

    if (window.renderAziendaUI) {
      window.renderAziendaUI();
    }

    window.location.hash = "#/gestione-sedi?mode=manage";
  };
}


/* =========================
UPLOAD LOGO
========================= */

async function uploadLogo(file, aziendaId){

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${aziendaId}/${fileName}`;

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

  return data.publicUrl + "?t=" + Date.now();
}


/* =========================
DISATTIVA
========================= */

window.disattivaSede = async function(id){
  if (!puoGestireSedi()) {
    alert("Non hai i permessi per modificare le sedi.");
    return;
  }

  if(!confirm("Disattivare sede?")) return;

  await supabase
    .from("sedi")
    .update({ attiva: false })
    .eq("id", id);

  await window.stateActions.caricaSedi();
  location.reload();
}
