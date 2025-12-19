// js/super-admin.js
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const view = document.getElementById("view-super-admin");
    if (!view) return;

    console.log("✅ Super Admin JS inizializzato");

    const btnAziende = document.getElementById("btn-sa-aziende");
    const btnTitolari = document.getElementById("btn-sa-titolari");
    const btnLocali = document.getElementById("btn-sa-locali");

    const panelAziende = document.getElementById("sa-aziende-panel");
    const panelTitolari = document.getElementById("sa-titolari-panel");
    const panelLocali = document.getElementById("sa-locali-panel");

    const allPanels = [panelAziende, panelTitolari, panelLocali];

    function hideAllPanels() {
      allPanels.forEach(p => {
        if (p) p.style.display = "none";
      });
    }

    function showPanel(panel) {
      hideAllPanels();
      if (panel) panel.style.display = "block";
    }

    if (btnAziende) {
      btnAziende.addEventListener("click", () => {
        showPanel(panelAziende);
      });
    }

    if (btnTitolari) {
      btnTitolari.addEventListener("click", () => {
        showPanel(panelTitolari);
      });
    }

    if (btnLocali) {
      btnLocali.addEventListener("click", () => {
        showPanel(panelLocali);
      });
    }
  });
})();
