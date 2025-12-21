document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – LOGIN STABLE MODE");

  const $ = (id) => document.getElementById(id);

  // =========================
  // VISTE
  // =========================
  const views = document.querySelectorAll(".view");
  const viewLogin = $("view-login");
  const viewHome = $("view-home-dip");

  // =========================
  // LOGIN
  // =========================
  const btnLogin = $("btn-login");
  const inputNome = $("login-nome");
  const inputPin = $("login-pin");

  // =========================
  // HEADER
  // =========================
  const currentUserLabel = $("current-user-label");
  const btnLogout = $("btn-logout");

  // =========================
  // LOCALI
  // =========================
  const LOCALI = {
    CP: "Centro Produzione",
    TA: "Trattoria dell’Aquila",
    AP: "Da Antonio Pizza",
    CR: "Campo Antico Ristorante",
    CC: "Campo Antico Catering",
  };

  // =========================
  // UTENTI (TEMP)
  // =========================
  const UTENTI = {
    admin: {
      pin: "9999",
      ruolo: "superadmin",
      locale: "CP",
    },
    michele: {
      pin: "1111",
      ruolo: "manager",
      locale: "CP",
    },
    antonio: {
      pin: "1975",
      ruolo: "manager",
      locale: "TA",
    },
  };

  // =========================
  // SESSIONE
  // =========================
  const STORAGE_KEY = "ga_session";

  const saveSession = (s) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

  const loadSession = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  };

  const clearSession = () => localStorage.removeItem(STORAGE_KEY);

  const isValidSession = (s) =>
    s &&
    s.nome &&
    s.ruolo &&
    s.locale &&
    LOCALI[s.locale];

  // =========================
  // UI
  // =========================
  function hideAll() {
    views.forEach((v) => (v.style.display = "none"));
  }

  function showLogin() {
    hideAll();
    if (viewLogin) viewLogin.style.display = "flex";
    setHeader(null);
  }

  function showHome(session) {
    hideAll();
    if (viewHome) viewHome.style.display = "block";
    setHeader(session);
  }

  function setHeader(session) {
    if (!currentUserLabel || !btnLogout) return;

    if (!session) {
      currentUserLabel.textContent = "Nessun utente";
      btnLogout.style.display = "none";
      return;
    }

    currentUserLabel.textContent =
      `${session.nome} · ${LOCALI[session.locale]}`;
    btnLogout.style.display = "inline-block";
  }

  // =========================
  // LOGOUT
  // =========================
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      clearSession();
      showLogin();
    });
  }

  // =========================
  // LOGIN CLICK
  // =========================
  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      const nome = inputNome.value.trim().toLowerCase();
      const pin = inputPin.value.trim();

      const user = UTENTI[nome];
      if (!user || user.pin !== pin) {
        alert("Nome o PIN non corretti");
        return;
      }

      const session = {
        nome,
        ruolo: user.ruolo,
        locale: user.locale,
      };

      saveSession(session);
      showHome(session);
    });
  }

  // =========================
  // AVVIO (DECISIONE UNICA)
  // =========================
  const session = loadSession();

  if (isValidSession(session)) {
    console.log("🔁 Sessione valida trovata");
    showHome(session);
  } else {
    clearSession();
    showLogin();
  }
});
