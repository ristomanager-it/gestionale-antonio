// js/stateActions.js

window.stateActions = {
  setUser(user) {
    window.state.user = user;
  },

  setAziende(aziende) {
    window.state.aziende = aziende || [];
  },

  setAzienda(azienda) {
    window.state.azienda = azienda;
  },

  resetAzienda() {
    window.state.azienda = null;
  },

  autoSetAzienda() {
    const aziende = window.state.aziende || [];

    if (aziende.length === 0) {
      window.state.azienda = null;
      return;
    }

    // 1️⃣ PRIORITÀ ASSOLUTA: PIATTAFORMA
    const piattaforma = aziende.find(
      (a) => a.aziende && a.aziende.stato === "piattaforma"
    );

    if (piattaforma) {
      window.state.azienda = piattaforma.aziende;
      return;
    }

    // 2️⃣ SE UNA SOLA AZIENDA → USALA
    if (aziende.length === 1) {
      window.state.azienda = aziende[0].aziende;
      return;
    }

    // 3️⃣ ALTRIMENTI NESSUNA AUTO-SELEZIONE
    window.state.azienda = null;
  },
};
