export async function render(container) {

  const ruolo = window.state?.ruolo

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `
      <section class="view">
        <h2>Accesso negato</h2>
        <p>Non hai i permessi per accedere al Marketing.</p>
      </section>
    `
    return
  }

  let currentSection = "tags"
  let tags = []
  let templates = []

  const supabase = await window.waitSupabase()

  container.innerHTML = `
    <div style="display:flex; gap:16px; width:100%; min-height:70vh;">

      <!-- MENU -->
      <aside style="
        width:220px;
        background:#111827;
        color:white;
        border-radius:16px;
        padding:16px;
        flex-shrink:0;
      ">

        <div style="font-weight:800; margin-bottom:16px;">
          MARKETING
        </div>

        <div class="bo-m-item" data-sec="promozioni">🎯 Promozioni</div>
        <div class="bo-m-item" data-sec="fidelity">💳 Fidelity</div>
        <div class="bo-m-item" data-sec="tags">🏷️ Tags</div>
        <div class="bo-m-item" data-sec="template">✉️ Template</div>
        <div class="bo-m-item" data-sec="template">✉️ Template</div>
        <div class="bo-m-item" data-sec="bozze">📝 Bozze</div>
        <div class="bo-m-item" data-sec="invio">📤 Invio</div>
        <div class="bo-m-item" data-sec="coda">📬 Coda</div>
        <div class="bo-m-item" data-sec="landing">🌐 Landing</div>
        <div class="bo-m-item" data-sec="impostazioni">⚙️ Impostazioni</div>

      </aside>

      <!-- CONTENUTO -->
      <div id="bo-m-content" style="flex:1;"></div>

    </div>
  `

  const content = container.querySelector("#bo-m-content")
  const menuItems = container.querySelectorAll(".bo-m-item")

