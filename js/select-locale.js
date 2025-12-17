document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("select-locale-list");

  if (!container) return;

  function render() {
    const locali = AppState.getLocali();
    container.innerHTML = "";

    locali.forEach((locale) => {
      const btn = document.createElement("button");
      btn.className = "app-button big-home";
      btn.textContent = locale.nome;

      btn.addEventListener("click", () => {
        AppState.setCurrentLocale(locale);
        showManagerMenuAndRoute("timbratura");
      });

      container.appendChild(btn);
    });
  }

  render();
});
