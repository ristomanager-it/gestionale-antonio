// app.js
// Bootstrap minimale + routing ponte
// Compatibile con state.js, auth.js, locali.js

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

  if (!loginView || !timbraturaView || !btnLogin) {
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
  // CONTEXT APP (A)
  // =========================
  function getAppContext() {
    return {
      user: AppState.getCurrentUser(),
      locale: AppState.getCurrentLocale(),
    };
  }

  window.getAppContext = getAppContext; // 👈 disponibile ovunque

  // =========================
  // ROUTING PONTE (STABILE)
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
  loginView.style.display = "block";
  if (managerMenu) managerMenu.style.display = "none";
  if (homeDipView) homeDipView.style.display = "none";
  if (timbraturaView) timbraturaView.style.display = "none";

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

    // 🔐 ADMIN VIRTUALE
    if (nome.toLowerCase() === "admin" && pin === "9999") {
      Auth.setCurrentUser(
        {
          id: null,
          nome: "Admin",
          ruolo: "admin",
          canalePrevalente: "NR",
          virtualAdmin: true,
        },
        false
      );
