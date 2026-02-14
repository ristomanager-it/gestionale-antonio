// js/views/modifica-azienda.js
import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const azienda = window.state.aziendaSelezionata;

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <h3>Nessuna azienda selezionata</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Modifica Azienda</h2>

      <form id="modifica-form" class="form-stack">

        <label>
          Nome azienda
          <input id="az-nome" class="input-pill" value="${azienda.nome}" required />
        </label>

        <label>
          Codice azienda
          <input id="az-codice" class="input-pill" value="${azienda.codice}" required />
        </label>

        <label>
          Stato
          <select id="az-stato" class="input-pill">
            <option value="attiva" ${azienda.stato === "attiva" ? "selected" : ""}>Attiva</option>
            <option value="sospesa" ${azienda.stato === "sospesa" ? "selected" : ""}>Sospesa</option>
            <option value="piattaforma" ${azienda.stato === "piattaforma" ? "selected" : ""}>Piattaforma</option>
          </select>
        </label>

        <button type="submit" class="app-button green">
          Salva modifiche
        </button>
      </form>

      <p id="modifica-error" style="color:#dc2626;"></p>

      <div style="margin-top:20px;">
        <button class="app-button small gray" id="btn-back">
          ⬅ Torna indietro
        </button>
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

    const errorEl = document.getElementById("modifica-error");

    try {
      const { error } = await supabase
        .from("aziende")
        .update({
          nome,
          codice,
          stato,
        })
        .eq("id", azienda.id);

      if (error) throw error;

      window.location.hash = "#/gestioneAziende";
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}
