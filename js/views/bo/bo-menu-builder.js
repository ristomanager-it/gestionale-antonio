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

  let ricette = []

  container.innerHTML = `
   <section class="view" style="
  display:flex;
  flex-direction:column;
  gap:16px;
  height:100%;
  min-height:0;
">

      <div class="card" style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">Menu Builder</h2>
          <p style="margin:4px 0 0; color:#64748b;">Costruisci menu pubblici con categorie, prodotti, immagini, QR e drag & drop.</p>
        </div>
        <button id="btn-new-menu" class="app-button primary" type="button">+ Nuovo menu</button>
      </div>

     <div style="
  display:grid;
  grid-template-columns:260px minmax(0, 1fr) 280px;
  gap:16px;
  align-items:start;
  flex:1;
  min-height:0;
">

      <aside style="display:flex; flex-direction:column; gap:16px; overflow:auto; min-height:0;">

          <div class="card">
            <h3>Menu</h3>
            <div id="menu-list"></div>
          </div>

          <div class="card">
            <h3>Categorie disponibili</h3>

            <button id="btn-new-category" class="app-button" type="button" style="width:100%; margin-bottom:10px;">
              + Nuova categoria
            </button>

            <div id="categorie-disponibili"></div>
          </div>

        </aside>

     <main style="display:flex; flex-direction:column; gap:16px; overflow:auto; min-height:0;">

          <div class="card">
            <h3>Impostazioni menu</h3>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label>Nome menu</label>
                <input id="menu-nome" class="input" placeholder="Es. Menu Cena">
              </div>

              <div>
                <label>Slug pubblico</label>
                <input id="menu-slug" class="input" placeholder="menu-cena">
              </div>
            </div>

            <label style="display:block; margin-top:10px;">Descrizione</label>
            <textarea id="menu-descrizione" class="input" rows="3" placeholder="Descrizione visibile al cliente"></textarea>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
              <div>
                <label>Logo</label>
                <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
                  <input id="menu-logo-file" class="input" type="file" accept="image/png,image/jpeg,image/jpg">
                  <button id="btn-upload-logo" class="app-button" type="button">Carica</button>
                </div>
                <input id="menu-logo-url" class="input" placeholder="Logo URL" readonly>
              </div>

              <div>
                <label>Cover / sfondo</label>
                <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
                  <input id="menu-cover-file" class="input" type="file" accept="image/png,image/jpeg,image/jpg">
                  <button id="btn-upload-cover" class="app-button" type="button">Carica</button>
                </div>
                <input id="menu-cover-url" class="input" placeholder="Cover URL" readonly>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:120px 1fr auto; gap:10px; align-items:end; margin-top:10px;">
              <div>
                <label>Colore</label>
                <input id="menu-bg-color-picker" type="color" value="#ffffff" style="width:100%; height:42px;">
              </div>

              <div>
                <label>Colore sfondo</label>
                <input id="menu-bg-color" class="input" placeholder="#ffffff">
              </div>

              <label style="display:flex; align-items:center; gap:8px; padding-bottom:10px;">
                <input type="checkbox" id="menu-attivo" checked>
                Attivo
              </label>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
              <button id="btn-save-menu" class="app-button primary" type="button">Salva menu</button>
              <button id="btn-copy-link" class="app-button" type="button">Copia link</button>
            </div>

            <div id="menu-link-box" style="margin-top:12px;"></div>
          </div>

          <div class="card">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
              <div>
                <h3 style="margin:0;">Composizione menu</h3>
                <p style="margin:4px 0 0; color:#64748b; font-size:13px;">Trascina qui le categorie. Poi trascina i prodotti dentro ogni categoria.</p>
              </div>
              <div style="font-size:12px; color:#64748b;">Drag & drop attivo</div>
            </div>

            <div id="menu-drop-zone" style="
              margin-top:12px;
              min-height:220px;
              border:2px dashed #cbd5e1;
              border-radius:16px;
              padding:12px;
              background:#f8fafc;
            "></div>
          </div>

        </main>

       <aside style="display:flex; flex-direction:column; gap:16px; overflow:auto; min-height:0;">

          <div class="card">
            <h3>Prodotti disponibili</h3>

            <button id="btn-new-product" class="app-button" type="button" style="width:100%; margin-bottom:10px;">
              + Nuovo prodotto
            </button>

            <input id="product-search" class="input" placeholder="Cerca prodotto" style="margin-bottom:10px;">
            <div id="prodotti-disponibili"></div>
          </div>

          <div class="card">
            <h3>Preview cliente</h3>
            <div id="menu-preview" style="
              border-radius:18px;
              overflow:hidden;
              border:1px solid #e5e7eb;
              background:white;
            "></div>
          </div>

        </aside>

      </div>

      <div id="modal-root"></div>

    </section>
  `

  bindBaseEvents()
  await loadAll()

  function bindBaseEvents() {
    qs("#btn-new-menu").onclick = startNewMenu
    qs("#btn-save-menu").onclick = saveMenu
    qs("#btn-new-category").onclick = openCategoryModal
    qs("#btn-new-product").onclick = openProductModal
    qs("#btn-upload-logo").onclick = () => uploadMenuImage("logo")
    qs("#btn-upload-cover").onclick = () => uploadMenuImage("cover")
    qs("#btn-copy-link").onclick = copyMenuLink

    qs("#menu-nome").addEventListener("input", () => {
      if (!qs("#menu-slug").value.trim()) {
        qs("#menu-slug").value = makeSlug(qs("#menu-nome").value)
      }
      renderPreview()
      renderLinkBox()
    })

    qs("#menu-slug").addEventListener("input", renderLinkBox)

    qs("#menu-bg-color-picker").addEventListener("input", (event) => {
      qs("#menu-bg-color").value = event.target.value
      renderPreview()
    })

    qs("#menu-bg-color").addEventListener("input", (event) => {
      const value = event.target.value.trim()
      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        qs("#menu-bg-color-picker").value = value
      }
      renderPreview()
    })

    qs("#product-search").addEventListener("input", renderProdottiDisponibili)

    const dropZone = qs("#menu-drop-zone")

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault()
      dropZone.style.borderColor = "#0284c7"
      dropZone.style.background = "#eff6ff"
    })

    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "#cbd5e1"
      dropZone.style.background = "#f8fafc"
    })

    dropZone.addEventListener("drop", async (event) => {
      event.preventDefault()
      dropZone.style.borderColor = "#cbd5e1"
      dropZone.style.background = "#f8fafc"

      const type = event.dataTransfer.getData("type")
      const id = event.dataTransfer.getData("id")

      console.log("DROP MENU ZONE:", {
        type,
        id,
        menuAttivo,
        menuAttivoId: menuAttivo?.id,
        categorieDisponibili: categorieDisponibili.length,
        menuCategorie: menuCategorie.length
      })

      if (type === "categoria") {
        await addCategoriaToMenu(id)
      }
    })
  }

  async function loadAll() {
    await Promise.all([
      loadMenus(),
      loadCategorieDisponibili(),
      loadProdottiDisponibili(),
      loadRicette()
    ])

    if (!menuAttivo && menus.length) {
      await selectMenu(menus[0].id)
    } else {
      renderAll()
    }
  }

  async function loadMenus() {
    const { data, error } = await supabase
      .from("menu")
      .select("*")
      .eq("azienda_id", azienda_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Errore menu:", error)
      menus = []
      return
    }

    menus = data || []
  }

  async function loadCategorieDisponibili() {
    const { data, error } = await supabase
      .from("categorie_vendita")
      .select("*")
      .eq("azienda_id", azienda_id)
      .eq("attiva", true)
      .order("ordine", { ascending: true })

    if (error) {
      console.error("Errore categorie_vendita:", error)
      categorieDisponibili = []
      return
    }

    categorieDisponibili = data || []
  }

  async function loadProdottiDisponibili() {
    const { data, error } = await supabase
      .from("prodotti_vendita")
      .select("*")
      .eq("azienda_id", azienda_id)
      .eq("attivo", true)
      .order("nome", { ascending: true })

    if (error) {
      console.error("Errore prodotti_vendita:", error)
      prodottiDisponibili = []
      return
    }

    prodottiDisponibili = data || []
  }

  async function loadRicette() {
    const { data, error } = await supabase
      .from("ricette")
      .select("id, nome, descrizione, costo_totale, costo_porzione")
      .eq("azienda_id", azienda_id)
      .order("nome", { ascending: true })

    if (error) {
      console.error("Errore ricette:", error)
      ricette = []
      return
    }

    ricette = data || []
  }

  async function selectMenu(id) {
  console.log("SELECT MENU ID:", id)

  const { data: menu, error } = await supabase
    .from("menu")
    .select("*")
    .eq("id", id)
    .eq("azienda_id", azienda_id)
    .maybeSingle()

  if (error) {
    console.error("Errore select menu:", error)
    return
  }

  if (!menu) {
    console.warn("Menu non trovato")
    return
  }

  menuAttivo = menu

  console.log("MENU ATTIVO SETTATO:", menuAttivo)

  await loadMenuComposition()

  console.log("CATEGORIE MENU:", menuCategorie)
  console.log("VOCI MENU:", menuVoci)

  fillMenuForm()
  renderAll()
}
  async function loadMenuComposition() {
    if (!menuAttivo?.id) {
      menuCategorie = []
      menuVoci = []
      return
    }

    const { data: catData, error: catError } = await supabase
      .from("menu_categorie")
      .select("*")
      .eq("azienda_id", azienda_id)
      .eq("menu_id", menuAttivo.id)
      .order("ordine", { ascending: true })

    if (catError) {
      console.error("Errore menu_categorie:", catError)
      menuCategorie = []
    } else {
      menuCategorie = catData || []
    }

    const { data: vociData, error: vociError } = await supabase
      .from("menu_voci")
      .select("*")
      .eq("azienda_id", azienda_id)
      .eq("menu_id", menuAttivo.id)
      .order("ordine", { ascending: true })

    if (vociError) {
      console.error("Errore menu_voci:", vociError)
      menuVoci = []
    } else {
      menuVoci = vociData || []
    }
  }

  function fillMenuForm() {
    qs("#menu-nome").value = menuAttivo?.nome || ""
    qs("#menu-slug").value = menuAttivo?.slug || ""
    qs("#menu-descrizione").value = menuAttivo?.descrizione || ""
    qs("#menu-logo-url").value = menuAttivo?.logo_url || ""
    qs("#menu-cover-url").value = menuAttivo?.cover_url || ""
    qs("#menu-bg-color").value = menuAttivo?.colore_sfondo || "#ffffff"
    qs("#menu-bg-color-picker").value = validHex(menuAttivo?.colore_sfondo) ? menuAttivo.colore_sfondo : "#ffffff"
    qs("#menu-attivo").checked = menuAttivo?.attivo !== false
    renderLinkBox()
  }

