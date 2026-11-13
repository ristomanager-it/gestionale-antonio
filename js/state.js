// js/state.js
// ================================
// Stato globale applicazione
// ================================

window.state = {
  user: null,

  // 🔥 Profilo applicativo (tabella profili)
  profilo: null,

  // Multi-azienda (piattaforma / SaaS)
  aziende: [],
  azienda: null,

  // 🔥 Multi-sede
  sedi: [],              // elenco sedi dell’azienda attiva
  sedeAttiva: null,      // sede attualmente selezionata

  // Identità applicativa
  ruolo: null,

  // Permessi effettivi (merge base + override)
  permessi: null,

  // Reparti assegnati all’utente
  reparti: [],

  // Reparto attivo nel contesto corrente
  repartoAttivo: null,
};


// ── Tablet attivato: la sede e' quella del suo codice e non si cambia da nessuna parte ──
// L'app sceglie la sede in molti punti (ultima usata, prima in elenco, sede del dipendente...):
// invece di correggerli uno per uno, qui la sede attiva accetta solo quella del tablet.
(function () {
  function sedeTablet() {
    try {
      var aid = (window.state && window.state.azienda && window.state.azienda.id) || localStorage.getItem("active_azienda_id");
      if (!aid || !localStorage.getItem("rf_tablet_token_" + aid)) return null;
      return localStorage.getItem("rf_tablet_sede_" + aid);
    } catch (e) { return null; }
  }
  window.rfSedeTablet = sedeTablet;
  var st = window.state;
  var valore = st.sedeAttiva;
  Object.defineProperty(st, "sedeAttiva", {
    configurable: true, enumerable: true,
    get: function () { return valore; },
    set: function (v) {
      var t = sedeTablet();
      if (t && (!v || String(v.id) !== String(t))) {
        var m = (st.sedi || []).find(function (s) { return String(s.id) === String(t); });
        v = m || (valore && String(valore.id) === String(t) ? valore : { id: t, nome: "" });
        try { localStorage.setItem("active_sede_id", t); } catch (e) {}
      }
      valore = v;
    },
  });
})();
