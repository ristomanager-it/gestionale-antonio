document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – STEP 1 Persistenza sessione");

  // =========================
  // VISTE
  // =========================
  const viewLogin = document.getElementById("view-login");
  const viewLocale = document.getElementById("view-locale");
  const viewHome = document.getElementById("view-home");
  const localeLabel = document.getElementById("current-locale");
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
  // SESSION STORAGE
  // =========================
  const STORAGE_KEY = "ga_session";

  function saveSession(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  function showOnly(view) {
    [viewLogin, viewLocale, viewHome].forEach(v => {
      if (v) v.style.display = "none";
    });
    if (view) view.style.display = "block";
  }

  function enterHome(localeCode) {
    localeLabel.textContent = `${LOCALI[localeCode]} (${localeCode})`;
    showOnly(viewHome);
    if (btnLogout) btnLogout.style.display = "inline-block";
  }

  // =========================
  // LOGOUT
  // =========================
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      clearSession();
      inputNome.value = "";
      inputPin.value = "";
      btnLogout.style.display = "none";
      showOnly(viewLogin);
    });
  }

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

    // SUPERADMIN → scelta locale
    if (user.ruolo === "superadmin") {
      showOnly(viewLocale);

      document.querySelectorAll("[data-locale]").forEach(btn => {
        const code = btn.dataset.locale;

        btn.style.display = user.locali.includes(code) ? "block" : "none";

        btn.onclick = () => {
          saveSession({
            nome,
            ruolo: user.ruolo,
            locale: code,
          });
          enterHome(code);
        };
      });

      return;
    }

    // RESPONSABILE → entra diretto
    const localeCode = user.locali[0];
    saveSession({
      nome,
      ruolo: user.ruolo,
      locale: localeCode,
    });
    enterHome(localeCode);
  });

  // =========================
  // AVVIO APP (RESTORE SESSIONE)
  // =========================
  const session = loadSession();

  if (session && session.locale && LOCALI[session.locale]) {
    console.log("♻️ Sessione ripristinata:", session);
    enterHome(session.locale);
  } else {
    showOnly(viewLogin);
  }
});
