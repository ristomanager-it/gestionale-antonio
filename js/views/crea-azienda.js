// js/views/crea-azienda.js
import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

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
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({
        body: `<p>Sezione riservata alla piattaforma.</p>`
      })
    });
    return;
  }

  const content = `
    <form id="azienda-form" class="form-stack">

      <label>
        Nome azienda
        <input id="az-nome" class="input-pill" required />
      </label>

      <label>
        Codice azienda
        <input id="az-codice" class="input-pill" required />
      </label>

      <label>
        Email amministrativa (sarà anche email admin)
        <input id="az-email-amministrativa" type="email" class="input-pill" required />
      </label>

      <label>
        Telefono amministrativo
        <input id="az-telefono" class="input-pill" />
      </label>

      <button type="submit" class="app-button green">
        Crea azienda
      </button>

    </form>

    <p id="azienda-error" style="color:#dc2626; margin-top:12px;"></p>

    <div style="margin-top:24px;">
      <button class="app-button small gray" id="btn-home">
        ⬅ Dashboard
      </button>
    </div>
  `;

  container.innerHTML = createPageLayout({
    title: "Crea Azienda",
    subtitle: "Provisioning nuova azienda + admin",
    content: createCard({ body: content })
  });

  document.getElementById("btn-home").onclick = () => {
    window.location.hash = "#/home";
  };

  const form = document.getElementById("azienda-form");
  const errorEl = document.getElementById("azienda-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const nome = document.getElementById("az-nome").value.trim();
    const codice = document.getElementById("az-codice").value.trim();
    const email = document
      .getElementById("az-email-amministrativa")
      .value.trim()
      .toLowerCase();
    const telefono = document.getElementById("az-telefono").value.trim();

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-azienda",
        {
          body: {
            nome,
            codice,
            email_amministrativa: email,
            telefono_amministrativo: telefono || null,
            features: DEFAULT_FEATURES,
          },
        }
      );

      if (error) throw error;

      alert(
        "Azienda creata con successo.\n\nÈ stata inviata un'email per impostare la password dell'admin."
      );

      window.location.hash = "#/gestione-aziende";
    } catch (err) {
      console.error("create-azienda error:", err);
      errorEl.textContent =
        err?.message || "Errore durante la creazione dell'azienda.";
    }
  });
}
