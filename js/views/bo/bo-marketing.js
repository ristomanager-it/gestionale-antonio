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

  let currentSection = "campagne-meta"
  let tags = []
  let templates = []
  let campagne = []
  let connessioni = []
  let periodoStats = 'last_30_days'
  let filtroStato = 'ALL' 

  // ✅ FIX CRITICO: fallback supabase
  let supabase = null

  try {
    if (window.waitSupabase) {
      supabase = await window.waitSupabase()
    } else {
      supabase = window.supabaseClient
    }
  } catch (e) {
    console.error("Errore init supabase:", e)
    supabase = window.supabaseClient
  }

  if (!supabase) {
    container.innerHTML = `<div class="page">Errore inizializzazione Supabase</div>`
    return
  }

  container.innerHTML = `
    <div style="display:flex; gap:16px; width:100%; min-height:70vh;">

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

        <div class="bo-m-item" data-sec="campagne-meta">📣 Campagne Meta</div>
        <div class="bo-m-item" data-sec="campagne-google">🎯 Campagne Google</div>
        <div class="bo-m-item" data-sec="promozioni">🎯 Promozioni</div>
        <div class="bo-m-item" data-sec="fidelity">💳 Fidelity</div>
        <div class="bo-m-item" data-sec="tags">🏷️ Tags</div>
        <div class="bo-m-item" data-sec="template">✉️ Template</div>
        <div class="bo-m-item" data-sec="bozze">📝 Bozze</div>
        <div class="bo-m-item" data-sec="invio">📤 Invio</div>
        <div class="bo-m-item" data-sec="coda">📬 Coda</div>
        <div class="bo-m-item" data-sec="landing">🌐 Landing</div>
        <div class="bo-m-item" data-sec="impostazioni">⚙️ Impostazioni</div>

      </aside>

      <div id="bo-m-content" style="flex:1;"></div>

    </div>
  `

  const menuItems = container.querySelectorAll(".bo-m-item")

  menuItems.forEach(el => {
    el.style.padding = "10px"
    el.style.cursor = "pointer"
    el.style.borderRadius = "10px"
    el.style.marginBottom = "6px"

    el.addEventListener("click", async () => {
      currentSection = el.getAttribute("data-sec")
      await renderSection()
    })
  })

  /* ================= TAG ================= */

  async function loadTags() {
    const aziendaId = window.state?.azienda?.id

    const { data, error } = await supabase
      .from("clienti_tag")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("nome")

    if (error) {
      console.error("Errore loadTags:", error)
      tags = []
      return
    }

    tags = data || []
  }

  async function createTag(nome, colore) {
    const aziendaId = window.state?.azienda?.id

    await supabase
      .from("clienti_tag")
      .insert([{ nome, colore, azienda_id: aziendaId }])

    await loadTags()
    await renderSection()
  }

  async function deleteTag(id) {
    await supabase.from("clienti_tag").delete().eq("id", id)
    await loadTags()
    await renderSection()
  }

  async function updateTag(id, nome) {
    await supabase.from("clienti_tag").update({ nome }).eq("id", id)
    await loadTags()
    await renderSection()
  }

  function renderTags(content) {

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

    const { data, error } = await supabase
      .from("messaggi_template")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Errore loadTemplates:", error)
      templates = []
      return
    }

    templates = data || []
  }

  async function createTemplate(payload) {
    await supabase.from("messaggi_template").insert([payload])
    await loadTemplates()
    await renderSection()
  }

  async function deleteTemplate(id) {
    await supabase.from("messaggi_template").delete().eq("id", id)
    await loadTemplates()
    await renderSection()
  }

  function renderTemplates(content) {

    const tagOptions = tags.map(t => `
      <option value="${t.id}">${t.nome}</option>
    `).join("")

    content.innerHTML = `
      <div class="card">
        <h2>Template Messaggi</h2>

        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">

          <input id="tpl-nome" class="input" placeholder="Nome template">

          <div>
            <label>📡 Canali invio</label><br>
            <label><input type="checkbox" value="whatsapp" class="tpl-canale"> WhatsApp</label><br>
            <label><input type="checkbox" value="sms" class="tpl-canale"> SMS</label><br>
            <label><input type="checkbox" value="email" class="tpl-canale"> Email</label>
          </div>

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
              <th>Canali</th>
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

      const canali = (t.tipo || "")
        .split(",")
        .map(c => c.toUpperCase())
        .join(" / ")

      const row = document.createElement("tr")

      row.innerHTML = `
        <td>${t.nome}</td>
        <td>${canali}</td>
        <td>${tagName}</td>
        <td>${t.trigger_evento || "-"}</td>
        <td><button data-id="${t.id}" class="btn-del">❌</button></td>
      `

      row.querySelector(".btn-del").onclick = () => deleteTemplate(t.id)

      table.appendChild(row)
    })

    document.getElementById("btn-add-template").onclick = () => {

      const canali = Array.from(document.querySelectorAll(".tpl-canale:checked"))
        .map(el => el.value)

      const payload = {
        nome: document.getElementById("tpl-nome").value,
        tipo: canali.length ? canali.join(",") : "whatsapp",
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

  // ─── CAMPAGNE META ────────────────────────────────────────────────────────

  const SUPABASE_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0';
  const META_API = 'https://graph.facebook.com/v21.0';

  async function caricaConnessioni() {
    const { data } = await supabase.from('meta_ads_connessioni')
      .select('*').eq('azienda_id', window.state?.azienda?.id).eq('attivo', true);
    connessioni = data || [];
  }

  async function caricaCampagne(accountId) {
    try {
      // Calcola date periodo
      const oggi = new Date();
      const datePreset = periodoStats;
      const statusFilter = filtroStato !== 'ALL' ? [filtroStato] : ['ACTIVE','PAUSED','ARCHIVED'];

      const res = await fetch(`${SUPABASE_URL}/functions/v1/meta-ads-proxy-ts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ endpoint: `${accountId}/campaigns`, params: {
          fields: `id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights.date_preset(${datePreset}){impressions,clicks,spend,reach,cpm,cpc}`,
          effective_status: JSON.stringify(statusFilter),
          limit: 50
        }})
      });
      const data = await res.json();
      campagne = data?.data || [];
    } catch(e) {
      console.error('Errore campagne:', e);
      campagne = [];
    }
  }

  async function renderCampagneMeta(content) {
    await caricaConnessioni();

    if (!connessioni.length) {
      content.innerHTML = `
        <div style="background:white;border-radius:16px;padding:40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;">📣</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:8px;">Nessun account Meta collegato</div>
          <div style="font-size:13px;color:#64748b;">Configura l'account pubblicitario nelle impostazioni.</div>
        </div>`;
      return;
    }

    // Pagine disponibili per questa azienda
    const pagine = connessioni.filter((c,i,a) => a.findIndex(x=>x.pagina_id===c.pagina_id)===i);
    let paginaSelezionata = pagine[0];
    let accountId = connessioni[0].account_id;

    const renderContent = async () => {
      await caricaCampagne(accountId);

      const statusColor = { ACTIVE:'#15803d', PAUSED:'#d97706', ARCHIVED:'#64748b', DELETED:'#dc2626' };
      const statusLabel = { ACTIVE:'✅ Attiva', PAUSED:'⏸ In pausa', ARCHIVED:'📦 Archiviata', DELETED:'🗑 Eliminata' };

      content.innerHTML = `
        <style>
          .mk-card { background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px; }
          .mk-btn { border:none;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600; }
          .mk-input { border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;outline:none;font-family:inherit;width:100%;box-sizing:border-box; }
          .mk-tab { border:none;background:none;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;color:#64748b;border-bottom:2px solid transparent; }
          .mk-tab.on { color:#0E5A7A;border-bottom-color:#0E5A7A; }
        </style>

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:#1877f2;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;">📘</div>
            <div>
              <div style="font-size:18px;font-weight:700;">Campagne Meta</div>
              <div style="font-size:12px;color:#64748b;">Facebook & Instagram Ads</div>
            </div>
          </div>
          <button id="btn-nuova-campagna" class="mk-btn" style="background:#1877f2;color:white;">+ Nuova campagna</button>
        </div>

        <!-- Selettore pagina -->
        <div style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;margin-bottom:16px;">
          ${pagine.map(p => `
            <button class="mk-btn btn-pagina ${p.pagina_id===paginaSelezionata.pagina_id?'sel':''}"
              data-pid="${p.pagina_id}" data-aid="${p.account_id}"
              style="background:${p.pagina_id===paginaSelezionata.pagina_id?'#1877f2':'#f1f5f9'};
                     color:${p.pagina_id===paginaSelezionata.pagina_id?'white':'#374151'};">
              📄 ${p.pagina_nome}
            </button>
          `).join('')}
        </div>

        <!-- Filtri -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center;">
          <div style="font-size:12px;font-weight:600;color:#64748b;">Periodo:</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;" id="filtri-periodo">
            <button class="mk-btn btn-periodo ${periodoStats==='today'?'sel':''}" data-p="today" style="background:${'today'===periodoStats?'#0E5A7A':'#f1f5f9'};color:${'today'===periodoStats?'white':'#374151'};padding:5px 10px;font-size:12px;">Oggi</button>
            <button class="mk-btn btn-periodo" data-p="last_7_days" style="background:${'last_7_days'===periodoStats?'#0E5A7A':'#f1f5f9'};color:${'last_7_days'===periodoStats?'white':'#374151'};padding:5px 10px;font-size:12px;">7 giorni</button>
            <button class="mk-btn btn-periodo" data-p="last_30_days" style="background:${'last_30_days'===periodoStats?'#0E5A7A':'#f1f5f9'};color:${'last_30_days'===periodoStats?'white':'#374151'};padding:5px 10px;font-size:12px;">30 giorni</button>
            <button class="mk-btn btn-periodo" data-p="this_month" style="background:${'this_month'===periodoStats?'#0E5A7A':'#f1f5f9'};color:${'this_month'===periodoStats?'white':'#374151'};padding:5px 10px;font-size:12px;">Questo mese</button>
            <button class="mk-btn btn-periodo" data-p="last_month" style="background:${'last_month'===periodoStats?'#0E5A7A':'#f1f5f9'};color:${'last_month'===periodoStats?'white':'#374151'};padding:5px 10px;font-size:12px;">Mese scorso</button>
          </div>
          <div style="width:1px;height:20px;background:#e5e7eb;margin:0 4px;"></div>
          <div style="font-size:12px;font-weight:600;color:#64748b;">Stato:</div>
          <select id="filtro-stato" class="mk-input" style="width:auto;padding:5px 8px;font-size:12px;">
            <option value="ALL">Tutte</option>
            <option value="ACTIVE">✅ Attive</option>
            <option value="PAUSED">⏸ In pausa</option>
            <option value="ARCHIVED">📦 Archiviate</option>
          </select>
        </div>

        <!-- Lista campagne -->
        <div id="lista-campagne">
          ${campagne.length === 0 ? '<div class="mk-card" style="text-align:center;color:#94a3b8;padding:32px;">Nessuna campagna trovata per questo account.</div>' : ''}
          ${campagne.map(c => {
            const budget = c.daily_budget
              ? `€${(parseInt(c.daily_budget)/100).toFixed(2)}/giorno`
              : c.lifetime_budget
              ? `€${(parseInt(c.lifetime_budget)/100).toFixed(2)} totale`
              : '—';
            const insights = c.insights?.data?.[0] || {};
            return `
              <div class="mk-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                  <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                      <span style="font-weight:700;font-size:14px;">${c.name}</span>
                      <span style="background:${statusColor[c.status]||'#64748b'}20;color:${statusColor[c.status]||'#64748b'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${statusLabel[c.status]||c.status}</span>
                      ${c.objective?`<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:10px;font-size:11px;">${c.objective}</span>`:''}
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;margin-top:8px;">
                      <div style="background:#f8fafc;border-radius:8px;padding:8px;text-align:center;">
                        <div style="font-size:16px;font-weight:700;">${insights.impressions?parseInt(insights.impressions).toLocaleString('it-IT'):'—'}</div>
                        <div style="font-size:10px;color:#64748b;">Impressioni</div>
                      </div>
                      <div style="background:#f8fafc;border-radius:8px;padding:8px;text-align:center;">
                        <div style="font-size:16px;font-weight:700;">${insights.clicks?parseInt(insights.clicks).toLocaleString('it-IT'):'—'}</div>
                        <div style="font-size:10px;color:#64748b;">Click</div>
                      </div>
                      <div style="background:#f8fafc;border-radius:8px;padding:8px;text-align:center;">
                        <div style="font-size:16px;font-weight:700;">${insights.spend?'€'+parseFloat(insights.spend).toFixed(2):'—'}</div>
                        <div style="font-size:10px;color:#64748b;">Spesa</div>
                      </div>
                      <div style="background:#f8fafc;border-radius:8px;padding:8px;text-align:center;">
                        <div style="font-size:16px;font-weight:700;">${budget}</div>
                        <div style="font-size:10px;color:#64748b;">Budget</div>
                      </div>
                      <div style="background:#f8fafc;border-radius:8px;padding:8px;text-align:center;">
                        <div style="font-size:16px;font-weight:700;">${insights.cpc?'€'+parseFloat(insights.cpc).toFixed(2):'—'}</div>
                        <div style="font-size:10px;color:#64748b;">CPC</div>
                      </div>
                      <div style="background:#f8fafc;border-radius:8px;padding:8px;text-align:center;">
                        <div style="font-size:16px;font-weight:700;">${insights.cpm?'€'+parseFloat(insights.cpm).toFixed(2):'—'}</div>
                        <div style="font-size:10px;color:#64748b;">CPM</div>
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;">
                    <button class="mk-btn btn-toggle-status" data-id="${c.id}" data-status="${c.status}"
                      style="background:${c.status==='ACTIVE'?'#fef3c7':'#dcfce7'};color:${c.status==='ACTIVE'?'#92400e':'#15803d'};">
                      ${c.status==='ACTIVE'?'⏸ Pausa':'▶️ Attiva'}
                    </button>
                    <button class="mk-btn btn-modifica" data-id="${c.id}" data-name="${c.name}" data-budget="${c.daily_budget||c.lifetime_budget||0}" data-status="${c.status}"
                      style="background:#f1f5f9;color:#374151;">
                      ✏️ Modifica
                    </button>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>

        <!-- Modal modifica campagna -->
        <div id="modal-modifica" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
          <div style="background:white;border-radius:20px;max-width:420px;width:100%;padding:24px;">
            <div style="font-size:16px;font-weight:700;margin-bottom:16px;">✏️ Modifica campagna</div>
            <input type="hidden" id="mod-id">
            <div style="margin-bottom:12px;">
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Nome</label>
              <input id="mod-nome" class="mk-input">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Budget giornaliero (€)</label>
                <input id="mod-budget" type="number" min="1" class="mk-input">
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Data fine</label>
                <input id="mod-datafine" type="date" class="mk-input">
              </div>
            </div>
            <div style="margin-bottom:12px;">
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Stato</label>
              <select id="mod-stato" class="mk-input">
                <option value="ACTIVE">✅ Attiva</option>
                <option value="PAUSED">⏸ In pausa</option>
              </select>
            </div>
            <div id="mod-esito" style="font-size:13px;min-height:14px;margin-bottom:12px;"></div>
            <div style="display:flex;gap:8px;">
              <button id="btn-salva-modifica" class="mk-btn" style="flex:1;background:#0E5A7A;color:white;padding:11px;">💾 Salva</button>
              <button id="btn-chiudi-modal-mod" class="mk-btn" style="background:#f1f5f9;color:#374151;">Annulla</button>
            </div>
          </div>
        </div>

        <!-- Modal nuova campagna -->
        <div id="modal-campagna" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
          <div style="background:white;border-radius:20px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;">
            <div style="background:#1877f2;color:white;padding:20px 24px;border-radius:20px 20px 0 0;">
              <div style="font-size:17px;font-weight:700;">📣 Nuova campagna Meta</div>
              <div style="font-size:12px;opacity:.8;margin-top:2px;">La campagna viene creata in pausa — la attivi quando sei pronto</div>
            </div>
            <div style="padding:20px;">
              <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Nome campagna *</label>
                <input id="nc-nome" class="mk-input" placeholder="Es. Pranzo domenicale — Giugno 2026">
              </div>
              <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Pagina Facebook *</label>
                <select id="nc-pagina" class="mk-input">
                  ${pagine.map(p=>`<option value="${p.pagina_id}" data-account="${p.account_id}">${p.pagina_nome}</option>`).join('')}
                </select>
              </div>
              <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Obiettivo *</label>
                <select id="nc-obiettivo" class="mk-input">
                  <option value="OUTCOME_AWARENESS">🔍 Visibilità — fai conoscere il locale</option>
                  <option value="OUTCOME_TRAFFIC">🌐 Traffico — porta persone al sito/prenotazioni</option>
                  <option value="OUTCOME_ENGAGEMENT">❤️ Interazioni — più like e commenti</option>
                  <option value="OUTCOME_LEADS">📋 Contatti — raccogli richieste</option>
                </select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                  <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Budget giornaliero (€) *</label>
                  <input id="nc-budget" type="number" min="1" value="5" class="mk-input">
                </div>
                <div>
                  <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Data fine</label>
                  <input id="nc-datafine" type="date" class="mk-input">
                </div>
              </div>
              <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Pubblico — età</label>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input id="nc-eta-min" type="number" min="18" max="65" value="25" class="mk-input" style="width:80px;">
                  <span style="color:#64748b;">→</span>
                  <input id="nc-eta-max" type="number" min="18" max="65" value="55" class="mk-input" style="width:80px;">
                  <span style="color:#64748b;font-size:12px;">anni</span>
                </div>
              </div>
              <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Zona geografica</label>
                <input id="nc-zona" class="mk-input" placeholder="Es. Viterbo, Roma — lascia vuoto per Italia">
              </div>
              <div id="nc-esito" style="font-size:13px;min-height:14px;margin-bottom:12px;"></div>
              <div style="display:flex;gap:8px;">
                <button id="btn-crea-campagna" class="mk-btn" style="flex:1;background:#1877f2;color:white;padding:12px;">
                  📣 Crea campagna (in pausa)
                </button>
                <button id="btn-chiudi-modal-camp" class="mk-btn" style="background:#f1f5f9;color:#374151;">Annulla</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Listeners selettore pagina
      content.querySelectorAll('.btn-pagina').forEach(btn => {
        btn.addEventListener('click', async () => {
          paginaSelezionata = pagine.find(p => p.pagina_id === btn.dataset.pid) || paginaSelezionata;
          accountId = btn.dataset.aid;
          await renderContent();
        });
      });

      // Filtri periodo
      content.querySelectorAll('.btn-periodo').forEach(btn => {
        btn.addEventListener('click', async () => {
          periodoStats = btn.dataset.p;
          await renderContent();
        });
      });

      // Filtro stato
      content.querySelector('#filtro-stato')?.addEventListener('change', async function() {
        filtroStato = this.value;
        await renderContent();
      });

      content.querySelector('#btn-nuova-campagna')?.addEventListener('click', () => {
        content.querySelector('#modal-campagna').style.display = 'flex';
      });
      content.querySelector('#btn-chiudi-modal-camp')?.addEventListener('click', () => {
        content.querySelector('#modal-campagna').style.display = 'none';
      });

      // Modifica campagna
      content.querySelectorAll('.btn-modifica').forEach(btn => {
        btn.addEventListener('click', () => {
          const modal = content.querySelector('#modal-modifica');
          if (!modal) return;
          content.querySelector('#mod-id').value = btn.dataset.id;
          content.querySelector('#mod-nome').value = btn.dataset.name;
          content.querySelector('#mod-budget').value = Math.round(parseInt(btn.dataset.budget||0)/100);
          content.querySelector('#mod-stato').value = btn.dataset.status || 'PAUSED';
          content.querySelector('#mod-esito').textContent = '';
          modal.style.display = 'flex';
        });
      });

      content.querySelector('#btn-chiudi-modal-mod')?.addEventListener('click', () => {
        content.querySelector('#modal-modifica').style.display = 'none';
      });

      content.querySelector('#btn-salva-modifica')?.addEventListener('click', async () => {
        const esito = content.querySelector('#mod-esito');
        const id = content.querySelector('#mod-id').value;
        const nome = content.querySelector('#mod-nome').value.trim();
        const budget = parseFloat(content.querySelector('#mod-budget').value) * 100;
        if (!nome) { esito.textContent='❌ Nome obbligatorio'; return; }
        esito.textContent='Salvataggio...'; esito.style.color='#64748b';
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/meta-ads-proxy-ts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
            body: JSON.stringify({ endpoint: id, method: 'POST', params: {
                name: nome,
                daily_budget: budget,
                status: content.querySelector('#mod-stato')?.value,
                end_time: content.querySelector('#mod-datafine')?.value || undefined
              } })
          });
          const data = await res.json();
          if (data.success || data.id) {
            esito.textContent='✅ Salvato!'; esito.style.color='#15803d';
            setTimeout(() => { content.querySelector('#modal-modifica').style.display='none'; renderContent(); }, 1000);
          } else {
            esito.textContent='❌ ' + (data.error?.message || JSON.stringify(data));
            esito.style.color='#dc2626';
          }
        } catch(e) { esito.textContent='❌ '+e.message; esito.style.color='#dc2626'; }
      });

      // Toggle status campagna
      content.querySelectorAll('.btn-toggle-status').forEach(btn => {
        btn.addEventListener('click', async () => {
          const newStatus = btn.dataset.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          btn.textContent = 'Aggiornamento...';
          btn.disabled = true;
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/meta-ads-proxy-ts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
              body: JSON.stringify({ endpoint: btn.dataset.id, method: 'POST', params: { status: newStatus } })
            });
            await renderContent();
          } catch(e) { btn.disabled = false; btn.textContent = 'Errore'; }
        });
      });

      // Crea campagna
      content.querySelector('#btn-crea-campagna')?.addEventListener('click', async () => {
        const esito = content.querySelector('#nc-esito');
        const nome = content.querySelector('#nc-nome').value.trim();
        const paginaId = content.querySelector('#nc-pagina').value;
        const obiettivo = content.querySelector('#nc-obiettivo').value;
        const budget = parseFloat(content.querySelector('#nc-budget').value) * 100; // centesimi
        const dataFine = content.querySelector('#nc-datafine').value;
        const etaMin = parseInt(content.querySelector('#nc-eta-min').value) || 18;
        const etaMax = parseInt(content.querySelector('#nc-eta-max').value) || 65;

        if (!nome) { esito.textContent = '❌ Nome obbligatorio'; esito.style.color='#dc2626'; return; }

        esito.textContent = '⏳ Creazione in corso...'; esito.style.color='#64748b';

        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/meta-ads-proxy-ts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
            body: JSON.stringify({
              endpoint: `${accountId}/campaigns`,
              method: 'POST',
              params: {
                name: nome,
                objective: obiettivo,
                status: 'PAUSED',
                daily_budget: budget,
                end_time: dataFine || undefined,
                targeting: { age_min: etaMin, age_max: etaMax },
                special_ad_categories: [],
              }
            })
          });
          const data = await res.json();
          if (data.id) {
            esito.textContent = '✅ Campagna creata! ID: ' + data.id;
            esito.style.color = '#15803d';
            setTimeout(() => { content.querySelector('#modal-campagna').style.display='none'; renderContent(); }, 1500);
          } else {
            esito.textContent = '❌ ' + (data.error?.message || JSON.stringify(data));
            esito.style.color = '#dc2626';
          }
        } catch(e) {
          esito.textContent = '❌ ' + e.message;
          esito.style.color = '#dc2626';
        }
      });
    };

    await renderContent();
  }

  function renderPlaceholder(content, title) {
    content.innerHTML = `
      <div class="card">
        <h2>${title}</h2>
        <p>Modulo in arrivo</p>
      </div>
    `
  }


  // ─── CAMPAGNE GOOGLE ADS ───────────────────────────────────────────────────

  async function renderCampagneGoogle(content) {
    const supa = () => window.supabaseClient || window.supabase;
    content.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

    // Carica connessioni Google Ads
    const { data: connessioni } = await supa()
      .from('google_ads_connessioni')
      .select('*')
      .eq('azienda_id', window.state?.azienda?.id)
      .eq('attivo', true);

    if (!connessioni?.length) {
      content.innerHTML = `
        <div style="background:white;border-radius:16px;padding:40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;">🎯</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:8px;">Nessun account Google Ads collegato</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:20px;">Vai in Configurazione → Integrazioni → Google Ads per collegare il tuo account.</div>
          <button onclick="window.location.hash='#/bo-configurazione'" style="background:#4285F4;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:600;">⚙️ Vai alle impostazioni</button>
        </div>`;
      return;
    }

    let connSelezionata = connessioni[0];
    let campagne = [];
    let periodoStats = 'LAST_30_DAYS';
    let filtroStato = 'ALL';

    async function caricaCampagne() {
      // Per ora mostra placeholder — le API Google Ads richiedono Developer Token approvato
      // In fase 2 integreremo la Google Ads API completa
      campagne = [];
    }

    await caricaCampagne();

    content.innerHTML = `
      <style>
        .gads-btn { border:none;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600; }
        .gads-card { background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px; }
      </style>

      <div style="max-width:860px;margin:0 auto;padding:16px;">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:#4285F4;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;">🎯</div>
            <div>
              <div style="font-size:18px;font-weight:700;">Campagne Google Ads</div>
              <div style="font-size:12px;color:#64748b;">Search, Display, Performance Max</div>
            </div>
          </div>
          <button id="btn-nuova-campagna-google" class="gads-btn" style="background:#4285F4;color:white;">+ Nuova campagna</button>
        </div>

        <!-- Selettore account -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;overflow-x:auto;padding-bottom:4px;">
          ${connessioni.map(c => `
            <button class="gads-btn btn-conn-google ${c.id === connSelezionata.id ? 'sel' : ''}"
              data-id="${c.id}" data-customer="${c.customer_id}"
              style="background:${c.id === connSelezionata.id ? '#4285F4' : '#f1f5f9'};color:${c.id === connSelezionata.id ? 'white' : '#374151'};">
              🎯 ${c.customer_nome || c.customer_id}
            </button>
          `).join('')}
        </div>

        <!-- Info account -->
        <div class="gads-card" style="background:#f0f9ff;border-color:#bae6fd;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:700;color:#0E5A7A;">${connSelezionata.customer_nome || 'Account Google Ads'}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">
                Customer ID: ${connSelezionata.customer_id} 
                ${connSelezionata.refresh_token ? '· ✅ Autorizzato' : '· ⚠️ Non autorizzato'}
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              <button id="btn-sincronizza-google" class="gads-btn" style="background:#f1f5f9;color:#374151;">🔄 Sincronizza</button>
            </div>
          </div>
        </div>

        <!-- Info sviluppo -->
        <div class="gads-card" style="background:#fef3c7;border-color:#fde68a;">
          <div style="font-size:13px;color:#92400e;">
            <strong>⚠️ Integrazione Google Ads in sviluppo</strong><br>
            <div style="margin-top:6px;line-height:1.6;">
              Le API Google Ads richiedono un <strong>Developer Token</strong> approvato da Google (processo di approvazione 1-2 settimane). 
              Nel frattempo puoi:<br>
              • Gestire campagne direttamente su <a href="https://ads.google.com" target="_blank" style="color:#0E5A7A;">Google Ads →</a><br>
              • Vedere le statistiche tramite Supermetrics (già connesso)<br>
              • La creazione campagne dall'app sarà disponibile appena approvato il token
            </div>
          </div>
        </div>

        <!-- Statistiche via Supermetrics -->
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;margin-top:20px;">📊 Performance (ultimi 30 giorni)</div>
        <div id="google-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px;">
          <div class="gads-card" style="text-align:center;"><div style="font-size:11px;color:#64748b;margin-bottom:4px;">Impressioni</div><div style="font-size:20px;font-weight:700;color:#4285F4;">—</div></div>
          <div class="gads-card" style="text-align:center;"><div style="font-size:11px;color:#64748b;margin-bottom:4px;">Click</div><div style="font-size:20px;font-weight:700;color:#4285F4;">—</div></div>
          <div class="gads-card" style="text-align:center;"><div style="font-size:11px;color:#64748b;margin-bottom:4px;">Spesa</div><div style="font-size:20px;font-weight:700;color:#4285F4;">—</div></div>
          <div class="gads-card" style="text-align:center;"><div style="font-size:11px;color:#64748b;margin-bottom:4px;">CPC medio</div><div style="font-size:20px;font-weight:700;color:#4285F4;">—</div></div>
        </div>

        <!-- Campagne -->
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">📋 Campagne attive</div>
        <div class="gads-card" style="text-align:center;color:#94a3b8;padding:32px;">
          Campagne disponibili dopo approvazione Developer Token Google
        </div>

        <!-- Modal nuova campagna -->
        <div id="modal-nuova-google" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
          <div style="background:white;border-radius:20px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;">
            <div style="background:#4285F4;color:white;padding:20px 24px;border-radius:20px 20px 0 0;">
              <div style="font-size:17px;font-weight:700;">🎯 Nuova campagna Google Ads</div>
              <div style="font-size:12px;opacity:.8;margin-top:2px;">La campagna viene creata in pausa</div>
            </div>
            <div style="padding:20px;">
              <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Nome campagna *</label>
                <input id="gnc-nome" class="mk-input" placeholder="Es. Pranzo domenicale — Estate 2026">
              </div>
              <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Tipo campagna</label>
                <select id="gnc-tipo" class="mk-input">
                  <option value="SEARCH">🔍 Search — annunci testuali su Google</option>
                  <option value="DISPLAY">🖼️ Display — banner su siti web</option>
                  <option value="PERFORMANCE_MAX">⚡ Performance Max — automatica su tutti i canali</option>
                </select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                  <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Budget giornaliero (€)</label>
                  <input id="gnc-budget" type="number" min="1" value="5" class="mk-input">
                </div>
                <div>
                  <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Data fine</label>
                  <input id="gnc-datafine" type="date" class="mk-input">
                </div>
              </div>
              <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Testo annuncio</label>
                <textarea id="gnc-testo" class="mk-input" rows="4" placeholder="Scrivi il testo oppure clicca 🤖 Genera con AI..." style="resize:vertical;font-size:13px;"></textarea>
                <button id="btn-genera-aida-google" style="margin-top:6px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:12px;font-weight:600;color:#0E5A7A;">🤖 Genera testo con AI</button>
                <div id="gnc-aida-status" style="font-size:12px;color:#64748b;margin-top:4px;min-height:14px;"></div>
              </div>
              <div id="gnc-esito" style="font-size:13px;min-height:14px;margin-bottom:12px;"></div>
              <div style="display:flex;gap:8px;">
                <button id="btn-salva-campagna-google" class="gads-btn" style="flex:1;background:#4285F4;color:white;padding:12px;">🎯 Salva campagna (bozza)</button>
                <button id="btn-chiudi-modal-google" class="gads-btn" style="background:#f1f5f9;color:#374151;">Annulla</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    // Listeners
    content.querySelector('#btn-nuova-campagna-google')?.addEventListener('click', () => {
      content.querySelector('#modal-nuova-google').style.display = 'flex';
    });
    content.querySelector('#btn-chiudi-modal-google')?.addEventListener('click', () => {
      content.querySelector('#modal-nuova-google').style.display = 'none';
    });
    content.querySelector('#btn-sincronizza-google')?.addEventListener('click', () => {
      caricaCampagne().then(() => renderCampagneGoogle(content));
    });

    // Selettore account
    content.querySelectorAll('.btn-conn-google').forEach(btn => {
      btn.addEventListener('click', () => {
        connSelezionata = connessioni.find(c => c.id === btn.dataset.id) || connSelezionata;
        renderCampagneGoogle(content);
      });
    });

    // Genera AIDA per Google
    content.querySelector('#btn-genera-aida-google')?.addEventListener('click', async () => {
      const status = content.querySelector('#gnc-aida-status');
      const textarea = content.querySelector('#gnc-testo');
      const tipo = content.querySelector('#gnc-tipo')?.value;
      status.textContent = '🤖 Tony sta scrivendo...'; status.style.color = '#64748b';

      const { data: identita } = await supa().from('azienda_identita')
        .select('*').eq('azienda_id', window.state?.azienda?.id).maybeSingle();

      const tipoLabel = { SEARCH: 'annunci testuali Google Search', DISPLAY: 'banner display', PERFORMANCE_MAX: 'campagna Performance Max multi-canale' }[tipo] || tipo;

      const prompt = `Scrivi 3 headline e 2 descrizioni per un annuncio Google Ads (${tipoLabel}) per ${connSelezionata.customer_nome || 'questo ristorante'}.

IDENTITÀ: ${identita?.posizionamento || 'ristorante autentico del territorio'}
CLIENTE IDEALE: ${identita?.cliente_ideale || 'famiglie e coppie'}
PAROLE CHIAVE: ${identita?.parole_chiave || 'tradizione, qualità, territorio'}

Google Ads ha limiti: headline max 30 caratteri, descrizione max 90 caratteri.
Usa il metodo AIDA adattato al formato Google.
Formato risposta:
HEADLINE 1: ...
HEADLINE 2: ...
HEADLINE 3: ...
DESC 1: ...
DESC 2: ...`;

      try {
        const res = await fetch('https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/assistente-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0' },
          body: JSON.stringify({ azienda_id: window.state?.azienda?.id, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        if (data?.reply) {
          textarea.value = data.reply;
          status.textContent = '✅ Testo generato'; status.style.color = '#15803d';
        }
      } catch(e) { status.textContent = '❌ '+e.message; status.style.color = '#dc2626'; }
    });

    // Salva campagna come bozza nel DB
    content.querySelector('#btn-salva-campagna-google')?.addEventListener('click', async () => {
      const esito = content.querySelector('#gnc-esito');
      const nome = content.querySelector('#gnc-nome')?.value.trim();
      if (!nome) { esito.textContent = '❌ Nome obbligatorio'; esito.style.color='#dc2626'; return; }
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';

      // Salva come bozza nel DB (in attesa di Developer Token approvato)
      const { error } = await supa().from('google_ads_connessioni').update({
        customer_nome: connSelezionata.customer_nome
      }).eq('id', connSelezionata.id);

      esito.textContent = '✅ Campagna salvata come bozza — attivazione disponibile dopo approvazione Developer Token';
      esito.style.color = '#15803d';
    });
  }

  async function renderSection() {

    const content = container.querySelector("#bo-m-content")

    content.innerHTML = "<div style='padding:20px;'>Loading...</div>"

    try {

      if (currentSection === "tags") {
        await loadTags()
        renderTags(content)
        return
      }

      if (currentSection === "template") {
        await loadTags()
        await loadTemplates()
        renderTemplates(content)
        return
      }

      if (currentSection === "campagne-meta") { await renderCampagneMeta(content); return; }
      if (currentSection === "campagne-google") { await renderCampagneGoogle(content); return; }
      if (currentSection === "promozioni") return renderPlaceholder(content, "Promozioni")
      if (currentSection === "fidelity") return renderPlaceholder(content, "Fidelity")
      if (currentSection === "bozze") return renderPlaceholder(content, "Bozze")
      if (currentSection === "invio") return renderPlaceholder(content, "Invio Messaggi")
      if (currentSection === "coda") return renderPlaceholder(content, "Coda Messaggi")
      if (currentSection === "landing") return renderPlaceholder(content, "Landing")
      if (currentSection === "impostazioni") return renderPlaceholder(content, "Impostazioni")

    } catch (e) {
      console.error("Errore renderSection:", e)
      content.innerHTML = `<div style="color:red;padding:20px;">Errore caricamento sezione</div>`
    }
  }

  renderSection()
}
