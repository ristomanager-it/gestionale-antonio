document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – STEP 2 STABILE");

  // =========================
  // DOM
  // =========================
  const viewLogin = document.getElementById("view-login");
  const viewHomeDip = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");
  const viewTimbratura = document.getElementById("view-timbratura");

  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");

  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  const currentUserLabel = document.getElementById("current-user-label");

  // =========================
  // DATI STATICI (TEMP)
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

  const LOCALI = {
    CP: "Centro Produzione",
    TA: "Trattoria dell’Aquila",
    AP: "Da Antonio Pizza",
    CR: "Campo Antico Ristorante",
    CC: "Campo Antico Catering",
  };

  // =========================
  // HELPERS
  // =========================
  function hideAll() {
    [viewLogin, viewHomeDip, managerMenu, viewTimbratura].forEach(v => {
      if (v) v.style.display = "none";
    });
  }

  function showLogin() {
    hideAll();
    viewLogin.style.display = "block";
    localStorage.removeItem("ga_session");
    currentUserLabel.textContent = "Nessun utente";
    btnLogout.style.display = "none";
    console.log("🔐 Login visibile");
  }

  function enterApp(session) {
    console.log("➡️ Enter app:", session);

    hideAll();

    const localeNome = LOCALI[session.locale] || session.locale;
    currentUserLabel.textContent =
      `${session.nome} – ${localeNome}`;

    btnLogout.style.display = "inline-block";

    if (session.ruolo === "manager" || session.ruolo === "superadmin") {
      managerMenu.style.display = "grid";
      viewTimbratura.style.display = "block";
    } else {
      viewHomeDip.style.display = "block";
    }
  }

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

    const session = {
      nome,
      ruolo: user.ruolo,
      locale: user.locale,
    };

    localStorage.setItem("ga_session", JSON.stringify(session));
    console.log("✅ Login OK:", session);

    enterApp(session);
  });

  // =========================
  // LOGOUT
  // =========================
  btnLogout.addEventListener("click", () => {
    showLogin();
  });

  // =========================
  // RIPRISTINO SESSIONE
  // =========================
  const saved = localStorage.getItem("ga_session");
  if (saved) {
    try {
      const session = JSON.parse(saved);
      if (session?.nome && session?.locale) {
        console.log("🔁 Sessione ripristinata");
        enterApp(session);
        return;
      }
    } catch (e) {
      console.warn("Sessione corrotta");
    }
  }

  showLogin();
});
