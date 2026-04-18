export async function render(container){

  container.innerHTML = `
    <div class="view">

      <h2>Magazzino</h2>

      <div class="grid">

        <div class="card" data-action="carico">
          📦 Carico merce
        </div>

        <div class="card" data-action="scarico">
          📤 Scarico merce
        </div>

        <div class="card" data-action="inventario">
          📊 Inventario
        </div>

      </div>

    </div>

    <style>
      .grid{
        display:grid;
        gap:12px;
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

function bindEvents(){

  document.querySelectorAll("[data-action]").forEach(el=>{
    el.onclick = async () => {

      const action = el.dataset.action

      // 🔥 carico
      if(action === "carico"){
        const mod = await import("./magazzino.js")
        mod.apriCaricoModal()
      }

      // puoi estendere qui
      if(action === "scarico"){
        console.log("scarico TODO")
      }

      if(action === "inventario"){
        console.log("inventario TODO")
      }

    }
  })

}
