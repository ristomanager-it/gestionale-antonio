document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – STEP 3 DIPENDENTI PER LOCALE");

  // =========================
  // DOM CORE
  // =========================
  const allViews = document.querySelectorAll(".view");
  const viewLogin = document.getElementById("view-login");
  const viewHomeDip = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");
  const viewDipendenti = document.getElementById("view-dipendenti");

  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");

  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  const currentUserLabel = document.getElementById("current-user-label");

  // DIPENDENTI FORM
  const dipForm = document.getElementById("dipendente-form");
  const dipLista = document.getElementById("dipendenti-lista");

  // =========================
  // DATI BASE
  // =========================
  const LOCALI = {
    CP: "Centro Produzione",
    TA: "Trattoria dell’Aquila",
    AP: "Da Antonio Pizza",
    CR: "Campo Antico Ristorante",
    CC: "Campo Antico Catering",
  };

  const UTENTI = {
    admin: { pin: "9999", ruolo: "superadmin", locale: "CP" },
    michele: { pin: "1111", ruolo: "manager", locale: "CP" },
    antonio: { pin: "1975", ruolo: "manager", locale: "TA" },
  };

  // =========================
  // STORAGE DIPENDENTI (LOCALE)
  // =========================
  function getDipendenti() {
    return JSON.parse(localStorage.getItem("ga_dipendenti") || "[]");
  }

  function saveDipendenti(list) {
    localStorage.setItem("ga_dipendenti", JSON.stringify(list));
  }

  // =========================
  // HELPERS UI
  // =========================
  function hideAllViews() {
    allViews.forEach(v => (v.style.display = "none"));
  }

  function showView(id) {
    hideAllViews();
    const v = document.getElementById(id);
    if (v) v.style.display = "block";
  }

  // =========================
  // SESSIONE
  // =========================
  function getSession() {
    return JSON.parse(localStorage.getItem("ga_session") || "null");
  }

  function setSession(session) {
    localStorage.setItem("ga_session", JSON.stringify(session));
  }

  // =========================
  // LOGIN / LOGOUT
  // =========================
  function showLogin() {
    hideAllViews();
    viewLogin.style.display = "block";
    managerMenu.style.display = "none";
    btnLogout.style.display = "none";
    currentUserLabel.textContent = "Nessun utente";
    localStorage.removeItem("ga_session");
  }

  function enterApp(session) {
    hideAllViews();

    currentUserLabel.textContent =
      session.nome + " – " + LOCALI[session.locale];

    btnLogout.style.display = "inline-block";

    if (session.ruolo === "manager" || session.ruolo === "superadmin") {
      managerMenu.style.display = "grid";
      showView("view-dipendenti");
      renderDipendenti();
    } else {
      showView("view-home-dip");
    }
  }

  // =========================
  // LOGIN CLICK
  // =========================
  btnLogin.addEventListener("click", () => {
    const nome = inputNome.value.trim().toLowerCase();
    const pin = inputPin.value.trim();
    const user = UTENTI[nome];

    if (!user || user.pin !== pin) {
      alert("Nome o PIN non corretti");
      return;
    }

    const session = { nome, ruolo: user.ruolo, locale: user.locale };
    setSession(session);
    enterApp(session);
  });

  btnLogout.addEventListener("click", showLogin);

  // =========================
  // ROUTING MANAGER
  // =========================
  managerMenu.addEventListener("click", e => {
    const btn = e.target.closest("[data-route]");
    if (!btn) return;

    const viewId = "view-" + btn.dataset.route;
    showView(viewId);

    if (viewId === "view-dipendenti") {
      renderDipendenti();
    }
  });

  // =========================
  // DIPENDENTI – LOGICA
  // =========================
  function renderDipendenti() {
    const session = getSession();
    if (!session) return;

    const all = getDipendenti();

    const filtrati =
      session.ruolo === "superadmin"
        ? all
        : all.filter(d => d.locale === session.locale);

    dipLista.innerHTML = "";

    filtrati.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.nome}</td>
        <td>${d.mansione || ""}</td>
        <td>${d.data_nascita || ""}</td>
        <td>${d.residenza || ""}</td>
        <td>${d.telefono || ""}</td>
        <td>${d.email || ""}</td>
        <td>${d.ruolo}</td>
        <td>${d.tipo_compenso}</td>
        <td>${d.costo || ""}</td>
        <td>${LOCALI[d.locale]}</td>
        <td>${d.pin}</td>
        <td>${d.attivo ? "✅" : "❌"}</td>
        <td>-</td>
      `;
      dipLista.appendChild(tr);
    });
  }

  // =========================
  // SALVATAGGIO DIPENDENTE
  // =========================
  dipForm.addEventListener("submit", e => {
    e.preventDefault();

    const session = getSession();
    if (!session) return;

    const dip = {
      id: crypto.randomUUID(),
      nome: document.getElementById("dip-nome").value,
      mansione: document.getElementById("dip-mansione").value,
      data_nascita: document.getElementById("dip-data-nascita").value,
      residenza: document.getElementById("dip-residenza").value,
      telefono: document.getElementById("dip-telefono").value,
      email: document.getElementById("dip-email").value,
      ruolo: document.getElementById("dip-ruolo").value,
      tipo_compenso: document.getElementById("dip-tipo-compenso").value,
      costo: document.getElementById("dip-costo").value,
      pin: document.getElementById("dip-codice").value,
      attivo: document.getElementById("dip-attivo").checked,
      locale: session.locale, // 🔒 BLOCCO LOCALE
    };

    const list = getDipendenti();
    list.push(dip);
    saveDipendenti(list);

    dipForm.reset();
    renderDipendenti();
  });

  // =========================
  // AVVIO
  // =========================
  const saved = getSession();
  if (saved) {
    console.log("🔁 Sessione ripristinata");
    enterApp(saved);
  } else {
    showLogin();
  }
});
