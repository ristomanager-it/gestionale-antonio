// js/menu.js

export function initMenu() {
  const menu = document.getElementById("global-menu");
  const toggle = document.getElementById("menu-toggle");

  if (!menu || !toggle) return;

  let overlay = document.querySelector(".menu-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "menu-overlay";
    document.body.appendChild(overlay);
  }

  function isSuperadmin() {
    return window.state?.isSuperadmin === true;
  }

  function getRole() {
    return window.state?.ruolo;
  }

  function buildItems() {
    const ruolo = getRole();

    const allItems = [
      { label: "Home", route: "home" },
      { label: "Produzione", route: "produzione" },
      { label: "Magazzino", route: "magazzino" },
      { label: "Ricettario", route: "ricettario" },
      { label: "Preparazioni", route: "preparazioni" },
      { label: "Acquisti", route: "acquisti" },
      { label: "Dipendenti", route: "dipendenti" },
      { label: "Timbrature", route: "timbrature" },
      { label: "Venduto", route: "venduto" },
      { label: "Margini", route: "margini" },
      { label: "Preventivi", route: "preventivi" }
    ];

    if (isSuperadmin() || ruolo === "admin") {
      return allItems;
    }

    if (ruolo === "segreteria") {
      return allItems.filter(i =>
        ["preventivi", "acquisti", "dipendenti", "timbrature", "home"].includes(i.route)
      );
    }

    // Manager / Operatore
    return allItems.filter(i =>
      ["produzione", "magazzino", "ricettario", "preparazioni", "home"].includes(i.route)
    );
  }

  function renderMenu() {
    const items = buildItems();

    menu.innerHTML = items.map(i => `
      <div class="menu-item" data-route="${i.route}">
        ${i.label}
      </div>
    `).join("");

    menu.querySelectorAll(".menu-item").forEach(item => {
      item.onclick = () => {
        const route = item.dataset.route;
        window.location.hash = "#/" + route;
        closeMenu();
      };
    });
  }

  function openMenu() {
    renderMenu();
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
}
