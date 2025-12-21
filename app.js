document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata");

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
  // UTENTI (TEMPORANEO → DB)
  // =========================
  const UTENTI = {
    admin: {
      pin: "9999",
      ruolo: "superadmin",
      locali: ["CP", "TA", "AP", "CR", "CC"],
    },
    michele: {
      pin: "1111",
      ruolo: "responsabile",
      locali: ["CP"],
    },
    antonio: {
      pin: "1975",
      ruolo: "responsabile",
      locali: ["TA"],
    },
  };

  // =========================
  // HELPER
  // =========================
  function show(view) {
    [viewLogin, viewLocale, viewHome].forEach(v => {
      if (v) v.style.display = "none";
    });
    view.style.display = "block";
  }

  function setSession(userKey, localeCode) {
    localStorage.setItem("ga_user", userKey);
    localStorage.setItem("ga_ruolo", UTENTI[userKey].ruolo);
    localStorage.setItem("ga_locale", localeCode);
    localStorage.setItem("ga_locale_nome", LOCALI[localeCode]);
  }

  // =========================
  // AVVIO
  // =========================
  show(viewLogin);

  // =========================
  // LOGIN LOGICA
  // =========================
  btnLogin.addEventListener("click", () => {
    const nome = inputNome.value.trim().toLowerCase();
    const pin = inputPin.value.trim();

    const user = UTENTI[nome];

    if (!user || user.pin !== pin) {
      alert("Nome o PIN non corretti");
      return;
    }

    console.log("🔐 Login OK:", nome, user.ruolo);

    // SUPER ADMIN → sceglie locale
    if (user.ruolo === "superadmin") {
      show(viewLocale);

      document.querySelectorAll("[data-locale]").forEach(btn => {
        const code = btn.dataset.locale;
        btn.style.display = user.locali.includes(code)
          ? "block"
          : "none";

        btn.onclick = () => {
          setSession(nome, code);
          localeLabel.textContent = `${LOCALI[code]} (${code})`;
          show(viewHome);
        };
      });

      return;
    }

    // RESPONSABILE → entra diretto nel suo locale
    const localeCode = user.locali[0];
    setSession(nome, localeCode);
    localeLabel.textContent = `${LOCALI[localeCode]} (${localeCode})`;
    show(viewHome);
  });
});
