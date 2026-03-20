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

  if (dipendente.profilo_completato) {
    window.location.hash = "#/home";
    return;
  }

  const content = `

  <div style="max-width:900px;margin:auto;width:100%;">

    <form id="profilo-form">

      <div class="crea-grid">

        <!-- DATI PERSONALI -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Dati personali</div>

          <div class="form-group">
            <label>Telefono</label>
            <input id="telefono" class="input" value="${dipendente.telefono || ""}">
          </div>

          <div class="form-group">
            <label>Data nascita</label>
            <input id="data_nascita" type="date" class="input" value="${dipendente.data_nascita || ""}">
          </div>

          <div class="form-group">
            <label>Luogo nascita</label>
            <input id="luogo_nascita" class="input" value="${dipendente.luogo_nascita || ""}">
          </div>

          <div class="form-group">
            <label>Codice fiscale</label>
            <input id="codice_fiscale" class="input" value="${dipendente.codice_fiscale || ""}">
          </div>

        </div>

        <!-- RESIDENZA -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Residenza</div>

          <div class="form-group">
            <label>Indirizzo</label>
            <input id="indirizzo" class="input" value="${dipendente.indirizzo || ""}">
          </div>

          <div class="form-group">
            <label>Città / Residenza</label>
            <input id="residenza" class="input" value="${dipendente.residenza || ""}">
          </div>

        </div>

        <!-- DATI BANCARI -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Dati bancari</div>

          <div class="form-group">
            <label>IBAN</label>
            <input id="iban" class="input" value="${dipendente.iban || ""}">
          </div>

        </div>

        <!-- CONTATTO EMERGENZA -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Contatto emergenza</div>

          <div class="form-group">
            <label>Nome</label>
            <input id="em_nome" class="input" value="${dipendente.contatto_emergenza_nome || ""}">
          </div>

          <div class="form-group">
            <label>Telefono</label>
            <input id="em_tel" class="input" value="${dipendente.contatto_emergenza_telefono || ""}">
          </div>

        </div>

        <!-- AI -->
        <div class="card">
          <div style="font-weight:700;margin-bottom:12px;">Crescita</div>

          <div class="form-group">
            <label>Obiettivi personali</label>
            <textarea id="obiettivi_personali" class="input"></textarea>
          </div>

          <div class="form-group">
            <label>Obiettivi professionali</label>
            <textarea id="obiettivi_professionali" class="input"></textarea>
          </div>

          <div class="form-group">
            <label>Tipo crescita</label>
            <input id="tipo_crescita" class="input">
          </div>

          <div class="form-group">
            <label>Ruolo target</label>
            <input id="ruolo_target" class="input">
          </div>

        </div>

      </div>

      <div style="margin-top:20px;">
        <button class="app-button primary" id="btn-save" style="width:100%;">
          Completa profilo
        </button>
      </div>

    </form>

    <div id="msg" style="margin-top:14px;"></div>

  </div>
  `;

  container.innerHTML = createPageLayout({
    title: "Completa profilo",
    subtitle: "Inserisci i tuoi dati",
    content: createCard({ body: content })
  });

  const form = document.getElementById("profilo-form");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btn-save");

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const profilo_ai = {
      obiettivi_personali: document.getElementById("obiettivi_personali").value,
      obiettivi_professionali: document.getElementById("obiettivi_professionali").value,
      tipo_crescita: document.getElementById("tipo_crescita").value,
      ruolo_target: document.getElementById("ruolo_target").value
    };

    btn.disabled = true;
    btn.innerText = "Salvataggio...";

    const { error } = await supabase
      .from("dipendenti")
      .update({
        telefono: document.getElementById("telefono").value,
        data_nascita: document.getElementById("data_nascita").value,
        luogo_nascita: document.getElementById("luogo_nascita").value,
        codice_fiscale: document.getElementById("codice_fiscale").value,
        indirizzo: document.getElementById("indirizzo").value,
        residenza: document.getElementById("residenza").value,
        iban: document.getElementById("iban").value,
        contatto_emergenza_nome: document.getElementById("em_nome").value,
        contatto_emergenza_telefono: document.getElementById("em_tel").value,
        profilo_ai,
        profilo_completato: true
      })
      .eq("id", dipendente.id);

    if (error) {
      msg.innerHTML = "<span style='color:red;'>Errore salvataggio</span>";
      btn.disabled = false;
      btn.innerText = "Completa profilo";
      return;
    }

    window.location.hash = "#/home";
  });

}
