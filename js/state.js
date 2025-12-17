// js/state.js
// Stato globale dell'app (centralizzato).
// Qui metteremo anche il MULTILOCALE (currentLocale) e cache condivise.

(function () {
  const DEFAULTS = {
    // utente loggato
    currentUser: null,

    // 🔥 multilocale: oggetto locale selezionato (per ora null)
    // Esempio futuro: { id: 'uuid', nome: 'Ristorante Centro' }
    currentLocale: null,

    // cache principali (le popoleremo gradualmente spostando le sezioni)
    dipendenti: [],
    timbrature: [],
    ricette: [],
    magazzino: [],
    fornitori: [],
    categorieProdotto: [],

    // stato UI / navigazione
    periodoCorrente: "oggi",
  };

  // Se esiste già, non sovrascrivo (utile se ricarichi script più volte)
  window.AppState = window.AppState || { ...DEFAULTS };

  // Utility comoda per debug
  window.AppState.reset = function resetAppState() {
    Object.keys(DEFAULTS).forEach((k) => (window.AppState[k] = DEFAULTS[k]));
  };
})();
