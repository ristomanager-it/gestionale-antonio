// js/views/home.js

export function render(container) {
  const azienda = window.state.azienda;

  container.innerHTML = `
    <div style="padding: 20px">
      <h1>Benvenuto in ${azienda?.nome || "App"}</h1>
      <p>Accesso riuscito 🎉</p>
    </div>
  `;
}
