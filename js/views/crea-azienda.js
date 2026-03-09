import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {

  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({
        body: "<p>Sezione riservata alla piattaforma.</p>"
      })
    });
    return;
  }

  /* -----------------------------
     CARICA PIANI ABBONAMENTO
  ----------------------------- */

  const { data: piani } = await supabase
    .from("piani_abbonamento")
    .select("id,nome,prezzo_mensile")
    .order("prezzo_mensile");

  const optionsPiani = (piani || [])
    .map(p =>
      `<option value="${p.id}">
        ${p.nome} - €${p.prezzo_mensile}
      </option>`
    ).join("");

  /* -----------------------------
     UI
  ----------------------------- */

  const content = `

  <div style="max-width:900px;margin:auto;">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:26px;">
      <div>
        <div style="font-size:14px;color:#6b7280;">Provisioning</div>
        <div style="font-size:26px;font-weight:700;">Nuova azienda</div>
      </div>

      <button class="app-button small gray" id="btn-home">
        ⬅ Dashboard
      </button>
    </div>


    <form id="azienda-form">

      <div style="
        display:grid;
        gap:22px;
        grid-template-columns:1fr 1fr;
      ">

        <div class="card-soft">

          <div class="card-title">
            Dati azienda
          </div>

          <label>
            Nome azienda
            <input id="az-nome" required class="input-pill">
          </label>

          <label>
            Codice azienda
            <input id="az-codice" required class="input-pill">
          </label>

          <label>
            Piano abbonamento
            <select id="az-piano" class="input-pill">
              ${optionsPiani}
            </select>
          </label>

        </div>


        <div class="card-soft">

          <div class="card-title">
            Accesso admin
          </div>

          <label>
            Username
            <input value="admin" disabled class="input-pill">
          </label>

          <label>
            Password
            <input id="az-password" required class="input-pill">
          </label>

          <label>
            Email contatto
            <input id="az-email" type="email" required class="input-pill">
          </label>

        </div>

      </div>


      <div style="margin-top:24px;display:flex;gap:10px;flex-wrap:wrap;">

        <button class="app-button green" id="btn-submit">
          Crea azienda
        </button>

      </div>

    </form>

    <div id="error-box"
      style="margin-top:16px;color:#dc2626;font-size:14px;">
    </div>

  </div>

  `;

  container.innerHTML = createPageLayout({
    title: "Crea Azienda",
    subtitle: "Piattaforma",
    content: createCard({ body: content })
  });

  document.getElementById("btn-home").onclick = () => {
    window.location.hash = "#/homePiattaforma";
  };

  const form = document.getElementById("azienda-form");
  const errorBox = document.getElementById("error-box");
  const btn = document.getElementById("btn-submit");

  /* -----------------------------
     SUBMIT
  ----------------------------- */

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    errorBox.textContent = "";

    const nome = document.getElementById("az-nome").value.trim();
    const codice = document.getElementById("az-codice").value.trim();
    const piano_id = document.getElementById("az-piano").value;
    const email = document.getElementById("az-email").value.trim();
    const password = document.getElementById("az-password").value.trim();

    btn.disabled = true;
    btn.textContent = "Creazione...";

    try {

      /* -----------------------------
         CREA AZIENDA
      ----------------------------- */

      const { data: azienda, error: aziendaError } =
        await supabase
          .from("aziende")
          .insert({
            nome: nome,
            codice: codice,
            slug: codice.toLowerCase(),
            piano_id: piano_id,
            email_amministrativa: email,
            stato: "attiva",
            stato_attivazione: "bozza"
          })
          .select()
          .single();

      if (aziendaError) throw aziendaError;

      /* -----------------------------
         CREA UTENTE ADMIN
      ----------------------------- */

      const { data: userData, error: userError } =
        await supabase.auth.signUp({
          email: email,
          password: password
        });

      if (userError) throw userError;

      const userId = userData.user.id;

      /* -----------------------------
         COLLEGA UTENTE AZIENDA
      ----------------------------- */

      const { error: linkError } =
        await supabase
          .from("utenti_aziende")
          .insert({
            user_id: userId,
            azienda_id: azienda.id,
            ruolo: "admin",
            attivo: true,
            stato_invito: "attivo",
            email: email
          });

      if (linkError) throw linkError;

      /* -----------------------------
         COPIA CREDENZIALI
      ----------------------------- */

      const testo =
`Accesso Ristoflow

Username: admin
Password: ${password}

Login:
https://ristoflow-ai.com

Email contatto:
${email}
`;

      navigator.clipboard.writeText(testo);

      alert("Azienda creata.\nCredenziali copiate negli appunti.");

      window.location.hash = "#/gestioneAziende";

    } catch (err) {

      console.error(err);

      errorBox.textContent =
        err.message || "Errore creazione azienda";

    } finally {

      btn.disabled = false;
      btn.textContent = "Crea azienda";

    }

  });

}
