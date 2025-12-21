document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ App avviata – FIX HEADER NULL");

  const supabase = window.supabaseClient;

  // =========================
  // VISTE
  // =========================
  const views = document.querySelectorAll(".view");
  const viewLogin = document.getElementById("view-login");
  const managerMenu = document.getElementById("manager-menu");
  const viewDipendenti = document.getElementById("view-dipendenti");

  // =========================
  // HEADER (⚠️ possono non esistere)
  // =========================
  const currentUserLabel = document.getElementById("current-user-label");
  const btnLogout = document.getElementById("btn-logout");

  // =========================
  // LOGIN
  // =========================
  const btnLogin = document.getElementById("btn-login");
  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  // =========================
  // DIPENDENTI
  // =========================
  const dipForm = document.getElementById("dipendente-form");
  const dipLista = document.getElementById("dipendenti-lista");

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
  // UTENTI (TEMP)
  // =========================
  const UTENTI = {
    admin: {
      pin: "9999",
      ruolo: "superadmin",
      locali: Object.keys(LOCALI),
    },
    michele: {
      pin: "1111",
      ruolo: "manager",
      locali: ["CP"],
    },
    antonio: {
      pin: "1975",
      ruolo: "manager",
      locali: ["TA"],
    },
  };

  // =========================
  // SESSIONE
  // =========================
  const STORAGE_KEY = "ga_session";
  const saveSession = s =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  const loadSession = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  const clearSession = () => localStorage.removeItem(STORAGE_KEY);

  // =========================
  // UI
  // =========================
  function hideAllViews() {
    views.forEach(v => (v.style.display = "none"));
  }

  function showView(view) {
    hideAllViews();
    if (view) view.style.display = "block";
  }

  function setHeader(session) {
    if (!currentUserLabel || !btnLogout) return;

    if (!session) {
      currentUserLabel.textContent = "Nessun utente";
      btnLogout.style.display = "none";
      return;
    }

    currentUserLabel.textContent =
      session.nome + " · " + LOCALI[session.locale];
    btnLogout.style.display = "inline-block";
  }

  // =========================
  // LOGOUT
  // =========================
  btnLogout?.addEventListener("click", () => {
    clearSession();
    setHeader(null);
    showView(viewLogin);
  });

  // =========================
  // LOGIN
  // =========================
  btnLogin?.addEventListener("click", () => {
    const nome = inputNome.value.trim().toLowerCase();
    const pin = inputPin.value.trim();

    const user = UTENTI[nome];
    if (!user || user.pin !== pin) {
      alert("Nome o PIN non corretti");
      return;
    }

    const session = {
      nome,
      ruolo: user.ruolo,
      locale: user.locali[0],
    };

    saveSession(session);
    enterApp(session);
  });

  // =========================
  // ENTER APP
  // =========================
  function enterApp(session) {
    setHeader(session);
    showView(managerMenu);
  }

  // =========================
  // ROUTING
  // =========================
  document.querySelectorAll("[data-route]").forEach(btn => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.route;
      const view = document.getElementById(`view-${route}`);
      if (!view) return;

      showView(view);

      if (route === "dipendenti") {
        loadDipendenti();
      }
    });
  });

  // =========================
  // DIPENDENTI – LOAD
  // =========================
  async function loadDipendenti() {
    const session = loadSession();
    if (!session || !dipLista) return;

    dipLista.innerHTML = "";

    let query = supabase.from("dipendenti").select("*");

    if (session.ruolo !== "superadmin") {
      query = query.eq("locale", session.locale);
    }

    const { data, error } = await query.order("nome");
    if (error) {
      console.error(error);
      alert("Errore caricamento dipendenti");
      return;
    }

    data.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.nome}</td>
        <td>${d.mansione || ""}</td>
        <td>${d.ruolo}</td>
        <td>${d.locale}</td>
        <td>${d.pin}</td>
        <td>${d.attivo ? "✔️" : "❌"}</td>
      `;
      dipLista.appendChild(tr);
    });
  }

  // =========================
  // DIPENDENTI – SAVE
  // =========================
  dipForm?.addEventListener("submit", async e => {
    e.preventDefault();

    const session = loadSession();
    if (!session) return;

    const payload = {
      nome: document.getElementById("dip-nome").value,
      mansione: document.getElementById("dip-mansione").value,
      ruolo: document.getElementById("dip-ruolo").value,
      pin: document.getElementById("dip-codice").value,
      locale: session.locale,
      attivo: document.getElementById("dip-attivo").checked,
    };

    const { error } = await supabase.from("dipendenti").insert(payload);

    if (error) {
      console.error(error);
      alert("Errore salvataggio dipendente");
      return;
    }

    dipForm.reset();
    loadDipendenti();
  });

  // =========================
  // AVVIO
  // =========================
  const session = loadSession();
  if (session) {
    enterApp(session);
  } else {
    showView(viewLogin);
  }
});
