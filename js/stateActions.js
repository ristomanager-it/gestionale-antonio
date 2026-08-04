// js/stateActions.js
// ======================================================
// Azioni stato globali + normalizzazione contesto operativo
// ======================================================

(function () {
  const ROLE_ALIASES = Object.freeze({
    manager_cucina: "manager",
    manager_sala: "manager",
    operatore_cucina: "operatore",
    operatore_sala: "operatore",
    wedding_planner: "agenzia",
    partner: "agenzia",
  });

  function normalizeRuolo(ruolo) {
    const raw = String(ruolo || "").toLowerCase().trim();
    return ROLE_ALIASES[raw] || raw || null;
  }

  function normalizeRepartoNome(nome) {
    return String(nome || "").toLowerCase().trim();
  }

  function getRepartoNomeFromLegacyRole(ruolo) {
    const raw = String(ruolo || "").toLowerCase().trim();
    if (raw.endsWith("_cucina")) return "cucina";
    if (raw.endsWith("_sala")) return "sala";
    return null;
  }

  function uniqueByIdOrName(items) {
    const out = [];
    const seen = new Set();

    (Array.isArray(items) ? items : []).forEach((item) => {
      if (!item) return;
      const key = item.id ? `id:${item.id}` : `nome:${normalizeRepartoNome(item.nome)}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });

    return out;
  }

  window.normalizeRuolo = normalizeRuolo;
  window.normalizeRepartoNome = normalizeRepartoNome;
  window.getRepartoNomeFromLegacyRole = getRepartoNomeFromLegacyRole;
  window.hasRepartoNome = function (nome) {
    const target = normalizeRepartoNome(nome);
    if (!target) return false;

    const ruoloRaw = window.state?.ruoloRaw || window.state?.ruolo;
    const legacyReparto = getRepartoNomeFromLegacyRole(ruoloRaw);
    if (legacyReparto === target) return true;

    return (window.state?.reparti || []).some((r) => normalizeRepartoNome(r?.nome) === target);
  };

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
    const normalized = normalizeRuolo(ruolo);
    if (!window.state.viewAs) {
      window.state.ruoloRaw = ruolo || null;
      window.state.ruolo = normalized;
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
    window.state.aziende = Array.isArray(aziende) ? aziende : [];
  },

  setAzienda(azienda) {
    // FIX: prima si controllava solo window.state.azienda per capire se
    // l'azienda era "cambiata" — ma window.state.azienda parte sempre vuoto
    // ad ogni refresh/apertura pagina (è in-memory, non persistito), quindi
    // questo metodo veniva richiamato e azzerava active_sede_id ANCHE
    // quando era esattamente la stessa azienda di prima. Risultato: i
    // collaboratori/manager multi-sede dovevano riselezionare la sede ad
    // ogni caricamento pagina. Ora confrontiamo con l'azienda salvata in
    // localStorage (che invece persiste tra i refresh) e azzeriamo la sede
    // SOLO se l'azienda è davvero diversa da prima.
    const previousAziendaId = localStorage.getItem(this.LS_KEYS.ACTIVE_AZIENDA_ID);
    const isSameAzienda = !!(azienda?.id && previousAziendaId && String(azienda.id) === String(previousAziendaId));

    window.state.azienda = azienda || null;

    if (azienda?.id) {
      localStorage.setItem(this.LS_KEYS.ACTIVE_AZIENDA_ID, String(azienda.id));
    }

    if (!isSameAzienda) {
      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);
      window.state.sedeAttiva = null;
    }

    window.state.sedi = [];
    window.state.dipendente = null;
    window.state.sediDipendente = [];

    if (window.uiActions?.renderSedeSelector) {
      window.uiActions.renderSedeSelector();
    }
  },

  setSedi(sedi) {
    const lista = Array.isArray(sedi) ? sedi : [];
    window.state.sedi = lista;

    const storedSedeId = localStorage.getItem(this.LS_KEYS.ACTIVE_SEDE_ID);

    if (lista.length === 0) {
      window.state.sedeAttiva = null;
      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);
    } else if (lista.length === 1) {
      window.state.sedeAttiva = lista[0];
      localStorage.setItem(this.LS_KEYS.ACTIVE_SEDE_ID, String(lista[0].id));
    } else if (storedSedeId) {
      const match = lista.find((s) => String(s.id) === String(storedSedeId));
      window.state.sedeAttiva = match || null;
      if (!match) localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);
    } else {
      window.state.sedeAttiva = null;
      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);
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
      .select("id, nome, cognome, email, user_id, azienda_id, reparto_id, attivo, profilo_completato")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .maybeSingle();

    if (error) {
      console.error("Errore caricamento dipendente corrente:", error);
      return null;
    }

    window.state.dipendente = data || null;
    return data || null;
  },

  async caricaSediDipendente(dipendenteId) {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user?.id || !azienda?.id) {
      window.state.sediDipendente = [];
      return [];
    }

    let sedeIds = [];
    let defaultMap = {};

    try {
      const { data: utentiSediData, error: utentiSediError } = await window.supabase
        .from("utenti_sedi")
        .select("sede_id, is_default")
        .eq("user_id", user.id)
        .eq("azienda_id", azienda.id);

      if (!utentiSediError && Array.isArray(utentiSediData)) {
        sedeIds = [...new Set(utentiSediData.map((row) => row.sede_id).filter(Boolean))];
        defaultMap = utentiSediData.reduce((acc, row) => {
          if (row.sede_id) acc[String(row.sede_id)] = row.is_default === true;
          return acc;
        }, {});
      } else if (utentiSediError) {
        console.warn("utenti_sedi non disponibile, uso fallback dipendenti.sede_id:", utentiSediError);
      }
    } catch (e) {
      console.warn("Fallback sedi dipendente:", e);
    }

    if (sedeIds.length === 0 && dipendenteId) {
      try {
        const { data: dipFallback, error: dipFallbackError } = await window.supabase
          .from("dipendenti")
          .select("sede_id")
          .eq("id", dipendenteId)
          .eq("azienda_id", azienda.id)
          .maybeSingle();

        if (!dipFallbackError && dipFallback?.sede_id) {
          sedeIds = [dipFallback.sede_id];
          defaultMap[String(dipFallback.sede_id)] = true;
        }
      } catch (e) {
        console.warn("Fallback dipendenti.sede_id fallito:", e);
      }
    }

    if (sedeIds.length === 0 && dipendenteId) {
      try {
        const { data: dsData, error: dsError } = await window.supabase
          .from("dipendenti_sedi")
          .select("sede_id, is_default")
          .eq("dipendente_id", dipendenteId);

        if (!dsError && Array.isArray(dsData)) {
          sedeIds = [...new Set(dsData.map((row) => row.sede_id).filter(Boolean))];
          defaultMap = dsData.reduce((acc, row) => {
            if (row.sede_id) acc[String(row.sede_id)] = row.is_default === true;
            return acc;
          }, defaultMap);
        }
      } catch (e) {
        console.warn("Fallback dipendenti_sedi fallito:", e);
      }
    }

    if (sedeIds.length === 0) {
      window.state.sediDipendente = [];
      return [];
    }

    const { data: sediData, error: sediError } = await window.supabase
      .from("sedi")
      .select("id, nome, indirizzo, latitudine, longitudine, logo_url")
      .eq("azienda_id", azienda.id)
      .in("id", sedeIds)
      .order("nome", { ascending: true });

    if (sediError) {
      console.error("Errore caricamento sedi assegnate:", sediError);
      window.state.sediDipendente = [];
      return [];
    }

    const sedi = (sediData || []).map((sede) => ({
      ...sede,
      is_default: defaultMap[String(sede.id)] === true,
    }));

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

      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }
      return;
    }

    const ruolo = window.state.viewAs || window.state.ruolo;

    const isAdmin =
      window.state.isSuperadmin === true ||
      ruolo === "superadmin" ||
      ruolo === "admin";

    if (!isAdmin) {
      if (!user?.id) {
        window.state.sedi = [];
        window.state.sedeAttiva = null;
        window.state.sediDipendente = [];
        localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

        if (window.uiActions?.renderSedeSelector) {
          window.uiActions.renderSedeSelector();
        }
        return;
      }

      const sediDipendente = await this.caricaSediDipendente(window.state.dipendente?.id);
      this.setSedi(sediDipendente);
      return;
    }

    const { data, error } = await window.supabase
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

  // Recupera dalla localStorage una sede valida dell'azienda corrente.
  // Usata come rete di salvataggio in caricaContestoOperativo per non
  // buttare via la sede scelta dall'utente quando mancano le assegnazioni.
  async _recuperaSedeDaStorage(aziendaId) {
    try {
      const storedSedeId = localStorage.getItem(this.LS_KEYS.ACTIVE_SEDE_ID);
      if (!storedSedeId) return null;
      const { data, error } = await window.supabase
        .from("sedi")
        .select("id, nome, indirizzo, latitudine, longitudine")
        .eq("id", storedSedeId)
        .eq("azienda_id", aziendaId)
        .maybeSingle();
      if (error || !data) return null;
      window.state.sedi = [data];
      window.state.sedeAttiva = data;
      if (window.uiActions?.renderSedeSelector) {
        window.uiActions.renderSedeSelector();
      }
      return data;
    } catch (e) {
      console.warn("Recupero sede da storage fallito:", e);
      return null;
    }
  },

  async caricaContestoOperativo() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user?.id || !azienda?.id) {
      window.state.dipendente = null;
      window.state.sediDipendente = [];
      window.state.sedi = [];
      window.state.sedeAttiva = null;
      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);
      return {
        ok: false,
        motivo: "Utente o azienda non caricati",
      };
    }

    await this.caricaRuoloEReparti();
    await this.caricaPermessiEffettivi();

    const ruolo = window.state.viewAs || window.state.ruolo;

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

    const dipendente = await this.caricaDipendenteCorrente();
    const sedi = await this.caricaSediDipendente(dipendente?.id);
    this.setSedi(sedi);

    if (!dipendente?.id && sedi.length === 0) {
      // FIX "sede persa a ogni navigazione": prima di azzerare tutto,
      // se in localStorage c'è una sede VALIDA di questa azienda (scelta
      // dall'utente in gestione-sedi), la teniamo buona. Senza questo,
      // gli utenti senza righe in utenti_sedi perdevano la sede a ogni
      // cambio modulo e dovevano riaprirla dal menu laterale.
      const sedeRecuperata = await this._recuperaSedeDaStorage(azienda.id);
      if (sedeRecuperata) {
        return {
          ok: true,
          tipo: "sede_da_storage",
          dipendente,
          sedi: [sedeRecuperata],
          sedeAttiva: sedeRecuperata,
        };
      }

      window.state.sedi = [];
      window.state.sedeAttiva = null;
      window.state.sediDipendente = [];
      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

      return {
        ok: false,
        motivo: "Dipendente non trovato",
      };
    }

    if (sedi.length === 0) {
      // FIX: stesso recupero da localStorage (vedi commento sopra)
      const sedeRecuperata = await this._recuperaSedeDaStorage(azienda.id);
      if (sedeRecuperata) {
        return {
          ok: true,
          tipo: "sede_da_storage",
          dipendente,
          sedi: [sedeRecuperata],
          sedeAttiva: sedeRecuperata,
        };
      }

      window.state.sedeAttiva = null;
      localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

      return {
        ok: false,
        motivo: "Nessuna sede assegnata",
      };
    }

    if (sedi.length === 1) {
      window.state.sedeAttiva = sedi[0];
      localStorage.setItem(this.LS_KEYS.ACTIVE_SEDE_ID, String(sedi[0].id));

      return {
        ok: true,
        tipo: "dipendente_sede_unica",
        dipendente,
        sedi,
        sedeAttiva: sedi[0],
      };
    }

    const storedSedeId = localStorage.getItem(this.LS_KEYS.ACTIVE_SEDE_ID);
    const storedMatch = storedSedeId
      ? sedi.find((s) => String(s.id) === String(storedSedeId))
      : null;

    if (storedMatch) {
      window.state.sedeAttiva = storedMatch;

      return {
        ok: true,
        tipo: "dipendente_multi_sede_con_sede_salvata",
        dipendente,
        sedi,
        sedeAttiva: storedMatch,
      };
    }

    const defaultSede = sedi.find((s) => s.is_default === true);

    window.state.sedeAttiva = null;
    localStorage.removeItem(this.LS_KEYS.ACTIVE_SEDE_ID);

    return {
      ok: true,
      tipo: "dipendente_multi_sede",
      dipendente,
      sedi,
      sedeAttiva: null,
      sedeSuggerita: defaultSede || null,
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

    const ruolo = window.state.viewAs || window.state.ruolo;

    if (
      window.state.isSuperadmin === true ||
      ruolo === "superadmin" ||
      ruolo === "admin" ||
      ruolo === "manager" ||
      ruolo === "operatore"
    ) {
      window.state.permessi = {};
      window.state._allAccess = true;
      return;
    }

    let permessiDB = {};

    try {
      const { data, error } = await window.supabase.rpc("permessi_effettivi", {
        p_user_id: user.id,
        p_azienda_id: azienda.id,
      });

      if (!error && data) {
        permessiDB = data;
      }
    } catch (e) {
      console.warn("Permessi DB fallback:", e);
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

    const { data: ruoloData, error: ruoloError } = await window.supabase
      .from("utenti_aziende")
      .select("ruolo")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .maybeSingle();

    if (ruoloError) {
      console.error("Errore ruolo:", ruoloError);
      window.state.ruolo = null;
      window.state.reparti = [];
      window.state.repartoAttivo = null;
      return;
    }

    const ruoloDB = ruoloData?.ruolo || null;
    const ruoloNormalizzato = normalizeRuolo(ruoloDB);
    const ruoloEffettivo = window.state.viewAs || ruoloNormalizzato;

    if (!window.state.viewAs) {
      window.state.ruoloRaw = ruoloDB;
      window.state.ruolo = ruoloNormalizzato;
    }

    if (
      window.state.isSuperadmin === true ||
      ruoloEffettivo === "superadmin" ||
      ruoloEffettivo === "admin"
    ) {
      const { data: repartiData, error: repartiError } = await window.supabase
        .from("reparti")
        .select("id, nome")
        .eq("azienda_id", azienda.id)
        .eq("attivo", true)
        .order("sort_order", { ascending: true });

      if (repartiError) {
        console.error("Errore reparti:", repartiError);
        window.state.reparti = [];
        window.state.repartoAttivo = null;
        return;
      }

      this.setReparti(repartiData || []);
      return;
    }

    const { data: urData, error: urError } = await window.supabase
      .from("utenti_reparti")
      .select("reparto_id, reparti(id, nome)")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true);

    let reparti = [];

    if (urError) {
      console.warn("utenti_reparti non disponibile, uso fallback dipendenti.reparto_id:", urError);
    } else {
      reparti = (urData || []).map((r) => r.reparti).filter(Boolean);
    }

    if (reparti.length === 0) {
      try {
        const dip = window.state.dipendente || await this.caricaDipendenteCorrente();

        if (dip?.reparto_id) {
          const { data: repartoFallback, error: repartoFallbackError } = await window.supabase
            .from("reparti")
            .select("id, nome")
            .eq("azienda_id", azienda.id)
            .eq("id", dip.reparto_id)
            .maybeSingle();

          if (!repartoFallbackError && repartoFallback) {
            reparti = [repartoFallback];
          }
        }
      } catch (e) {
        console.warn("Fallback dipendenti.reparto_id fallito:", e);
      }
    }

    const repartoLegacy = getRepartoNomeFromLegacyRole(ruoloDB);
    if (repartoLegacy && reparti.length === 0) {
      reparti = [{ id: null, nome: repartoLegacy }];
    }

    this.setReparti(uniqueByIdOrName(reparti));
  },

  autoSetAzienda() {
    const aziendeLink = window.state.aziende || [];
    const storedId = localStorage.getItem(this.LS_KEYS.ACTIVE_AZIENDA_ID);

    if (aziendeLink.length === 0) {
      window.state.azienda = null;
      window.state.sedi = [];
      window.state.sedeAttiva = null;
      window.state.dipendente = null;
      window.state.sediDipendente = [];

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

})();
