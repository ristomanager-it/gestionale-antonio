let ricette = []
let reparti = []
let dipendenti = []

let currentDate = new Date()
let repartoAttivoId = null
let currentView = "week"

export async function render(container){

  const azienda = window.state.azienda
  const sede = window.state.sedeAttiva

  if(!azienda || !sede){
    container.innerHTML = `<div class="view">Errore azienda/sede</div>`
    return
  }

  await loadRicette()
  await loadReparti()
  await loadDipendenti()

  container.innerHTML = `
    <div class="view">

      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:14px;">
        <div>
          <h2 style="margin:0;">📅 Planning Produzione</h2>
          <div class="small-muted" id="planner-range-label" style="margin-top:4px;"></div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="app-button small gray" onclick="window.location.hash='#/produzione'">
            ← Centro Produzione
          </button>
        </div>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
        <button id="view-day-btn" class="app-button small" onclick="window.plannerProduzioneSetView('day')">
          Day
        </button>
        <button id="view-week-btn" class="app-button small" onclick="window.plannerProduzioneSetView('week')">
          Week
        </button>
        <button id="view-month-btn" class="app-button small" onclick="window.plannerProduzioneSetView('month')">
          Month
        </button>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;" id="reparti-tabs">
        ${reparti.map(r => `
          <button
            id="reparto-btn-${r.id}"
            class="app-button small"
            onclick="window.plannerProduzioneSetReparto('${r.id}')">
            ${escapeHtml(r.nome)}
          </button>
        `).join("")}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="app-button small gray" onclick="window.plannerProduzionePrev()">←</button>
          <button class="app-button small gray" onclick="window.plannerProduzioneToday()">Oggi</button>
          <button class="app-button small gray" onclick="window.plannerProduzioneNext()">→</button>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button id="quick-add-btn" class="app-button primary" onclick="window.plannerProduzioneOpenCreate()">
            ➕ Nuova Produzione
          </button>
        </div>
      </div>

      <div id="calendar"></div>

    </div>

    <style>
      .planner-grid-week,
      .planner-grid-month{
        display:grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap:10px;
      }

      .planner-grid-day{
        display:grid;
        grid-template-columns: 1fr;
        gap:10px;
      }

      .planner-day-col{
        border:1px solid #e5e7eb;
        border-radius:12px;
        padding:10px;
        min-height:180px;
        background:#fff;
      }

      .planner-month-cell{
        border:1px solid #e5e7eb;
        border-radius:12px;
        padding:10px;
        min-height:150px;
        background:#fff;
      }

      .planner-muted-day{
        opacity:.45;
      }

      .planner-day-header{
        font-weight:700;
        margin-bottom:6px;
      }

      .planner-day-sub{
        font-size:12px;
        color:#6b7280;
        margin-bottom:8px;
      }

      .planner-load{
        font-size:12px;
        color:#374151;
        margin-bottom:8px;
        padding:6px 8px;
        border-radius:8px;
        background:#f8fafc;
      }

      .planner-add-day{
        margin-top:8px;
        font-size:12px;
        color:#2563eb;
        cursor:pointer;
        user-select:none;
      }

      .planner-card{
        padding:8px;
        border-radius:10px;
        margin-bottom:8px;
        cursor:grab;
        font-size:13px;
        border:1px solid rgba(0,0,0,.06);
      }

      .planner-card:hover{
        transform:translateY(-1px);
      }

      .planner-card-title{
        font-weight:700;
        margin-bottom:4px;
      }

      .planner-card-meta{
        font-size:12px;
        opacity:.9;
        line-height:1.35;
      }

      .stato-da_fare{
        background:#f8fafc;
      }

      .stato-in_corso{
        background:#fef3c7;
      }

      .stato-completato{
        background:#dcfce7;
      }

      .planner-modal{
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:16px;
        background:#fff;
        box-shadow:0 8px 24px rgba(0,0,0,.06);
      }

      .planner-form-grid{
        display:grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap:12px;
      }

      .planner-form-grid .full{
        grid-column:1 / -1;
      }

      .planner-field{
        display:flex;
        flex-direction:column;
        gap:6px;
      }

      .planner-field label{
        font-size:12px;
        font-weight:600;
        color:#374151;
      }

      .planner-field input,
      .planner-field select,
      .planner-field textarea{
        width:100%;
        padding:10px;
        border-radius:10px;
        border:1px solid #d1d5db;
        box-sizing:border-box;
        font:inherit;
        background:#fff;
      }

      .planner-field textarea{
        min-height:90px;
        resize:vertical;
      }

      .planner-ai-box{
        border:1px solid #dbeafe;
        background:#eff6ff;
        color:#1d4ed8;
        border-radius:12px;
        padding:10px;
        font-size:13px;
      }

      .planner-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:14px;
      }

      .planner-empty{
        border:1px dashed #d1d5db;
        border-radius:12px;
        padding:20px;
        text-align:center;
        color:#6b7280;
        background:#fff;
      }

      @media (max-width: 980px){
        .planner-grid-week,
        .planner-grid-month{
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .planner-form-grid{
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 640px){
        .planner-grid-week,
        .planner-grid-month{
          grid-template-columns: 1fr;
        }
      }
    </style>
  `

  ensureWindowBindings()
  refreshToolbarState()
  await renderCurrentView()
}

