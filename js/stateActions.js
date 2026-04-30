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
    window.state.dipendente = null;
    window.state.sediDipendente = [];

    window.uiActions?.renderSedeSelector?.();
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

    window.uiActions?.renderSedeSelector?.();
  },

  setSedeAttiva(sedeId) {
    const sedi = window.state.sedi || [];
    const sede = sedi.find((s) => String(s.id) === String(sedeId));
    if (!sede) return;

    window.state.sedeAttiva = sede;
    localStorage.setItem(this.LS_KEYS.ACTIVE_SEDE_ID, String(sede.id));

    window.uiActions?.renderSedeSelector?.();
    window.router?.reloadCurrentRoute?.();
  },

  async caricaDipendenteCorrente() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    window.state.dipendente = null;
    window.state.sediDipendente = [];

    if (!user?.id || !azienda?.id) return null;

    const { data, error } = await window.supabase
      .from("dipendenti")
      .select("*")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .maybeSingle();

    if (error) {
      console.error("Errore caricamento dipendente:", error);
      return null;
    }

    window.state.dipendente = data || null;
    return data || null;
  },

  async caricaSediUtente(userId) {
    if (!userId) {
      window.state.sediDipendente = [];
      return [];
    }

    const { data, error } = await window.supabase
      .from("utenti_sedi")
      .select(`
        sede_id,
        sedi (id, nome, indirizzo, latitudine, longitudine)
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("Errore sedi utente:", error);
      return [];
    }

    const sedi = (data || []).map((r) => r.sedi).filter(Boolean);

    window.state.sediDipendente = sedi;
    return sedi;
  },

  async caricaSedi() {
    const azienda = window.state.azienda;

    if (!azienda?.id) {
      window.state.sedi = [];
      window.state.sedeAttiva = null;
      window.state.sediDipendente = [];
      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);
      window.uiActions?.renderSedeSelector?.();
      return;
    }

    const ruolo = window.state.ruolo;
    const isAdmin =
      window.state.isSuperadmin === true ||
      ruolo === "superadmin" ||
      ruolo === "admin";

    if (!isAdmin) {
      const userId = window.state.user?.id;

      if (userId) {
        const sediUtente = await this.caricaSediUtente(userId);
        this.setSedi(sediUtente);
        return;
      }
    }

    const { data, error } = await window.supabase
      .from("sedi")
      .select("id, nome, indirizzo, latitudine, longitudine")
      .eq("azienda_id", azienda.id)
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    this.setSedi(data || []);
  },

  async caricaContestoOperativo() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user?.id || !azienda?.id) {
      return { ok: false };
    }

    await this.caricaRuoloEReparti();
    await this.caricaPermessiEffettivi();
    await this.caricaSedi();

    return {
      ok: true,
      sedi: window.state.sedi,
      sedeAttiva: window.state.sedeAttiva,
    };
  },

  resetAzienda() {
    window.state.azienda = null;
    window.state.sedi = [];
    window.state.sedeAttiva = null;

    localStorage.removeItem(this.LS_KEYS.ACTIVE_AZIENDA_ID);
    localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);
  },

  setPermessi(p) {
    window.state.permessi = p || {};
  },

  setRuolo(r) {
    window.state.ruolo = r || null;
  },

  async caricaPermessiEffettivi() {
    window.state._allAccess =
      window.state.ruolo === "admin" ||
      window.state.ruolo === "superadmin";
  },

  setReparti(reparti) {
    window.state.reparti = reparti || [];
  },

  setRepartoAttivo(id) {
    window.state.repartoAttivo =
      window.state.reparti.find((r) => r.id === id) || null;
  },

  async caricaRuoloEReparti() {
    const { data } = await window.supabase
      .from("utenti_aziende")
      .select("ruolo")
      .eq("user_id", window.state.user.id)
      .maybeSingle();

    window.state.ruolo = data?.ruolo || null;
  },

  autoSetAzienda() {
    const aziende = window.state.aziende || [];
    if (aziende.length === 1) {
      window.state.azienda = aziende[0].aziende;
    }
  },
};
