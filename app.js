// app.js — VERSIONE MINIMA STABILE
// Serve solo per test login + Auth

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ app.js minimo caricato");

  const loginView = document.getElementById("view-login");
  const timbraturaView = document.getElementById("view-timbratura");
  const btnLogin = document.getElementById("btn-login");

  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  if (!loginView || !timbraturaView || !btnLogin) {
    console.error("❌ Elementi DOM mancanti");
    return;
  }

  // stato iniziale
  loginView.style.display = "block";
  timbraturaView.style.display = "none";

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

      loginView.style.display = "none";
      timbraturaView.style.display = "block";

      console.log("✅ Login admin riuscito");
      return;
    }

    alert("Login dipendenti disattivato (modalità test)");
  });
});
