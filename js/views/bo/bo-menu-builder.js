const supabase = window.supabase

export async function render(container) {
  const azienda_id = window.state?.azienda_id || window.state?.azienda?.id
  const sede_id = window.state?.sedeAttiva?.id || null
  const ruolo = window.state?.ruolo

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<div class="page">Accesso negato</div>`
    return
  }

  let menus = []
  let menuAttivo = null
  let categorie = []
  let voci = []
  let ricette = []
  let tag = []
  let allergeni = []

  container.innerHTML = `
  <div style="display:grid; grid-template-columns:300px 1fr 360px; gap:16px; padding:12px;">

    <div>
      <div class="card">
        <h3>Menu</h3>
        <button id="new-menu" class="app-button primary">+ Nuovo</button>
        <div id="menu-list" style="margin-top:12px;"></div>
      </div>
    </div>

    <div>
      <div class="card">
        <h3>Editor</h3>

        <input id="nome" class="input" placeholder="Nome menu">
        <input id="slug" class="input" placeholder="slug pubblico">
        <textarea id="descrizione" class="input" placeholder="descrizione"></textarea>

        <label><input type="checkbox" id="attivo"> Attivo</label>

        <hr>

        <h4>Branding</h4>
        <input id="logo_url" class="input" placeholder="logo url">
        <input id="cover_url" class="input" placeholder="cover url">
        <input id="bg_color" class="input" placeholder="#ffffff">

        <hr>

        <h4>Categorie</h4>
        <div style="display:flex; gap:6px;">
          <input id="cat_nome" class="input" placeholder="nuova categoria">
          <button id="add-cat">+</button>
        </div>

        <div id="cat-list"></div>

        <hr>

        <h4>Tag</h4>
        <input id="tag_nome" class="input" placeholder="nome">
        <input id="tag_colore" class="input" placeholder="#facc15">
        <input id="tag_icona" class="input" placeholder="⭐">
        <button id="add-tag">Crea tag</button>

        <div id="tag-list"></div>

        <hr>

        <button id="save-menu" class="app-button primary">SALVA MENU</button>

        <div id="link-box"></div>

      </div>
    </div>

    <div>
      <div class="card">
        <h3>Preview</h3>
        <div id="preview" style="border-radius:12px; overflow:hidden;"></div>
      </div>
    </div>

  </div>
  `

  async function loadAll() {
    const [m, r, t, a] = await Promise.all([
      supabase.from("menu").select("*").eq("azienda_id", azienda_id),
      supabase.from("ricette").select("id,nome,costo_porzione"),
      supabase.from("menu_tag").select("*").eq("azienda_id", azienda_id),
      supabase.from("allergeni").select("*")
    ])

    menus = m.data || []
    ricette = r.data || []
    tag = t.data || []
    allergeni = a.data || []

    renderMenuList()
  }

  function renderMenuList() {
    const box = container.querySelector("#menu-list")

    box.innerHTML = menus.map(m => `
      <div data-id="${m.id}" style="padding:8px;border:1px solid #ddd;margin:4px;cursor:pointer;">
        ${m.nome}
      </div>
    `).join("")

    box.querySelectorAll("div").forEach(el => {
      el.onclick = () => selectMenu(el.dataset.id)
    })
  }

  async function selectMenu(id) {
    const { data: m } = await supabase.from("menu").select("*").eq("id", id).single()
    menuAttivo = m

    const { data: c } = await supabase.from("menu_categorie").select("*").eq("menu_id", id)
    categorie = c || []

    const { data: v } = await supabase.from("menu_voci").select("*").eq("menu_id", id)
    voci = v || []

    fillEditor()
    renderCategorie()
    renderPreview()
  }

  function fillEditor() {
    document.getElementById("nome").value = menuAttivo.nome || ""
    document.getElementById("slug").value = menuAttivo.slug || ""
    document.getElementById("descrizione").value = menuAttivo.descrizione || ""
    document.getElementById("attivo").checked = menuAttivo.attivo
  }

  function renderCategorie() {
    const box = document.getElementById("cat-list")

    box.innerHTML = categorie.map(cat => {
      const prodotti = voci.filter(v => v.categoria_id === cat.id)

      return `
      <div style="border:1px solid #ccc; padding:8px; margin:8px 0;">
        <b>${cat.nome}</b>

        <div>
          <select data-cat="${cat.id}" class="ricetta">
            <option value="">ricetta</option>
            ${ricette.map(r => `<option value="${r.id}">${r.nome}</option>`).join("")}
          </select>
          <input type="number" data-cat="${cat.id}" class="prezzo" placeholder="prezzo">
          <button data-cat="${cat.id}" class="add-prodotto">+</button>
        </div>

        ${
          prodotti.map(p => `
            <div style="display:flex;justify-content:space-between;">
              <span>${p.nome}</span>
              <span>€${p.prezzo}</span>
            </div>
          `).join("")
        }
      </div>
      `
    }).join("")

    box.querySelectorAll(".add-prodotto").forEach(btn => {
      btn.onclick = () => addProdotto(btn.dataset.cat)
    })
  }

  async function addProdotto(catId) {
    const select = document.querySelector(`.ricetta[data-cat="${catId}"]`)
    const prezzoInput = document.querySelector(`.prezzo[data-cat="${catId}"]`)

    const ricettaId = select.value
    const prezzo = Number(prezzoInput.value)

    const ricetta = ricette.find(r => r.id == ricettaId)

    await supabase.from("menu_voci").insert({
      azienda_id,
      menu_id: menuAttivo.id,
      categoria_id: catId,
      nome: ricetta.nome,
      prezzo,
      ricetta_id: ricetta.id,
      food_cost_snapshot: ricetta.costo_porzione
    })

    await selectMenu(menuAttivo.id)
  }

  function renderPreview() {
    const box = document.getElementById("preview")

    box.innerHTML = `
    <div style="padding:12px;background:${menuAttivo?.bg_color || "#fff"};">
      <h2>${menuAttivo?.nome || ""}</h2>

      ${
        categorie.map(cat => `
          <div>
            <h4>${cat.nome}</h4>
            ${
              voci.filter(v => v.categoria_id === cat.id).map(v => `
                <div style="display:flex;justify-content:space-between;">
                  <span>${v.nome}</span>
                  <span>€${v.prezzo}</span>
                </div>
              `).join("")
            }
          </div>
        `).join("")
      }
    </div>
    `
  }

  async function addCategoria() {
    const nome = document.getElementById("cat_nome").value

    await supabase.from("menu_categorie").insert({
      azienda_id,
      menu_id: menuAttivo.id,
      nome
    })

    await selectMenu(menuAttivo.id)
  }

  async function saveMenu() {
    const payload = {
      nome: document.getElementById("nome").value,
      slug: document.getElementById("slug").value,
      descrizione: document.getElementById("descrizione").value,
      attivo: document.getElementById("attivo").checked,
      logo_url: document.getElementById("logo_url").value,
      cover_url: document.getElementById("cover_url").value,
      bg_color: document.getElementById("bg_color").value
    }

    if (menuAttivo) {
      await supabase.from("menu").update(payload).eq("id", menuAttivo.id)
    } else {
      const { data } = await supabase.from("menu").insert({
        ...payload,
        azienda_id,
        sede_id
      }).select().single()

      menuAttivo = data
    }

    renderLink()
    await loadAll()
  }

  function renderLink() {
    const slug = document.getElementById("slug").value
    if (!slug) return

    const url = `${location.origin}/#/menu/${slug}`

    document.getElementById("link-box").innerHTML = `
      <input class="input" value="${url}">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}">
    `
  }

  async function addTag() {
    await supabase.from("menu_tag").insert({
      azienda_id,
      nome: document.getElementById("tag_nome").value,
      colore: document.getElementById("tag_colore").value,
      icona: document.getElementById("tag_icona").value
    })

    await loadAll()
  }

  document.getElementById("new-menu").onclick = () => {
    menuAttivo = null
  }

  document.getElementById("add-cat").onclick = addCategoria
  document.getElementById("save-menu").onclick = saveMenu
  document.getElementById("add-tag").onclick = addTag

  await loadAll()
}
