const supabase = window.supabase

export async function render(container) {
  const azienda_id = window.state?.azienda_id || window.state?.azienda?.id
  const ruolo = window.state?.ruolo

  const BASE_PUBLIC_URL = "https://ristoflow-ai.com"

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<section class="view">Accesso negato</section>`
    return
  }

  let menus = []
  let menuAttivo = null

  let categorieDisponibili = []
  let prodottiDisponibili = []

  let menuCategorie = []
  let menuVoci = []

  let categoriaSelezionata = null

  // NUOVI STATI
  let tagsDisponibili = ["pranzo", "cena", "evento", "estate"]
  let tagsSelezionati = []
  let campiTracciamento = []

  container.innerHTML = `
  <section class="view" style="display:flex; flex-direction:column; gap:16px; padding:16px;">

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

      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px;">
        <input type="color" id="menu-color-picker" value="#ffffff">
        <input id="menu-bg-color" class="input" placeholder="#ffffff">

        <select id="menu-font-family" class="input">
          <option value="Arial">Arial</option>
          <option value="Roboto">Roboto</option>
          <option value="Poppins">Poppins</option>
        </select>

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
    </div>

    <!-- PUBBLICAZIONE -->
    <div class="card">
      <h3>Pubblicazione</h3>

      <div id="menu-link-box"></div>

      <div style="display:flex; gap:8px;">
        <input id="menu-short-link" class="input" placeholder="Short link">
        <button id="btn-genera-short" class="app-button">Genera</button>
      </div>
    </div>

    <!-- TAG -->
    <div class="card">
      <h3>Tag</h3>

      <input id="tag-input" class="input" placeholder="Scrivi e premi invio">

      <div id="tag-list" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;"></div>
    </div>

    <!-- TRACCIAMENTO -->
    <div class="card">
      <h3>Raccolta dati cliente</h3>

      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px;">
        ${["nome","cognome","email","telefono","cap","data_nascita"].map(campo => `
          <label>
            <input type="checkbox" data-campo="${campo}">
            ${campo}
          </label>
        `).join("")}
      </div>
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

    // COLOR SYNC
    qs("#menu-color-picker").oninput = e => {
      qs("#menu-bg-color").value = e.target.value
      renderPreview()
    }

    // LIVE PREVIEW (FIX VERO)
    qsa("#menu-nome, #menu-descrizione, #menu-bg-color, #menu-font-weight, #menu-font-size, #menu-font-family")
      .forEach(el => el.addEventListener("input", renderPreview))

    // SHORT LINK
    qs("#btn-genera-short").onclick = () => {
      const base = qs("#menu-slug").value || qs("#menu-nome").value
      qs("#menu-short-link").value = makeSlug(base)
    }

    // TAG SYSTEM
    qs("#tag-input").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault()
        const val = e.target.value.trim()
        if (!val) return

        if (!tagsDisponibili.includes(val)) tagsDisponibili.push(val)
        if (!tagsSelezionati.includes(val)) tagsSelezionati.push(val)

        e.target.value = ""
        renderTags()
      }
    })

    // TRACCIAMENTO
    qsa("[data-campo]").forEach(el => {
      el.onchange = () => {
        if (el.checked) campiTracciamento.push(el.dataset.campo)
        else campiTracciamento = campiTracciamento.filter(c => c !== el.dataset.campo)
      }
    })
  }

  function renderTags() {
    qs("#tag-list").innerHTML = tagsSelezionati.map(t => `
      <span style="background:#e2e8f0; padding:4px 8px; border-radius:8px;">
        ${t}
      </span>
    `).join("")
  }

  function renderPreview() {
    const nome = qs("#menu-nome").value || "Menu"
    const desc = qs("#menu-descrizione").value || ""
    const bg = qs("#menu-bg-color").value || "#fff"
    const weight = qs("#menu-font-weight").value
    const size = qs("#menu-font-size").value
    const font = qs("#menu-font-family").value

    qs("#menu-preview").innerHTML = `
      <div style="background:${bg}; padding:20px; font-family:${font};">
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

  async function loadAll() {
    const { data: m } = await supabase.from("menu").select("*").eq("azienda_id", azienda_id)
    menus = m || []

    const { data: c } = await supabase.from("categorie_vendita").select("*")
    categorieDisponibili = c || []

    const { data: p } = await supabase.from("prodotti_vendita").select("*")
    prodottiDisponibili = p || []

    renderAll()
  }

  function renderAll() {
    renderCategorieDisponibili()
    renderProdottiDisponibili()
    renderBuilder()
    renderPreview()
    renderLinkBox()
    renderTags()
  }

  function renderCategorieDisponibili() {
    qs("#categorie-disponibili").innerHTML = categorieDisponibili.map(c => `
      <div draggable="true" data-id="${c.id}">${c.nome}</div>
    `).join("")
  }

  function renderProdottiDisponibili() {
    qs("#prodotti-disponibili").innerHTML = prodottiDisponibili.map(p => `
      <div>${p.nome}</div>
    `).join("")
  }

  function renderBuilder() {
    qs("#menu-drop-zone").innerHTML = menuCategorie.map(c => `<div>${c.nome}</div>`).join("")
  }

  function makeSlug(str) {
    return String(str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
  }

  function startNewMenu() {
    menuAttivo = null
    renderAll()
  }

  function qs(s) { return container.querySelector(s) }
  function qsa(s) { return Array.from(container.querySelectorAll(s)) }
}
