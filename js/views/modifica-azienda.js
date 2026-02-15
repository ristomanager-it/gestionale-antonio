import { supabase } from "../supabaseClient.js";

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

  const dataScadenzaValue = azienda.data_scadenza
    ? String(azienda.data_scadenza).slice(0, 10)
    : "";

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Configurazione Azienda</h2>

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

      <div class="card-block" style="margin-top:20px;">
        <h3>Gestione Password Cliente</h3>

        ${
          azienda.email_amministrativa
            ? `
          <p class="small-muted">
            Email login: <strong>${esc(
              azienda.email_amministrativa
            )}</strong>
          </p>

          <button id="btn-reset-password" class="app-button small gray">
            Rigenera Password
          </button>

          <p id="password-info" style="margin-top:10px;"></p>
        `
            : `
          <p style="color:#dc2626;">
            Nessuna email amministrativa impostata.
          </p>
        `
        }
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

  const formStato = document.getElementById("form-stato");

  formStato.onsubmit = async (e) => {
    e.preventDefault();

    const payload = {
      stato: document.getElementById("az-stato").value,
      attiva: document.getElementById("az-attiva").value === "true",
      data_scadenza:
        document.getElementById("az-scadenza").value || null,
    };

    const { error: upErr } = await supabase
      .from("aziende")
      .update(payload)
      .eq("id", id);

    if (upErr) {
      alert(upErr.message);
      return;
    }

    alert("Stato azienda aggiornato");
    window.location.reload();
  };

  const btnReset = document.getElementById("btn-reset-password");

  if (btnReset) {
    btnReset.onclick = async () => {
      const conferma = confirm(
        "Vuoi rigenerare la password del cliente? La vecchia password non sarà più valida."
      );
      if (!conferma) return;

      const { data: sessionData } =
        await supabase.auth.getSession();

      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        alert("Sessione non valida. Effettua nuovamente il login.");
        return;
      }

      const response = await fetch(
        "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/reset-password-admin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: azienda.email_amministrativa,
          }),
        }
      );

      const result = await response.json();
      const infoEl = document.getElementById("password-info");

      if (!response.ok) {
        infoEl.style.color = "#dc2626";
        infoEl.textContent =
          result?.error || "Errore reset password.";
        return;
      }

      infoEl.style.color = "#16a34a";
      infoEl.innerHTML = `
        Nuova password generata:<br>
        <strong>${esc(result.password)}</strong><br>
        Comunicala al cliente. Non sarà più visibile.
      `;
    };
  }
}
