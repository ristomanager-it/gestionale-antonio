// app.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ app.js avviato");

  Router.init();

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

    // SUPER ADMIN
    if (nome === "admin" && pin === "9999") {
      AppState.setCurrentUser({
        id: "super-admin",
        nome: "Super Admin",
        ruolo: "super_admin",
        virtualAdmin: true,
      });

      Router.navigate("super-admin");
      return;
    }

    // LOGIN NORMALE
    const user = await Auth.loginWithPin(nome, pin, false);
    if (!user) {
      alert("Nome o PIN errati");
      return;
    }

    AppState.setCurrentUser(user);

    // LOCALi
    const result = await Locali.initLocali();

    if (result && result.status === "multiple") {
      Router.navigate("select-locale");
      return;
    }

    Router.navigate(
      Auth.isManagerRole(user.ruolo) ? "timbratura" : "home-dip"
    );
  });

  // AVVIO
  Router.navigate("login");
});
