// js/super-admin.js
(function () {
  console.log("✅ super-admin.js caricato");

  document.addEventListener("DOMContentLoaded", () => {
    const viewSuperAdmin = document.getElementById("view-super-admin");

    if (!viewSuperAdmin) {
      console.warn("⚠️ view-super-admin non trovata");
      return;
    }

    const btnAziende = document.getElementById("btn-sa-aziende");
    const btnTitolari = document.getElementById("btn-sa-titolari");
    const btnLocali = document.getElementById("btn-sa-locali");

    // helper per cambiare view
    function showOnlyView(viewId) {
      document.querySelectorAll(".view").forEach((v) => {
        v.style.display = v.id === viewId ? "block" : "none";
      });
    }

    if (btnAziende) {
      btnAziende.addEventListener("click", () => {
        console.log("👉 Click Gestione Aziende");
        alert("Gestione Aziende (placeholder)");
        // showOnlyView("view-sa-aziende"); // la creeremo dopo
      });
    }

    if (btnTitolari) {
      btnTitolari.addEventListener("click", () => {
        console.log("👉 Click Gestione Titolari");
        alert("Gestione Titolari (placeholder)");
        // showOnlyView("view-sa-titolari");
      });
    }

    if (btnLocali) {
      btnLocali.addEventListener("click", () => {
        console.log("👉 Click Gestione Locali");
        alert("Gestione Locali (placeholder)");
        // showOnlyView("view-sa-locali");
      });
    }

    console.log("✅ Super Admin listeners attivi");
  });
})();
