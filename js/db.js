// js/db.js
// =====================================
// Wrapper centrale query multi-azienda / multi-sede
// + Blocco operatività se azienda sospesa
// =====================================

(function () {

  function requireAzienda() {
    if (!window.state?.azienda?.id) {
      throw new Error("Azienda non selezionata.");
    }
  }

  function requireAziendaAttiva() {
    if (window.state?.azienda?.stato === "sospesa") {
      throw new Error("Azienda sospesa. Contatta l'amministratore della piattaforma.");
    }
  }

  function requireSedeIfNeeded() {
    if (
      Array.isArray(window.state?.sedi) &&
      window.state.sedi.length > 1 &&
      !window.state?.sedeAttiva?.id
    ) {
      throw new Error("Seleziona una sede prima di procedere.");
    }
  }

  window.db = {

    // SELECT con filtro automatico
    select(table, selectString = "*") {
      requireAzienda();
      requireAziendaAttiva();

      let query = window.supabaseClient
        .from(table)
        .select(selectString)
        .eq("azienda_id", window.state.azienda.id);

      if (window.state?.sedeAttiva?.id) {
        query = query.eq("sede_id", window.state.sedeAttiva.id);
      }

      return query;
    },

    // INSERT con azienda_id + sede_id automatici
    insert(table, payload) {
      requireAzienda();
      requireAziendaAttiva();
      requireSedeIfNeeded();

      const data = {
        ...payload,
        azienda_id: window.state.azienda.id,
      };

      if (window.state?.sedeAttiva?.id) {
        data.sede_id = window.state.sedeAttiva.id;
      }

      return window.supabaseClient
        .from(table)
        .insert(data)
        .select();
    },

    // UPDATE con filtro automatico
    update(table, payload, idField = "id", idValue) {
      requireAzienda();
      requireAziendaAttiva();
      requireSedeIfNeeded();

      let query = window.supabaseClient
        .from(table)
        .update(payload)
        .eq("azienda_id", window.state.azienda.id)
        .eq(idField, idValue);

      if (window.state?.sedeAttiva?.id) {
        query = query.eq("sede_id", window.state.sedeAttiva.id);
      }

      return query.select();
    },

    // DELETE con filtro automatico
    delete(table, idField = "id", idValue) {
      requireAzienda();
      requireAziendaAttiva();
      requireSedeIfNeeded();

      let query = window.supabaseClient
        .from(table)
        .delete()
        .eq("azienda_id", window.state.azienda.id)
        .eq(idField, idValue);

      if (window.state?.sedeAttiva?.id) {
        query = query.eq("sede_id", window.state.sedeAttiva.id);
      }

      return query;
    }

  };

})();
