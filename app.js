document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – LOGIN STABILE");

  // =========================
  // DOM (SAFE)
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
  // DATI TEMPORANEI
  // =========================
  const UTENTI = {
    admin: { pin: "9999", ruolo: "superadmin", locale: "CP" },
    michele: { pin: "1111", ruolo: "manager", locale: "CP" },
    antonio: { pin: "1975", ruolo: "manager", locale: "TA" },
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
  function hide(el) {
    if (el) el.style.display = "none";
  }

  function show(el, mode = "block") {
    if (el) el.style.display = mode;
  }

  function hideAll() {
    hide(viewLogin);
    hide(viewHomeDip);
    hide(managerMenu);
    hide(viewTimbratura);
  }

  function setUserLabel(text) {
    if (currentUserLabel) {
      currentUserLabel.textContent = text;
    } else {
      console.warn("⚠️ current-user-label non presente");
    }
  }

  // =========================
  // LOGIN VIEW
  // =========================
  function showLogin() {
    hideAll();
    show(viewLogin);
    localStorage.removeItem("ga_session");
    setUserLabel("Nessun utente");
    hide(btnLogout);
    console.log("🔐 Login visibile");
  }

  // =========================
  // ENTER APP
  // =========================
  function enterApp(session) {
    console.log("➡️ Enter app:", session);
    hideAll();

    const localeNome = LOCALI[session.locale] || session.locale;
    setUserLabel(`${session.nome} – ${localeNome}`);
    show(btnLogout, "inline-block");

    // manager / admin
    if (session.ruolo === "manager" || session.ruolo === "superadmin") {
      if (managerMenu) {
        show(managerMenu, "grid");
      } else {
        console.warn("⚠️ manager-menu non presente");
      }

      if (viewTimbratura) {
        show(viewTimbratura);
      } else {
        console.warn("⚠️ view-timbratura non presente");
      }

      return;
    }

    // dipendente
    if (viewHomeDip) {
      show(viewHomeDip);
    }
  }

  // =========================
  // LOGIN LOGIC
  // =========================
  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      const nome = inputNome?.value.trim().toLowerCase();
      const pin = inputPin?.value.trim();

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
  }

  // =========================
  // LOGOUT
  // =========================
  if (btnLogout) {
    btnLogout.addEventListener("click", showLogin);
  }

  // =========================
  // SESSION RESTORE
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
