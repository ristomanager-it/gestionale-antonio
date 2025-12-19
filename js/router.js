// js/router.js
window.Router = (function () {
  function navigate(route) {
    const targetId = `view-${route}`;
    const targetView = document.getElementById(targetId);

    if (!targetView) {
      console.warn("View non trovata:", targetId);
      return;
    }

    document.querySelectorAll(".view").forEach((v) => {
      v.style.display = "none";
    });

    targetView.style.display = "block";

    const hookName = `onEnter_${route.replace(/-/g, "_")}`;
    if (typeof window[hookName] === "function") {
      window[hookName]();
    }

    window.scrollTo({ top: 0 });
  }

  function init() {
    document.querySelectorAll("[data-route]").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigate(btn.dataset.route);
      });
    });
  }

  return {
    init,
    navigate,
  };
})();
