// js/super-admin.js
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Super Admin JS inizializzato");

    const viewSuperAdmin = document.getElementById("view-super-admin");
    if (!viewSuperAdmin) return;

    const btnAziende = document.getElementById("btn-sa-aziende");
    const btnTitolari = document.getElementById("btn-sa-titolari");
    const btnLocali = document.getElementById("btn-sa-locali");

    const panelAziende = document.getElementById("sa-aziende-panel");
    const panelTitolari = document.getElementById("sa-titolari-panel");
    const panelLocali = document.getElementById("sa-locali-panel");

    function hideAllPanels() {
      if (panelAziende) panelAziende.style.display = "none";
      if (panelTitolari) panelTitolari.style.display = "none";
      if (panelLocali) panelLocali.style.display = "none";
    }

    if (btnAziende) {
      btnAziende.addEventListener("click", () => {
        console.log("👉 Click Super Admin: Aziende");
        hideAllPanels();
        panelAziende.style.display = "block";
      });
    }

    if (btnTitolari) {
      btnTitolari.addEventListener("click", () => {
        console.log("👉 Click Super Admin: Titolari");
        hideAllPanels();
        panelTitolari.style.display = "block";
      });
    }

    if (btnLocali) {
      btnLocali.addEventListener("click", () => {
        console.log("👉 Click Super Admin: Locali");
        hideAllPanels();
        panelLocali.style.display = "block";
      });
    }
  });
})();
