document.addEventListener("DOMContentLoaded", () => {
  console.log("APP AVVIATA");

  const loginView = document.getElementById("view-login");
  const homeView = document.getElementById("view-home");

  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");

  function showLogin() {
    loginView.style.display = "flex";
    homeView.style.display = "none";
  }

  function showHome() {
    loginView.style.display = "none";
    homeView.style.display = "block";
  }

  // MOSTRA SEMPRE LOGIN ALL’AVVIO
  showLogin();

  btnLogin.addEventListener("click", () => {
    showHome();
  });

  btnLogout.addEventListener("click", () => {
    showLogin();
  });
});
