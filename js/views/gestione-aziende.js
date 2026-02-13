// js/views/gestione-aziende.js
import { supabase } from "../supabaseClient.js";

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
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <h2 style="margin-top:0;">Gestione Aziende</h2>
          <p class="small-muted" style="margin-top:4px;">
            Cerca un’azienda per aprire la scheda.
          </p>
        </div>

        <div style="display:flex; gap:8px;">
          <button class="app-button small gray" id="btn-back-home">
            ⬅ Dashboard
          </button>

          <button class="app-button small green" id="btn-crea">
            + Nuova azienda
          </button>
        </div>
      </div>

      <div style="margin-top:16px;">
        <label style="display:block; font-size:13px; margin-bottom:4px;">
          Cerca azienda
        </label>
        <input 
          id="search-input" 
          class="input-pill" 
          placeholder="Digita nome, codice, P.IVA, email..."
        />
      </div>

      <div id="search-results" style="margin-top:14px;"></div>
    </div>
  `;

  document.getElementById("btn-back-home").onclick = () => {
    window.location.hash = "#/home";
  };

  document.getElementById("btn-crea").onclick = () => {
    window.location.hash = "#/creaAzienda";
  };

  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  let timeout = null;

  input.addEventListener("input", () => {
    clearTimeout(timeout);

    const value = input.value.trim();

    if (value.length < 2) {
      results.innerHTML = `
        <p class="small-muted">
          Digita almeno 2 caratteri per cercare.
        </p>
      `;
      return;
    }

    timeout = setTimeout(() => {
      searchAziende(value);
    }, 300);
  });

  async function searchAziende(query) {
    results.innerHTML = `
      <p class="small-muted">Ricerca in corso...</p>
    `;

    const { data, error } = await supabase
      .from("aziende")
      .select(`
        id,
        nome,
        codice,
        stato,
        attiva,
        data_scadenza,
        email,
        referente
      `)
      .or(`
        nome.ilike.%${query}%,
        codice.ilike.%${query}%,
        email.ilike.%${query}%,
        partita_iva.ilike.%${query}%
      `)
      .limit(20);

    if (error) {
      results.innerHTML = `
        <p style="color:#dc2626;">Errore ricerca: ${error.message}</p>
      `;
      return;
    }

    if (!data || data.length === 0) {
      results.innerHTML = `
        <p class="small-muted">Nessuna azienda trovata.</p>
      `;
      return;
    }

    results.innerHTML = data.map((az) => `
      <div class="azienda-row-card">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div>
            <strong>${az.nome}</strong>
            <div class="small-muted" style="margin-top:4px;">
              Codice: ${az.codice}<br>
              Email: ${az.email || "-"}<br>
              Referente: ${az.referente || "-"}
            </div>
          </div>

          <div>
            <button 
              class="app-button small"
              onclick="window.location.hash='#/modificaAzienda?id=${az.id}'"
            >
              Apri
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }

  results.innerHTML = `
    <p class="small-muted">
      Digita per cercare un’azienda.
    </p>
  `;
}
