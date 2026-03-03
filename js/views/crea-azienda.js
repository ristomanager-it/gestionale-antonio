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

  // 🔹 Carica piani dinamicamente
  const { data: piani, error: pianiError } = await supabase
    .from("piani_abbonamento")
    .select("id, nome, prezzo_mensile, sedi_max")
    .order("prezzo_mensile", { ascending: true });

  if (pianiError) {
    container.innerHTML = createPageLayout({
      title: "Errore",
      content: createCard({
        body: `<p>Errore caricamento piani abbonamento.</p>`
      })
    });
    return;
  }

  const optionsPiani = (piani || [])
    .map(
      (p) => `
        <option value="${p.id}">
          ${p.nome.toUpperCase()} — ${p.sedi_max} sedi max — €${p.prezzo_mensile}/mese
        </option>
      `
    )
    .join("");

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
        Piano abbonamento
        <select id="az-piano" class="input-pill" required>
          <option value="">Seleziona piano</option>
          ${optionsPiani}
        </select>
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
    const pianoId = document.getElementById("az-piano").value;
    const email = document
      .getElementById("az-email-amministrativa")
      .value.trim()
      .toLowerCase();
    const telefono = document.getElementById("az-telefono").value.trim();

    if (!pianoId) {
      errorEl.textContent = "Seleziona un piano abbonamento.";
      return;
    }

    try {
      const { error } = await supabase.functions.invoke(
        "create-azienda",
        {
          body: {
            nome,
            codice,
            piano_id: pianoId,
            email_amministrativa: email,
            telefono_amministrativo: telefono || null,
            features: DEFAULT_FEATURES,
          },
        }
      );

      if (error) throw error;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo:
            window.location.origin + "/#/reset-password",
        });

      if (resetError) throw resetError;

      alert(
        "Azienda creata con successo.\n\nÈ stata inviata un'email per creare la password."
      );

      window.location.hash = "#/gestione-aziende";

    } catch (err) {
      console.error("create-azienda error:", err);
      errorEl.textContent =
        err?.message || "Errore durante la creazione dell'azienda.";
    }
  });
}
