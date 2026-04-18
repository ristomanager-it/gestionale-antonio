// js/db.js
// =====================================
// Wrapper centrale query multi-azienda / multi-sede
// VERSIONE HARD-ENFORCED + CHAINABLE
// =====================================

(function () {

  function getClient() {
    if (!window.supabase) {
      throw new Error("Supabase non inizializzato");
    }
    return window.supabase;
  }

  function requireAzienda() {
    if (!window.state?.azienda?.id) {
      throw new Error("Azienda non selezionata.");
    }
  }

  function requireAziendaAttiva() {
    if (window.state?.azienda?.stato === "sospesa") {
      throw new Error("Azienda sospesa.");
    }
  }

  function requireSede() {
    const sedi = window.state?.sedi || [];

    if (sedi.length > 0 && !window.state?.sedeAttiva?.id) {
      throw new Error("Seleziona una sede prima di operare.");
    }
  }

  function applyScope(query) {
    query = query.eq("azienda_id", window.state.azienda.id);

    if (window.state?.sedeAttiva?.id) {
      query = query.eq("sede_id", window.state.sedeAttiva.id);
    }

    return query;
  }

  function buildQuery(table, selectString = "*") {
    requireAzienda();
    requireAziendaAttiva();

    const client = getClient();

    let query = client.from(table).select(selectString);

    query = applyScope(query);

    return query;
  }

  window.db = {

    // =========================
    // SELECT
    // =========================
    from(table) {

      requireAzienda();
      requireAziendaAttiva();

      const client = getClient();

      let base = client.from(table);

      return {
        select(selectString = "*") {
          let query = base.select(selectString);
          query = applyScope(query);
          return query;
        }
      };
    },

    // =========================
    // SELECT SHORTCUT
    // =========================
    select(table, selectString = "*") {
      return buildQuery(table, selectString);
    },

    // =========================
    // INSERT
    // =========================
    insert(table, payload) {
      requireAzienda();
      requireAziendaAttiva();
      requireSede();

      const client = getClient();

      const data = {
        ...payload,
        azienda_id: window.state.azienda.id,
        sede_id: window.state.sedeAttiva?.id || null
      };

      return client
        .from(table)
        .insert(data)
        .select();
    },

    // =========================
    // UPDATE
    // =========================
    update(table, payload, idField = "id", idValue) {
      requireAzienda();
      requireAziendaAttiva();
      requireSede();

      const client = getClient();

      let query = client
        .from(table)
        .update(payload)
        .eq("azienda_id", window.state.azienda.id)
        .eq(idField, idValue);

      query = applyScope(query);

      return query.select();
    },

    // =========================
    // DELETE
    // =========================
    delete(table, idField = "id", idValue) {
      requireAzienda();
      requireAziendaAttiva();
      requireSede();

      const client = getClient();

      let query = client
        .from(table)
        .delete()
        .eq("azienda_id", window.state.azienda.id)
        .eq(idField, idValue);

      query = applyScope(query);

      return query;
    }

  };

})();
