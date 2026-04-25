import { supabase } from "../lib/supabaseClient.js"

export async function render(container) {

  const ruolo = window.state?.ruolo
  const azienda_id = window.state?.azienda_id

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `
      <section class="view">
        <h2>Accesso negato</h2>
        <p>Non hai i permessi per accedere al Back Office.</p>
      </section>
    `
    return
  }

  // -------------------------
  // FETCH DATI DASHBOARD
  // -------------------------

  let contattiCount = 0
  let tagCount = 0
  let templateCount = 0
  let bookingCount = 0

  try {

    const { count: c1 } = await supabase
      .from("contatti")
      .select("*", { count: "exact", head: true })
      .eq("azienda_id", azienda_id)

    contattiCount = c1 || 0

    const { count: c2 } = await supabase
      .from("clienti_tag")
      .select("*", { count: "exact", head: true })
      .eq("azienda_id", azienda_id)

    tagCount = c2 || 0

    const { count: c3 } = await supabase
      .from("messaggi_template")
      .select("*", { count: "exact", head: true })
      .eq("azienda_id", azienda_id)

    templateCount = c3 || 0

    const { count: c4 } = await supabase
      .from("booking_forms")
      .select("*", { count: "exact", head: true })
      .eq("azienda_id", azienda_id)

    bookingCount = c4 || 0

  } catch (err) {
    console.error("Errore caricamento dashboard BO", err)
  }

  // -------------------------
  // UI
  // -------------------------

  container.innerHTML = `
    <div style="display:flex; gap:16px; width:100%; min-height:70vh;">

      <!-- MENU -->
      <aside style="
        width:240px;
        background:#111827;
        color:white;
        border-radius:16px;
        padding:16px;
        flex-shrink:0;
      ">

        <div style="font-weight:800; margin-bottom:16px;">
          BACK OFFICE
        </div>

        <div class="bo-menu-item" data-route="bo-dashboard">🏠 Dashboard</div>
        <div class="bo-menu-item" data-route="bo-tag">🏷️ Tag</div>
        <div class="bo-menu-item" data-route="bo-marketing">📢 Marketing</div>
        <div class="bo-menu-item" data-route="bo-template">✉️ Template</div>
        <div class="bo-menu-item" data-route="bo-booking">📅 Booking</div>
        <div class="bo-menu-item" data-route="bo-impostazioni">⚙️ Impostazioni</div>

      </aside>

      <!-- CONTENUTO -->
      <div id="bo-content" style="flex:1; display:flex; flex-direction:column; gap:16px;">

        <div class="card">
          <h2>Back Office Dashboard</h2>
          <p>Panoramica configurazione azienda</p>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:12px;">

          <div class="card">
            <h3>👥 Contatti</h3>
            <p style="font-size:24px; font-weight:bold;">${contattiCount}</p>
          </div>

          <div class="card">
            <h3>🏷️ Tag</h3>
            <p style="font-size:24px; font-weight:bold;">${tagCount}</p>
          </div>

          <div class="card">
            <h3>✉️ Template</h3>
            <p style="font-size:24px; font-weight:bold;">${templateCount}</p>
          </div>

          <div class="card">
            <h3>📅 Booking</h3>
            <p style="font-size:24px; font-weight:bold;">${bookingCount}</p>
          </div>

        </div>

        <div class="card">
          <h3>Azioni rapide</h3>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">

            <button onclick="window.location.hash='#/bo-tag'">Gestisci Tag</button>
            <button onclick="window.location.hash='#/bo-template'">Template Messaggi</button>
            <button onclick="window.location.hash='#/bo-booking'">Config Booking</button>
            <button onclick="window.location.hash='#/bo-impostazioni'">Impostazioni Azienda</button>

          </div>
        </div>

      </div>
    </div>
  `

  // -------------------------
  // MENU INTERAZIONE
  // -------------------------

  const items = container.querySelectorAll(".bo-menu-item")

  items.forEach(el => {
    el.style.padding = "10px"
    el.style.borderRadius = "10px"
    el.style.cursor = "pointer"
    el.style.marginBottom = "6px"

    el.onmouseenter = () => {
      el.style.background = "rgba(255,255,255,0.1)"
    }

    el.onmouseleave = () => {
      el.style.background = "transparent"
    }

    el.onclick = () => {
      const route = el.getAttribute("data-route")
      if (route) {
        window.location.hash = "#/" + route
      }
    }
  })
}
