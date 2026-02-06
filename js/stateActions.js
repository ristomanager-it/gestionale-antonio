// js/stateActions.js
window.stateActions = {
  setUser(user) {
    window.state.user = user;
  },

  setAziende(relazioni) {
    window.state.aziende = relazioni || [];
    this.autoSetAzienda();
  },

  setAzienda(azienda) {
    window.state.azienda = azienda;
  },

  resetAzienda() {
    window.state.azienda = null;
  },

  autoSetAzienda() {
    // se già settata, non toccare
    if (window.state.azienda) return;

    const relazioni = window.state.aziende || [];

    if (relazioni.length === 0) return;

    // 1️⃣ PRIORITÀ ASSOLUTA: PIATTAFORMA
    const piattaforma = relazioni.find(
      (r) => r.aziende && r.aziende.stato === "piattaforma"
    );

    if (piattaforma) {
      window.state.azienda = piattaforma.aziende;
      return;
    }

    // 2️⃣ SE UNA SOLA AZIENDA → AUTO
    if (relazioni.length === 1) {
      window.state.azienda = relazioni[0].aziende;
    }
  },
};
