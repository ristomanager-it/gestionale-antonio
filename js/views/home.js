// js/views/home.js

export async function render(container) {
  const state = window.state;

  if (!state?.user || !state?.azienda) {
    container.innerHTML = `<p class="error">Stato non disponibile</p>`;
    return;
  }

  const azienda = state.azienda;
  const userName =
    state.user.user_metadata?.full_name || state.user.email;

  container.innerHTML = `
    <div class="home">

      <!-- HEADER -->
      <header class="home-header">
        <div class="azienda-header">
          <img
            id="azienda-logo"
            class="azienda-logo"
            style="display:none"
            alt="Logo azienda"
          />

          <div>
            <h1 class="azienda-nome">${azienda.nome}</h1>
            <span class="badge ${
              azienda.stato === "piattaforma"
                ? "badge-platform"
                : "badge-azienda"
            }">
              ${azienda.stato === "piattaforma"
                ? "Piattaforma Ristoflow"
                : "Azienda cliente"}
            </span>
          </div>
        </div>

        <div class="utente-info">
          👤 ${userName}
        </div>
      </header>

      <!-- DASHBOARD BASE -->
      <section class="dashboard-grid">

        <div class="card">
          <h3>Stato sistema</h3>
          <p class="muted">Sistema operativo</p>
          <span class="ok">● Online</span>
        </div>

        <div class="card">
          <h3>Azienda</h3>
          <p class="big">${azienda.codice || "—"}</p>
          <p class="muted">Codice azienda</p>
        </div>

        <div class="card">
          <h3>Moduli</h3>
          <ul class="list">
            <li>Dipendenti</li>
            <li>Timbrature</li>
            <li>Magazzino</li>
          </ul>
        </div>

      </section>

    </div>
  `;

  await renderLogo();
}

/* ===========================
   LOGO
=========================== */

async function renderLogo() {
  const img = document.getElementById("azienda-logo");
  const azienda = window.state.azienda;

  if (!img || !azienda?.logo_path) return;

  const { data, error } =
    await window.supabaseClient.storage
      .from("loghi-aziende")
      .createSignedUrl(azienda.logo_path, 3600);

  if (error) return;

  img.src = data.signedUrl;
  img.style.display = "block";
}
