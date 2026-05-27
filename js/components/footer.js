export async function renderFooter(){

  const ruolo =
    window.state?.viewAs ||
    window.state?.ruolo

  const aziendaId =
    window.state?.azienda?.id

  const supabase =
    window.supabase

  const alerts =
    await getFooterAlerts(
      ruolo,
      aziendaId,
      supabase
    )

  function can(route){

    if(window.state?._allAccess){
      return true
    }

    if(window.state?.ruolo === "superadmin"){
      return true
    }

    if(window.hasPermission){
      return window.hasPermission(route)
    }

    return true

  }

  let items = []

  // 👨‍🍳 OPERATORE
  if(ruolo === "operatore"){

    items = [
      {
        icon:"⏱",
        label:"Timbrature",
        route:"timbrature",
        key:"timbrature"
      },
      {
        icon:"📅",
        label:"Planning",
        route:"planning-lavoro"
      },
      {
        icon:"🪑",
        label:"Prenotazioni",
        route:"prenotazioni"
      },
      {
        icon:"📄",
        label:"Richieste",
        route:"permessi"
      },
      {
        icon:"👤",
        label:"Profilo",
        route:"profilo"
      }
    ]

  }

  // 🧑‍💼 MANAGER + ADMIN
  else {

    items = [
      {
        icon:"🏠",
        label:"Dashboard",
        route:"home"
      },
      {
        icon:"📅",
        label:"Planning",
        route:"planning-lavoro"
      },
      {
        icon:"🪑",
        label:"Prenotazioni",
        route:"prenotazioni"
      },
      {
        icon:"📦",
        label:"Magazzino",
        route:"magazzino"
      },
      {
        icon:"⚙️",
        label:"Altro",
        route:"menu"
      },
      {
        icon:"👤",
        label:"Profilo",
        route:"profilo"
      }
    ]

  }

  const visibleItems =
    items.filter(i => can(i.route))

  return `
    <div class="app-footer">

      ${visibleItems.map(i => `
        <div
          class="footer-item"
          data-route="${i.route}"
        >

          <div class="footer-icon">

            ${i.icon}

            ${
              i.key && alerts[i.key]
                ? `<span class="badge"></span>`
                : ""
            }

          </div>

          <div class="footer-label">
            ${i.label}
          </div>

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

async function getFooterAlerts(
  ruolo,
  aziendaId,
  supabase
){

  let alerts = {}

  if(!aziendaId){
    return alerts
  }

  const today =
    new Date()
      .toISOString()
      .slice(0,10)

  const tomorrowDate =
    new Date()

  tomorrowDate.setDate(
    tomorrowDate.getDate() + 1
  )

  const tomorrow =
    tomorrowDate
      .toISOString()
      .slice(0,10)

  // 👨‍🍳 OPERATORE
  if(ruolo === "operatore"){

    const dipendenteId =
      window.state?.dipendente?.id ||
      null

    if(!dipendenteId){
      return alerts
    }

    const { data, error } =
      await supabase
        .from("timbrature")
        .select("id")
        .eq(
          "azienda_id",
          aziendaId
        )
        .eq(
          "dipendente_id",
          dipendenteId
        )
        .gte(
          "timestamp",
          `${today}T00:00:00`
        )
        .lt(
          "timestamp",
          `${tomorrow}T00:00:00`
        )

    if(error){
      console.error(
        "FOOTER TIMBRATURE ERROR:",
        error
      )
    }

    if(!data || data.length === 0){
      alerts.timbrature = true
    }

  }

  // 🧑‍💼 MANAGER
  if(ruolo === "manager"){

    const { data, error } =
      await supabase
        .from("turni_dipendenti")
        .select("id")
        .eq(
          "azienda_id",
          aziendaId
        )
        .limit(1)

    if(error){
      console.error(
        "FOOTER TURNI ERROR:",
        error
      )
    }

    if(!data || data.length === 0){
      alerts.turni = true
    }

  }

  // 🧑‍💼 ADMIN
  if(
    ruolo === "admin" ||
    ruolo === "superadmin"
  ){

    const { data, error } =
      await supabase
        .from("costi")
        .select("id")
        .eq(
          "azienda_id",
          aziendaId
        )
        .limit(1)

    if(error){
      console.error(
        "FOOTER COSTI ERROR:",
        error
      )
    }

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

  document
    .querySelectorAll(".footer-item")
    .forEach(el => {

      el.addEventListener(
        "click",
        () => {

          const route =
            el.dataset.route

          if(!route){
            return
          }

          if(window.router?.go){

            window.router.go(route)

          }else{

            window.location.hash =
              "#/" + route

          }

        }
      )

    })

}
