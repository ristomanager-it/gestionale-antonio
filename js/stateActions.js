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

  setRuolo(ruolo) {
    window.state.ruolo = ruolo || null;
  },

  setReparti(reparti) {
    const lista = Array.isArray(reparti) ? reparti : [];
    window.state.reparti = lista;

    // 🔥 Auto gestione reparto attivo
    if (lista.length === 1) {
      window.state.repartoAttivo = lista[0];
    } else {
      window.state.repartoAttivo = null;
    }

    // Aggiorna UI selector se presente
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

    // Se esiste router con reload, aggiorna vista corrente
    if (window.router?.reloadCurrentRoute) {
      window.router.reloadCurrentRoute();
    }
  },

  resetAzienda() {
    window.state.azienda = null;
    window.state.permessi = null;
    window.state.ruolo = null;
    window.state.reparti = [];
    window.state.repartoAttivo = null;

    if (window.uiActions?.renderRepartoSelector) {
      window.uiActions.renderRepartoSelector();
    }
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

  async caricaRuoloEReparti() {
    const user = window.state.user;
    const azienda = window.state.azienda;

    if (!user || !azienda) {
      window.state.ruolo = null;
      window.state.reparti = [];
      window.state.repartoAttivo = null;
      return;
    }

    // 1️⃣ Carica ruolo
    const { data: ruoloData, error: ruoloError } =
      await window.supabaseClient
        .from("utenti_aziende")
        .select("ruolo")
        .eq("user_id", user.id)
        .eq("azienda_id", azienda.id)
        .eq("attivo", true)
        .single();

    if (ruoloError) {
      console.error("Errore caricamento ruolo:", ruoloError);
      window.state.ruolo = null;
      window.state.reparti = [];
      window.state.repartoAttivo = null;
      return;
    }

    const ruolo = ruoloData?.ruolo || null;
    window.state.ruolo = ruolo;

    // 2️⃣ Admin / Superadmin → tutti i reparti azienda
    if (ruolo === "admin" || ruolo === "superadmin") {
      const { data: repartiData, error: repartiError } =
        await window.supabaseClient
          .from("reparti")
          .select("id, nome")
          .eq("azienda_id", azienda.id)
          .eq("attivo", true)
          .order("sort_order", { ascending: true });

      if (repartiError) {
        console.error("Errore caricamento reparti:", repartiError);
        window.state.reparti = [];
        window.state.repartoAttivo = null;
        return;
      }

      this.setReparti(repartiData || []);
      return;
    }

    // 3️⃣ Manager / Operatore → solo reparti assegnati
    const { data: urData, error: urError } =
      await window.supabaseClient
        .from("utenti_reparti")
        .select("reparto_id, reparti(id, nome)")
        .eq("user_id", user.id)
        .eq("azienda_id", azienda.id)
        .eq("attivo", true);

    if (urError) {
      console.error("Errore caricamento utenti_reparti:", urError);
      window.state.reparti = [];
      window.state.repartoAttivo = null;
      return;
    }

    const reparti = (urData || [])
      .map(r => r.reparti)
      .filter(Boolean);

    this.setReparti(reparti);
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
