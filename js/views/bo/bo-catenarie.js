// js/views/bo/bo-catenarie.js
// Gestione catenarie automatiche — sequenze WA/mail post-acquisizione

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function mostraToast(msg, tipo='success') { if(window.mostraToast) window.mostraToast(msg,tipo); }

const TRIGGER_TIPI = [
  { v:'promo_scaricata',   l:'🎁 Promo scaricata',        desc:'Parte quando un cliente scarica una promo' },
  { v:'tag_aggiunto',      l:'🏷 Tag aggiunto',            desc:'Parte quando viene aggiunto un tag al cliente' },
  { v:'compleanno',        l:'🎂 Compleanno',              desc:'Parte X giorni prima del compleanno' },
  { v:'cliente_dormiente', l:'😴 Cliente dormiente',       desc:'Parte se il cliente non torna dopo X giorni' },
  { v:'prima_visita',      l:'👋 Prima visita',            desc:'Parte dopo la prima visita registrata' },
  { v:'manuale',           l:'▶️ Manuale',                 desc:'Il ristoratore la avvia manualmente' },
];

const STEP_TIPI = [
  { v:'whatsapp', l:'📲 WhatsApp', icon:'📲' },
  { v:'email',    l:'📧 Email',    icon:'📧' },
  { v:'attesa',   l:'⏸ Attesa',   icon:'⏸' },
  { v:'tag',      l:'🏷 Aggiungi tag', icon:'🏷' },
];

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML='<div style="padding:20px;color:#dc2626;">Azienda non selezionata</div>'; return; }

  container.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const { data: catenarie } = await supa().from('catenarie')
    .select('*, catenarie_step(*), catenarie_iscritti(count)')
    .eq('azienda_id', aziendaId)
    .order('created_at', { ascending: false });

  const lista = catenarie || [];

  container.innerHTML = `
    <style>
      .cat-input{padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;background:white;outline:none;}
      .cat-input:focus{border-color:#0E5A7A;}
      .cat-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;}
      .cat-card{background:white;border:1px solid #e5e7eb;border-radius:14px;margin-bottom:12px;overflow:hidden;transition:box-shadow .15s;}
      .cat-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);}
      .step-item{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;}
      .step-num{width:24px;height:24px;border-radius:50%;background:#0E5A7A;color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;margin-top:2px;}
      .toggle-btn{border:none;border-radius:20px;padding:4px 14px;cursor:pointer;font-size:11px;font-weight:700;}
      .toggle-btn.attiva{background:#dcfce7;color:#15803d;}
      .toggle-btn.inattiva{background:#fee2e2;color:#dc2626;}
      .stat-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:10px 14px;text-align:center;}
      .stat-num{font-size:20px;font-weight:800;color:#0E5A7A;}
      .stat-lbl{font-size:11px;color:#64748b;margin-top:2px;}
      @media(max-width:640px){.cat-grid-2{grid-template-columns:1fr!important;}}
    </style>

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
      <div>
        <div style="font-size:18px;font-weight:700;color:#0f172a;">🔗 Catenarie automatiche</div>
        <div style="font-size:13px;color:#64748b;">Sequenze WA/mail che partono automaticamente da eventi — promo, tag, compleanni, clienti dormienti</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="btn-nuova-cat" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:700;">+ Nuova catenaria</button>
      </div>
    </div>

    <!-- Stats globali -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;" class="cat-grid-2">
      <div class="stat-box"><div class="stat-num">${lista.length}</div><div class="stat-lbl">Catenarie totali</div></div>
      <div class="stat-box"><div class="stat-num">${lista.filter(c=>c.attiva).length}</div><div class="stat-lbl">Attive</div></div>
      <div class="stat-box"><div class="stat-num">${lista.reduce((a,c)=>a+(c.catenarie_step?.length||0),0)}</div><div class="stat-lbl">Step totali</div></div>
      <div class="stat-box"><div class="stat-num" id="stat-iscritti">—</div><div class="stat-lbl">Iscritti attivi</div></div>
    </div>

    <!-- Lista catenarie -->
    <div id="lista-catenarie"></div>

    <!-- MODAL EDITOR -->
    <div id="modal-cat" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;overflow-y:auto;padding:16px;box-sizing:border-box;">
      <div style="background:white;border-radius:20px;max-width:780px;margin:0 auto;">

        <div style="background:linear-gradient(135deg,#0E5A7A,#1a8aad);color:white;padding:18px 24px;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:16px;font-weight:700;" id="modal-cat-title">Nuova catenaria</div>
          <button id="btn-chiudi-cat" style="background:rgba(255,255,255,.2);border:none;color:white;border-radius:8px;padding:5px 14px;cursor:pointer;">✕</button>
        </div>

        <div style="padding:20px;">

          <!-- Tab -->
          <div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;margin-bottom:18px;">
            ${[{id:'info',l:'⚙️ Impostazioni'},{id:'step',l:'📋 Step messaggio'},{id:'iscritti',l:'👥 Iscritti'}].map(t=>`
              <button data-cat-tab="${t.id}" style="padding:8px 14px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap;">${t.l}</button>
            `).join('')}
          </div>

          <!-- TAB: INFO -->
          <div data-cat-content="info">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;" class="cat-grid-2">
              <div style="grid-column:1/-1;">
                <label class="cat-label">Nome catenaria *</label>
                <input id="c-nome" class="cat-input" placeholder="Es. Post promo 2x1 — fidelizzazione">
              </div>
              <div style="grid-column:1/-1;">
                <label class="cat-label">Descrizione</label>
                <textarea id="c-desc" class="cat-input" rows="2" style="resize:vertical;" placeholder="Cosa fa questa catenaria..."></textarea>
              </div>
            </div>

            <div style="margin-bottom:16px;">
              <label class="cat-label">🎯 Trigger — quando parte questa catenaria?</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;" class="cat-grid-2">
                ${TRIGGER_TIPI.map(t=>`
                  <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:2px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:border-color .15s;" class="trigger-option">
                    <input type="radio" name="c-trigger" value="${t.v}" style="margin-top:2px;accent-color:#0E5A7A;">
                    <div>
                      <div style="font-size:13px;font-weight:600;">${t.l}</div>
                      <div style="font-size:11px;color:#94a3b8;">${t.desc}</div>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>

            <div id="c-trigger-valore-wrap" style="display:none;margin-bottom:16px;">
              <label class="cat-label" id="c-trigger-valore-label">Valore trigger</label>
              <input id="c-trigger-valore" class="cat-input" placeholder="">
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;">
              <div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:8px;">💡 Come funziona</div>
              <div style="font-size:12px;color:#166534;line-height:1.7;">
                Quando il trigger scatta, il cliente viene iscritto automaticamente alla catenaria. 
                Ogni step viene inviato dopo il numero di giorni impostato dall'iscrizione o dallo step precedente.
                Il runner controlla ogni notte chi deve ricevere un messaggio e lo invia automaticamente via WhatsApp o email.
              </div>
            </div>
          </div>

          <!-- TAB: STEP -->
          <div data-cat-content="step" style="display:none;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-size:13px;font-weight:700;">Step della catenaria</div>
              <button id="btn-aggiungi-step" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:12px;font-weight:700;">+ Aggiungi step</button>
            </div>
            <div id="lista-step" style="min-height:60px;"></div>
            <div style="background:#f8fafc;border:1px dashed #e5e7eb;border-radius:10px;padding:14px;font-size:12px;color:#94a3b8;text-align:center;" id="step-empty">
              Nessun step ancora. Clicca "+ Aggiungi step" per iniziare.
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:8px;">
              Variabili disponibili nei messaggi: {{nome}}, {{telefono}}, {{promo_nome}}, {{codice}}, {{link_promo}}, {{scadenza}}
            </div>
          </div>

          <!-- TAB: ISCRITTI -->
          <div data-cat-content="iscritti" style="display:none;">
            <div id="lista-iscritti-cat">
              <div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;">Salva la catenaria per vedere gli iscritti</div>
            </div>
          </div>

          <!-- Footer -->
          <div id="c-esito" style="font-size:13px;min-height:16px;margin-top:14px;margin-bottom:8px;"></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #f1f5f9;padding-top:14px;">
            <button id="btn-salva-cat" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 26px;cursor:pointer;font-size:14px;font-weight:700;">💾 Salva</button>
            <button id="btn-annulla-cat" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:14px;">Annulla</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL STEP EDITOR -->
    <div id="modal-step" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;overflow-y:auto;padding:16px;box-sizing:border-box;">
      <div style="background:white;border-radius:16px;max-width:540px;margin:0 auto;padding:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:16px;" id="modal-step-title">Nuovo step</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;" class="cat-grid-2">
          <div>
            <label class="cat-label">Tipo step</label>
            <select id="s-tipo" class="cat-input">
              ${STEP_TIPI.map(t=>`<option value="${t.v}">${t.icon} ${t.l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="cat-label">⏱ Delay (giorni dall'iscrizione)</label>
            <input id="s-delay" type="number" min="0" value="1" class="cat-input">
          </div>
          <div>
            <label class="cat-label">Nome step</label>
            <input id="s-nome" class="cat-input" placeholder="Es. Ringraziamento">
          </div>
          <div id="s-canale-wrap">
            <label class="cat-label">Canale</label>
            <select id="s-canale" class="cat-input">
              <option value="whatsapp">📲 WhatsApp</option>
              <option value="email">📧 Email</option>
            </select>
          </div>
        </div>

        <div id="s-oggetto-wrap" style="display:none;margin-bottom:12px;">
          <label class="cat-label">Oggetto email</label>
          <input id="s-oggetto" class="cat-input" placeholder="Es. 🎁 Il tuo regalo ti aspetta!">
        </div>

        <div id="s-messaggio-wrap" style="margin-bottom:12px;">
          <label class="cat-label">Messaggio</label>
          <textarea id="s-messaggio" class="cat-input" rows="5" style="resize:vertical;font-family:monospace;font-size:12px;" placeholder="Ciao {{nome}}! 🎉&#10;&#10;Grazie per aver visitato il nostro locale..."></textarea>
        </div>

        <div id="s-tag-wrap" style="display:none;margin-bottom:12px;">
          <label class="cat-label">Tag da aggiungere</label>
          <input id="s-tag" class="cat-input" placeholder="Es. cliente_fidelizzato">
        </div>

        <div id="s-condizione-wrap" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:12px;">
          <label class="cat-label">Condizione (opzionale — se vuota lo step viene sempre eseguito)</label>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;">
            <input id="s-cond-campo" class="cat-input" placeholder="Es. tag" style="font-size:12px;">
            <select id="s-cond-op" class="cat-input" style="font-size:12px;">
              <option value="">Nessuna</option>
              <option value="contiene">contiene</option>
              <option value="non_contiene">non contiene</option>
              <option value="uguale">uguale a</option>
            </select>
            <input id="s-cond-val" class="cat-input" placeholder="Es. vip" style="font-size:12px;">
          </div>
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="btn-salva-step" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;font-size:13px;font-weight:700;">✅ Salva step</button>
          <button id="btn-annulla-step" style="background:#f1f5f9;color:#374151;border:none;border-radius:8px;padding:9px 14px;cursor:pointer;font-size:13px;">Annulla</button>
        </div>
      </div>
    </div>
  `;

  // ── Carica iscritti attivi ──────────────────────────────────────────────
  supa().from('catenarie_iscritti')
    .select('id', { count: 'exact' })
    .eq('azienda_id', aziendaId)
    .eq('completata', false)
    .eq('sospesa', false)
    .then(({ count }) => {
      const el = container.querySelector('#stat-iscritti');
      if (el) el.textContent = count ?? 0;
    });

  // ── Stato locale ─────────────────────────────────────────────────────────
  let catenariaCorrente = null;
  let stepLocali = []; // step in memoria durante editing
  let stepEditIdx = null; // indice step in modifica

  // ── Trigger radio listener ────────────────────────────────────────────────
  container.querySelectorAll('input[name="c-trigger"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const valore = container.querySelector('#c-trigger-valore-wrap');
      const label  = container.querySelector('#c-trigger-valore-label');
      const input  = container.querySelector('#c-trigger-valore');
      const tipo = radio.value;
      if (tipo === 'tag_aggiunto') {
        valore.style.display=''; label.textContent='Nome tag che scatta il trigger'; input.placeholder='Es. cliente_nuovo';
      } else if (tipo === 'promo_scaricata') {
        valore.style.display=''; label.textContent='ID promo (lascia vuoto = qualsiasi promo)'; input.placeholder='Opzionale';
      } else if (tipo === 'cliente_dormiente') {
        valore.style.display=''; label.textContent='Giorni di assenza prima del trigger'; input.placeholder='Es. 60';
      } else if (tipo === 'compleanno') {
        valore.style.display=''; label.textContent='Giorni prima del compleanno per partire'; input.placeholder='Es. 7';
      } else {
        valore.style.display='none';
      }
      // Aggiorna bordo radio
      container.querySelectorAll('.trigger-option').forEach(l => l.style.borderColor='#e5e7eb');
      radio.closest('.trigger-option').style.borderColor='#0E5A7A';
    });
  });

  // ── Tipo step listener ────────────────────────────────────────────────────
  container.querySelector('#s-tipo').addEventListener('change', e => {
    const tipo = e.target.value;
    container.querySelector('#s-messaggio-wrap').style.display = ['whatsapp','email'].includes(tipo) ? '' : 'none';
    container.querySelector('#s-tag-wrap').style.display = tipo==='tag' ? '' : 'none';
    container.querySelector('#s-canale-wrap').style.display = ['whatsapp','email'].includes(tipo) ? '' : 'none';
    container.querySelector('#s-oggetto-wrap').style.display = tipo==='email' ? '' : 'none';
  });
  container.querySelector('#s-canale').addEventListener('change', e => {
    container.querySelector('#s-oggetto-wrap').style.display = e.target.value==='email' ? '' : 'none';
  });

  // ── Render lista step ──────────────────────────────────────────────────────
  function renderStep() {
    const el = container.querySelector('#lista-step');
    const empty = container.querySelector('#step-empty');
    if (!stepLocali.length) { el.innerHTML=''; empty.style.display=''; return; }
    empty.style.display='none';
    el.innerHTML = stepLocali.map((s, idx) => `
      <div class="step-item">
        <div class="step-num">${idx+1}</div>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">
            <div>
              <div style="font-size:13px;font-weight:700;">${STEP_TIPI.find(t=>t.v===s.tipo)?.icon||''} ${esc(s.nome||s.tipo)}</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px;">
                ⏱ Giorno ${s.delay_giorni} · ${s.canale||s.tipo}
                ${s.condizione_campo ? ` · se ${s.condizione_campo} ${s.condizione_operatore} "${s.condizione_valore}"` : ''}
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              <button data-edit-step="${idx}" style="background:#f0f9ff;border:1px solid #bae6fd;color:#0E5A7A;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;">✏️</button>
              <button data-del-step="${idx}" style="background:#fee2e2;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;color:#dc2626;">🗑</button>
            </div>
          </div>
          ${s.messaggio ? `<div style="margin-top:6px;background:white;border:1px solid #e5e7eb;border-radius:6px;padding:8px;font-size:11px;color:#374151;font-family:monospace;line-height:1.5;max-height:60px;overflow:hidden;">${esc(s.messaggio).substring(0,150)}${s.messaggio.length>150?'…':''}</div>` : ''}
        </div>
      </div>
    `).join('');
    el.querySelectorAll('[data-edit-step]').forEach(btn => {
      btn.addEventListener('click', () => apriModalStep(parseInt(btn.dataset.editStep)));
    });
    el.querySelectorAll('[data-del-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        stepLocali.splice(parseInt(btn.dataset.delStep),1);
        renderStep();
      });
    });
  }

  // ── Apri modal step ───────────────────────────────────────────────────────
  function apriModalStep(idx = null) {
    stepEditIdx = idx;
    const s = idx !== null ? stepLocali[idx] : null;
    container.querySelector('#modal-step-title').textContent = idx !== null ? 'Modifica step' : 'Nuovo step';
    container.querySelector('#s-tipo').value      = s?.tipo||'whatsapp';
    container.querySelector('#s-delay').value     = s?.delay_giorni ?? 1;
    container.querySelector('#s-nome').value      = s?.nome||'';
    container.querySelector('#s-canale').value    = s?.canale||'whatsapp';
    container.querySelector('#s-oggetto').value   = s?.oggetto_mail||'';
    container.querySelector('#s-messaggio').value = s?.messaggio||'';
    container.querySelector('#s-tag').value       = s?.tag_valore||'';
    container.querySelector('#s-cond-campo').value= s?.condizione_campo||'';
    container.querySelector('#s-cond-op').value   = s?.condizione_operatore||'';
    container.querySelector('#s-cond-val').value  = s?.condizione_valore||'';
    // Mostra/nascondi campi
    const tipo = container.querySelector('#s-tipo').value;
    container.querySelector('#s-messaggio-wrap').style.display = ['whatsapp','email'].includes(tipo) ? '' : 'none';
    container.querySelector('#s-tag-wrap').style.display = tipo==='tag' ? '' : 'none';
    container.querySelector('#s-canale-wrap').style.display = ['whatsapp','email'].includes(tipo) ? '' : 'none';
    container.querySelector('#s-oggetto-wrap').style.display = tipo==='email' ? '' : 'none';
    container.querySelector('#modal-step').style.display='';
  }

  container.querySelector('#btn-aggiungi-step').addEventListener('click', () => apriModalStep(null));
  container.querySelector('#btn-annulla-step').addEventListener('click', () => { container.querySelector('#modal-step').style.display='none'; });

  container.querySelector('#btn-salva-step').addEventListener('click', () => {
    const tipo = container.querySelector('#s-tipo').value;
    const step = {
      tipo,
      nome:              container.querySelector('#s-nome').value.trim() || tipo,
      delay_giorni:      parseInt(container.querySelector('#s-delay').value)||1,
      canale:            container.querySelector('#s-canale').value,
      oggetto_mail:      container.querySelector('#s-oggetto').value.trim()||null,
      messaggio:         container.querySelector('#s-messaggio').value.trim()||null,
      tag_valore:        container.querySelector('#s-tag').value.trim()||null,
      condizione_campo:  container.querySelector('#s-cond-campo').value.trim()||null,
      condizione_operatore: container.querySelector('#s-cond-op').value||null,
      condizione_valore: container.querySelector('#s-cond-val').value.trim()||null,
    };
    if (stepEditIdx !== null) stepLocali[stepEditIdx] = step;
    else stepLocali.push(step);
    renderStep();
    container.querySelector('#modal-step').style.display='none';
  });

  // ── Tab catenaria ─────────────────────────────────────────────────────────
  function initCatTabs() {
    container.querySelectorAll('[data-cat-tab]').forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
    });
    const btns     = container.querySelectorAll('[data-cat-tab]');
    const contents = container.querySelectorAll('[data-cat-content]');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => { b.style.color='#64748b'; b.style.borderBottomColor='transparent'; });
        contents.forEach(c => c.style.display='none');
        btn.style.color='#0E5A7A'; btn.style.borderBottomColor='#0E5A7A';
        container.querySelector(`[data-cat-content="${btn.dataset.catTab}"]`).style.display='';
        if (btn.dataset.catTab==='iscritti' && catenariaCorrente?.id) caricaIscritti(catenariaCorrente.id);
      });
    });
    btns[0]?.click();
  }

  // ── Carica iscritti ───────────────────────────────────────────────────────
  async function caricaIscritti(catenariaId) {
    const el = container.querySelector('#lista-iscritti-cat');
    el.innerHTML='<div style="color:#94a3b8;font-size:13px;">Caricamento...</div>';
    const { data } = await supa().from('catenarie_iscritti')
      .select('*')
      .eq('catenaria_id', catenariaId)
      .order('data_iscrizione', { ascending: false })
      .limit(50);
    if (!data?.length) { el.innerHTML='<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px;">Nessun iscritto ancora</div>'; return; }
    el.innerHTML = `
      <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${data.length} iscritti</div>
      ${data.map(i=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;gap:6px;">
          <div>
            <div style="font-size:13px;font-weight:600;">${esc(i.contatto_nome||'—')}</div>
            <div style="font-size:11px;color:#64748b;">${esc(i.contatto_telefono||'')} · Step ${i.step_corrente} · ${i.trigger_fonte||''}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <span style="background:${i.completata?'#dcfce7':i.sospesa?'#fee2e2':'#f0f9ff'};color:${i.completata?'#15803d':i.sospesa?'#dc2626':'#0E5A7A'};border-radius:8px;padding:2px 8px;font-size:11px;font-weight:600;">${i.completata?'Completata':i.sospesa?'Sospesa':'Attiva'}</span>
            ${i.data_prossimo_step?`<span style="font-size:11px;color:#64748b;">📅 ${new Date(i.data_prossimo_step).toLocaleDateString('it-IT')}</span>`:''}
            <button data-rimuovi-iscritto="${i.id}" style="background:#fee2e2;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;color:#dc2626;">✕</button>
          </div>
        </div>
      `).join('')}
    `;
    el.querySelectorAll('[data-rimuovi-iscritto]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await supa().from('catenarie_iscritti').update({ sospesa: true }).eq('id', btn.dataset.rimuoviIscritto);
        caricaIscritti(catenariaId);
        mostraToast('Iscritto sospeso','success');
      });
    });
  }

  // ── Apri modal catenaria ──────────────────────────────────────────────────
  function apriModalCat(cat = null) {
    catenariaCorrente = cat;
    stepLocali = (cat?.catenarie_step || []).map(s=>({...s})).sort((a,b)=>a.ordine-b.ordine);
    container.querySelector('#modal-cat-title').textContent = cat ? 'Modifica catenaria' : 'Nuova catenaria';
    container.querySelector('#c-nome').value = cat?.nome||'';
    container.querySelector('#c-desc').value = cat?.descrizione||'';
    container.querySelector('#c-trigger-valore').value = cat?.trigger_valore||'';
    // Seleziona trigger radio
    const radio = container.querySelector(`input[name="c-trigger"][value="${cat?.trigger_tipo||'manuale'}"]`);
    if (radio) { radio.checked=true; radio.dispatchEvent(new Event('change')); }
    container.querySelector('#c-esito').textContent='';
    renderStep();
    container.querySelector('#modal-cat').style.display='';
    initCatTabs();
  }

  function chiudiModalCat() { container.querySelector('#modal-cat').style.display='none'; }

  container.querySelector('#btn-nuova-cat').addEventListener('click', () => apriModalCat(null));
  container.querySelector('#btn-chiudi-cat').addEventListener('click', chiudiModalCat);
  container.querySelector('#btn-annulla-cat').addEventListener('click', chiudiModalCat);
  container.querySelector('#modal-cat').addEventListener('click', e => { if(e.target===container.querySelector('#modal-cat')) chiudiModalCat(); });

  // ── Salva catenaria ───────────────────────────────────────────────────────
  container.querySelector('#btn-salva-cat').addEventListener('click', async () => {
    const esito = container.querySelector('#c-esito');
    const nome = container.querySelector('#c-nome').value.trim();
    if (!nome) { esito.textContent='❌ Nome obbligatorio'; esito.style.color='#dc2626'; return; }
    const triggerTipo = container.querySelector('input[name="c-trigger"]:checked')?.value || 'manuale';
    esito.textContent='Salvataggio...'; esito.style.color='#64748b';

    const payload = {
      azienda_id: aziendaId,
      nome,
      descrizione: container.querySelector('#c-desc').value.trim()||null,
      trigger_tipo: triggerTipo,
      trigger_valore: container.querySelector('#c-trigger-valore').value.trim()||null,
      attiva: catenariaCorrente ? catenariaCorrente.attiva : true,
    };

    let catenariaId;
    if (catenariaCorrente?.id) {
      const { error } = await supa().from('catenarie').update(payload).eq('id', catenariaCorrente.id);
      if (error) { esito.textContent='❌ '+error.message; esito.style.color='#dc2626'; return; }
      catenariaId = catenariaCorrente.id;
    } else {
      const { data, error } = await supa().from('catenarie').insert(payload).select('id').single();
      if (error) { esito.textContent='❌ '+error.message; esito.style.color='#dc2626'; return; }
      catenariaId = data.id;
    }

    // Salva step: elimina tutti e re-inserisce in ordine
    await supa().from('catenarie_step').delete().eq('catenaria_id', catenariaId);
    if (stepLocali.length) {
      const stepPayload = stepLocali.map((s, idx) => ({
        catenaria_id: catenariaId,
        azienda_id: aziendaId,
        ordine: idx + 1,
        nome: s.nome,
        tipo: s.tipo,
        canale: s.canale || s.tipo,
        delay_giorni: s.delay_giorni || 1,
        messaggio: s.messaggio,
        oggetto_mail: s.oggetto_mail,
        promo_id: s.promo_id || null,
        survey_id: s.survey_id || null,
        condizione_campo: s.condizione_campo,
        condizione_operatore: s.condizione_operatore,
        condizione_valore: s.condizione_valore,
      }));
      const { error: stepErr } = await supa().from('catenarie_step').insert(stepPayload);
      if (stepErr) { esito.textContent='❌ Errore step: '+stepErr.message; esito.style.color='#dc2626'; return; }
    }

    chiudiModalCat();
    // Ricarica
    const { data: newCat } = await supa().from('catenarie').select('*, catenarie_step(*), catenarie_iscritti(count)').eq('azienda_id', aziendaId).order('created_at', { ascending: false });
    lista.length = 0; (newCat||[]).forEach(c => lista.push(c));
    renderLista();
    mostraToast('Catenaria salvata ✅','success');
  });

  // ── Render lista ──────────────────────────────────────────────────────────
  function renderLista() {
    const el = container.querySelector('#lista-catenarie');
    if (!lista.length) {
      el.innerHTML=`<div style="text-align:center;padding:48px 24px;background:white;border:2px dashed #e5e7eb;border-radius:14px;color:#94a3b8;">
        <div style="font-size:40px;margin-bottom:12px;">🔗</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:6px;">Nessuna catenaria ancora</div>
        <div style="font-size:13px;">Crea la tua prima sequenza automatica — es. "Post promo 2x1" con ringraziamento, invito evento e riattivazione.</div>
      </div>`; return;
    }
    el.innerHTML = lista.map(c => {
      const trigger = TRIGGER_TIPI.find(t=>t.v===c.trigger_tipo)||TRIGGER_TIPI[0];
      const nStep = c.catenarie_step?.length || 0;
      const nIscritti = c.catenarie_iscritti?.[0]?.count || 0;
      return `<div class="cat-card">
        <div style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(c.nome)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px;">${trigger.l} · ${nStep} step · ${nIscritti} iscritti</div>
              ${c.descrizione?`<div style="font-size:12px;color:#94a3b8;margin-top:4px;">${esc(c.descrizione)}</div>`:''}
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              <button data-toggle-cat="${c.id}" class="toggle-btn ${c.attiva?'attiva':'inattiva'}">${c.attiva?'✅ Attiva':'⏸ Disattiva'}</button>
              <button data-edit-cat="${c.id}" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;">✏️ Modifica</button>
              <button data-del-cat="${c.id}" style="background:#fee2e2;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;color:#dc2626;">🗑</button>
            </div>
          </div>
          ${nStep ? `<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
            ${(c.catenarie_step||[]).sort((a,b)=>a.ordine-b.ordine).map(s=>`
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:4px 10px;font-size:11px;color:#0E5A7A;font-weight:600;">
                ${STEP_TIPI.find(t=>t.v===s.tipo)?.icon||''} Gg${s.delay_giorni} ${esc(s.nome||s.tipo)}
              </div>
            `).join('')}
          </div>` : ''}
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('[data-edit-cat]').forEach(btn => {
      btn.addEventListener('click', () => apriModalCat(lista.find(c=>c.id===btn.dataset.editCat)));
    });
    el.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questa catenaria e tutti i suoi step?')) return;
        await supa().from('catenarie').delete().eq('id', btn.dataset.delCat);
        const idx = lista.findIndex(c=>c.id===btn.dataset.delCat);
        if (idx>=0) lista.splice(idx,1);
        renderLista();
        mostraToast('Catenaria eliminata','success');
      });
    });
    el.querySelectorAll('[data-toggle-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const c = lista.find(x=>x.id===btn.dataset.toggleCat); if (!c) return;
        const nuovo = !c.attiva;
        await supa().from('catenarie').update({ attiva: nuovo }).eq('id', c.id);
        c.attiva = nuovo;
        btn.textContent = nuovo?'✅ Attiva':'⏸ Disattiva';
        btn.className = `toggle-btn ${nuovo?'attiva':'inattiva'}`;
        mostraToast(nuovo?'Catenaria attivata ✅':'Catenaria disattivata ⏸','success');
      });
    });
  }

  renderLista();
}
