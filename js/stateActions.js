// js/stateActions.js
window.stateActions = {
  setUser(user) {
    window.state.user = user;
  },

  setAziende(aziende) {
    window.state.aziende = aziende;
  },

  setAzienda(azienda) {
    window.state.azienda = azienda;
  },

  resetAzienda() {
    window.state.azienda = null;
  },

  autoSetAzienda() {
    const aziende = window.state.aziende || [];
    if (aziende.length === 0) return;

    // priorità piattaforma
    const piattaforma = aziende.find(
      (r) => (r.aziende || r).stato === "piattaforma"
    );

    if (piattaforma) {
      window.state.azienda = piattaforma.aziende || piattaforma;
      return;
    }

    // se una sola azienda
    if (aziende.length === 1) {
      window.state.azienda = aziende[0].aziende || aziende[0];
    }
  },
};
