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

  const { data: azienda } = await supabase
    .from("aziende")
    .select("*")
    .eq("id", id)
    .single();

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Configurazione Azienda</h2>

      <div style="margin-top:20px;">
        <h3>Logo Azienda</h3>

        ${azienda.logo_url ? `
          <div style="margin-bottom:12px;">
            <img src="${azienda.logo_url}" style="max-width:120px; border-radius:12px;" />
          </div>
        ` : "<p class='small-muted'>Nessun logo caricato</p>"}

        <input type="file" id="az-logo" accept="image/*" class="input-pill" />

        <button id="btn-upload-logo" class="app-button small gray" style="margin-top:10px;">
          Aggiorna Logo
        </button>

        <p id="logo-error" style="color:#dc2626;"></p>
      </div>
    </div>
  `;

  document.getElementById("btn-upload-logo").onclick = async () => {
    const file = document.getElementById("az-logo").files[0];
    if (!file) return;

    const ext = file.name.split(".").pop();
    const filePath = `logos/${id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("loghi-aziende")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

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

    if (window.state.azienda && window.state.azienda.id === id) {
      window.state.azienda.logo_path = filePath;
      window.state.azienda.logo_url = data.publicUrl;
    }

    alert("Logo aggiornato");
    window.location.reload();
  };
}
