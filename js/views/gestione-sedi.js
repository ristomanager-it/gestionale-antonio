import { supabase } from "../supabaseClient.js";

export async function render(container) {

  const azienda = window.state?.azienda;
  const mode = window.routeParams?.mode || "select";

  if (!azienda?.id) {
    container.innerHTML = `<div class="view">Nessuna azienda attiva</div>`;
    return;
  }

  const sedi = await caricaSedi(azienda.id);

  window.state.sedi = sedi;

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

  // 👉 AUTOSELECT
  if (sedi.length === 1) {
    localStorage.setItem("active_sede_id", String(sedi[0].id));
    window.location.hash = "#/home";
    return;
  }

  renderSelezioneSede(container, sedi, { sediMax, sediUsate, canCreate });
}


/* =========================
LOAD
========================= */

async function caricaSedi(aziendaId) {

  const { data, error } = await supabase
    .from("sedi")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("attiva", true)  // 🔥 FIX
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}


/* =========================
GESTIONE SEDI (NUOVA)
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
EDIT
========================= */

window.editSede = async function(id, nome){

  const nuovo = prompt("Nuovo nome", nome);
  if(!nuovo) return;

  await supabase
    .from("sedi")
    .update({ nome: nuovo })
    .eq("id", id);

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

  location.reload();
}
