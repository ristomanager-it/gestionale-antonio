import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {

  const user = window.state.user;
  const azienda = window.state.azienda;

  if (!user || !azienda) {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({
        body: "<p>Utente o azienda non validi.</p>"
      })
    });
    return;
  }

  const { data: dipendente, error } = await supabase
    .from("dipendenti")
    .select("*")
    .eq("user_id", user.id)
    .eq("azienda_id", azienda.id)
    .maybeSingle();

  if (error || !dipendente) {
    container.innerHTML = createPageLayout({
      title: "Errore",
      content: createCard({
        body: "<p>Dipendente non trovato.</p>"
      })
    });
    return;
  }

  const profiloAI = normalizeProfiloAI(dipendente.profilo_ai);
  const pinValue = dipendente.pin || dipendente.codice_pin || "";
  const fotoUrl = dipendente.foto_url || "";

  const content = `

  <div style="max-width:900px;margin:auto;width:100%;">

    <form id="profilo-form">

      <div class="crea-grid">

        <!-- DATI PERSONALI -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Dati personali</div>

          <div class="form-group">
            <label>Telefono</label>
            <input id="telefono" class="input" value="${escapeHtmlAttr(dipendente.telefono || "")}">
          </div>

          <div class="form-group">
            <label>PIN personale</label>
            <input
              id="pin"
              class="input"
              inputmode="numeric"
              maxlength="6"
              value="${escapeHtmlAttr(pinValue)}"
              placeholder="Inserisci un PIN da 4 a 6 cifre"
            >
            <div style="font-size:12px;color:#64748b;margin-top:4px;">
              Il PIN servirà per il futuro accesso dipendente.
            </div>
          </div>

          <div class="form-group">
            <label>Data nascita</label>
            <input id="data_nascita" type="date" class="input" value="${escapeHtmlAttr(dipendente.data_nascita || "")}">
          </div>

          <div class="form-group">
            <label>Luogo nascita</label>
            <input id="luogo_nascita" class="input" value="${escapeHtmlAttr(dipendente.luogo_nascita || "")}">
          </div>

          <div class="form-group">
            <label>Codice fiscale</label>
            <input id="codice_fiscale" class="input" value="${escapeHtmlAttr(dipendente.codice_fiscale || "")}">
          </div>

        </div>

        <!-- FOTO PROFILO -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Foto profilo</div>

          <div id="foto-preview" style="margin-bottom:12px;">
            ${
              fotoUrl
                ? `<img src="${escapeHtmlAttr(fotoUrl)}" alt="Foto profilo" style="width:110px;height:110px;border-radius:18px;object-fit:cover;border:1px solid #e5e7eb;background:#f9fafb;">`
                : `<div style="width:110px;height:110px;border-radius:18px;border:1px solid #e5e7eb;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:30px;">👤</div>`
            }
          </div>

          <div class="form-group">
            <label>Carica nuova foto</label>
            <input id="foto" type="file" accept="image/png,image/jpeg" class="input">
            <div style="font-size:12px;color:#64748b;margin-top:4px;">
              Preview locale JPG/PNG. Salvataggio storage non ancora attivo.
            </div>
          </div>

        </div>

        <!-- RESIDENZA -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Residenza</div>

          <div class="form-group">
            <label>Indirizzo</label>
            <input id="indirizzo" class="input" value="${escapeHtmlAttr(dipendente.indirizzo || "")}">
          </div>

          <div class="form-group">
            <label>Città / Residenza</label>
            <input id="residenza" class="input" value="${escapeHtmlAttr(dipendente.residenza || "")}">
          </div>

        </div>

        <!-- DATI BANCARI -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Dati bancari</div>

          <div class="form-group">
            <label>IBAN</label>
            <input id="iban" class="input" value="${escapeHtmlAttr(dipendente.iban || "")}">
          </div>

        </div>

        <!-- CONTATTO EMERGENZA -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Contatto emergenza</div>

          <div class="form-group">
            <label>Nome</label>
            <input id="em_nome" class="input" value="${escapeHtmlAttr(dipendente.contatto_emergenza_nome || "")}">
          </div>

          <div class="form-group">
            <label>Telefono</label>
            <input id="em_tel" class="input" value="${escapeHtmlAttr(dipendente.contatto_emergenza_telefono || "")}">
          </div>

        </div>

        <!-- MOTIVAZIONE -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Motivazione</div>

          <div class="form-group">
            <label>Perché lavori qui?</label>
            <textarea id="motivazione" class="input">${escapeHtml(profiloAI.motivazione || "")}</textarea>
          </div>

          <div class="form-group">
            <label>Cosa ti motiva nel lavoro?</label>
            <textarea id="motivazione_lavoro" class="input">${escapeHtml(profiloAI.motivazione_lavoro || "")}</textarea>
          </div>

        </div>

        <!-- CRESCITA -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Crescita</div>

          <div class="form-group">
            <label>Cosa vuoi migliorare?</label>
            <textarea id="crescita" class="input">${escapeHtml(profiloAI.crescita || profiloAI.obiettivi_personali || "")}</textarea>
          </div>

          <div class="form-group">
            <label>Cosa vuoi imparare?</label>
            <textarea id="competenze" class="input">${escapeHtml(profiloAI.competenze || profiloAI.obiettivi_professionali || "")}</textarea>
          </div>

        </div>

        <!-- DIREZIONE -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Direzione</div>

          <div class="form-group">
            <label>Ruolo futuro desiderato</label>
            <input id="ruolo_target" class="input" value="${escapeHtmlAttr(profiloAI.ruolo_target || "")}">
          </div>

          <div class="form-group">
            <label>Dove ti vedi tra 1 anno?</label>
            <textarea id="visione_futura" class="input">${escapeHtml(profiloAI.visione_futura || "")}</textarea>
          </div>

        </div>

      </div>

      <div style="margin-top:20px;">
        <button class="app-button primary" id="btn-save" style="width:100%;">
          ${dipendente.profilo_completato ? "Salva modifiche" : "Completa profilo"}
        </button>
      </div>

    </form>

    <div id="msg" style="margin-top:14px;"></div>

  </div>
  `;

  container.innerHTML = createPageLayout({
    title: dipendente.profilo_completato ? "Modifica profilo" : "Completa profilo",
    subtitle: dipendente.profilo_completato ? "Aggiorna i tuoi dati personali" : "Inserisci i tuoi dati",
    content: createCard({ body: content })
  });

  const form = document.getElementById("profilo-form");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btn-save");
  const fotoInput = document.getElementById("foto");
  const fotoPreview = document.getElementById("foto-preview");

  if (fotoInput && fotoPreview) {
    fotoInput.addEventListener("change", () => {
      const file = fotoInput.files && fotoInput.files[0] ? fotoInput.files[0] : null;

      if (!file) return;

      const isValidType = file.type === "image/jpeg" || file.type === "image/png";

      if (!isValidType) {
        fotoInput.value = "";
        fotoPreview.innerHTML = "<span style='color:red;'>Formato non valido. Usa JPG o PNG.</span>";
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        fotoPreview.innerHTML = `
          <img
            src="${escapeHtmlAttr(String(reader.result || ""))}"
            alt="Foto profilo"
            style="width:110px;height:110px;border-radius:18px;object-fit:cover;border:1px solid #e5e7eb;background:#f9fafb;"
          >
        `;
      };

      reader.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const pin = document.getElementById("pin").value.trim();

    if (pin && !/^[0-9]{4,6}$/.test(pin)) {
      msg.innerHTML = "<span style='color:red;'>Il PIN deve contenere solo numeri e deve essere lungo da 4 a 6 cifre.</span>";
      return;
    }

    const profilo_ai = {

      // NUOVO MODELLO
      motivazione: document.getElementById("motivazione").value,
      motivazione_lavoro: document.getElementById("motivazione_lavoro").value,
      crescita: document.getElementById("crescita").value,
      competenze: document.getElementById("competenze").value,
      ruolo_target: document.getElementById("ruolo_target").value,
      visione_futura: document.getElementById("visione_futura").value,

      // COMPATIBILITÀ (IMPORTANTISSIMO)
      obiettivi_personali: document.getElementById("crescita").value,
      obiettivi_professionali: document.getElementById("competenze").value,
      tipo_crescita: document.getElementById("crescita").value

    };

    btn.disabled = true;
    btn.innerText = "Salvataggio...";

    const payload = {
      telefono: document.getElementById("telefono").value,
      data_nascita: document.getElementById("data_nascita").value || null,
      luogo_nascita: document.getElementById("luogo_nascita").value,
      codice_fiscale: document.getElementById("codice_fiscale").value,
      indirizzo: document.getElementById("indirizzo").value,
      residenza: document.getElementById("residenza").value,
      iban: document.getElementById("iban").value,
      contatto_emergenza_nome: document.getElementById("em_nome").value,
      contatto_emergenza_telefono: document.getElementById("em_tel").value,
      profilo_ai,
      profilo_completato: true
    };

    if (Object.prototype.hasOwnProperty.call(dipendente, "pin")) {
      payload.pin = pin || null;
    } else if (Object.prototype.hasOwnProperty.call(dipendente, "codice_pin")) {
      payload.codice_pin = pin || null;
    }

    const { error } = await supabase
      .from("dipendenti")
      .update(payload)
      .eq("id", dipendente.id)
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id);

    if (error) {
      console.error("Errore salvataggio profilo:", error);
      msg.innerHTML = "<span style='color:red;'>Errore salvataggio</span>";
      btn.disabled = false;
      btn.innerText = dipendente.profilo_completato ? "Salva modifiche" : "Completa profilo";
      return;
    }

    msg.innerHTML = "<span style='color:green;'>Profilo salvato correttamente ✔</span>";

    setTimeout(() => {
      window.location.hash = "#/home";
    }, 600);

  });

}

function normalizeProfiloAI(profiloAI) {
  if (!profiloAI) return {};

  if (typeof profiloAI === "object") {
    return profiloAI;
  }

  try {
    return JSON.parse(profiloAI);
  } catch (_) {
    return {};
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(str) {
  return escapeHtml(str);
}
