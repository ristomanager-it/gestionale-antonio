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

  let categoriaSelezionata = null

  container.innerHTML = `
  <section class="view" style="display:flex; flex-direction:column; gap:20px; padding:20px;">

    <!-- HEADER -->
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2>Menu Builder</h2>
      <button id="btn-new-menu" class="app-button primary">+ Nuovo menu</button>
    </div>

    <!-- IDENTITÀ -->
    <div class="card">
      <input id="menu-nome" class="input" placeholder="Nome menu">
      <input id="menu-slug" class="input" placeholder="Slug">
      <textarea id="menu-descrizione" class="input" placeholder="Descrizione"></textarea>
    </div>

    <!-- DESIGN -->
    <div class="card">
      <h3>Design</h3>

      <input type="color" id="menu-color-picker" value="#ffffff">
      <input id="menu-bg-color" class="input" placeholder="#ffffff">

      <select id="menu-font-weight" class="input">
        <option value="normal">Normale</option>
        <option value="bold">Grassetto</option>
      </select>

      <select id="menu-font-size" class="input">
        <option value="14">Piccolo</option>
        <option value="16">Medio</option>
        <option value="20">Grande</option>
      </select>
    </div>

    <!-- PUBBLICAZIONE -->
    <div class="card">
      <h3>Pubblicazione</h3>

      <div id="menu-link-box"></div>

      <input id="menu-short-link" class="input" placeholder="Short link">
      <button id="btn-genera-short" class="app-button">Genera short link</button>
    </div>

    <!-- COMPOSIZIONE -->
    <div class="card">
      <h3>Composizione menu</h3>

      <div style="display:grid; grid-template-columns:240px 1fr 300px; gap:16px;">

        <div>
          <h4>Categorie</h4>
          <div id="categorie-disponibili"></div>
        </div>

        <div>
          <h4>Menu</h4>
          <div id="menu-drop-zone" style="min-height:300px; border:2px dashed #ccc;"></div>
        </div>

        <div>
          <h4>Prodotti</h4>
          <input id="product-search" class="input" placeholder="Cerca">
          <div id="prodotti-disponibili"></div>
        </div>

      </div>
    </div>

    <!-- PREVIEW -->
    <div class="card">
      <h3>Preview LIVE</h3>
      <div id="menu-preview"></div>
    </div>

  </section>
  `

  bindEvents()
  await loadAll()

  function bindEvents() {
    qs("#btn-new-menu").onclick = startNewMenu
    qs("#btn-save-menu")?.addEventListener("click", saveMenu)

    qs("#product-search").addEventListener("input", renderProdottiDisponibili)

    qs("#menu-color-picker").oninput = e => {
      qs("#menu-bg-color").value = e.target.value
      renderPreview()
    }

    qsa("#menu-nome, #menu-descrizione, #menu-bg-color, #menu-font-weight, #menu-font-size")
      .forEach(el => el.addEventListener("input", () => {
        renderPreview()
        renderLinkBox()
      }))

    qs("#btn-genera-short").onclick = () => {
      const base = qs("#menu-slug").value || qs("#menu-nome").value
      qs("#menu-short-link").value = makeSlug(base)
    }

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
    renderLinkBox()
  }

  function renderMenuList() {
    qs("#menu-list") && (qs("#menu-list").innerHTML = menus.map(m => `
      <div data-id="${m.id}">${m.nome}</div>
    `).join(""))

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

      el.onclick = () => {
        categoriaSelezionata = el.dataset.id
        renderProdottiDisponibili()
      }
    })
  }

  function renderProdottiDisponibili() {
    let list = prodottiDisponibili

    if (categoriaSelezionata) {
      list = list.filter(p => String(p.categoria_vendita_id) === String(categoriaSelezionata))
    }

    qs("#prodotti-disponibili").innerHTML = list.map(p => `
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
    const nome = qs("#menu-nome").value || menuAttivo?.nome || "Menu"
    const desc = qs("#menu-descrizione").value || ""
    const bg = qs("#menu-bg-color").value || "#ffffff"
    const weight = qs("#menu-font-weight").value
    const size = qs("#menu-font-size").value

    qs("#menu-preview").innerHTML = `
      <div style="background:${bg}; padding:20px;">
        <h2 style="font-weight:${weight}; font-size:${size}px;">${nome}</h2>
        <p>${desc}</p>
      </div>
    `
  }

  function renderLinkBox() {
    const slug = makeSlug(qs("#menu-slug").value || qs("#menu-nome").value)
    if (!slug) return

    const url = BASE_PUBLIC_URL + "/#/menu/" + slug

    qs("#menu-link-box").innerHTML = `
      <input class="input" value="${url}" readonly>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}">
    `
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

  function makeSlug(str) {
    return String(str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
  }

  function qs(s) { return container.querySelector(s) }
  function qsa(s) { return Array.from(container.querySelectorAll(s)) }
}
