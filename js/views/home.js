// js/views/home.js

export async function render(container) {
  const state = window.state;

  if (!state?.user || !state?.azienda) {
    container.innerHTML = `<p>Errore: stato non disponibile</p>`;
    return;
  }

  const azienda = state.azienda;
  const userName =
    state.user.user_metadata?.full_name || state.user.email;

  // 🔐 RISOLUZIONE RUOLO (ANTI NULL, ANTI BUG)
  let ruolo = null;

  if (Array.isArray(state.aziende)) {
    for (const row of state.aziende) {
      if (
        row &&
        row.aziende &&
        row.aziende.id === azienda.id
      ) {
        ruolo = row.ruolo;
        break;
      }
    }
  }

  container.innerHTML = `
    <div class="home">

      <div class="azienda-header">
        <img
          id="azienda-logo"
          class="azienda-logo"
          style="display:none"
          alt="Logo azienda"
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
   LOGO AZIENDA
=========================== */

async function renderLogo() {
  const img = document.getElementById("azienda-logo");
  const azienda = window.state.azienda;

  if (!img || !azienda?.logo_path) return;

  const { data, error } =
    await window.supabaseClient.storage
      .from("loghi-aziende")
      .createSignedUrl(azienda.logo_path, 3600);

  if (error) {
    console.warn("Logo non caricato:", error.message);
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
    const path = `${aziendaId}/logo.${ext}`;

    btn.disabled = true;
    btn.textContent = "Salvataggio...";

    try {
      const { error: uploadError } =
        await window.supabaseClient.storage
          .from("loghi-aziende")
          .upload(path, file, {
            upsert: true,
            contentType: file.type,
          });

      if (uploadError) throw uploadError;

      const { error: dbError } =
        await window.supabaseClient
          .from("aziende")
          .update({ logo_path: path })
          .eq("id", aziendaId);

      if (dbError) throw dbError;

      window.state.azienda = {
        ...window.state.azienda,
        logo_path: path,
      };

      await renderLogo();
      alert("Logo aggiornato ✅");
      input.value = "";
    } catch (err) {
      alert("Errore: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Salva logo";
    }
  };
}
