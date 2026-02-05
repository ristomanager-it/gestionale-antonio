// js/views/home.js
export async function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  container.innerHTML = `
    <div style="padding:20px; max-width:900px; margin:0 auto;">
      <h1>Home</h1>
      <p>Utente: <strong>${user?.email || "-"}</strong></p>
      <p>Azienda: <strong>${azienda?.nome || "-"}</strong> (${azienda?.stato || "n/d"})</p>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
        <button class="app-button" onclick="window.location.hash='#/gestione-aziende'">Gestione aziende</button>
        <button class="app-button" onclick="window.location.hash='#/crea-azienda'">Crea azienda</button>
        <button class="app-button" id="btn-logout">Logout</button>
      </div>
    </div>
  `;

  document.getElementById("btn-logout").onclick = async () => {
    await window.supabaseClient.auth.signOut();
    window.location.hash = "#/login";
  };
}
