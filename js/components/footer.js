export function renderFooter(){

const ruolo = window.state?.viewAs || window.state?.ruolo

let items = []

// ==========================
// OPERATORE
// ==========================
if(ruolo === "operatore"){

items = [
  {icon:"⏱", label:"Timbratura", route:"timbrature"},
  {icon:"🍽", label:"Servizio", route:"servizi"},
  {icon:"🍳", label:"Prep", route:"produzione"},
  {icon:"📅", label:"Permessi", route:"permessi"}
]

}

// ==========================
// MANAGER
// ==========================
if(ruolo === "manager"){

items = [
  {icon:"📊", label:"Servizi", route:"servizi"},
  {icon:"👥", label:"Staff", route:"dipendenti"},
  {icon:"🍳", label:"Produzione", route:"produzione"},
  {icon:"⏱", label:"Presenze", route:"timbrature"}
]

}

// ==========================
// ADMIN
// ==========================
if(ruolo === "admin"){

items = [
  {icon:"💰", label:"KPI", route:"home"},
  {icon:"📦", label:"Magazzino", route:"magazzino"},
  {icon:"📊", label:"Vendite", route:"venduto"},
  {icon:"⚙️", label:"Costi", route:"costi"}
]

}

return `
<div class="app-footer">

  ${items.map(i => `
    <div class="footer-item" onclick="location.hash='#/${i.route}'">
      <div class="footer-icon">${i.icon}</div>
      <div class="footer-label">${i.label}</div>
    </div>
  `).join("")}

</div>
`

}
