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

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Configurazione Azienda</h2>

      <!-- ATTIVAZIONE -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Attivazione SaaS</h3>
        <p>Stato attivazione: <strong>${esc(
          azienda.stato_attivazione || "bozza"
        )}</strong></p>
      </div>

      <!-- STATO -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Stato Azienda</h3>

        <form id="form-stato" class="form-stack">
          <label>
            Stato operativo
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
            Abilitazione accesso
            <select id="az-attiva" class="input-pill">
              <option value="true" ${
                azienda.attiva !== false ? "selected" : ""
              }>Attiva</option>
              <option value="false" ${
                azienda.attiva === false ? "selected" : ""
              }>Disattiva</option>
            </select>
          </label>

          <label>
            Data scadenza
            <input id="az-scadenza" type="date" class="input-pill" value="${esc(
              dataScadenzaValue
            )}" />
          </label>

          <button type="submit" class="app-button green">
            Salva Stato
          </button>
        </form>
      </div>

      <!-- DATI BASE -->
      <div class="card-block" style="margin-top:20px;">
        <h3>Dati Base</h3>

        <form id="form-base" class="form-stack">
          <label>
            Nome azienda
            <input id="az-nome" class="input-pill" value="${esc(
              azienda.nome
            )}" required />
          </label>

          <label>
            Codice azienda
            <input id="az-codice" class="input-pill" value="${esc(
              azienda.codice
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

      <!-- ANAGRAFICA -->
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
              azienda.partita_iva || ""
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
            <input id="az-email-amm" class="input-pill" value="${esc(
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

      <!-- FEATURES -->
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

        <button id="btn-save-features" class="app-button green" style="margin-top:14px;">
          Salva Funzionalità
        </button>
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

  document.getElementById("form-stato").onsubmit = async (e) => {
    e.preventDefault();

    await supabase.from("aziende").update({
      stato: document.getElementById("az-stato").value,
      attiva: document.getElementById("az-attiva").value === "true",
      data_scadenza:
        document.getElementById("az-scadenza").value || null,
    }).eq("id", id);

    alert("Stato aggiornato");
    window.location.reload();
  };

  document.getElementById("form-base").onsubmit = async (e) => {
    e.preventDefault();

    await supabase.from("aziende").update({
      nome: document.getElementById("az-nome").value.trim(),
      codice: document.getElementById("az-codice").value.trim(),
      pin_accesso: document.getElementById("az-pin").value.trim() || null,
    }).eq("id", id);

    alert("Dati base aggiornati");
  };

  document.getElementById("form-anagrafica").onsubmit = async (e) => {
    e.preventDefault();

    await supabase.from("aziende").update({
      ragione_sociale: document.getElementById("az-ragione").value || null,
      partita_iva: document.getElementById("az-piva").value || null,
      codice_fiscale: document.getElementById("az-cf").value || null,
      email: document.getElementById("az-email").value || null,
      pec: document.getElementById("az-pec").value || null,
      telefono: document.getElementById("az-tel").value || null,
      referente: document.getElementById("az-ref").value || null,
      email_amministrativa:
        document.getElementById("az-email-amm").value || null,
      telefono_amministrativo:
        document.getElementById("az-tel-amm").value || null,
    }).eq("id", id);

    alert("Anagrafica aggiornata");
  };

  document.getElementById("btn-save-features").onclick = async () => {
    const checkboxes = document.querySelectorAll("[data-feature]");
    const newFeatures = {};
    checkboxes.forEach((cb) => {
      newFeatures[cb.dataset.feature] = cb.checked;
    });

    await supabase.from("aziende").update({
      features: newFeatures,
    }).eq("id", id);

    alert("Funzionalità aggiornate");
  };
}
