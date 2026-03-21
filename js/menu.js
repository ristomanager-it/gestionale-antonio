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
  // 🔥 FUNZIONE DINAMICA (IMPORTANTE)
  // ======================================================

  function isSuperadmin(){
    return window.state?.ruolo === "superadmin"
  }

  // ======================================================
  // 🔥 MENU CONFIG
  // ======================================================

  function getMenu(){

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
          {label:"Produzione", route:"produzione", perm:"produzione.read"},
          {label:"Magazzino", route:"magazzino", perm:"magazzino.read"},
          {label:"Ricettario", route:"ricettario", perm:"ricette.read"},
          {label:"Preparazioni", route:"preparazioni", perm:"produzione.read"}
        ]
      },

      {
        title:"AMMINISTRAZIONE",
        items:[
          {label:"Acquisti", route:"acquisti", perm:"acquisti.read"},
          {label:"Fatture", route:"fatture", perm:"fatture.create"},
          {label:"Dipendenti", route:"dipendenti", perm:"dipendenti.read"},
          {label:"Timbrature", route:"timbrature", perm:"timbrature.read"},
          {label:"Permessi e ferie", route:"permessi", perm:"dipendenti.read"},
          {label:"Preventivi", route:"preventivi", perm:"preventivi.read"}
        ]
      },

      {
        title:"GESTIONE",
        items:[
          {label:"Venduto", route:"venduto", perm:"venduto.read"},
          {label:"Margini", route:"margini", perm:"report.read"}
        ]
      },

      {
        title:"MARKETING",
        items:[
          {label:"Campagne", route:"marketing", perm:"marketing.read"}
        ]
      },

      {
        title:"PERSONALE",
        items:[
          {label:"Timbratura", route:"timbratura", perm:"timbrature.create"},
          {label:"Programma lavoro", route:"programma", perm:"turni.read"},
          {label:"Permessi e ferie", route:"permessi", perm:"dipendenti.read"},
          {label:"Documenti", route:"documenti", perm:"documenti.read"}
        ]
      }

    ]
  }

  // ======================================================
  // 🔥 FILTRO
  // ======================================================

  function filterMenu(){

    const MENU = getMenu()

    return MENU.map(section => {

      const filteredItems = section.items.filter(item => {
        if(!item.perm) return true
        if(isSuperadmin()) return true
        return window.hasPermesso(item.perm)
      })

      return {
        ...section,
        items: filteredItems
      }

    }).filter(section => section.items.length > 0)

  }

  // ======================================================
  // 🔥 RENDER
  // ======================================================

  function renderMenu(){

    menu.innerHTML = ""

    const structure = filterMenu()

    structure.forEach(section => {

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

      title.onclick = () => {

        const opened = itemsBox.classList.contains("open")

        document.querySelectorAll(".menu-subitems").forEach(el=>{
          el.classList.remove("open")
        })

        document.querySelectorAll(".menu-arrow").forEach(el=>{
          el.style.transform = "rotate(0deg)"
        })

        if(!opened){
          itemsBox.classList.add("open")
          title.querySelector(".menu-arrow").style.transform = "rotate(90deg)"
        }

      }

      sectionBox.appendChild(title)
      sectionBox.appendChild(itemsBox)

      menu.appendChild(sectionBox)

    })

    const logout = document.createElement("div")
    logout.className = "menu-logout"
    logout.innerText = "Logout"

    logout.onclick = () => {
      if(window.router?.logout){
        window.router.logout()
      }
    }

    menu.appendChild(logout)

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

  // 🔥 IMPORTANTISSIMO
  window.menuController = {
    refresh: renderMenu,
    open: openMenu,
    close: closeMenu
  }

  if(window.initNotificheRealtime){
    window.initNotificheRealtime()
  }

}
