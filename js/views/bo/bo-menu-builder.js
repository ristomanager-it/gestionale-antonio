const supabase = window.supabase

export async function render(container) {
const azienda_id = window.state?.azienda?.id
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

  let tagsDisponibili = []
  let tagsSelezionati = []
  let campiTracciamento = []

  container.innerHTML = `
  <section class="view" style="display:flex; flex-direction:column; gap:16px; padding:16px;">

    <div class="card" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <h2 style="margin:0;">Menu Builder</h2>
        <p style="margin:4px 0 0; color:#64748b;">Crea menu, configura pubblicazione e componi categorie/prodotti.</p>
      </div>
      <button id="btn-new-menu" class="app-button primary" type="button">+ Nuovo menu</button>
    </div>

    <div style="display:grid; grid-template-columns:260px minmax(0,1fr); gap:16px; align-items:start;">
      <aside class="card">
        <h3>Menu</h3>
        <div id="menu-list"></div>
      </aside>

      <main style="display:flex; flex-direction:column; gap:16px; min-width:0;">

        <div class="card">
          <h3>Identità menu</h3>

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

          <div style="display:flex; gap:8px; margin-top:12px; align-items:center;">
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="menu-attivo" checked>
              Menu attivo
            </label>
            <button id="btn-save-menu" class="app-button primary" type="button">Salva menu</button>
          </div>
        </div>

        <div class="card">
          <h3>Design menu</h3>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label>Logo menu</label>
              <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
                <input id="menu-logo-file" class="input" type="file" accept="image/png,image/jpeg,image/jpg">
                <button id="btn-upload-logo" class="app-button" type="button">Carica</button>
              </div>
              <input id="menu-logo-url" class="input" placeholder="Logo URL" readonly style="margin-top:8px;">
            </div>

            <div>
              <label>Immagine di sfondo</label>
              <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
                <input id="menu-cover-file" class="input" type="file" accept="image/png,image/jpeg,image/jpg">
                <button id="btn-upload-cover" class="app-button" type="button">Carica</button>
              </div>
              <input id="menu-cover-url" class="input" placeholder="Sfondo URL" readonly style="margin-top:8px;">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:120px 1fr 1fr 1fr 1fr; gap:10px; align-items:end; margin-top:12px;">
            <div>
              <label>Palette</label>
              <input type="color" id="menu-color-picker" value="#ffffff" style="width:100%; height:42px;">
            </div>

            <div>
              <label>Colore sfondo</label>
              <input id="menu-bg-color" class="input" placeholder="#ffffff">
            </div>

            <div>
              <label>Font</label>
              <select id="menu-font-family" class="input">
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Poppins">Poppins</option>
                <option value="Roboto">Roboto</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>

            <div>
              <label>Peso</label>
              <select id="menu-font-weight" class="input">
                <option value="normal">Normale</option>
                <option value="bold">Grassetto</option>
              </select>
            </div>

            <div>
              <label>Grandezza</label>
              <select id="menu-font-size" class="input">
                <option value="14">Piccolo</option>
                <option value="16" selected>Medio</option>
                <option value="20">Grande</option>
                <option value="24">Extra</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Pubblicazione</h3>
          <div id="menu-link-box"></div>
        </div>

        <div class="card">
          <h3>Tag menu</h3>

          <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
            <input id="tag-input" class="input" list="tag-options" placeholder="Cerca o crea tag">
            <datalist id="tag-options"></datalist>
            <button id="btn-add-tag" class="app-button" type="button">Aggiungi</button>
          </div>

          <div id="tag-list" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;"></div>
        </div>

        <div class="card">
          <h3>Raccolta dati cliente</h3>
          <p style="margin:0 0 10px; color:#64748b; font-size:13px;">
            Aggiungi campi custom e scegli se renderli obbligatori.
          </p>

          <div style="display:grid; grid-template-columns:1fr 160px 130px auto; gap:8px; align-items:end;">
            <div>
              <label>Nome campo</label>
              <input id="tracking-field-label" class="input" placeholder="Es. Allergie, CAP, Data nascita">
            </div>

            <div>
              <label>Tipo campo</label>
              <select id="tracking-field-type" class="input">
                <option value="text">Testo</option>
                <option value="email">Email</option>
                <option value="tel">Telefono</option>
                <option value="number">Numero</option>
                <option value="date">Data</option>
                <option value="textarea">Textarea</option>
              </select>
            </div>

            <label style="display:flex; gap:8px; align-items:center; padding-bottom:10px;">
              <input id="tracking-field-required" type="checkbox">
              Obbligatorio
            </label>

            <button id="btn-add-tracking-field" class="app-button" type="button">Aggiungi</button>
          </div>

          <div id="tracking-fields-list" style="display:flex; flex-direction:column; gap:8px; margin-top:12px;"></div>
        </div>

        <div class="card">
          <h3>Composizione menu</h3>

          <div style="display:grid; grid-template-columns:240px minmax(0,1fr) 300px; gap:16px; align-items:start;">

            <div>
              <h4>Categorie disponibili</h4>
              <div id="categorie-disponibili"></div>
            </div>

            <div>
              <h4>Composizione</h4>
              <div id="menu-drop-zone" style="
                min-height:320px;
                border:2px dashed #cbd5e1;
                border-radius:14px;
                padding:12px;
                background:#f8fafc;
              "></div>
            </div>

            <div>
              <h4>Articoli categoria</h4>
              <input id="product-search" class="input" placeholder="Cerca prodotto" style="margin-bottom:10px;">
              <div id="prodotti-disponibili"></div>
            </div>

          </div>
        </div>

        <div class="card">
          <h3>Preview live menu</h3>
          <div id="menu-preview"></div>
        </div>

      </main>
    </div>

  </section>
  `

  bindEvents()
  await loadAll()

  function bindEvents() {
    qs("#btn-new-menu").onclick = startNewMenu
    qs("#btn-save-menu").onclick = saveMenu
    qs("#btn-upload-logo").onclick = () => uploadMenuImage("logo")
    qs("#btn-upload-cover").onclick = () => uploadMenuImage("cover")
    qs("#product-search").addEventListener("input", renderProdottiDisponibili)

    qsa("#menu-nome, #menu-slug, #menu-descrizione, #menu-bg-color, #menu-font-family, #menu-font-weight, #menu-font-size, #menu-attivo").forEach((el) => {
      el.addEventListener("input", () => {
        syncSlug()
        renderPreview()
        renderLinkBox()
      })
      el.addEventListener("change", () => {
        renderPreview()
        renderLinkBox()
      })
    })

    qs("#menu-color-picker").addEventListener("input", (event) => {
      qs("#menu-bg-color").value = event.target.value
      renderPreview()
    })

    qs("#btn-add-tag").onclick = addTagFromInput
    qs("#tag-input").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        addTagFromInput()
      }
    })

    qs("#btn-add-tracking-field").onclick = addTrackingField

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
      loadTagsDisponibili()
    ])

    if (menus.length) await selectMenu(menus[0].id)
    else renderAll()
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
      .order("ordine", { ascending: true })

    if (error) {
      console.error("Errore categorie:", error)
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
      .order("nome", { ascending: true })

    if (error) {
      console.error("Errore prodotti:", error)
      prodottiDisponibili = []
      return
    }

    prodottiDisponibili = data || []
  }

  async function loadTagsDisponibili() {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("azienda_id", azienda_id)
      .order("nome", { ascending: true })

    if (error) {
      tagsDisponibili = []
      renderTagOptions()
      return
    }

    tagsDisponibili = data || []
    renderTagOptions()
  }

  async function selectMenu(id) {
    const { data, error } = await supabase
      .from("menu")
      .select("*")
      .eq("id", id)
      .eq("azienda_id", azienda_id)
      .maybeSingle()

    if (error) {
      console.error("Errore select menu:", error)
      return
    }

    if (!data) return

    menuAttivo = data

    fillMenuForm()
    await loadMenuComposition()
    renderAll()
  }

  async function loadMenuComposition() {
    if (!menuAttivo?.id) {
      menuCategorie = []
      menuVoci = []
      return
    }

    const { data: cat } = await supabase
      .from("menu_categorie")
      .select("*")
      .eq("azienda_id", azienda_id)
      .eq("menu_id", menuAttivo.id)
      .order("ordine", { ascending: true })

    const { data: voci } = await supabase
      .from("menu_voci")
      .select("*")
      .eq("azienda_id", azienda_id)
      .eq("menu_id", menuAttivo.id)
      .order("ordine", { ascending: true })

    menuCategorie = cat || []
    menuVoci = voci || []
  }

  function fillMenuForm() {
    qs("#menu-nome").value = menuAttivo?.nome || ""
    qs("#menu-slug").value = menuAttivo?.slug || ""
    qs("#menu-descrizione").value = menuAttivo?.descrizione || ""
    qs("#menu-logo-url").value = menuAttivo?.logo_url || ""
    qs("#menu-cover-url").value = menuAttivo?.cover_url || ""
    qs("#menu-bg-color").value = menuAttivo?.colore_sfondo || "#ffffff"
    qs("#menu-color-picker").value = validHex(menuAttivo?.colore_sfondo) ? menuAttivo.colore_sfondo : "#ffffff"
    qs("#menu-attivo").checked = menuAttivo?.attivo !== false

    renderPreview()
    renderLinkBox()
  }

  function renderAll() {
    renderMenuList()
    renderCategorieDisponibili()
    renderBuilder()
    renderProdottiDisponibili()
    renderTagOptions()
    renderTags()
    renderTrackingFields()
    renderPreview()
    renderLinkBox()
  }

  function renderMenuList() {
    const box = qs("#menu-list")

    if (!menus.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessun menu creato.</div>`
      return
    }

    box.innerHTML = menus.map((m) => `
      <button type="button" data-menu-id="${escapeAttribute(m.id)}" class="app-button" style="
        width:100%;
        text-align:left;
        margin-bottom:8px;
        background:${menuAttivo?.id === m.id ? "#e0f2fe" : "#ffffff"};
        border:1px solid ${menuAttivo?.id === m.id ? "#0284c7" : "#e5e7eb"};
      ">
        ${escapeHtml(m.nome || "Menu")}
      </button>
    `).join("")

    box.querySelectorAll("[data-menu-id]").forEach((el) => {
      el.onclick = () => selectMenu(el.dataset.menuId)
    })
  }

  function renderCategorieDisponibili() {
    const box = qs("#categorie-disponibili")

    if (!categorieDisponibili.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessuna categoria disponibile.</div>`
      return
    }

    box.innerHTML = categorieDisponibili.map((c) => `
      <button type="button" draggable="true" data-type="categoria" data-id="${escapeAttribute(c.id)}" class="app-button" style="
        width:100%;
        margin-bottom:8px;
        text-align:left;
        cursor:grab;
      ">
        ↕ ${escapeHtml(c.nome)}
      </button>
    `).join("")

    box.querySelectorAll("[draggable='true']").forEach((el) => {
      el.ondragstart = (event) => {
        event.dataTransfer.setData("type", el.dataset.type)
        event.dataTransfer.setData("id", el.dataset.id)
      }
    })
  }

  function renderBuilder() {
    const box = qs("#menu-drop-zone")

    if (!menuAttivo?.id) {
      box.innerHTML = `<div style="text-align:center; color:#64748b; padding:40px;">Crea o seleziona un menu.</div>`
      return
    }

    if (!menuCategorie.length) {
      box.innerHTML = `<div style="text-align:center; color:#64748b; padding:40px;">Trascina qui le categorie.</div>`
      return
    }

    box.innerHTML = menuCategorie.map((cat) => {
      const categoriaAnagrafica = categorieDisponibili.find((c) => String(c.id) === String(cat.categoria_vendita_id))
      const nomeCategoria = cat.nome || categoriaAnagrafica?.nome || "Categoria"
      const categoriaVenditaId = cat.categoria_vendita_id || cat.id
      const active = String(categoriaSelezionata) === String(categoriaVenditaId)
      const prodottiCategoria = menuVoci.filter((v) => String(v.categoria_id) === String(cat.id))

      return `
        <div data-menu-cat-id="${escapeAttribute(cat.id)}" data-categoria-vendita-id="${escapeAttribute(categoriaVenditaId)}" style="
          padding:12px;
          border-radius:14px;
          border:1px solid ${active ? "#0284c7" : "#e5e7eb"};
          background:${active ? "#e0f2fe" : "#ffffff"};
          margin-bottom:10px;
          cursor:pointer;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <strong>${escapeHtml(nomeCategoria)}</strong>
            <span style="font-size:12px; color:#64748b;">${prodottiCategoria.length} articoli</span>
          </div>

          <div class="product-drop-zone" data-menu-cat-id="${escapeAttribute(cat.id)}" style="
            min-height:54px;
            border:1px dashed #cbd5e1;
            border-radius:12px;
            padding:8px;
            margin-top:10px;
            background:#f8fafc;
          ">
            ${
              prodottiCategoria.length
                ? prodottiCategoria.map((p) => `
                  <div style="display:flex; justify-content:space-between; gap:8px; padding:6px 0; border-bottom:1px solid #e5e7eb;">
                    <span>${escapeHtml(p.nome || p.nome_snapshot || "Prodotto")}</span>
                    <span>€ ${formatMoney(p.prezzo_override || p.prezzo || p.prezzo_snapshot)}</span>
                  </div>
                `).join("")
                : `<div style="font-size:12px; color:#64748b;">Clicca la categoria e trascina qui gli articoli.</div>`
            }
          </div>
        </div>
      `
    }).join("")

    box.querySelectorAll("[data-categoria-vendita-id]").forEach((el) => {
      el.onclick = () => {
        categoriaSelezionata = el.dataset.categoriaVenditaId
        renderBuilder()
        renderProdottiDisponibili()
      }
    })

    box.querySelectorAll(".product-drop-zone").forEach((zone) => {
      zone.ondragover = (event) => event.preventDefault()
      zone.ondrop = async (event) => {
        event.preventDefault()
        event.stopPropagation()

        const type = event.dataTransfer.getData("type")
        const id = event.dataTransfer.getData("id")

        if (type === "prodotto") {
          await addProductToMenuCategory(id, zone.dataset.menuCatId)
        }
      }
    })
  }

  function renderProdottiDisponibili() {
    const box = qs("#prodotti-disponibili")
    const search = String(qs("#product-search")?.value || "").toLowerCase().trim()

    let list = prodottiDisponibili

    if (categoriaSelezionata) {
      list = list.filter((p) =>
        String(p.categoria_vendita_id || p.categoria_id || "") === String(categoriaSelezionata)
      )
    }

    if (search) {
      list = list.filter((p) => String(p.nome || "").toLowerCase().includes(search))
    }

    if (!categoriaSelezionata) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Clicca una categoria nella composizione per vedere gli articoli.</div>`
      return
    }

    if (!list.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessun articolo per questa categoria.</div>`
      return
    }

    box.innerHTML = list.map((p) => `
      <button type="button" draggable="true" data-type="prodotto" data-id="${escapeAttribute(p.id)}" class="app-button" style="
        width:100%;
        margin-bottom:8px;
        text-align:left;
        cursor:grab;
      ">
        ↕ ${escapeHtml(p.nome)}
      </button>
    `).join("")

    box.querySelectorAll("[draggable='true']").forEach((el) => {
      el.ondragstart = (event) => {
        event.dataTransfer.setData("type", el.dataset.type)
        event.dataTransfer.setData("id", el.dataset.id)
      }
    })
  }

  async function addCategoriaToMenu(id) {
    if (!menuAttivo?.id) {
      alert("Prima crea o seleziona un menu.")
      return
    }

    const categoria = categorieDisponibili.find((c) => String(c.id) === String(id))
    if (!categoria) return

    const already = menuCategorie.some((c) => String(c.categoria_vendita_id) === String(id))
    if (already) {
      alert("Categoria già presente nel menu.")
      return
    }

    const { error } = await supabase.from("menu_categorie").insert({
      azienda_id,
      menu_id: menuAttivo.id,
      categoria_vendita_id: id,
      nome: categoria.nome,
      ordine: menuCategorie.length,
      attivo: true,
      visibile: true
    })

    if (error) {
      console.error(error)
      alert("Errore aggiunta categoria.")
      return
    }

    categoriaSelezionata = id
    await loadMenuComposition()
    renderAll()
  }

  async function addProductToMenuCategory(productId, menuCategoryId) {
    if (!menuAttivo?.id) return

    const prodotto = prodottiDisponibili.find((p) => String(p.id) === String(productId))
    const menuCat = menuCategorie.find((c) => String(c.id) === String(menuCategoryId))

    if (!prodotto || !menuCat) return

    const already = menuVoci.some((v) =>
      String(v.prodotto_vendita_id) === String(productId) &&
      String(v.categoria_id) === String(menuCategoryId)
    )

    if (already) {
      alert("Articolo già presente in questa categoria.")
      return
    }

    const prezzo = prodotto.prezzo_base || prodotto.prezzo || 0

    const { error } = await supabase.from("menu_voci").insert({
      azienda_id,
      menu_id: menuAttivo.id,
      categoria_id: menuCategoryId,
      categoria_vendita_id: menuCat.categoria_vendita_id || null,
      prodotto_vendita_id: prodotto.id,
      nome: prodotto.nome,
      nome_snapshot: prodotto.nome,
      descrizione: prodotto.descrizione || null,
      descrizione_snapshot: prodotto.descrizione || null,
      foto_url: prodotto.foto_url || null,
      prezzo,
      prezzo_snapshot: prezzo,
      prezzo_override: prezzo,
      ordine: menuVoci.filter((v) => String(v.categoria_id) === String(menuCategoryId)).length,
      attivo: true,
      visibile: true,
      disponibile: true
    })

    if (error) {
      console.error(error)
      alert("Errore aggiunta articolo.")
      return
    }

    await loadMenuComposition()
    renderAll()
  }

  async function saveMenu() {
    const nome = qs("#menu-nome").value.trim()

    if (!nome) {
      alert("Inserisci il nome del menu.")
      return
    }

    const slug = makeSlug(qs("#menu-slug").value || nome)

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
      await loadMenus()
      await selectMenu(data.id)
    }
  }

  function startNewMenu() {
    menuAttivo = null
    menuCategorie = []
    menuVoci = []
    categoriaSelezionata = null
    tagsSelezionati = []
    campiTracciamento = []

    qs("#menu-nome").value = ""
    qs("#menu-slug").value = ""
    qs("#menu-descrizione").value = ""
    qs("#menu-logo-url").value = ""
    qs("#menu-cover-url").value = ""
    qs("#menu-bg-color").value = "#ffffff"
    qs("#menu-color-picker").value = "#ffffff"
    qs("#menu-font-family").value = "Arial"
    qs("#menu-font-weight").value = "normal"
    qs("#menu-font-size").value = "16"
    qs("#menu-attivo").checked = true
    qs("#tag-input").value = ""
    qs("#tracking-field-label").value = ""
    qs("#tracking-field-type").value = "text"
    qs("#tracking-field-required").checked = false

    renderAll()
  }

  function addTagFromInput() {
    const input = qs("#tag-input")
    const value = input.value.trim()

    if (!value) return

    const existing = tagsDisponibili.find((t) =>
      String(t.nome || t.name || "").toLowerCase() === value.toLowerCase()
    )

    const tagName = existing?.nome || existing?.name || value

    if (!tagsSelezionati.includes(tagName)) {
      tagsSelezionati.push(tagName)
    }

    input.value = ""
    renderTags()
  }

  function renderTagOptions() {
    const datalist = qs("#tag-options")
    if (!datalist) return

    datalist.innerHTML = tagsDisponibili.map((tag) => `
      <option value="${escapeAttribute(tag.nome || tag.name || "")}"></option>
    `).join("")
  }

  function renderTags() {
    const box = qs("#tag-list")

    if (!tagsSelezionati.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessun tag selezionato.</div>`
      return
    }

    box.innerHTML = tagsSelezionati.map((tag) => `
      <span style="display:inline-flex; align-items:center; gap:6px; background:#e0f2fe; color:#075985; padding:6px 10px; border-radius:999px;">
        ${escapeHtml(tag)}
        <button type="button" data-remove-tag="${escapeAttribute(tag)}" style="border:0;background:transparent;cursor:pointer;">×</button>
      </span>
    `).join("")

    box.querySelectorAll("[data-remove-tag]").forEach((btn) => {
      btn.onclick = () => {
        tagsSelezionati = tagsSelezionati.filter((tag) => tag !== btn.dataset.removeTag)
        renderTags()
      }
    })
  }

  function addTrackingField() {
    const label = qs("#tracking-field-label").value.trim()
    const type = qs("#tracking-field-type").value
    const required = qs("#tracking-field-required").checked

    if (!label) {
      alert("Inserisci il nome del campo.")
      return
    }

    campiTracciamento.push({
      id: crypto.randomUUID(),
      label,
      type,
      required
    })

    qs("#tracking-field-label").value = ""
    qs("#tracking-field-type").value = "text"
    qs("#tracking-field-required").checked = false

    renderTrackingFields()
    renderPreview()
  }

  function renderTrackingFields() {
    const box = qs("#tracking-fields-list")

    if (!campiTracciamento.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessun campo raccolta dati configurato.</div>`
      return
    }

    box.innerHTML = campiTracciamento.map((campo) => `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:8px; border:1px solid #e5e7eb; border-radius:10px;">
        <div>
          <strong>${escapeHtml(campo.label)}</strong>
          <span style="font-size:12px; color:#64748b;">${escapeHtml(campo.type)} ${campo.required ? "· obbligatorio" : "· facoltativo"}</span>
        </div>
        <button type="button" class="app-button" data-remove-field="${escapeAttribute(campo.id)}">Rimuovi</button>
      </div>
    `).join("")

    box.querySelectorAll("[data-remove-field]").forEach((btn) => {
      btn.onclick = () => {
        campiTracciamento = campiTracciamento.filter((campo) => campo.id !== btn.dataset.removeField)
        renderTrackingFields()
        renderPreview()
      }
    })
  }

  function renderPreview() {
    const nome = qs("#menu-nome")?.value || menuAttivo?.nome || "Menu"
    const descrizione = qs("#menu-descrizione")?.value || menuAttivo?.descrizione || ""
    const logo = qs("#menu-logo-url")?.value || menuAttivo?.logo_url || ""
    const cover = qs("#menu-cover-url")?.value || menuAttivo?.cover_url || ""
    const bg = qs("#menu-bg-color")?.value || menuAttivo?.colore_sfondo || "#ffffff"
    const fontFamily = qs("#menu-font-family")?.value || "Arial"
    const fontWeight = qs("#menu-font-weight")?.value || "normal"
    const fontSize = qs("#menu-font-size")?.value || "16"

    qs("#menu-preview").innerHTML = `
      <div style="
        border:1px solid #e5e7eb;
        border-radius:18px;
        overflow:hidden;
        background:${escapeAttribute(bg)};
        font-family:${escapeAttribute(fontFamily)}, sans-serif;
      ">
        <div style="
          min-height:130px;
          background:${cover ? "url('" + escapeAttribute(cover) + "') center/cover" : "#0f172a"};
          color:white;
          padding:16px;
          display:flex;
          align-items:flex-end;
          gap:12px;
        ">
          ${logo ? `<img src="${escapeAttribute(logo)}" style="width:64px;height:64px;object-fit:contain;border-radius:14px;background:white;padding:6px;">` : ""}
          <div>
            <h2 style="margin:0; font-weight:${escapeAttribute(fontWeight)}; font-size:${escapeAttribute(fontSize)}px;">${escapeHtml(nome)}</h2>
            ${descrizione ? `<p style="margin:6px 0 0;">${escapeHtml(descrizione)}</p>` : ""}
          </div>
        </div>

        <div style="padding:16px;">
          ${
            menuCategorie.length
              ? menuCategorie.map((cat) => {
                const categoriaAnagrafica = categorieDisponibili.find((c) => String(c.id) === String(cat.categoria_vendita_id))
                const nomeCategoria = cat.nome || categoriaAnagrafica?.nome || "Categoria"
                const prodotti = menuVoci.filter((v) => String(v.categoria_id) === String(cat.id))

                return `
                  <div style="margin-bottom:18px;">
                    <h3 style="margin:0 0 8px;">${escapeHtml(nomeCategoria)}</h3>
                    ${
                      prodotti.length
                        ? prodotti.map((p) => `
                          <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid rgba(15,23,42,.08);">
                            <span>${escapeHtml(p.nome || p.nome_snapshot || "Prodotto")}</span>
                            <strong>€ ${formatMoney(p.prezzo_override || p.prezzo || p.prezzo_snapshot)}</strong>
                          </div>
                        `).join("")
                        : `<div style="font-size:13px; color:#64748b;">Nessun articolo.</div>`
                    }
                  </div>
                `
              }).join("")
              : `<div style="text-align:center; color:#64748b; padding:30px;">Preview composizione vuota.</div>`
          }

          ${
            campiTracciamento.length
              ? `
                <div style="margin-top:20px; padding:12px; border:1px solid #e5e7eb; border-radius:14px; background:white;">
                  <strong>Modulo richiesta dati</strong>
                  ${campiTracciamento.map((campo) => `
                    <label style="display:block; margin-top:10px; font-size:13px;">
                      ${escapeHtml(campo.label)} ${campo.required ? "*" : ""}
                      <input class="input" type="${campo.type === "textarea" ? "text" : escapeAttribute(campo.type)}" placeholder="${escapeAttribute(campo.label)}" disabled>
                    </label>
                  `).join("")}
                </div>
              `
              : ""
          }
        </div>
      </div>
    `
  }

  function renderLinkBox() {
    const box = qs("#menu-link-box")
    const slug = makeSlug(qs("#menu-slug")?.value || qs("#menu-nome")?.value || menuAttivo?.slug || "")

    if (!box || !slug) {
      if (box) box.innerHTML = `<div style="font-size:13px; color:#64748b;">Inserisci nome menu o slug per generare link e QR.</div>`
      return
    }

    const url = `${BASE_PUBLIC_URL}/#/menu/${slug}`
    const shortLink = `${BASE_PUBLIC_URL}/m/${slug}`

    box.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 150px; gap:14px; align-items:start;">
        <div>
          <label>Link pubblico</label>
          <input class="input" value="${escapeAttribute(url)}" readonly>

          <label style="display:block; margin-top:10px;">Short link social</label>
          <input id="menu-short-link" class="input" value="${escapeAttribute(shortLink)}" readonly>
        </div>

        <div style="text-align:center;">
          <img src="${qrUrl(url, 140)}" style="width:140px; height:140px; border-radius:12px; border:1px solid #e5e7eb;">
        </div>
      </div>
    `
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

  function syncSlug() {
    const nome = qs("#menu-nome")
    const slug = qs("#menu-slug")

    if (!slug.value.trim()) {
      slug.value = makeSlug(nome.value)
    }
  }

  function makeSlug(str) {
    return String(str || "")
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

  function qs(s) {
    return container.querySelector(s)
  }

  function qsa(s) {
    return Array.from(container.querySelectorAll(s))
  }
}
