// js/views/home.js
export function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  container.innerHTML = `
    <section class="view">
      <div style="padding:30px; color:#111; background:#fff;">
        <h1>HOME</h1>
        <p><strong>Utente:</strong> ${user.email}</p>
        <p><strong>Azienda:</strong> ${azienda?.nome || "N/D"}</p>
      </div>
    </section>
  `;
}
