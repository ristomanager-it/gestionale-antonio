// js/state.js
(function () {
  const STATE_KEY = "ga_app_state_v1";

  const defaultState = {
    currentUser: null,
    currentLocale: null, // 👈 MULTILOCALE
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

  // =========================
  // LOCALE
  // =========================
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

    // locale
    setCurrentLocale,
    getCurrentLocale,
    clearLocale,
  };
})();
