const supabase = window.supabase || window.supabaseClient

export async function render(container) {
  const azienda_id = window.state?.azienda_id || window.state?.azienda?.id
  const sede_id = window.state?.sedeAttiva?.id || null
  const ruolo = window.state?.ruolo

  const STORAGE_BUCKET = "loghi-aziende"

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<section class="view">Accesso negato</section>`
    return
  }

  if (!supabase || typeof supabase.from !== "function") {
    container.innerHTML = `<section class="view">Supabase non inizializzato</section>`
    return
  }

  let prodotti = []
  let prodottiFiltrati = []
  let categorie = []
  let ricette = []
  let tagsDisponibili = []
  let tagsSelezionati = []
  let prodottoAttivo = null

  container.innerHTML = `
  <section class="view" style="display:flex; gap:16px; padding:16px;">

    <div style="flex:1;" class="card">

      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div>
          <h3 style="margin:0;">Prodotti</h3>
          <p style="margin:4px 0 0; color:#64748b;">Prodotti vendibili per menu, preventivi e future comande.</p>
        </div>
        <button id="btn-new" class="app-button primary" type="button">+ Nuovo prodotto</button>
      </div>

      <input id="product-search" class="input" placeholder="Cerca prodotto" style="margin-top:12px;">

      <div id="prodotti-list" style="margin-top:12px;"></div>

    </div>

    <div id="form-box" style="width:430px; display:none;" class="card">

      <h3 id="form-title">Nuovo prodotto</h3>

      <label>Nome prodotto</label>
      <input id="prod-nome" class="input" placeholder="Es. Lasagna, Menu degustazione, Aperitivo evento">

      <label>Descrizione</label>
      <textarea id="prod-descrizione" class="input" rows="3" placeholder="Descrizione visibile o interna"></textarea>

      <label>Categoria</label>
      <select id="prod-categoria" class="input">
        <option value="">Seleziona categoria</option>
      </select>

      <label>Ricetta collegata</label>
<select id="prod-ricetta" class="input">
  <option value="">Non collegata</option>
</select>

<label>Contesto utilizzo</label>
<input id="prod-contesto" class="input" list="contesto-options" placeholder="Es. ristorante, evento, delivery">
<datalist id="contesto-options"></datalist>

      <div id="food-cost-box" style="
        margin:10px 0;
        padding:10px;
        border-radius:12px;
        background:#f8fafc;
        border:1px solid #e5e7eb;
        font-size:13px;
      "></div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label>Prezzo base</label>
          <input id="prod-prezzo" class="input" type="number" step="0.01" placeholder="0.00">
        </div>

        <div>
          <label>IVA %</label>
          <input id="prod-iva" class="input" type="number" step="0.01" value="10">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label>Porzione default</label>
          <input id="prod-porzione" class="input" type="number" step="0.001" placeholder="1">
        </div>

        <div>
          <label>Unità porzione</label>
          <select id="prod-um" class="input">
            <option value="pz">pz</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="l">l</option>
            <option value="persona">persona</option>
          </select>
        </div>
      </div>

      <label>Foto prodotto</label>
      <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
        <input id="prod-img-file" class="input" type="file" accept="image/png,image/jpeg,image/jpg">
        <button id="btn-upload-img" class="app-button" type="button">Carica</button>
      </div>
      <input id="prod-img-url" class="input" placeholder="URL foto" readonly>

      <hr>

      <h4>Tag</h4>
      <div style="display:grid; grid-template-columns:1fr auto; gap:8px;">
        <input id="tag-input" class="input" list="tag-options" placeholder="Scrivi o seleziona tag">
        <datalist id="tag-options"></datalist>
        <button id="btn-add-tag" class="app-button" type="button">Aggiungi</button>
      </div>
      <div id="tag-list" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;"></div>

      <hr>

      <label>
        <input id="prod-attivo" type="checkbox" checked>
        Attivo
      </label>

      <label>
        <input id="prod-visibile" type="checkbox" checked>
        Visibile nei menu
      </label>

      <div style="display:flex; gap:8px; margin-top:12px;">
        <button id="btn-save" class="app-button primary" type="button">Salva</button>
        <button id="btn-cancel" class="app-button" type="button">Annulla</button>
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
    qs("#btn-save").onclick = saveProdotto
    qs("#btn-upload-img").onclick = uploadProductImage

    qs("#product-search").addEventListener("input", renderProdotti)

    qs("#prod-ricetta").addEventListener("change", () => {
      applyRicettaFoodCost()
      renderFoodCostBox()
    })

    qs("#btn-add-tag").onclick = addTagFromInput
    qs("#tag-input").addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault()
        addTagFromInput()
      }
    })
  }

  async function loadAll() {
  await Promise.all([
    loadProdotti(),
    loadCategorie(),
    loadRicette(),
    loadTags()
  ])

  prodottiFiltrati = [...prodotti]
  renderAll()
  renderContesti() // ← chiamata qui
}

