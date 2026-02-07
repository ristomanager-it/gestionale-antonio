// js/views/crea-azienda.js
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
    container.innerHTML = `<p>Accesso negato</p>`;
    return;
  }

  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Crea nuova azienda</h2>

        <form id="azienda-form">
          <input id="az-nome" placeholder="Nome azienda" required />
          <input id="az-codice" placeholder="Codice azienda" required />
          <input id="az-pin" placeholder="PIN accesso" required />
          <button class="app-button green" type="submit">
            Crea azienda
          </button>
        </form>

        <p id="azienda-error" class="login-error"></p>
      </div>
    </div>
  `;

  document
    .getElementById("azienda-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("az-nome").value.trim();
      const codice = document.getElementById("az-codice").value.trim();
      const pin = document.getElementById("az-pin").value.trim();

      try {
        const { data: azienda, error } = await supabase
          .from("aziende")
          .insert({
            nome,
            codice,
            pin_accesso: pin,
            stato: "attiva",
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

        window.location.hash = "#/home";
      } catch (err) {
        document.getElementById("azienda-error").textContent = err.message;
      }
    });
}
