// app.js
// Bootstrap principale dell’app
// Dipendenze: state.js, auth.js, locali.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ app.js caricato");

  // =========================
  // DOM BASE
  // =========================
  const loginView = document.getElementById("view-login");
  const timbraturaView = document.getElementById("view-timbratura");
  const homeDipView = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");

  const btnLogin = document.getElementById("btn-login");
  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  const views = document.querySelectorAll(".view");

  if (!loginView || !btnLogin) {
    console.error("❌ Elementi DOM principali mancanti");
    return;
  }

  // =========================
  // HELPER VISUALI
  // =========================
  function showOnlyView(viewId) {
    views.forEach((v) => {
      v.style.display = v.id === viewId ? "block" : "none";
    });
  }

  // =========================
  // CONTEXT GLOBALE APP
  // =========================
  function getAppContext() {
    return {
      user: AppState.getCurrentUser(),
      locale: AppState.getCurrentLocale(),
    };
  }
  window.getAppContext = getAppContext;

  // =========================
  // ROUTING GLOBALI
  // =========================
  window.showManagerMenuAndRoute = function (route = "timbratura") {
    if (managerMenu) managerMenu.style.display = "grid";
    showOnlyView(`view-${route}`);
    window.scrollTo({ top: 0 });
  };

  window.showHomeDipendente = function () {
    if (managerMenu) managerMenu.style.display = "none";
    showOnlyView("view-home-dip");
    window.scrollTo({ top: 0 });
  };

  // =========================
  // STATO INIZIALE
  // =========================
  showOnlyView("view-login");
  if (managerMenu) managerMenu.style.display = "none";

  // =========================
  // LOGIN
  // =========================
  btnLogin.addEventListener("click", async () => {
    const nome = inputNome?.value?.trim();
    const pin = inputPin?.value?.trim();

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

  loginView.style.display = "none";

  // nasconde tutto
  document.querySelectorAll(".view").forEach(v => {
    v.style.display = "none";
  });

  // mostra SOLO super admin
  document.getElementById("view-super-admin").style.display = "block";

  console.log("✅ Super Admin loggato");
  return;
}

    // =====================================
    // 🔐 LOGIN NORMALE DA DATABASE
    // =====================================
    const user = await Auth.loginWithPin(nome, pin, false);

    if (!user) {
      alert("Nome o PIN non corretti");
      return;
    }

    Auth.setCurrentUser(user, false);
    AppState.setCurrentUser(user);

    loginView.style.display = "none";

    // inizializza locali per azienda
    if (window.Locali) {
      const ok = await Locali.initLocali();
      if (!ok) {
        alert("Nessun locale associato all’azienda");
        return;
      }
    }

    // routing per ruolo
    if (Auth.isManagerRole(user.ruolo)) {
      showManagerMenuAndRoute("timbratura");
    } else {
      showHomeDipendente();
    }
  });

  // =========================
  // RIPRISTINO SESSIONE
  // =========================
  const restoredUser = Auth.restoreUserFromStorage?.();

  if (restoredUser) {
    AppState.setCurrentUser(restoredUser);

    if (restoredUser.superAdmin) {
      showOnlyView("view-super-admin");
      return;
    }

    if (window.Locali) {
      Locali.initLocali().then(() => {
        if (Auth.isManagerRole(restoredUser.ruolo)) {
          showManagerMenuAndRoute("timbratura");
        } else {
          showHomeDipendente();
        }
      });
    }
  }
});
