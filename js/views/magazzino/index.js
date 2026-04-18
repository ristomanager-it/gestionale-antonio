export async function render(container){

  container.innerHTML = `
    <div class="view">

      <h2>Magazzino</h2>

      <div class="grid">

        <div class="card" data-action="home">
          📊 Dashboard magazzino
        </div>

        <div class="card" data-action="carico">
          📦 Carico merce
        </div>

        <div class="card" data-action="prodotti">
          📦 Prodotti finiti
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

  // ✅ carica subito la UI originale
  await loadMainView()
}


// =====================================
// LOAD VIEW PRINCIPALE (vecchia UI)
// =====================================

async function loadMainView(){

  const container = document.getElementById("magazzino-content")
  if (!container) return

  const mod = await import("./magazzino.js")

  if(mod.render){
    await mod.render(container)
  }else{
    container.innerHTML = `<div>Magazzino pronto</div>`
  }

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

      // 🔥 HOME (vecchia UI)
      if(action === "home"){
        await loadMainView()
      }

      // 🔥 CARICO MERCE (FIX PARAMETRI)
      if(action === "carico"){
        const mod = await import("./magazzino.js")

        if(mod.apriCaricoModal){
          mod.apriCaricoModal({
            aziendaId: window.state?.azienda?.id,
            sedeId: window.state?.sedeAttiva?.id,
            userId: window.state?.user?.id
          })
        }
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
