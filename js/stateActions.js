// js/stateActions.js
// ================================
// Azioni su stato globale
// ================================

window.stateActions = {
  setUser(user) {
    window.state.user = user;
  },

  setAziende(aziende) {
    window.state.aziende = Array.isArray(aziende) ? aziende : [];
  },

  setAzienda(azienda) {
    window.state.azienda = azienda;
  },

  resetAzienda() {
    window.state.azienda = null;
  },

  autoSetAzienda() {
    const aziendeLink = window.state.aziende || [];

    if (aziendeLink.length === 0) {
      window.state.azienda = null;
      return;
    }

    // 🔑 PRIORITÀ ASSOLUTA: PIATTAFORMA
    const piattaformaLink = aziendeLink.find(
      (a) => a.aziende && a.aziende.stato === "piattaforma"
    );

    if (piattaformaLink) {
      window.state.azienda = piattaformaLink.aziende;
      return;
    }

    // UNA SOLA AZIENDA → USALA
    if (aziendeLink.length === 1) {
      window.state.azienda = aziendeLink[0].aziende;
      return;
    }

    // ALTRIMENTI NON AUTO-SELEZIONARE
    window.state.azienda = null;
  },
};
