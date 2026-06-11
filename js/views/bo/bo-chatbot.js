import { createPageLayout } from "../../utils/pageLayout.js";

const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  if (!aziendaId) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#6b7280;">Azienda non trovata</div>`;
    return;
  }

  container.innerHTML = createPageLayout({
    title: "🤖 Chatbot WhatsApp",
    subtitle: "Configura i flussi conversazionali automatici",
    content: `
      <style>
        .cb-tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
        .cb-tab { padding:8px 18px; border-radius:20px; border:1px solid #e5e7eb; background:white; font-size:14px; font-weight:500; cursor:pointer; color:#6b7280; transition:all 0.2s; }
        .cb-tab.active { background:#0E5A7A; color:white; border-color:#0E5A7A; }
        .cb-card { background:white; border-radius:12px; border:1px solid #e5e7eb; padding:20px; margin-bottom:16px; }
        .cb-flusso { background:white; border-radius:12px; border:1px solid #e5e7eb; padding:16px; margin-bottom:12px; transition:box-shadow 0.2s; }
        .cb-flusso:hover { box-shadow:0 4px 16px rgba(14,90,122,0.08); }
        .cb-flusso-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .cb-badge { display:inline-block; padding:3px 10px; border-radius:100px; font-size:12px; font-weight:600; }
        .cb-step { background:#f8fafc; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #e5e7eb; position:relative; }
        .cb-step-num { width:24px; height:24px; border-radius:50%; background:#0E5A7A; color:white; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cb-preview { background:#e5ddd5; border-radius:12px; padding:16px; }
        .cb-msg-bot { background:white; border-radius:12px 12px 12px 2px; padding:10px 14px; font-size:13px; max-width:85%; margin-bottom:8px; border:1px solid #e5e7eb; color:#111827; line-height:1.5; }
        .cb-msg-user { background:#0E5A7A; border-radius:12px 12px 2px 12px; padding:10px 14px; font-size:13px; max-width:85%; margin-bottom:8px; margin-left:auto; color:white; line-height:1.5; }
        .cb-input { width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px; box-sizing:border-box; font-family:inherit; }
        .cb-input:focus { outline:none; border-color:#0E5A7A; }
        .cb-select { width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px; box-sizing:border-box; font-family:inherit; background:white; }
        .cb-btn { padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; border:none; transition:all 0.2s; }
        .cb-btn-primary { background:#0E5A7A; color:white; }
        .cb-btn-primary:hover { background:#0a4560; }
        .cb-btn-outline { background:white; color:#0E5A7A; border:1px solid #0E5A7A; }
        .cb-btn-danger { background:white; color:#dc2626; border:1px solid #dc2626; }
        .cb-btn-danger:hover { background:#fee2e2; }
        .cb-btn-sm { padding:6px 12px; font-size:12px; }
        .cb-toggle { position:relative; width:44px; height:24px; }
        .cb-toggle input { opacity:0; width:0; height:0; }
        .cb-toggle-slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:#e5e7eb; border-radius:24px; transition:0.3s; }
        .cb-toggle-slider:before { position:absolute; content:""; height:18px; width:18px; left:3px; bottom:3px; background:white; border-radius:50%; transition:0.3s; }
        .cb-toggle input:checked + .cb-toggle-slider { background:#0E5A7A; }
        .cb-toggle input:checked + .cb-toggle-slider:before { transform:translateX(20px); }
        .cb-tag { display:inline-flex; align-items:center; gap:4px; background:#e8f4f8; color:#0E5A7A; border-radius:100px; padding:3px 10px; font-size:12px; font-weight:500; margin:2px; }
        .cb-tag-remove { cursor:pointer; color:#0E5A7A; font-size:14px; line-height:1; }
        .cb-section-title { font-size:13px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px; }
        .cb-stat { text-align:center; background:#f8fafc; border-radius:10px; padding:16px; }
        .cb-stat strong { display:block; font-size:24px; font-weight:700; color:#0E5A7A; font-family:'Sora',sans-serif; }
        .cb-stat span { font-size:12px; color:#6b7280; }
        @media (max-width:767px) {
          .cb-preview { display:none; }
        }
      </style>

      <div class="cb-tabs">
        <button class="cb-tab active" data-tab="flussi">💬 Flussi</button>
        <button class="cb-tab" data-tab="tavoli">🪑 Tavoli chatbot</button>
        <button class="cb-tab" data-tab="sessioni">📊 Sessioni</button>
        <button class="cb-tab" data-tab="config">⚙️ Impostazioni</button>
      </div>

      <div id="cb-tab-flussi" class="cb-tabcontent">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <div style="font-weight:700;font-size:16px;color:#111827;">Flussi conversazionali</div>
            <div style="font-size:13px;color:#6b7280;">Ogni flusso si attiva quando il cliente scrive una delle parole trigger</div>
          </div>
          <button class="cb-btn cb-btn-primary" id="btn-nuovo-flusso">+ Nuovo flusso</button>
        </div>
        <div id="cb-lista-flussi">
          <div style="text-align:center;padding:40px;color:#6b7280;">Caricamento...</div>
        </div>
      </div>

      <div id="cb-tab-tavoli" class="cb-tabcontent" style="display:none;">
        <div class="cb-card">
          <div class="cb-section-title">Configurazione tavoli per il chatbot</div>
          <p style="font-size:13px;color:#6b7280;margin-bottom:20px;">
            Definisci quanti tavoli il chatbot può prenotare autonomamente. Il resto rimane gestito manualmente dagli operatori.
          </p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
            <div>
              <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Tavoli totali</label>
              <input type="number" id="cfg-tavoli-totali" class="cb-input" placeholder="20" min="1">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Tavoli per chatbot</label>
              <input type="number" id="cfg-tavoli-chatbot" class="cb-input" placeholder="8" min="0">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Durata slot (minuti)</label>
              <input type="number" id="cfg-slot-minuti" class="cb-input" placeholder="90" min="30">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Anticipo minimo (ore)</label>
              <input type="number" id="cfg-anticipo-min" class="cb-input" placeholder="2" min="0">
            </div>
          </div>
          <div style="background:#e8f4f8;border-radius:10px;padding:14px;margin-bottom:20px;">
            <div style="font-size:13px;font-weight:600;color:#0E5A7A;margin-bottom:4px;">Come funziona</div>
            <div style="font-size:12px;color:#374151;line-height:1.6;">
              Il chatbot può prenotare fino a <strong id="preview-chatbot">8</strong> tavoli per slot orario.<br>
              I restanti <strong id="preview-manuali">12</strong> tavoli rimangono disponibili solo per prenotazioni manuali degli operatori.<br>
              Se i tavoli chatbot sono tutti occupati, il bot risponde: <em>"Siamo al completo online — chiama per verificare disponibilità."</em>
            </div>
          </div>
          <button class="cb-btn cb-btn-primary" id="btn-salva-tavoli">Salva configurazione</button>
          <div id="msg-tavoli" style="margin-top:10px;font-size:13px;"></div>
        </div>
      </div>

      <div id="cb-tab-sessioni" class="cb-tabcontent" style="display:none;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
          <div class="cb-stat"><strong id="stat-attive">0</strong><span>Sessioni attive</span></div>
          <div class="cb-stat"><strong id="stat-completate">0</strong><span>Completate oggi</span></div>
          <div class="cb-stat"><strong id="stat-abbandonate">0</strong><span>Abbandonate</span></div>
        </div>
        <div id="cb-lista-sessioni">
          <div style="text-align:center;padding:40px;color:#6b7280;">Caricamento...</div>
        </div>
      </div>

      <div id="cb-tab-config" class="cb-tabcontent" style="display:none;">
        <div class="cb-card">
          <div class="cb-section-title">Comportamento chatbot</div>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:14px;font-weight:600;color:#111827;">Tony AI come fallback</div>
                <div style="font-size:12px;color:#6b7280;">Se il cliente scrive qualcosa che il bot non capisce, Tony AI risponde</div>
              </div>
              <label class="cb-toggle"><input type="checkbox" id="cfg-tony-fallback" checked><span class="cb-toggle-slider"></span></label>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:14px;font-weight:600;color:#111827;">Notifica operatore su reclami</div>
                <div style="font-size:12px;color:#6b7280;">L'operatore riceve notifica in-app quando arriva un reclamo</div>
              </div>
              <label class="cb-toggle"><input type="checkbox" id="cfg-notifica-reclami" checked><span class="cb-toggle-slider"></span></label>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:14px;font-weight:600;color:#111827;">Passaggio a operatore dopo 2 errori</div>
                <div style="font-size:12px;color:#6b7280;">Dopo 2 risposte non comprensibili, il bot passa la chat all'operatore</div>
              </div>
              <label class="cb-toggle"><input type="checkbox" id="cfg-escalation" checked><span class="cb-toggle-slider"></span></label>
            </div>
          </div>
          <button class="cb-btn cb-btn-primary" style="margin-top:20px;" id="btn-salva-config">Salva impostazioni</button>
          <div id="msg-config" style="margin-top:10px;font-size:13px;"></div>
        </div>
      </div>

      <!-- MODAL EDITOR FLUSSO -->
      <div id="cb-modal" style="display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.5);overflow-y:auto;">
        <div style="background:white;border-radius:16px;max-width:900px;margin:20px auto;overflow:hidden;">
          <div style="background:#0E5A7A;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
            <div style="color:white;font-weight:700;font-size:16px;" id="modal-title">Nuovo flusso</div>
            <button id="btn-chiudi-modal" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;line-height:1;">×</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
            <!-- EDITOR -->
            <div style="padding:20px;overflow-y:auto;max-height:80vh;border-right:1px solid #e5e7eb;">
              <div style="margin-bottom:16px;">
                <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Nome flusso</label>
                <input type="text" id="ed-nome" class="cb-input" placeholder="Es: Prenotazione tavolo">
              </div>
              <div style="margin-bottom:16px;">
                <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Parole trigger</label>
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                  <input type="text" id="ed-trigger-input" class="cb-input" placeholder="Scrivi una parola e premi Invio" style="flex:1;">
                  <button class="cb-btn cb-btn-outline cb-btn-sm" id="btn-add-trigger">+</button>
                </div>
                <div id="ed-trigger-tags"></div>
              </div>
              <div style="margin-bottom:16px;">
                <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:8px;">Passaggi della conversazione</label>
                <div id="ed-steps"></div>
                <button class="cb-btn cb-btn-outline cb-btn-sm" id="btn-add-step" style="width:100%;margin-top:8px;">+ Aggiungi passaggio</button>
              </div>
              <div style="margin-bottom:16px;">
                <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Azione finale</label>
                <select id="ed-azione" class="cb-select">
                  <option value="nessuna">Nessuna — solo conversazione</option>
                  <option value="crea_prenotazione">Crea prenotazione automatica</option>
                  <option value="notifica_operatore">Notifica operatore</option>
                  <option value="tony_ai">Passa a Tony AI</option>
                  <option value="redirect_flusso">Avvia altro flusso</option>
                </select>
              </div>
              <div style="display:flex;gap:10px;margin-top:20px;">
                <button class="cb-btn cb-btn-primary" id="btn-salva-flusso" style="flex:1;">Salva flusso</button>
                <button class="cb-btn cb-btn-danger" id="btn-elimina-flusso" style="display:none;">Elimina</button>
              </div>
              <div id="msg-flusso" style="margin-top:10px;font-size:13px;"></div>
            </div>
            <!-- PREVIEW -->
            <div style="padding:20px;background:#f8fafc;overflow-y:auto;max-height:80vh;">
              <div class="cb-section-title">Anteprima conversazione</div>
              <div class="cb-preview" id="cb-preview-chat">
                <div style="text-align:center;color:#9ca3af;font-size:13px;padding:20px;">Aggiungi dei passaggi per vedere l'anteprima</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  });

  let flussi = [];
  let flussoInEdit = null;
  let triggerParole = [];
  let steps = [];

  // ── TABS ──────────────────────────────────────────────────────────────────
  document.querySelectorAll(".cb-tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".cb-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".cb-tabcontent").forEach(c => c.style.display = "none");
      tab.classList.add("active");
      document.getElementById(`cb-tab-${tab.dataset.tab}`).style.display = "block";
      if (tab.dataset.tab === "sessioni") caricaSessioni();
      if (tab.dataset.tab === "tavoli") caricaConfigTavoli();
    };
  });

  // ── CARICA FLUSSI ─────────────────────────────────────────────────────────
  async function caricaFlussi() {
    const { data } = await supa()
      .from("chatbot_flussi")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("ordine");

    flussi = data || [];
    renderFlussi();
  }

  function renderFlussi() {
    const lista = document.getElementById("cb-lista-flussi");
    if (!flussi.length) {
      lista.innerHTML = `
        <div style="text-align:center;padding:40px;border:2px dashed #e5e7eb;border-radius:12px;">
          <div style="font-size:32px;margin-bottom:12px;">🤖</div>
          <div style="font-size:15px;font-weight:600;color:#374151;margin-bottom:8px;">Nessun flusso configurato</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:16px;">Crea il tuo primo flusso conversazionale — inizia con la prenotazione tavolo</div>
          <button class="cb-btn cb-btn-primary" onclick="document.getElementById('btn-nuovo-flusso').click()">+ Crea primo flusso</button>
        </div>`;
      return;
    }

    lista.innerHTML = flussi.map(f => `
      <div class="cb-flusso">
        <div class="cb-flusso-header">
          <label class="cb-toggle">
            <input type="checkbox" ${f.attivo ? "checked" : ""} onchange="window._toggleFlusso('${f.id}', this.checked)">
            <span class="cb-toggle-slider"></span>
          </label>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:700;color:#111827;">${f.nome}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">${(f.steps || []).length} passaggi · Azione: ${labelAzione(f.azione_finale)}</div>
          </div>
          <span class="cb-badge" style="background:${f.attivo ? "#d1fae5" : "#f3f4f6"};color:${f.attivo ? "#065f46" : "#6b7280"};">
            ${f.attivo ? "Attivo" : "Disattivo"}
          </span>
          <button class="cb-btn cb-btn-outline cb-btn-sm" onclick="window._editFlusso('${f.id}')">Modifica</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${(f.trigger_parole || []).map(t => `<span class="cb-tag">${t}</span>`).join("")}
        </div>
      </div>
    `).join("");
  }

  function labelAzione(a) {
    const map = { nessuna: "Solo conversazione", crea_prenotazione: "Crea prenotazione", notifica_operatore: "Notifica operatore", tony_ai: "Tony AI", redirect_flusso: "Avvia altro flusso" };
    return map[a] || a;
  }

  window._toggleFlusso = async (id, attivo) => {
    await supa().from("chatbot_flussi").update({ attivo }).eq("id", id);
    const f = flussi.find(f => f.id === id);
    if (f) { f.attivo = attivo; renderFlussi(); }
  };

  window._editFlusso = (id) => {
    const f = flussi.find(f => f.id === id);
    if (f) apriModal(f);
  };

  // ── MODAL EDITOR ──────────────────────────────────────────────────────────
  function apriModal(flusso = null) {
    flussoInEdit = flusso;
    triggerParole = flusso ? [...(flusso.trigger_parole || [])] : [];
    steps = flusso ? JSON.parse(JSON.stringify(flusso.steps || [])) : [];

    document.getElementById("modal-title").textContent = flusso ? "Modifica flusso" : "Nuovo flusso";
    document.getElementById("ed-nome").value = flusso?.nome || "";
    document.getElementById("ed-azione").value = flusso?.azione_finale || "nessuna";
    document.getElementById("btn-elimina-flusso").style.display = flusso ? "block" : "none";
    document.getElementById("msg-flusso").textContent = "";

    renderTriggerTags();
    renderSteps();
    renderPreview();
    document.getElementById("cb-modal").style.display = "block";
  }

  document.getElementById("btn-chiudi-modal").onclick = () => {
    document.getElementById("cb-modal").style.display = "none";
  };

  document.getElementById("btn-nuovo-flusso").onclick = () => apriModal();

  // ── TRIGGER TAGS ──────────────────────────────────────────────────────────
  function renderTriggerTags() {
    document.getElementById("ed-trigger-tags").innerHTML = triggerParole.map((t, i) => `
      <span class="cb-tag">${t}<span class="cb-tag-remove" onclick="window._removeTrigger(${i})">×</span></span>
    `).join("");
  }

  window._removeTrigger = (i) => { triggerParole.splice(i, 1); renderTriggerTags(); };

  document.getElementById("btn-add-trigger").onclick = addTrigger;
  document.getElementById("ed-trigger-input").addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); addTrigger(); }
  });

  function addTrigger() {
    const input = document.getElementById("ed-trigger-input");
    const val = input.value.trim().toLowerCase();
    if (val && !triggerParole.includes(val)) {
      triggerParole.push(val);
      renderTriggerTags();
    }
    input.value = "";
  }

  // ── STEPS ─────────────────────────────────────────────────────────────────
  function renderSteps() {
    const container = document.getElementById("ed-steps");
    if (!steps.length) {
      container.innerHTML = `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">Nessun passaggio — aggiungine uno</div>`;
      return;
    }

    container.innerHTML = steps.map((s, i) => `
      <div class="cb-step">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div class="cb-step-num">${i + 1}</div>
          <div style="flex:1;font-size:13px;font-weight:600;color:#374151;">Passaggio ${i + 1}</div>
          <div style="display:flex;gap:4px;">
            <button class="cb-btn cb-btn-outline cb-btn-sm" title="Sposta su"
              onclick="window._moveStep(${i}, -1)" ${i === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
            <button class="cb-btn cb-btn-outline cb-btn-sm" title="Sposta giù"
              onclick="window._moveStep(${i}, 1)" ${i === steps.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
            <button class="cb-btn cb-btn-danger cb-btn-sm" onclick="window._removeStep(${i})">✕</button>
          </div>
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Messaggio del bot</label>
          <textarea class="cb-input" rows="3" style="resize:none;"
            onchange="window._updateStep(${i}, 'messaggio', this.value)"
            placeholder="Scrivi il messaggio che il bot invia al cliente...">${s.messaggio || ""}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Tipo risposta attesa</label>
            <select class="cb-select" style="font-size:13px;" onchange="window._updateStep(${i}, 'tipo_risposta', this.value)">
              <option value="testo_libero" ${s.tipo_risposta === "testo_libero" ? "selected" : ""}>Testo libero</option>
              <option value="numero" ${s.tipo_risposta === "numero" ? "selected" : ""}>Numero</option>
              <option value="data" ${s.tipo_risposta === "data" ? "selected" : ""}>Data</option>
              <option value="ora" ${s.tipo_risposta === "ora" ? "selected" : ""}>Ora</option>
              <option value="conferma" ${s.tipo_risposta === "conferma" ? "selected" : ""}>Sì / No</option>
              <option value="scelta" ${s.tipo_risposta === "scelta" ? "selected" : ""}>Scelta multipla</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Salva risposta come</label>
            <input type="text" class="cb-input" style="font-size:13px;"
              value="${s.variabile || ""}"
              onchange="window._updateStep(${i}, 'variabile', this.value)"
              placeholder="Es: coperti, data, nome">
          </div>
        </div>
        ${s.tipo_risposta === "scelta" ? `
        <div style="margin-top:8px;">
          <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Opzioni (una per riga)</label>
          <textarea class="cb-input" rows="3" style="resize:none;font-size:13px;"
            onchange="window._updateStep(${i}, 'opzioni', this.value.split('\\n').filter(Boolean))"
            placeholder="Pranzo&#10;Cena&#10;Aperitivo">${(s.opzioni || []).join("\n")}</textarea>
        </div>` : ""}
        <div style="margin-top:8px;">
          <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Messaggio di errore</label>
          <input type="text" class="cb-input" style="font-size:13px;"
            value="${s.errore || ""}"
            onchange="window._updateStep(${i}, 'errore', this.value)"
            placeholder="Non ho capito — riprova">
        </div>
      </div>
    `).join("");
  }

  window._updateStep = (i, field, value) => {
    steps[i][field] = value;
    renderPreview();
  };

  window._removeStep = (i) => {
    steps.splice(i, 1);
    renderSteps();
    renderPreview();
  };

  window._moveStep = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    renderSteps();
    renderPreview();
  };

  document.getElementById("btn-add-step").onclick = () => {
    steps.push({
      id: steps.length + 1,
      messaggio: "",
      tipo_risposta: "testo_libero",
      variabile: "",
      errore: "Non ho capito — riprova"
    });
    renderSteps();
    renderPreview();
  };

  // ── PREVIEW ───────────────────────────────────────────────────────────────
  function renderPreview() {
    const preview = document.getElementById("cb-preview-chat");
    if (!steps.length) {
      preview.innerHTML = `<div style="text-align:center;color:#9ca3af;font-size:13px;padding:20px;">Aggiungi dei passaggi per vedere l'anteprima</div>`;
      return;
    }

    const esempiRisposta = {
      testo_libero: "Mario Rossi",
      numero: "4",
      data: "sabato",
      ora: "20:30",
      conferma: "sì",
      scelta: "Cena"
    };

    let html = `<div style="font-size:11px;color:#9ca3af;text-align:center;margin-bottom:12px;">Anteprima conversazione</div>`;

    for (const s of steps) {
      if (s.messaggio) {
        html += `<div class="cb-msg-bot">${s.messaggio.replace(/\{[^}]+\}/g, match => `<span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 4px;font-size:11px;">${match}</span>`)}</div>`;
        const risposta = s.opzioni?.length ? s.opzioni[0] : esempiRisposta[s.tipo_risposta] || "...";
        html += `<div class="cb-msg-user">${risposta}</div>`;
      }
    }

    const azioneLabel = { nessuna: null, crea_prenotazione: "✅ Prenotazione creata automaticamente", notifica_operatore: "🔔 Operatore notificato", tony_ai: "🤖 Tony AI risponde", redirect_flusso: "➡️ Avvia altro flusso" };
    const azione = document.getElementById("ed-azione")?.value;
    if (azione && azioneLabel[azione]) {
      html += `<div style="text-align:center;margin-top:8px;"><span style="background:#d1fae5;color:#065f46;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;">${azioneLabel[azione]}</span></div>`;
    }

    preview.innerHTML = html;
  }

  document.getElementById("ed-azione").addEventListener("change", renderPreview);

  // ── SALVA FLUSSO ──────────────────────────────────────────────────────────
  document.getElementById("btn-salva-flusso").onclick = async () => {
    const msg = document.getElementById("msg-flusso");
    const nome = document.getElementById("ed-nome").value.trim();
    if (!nome) { msg.innerHTML = `<span style="color:#dc2626;">Inserisci il nome del flusso</span>`; return; }
    if (!triggerParole.length) { msg.innerHTML = `<span style="color:#dc2626;">Aggiungi almeno una parola trigger</span>`; return; }
    if (!steps.length) { msg.innerHTML = `<span style="color:#dc2626;">Aggiungi almeno un passaggio</span>`; return; }

    msg.innerHTML = "Salvataggio...";

    const payload = {
      azienda_id: aziendaId,
      nome,
      trigger_parole: triggerParole,
      steps,
      azione_finale: document.getElementById("ed-azione").value,
      attivo: true
    };

    let error;
    if (flussoInEdit) {
      ({ error } = await supa().from("chatbot_flussi").update(payload).eq("id", flussoInEdit.id));
    } else {
      ({ error } = await supa().from("chatbot_flussi").insert(payload));
    }

    if (error) {
      msg.innerHTML = `<span style="color:#dc2626;">Errore: ${error.message}</span>`;
    } else {
      document.getElementById("cb-modal").style.display = "none";
      await caricaFlussi();
    }
  };

  document.getElementById("btn-elimina-flusso").onclick = async () => {
    if (!flussoInEdit) return;
    if (!confirm("Eliminare questo flusso?")) return;
    await supa().from("chatbot_flussi").delete().eq("id", flussoInEdit.id);
    document.getElementById("cb-modal").style.display = "none";
    await caricaFlussi();
  };

  // ── TAVOLI CONFIG ─────────────────────────────────────────────────────────
  async function caricaConfigTavoli() {
    const { data } = await supa()
      .from("chatbot_config_tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .maybeSingle();

    if (data) {
      document.getElementById("cfg-tavoli-totali").value = data.tavoli_totali || 20;
      document.getElementById("cfg-tavoli-chatbot").value = data.tavoli_chatbot || 8;
      document.getElementById("cfg-slot-minuti").value = data.slot_minuti || 90;
      document.getElementById("cfg-anticipo-min").value = data.anticipo_minimo_ore || 2;
      aggiornaPreviewTavoli();
    }
  }

  function aggiornaPreviewTavoli() {
    const totali = parseInt(document.getElementById("cfg-tavoli-totali")?.value) || 20;
    const chatbot = parseInt(document.getElementById("cfg-tavoli-chatbot")?.value) || 8;
    document.getElementById("preview-chatbot").textContent = chatbot;
    document.getElementById("preview-manuali").textContent = Math.max(0, totali - chatbot);
  }

  document.getElementById("cfg-tavoli-totali").addEventListener("input", aggiornaPreviewTavoli);
  document.getElementById("cfg-tavoli-chatbot").addEventListener("input", aggiornaPreviewTavoli);

  document.getElementById("btn-salva-tavoli").onclick = async () => {
    const msg = document.getElementById("msg-tavoli");
    const payload = {
      azienda_id: aziendaId,
      sede_id: sedeId,
      tavoli_totali: parseInt(document.getElementById("cfg-tavoli-totali").value) || 20,
      tavoli_chatbot: parseInt(document.getElementById("cfg-tavoli-chatbot").value) || 8,
      slot_minuti: parseInt(document.getElementById("cfg-slot-minuti").value) || 90,
      anticipo_minimo_ore: parseInt(document.getElementById("cfg-anticipo-min").value) || 2,
    };

    const { error } = await supa().from("chatbot_config_tavoli").upsert(payload, { onConflict: "azienda_id,sede_id" });
    msg.innerHTML = error
      ? `<span style="color:#dc2626;">Errore: ${error.message}</span>`
      : `<span style="color:#059669;">✅ Configurazione salvata</span>`;
  };

  // ── SESSIONI ──────────────────────────────────────────────────────────────
  async function caricaSessioni() {
    const oggi = new Date().toISOString().slice(0, 10);
    const { data } = await supa()
      .from("chatbot_sessioni")
      .select("*, chatbot_flussi(nome)")
      .eq("azienda_id", aziendaId)
      .order("created_at", { ascending: false })
      .limit(50);

    const sessioni = data || [];
    const attive = sessioni.filter(s => s.stato === "attiva").length;
    const completate = sessioni.filter(s => s.stato === "completata" && s.created_at?.startsWith(oggi)).length;
    const abbandonate = sessioni.filter(s => s.stato === "abbandonata").length;

    document.getElementById("stat-attive").textContent = attive;
    document.getElementById("stat-completate").textContent = completate;
    document.getElementById("stat-abbandonate").textContent = abbandonate;

    const lista = document.getElementById("cb-lista-sessioni");
    if (!sessioni.length) {
      lista.innerHTML = `<div style="text-align:center;padding:40px;color:#6b7280;">Nessuna sessione ancora</div>`;
      return;
    }

    const statoColor = { attiva: "#d1fae5:#065f46", completata: "#dbeafe:#1e40af", abbandonata: "#fee2e2:#991b1b", operatore: "#fef3c7:#92400e" };
    lista.innerHTML = sessioni.map(s => {
      const [bg, color] = (statoColor[s.stato] || "#f3f4f6:#374151").split(":");
      const dati = s.dati_raccolti || {};
      const ts = s.updated_at ? new Date(s.updated_at).toLocaleString("it-IT", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "";
      return `
        <div style="background:white;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:10px;overflow:hidden;">
          <div style="padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="window._toggle_chat('${s.numero_cliente}')">
            <div style="width:40px;height:40px;border-radius:50%;background:#e8f4f8;color:#0E5A7A;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">
              ${(s.numero_cliente || "?").slice(-2)}
            </div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;color:#111827;">+${s.numero_cliente}</div>
              <div style="font-size:12px;color:#6b7280;">${s.chatbot_flussi?.nome || "Flusso sconosciuto"} · Step ${s.step_corrente} · ${ts}</div>
              ${Object.keys(dati).length ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">${Object.entries(dati).filter(([k]) => k !== "tipo_sessione").map(([k,v]) => `${k}: ${v}`).join(" · ")}</div>` : ""}
            </div>
            <span style="background:${bg};color:${color};border-radius:100px;padding:3px 10px;font-size:12px;font-weight:600;flex-shrink:0;">${s.stato}</span>
            ${s.stato === "attiva" ? `
              <button class="cb-btn cb-btn-outline cb-btn-sm" onclick="event.stopPropagation();window._prendi_chat('${s.numero_cliente}')">Prendi chat</button>
            ` : ""}
            <span style="color:#9ca3af;font-size:16px;" id="arrow-${s.numero_cliente}">▾</span>
          </div>
          <div id="chat-${s.numero_cliente}" style="display:none;border-top:1px solid #f3f4f6;background:#f8fafc;padding:12px;max-height:320px;overflow-y:auto;">
            <div style="text-align:center;font-size:12px;color:#9ca3af;">Caricamento messaggi...</div>
          </div>
        </div>`;
    }).join("");
  }

  window._toggle_chat = async (numero) => {
    const box = document.getElementById(`chat-${numero}`);
    const arrow = document.getElementById(`arrow-${numero}`);
    if (!box) return;
    const isOpen = box.style.display !== "none";
    box.style.display = isOpen ? "none" : "block";
    if (arrow) arrow.textContent = isOpen ? "▾" : "▴";
    if (!isOpen) {
      // Carica messaggi
      const { data: msgs } = await supa()
        .from("whatsapp_messaggi")
        .select("testo, intent, from_numero, created_at, risposta_testo")
        .eq("azienda_id", aziendaId)
        .or(`from_numero.eq.${numero},numero_cliente.eq.${numero}`)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!msgs || !msgs.length) {
        box.innerHTML = `<div style="text-align:center;font-size:12px;color:#9ca3af;padding:12px;">Nessun messaggio trovato</div>`;
        return;
      }

      box.innerHTML = msgs.map(m => {
        const ora = new Date(m.created_at).toLocaleTimeString("it-IT", { hour:"2-digit", minute:"2-digit" });
        const isBot = m.intent === "risposta_automatica";
        const isOp = m.intent === "risposta_manuale";

        let html = "";
        // Messaggio cliente
        if (!isBot && m.testo) {
          html += `
            <div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-end;">
              <div style="max-width:75%;background:white;border:1px solid #e5e7eb;border-radius:12px 12px 12px 0;padding:8px 12px;font-size:13px;color:#111827;">${m.testo}</div>
              <span style="font-size:10px;color:#9ca3af;white-space:nowrap;">${ora}</span>
            </div>`;
        }
        // Risposta bot
        if (m.risposta_testo && !isOp) {
          html += `
            <div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-end;flex-direction:row-reverse;">
              <div style="max-width:75%;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:12px 12px 0 12px;padding:8px 12px;font-size:13px;color:#1b5e20;">${m.risposta_testo}</div>
              <span style="font-size:10px;color:#9ca3af;white-space:nowrap;">🤖 ${ora}</span>
            </div>`;
        }
        // Messaggio operatore
        if (isOp && m.testo) {
          html += `
            <div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-end;flex-direction:row-reverse;">
              <div style="max-width:75%;background:#0E5A7A;border-radius:12px 12px 0 12px;padding:8px 12px;font-size:13px;color:white;">${m.testo}</div>
              <span style="font-size:10px;color:#9ca3af;white-space:nowrap;">👤 ${ora}</span>
            </div>`;
        }
        return html;
      }).join("");

      box.scrollTop = box.scrollHeight;
    }
  };

  window._prendi_chat = async (numero) => {
    await supa().from("chatbot_sessioni").update({ stato: "operatore" }).eq("azienda_id", aziendaId).eq("numero_cliente", numero);
    window.location.hash = "#/whatsapp";
  };

  // ── INIT ──────────────────────────────────────────────────────────────────
  await caricaFlussi();
}
