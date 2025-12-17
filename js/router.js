// =====================================
//  ROUTER SPA – Gestionale Antonio
// =====================================

window.Router = (function () {
  function navigate(route) {
    if (!route) return;

    const user = Auth.getCurrentUser();
    if (!user) {
      showOnlyView("view-login");
      return;
    }

    // vista target
    const targetId = `view-${route}`;
    const targetView = document.getElementById(targetId);

    if (!targetView) {
      console.warn("View non trovata:", targetId);
      return;
    }

    // nasconde tutte le view
    document.querySelectorAll(".view").forEach((v) => {
      v.style.display = "none";
    });

    // mostra quella richiesta
    targetView.style.display = "block";

    // gestione menu manager / home dipendente
    const isManager = Auth.isManager(user.ruolo);

    if (isManager) {
      if (managerMenu) managerMenu.style.display = "grid";
      if (homeDipView) homeDipView.style.display = "none";
    } else {
      if (managerMenu) managerMenu.style.display = "none";
      if (homeDipView) homeDipView.style.display = "block";
    }

    // hook opzionale per inizializzazione view
    const hookName = `onEnter_${route}`;
    if (typeof window[hookName] === "function") {
      window[hookName]();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function init() {
    // bottoni con data-route
    document.querySelectorAll("[data-route]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const route = btn.getAttribute("data-route");
        navigate(route);
      });
    });
  }

  return {
    init,
    navigate
  };
})();
