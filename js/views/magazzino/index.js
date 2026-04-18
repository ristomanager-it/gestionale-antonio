export async function render(container){

  container.innerHTML = `
    <div class="view">

      <h2>Magazzino</h2>

      <div class="grid">

        <div class="card" data-action="carico">
          📦 Carico merce
        </div>

        <div class="card" data-action="prodotti">
          📦 Prodotti
        </div>

        <div class="card" data-action="materie">
          🥕 Materie prime
        </div>

        <div class="card" data-action="preparazioni">
          🍳 Preparazioni
        </div>

        <div class="card" data-action="fornitori">
          🚚 Fornitori
        </div>

      </div>

      <div id="magazzino-content"></div>

    </div>

    <style>
      .grid{
        display:grid;
        gap:12px;
        margin-bottom:16px;
      }

      .card{
        background:white;
        padding:16px;
        border-radius:12px;
        cursor:pointer;
      }
    </style>
  `

  bindEvents()
}


// =====================================
// EVENTS
// =====================================

function bindEvents(){

  document.querySelectorAll("[data-action]").forEach(el=>{
    el.onclick = async () => {

      const action = el.dataset.action
      const container = document.getElementById("magazzino-content")

      if (!container) return

      // 🔥 CARICO
      if(action === "carico"){
        const mod = await import("./carico_magazzino.js")
        if(mod.render) await mod.render(container)
      }

      // 🔥 PRODOTTI FINITI
      if(action === "prodotti"){
        const mod = await import("./prodotti_finiti.js")
        if(mod.render) await mod.render(container)
      }

      // 🔥 MATERIE PRIME
      if(action === "materie"){
        const mod = await import("./materie_prime.js")
        if(mod.render) await mod.render(container)
      }

      // 🔥 PREPARAZIONI
      if(action === "preparazioni"){
        const mod = await import("./preparazioni.js")
        if(mod.render) await mod.render(container)
      }

      // 🔥 FORNITORI
      if(action === "fornitori"){
        const mod = await import("./mapping_fornitori.js")
        if(mod.render) await mod.render(container)
      }

    }
  })

}
