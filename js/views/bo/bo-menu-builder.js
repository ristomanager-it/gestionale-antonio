const supabase = window.supabase

export async function render(container) {
  const azienda_id = window.state?.azienda_id || window.state?.azienda?.id
  const sede_id = window.state?.sedeAttiva?.id || null
  const ruolo = window.state?.ruolo

  const STORAGE_BUCKET = "loghi-aziende"
  const BASE_PUBLIC_URL = "https://ristoflow-ai.com"

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `
      <section class="view">
        <h2>Accesso negato</h2>
        <p>Non hai i permessi per accedere al Back Office.</p>
      </section>
    `
    return
  }

  if (!supabase || typeof supabase.from !== "function") {
    container.innerHTML = `
      <section class="view">
        <h2>Errore</h2>
        <p>Supabase non inizializzato.</p>
      </section>
    `
    return
  }

  let menus = []
  let menuAttivo = null

  let categorieDisponibili = []
  let prodottiDisponibili = []

  let menuCategorie = []
  let menuVoci = []

  container.innerHTML = `
   <section class="view" style="display:flex; flex-direction:column; gap:16px; height:100%;">
      
      <div class="card" style="display:flex; justify-content:space-between;">
        <h2>Menu Builder</h2>
        <button id="btn-new-menu" class="app-button primary">+ Nuovo menu</button>
      </div>

      <div style="display:grid; grid-template-columns:260px 1fr 280px; gap:16px; flex:1;">

        <aside>
          <div class="card">
            <h3>Menu</h3>
            <div id="menu-list"></div>
          </div>

          <div class="card">
            <h3>Categorie</h3>
            <div id="categorie-disponibili"></div>
          </div>
        </aside>

        <main style="display:flex; flex-direction:column; gap:16px;">

          <div class="card">
            <h3>Impostazioni menu</h3>

            <input id="menu-nome" class="input" placeholder="Nome menu">
            <input id="menu-slug" class="input" placeholder="Slug">

            <textarea id="menu-descrizione" class="input" placeholder="Descrizione"></textarea>

            <input id="menu-logo-url" class="input" placeholder="Logo URL" readonly>
            <input id="menu-cover-url" class="input" placeholder="Cover URL" readonly>

            <input id="menu-bg-color" class="input" placeholder="#ffffff">

            <label>
              <input type="checkbox" id="menu-attivo" checked> Attivo
            </label>

            <button id="btn-save-menu" class="app-button primary">Salva</button>
          </div>

          <div class="card">
            <h3>Composizione</h3>
            <div id="menu-drop-zone" style="min-height:200px; border:2px dashed #ccc;"></div>
          </div>

        </main>

        <aside>
          <div class="card">
            <h3>Prodotti</h3>
            <input id="product-search" class="input" placeholder="Cerca">
            <div id="prodotti-disponibili"></div>
          </div>

          <div class="card">
            <h3>Preview</h3>
            <div id="menu-preview"></div>
          </div>
        </aside>

      </div>
    </section>
  `

  bindEvents()
  await loadAll()

  function bindEvents() {
    qs("#btn-new-menu").onclick = startNewMenu
    qs("#btn-save-menu").onclick = saveMenu

    qs("#product-search").addEventListener("input", renderProdottiDisponibili)

    const dropZone = qs("#menu-drop-zone")

    dropZone.addEventListener("dragover", (e) => e.preventDefault())

    dropZone.addEventListener("drop", async (e) => {
      e.preventDefault()
      const type = e.dataTransfer.getData("type")
      const id = e.dataTransfer.getData("id")

      if (type === "categoria") {
        await addCategoriaToMenu(id)
      }
    })
  }

  async function loadAll() {
    await Promise.all([
      loadMenus(),
      loadCategorieDisponibili(),
      loadProdottiDisponibili()
    ])

    if (menus.length) await selectMenu(menus[0].id)
    else renderAll()
  }

  async function loadMenus() {
    const { data } = await supabase.from("menu").select("*").eq("azienda_id", azienda_id)
    menus = data || []
  }

  async function loadCategorieDisponibili() {
    const { data } = await supabase.from("categorie_vendita").select("*").eq("azienda_id", azienda_id)
    categorieDisponibili = data || []
  }

  async function loadProdottiDisponibili() {
    const { data } = await supabase.from("prodotti_vendita").select("*").eq("azienda_id", azienda_id)
    prodottiDisponibili = data || []
  }

  async function selectMenu(id) {
    const { data } = await supabase.from("menu").select("*").eq("id", id).single()
    menuAttivo = data
    await loadMenuComposition()
    renderAll()
  }

  async function loadMenuComposition() {
    const { data: cat } = await supabase.from("menu_categorie").select("*").eq("menu_id", menuAttivo.id)
    const { data: voci } = await supabase.from("menu_voci").select("*").eq("menu_id", menuAttivo.id)

    menuCategorie = cat || []
    menuVoci = voci || []
  }

  function renderAll() {
    renderMenuList()
    renderCategorieDisponibili()
    renderProdottiDisponibili()
    renderBuilder()
    renderPreview()
  }

  function renderMenuList() {
    qs("#menu-list").innerHTML = menus.map(m => `
      <div data-id="${m.id}">${m.nome}</div>
    `).join("")

    qsa("[data-id]").forEach(el => {
      el.onclick = () => selectMenu(el.dataset.id)
    })
  }

  function renderCategorieDisponibili() {
    qs("#categorie-disponibili").innerHTML = categorieDisponibili.map(c => `
      <div draggable="true" data-type="categoria" data-id="${c.id}">
        ${c.nome}
      </div>
    `).join("")

    qsa("[draggable]").forEach(el => {
      el.ondragstart = e => {
        e.dataTransfer.setData("type", el.dataset.type)
        e.dataTransfer.setData("id", el.dataset.id)
      }
    })
  }

  function renderProdottiDisponibili() {
    qs("#prodotti-disponibili").innerHTML = prodottiDisponibili.map(p => `
      <div draggable="true" data-type="prodotto" data-id="${p.id}">
        ${p.nome}
      </div>
    `).join("")
  }

  function renderBuilder() {
    const box = qs("#menu-drop-zone")

    if (!menuCategorie.length) {
      box.innerHTML = "Trascina categorie"
      return
    }

    box.innerHTML = menuCategorie.map(cat => `
      <div>
        <h4>${cat.nome}</h4>
      </div>
    `).join("")
  }

  async function addCategoriaToMenu(id) {
    if (!menuAttivo) return

    await supabase.from("menu_categorie").insert({
      menu_id: menuAttivo.id,
      categoria_vendita_id: id,
      azienda_id
    })

    await loadMenuComposition()
    renderAll()
  }

  function renderPreview() {
    qs("#menu-preview").innerHTML = menuAttivo?.nome || "Preview"
  }

  async function saveMenu() {
    const nome = qs("#menu-nome").value

    if (!menuAttivo) {
      const { data } = await supabase.from("menu").insert({ nome, azienda_id }).select().single()
      menuAttivo = data
    } else {
      await supabase.from("menu").update({ nome }).eq("id", menuAttivo.id)
    }

    await loadMenus()
    renderAll()
  }

  function startNewMenu() {
    menuAttivo = null
    renderAll()
  }

  function qs(s) { return container.querySelector(s) }
  function qsa(s) { return Array.from(container.querySelectorAll(s)) }
}
