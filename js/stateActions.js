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

  setPermessi(permessi) {
    window.state.permessi = permessi || {};
  },

  resetAzienda() {
    window.state.azienda = null;
    window.state.permessi = null;
  },

  async caricaPermessiEffettivi() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user || !azienda) {
      window.state.permessi = null;
      return;
    }

    const { data, error } = await window.supabaseClient.rpc(
      "permessi_effettivi",
      {
        p_user_id: user.id,
        p_azienda_id: azienda.id,
      }
    );

    if (error) {
      console.error("Errore caricamento permessi:", error);
      window.state.permessi = null;
      return;
    }

    window.state.permessi = data || {};
  },

  autoSetAzienda() {
    const aziendeLink = window.state.aziende || [];

    if (aziendeLink.length === 0) {
      window.state.azienda = null;
      return;
    }

    const piattaformaLink = aziendeLink.find(
      (a) => a.aziende && a.aziende.stato === "piattaforma"
    );

    if (piattaformaLink) {
      window.state.azienda = piattaformaLink.aziende;
      return;
    }

    if (aziendeLink.length === 1) {
      window.state.azienda = aziendeLink[0].aziende;
      return;
    }

    window.state.azienda = null;
  },
};

// 🔥 Helper globale universale
window.hasPermesso = function (key) {
  const p = window.state.permessi;
  if (!p) return false;
  return p[key] === true;
};
