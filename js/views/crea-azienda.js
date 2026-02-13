// js/views/crea-azienda.js
import { supabase } from "../supabaseClient.js";

const BASE_FEATURES = {
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

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

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

  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Crea nuova azienda</h2>

        <form id="azienda-form" class="form-stack">

          <input id="az-nome" placeholder="Nome azienda" required />
          <input id="az-codice" placeholder="Codice azienda" required />
          <input id="az-pin" placeholder="PIN accesso" required />

          <label>
            Stato
            <select id="az-stato">
              <option value="attiva">Attiva</option>
              <option value="sospesa">Sospesa</option>
            </select>
          </label>

          <label>
            Data scadenza
            <input type="date" id="az-scadenza" />
          </label>

          <label class="checkbox-row">
            <input type="checkbox" id="az-attiva" checked />
            Azienda attiva
          </label>

          <hr />

          <h3>Feature abilitate</h3>

          <div id="features-container"></div>

          <button class="app-button green" type="submit">
            Crea azienda
          </button>
        </form>

        <p id="azienda-error" class="login-error"></p>
      </div>
    </div>
  `;

  // --------------------------
  // Render checkbox features
  // --------------------------

  const featuresContainer = document.getElementById("features-container");

  Object.keys(BASE_FEATURES).forEach((key) => {
    featuresContainer.innerHTML += `
      <label class="checkbox-row">
        <input type="checkbox" data-feature="${key}" checked />
        ${key}
      </label>
    `;
  });

  // --------------------------
  // Submit
  // --------------------------

  document
    .getElementById("azienda-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("az-nome").value.trim();
      const codice = document.getElementById("az-codice").value.trim();
      const pin = document.getElementById("az-pin").value.trim();
      const stato = document.getElementById("az-stato").value;
      const data_scadenza = document.getElementById("az-scadenza").value || null;
      const attiva = document.getElementById("az-attiva").checked;

      const featureInputs = document.querySelectorAll("[data-feature]");
      const features = {};

      featureInputs.forEach((input) => {
        const key = input.dataset.feature;
        features[key] = input.checked;
      });

      try {
        // 1️⃣ CREA AZIENDA
        const { data: azienda, error } = await supabase
          .from("aziende")
          .insert({
            nome,
            codice,
            pin_accesso: pin,
            stato,
            data_scadenza,
            attiva,
            features,
          })
          .select()
          .single();

        if (error) throw error;

        // 2️⃣ COLLEGA USER ALL’AZIENDA
        await supabase.from("utenti_aziende").insert({
          user_id: user.id,
          azienda_id: azienda.id,
          ruolo: "admin",
          attivo: true,
        });

        window.location.hash = "#/home";
      } catch (err) {
        document.getElementById("azienda-error").textContent =
          err.message || "Errore durante la creazione";
      }
    });
}
