export async function renderFooter(){

  const ruolo = window.state?.viewAs || window.state?.ruolo
  const aziendaId = window.state?.azienda?.id

  const supabase = window.supabase

  const alerts = await getFooterAlerts(ruolo, aziendaId, supabase)

  function can(route){

    if(window.state?._allAccess) return true
    if(window.state?.ruolo === "superadmin") return true

    if(window.hasPermesso){
      return window.hasPermesso(route)
    }

    return true
  }

  const footerConfig = {

    operatore: [
      {icon:"⏱", label:"Timbratura", route:"timbrature", key:"timbrature"},
      {icon:"📅", label:"Planner", route:"planner-produzione"},
      {icon:"🍳", label:"Prep", route:"produzione"},
      {icon:"📅", label:"Permessi", route:"permessi"}
    ],

    manager: [
      {icon:"📅", label:"Planner", route:"planner-produzione"},
      {icon:"📊", label:"Servizi", route:"servizi"},
      {icon:"👥", label:"Personale", route:"dipendenti", key:"turni"},
      {icon:"🍳", label:"Produzione", route:"produzione"}
    ],

    admin: [
      {icon:"📊", label:"Dashboard", route:"home"},
      {icon:"📅", label:"Planner", route:"planner-produzione"},
      {icon:"💰", label:"Margini", route:"margini", key:"costi"},
      {icon:"📈", label:"KPI", route:"kpi"}
    ]

  }

  const items = (footerConfig[ruolo] || []).filter(i => can(i.route))

  return `
    <div class="app-footer">

      ${items.map(i => `
        <div class="footer-item" data-route="${i.route}">

          <div class="footer-icon">
            ${i.icon}
            ${i.key && alerts[i.key] ? `<span class="badge"></span>` : ""}
          </div>

          <div class="footer-label">${i.label}</div>

        </div>
      `).join("")}

    </div>

    <!-- 🔥 BRAND PIATTAFORMA -->
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

      /* 🔥 NUOVO BLOCCO BRAND */
      .footer-brand{
        text-align:center;
        font-size:11px;
        color:#9ca3af;
        margin-top:6px;
        margin-bottom:6px;
        padding-bottom:env(safe-area-inset-bottom);
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
