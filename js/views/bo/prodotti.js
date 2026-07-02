const supabase = window.supabase || window.supabaseClient
import { openImportProdottiCSVModal } from "../../components/importProdottiCSVModal.js";

export async function render(container) {
  const azienda_id = window.state?.azienda?.id
  const sede_id = window.state?.sedeAttiva?.id || null
  const sede_nome = window.state?.sedeAttiva?.nome || 'Tutte le sedi'
  const ruolo = window.state?.ruolo

  const STORAGE_BUCKET = "loghi-aziende"

  // controllo accesso
  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<section class="view">Accesso negato</section>`
    return
  }

  // controllo supabase
  if (!supabase || typeof supabase.from !== "function") {
    container.innerHTML = `<section class="view">Supabase non inizializzato</section>`
    return
  }

  // controllo azienda
  if (!azienda_id) {
    container.innerHTML = `<section class="view">Azienda non selezionata</section>`
    return
  }

  if (!supabase || typeof supabase.from !== "function") {
    container.innerHTML = `<section class="view">Supabase non inizializzato</section>`
    return
  }

  if (!azienda_id) {
    container.innerHTML = `<section class="view">Azienda non selezionata</section>`
    return
  }

  let prodotti = []
  let prodottiFiltrati = []
  let categorie = []
  let ricette = []
  let tagsDisponibili = []
  let tagsSelezionati = []
  let allergeniSelezionati = []

  // I 14 allergeni a dichiarazione obbligatoria secondo il Regolamento UE 1169/2011
  const ALLERGENI_UE = [
    ["glutine", "🌾 Glutine (cereali)"],
    ["crostacei", "🦐 Crostacei"],
    ["uova", "🥚 Uova"],
    ["pesce", "🐟 Pesce"],
    ["arachidi", "🥜 Arachidi"],
    ["soia", "🌱 Soia"],
    ["latte", "🥛 Latte e derivati (lattosio)"],
    ["frutta_a_guscio", "🌰 Frutta a guscio"],
    ["sedano", "🥬 Sedano"],
    ["senape", "🟡 Senape"],
    ["sesamo", "◯ Semi di sesamo"],
    ["solfiti", "🍷 Anidride solforosa e solfiti"],
    ["lupini", "🫘 Lupini"],
    ["molluschi", "🐚 Molluschi"]
  ]
  let prodottoAttivo = null
  let searchDebounce = null

  container.innerHTML = `
  <section class="view" style="display:flex; gap:16px; padding:16px;">

    <div style="flex:1;" class="card">

      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div>
          <h3 style="margin:0;">Prodotti</h3>
          <p style="margin:4px 0 0; color:#64748b;">Prodotti vendibili per menu, preventivi e future comande.</p>
        </div>
        <button id="btn-new" class="app-button primary" type="button">+ Nuovo prodotto</button>
        <button id="btn-import-csv" class="app-button" type="button">📥 Import CSV</button>
      </div>

      <input id="product-search" class="input" placeholder="Cerca prodotto o creane uno nuovo" style="margin-top:12px;" autocomplete="off">

      <div id="prodotti-list" style="margin-top:12px;"></div>
      <style>
        .prod-row { transition: background .15s; }
        .prod-row.drag-over { outline: 2px solid #0E5A7A; background: #eff6ff !important; }
        .prod-row.dragging { opacity: 0.4; }
        .drag-handle { cursor: grab; color: #cbd5e1; font-size: 18px; user-select: none; padding: 0 8px 0 4px; }
        .drag-handle:active { cursor: grabbing; }
      </style>

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
        <option value="">Crea automaticamente ricetta bozza</option>
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
      <div id="prod-img-preview" style="
        width:100%; height:140px; border-radius:12px; background:#f1f5f9;
        display:flex; align-items:center; justify-content:center;
        overflow:hidden; margin-bottom:8px; border:1px solid #e5e7eb;
        color:#94a3b8; font-size:13px;
      ">Nessuna foto</div>
      <input id="prod-img-file" class="input" type="file" accept="image/png,image/jpeg,image/jpg">
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">📐 Consigliato: 1200×900px (formato 4:3) — coerente con le foto piatto nel menu</div>
      <div id="prod-img-status" style="font-size:12px; color:#64748b; margin-top:4px;"></div>
      <input id="prod-img-url" type="hidden">

      <hr>

      <h4>Allergeni presenti (14 allergeni UE)</h4>
      <div id="prod-allergeni-box" style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;"></div>

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
        <button id="btn-delete" class="app-button" type="button" style="display:none; margin-left:auto; background:#fee2e2; color:#dc2626;">🗑 Elimina</button>
      </div>

    </div>

  </section>
  `

  bindEvents()
  await loadAll()

  function bindEvents() {
  // NUOVO PRODOTTO
  qs("#btn-new").onclick = () => {
    resetForm()
    openForm()
  }

  // 📥 IMPORT CSV (NUOVO)
  qs("#btn-import-csv").onclick = () => {
    openImportProdottiCSVModal({
      onComplete: async () => {
        await loadAll()
      }
    })
  }

  // FORM
  qs("#btn-cancel").onclick = closeForm
  qs("#btn-save").onclick = saveProdotto
  qs("#btn-delete").onclick = deleteProdotto
  qs("#prod-img-file").addEventListener("change", uploadProductImage)

  // SEARCH
  qs("#product-search").addEventListener("input", () => {
    clearTimeout(searchDebounce)
    searchDebounce = setTimeout(renderProdotti, 300)
  })

  // RICETTA
  qs("#prod-ricetta").addEventListener("change", () => {
    applyRicettaFoodCost()
    renderFoodCostBox()
  })

  // TAGS
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
    renderContesti()
  }

  function renderContesti() {
    const contesti = ["ristorante", "evento", "delivery", "asporto"]

    qs("#contesto-options").innerHTML = contesti.map(c => `
      <option value="${escapeAttribute(c)}">
    `).join("")
  }

  async function loadProdotti() {
    let q = supabase
      .from("prodotti_vendita")
      .select("*")
      .eq("azienda_id", azienda_id)
    if (sede_id) q = q.eq("sede_id", sede_id)
    q = q.order("nome", { ascending: true })
    const { data, error } = await q

    if (error) {
      console.error("Errore prodotti_vendita:", error)
      prodotti = []
      return
    }

    prodotti = data || []
  }

  async function loadCategorie() {
    let q = supabase
      .from("categorie_vendita")
      .select("*")
      .eq("azienda_id", azienda_id)
    if (sede_id) q = q.eq("sede_id", sede_id)
    q = q.order("ordine", { ascending: true })
    const { data, error } = await q

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
      .select("id, nome, descrizione, costo_totale, costo_porzione, stato_strutturale")
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
      <option value="">Crea automaticamente ricetta bozza</option>
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

    prodottiFiltrati.sort((a, b) => {
      if (!search) {
        // Ordine personalizzato quando non si sta cercando
        return (a.ordine || 9999) - (b.ordine || 9999)
      }
      const an = String(a.nome || "").toLowerCase()
      const bn = String(b.nome || "").toLowerCase()
      const aStarts = an.startsWith(search) ? 0 : 1
      const bStarts = bn.startsWith(search) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return an.localeCompare(bn)
    })

    const box = qs("#prodotti-list")

    if (!prodottiFiltrati.length) {
      box.innerHTML = `
        <div style="font-size:13px; color:#64748b;">Nessun prodotto trovato.</div>

        ${search.length >= 2 ? `
          <button id="btn-create-from-search" class="app-button primary" type="button" style="margin-top:10px;">
            + Crea prodotto "${escapeHtml(qs("#product-search").value.trim())}"
          </button>
        ` : `
          <div style="font-size:12px; color:#94a3b8; margin-top:8px;">
            Scrivi almeno 2 lettere per creare velocemente un nuovo prodotto.
          </div>
        `}
      `

      qs("#btn-create-from-search")?.addEventListener("click", () => {
        resetForm()
        qs("#prod-nome").value = qs("#product-search").value.trim()
        openForm()
      })

      return
    }

    const isDraggable = !search;
    box.innerHTML = prodottiFiltrati.slice(0, 50).map(p => {
      const categoria = categorie.find(c => String(c.id) === String(p.categoria_vendita_id))
      const hasRicetta = !!p.ricetta_id
      const hasFoodCost = Number(p.food_cost_snapshot || 0) > 0 && p.alert_food_cost !== true

      return `
        <div data-id="${escapeAttribute(p.id)}"
          class="prod-row"
          ${isDraggable ? 'draggable="true"' : ''}
          style="
          display:grid;
          grid-template-columns:${isDraggable ? '28px ' : ''}64px 1fr auto;
          gap:12px;
          align-items:center;
          padding:10px;
          border-radius:14px;
          border:1px solid ${hasRicetta && hasFoodCost ? "#e5e7eb" : "#f59e0b"};
          background:${hasRicetta && hasFoodCost ? "#ffffff" : "#fffbeb"};
          margin-bottom:10px;
          cursor:pointer;
        ">
          ${isDraggable ? '<span class="drag-handle" onclick="event.stopPropagation()">⠿</span>' : ''}
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
              ${hasFoodCost ? `Food cost € ${formatMoney(p.food_cost_snapshot)}` : "⚠️ Ricetta/food cost da completare"}
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

    if (search.length >= 2) {
      box.insertAdjacentHTML("beforeend", `
        <button id="btn-create-from-search" class="app-button" type="button" style="margin-top:4px;">
          + Crea nuovo prodotto "${escapeHtml(qs("#product-search").value.trim())}"
        </button>
      `)

      qs("#btn-create-from-search")?.addEventListener("click", () => {
        resetForm()
        qs("#prod-nome").value = qs("#product-search").value.trim()
        openForm()
      })
    }

    box.querySelectorAll("[data-id]").forEach(el => {
      el.onclick = (e) => {
        if (e.target.classList.contains('drag-handle')) return;
        selectProdotto(el.dataset.id);
      }
    })

    // Drag & drop solo senza ricerca attiva
    if (isDraggable) {
      let dragSrc = null;
      box.querySelectorAll('.prod-row').forEach(row => {
        row.addEventListener('dragstart', e => {
          dragSrc = row;
          row.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          box.querySelectorAll('.prod-row').forEach(r => r.classList.remove('drag-over'));
        });
        row.addEventListener('dragover', e => {
          e.preventDefault();
          if (row === dragSrc) return;
          box.querySelectorAll('.prod-row').forEach(r => r.classList.remove('drag-over'));
          row.classList.add('drag-over');
        });
        row.addEventListener('drop', async e => {
          e.preventDefault();
          if (!dragSrc || dragSrc === row) return;
          row.classList.remove('drag-over');

          // Riordina DOM
          const rows = [...box.querySelectorAll('.prod-row')];
          const srcIdx = rows.indexOf(dragSrc);
          const dstIdx = rows.indexOf(row);
          if (srcIdx < dstIdx) box.insertBefore(dragSrc, row.nextSibling);
          else box.insertBefore(dragSrc, row);

          // Calcola nuovo ordine e salva
          const newOrder = [...box.querySelectorAll('.prod-row')].map((r, i) => ({
            id: r.dataset.id, ordine: i + 1
          }));

          // Aggiorna locale
          newOrder.forEach(({id, ordine}) => {
            const p = prodotti.find(x => String(x.id) === id);
            if (p) p.ordine = ordine;
          });

          // Salva DB
          await Promise.all(newOrder.map(({id, ordine}) =>
            supabase.from('prodotti_vendita').update({ ordine }).eq('id', id)
          ));
        });
      });
    }
  }

  function selectProdotto(id) {
    const p = prodotti.find(x => String(x.id) === String(id))
    if (!p) return

    prodottoAttivo = p
    tagsSelezionati = Array.isArray(p.tags) ? p.tags : []
    allergeniSelezionati = Array.isArray(p.allergeni) ? p.allergeni : []

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
    renderImgPreview(p.foto_url || "")
    qs("#prod-attivo").checked = p.attivo !== false
    qs("#prod-visibile").checked = p.visibile !== false
    qs("#prod-contesto").value = p.contesto || ""
    qs("#btn-delete").style.display = ""

    renderTags()
    renderAllergeniBox()
    renderFoodCostBox()
    openForm()
  }

  function resetForm() {
    prodottoAttivo = null
    tagsSelezionati = []
    allergeniSelezionati = []

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
    renderImgPreview("")
    qs("#prod-attivo").checked = true
    qs("#prod-visibile").checked = true
    qs("#prod-contesto").value = ""
    qs("#tag-input").value = ""
    qs("#btn-delete").style.display = "none"

    renderTags()
    renderAllergeniBox()
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

    const ricettaIdManuale = qs("#prod-ricetta").value || null
    const ricetta = ricette.find(r => String(r.id) === String(ricettaIdManuale))

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
      ricetta_id: ricettaIdManuale,
      foto_url: qs("#prod-img-url").value.trim() || null,
      prezzo_base: parseNullableNumber(qs("#prod-prezzo").value),
      iva: parseNullableNumber(qs("#prod-iva").value),
      porzione_default: parseNullableNumber(qs("#prod-porzione").value) || 1,
      unita_porzione: qs("#prod-um").value || "pz",
      food_cost_snapshot: foodCost,
      alert_food_cost: alertFoodCost,
      stato: alertFoodCost ? "bozza" : "completo",
      tags: tagsSelezionati,
      allergeni: allergeniSelezionati,
      attivo: qs("#prod-attivo").checked,
      visibile: qs("#prod-visibile").checked,
      contesto: qs("#prod-contesto").value || null
    }

    let prodottoSalvato = null

    if (prodottoAttivo?.id) {
      const { data, error } = await supabase
        .from("prodotti_vendita")
        .update(payload)
        .eq("id", prodottoAttivo.id)
        .eq("azienda_id", azienda_id)
        .select()
        .single()

      if (error) {
        console.error("Errore aggiornamento prodotto:", error)
        alert("Errore durante il salvataggio del prodotto.")
        return
      }

      prodottoSalvato = data
    } else {
      const { data, error } = await supabase
        .from("prodotti_vendita")
        .insert(payload)
        .select()
        .single()

      if (error) {
        console.error("Errore creazione prodotto:", error)
        alert("Errore durante il salvataggio del prodotto.")
        return
      }

      prodottoSalvato = data
    }

    if (!ricettaIdManuale && prodottoSalvato?.id) {
      const ricettaMinimaId = await ensureRicettaMinima({
        prodotto: prodottoSalvato,
        nome,
        descrizione: qs("#prod-descrizione").value.trim() || null
      })

      if (ricettaMinimaId) {
        await supabase
          .from("prodotti_vendita")
          .update({
            ricetta_id: ricettaMinimaId,
            food_cost_snapshot: null,
            alert_food_cost: true,
            stato: "bozza"
          })
          .eq("id", prodottoSalvato.id)
          .eq("azienda_id", azienda_id)
      }
    }

    await Promise.all([
      loadProdotti(),
      loadRicette()
    ])

    prodottiFiltrati = [...prodotti]
    renderRicettaOptions()
    renderProdotti()
    closeForm()
  }

   async function ensureRicettaMinima({ prodotto, nome, descrizione }) {
    if (!prodotto?.id) return null

    // già collegata
    if (prodotto.ricetta_id) {
      return prodotto.ricetta_id
    }

    // controllo esistenza (idempotente)
    const { data: ricettaEsistente, error: findError } = await supabase
      .from("ricette")
      .select("id")
      .eq("azienda_id", azienda_id)
      .eq("prodotto_vendita_id", prodotto.id)
      .maybeSingle()

    if (findError) {
      console.error("Errore ricerca ricetta esistente:", findError)
      return null
    }

    if (ricettaEsistente?.id) {
      return ricettaEsistente.id
    }

    // creazione unica
    const { data: nuovaRicetta, error: createError } = await supabase
      .from("ricette")
      .insert({
        azienda_id,
        nome,
        descrizione: descrizione || null,
        costo_totale: 0,
        costo_porzione: 0,
        stato_strutturale: "bozza",
        generata_automaticamente: true,
        origine: "prodotto",
        prodotto_vendita_id: prodotto.id,
        attivo: true
      })
      .select("id")
      .single()

    if (createError) {
      console.error("Errore creazione ricetta minima:", createError)
      alert("Prodotto salvato, ma non è stato possibile creare la ricetta bozza.")
      return null
    }

    return nuovaRicetta?.id || null
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
        🔴 Nessuna ricetta collegata. Al salvataggio verrà creata una ricetta minima in stato bozza.
      `
      return
    }

    const foodCost = Number(ricetta.costo_porzione || ricetta.costo_totale || 0)
    const stato = ricetta.stato_strutturale || "bozza"

    if (stato !== "completa") {
      qs("#food-cost-box").innerHTML = `
        🟡 Ricetta collegata ma non completa. Stato: <strong>${escapeHtml(stato)}</strong>.
      `
      return
    }

    if (!foodCost) {
      qs("#food-cost-box").innerHTML = `
        ⚠️ Ricetta completa ma food cost mancante.
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

  function renderAllergeniBox() {
    const box = qs("#prod-allergeni-box")
    box.innerHTML = ALLERGENI_UE.map(([id, label]) => `
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
        <input type="checkbox" class="prod-allergene-check" value="${id}" ${allergeniSelezionati.includes(id) ? "checked" : ""} style="accent-color:#0E5A7A;">
        ${label}
      </label>
    `).join("")

    box.querySelectorAll(".prod-allergene-check").forEach(chk => {
      chk.onchange = () => {
        if (chk.checked) {
          if (!allergeniSelezionati.includes(chk.value)) allergeniSelezionati.push(chk.value)
        } else {
          allergeniSelezionati = allergeniSelezionati.filter(a => a !== chk.value)
        }
      }
    })
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

  function renderImgPreview(url) {
    const box = qs("#prod-img-preview")
    if (url) {
      box.style.backgroundImage = `url('${url.replace(/'/g, "%27")}')`
      box.style.backgroundSize = "cover"
      box.style.backgroundPosition = "center"
      box.innerText = ""
    } else {
      box.style.backgroundImage = ""
      box.innerText = "Nessuna foto"
    }
  }

  async function uploadProductImage() {
    const file = qs("#prod-img-file").files?.[0]
    const status = qs("#prod-img-status")

    if (!file) return

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      status.textContent = "⚠️ Formato non valido. Usa JPG o PNG."
      status.style.color = "#dc2626"
      return
    }

    // Anteprima immediata locale, prima ancora che finisca l'upload
    const localPreview = URL.createObjectURL(file)
    renderImgPreview(localPreview)
    status.textContent = "⏳ Caricamento in corso..."
    status.style.color = "#64748b"

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
      status.textContent = "❌ Errore upload immagine. Riprova."
      status.style.color = "#dc2626"
      return
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path)

    qs("#prod-img-url").value = data?.publicUrl || ""
    renderImgPreview(data?.publicUrl || "")
    status.textContent = "✅ Foto caricata"
    status.style.color = "#16a34a"
  }

  async function deleteProdotto() {
    if (!prodottoAttivo?.id) return

    const nomeProdotto = prodottoAttivo.nome || "questo prodotto"

    // Controllo se il prodotto è già usato in un menu — avviso chiaro invece
    // di un errore DB criptico se c'è un vincolo di integrità referenziale
    const { count: usiMenu } = await supabase
      .from("menu_voci")
      .select("id", { count: "exact", head: true })
      .eq("prodotto_vendita_id", prodottoAttivo.id)

    let messaggioConferma = `Eliminare "${nomeProdotto}"? L'operazione non è reversibile.`
    if (usiMenu > 0) {
      messaggioConferma = `"${nomeProdotto}" è presente in ${usiMenu} men${usiMenu === 1 ? "ù" : "u"}. Eliminandolo verrà rimosso anche da lì. Continuare?`
    }

    if (!confirm(messaggioConferma)) return

    if (usiMenu > 0) {
      await supabase.from("menu_voci").delete().eq("prodotto_vendita_id", prodottoAttivo.id)
    }

    const { error } = await supabase
      .from("prodotti_vendita")
      .delete()
      .eq("id", prodottoAttivo.id)
      .eq("azienda_id", azienda_id)

    if (error) {
      console.error("Errore eliminazione prodotto:", error)

      // Vincolo di integrità referenziale: il prodotto è stato usato in
      // almeno una comanda/ordine passato. Il DB blocca giustamente la
      // cancellazione per non spezzare lo storico — proponiamo la
      // disattivazione al suo posto, che ottiene lo stesso risultato pratico
      // (il prodotto sparisce da menu/comande future) senza cancellare dati.
      if (error.code === "23503") {
        const disattiva = confirm(
          `"${nomeProdotto}" è presente in ordini/comande già registrati, quindi non può essere eliminato senza perdere lo storico.\n\n` +
          `Vuoi disattivarlo invece? Sparirà dai nuovi menu e comande, ma lo storico resterà intatto.`
        )
        if (disattiva) {
          const { error: errDisattiva } = await supabase
            .from("prodotti_vendita")
            .update({ attivo: false, visibile: false })
            .eq("id", prodottoAttivo.id)
            .eq("azienda_id", azienda_id)

          if (errDisattiva) {
            alert("Errore durante la disattivazione. " + (errDisattiva.message || ""))
            return
          }

          await loadAll()
          closeForm()
          alert(`"${nomeProdotto}" è stato disattivato.`)
        }
        return
      }

      alert("Errore durante l'eliminazione. " + (error.message || ""))
      return
    }

    prodotti = prodotti.filter(p => String(p.id) !== String(prodottoAttivo.id))
    prodottiFiltrati = [...prodotti]
    closeForm()
    renderProdotti()
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

  function qs(selector) {
    return container.querySelector(selector)
  }
}
