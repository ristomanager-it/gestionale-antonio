// js/ui-reparto.js
// ============================================================
// UI Reparto Selector Globale
// ============================================================

window.uiActions = window.uiActions || {};

window.uiActions.renderRepartoSelector = function () {

  const select = document.getElementById("header-reparto-select");
  if (!select) return;

  const reparti = window.state.reparti || [];

  // Nessun reparto → nascondi
  if (reparti.length <= 1) {
    select.style.display = "none";
    return;
  }

  select.innerHTML = "";

  reparti.forEach(r => {
    const option = document.createElement("option");
    option.value = r.id;
    option.textContent = r.nome;
    select.appendChild(option);
  });

  // Imposta attivo
  if (window.state.repartoAttivo) {
    select.value = window.state.repartoAttivo.id;
  }

  select.style.display = "block";

  select.onchange = function () {
    window.stateActions.setRepartoAttivo(this.value);
  };
};