// FUORI dalla funzione loadAll
function renderContesti() {
  const contesti = ["ristorante", "evento", "delivery", "asporto"]

  qs("#contesto-options").innerHTML = contesti.map(c => `
    <option value="${c}">
  `).join("")
}

  async function loadProdotti() {
    const { data, error } = await supabase
      .from("prodotti_vendita")
      .select("*")
      .eq("azienda_id", azienda_id)
      .order("nome", { ascending: true })

    if (error) {
      console.error("Errore prodotti_vendita:", error)
      prodotti = []
      return
    }

    prodotti = data || []
  }

  async function loadCategorie() {
    const { data, error } = await supabase
      .from("categorie_vendita")
      .select("*")
      .eq("azienda_id", azienda_id)
      .order("ordine", { ascending: true })

    if (error) {
      console.error("Errore categorie_vendita:", error)
      categorie = []
      return
    }

    categorie = data || []
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

  async function loadTags() {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("azienda_id", azienda_id)
      .order("nome", { ascending: true })

    if (error) {
      tagsDisponibili = []
      return
    }

    tagsDisponibili = data || []
  }

  function renderAll() {
    renderCategoriaOptions()
    renderRicettaOptions()
    renderTagOptions()
    renderTags()
    renderProdotti()
    renderFoodCostBox()
  }

  function renderCategoriaOptions() {
    const value = qs("#prod-categoria")?.value || ""

    qs("#prod-categoria").innerHTML = `
      <option value="">Seleziona categoria</option>
      ${categorie.map(c => `
        <option value="${escapeAttribute(c.id)}">${escapeHtml(c.icona || "")} ${escapeHtml(c.nome || "")}</option>
      `).join("")}
    `

    qs("#prod-categoria").value = value
  }

  function renderRicettaOptions() {
    const value = qs("#prod-ricetta")?.value || ""

    qs("#prod-ricetta").innerHTML = `
      <option value="">Non collegata</option>
      ${ricette.map(r => `
        <option value="${escapeAttribute(r.id)}">${escapeHtml(r.nome || "")}</option>
      `).join("")}
    `

    qs("#prod-ricetta").value = value
  }

  function renderTagOptions() {
    qs("#tag-options").innerHTML = tagsDisponibili.map(t => `
      <option value="${escapeAttribute(t.nome || t.name || "")}"></option>
    `).join("")
  }

  function renderProdotti() {
    const search = String(qs("#product-search").value || "").toLowerCase().trim()

    prodottiFiltrati = prodotti.filter(p => {
      if (!search) return true
      return (
        String(p.nome || "").toLowerCase().includes(search) ||
        String(p.descrizione || "").toLowerCase().includes(search)
      )
    })

    const box = qs("#prodotti-list")

    if (!prodottiFiltrati.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessun prodotto creato.</div>`
      return
    }

   box.innerHTML = prodottiFiltrati.map(p => {
  const categoria = categorie.find(c => String(c.id) === String(p.categoria_vendita_id))
  const hasFoodCost = Number(p.food_cost_snapshot || 0) > 0 && p.alert_food_cost !== true

  return `
    <div data-id="${escapeAttribute(p.id)}" style="
      display:grid;
      grid-template-columns:64px 1fr auto;
      gap:12px;
      align-items:center;
      padding:10px;
      border-radius:14px;
      border:1px solid ${hasFoodCost ? "#e5e7eb" : "#f59e0b"};
      background:${hasFoodCost ? "#ffffff" : "#fffbeb"};
      margin-bottom:10px;
      cursor:pointer;
    ">
      <div style="
        width:64px;
        height:64px;
        border-radius:12px;
        background:${p.foto_url ? "url('" + escapeAttribute(p.foto_url) + "') center/cover" : "#e2e8f0"};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:22px;
      ">
        ${p.foto_url ? "" : "🍽️"}
      </div>

      <div>
        <strong>${escapeHtml(p.nome || "Prodotto")}</strong>

        <div style="font-size:12px; color:#64748b;">
          ${escapeHtml(categoria?.nome || "Senza categoria")}
        </div>

        <div style="font-size:12px; color:${hasFoodCost ? "#64748b" : "#b45309"};">
          ${hasFoodCost ? `Food cost € ${formatMoney(p.food_cost_snapshot)}` : "⚠️ Food cost mancante"}
        </div>

        ${p.contesto ? `
          <div style="font-size:12px; color:#0ea5e9;">
            📍 ${escapeHtml(p.contesto)}
          </div>
        ` : ""}
      </div>

      <div style="text-align:right;">
        <div style="font-weight:800;">€ ${formatMoney(p.prezzo_base)}</div>
        <div style="font-size:12px; color:#64748b;">
          ${p.attivo === false ? "Off" : "Attivo"}
        </div>
      </div>
    </div>
  `
}).join("")

box.querySelectorAll("[data-id]").forEach(el => {
  el.onclick = () => selectProdotto(el.dataset.id)
})
</div>
  function selectProdotto(id) {
    const p = prodotti.find(x => String(x.id) === String(id))
    if (!p) return

    prodottoAttivo = p
    tagsSelezionati = Array.isArray(p.tags) ? p.tags : []

    qs("#form-title").innerText = "Modifica prodotto"
    qs("#prod-nome").value = p.nome || ""
    qs("#prod-descrizione").value = p.descrizione || ""
    qs("#prod-categoria").value = p.categoria_vendita_id || ""
    qs("#prod-ricetta").value = p.ricetta_id || ""
    qs("#prod-prezzo").value = p.prezzo_base ?? ""
    qs("#prod-iva").value = p.iva ?? 10
    qs("#prod-porzione").value = p.porzione_default ?? 1
    qs("#prod-um").value = p.unita_porzione || "pz"
    qs("#prod-img-url").value = p.foto_url || ""
    qs("#prod-attivo").checked = p.attivo !== false
    qs("#prod-visibile").checked = p.visibile !== false
    qs("#prod-contesto").value = p.contesto || ""

    renderTags()
    renderFoodCostBox()
    openForm()
  }

  function resetForm() {
    prodottoAttivo = null
    tagsSelezionati = []

    qs("#form-title").innerText = "Nuovo prodotto"
    qs("#prod-nome").value = ""
    qs("#prod-descrizione").value = ""
    qs("#prod-categoria").value = ""
    qs("#prod-ricetta").value = ""
    qs("#prod-prezzo").value = ""
    qs("#prod-iva").value = 10
    qs("#prod-porzione").value = 1
    qs("#prod-um").value = "pz"
    qs("#prod-img-url").value = ""
    qs("#prod-attivo").checked = true
    qs("#prod-visibile").checked = true
    qs("#tag-input").value = ""

    renderTags()
    renderFoodCostBox()
  }

  function openForm() {
    qs("#form-box").style.display = "block"
  }

  function closeForm() {
    qs("#form-box").style.display = "none"
  }

  async function saveProdotto() {
    const nome = qs("#prod-nome").value.trim()

    if (!nome) {
      alert("Inserisci il nome del prodotto.")
      return
    }

    const ricettaId = qs("#prod-ricetta").value || null
    const ricetta = ricette.find(r => String(r.id) === String(ricettaId))

    const foodCost = ricetta
      ? Number(ricetta.costo_porzione || ricetta.costo_totale || 0)
      : null

    const alertFoodCost = !foodCost || foodCost <= 0

  const payload = {
  azienda_id,
  sede_id,
  nome,
  descrizione: qs("#prod-descrizione").value.trim() || null,
  categoria_vendita_id: qs("#prod-categoria").value || null,
  ricetta_id: ricettaId,
  foto_url: qs("#prod-img-url").value.trim() || null,
  prezzo_base: parseNullableNumber(qs("#prod-prezzo").value),
  iva: parseNullableNumber(qs("#prod-iva").value),
  porzione_default: parseNullableNumber(qs("#prod-porzione").value) || 1,
  unita_porzione: qs("#prod-um").value || "pz",
  food_cost_snapshot: foodCost,
  alert_food_cost: alertFoodCost,
  stato: alertFoodCost ? "bozza" : "completo",
  tags: tagsSelezionati,
  attivo: qs("#prod-attivo").checked,
  visibile: qs("#prod-visibile").checked,

  // 👇 AGGIUNTO
  contesto: qs("#prod-contesto").value || null
}
  function applyRicettaFoodCost() {
    const ricettaId = qs("#prod-ricetta").value
    const ricetta = ricette.find(r => String(r.id) === String(ricettaId))

    if (!ricetta) return

    if (!qs("#prod-descrizione").value.trim()) {
      qs("#prod-descrizione").value = ricetta.descrizione || ""
    }
  }

  function renderFoodCostBox() {
    const ricettaId = qs("#prod-ricetta")?.value || ""
    const ricetta = ricette.find(r => String(r.id) === String(ricettaId))

    if (!ricetta) {
      qs("#food-cost-box").innerHTML = `
        ⚠️ Nessuna ricetta collegata. Il prodotto resterà in bozza con food cost mancante.
      `
      return
    }

    const foodCost = Number(ricetta.costo_porzione || ricetta.costo_totale || 0)

    if (!foodCost) {
      qs("#food-cost-box").innerHTML = `
        ⚠️ Ricetta collegata ma food cost mancante.
      `
      return
    }

    qs("#food-cost-box").innerHTML = `
      ✅ Food cost da ricetta: <strong>€ ${formatMoney(foodCost)}</strong>
    `
  }

  function addTagFromInput() {
    const input = qs("#tag-input")
    const value = input.value.trim()

    if (!value) return

    const existing = tagsDisponibili.find(t =>
      String(t.nome || t.name || "").toLowerCase() === value.toLowerCase()
    )

    const tagName = existing?.nome || existing?.name || value

    if (!tagsSelezionati.includes(tagName)) {
      tagsSelezionati.push(tagName)
    }

    if (!existing) {
      supabase.from("tags").insert({
        azienda_id,
        nome: value
      }).then(() => loadTags())
    }

    input.value = ""
    renderTags()
  }

  function renderTags() {
    const box = qs("#tag-list")

    if (!tagsSelezionati.length) {
      box.innerHTML = `<div style="font-size:13px; color:#64748b;">Nessun tag selezionato.</div>`
      return
    }

    box.innerHTML = tagsSelezionati.map(tag => `
      <span style="
        display:inline-flex;
        align-items:center;
        gap:6px;
        background:#e0f2fe;
        color:#075985;
        padding:6px 10px;
        border-radius:999px;
      ">
        ${escapeHtml(tag)}
        <button type="button" data-remove-tag="${escapeAttribute(tag)}" style="border:0;background:transparent;cursor:pointer;">×</button>
      </span>
    `).join("")

    box.querySelectorAll("[data-remove-tag]").forEach(btn => {
      btn.onclick = () => {
        tagsSelezionati = tagsSelezionati.filter(tag => tag !== btn.dataset.removeTag)
        renderTags()
      }
    })
  }

  async function uploadProductImage() {
    const file = qs("#prod-img-file").files?.[0]

    if (!file) {
      alert("Seleziona un file JPG o PNG.")
      return
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      alert("Formato non valido. Usa JPG o PNG.")
      return
    }

    const ext = file.name.split(".").pop() || "png"
    const path = `prodotti/${azienda_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false
      })

    if (error) {
      console.error(error)
      alert("Errore upload immagine.")
      return
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path)

    qs("#prod-img-url").value = data?.publicUrl || ""
  }

  function parseNullableNumber(value) {
    if (value === "" || value === null || value === undefined) return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
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
}