function ensureWindowBindings(){
  window.plannerProduzioneSetView = async function(view){
    currentView = view
    refreshToolbarState()
    await renderCurrentView()
  }

  window.plannerProduzioneSetReparto = async function(id){
    repartoAttivoId = id
    await loadDipendenti()
    refreshToolbarState()
    await renderCurrentView()
  }

  window.plannerProduzionePrev = async function(){
    if(currentView === "day"){
      currentDate.setDate(currentDate.getDate() - 1)
    } else if(currentView === "week"){
      currentDate.setDate(currentDate.getDate() - 7)
    } else {
      currentDate.setMonth(currentDate.getMonth() - 1)
    }
    await renderCurrentView()
  }

  window.plannerProduzioneNext = async function(){
    if(currentView === "day"){
      currentDate.setDate(currentDate.getDate() + 1)
    } else if(currentView === "week"){
      currentDate.setDate(currentDate.getDate() + 7)
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
    await renderCurrentView()
  }

  window.plannerProduzioneToday = async function(){
    currentDate = new Date()
    await renderCurrentView()
  }

  window.plannerProduzioneOpenCreate = async function(dateStr){
    const date = dateStr || formatDateLocal(new Date())
    await openCreate(date)
  }

  window.plannerProduzioneCancelForm = async function(){
    await renderCurrentView()
  }

  window.plannerProduzioneSave = async function(mode, id, date){
    await saveProduzione(mode, id, date)
  }

  window.plannerProduzioneDelete = async function(id){
    await deleteProduzione(id)
  }

  window.plannerProduzioneOpenEdit = async function(id){
    await openEdit(id)
  }

  window.plannerProduzioneGoPreparazione = function(id){
    window.location.hash = `#/preparazioni?planner_id=${id}`
  }
}

function refreshToolbarState(){
  const viewIds = ["day", "week", "month"]
  viewIds.forEach(v => {
    const btn = document.getElementById(`view-${v}-btn`)
    if(btn){
      btn.style.opacity = currentView === v ? "1" : ".75"
      btn.style.fontWeight = currentView === v ? "700" : "500"
    }
  })

  reparti.forEach(r => {
    const btn = document.getElementById(`reparto-btn-${r.id}`)
    if(btn){
      btn.style.opacity = repartoAttivoId === r.id ? "1" : ".75"
      btn.style.fontWeight = repartoAttivoId === r.id ? "700" : "500"
    }
  })
}

async function loadRicette(){
  const { data } = await window.supabaseClient
    .from("ricette")
    .select("id, nome")
    .eq("azienda_id", window.state.azienda.id)
    .eq("attivo", true)
    .order("nome", { ascending: true })

  ricette = data || []
}

async function loadReparti(){
  const { data } = await window.supabaseClient
    .from("reparti")
    .select("*")
    .eq("azienda_id", window.state.azienda.id)
    .order("nome", { ascending: true })

  reparti = data || []

  if(reparti.length && !repartoAttivoId){
    repartoAttivoId = reparti[0].id
  }
}

async function loadDipendenti(){
  const sede = window.state.sedeAttiva
  const azienda = window.state.azienda

  if(!repartoAttivoId || !sede?.id || !azienda?.id){
    dipendenti = []
    return
  }

  const { data } = await window.supabaseClient
    .from("dipendenti")
    .select("id, nome, cognome")
    .eq("azienda_id", azienda.id)
    .eq("sede_id", sede.id)
    .eq("reparto_id", repartoAttivoId)
    .eq("attivo", true)
    .order("nome", { ascending: true })

  dipendenti = data || []
}

async function renderCurrentView(){
  if(!repartoAttivoId){
    document.getElementById("calendar").innerHTML = `
      <div class="planner-empty">
        Nessun reparto disponibile.
      </div>
    `
    document.getElementById("planner-range-label").textContent = ""
    return
  }

  if(currentView === "day"){
    await renderDayView()
    return
  }

  if(currentView === "month"){
    await renderMonthView()
    return
  }

  await renderWeekView()
}

async function fetchProduzioniRange(startStr, endStr){
  const supabase = window.supabaseClient
  const azienda = window.state.azienda
  const sede = window.state.sedeAttiva

  const { data } = await supabase
    .from("produzioni_settimanali")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("sede_id", sede.id)
    .eq("reparto_id", repartoAttivoId)
    .gte("data", startStr)
    .lte("data", endStr)
    .order("data", { ascending: true })
    .order("created_at", { ascending: true })

  return data || []
}

async function renderDayView(){
  const dateStr = formatDateLocal(currentDate)
  const righe = await fetchProduzioniRange(dateStr, dateStr)

  document.getElementById("planner-range-label").textContent =
    currentDate.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    })

  document.getElementById("calendar").innerHTML = `
    <div class="planner-grid-day">
      ${renderSingleDayColumn(currentDate, righe, false)}
    </div>
  `

  bindCalendarEvents()
}

