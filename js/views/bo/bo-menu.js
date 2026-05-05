const supabase = window.supabase

export async function render(container) {
  const ruolo = window.state?.ruolo
 const azienda_id = window.state?.azienda?.id
  const sede_id = window.state?.sedeAttiva?.id || null

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
  let categorie = []
  let voci = []
  let ricette = []
  let tag = []
  let allergeni = []

  container.innerHTML = `
    <section class="view" style="display:flex; flex-direction:column; gap:16px;">
      <div class="card">
        <h2>Costruzione Menu</h2>
        <p>Crea menu pubblici con categorie, prodotti da ricette, tag visivi e allergeni.</p>
      </div>

      <div style="display:grid; grid-template-columns:320px 1fr; gap:16px; align-items:start;">
        <div class="card">
          <h3>Menu</h3>

          <label>Nome menu</label>
          <input id="bo-menu-nome" type="text" placeholder="Es. Menu Cena" style="width:100%; margin-bottom:8px;">

          <label>Descrizione</label>
          <textarea id="bo-menu-descrizione" placeholder="Descrizione pubblica menu" style="width:100%; min-height:80px; margin-bottom:8px;"></textarea>

          <label>Slug pubblico</label>
          <input id="bo-menu-slug" type="text" placeholder="menu-cena" style="width:100%; margin-bottom:8px;">

          <label>Logo URL</label>
          <input id="bo-menu-logo" type="text" placeholder="https://..." style="width:100%; margin-bottom:8px;">

          <label>Cover URL</label>
          <input id="bo-menu-cover" type="text" placeholder="https://..." style="width:100%; margin-bottom:8px;">

          <label>Colore sfondo</label>
          <input id="bo-menu-bg" type="text" placeholder="#ffffff" style="width:100%; margin-bottom:12px;">

          <button id="bo-menu-save" style="width:100%;">Salva menu</button>

          <hr style="margin:16px 0;">

          <div id="bo-menu-list"></div>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="card">
            <h3 id="bo-menu-title">Seleziona un menu</h3>
            <p id="bo-menu-subtitle">Crea o seleziona un menu per iniziare.</p>
          </div>

          <div id="bo-menu-workspace"></div>
        </div>
      </div>
    </section>
  `

  async function loadAll() {
    await Promise.all([
      loadMenus(),
      loadRicette(),
      loadTag(),
      loadAllergeni()
    ])

    if (menus.length > 0 && !menuAttivo) {
      menuAttivo = menus[0]
      await loadMenuData(menuAttivo.id)
    }

    renderMenuList()
    renderWorkspace()
  }

  async function loadMenus() {
    const { data, error } = await supabase
      .from("menu")
      .select("*")
      .eq("azienda_id", azienda_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Errore load menu:", error)
      menus = []
      return
    }

    menus = data || []
  }

  async function loadMenuData(menuId) {
    const { data: catData, error: catError } = await supabase
      .from("menu_categorie")
      .select("*")
      .eq("azienda_id", azienda_id)
      .eq("menu_id", menuId)
      .order("ordine", { ascending: true })

    if (catError) {
      console.error("Errore categorie:", catError)
      categorie = []
    } else {
      categorie = catData || []
    }

    const { data: vociData, error: vociError } = await supabase
      .from("menu_voci")
      .select("*")
      .eq("azienda_id", azienda_id)
      .eq("menu_id", menuId)
      .order("ordine", { ascending: true })

    if (vociError) {
      console.error("Errore voci:", vociError)
      voci = []
    } else {
      voci = vociData || []
    }
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

  async function loadTag() {
    const { data, error } = await supabase
      .from("menu_tag")
      .select("*")
      .eq("azienda_id", azienda_id)
      .order("ordine", { ascending: true })

    if (error) {
      console.error("Errore tag:", error)
      tag = []
      return
    }

    tag = data || []
  }

  async function loadAllergeni() {
    const { data, error } = await supabase
      .from("allergeni")
      .select("*")
      .order("nome", { ascending: true })

    if (error) {
      console.error("Errore allergeni:", error)
      allergeni = []
      return
    }

    allergeni = data || []
  }

  function renderMenuList() {
    const box = container.querySelector("#bo-menu-list")

    if (!box) return

    if (menus.length === 0) {
      box.innerHTML = `<p>Nessun menu creato.</p>`
      return
    }

    box.innerHTML = menus.map(m => `
      <div class="bo-menu-select" data-id="${m.id}" style="
        padding:10px;
        border-radius:10px;
        margin-bottom:8px;
        cursor:pointer;
        background:${menuAttivo?.id === m.id ? "#e0f2fe" : "#f8fafc"};
        border:1px solid ${menuAttivo?.id === m.id ? "#0284c7" : "#e5e7eb"};
      ">
        <strong>${escapeHtml(m.nome || "Menu")}</strong>
        <div style="font-size:12px; opacity:.7;">${m.attivo ? "Attivo" : "Non attivo"}</div>
      </div>
    `).join("")

    box.querySelectorAll(".bo-menu-select").forEach(el => {
      el.onclick = async () => {
        const id = el.getAttribute("data-id")
        menuAttivo = menus.find(m => m.id === id)
        await loadMenuData(id)
        renderMenuList()
        renderWorkspace()
      }
    })
  }

  function renderWorkspace() {
    const title = container.querySelector("#bo-menu-title")
    const subtitle = container.querySelector("#bo-menu-subtitle")
    const workspace = container.querySelector("#bo-menu-workspace")

    if (!workspace) return

    if (!menuAttivo) {
      workspace.innerHTML = ""
      return
    }

    if (title) title.innerText = menuAttivo.nome || "Menu"
    if (subtitle) subtitle.innerText = menuAttivo.descrizione || "Gestione categorie e prodotti menu."

    workspace.innerHTML = `
      <div class="card">
        <h3>Categorie</h3>

        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <input id="bo-cat-nome" type="text" placeholder="Nuova categoria" style="flex:1;">
          <button id="bo-cat-add">Aggiungi</button>
        </div>

        <div id="bo-categorie-list"></div>
      </div>

      <div class="card">
        <h3>Tag visivi</h3>

        <div style="display:grid; grid-template-columns:1fr 100px 100px 100px; gap:8px; margin-bottom:12px;">
          <input id="bo-tag-nome" type="text" placeholder="Best seller">
          <input id="bo-tag-colore" type="text" placeholder="#fde68a">
          <input id="bo-tag-testo" type="text" placeholder="#111827">
          <input id="bo-tag-icona" type="text" placeholder="⭐">
        </div>

        <button id="bo-tag-add">Crea tag</button>
        <div id="bo-tag-list" style="margin-top:12px;"></div>
      </div>
    `

    renderCategorie()
    renderTagList()

    workspace.querySelector("#bo-cat-add").onclick = addCategoria
    workspace.querySelector("#bo-tag-add").onclick = addTag
  }

  function renderCategorie() {
    const box = container.querySelector("#bo-categorie-list")
    if (!box) return

    if (categorie.length === 0) {
      box.innerHTML = `<p>Nessuna categoria.</p>`
      return
    }

    box.innerHTML = categorie.map(cat => {
      const prodottiCategoria = voci.filter(v => v.categoria_id === cat.id)

      return `
        <div style="border:1px solid #e5e7eb; border-radius:14px; padding:12px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <h4 style="margin:0;">${escapeHtml(cat.nome)}</h4>
            <button class="bo-cat-delete" data-id="${cat.id}">Elimina</button>
          </div>

          <div style="margin-top:12px; display:grid; grid-template-columns:1fr 120px 120px; gap:8px;">
            <select class="bo-voce-ricetta" data-cat="${cat.id}">
              <option value="">Seleziona ricetta</option>
              ${ricette.map(r => `<option value="${r.id}">${escapeHtml(r.nome || "")}</option>`).join("")}
            </select>
            <input class="bo-voce-prezzo" data-cat="${cat.id}" type="number" step="0.01" placeholder="Prezzo">
            <button class="bo-voce-add" data-cat="${cat.id}">Aggiungi prodotto</button>
          </div>

          <div style="margin-top:12px;">
            ${
              prodottiCategoria.length === 0
                ? `<p>Nessun prodotto in questa categoria.</p>`
                : prodottiCategoria.map(v => `
                  <div style="
                    display:grid;
                    grid-template-columns:1fr 90px auto;
                    gap:8px;
                    align-items:center;
                    padding:8px;
                    border-top:1px solid #f1f5f9;
                  ">
                    <div>
                      <strong>${escapeHtml(v.nome || "")}</strong>
                      <div style="font-size:12px; opacity:.7;">
                        Prezzo: € ${formatNumber(v.prezzo)} · Food cost: € ${formatNumber(v.food_cost_snapshot)}
                      </div>
                    </div>
                    <button class="bo-voce-tags" data-id="${v.id}">Tag</button>
                    <button class="bo-voce-delete" data-id="${v.id}">Elimina</button>
                  </div>
                `).join("")
            }
          </div>
        </div>
      `
    }).join("")

    box.querySelectorAll(".bo-cat-delete").forEach(btn => {
      btn.onclick = () => deleteCategoria(btn.getAttribute("data-id"))
    })

    box.querySelectorAll(".bo-voce-add").forEach(btn => {
      btn.onclick = () => {
        const catId = btn.getAttribute("data-cat")
        addVoce(catId)
      }
    })

    box.querySelectorAll(".bo-voce-delete").forEach(btn => {
      btn.onclick = () => deleteVoce(btn.getAttribute("data-id"))
    })

    box.querySelectorAll(".bo-voce-tags").forEach(btn => {
      btn.onclick = () => openTagPrompt(btn.getAttribute("data-id"))
    })
  }

  function renderTagList() {
    const box = container.querySelector("#bo-tag-list")
    if (!box) return

    if (tag.length === 0) {
      box.innerHTML = `<p>Nessun tag creato.</p>`
      return
    }

    box.innerHTML = tag.map(t => `
      <span style="
        display:inline-flex;
        align-items:center;
        gap:6px;
        margin:4px;
        padding:6px 10px;
        border-radius:999px;
        background:${t.colore || "#e5e7eb"};
        color:${t.testo_colore || "#111827"};
        font-weight:700;
      ">
        ${escapeHtml(t.icona || "")} ${escapeHtml(t.nome)}
      </span>
    `).join("")
  }

  async function saveMenu() {
    const nome = container.querySelector("#bo-menu-nome").value.trim()
    const descrizione = container.querySelector("#bo-menu-descrizione").value.trim()
    const slug = container.querySelector("#bo-menu-slug").value.trim()
    const logo_url = container.querySelector("#bo-menu-logo").value.trim()
    const cover_url = container.querySelector("#bo-menu-cover").value.trim()
    const colore_sfondo = container.querySelector("#bo-menu-bg").value.trim()

    if (!nome) {
      alert("Inserisci il nome del menu.")
      return
    }

    const payload = {
      azienda_id,
      sede_id,
      nome,
      descrizione,
      slug: slug || null,
      logo_url: logo_url || null,
      cover_url: cover_url || null,
      colore_sfondo: colore_sfondo || null,
      attivo: true
    }

    const { data, error } = await supabase
      .from("menu")
      .insert(payload)
      .select("*")
      .single()

    if (error) {
      console.error(error)
      alert("Errore salvataggio menu.")
      return
    }

    menuAttivo = data
    await loadAll()
  }

  async function addCategoria() {
    if (!menuAttivo) return

    const input = container.querySelector("#bo-cat-nome")
    const nome = input.value.trim()

    if (!nome) return

    const { error } = await supabase
      .from("menu_categorie")
      .insert({
        azienda_id,
        menu_id: menuAttivo.id,
        nome,
        ordine: categorie.length,
        attivo: true
      })

    if (error) {
      console.error(error)
      alert("Errore creazione categoria.")
      return
    }

    input.value = ""
    await loadMenuData(menuAttivo.id)
    renderWorkspace()
  }

  async function deleteCategoria(id) {
    if (!confirm("Eliminare categoria?")) return

    const { error } = await supabase
      .from("menu_categorie")
      .delete()
      .eq("id", id)
      .eq("azienda_id", azienda_id)

    if (error) {
      console.error(error)
      alert("Errore eliminazione categoria.")
      return
    }

    await loadMenuData(menuAttivo.id)
    renderWorkspace()
  }

  async function addVoce(categoriaId) {
    const select = container.querySelector(`.bo-voce-ricetta[data-cat="${categoriaId}"]`)
    const prezzoInput = container.querySelector(`.bo-voce-prezzo[data-cat="${categoriaId}"]`)

    const ricettaId = select.value
    const prezzo = Number(prezzoInput.value)

    if (!ricettaId || !prezzo) {
      alert("Seleziona ricetta e prezzo.")
      return
    }

    const ricetta = ricette.find(r => String(r.id) === String(ricettaId))

    if (!ricetta) {
      alert("Ricetta non trovata.")
      return
    }

    const foodCost = ricetta.costo_porzione || ricetta.costo_totale || null

    const { error } = await supabase
      .from("menu_voci")
      .insert({
        azienda_id,
        menu_id: menuAttivo.id,
        categoria_id: categoriaId,
        nome: ricetta.nome,
        descrizione: ricetta.descrizione || null,
        prezzo,
        ricetta_id: ricetta.id,
        prodotto_id: null,
        food_cost_snapshot: foodCost,
        attivo: true,
        ordine: voci.length
      })

    if (error) {
      console.error(error)
      alert("Errore aggiunta prodotto.")
      return
    }

    await loadMenuData(menuAttivo.id)
    renderWorkspace()
  }

  async function deleteVoce(id) {
    if (!confirm("Eliminare prodotto dal menu?")) return

    const { error } = await supabase
      .from("menu_voci")
      .delete()
      .eq("id", id)
      .eq("azienda_id", azienda_id)

    if (error) {
      console.error(error)
      alert("Errore eliminazione prodotto.")
      return
    }

    await loadMenuData(menuAttivo.id)
    renderWorkspace()
  }

  async function addTag() {
    const nome = container.querySelector("#bo-tag-nome").value.trim()
    const colore = container.querySelector("#bo-tag-colore").value.trim()
    const testo_colore = container.querySelector("#bo-tag-testo").value.trim()
    const icona = container.querySelector("#bo-tag-icona").value.trim()

    if (!nome) return

    const { error } = await supabase
      .from("menu_tag")
      .insert({
        azienda_id,
        nome,
        colore: colore || null,
        testo_colore: testo_colore || null,
        icona: icona || null,
        stile: "badge",
        ordine: tag.length
      })

    if (error) {
      console.error(error)
      alert("Errore creazione tag.")
      return
    }

    await loadTag()
    renderWorkspace()
  }

  async function openTagPrompt(voceId) {
    if (tag.length === 0) {
      alert("Crea prima almeno un tag.")
      return
    }

    const scelta = prompt(
      "Inserisci nome tag da associare:\n" + tag.map(t => "- " + t.nome).join("\n")
    )

    if (!scelta) return

    const t = tag.find(x => x.nome.toLowerCase() === scelta.toLowerCase())

    if (!t) {
      alert("Tag non trovato.")
      return
    }

    const { error } = await supabase
      .from("menu_voci_tag")
      .insert({
        azienda_id,
        voce_id: voceId,
        tag_id: t.id
      })

    if (error) {
      console.error(error)
      alert("Errore associazione tag.")
      return
    }

    alert("Tag associato.")
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  }

  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "0,00"
    return Number(value).toFixed(2).replace(".", ",")
  }

  container.querySelector("#bo-menu-save").onclick = saveMenu

  await loadAll()
}
