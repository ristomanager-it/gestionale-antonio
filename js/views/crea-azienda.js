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

  const { data: piani, error: pianiError } = await supabase
    .from("piani_abbonamento")
    .select("id, nome, prezzo_mensile, sedi_max, attivo")
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

  const pianiAttivi = (piani || []).filter(p => p.attivo !== false);

  const optionsPiani = pianiAttivi
    .map(
      (p) => `
        <option value="${p.id}">
          ${String(p.nome || "").toUpperCase()} — ${p.sedi_max} sedi max — €${p.prezzo_mensile}/mese
        </option>
      `
    )
    .join("");

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
          <div style="font-weight:700; margin-bottom:10px;">Piano</div>

          <label>
            Piano abbonamento
            <select id="az-piano" class="input-pill" required>
              <option value="">Seleziona piano</option>
              ${optionsPiani}
            </select>
          </label>

          <div id="piano-hint" style="margin-top:10px; font-size:13px; color:#6b7280;"></div>
        </div>

        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:18px; padding:16px;">
          <div style="font-weight:700; margin-bottom:10px;">Admin</div>

          <label>
            Email amministrativa
            <input id="az-email-amministrativa" type="email" class="input-pill" required placeholder="Es. admin@cliente.it" />
          </label>

          <label>
            Telefono amministrativo
            <input id="az-telefono" class="input-pill" placeholder="Opzionale" />
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
    content: createCard({ body: content })
  });

  const goHome = () => (window.location.hash = "#/homePiattaforma");
  const btnHome = document.getElementById("btn-home");
  const btnHomeTop = document.getElementById("btn-home-top");
  if (btnHome) btnHome.onclick = goHome;
  if (btnHomeTop) btnHomeTop.onclick = goHome;

  const pianoSelect = document.getElementById("az-piano");
  const pianoHint = document.getElementById("piano-hint");

  const renderPianoHint = () => {
    const id = pianoSelect.value;
    if (!id) {
      pianoHint.textContent = "Seleziona un piano per vedere il riepilogo.";
      return;
    }
    const p = pianiAttivi.find(x => x.id === id);
    if (!p) {
      pianoHint.textContent = "";
      return;
    }
    pianoHint.innerHTML = `
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <span style="background:white; border:1px solid #e5e7eb; border-radius:999px; padding:6px 10px;">
          Sedi max: <strong>${p.sedi_max}</strong>
        </span>
        <span style="background:white; border:1px solid #e5e7eb; border-radius:999px; padding:6px 10px;">
          Prezzo: <strong>€${p.prezzo_mensile}/mese</strong>
        </span>
      </div>
    `;
  };

  renderPianoHint();
  pianoSelect.addEventListener("change", renderPianoHint);

  const form = document.getElementById("azienda-form");
  const errorEl = document.getElementById("azienda-error");
  const btnSubmit = document.getElementById("btn-submit");

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

    const prevText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Creazione in corso...";

    try {
      const { error } = await supabase.functions.invoke("create-azienda", {
        body: {
          nome,
          codice,
          piano_id: pianoId,
          email_amministrativa: email,
          telefono_amministrativo: telefono || null,
          features: DEFAULT_FEATURES,
        },
      });

      if (error) throw error;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/#/reset-password",
      });

      if (resetError) throw resetError;

      alert("Azienda creata con successo.\n\nÈ stata inviata un'email per creare la password.");
      window.location.hash = "#/gestioneAziende";
    } catch (err) {
      console.error("create-azienda error:", err);
      errorEl.textContent = err?.message || "Errore durante la creazione dell'azienda.";
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = prevText;
    }
  });
}