async function renderWeekView(){
  const start = startOfWeek(currentDate)
  const days = []
  for(let i = 0; i < 7; i++){
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }

  const startStr = formatDateLocal(days[0])
  const endStr = formatDateLocal(days[6])
  const righe = await fetchProduzioniRange(startStr, endStr)

  document.getElementById("planner-range-label").textContent =
    `${days[0].toLocaleDateString("it-IT")} - ${days[6].toLocaleDateString("it-IT")}`

  document.getElementById("calendar").innerHTML = `
    <div class="planner-grid-week">
      ${days.map(day => renderSingleDayColumn(day, righe, false)).join("")}
    </div>
  `

  bindCalendarEvents()
}

async function renderMonthView(){
  const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  const gridStart = startOfWeek(first)
  const gridEnd = endOfWeek(last)

  const startStr = formatDateLocal(gridStart)
  const endStr = formatDateLocal(gridEnd)
  const righe = await fetchProduzioniRange(startStr, endStr)

  document.getElementById("planner-range-label").textContent =
    currentDate.toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric"
    })

  const days = []
  const cursor = new Date(gridStart)
  while(cursor <= gridEnd){
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  document.getElementById("calendar").innerHTML = `
    <div class="planner-grid-month">
      ${days.map(day => renderSingleDayColumn(day, righe, day.getMonth() !== currentDate.getMonth())).join("")}
    </div>
  `

  bindCalendarEvents()
}

function renderSingleDayColumn(day, righe, muted){
  const dateStr = formatDateLocal(day)
  const items = righe.filter(r => r.data === dateStr)

  const totaleMinuti = items.reduce((sum, r) => {
    return sum + Number(r.tempo_stimato_minuti || 0)
  }, 0)

  const containerClass = currentView === "month" ? "planner-month-cell" : "planner-day-col"
  const mutedClass = muted ? "planner-muted-day" : ""

  return `
    <div class="${containerClass} ${mutedClass}" data-date="${dateStr}">
      <div class="planner-day-header">
        ${day.toLocaleDateString("it-IT", {
          weekday: currentView === "month" ? "short" : "long",
          day: "2-digit",
          month: currentView === "day" ? "long" : "2-digit"
        })}
      </div>

      <div class="planner-day-sub">
        ${items.length} lavorazioni
      </div>

      <div class="planner-load">
        ⏱ ${totaleMinuti} min
      </div>

      ${items.map(renderCard).join("")}

      <div class="planner-add-day" data-date="${dateStr}">
        + aggiungi produzione
      </div>
    </div>
  `
}

