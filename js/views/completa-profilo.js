import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {

  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  // ✅ ACCESSO CORRETTO (NO piattaforma check)
  if (!user || !aziendaAttiva) {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({
        body: "<p>Utente o azienda non validi.</p>"
      })
    });
    return;
  }

  // 🔥 PRENDO DIPENDENTE
  const { data: dipendente, error: dipErr } = await supabase
    .from("dipendenti")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (dipErr || !dipendente) {
    container.innerHTML = createPageLayout({
      title: "Errore",
      content: createCard({
        body: "<p>Dipendente non trovato.</p>"
      })
    });
    return;
  }

  // 🔥 SE GIÀ COMPLETATO → VAI HOME
  if (dipendente.profilo_completato) {
    window.location.hash = "#/home";
    return;
  }

  const content = `

  <div style="max-width:900px;margin:auto;width:100%;">

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      margin-bottom:20px;
      flex-wrap:wrap;
    ">
      <div>
        <div style="font-size:13px;color:#6b7280;">Onboarding</div>
        <div style="font-size:22px;font-weight:700;">Completa il tuo profilo</div>
      </div>
    </div>

    <form id="profilo-form">

      <div class="crea-grid">

        <!-- DATI PERSONALI -->
        <div class="card">

          <div style="font-weight:700;margin-bottom:12px;">
            Dati personali
          </div>

          <div class="form-group">
            <label>Nome</label>
            <input class="input" value="${dipendente.nome || ""}" disabled>
          </div>

          <div class="form-group">
            <label>Cognome</label>
            <input class="input" value="${dipendente.cognome || ""}" disabled>
          </div>

          <div class="form-group">
            <label>Telefono</label>
            <input id="telefono" class="input" value="${dipendente.telefono || ""}">
          </div>

        </div>

        <!-- OBIETTIVI -->
        <div class="card">

          <div style="font-weight:700;margin-bottom:12px;">
            Obiettivi
          </div>

          <div class="form-group">
            <label>Obiettivi personali</label>
            <textarea id="obiettivi_personali" class="input"></textarea>
          </div>

          <div class="form-group">
            <label>Obiettivi professionali</label>
            <textarea id="obiettivi_professionali" class="input"></textarea>
          </div>

        </div>

        <!-- CRESCITA -->
        <div class="card">

          <div style="font-weight:700;margin-bottom:12px;">
            Crescita
          </div>

          <div class="form-group">
            <label>Tipo crescita</label>
            <input id="tipo_crescita" class="input" placeholder="es. tecnica / manageriale">
          </div>

          <div class="form-group">
            <label>Ruolo target</label>
            <input id="ruolo_target" class="input" placeholder="es. responsabile cucina">
          </div>

        </div>

      </div>

      <div style="margin-top:20px;">
        <button class="app-button primary" id="btn-submit" style="width:100%;">
          Completa profilo
        </button>
      </div>

    </form>

    <div id="msg"
      style="margin-top:14px;color:#dc2626;font-size:14px;">
    </div>

  </div>

  `;

  container.innerHTML = createPageLayout({
    title: "Completa Profilo",
    subtitle: "Onboarding dipendente",
    content: createCard({ body: content })
  });

  const form = document.getElementById("profilo-form");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btn-submit");

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    msg.textContent = "";

    const telefono = document.getElementById("telefono").value.trim();

    const profilo_ai = {
      obiettivi_personali: document.getElementById("obiettivi_personali").value,
      obiettivi_professionali: document.getElementById("obiettivi_professionali").value,
      tipo_crescita: document.getElementById("tipo_crescita").value,
      ruolo_target: document.getElementById("ruolo_target").value
    };

    btn.disabled = true;
    btn.textContent = "Salvataggio...";

    try {

      const { error } = await supabase
        .from("dipendenti")
        .update({
          telefono,
          profilo_ai,
          profilo_completato: true
        })
        .eq("id", dipendente.id);

      if (error) throw error;

      msg.style.color = "#16a34a";
      msg.textContent = "Profilo completato ✔";

      setTimeout(() => {
        window.location.hash = "#/home";
      }, 800);

    } catch (err) {

      console.error(err);
      msg.textContent = err.message || "Errore salvataggio";

      btn.disabled = false;
      btn.textContent = "Completa profilo";

    }

  });

}
