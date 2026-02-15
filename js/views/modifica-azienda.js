// js/views/modifica-azienda.js
import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;
  const id = window.routeParams?.id;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Accesso negato</h3>
        </div>
      </div>
    `;
    return;
  }

  const { data: azienda, error } = await supabase
    .from("aziende")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !azienda) {
    container.innerHTML = `<div class="view">Azienda non trovata</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2>Modifica Azienda</h2>

      <!-- CARD LOGO -->
      <div class="view" style="margin-top:16px;">
        <h3>Logo Azienda</h3>

        <div style="margin-top:10px;">
          ${
            azienda.logo_url
              ? `<img src="${azienda.logo_url}" style="max-width:150px; border-radius:12px;" />`
              : `<p class="small-muted">Nessun logo caricato</p>`
          }
        </div>

        <div style="margin-top:10px;">
          <input type="file" id="logo-file" accept="image/*" />
        </div>

        <div style="margin-top:10px;">
          <button class="app-button small gray" id="btn-upload-logo">
            Carica nuovo logo
          </button>
        </div>

        <div id="logo-result" style="margin-top:8px;"></div>
      </div>

      <!-- DATI AZIENDA -->
      <div style="display:grid; gap:12px; margin-top:20px;">
        <input class="input-pill" id="nome" value="${azienda.nome || ""}" placeholder="Nome" />
        <input class="input-pill" id="ragione_sociale" value="${azienda.ragione_sociale || ""}" placeholder="Ragione Sociale" />
        <input class="input-pill" id="partita_iva" value="${azienda.partita_iva || ""}" placeholder="Partita IVA" />
        <input class="input-pill" id="email" value="${azienda.email || ""}" placeholder="Email" />
        <input class="input-pill" id="referente" value="${azienda.referente || ""}" placeholder="Referente" />
        <input class="input-pill" type="date" id="data_scadenza" value="${azienda.data_scadenza || ""}" />
      </div>

      <div style="margin-top:20px; display:flex; gap:10px;">
        <button class="app-button" id="btn-save">💾 Salva</button>
        <button class="app-button small gray" id="btn-back">⬅ Indietro</button>
      </div>

      <div id="save-result" style="margin-top:10px;"></div>
    </div>
  `;

  // 🔙 Torna indietro
  document.getElementById("btn-back").onclick = () => {
    window.location.hash = "#/gestioneAziende";
  };

  // 💾 Salva dati
  document.getElementById("btn-save").onclick = async () => {
    const updateData = {
      nome: document.getElementById("nome").value.trim(),
      ragione_sociale: document.getElementById("ragione_sociale").value.trim(),
      partita_iva: document.getElementById("partita_iva").value.trim(),
      email: document.getElementById("email").value.trim(),
      referente: document.getElementById("referente").value.trim(),
      data_scadenza: document.getElementById("data_scadenza").value || null
    };

    const { error } = await supabase
      .from("aziende")
      .update(updateData)
      .eq("id", id);

    const result = document.getElementById("save-result");

    if (error) {
      result.innerHTML = `<span style="color:#dc2626;">Errore salvataggio</span>`;
      return;
    }

    result.innerHTML = `<span style="color:#16a34a;">Salvato ✔</span>`;
  };

  // 🖼 Upload logo
  document.getElementById("btn-upload-logo").onclick = async () => {
    const fileInput = document.getElementById("logo-file");
    const file = fileInput.files[0];

    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("loghi-aziende")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      document.getElementById("logo-result").innerHTML =
        `<span style="color:#dc2626;">Errore upload</span>`;
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("loghi-aziende")
      .getPublicUrl(filePath);

    await supabase
      .from("aziende")
      .update({
        logo_path: filePath,
        logo_url: publicUrlData.publicUrl
      })
      .eq("id", id);

    document.getElementById("logo-result").innerHTML =
      `<span style="color:#16a34a;">Logo aggiornato ✔</span>`;

    location.reload();
  };
}
