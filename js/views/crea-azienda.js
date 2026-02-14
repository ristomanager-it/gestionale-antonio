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
      <div class="view">
        <h3>Accesso negato</h3>
        <p>Sezione riservata alla piattaforma.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Crea Azienda</h2>

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
          Email amministrativa
          <input id="az-email-amministrativa" type="email" class="input-pill" required />
        </label>

        <label>
          Telefono amministrativo
          <input id="az-telefono" class="input-pill" required />
        </label>

        <label>
          Email admin cliente (login)
          <input id="az-email-admin" type="email" class="input-pill" required />
        </label>

        <button type="submit" class="app-button green">
          Crea azienda
        </button>

      </form>

      <p id="azienda-error" style="color:#dc2626;"></p>

      <div style="margin-top:20px;">
        <button class="app-button small gray" id="btn-home">
          ⬅ Dashboard
        </button>
      </div>
    </div>
  `;

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
    const emailAmministrativa = document
      .getElementById("az-email-amministrativa")
      .value.trim();
    const telefono = document.getElementById("az-telefono").value.trim();
    const emailAdmin = document
      .getElementById("az-email-admin")
      .value.trim();

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-azienda",
        {
          body: {
            nome,
            codice,
            email_admin: emailAdmin,
            email_amministrativa: emailAmministrativa,
            telefono_amministrativo: telefono,
            features: DEFAULT_FEATURES,
          },
        }
      );

      if (error) throw error;

      alert("Azienda creata con successo. Email di attivazione inviata al cliente.");

      window.location.hash = "#/home";
    } catch (err) {
      console.error(err);
      errorEl.textContent = err.message;
    }
  });
}
