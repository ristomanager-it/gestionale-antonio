// js/router.js
window.Router = (function () {
  function navigate(route) {
    const targetId = `view-${route}`;
    const targetView = document.getElementById(targetId);

    if (!targetView) {
      console.warn("View non trovata:", targetId);
      return;
    }

    // nasconde tutte le view
    document.querySelectorAll(".view").forEach(v => {
      v.style.display = "none";
    });

    // mostra view richiesta
    targetView.style.display = "block";

    // menu manager
    const user = AppState.getCurrentUser();
    const managerMenu = document.getElementById("manager-menu");

    if (user && Auth.isManagerRole(user.ruolo)) {
      if (managerMenu) managerMenu.style.display = "grid";
    } else {
      if (managerMenu) managerMenu.style.display = "none";
    }

    // hook onEnter
    const hookName = `onEnter_${route.replace(/-/g, "_")}`;
    if (typeof window[hookName] === "function") {
      window[hookName]();
    }

    window.scrollTo({ top: 0 });
  }

  function init() {
    document.querySelectorAll("[data-route]").forEach(btn => {
      btn.addEventListener("click", () => {
        navigate(btn.dataset.route);
      });
    });
  }

  return {
    init,
    navigate
  };
})();
