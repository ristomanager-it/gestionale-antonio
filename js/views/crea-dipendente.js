import { supabase } from "../supabaseClient.js";

export async function render(container) {

  const azienda = window.state?.azienda;
  const sedeId = window.state?.sedeAttiva;

  if (!azienda || !sedeId) {
    container.innerHTML = `
      <div class="view">
        <div class="login-wrapper">
          <h2 class="login-title">Errore</h2>
          <div class="login-subtitle">Azienda o sede non trovata</div>
        </div>
      </div>
    `;
    return;
  }

  // 🔥 carico reparti reali
  const { data: reparti } = await supabase
    .from("reparti")
    .select("id,nome")
    .eq("azienda_id", azienda.id)
    .eq("attivo", true)
    .order("sort_order");

  const repartiOptions = (reparti || [])
    .map(r => `<option value="${r.id}">${r.nome}</option>`)
    .join("");

  container.innerHTML = `

  <div class="view">

    <div style="max-width:700px;margin:auto;width:100%;">

      <div style="margin-bottom:20px;">
        <h2 style="margin:0;">Nuovo dipendente</h2>
        <div class="small-muted">Invita un membro del team</div>
      </div>

      <div class="card">

        <div class="form-group">
          <label>Nome *</label>
          <input id="nome" class="input">
        </div>

        <div class="form-group">
          <label>Cognome *</label>
          <input id="cognome" class="input">
        </div>

        <div class="form-group">
          <label>Email *</label>
          <input id="email" class="input" type="email">
        </div>

        <div class="form-group">
          <label>Telefono</label>
          <input id="telefono" class="input">
        </div>

        <div class="form-group">
          <label>Ruolo *</label>
          <select id="ruolo" class="input">
            <option value="">Seleziona</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="operatore">Operatore</option>
          </select>
        </div>

        <div class="form-group">
          <label>Reparto *</label>
          <select id="reparto" class="input">
            <option value="">Seleziona reparto</option>
            ${repartiOptions}
          </select>
        </div>

        <div class="form-group">
          <label>Mansione</label>
          <input id="mansione" class="input" placeholder="es. pizzaiolo">
        </div>

        <div class="form-group">
          <label>Foto</label>
          <input type="file" id="foto" accept="image/*" class="input">
        </div>

      </div>

      <div style="margin-top:20px;">
        <button id="crea" class="app-button primary" style="width:100%;">
          Invia invito
        </button>
      </div>

      <div id="msg" style="margin-top:14px;"></div>

    </div>

  </div>
  `;

  const btn = document.getElementById("crea");
  const msg = document.getElementById("msg");

  btn.onclick = async () => {

    msg.innerHTML = "";

    const nome = document.getElementById("nome").value.trim();
    const cognome = document.getElementById("cognome").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const ruolo = document.getElementById("ruolo").value;
    const reparto_id = document.getElementById("reparto").value;
    const mansione = document.getElementById("mansione").value.trim();
    const file = document.getElementById("foto").files[0];

    if (!nome || !cognome || !email || !ruolo || !reparto_id) {
      msg.innerHTML = "<span style='color:#dc2626;'>Compila i campi obbligatori</span>";
      return;
    }

    btn.disabled = true;
    btn.innerText = "Invio...";

    let foto_url = null;

    try {

      // 🔥 upload foto (opzionale)
      if (file) {
        const fileName = `dipendenti/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file);

        if (!uploadError) {
          const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

          foto_url = data.publicUrl;
        }
      }

      // 🔥 chiama edge
      const res = await fetch(
        "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/invite-dipendente",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabase.supabaseKey
          },
          body: JSON.stringify({
            nome,
            cognome,
            email,
            telefono,
            ruolo,
            mansione,
            reparto_id,
            azienda_id: azienda.id,
            foto_url
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore invito");
      }

      msg.innerHTML = "<span style='color:#16a34a;'>Invito inviato ✔</span>";

      setTimeout(() => {
        window.location.hash = "#/dipendenti";
      }, 1000);

    } catch (err) {

      msg.innerHTML = "<span style='color:#dc2626;'>" + err.message + "</span>";

      btn.disabled = false;
      btn.innerText = "Invia invito";
    }

  };

}
