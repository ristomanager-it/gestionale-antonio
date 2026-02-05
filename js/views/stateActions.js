// js/stateActions.js
window.stateActions = {
  setUser(user) {
    window.state.user = user;
  },

  setAziende(aziende) {
    window.state.aziende = aziende || [];
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

    const aziende = window.state.aziende || [];

    const piattaforma = aziende.find(
      (r) => (r.aziende || r).stato === "piattaforma"
    );

    if (piattaforma) {
      window.state.azienda = piattaforma.aziende || piattaforma;
      return;
    }

    if (aziende.length === 1) {
      window.state.azienda = aziende[0].aziende || aziende[0];
    }
  },
};
