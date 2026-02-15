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
  const statoAttivazione = azienda.stato_attivazione || "bozza";
  const isBozza = statoAttivazione === "bozza";
  const dataScadenzaValue = azienda.data_scadenza
    ? String(azienda.data_scadenza).slice(0, 10)
    : "";

  const emailAdminPrefill =
    azienda.email_admin ||
    azienda.email ||
    azienda.email_amministrativa ||
    azienda.pec ||
    "";

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Configurazione Azienda</h2>

      <!-- CARD ATTIVAZIONE -->
      <div class="card-block" style="margin-top:16px;">
        <h3>Attivazione</h3>
        <p class="small-muted">
          Stato attivazione: <strong>${esc(statoAttivazione)}</strong>
        </p>

        ${
          isBozza
            ? `
          <form id="form-attiva" class="form-stack" style="margin-top:12px;">
            <label>
              Email admin cliente (login)
              <input id="az-email-admin" type="email" class="input-pill" value="${esc(
                emailAdminPrefill
              )}" required />
            </label>

            <button type="submit" class="app-button green">
              Attiva Azienda e invia invito
            </button>

            <p id="attiva-error" style="color:#dc2626;"></p>
            <p class="small-muted">
              L’invito verrà inviato solo dopo l’attivazione. Il cliente creerà la password al primo accesso.
            </p>
          </form>
        `
            : `
          <p class="small-muted" style="margin-top:12px;">
            Azienda già attiva. Se serve reinviare l’invito, usa una nuova funzione dedicata (futuro).
          </p>
        `
        }
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

          <label>
            Stato
            <select id="az-stato" class="input-pill">
              <option value="attiva" ${
                azienda.stato === "attiva" ? "selected" : ""
              }>Attiva</option>
              <option value="sospesa" ${
                azienda.stato === "sospesa" ? "selected" : ""
              }>Sospesa</option>
              <option value="piattaforma" ${
                azienda.stato === "piattaforma" ? "selected" : ""
              }>Piattaforma</option>
            </select>
          </label>

          <label>
            Attiva
            <select id="az-attiva" class="input-pill">
              <option value="true" ${
                azienda.attiva !== false ? "selected" : ""
              }>Sì</option>
              <option value="false" ${
                azienda.attiva === false ? "selected" : ""
              }>No</option>
            </select>
          </label>

          <label>
            Data scadenza
            <input id="az-scadenza" type="date" class="input-pill" value="${esc(
              dataScadenzaValue
            )}" />
          </label>

          <button type="submit" class="app-button green">
            Salva Dati Base
          </button>
        </form>
      </div>

      <!-- CARD LOGO -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Logo Azienda</h3>

        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-top:12px;">
          ${
            azienda.logo_url
              ? `<img src="${esc(
                  azienda.logo_url
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

      <!-- CARD ANAGRAFICA -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Anagrafica</h3>

        <form id="form-anagrafica" class="form-stack">
          <label>
            Ragione sociale
            <input id="az-ragione" class="input-pill" value="${esc(
              azienda.ragione_sociale || ""
            )}" />
          </label>

          <label>
            Partita IVA
            <input id="az-piva" class="input-pill" value="${esc(
              azienda.partita_iva || azienda.partita_iva || ""
            )}" />
          </label>

          <label>
            Codice Fiscale
            <input id="az-cf" class="input-pill" value="${esc(
              azienda.codice_fiscale || ""
            )}" />
          </label>

          <label>
            Email
            <input id="az-email" class="input-pill" value="${esc(
              azienda.email || ""
            )}" />
          </label>

          <label>
            PEC
            <input id="az-pec" class="input-pill" value="${esc(
              azienda.pec || ""
            )}" />
          </label>

          <label>
            Telefono
            <input id="az-tel" class="input-pill" value="${esc(
              azienda.telefono || ""
            )}" />
          </label>

          <label>
            Referente
            <input id="az-ref" class="input-pill" value="${esc(
              azienda.referente || ""
            )}" />
          </label>

          <label>
            Email amministrativa
            <input id="az-email-amm" type="email" class="input-pill" value="${esc(
              azienda.email_amministrativa || ""
            )}" />
          </label>

          <label>
            Telefono amministrativo
            <input id="az-tel-amm" class="input-pill" value="${esc(
              azienda.telefono_amministrativo || ""
            )}" />
          </label>

          <button type="submit" class="app-button green">
            Salva Anagrafica
          </button>
        </form>
      </div>

      <!-- CARD FEATURES -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Funzionalità Attive</h3>

        <form id="form-features" class="features-grid">
          ${Object.keys(features)
            .map(
              (key) => `
            <label class="feature-item">
              <input type="checkbox" data-feature="${esc(key)}" ${
                features[key] ? "checked" : ""
              } />
              ${esc(key)}
            </label>
          `
            )
            .join("")}
        </form>

        <button id="btn-save-features" type="button" class="app-button green" style="margin-top:14px;">
          Salva Funzionalità
        </button>

        <p id="features-error" style="color:#dc2626;"></p>
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

  const formBase = document.getElementById("form-base");
  formBase.onsubmit = async (e) => {
    e.preventDefault();

    const payload = {
      nome: document.getElementById("az-nome").value.trim(),
      codice: document.getElementById("az-codice").value.trim(),
      pin_accesso: document.getElementById("az-pin").value.trim() || null,
      stato: document.getElementById("az-stato").value,
      attiva: document.getElementById("az-attiva").value === "true",
      data_scadenza: document.getElementById("az-scadenza").value || null,
    };

    const { error: upErr } = await supabase
      .from("aziende")
      .update(payload)
      .eq("id", id);

    if (upErr) {
      alert(upErr.message);
      return;
    }

    alert("Dati base aggiornati");
  };

  const formAnag = document.getElementById("form-anagrafica");
  formAnag.onsubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ragione_sociale: document.getElementById("az-ragione").value.trim() || null,
      partiva_iva: null,
      partiva: null,
      partita_iva: document.getElementById("az-piva").value.trim() || null,
      codice_fiscale: document.getElementById("az-cf").value.trim() || null,
      email: document.getElementById("az-email").value.trim() || null,
      pec: document.getElementById("az-pec").value.trim() || null,
      telefono: document.getElementById("az-tel").value.trim() || null,
      referente: document.getElementById("az-ref").value.trim() || null,
      email_amministrativa:
        document.getElementById("az-email-amm").value.trim() || null,
      telefono_amministrativo:
        document.getElementById("az-tel-amm").value.trim() || null,
    };

    const { error: upErr } = await supabase
      .from("aziende")
      .update(payload)
      .eq("id", id);

    if (upErr) {
      alert(upErr.message);
      return;
    }

    alert("Anagrafica aggiornata");
  };

  document.getElementById("btn-save-features").onclick = async () => {
    const errorEl = document.getElementById("features-error");
    errorEl.textContent = "";

    const checkboxes = document.querySelectorAll("[data-feature]");
    const newFeatures = {};
    checkboxes.forEach((cb) => {
      newFeatures[cb.dataset.feature] = cb.checked;
    });

    const { error: upErr } = await supabase
      .from("aziende")
      .update({ features: newFeatures })
      .eq("id", id);

    if (upErr) {
      errorEl.textContent = upErr.message;
      return;
    }

    alert("Funzionalità aggiornate");
  };

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

    const { data: pub } = supabase.storage
      .from("loghi-aziende")
      .getPublicUrl(filePath);

    const { error: upErr } = await supabase
      .from("aziende")
      .update({
        logo_path: filePath,
        logo_url: pub?.publicUrl || null,
      })
      .eq("id", id);

    if (upErr) {
      errorEl.textContent = upErr.message;
      return;
    }

    window.location.reload();
  };

  if (isBozza) {
    const formAttiva = document.getElementById("form-attiva");
    const attivaError = document.getElementById("attiva-error");

    formAttiva.onsubmit = async (e) => {
      e.preventDefault();
      attivaError.textContent = "";

      const emailAdmin = document.getElementById("az-email-admin").value.trim();

      if (!emailAdmin) {
        attivaError.textContent = "Inserisci l’email admin cliente.";
        return;
      }

      const conferma = confirm(
        "Confermi l’attivazione? Verrà inviato l’invito al cliente per creare le credenziali."
      );
      if (!conferma) return;

      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessErr || !accessToken) {
        attivaError.textContent = "Sessione non valida. Fai login e riprova.";
        return;
      }

      const res = await fetch(
        "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/attiva-azienda",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            azienda_id: id,
            email_admin: emailAdmin,
          }),
        }
      );

      let json = null;
      try {
        json = await res.json();
      } catch (_) {
        json = null;
      }

      if (!res.ok) {
        attivaError.textContent =
          json?.error || "Errore attivazione (controlla log Edge Function).";
        return;
      }

      alert("Azienda attivata e invito inviato.");
      window.location.reload();
    };
  }
}
