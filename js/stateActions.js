window.stateActions = {
  LS_KEYS: {
    ACTIVE_AZIENDA_ID: "active_azienda_id",
    ACTIVE_SEDE_ID: "active_sede_id",
  },

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

    if (azienda?.id) {
      localStorage.setItem(this.LS_KEYS.ACTIVE_AZIENDA_ID, String(azienda.id));
    }

    localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

    window.state.sedi = [];
    window.state.sedeAttiva = null;

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }
  },

  setSedi(sedi) {
    const lista = Array.isArray(sedi) ? sedi : [];
    window.state.sedi = lista;

    const storedSedeId = localStorage.getItem(this.LS_KEYS.ACTIVE_SEDE_ID);

    if (lista.length === 1) {
      window.state.sedeAttiva = lista[0];
      localStorage.setItem(this.LS_KEYS.ACTIVE_SEDE_ID, String(lista[0].id));
    } else if (storedSedeId) {
      const match = lista.find((s) => String(s.id) === String(storedSedeId));
      window.state.sedeAttiva = match || null;
      if (!match) localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);
    } else {
      window.state.sedeAttiva = null;
    }

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }
  },

  setSedeAttiva(sedeId) {
    const sedi = window.state.sedi || [];
    const sede = sedi.find((s) => String(s.id) === String(sedeId));
    if (!sede) return;

    window.state.sedeAttiva = sede;
    localStorage.setItem(this.LS_KEYS.ACTIVE_SEDE_ID, String(sede.id));

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

      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

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

      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }
      return;
    }

    this.setSedi(data || []);
  },

  resetAzienda() {
    window.state.azienda = null;
    window.state.permessi = null;
    window.state.ruolo = null;
    window.state.isSuperadmin = false;
    window.state.permessiOverride = {};
    window.state.reparti = [];
    window.state.repartoAttivo = null;

    localStorage.removeItem(this.LS_KEYS.ACTIVE_AZIENDA_ID);
    localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

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

  // 🔥 FIX COMPLETO PERMESSI
  async caricaPermessiEffettivi() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user || !azienda) {
      window.state.permessi = {};
      window.state._allAccess = false;
      return;
    }

    const ruolo = window.state.ruolo;

    // 🔥 SUPERADMIN / ADMIN
    if (
      window.state.isSuperadmin === true ||
      ruolo === "superadmin" ||
      ruolo === "admin"
    ) {
      window.state.permessi = {};
      window.state._allAccess = true;
      return;
    }

    // 🔥 DEFAULT FALLBACK
    const defaultPermessi = {
      manager: {
        "servizi.read": true,
        "dipendenti.read": true,
        "produzione.read": true,
        "timbrature.read": true,
        "magazzino.read": true,
        "venduto.read": true
      },
      operatore: {
        "timbrature.read": true,
        "produzione.read": true,
        "servizi.read": true,
        "permessi.read": true,
        "calendario.read": true
      }
    };

    let permessiDB = {};

    try {
      const { data, error } = await window.supabaseClient.rpc("permessi_effettivi", {
        p_user_id: user.id,
        p_azienda_id: azienda.id,
      });

      if (!error && data) {
        permessiDB = data;
      }

    } catch (e) {
      console.warn("Permessi DB fallback:", e);
    }

    const base = defaultPermessi[ruolo] || {};

    window.state.permessi = {
      ...base,
      ...permessiDB
    };

    window.state._allAccess = false;
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
    const reparto = window.state.reparti.find((r) => r.id === repartoId);
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

    const { data: urData } = await window.supabaseClient
      .from("utenti_reparti")
      .select("reparto_id, reparti(id, nome)")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true);

    const reparti = (urData || []).map((r) => r.reparti).filter(Boolean);

    this.setReparti(reparti);
  },

  autoSetAzienda() {
    const aziendeLink = window.state.aziende || [];
    const storedId = localStorage.getItem(this.LS_KEYS.ACTIVE_AZIENDA_ID);

    if (aziendeLink.length === 0) {
      window.state.azienda = null;
      window.state.sedi = [];
      window.state.sedeAttiva = null;

      localStorage.removeItem(this.LS_KEYS.ACTIVE_AZIENDA_ID);
      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }
      return;
    }

    if (storedId) {
      const match = aziendeLink.find((a) => String(a.aziende?.id) === String(storedId));
      if (match?.aziende) {
        window.state.azienda = match.aziende;
        return;
      }
      localStorage.removeItem(this.LS_KEYS.ACTIVE_AZIENDA_ID);
    }

    const piattaformaLink = aziendeLink.find(
      (a) => a.aziende && a.aziende.stato === "piattaforma"
    );

    if (piattaformaLink) {
      window.state.azienda = piattaformaLink.aziende;
      localStorage.setItem(this.LS_KEYS.ACTIVE_AZIENDA_ID, String(piattaformaLink.aziende.id));
      return;
    }

    if (aziendeLink.length === 1) {
      window.state.azienda = aziendeLink[0].aziende;
      localStorage.setItem(this.LS_KEYS.ACTIVE_AZIENDA_ID, String(aziendeLink[0].aziende.id));
      return;
    }

    window.state.azienda = null;
  },
};
