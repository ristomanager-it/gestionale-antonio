export function initMenu() {

  const menu = document.getElementById("global-menu")
  const toggle = document.getElementById("menu-toggle")

  if (!menu || !toggle) return

  let overlay = document.querySelector(".menu-overlay")

  if (!overlay) {
    overlay = document.createElement("div")
    overlay.className = "menu-overlay"
    document.body.appendChild(overlay)
  }

  /* -------------------------
     STRUTTURA MENU
  --------------------------*/

  const menuStructure = [

    {
      nome: "OPERATIVO",
      items: [
        ["Produzione", "produzione"],
        ["Magazzino", "magazzino"],
        ["Ricettario", "ricettario"],
        ["Preparazioni", "preparazioni"]
      ]
    },

    {
      nome: "AMMINISTRAZIONE",
      items: [
        ["Acquisti", "acquisti"],
        ["Dipendenti", "dipendenti"],
        ["Timbrature", "timbrature"]
      ]
    },

    {
      nome: "GESTIONE",
      items: [
        ["Venduto", "venduto"],
        ["Margini", "margini"]
      ]
    },

    {
      nome: "MARKETING",
      items: [
        ["Preventivi", "preventivi"]
      ]
    }

  ]

  /* -------------------------
     RENDER MENU
  --------------------------*/

  function renderMenu() {

    menu.innerHTML = `

      <div class="menu-scroll">

      ${menuStructure.map(section => `

        <div class="menu-section">

          <div class="menu-title">
            ${section.nome}
          </div>

          <div class="menu-items">

            ${section.items.map(item => `
              <div class="menu-item" data-route="${item[1]}">
                ${item[0]}
              </div>
            `).join("")}

          </div>

        </div>

      `).join("")}

      <div class="menu-spacer"></div>

      <div class="menu-logout">
        Logout
      </div>

      </div>

    `

    /* -------------------------
       TOGGLE CATEGORIE
    --------------------------*/

    menu.querySelectorAll(".menu-title").forEach(title => {

      title.onclick = () => {

        const items = title.nextElementSibling

        items.classList.toggle("open")

      }

    })

    /* -------------------------
       CLICK ROUTE
    --------------------------*/

    menu.querySelectorAll(".menu-item").forEach(item => {

      item.onclick = () => {

        const route = item.dataset.route

        window.location.hash = "#/" + route

        closeMenu()

      }

    })

    /* -------------------------
       LOGOUT
    --------------------------*/

    const logoutBtn = menu.querySelector(".menu-logout")

    if (logoutBtn) {

      logoutBtn.onclick = () => {

        window.router.logout()

      }

    }

  }

  /* -------------------------
     OPEN MENU
  --------------------------*/

  function openMenu() {

    renderMenu()

    menu.classList.add("open")

    overlay.classList.add("open")

  }

  /* -------------------------
     CLOSE MENU
  --------------------------*/

  function closeMenu() {

    menu.classList.remove("open")

    overlay.classList.remove("open")

  }

  /* -------------------------
     TOGGLE BUTTON
  --------------------------*/

  toggle.onclick = () => {

    if (menu.classList.contains("open")) {

      closeMenu()

    } else {

      openMenu()

    }

  }

  overlay.onclick = closeMenu

}
