export function initMenu() {

  const menu = document.getElementById("global-menu");
  const toggle = document.getElementById("menu-toggle");

  if (!menu || !toggle) return;

  // Overlay
  let overlay = document.querySelector(".menu-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "menu-overlay";
    document.body.appendChild(overlay);
  }

  // Costruzione menu dinamico
  const items = [
    { label: "Home", route: "home" },
    { label: "Produzione", route: "produzione" },
    { label: "Magazzino", route: "magazzino" },
    { label: "Ricettario", route: "ricettario" },
    { label: "Dipendenti", route: "dipendenti" },
    { label: "Report", route: "report" },
  ];

  menu.innerHTML = items.map(i => `
    <div class="menu-item" data-route="${i.route}">
      ${i.label}
    </div>
  `).join("");

  function openMenu() {
    menu.classList.add("open");
    overlay.classList.add("open");
  }

  function closeMenu() {
    menu.classList.remove("open");
    overlay.classList.remove("open");
  }

  toggle.onclick = () => {
    if (menu.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  overlay.onclick = closeMenu;

  menu.querySelectorAll(".menu-item").forEach(item => {
    item.onclick = () => {
      const route = item.dataset.route;
      window.location.hash = "#/" + route;
      closeMenu();
    };
  });

}
