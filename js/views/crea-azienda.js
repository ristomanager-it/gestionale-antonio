// js/views/crea-azienda.js
// =======================================
// Crea Azienda - VERSIONE DEFINITIVA BASE
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
    <div class="view">
      <h2>Nuova Azienda</h2>
      <p style="margin-bottom:20px;">Inserisci i dati base per attivare un nuovo cliente.</p>

      <div class="kpi-card" style="margin-bottom:20px;">
        <h3>Dati Base</h3>

        <form id="azienda-form" style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">

          <label>
            Nome commerciale
            <input id="az-nome" class="input-pill" required />
          </label>

          <label>
            Codice azienda
            <input id="az-codice" class="input-pill" required />
          </label>

          <label>
            PIN accesso azienda
            <input id="az-pin" class="input-pill" required />
          </label>

          <label>
            Email principale
            <input id="az-email" type="email" class="input-pill" />
          </label>

          <label>
            Referente
            <input id="az-referente" class="input-pill" />
          </label>

          <label>
            Data scadenza
            <input id="az-scadenza" type="date" class="input-pill" />
          </label>

          <label style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="az-attiva" checked />
            Azienda attiva
          </label>

          <button class="app-button green" type="submit">
            Crea azienda
          </button>

          <p id="azienda-error" style="color:#dc2626;"></p>

        </form>
      </div>

      <button 
        class="app-button gray small" 
        onclick="window.location.hash='#/home'">
        ⬅ Torna alla dashboard
      </button>
    </div>
  `;

  document
    .getElementById("azienda-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("az-nome").value.trim();
      const codice = document.getElementById("az-codice").value.trim();
      const pin = document.getElementById("az-pin").value.trim();
      const email = document.getElementById("az-email").value.trim();
      const referente = document.getElementById("az-referente").value.trim();
      const data_scadenza = document.getElementById("az-scadenza").value;
      const attiva = document.getElementById("az-attiva").checked;

      try {
        const { data: azienda, error } = await supabase
          .from("aziende")
          .insert({
            nome,
            codice,
            pin_accesso: pin,
            email,
            referente,
            data_scadenza: data_scadenza || null,
            attiva,
            stato: attiva ? "attiva" : "sospesa",
            features: DEFAULT_FEATURES,
          })
          .select()
          .single();

        if (error) throw error;

        // collega il superadmin come admin dell’azienda creata
        await supabase.from("utenti_aziende").insert({
          user_id: user.id,
          azienda_id: azienda.id,
          ruolo: "admin",
          attivo: true,
        });

        window.location.hash = "#/home";
      } catch (err) {
        document.getElementById("azienda-error").textContent =
          err.message;
      }
    });
}
