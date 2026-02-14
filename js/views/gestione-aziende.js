// js/views/modifica-azienda.js
import { supabase } from "../supabaseClient.js";

function getIdFromHash() {
  const raw = window.location.hash || "";
  const qIndex = raw.indexOf("?");
  if (qIndex === -1) return null;
  const qs = raw.slice(qIndex + 1);
  const sp = new URLSearchParams(qs);
  return sp.get("id");
}

export async function render(container) {
  const id = getIdFromHash();

  if (!id) {
    container.innerHTML = `<div class="view"><h3>ID non valido</h3></div>`;
    return;
  }

  const { data: azienda, error } = await supabase
    .from("aziende")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !azienda) {
    container.innerHTML = `
      <div class="view">
        <h3>Azienda non trovata</h3>
        <p style="color:#dc2626;">${error?.message || ""}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Configurazione Azienda</h2>

      <!-- CARD IDENTITÀ -->
      <div class="card-block">
        <h3>Dati Base</h3>

        <form id="form-base" class="form-stack">

          <label>
            Nome azienda
            <input id="az-nome" class="input-pill" value="${azienda.nome || ""}" required />
          </label>

          <label>
            Codice azienda
            <input id="az-codice" class="input-pill" value="${azienda.codice || ""}" required />
          </label>

          <label>
            PIN accesso
            <input id="az-pin" class="input-pill" value="${azienda.pin_accesso || ""}" required />
          </label>

          <label>
            Stato
            <select id="az-stato" class="input-pill">
              <option value="attiva" ${azienda.stato === "attiva" ? "selected" : ""}>Attiva</option>
              <option value="sospesa" ${azienda.stato === "sospesa" ? "selected" : ""}>Sospesa</option>
              <option value="piattaforma" ${azienda.stato === "piattaforma" ? "selected" : ""}>Piattaforma</option>
            </select>
          </label>

          <label>
            Attiva
            <select id="az-attiva" class="input-pill">
              <option value="true" ${azienda.attiva !== false ? "selected" : ""}>Sì</option>
              <option value="false" ${azienda.attiva === false ? "selected" : ""}>No</option>
            </select>
          </label>

          <label>
            Data scadenza
            <input id="az-scadenza" type="date" class="input-pill"
              value="${azienda.data_scadenza ? String(azienda.data_scadenza).slice(0,10) : ""}" />
          </label>

          <button type="submit" class="app-button green">
            Salva Dati Base
          </button>

        </form>
      </div>

      <!-- CARD LOGO -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Logo Azienda</h3>

        ${azienda.logo_url ? `
          <div style="margin-bottom:12px;">
            <img src="${azienda.logo_url}" 
                 style="max-width:120px; border-radius:12px;" />
          </div>
        ` : "<p class='small-muted'>Nessun logo caricato</p>"}

        <input type="file" id="az-logo" accept="image/*" class="input-pill" />

        <button id="btn-upload-logo" class="app-button small gray" style="margin-top:10px;">
          Aggiorna Logo
        </button>

        <p id="logo-error" style="color:#dc2626;"></p>
      </div>

      <!-- CARD ANAGRAFICA -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Anagrafica</h3>

        <form id="form-anagrafica" class="form-stack">

          <label>
            Ragione sociale
            <input id="az-ragione" class="input-pill" value="${azienda.ragione_sociale || ""}" />
          </label>

          <label>
            Partita IVA
            <input id="az-piva" class="input-pill" value="${azienda.partita_iva || ""}" />
          </label>

          <label>
            Codice Fiscale
            <input id="az-cf" class="input-pill" value="${azienda.codice_fiscale || ""}" />
          </label>

          <label>
            Email
            <input id="az-email" class="input-pill" value="${azienda.email || ""}" />
          </label>

          <label>
            PEC
            <input id="az-pec" class="input-pill" value="${azienda.pec || ""}" />
          </label>

          <label>
            Telefono
            <input id="az-tel" class="input-pill" value="${azienda.telefono || ""}" />
          </label>

          <label>
            Referente
            <input id="az-ref" class="input-pill" value="${azienda.referente || ""}" />
          </label>

          <button type="submit" class="app-button green">
            Salva Anagrafica
          </button>

        </form>
      </div>

      <div style="margin-top:20px;">
        <button class="app-button small gray" id="btn-back">
          ⬅ Torna a Gestione Aziende
        </button>
      </div>
    </div>
  `;

  document.getElementById("btn-back").onclick = () => {
    window.location.hash = "#/gestioneAziende";
  };

  // 🔹 SALVA BASE
  document.getElementById("form-base").onsubmit = async (e) => {
    e.preventDefault();

    await supabase.from("aziende").update({
      nome: document.getElementById("az-nome").value.trim(),
      codice: document.getElementById("az-codice").value.trim(),
      pin_accesso: document.getElementById("az-pin").value.trim(),
      stato: document.getElementById("az-stato").value,
      attiva: document.getElementById("az-attiva").value === "true",
      data_scadenza: document.getElementById("az-scadenza").value || null,
    }).eq("id", id);

    alert("Dati base aggiornati");
  };

  // 🔹 SALVA ANAGRAFICA
  document.getElementById("form-anagrafica").onsubmit = async (e) => {
    e.preventDefault();

    await supabase.from("aziende").update({
      ragione_sociale: document.getElementById("az-ragione").value.trim(),
      partita_iva: document.getElementById("az-piva").value.trim(),
      codice_fiscale: document.getElementById("az-cf").value.trim(),
      email: document.getElementById("az-email").value.trim(),
      pec: document.getElementById("az-pec").value.trim(),
      telefono: document.getElementById("az-tel").value.trim(),
      referente: document.getElementById("az-ref").value.trim(),
    }).eq("id", id);

    alert("Anagrafica aggiornata");
  };

  // 🔹 UPLOAD LOGO
  document.getElementById("btn-upload-logo").onclick = async () => {
    const file = document.getElementById("az-logo").files[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("loghi-aziende")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      document.getElementById("logo-error").textContent = uploadError.message;
      return;
    }

    const { data } = supabase.storage
      .from("loghi-aziende")
      .getPublicUrl(filePath);

    await supabase.from("aziende")
      .update({
        logo_path: filePath,
        logo_url: data.publicUrl,
      })
      .eq("id", id);

    alert("Logo aggiornato");
    window.location.reload();
  };
}
