// js/views/crea-azienda.js
// =======================================
// Creazione nuova azienda (PIATTAFORMA)
// =======================================

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

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  // 🔒 SOLO PIATTAFORMA (admin OK)
  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Accesso negato</h3>
          <p>Questa sezione è riservata alla piattaforma.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Crea nuova azienda</h2>
        <p class="login-subtitle">Aggiungi un’azienda cliente</p>

        <form id="azienda-form">
          <label>
            Nome azienda
            <input id="az-nome" class="input-pill" required />
          </label>

          <label>
            Codice azienda
            <input id="az-codice" class="input-pill" required />
          </label>

          <label>
            PIN accesso
            <input id="az-pin" class="input-pill" required />
          </label>

          <button class="app-button green" type="submit">
            Crea azienda
          </button>
        </form>

        <p id="azienda-error" class="login-error"></p>
      </div>
    </div>
  `;

  const form = document.getElementById("azienda-form");
  const errorEl = document.getElementById("azienda-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const nome = document.getElementById("az-nome").value.trim();
    const codice = document.getElementById("az-codice").value.trim();
    const pin = document.getElementById("az-pin").value.trim();

    if (!nome || !codice || !pin) {
      errorEl.textContent = "Compila tutti i campi.";
      return;
    }

    try {
      const { data: azienda, error } = await supabase
        .from("aziende")
        .insert({
          nome,
          codice,
          pin_accesso: pin,
          stato: "attiva",
          attiva: true,
          features: DEFAULT_FEATURES,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("utenti_aziende").insert({
        user_id: user.id,
        azienda_id: azienda.id,
        ruolo: "admin",
        attivo: true,
      });

      window.location.hash = "#/gestione-aziende";
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}
