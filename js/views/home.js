// js/views/home.js

export async function render(container) {
  const { state } = window;

  if (!state?.user || !state?.azienda) {
    container.innerHTML = `<p>Errore: stato non valido</p>`;
    return;
  }

  const userName =
    state.user.user_metadata?.full_name || state.user.email;

  const azienda = state.azienda;

  // recupero ruolo in modo SAFE
  let ruolo = null;

  if (Array.isArray(state.aziende)) {
    const match = state.aziende.find(
      (row) =>
        row?.aziende &&
        row.aziende.id === azienda.id
    );
    ruolo = match?.ruolo || null;
  }

  container.innerHTML = `
    <div class="home">

      <div class="azienda-header">
        <img
          id="azienda-logo"
          class="azienda-logo"
          alt="Logo azienda"
          style="display:none"
        />

        <div class="azienda-info">
          <div class="azienda-nome">${azienda.nome}</div>
          <div class="azienda-stato">
            ${
              azienda.stato === "piattaforma"
                ? "Piattaforma Ristoflow"
                : "Azienda cliente"
            }
          </div>
        </div>
      </div>

      <div class="utente-info" style="margin-top:12px;">
        Benvenuto, <strong>${userName}</strong>
      </div>

      <div
        id="logo-upload-box"
        style="display:none; margin-top:16px;"
      >
        <label><strong>Logo azienda</strong></label><br/>
        <input id="logo-file" type="file" accept="image/*" />
        <br/>
        <button id="btn-upload-logo" class="app-button">
          Salva logo
        </button>
      </div>

    </div>
  `;

  /* ===========================
     PERMESSI UPLOAD LOGO
  =========================== */

  const canUpload =
    azienda.stato === "piattaforma" ||
    ["admin", "superadmin"].includes(ruolo);

  if (canUpload) {
    document.getElementById("logo-upload-box").style.display = "block";
    setupLogoUpload();
  }

  await renderLogo();
}

/* ===========================
   LOGO — SIGNED URL
=========================== */

async function renderLogo() {
  const img = document.getElementById("azienda-logo");
  if (!img) return;

  const azienda = window.state.azienda;
  if (!azienda?.logo_path) return;

  const { data, error } = await window.supabaseClient.storage
    .from("loghi-aziende")
    .createSignedUrl(azienda.logo_path, 60 * 60);

  if (error) {
    console.warn("Errore caricamento logo:", error.message);
    return;
  }

  img.src = data.signedUrl;
  img.style.display = "block";
}

/* ===========================
   UPLOAD LOGO
=========================== */

function setupLogoUpload() {
  const input = document.getElementById("logo-file");
  const btn = document.getElementById("btn-upload-logo");

  btn.onclick = async () => {
    const file = input.files?.[0];
    if (!file) {
      alert("Seleziona un file");
      return;
    }

    const aziendaId = window.state.azienda.id;
    const ext = file.name.split(".").pop();
    const filePath = `${aziendaId}/logo.${ext}`;

    btn.disabled = true;
    btn.textContent = "Salvataggio...";

    try {
      const { error: uploadError } =
        await window.supabaseClient.storage
          .from("loghi-aziende")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });

      if (uploadError) throw uploadError;

      const { error: dbError } = await window.supabaseClient
        .from("aziende")
        .update({ logo_path: filePath })
        .eq("id", aziendaId);

      if (dbError) throw dbError;

      // aggiorna stato locale
      window.state.azienda = {
        ...window.state.azienda,
        logo_path: filePath,
      };

      await renderLogo();
      alert("Logo aggiornato ✅");
      input.value = "";
    } catch (err) {
      alert("Errore upload logo: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Salva logo";
    }
  };
}
