document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – FIX LOGIN REFRESH");

  const supabase = window.supabaseClient;

  // =========================
  // VISTE
  // =========================
  const views = document.querySelectorAll(".view");
  const viewLogin = document.getElementById("view-login");
  const managerMenu = document.getElementById("manager-menu");

  // =========================
  // HEADER (opzionali)
  // =========================
  const currentUserLabel = document.getElementById("current-user-label");
  const btnLogout = document.getElementById("btn-logout");

  // =========================
  // LOGIN
  // =========================
  const btnLogin = document.getElementById("btn-login");
  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

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

  function saveSession(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function isValidSession(s) {
    return (
      s &&
      typeof s.nome === "string" &&
      typeof s.ruolo === "string" &&
      typeof s.locale === "string"
    );
  }

  // =========================
  // UI
  // =========================
  function hideAllViews() {
    views.forEach(v => (v.style.display = "none"));
  }

  function showView(view) {
    hideAllViews();
    if (view) view.style.display = "block";
  }

  function setHeader(session) {
    if (!currentUserLabel || !btnLogout) return;

    if (!session) {
      currentUserLabel.textContent = "Nessun utente";
      btnLogout.style.display = "none";
      return;
    }

    currentUserLabel.textContent =
      session.nome + " · " + LOCALI[session.locale];
    btnLogout.style.display = "inline-block";
  }

  // =========================
  // LOGOUT
  // =========================
  btnLogout?.addEventListener("click", () => {
    clearSession();
    setHeader(null);
    showView(viewLogin);
  });

  // =========================
  // LOGIN
  // =========================
  btnLogin?.addEventListener("click", () => {
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

  // =========================
  // ENTER APP
  // =========================
  function enterApp(session) {
    setHeader(session);
    showView(managerMenu);
  }

  // =========================
  // AVVIO APP (QUI ERA IL BUG)
  // =========================
  const session = loadSession();

  if (isValidSession(session)) {
    console.log("🔁 Sessione valida trovata:", session);
    enterApp(session);
  } else {
    console.log("🔐 Nessuna sessione valida → login");
    clearSession();
    showView(viewLogin);
  }
});
