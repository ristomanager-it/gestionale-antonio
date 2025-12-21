function getCurrentLocale() {
  return localStorage.getItem("ga_locale");
}

function requireLocale() {
  const loc = getCurrentLocale();
  if (!loc) {
    alert("Seleziona prima un locale");
    return null;
  }
  return loc;
}

document.addEventListener("DOMContentLoaded", () => {
  const viewLogin = document.getElementById("view-login");
  const viewLocale = document.getElementById("view-locale");
  const viewHome = document.getElementById("view-home");

  const btnLogin = document.getElementById("btn-login");
  const nomeInput = document.getElementById("login-nome");
  const pinInput = document.getElementById("login-pin");

  const localeLabel = document.getElementById("current-locale");

  function show(view) {
    [viewLogin, viewLocale, viewHome].forEach(v => {
      v.style.display = "none";
    });
    view.style.display = "block";
  }

  // AVVIO
  show(viewLogin);

  btnLogin.onclick = () => {
    if (!nomeInput.value || !pinInput.value) {
      alert("Inserisci nome e PIN");
      return;
    }

    // login fittizio (per ora)
    show(viewLocale);
  };

  document.querySelectorAll("[data-locale]").forEach(btn => {
    btn.onclick = () => {
      const locale = btn.dataset.locale;
      localStorage.setItem("ga_locale", locale);
      localeLabel.textContent = locale;
      show(viewHome);
    };
  });
});
