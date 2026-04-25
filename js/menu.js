export function initMenu() {

  const menu = document.getElementById("global-menu")
  const toggle = document.getElementById("menu-toggle")
  const headerRight = document.getElementById("header-right")

  if(!menu || !toggle) return

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

  function getRuoloAttivo(){
    return window.state?.viewAs || window.state?.ruolo
  }

  function isSuperadmin(){
    return window.state?.ruolo === "superadmin"
  }

  function can(route){

    if(window.state?._allAccess) return true
    if(isSuperadmin()) return true

    if(window.hasPermesso){
      return window.hasPermesso(route)
    }

    return true
  }

  function go(route){
    if(!can(route)) return

    window.location.hash = "#/" + route
    closeMenu()
  }

  function getMenu(){

    const isAdmin = window.state?.ruolo === "admin" || window.state?.ruolo === "superadmin"

    return [

      ...(isAdmin ? [{
        title:"BACK OFFICE",
        items:[
          {label:"⚙️ Back Office", route:"bo-dashboard"},
          {label:"📢 Marketing", route:"bo-marketing"}
        ]
      }] : []),

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
          {label:"Home", route:"home"},
          {label:"📘 Manuale operativo", route:"manuale"}
        ]
      },

      {
        title:"OPERATIVO",
        items:[
          {label:"🪑 Sala", route:"sala"},
          {label:"📅 Prenotazioni", route:"prenotazioni"},
          {label:"Planning Produzione", route:"planner-produzione"},
          {label:"Produzione", route:"produzione"},
          {label:"Magazzino", route:"magazzino"},
          {label:"Ricettario", route:"ricettario"},
          {label:"Preparazioni", route:"preparazioni"}
        ]
      },

      {
        title:"AMMINISTRAZIONE",
        items:[
          {label:"Acquisti", route:"acquisti"},
          {label:"Fatture", route:"fatture"},
          {label:"Dipendenti", route:"dipendenti"},
          {label:"Timbrature", route:"timbrature"},
          {label:"Permessi e ferie", route:"permessi"},
          {label:"Preventivi", route:"preventivi"}
        ]
      },

      {
        title:"GESTIONE",
        items:[
          {label:"Venduto", route:"venduto"},
          {label:"Margini", route:"margini"}
        ]
      },

      {
        title:"SEDI",
        items:[
          {label:"Cambia sede", route:"gestione-sedi"},
          {label:"Crea sede", route:"gestione-sedi?mode=first"},
          {label:"Gestisci sedi", route:"gestione-sedi?mode=manage"}
        ]
      },

      {
        title:"PERSONALE",
        items:[
          {label:"Timbratura", route:"timbrature"},
          {label:"Programma lavoro", route:"programma"},
          {label:"Permessi e ferie", route:"permessi"},
          {label:"Documenti", route:"documenti"}
        ]
      }

    ]
  }

  function renderMenu(){

    menu.innerHTML = ""

    const sede = window.state?.sedeAttiva;
    if(sede){
      const sedeBox = document.createElement("div")
      sedeBox.className = "menu-sede-attiva"
      sedeBox.innerText = "📍 " + sede.nome
      sedeBox.style.padding = "12px"
      sedeBox.style.fontWeight = "700"
      sedeBox.style.borderBottom = "1px solid #eee"
      menu.appendChild(sedeBox)
    }

    const struttura = getMenu()

    struttura.forEach(section => {

      const items = section.items.filter(i => can(i.route))
      if(items.length === 0) return

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

      items.forEach(item => {

        const row = document.createElement("div")
        row.className = "menu-subitem"
        row.innerText = item.label

        row.onclick = () => go(item.route)

        itemsBox.appendChild(row)

      })

      title.onclick = () => {

        const isOpen = itemsBox.classList.contains("open")

        document.querySelectorAll(".menu-subitems").forEach(el=>{
          el.classList.remove("open")
        })

        document.querySelectorAll(".menu-arrow").forEach(el=>{
          el.style.transform = "rotate(0deg)"
        })

        if(!isOpen){
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
      closeMenu()
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

  window.menuController = {
    refresh: renderMenu,
    open: openMenu,
    close: closeMenu
  }

}
