export async function renderFooter(){

  const ruolo = window.state?.viewAs || window.state?.ruolo
  const aziendaId = window.state?.azienda?.id
  const supabase = window.supabase

  const alerts = await getFooterAlerts(ruolo, aziendaId, supabase)

  function can(route){
    if(window.state?._allAccess) return true
    if(window.state?.ruolo === "superadmin") return true

    if(window.hasPermission){
      return window.hasPermission(route)
    }

    return true
  }

  let items = []

  // 👨‍🍳 OPERATORE
  if(ruolo === "operatore_cucina" || ruolo === "operatore_sala"){
    items = [
      {icon:"⏱", label:"Timbrature", route:"timbrature", key:"timbrature"},
      {icon:"📅", label:"Planning", route:"planning-lavoro"},
      {icon:"🪑", label:"Prenotazioni", route:"prenotazioni"},
      {icon:"📄", label:"Richieste", route:"permessi"}
    ]
  }

  // 🧑‍💼 MANAGER + ADMIN
  else {
    items = [
      {icon:"🏠", label:"Dashboard", route:"home"},
      {icon:"📅", label:"Planning", route:"planning-lavoro"},
      {icon:"🪑", label:"Prenotazioni", route:"prenotazioni"},
      {icon:"📦", label:"Magazzino", route:"magazzino"},
      {icon:"⚙️", label:"Altro", route:"menu"}
    ]
  }

  const visibleItems = items.filter(i => can(i.route))

  return `
    <div class="app-footer">

      ${visibleItems.map(i => `
        <div class="footer-item" data-route="${i.route}">

          <div class="footer-icon">
            ${i.icon}
            ${i.key && alerts[i.key] ? `<span class="badge"></span>` : ""}
          </div>

          <div class="footer-label">${i.label}</div>

        </div>
      `).join("")}

    </div>

    <div class="footer-brand">
      © Ristoflow — Sistema operativo per la ristorazione
    </div>

    <style>
      .badge{
        position:absolute;
        width:8px;
        height:8px;
        background:#dc2626;
        border-radius:50%;
        margin-left:2px;
      }

      .footer-icon{
        position:relative;
      }
    </style>
  `
}


// =====================================
// ALERT LOGIC
// =====================================

async function getFooterAlerts(ruolo, aziendaId, supabase){

  let alerts = {}

  if(!aziendaId) return alerts

  const today = new Date().toISOString().slice(0,10)

  // 👨‍🍳 OPERATORE
  if(ruolo === "operatore_cucina" || ruolo === "operatore_sala"){

    const { data } = await supabase
      .from("timbrature")
      .select("id")
      .eq("azienda_id", aziendaId)
      .eq("user_id", window.state.user.id)
      .eq("data", today)

    if(!data || data.length === 0){
      alerts.timbrature = true
    }
  }

  // 🧑‍💼 MANAGER
  if(ruolo === "manager_cucina" || ruolo === "manager_sala"){

    const { data } = await supabase
      .from("turni_dipendenti")
      .select("id")
      .eq("azienda_id", aziendaId)
      .limit(1)

    if(!data || data.length === 0){
      alerts.turni = true
    }
  }

  // 🧑‍💼 ADMIN
  if(ruolo === "admin" || ruolo === "superadmin"){

    const { data } = await supabase
      .from("costi")
      .select("id")
      .eq("azienda_id", aziendaId)
      .limit(1)

    if(!data || data.length === 0){
      alerts.costi = true
    }
  }

  return alerts
}


// =====================================
// INIT
// =====================================

export function initFooter(){

  document.querySelectorAll(".footer-item").forEach(el => {

    el.addEventListener("click", () => {

      const route = el.dataset.route
      if(!route) return

      if(window.router?.go){
        window.router.go(route)
      }else{
        window.location.hash = "#/" + route
      }

    })

  })

}
