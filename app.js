document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – STEP 2 Blocco viste per locale");

  // =========================
  // VISTE PRINCIPALI
  // =========================
  const viewLogin = document.getElementById("view-login");
  const viewLocale = document.getElementById("view-locale");
  const viewHomeDip = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");

  const btnLogout = document.getElementById("btn-logout");
  const currentUserLabel = document.getElementById("current-user-label");

  // Tutte le viste con id="view-..."
  const ALL_VIEWS = document.querySelectorAll(".view");

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
  // UTENTI (TEMPORANEI)
  // =========================
  const UTENTI = {
    admin: {
      pin: "9999",
      ruolo: "superadmin",
      locali: ["CP", "TA", "AP", "CR", "CC"],
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // =========================
  // UI HELPERS
  // =========================
  function hideAllViews() {
    ALL_VIEWS.forEach(v => (v.style.display = "none"));
  }

  function showView(view) {
    hideAllViews();
    if (view) view.style.display = "block";
  }

  function setHeaderUser(session) {
    if (!session) {
      currentUserLabel.textContent = "Nessun utente";
      btnLogout.style.display = "none";
      return;
    }

    const localeNome = LOCALI[session.locale] || "";
    currentUserLabel.textContent = `${session.nome} · ${localeNome}`;
    btnLogout.style.display = "inline-block";
  }

  // =========================
  // ACCESS CONTROL
  // =========================
  function canAccessLocale(session, localeCode) {
    if (!session) return false;
    if (session.ruolo === "superadmin") return true;
    return session.locale === localeCode;
  }

  function enterApp(session) {
    setHeaderUser(session);

    // DIPENDENTE / MANAGER → menu
    if (session.ruolo === "manager") {
      showView(managerMenu);
      return;
    }

    // SUPERADMIN → home base
    showView(managerMenu);
  }

  // =========================
  // LOGOUT
  // =========================
  btnLogout.addEventListener("click", () => {
    clearSession();
    inputNome.value = "";
    inputPin.value = "";
    setHeaderUser(null);
    showView(viewLogin);
  });

  // =========================
  // LOGIN
  // =========================
  btnLogin.addEventListener("click", () => {
    const nome = inputNome.value.trim().toLowerCase();
    const pin = inputPin.value.trim();

    const user = UTENTI[nome];

    if (!user || user.pin !== pin) {
      alert("Nome o PIN non corretti");
      return;
    }

    // SUPERADMIN → sceglie locale
    if (user.ruolo === "superadmin") {
      showView(viewLocale);

      document.querySelectorAll("[data-locale]").forEach(btn => {
        const code = btn.dataset.locale;

        btn.style.display = user.locali.includes(code)
          ? "block"
          : "none";

        btn.onclick = () => {
          const session = {
            nome,
            ruolo: user.ruolo,
            locale: code,
          };
          saveSession(session);
          enterApp(session);
        };
      });

      return;
    }

    // MANAGER → entra diretto nel suo locale
    const session = {
      nome,
      ruolo: user.ruolo,
      locale: user.locali[0],
    };

    saveSession(session);
    enterApp(session);
  });

  // =========================
  // ROUTING INTERNO (BOTTONI)
  // =========================
  document.querySelectorAll("[data-route]").forEach(btn => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.route;
      const view = document.getElementById(`view-${route}`);
      if (!view) return;

      showView(view);
    });
  });

  // =========================
  // AVVIO APP
  // =========================
  const session = loadSession();

  if (session && canAccessLocale(session, session.locale)) {
    console.log("♻️ Sessione ripristinata:", session);
    enterApp(session);
  } else {
    showView(viewLogin);
  }
});
