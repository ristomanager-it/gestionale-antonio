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
    if (window.state.azienda) return;

    const relazioni = window.state.aziende || [];
    if (relazioni.length === 0) return;

    // PRIORITÀ: piattaforma
    const piattaforma = relazioni.find(
      (r) => r.aziende && r.aziende.stato === "piattaforma"
    );

    if (piattaforma) {
      window.state.azienda = piattaforma.aziende;
      return;
    }

    // fallback: una sola azienda
    if (relazioni.length === 1) {
      window.state.azienda = relazioni[0].aziende;
    }
  },
};
