document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata");

  // === VISTE ===
  const viewLogin = document.getElementById("view-login");
  const viewLocale = document.getElementById("view-locale");
  const viewHome = document.getElementById("view-home");

  // === LOGIN ===
  const btnLogin = document.getElementById("btn-login");
  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  // === LOCALE ATTIVO ===
  const localeLabel = document.getElementById("current-locale");

  // === MAPPATURA LOCALI ===
  const LOCALI = {
    CP: "Centro Produzione",
    TA: "Trattoria dell’Aquila",
    AP: "Da Antonio Pizza",
    CR: "Campo Antico Ristorante",
    CC: "Campo Antico Catering",
  };

  // === HELPER VISTE ===
  function show(view) {
    [viewLogin, viewLocale, viewHome].forEach(v => {
      if (v) v.style.display = "none";
    });
    view.style.display = "block";
  }

  // === AVVIO: MOSTRA LOGIN ===
  show(viewLogin);

  // === LOGIN (temporaneo, senza Supabase) ===
  btnLogin.addEventListener("click", () => {
    const nome = inputNome.value.trim();
    const pin = inputPin.value.trim();

    if (!nome || !pin) {
      alert("Inserisci nome e PIN");
      return;
    }

    console.log("🔐 Login ok:", nome);
    show(viewLocale);
  });

  // === SELEZIONE LOCALE ===
  document.querySelectorAll("[data-locale]").forEach(btn => {
    btn.addEventListener("click", () => {
      const codice = btn.dataset.locale;
      const nomeLocale = LOCALI[codice];

      if (!nomeLocale) {
        alert("Locale non valido");
        return;
      }

      // salva locale attivo
      localStorage.setItem("ga_locale", codice);
      localStorage.setItem("ga_locale_nome", nomeLocale);

      // aggiorna UI
      localeLabel.textContent = `${nomeLocale} (${codice})`;

      console.log("📍 Locale selezionato:", nomeLocale);
      show(viewHome);
    });
  });
});
