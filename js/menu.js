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

  /* =========================
     STRUTTURA MENU
  ========================= */

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

  ]

  /* =========================
     RENDER MENU
  ========================= */

  function renderMenu() {

    menu.innerHTML = ""

    menuStructure.forEach(section => {

      const sectionBox = document.createElement("div")
      sectionBox.className = "menu-section"

      const title = document.createElement("div")
      title.className = "menu-category"
      title.innerHTML = `
<span>${section.title}</span>
<span class="menu-arrow">›</span>
`

      const itemsBox = document.createElement("div")
      itemsBox.className = "menu-subitems"

      section.items.forEach(item => {

        const row = document.createElement("div")
        row.className = "menu-subitem"
        row.innerText = item.label

        row.onclick = () => {
          window.location.hash = "#/" + item.route
          closeMenu()
        }

        itemsBox.appendChild(row)

      })

      /* toggle apertura */

    title.onclick = () => {

  const opened = itemsBox.classList.contains("open")

  document.querySelectorAll(".menu-subitems").forEach(el=>{
    el.classList.remove("open")
  })

  document.querySelectorAll(".menu-arrow").forEach(el=>{
    el.style.transform="rotate(0deg)"
  })

  if(!opened){
    itemsBox.classList.add("open")
    title.querySelector(".menu-arrow").style.transform="rotate(90deg)"
  }

}

      sectionBox.appendChild(title)
      sectionBox.appendChild(itemsBox)

      menu.appendChild(sectionBox)

    })

    /* logout */

    const logout = document.createElement("div")
    logout.className = "menu-logout"
    logout.innerText = "Logout"

    logout.onclick = () => {
      if (window.router && window.router.logout) {
        window.router.logout()
      }
    }

    menu.appendChild(logout)

  }

  /* =========================
     OPEN MENU
  ========================= */

  function openMenu() {
    renderMenu()
    menu.classList.add("open")
    overlay.classList.add("open")
  }

  /* =========================
     CLOSE MENU
  ========================= */

  function closeMenu() {
    menu.classList.remove("open")
    overlay.classList.remove("open")
  }

  toggle.onclick = () => {

    if (menu.classList.contains("open")) {
      closeMenu()
    } else {
      openMenu()
    }

  }

  overlay.onclick = closeMenu

}
