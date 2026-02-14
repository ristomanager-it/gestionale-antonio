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
          PIN accesso
          <input id="az-pin" class="input-pill" required />
        </label>

        <label>
          Logo azienda
          <input id="az-logo" type="file" accept="image/*" class="input-pill" />
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
    const pin = document.getElementById("az-pin").value.trim();
    const file = document.getElementById("az-logo").files[0];

    try {
      const { data: azienda, error } = await supabase
        .from("aziende")
        .insert({
          nome,
          codice,
          pin_accesso: pin,
          stato: "attiva",
          features: DEFAULT_FEATURES,
        })
        .select()
        .single();

      if (error) throw error;

      if (file) {
        const ext = file.name.split(".").pop();
        const filePath = `logos/${azienda.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("loghi-aziende")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("loghi-aziende")
          .getPublicUrl(filePath);

        await supabase.from("aziende")
          .update({
            logo_path: filePath,
            logo_url: data.publicUrl,
          })
          .eq("id", azienda.id);
      }

      await supabase.from("utenti_aziende").insert({
        user_id: user.id,
        azienda_id: azienda.id,
        ruolo: "admin",
        attivo: true,
      });

      window.location.hash = "#/home";

    } catch (err) {
      console.error(err);
      errorEl.textContent = err.message;
    }
  });
}
