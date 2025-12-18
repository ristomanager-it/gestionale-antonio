// js/super-admin.js
// Gestione Super Admin (Aziende / Titolari / Locali)
// Sicuro: non genera errori se la view non è presente

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    // =========================
    // CONTROLLI DI BASE
    // =========================
    const superAdminView = document.getElementById("view-super-admin");
    if (!superAdminView) {
      // Non siamo nella pagina super admin
      return;
    }

    // =========================
    // BOTTONI MENU
    // =========================
    const btnAziende = document.getElementById("btn-sa-aziende");
    const btnTitolari = document.getElementById("btn-sa-titolari");
    const btnLocali = document.getElementById("btn-sa-locali");

    // =========================
    // PANEL
    // =========================
    const panelAziende = document.getElementById("sa-aziende-panel");
    const panelTitolari = document.getElementById("sa-titolari-panel");
    const panelLocali = document.getElementById("sa-locali-panel");

    if (!panelAziende || !panelTitolari || !panelLocali) {
      console.warn("⚠️ Panel Super Admin mancanti");
      return;
    }

    // =========================
    // HELPER: MOSTRA PANEL
    // =========================
    function showPanel(panelToShow) {
      [panelAziende, panelTitolari, panelLocali].forEach((p) => {
        p.style.display = "none";
      });

      panelToShow.style.display = "block";
    }

    // =========================
    // EVENTI MENU
    // =========================
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

    // =========================
    // STATO INIZIALE
    // =========================
    showPanel(panelAziende);

    console.log("✅ Super Admin JS inizializzato");
  });
})();
