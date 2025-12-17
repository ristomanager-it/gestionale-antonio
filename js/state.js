// js/state.js
(function () {
  const STATE_KEY = "ga_app_state_v1";

  const defaultState = {
    currentUser: null,      // titolare o dipendente
    currentAzienda: null,   // azienda del titolare
    locali: [],             // lista locali disponibili
    currentLocale: null,    // locale attivo
  };

  let state = { ...defaultState };

  // =========================
  // LOAD / SAVE
  // =========================
  function load() {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    } catch {
      // ignore
    }
  }

  function save() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  // =========================
  // USER
  // =========================
  function setCurrentUser(user) {
    state.currentUser = user;
    save();
  }

  function getCurrentUser() {
    return state.currentUser;
  }

  function clearUser() {
    state.currentUser = null;
    save();
  }

  // =========================
  // AZIENDA
  // =========================
  function setCurrentAzienda(azienda) {
    state.currentAzienda = azienda;
    save();
  }

  function getCurrentAzienda() {
    return state.currentAzienda;
  }

  function clearAzienda() {
    state.currentAzienda = null;
    save();
  }

  // =========================
  // LOCALI
  // =========================
  function setLocali(locali) {
    state.locali = locali || [];
    save();
  }

  function getLocali() {
    return state.locali || [];
  }

  function setCurrentLocale(locale) {
    state.currentLocale = locale;
    save();
  }

  function getCurrentLocale() {
    return state.currentLocale;
  }

  function clearLocale() {
    state.currentLocale = null;
    save();
  }

  function clearAll() {
    state = { ...defaultState };
    save();
  }

  // =========================
  // INIT
  // =========================
  load();

  // =========================
  // EXPORT
  // =========================
  window.AppState = {
    // user
    setCurrentUser,
    getCurrentUser,
    clearUser,

    // azienda
    setCurrentAzienda,
    getCurrentAzienda,
    clearAzienda,

    // locali
    setLocali,
    getLocali,
    setCurrentLocale,
    getCurrentLocale,
    clearLocale,

    // reset totale (logout)
    clearAll,
  };
})();