function renderAll() {
  try {
    renderMenuList()
  } catch (e) {
    console.error("renderMenuList ERROR", e)
  }

  try {
    renderCategorieDisponibili()
  } catch (e) {
    console.error("renderCategorieDisponibili ERROR", e)
  }

  try {
    renderProdottiDisponibili()
  } catch (e) {
    console.error("renderProdottiDisponibili ERROR", e)
  }

  try {
    renderMenuBuilder()
  } catch (e) {
    console.error("renderMenuBuilder ERROR", e)
  }

  try {
    renderPreview()
  } catch (e) {
    console.error("renderPreview ERROR", e)
  }

  try {
    renderLinkBox()
  } catch (e) {
    console.error("renderLinkBox ERROR", e)
  }
}

  function renderMenuList() {
    const box = qs("#menu-list")

    if (!menus.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessun menu creato.</div>`
      return
    }

    box.innerHTML = menus.map((menu) => `
      <div data-menu-id="${escapeAttribute(menu.id)}" style="
        padding:10px;
        border-radius:12px;
        margin-bottom:8px;
        cursor:pointer;
        background:${menuAttivo?.id === menu.id ? "#e0f2fe" : "#ffffff"};
        border:1px solid ${menuAttivo?.id === menu.id ? "#0284c7" : "#e5e7eb"};
      ">
        <div style="font-weight:700;">${escapeHtml(menu.nome || "Menu")}</div>
        <div style="font-size:12px; color:#64748b;">${menu.attivo === false ? "Disattivo" : "Attivo"}</div>
      </div>
    `).join("")

    box.querySelectorAll("[data-menu-id]").forEach((el) => {
      el.onclick = () => selectMenu(el.dataset.menuId)
    })
  }

  function renderCategorieDisponibili() {
    const box = qs("#categorie-disponibili")

    if (!categorieDisponibili.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessuna categoria anagrafica.</div>`
      return
    }

    box.innerHTML = categorieDisponibili.map((cat) => {
      const alreadyUsed = menuCategorie.some((mc) => mc.categoria_vendita_id === cat.id)

      return `
        <div draggable="true" data-type="categoria" data-id="${escapeAttribute(cat.id)}" style="
          display:flex;
          gap:8px;
          align-items:center;
          padding:8px;
          border-radius:12px;
          margin-bottom:8px;
          background:${alreadyUsed ? "#f1f5f9" : "#ffffff"};
          border:1px solid #e5e7eb;
          cursor:grab;
          opacity:${alreadyUsed ? "0.65" : "1"};
        ">
          <div style="
            width:42px;
            height:42px;
            border-radius:10px;
            background:${cat.immagine_url ? `url('${escapeAttribute(cat.immagine_url)}') center/cover` : "#e2e8f0"};
            flex-shrink:0;
          "></div>
          <div style="min-width:0;">
            <div style="font-weight:700;">${escapeHtml(cat.nome)}</div>
            <div style="font-size:12px; color:#64748b;">${alreadyUsed ? "Già nel menu" : "Trascina nel menu"}</div>
          </div>
        </div>
      `
    }).join("")

    box.querySelectorAll("[draggable='true']").forEach((el) => {
      el.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("type", el.dataset.type)
        event.dataTransfer.setData("id", el.dataset.id)
      })
    })
  }

  function renderProdottiDisponibili() {
    const box = qs("#prodotti-disponibili")
    const search = String(qs("#product-search").value || "").toLowerCase().trim()

    const list = prodottiDisponibili.filter((p) => {
      if (!search) return true
      return String(p.nome || "").toLowerCase().includes(search)
    })

    if (!list.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessun prodotto disponibile.</div>`
      return
    }

    box.innerHTML = list.map((p) => {
      const warning = getProductWarning(p)

      return `
        <div draggable="true" data-type="prodotto" data-id="${escapeAttribute(p.id)}" style="
          display:flex;
          gap:8px;
          align-items:center;
          padding:8px;
          border-radius:12px;
          margin-bottom:8px;
          background:#ffffff;
          border:1px solid ${warning ? "#f59e0b" : "#e5e7eb"};
          cursor:grab;
        ">
          <div style="
            width:46px;
            height:46px;
            border-radius:10px;
            background:${p.foto_url ? `url('${escapeAttribute(p.foto_url)}') center/cover` : "#e2e8f0"};
            flex-shrink:0;
          "></div>

          <div style="min-width:0; flex:1;">
            <div style="font-weight:700;">${escapeHtml(p.nome)}</div>
            <div style="font-size:12px; color:${warning ? "#b45309" : "#64748b"};">
              ${warning || `€ ${formatMoney(p.prezzo_base)} · FC € ${formatMoney(p.food_cost_snapshot)}`}
            </div>
          </div>
        </div>
      `
    }).join("")

    box.querySelectorAll("[draggable='true']").forEach((el) => {
      el.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("type", el.dataset.type)
        event.dataTransfer.setData("id", el.dataset.id)
      })
    })
  }

  function renderMenuBuilder() {
    const box = qs("#menu-drop-zone")

    if (!menuAttivo) {
      box.innerHTML = `
        <div style="text-align:center; color:#64748b; padding:50px 10px;">
          Crea o seleziona un menu per iniziare.
        </div>
      `
      return
    }

    if (!menuCategorie.length) {
      box.innerHTML = `
        <div style="text-align:center; color:#64748b; padding:50px 10px;">
          Trascina qui una categoria dalla colonna sinistra.
        </div>
      `
      return
    }

    box.innerHTML = menuCategorie.map((cat, index) => {
      const prodotti = menuVoci.filter((v) => v.categoria_id === cat.id)

      return `
        <div class="menu-category-drop" data-menu-cat-id="${escapeAttribute(cat.id)}" style="
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:16px;
          padding:12px;
          margin-bottom:12px;
        ">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
            <div style="display:flex; gap:10px; align-items:center;">
              <div style="
                width:52px;
                height:52px;
                border-radius:12px;
                background:${cat.immagine_url ? `url('${escapeAttribute(cat.immagine_url)}') center/cover` : "#e2e8f0"};
              "></div>
              <div>
                <div style="font-size:18px; font-weight:800;">${escapeHtml(cat.nome)}</div>
                <div style="font-size:12px; color:#64748b;">${prodotti.length} prodotti</div>
              </div>
            </div>

            <div style="display:flex; gap:6px;">
  <button class="btn-cat-edit app-button" data-id="${escapeAttribute(cat.id)}">✏️</button>
  <button class="btn-cat-up app-button" data-id="${escapeAttribute(cat.id)}" ${index === 0 ? "disabled" : ""}>↑</button>
  <button class="btn-cat-down app-button" data-id="${escapeAttribute(cat.id)}" ${index === menuCategorie.length - 1 ? "disabled" : ""}>↓</button>
  <button class="btn-cat-remove app-button" data-id="${escapeAttribute(cat.id)}" style="background:#dc2626;color:white;">×</button>
</div>

          <div class="product-drop-zone" data-menu-cat-id="${escapeAttribute(cat.id)}" style="
            min-height:70px;
            border:1px dashed #cbd5e1;
            border-radius:14px;
            padding:10px;
            margin-top:12px;
            background:#f8fafc;
          ">
            ${
              prodotti.length
                ? prodotti.map((p, pIndex) => renderMenuProductRow(p, pIndex, prodotti.length)).join("")
                : `<div style="text-align:center; color:#64748b; padding:18px;">Trascina qui i prodotti dalla colonna destra</div>`
            }
          </div>
        </div>
      `
    }).join("")

    bindMenuBuilderEvents()
  }

  function renderMenuProductRow(p, index, total) {
    const warning = p.alert_food_cost || !p.food_cost_snapshot ? "⚠️ Food cost mancante" : ""

    return `
      <div style="
        display:grid;
        grid-template-columns:1fr 92px 120px auto;
        gap:8px;
        align-items:center;
        padding:8px;
        border-radius:12px;
        background:white;
        border:1px solid ${warning ? "#f59e0b" : "#e5e7eb"};
        margin-bottom:8px;
      ">
        <div>
          <div style="font-weight:700;">${escapeHtml(p.nome || p.nome_snapshot || "Prodotto")}</div>
          <div style="font-size:12px; color:${warning ? "#b45309" : "#64748b"};">
            ${warning || `Food cost € ${formatMoney(p.food_cost_snapshot)}`}
          </div>
        </div>

        <input class="menu-price-input input" data-id="${escapeAttribute(p.id)}" type="number" step="0.01" value="${p.prezzo_override || p.prezzo || p.prezzo_snapshot || 0}">

        <div style="display:flex; gap:4px;">
          <button class="btn-prod-up app-button" data-id="${escapeAttribute(p.id)}" ${index === 0 ? "disabled" : ""}>↑</button>
          <button class="btn-prod-down app-button" data-id="${escapeAttribute(p.id)}" ${index === total - 1 ? "disabled" : ""}>↓</button>
          <button class="btn-prod-remove app-button" data-id="${escapeAttribute(p.id)}" style="background:#dc2626;color:white;">×</button>
        </div>

        <span style="font-size:12px; color:#64748b;">${p.stato || ""}</span>
      </div>
    `
  }

  function bindMenuBuilderEvents() {
    qsa(".product-drop-zone").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault()
        zone.style.borderColor = "#0284c7"
        zone.style.background = "#eff6ff"
      })

      zone.addEventListener("dragleave", () => {
        zone.style.borderColor = "#cbd5e1"
        zone.style.background = "#f8fafc"
      })

      zone.addEventListener("drop", async (event) => {
        event.preventDefault()
        zone.style.borderColor = "#cbd5e1"
        zone.style.background = "#f8fafc"

        const type = event.dataTransfer.getData("type")
        const id = event.dataTransfer.getData("id")
        const menuCategoryId = zone.dataset.menuCatId

        if (type === "prodotto") {
          await addProductToMenuCategory(id, menuCategoryId)
        }
      })
    })

    qsa(".btn-cat-remove").forEach((btn) => {
      btn.onclick = () => removeMenuCategory(btn.dataset.id)
    })

    qsa(".btn-cat-up").forEach((btn) => {
      btn.onclick = () => moveMenuCategory(btn.dataset.id, -1)
    })

    qsa(".btn-cat-down").forEach((btn) => {
      btn.onclick = () => moveMenuCategory(btn.dataset.id, 1)
    })

    qsa(".btn-prod-remove").forEach((btn) => {
      btn.onclick = () => removeMenuProduct(btn.dataset.id)
    })

    qsa(".btn-prod-up").forEach((btn) => {
      btn.onclick = () => moveMenuProduct(btn.dataset.id, -1)
    })

    qsa(".btn-prod-down").forEach((btn) => {
      btn.onclick = () => moveMenuProduct(btn.dataset.id, 1)
    })

    qsa(".menu-price-input").forEach((input) => {
      input.onchange = () => updateMenuProductPrice(input.dataset.id, Number(input.value))
    })
  }

  async function startNewMenu() {
    menuAttivo = null
    menuCategorie = []
    menuVoci = []

    qs("#menu-nome").value = ""
    qs("#menu-slug").value = ""
    qs("#menu-descrizione").value = ""
    qs("#menu-logo-url").value = ""
    qs("#menu-cover-url").value = ""
    qs("#menu-bg-color").value = "#ffffff"
    qs("#menu-bg-color-picker").value = "#ffffff"
    qs("#menu-attivo").checked = true

    renderAll()
  }

  async function saveMenu() {
    const nome = qs("#menu-nome").value.trim()

    if (!nome) {
      alert("Inserisci il nome del menu.")
      return
    }

    const slug = makeSlug(qs("#menu-slug").value.trim() || nome)

    const payload = {
      azienda_id,
      sede_id,
      nome,
      slug,
      descrizione: qs("#menu-descrizione").value.trim() || null,
      logo_url: qs("#menu-logo-url").value.trim() || null,
      cover_url: qs("#menu-cover-url").value.trim() || null,
      colore_sfondo: qs("#menu-bg-color").value.trim() || "#ffffff",
      attivo: qs("#menu-attivo").checked
    }

    if (menuAttivo?.id) {
      const { error } = await supabase
        .from("menu")
        .update(payload)
        .eq("id", menuAttivo.id)
        .eq("azienda_id", azienda_id)

      if (error) {
        console.error(error)
        alert("Errore salvataggio menu.")
        return
      }

      await selectMenu(menuAttivo.id)
    } else {
      const { data, error } = await supabase
        .from("menu")
        .insert(payload)
        .select("*")
        .single()

      if (error) {
        console.error(error)
        alert("Errore creazione menu.")
        return
      }

     menuAttivo = data
console.log("MENU CREATO:", data)

await loadMenus()
await selectMenu(data.id)

console.log("MENU ATTIVO DOPO SELECT:", menuAttivo)
    }
  }

  async function addCategoriaToMenu(categoriaId) {
    console.log("ADD CATEGORIA TO MENU:", {
      categoriaId,
      menuAttivo,
      menuAttivoId: menuAttivo?.id
    })

    if (!menuAttivo?.id) {
      alert("Prima crea o seleziona un menu.")
      return
    }

    const cat = categorieDisponibili.find((c) => c.id === categoriaId)

    if (!cat) return

    const already = menuCategorie.some((mc) => mc.categoria_vendita_id === categoriaId)

    if (already) {
      alert("Categoria già presente in questo menu.")
      return
    }

    const { error } = await supabase
      .from("menu_categorie")
      .insert({
        azienda_id,
        menu_id: menuAttivo.id,
        categoria_vendita_id: cat.id,
        nome: cat.nome,
        descrizione: cat.descrizione || null,
        immagine_url: cat.immagine_url || null,
        ordine: menuCategorie.length,
        attivo: true,
        visibile: true
      })

    if (error) {
      console.error(error)
      alert("Errore aggiunta categoria al menu.")
      return
    }

    await loadMenuComposition()
    renderAll()
  }

  async function addProductToMenuCategory(productId, menuCategoryId) {
    if (!menuAttivo?.id) return

    const product = prodottiDisponibili.find((p) => p.id === productId)
    const menuCat = menuCategorie.find((c) => c.id === menuCategoryId)

    if (!product || !menuCat) return

    const already = menuVoci.some((v) => v.prodotto_vendita_id === productId && v.categoria_id === menuCategoryId)

    if (already) {
      alert("Prodotto già presente in questa categoria.")
      return
    }

    const price = product.prezzo_base || 0
    const foodCost = product.food_cost_snapshot || null
    const alertFoodCost = !foodCost || product.alert_food_cost === true || product.stato !== "completo"

    const { error } = await supabase
      .from("menu_voci")
      .insert({
        azienda_id,
        menu_id: menuAttivo.id,
        categoria_id: menuCategoryId,
        categoria_vendita_id: menuCat.categoria_vendita_id || null,
        prodotto_vendita_id: product.id,
        nome: product.nome,
        nome_snapshot: product.nome,
        descrizione: product.descrizione || null,
        descrizione_snapshot: product.descrizione || null,
        foto_url: product.foto_url || null,
        ricetta_id: product.ricetta_id || null,
        prodotto_id: product.prodotto_id || null,
        prezzo: price,
        prezzo_snapshot: price,
        prezzo_override: price,
        iva: product.iva || null,
        food_cost_snapshot: foodCost,
        alert_food_cost: alertFoodCost,
        stato: product.stato || "bozza",
        ordine: menuVoci.filter((v) => v.categoria_id === menuCategoryId).length,
        attivo: true,
        visibile: true,
        disponibile: true
      })

    if (error) {
      console.error(error)
      alert("Errore aggiunta prodotto al menu.")
      return
    }

    await loadMenuComposition()
    renderAll()
  }

  async function removeMenuCategory(id) {
    if (!confirm("Rimuovere la categoria dal menu?")) return

    const { error } = await supabase
      .from("menu_categorie")
      .delete()
      .eq("id", id)
      .eq("azienda_id", azienda_id)

    if (error) {
      console.error(error)
      alert("Errore rimozione categoria.")
      return
    }

    await loadMenuComposition()
    await normalizeCategoryOrder()
    renderAll()
  }

  async function removeMenuProduct(id) {
    if (!confirm("Rimuovere il prodotto dal menu?")) return

    const { error } = await supabase
      .from("menu_voci")
      .delete()
      .eq("id", id)
      .eq("azienda_id", azienda_id)

    if (error) {
      console.error(error)
      alert("Errore rimozione prodotto.")
      return
    }

    await loadMenuComposition()
    renderAll()
  }

  async function moveMenuCategory(id, direction) {
    const index = menuCategorie.findIndex((c) => c.id === id)
    const target = index + direction

    if (index < 0 || target < 0 || target >= menuCategorie.length) return

    const copy = [...menuCategorie]
    const tmp = copy[index]
    copy[index] = copy[target]
    copy[target] = tmp

    await Promise.all(copy.map((cat, i) =>
      supabase.from("menu_categorie").update({ ordine: i }).eq("id", cat.id).eq("azienda_id", azienda_id)
    ))

    await loadMenuComposition()
    renderAll()
  }

  async function moveMenuProduct(id, direction) {
    const current = menuVoci.find((v) => v.id === id)
    if (!current) return

    const list = menuVoci.filter((v) => v.categoria_id === current.categoria_id).sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
    const index = list.findIndex((v) => v.id === id)
    const target = index + direction

    if (index < 0 || target < 0 || target >= list.length) return

    const copy = [...list]
    const tmp = copy[index]
    copy[index] = copy[target]
    copy[target] = tmp

    await Promise.all(copy.map((voce, i) =>
      supabase.from("menu_voci").update({ ordine: i }).eq("id", voce.id).eq("azienda_id", azienda_id)
    ))

    await loadMenuComposition()
    renderAll()
  }

  async function normalizeCategoryOrder() {
    await Promise.all(menuCategorie.map((cat, i) =>
      supabase.from("menu_categorie").update({ ordine: i }).eq("id", cat.id).eq("azienda_id", azienda_id)
    ))
  }

  async function updateMenuProductPrice(id, price) {
    const { error } = await supabase
      .from("menu_voci")
      .update({
        prezzo_override: price,
        prezzo: price,
        prezzo_snapshot: price
      })
      .eq("id", id)
      .eq("azienda_id", azienda_id)

    if (error) {
      console.error(error)
      alert("Errore aggiornamento prezzo.")
      return
    }

    await loadMenuComposition()
    renderPreview()
  }

  function openCategoryModal() {
    qs("#modal-root").innerHTML = `
      <div class="modal-backdrop" style="
        position:fixed;
        inset:0;
        background:rgba(15,23,42,.45);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;
        padding:16px;
      ">
        <div style="
          background:white;
          width:100%;
          max-width:520px;
          border-radius:18px;
          padding:18px;
          box-shadow:0 20px 40px rgba(0,0,0,.25);
        ">
          <h3>Nuova categoria</h3>

          <label>Nome</label>
          <input id="modal-cat-nome" class="input" placeholder="Es. Antipasti">

          <label>Descrizione</label>
          <textarea id="modal-cat-desc" class="input" rows="3"></textarea>

          <label>Immagine</label>
          <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
            <input id="modal-cat-file" class="input" type="file" accept="image/png,image/jpeg,image/jpg">
            <button id="modal-cat-upload" class="app-button" type="button">Carica</button>
          </div>
          <input id="modal-cat-img" class="input" placeholder="URL immagine" readonly>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
            <button id="modal-cancel" class="app-button" type="button">Annulla</button>
            <button id="modal-save-cat" class="app-button primary" type="button">Salva</button>
          </div>
        </div>
      </div>
    `

    qs("#modal-cancel").onclick = closeModal
    qs("#modal-cat-upload").onclick = uploadCategoryImage
    qs("#modal-save-cat").onclick = saveCategoryFromModal
  }

  async function saveCategoryFromModal() {
    const nome = qs("#modal-cat-nome").value.trim()

    if (!nome) {
      alert("Inserisci il nome della categoria.")
      return
    }

    const { error } = await supabase
      .from("categorie_vendita")
      .insert({
        azienda_id,
        sede_id,
        nome,
        descrizione: qs("#modal-cat-desc").value.trim() || null,
        immagine_url: qs("#modal-cat-img").value.trim() || null,
        attiva: true,
        visibile: true,
        ordine: categorieDisponibili.length
      })

    if (error) {
      console.error(error)
      alert("Errore creazione categoria.")
      return
    }

    closeModal()
    await loadCategorieDisponibili()
    renderCategorieDisponibili()
  }

  function openProductModal() {
    qs("#modal-root").innerHTML = `
      <div class="modal-backdrop" style="
        position:fixed;
        inset:0;
        background:rgba(15,23,42,.45);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;
        padding:16px;
      ">
        <div style="
          background:white;
          width:100%;
          max-width:620px;
          max-height:90vh;
          overflow:auto;
          border-radius:18px;
          padding:18px;
          box-shadow:0 20px 40px rgba(0,0,0,.25);
        ">
          <h3>Nuovo prodotto vendibile</h3>

          <label>Nome prodotto</label>
          <input id="modal-prod-nome" class="input" placeholder="Es. Bruschetta">

          <label>Tipo</label>
          <select id="modal-prod-tipo" class="input">
            <option value="ricetta">Ricetta</option>
            <option value="prodotto_magazzino">Prodotto magazzino</option>
            <option value="servizio">Servizio</option>
            <option value="extra">Extra</option>
          </select>

          <label>Ricetta collegata</label>
          <select id="modal-prod-ricetta" class="input">
            <option value="">Non collegata</option>
            ${ricette.map((r) => `<option value="${escapeAttribute(r.id)}">${escapeHtml(r.nome)}</option>`).join("")}
          </select>

          <label>Descrizione</label>
          <textarea id="modal-prod-desc" class="input" rows="3"></textarea>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
            <div>
              <label>Prezzo base</label>
              <input id="modal-prod-prezzo" class="input" type="number" step="0.01">
            </div>
            <div>
              <label>IVA</label>
              <input id="modal-prod-iva" class="input" type="number" step="0.01">
            </div>
            <div>
              <label>Margine target %</label>
              <input id="modal-prod-margine" class="input" type="number" step="0.01">
            </div>
          </div>

          <label>Foto prodotto</label>
          <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
            <input id="modal-prod-file" class="input" type="file" accept="image/png,image/jpeg,image/jpg">
            <button id="modal-prod-upload" class="app-button" type="button">Carica</button>
          </div>
          <input id="modal-prod-img" class="input" placeholder="URL foto" readonly>

          <div id="modal-prod-alert" style="
            margin-top:10px;
            padding:10px;
            border-radius:12px;
            background:#fef3c7;
            color:#92400e;
            font-size:13px;
          ">
            Il prodotto sarà creato anche se incompleto. Se manca food cost resterà in bozza con alert.
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
            <button id="modal-cancel" class="app-button" type="button">Annulla</button>
            <button id="modal-save-prod" class="app-button primary" type="button">Salva</button>
          </div>
        </div>
      </div>
    `

    qs("#modal-cancel").onclick = closeModal
    qs("#modal-prod-upload").onclick = uploadProductImage
    qs("#modal-prod-ricetta").onchange = applyRicettaToProductModal
    qs("#modal-save-prod").onclick = saveProductFromModal
  }

  function applyRicettaToProductModal() {
    const ricettaId = qs("#modal-prod-ricetta").value
    const ricetta = ricette.find((r) => String(r.id) === String(ricettaId))

    if (!ricetta) return

    if (!qs("#modal-prod-nome").value.trim()) {
      qs("#modal-prod-nome").value = ricetta.nome || ""
    }

    if (!qs("#modal-prod-desc").value.trim()) {
      qs("#modal-prod-desc").value = ricetta.descrizione || ""
    }
  }

  async function saveProductFromModal() {
    const nome = qs("#modal-prod-nome").value.trim()

    if (!nome) {
      alert("Inserisci il nome del prodotto.")
      return
    }

    const ricettaId = qs("#modal-prod-ricetta").value || null
    const ricetta = ricette.find((r) => String(r.id) === String(ricettaId))

    const foodCost = ricetta?.costo_porzione || ricetta?.costo_totale || null
    const stato = foodCost ? "completo" : "bozza"

    const { error } = await supabase
      .from("prodotti_vendita")
      .insert({
        azienda_id,
        sede_id,
        nome,
        descrizione: qs("#modal-prod-desc").value.trim() || null,
        foto_url: qs("#modal-prod-img").value.trim() || null,
        tipo: qs("#modal-prod-tipo").value || "ricetta",
        ricetta_id: ricettaId,
        prezzo_base: parseNullableNumber(qs("#modal-prod-prezzo").value),
        iva: parseNullableNumber(qs("#modal-prod-iva").value),
        margine_target: parseNullableNumber(qs("#modal-prod-margine").value),
        food_cost_snapshot: foodCost,
        stato,
        alert_food_cost: !foodCost,
        attivo: true,
        visibile: true
      })

    if (error) {
      console.error(error)
      alert("Errore creazione prodotto.")
      return
    }

    closeModal()
    await loadProdottiDisponibili()
    renderProdottiDisponibili()
  }

  async function uploadMenuImage(type) {
    const file = type === "logo"
      ? qs("#menu-logo-file").files?.[0]
      : qs("#menu-cover-file").files?.[0]

    if (!file) {
      alert("Seleziona un file JPG o PNG.")
      return
    }

    const url = await uploadImage(file, `menu-${type}`)

    if (!url) return

    if (type === "logo") {
      qs("#menu-logo-url").value = url
    } else {
      qs("#menu-cover-url").value = url
    }

    renderPreview()
  }

  async function uploadCategoryImage() {
    const file = qs("#modal-cat-file").files?.[0]

    if (!file) {
      alert("Seleziona un file JPG o PNG.")
      return
    }

    const url = await uploadImage(file, "menu-categoria")

    if (url) {
      qs("#modal-cat-img").value = url
    }
  }

  async function uploadProductImage() {
    const file = qs("#modal-prod-file").files?.[0]

    if (!file) {
      alert("Seleziona un file JPG o PNG.")
      return
    }

    const url = await uploadImage(file, "menu-prodotto")

    if (url) {
      qs("#modal-prod-img").value = url
    }
  }

  async function uploadImage(file, prefix) {
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      alert("Formato non valido. Usa JPG o PNG.")
      return null
    }

    const ext = file.name.split(".").pop() || "png"
    const path = `${prefix}/${azienda_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false
      })

    if (error) {
      console.error(error)
      alert("Errore upload immagine.")
      return null
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path)

    return data?.publicUrl || null
  }

 function renderPreview() {
  const box = qs("#menu-preview")

  const nome = qs("#menu-nome")?.value || menuAttivo?.nome || "Menu"
  const descrizione = qs("#menu-descrizione")?.value || menuAttivo?.descrizione || ""
  const logo = qs("#menu-logo-url")?.value || menuAttivo?.logo_url || ""
  const cover = qs("#menu-cover-url")?.value || menuAttivo?.cover_url || ""
  const bg = qs("#menu-bg-color")?.value || menuAttivo?.colore_sfondo || "#ffffff"

  box.innerHTML = `
    <div style="
      min-height:500px;
      background:${String(escapeAttribute(bg) || "#ffffff")};
    ">
      <div style="
        height:130px;
        background:${cover ? "url('" + escapeAttribute(cover) + "') center/cover" : "#0f172a"};
        display:flex;
        align-items:flex-end;
        padding:14px;
        color:white;
      ">
        ${logo ? "<img src=\"" + escapeAttribute(logo) + "\" style=\"height:58px; width:58px; object-fit:contain; border-radius:12px; background:white; padding:4px; margin-right:10px;\">" : ""}
        <div>
          <div style="font-size:20px; font-weight:800;">${escapeHtml(nome)}</div>
          ${descrizione ? "<div style=\"font-size:12px; opacity:.9;\">" + escapeHtml(descrizione) + "</div>" : ""}
        </div>
      </div>

      <div style="padding:14px;">
        ${
          menuCategorie.length
            ? menuCategorie.map((cat) => `
              <div style="margin-bottom:18px;">
                <h3 style="margin:0 0 8px;">${escapeHtml(cat.nome)}</h3>
                ${
                  menuVoci
                    .filter((v) => v.categoria_id === cat.id)
                    .map((v) => `
                      <div style="
                        display:grid;
                        grid-template-columns:1fr auto;
                        gap:8px;
                        padding:10px 0;
                        border-bottom:1px solid rgba(15,23,42,.08);
                      ">
                        <div>
                          <div style="font-weight:700;">${escapeHtml(v.nome || v.nome_snapshot)}</div>
                          ${
                            (v.descrizione || v.descrizione_snapshot)
                              ? "<div style=\"font-size:12px; color:#64748b;\">" + escapeHtml(v.descrizione || v.descrizione_snapshot) + "</div>"
                              : ""
                          }
                          ${
                            v.alert_food_cost
                              ? "<div style=\"font-size:11px; color:#b45309;\">⚠️ Da completare</div>"
                              : ""
                          }
                        </div>
                       <div style="font-weight:800;">${String("€ ") + formatMoney(v.prezzo_override || v.prezzo || v.prezzo_snapshot)}</div>
                      </div>
                    `).join("")
                }
              </div>
            `).join("")
            : `<div style="text-align:center; color:#64748b; padding:40px 10px;">Anteprima menu vuota</div>`
        }
      </div>
    </div>
  `
}

  function renderLinkBox() {
    const box = qs("#menu-link-box")
    const slug = makeSlug(qs("#menu-slug")?.value || qs("#menu-nome")?.value || "")

    if (!box || !slug) {
      if (box) box.innerHTML = ""
      return
    }

    const url = `${BASE_PUBLIC_URL}/#/menu/${slug}`

    box.innerHTML = `
      <div style="padding:12px; border-radius:14px; background:#ecfdf5; border:1px solid #bbf7d0;">
        <strong>Link pubblico menu</strong>
        <input class="input" value="${escapeAttribute(url)}" readonly style="margin-top:8px;">
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:10px;">
          <img src="${qrUrl(url, 130)}" style="width:130px;height:130px;border-radius:12px;background:white;">
          <a class="app-button" href="${qrUrl(url, 300)}" download="qr-menu.png" target="_blank">Scarica QR</a>
          <a class="app-button primary" href="${escapeAttribute(url)}" target="_blank">Apri</a>
        </div>
      </div>
    `
  }

  function copyMenuLink() {
    const slug = makeSlug(qs("#menu-slug")?.value || qs("#menu-nome")?.value || "")
    if (!slug) return

    const url = `${BASE_PUBLIC_URL}/#/menu/${slug}`

    navigator.clipboard?.writeText(url)
    alert("Link copiato.")
  }

  function closeModal() {
    qs("#modal-root").innerHTML = ""
  }

  function getProductWarning(product) {
    if (product.alert_food_cost === true || !product.food_cost_snapshot) return "⚠️ Food cost mancante"
    if (product.stato && product.stato !== "completo") return "⚠️ Prodotto incompleto"
    return ""
  }

  function qs(selector) {
    return container.querySelector(selector)
  }

  function qsa(selector) {
    return Array.from(container.querySelectorAll(selector))
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  }

  function escapeAttribute(value) {
    return escapeHtml(value)
  }

  function makeSlug(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[àáâãäå]/g, "a")
      .replace(/[èéêë]/g, "e")
      .replace(/[ìíîï]/g, "i")
      .replace(/[òóôõö]/g, "o")
      .replace(/[ùúûü]/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  function qrUrl(url, size) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`
  }

  function validHex(value) {
    return /^#[0-9a-fA-F]{6}$/.test(String(value || ""))
  }

  function formatMoney(value) {
    const n = Number(value || 0)
    return n.toFixed(2).replace(".", ",")
  }

  function parseNullableNumber(value) {
    if (value === "" || value === null || value === undefined) return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
}
