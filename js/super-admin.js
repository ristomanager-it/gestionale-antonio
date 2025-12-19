// js/super-admin.js
(function () {
  console.log("✅ Super Admin JS inizializzato");

  document.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-sa-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.saAction;
    console.log("👉 Super Admin action:", action);

    function showOnlyView(viewId) {
      document.querySelectorAll(".view").forEach((v) => {
        v.style.display = v.id === viewId ? "block" : "none";
      });
    }

    if (action === "aziende") {
      alert("Gestione Aziende");
      // showOnlyView("view-sa-aziende");
    }

    if (action === "titolari") {
      alert("Gestione Titolari");
      // showOnlyView("view-sa-titolari");
    }

    if (action === "locali") {
      alert("Gestione Locali");
      // showOnlyView("view-sa-locali");
    }
  });
})();
