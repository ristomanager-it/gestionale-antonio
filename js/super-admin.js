// js/super-admin.js
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Super Admin JS inizializzato");

    // BOTTONI MENU
    const btnAziende = document.getElementById("btn-sa-aziende");
    const btnTitolari = document.getElementById("btn-sa-titolari");
    const btnLocali = document.getElementById("btn-sa-locali");

    // PANNELLI
    const panelAziende = document.getElementById("sa-aziende-panel");
    const panelTitolari = document.getElementById("sa-titolari-panel");
    const panelLocali = document.getElementById("sa-locali-panel");

    // SICUREZZA
    if (!btnAziende || !btnTitolari || !btnLocali) {
      console.warn("⚠️ Bottoni Super Admin non trovati");
      return;
    }

    if (!panelAziende || !panelTitolari || !panelLocali) {
      console.warn("⚠️ Pannelli Super Admin non trovati");
      return;
    }

    // FUNZIONE NASCONDI TUTTI
    function hideAllPanels() {
      panelAziende.style.display = "none";
      panelTitolari.style.display = "none";
      panelLocali.style.display = "none";
    }

    // CLICK AZIENDE
    btnAziende.addEventListener("click", () => {
      hideAllPanels();
      panelAziende.style.display = "block";
      console.log("➡️ Aperto pannello AZIENDE");
    });

    // CLICK TITOLARI
    btnTitolari.addEventListener("click", () => {
      hideAllPanels();
      panelTitolari.style.display = "block";
      console.log("➡️ Aperto pannello TITOLARI");
    });

    // CLICK LOCALI
    btnLocali.addEventListener("click", () => {
      hideAllPanels();
      panelLocali.style.display = "block";
      console.log("➡️ Aperto pannello LOCALI");
    });
  });
})();
