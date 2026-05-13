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

  setRuolo(ruolo) {
    if (!window.state.viewAs) {
      window.state.ruolo = ruolo;
    }
  },

  resetAzienda() {
    window.state.azienda = null;
    window.state.sedi = [];
    window.state.sedeAttiva = null;
    window.state.ruolo = null;
    window.state.reparti = [];
    window.state.repartoAttivo = null;
    window.state.dipendente = null;
    window.state.sediDipendente = [];
    window.state.permessi = {};
    window.state._allAccess = false;

    localStorage.removeItem(this.LS_KEYS.ACTIVE_AZIENDA_ID);
    localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }
  },

  setReparti(reparti) {
    const lista = Array.isArray(reparti) ? reparti : [];

    window.state.reparti = lista;

    if (lista.length === 0) {
      window.state.repartoAttivo = null;
      return;
    }

    if (!window.state.repartoAttivo) {
      window.state.repartoAttivo = lista[0];
    }
  },

  setAziende(aziende) {
    window.state.aziende = Array.isArray(aziende)
      ? aziende
      : [];
  },

  setAzienda(azienda) {
    window.state.azienda = azienda || null;

    if (azienda?.id) {
      localStorage.setItem(
        this.LS_KEYS.ACTIVE_AZIENDA_ID,
        String(azienda.id)
      );
    }

    localStorage.removeItem(
      this.LS_KEYS.ACTIVE_SEDE_ID
    );

    window.state.sedi = [];
    window.state.sedeAttiva = null;
    window.state.dipendente = null;
    window.state.sediDipendente = [];

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }
  },

  setSedi(sedi) {
    const lista = Array.isArray(sedi)
      ? sedi
      : [];

    window.state.sedi = lista;

    const storedSedeId = localStorage.getItem(
      this.LS_KEYS.ACTIVE_SEDE_ID
    );

    if (lista.length === 1) {

      window.state.sedeAttiva = lista[0];

      localStorage.setItem(
        this.LS_KEYS.ACTIVE_SEDE_ID,
        String(lista[0].id)
      );

    } else if (storedSedeId) {

      const match = lista.find(
        s => String(s.id) === String(storedSedeId)
      );

      window.state.sedeAttiva = match || null;

      if (!match) {
        localStorage.removeItem(
          this.LS_KEYS.ACTIVE_SEDE_ID
        );
      }

    } else {

      window.state.sedeAttiva =
        lista.length > 0
          ? lista[0]
          : null;

      if (window.state.sedeAttiva?.id) {

        localStorage.setItem(
          this.LS_KEYS.ACTIVE_SEDE_ID,
          String(window.state.sedeAttiva.id)
        );
      }
    }

    if (!window.state.sedeAttiva && lista.length > 0) {

      window.state.sedeAttiva = lista[0];

      localStorage.setItem(
        this.LS_KEYS.ACTIVE_SEDE_ID,
        String(lista[0].id)
      );
    }

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }
  },

  setSedeAttiva(sedeId) {
    const sedi = window.state.sedi || [];

    const sede = sedi.find(
      s => String(s.id) === String(sedeId)
    );

    if (!sede) return;

    window.state.sedeAttiva = sede;

    localStorage.setItem(
      this.LS_KEYS.ACTIVE_SEDE_ID,
      String(sede.id)
    );

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }

    if (window.router?.reloadCurrentRoute) {
      window.router.reloadCurrentRoute();
    }
  },

  async caricaDipendenteCorrente() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    window.state.dipendente = null;
    window.state.sediDipendente = [];

    if (!user?.id || !azienda?.id) {
      return null;
    }

    const { data, error } = await window.supabase
      .from("dipendenti")
      .select(`
        id,
        nome,
        cognome,
        email,
        user_id,
        azienda_id,
        reparto_id,
        sede_id,
        attivo,
        profilo_completato
      `)
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .maybeSingle();

    if (error) {

      console.error(
        "Errore caricamento dipendente corrente:",
        error
      );

      return null;
    }

    window.state.dipendente = data || null;

    return data || null;
  },

  async caricaSediDipendente() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user?.id || !azienda?.id) {
      window.state.sediDipendente = [];
      return [];
    }

    const { data: utentiSediData, error: utentiSediError } =
      await window.supabase
        .from("utenti_sedi")
        .select(`
          sede_id,
          is_default,
          sedi (
            id,
            nome,
            indirizzo,
            latitudine,
            longitudine
          )
        `)
        .eq("user_id", user.id)
        .eq("azienda_id", azienda.id);

    if (!utentiSediError && utentiSediData?.length > 0) {

      const sedi = utentiSediData
        .filter(r => r.sedi)
        .map(r => ({
          ...r.sedi,
          is_default: r.is_default === true,
        }));

      window.state.sediDipendente = sedi;

      return sedi;
    }

    const { data: dipendente, error: dipError } =
      await window.supabase
        .from("dipendenti")
        .select(`
          sede_id,
          sedi (
            id,
            nome,
            indirizzo,
            latitudine,
            longitudine
          )
        `)
        .eq("user_id", user.id)
        .eq("azienda_id", azienda.id)
        .eq("attivo", true)
        .maybeSingle();

    if (dipError) {

      console.error(
        "Errore fallback sede dipendente:",
        dipError
      );

      window.state.sediDipendente = [];

      return [];
    }

    if (!dipendente?.sedi) {

      window.state.sediDipendente = [];

      return [];
    }

    const sedi = [{
      ...dipendente.sedi,
      is_default: true,
    }];

    window.state.sediDipendente = sedi;

    return sedi;
  },

  async caricaSedi() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!azienda?.id) {

      window.state.sedi = [];
      window.state.sedeAttiva = null;
      window.state.sediDipendente = [];

      localStorage.removeItem(
        this.LS_KEYS.ACTIVE_SEDE_ID
      );

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }

      return;
    }

    const ruolo =
      window.state.viewAs ||
      window.state.ruolo;

    const isAdmin =
      window.state.isSuperadmin === true ||
      ruolo === "superadmin" ||
      ruolo === "admin";

    if (!isAdmin) {

      const sediDipendente =
        await this.caricaSediDipendente();

      this.setSedi(sediDipendente);

      return;
    }

    const { data, error } = await window.supabase
      .from("sedi")
      .select(`
        id,
        nome,
        indirizzo,
        latitudine,
        longitudine
      `)
      .eq("azienda_id", azienda.id)
      .order("nome", {
        ascending: true,
      });

    if (error) {

      console.error(
        "Errore caricamento sedi:",
        error
      );

      window.state.sedi = [];
      window.state.sedeAttiva = null;

      localStorage.removeItem(
        this.LS_KEYS.ACTIVE_SEDE_ID
      );

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }

      return;
    }

    this.setSedi(data || []);
  },

  async caricaContestoOperativo() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user?.id || !azienda?.id) {

      window.state.dipendente = null;
      window.state.sediDipendente = [];
      window.state.sedi = [];
      window.state.sedeAttiva = null;

      localStorage.removeItem(
        this.LS_KEYS.ACTIVE_SEDE_ID
      );

      return {
        ok: false,
        motivo: "Utente o azienda non caricati",
      };
    }

    await this.caricaRuoloEReparti();
    await this.caricaPermessiEffettivi();

    const ruolo =
      window.state.viewAs ||
      window.state.ruolo;

    const isAdmin =
      window.state.isSuperadmin === true ||
      ruolo === "superadmin" ||
      ruolo === "admin";

    if (isAdmin) {

      await this.caricaSedi();

      return {
        ok: true,
        tipo: "admin",
        sedi: window.state.sedi || [],
        sedeAttiva: window.state.sedeAttiva || null,
      };
    }

    const dipendente =
      await this.caricaDipendenteCorrente();

    const sedi =
      await this.caricaSediDipendente();

    this.setSedi(sedi);

    if (!dipendente?.id && sedi.length === 0) {

      window.state.sedi = [];
      window.state.sedeAttiva = null;
      window.state.sediDipendente = [];

      localStorage.removeItem(
        this.LS_KEYS.ACTIVE_SEDE_ID
      );

      return {
        ok: false,
        motivo: "Dipendente non trovato",
      };
    }

    if (sedi.length === 0) {

      window.state.sedeAttiva = null;

      localStorage.removeItem(
        this.LS_KEYS.ACTIVE_SEDE_ID
      );

      return {
        ok: false,
        motivo: "Nessuna sede assegnata",
      };
    }

    return {
      ok: true,
      tipo: "dipendente",
      dipendente,
      sedi,
      sedeAttiva: window.state.sedeAttiva || null,
    };
  },

  async caricaPermessiEffettivi() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user || !azienda) {
      window.state.permessi = {};
      window.state._allAccess = false;
      return;
    }

    const ruolo =
      window.state.viewAs ||
      window.state.ruolo;

    if (
      window.state.isSuperadmin === true ||
      ruolo === "superadmin" ||
      ruolo === "admin"
    ) {

      window.state.permessi = {};
      window.state._allAccess = true;

      return;
    }

    let permessiDB = {};

    try {

      const { data, error } =
        await window.supabase.rpc(
          "permessi_effettivi",
          {
            p_user_id: user.id,
            p_azienda_id: azienda.id,
          }
        );

      if (!error && data) {
        permessiDB = data;
      }

    } catch (e) {

      console.warn(
        "Permessi DB fallback:",
        e
      );
    }

    window.state.permessi = permessiDB;
    window.state._allAccess = false;
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

    const {
      data: ruoloData,
      error: ruoloError,
    } = await window.supabase
      .from("utenti_aziende")
      .select("ruolo")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .maybeSingle();

    if (ruoloError) {

      console.error(
        "Errore ruolo:",
        ruoloError
      );

      window.state.ruolo = null;
      window.state.reparti = [];
      window.state.repartoAttivo = null;

      return;
    }

    const ruoloDB =
      String(ruoloData?.ruolo || "")
        .toLowerCase()
        .trim();

    let ruoloNormalizzato = ruoloDB;

    if (
      ruoloDB === "manager_cucina" ||
      ruoloDB === "manager_sala"
    ) {
      ruoloNormalizzato = "manager";
    }

    if (
      ruoloDB === "operatore_cucina" ||
      ruoloDB === "operatore_sala"
    ) {
      ruoloNormalizzato = "operatore";
    }

    const ruoloEffettivo =
      window.state.viewAs ||
      ruoloNormalizzato;

    if (!window.state.viewAs) {
      window.state.ruolo = ruoloNormalizzato;
    }

    if (
      window.state.isSuperadmin === true ||
      ruoloEffettivo === "superadmin" ||
      ruoloEffettivo === "admin"
    ) {

      const {
        data: repartiData,
        error: repartiError,
      } = await window.supabase
        .from("reparti")
        .select("id, nome")
        .eq("azienda_id", azienda.id)
        .eq("attivo", true)
        .order("sort_order", {
          ascending: true,
        });

      if (repartiError) {

        console.error(
          "Errore reparti:",
          repartiError
        );

        window.state.reparti = [];
        window.state.repartoAttivo = null;

        return;
      }

      this.setReparti(repartiData || []);

      return;
    }

    const {
      data: urData,
      error: urError,
    } = await window.supabase
      .from("utenti_reparti")
      .select(`
        reparto_id,
        reparti (
          id,
          nome
        )
      `)
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true);

    if (!urError && urData?.length > 0) {

      const reparti = urData
        .map(r => r.reparti)
        .filter(Boolean);

      this.setReparti(reparti);

      return;
    }

    const {
      data: dipendente,
      error: dipError,
    } = await window.supabase
      .from("dipendenti")
      .select(`
        reparto_id,
        reparti (
          id,
          nome
        )
      `)
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .maybeSingle();

    if (dipError) {

      console.error(
        "Errore fallback reparto dipendente:",
        dipError
      );

      window.state.reparti = [];
      window.state.repartoAttivo = null;

      return;
    }

    if (!dipendente?.reparti) {

      window.state.reparti = [];
      window.state.repartoAttivo = null;

      return;
    }

    this.setReparti([
      dipendente.reparti,
    ]);
  },

  autoSetAzienda() {
    const aziendeLink =
      window.state.aziende || [];

    const storedId = localStorage.getItem(
      this.LS_KEYS.ACTIVE_AZIENDA_ID
    );

    if (aziendeLink.length === 0) {

      window.state.azienda = null;
      window.state.sedi = [];
      window.state.sedeAttiva = null;
      window.state.dipendente = null;
      window.state.sediDipendente = [];

      localStorage.removeItem(
        this.LS_KEYS.ACTIVE_AZIENDA_ID
      );

      localStorage.removeItem(
        this.LS_KEYS.ACTIVE_SEDE_ID
      );

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }

      return;
    }

    if (storedId) {

      const match = aziendeLink.find(
        a => String(a.aziende?.id) === String(storedId)
      );

      if (match?.aziende) {

        window.state.azienda = match.aziende;

        return;
      }

      localStorage.removeItem(
        this.LS_KEYS.ACTIVE_AZIENDA_ID
      );
    }

    const piattaformaLink = aziendeLink.find(
      a => a.aziende && a.aziende.stato === "piattaforma"
    );

    if (piattaformaLink) {

      window.state.azienda = piattaformaLink.aziende;

      localStorage.setItem(
        this.LS_KEYS.ACTIVE_AZIENDA_ID,
        String(piattaformaLink.aziende.id)
      );

      return;
    }

    if (aziendeLink.length === 1) {

      window.state.azienda = aziendeLink[0].aziende;

      localStorage.setItem(
        this.LS_KEYS.ACTIVE_AZIENDA_ID,
        String(aziendeLink[0].aziende.id)
      );

      return;
    }

    window.state.azienda = null;
  },
};
