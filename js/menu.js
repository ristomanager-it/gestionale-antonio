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

  /* ================================
     STRUTTURA MENU DINAMICA
  ================================= */

  const menuStructure = [

    {
      title: "OPERATIVO",
      items: [
        { label: "Produzione", route: "produzione" },
        { label: "Magazzino", route: "magazzino" },
        { label: "Ricettario", route: "ricettario" },
        { label: "Preparazioni", route: "preparazioni" }
      ]
    },

    {
      title: "AMMINISTRAZIONE",
      items: [
        { label: "Acquisti", route: "acquisti" },
        { label: "Dipendenti", route: "dipendenti" },
        { label: "Timbrature", route: "timbrature" }
      ]
    },

    {
      title: "GESTIONE",
      items: [
        { label: "Venduto", route: "venduto" },
        { label: "Margini", route: "margini" }
      ]
    },

    {
      title: "MARKETING",
      items: [
        { label: "Preventivi", route: "preventivi" }
      ]
    }

  ];

  /* ================================
     RENDER MENU
  ================================= */

  function renderMenu() {

    menu.innerHTML = "";

    menuStructure.forEach(section => {

      const sectionDiv = document.createElement("div");
      sectionDiv.className = "menu-section";

      const title = document.createElement("div");
      title.className = "menu-item";
      title.innerText = section.title;

      const itemsContainer = document.createElement("div");
      itemsContainer.className = "menu-items";

      section.items.forEach(item => {

        const itemDiv = document.createElement("div");
        itemDiv.className = "menu-item";
        itemDiv.innerText = item.label;

        itemDiv.onclick = () => {
          window.location.hash = "#/" + item.route;
          closeMenu();
        };

        itemsContainer.appendChild(itemDiv);

      });

      title.onclick = () => {
        itemsContainer.classList.toggle("open");
      };

      sectionDiv.appendChild(title);
      sectionDiv.appendChild(itemsContainer);

      menu.appendChild(sectionDiv);

    });

    /* ================================
       LOGOUT
    ================================= */

    const logout = document.createElement("div");
    logout.className = "menu-item";
    logout.innerText = "Logout";

    logout.style.marginTop = "auto";
    logout.style.color = "#b91c1c";
    logout.style.fontWeight = "700";

    logout.onclick = () => {
      if (window.router && window.router.logout) {
        window.router.logout();
      }
    };

    menu.appendChild(logout);

  }

  /* ================================
     OPEN MENU
  ================================= */

  function openMenu() {
    renderMenu();
    menu.classList.add("open");
    overlay.classList.add("open");
  }

  /* ================================
     CLOSE MENU
  ================================= */

  function closeMenu() {
    menu.classList.remove("open");
    overlay.classList.remove("open");
  }

  /* ================================
     TOGGLE
  ================================= */

  toggle.onclick = () => {

    if (menu.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }

  };

  overlay.onclick = closeMenu;

}
