// js/stateActions.js
// =======================================
// Stato globale - Azioni applicative
// =======================================

window.stateActions = {

  /* ================= USER ================= */

  setUser(user) {
    window.state.user = user || null;
  },

  setProfilo(profilo) {
    window.state.profilo = profilo || null;
  },


  /* ================= AZIENDE ================= */

  setAziende(aziende) {
    window.state.aziende = Array.isArray(aziende) ? aziende : [];
  },

  setAzienda(azienda) {
    window.state.azienda = azienda || null;

    // 🔥 Aggiorna header quando cambia azienda
    if (window.renderHeaderAzienda) {
      window.renderHeaderAzienda();
    }
  },

  resetAzienda() {
    window.state.azienda = null;
    window.state.permessi = null;
    window.state.ruolo = null;
    window.state.reparti = [];
    window.state.repartoAttivo = null;

    if (window.renderHeaderAzienda) {
      window.renderHeaderAzienda();
    }
  },


  /* ================= PERMESSI ================= */

  setPermessi(permessi) {
    window.state.permessi = permessi || {};
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


  /* ================= RUOLO & REPARTI ================= */

  setRuolo(ruolo) {
    window.state.ruolo = ruolo || null;
  },

  setReparti(reparti) {
    const lista = Array.isArray(reparti) ? reparti : [];
    window.state.reparti = lista;

    // Auto gestione reparto attivo
    if (lista.length === 1) {
      window.state.repartoAttivo = lista[0];
    } else {
      window.state.repartoAttivo = null;
    }

    if (window.uiActions?.renderRepartoSelector) {
      window.uiActions.renderRepartoSelector();
    }
  },

  setRepartoAttivo(repartoId) {
    const reparto = window.state.reparti.find(r => r.id === repartoId);
    if (!reparto) return;

    window.state.repartoAttivo = reparto;

    if (window.uiActions?.renderRepartoSelector) {
      window.uiActions.renderRepartoSelector();
    }

    if (window.router?.reloadCurrentRoute) {
      window.router.reloadCurrentRoute();
    }
  },

  async caricaRuoloEReparti() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user || !azienda) return;

    // Carica ruolo
    const { data: ruoloData, error } =
      await window.supabaseClient
        .from("utenti_aziende")
        .select("ruolo")
        .eq("user_id", user.id)
        .eq("azienda_id", azienda.id)
        .eq("attivo", true)
        .single();

    if (error) {
      console.error("Errore caricamento ruolo:", error);
      window.state.ruolo = null;
      return;
    }

    window.state.ruolo = ruoloData?.ruolo || null;
  },


  /* ================= AUTO SELEZIONE AZIENDA ================= */

  autoSetAzienda() {
    const aziendeLink = window.state.aziende || [];

    if (aziendeLink.length === 0) {
      window.state.azienda = null;
      return;
    }

    // Se una sola azienda → selezione automatica
    if (aziendeLink.length === 1) {
      window.state.azienda = aziendeLink[0].aziende;

      if (window.renderHeaderAzienda) {
        window.renderHeaderAzienda();
      }

      return;
    }

    window.state.azienda = null;
  }

};


/* ======================================= */
/* Helper globale permessi */
/* ======================================= */

window.hasPermesso = function (key) {
  const p = window.state.permessi;
  if (!p) return false;
  return p[key] === true;
};


/* ======================================= */
/* Render Header Azienda */
/* ======================================= */

window.renderHeaderAzienda = function () {

  const azienda = window.state.azienda;

  const logo = document.getElementById("header-logo");
  const nome = document.getElementById("header-azienda-nome");

  if (!nome || !logo) return;

  if (!azienda) {
    nome.textContent = "";
    logo.style.display = "none";
    return;
  }

  // Nome azienda
  nome.textContent = azienda.nome || "";

  // Logo
  if (azienda.logo_url) {
    logo.src = azienda.logo_url;
    logo.style.display = "block";
  } else {
    logo.style.display = "none";
  }
};
