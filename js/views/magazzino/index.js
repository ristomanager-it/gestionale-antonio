export async function render(container){

  const mod = await import("./magazzino.js")

  if(!mod.render){
    container.innerHTML = `
      <div class="view">
        <h2>Errore magazzino</h2>
        <p>Il modulo non esporta render()</p>
      </div>
    `
    return
  }

  await mod.render(container)

}
