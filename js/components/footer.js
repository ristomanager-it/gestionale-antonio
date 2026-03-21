export function renderFooter(){

  const ruolo = window.state?.viewAs || window.state?.ruolo

  const footerConfig = {
    operatore: [
      {icon:"⏱", label:"Timbratura", route:"timbrature"},
      {icon:"🍽", label:"Servizio", route:"servizi"},
      {icon:"🍳", label:"Prep", route:"produzione"},
      {icon:"📅", label:"Permessi", route:"permessi"}
    ],

    manager: [
      {icon:"📊", label:"Servizi", route:"servizi"},
      {icon:"👥", label:"Personale", route:"dipendenti"},
      {icon:"📅", label:"Turni", route:"turni"},
      {icon:"🍳", label:"Produzione", route:"produzione"}
    ],

    admin: [
      {icon:"📊", label:"Dashboard", route:"home"},
      {icon:"💰", label:"Margini", route:"margini"},
      {icon:"⚙️", label:"Costi", route:"costi"},
      {icon:"📈", label:"KPI", route:"kpi"}
    ]
  }

  const items = footerConfig[ruolo] || []

  return `
    <div class="app-footer">

      ${items.map(i => `
        <div class="footer-item" data-route="${i.route}">
          <div class="footer-icon">${i.icon}</div>
          <div class="footer-label">${i.label}</div>
        </div>
      `).join("")}

    </div>
  `
}


// =====================================
// INIT
// =====================================

export function initFooter(){

  document.querySelectorAll(".footer-item").forEach(el => {

    el.addEventListener("click", () => {

      const route = el.dataset.route
      if(!route) return

      // 🔥 ROUTER CORRETTO
      if(window.router?.go){
        window.router.go(route)
      }else{
        window.location.hash = "#/" + route
      }

    })

  })

}
