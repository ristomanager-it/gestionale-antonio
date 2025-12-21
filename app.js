document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata");

  // =========================
  // VISTE
  // =========================
  const viewLogin = document.getElementById("view-login");
  const viewLocale = document.getElementById("view-locale");
  const viewHome = document.getElementById("view-home");

  // =========================
  // LOGIN INPUT
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
  // UTENTI (TEMPORANEO – poi Supabase)
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
  // HELPER VISTE
  // =========================
  function hideAllViews() {
    [viewLogin, viewLocale, viewHome].forEach(v => {
      if (v) v.style.display = "none";
    });
  }

  function show(view) {
    hideAllViews();
    view.style.display = "block";
  }

  // =========================
  // SESSIONE (BASE)
  // =========================
  function setSession(userKey, localeCode) {
    localStorage.setItem("ga_user", userKey);
    localStorage.setItem("ga_ruolo", UTENTI[userKey].ruolo);
    localStorage.setItem("ga_locale", localeCode);
    localStorage.setItem("ga_locale_nome", LOCALI[localeCode]);

    console.log("📦 Sessione:", {
      user: userKey,
      ruolo: UTENTI[userKey].ruolo,
      locale: localeCode,
    });
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

    if (!nome || !pin) {
      alert("Inserisci nome e PIN");
      return;
    }

    const user = UTENTI[nome];

    if (!user || user.pin !== pin) {
      alert("Nome o PIN non corretti");
      return;
    }

    console.log("🔐 Login OK:", nome, user.ruolo);

    // =========================
    // SUPERADMIN → SCELTA LOCALE
    // =========================
    if (user.ruolo === "superadmin") {
      show(viewLocale);

      document.querySelectorAll("[data-locale]").forEach(btn => {
        const code = btn.dataset.locale;

        // mostra solo i locali consentiti
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

    // =========================
    // RESPONSABILE → LOCALE FISSO
    // =========================
    const localeCode = user.locali[0];

    setSession(nome, localeCode);
    localeLabel.textContent = `${LOCALI[localeCode]} (${localeCode})`;
    show(viewHome);
  });
});
