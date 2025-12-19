// js/super-admin.js
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Super Admin JS inizializzato");

    // =========================
    // BOTTONI
    // =========================
    const btnAziende = document.getElementById("btn-sa-aziende");
    const btnTitolari = document.getElementById("btn-sa-titolari");
    const btnLocali = document.getElementById("btn-sa-locali");

    // =========================
    // PANNELLI
    // =========================
    const panelAziende = document.getElementById("sa-aziende-panel");
    const panelTitolari = document.getElementById("sa-titolari-panel");
    const panelLocali = document.getElementById("sa-locali-panel");

    if (!btnAziende || !btnTitolari || !btnLocali) {
      console.warn("⚠️ Bottoni Super Admin mancanti");
      return;
    }

    if (!panelAziende || !panelTitolari || !panelLocali) {
      console.warn("⚠️ Pannelli Super Admin mancanti");
      return;
    }

    // =========================
    // HELPER
    // =========================
    function hideAllPanels() {
      panelAziende.style.display = "none";
      panelTitolari.style.display = "none";
      panelLocali.style.display = "none";
    }

    // =========================
    // EVENTI
    // =========================
    btnAziende.addEventListener("click", () => {
      console.log("👉 Click Super Admin: Aziende");
      hideAllPanels();
      panelAziende.style.display = "block";
    });

    btnTitolari.addEventListener("click", () => {
      console.log("👉 Click Super Admin: Titolari");
      hideAllPanels();
      panelTitolari.style.display = "block";
    });

    btnLocali.addEventListener("click", () => {
      console.log("👉 Click Super Admin: Locali");
      hideAllPanels();
      panelLocali.style.display = "block";
    });
  });
})();
