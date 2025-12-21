document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – SAFE MODE");

  const $ = (id) => document.getElementById(id);

  // =========================
  // VISTE
  // =========================
  const views = document.querySelectorAll(".view");
  const viewLogin = $("view-login");
  const viewHomeDip = $("view-home-dip");
  const viewTimbratura = $("view-timbratura");
  const managerMenu = $("manager-menu");

  // =========================
  // HEADER
  // =========================
  const currentUserLabel = $("current-user-label");
  const btnLogout = $("btn-logout");

  // =========================
  // LOGIN
  // =========================
  const btnLogin = $("btn-login");
  const inputNome = $("login-nome");
  const inputPin = $("login-pin");

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
      locali: Object.keys(LOCALI),
    },
    michele: {
      pin: "1111",
      ruolo: "manager",
      locali: ["CP"],
    },
    antonio: {
      pin: "1975",
      ruolo: "manager",
      locali: ["TA"],
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
    s && s.nome && s.locale && LOCALI[s.locale];

  // =========================
  // UI
  // =========================
  function hideAll() {
    views.forEach((v) => (v.style.display = "none"));
    if (managerMenu) managerMenu.style.display = "none";
  }

  function showLogin() {
    hideAll();
    if (viewLogin) viewLogin.style.display = "flex";
  }

  function showManagerHome() {
    hideAll();
    if (managerMenu) managerMenu.style.display = "grid";
    if (viewTimbratura) viewTimbratura.style.display = "block";
  }

  function showDipendenteHome() {
    hideAll();
    if (viewHomeDip) viewHomeDip.style.display = "block";
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
      setHeader(null);
      showLogin();
    });
  }

  // =========================
  // LOGIN
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
        locale: user.locali[0],
      };

      saveSession(session);
      enterApp(session);
    });
  }

  // =========================
  // ENTER APP
  // =========================
  function enterApp(session) {
    console.log("➡️ Enter app:", session);
    setHeader(session);

    if (session.ruolo === "manager" || session.ruolo === "superadmin") {
      showManagerHome();
    } else {
      showDipendenteHome();
    }
  }

  // =========================
  // AVVIO
  // =========================
  const session = loadSession();

  if (isValidSession(session)) {
    console.log("🔁 Sessione ripristinata");
    enterApp(session);
  } else {
    console.log("🔐 Login richiesto");
    showLogin();
  }
});
