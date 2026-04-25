export async function render(container) {

  const ruolo = window.state?.ruolo

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `
      <section class="view">
        <h2>Accesso negato</h2>
        <p>Non hai i permessi per accedere al Back Office.</p>
      </section>
    `
    return
  }

  container.innerHTML = `
    <div style="display:flex; gap:16px; width:100%; min-height:70vh;">

      <!-- MENU BO -->
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
      <div id="bo-content" style="flex:1;">
        <div class="card">
          <h2>Back Office</h2>
          <p>Seleziona una sezione dal menu laterale.</p>
        </div>
      </div>

    </div>
  `

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
