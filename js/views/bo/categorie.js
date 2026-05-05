const supabase = window.supabase

export async function render(container) {

  const azienda_id = window.state?.azienda?.id
  const ruolo = window.state?.ruolo

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<section class="view">Accesso negato</section>`
    return
  }

  let categorie = []
  let categoriaAttiva = null
  let tagsDisponibili = []
  let tagsSelezionati = []

  container.innerHTML = `
  <section class="view" style="display:flex; gap:16px; padding:16px;">

    <div style="flex:1;" class="card">

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Categorie</h3>
        <button id="btn-new" class="app-button primary">+ Nuova</button>
      </div>

      <div id="categorie-list" style="margin-top:10px;"></div>

    </div>

    <div id="form-box" style="width:380px; display:none;" class="card">

      <h3 id="form-title">Nuova categoria</h3>

      <input id="cat-nome" class="input" placeholder="Nome categoria">
      <textarea id="cat-descrizione" class="input" placeholder="Descrizione"></textarea>

      <input id="cat-img-file" type="file">
      <input id="cat-img-url" class="input" placeholder="URL immagine" readonly>

      <input id="cat-ordine" type="number" class="input" placeholder="Ordine">

      <label><input type="checkbox" id="cat-attivo" checked> Attiva</label>
      <label><input type="checkbox" id="cat-visibile" checked> Visibile</label>

      <hr>

      <h4>Tag</h4>

      <input id="tag-input" class="input" list="tag-options" placeholder="Scrivi o seleziona tag">
      <datalist id="tag-options"></datalist>

      <div id="tag-list"></div>

      <div style="display:flex; gap:8px; margin-top:12px;">
        <button id="btn-save" class="app-button primary">Salva</button>
        <button id="btn-cancel" class="app-button">Annulla</button>
      </div>

    </div>

  </section>
  `

  bindEvents()
  await loadAll()

  function bindEvents() {

    qs("#btn-new").onclick = () => {
      resetForm()
      openForm()
    }

    qs("#btn-cancel").onclick = closeForm
    qs("#btn-save").onclick = saveCategoria

    qs("#tag-input").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault()
        addTag()
      }
    })

    qs("#cat-img-file").onchange = async e => {
      const file = e.target.files[0]
      if (!file) return
      const url = await uploadImage(file)
      if (url) qs("#cat-img-url").value = url
    }
  }

  async function loadAll() {

    const { data: c } = await supabase
      .from("categorie_vendita")
      .select("*")
      .eq("azienda_id", azienda_id)

    categorie = c || []

    const { data: t } = await supabase
      .from("tags")
      .select("*")
      .eq("azienda_id", azienda_id)

    tagsDisponibili = t || []

    renderAll()
  }

  function renderAll() {
    renderLista()
    renderTagOptions()
    renderTags()
  }

  function renderLista() {

    qs("#categorie-list").innerHTML = categorie.map(c => `
      <div data-id="${c.id}" style="padding:10px; border-bottom:1px solid #ddd; cursor:pointer;">
        ${c.nome}
      </div>
    `).join("")

    qsa("[data-id]").forEach(el => {
      el.onclick = () => {
        selectCategoria(el.dataset.id)
        openForm()
      }
    })
  }

  function openForm() {
    qs("#form-box").style.display = "block"
  }

  function closeForm() {
    qs("#form-box").style.display = "none"
  }

  function resetForm() {

    categoriaAttiva = null
    tagsSelezionati = []

    qs("#form-title").innerText = "Nuova categoria"

    qs("#cat-nome").value = ""
    qs("#cat-descrizione").value = ""
    qs("#cat-img-url").value = ""
    qs("#cat-ordine").value = 0

    qs("#cat-attivo").checked = true
    qs("#cat-visibile").checked = true

    renderTags()
  }

  function selectCategoria(id) {

    const c = categorie.find(x => x.id == id)
    if (!c) return

    categoriaAttiva = c

    qs("#form-title").innerText = "Modifica categoria"

    qs("#cat-nome").value = c.nome || ""
    qs("#cat-descrizione").value = c.descrizione || ""
    qs("#cat-img-url").value = c.immagine_url || ""
    qs("#cat-ordine").value = c.ordine || 0

    qs("#cat-attivo").checked = c.attiva ?? true
    qs("#cat-visibile").checked = c.visibile ?? true

    renderTags()
  }

  async function saveCategoria() {

    const nome = qs("#cat-nome").value.trim()
    if (!nome) return alert("Nome obbligatorio")

    if (categoriaAttiva) {

      const updatePayload = {
        nome,
        descrizione: qs("#cat-descrizione").value || null,
        immagine_url: qs("#cat-img-url").value || null,
        attiva: qs("#cat-attivo").checked,
        visibile: qs("#cat-visibile").checked,
        ordine: Number(qs("#cat-ordine").value || 0)
      }

      console.log("UPDATE OK:", updatePayload)

      await supabase
        .from("categorie_vendita")
        .update(updatePayload)
        .eq("id", categoriaAttiva.id)

    } else {

      const insertPayload = {
        azienda_id,
        nome,
        descrizione: qs("#cat-descrizione").value || null,
        immagine_url: qs("#cat-img-url").value || null,
        attiva: qs("#cat-attivo").checked,
        visibile: qs("#cat-visibile").checked,
        ordine: Number(qs("#cat-ordine").value || 0)
      }

      await supabase
        .from("categorie_vendita")
        .insert(insertPayload)
    }

    closeForm()
    await loadAll()
  }

  function addTag() {

    const val = qs("#tag-input").value.trim()
    if (!val) return

    if (!tagsSelezionati.includes(val)) tagsSelezionati.push(val)

    if (!tagsDisponibili.find(t => t.nome === val)) {
      supabase.from("tags").insert({ nome: val, azienda_id })
    }

    qs("#tag-input").value = ""
    renderTags()
  }

  function renderTags() {
    qs("#tag-list").innerHTML = tagsSelezionati.map(t => `
      <span style="margin:4px; padding:4px 8px; background:#eee; border-radius:6px;">
        ${t}
      </span>
    `).join("")
  }

  function renderTagOptions() {
    qs("#tag-options").innerHTML = tagsDisponibili.map(t => `
      <option value="${t.nome}">
    `).join("")
  }

  async function uploadImage(file) {

    const path = `categorie/${azienda_id}/${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from("loghi-aziende")
      .upload(path, file)

    if (error) return null

    const { data } = supabase.storage
      .from("loghi-aziende")
      .getPublicUrl(path)

    return data.publicUrl
  }

  function qs(s) { return container.querySelector(s) }
  function qsa(s) { return container.querySelectorAll(s) }
}
