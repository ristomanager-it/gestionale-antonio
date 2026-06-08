// js/views/bo/bo-catenarie.js
// Catenarie automatiche — timeline builder con drag & drop

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function mostraToast(msg, tipo='success') { if(window.mostraToast) window.mostraToast(msg,tipo); }

const TRIGGER_TIPI = [
  { v:'promo_scaricata',   l:'🎁 Promo scaricata',      colore:'#8b5cf6' },
  { v:'tag_aggiunto',      l:'🏷 Tag aggiunto',          colore:'#0E5A7A' },
  { v:'compleanno',        l:'🎂 Compleanno',            colore:'#f59e0b' },
  { v:'cliente_dormiente', l:'😴 Cliente dormiente',     colore:'#64748b' },
  { v:'prima_visita',      l:'👋 Prima visita',          colore:'#10b981' },
  { v:'manuale',           l:'▶️ Manuale',               colore:'#6366f1' },
];

const STEP_TIPI = [
  { v:'whatsapp', l:'WhatsApp',    icon:'📲', colore:'#25D366', bg:'#f0fdf4', border:'#bbf7d0' },
  { v:'email',    l:'Email',       icon:'📧', colore:'#0E5A7A', bg:'#f0f9ff', border:'#bae6fd' },
  { v:'attesa',   l:'Attesa',      icon:'⏸',  colore:'#94a3b8', bg:'#f8fafc', border:'#e2e8f0' },
  { v:'tag',      l:'Aggiungi tag',icon:'🏷',  colore:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
];

const TEMPLATE_CATENARIA_BENVENUTO = {
  nome: '🌟 Benvenuto — dal primo contatto alla fidelizzazione',
  descrizione: 'Catenaria globale pre-configurata. Parte dalla promo di benvenuto e accompagna il cliente nei primi 3 mesi.',
  trigger_tipo: 'promo_scaricata',
  trigger_valore: null,
  attiva: true,
  step: [
    {
      ordine:1, tipo:'whatsapp', nome:'Benvenuto immediato', delay_giorni:0, ora_invio:'10:00',
      messaggio:`Ciao {{nome}}! 🎉\n\nGrazie per aver scelto di conoscerci!\nLa tua promo è pronta: *{{promo_nome}}*\n\nCodice: *{{codice}}*\nValida fino al: {{scadenza}}\n\n👉 Scaricala qui: {{link_promo}}\n\nTi aspettiamo! 🍽`,
    },
    {
      ordine:2, tipo:'attesa', nome:'Attesa 2 giorni', delay_giorni:2, ora_invio:'09:00',
      messaggio:null,
    },
    {
      ordine:3, tipo:'whatsapp', nome:'Reminder promo', delay_giorni:2, ora_invio:'11:00',
      messaggio:`Ciao {{nome}}! 👋\n\nHai già usato la tua promo?\nTi ricordo che scade il {{scadenza}} — non perdertela!\n\nSe hai domande o vuoi prenotare un tavolo, rispondimi qui. 🍽`,
    },
    {
      ordine:4, tipo:'tag', nome:'Tag: lead_attivo', delay_giorni:0, ora_invio:'09:00',
      messaggio:'lead_attivo',
    },
    {
      ordine:5, tipo:'whatsapp', nome:'Invito prima visita', delay_giorni:7, ora_invio:'10:00',
      messaggio:`Ciao {{nome}}! 🌟\n\nAbbiamo una sorpresa per te questa settimana — una serata speciale che non troverai altrove.\n\nSolo per chi conosce il nostro locale davvero. 🍷\n\nVuoi saperne di più? Rispondimi!`,
    },
    {
      ordine:6, tipo:'whatsapp', nome:'Follow-up post visita', delay_giorni:30, ora_invio:'10:00',
      messaggio:`Ciao {{nome}}! 😊\n\nCome stai? Speriamo di averti lasciato un bel ricordo.\n\nAbbiamo aggiornato il menu con nuovi piatti della stagione — ogni volta che vieni c'è qualcosa di nuovo da scoprire.\n\nTi aspettiamo presto! 🍽`,
    },
    {
      ordine:7, tipo:'tag', nome:'Tag: cliente_fidelizzato', delay_giorni:0, ora_invio:'09:00',
      messaggio:'cliente_fidelizzato',
    },
    {
      ordine:8, tipo:'whatsapp', nome:'Riattivazione 60gg', delay_giorni:60, ora_invio:'10:00',
      messaggio:`Ciao {{nome}}! 💙\n\nÈ un po' che non ci vedi — ci manchi davvero.\n\nDa quando sei venuto l'ultima volta abbiamo cambiato qualcosa: nuovi piatti, nuova atmosfera.\n\nVieni a scoprirlo? Per te c'è una sorpresa. 🎁`,
    },
  ]
};

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML='<div style="padding:20px;color:#dc2626;">Azienda non selezionata</div>'; return; }

  container.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const { data: catenarie } = await supa()
    .from('catenarie')
    .select('*, catenarie_step(*)')
    .eq('azienda_id', aziendaId)
    .order('created_at', { ascending: false });

  const lista = catenarie || [];

  container.innerHTML = `
  <style>
    .cat-input{padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;background:white;outline:none;transition:border-color .2s;}
    .cat-input:focus{border-color:#0E5A7A;}
    .cat-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;}

    /* LISTA CARD */
    .cat-card{background:white;border:1.5px solid #e5e7eb;border-radius:16px;margin-bottom:12px;overflow:hidden;transition:all .2s;cursor:pointer;}
    .cat-card:hover{border-color:#0E5A7A;box-shadow:0 4px 24px rgba(14,90,122,.1);}
    .toggle-pill{border:none;border-radius:20px;padding:4px 12px;cursor:pointer;font-size:11px;font-weight:700;transition:all .2s;}
    .toggle-pill.on{background:#dcfce7;color:#15803d;}
    .toggle-pill.off{background:#fee2e2;color:#dc2626;}

    /* TIMELINE */
    .timeline-wrap{position:relative;padding-left:32px;}
    .timeline-line{position:absolute;left:11px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,#0E5A7A22,#0E5A7A44,#0E5A7A22);}
    .tl-node{position:relative;margin-bottom:0;}
    .tl-dot{position:absolute;left:-26px;width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 0 0 2px currentColor;top:16px;z-index:1;}
    .tl-card{background:white;border:1.5px solid #e5e7eb;border-radius:12px;margin-bottom:8px;transition:all .15s;user-select:none;}
    .tl-card:hover{border-color:#0E5A7A33;box-shadow:0 2px 12px rgba(0,0,0,.06);}
    .tl-card.dragging{opacity:.4;border-style:dashed;}
    .tl-card.drag-over{border-color:#0E5A7A;background:#f0f9ff;transform:scale(1.01);}
    .tl-header{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:grab;}
    .tl-header:active{cursor:grabbing;}
    .tl-icon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
    .tl-body{padding:0 14px 12px;display:none;}
    .tl-body.open{display:block;}
    .tl-connector{display:flex;align-items:center;justify-content:center;height:28px;position:relative;}
    .tl-connector::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:2px;background:#e2e8f0;transform:translateX(-50%);}
    .tl-connector-add{position:relative;z-index:1;background:white;border:1.5px solid #e2e8f0;border-radius:20px;padding:3px 12px;cursor:pointer;font-size:11px;font-weight:700;color:#94a3b8;transition:all .15s;}
    .tl-connector-add:hover{border-color:#0E5A7A;color:#0E5A7A;background:#f0f9ff;}

    /* TRIGGER SELECTOR */
    .trigger-sel{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:all .15s;background:white;}
    .trigger-sel.sel{border-color:#0E5A7A;background:#f0f9ff;}
    .trigger-sel:hover{border-color:#0E5A7A44;}

    /* MODAL */
    .cat-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;box-sizing:border-box;}
    .cat-modal{background:white;border-radius:20px;width:100%;max-width:860px;margin:0 auto;}
    .cat-modal-header{background:linear-gradient(135deg,#0E5A7A,#1a8aad);color:white;padding:18px 24px;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center;}

    /* STEP EDIT DRAWER */
    .step-drawer{background:#f8fafc;border-top:1.5px solid #e5e7eb;padding:14px;margin-top:0;border-radius:0 0 10px 10px;}

    @media(max-width:640px){.cat-cols{grid-template-columns:1fr!important;}}
  </style>

  <!-- Header pagina -->
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
    <div>
      <div style="font-size:18px;font-weight:700;color:#0f172a;">🔗 Catenarie automatiche</div>
      <div style="font-size:13px;color:#64748b;">Sequenze di messaggi automatici — trascina gli step per ordinarli</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button id="btn-template-benvenuto" style="background:#f0fdf4;color:#15803d;border:1.5px solid #bbf7d0;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:700;">✨ Template Benvenuto</button>
      <button id="btn-nuova-cat" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:700;">+ Nuova</button>
    </div>
  </div>

  <!-- Lista -->
  <div id="lista-catenarie"></div>

  <!-- MODAL EDITOR -->
  <div id="modal-cat" style="display:none;" class="cat-modal-backdrop">
    <div class="cat-modal">
      <div class="cat-modal-header">
        <div style="font-size:16px;font-weight:700;" id="modal-cat-title">Nuova catenaria</div>
        <button id="btn-chiudi-cat" style="background:rgba(255,255,255,.2);border:none;color:white;border-radius:8px;padding:5px 14px;cursor:pointer;font-size:14px;">✕</button>
      </div>
      <div style="padding:20px;" id="modal-cat-body">

        <!-- Sezione 1: Info base -->
        <div style="background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📋 Impostazioni</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="cat-cols">
            <div style="grid-column:1/-1;">
              <label class="cat-label">Nome catenaria *</label>
              <input id="c-nome" class="cat-input" placeholder="Es. Post promo 2x1 — fidelizzazione">
            </div>
            <div style="grid-column:1/-1;">
              <label class="cat-label">Descrizione</label>
              <textarea id="c-desc" class="cat-input" rows="2" style="resize:vertical;"></textarea>
            </div>
          </div>
        </div>

        <!-- Sezione 2: Trigger -->
        <div style="background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">⚡ Trigger — quando parte?</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;" class="cat-cols">
            ${TRIGGER_TIPI.map(t=>`
              <div class="trigger-sel" data-trigger="${t.v}" style="--tc:${t.colore}">
                <div style="width:8px;height:8px;border-radius:50%;background:${t.colore};flex-shrink:0;"></div>
                <span style="font-size:13px;font-weight:600;">${t.l}</span>
              </div>
            `).join('')}
          </div>
          <div id="c-trigger-valore-wrap" style="display:none;">
            <label class="cat-label" id="c-trigger-valore-label">Valore trigger</label>
            <input id="c-trigger-valore" class="cat-input" placeholder="">
          </div>
        </div>

        <!-- Sezione 3: Timeline step -->
        <div style="background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <div style="font-size:13px;font-weight:700;color:#0f172a;">📍 Sequenza step</div>
            <div style="font-size:11px;color:#94a3b8;">Trascina per riordinare</div>
          </div>
          <div id="timeline-editor" class="timeline-wrap">
            <div class="timeline-line"></div>
            <div id="tl-steps"></div>
            <button id="btn-add-primo-step" style="background:white;border:1.5px dashed #cbd5e1;border-radius:10px;padding:10px;width:100%;cursor:pointer;font-size:12px;color:#94a3b8;font-weight:600;margin-top:4px;">+ Aggiungi primo step</button>
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-top:10px;">
            Variabili: {{nome}}, {{telefono}}, {{promo_nome}}, {{codice}}, {{link_promo}}, {{scadenza}}
          </div>
        </div>

        <!-- Footer -->
        <div id="c-esito" style="font-size:13px;min-height:16px;margin-bottom:8px;"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="btn-salva-cat" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:11px 28px;cursor:pointer;font-size:14px;font-weight:700;">💾 Salva catenaria</button>
          <button id="btn-annulla-cat" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:11px 16px;cursor:pointer;font-size:14px;">Annulla</button>
        </div>
      </div>
    </div>
  </div>
  `;

  // ── Stato ──────────────────────────────────────────────────────────────────
  let catenariaCorrente = null;
  let stepLocali = [];
  let triggerSelezionato = 'manuale';
  let dragSrcIdx = null;

  // ── Trigger selector ────────────────────────────────────────────────────────
  container.querySelectorAll('.trigger-sel').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.trigger-sel').forEach(e => e.classList.remove('sel'));
      el.classList.add('sel');
      triggerSelezionato = el.dataset.trigger;
      const wrap  = container.querySelector('#c-trigger-valore-wrap');
      const label = container.querySelector('#c-trigger-valore-label');
      const input = container.querySelector('#c-trigger-valore');
      if (triggerSelezionato === 'tag_aggiunto') {
        wrap.style.display=''; label.textContent='Nome tag che fa scattare il trigger'; input.placeholder='Es. cliente_nuovo';
      } else if (triggerSelezionato === 'cliente_dormiente') {
        wrap.style.display=''; label.textContent='Giorni di assenza'; input.placeholder='Es. 60';
      } else if (triggerSelezionato === 'compleanno') {
        wrap.style.display=''; label.textContent='Giorni prima del compleanno'; input.placeholder='Es. 7';
      } else if (triggerSelezionato === 'promo_scaricata') {
        wrap.style.display=''; label.textContent='ID promo (vuoto = qualsiasi promo)'; input.placeholder='Opzionale';
      } else {
        wrap.style.display='none';
      }
    });
  });

  // ── Render timeline ─────────────────────────────────────────────────────────
  function renderTimeline() {
    const tl = container.querySelector('#tl-steps');
    const btnPrimo = container.querySelector('#btn-add-primo-step');
    if (!stepLocali.length) { tl.innerHTML=''; btnPrimo.style.display=''; return; }
    btnPrimo.style.display='none';

    tl.innerHTML = stepLocali.map((s, idx) => {
      const tipoInfo = STEP_TIPI.find(t=>t.v===s.tipo) || STEP_TIPI[0];
      const delayLabel = s.delay_giorni === 0 ? 'Subito' : `+${s.delay_giorni}gg`;
      const oraLabel = s.ora_invio || '09:00';
      return `
        <div class="tl-node" data-idx="${idx}">
          <div class="tl-card" draggable="true" data-drag-idx="${idx}">
            <div class="tl-dot" style="color:${tipoInfo.colore};background:${tipoInfo.colore};"></div>
            <div class="tl-header" data-expand="${idx}">
              <div class="tl-icon" style="background:${tipoInfo.bg};color:${tipoInfo.colore};">${tipoInfo.icon}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:#0f172a;">${esc(s.nome||tipoInfo.l)}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">${tipoInfo.l} · ⏱ ${delayLabel} · 🕐 ${oraLabel}</div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:16px;color:#cbd5e1;cursor:grab;" title="Trascina">⠿</span>
                <button data-del-step="${idx}" style="background:#fee2e2;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;color:#dc2626;" onclick="event.stopPropagation()">🗑</button>
                <span data-chevron="${idx}" style="color:#94a3b8;font-size:16px;transition:transform .2s;">›</span>
              </div>
            </div>
            <div class="tl-body" id="tl-body-${idx}">
              <div class="step-drawer">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;" class="cat-cols">
                  <div>
                    <label class="cat-label">Tipo</label>
                    <select data-field="tipo" data-idx="${idx}" class="cat-input step-field" style="font-size:12px;">
                      ${STEP_TIPI.map(t=>`<option value="${t.v}" ${s.tipo===t.v?'selected':''}>${t.icon} ${t.l}</option>`).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="cat-label">Delay (giorni)</label>
                    <input type="number" min="0" data-field="delay_giorni" data-idx="${idx}" class="cat-input step-field" value="${s.delay_giorni||0}" style="font-size:12px;">
                  </div>
                  <div>
                    <label class="cat-label">Ora invio</label>
                    <input type="time" data-field="ora_invio" data-idx="${idx}" class="cat-input step-field" value="${s.ora_invio||'09:00'}" style="font-size:12px;">
                  </div>
                  <div style="grid-column:1/-1;">
                    <label class="cat-label">Nome step</label>
                    <input type="text" data-field="nome" data-idx="${idx}" class="cat-input step-field" value="${esc(s.nome||'')}" placeholder="Es. Ringraziamento" style="font-size:12px;">
                  </div>
                </div>
                ${s.tipo !== 'attesa' ? `
                  <div style="margin-bottom:10px;">
                    <label class="cat-label">${s.tipo==='tag' ? 'Tag da aggiungere' : 'Messaggio'}</label>
                    ${s.tipo==='tag'
                      ? `<input type="text" data-field="messaggio" data-idx="${idx}" class="cat-input step-field" value="${esc(s.messaggio||'')}" placeholder="Es. cliente_fidelizzato" style="font-size:12px;">`
                      : `<textarea data-field="messaggio" data-idx="${idx}" class="cat-input step-field" rows="4" style="resize:vertical;font-family:monospace;font-size:11px;line-height:1.6;">${esc(s.messaggio||'')}</textarea>`
                    }
                  </div>
                ` : ''}
                ${['whatsapp','email'].includes(s.tipo) ? `
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" class="cat-cols">
                    <div>
                      <label class="cat-label">🟢 Invia solo se ha questi tag (vuoto = tutti)</label>
                      <input type="text" data-field="tag_inclusi_str" data-idx="${idx}" class="cat-input step-field" value="${esc((s.tag_inclusi||[]).join(', '))}" placeholder="Es. lead_attivo, vip" style="font-size:12px;">
                    </div>
                    <div>
                      <label class="cat-label">🔴 Escludi se ha questi tag</label>
                      <input type="text" data-field="tag_esclusi_str" data-idx="${idx}" class="cat-input step-field" value="${esc((s.tag_esclusi||[]).join(', '))}" placeholder="Es. disiscritto" style="font-size:12px;">
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          ${idx < stepLocali.length-1 ? `
            <div class="tl-connector">
              <button class="tl-connector-add" data-insert-after="${idx}">+ step</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Aggiungi step finale
    tl.innerHTML += `
      <div class="tl-connector" style="margin-top:4px;">
        <button class="tl-connector-add" data-insert-after="${stepLocali.length-1}">+ step finale</button>
      </div>
    `;

    // Bind expand
    tl.querySelectorAll('[data-expand]').forEach(el => {
      el.addEventListener('click', () => {
        const i = el.dataset.expand;
        const body = container.querySelector(`#tl-body-${i}`);
        const chev = container.querySelector(`[data-chevron="${i}"]`);
        const isOpen = body.classList.contains('open');
        // Chiudi tutti
        tl.querySelectorAll('.tl-body').forEach(b => b.classList.remove('open'));
        tl.querySelectorAll('[data-chevron]').forEach(c => c.style.transform='rotate(0deg)');
        if (!isOpen) { body.classList.add('open'); chev.style.transform='rotate(90deg)'; }
      });
    });

    // Bind delete
    tl.querySelectorAll('[data-del-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        stepLocali.splice(parseInt(btn.dataset.delStep),1);
        renderTimeline();
      });
    });

    // Bind insert after
    tl.querySelectorAll('[data-insert-after]').forEach(btn => {
      btn.addEventListener('click', () => {
        const after = parseInt(btn.dataset.insertAfter);
        stepLocali.splice(after+1, 0, { tipo:'whatsapp', nome:'', delay_giorni:1, ora_invio:'09:00', messaggio:'', tag_inclusi:[], tag_esclusi:[] });
        renderTimeline();
        // Apri il nuovo step
        setTimeout(() => {
          const newBody = container.querySelector(`#tl-body-${after+1}`);
          const newChev = container.querySelector(`[data-chevron="${after+1}"]`);
          if (newBody) { newBody.classList.add('open'); if(newChev) newChev.style.transform='rotate(90deg)'; }
        }, 50);
      });
    });

    // Bind fields
    tl.querySelectorAll('.step-field').forEach(field => {
      field.addEventListener('change', () => {
        const i = parseInt(field.dataset.idx);
        const f = field.dataset.field;
        let val = field.value;
        if (f === 'delay_giorni') val = parseInt(val)||0;
        if (f === 'tag_inclusi_str') { stepLocali[i].tag_inclusi = val.split(',').map(t=>t.trim()).filter(Boolean); return; }
        if (f === 'tag_esclusi_str') { stepLocali[i].tag_esclusi = val.split(',').map(t=>t.trim()).filter(Boolean); return; }
        stepLocali[i][f] = val;
        if (f === 'tipo') renderTimeline(); // re-render per aggiornare i campi visibili
      });
      // Input live per nome
      if (field.dataset.field === 'nome') {
        field.addEventListener('input', () => {
          stepLocali[parseInt(field.dataset.idx)].nome = field.value;
        });
      }
    });

    // ── Drag & Drop ────────────────────────────────────────────────────────
    tl.querySelectorAll('[data-drag-idx]').forEach(card => {
      card.addEventListener('dragstart', e => {
        dragSrcIdx = parseInt(card.dataset.dragIdx);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        tl.querySelectorAll('.tl-card').forEach(c => c.classList.remove('drag-over'));
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        tl.querySelectorAll('.tl-card').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      });
      card.addEventListener('drop', e => {
        e.preventDefault();
        const destIdx = parseInt(card.dataset.dragIdx);
        if (dragSrcIdx === null || dragSrcIdx === destIdx) return;
        const moved = stepLocali.splice(dragSrcIdx, 1)[0];
        stepLocali.splice(destIdx, 0, moved);
        dragSrcIdx = null;
        renderTimeline();
      });
    });
  }

  // ── Aggiungi step ───────────────────────────────────────────────────────────
  function aggiungiStep(dopo = -1) {
    const nuovoStep = { tipo:'whatsapp', nome:'', delay_giorni:1, ora_invio:'09:00', messaggio:'', tag_inclusi:[], tag_esclusi:[] };
    if (dopo === -1 || dopo >= stepLocali.length-1) stepLocali.push(nuovoStep);
    else stepLocali.splice(dopo+1, 0, nuovoStep);
    renderTimeline();
  }

  container.querySelector('#btn-add-primo-step').addEventListener('click', () => aggiungiStep());

  // ── Apri modal ───────────────────────────────────────────────────────────────
  function apriModal(cat = null) {
    catenariaCorrente = cat;
    stepLocali = (cat?.catenarie_step||[]).map(s=>({
      ...s,
      tag_inclusi: s.tag_inclusi || [],
      tag_esclusi: s.tag_esclusi || [],
    })).sort((a,b)=>a.ordine-b.ordine);
    triggerSelezionato = cat?.trigger_tipo || 'manuale';

    container.querySelector('#modal-cat-title').textContent = cat ? 'Modifica catenaria' : 'Nuova catenaria';
    container.querySelector('#c-nome').value = cat?.nome||'';
    container.querySelector('#c-desc').value = cat?.descrizione||'';
    container.querySelector('#c-trigger-valore').value = cat?.trigger_valore||'';
    container.querySelector('#c-esito').textContent='';

    // Seleziona trigger
    container.querySelectorAll('.trigger-sel').forEach(el => {
      el.classList.toggle('sel', el.dataset.trigger === triggerSelezionato);
    });

    renderTimeline();
    container.querySelector('#modal-cat').style.display='flex';
    container.querySelector('#modal-cat').scrollTop=0;
  }

  function chiudiModal() { container.querySelector('#modal-cat').style.display='none'; }

  container.querySelector('#btn-nuova-cat').addEventListener('click', () => apriModal(null));
  container.querySelector('#btn-chiudi-cat').addEventListener('click', chiudiModal);
  container.querySelector('#btn-annulla-cat').addEventListener('click', chiudiModal);
  container.querySelector('#modal-cat').addEventListener('click', e => {
    if (e.target === container.querySelector('#modal-cat')) chiudiModal();
  });

  // ── Template Benvenuto ────────────────────────────────────────────────────────
  container.querySelector('#btn-template-benvenuto').addEventListener('click', () => {
    if (!confirm('Aprire il template "Benvenuto — dal primo contatto alla fidelizzazione"? Potrai personalizzarlo e salvarlo.')) return;
    const t = TEMPLATE_CATENARIA_BENVENUTO;
    apriModal({
      id: null, _isTemplate: true,
      nome: t.nome, descrizione: t.descrizione,
      trigger_tipo: t.trigger_tipo, trigger_valore: t.trigger_valore,
      attiva: true,
      catenarie_step: t.step.map((s,i) => ({ ...s, ordine: i+1, tag_inclusi:[], tag_esclusi:[] }))
    });
  });

  // ── Salva ─────────────────────────────────────────────────────────────────────
  container.querySelector('#btn-salva-cat').addEventListener('click', async () => {
    const esito = container.querySelector('#c-esito');
    const nome = container.querySelector('#c-nome').value.trim();
    if (!nome) { esito.textContent='❌ Nome obbligatorio'; esito.style.color='#dc2626'; return; }
    esito.textContent='Salvataggio...'; esito.style.color='#64748b';

    const payload = {
      azienda_id:      aziendaId,
      nome,
      descrizione:     container.querySelector('#c-desc').value.trim()||null,
      trigger_tipo:    triggerSelezionato,
      trigger_valore:  container.querySelector('#c-trigger-valore').value.trim()||null,
      attiva:          catenariaCorrente?.id && !catenariaCorrente._isTemplate ? catenariaCorrente.attiva : true,
    };

    let catId;
    if (catenariaCorrente?.id && !catenariaCorrente._isTemplate) {
      const { error } = await supa().from('catenarie').update(payload).eq('id', catenariaCorrente.id);
      if (error) { esito.textContent='❌ '+error.message; esito.style.color='#dc2626'; return; }
      catId = catenariaCorrente.id;
    } else {
      const { data, error } = await supa().from('catenarie').insert(payload).select('id').single();
      if (error) { esito.textContent='❌ '+error.message; esito.style.color='#dc2626'; return; }
      catId = data.id;
    }

    // Elimina step vecchi e reinserisci
    await supa().from('catenarie_step').delete().eq('catenaria_id', catId);
    if (stepLocali.length) {
      const stepsPayload = stepLocali.map((s, idx) => ({
        catenaria_id:   catId,
        azienda_id:     aziendaId,
        ordine:         idx+1,
        nome:           s.nome || STEP_TIPI.find(t=>t.v===s.tipo)?.l || s.tipo,
        tipo:           s.tipo,
        canale:         s.tipo,
        delay_giorni:   s.delay_giorni||0,
        ora_invio:      s.ora_invio||'09:00',
        messaggio:      s.messaggio||null,
        tag_inclusi:    s.tag_inclusi?.length ? s.tag_inclusi : null,
        tag_esclusi:    s.tag_esclusi?.length ? s.tag_esclusi : null,
        condizione_campo: null,
        condizione_operatore: null,
        condizione_valore: null,
      }));
      const { error: stepErr } = await supa().from('catenarie_step').insert(stepsPayload);
      if (stepErr) { esito.textContent='❌ Step: '+stepErr.message; esito.style.color='#dc2626'; return; }
    }

    chiudiModal();
    // Ricarica lista
    const { data: updated } = await supa().from('catenarie').select('*, catenarie_step(*)').eq('azienda_id', aziendaId).order('created_at', { ascending: false });
    lista.length=0; (updated||[]).forEach(c=>lista.push(c));
    renderLista();
    mostraToast('Catenaria salvata ✅','success');
  });

  // ── Render lista ────────────────────────────────────────────────────────────
  function renderLista() {
    const el = container.querySelector('#lista-catenarie');
    if (!lista.length) {
      el.innerHTML=`<div style="text-align:center;padding:48px 24px;background:white;border:2px dashed #e5e7eb;border-radius:16px;color:#94a3b8;">
        <div style="font-size:40px;margin-bottom:12px;">🔗</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:6px;">Nessuna catenaria ancora</div>
        <div style="font-size:13px;">Usa il template Benvenuto già pronto — 8 step configurati dalla promo alla fidelizzazione a 3 mesi.</div>
      </div>`; return;
    }
    el.innerHTML = lista.map(c => {
      const trigger = TRIGGER_TIPI.find(t=>t.v===c.trigger_tipo)||TRIGGER_TIPI[0];
      const nStep = c.catenarie_step?.length || 0;
      const stepsOrdinati = (c.catenarie_step||[]).sort((a,b)=>a.ordine-b.ordine);
      return `<div class="cat-card" style="border-left:4px solid ${trigger.colore};">
        <div style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:700;color:#0f172a;">${esc(c.nome)}</div>
              <div style="display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap;">
                <span style="background:${trigger.colore}18;color:${trigger.colore};border-radius:8px;padding:2px 8px;font-size:11px;font-weight:600;">${trigger.l}</span>
                <span style="font-size:12px;color:#64748b;">${nStep} step</span>
              </div>
              ${c.descrizione?`<div style="font-size:12px;color:#94a3b8;margin-top:4px;">${esc(c.descrizione)}</div>`:''}
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;flex-wrap:wrap;">
              <button data-toggle-cat="${c.id}" class="toggle-pill ${c.attiva?'on':'off'}">${c.attiva?'✅ Attiva':'⏸ Pausa'}</button>
              <button data-edit-cat="${c.id}" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:12px;font-weight:600;">✏️ Modifica</button>
              <button data-del-cat="${c.id}" style="background:#fee2e2;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>
            </div>
          </div>
          ${nStep ? `
            <!-- Mini timeline -->
            <div style="display:flex;align-items:center;gap:0;margin-top:12px;overflow-x:auto;padding-bottom:4px;">
              ${stepsOrdinati.map((s,i) => {
                const ti = STEP_TIPI.find(t=>t.v===s.tipo)||STEP_TIPI[0];
                return `
                  <div style="display:flex;align-items:center;gap:0;flex-shrink:0;">
                    <div style="text-align:center;">
                      <div style="width:32px;height:32px;border-radius:10px;background:${ti.bg};border:1.5px solid ${ti.border};display:flex;align-items:center;justify-content:center;font-size:14px;" title="${esc(s.nome||ti.l)}">${ti.icon}</div>
                      <div style="font-size:9px;color:#94a3b8;margin-top:2px;">${s.delay_giorni===0?'Subito':'+'+s.delay_giorni+'gg'}</div>
                    </div>
                    ${i<stepsOrdinati.length-1?`<div style="width:20px;height:1.5px;background:#e2e8f0;flex-shrink:0;"></div>`:''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('[data-edit-cat]').forEach(btn => {
      btn.addEventListener('click', () => apriModal(lista.find(c=>c.id===btn.dataset.editCat)));
    });
    el.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questa catenaria?')) return;
        await supa().from('catenarie').delete().eq('id', btn.dataset.delCat);
        lista.splice(lista.findIndex(c=>c.id===btn.dataset.delCat),1);
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
        btn.textContent = nuovo?'✅ Attiva':'⏸ Pausa';
        btn.className = `toggle-pill ${nuovo?'on':'off'}`;
        mostraToast(nuovo?'Attivata ✅':'Messa in pausa','success');
      });
    });
  }

  renderLista();
}
