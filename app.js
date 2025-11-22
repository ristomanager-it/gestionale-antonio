// SPA Router semplice basato su hash (#route)
document.addEventListener("DOMContentLoaded", () => {
  const views = document.querySelectorAll(".view");
  const buttons = document.querySelectorAll("[data-route]");

  // Funzione che mostra la view corretta
  function navigateTo(route) {
    views.forEach((v) => (v.style.display = "none"));

    const active = document.getElementById(`view-${route}`);
    if (active) {
      active.style.display = "block";
    }
  }

  // Attiva i pulsanti della home
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-route");
      window.location.hash = route; // Cambia URL in #timbratura ecc.
      navigateTo(route);
    });
  });

  // Ascolta cambiamenti di hash (esempio: arrivi a #vendite direttamente)
  window.addEventListener("hashchange", () => {
    const route = window.location.hash.replace("#", "");
    navigateTo(route);
  });

  // Quando apro la pagina
  const initialRoute = window.location.hash.replace("#", "") || "timbratura";
  navigateTo(initialRoute);
});
