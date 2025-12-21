document.addEventListener("DOMContentLoaded", () => {
  const viewLogin = document.getElementById("view-login");
  const viewLocale = document.getElementById("view-locale");
  const viewHome = document.getElementById("view-home");

  const btnLogin = document.getElementById("btn-login");
  const nomeInput = document.getElementById("login-nome");
  const pinInput = document.getElementById("login-pin");

  const localeLabel = document.getElementById("current-locale");

  const LOCALI = {
    CP: "Centro Produzione",
    TA: "Trattoria dell’Aquila",
    AP: "Da Antonio Pizza",
    CR: "Campo Antico Ristorante",
    CC: "Campo Antico Catering",
  };

  function show(view) {
    [viewLogin, viewLocale, viewHome].forEach(v => {
      v.style.display = "none";
    });
    view.style.display = "block";
  }

  function setLocale(codice) {
    localStorage.setItem("ga_locale", codice);
    localStorage.setItem("ga_locale_nome", LOCALI[codice]);
  }

  function getLocale() {
    return {
      codice: localStorage.getItem("ga_locale"),
      nome: localStorage.getItem("ga_locale_nome"),
    };
  }

  // AVVIO
  show(viewLogin);

  btnLogin.onclick = () => {
    if (!nomeInput.value || !pinInput.value) {
      alert("Inserisci nome e PIN");
      return;
    }
    show(viewLocale);
  };

  document.querySelectorAll("[data-locale]").forEach(btn => {
    btn.onclick = () => {
      const codice = btn.dataset.locale;
      setLocale(codice);

      const loc = getLocale();
      localeLabel.textContent = `${loc.nome} (${loc.codice})`;

      show(viewHome);
    };
  });
});
