// js/views/modifica-azienda.js
import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

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

  const id = window.routeParams?.id;

  if (!id) {
    container.innerHTML = `<p>ID azienda mancante</p>`;
    return;
  }

  const { data: azienda, error } = await supabase
    .from("aziende")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !azienda) {
    container.innerHTML = `<p>Errore caricamento azienda</p>`;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Modifica Azienda</h2>

      <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">

        <label>
          Nome commerciale
          <input id="f_nome" class="input-pill" value="${azienda.nome || ""}" />
        </label>

        <label>
          Codice
          <input id="f_codice" class="input-pill" value="${azienda.codice || ""}" />
        </label>

        <label>
          Email
          <input id="f_email" class="input-pill" value="${azienda.email || ""}" />
        </label>

        <label>
          Referente
          <input id="f_referente" class="input-pill" value="${azienda.referente || ""}" />
        </label>

        <label>
          Partita IVA
          <input id="f_piva" class="input-pill" value="${azienda.partita_iva || ""}" />
        </label>

        <label>
          Stato
          <select id="f_stato" class="input-pill">
            <option value="attiva" ${azienda.stato === "attiva" ? "selected" : ""}>Attiva</option>
            <option value="sospesa" ${azienda.stato === "sospesa" ? "selected" : ""}>Sospesa</option>
          </select>
        </label>

        <button class="app-button green" id="btn-save">
          Salva modifiche
        </button>

        <button class="app-button small gray" id="btn-back">
          ⬅ Torna alla lista
        </button>

        <p id="msg"></p>
      </div>
    </div>
  `;

  document.getElementById("btn-back").onclick = () => {
    window.location.hash = "#/gestioneAziende";
  };

  document.getElementById("btn-save").onclick = async () => {
    const payload = {
      nome: document.getElementById("f_nome").value.trim(),
      codice: document.getElementById("f_codice").value.trim(),
      email: document.getElementById("f_email").value.trim(),
      referente: document.getElementById("f_referente").value.trim(),
      partita_iva: document.getElementById("f_piva").value.trim(),
      stato: document.getElementById("f_stato").value
    };

    const { error } = await supabase
      .from("aziende")
      .update(payload)
      .eq("id", id);

    if (error) {
      document.getElementById("msg").innerText =
        "Errore: " + error.message;
      document.getElementById("msg").style.color = "#dc2626";
      return;
    }

    document.getElementById("msg").innerText =
      "Salvataggio riuscito ✅";
    document.getElementById("msg").style.color = "#16a34a";
  };
}
