// js/stateActions.js
// ================================
// Azioni su stato globale
// ================================

window.stateActions = {

  setUser(user) {
    window.state.user = user;
  },

  setProfilo(profilo) {
    window.state.profilo = profilo || null;
  },

  setAziende(aziende) {
    window.state.aziende = Array.isArray(aziende) ? aziende : [];
  },

  setAzienda(azienda) {
    window.state.azienda = azienda || null;

    // Reset contesto multi-sede quando cambia azienda
    window.state.sedi = [];
    window.state.sedeAttiva = null;

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }
  },

  setSedi(sedi) {
    const lista = Array.isArray(sedi) ? sedi : [];
    window.state.sedi = lista;

    // Auto-select se c'è una sola sede o se la sede attiva non esiste più
    if (lista.length === 1) {
      window.state.sedeAttiva = lista[0];
    } else if (window.state.sedeAttiva) {
      const exists = lista.some(s => String(s.id) === String(window.state.sedeAttiva.id));
      if (!exists) window.state.sedeAttiva = null;
    }

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }
  },

  setSedeAttiva(sedeId) {
    const sedi = window.state.sedi || [];
    const sede = sedi.find(s => String(s.id) === String(sedeId));
    if (!sede) return;

    window.state.sedeAttiva = sede;

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }

    if (window.router?.reloadCurrentRoute) {
      window.router.reloadCurrentRoute();
    }
  },

  async caricaSedi() {
    const azienda = window.state.azienda;
    if (!azienda) {
      window.state.sedi = [];
      window.state.sedeAttiva = null;

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("sedi")
      .select("id, nome, indirizzo, latitudine, longitudine")
      .eq("azienda_id", azienda.id)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento sedi:", error);
      window.state.sedi = [];
      window.state.sedeAttiva = null;

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }
      return;
    }

    this.setSedi(data || []);

    // Se non c'è sede attiva e c'è almeno una sede, seleziona la prima
    if (!window.state.sedeAttiva && (window.state.sedi || []).length > 0) {
      window.state.sedeAttiva = window.state.sedi[0];

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }
    }
  },

  resetAzienda() {
    window.state.azienda = null;
    window.state.permessi = null;
    window.state.ruolo = null;
    window.state.isSuperadmin = false;
    window.state.permessiOverride = {};
    window.state.reparti = [];
    window.state.repartoAttivo = null;

    // Reset multi-sede
    window.state.sedi = [];
    window.state.sedeAttiva = null;

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }

    if (window.uiActions?.renderRepartoSelector) {
      window.uiActions.renderRepartoSelector();
    }
  },

  setPermessi(permessi) {
    window.state.permessi = permessi || {};
  },

  setRuolo(ruolo) {
    window.state.ruolo = ruolo || null;
  },

  async caricaPermessiEffettivi() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user || !azienda) {
      window.state.permessi = null;
      return;
    }

    const ruolo = window.state.ruolo;

    // Superadmin e Admin non dipendono dai permessi granulari
    if (
      window.state.isSuperadmin === true ||
      ruolo === "superadmin" ||
      ruolo === "admin"
    ) {
      window.state.permessi = window.state.permessi || {};
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

  setReparti(reparti) {
    const lista = Array.isArray(reparti) ? reparti : [];
    window.state.reparti = lista;

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

    if (!user || !azienda) {
      window.state.ruolo = null;
      window.state.reparti = [];
      window.state.repartoAttivo = null;
      return;
    }

    const { data: ruoloData } = await window.supabaseClient
      .from("utenti_aziende")
      .select("ruolo")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .single();

    const ruolo = ruoloData?.ruolo || null;
    window.state.ruolo = ruolo;

    // Superadmin e Admin → tutti reparti
    if (
      window.state.isSuperadmin === true ||
      ruolo === "superadmin" ||
      ruolo === "admin"
    ) {
      const { data: repartiData } = await window.supabaseClient
        .from("reparti")
        .select("id, nome")
        .eq("azienda_id", azienda.id)
        .eq("attivo", true)
        .order("sort_order", { ascending: true });

      this.setReparti(repartiData || []);
      return;
    }

    // Manager e Operatore → solo assegnati
    const { data: urData } = await window.supabaseClient
      .from("utenti_reparti")
      .select("reparto_id, reparti(id, nome)")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true);

    const reparti = (urData || [])
      .map(r => r.reparti)
      .filter(Boolean);

    this.setReparti(reparti);
  },

  autoSetAzienda() {
    const aziendeLink = window.state.aziende || [];

    if (aziendeLink.length === 0) {
      window.state.azienda = null;
      window.state.sedi = [];
      window.state.sedeAttiva = null;

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }
      return;
    }

    const piattaformaLink = aziendeLink.find(
      a => a.aziende && a.aziende.stato === "piattaforma"
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
  }
};