function renderCard(r){
  const nomeDipendente = getDipendenteLabel(r.dipendente_id)

  return `
    <div
      class="planner-card stato-${escapeAttr(r.stato || "da_fare")}"
      draggable="true"
      data-id="${r.id}">
      <div class="planner-card-title">
        ${escapeHtml(r.prodotto || "Produzione")}
      </div>

      <div class="planner-card-meta">
        Q.tà: ${formatNumber(r.quantita)}<br>
        Operatore: ${escapeHtml(nomeDipendente)}<br>
        Tempo: ${r.tempo_stimato_minuti ? `${r.tempo_stimato_minuti} min` : "—"}<br>
        Stato: ${formatStato(r.stato)}
      </div>
    </div>
  `
}

function bindCalendarEvents(){
  document.querySelectorAll(".planner-card").forEach(card => {
    card.ondragstart = e => {
      e.dataTransfer.setData("id", card.dataset.id)
    }

    card.onclick = () => {
      window.plannerProduzioneOpenEdit(card.dataset.id)
    }
  })

  document.querySelectorAll("[data-date]").forEach(day => {
    day.ondragover = e => e.preventDefault()

    day.ondrop = async e => {
      if(!day.classList.contains("planner-day-col") && !day.classList.contains("planner-month-cell")){
        return
      }

      e.preventDefault()

      const id = e.dataTransfer.getData("id")
      const newDate = day.dataset.date

      if(!id || !newDate) return

      await window.supabaseClient
        .from("produzioni_settimanali")
        .update({ data: newDate })
        .eq("id", id)

      await renderCurrentView()
    }
  })

  document.querySelectorAll(".planner-add-day").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation()
      const date = btn.dataset.date
      await openCreate(date)
    }
  })
}

async function openCreate(date){
  await loadDipendenti()

  const calendar = document.getElementById("calendar")
  calendar.innerHTML = renderFormHtml({
    mode: "create",
    date,
    record: {
      prodotto: "",
      quantita: 1,
      ricetta_id: "",
      dipendente_id: "",
      tempo_stimato_minuti: "",
      stato: "da_fare",
      note: ""
    },
    suggerimento: null
  })

  bindFormEvents("create", null, date)
}

async function openEdit(id){
  await loadDipendenti()

  const { data } = await window.supabaseClient
    .from("produzioni_settimanali")
    .select("*")
    .eq("id", id)
    .single()

  if(!data){
    await renderCurrentView()
    return
  }

  const prodottoRef = (data.prodotto || "").trim()
  const suggerimento = prodottoRef
    ? await getStoricoSuggerimento(prodottoRef, repartoAttivoId)
    : null

  const calendar = document.getElementById("calendar")
  calendar.innerHTML = renderFormHtml({
    mode: "edit",
    id,
    date: data.data,
    record: {
      prodotto: data.prodotto || "",
      quantita: data.quantita || 1,
      ricetta_id: data.ricetta_id || "",
      dipendente_id: data.dipendente_id || "",
      tempo_stimato_minuti: data.tempo_stimato_minuti || "",
      stato: data.stato || "da_fare",
      note: data.note || ""
    },
    suggerimento
  })

  bindFormEvents("edit", id, data.data)
}

