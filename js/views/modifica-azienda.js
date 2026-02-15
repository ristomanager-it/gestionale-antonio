import { supabase } from "../supabaseClient.js";

const DEFAULT_FEATURES = {
  timbrature: true,
  dipendenti: true,
  ricette: true,
  ricettario: true,
  magazzino: true,
  acquisti: true,
  preventivi: true,
  venduto: true,
  report: true,
};

function getIdFromHash() {
  const raw = window.location.hash || "";
  const qIndex = raw.indexOf("?");
  if (qIndex === -1) return null;
  const qs = raw.slice(qIndex + 1);
  const sp = new URLSearchParams(qs);
  return sp.get("id");
}

function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
        <p style="color:#dc2626;">${esc(error?.message || "")}</p>
      </div>
    `;
    return;
  }

  const features = { ...DEFAULT_FEATURES, ...(azienda.features || {}) };

  const dataScadenzaValue = azienda.data_scadenza
    ? String(azienda.data_scadenza).slice(0, 10)
    : "";

  // 🔥 Generazione dinamica URL logo
  let logoUrl = null;
  if (azienda.logo_path) {
    const { data } = supabase.storage
      .from("loghi-aziende")
      .getPublicUrl(azienda.logo_path);
    logoUrl = data?.publicUrl || null;
  }

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Configurazione Azienda</h2>

      <!-- CARD LOGO -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Logo Azienda</h3>

        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-top:12px;">
          ${
            logoUrl
              ? `<img src="${esc(
                  logoUrl
                )}" style="width:90px; height:90px; object-fit:cover; border-radius:18px; background:#f3f4f6;" />`
              : `<div style="width:90px; height:90px; border-radius:18px; background:#e5e7eb; display:flex; align-items:center; justify-content:center; font-size:12px; color:#6b7280;">
                   Nessun logo
                 </div>`
          }

          <div style="flex:1; min-width:200px;">
            <input type="file" id="az-logo" accept="image/*" class="input-pill" />
            <button id="btn-upload-logo" type="button" class="app-button small gray" style="margin-top:10px;">
              Aggiorna Logo
            </button>
            <p id="logo-error" style="color:#dc2626;"></p>
          </div>
        </div>
      </div>

      <!-- CARD DATI BASE -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Dati Base</h3>

        <form id="form-base" class="form-stack">
          <label>
            Nome azienda
            <input id="az-nome" class="input-pill" value="${esc(
              azienda.nome || ""
            )}" required />
          </label>

          <label>
            Codice azienda
            <input id="az-codice" class="input-pill" value="${esc(
              azienda.codice || ""
            )}" required />
          </label>

          <label>
            PIN accesso
            <input id="az-pin" class="input-pill" value="${esc(
              azienda.pin_accesso || ""
            )}" />
          </label>

          <button type="submit" class="app-button green">
            Salva Dati Base
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

  // 🔥 Salvataggio dati base
  document.getElementById("form-base").onsubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from("aziende")
      .update({
        nome: document.getElementById("az-nome").value.trim(),
        codice: document.getElementById("az-codice").value.trim(),
        pin_accesso:
          document.getElementById("az-pin").value.trim() || null,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Dati aggiornati");
  };

  // 🔥 Upload logo (salva SOLO logo_path)
  document.getElementById("btn-upload-logo").onclick = async () => {
    const file = document.getElementById("az-logo").files[0];
    const errorEl = document.getElementById("logo-error");
    errorEl.textContent = "";

    if (!file) return;

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filePath = `logos/${id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("loghi-aziende")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      errorEl.textContent = uploadError.message;
      return;
    }

    const { error: updateError } = await supabase
      .from("aziende")
      .update({
        logo_path: filePath,
      })
      .eq("id", id);

    if (updateError) {
      errorEl.textContent = updateError.message;
      return;
    }

    window.location.reload();
  };
}
