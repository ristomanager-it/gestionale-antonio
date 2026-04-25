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

  const supabase = await window.getSupabase()

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

    el.onclick = () => {
      currentSection = el.dataset.sec
      renderSection()
    }
  })

  async function loadTags() {
    const aziendaId = window.state?.azienda?.id

    const { data, error } = await supabase
      .from("clienti_tag")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("nome")

    if (!error) tags = data || []
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
    await supabase
      .from("clienti_tag")
      .delete()
      .eq("id", id)

    await loadTags()
    renderSection()
  }

  async function updateTag(id, nome) {
    await supabase
      .from("clienti_tag")
      .update({ nome })
      .eq("id", id)

    await loadTags()
    renderSection()
  }

  function renderTags() {

    content.innerHTML = `
      <div class="card">
        <h2>Tags</h2>

        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <input id="tag-nome" class="input" placeholder="Nome tag">
          <input id="tag-colore" class="input" type="color" value="#0E5A7A">
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
          <div style="
            width:20px;
            height:20px;
            border-radius:6px;
            background:${tag.colore || "#ccc"};
          "></div>
        </td>
        <td>
          <button data-id="${tag.id}" class="btn-del">❌</button>
        </td>
      `

      const nomeCell = row.children[0]

      nomeCell.onblur = () => {
        updateTag(tag.id, nomeCell.innerText)
      }

      row.querySelector(".btn-del").onclick = () => {
        deleteTag(tag.id)
      }

      table.appendChild(row)
    })

    document.getElementById("btn-add-tag").onclick = () => {
      const nome = document.getElementById("tag-nome").value
      const colore = document.getElementById("tag-colore").value

      if (!nome) return

      createTag(nome, colore)
    }
  }

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