function renderFormHtml({ mode, id, date, record, suggerimento }){
  const titolo = mode === "edit" ? "Modifica Produzione" : "Nuova Produzione"

  return `
    <div class="planner-modal">
      <h3 style="margin-top:0; margin-bottom:14px;">${titolo}</h3>

      <div class="planner-form-grid">

        <div class="planner-field">
          <label>Data</label>
          <input id="planner-data" type="date" value="${escapeAttr(date || formatDateLocal(new Date()))}">
        </div>

        <div class="planner-field">
          <label>Stato</label>
          <select id="planner-stato">
            <option value="da_fare" ${record.stato === "da_fare" ? "selected" : ""}>Da fare</option>
            <option value="in_corso" ${record.stato === "in_corso" ? "selected" : ""}>In corso</option>
            <option value="completato" ${record.stato === "completato" ? "selected" : ""}>Completato</option>
          </select>
        </div>

        <div class="planner-field full">
          <label>Prodotto / Lavorazione</label>
          <input id="planner-prodotto" type="text" value="${escapeAttr(record.prodotto || "")}" placeholder="Es. Ragù, pane, mise en place, impasto pizza">
        </div>

        <div class="planner-field">
          <label>Ricetta</label>
          <select id="planner-ricetta">
            <option value="">Nessuna</option>
            ${ricette.map(r => `
              <option value="${r.id}" ${String(record.ricetta_id || "") === String(r.id) ? "selected" : ""}>
                ${escapeHtml(r.nome)}
              </option>
            `).join("")}
          </select>
        </div>

        <div class="planner-field">
          <label>Quantità</label>
          <input id="planner-quantita" type="number" step="0.01" min="0" value="${escapeAttr(record.quantita ?? 1)}">
        </div>

        <div class="planner-field full">
          <div id="planner-ai-box" class="planner-ai-box">
            ${renderSuggerimentoText(suggerimento)}
          </div>
        </div>

        <div class="planner-field">
          <label>Chi lo fa</label>
          <select id="planner-dipendente">
            <option value="">Seleziona operatore</option>
            ${dipendenti.map(d => `
              <option value="${d.id}" ${String(record.dipendente_id || "") === String(d.id) ? "selected" : ""}>
                ${escapeHtml(`${d.nome || ""} ${d.cognome || ""}`.trim())}
              </option>
            `).join("")}
          </select>
        </div>

        <div class="planner-field">
          <label>Tempo stimato medio (min)</label>
          <input id="planner-tempo" type="number" min="0" value="${escapeAttr(record.tempo_stimato_minuti || "")}" placeholder="Es. 45">
        </div>

        <div class="planner-field full">
          <label>Note</label>
          <textarea id="planner-note" placeholder="Dettagli operativi, priorità, note utili">${escapeHtml(record.note || "")}</textarea>
        </div>

      </div>

      <div class="planner-actions">
        <button class="app-button primary" onclick="window.plannerProduzioneSave('${mode}', '${id || ""}', '${date || ""}')">
          Salva
        </button>

        ${mode === "edit" ? `
          <button class="app-button small gray" onclick="window.plannerProduzioneGoPreparazione('${id}')">
            Apri lavorazione
          </button>
          <button class="app-button small gray" onclick="window.plannerProduzioneDelete('${id}')">
            Elimina
          </button>
        ` : ""}

        <button class="app-button small gray" onclick="window.plannerProduzioneCancelForm()">
          Annulla
        </button>
      </div>
    </div>
  `
}

function bindFormEvents(mode, id, fallbackDate){
  const prodottoInput = document.getElementById("planner-prodotto")
  const ricettaSelect = document.getElementById("planner-ricetta")
  const dipendenteSelect = document.getElementById("planner-dipendente")
  const tempoInput = document.getElementById("planner-tempo")

  async function refreshSuggerimento(){
    const prodottoManuale = (prodottoInput?.value || "").trim()
    const ricettaId = ricettaSelect?.value || ""
    const ricetta = ricette.find(r => String(r.id) === String(ricettaId))
    const riferimento = prodottoManuale || ricetta?.nome || ""

    if(!riferimento){
      document.getElementById("planner-ai-box").innerHTML = renderSuggerimentoText(null)
      return
    }

    const suggerimento = await getStoricoSuggerimento(riferimento, repartoAttivoId)
    document.getElementById("planner-ai-box").innerHTML = renderSuggerimentoText(suggerimento)

    if(suggerimento){
      if(!dipendenteSelect.value && suggerimento.dipendente_id){
        dipendenteSelect.value = suggerimento.dipendente_id
      }

      if(!tempoInput.value && suggerimento.tempo_medio){
        tempoInput.value = suggerimento.tempo_medio
      }
    }
  }

  if(ricettaSelect){
    ricettaSelect.onchange = () => {
      const ricetta = ricette.find(r => String(r.id) === String(ricettaSelect.value))
      if(ricetta && !prodottoInput.value.trim()){
        prodottoInput.value = ricetta.nome || ""
      }
      refreshSuggerimento()
    }
  }

  if(prodottoInput){
    prodottoInput.onchange = refreshSuggerimento
    prodottoInput.onblur = refreshSuggerimento
  }

  refreshSuggerimento()
}

