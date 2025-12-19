// app.js — VERSIONE STABILE

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ app.js avviato");

  // =========================
  // ROUTER
  // =========================
  Router.init();

  // =========================
  // LOGIN
  // =========================
  const btnLogin = document.getElementById("btn-login");
  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  btnLogin.addEventListener("click", async () => {
    const nome = inputNome.value.trim();
    const pin = inputPin.value.trim();

    if (!nome || !pin) {
      alert("Inserisci nome e PIN");
      return;
    }

    // 🔐 SUPER ADMIN
    if (nome === "admin" && pin === "9999") {
      const superAdmin = {
        id: "super-admin",
        nome: "Super Admin",
        ruolo: "super_admin",
        virtualAdmin: true,
      };

      AppState.setCurrentUser(superAdmin);
      Router.navigate("super-admin");
      return;
    }

    // 🔐 LOGIN NORMALE
    const user = await Auth.loginWithPin(nome, pin, false);

    if (!user) {
      alert("Nome o PIN errati");
      return;
    }

    AppState.setCurrentUser(user);

    // =========================
    // LOCALi
    // =========================
    const result = await Locali.initLocali();

    if (!result || result.status === "none") {
      alert("Nessun locale associato all’azienda");
      return;
    }

    if (result.status === "multiple") {
      Router.navigate("select-locale");
      return;
    }

    // =========================
    // ROUTING FINALE
    // =========================
    if (Auth.isManagerRole(user.ruolo)) {
      Router.navigate("timbratura");
    } else {
      Router.navigate("home-dip");
    }
  });

  // =========================
  // RIPRISTINO SESSIONE
  // =========================
  const restored = Auth.restoreUserFromStorage?.();

  if (restored) {
    AppState.setCurrentUser(restored);

    if (restored.virtualAdmin) {
      Router.navigate("super-admin");
      return;
    }

    Locali.initLocali().then((res) => {
      if (res && res.status === "multiple") {
        Router.navigate("select-locale");
      } else if (Auth.isManagerRole(restored.ruolo)) {
        Router.navigate("timbratura");
      } else {
        Router.navigate("home-dip");
      }
    });
  } else {
    // 👇 QUESTO È IL FIX CHIAVE
    Router.navigate("login");
  }
});
