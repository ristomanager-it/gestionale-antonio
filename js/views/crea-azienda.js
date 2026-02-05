// js/views/crea-azienda.js
// =======================================
// Creazione nuova azienda (SOLO SUPERADMIN)
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

  // 🔒 SOLO PIATTAFORMA
  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    window.location.hash = "#/home";
    return;
  }

  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Crea nuova azienda</h2>
        <p class="login-subtitle">
          Inserisci i dati dell’azienda cliente
        </p>

        <form id="azienda-form">
          <label>
            Nome azienda
            <input id="az-nome" class="input-pill" required />
          </label>

          <label>
            Codice azienda (univoco)
            <input id="az-codice" class="input-pill" required />
          </label>

          <label>
            PIN accesso
            <input id="az-pin" class="input-pill" required />
          </label>

          <label>
            Data scadenza (opzionale)
            <input id="az-scadenza" type="date" class="input-pill" />
          </label>

          <div style="display:flex; gap:8px; margin-top:12px;">
            <button class="app-button green" type="submit">
              Crea azienda
            </button>

            <button
              type="button"
              class="app-button"
              onclick="window.location.hash='#/gestione-aziende'"
            >
              Annulla
            </button>
          </div>
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
    const scadenza = document.getElementById("az-scadenza").value || null;

    if (!nome || !codice || !pin) {
      errorEl.textContent = "Compila tutti i campi obbligatori.";
      return;
    }

    try {
      // 1️⃣ CREA AZIENDA
      const { data: azienda, error: errAzienda } = await supabase
        .from("aziende")
        .insert({
          nome,
          codice,
          pin_accesso: pin,
          stato: "attiva",
          attiva: true,
          features: DEFAULT_FEATURES,
          data_scadenza: scadenza,
        })
        .select()
        .single();

      if (errAzienda) throw errAzienda;

      // 2️⃣ COLLEGA UTENTE COME ADMIN DELL’AZIENDA
      const { error: errRel } = await supabase
        .from("utenti_aziende")
        .insert({
          user_id: user.id,
          azienda_id: azienda.id,
          ruolo: "admin",
          attivo: true,
        });

      if (errRel) throw errRel;

      // 3️⃣ TORNA ALLA GESTIONE AZIENDE
      window.location.hash = "#/gestione-aziende";
    } catch (err) {
      console.error(err);
      errorEl.textContent =
        err.message || "Errore durante la creazione dell’azienda";
    }
  });
}
