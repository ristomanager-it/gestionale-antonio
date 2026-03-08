import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {

  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({
        body: `<p>Sezione riservata alla piattaforma.</p>`,
      }),
    });
    return;
  }

  const content = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:14px;">
      <div>
        <div style="font-size:14px; color:#6b7280;">Provisioning</div>
        <div style="margin-top:4px; font-weight:700; font-size:18px;">Nuova azienda cliente</div>
        <div style="margin-top:6px; font-size:13px; color:#6b7280;">
          Crea azienda + utente admin. Verrà inviata email per impostare la password.
        </div>
      </div>

      <button class="app-button small gray" id="btn-home-top">⬅ Dashboard</button>
    </div>

    <form id="azienda-form" class="form-stack">

      <div style="
        display:grid;
        gap:14px;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      ">

        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:18px; padding:16px;">
          <div style="font-weight:700; margin-bottom:10px;">Dati azienda</div>

          <label>
            Nome azienda
            <input id="az-nome" class="input-pill" required placeholder="Es. Ristorante Demo SRL" />
          </label>

          <label>
            Codice azienda
            <input id="az-codice" class="input-pill" required placeholder="Es. DEMO001" />
          </label>
        </div>

        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:18px; padding:16px;">
          <div style="font-weight:700; margin-bottom:10px;">Admin</div>

          <label>
            Email amministrativa
            <input id="az-email-amministrativa" type="email" class="input-pill" required placeholder="Es. admin@cliente.it" />
          </label>

        </div>

      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">
        <button type="submit" class="app-button green" id="btn-submit">
          Crea azienda
        </button>

        <button type="button" class="app-button small gray" id="btn-home">
          ⬅ Dashboard
        </button>
      </div>

    </form>

    <div id="azienda-error" style="margin-top:12px; color:#dc2626;"></div>
  `;

  container.innerHTML = createPageLayout({
    title: "Crea Azienda",
    subtitle: "Piattaforma",
    content: createCard({ body: content }),
  });

  const goHome = () => (window.location.hash = "#/homePiattaforma");

  document.getElementById("btn-home")?.addEventListener("click", goHome);
  document.getElementById("btn-home-top")?.addEventListener("click", goHome);

  const form = document.getElementById("azienda-form");
  const errorEl = document.getElementById("azienda-error");
  const btnSubmit = document.getElementById("btn-submit");

  form.addEventListener("submit", async (e) => {

    e.preventDefault();
    errorEl.textContent = "";

    const nome = document.getElementById("az-nome").value.trim();
    const codice = document.getElementById("az-codice").value.trim();

    const email = document
      .getElementById("az-email-amministrativa")
      .value.trim()
      .toLowerCase();

    const prevText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Creazione in corso...";

    try {

      const { data, error } =
        await supabase.functions.invoke("create-azienda", {
          body: {
            nome: nome,
            codice: codice,
            email_amministrativa: email
          }
        });

      if (error) throw error;

      alert(
        "Azienda creata con successo.\n\nÈ stata inviata un'email per creare la password."
      );

      window.location.hash = "#/gestioneAziende";

    } catch (err) {

      console.error("create-azienda error:", err);

      errorEl.textContent =
        err?.message ||
        "Errore durante la creazione dell'azienda.";

    } finally {

      btnSubmit.disabled = false;
      btnSubmit.textContent = prevText;

    }

  });

}
