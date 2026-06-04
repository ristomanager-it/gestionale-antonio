const supabase = window.supabase

export async function render(container) {

  const azienda_id = window.state?.azienda?.id
  const sede_id = window.state?.sedeAttiva?.id || null
  const sede_nome = window.state?.sedeAttiva?.nome || 'Tutte le sedi'
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

      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="margin:0;">Categorie vendita</h3>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">
            ${sede_id ? `📍 ${sede_nome}` : '⚠️ Nessuna sede selezionata — seleziona una sede dal menu'}
          </div>
        </div>
        ${sede_id ? `<button id="btn-new" class="app-button primary">+ Nuova categoria</button>` : ''}
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

    let q = supabase.from("categorie_vendita").select("*").eq("azienda_id", azienda_id)
    if (sede_id) q = q.eq("sede_id", sede_id)
    const { data: c } = await q

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
    if (!sede_id) {
      qs("#categorie-list").innerHTML = '<div style="color:#94a3b8;padding:20px;text-align:center;">Seleziona una sede dal menu per gestire le categorie.</div>';
      return;
    }
    if (!categorie.length) {
      qs("#categorie-list").innerHTML = '<div style="color:#94a3b8;padding:20px;text-align:center;">Nessuna categoria per questa sede. Creane una.</div>';
      return;
    }

    qs("#categorie-list").innerHTML = categorie
      .sort((a,b) => (a.ordine||0)-(b.ordine||0))
      .map(c => `
        <div data-id="${c.id}" style="
          display:flex;align-items:center;justify-content:space-between;
          padding:10px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;
          opacity:${c.attiva !== false ? 1 : 0.45};
          background:${c.attiva !== false ? 'white' : '#f8fafc'};
        ">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:16px;">${c.immagine_url ? `<img src="${c.immagine_url}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;">` : '📂'}</span>
            <div>
              <div style="font-weight:600;font-size:14px;">${c.nome}</div>
              ${c.descrizione ? `<div style="font-size:11px;color:#94a3b8;">${c.descrizione}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;background:${c.attiva!==false?'#dcfce7':'#fee2e2'};color:${c.attiva!==false?'#15803d':'#dc2626'};padding:2px 8px;border-radius:10px;font-weight:600;">
              ${c.attiva!==false?'Attiva':'Non attiva'}
            </span>
            <button data-toggle="${c.id}" data-stato="${c.attiva!==false}" style="background:#f1f5f9;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;"
              onclick="event.stopPropagation()">
              ${c.attiva!==false?'Disattiva':'Attiva'}
            </button>
          </div>
        </div>
      `).join("")

    qsa("[data-id]").forEach(el => {
      el.onclick = () => { selectCategoria(el.dataset.id); openForm(); }
    })

    qsa("[data-toggle]").forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation()
        const id = btn.dataset.toggle
        const statoAttuale = btn.dataset.stato === 'true'
        await supabase.from("categorie_vendita").update({ attiva: !statoAttuale }).eq("id", id)
        await loadAll()
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

      if (!sede_id) return alert("Seleziona prima una sede")
      const insertPayload = {
        azienda_id,
        sede_id,
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
