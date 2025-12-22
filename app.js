document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – STABLE LOGIN MODE");

  // =========================
  // VISTE
  // =========================
  const viewLogin = document.getElementById("view-login");
  const viewLocale = document.getElementById("view-locale");
  const viewHome = document.getElementById("view-home");

  // =========================
  // LOGIN
  // =========================
  const btnLogin = document.getElementById("btn-login");
  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  // =========================
  // HOME
  // =========================
  const btnLogout = document.getElementById("btn-logout");

  // =========================
  // UI
  // =========================
  const localeLabel = document.getElementById("current-locale");

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
  // UTENTI (TEMP → SUPABASE)
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
  // HELPERS
  // =========================
  function hideAll() {
    [viewLogin, viewLocale, viewHome].forEach((v) => {
      if (v) v.style.display = "none";
    });
  }

  function show(view) {
    hideAll();
    if (view) view.style.display = "block";
  }

  function saveSession(user, locale) {
    localStorage.setItem(
      "ga_session",
      JSON.stringify({
        nome: user,
        ruolo: UTENTI[user].ruolo,
        locale,
      })
    );
  }

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem("ga_session"));
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem("ga_session");
  }

  function setLocaleHeader(locale) {
    if (!localeLabel) return;
    const nome = LOCALI[locale] || locale || "—";
    localeLabel.textContent = `${nome} (${locale || "—"})`;
  }

  // =========================
  // HOME
  // =========================
  function enterHome(session) {
    console.log("➡️ Enter home:", session);
    setLocaleHeader(session.locale);
    show(viewHome);
  }

  // =========================
  // AVVIO
  // =========================
  show(viewLogin);
  console.log("🔐 Login visibile");

  // =========================
  // RIPRISTINO SESSIONE
  // =========================
  const restored = loadSession();
  if (restored && restored.nome && restored.locale) {
    console.log("🔁 Sessione ripristinata");
    setTimeout(() => enterHome(restored), 50);
    return;
  }

  // =========================
  // LOGIN
  // =========================
  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      const nome = (inputNome?.value || "").trim().toLowerCase();
      const pin = (inputPin?.value || "").trim();

      const user = UTENTI[nome];
      if (!user || user.pin !== pin) {
        alert("Nome o PIN non corretti");
        return;
      }

      console.log("✅ Login OK:", nome, user.ruolo);

      // SUPER ADMIN → sceglie locale
      if (user.ruolo === "superadmin") {
        show(viewLocale);

        document.querySelectorAll("[data-locale]").forEach((btn) => {
          const code = btn.dataset.locale;

          btn.style.display = user.locali.includes(code) ? "inline-block" : "none";

          btn.onclick = () => {
            saveSession(nome, code);
            enterHome({ nome, ruolo: user.ruolo, locale: code });
          };
        });

        return;
      }

      // MANAGER → entra diretto
      const locale = user.locali[0];
      saveSession(nome, locale);
      enterHome({ nome, ruolo: user.ruolo, locale });
    });
  }

  // =========================
  // LOGOUT
  // =========================
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      clearSession();
      setLocaleHeader(null);

      if (inputNome) inputNome.value = "";
      if (inputPin) inputPin.value = "";

      show(viewLogin);
      console.log("🚪 Logout");
    });
  }
});
