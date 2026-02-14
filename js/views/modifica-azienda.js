// js/views/modifica-azienda.js
import { supabase } from "../supabaseClient.js";

function getIdFromHash() {
  // Esempio hash: "#/modificaAzienda?id=UUID"
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

  // 🔒 accesso solo piattaforma
  const user = window.state?.user;
  const aziendaAttiva = window.state?.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Accesso negato</h3>
          <p>Sezione riservata alla piattaforma.</p>
          <p class="small-muted" style="margin-top:10px;">
            Azienda attiva: ${esc(aziendaAttiva?.nome)} (${esc(aziendaAttiva?.stato)})
          </p>
        </div>
      </div>
    `;
    return;
  }

  if (!id) {
    container.innerHTML = `
      <div class="view">
        <h3>Nessuna azienda selezionata</h3>
        <p class="small-muted">
          ID mancante nell’URL. Link atteso: <code>#/modificaAzienda?id=UUID</code>
        </p>
        <p class="small-muted">Hash attuale: <code>${esc(window.location.hash)}</code></p>

        <div style="margin-top:14px;">
          <button class="app-button small gray" id="btn-back">
            ⬅ Torna a Gestione Aziende
          </button>
        </div>
      </div>
    `;
    document.getElementById("btn-back").onclick = () => {
      window.location.hash = "#/gestioneAziende";
    };
    return;
  }

  // UI loading
  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Modifica Azienda</h2>
      <p class="small-muted">Caricamento azienda…</p>
      <p class="small-muted">ID: <code>${esc(id)}</code></p>
      <p class="small-muted">Hash: <code>${esc(window.location.hash)}</code></p>
    </div>
  `;

  // 🔥 Carico dal DB (se RLS blocca, qui vediamo l’errore A SCHERMO)
  const { data: azienda, error } = await supabase
    .from("aziende")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    container.innerHTML = `
      <div class="view">
        <h3>Errore caricamento azienda</h3>
        <p style="color:#dc2626; font-weight:600;">${esc(error.message)}</p>
        <p class="small-muted">Dettagli:</p>
        <pre style="white-space:pre-wrap; font-size:12px; background:#111827; color:#e5e7eb; padding:10px; border-radius:12px;">${esc(JSON.stringify(error, null, 2))}</pre>

        <div style="margin-top:14px;">
          <button class="app-button small gray" id="btn-back">
            ⬅ Torna a Gestione Aziende
          </button>
        </div>
      </div>
    `;
    document.getElementById("btn-back").onclick = () => {
      window.location.hash = "#/gestioneAziende";
    };
    return;
  }

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <h3>Azienda non trovata</h3>
        <p class="small-muted">ID: <code>${esc(id)}</code></p>
        <p class="small-muted">Probabile causa: RLS (permessi) o record inesistente.</p>

        <div style="margin-top:14px;">
          <button class="app-button small gray" id="btn-back">
            ⬅ Torna a Gestione Aziende
          </button>
        </div>
      </div>
    `;
    document.getElementById("btn-back").onclick = () => {
      window.location.hash = "#/gestioneAziende";
    };
    return;
  }

  // ✅ Render form
  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Modifica Azienda</h2>

      <form id="modifica-form" class="form-stack">

        <label>
          Nome azienda
          <input id="az-nome" class="input-pill" value="${esc(azienda.nome)}" required />
        </label>

        <label>
          Codice azienda
          <input id="az-codice" class="input-pill" value="${esc(azienda.codice)}" required />
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
          <input id="az-scadenza" type="date" class="input-pill" value="${azienda.data_scadenza ? esc(String(azienda.data_scadenza).slice(0,10)) : ""}" />
        </label>

        <button type="submit" class="app-button green">
          Salva modifiche
        </button>
      </form>

      <p id="modifica-error" style="color:#dc2626; margin-top:10px;"></p>

      <div style="margin-top:20px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="app-button small gray" id="btn-back">
          ⬅ Torna a Gestione Aziende
        </button>
      </div>

      <div style="margin-top:14px;">
        <p class="small-muted">
          Debug: ID <code>${esc(id)}</code> • Hash <code>${esc(window.location.hash)}</code>
        </p>
      </div>
    </div>
  `;

  document.getElementById("btn-back").onclick = () => {
    window.location.hash = "#/gestioneAziende";
  };

  document.getElementById("modifica-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("az-nome").value.trim();
    const codice = document.getElementById("az-codice").value.trim();
    const stato = document.getElementById("az-stato").value;
    const attiva = document.getElementById("az-attiva").value === "true";
    const data_scadenza = document.getElementById("az-scadenza").value || null;

    const errorEl = document.getElementById("modifica-error");
    errorEl.textContent = "";

    const { error: upErr } = await supabase
      .from("aziende")
      .update({ nome, codice, stato, attiva, data_scadenza })
      .eq("id", id);

    if (upErr) {
      errorEl.textContent = upErr.message;
      return;
    }

    window.location.hash = "#/gestioneAziende";
  });
}