async function saveProduzione(mode, id, fallbackDate){
  const azienda = window.state.azienda
  const sede = window.state.sedeAttiva

  const data = document.getElementById("planner-data").value || fallbackDate || formatDateLocal(new Date())
  const prodotto = (document.getElementById("planner-prodotto").value || "").trim()
  const quantita = Number(document.getElementById("planner-quantita").value || 0)
  const ricetta_id = document.getElementById("planner-ricetta").value || null
  const dipendente_id = document.getElementById("planner-dipendente").value || null
  const tempo_stimato_minuti = parseInt(document.getElementById("planner-tempo").value || 0, 10) || null
  const stato = document.getElementById("planner-stato").value || "da_fare"
  const note = (document.getElementById("planner-note").value || "").trim() || null

  if(!prodotto){
    alert("Inserisci il nome della lavorazione/prodotto")
    return
  }

  if(!quantita || quantita <= 0){
    alert("Inserisci una quantità valida")
    return
  }

  const payload = {
    azienda_id: azienda.id,
    sede_id: sede.id,
    reparto_id: repartoAttivoId,
    data,
    prodotto,
    quantita,
    ricetta_id,
    dipendente_id,
    tempo_stimato_minuti,
    stato,
    note
  }

  if(mode === "edit" && id){
    await window.supabaseClient
      .from("produzioni_settimanali")
      .update(payload)
      .eq("id", id)
  } else {
    await window.supabaseClient
      .from("produzioni_settimanali")
      .insert(payload)
  }

  await renderCurrentView()
}

async function deleteProduzione(id){
  const conferma = window.confirm("Eliminare questa produzione?")
  if(!conferma) return

  await window.supabaseClient
    .from("produzioni_settimanali")
    .delete()
    .eq("id", id)

  await renderCurrentView()
}

async function getStoricoSuggerimento(prodotto, repartoId){
  const azienda = window.state.azienda

  const { data } = await window.supabaseClient
    .from("produzioni_settimanali")
    .select("dipendente_id, tempo_stimato_minuti, prodotto")
    .eq("azienda_id", azienda.id)
    .eq("reparto_id", repartoId)
    .eq("prodotto", prodotto)
    .not("dipendente_id", "is", null)

  const rows = data || []

  if(!rows.length){
    return null
  }

  const perDipendente = {}

  rows.forEach(r => {
    if(!r.dipendente_id) return

    if(!perDipendente[r.dipendente_id]){
      perDipendente[r.dipendente_id] = {
        count: 0,
        tempoTotale: 0,
        tempiCount: 0
      }
    }

    perDipendente[r.dipendente_id].count += 1

    if(r.tempo_stimato_minuti){
      perDipendente[r.dipendente_id].tempoTotale += Number(r.tempo_stimato_minuti)
      perDipendente[r.dipendente_id].tempiCount += 1
    }
  })

  let bestId = null
  let bestCount = 0

  Object.keys(perDipendente).forEach(id => {
    if(perDipendente[id].count > bestCount){
      bestCount = perDipendente[id].count
      bestId = id
    }
  })

  if(!bestId){
    return null
  }

  const best = perDipendente[bestId]
  const tempo_medio = best.tempiCount > 0
    ? Math.round(best.tempoTotale / best.tempiCount)
    : null

  return {
    dipendente_id: bestId,
    nome_dipendente: getDipendenteLabel(bestId),
    ricorrenza: best.count,
    tempo_medio
  }
}

function renderSuggerimentoText(suggerimento){
  if(!suggerimento){
    return `
      <strong>Tony memoria operativa</strong><br>
      Ancora nessun dato storico utile per suggerire chi svolge più spesso questa lavorazione o il tempo medio.
    `
  }

  return `
    <strong>Tony memoria operativa</strong><br>
    Operatore più ricorrente: <strong>${escapeHtml(suggerimento.nome_dipendente || "—")}</strong><br>
    Frequenza storica: <strong>${suggerimento.ricorrenza}</strong> volte<br>
    Tempo medio storico: <strong>${suggerimento.tempo_medio ? `${suggerimento.tempo_medio} min` : "—"}</strong><br>
    Puoi confermare o cambiare manualmente.
  `
}

function getDipendenteLabel(id){
  if(!id) return "Non assegnato"
  const dip = dipendenti.find(d => String(d.id) === String(id))
  if(!dip) return "Non assegnato"
  return `${dip.nome || ""} ${dip.cognome || ""}`.trim() || "Non assegnato"
}

function startOfWeek(date){
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + diff)
  return d
}

function endOfWeek(date){
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(0, 0, 0, 0)
  return end
}

function formatDateLocal(date){
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatNumber(value){
  const num = Number(value || 0)
  if(Number.isInteger(num)) return String(num)
  return num.toFixed(2)
}

function formatStato(stato){
  if(stato === "in_corso") return "In corso"
  if(stato === "completato") return "Completato"
  return "Da fare"
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function escapeAttr(value){
  return escapeHtml(value)
}