menuItems.forEach(el => {
  el.style.padding = "10px"
  el.style.cursor = "pointer"
  el.style.borderRadius = "10px"
  el.style.marginBottom = "6px"

  el.addEventListener("click", () => {
    const sec = el.getAttribute("data-sec")
    console.log("CLICK:", sec)

    currentSection = sec
    renderSection()
  })
})
  /* ================= TAG ================= */

  async function loadTags() {
    const aziendaId = window.state?.azienda?.id

    const { data } = await supabase
      .from("clienti_tag")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("nome")

    tags = data || []
  }

  async function createTag(nome, colore) {
    const aziendaId = window.state?.azienda?.id

    await supabase
      .from("clienti_tag")
      .insert([{ nome, colore, azienda_id: aziendaId }])

    await loadTags()
    renderSection()
  }

  async function deleteTag(id) {
    await supabase.from("clienti_tag").delete().eq("id", id)
    await loadTags()
    renderSection()
  }

  async function updateTag(id, nome) {
    await supabase.from("clienti_tag").update({ nome }).eq("id", id)
    await loadTags()
    renderSection()
  }

  function renderTags() {

    content.innerHTML = `
      <div class="card">
        <h2>Tags</h2>

        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <input id="tag-nome" class="input" placeholder="Nome tag">
          <input id="tag-colore" type="color" value="#0E5A7A">
          <button id="btn-add-tag" class="app-button primary">Aggiungi</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Colore</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="tag-table"></tbody>
        </table>
      </div>
    `

    const table = content.querySelector("#tag-table")

    tags.forEach(tag => {

      const row = document.createElement("tr")

      row.innerHTML = `
        <td contenteditable="true">${tag.nome || ""}</td>
        <td>
          <div style="width:20px;height:20px;border-radius:6px;background:${tag.colore || "#ccc"};"></div>
        </td>
        <td><button data-id="${tag.id}" class="btn-del">❌</button></td>
      `

      row.children[0].onblur = () => updateTag(tag.id, row.children[0].innerText)
      row.querySelector(".btn-del").onclick = () => deleteTag(tag.id)

      table.appendChild(row)
    })

    document.getElementById("btn-add-tag").onclick = () => {
      const nome = document.getElementById("tag-nome").value
      const colore = document.getElementById("tag-colore").value
      if (!nome) return
      createTag(nome, colore)
    }
  }

  /* ================= TEMPLATE ================= */

  async function loadTemplates() {
    const aziendaId = window.state?.azienda?.id

    const { data } = await supabase
      .from("messaggi_template")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("created_at", { ascending: false })

    templates = data || []
  }

  async function createTemplate(payload) {
    await supabase.from("messaggi_template").insert([payload])
    await loadTemplates()
    renderSection()
  }

  async function deleteTemplate(id) {
    await supabase.from("messaggi_template").delete().eq("id", id)
    await loadTemplates()
    renderSection()
  }

  function renderTemplates() {

    const tagOptions = tags.map(t => `
      <option value="${t.id}">${t.nome}</option>
    `).join("")

    content.innerHTML = `
      <div class="card">
        <h2>Template Messaggi</h2>

        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">

          <input id="tpl-nome" class="input" placeholder="Nome template">

          <select id="tpl-tipo" class="input">
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>

          <textarea id="tpl-contenuto" class="input" placeholder="Contenuto messaggio"></textarea>

          <select id="tpl-tag" class="input">
            <option value="">-- Nessun tag --</option>
            ${tagOptions}
          </select>

          <select id="tpl-trigger" class="input">
            <option value="">-- Nessun trigger --</option>
            <option value="prenotazione_creata">Prenotazione creata</option>
            <option value="prenotazione_confermata">Prenotazione confermata</option>
          </select>

          <div style="display:flex; gap:6px;">
            <select id="tpl-timing-tipo">
              <option value="subito">Subito</option>
              <option value="prima">Prima</option>
              <option value="dopo">Dopo</option>
            </select>

            <input id="tpl-timing-val" type="number" placeholder="Valore">

            <select id="tpl-timing-unit">
              <option value="minuti">Minuti</option>
              <option value="ore">Ore</option>
              <option value="giorni">Giorni</option>
            </select>
          </div>

          <button id="btn-add-template" class="app-button primary">Salva template</button>

        </div>

        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Tag</th>
              <th>Trigger</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="tpl-table"></tbody>
        </table>

      </div>
    `

    const table = content.querySelector("#tpl-table")

    templates.forEach(t => {

      const tagName = tags.find(x => x.id === t.tag_id)?.nome || "-"

      const row = document.createElement("tr")

      row.innerHTML = `
        <td>${t.nome}</td>
        <td>${t.tipo}</td>
        <td>${tagName}</td>
        <td>${t.trigger_evento || "-"}</td>
        <td><button data-id="${t.id}" class="btn-del">❌</button></td>
      `

      row.querySelector(".btn-del").onclick = () => deleteTemplate(t.id)

      table.appendChild(row)
    })

    document.getElementById("btn-add-template").onclick = () => {

      const payload = {
        nome: document.getElementById("tpl-nome").value,
        tipo: document.getElementById("tpl-tipo").value,
        contenuto: document.getElementById("tpl-contenuto").value,
        tag_id: document.getElementById("tpl-tag").value || null,
        trigger_evento: document.getElementById("tpl-trigger").value || null,
        timing_tipo: document.getElementById("tpl-timing-tipo").value,
        timing_valore: parseInt(document.getElementById("tpl-timing-val").value) || null,
        timing_unita: document.getElementById("tpl-timing-unit").value,
        azienda_id: window.state?.azienda?.id
      }

      if (!payload.nome || !payload.contenuto) return

      createTemplate(payload)
    }
  }

  /* ================= GENERALE ================= */

  function renderPlaceholder(title) {
    content.innerHTML = `
      <div class="card">
        <h2>${title}</h2>
        <p>Modulo in arrivo</p>
      </div>
    `
  }

  async function renderSection() {

    if (currentSection === "tags") {
      await loadTags()
      renderTags()
      return
    }

    if (currentSection === "template") {
      await loadTags()
      await loadTemplates()
      renderTemplates()
      return
    }

    if (currentSection === "promozioni") return renderPlaceholder("Promozioni")
    if (currentSection === "fidelity") return renderPlaceholder("Fidelity")
    if (currentSection === "bozze") return renderPlaceholder("Bozze")
    if (currentSection === "invio") return renderPlaceholder("Invio Messaggi")
    if (currentSection === "coda") return renderPlaceholder("Coda Messaggi")
    if (currentSection === "landing") return renderPlaceholder("Landing")
    if (currentSection === "impostazioni") return renderPlaceholder("Impostazioni")
  }

  renderSection()
}
