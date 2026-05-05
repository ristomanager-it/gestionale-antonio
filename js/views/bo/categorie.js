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
  let formAperto = false

  container.innerHTML = `
  <section class="view" style="display:flex; gap:16px; padding:16px;">

    <!-- SINISTRA -->
    <div style="flex:1;" class="card">

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Categorie</h3>
        <button id="btn-new" class="app-button primary">+ Nuova</button>
      </div>

      <div id="categorie-list" style="margin-top:10px;"></div>

    </div>

    <!-- FORM -->
    <div id="form-box" style="width:380px; display:none;" class="card">

      <h3 id="form-title">Nuova categoria</h3>

      <input id="cat-nome" class="input" placeholder="Nome categoria">

      <textarea id="cat-descrizione" class="input" placeholder="Descrizione"></textarea>
      <input id="cat-descrizione-breve" class="input" placeholder="Descrizione breve">

      <input type="color" id="cat-colore" value="#ffffff">

      <input id="cat-icona" class="input" placeholder="Emoji (🍕)">

      <input id="cat-img-file" type="file">
      <input id="cat-img-url" class="input" placeholder="URL immagine" readonly>

      <select id="cat-tipo" class="input">
        <option value="food">Food</option>
        <option value="drink">Drink</option>
        <option value="dessert">Dessert</option>
        <option value="altro">Altro</option>
      </select>

      <input id="cat-ordine" type="number" class="input" placeholder="Ordine">

      <label><input type="checkbox" id="cat-attivo" checked> Attivo</label>
      <label><input type="checkbox" id="cat-evidenza"> Evidenza</label>
      <label><input type="checkbox" id="cat-stagionale"> Stagionale</label>

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
        ${c.icona || ""} ${c.nome}
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
    formAperto = true
  }

  function closeForm() {
    qs("#form-box").style.display = "none"
    formAperto = false
  }

  function resetForm() {
    categoriaAttiva = null
    tagsSelezionati = []

    qs("#form-title").innerText = "Nuova categoria"

    qs("#cat-nome").value = ""
    qs("#cat-descrizione").value = ""
    qs("#cat-descrizione-breve").value = ""
    qs("#cat-colore").value = "#ffffff"
    qs("#cat-icona").value = ""
    qs("#cat-img-url").value = ""
    qs("#cat-tipo").value = "food"
    qs("#cat-ordine").value = 0

    qs("#cat-attivo").checked = true
    qs("#cat-evidenza").checked = false
    qs("#cat-stagionale").checked = false

    renderTags()
  }

  function selectCategoria(id) {

    const c = categorie.find(x => x.id == id)
    if (!c) return

    categoriaAttiva = c

    qs("#form-title").innerText = "Modifica categoria"

    qs("#cat-nome").value = c.nome || ""
    qs("#cat-descrizione").value = c.descrizione || ""
    qs("#cat-descrizione-breve").value = c.descrizione_breve || ""
    qs("#cat-colore").value = c.colore_sfondo || "#fff"
    qs("#cat-icona").value = c.icona || ""
    qs("#cat-img-url").value = c.immagine_url || ""
    qs("#cat-tipo").value = c.tipo || "food"
    qs("#cat-ordine").value = c.ordine || 0

    qs("#cat-attivo").checked = c.attivo
    qs("#cat-evidenza").checked = c.evidenza
    qs("#cat-stagionale").checked = c.stagionale

    tagsSelezionati = c.tags || []

    renderTags()
  }

  async function saveCategoria() {

    const nome = qs("#cat-nome").value
    if (!nome) return alert("Nome obbligatorio")

    const payload = {
      azienda_id,
      nome,
      descrizione: qs("#cat-descrizione").value,
      descrizione_breve: qs("#cat-descrizione-breve").value,
      colore_sfondo: qs("#cat-colore").value,
      icona: qs("#cat-icona").value,
      immagine_url: qs("#cat-img-url").value,
      tipo: qs("#cat-tipo").value,
      ordine: Number(qs("#cat-ordine").value || 0),
      attivo: qs("#cat-attivo").checked,
      evidenza: qs("#cat-evidenza").checked,
      stagionale: qs("#cat-stagionale").checked,
      tags: tagsSelezionati
    }

   if (categoriaAttiva) {

  const updatePayload = {
    nome,
    descrizione: qs("#cat-descrizione").value || null,
    descrizione_breve: qs("#cat-descrizione-breve").value || null,
    colore_sfondo: qs("#cat-colore").value || null,
    icona: qs("#cat-icona").value || null,
    immagine_url: qs("#cat-img-url").value || null,
    tipo: qs("#cat-tipo").value || null,
    ordine: Number(qs("#cat-ordine").value || 0),
    attivo: qs("#cat-attivo").checked,
    evidenza: qs("#cat-evidenza").checked,
    stagionale: qs("#cat-stagionale").checked
  }

  console.log("UPDATE CATEGORIA:", updatePayload)

  await supabase
    .from("categorie_vendita")
    .update(updatePayload)
    .eq("id", categoriaAttiva.id)
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
