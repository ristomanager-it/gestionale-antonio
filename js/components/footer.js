export async function renderFooter(){

  const ruolo = window.state?.viewAs || window.state?.ruolo
  const aziendaId = window.state?.azienda?.id
  const supabase = window.supabaseClient

  const alerts = await getFooterAlerts(ruolo, aziendaId, supabase)

  const footerConfig = {
    operatore: [
      {icon:"⏱", label:"Timbratura", route:"timbrature", key:"timbrature"},
      {icon:"🍽", label:"Servizio", route:"servizi"},
      {icon:"🍳", label:"Prep", route:"produzione"},
      {icon:"📅", label:"Permessi", route:"permessi"}
    ],

    manager: [
      {icon:"📊", label:"Servizi", route:"servizi"},
      {icon:"👥", label:"Personale", route:"dipendenti", key:"turni"},
      {icon:"📅", label:"Turni", route:"turni", key:"turni"},
      {icon:"🍳", label:"Produzione", route:"produzione"}
    ],

    admin: [
      {icon:"📊", label:"Dashboard", route:"home"},
      {icon:"💰", label:"Margini", route:"margini", key:"costi"},
      {icon:"⚙️", label:"Costi", route:"costi", key:"costi"},
      {icon:"📈", label:"KPI", route:"kpi"}
    ]
  }

  const items = footerConfig[ruolo] || []

  return `
    <div class="app-footer">

      ${items.map(i => `
        <div class="footer-item" data-route="${i.route}">

          <div class="footer-icon">
            ${i.icon}
            ${alerts[i.key] ? `<span class="badge"></span>` : ""}
          </div>

          <div class="footer-label">${i.label}</div>

        </div>
      `).join("")}

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
// ALERT LOGIC (TONY → FOOTER)
// =====================================

async function getFooterAlerts(ruolo, aziendaId, supabase){

  let alerts = {}

  if(!aziendaId) return alerts

  const today = new Date().toISOString().slice(0,10)

  // 👨‍🍳 OPERATORE
  if(ruolo === "operatore"){

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

  // 👨‍💼 MANAGER
  if(ruolo === "manager"){

    const { data } = await supabase
      .from("turni")
      .select("id")
      .eq("azienda_id", aziendaId)
      .eq("data", today)

    if(!data || data.length === 0){
      alerts.turni = true
    }

  }

  // 👨‍💻 ADMIN
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
