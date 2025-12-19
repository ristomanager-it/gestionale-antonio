// js/select-locale.js
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const view = document.getElementById("view-select-locale");
    const container = document.getElementById("select-locale-list");

    if (!view || !container) return;

    // ⚠️ NOME SENZA TRATTINI
    window.onEnter_select_locale = function () {
      const user = AppState.getCurrentUser();
      const locali = AppState.getLocali();

      container.innerHTML = "";

      if (!locali || locali.length === 0) {
        container.innerHTML = "<p>Nessun locale disponibile</p>";
        return;
      }

      locali.forEach((loc) => {
        const btn = document.createElement("button");
        btn.className = "app-button big-home";
        btn.textContent = loc.nome;

        btn.onclick = () => {
          AppState.setCurrentLocale(loc);

          if (Auth.isManagerRole(user.ruolo)) {
            Router.navigate("timbratura");
          } else {
            Router.navigate("home-dip");
          }
        };

        container.appendChild(btn);
      });
    };
  });
})();
