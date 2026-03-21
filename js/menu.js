export function initMenu() {

  const menu = document.getElementById("global-menu")
  const toggle = document.getElementById("menu-toggle")
  const headerRight = document.getElementById("header-right")

  if(!menu || !toggle) return

  // ================================
  // 🔔 CAMPANELLA
  // ================================
  if(headerRight && !document.getElementById("notif-bell")){
    const bell = document.createElement("div")
    bell.id = "notif-bell"
    bell.style.position = "relative"
    bell.style.cursor = "pointer"
    bell.style.marginLeft = "10px"

    bell.innerHTML = `
      <span style="font-size:20px;">🔔</span>
      <div id="notif-badge" style="
        position:absolute;
        top:-6px;
        right:-6px;
        background:#ef4444;
        color:white;
        border-radius:50%;
        font-size:10px;
        padding:2px 6px;
        display:none;
      ">0</div>
    `

    bell.onclick = () => {
      if(window.toggleNotificheDropdown){
        window.toggleNotificheDropdown()
      }
    }

    headerRight.appendChild(bell)
  }

  let overlay = document.querySelector(".menu-overlay")

  if(!overlay){
    overlay = document.createElement("div")
    overlay.className = "menu-overlay"
    document.body.appendChild(overlay)
  }

  // ======================================================
  // 🔥 RUOLO ATTIVO
  // ======================================================

  function getRuoloAttivo(){
    return window.state?.viewAs || window.state?.ruolo
  }

  function isSuperadmin(){
    return window.state?.ruolo === "superadmin"
  }

  // ======================================================
  // 🔥 MENU CONFIG
  // ======================================================

  function getMenu(){

    const ruolo = getRuoloAttivo()

    return [

      ...(isSuperadmin() ? [{
        title:"PIATTAFORMA",
        items:[
          {label:"Dashboard SaaS", route:"home-piattaforma"},
          {label:"Gestione Aziende", route:"gestioneAziende"},
          {label:"Crea Azienda", route:"creaAzienda"},
          {label:"Piani Abbonamento", route:"gestionePiani"}
        ]
      }] : []),

      {
        title:"GENERALE",
        items:[
          {label:"Home", route:"home"}
        ]
      },

      {
        title:"OPERATIVO",
        items:[
          {label:"Produzione", route:"produzione"},
          {label:"Magazzino", route:"magazzino"},
          {label:"Ricettario", route:"ricettario"},
          {label:"Preparazioni", route:"preparazioni"}
        ]
      }

    ]
  }

  // ======================================================
  // 🔥 RENDER
  // ======================================================

  function renderMenu(){

    menu.innerHTML = ""

    const struttura = getMenu()

    struttura.forEach(section => {

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

      // 🔥 FORZA CHIUSURA INIZIALE
      itemsBox.classList.remove("open")

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

      title.onclick = () => {

        const isOpen = itemsBox.classList.contains("open")

        // chiudi tutto
        document.querySelectorAll(".menu-subitems").forEach(el=>{
          el.classList.remove("open")
        })

        document.querySelectorAll(".menu-arrow").forEach(el=>{
          el.style.transform = "rotate(0deg)"
        })

        // apri solo se era chiuso
        if(!isOpen){
          itemsBox.classList.add("open")
          title.querySelector(".menu-arrow").style.transform = "rotate(90deg)"
        }

      }

      sectionBox.appendChild(title)
      sectionBox.appendChild(itemsBox)

      menu.appendChild(sectionBox)

    })

  }

  function openMenu(){
    renderMenu()
    menu.classList.add("open")
    overlay.classList.add("open")
  }

  function closeMenu(){
    menu.classList.remove("open")
    overlay.classList.remove("open")
  }

  toggle.onclick = () => {
    if(menu.classList.contains("open")){
      closeMenu()
    }else{
      openMenu()
    }
  }

  overlay.onclick = closeMenu

  window.menuController = {
    refresh: renderMenu,
    open: openMenu,
    close: closeMenu
  }

}
