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
      window.state.sedeAttiva = lista.length > 0 ? lista[0] : null;
      if (window.state.sedeAttiva?.id) {
        localStorage.setItem(this.LS_KEYS.ACTIVE_SEDE_ID, String(window.state.sedeAttiva.id));
      }
    }

    if (!window.state.sedeAttiva && lista.length > 0) {
      window.state.sedeAttiva = lista[0];
      localStorage.setItem(this.LS_KEYS.ACTIVE_SEDE_ID, String(lista[0].id));
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

    const { data: utentiSediData, error: utentiSediError } = await window.supabase
      .from("utenti_sedi")
      .select("sede_id, is_default")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id);

    if (utentiSediError) {
      console.error("Errore caricamento utenti_sedi:", utentiSediError);
      window.state.sediDipendente = [];
      return [];
    }

    const righeUtentiSedi = utentiSediData || [];
    const sedeIds = [...new Set(righeUtentiSedi.map((row) => row.sede_id).filter(Boolean))];

    if (sedeIds.length === 0) {
      window.state.sediDipendente = [];
      return [];
    }

    const defaultMap = righeUtentiSedi.reduce((acc, row) => {
      if (row.sede_id) {
        acc[String(row.sede_id)] = row.is_default === true;
      }
      return acc;
    }, {});

    const { data: sediData, error: sediError } = await window.supabase
      .from("sedi")
      .select("id, nome, indirizzo, latitudine, longitudine")
      .eq("azienda_id", azienda.id)
      .in("id", sedeIds)
      .order("nome", { ascending: true });

    if (sediError) {
      console.error("Errore caricamento sedi da utenti_sedi:", sediError);
      window.state.sediDipendente = [];
      return [];
    }

    const sedi = (sediData || []).map((sede) => ({
      id: sede.id,
      nome: sede.nome,
      indirizzo: sede.indirizzo,
      latitudine: sede.latitudine,
      longitudine: sede.longitudine,
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
  const sedeAttiva = defaultSede || sedi[0];

  window.state.sedeAttiva = sedeAttiva;
  localStorage.setItem(this.LS_KEYS.ACTIVE_SEDE_ID, String(sedeAttiva.id));

  return {
    ok: true,
    tipo: "dipendente_multi_sede",
    dipendente,
    sedi,
    sedeAttiva,
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
    ruolo === "admin"
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

  console.log("DEBUG caricaRuoloEReparti", { user, azienda });

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

  if (!window.state.viewAs) {
    window.state.ruolo = ruoloDB;
  } else {
    console.log("🔁 VIEW AS ATTIVO:", window.state.viewAs);
  }

  const ruoloEffettivo = window.state.viewAs || ruoloDB;

  console.log("Ruolo effettivo:", ruoloEffettivo);

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
}
      console.log("Reparti ADMIN:", repartiData);

      this.setReparti(repartiData || []);
      return;
    }

    const { data: urData, error: urError } = await window.supabase
      .from("utenti_reparti")
      .select("reparto_id, reparti(id, nome)")
      .eq("user_id", user.id)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true);

    if (urError) {
      console.error("Errore utenti_reparti:", urError);
      window.state.reparti = [];
      window.state.repartoAttivo = null;
      return;
    }

    const reparti = (urData || []).map((r) => r.reparti).filter(Boolean);

    console.log("Reparti UTENTE:", reparti);

    this.setReparti(reparti);
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
