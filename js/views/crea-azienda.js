```javascript
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
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:20px;">
      <div>
        <div style="font-size:16px; color:#6b7280;">Provisioning</div>
        <div style="margin-top:4px; font-weight:700; font-size:22px;">Nuova azienda cliente</div>
        <div style="margin-top:6px; font-size:15px; color:#6b7280;">
          Crea azienda cliente e assegna accesso admin.
        </div>
      </div>

      <button class="app-button small gray" id="btn-home-top">⬅ Dashboard</button>
    </div>

    <form id="azienda-form" class="form-stack">

      <div style="
        display:grid;
        gap:20px;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      ">

        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:20px; padding:22px;">
          <div style="font-weight:700; font-size:18px; margin-bottom:16px;">Dati azienda</div>

          <label style="font-size:15px;">
            Nome azienda
            <input id="az-nome" class="input-pill" required placeholder="Es. Ristorante Demo SRL" style="font-size:16px; padding:12px;" />
          </label>

          <label style="font-size:15px;">
            Codice azienda
            <input id="az-codice" class="input-pill" required placeholder="Es. DEMO001" style="font-size:16px; padding:12px;" />
          </label>

          <label style="font-size:15px;">
            Piano di affiliazione
            <select id="az-piano" class="input-pill" style="font-size:16px; padding:12px;">
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>

        </div>

        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:20px; padding:22px;">
          <div style="font-weight:700; font-size:18px; margin-bottom:16px;">Accesso admin</div>

          <label style="font-size:15px;">
            Username
            <input value="admin" disabled class="input-pill" style="font-size:16px; padding:12px;" />
          </label>

          <label style="font-size:15px;">
            Password admin
            <input id="az-password-admin" type="text" class="input-pill" required placeholder="Password iniziale cliente" style="font-size:16px; padding:12px;" />
          </label>

          <label style="font-size:15px;">
            Email amministrativa (contatto)
            <input id="az-email-amministrativa" type="email" class="input-pill" required placeholder="Es. admin@cliente.it" style="font-size:16px; padding:12px;" />
          </label>

        </div>

      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:18px;">
        <button type="submit" class="app-button green" id="btn-submit">
          Crea azienda
        </button>

        <button type="button" class="app-button small gray" id="btn-home">
          ⬅ Dashboard
        </button>
      </div>

    </form>

    <div id="azienda-error" style="margin-top:16px; color:#dc2626; font-size:15px;"></div>
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
    const piano = document.getElementById("az-piano").value;

    const email = document
      .getElementById("az-email-amministrativa")
      .value.trim()
      .toLowerCase();

    const password = document
      .getElementById("az-password-admin")
      .value.trim();

    const prevText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Creazione in corso...";

    try {

      const { data, error } =
        await supabase.functions.invoke("create-azienda", {
          body: {
            nome: nome,
            codice: codice,
            slug: codice.toLowerCase(),
            piano: piano,
            username: "admin",
            email_amministrativa: email,
            password_admin: password
          }
        });

      if (error) throw error;

      const messaggio = `
Accesso Ristoflow

Username: admin
Password: ${password}

Login:
https://ristoflow-ai.com

Email contatto:
${email}
`;

      navigator.clipboard.writeText(messaggio);

      alert("Azienda creata.\nCredenziali copiate negli appunti.");

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
```
