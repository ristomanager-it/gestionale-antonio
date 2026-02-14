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
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <h2 style="margin-top:0;">Configurazione Azienda</h2>

      <!-- CARD LOGO -->
      <div style="margin-top:30px;">

        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          
          ${azienda.logo_url ? `
            <img 
              src="${azienda.logo_url}" 
              style="width:80px; height:80px; object-fit:cover; border-radius:16px; background:#f3f4f6;"
            />
          ` : `
            <div style="width:80px; height:80px; border-radius:16px; background:#e5e7eb; display:flex; align-items:center; justify-content:center; font-size:12px; color:#6b7280;">
              Nessun logo
            </div>
          `}

          <div style="flex:1;">
            <h3 style="margin:0 0 8px 0;">Logo Azienda</h3>

            <input type="file" id="az-logo" accept="image/*" class="input-pill" />

            <button id="btn-upload-logo" class="app-button small gray" style="margin-top:8px;">
              Aggiorna Logo
            </button>

            <p id="logo-error" style="color:#dc2626;"></p>
          </div>

        </div>
      </div>

      <div style="margin-top:30px;">
        <button class="app-button small gray" id="btn-back">
          ⬅ Torna a Gestione Aziende
        </button>
      </div>

    </div>
  `;

  document.getElementById("btn-back").onclick = () => {
    window.location.hash = "#/gestioneAziende";
  };

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
      window.state.azienda.logo_url = data.publicUrl;
      window.state.azienda.logo_path = filePath;
    }

    window.location.reload();
  };
}
