// js/views/modifica-azienda.js
import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;
  const id = window.routeParams?.id;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Accesso negato</h3>
          <p>Sezione riservata alla piattaforma.</p>
        </div>
      </div>
    `;
    return;
  }

  if (!id) {
    container.innerHTML = `
      <div class="view">
        <h3>ID azienda mancante</h3>
        <button class="app-button small gray" onclick="window.location.hash='#/gestioneAziende'">
          ⬅ Torna indietro
        </button>
      </div>
    `;
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
        <button class="app-button small gray" onclick="window.location.hash='#/gestioneAziende'">
          ⬅ Torna indietro
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2>Modifica Azienda</h2>

      <div style="display:grid; gap:12px; margin-top:16px;">

        <input class="input-pill" id="nome" placeholder="Nome" value="${azienda.nome || ""}" />
        <input class="input-pill" id="ragione_sociale" placeholder="Ragione Sociale" value="${azienda.ragione_sociale || ""}" />
        <input class="input-pill" id="partita_iva" placeholder="Partita IVA" value="${azienda.partita_iva || ""}" />
        <input class="input-pill" id="codice_fiscale" placeholder="Codice Fiscale" value="${azienda.codice_fiscale || ""}" />
        <input class="input-pill" id="email" placeholder="Email" value="${azienda.email || ""}" />
        <input class="input-pill" id="telefono" placeholder="Telefono" value="${azienda.telefono || ""}" />
        <input class="input-pill" id="referente" placeholder="Referente" value="${azienda.referente || ""}" />

        <input class="input-pill" id="indirizzo" placeholder="Indirizzo" value="${azienda.indirizzo || ""}" />
        <input class="input-pill" id="citta" placeholder="Città" value="${azienda.citta || ""}" />
        <input class="input-pill" id="cap" placeholder="CAP" value="${azienda.cap || ""}" />
        <input class="input-pill" id="provincia" placeholder="Provincia" value="${azienda.provincia || ""}" />

        <input class="input-pill" type="date" id="data_scadenza" value="${azienda.data_scadenza || ""}" />

        <select class="input-pill" id="piano">
          <option value="basic" ${azienda.piano === "basic" ? "selected" : ""}>Basic</option>
          <option value="pro" ${azienda.piano === "pro" ? "selected" : ""}>Pro</option>
          <option value="enterprise" ${azienda.piano === "enterprise" ? "selected" : ""}>Enterprise</option>
        </select>

        <select class="input-pill" id="stato">
          <option value="attiva" ${azienda.stato === "attiva" ? "selected" : ""}>Attiva</option>
          <option value="sospesa" ${azienda.stato === "sospesa" ? "selected" : ""}>Sospesa</option>
        </select>

      </div>

      <div style="margin-top:20px; display:flex; gap:10px;">
        <button class="app-button" id="btn-save">💾 Salva modifiche</button>
        <button class="app-button small gray" id="btn-back">⬅ Indietro</button>
      </div>

      <div id="save-result" style="margin-top:12px;"></div>
    </div>
  `;

  document.getElementById("btn-back").onclick = () => {
    window.location.hash = "#/gestioneAziende";
  };

  document.getElementById("btn-save").onclick = async () => {
    const updateData = {
      nome: document.getElementById("nome").value.trim(),
      ragione_sociale: document.getElementById("ragione_sociale").value.trim(),
      partita_iva: document.getElementById("partita_iva").value.trim(),
      codice_fiscale: document.getElementById("codice_fiscale").value.trim(),
      email: document.getElementById("email").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      referente: document.getElementById("referente").value.trim(),
      indirizzo: document.getElementById("indirizzo").value.trim(),
      citta: document.getElementById("citta").value.trim(),
      cap: document.getElementById("cap").value.trim(),
      provincia: document.getElementById("provincia").value.trim(),
      data_scadenza: document.getElementById("data_scadenza").value || null,
      piano: document.getElementById("piano").value,
      stato: document.getElementById("stato").value
    };

    const { error } = await supabase
      .from("aziende")
      .update(updateData)
      .eq("id", id);

    const resultDiv = document.getElementById("save-result");

    if (error) {
      resultDiv.innerHTML = `<span style="color:#dc2626;">Errore salvataggio: ${error.message}</span>`;
      return;
    }

    resultDiv.innerHTML = `<span style="color:#16a34a;">Salvataggio completato ✔</span>`;
  };
}
