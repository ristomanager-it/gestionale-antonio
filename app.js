document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata");

  const supabase = window.supabaseClient;

  // =========================
  // VISTE
  // =========================
  const viewLogin = document.getElementById("view-login");
  const viewHome = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");

  // =========================
  // LOGIN
  // =========================
  const btnLogin = document.getElementById("btn-login");
  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  // =========================
  // HEADER
  // =========================
  const userLabel = document.getElementById("current-user-label");
  const btnLogout = document.getElementById("btn-logout");

  // =========================
  // STATO
  // =========================
  let currentUser = null;
  let localiUtente = [];

  // =========================
  // HELPERS
  // =========================
  function hideAllViews() {
    document.querySelectorAll(".view").forEach(v => {
      v.style.display = "none";
    });
    if (managerMenu) managerMenu.style.display = "none";
  }

  function showLogin() {
    hideAllViews();
    viewLogin.style.display = "block";
    localStorage.clear();
    userLabel.textContent = "Nessun utente";
    if (btnLogout) btnLogout.style.display = "none";
  }

  function showHome() {
    hideAllViews();
    viewHome.style.display = "block";

    if (currentUser.ruolo === "superadmin") {
      if (managerMenu) managerMenu.style.display = "grid";
    }

    userLabel.textContent = `${currentUser.nome} (${currentUser.ruolo})`;
    if (btnLogout) btnLogout.style.display = "inline-block";
  }

  function salvaSessione(locale) {
    localStorage.setItem("ga_user", JSON.stringify({
      id: currentUser.id,
      nome: currentUser.nome,
      ruolo: currentUser.ruolo,
      locale: locale
    }));
  }

  // =========================
  // LOGIN LOGICA
  // =========================
  btnLogin.addEventListener("click", async () => {
    const nome = inputNome.value.trim().toLowerCase();
    const pin = inputPin.value.trim();

    if (!nome || !pin) {
      alert("Inserisci nome e PIN");
      return;
    }

    // 1️⃣ verifica utente
    const { data: utente, error: userError } = await supabase
      .from("utenti")
      .select("*")
      .eq("nome", nome)
      .eq("pin", pin)
      .eq("attivo", true)
      .single();

    if (userError || !utente) {
      alert("Nome o PIN non corretti");
      return;
    }

    currentUser = utente;
    console.log("🔐 Login OK:", currentUser);

    // 2️⃣ carica locali assegnati
    const { data: locali, error: locError } = await supabase
      .from("utenti_locali")
      .select(`
        locali (
          id,
          codice,
          nome
        )
      `)
      .eq("utente_id", currentUser.id);

    if (locError || !locali || locali.length === 0) {
      alert("Nessun locale assegnato a questo utente");
      return;
    }

    localiUtente = locali.map(l => l.locali);

    // 3️⃣ SUPERADMIN → sceglie locale
    if (currentUser.ruolo === "superadmin") {
      const scelta = prompt(
        "Seleziona il locale digitando il codice:\n\n" +
        localiUtente.map(l => `${l.codice} - ${l.nome}`).join("\n")
      );

      const localeScelto = localiUtente.find(
        l => l.codice.toUpperCase() === String(scelta).toUpperCase()
      );

      if (!localeScelto) {
        alert("Locale non valido");
        return;
      }

      salvaSessione(localeScelto);
      showHome();
      return;
    }

    // 4️⃣ RESPONSABILE → entra diretto
    const localeUnico = localiUtente[0];
    salvaSessione(localeUnico);
    showHome();
  });

  // =========================
  // LOGOUT
  // =========================
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      showLogin();
    });
  }

  // =========================
  // AVVIO
  // =========================
  showLogin();
});
