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
        <div style="font-size:13px;color:#6b7280;">Provisioning</div>
        <div style="font-size:22px;font-weight:700;">Nuova azienda</div>
      </div>

      <button class="app-button" id="btn-home">
        ⬅ Dashboard
      </button>
    </div>

    <form id="azienda-form">

      <div class="crea-grid">

        <div class="card">

          <div style="font-weight:700;margin-bottom:12px;">
            Dati azienda
          </div>

          <div class="form-group">
            <label>Nome azienda</label>
            <input id="az-nome" required class="input">
          </div>

          <div class="form-group">
            <label>Codice azienda</label>
            <input id="az-codice" required class="input">
          </div>

          <div class="form-group">
            <label>Piano abbonamento</label>
            <select id="az-piano" class="input">
              ${optionsPiani}
            </select>
          </div>

        </div>

        <div class="card">

          <div style="font-weight:700;margin-bottom:12px;">
            Referente azienda
          </div>

          <div class="form-group">
            <label>Email referente</label>
            <input id="az-email" type="email" required class="input">
          </div>

          <div class="form-group">
            <label>Telefono referente</label>
            <input id="az-telefono" class="input">
          </div>

          <div style="font-size:12px;color:#6b7280;margin-top:10px;">
            Verrà inviata una email per attivare l’account e impostare la password.
          </div>

        </div>

        <!-- 🔥 NUOVA CARD LOGO -->
        <div class="card">

          <div style="font-weight:700;margin-bottom:12px;">
            Logo azienda
          </div>

          <div class="form-group">
            <input type="file" id="az-logo" accept="image/*" class="input">
          </div>

          <div style="margin-top:10px;text-align:center;">
            <img id="logo-preview"
              style="max-width:120px;max-height:120px;display:none;border-radius:12px;">
          </div>

        </div>

      </div>

      <div style="margin-top:20px;">
        <button class="app-button primary" id="btn-submit" style="width:100%;">
          Crea azienda
        </button>
      </div>

    </form>

    <div id="error-box"
      style="margin-top:14px;color:#dc2626;font-size:14px;">
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

  const logoInput = document.getElementById("az-logo");
  const logoPreview = document.getElementById("logo-preview");

  let logoFile = null;

  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (!file) return;

    logoFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview.src = e.target.result;
      logoPreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  });

  const form = document.getElementById("azienda-form");
  const errorBox = document.getElementById("error-box");
  const btn = document.getElementById("btn-submit");

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    errorBox.textContent = "";

    const nome = document.getElementById("az-nome").value.trim();
    const codice = document.getElementById("az-codice").value.trim();
    const piano_id = document.getElementById("az-piano").value;
    const email = document.getElementById("az-email").value.trim();

    btn.disabled = true;
    btn.textContent = "Creazione...";

    try {

      const { data, error } = await supabase.functions.invoke(
        "platform-create-company",
        {
          body: { nome, codice, piano_id, email }
        }
      );

      if (error) throw error;

      const azienda_id = data.azienda_id;

      /* 🔥 UPLOAD LOGO */
      if (logoFile && azienda_id) {

        const fileName = `azienda_${azienda_id}_${Date.now()}`;

        const { error: uploadError } = await supabase.storage
          .from("loghi-aziende")
          .upload(fileName, logoFile);

        if (!uploadError) {

          const { data: publicData } = supabase.storage
            .from("loghi-aziende")
            .getPublicUrl(fileName);

          const logo_url = publicData.publicUrl;

          await supabase
            .from("aziende")
            .update({ logo_url })
            .eq("id", azienda_id);
        }
      }

      alert("Azienda creata e invito inviato ✔");

      window.location.hash = "#/gestioneAziende";

    } catch (err) {

      console.error("❌ ERRORE:", err);
      errorBox.textContent = err.message || "Errore creazione";

    } finally {

      btn.disabled = false;
      btn.textContent = "Crea azienda";

    }

  });

}
