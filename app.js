document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – LOGIN STABILE");

  // =========================
  // ELEMENTI DOM
  // =========================
  const viewLogin = document.getElementById("view-login");
  const viewHomeDip = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");

  const btnLogin = document.getElementById("btn-login");
  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  // =========================
  // SICUREZZA DOM
  // =========================
  if (!viewLogin || !btnLogin || !inputNome || !inputPin) {
    console.error("❌ Elementi login mancanti nel DOM");
    return;
  }

  // =========================
  // NASCONDE TUTTE LE VISTE
  // =========================
  function hideAllViews() {
    document.querySelectorAll(".view").forEach(v => {
      v.style.display = "none";
    });
    if (managerMenu) managerMenu.style.display = "none";
  }

  // =========================
  // MOSTRA LOGIN (DEFAULT)
  // =========================
  function showLogin() {
    hideAllViews();
    viewLogin.style.display = "flex";
    console.log("🔐 Login visibile");
  }

  // =========================
  // MOSTRA HOME DIPENDENTE
  // =========================
  function showHomeDip() {
    hideAllViews();
    viewHomeDip.style.display = "block";
    console.log("🏠 Home dipendente");
  }

  // =========================
  // MOSTRA MENU MANAGER
  // =========================
  function showManager() {
    hideAllViews();
    if (managerMenu) {
      managerMenu.style.display = "grid";
      console.log("🧑‍💼 Menu manager");
    } else {
      console.warn("⚠️ manager-menu non presente");
    }
  }

  // =========================
  // AVVIO APP → SOLO LOGIN
  // =========================
  showLogin();

  // =========================
  // LOGIN (TEMPORANEO HARDCODE)
  // =========================
  const UTENTI = {
    admin: { pin: "9999", ruolo: "superadmin" },
    antonio: { pin: "1975", ruolo: "manager" },
    michele: { pin: "1111", ruolo: "manager" },
  };

  btnLogin.addEventListener("click", () => {
    const nome = inputNome.value.trim().toLowerCase();
    const pin = inputPin.value.trim();

    const user = UTENTI[nome];

    if (!user || user.pin !== pin) {
      alert("Nome o PIN non corretti");
      return;
    }

    console.log("✅ Login OK:", nome, user.ruolo);

    // PER ORA: manager e superadmin vanno al menu manager
    if (user.ruolo === "manager" || user.ruolo === "superadmin") {
      showManager();
    } else {
      showHomeDip();
    }
  });
});
