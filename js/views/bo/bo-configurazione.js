// VERSIONE: 1781802092
// js/views/bo/bo-configurazione.js
// Control room del ristorante — configurazione centralizzata
// Tab: Operativo | Sala | Menu & Comunicazione | Cassa | Integrazioni


const supa = () => window.supabaseClient || window.supabase;

async function waitForAuth(maxWait = 3000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const s = supa();
    if (s) { const { data } = await s.auth.getSession(); if (data?.session) return true; }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

const COLORI_SETTORI = ['#f59e0b','#16a34a','#0E5A7A','#7c3aed','#dc2626','#0891b2','#be185d','#84cc16'];

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  let currentSedeId = window.state?.sedeAttiva?.id || null;

  if (!aziendaId) { container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>'; return; }
  const authOk = await waitForAuth();
  if (!authOk) { container.innerHTML = '<section class="view"><h2>Sessione non disponibile.</h2></section>'; return; }

  let tabAttivo = 'operativo';
  // Leggi tab da parametro URL (es. #/bo-configurazione?tab=identita)
  const _urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  if (_urlParams.get('tab')) tabAttivo = _urlParams.get('tab');
  let settori = [], postazioni = [], prodottiVendita = [], categorieVendita = [], ricette = [];
  let tavoli = [], sale = [];

  container.innerHTML = `
  <div style="min-height:100vh;background:#f8fafc;padding:16px;padding-bottom:32px;">
    <div style="max-width:900px;margin:0 auto;">
      <div style="margin-bottom:20px;">
        <div style="font-size:20px;font-weight:700;color:#0f172a;">Configurazione</div>
        <div style="font-size:13px;color:#64748b;">Control room — impostazioni operative del ristorante</div>
      </div> <div id="cfg-sede-banner" style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="font-size:13px;font-weight:600;color:#64748b;white-space:nowrap;">Sede:</div>
        <select id="cfg-sede-sel" style="flex:1;min-width:180px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;background:#fff;font-weight:600;color:#0f172a;">
          <option value="">Seleziona sede</option>
        </select>
        <div id="cfg-sede-label" style="font-size:12px;color:#94a3b8;">Cambia sede per configurare un altro locale</div>
      </div> <div style="border-bottom:1px solid #e5e7eb;margin-bottom:24px;">
        <div id="tab-nav-wrap" style="display:grid;grid-template-columns:repeat(5,1fr);gap:2px;">
        <style>#tab-nav-wrap button:hover{background:#f0f9ff!important;}</style>
        ${[
          { id:'operativo',    icon:'👨‍🍳', label:'Operativo'       },
          { id:'sala',         icon:'🪑',  label:'Sala'             },
          { id:'menu',         icon:'📋',  label:'Menu'             },
          { id:'prenotazioni', icon:'📅',  label:'Prenotazioni'     },
          { id:'cassa',        icon:'💳',  label:'Cassa'            },
          { id:'integrazioni', icon:'🔗',  label:'Integrazioni'     },
          { id:'identita',     icon:'🎯',  label:'Identità'         },
          { id:'media',        icon:'🖼️',  label:'Media & Landing'  },
          { id:'sondaggi',     icon:'📊',  label:'Sondaggi'         },
          { id:'profilo',      icon:'📱',  label:'RistoflowBook'    },
          { id:'pagamenti',    icon:'💳',  label:'Pagamenti'        },
        ].map(t => `
          <button data-tab="${t.id}" style="
            padding:10px 8px;border:none;background:none;cursor:pointer;
            font-size:12px;font-weight:600;color:#64748b;
            border-bottom:3px solid transparent;
            white-space:nowrap;transition:all 0.15s;
            display:flex;flex-direction:column;align-items:center;gap:4px;
            min-height:54px;border-radius:8px 8px 0 0;
          ">
            <span style="font-size:18px;line-height:1">${t.icon}</span>
            <span>${t.label}</span>
          </button>
        `).join('')}
        </div>
      </div> <div id="tab-content"></div>
    
    </div>
  </div>
`;

  // ════════════════════════════════════════
  // TAB NAVIGATION
  // ════════════════════════════════════════
  function switchTab(id) {
    tabAttivo = id;
    container.querySelectorAll('[data-tab]').forEach(btn => {
      const att = btn.dataset.tab === id;
      btn.style.color       = att ? '#0E5A7A' : '#64748b';
      btn.style.borderBottomColor = att ? '#0E5A7A' : 'transparent';
      btn.style.background  = att ? '#f0f9ff' : 'none';
    });
    const box = container.querySelector('#tab-content');
    switch(id) {
      case 'operativo':    renderTabOperativo(box);    break;
      case 'sala':         renderTabSala(box);         break;
      case 'menu':         renderTabMenu(box);         break;
      case 'prenotazioni': renderTabPrenotazioni(box); break;
      case 'cassa':        renderTabCassa(box); break;
      case 'integrazioni': renderTabIntegrazioni(box); break;
      case 'identita':     renderTabIdentita(box);    break;
      case 'media':        renderTabMedia(box);       break;
      case 'sondaggi':     renderTabSondaggi(box);    break;
      case 'profilo':      renderTabProfilo(box);     break;
      case 'pagamenti':    renderTabPagamenti(box);   break;
    }
  }

  container.querySelectorAll('[data-tab]').forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));
  switchTab(tabAttivo);

  (async function initSedeBanner() {
    const { data: sediList } = await supa().from('sedi').select('id,nome').eq('azienda_id', aziendaId).eq('attiva', true).order('nome');
    const sel = container.querySelector('#cfg-sede-sel');
    if (!sel) return;
    (sediList || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.nome;
      if (s.id === currentSedeId) opt.selected = true;
      sel.appendChild(opt);
    });
    if (!currentSedeId && sediList && sediList.length > 0) { currentSedeId = sediList[0].id; sel.value = currentSedeId; }
    const updateLabel = () => {
      const nome = (sediList || []).find(s => s.id === currentSedeId)?.nome || '';
      const lbl = container.querySelector('#cfg-sede-label');
      if (lbl) lbl.textContent = nome ? 'Sede: ' + nome : 'Cambia sede per configurare un altro locale';
    };
    updateLabel();
    sel.addEventListener('change', function() {
      currentSedeId = this.value || null; updateLabel();
      const box = container.querySelector('#tab-content');
      if (box) switchTab(tabAttivo);
    });
  })();

  // ════════════════════════════════════════
  // PRESTO DISPONIBILE (tab vuoti)
  // ════════════════════════════════════════
  // ════════════════════════════════════════
  // TAB: CASSA & STAMPANTI FISCALI
  // ════════════════════════════════════════
  async function renderTabCassa(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

    const { data: stampanti } = await supa()
      .from('stampanti_fiscali')
      .select('*')
      .eq('azienda_id', aziendaId)
      .order('created_at', { ascending: true });

    const { data: sedi } = await supa()
      .from('sedi')
      .select('id, nome')
      .eq('azienda_id', aziendaId)
      .order('nome');

    const sediOpts = (sedi || []).map(function(s){ return '<option value="' + s.id + '">' + esc(s.nome) + '</option>'; }).join('');

    box.innerHTML = `
      <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <div style="font-size:18px;font-weight:700;color:#0f172a;">🖨️ Stampanti fiscali</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Registratori telematici collegati per sede</div>
          </div>
          <button id="btn-nuova-stampante" style="background:#0E5A7A;color:white;border:none;padding:9px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">+ Aggiungi stampante</button>
        </div>

        <div id="lista-stampanti"></div> <div id="form-stampante-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin-top:20px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;" id="form-stampante-title">Nuova stampante</div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:14px;">

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Nome</label>
              <input id="sp-nome" class="input" style="width:100%;box-sizing:border-box;margin-top:4px;" placeholder="Es. Cassa principale">
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Sede</label>
              <select id="sp-sede" class="input" style="margin-top:4px;">
                <option value="">— Tutte le sedi —</option>
                ${sediOpts}
              </select>
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Modello</label>
              <select id="sp-modello" class="input" style="margin-top:4px;">
                <option value="Epson FP-81 II RT">Epson FP-81 II RT</option>
                <option value="Epson FP-90III RT">Epson FP-90III RT</option>
                <option value="Custom RT">Custom RT</option>
                <option value="Ditron">Ditron</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Matricola</label>
              <input id="sp-matricola" class="input" style="width:100%;box-sizing:border-box;margin-top:4px;" placeholder="Es. 99IEB040357">
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Indirizzo IP</label>
              <input id="sp-ip" class="input" style="width:100%;box-sizing:border-box;margin-top:4px;" placeholder="Es. 192.168.0.102">
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Porta HTTP</label>
              <input id="sp-porta" class="input" type="number" style="width:100%;box-sizing:border-box;margin-top:4px;" value="80">
            </div>

          </div>

          <div style="margin-top:16px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;">Reparti IVA</label>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">Configura i reparti come impostati sulla stampante</div>
            <div id="reparti-wrap" style="margin-top:6px;"></div>
            <button type="button" id="btn-add-reparto" style="margin-top:8px;background:#f1f5f9;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;color:#374151;">+ Aggiungi reparto</button>
          </div>

          <div id="sp-esito" style="font-size:13px;min-height:16px;margin-top:12px;"></div>

          <div style="display:flex;gap:10px;margin-top:16px;">
            <button id="btn-salva-stampante" style="background:#0E5A7A;color:white;border:none;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">💾 Salva</button>
            <button id="btn-test-stampante" style="background:#f0fdf4;color:#16a34a;border:1px solid #86efac;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">🔌 Test connessione</button>
            <button id="btn-annulla-stampante" style="background:#f1f5f9;color:#374151;border:none;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:13px;">Annulla</button>
          </div>
        </div>
      </div>
    `;

    let editingId = null;
    let repartiRows = [
      { reparto: 1, iva: 10, descrizione: 'Alimenti e bevande analcoliche' },
      { reparto: 2, iva: 22, descrizione: 'Bevande alcoliche' },
      { reparto: 3, iva: 4,  descrizione: 'Generi prima necessità' }
    ];

    function renderReparti() {
      const wrap = box.querySelector('#reparti-wrap');
      if (!wrap) return;
      wrap.innerHTML = repartiRows.map((r, idx) => `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
          <input type="number" min="1" max="99" value="${r.reparto}" data-rep-idx="${idx}" data-field="reparto"
            style="width:60px;padding:6px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;" placeholder="#">
          <input type="number" min="0" max="100" step="0.1" value="${r.iva}" data-rep-idx="${idx}" data-field="iva"
            style="width:70px;padding:6px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;" placeholder="IVA%">
          <input type="text" value="${esc(r.descrizione)}" data-rep-idx="${idx}" data-field="descrizione"
            style="flex:1;padding:6px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;" placeholder="Es. Alimenti">
          <button data-del-rep="${idx}" style="background:#fee2e2;border:none;padding:6px 10px;border-radius:8px;cursor:pointer;color:#dc2626;font-size:12px;">✕</button>
        </div>
      `).join('');

      wrap.querySelectorAll('[data-rep-idx]').forEach(el => {
        el.addEventListener('input', () => {
          const idx = +el.dataset.repIdx;
          const field = el.dataset.field;
          repartiRows[idx][field] = field === 'descrizione' ? el.value : Number(el.value);
        });
      });
      wrap.querySelectorAll('[data-del-rep]').forEach(btn => {
        btn.addEventListener('click', () => {
          repartiRows.splice(+btn.dataset.delRep, 1);
          renderReparti();
        });
      });
    }

    function renderListaStampanti(lista) {
      const el = box.querySelector('#lista-stampanti');
      if (!lista || !lista.length) {
        el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:12px 0;">Nessuna stampante configurata.</div>';
        return;
      }
      el.innerHTML = lista.map(s => {
        const sedeName = (sedi || []).find(x => x.id === s.sede_id)?.nome || 'Tutte le sedi';
        return `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="font-weight:700;font-size:15px;color:#0f172a;">${esc(s.nome)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px;">
                ${esc(s.modello || '—')} · ${esc(s.matricola || '—')} · IP: <strong>${esc(s.ip)}</strong>:${s.porta || 80} · ${esc(sedeName)}
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="background:${s.attiva ? '#dcfce7' : '#fee2e2'};color:${s.attiva ? '#15803d' : '#dc2626'};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">
                ${s.attiva ? '✅ Attiva' : '⏸ Disattiva'}
              </span>
              <button data-edit="${s.id}" style="background:#f0f9ff;border:1px solid #bae6fd;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;color:#0E5A7A;font-weight:600;">✏️ Modifica</button>
              <button data-toggle="${s.id}" data-attiva="${s.attiva}" style="background:#f1f5f9;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;color:#374151;">
                ${s.attiva ? '⏸ Disattiva' : '▶️ Attiva'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      el.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => apriForm(lista.find(s => s.id === btn.dataset.edit)));
      });
      el.querySelectorAll('[data-toggle]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await supa().from('stampanti_fiscali')
            .update({ attiva: btn.dataset.attiva !== 'true' })
            .eq('id', btn.dataset.toggle);
          renderTabCassa(box);
        });
      });
    }

    function apriForm(stampante = null) {
      editingId = stampante?.id || null;
      box.querySelector('#form-stampante-title').textContent = stampante ? 'Modifica stampante' : 'Nuova stampante';
      box.querySelector('#sp-nome').value = stampante?.nome || '';
      box.querySelector('#sp-sede').value = stampante?.sede_id || '';
      box.querySelector('#sp-modello').value = stampante?.modello || 'Epson FP-81 II RT';
      box.querySelector('#sp-matricola').value = stampante?.matricola || '';
      box.querySelector('#sp-ip').value = stampante?.ip || '';
      box.querySelector('#sp-porta').value = stampante?.porta || 80;
      repartiRows = stampante?.reparti_iva || [
        { reparto: 1, iva: 10, descrizione: 'Alimenti e bevande analcoliche' },
        { reparto: 2, iva: 22, descrizione: 'Bevande alcoliche' },
        { reparto: 3, iva: 4,  descrizione: 'Generi prima necessità' }
      ];
      renderReparti();
      box.querySelector('#form-stampante-wrap').style.display = '';
      box.querySelector('#sp-esito').textContent = '';
    }

    renderListaStampanti(stampanti || []);
    renderReparti();

    box.querySelector('#btn-nuova-stampante').onclick = () => apriForm(null);
    box.querySelector('#btn-annulla-stampante').onclick = () => {
      box.querySelector('#form-stampante-wrap').style.display = 'none';
    };
    box.querySelector('#btn-add-reparto').onclick = () => {
      repartiRows.push({ reparto: repartiRows.length + 1, iva: 10, descrizione: '' });
      renderReparti();
    };

    box.querySelector('#btn-test-stampante').onclick = async () => {
      const ip = box.querySelector('#sp-ip').value.trim();
      const porta = box.querySelector('#sp-porta').value || 80;
      const esito = box.querySelector('#sp-esito');
      if (!ip) { esito.textContent = '❌ Inserisci IP stampante'; esito.style.color = '#dc2626'; return; }
      esito.textContent = '🔌 Test in corso...'; esito.style.color = '#64748b';
      try {
        const r = await fetch('http://' + ip + ':' + porta + '/cgi-bin/fpmate.cgi', {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><printerCommand><queryPrinterStatus/></printerCommand></s:Body></s:Envelope>',
          signal: AbortSignal.timeout(5000)
        });
        if (r.ok) { esito.textContent = '✅ Stampante raggiungibile!'; esito.style.color = '#16a34a'; }
        else { esito.textContent = '⚠️ Risposta HTTP ' + r.status; esito.style.color = '#f59e0b'; }
      } catch (e) {
        esito.textContent = '❌ Non raggiungibile — verifica IP e rete locale (il browser potrebbe bloccare chiamate HTTP locali)';
        esito.style.color = '#dc2626';
      }
    };

    box.querySelector('#btn-salva-stampante').onclick = async () => {
      const esito = box.querySelector('#sp-esito');
      const nome = box.querySelector('#sp-nome').value.trim();
      const ip   = box.querySelector('#sp-ip').value.trim();
      if (!nome || !ip) { esito.textContent = '❌ Nome e IP obbligatori'; esito.style.color = '#dc2626'; return; }

      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';

      const payload = {
        azienda_id:  aziendaId,
        sede_id:     box.querySelector('#sp-sede').value || null,
        nome,
        modello:     box.querySelector('#sp-modello').value,
        matricola:   box.querySelector('#sp-matricola').value.trim() || null,
        ip,
        porta:       Number(box.querySelector('#sp-porta').value) || 80,
        attiva:      true,
        reparti_iva: repartiRows
      };

      let error;
      if (editingId) {
        ({ error } = await supa().from('stampanti_fiscali').update(payload).eq('id', editingId));
      } else {
        ({ error } = await supa().from('stampanti_fiscali').insert(payload));
      }

      if (error) { esito.textContent = '❌ Errore: ' + error.message; esito.style.color = '#dc2626'; return; }

      esito.textContent = '✅ Salvato'; esito.style.color = '#16a34a';
      setTimeout(() => renderTabCassa(box), 800);
    };
  }

  function esc(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ════════════════════════════════════════
  // TAB: INTEGRAZIONI
  // ════════════════════════════════════════
  async function renderTabIntegrazioni(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

    const { data: connessioni } = await supa()
      .from('whatsapp_connessioni')
      .select('*')
      .eq('azienda_id', aziendaId)
      .order('created_at');

    const { data: sedi } = await supa()
      .from('sedi').select('id, nome')
      .eq('azienda_id', aziendaId).order('nome');

    const sediOpts = (sedi || []).map(function(s){ return '<option value="' + s.id + '"' + (s.id === currentSedeId ? ' selected' : '') + '>' + esc(s.nome) + '</option>'; }).join('');

    box.innerHTML = ` <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;">💬 WhatsApp Business</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Collega un numero WhatsApp per gestione personale e marketing</div>
          </div>
          <button id="btn-nuova-wa" style="background:#25D366;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">+ Collega numero</button>
        </div>

        <div id="lista-wa"></div> <div id="form-wa-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin-top:16px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:4px;" id="form-wa-title">Collega numero WhatsApp</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:16px;">Inserisci il numero WhatsApp Business da collegare. Le credenziali vengono configurate automaticamente da Ristoflow.</div>

          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px 14px;margin-bottom:20px;font-size:12px;color:#15803d;">
            ✅ <strong>Servizio incluso nel tuo piano Ristoflow.</strong> Il numero verrà attivato entro 24 ore dalla richiesta.
          </div>

          <input type="hidden" id="wa-modalita" value="meta">

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px;margin-bottom:16px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Nome connessione</label>
              <input id="wa-nome" class="input" placeholder="Es. WhatsApp Ristorante" style="margin-top:4px;width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Sede</label>
              <select id="wa-sede" class="input" style="margin-top:4px;width:100%;box-sizing:border-box;">
                <option value="">— Tutte le sedi —</option>
                ${sediOpts}
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Numero WhatsApp Business *</label>
              <input id="wa-numero" class="input" placeholder="+39 333 1234567" style="margin-top:4px;width:100%;box-sizing:border-box;">
              <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Deve essere un numero WhatsApp Business verificato</div>
            </div>
          </div>

          <div id="wa-esito" style="font-size:13px;min-height:16px;margin-bottom:12px;"></div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button id="btn-salva-wa" style="background:#25D366;color:white;border:none;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">💾 Salva</button>
            <button id="btn-test-wa" style="background:#f0fdf4;color:#16a34a;border:1px solid #86efac;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">📤 Invia messaggio test</button>
            <button id="btn-annulla-wa" style="background:#f1f5f9;color:#374151;border:none;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:14px;">Annulla</button>
          </div>
        </div>
            <div id="card-meta" data-modalita="meta" style="border:2px solid #0E5A7A;border-radius:12px;padding:16px;cursor:pointer;background:#f0f9ff;">
              <div style="font-size:20px;margin-bottom:6px;">🌐</div>
              <div style="font-weight:700;font-size:14px;color:#0f172a;">Meta Cloud API</div>
              <div style="font-size:12px;color:#64748b;margin-top:4px;">Ufficiale, scalabile. Ideale per marketing e conferme automatiche. Richiede numero dedicato.</div>
              <div style="margin-top:8px;font-size:11px;background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:20px;display:inline-block;">✅ Raccomandato</div>
            </div>
            <div id="card-qr" data-modalita="qr" style="border:2px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;background:white;">
              <div style="font-size:20px;margin-bottom:6px;">📱</div>
              <div style="font-weight:700;font-size:14px;color:#0f172a;">WhatsApp Web (QR)</div>
              <div style="font-size:12px;color:#64748b;margin-top:4px;">Colleghi il tuo telefono. Ideale per personale e invii informali. Richiede Raspberry Pi.</div>
              <div style="margin-top:8px;font-size:11px;background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:20px;display:inline-block;">⚙️ Richiede bridge locale</div>
            </div>
          </div>

          <input type="hidden" id="wa-modalita" value="meta">

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px;margin-bottom:16px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Nome connessione</label>
              <input id="wa-nome" class="input" placeholder="Es. WhatsApp Ristorante" style="margin-top:4px;width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Sede</label>
              <select id="wa-sede" class="input" style="margin-top:4px;width:100%;box-sizing:border-box;">
                <option value="">— Tutte le sedi —</option>
                ${sediOpts}
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Numero telefono</label>
              <input id="wa-numero" class="input" placeholder="+39 333 1234567" style="margin-top:4px;width:100%;box-sizing:border-box;">
            </div>
          </div> <div id="campi-meta">
            <div style="background:#f0f9ff;border-radius:10px;padding:14px;margin-bottom:14px;">
              <div style="font-size:13px;font-weight:700;color:#0E5A7A;margin-bottom:10px;">🌐 Credenziali Meta Cloud API</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px;">
                <div>
                  <label style="font-size:12px;font-weight:600;color:#64748b;">Phone Number ID</label>
                  <input id="wa-phone-id" class="input" placeholder="Es. 1141494992381602" style="margin-top:4px;width:100%;box-sizing:border-box;font-family:monospace;">
                </div>
                <div>
                  <label style="font-size:12px;font-weight:600;color:#64748b;">WhatsApp Business Account ID</label>
                  <input id="wa-waba-id" class="input" placeholder="Es. 3242783175905717" style="margin-top:4px;width:100%;box-sizing:border-box;font-family:monospace;">
                </div>
                <div>
                  <label style="font-size:12px;font-weight:600;color:#64748b;">App ID</label>
                  <input id="wa-app-id" class="input" placeholder="Es. 924572413940466" style="margin-top:4px;width:100%;box-sizing:border-box;font-family:monospace;">
                </div>
                <div style="grid-column:1/-1;">
                  <label style="font-size:12px;font-weight:600;color:#64748b;">Access Token</label>
                  <textarea id="wa-token" class="input" rows="2" placeholder="EAANI5MpN..." style="margin-top:4px;width:100%;box-sizing:border-box;font-family:monospace;font-size:11px;"></textarea>
                </div>
              </div>
            </div>
          </div> <div id="campi-qr" style="display:none;">
            <div style="background:#fffbeb;border-radius:10px;padding:14px;margin-bottom:14px;">
              <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:10px;">📱 Configurazione Bridge Locale</div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;">URL Bridge (Raspberry Pi)</label>
                <input id="wa-bridge-url" class="input" placeholder="http://192.168.1.x:3001" style="margin-top:4px;width:100%;box-sizing:border-box;font-family:monospace;">
              </div>
              <div style="margin-top:12px;font-size:12px;color:#64748b;">
                Il bridge è il file <strong>whatsapp-bridge.js</strong> che gira sul Raspberry Pi. Assicurati che sia avviato prima di procedere.
              </div> <div id="qr-display" style="display:none;margin-top:16px;text-align:center;">
                <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Scansiona con WhatsApp sul telefono:</div>
                <div id="qr-code-wrap" style="background:white;display:inline-block;padding:16px;border-radius:12px;border:1px solid #e5e7eb;"></div>
              </div>
              <button id="btn-mostra-qr" style="display:none;margin-top:12px;background:#25D366;color:white;border:none;border-radius:10px;padding:8px 18px;cursor:pointer;font-size:13px;font-weight:600;">📱 Mostra QR code</button>
            </div>
          </div>

          <div id="wa-esito" style="font-size:13px;min-height:16px;margin-bottom:12px;"></div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button id="btn-salva-wa" style="background:#25D366;color:white;border:none;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">💾 Salva</button>
            <button id="btn-test-wa" style="background:#f0fdf4;color:#16a34a;border:1px solid #86efac;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">📤 Invia messaggio test</button>
            <button id="btn-annulla-wa" style="background:#f1f5f9;color:#374151;border:none;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:14px;">Annulla</button>
          </div>
        </div>
      </div> <div style="margin-bottom:36px;margin-top:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;">🎯 Google Ads</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Collega il tuo account Google Ads per gestire campagne dall'app</div>
          </div>
          <button id="btn-collega-google" style="background:#4285F4;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">🔗 Collega Google Ads</button>
        </div>
        <div id="lista-google-ads" style="margin-bottom:16px;"></div>
        <div id="form-google-ads" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-top:12px;">
          <div style="font-size:15px;font-weight:700;margin-bottom:12px;">Aggiungi account Google Ads</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px;margin-bottom:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Customer ID *</label>
              <input id="gads-customer-id" class="input" placeholder="Es. 541-378-5462" style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Nome account</label>
              <input id="gads-nome" class="input" placeholder="Es. Campo Antico Ricevimenti" style="width:100%;box-sizing:border-box;">
            </div>
          </div>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400e;margin-bottom:12px;">
            ⚠️ Dopo aver inserito il Customer ID, clicca "Autorizza Google" per collegare l'account. Si aprirà una finestra di autorizzazione Google.
          </div>
          <div id="gads-esito" style="font-size:13px;min-height:14px;margin-bottom:10px;"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="btn-autorizza-google" style="background:#4285F4;color:white;border:none;border-radius:10px;padding:10px 18px;cursor:pointer;font-size:13px;font-weight:600;">🔐 Autorizza Google</button>
            <button id="btn-salva-gads" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 18px;cursor:pointer;font-size:13px;font-weight:600;">💾 Salva solo Customer ID</button>
            <button id="btn-annulla-gads" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 14px;cursor:pointer;font-size:13px;">Annulla</button>
          </div>
        </div>
      </div> <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px;opacity:0.6;">
        ${[
          { icon:'📦', titolo:'Delivery (Glovo/JustEat)', desc:'Presto disponibile' },
          { icon:'📅', titolo:'Google Calendar', desc:'Presto disponibile' },
          { icon:'⭐', titolo:'Google Reviews', desc:'Presto disponibile' },
        ].map(c => `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
            <div style="font-size:24px;">${c.icon}</div>
            <div style="font-weight:700;font-size:14px;margin-top:6px;">${c.titolo}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${c.desc}</div>
          </div>
        `).join('')}
      </div>
    `;

    let editingWaId = null;

    // Render lista connessioni
    function renderListaWa() {
      const el = box.querySelector('#lista-wa');
      if (!connessioni?.length) {
        el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">Nessun numero WhatsApp collegato.</div>';
        return;
      }
      el.innerHTML = connessioni.map(c => {
        const statoColor = { connesso:'#dcfce7', non_connesso:'#fee2e2', in_attesa:'#fef3c7', errore:'#fee2e2' };
        const statoText = { connesso:'#15803d', non_connesso:'#dc2626', in_attesa:'#92400e', errore:'#dc2626' };
        const sedeName = (sedi || []).find(s => s.id === c.sede_id)?.nome || 'Tutte le sedi';
        return `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="font-size:24px;">${c.modalita === 'meta' ? '🌐' : '📱'}</div>
            <div style="flex:1;min-width:180px;">
              <div style="font-weight:700;font-size:14px;">${esc(c.nome || c.numero_telefono || '—')}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px;">
                ${c.modalita === 'meta' ? 'Meta Cloud API' : 'WhatsApp Web'} · ${esc(sedeName)}
                ${c.numero_telefono ? ' · ' + esc(c.numero_telefono) : ''}
              </div>
              <div style="font-size:11px;color:#64748b;margin-top:2px;">
                Messaggi inviati: ${c.messaggi_inviati || 0}
                ${c.ultimo_messaggio_il ? ' · Ultimo: ' + new Date(c.ultimo_messaggio_il).toLocaleDateString('it-IT') : ''}
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <span style="background:${statoColor[c.stato]||'#f1f5f9'};color:${statoText[c.stato]||'#374151'};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${c.stato || 'non_connesso'}</span>
              <button data-edit-wa="${c.id}" style="background:#f0f9ff;border:1px solid #bae6fd;padding:5px 12px;border-radius:8px;cursor:pointer;font-size:12px;color:#0E5A7A;">✏️</button>
              <button data-del-wa="${c.id}" style="background:#fee2e2;border:none;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>
            </div>
          </div>
        `;
      }).join('');

      el.querySelectorAll('[data-edit-wa]').forEach(btn => {
        btn.addEventListener('click', () => {
          const c = connessioni.find(x => x.id === btn.dataset.editWa);
          if (c) apriFormWa(c);
        });
      });
      el.querySelectorAll('[data-del-wa]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Eliminare questa connessione?')) return;
          await supa().from('whatsapp_connessioni').delete().eq('id', btn.dataset.delWa);
          const idx = connessioni.findIndex(x => x.id === btn.dataset.delWa);
          if (idx >= 0) connessioni.splice(idx, 1);
          renderListaWa();
          mostraToast('Connessione eliminata', 'success');
        });
      });
    }

    function apriFormWa(c = null) {
      editingWaId = c?.id || null;
      const form = box.querySelector('#form-wa-wrap');
      box.querySelector('#form-wa-title').textContent = c ? 'Modifica connessione' : 'Nuova connessione WhatsApp';
      box.querySelector('#wa-nome').value = c?.nome || '';
      box.querySelector('#wa-sede').value = c?.sede_id || currentSedeId || '';
      box.querySelector('#wa-numero').value = c?.numero_telefono || '';
      box.querySelector('#wa-modalita').value = c?.modalita || 'meta';
      box.querySelector('#wa-phone-id').value = c?.meta_phone_number_id || '';
      box.querySelector('#wa-waba-id').value = c?.meta_waba_id || '';
      box.querySelector('#wa-app-id').value = c?.meta_app_id || '';
      box.querySelector('#wa-token').value = c?.meta_access_token || '';
      box.querySelector('#wa-bridge-url').value = c?.qr_bridge_url || '';
      aggiornaVisibilitaCampi(c?.modalita || 'meta');
      form.style.display = '';
      box.querySelector('#wa-esito').textContent = '';
    }

    function aggiornaVisibilitaCampi(modalita) {
      box.querySelector('#campi-meta').style.display = modalita === 'meta' ? '' : 'none';
      box.querySelector('#campi-qr').style.display = modalita === 'qr' ? '' : 'none';
      box.querySelector('#card-meta').style.borderColor = modalita === 'meta' ? '#0E5A7A' : '#e5e7eb';
      box.querySelector('#card-meta').style.background = modalita === 'meta' ? '#f0f9ff' : 'white';
      box.querySelector('#card-qr').style.borderColor = modalita === 'qr' ? '#25D366' : '#e5e7eb';
      box.querySelector('#card-qr').style.background = modalita === 'qr' ? '#f0fdf4' : 'white';
      box.querySelector('#wa-modalita').value = modalita;
    }

    renderListaWa();

    // ── Google Ads ──
    async function renderListaGoogleAds() {
      const el = box.querySelector('#lista-google-ads');
      if (!el) return;
      const { data: gads } = await supa().from('google_ads_connessioni')
        .select('*').eq('azienda_id', aziendaId).order('created_at');
      if (!gads?.length) {
        el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">Nessun account Google Ads collegato.</div>';
        return;
      }
      el.innerHTML = gads.map(g => `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="font-size:24px;">🎯</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;">${esc(g.customer_nome || g.customer_id)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">Customer ID: ${esc(g.customer_id)} ${g.refresh_token ? '· ✅ Autorizzato' : '· ⚠️ Non autorizzato'}</div>
          </div>
          <button data-del-gads="${g.id}" style="background:#fee2e2;border:none;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>
        </div>
      `).join('');
      el.querySelectorAll('[data-del-gads]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Rimuovere questo account Google Ads?')) return;
          await supa().from('google_ads_connessioni').delete().eq('id', btn.dataset.delGads);
          renderListaGoogleAds();
        });
      });
    }

    renderListaGoogleAds();

    box.querySelector('#btn-collega-google')?.addEventListener('click', () => {
      box.querySelector('#form-google-ads').style.display = '';
    });
    box.querySelector('#btn-annulla-gads')?.addEventListener('click', () => {
      box.querySelector('#form-google-ads').style.display = 'none';
    });

    // Autorizza Google — apre popup OAuth
    box.querySelector('#btn-autorizza-google')?.addEventListener('click', async () => {
      const esito = box.querySelector('#gads-esito');
      esito.textContent = 'Apertura autorizzazione Google...'; esito.style.color = '#64748b';
      const SUPABASE_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0';
      try {
        const res = await fetch(SUPABASE_URL + '/functions/v1/google-ads-oauth?action=authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
          body: JSON.stringify({ azienda_id: aziendaId, sede_id: currentSedeId || '' })
        });
        const { url } = await res.json();
        const popup = window.open(url, 'google-auth', 'width=600,height=700,left=200,top=100');
        window.addEventListener('message', async (e) => {
          if (e.data?.success) {
            esito.textContent = '✅ Google Ads autorizzato!'; esito.style.color = '#15803d';
            // Salva anche customer_id se inserito
            const customerId = box.querySelector('#gads-customer-id')?.value.replace(/-/g,'').trim();
            const nome = box.querySelector('#gads-nome')?.value.trim();
            if (customerId) {
              await supa().from('google_ads_connessioni').update({
                customer_id: customerId, customer_nome: nome || null
              }).eq('azienda_id', aziendaId).is('customer_id', null);
            }
            renderListaGoogleAds();
            setTimeout(() => { box.querySelector('#form-google-ads').style.display = 'none'; }, 1500);
          }
        }, { once: true });
      } catch(e) { esito.textContent = '❌ ' + e.message; esito.style.color = '#dc2626'; }
    });

    // Salva solo Customer ID (senza OAuth)
    box.querySelector('#btn-salva-gads')?.addEventListener('click', async () => {
      const esito = box.querySelector('#gads-esito');
      const customerId = box.querySelector('#gads-customer-id')?.value.replace(/-/g,'').trim();
      const nome = box.querySelector('#gads-nome')?.value.trim();
      if (!customerId) { esito.textContent = '❌ Customer ID obbligatorio'; esito.style.color = '#dc2626'; return; }
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
      const { error } = await supa().from('google_ads_connessioni').insert({
        azienda_id: aziendaId, customer_id: customerId, customer_nome: nome || null, attivo: true
      });
      if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }
      esito.textContent = '✅ Salvato — ora clicca "Autorizza Google" per completare';
      esito.style.color = '#15803d';
      renderListaGoogleAds();
    });

    // Bind scelta modalità
    box.querySelector('#card-meta').addEventListener('click', () => aggiornaVisibilitaCampi('meta'));
    box.querySelector('#card-qr').addEventListener('click', () => aggiornaVisibilitaCampi('qr'));
    box.querySelector('#btn-nuova-wa').addEventListener('click', () => apriFormWa(null));
    box.querySelector('#btn-annulla-wa').addEventListener('click', () => {
      box.querySelector('#form-wa-wrap').style.display = 'none';
    });

    // Salva
    box.querySelector('#btn-salva-wa').addEventListener('click', async () => {
      const esito = box.querySelector('#wa-esito');
      const nome = box.querySelector('#wa-nome').value.trim();
      const numero = box.querySelector('#wa-numero').value.trim();
      if (!nome) { esito.textContent = '❌ Nome obbligatorio'; esito.style.color = '#dc2626'; return; }
      if (!numero) { esito.textContent = '❌ Numero telefono obbligatorio'; esito.style.color = '#dc2626'; return; }
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';

      // Carica credenziali Meta default da ristoflow_config (tabella configurazione globale)
      const { data: metaCfg } = await supa()
        .from('ristoflow_config')
        .select('wa_phone_number_id, wa_waba_id, wa_app_id, wa_access_token')
        .limit(1)
        .maybeSingle();

      const payload = {
        azienda_id: aziendaId,
        sede_id: box.querySelector('#wa-sede').value || null,
        nome,
        modalita: 'meta',
        numero_telefono: numero,
        // Credenziali Meta di Ristoflow — non visibili al cliente
        meta_phone_number_id: metaCfg?.wa_phone_number_id || null,
        meta_waba_id:         metaCfg?.wa_waba_id || null,
        meta_app_id:          metaCfg?.wa_app_id || null,
        meta_access_token:    metaCfg?.wa_access_token || null,
        attivo: true,
        stato: metaCfg?.wa_phone_number_id ? 'connesso' : 'in_attesa',
        updated_at: new Date().toISOString(),
      };

      let error;
      if (editingWaId) {
        ({ error } = await supa().from('whatsapp_connessioni').update(payload).eq('id', editingWaId));
      } else {
        const { data, error: insErr } = await supa().from('whatsapp_connessioni').insert(payload).select('*').single();
        error = insErr;
        if (data) connessioni.push(data);
      }

      if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }
      esito.textContent = '✅ Salvato'; esito.style.color = '#16a34a';
      renderListaWa();
      setTimeout(() => { box.querySelector('#form-wa-wrap').style.display = 'none'; }, 600);
      mostraToast('Connessione WhatsApp salvata ✅', 'success');
    });

    // Test invio messaggio
    box.querySelector('#btn-test-wa').addEventListener('click', async () => {
      const esito = box.querySelector('#wa-esito');
      const numero = prompt('Numero destinatario test (es. +393331234567):');
      if (!numero) return;
      esito.textContent = 'Invio in corso...'; esito.style.color = '#64748b';
      try {
        const supabaseUrl = window.supabaseClient?.supabaseUrl || 'https://cuhcscpvhypoaplcmtjk.supabase.co';
        const supabaseKey = window.supabaseClient?.supabaseKey || window.SUPABASE_ANON_KEY || '';
        const res = await fetch(supabaseUrl + '/functions/v1/whatsapp-send-ts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + supabaseKey },
          body: JSON.stringify({
            azienda_id: aziendaId,
            sede_id: currentSedeId,
            numero_dest: numero,
            template_name: 'ristoflow_notifica',
            contesto: 'test'
          })
        });
        const data = await res.json();
        if (data.success) { esito.textContent = '✅ Messaggio inviato!'; esito.style.color = '#16a34a'; }
        else { esito.textContent = '❌ ' + (data.error || 'Errore'); esito.style.color = '#dc2626'; }
      } catch (e) { esito.textContent = '❌ ' + e.message; esito.style.color = '#dc2626'; }
    });
  }

  function renderTabPresto(box, icon, titolo, desc) {
    box.innerHTML = `
      <div style="text-align:center;padding:80px 40px;">
        <div style="font-size:56px;margin-bottom:16px;">${icon}</div>
        <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:8px;">${titolo}</div>
        <div style="font-size:14px;color:#64748b;max-width:400px;margin:0 auto 24px;">${desc}</div>
        <div style="display:inline-block;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:8px 20px;font-size:13px;color:#0E5A7A;font-weight:600;">🚧 In arrivo nella prossima versione</div>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // TAB: OPERATIVO
  // ════════════════════════════════════════
  async function renderTabOperativo(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';
    await Promise.all([loadSettori(), loadPostazioni(), loadProdotti(), loadCategorie(), loadRicette()]);
    box.innerHTML = ` <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;">🍕 Settori cucina</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Reparti operativi — ogni tablet display mostra il suo settore</div>
          </div>
          <button id="btn-nuovo-settore" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;">+ Nuovo settore</button>
        </div>
        <div id="lista-settori" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr));gap:10px;margin-bottom:12px;"></div> <div id="form-settore" style="display:none;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-top:12px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Nuovo settore</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
            <div style="flex:1;min-width:160px;">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Nome *</label>
              <input id="settore-nome" class="input" placeholder="es. Piscina, Antipasti, Pasticceria..." style="width:100%;box-sizing:border-box;padding:8px 12px;font-size:14px;">
            </div>
            <div style="min-width:100px;">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Colore</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;" id="colori-settore">
                ${COLORI_SETTORI.map(function(c){ return '<button data-col="' + c + '" style="width:28px;height:28px;border-radius:8px;border:2px solid transparent;background:' + c + ';cursor:pointer;flex-shrink:0;"></button>'; }).join('')}
              </div>
            </div>
            <div style="min-width:80px;">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Ordine</label>
              <input id="settore-ordine" type="number" value="0" min="0" style="width:72px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;">
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="btn-salva-settore" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">Salva</button>
              <button id="btn-annulla-settore" style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px;">Annulla</button>
            </div>
          </div>
        </div>
      </div> <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;">📱 Postazioni display</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Tablet fissi — ogni postazione ha un URL dedicato e mostra il suo settore</div>
          </div>
          <button id="btn-nuova-postazione" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;">+ Nuova postazione</button>
        </div>
        <div id="lista-postazioni" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;"></div> <div id="form-postazione" style="display:none;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-top:12px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Nuova postazione</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;margin-bottom:12px;">
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Nome postazione *</label>
              <input id="post-nome" class="input" placeholder="es. Tablet Cucina, Bar Piscina..." style="width:100%;box-sizing:border-box;padding:8px 12px;font-size:14px;">
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Settore (opzionale)</label>
              <select id="post-settore" style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;background:white;">
                <option value="">Tutti i settori</option>
                ${settori.map(function(s){ return '<option value="' + s.nome.toLowerCase() + '">' + s.nome + '</option>'; }).join('')}
              </select>
            </div>
          </div>
          <div style="background:#f0f9ff;border-radius:10px;padding:12px;margin-bottom:12px;font-size:13px;color:#0E5A7A;" id="post-url-preview">
            URL: <strong>#/display-cucina</strong>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="btn-salva-postazione" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">Salva postazione</button>
            <button id="btn-annulla-postazione" style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px;">Annulla</button>
          </div>
        </div>
      </div> <div style="margin-bottom:36px;">
        <div style="margin-bottom:16px;">
          <div style="font-size:17px;font-weight:700;color:#0f172a;">🍽️ Prodotti per settore</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Assegna ogni prodotto al settore che lo prepara — il display riceverà solo le sue portate</div>
        </div>
        <div id="lista-prodotti-settore" style="display:flex;flex-direction:column;gap:6px;"></div>
      </div> <div style="margin-bottom:36px;">
        <div style="margin-bottom:16px;">
          <div style="font-size:17px;font-weight:700;color:#0f172a;">⏱️ Tempi di esecuzione & Alert</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Tempo medio di preparazione per ricetta — usato per il timer e l'alert ritardo sul display cucina</div>
        </div>
        <div id="lista-tempi" style="display:flex;flex-direction:column;gap:6px;"></div>
      </div>
    `;

    renderListaSettori();
    renderListaPostazioni();
    renderListaProdottiSettore();
    renderListaTempi();
    bindOperativo();
  }

  function bindOperativo() {
    // Settori
    let coloreSelezionato = COLORI_SETTORI[0];
    container.querySelector('#btn-nuovo-settore').onclick = () => {
      container.querySelector('#form-settore').style.display = 'block';
      container.querySelector('#settore-nome').focus();
    };
    container.querySelector('#btn-annulla-settore').onclick = () => container.querySelector('#form-settore').style.display = 'none';
    container.querySelectorAll('[data-col]').forEach(btn => {
      btn.onclick = () => {
        coloreSelezionato = btn.dataset.col;
        container.querySelectorAll('[data-col]').forEach(b => b.style.borderColor = b.dataset.col === coloreSelezionato ? '#0f172a' : 'transparent');
      };
    });
    container.querySelector('#btn-salva-settore').onclick = async () => {
      const nome = container.querySelector('#settore-nome').value.trim();
      if (!nome) { mostraToast('Inserisci il nome del settore','warning'); return; }
      const ordine = parseInt(container.querySelector('#settore-ordine').value)||0;
      const { data, error } = await supa().from('settori').insert({ azienda_id:aziendaId, sede_id:currentSedeId||null, nome, colore:coloreSelezionato, ordine }).select('*').single();
      if (error) { mostraToast('Errore salvataggio: '+error.message,'error'); return; }
      settori.push(data);
      container.querySelector('#settore-nome').value = '';
      container.querySelector('#form-settore').style.display = 'none';
      renderListaSettori();
      mostraToast('Settore "'+nome+'" creato ✅','success');
    };

    // Postazioni — preview URL live
    const postSettore = container.querySelector('#post-settore');
    const postNome    = container.querySelector('#post-nome');
    const urlPreview  = container.querySelector('#post-url-preview');
    const aggiornaUrl = () => {
      const s = postSettore?.value;
      const url = s ? '#/display-cucina?settore=' + s : '#/display-cucina';
      if (urlPreview) urlPreview.innerHTML = 'URL tablet: <strong>' + url + '</strong> - <a href="' + url + '" target="_blank" style="color:#0E5A7A;font-size:12px;">Apri</a>';
    };
    postSettore?.addEventListener('change', aggiornaUrl);
    container.querySelector('#btn-nuova-postazione').onclick = () => { container.querySelector('#form-postazione').style.display='block'; postNome?.focus(); };
    container.querySelector('#btn-annulla-postazione').onclick = () => container.querySelector('#form-postazione').style.display='none';
    container.querySelector('#btn-salva-postazione').onclick = async () => {
      const nome = postNome?.value.trim();
      if (!nome) { mostraToast('Inserisci il nome della postazione','warning'); return; }
      const settoreNome = postSettore?.value || null;
      const url = settoreNome ? '#/display-cucina?settore=' + settoreNome : '#/display-cucina';
      const { data, error } = await supa().from('postazioni').insert({ azienda_id:aziendaId, sede_id:currentSedeId||null, nome, settore_nome:settoreNome, url_display:url }).select('*').single();
      if (error) { mostraToast('Errore: '+error.message,'error'); return; }
      postazioni.push(data);
      if (postNome) postNome.value = '';
      container.querySelector('#form-postazione').style.display = 'none';
      renderListaPostazioni();
      mostraToast('Postazione "'+nome+'" creata ✅','success');
    };
  }

  function renderListaSettori() {
    const box = container.querySelector('#lista-settori');
    if (!box) return;
    if (!settori.length) { box.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">Nessun settore. Creane uno per iniziare.</div>'; return; }
    box.innerHTML = settori.map(function(s,i) {
      var col = s.colore || COLORI_SETTORI[i % COLORI_SETTORI.length];
      return '<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px;">' +
        '<div style="width:14px;height:14px;border-radius:50%;background:' + col + ';flex-shrink:0;"></div>' +
        '<div style="flex:1;"><div style="font-size:14px;font-weight:600;color:#0f172a;">' + esc(s.nome) + '</div>' +
        '<div style="font-size:11px;color:#94a3b8;">Ordine: ' + (s.ordine||0) + '</div></div>' +
        '<button data-del-settore="' + s.id + '" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;">Elimina</button>' +
        '</div>';
    }).join('');
    box.querySelectorAll('[data-del-settore]').forEach(btn => btn.onclick = async () => {
      if (!confirm('Eliminare questo settore?')) return;
      await supa().from('settori').delete().eq('id', btn.dataset.delSettore);
      settori = settori.filter(s => s.id !== btn.dataset.delSettore);
      renderListaSettori();
    });
  }

  function renderListaPostazioni() {
    const box = container.querySelector('#lista-postazioni');
    if (!box) return;
    if (!postazioni.length) { box.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">Nessuna postazione. Creane una per ogni tablet fisso.</div>'; return; }
    box.innerHTML = postazioni.map(function(p) {
      var url = p.url_display || '#/display-cucina';
      return '<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;">' +
        '<div style="font-size:24px;">&#x1F4F1;</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:14px;font-weight:600;color:#0f172a;">' + esc(p.nome) + '</div>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px;">' + (p.settore_nome ? 'Settore: ' + esc(p.settore_nome) : 'Tutti i settori') + '</div>' +
          '<div style="font-size:12px;color:#0E5A7A;margin-top:2px;font-family:monospace;">' + esc(url) + '</div>' +
        '</div>' +
        '<a href="' + url + '" target="_blank" style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;">Apri</a>' +
        '<button data-del-post="' + p.id + '" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12px;">X</button>' +
        '</div>';
    }).join('');
    box.querySelectorAll('[data-del-post]').forEach(btn => btn.onclick = async () => {
      if (!confirm('Eliminare questa postazione?')) return;
      await supa().from('postazioni').delete().eq('id', btn.dataset.delPost);
      postazioni = postazioni.filter(p => p.id !== btn.dataset.delPost);
      renderListaPostazioni();
    });
  }

  function renderListaProdottiSettore() {
    const box = container.querySelector('#lista-prodotti-settore');
    if (!box) return;
    if (!prodottiVendita.length) { box.innerHTML = '<div style="color:#94a3b8;font-size:13px;">Nessun prodotto trovato.</div>'; return; }
    const catMap = {};
    categorieVendita.forEach(function(c){ catMap[c.id] = c.nome; });
    const perCat = {};
    prodottiVendita.forEach(function(p) {
      const cn = catMap[p.categoria_vendita_id] || 'Senza categoria';
      if (!perCat[cn]) perCat[cn] = [];
      perCat[cn].push(p);
    });
    var html = '';
    Object.entries(perCat).forEach(function(entry) {
      var cat = entry[0], prods = entry[1];
      html += '<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:4px;">';
      html += '<div style="padding:10px 16px;background:#f8fafc;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">' + esc(cat) + '</div>';
      prods.forEach(function(p) {
        var opts = '<option value="">Nessun settore</option>' +
          settori.map(function(s){ return '<option value="' + s.id + '"' + (p.settore_id === s.id ? ' selected' : '') + '>' + esc(s.nome) + '</option>'; }).join('');
        html += '<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #f1f5f9;">';
        html += '<div style="flex:1;font-size:13px;color:#0f172a;">' + esc(p.nome) + '</div>';
        html += '<select data-prod-settore="' + p.id + '" style="padding:5px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;background:white;min-width:140px;">' + opts + '</select>';
        html += '</div>';
      });
      html += '</div>';
    });
    box.innerHTML = html;
    box.querySelectorAll('[data-prod-settore]').forEach(function(sel) {
      sel.onchange = async function() {
        await supa().from('prodotti_vendita').update({ settore_id: sel.value || null }).eq('id', sel.dataset.prodSettore);
        mostraToast('Settore aggiornato','success');
      };
    });
  }

  function renderListaTempi() {
    const box = container.querySelector('#lista-tempi');
    if (!box) return;
    if (!ricette.length) { box.innerHTML = '<div style="color:#94a3b8;font-size:13px;">Nessuna ricetta trovata. Aggiungi le ricette nel Ricettario per impostare i tempi.</div>'; return; }
    box.innerHTML = ricette.map(r => {
      const prodotto = prodottiVendita.find(p => String(p.id) === String(r.prodotto_vendita_id));
      if (!prodotto) return '';
      return `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px;">
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:500;color:#0f172a;">${esc(prodotto.nome)}</div>
            <div style="font-size:11px;color:#64748b;">Ricetta ID: ${String(r.id).slice(0,8)}...</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <input type="number" data-ricetta-tempo="${r.id}" value="${r.tempo_esecuzione_min||15}" min="1" max="120"
              style="width:64px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:600;text-align:center;">
            <span style="font-size:12px;color:#64748b;">min</span>
            <span style="font-size:11px;color:#94a3b8;margin-left:4px;">Alert oltre questo tempo</span>
          </div>
        </div>
      `;
    }).filter(Boolean).join('');
    box.querySelectorAll('[data-ricetta-tempo]').forEach(inp => {
      inp.onchange = async () => {
        const rid = inp.dataset.ricettaTempo;
        const val = parseInt(inp.value)||15;
        await supa().from('ricette').update({ tempo_esecuzione_min: val }).eq('id', rid);
        mostraToast('Tempo aggiornato ✅','success');
      };
    });
  }

  // ════════════════════════════════════════
  // TAB: SALA & TAVOLI
  // ════════════════════════════════════════
  async function renderTabSala(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

    // Carica sale e tavoli
    const { data: saleData } = await supa()
      .from('sale').select('*')
      .eq('azienda_id', aziendaId)
      .order('nome');
    sale = saleData || [];

    const { data: tavoliData } = await supa()
      .from('tavoli').select('id,nome,numero,sala_id,sede_id,coperti_min,coperti_max,sedie,posizione,attivo,pos_x,pos_y')
      .eq('azienda_id', aziendaId).eq('sede_id', currentSedeId).order('numero');
    tavoli = tavoliData || [];

    box.innerHTML = ` <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;">🏠 Sale</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Crea le sale del locale (es. Sala interna, Terrazza, Giardino)</div>
          </div>
          <button id="btn-nuova-sala" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuova sala</button>
        </div>

        <div id="lista-sale" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;"></div>

        <div id="form-sala" style="display:none;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-top:12px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:12px;" id="form-sala-title">Nuova sala</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;">
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Nome sala *</label>
              <input id="sala-nome" class="input" placeholder="Es. Sala interna, Terrazza..." style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Capienza massima</label>
              <input id="sala-capienza" type="number" min="1" class="input" placeholder="Es. 50" style="width:100%;box-sizing:border-box;">
            </div>
            <div style="grid-column:1/-1;">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Note</label>
              <input id="sala-note" class="input" placeholder="Es. Solo su prenotazione, Accessibile..." style="width:100%;box-sizing:border-box;">
            </div>
          </div>
          <div id="sala-esito" style="font-size:13px;min-height:16px;margin-top:10px;"></div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button id="btn-salva-sala" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">💾 Salva</button>
            <button id="btn-annulla-sala" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px;">Annulla</button>
          </div>
        </div>
      </div> <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;">🪑 Tavoli</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Aggiungi tavoli con numero, coperti minimi/massimi e sala di appartenenza</div>
          </div>
          <button id="btn-nuovo-tavolo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuovo tavolo</button>
        </div> <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <button data-filter-sala="" class="btn-filter-sala" style="padding:5px 14px;border-radius:20px;border:1px solid #0E5A7A;background:#0E5A7A;color:white;font-size:12px;cursor:pointer;font-weight:600;">Tutti</button>
          ${sale.map(function(s){ return '<button data-filter-sala="' + s.id + '" class="btn-filter-sala" style="padding:5px 14px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;font-size:12px;cursor:pointer;">' + esc(s.nome) + '</button>'; }).join('')}
        </div>

        <div id="lista-tavoli-conf" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr));gap:10px;margin-bottom:12px;"></div>

        <div id="form-tavolo" style="display:none;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-top:12px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:12px;" id="form-tavolo-title">Nuovo tavolo</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;">
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Numero / Nome *</label>
              <input id="tavolo-numero" class="input" placeholder="Es. 1, T1, Bar..." style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Sala</label>
              <select id="tavolo-sala" class="input" style="width:100%;box-sizing:border-box;">
                <option value="">— Nessuna sala —</option>
                ${sale.map(function(s){ return '<option value="' + s.id + '">' + esc(s.nome) + '</option>'; }).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Coperti min</label>
              <input id="tavolo-min" type="number" min="1" value="1" class="input" style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Coperti max *</label>
              <input id="tavolo-max" type="number" min="1" value="4" class="input" style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Sedie (fisiche)</label>
              <input id="tavolo-sedie" type="number" min="0" class="input" placeholder="Es. 4" style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Posizione</label>
              <select id="tavolo-posizione" class="input" style="width:100%;box-sizing:border-box;">
                <option value="">—</option>
                <option value="interno">Interno</option>
                <option value="esterno">Esterno</option>
                <option value="terrazza">Terrazza</option>
                <option value="giardino">Giardino</option>
                <option value="bar">Bar</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Forma tavolo</label>
              <select id="tavolo-forma" class="input" style="width:100%;box-sizing:border-box;" onchange="aggiornaFormaCampi(this.value)">
                <option value="rettangolo">⬛ Rettangolare</option>
                <option value="quadrato">🟦 Quadrato</option>
                <option value="tondo">🔵 Tondo</option>
              </select>
            </div>
            <div id="campo-larghezza">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Larghezza (cm)</label>
              <input id="tavolo-larghezza" type="number" min="20" max="500" class="input" placeholder="Es. 80" style="width:100%;box-sizing:border-box;">
            </div>
            <div id="campo-lunghezza">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Lunghezza (cm)</label>
              <input id="tavolo-lunghezza" type="number" min="20" max="500" class="input" placeholder="Es. 120" style="width:100%;box-sizing:border-box;">
            </div>
            <div id="campo-diametro" style="display:none;">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Diametro (cm)</label>
              <input id="tavolo-diametro" type="number" min="40" max="300" class="input" placeholder="Es. 90" style="width:100%;box-sizing:border-box;">
            </div>
          </div>
          <div id="tavolo-esito" style="font-size:13px;min-height:16px;margin-top:10px;"></div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button id="btn-salva-tavolo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">💾 Salva</button>
            <button id="btn-annulla-tavolo" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px;">Annulla</button>
          </div>
        </div>
      </div> <div style="margin-top:8px;">
        <div style="font-size:17px;font-weight:700;color:#0f172a;margin-bottom:4px;">Piantina sala</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:14px;">Trascina i tavoli per creare la pianta esatta del tuo locale</div>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <select id="piantina-sala-sel" style="padding:7px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;">
            <option value="">Seleziona sala</option>
            ${sale.map(function(s){ return '<option value="' + s.id + '">' + esc(s.nome) + '</option>'; }).join('')}
          </select>
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b;">
            Larghezza: <input id="piantina-w" type="number" min="2" max="50" value="10" style="width:56px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;text-align:center;"> m
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b;">
            Altezza: <input id="piantina-h" type="number" min="2" max="50" value="8" style="width:56px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;text-align:center;"> m
          </div>
          <button id="btn-piantina-griglia" style="padding:7px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;font-size:12px;cursor:pointer;color:#374151;">Griglia ON/OFF</button>
          <button id="btn-piantina-salva" style="padding:7px 16px;border:none;border-radius:8px;background:#0E5A7A;color:#fff;font-size:13px;font-weight:700;cursor:pointer;margin-left:auto;">Salva piantina</button>
          <div id="piantina-esito" style="font-size:12px;min-height:14px;"></div>
        </div>
        <div id="piantina-wrap" style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;position:relative;user-select:none;">
          <div id="piantina-canvas" style="position:relative;background:#f8fafc;width:100%;min-height:400px;overflow:hidden;">
            <div id="piantina-empty" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#94a3b8;font-size:14px;">
              <div>Seleziona una sala per iniziare</div>
            </div>
          </div>
        </div>
        <div style="margin-top:20px;">
          ${[{ icon:'📅', titolo:'Prenotazioni', desc:'Gestisci arrivi e tavoli.', link:'prenotazioni', cta:'Vai a Prenotazioni' }].map(c => cardLink(c)).join('')}
        </div>
      </div>
    `;

    renderListaSale();
    renderListaTavoliConf();
    bindSala();
    bindPiantina();
  }

  function renderListaSale() {
    const box = container.querySelector('#lista-sale');
    if (!box) return;
    if (!sale.length) { box.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">Nessuna sala. Creane una per organizzare i tavoli.</div>'; return; }
    box.innerHTML = sale.map(function(s) {
      var nTavoli = tavoli.filter(function(t){ return t.sala_id === s.id; }).length;
      var info = (s.capienza_max ? 'Capienza: ' + s.capienza_max + ' posti' : '') + (s.note ? ' - ' + esc(s.note) : '') + ' - ' + nTavoli + ' tavoli';
      return '<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
        '<div style="flex:1;"><div style="font-size:14px;font-weight:600;color:#0f172a;">' + esc(s.nome) + '</div>' +
        '<div style="font-size:12px;color:#64748b;margin-top:2px;">' + info + '</div></div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button data-edit-sala="' + s.id + '" style="background:#f0f9ff;border:1px solid #bae6fd;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;color:#0E5A7A;font-weight:600;">Modifica</button>' +
          '<button data-del-sala="' + s.id + '" style="background:#fee2e2;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;color:#dc2626;">Elimina</button>' +
        '</div></div>';
    }).join('');
    box.querySelectorAll('[data-edit-sala]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var s = sale.find(function(x){ return x.id === btn.dataset.editSala; });
        if (!s) return;
        container.querySelector('#form-sala-title').textContent = 'Modifica sala';
        container.querySelector('#sala-nome').value = s.nome || '';
        container.querySelector('#sala-capienza').value = s.capienza_max || '';
        container.querySelector('#sala-note').value = s.note || '';
        container.querySelector('#form-sala').dataset.editId = s.id;
        container.querySelector('#form-sala').style.display = '';
        container.querySelector('#sala-nome').focus();
      });
    });
    box.querySelectorAll('[data-del-sala]').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('Eliminare questa sala? I tavoli associati rimarranno.')) return;
        await supa().from('sale').delete().eq('id', btn.dataset.delSala);
        sale = sale.filter(function(s){ return s.id !== btn.dataset.delSala; });
        renderListaSale(); renderListaTavoliConf();
      });
    });
  }

  let filtroSalaAttivo = '';
  function renderListaTavoliConf() {
    const box = container.querySelector('#lista-tavoli-conf');
    if (!box) return;
    const filtered = filtroSalaAttivo ? tavoli.filter(t => t.sala_id === filtroSalaAttivo) : tavoli;
    if (!filtered.length) { box.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;grid-column:1/-1;">Nessun tavolo. Aggiungine uno.</div>'; return; }
    box.innerHTML = filtered.map(function(t) {
      var salaObj = sale.find(function(s){ return s.id === t.sala_id; });
      var salaNome = salaObj ? salaObj.nome : '';
      var nLabel = 'T' + esc(String(t.numero || t.nome || '?'));
      var coperti = (t.coperti_min||1) + '-' + (t.coperti_max||4) + ' coperti' + (t.sedie ? ' - ' + t.sedie + ' sedie' : '');
      return '<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px;position:relative;">' +
        '<div style="font-size:20px;font-weight:700;color:#0E5A7A;margin-bottom:4px;">' + nLabel + '</div>' +
        (salaNome ? '<div style="font-size:12px;color:#64748b;">' + esc(salaNome) + '</div>' : '') +
        '<div style="font-size:12px;color:#64748b;margin-top:2px;">' + coperti + '</div>' +
        (t.posizione ? '<div style="font-size:11px;color:#94a3b8;margin-top:2px;">' + esc(t.posizione) + '</div>' : '') +
        '<div style="position:absolute;top:8px;right:8px;display:flex;gap:4px;">' +
          '<button data-edit-tavolo="' + t.id + '" style="background:#f0f9ff;border:1px solid #bae6fd;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;color:#0E5A7A;">Mod</button>' +
          '<button data-del-tavolo="' + t.id + '" style="background:#fee2e2;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;color:#dc2626;">Del</button>' +
        '</div></div>';
    }).join('');
    box.querySelectorAll('[data-edit-tavolo]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var t = tavoli.find(function(x){ return x.id === btn.dataset.editTavolo; });
        if (!t) return;
        container.querySelector('#form-tavolo-title').textContent = 'Modifica tavolo';
        container.querySelector('#tavolo-numero').value = t.numero || t.nome || '';
        container.querySelector('#tavolo-min').value = t.coperti_min || 1;
        container.querySelector('#tavolo-max').value = t.coperti_max || 4;
        container.querySelector('#tavolo-sedie').value = t.sedie || '';
        container.querySelector('#tavolo-posizione').value = t.posizione || '';
        const formaV = t.forma || 'rettangolo';
        const formaEl = container.querySelector('#tavolo-forma');
        if (formaEl) { formaEl.value = formaV; window.aggiornaFormaCampi(formaV); }
        if (container.querySelector('#tavolo-larghezza')) container.querySelector('#tavolo-larghezza').value = t.larghezza_cm || '';
        if (container.querySelector('#tavolo-lunghezza')) container.querySelector('#tavolo-lunghezza').value = t.lunghezza_cm || '';
        if (container.querySelector('#tavolo-diametro')) container.querySelector('#tavolo-diametro').value = t.diametro_cm || '';
        var salaSelect = container.querySelector('#tavolo-sala');
        if (salaSelect) {
          salaSelect.innerHTML = '<option value="">Nessuna sala</option>' +
            sale.map(function(s){ return '<option value="' + s.id + '"' + (s.id === t.sala_id ? ' selected' : '') + '>' + esc(s.nome) + '</option>'; }).join('');
        }
        container.querySelector('#form-tavolo').dataset.editId = t.id;
        container.querySelector('#form-tavolo').style.display = '';
        container.querySelector('#tavolo-numero').focus();
      });
    });
    box.querySelectorAll('[data-del-tavolo]').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('Eliminare questo tavolo?')) return;
        await supa().from('tavoli').delete().eq('id', btn.dataset.delTavolo);
        tavoli = tavoli.filter(function(t){ return t.id !== btn.dataset.delTavolo; });
        renderListaTavoliConf();
      });
    });
  }

  function bindSala() {
    // Sale
    let editingSalaId = null;
    container.querySelector('#btn-nuova-sala')?.addEventListener('click', () => {
      container.querySelector('#form-sala-title').textContent = 'Nuova sala';
      container.querySelector('#sala-nome').value = '';
      container.querySelector('#sala-capienza').value = '';
      container.querySelector('#sala-note').value = '';
      container.querySelector('#form-sala').dataset.editId = '';
      container.querySelector('#form-sala').style.display = '';
      container.querySelector('#sala-nome').focus();
    });
    container.querySelector('#btn-annulla-sala')?.addEventListener('click', () => {
      container.querySelector('#form-sala').style.display = 'none';
    });
    container.querySelector('#btn-salva-sala')?.addEventListener('click', async () => {
      const esito = container.querySelector('#sala-esito');
      const nome = container.querySelector('#sala-nome').value.trim();
      if (!nome) { esito.textContent = '❌ Nome obbligatorio'; esito.style.color = '#dc2626'; return; }
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
      const payload = {
        azienda_id: aziendaId,
        sede_id: currentSedeId || null,
        nome,
        capienza_max: parseInt(container.querySelector('#sala-capienza').value) || null,
        note: container.querySelector('#sala-note').value.trim() || null,
      };
      const editId = container.querySelector('#form-sala').dataset.editId || null;
      let data, error;
      if (editId) {
        ({ data, error } = await supa().from('sale').update(payload).eq('id', editId).select('*').single());
        if (!error) { sale = sale.map(function(s){ return s.id === editId ? data : s; }); }
      } else {
        ({ data, error } = await supa().from('sale').insert(payload).select('*').single());
        if (!error) { sale.push(data); }
      }
      if (error) { esito.textContent = 'Errore: ' + error.message; esito.style.color = '#dc2626'; return; }
      container.querySelector('#form-sala').dataset.editId = '';
      container.querySelector('#form-sala').style.display = 'none';
      renderListaSale();
      mostraToast('Sala ' + (editId ? 'modificata' : 'creata'), 'success');
    });

    // Tavoli
    container.querySelector('#btn-nuovo-tavolo')?.addEventListener('click', () => {
      container.querySelector('#form-tavolo-title').textContent = 'Nuovo tavolo';
      container.querySelector('#tavolo-numero').value = '';
      container.querySelector('#tavolo-min').value = '1';
      container.querySelector('#tavolo-max').value = '4';
      container.querySelector('#tavolo-sedie').value = '';
      const salaSelect = container.querySelector('#tavolo-sala');
      if (salaSelect) {
        salaSelect.innerHTML = '<option value="">Nessuna sala</option>' +
          sale.map(function(s){ return '<option value="' + s.id + '">' + esc(s.nome) + '</option>'; }).join('');
        salaSelect.value = '';
      }
      container.querySelector('#form-tavolo').dataset.editId = '';
      container.querySelector('#form-tavolo').style.display = '';
      container.querySelector('#tavolo-numero').focus();
    });
    container.querySelector('#btn-annulla-tavolo')?.addEventListener('click', () => {
      container.querySelector('#form-tavolo').style.display = 'none';
    });
    // Forma tavolo — mostra/nasconde campi misure
    window.aggiornaFormaCampi = function(forma) {
      const cL = container.querySelector('#campo-larghezza');
      const cLu = container.querySelector('#campo-lunghezza');
      const cD = container.querySelector('#campo-diametro');
      if (!cL || !cLu || !cD) return;
      if (forma === 'tondo') {
        cL.style.display = 'none'; cLu.style.display = 'none'; cD.style.display = '';
      } else if (forma === 'quadrato') {
        cL.style.display = ''; cLu.style.display = 'none'; cD.style.display = 'none';
        cL.querySelector('label').textContent = 'Lato (cm)';
      } else {
        cL.style.display = ''; cLu.style.display = ''; cD.style.display = 'none';
        cL.querySelector('label').textContent = 'Larghezza (cm)';
      }
    };

    container.querySelector('#btn-salva-tavolo')?.addEventListener('click', async () => {
      const esito = container.querySelector('#tavolo-esito');
      const numero = container.querySelector('#tavolo-numero').value.trim();
      const max = parseInt(container.querySelector('#tavolo-max').value);
      if (!numero || !max) { esito.textContent = '❌ Numero e coperti max obbligatori'; esito.style.color = '#dc2626'; return; }
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
      const payload = {
        azienda_id: aziendaId,
        sede_id: currentSedeId || null,
        sala_id: container.querySelector('#tavolo-sala').value || null,
        numero: isNaN(Number(numero)) ? null : Number(numero),
        nome: numero,
        coperti_min: parseInt(container.querySelector('#tavolo-min').value) || 1,
        coperti_max: max,
        sedie: parseInt(container.querySelector('#tavolo-sedie').value) || null,
        posizione: container.querySelector('#tavolo-posizione').value || null,
        forma: container.querySelector('#tavolo-forma').value || 'rettangolo',
        larghezza_cm: parseInt(container.querySelector('#tavolo-larghezza').value) || null,
        lunghezza_cm: parseInt(container.querySelector('#tavolo-lunghezza').value) || null,
        diametro_cm: parseInt(container.querySelector('#tavolo-diametro').value) || null,
        attivo: true,
      };
      const editIdTav = container.querySelector('#form-tavolo').dataset.editId || null;
      let dataTav, errorTav;
      if (editIdTav) {
        ({ data: dataTav, error: errorTav } = await supa().from('tavoli').update(payload).eq('id', editIdTav).select('id,nome,numero,sala_id,sede_id,coperti_min,coperti_max,sedie,posizione,attivo,pos_x,pos_y,forma,larghezza_cm,lunghezza_cm,diametro_cm').single());
        if (!errorTav) { tavoli = tavoli.map(function(t){ return t.id === editIdTav ? dataTav : t; }); }
      } else {
        ({ data: dataTav, error: errorTav } = await supa().from('tavoli').insert(payload).select('id,nome,numero,sala_id,sede_id,coperti_min,coperti_max,sedie,posizione,attivo,pos_x,pos_y,forma,larghezza_cm,lunghezza_cm,diametro_cm').single());
        if (!errorTav) { tavoli.push(dataTav); }
      }
      if (errorTav) { esito.textContent = 'Errore: ' + errorTav.message; esito.style.color = '#dc2626'; return; }
      container.querySelector('#form-tavolo').dataset.editId = '';
      container.querySelector('#form-tavolo').style.display = 'none';
      renderListaTavoliConf();
      mostraToast('Tavolo ' + numero + (editIdTav ? ' modificato' : ' aggiunto'), 'success');
    });

    // Filtro sala
    container.querySelectorAll('.btn-filter-sala').forEach(btn => {
      btn.addEventListener('click', () => {
        filtroSalaAttivo = btn.dataset.filterSala;
        container.querySelectorAll('.btn-filter-sala').forEach(b => {
          const att = b.dataset.filterSala === filtroSalaAttivo;
          b.style.background = att ? '#0E5A7A' : 'white';
          b.style.color = att ? 'white' : '#374151';
          b.style.borderColor = att ? '#0E5A7A' : '#e5e7eb';
        });
        renderListaTavoliConf();
      });
    });

    // Nav buttons
    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => { window.location.hash = '#/' + btn.dataset.nav; });
    });
  }

  // ════════════════════════════════════════
  // PIANTINA SALA
  // ════════════════════════════════════════
  function bindPiantina() {
    const canvas = container.querySelector('#piantina-canvas');
    const empty = container.querySelector('#piantina-empty');
    const salaSel = container.querySelector('#piantina-sala-sel');
    const wInput = container.querySelector('#piantina-w');
    const hInput = container.querySelector('#piantina-h');
    const btnGriglia = container.querySelector('#btn-piantina-griglia');
    const btnSalva = container.querySelector('#btn-piantina-salva');
    const esito = container.querySelector('#piantina-esito');
    if (!canvas || !salaSel) return;
    let grigliaOn = true, salaSelId = '', tavoliPiantina = [], dragEl = null, dragOffX = 0, dragOffY = 0;
    const CELL = 5;
    function snap(v) { return grigliaOn ? Math.round(v / CELL) * CELL : v; }
    function renderPiantina() {
      const tavoliSala = tavoliPiantina.filter(t => !salaSelId || t.sala_id === salaSelId);
      const w = parseFloat(wInput.value) || 10, h = parseFloat(hInput.value) || 8;
      canvas.style.paddingBottom = (h / w * 100).toFixed(2) + '%';
      canvas.style.height = '0'; canvas.style.minHeight = '';
      canvas.style.background = grigliaOn ? 'repeating-linear-gradient(#e5e7eb 0 1px, transparent 1px 5%) repeating-linear-gradient(90deg, #e5e7eb 0 1px, transparent 1px 5%), #f8fafc' : '#f8fafc';
      canvas.querySelectorAll('.piantina-tavolo').forEach(el => el.remove());
      if (empty) empty.style.display = tavoliSala.length ? 'none' : '';
      tavoliSala.forEach(t => {
        const el = document.createElement('div');
        el.className = 'piantina-tavolo'; el.dataset.id = t.id;
        const px = t.px ?? 10, py = t.py ?? 10;
        const forma = t.forma || 'rettangolo';
        const isTondo = forma === 'tondo';
        const isQuadrato = forma === 'quadrato';

        // Calcola dimensioni in % relative alla sala
        const salaW = parseFloat(wInput.value) || 10;
        const salaH = parseFloat(hInput.value) || 8;
        let tw, th;
        if (isTondo) {
          const d = (t.diametro_cm || 80) / 100; // in metri
          tw = (d / salaW * 100).toFixed(1);
          th = null; // aspect-ratio 1
        } else if (isQuadrato) {
          const lato = (t.larghezza_cm || 80) / 100;
          tw = (lato / salaW * 100).toFixed(1);
          th = null;
        } else {
          const larg = (t.larghezza_cm || 80) / 100;
          const lung = (t.lunghezza_cm || 120) / 100;
          tw = (larg / salaW * 100).toFixed(1);
          th = (lung / salaH * 100).toFixed(1);
        }

        const borderRadius = isTondo ? '50%' : '8px';
        const aspectRatio = (!th) ? '1' : 'auto';
        const heightStyle = th ? `height:${th}%;` : `aspect-ratio:${aspectRatio};`;

        el.style.cssText = `position:absolute;left:${px}%;top:${py}%;width:${tw}%;${heightStyle}background:#e8f4f8;border:2px solid #0E5A7A;border-radius:${borderRadius};display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:grab;font-size:10px;font-weight:700;color:#0E5A7A;box-shadow:0 2px 6px rgba(0,0,0,.1);user-select:none;z-index:10;`;
        el.innerHTML = '<div style="font-size:11px;font-weight:800;">' + esc(String(t.numero || t.nome || '?')) + '</div><div style="font-size:9px;opacity:.7;">' + (t.coperti_max ? t.coperti_max + 'p' : '') + '</div>';
        el.addEventListener('mousedown', function(e) {
          e.preventDefault(); dragEl = el;
          const rect = canvas.getBoundingClientRect();
          dragOffX = (e.clientX - rect.left) / rect.width * 100 - px;
          dragOffY = (e.clientY - rect.top) / rect.height * 100 - py;
          el.style.cursor = 'grabbing'; el.style.zIndex = '100';
        });
        // Click singolo su tavolo → apre form modifica
        el.addEventListener('click', function(e) {
          if (Math.abs(parseFloat(el.style.left) - px) > 1 || Math.abs(parseFloat(el.style.top) - py) > 1) return; // era un drag
          const tav = tavoliPiantina.find(x => x.id === el.dataset.id);
          if (!tav) return;

          // Rimuovi popup precedenti
          container.querySelectorAll('.tavolo-popup').forEach(p => p.remove());

          // Crea popup contestuale
          const popup = document.createElement('div');
          popup.className = 'tavolo-popup';
          popup.style.cssText = `position:absolute;left:${parseFloat(el.style.left) + 10}%;top:${parseFloat(el.style.top)}%;background:white;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);padding:12px;z-index:200;min-width:140px;border:1px solid #e5e7eb;`;
          popup.innerHTML = `
            <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;">Tavolo ${esc(String(tav.numero || tav.nome || '?'))}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:10px;">${tav.coperti_max || '?'} posti · ${tav.forma || 'rettangolo'}</div>
            <button class="popup-btn-modifica" style="width:100%;padding:7px;background:#0E5A7A;color:white;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:6px;">✏️ Modifica</button>
            <button class="popup-btn-elimina" style="width:100%;padding:7px;background:#fef2f2;color:#dc2626;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;">🗑️ Elimina</button>
          `;
          canvas.appendChild(popup);

          // Evidenzia
          canvas.querySelectorAll('.piantina-tavolo').forEach(x => { x.style.border = '2px solid #0E5A7A'; x.style.background = '#e8f4f8'; });
          el.style.border = '2.5px solid #f59e0b';
          el.style.background = '#fef3c7';

          // Chiudi popup cliccando altrove
          setTimeout(() => {
            document.addEventListener('click', function closePopup(ev) {
              if (!popup.contains(ev.target) && ev.target !== el) {
                popup.remove();
                el.style.border = '2px solid #0E5A7A';
                el.style.background = '#e8f4f8';
                document.removeEventListener('click', closePopup);
              }
            });
          }, 100);

          // Modifica
          popup.querySelector('.popup-btn-modifica').onclick = function() {
            popup.remove();
            const formTavolo = container.querySelector('#form-tavolo');
            const formTitle  = container.querySelector('#form-tavolo-title');
            if (!formTavolo) return;
            formTitle.textContent = 'Modifica tavolo';
            container.querySelector('#tavolo-numero').value  = tav.numero || tav.nome || '';
            container.querySelector('#tavolo-min').value     = tav.coperti_min || 1;
            container.querySelector('#tavolo-max').value     = tav.coperti_max || 4;
            container.querySelector('#tavolo-sedie').value   = tav.sedie || '';
            container.querySelector('#tavolo-posizione').value = tav.posizione || '';
            const salaSelect = container.querySelector('#tavolo-sala');
            if (salaSelect) salaSelect.value = tav.sala_id || '';
            const formaV = tav.forma || 'rettangolo';
            const formaEl = container.querySelector('#tavolo-forma');
            if (formaEl) { formaEl.value = formaV; window.aggiornaFormaCampi(formaV); }
            if (container.querySelector('#tavolo-larghezza')) container.querySelector('#tavolo-larghezza').value = tav.larghezza_cm || '';
            if (container.querySelector('#tavolo-lunghezza')) container.querySelector('#tavolo-lunghezza').value = tav.lunghezza_cm || '';
            if (container.querySelector('#tavolo-diametro')) container.querySelector('#tavolo-diametro').value = tav.diametro_cm || '';
            formTavolo.dataset.editId = tav.id;
            formTavolo.style.display = '';
            formTavolo.scrollIntoView({ behavior: 'smooth', block: 'center' });
          };

          // Elimina
          popup.querySelector('.popup-btn-elimina').onclick = async function() {
            if (!confirm('Eliminare il tavolo ' + (tav.numero || tav.nome) + '?')) return;
            await supa().from('tavoli').delete().eq('id', tav.id);
            tavoliPiantina = tavoliPiantina.filter(x => x.id !== tav.id);
            tavoli = tavoli.filter(x => x.id !== tav.id);
            popup.remove();
            renderPiantina();
            renderListaTavoliConf();
            mostraToast('Tavolo eliminato', 'success');
          };
        });
        el.addEventListener('touchstart', function(e) {
          e.preventDefault(); dragEl = el;
          const rect = canvas.getBoundingClientRect(), touch = e.touches[0];
          dragOffX = (touch.clientX - rect.left) / rect.width * 100 - px;
          dragOffY = (touch.clientY - rect.top) / rect.height * 100 - py;
        }, { passive: false });
        canvas.appendChild(el);
      });
    }
    canvas.addEventListener('mousemove', function(e) {
      if (!dragEl) return;
      const rect = canvas.getBoundingClientRect();
      let nx = Math.max(0, Math.min(90, snap((e.clientX - rect.left) / rect.width * 100 - dragOffX)));
      let ny = Math.max(0, Math.min(90, snap((e.clientY - rect.top) / rect.height * 100 - dragOffY)));
      dragEl.style.left = nx + '%'; dragEl.style.top = ny + '%';
      const t = tavoliPiantina.find(x => x.id === dragEl.dataset.id);
      if (t) { t.px = nx; t.py = ny; }
    });
    canvas.addEventListener('touchmove', function(e) {
      if (!dragEl) return; e.preventDefault();
      const rect = canvas.getBoundingClientRect(), touch = e.touches[0];
      let nx = Math.max(0, Math.min(90, snap((touch.clientX - rect.left) / rect.width * 100 - dragOffX)));
      let ny = Math.max(0, Math.min(90, snap((touch.clientY - rect.top) / rect.height * 100 - dragOffY)));
      dragEl.style.left = nx + '%'; dragEl.style.top = ny + '%';
      const t = tavoliPiantina.find(x => x.id === dragEl.dataset.id);
      if (t) { t.px = nx; t.py = ny; }
    }, { passive: false });
    function stopDrag() { if (dragEl) { dragEl.style.cursor = 'grab'; dragEl.style.zIndex = '10'; dragEl = null; } }
    canvas.addEventListener('mouseup', stopDrag); canvas.addEventListener('mouseleave', stopDrag); canvas.addEventListener('touchend', stopDrag);
    salaSel.addEventListener('change', async function() {
      salaSelId = this.value;
      if (!salaSelId) { if (empty) empty.style.display = ''; canvas.querySelectorAll('.piantina-tavolo').forEach(el => el.remove()); return; }
      tavoliPiantina = [];
      const { data } = await supa().from('tavoli').select('id,nome,numero,sala_id,sede_id,coperti_min,coperti_max,posizione,pos_x,pos_y,attivo,forma,larghezza_cm,lunghezza_cm,diametro_cm').eq('azienda_id', aziendaId).eq('sala_id', salaSelId).eq('attivo', true).order('numero');
      tavoliPiantina = (data || []).map((t, i) => ({ ...t, px: t.pos_x != null ? t.pos_x : (i % 5) * 18 + 5, py: t.pos_y != null ? t.pos_y : Math.floor(i / 5) * 20 + 5 }));
      renderPiantina();
    });
    btnGriglia.addEventListener('click', () => { grigliaOn = !grigliaOn; btnGriglia.style.background = grigliaOn ? '#e8f4f8' : '#f8fafc'; renderPiantina(); });
    wInput.addEventListener('change', renderPiantina); hInput.addEventListener('change', renderPiantina);
    btnSalva.addEventListener('click', async () => {
      if (!salaSelId) { esito.textContent = 'Seleziona una sala prima'; esito.style.color = '#f59e0b'; return; }
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
      await Promise.all(tavoliPiantina.filter(t => t.sala_id === salaSelId).map(t => supa().from('tavoli').update({ pos_x: t.px, pos_y: t.py }).eq('id', t.id)));
      esito.textContent = 'Piantina salvata!'; esito.style.color = '#15803d';
      setTimeout(() => { esito.textContent = ''; }, 3000);
    });
  }

  // ════════════════════════════════════════
  // TAB: MENU & CATALOGO PRODOTTI
  // ════════════════════════════════════════
  async function renderTabMenu(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

    const { data: categorie } = await supa()
      .from('categorie_vendita')
      .select('id, nome')
      .eq('azienda_id', aziendaId)
      .eq('sede_id', currentSedeId)
      .order('nome');

    const { data: sedi } = await supa()
      .from('sedi').select('id, nome')
      .eq('azienda_id', aziendaId).order('nome');

    let prodotti = [];
    const caricaProdotti = async (filtroCanale = '', filtroTipo = '', filtroQ = '') => {
      let q = supa().from('prodotti_vendita').select('*, categorie_vendita(nome)')
        .eq('azienda_id', aziendaId);
      if (currentSedeId) q = q.eq('sede_id', currentSedeId);
      if (filtroCanale) q = q.eq('canale', filtroCanale);
      if (filtroTipo) q = q.eq('tipo', filtroTipo);
      if (filtroQ) q = q.ilike('nome', '%' + filtroQ + '%');
      const { data } = await q.order('ordinamento').order('nome');
      prodotti = data || [];
    };

    await caricaProdotti();

    const canaliOpts = ['tutti', 'evento', 'ristorante', 'trattoria', 'bar']
      .map(function(c){ return '<option value="' + c + '">' + c + '</option>'; }).join('');
    const tipiOpts = ['', 'portata', 'servizio', 'menu_fisso', 'bevanda', 'altro']
      .map(function(t){ return '<option value="' + t + '">' + (t || '— tutti i tipi —') + '</option>'; }).join('');
    const catOpts = (categorie || []).map(function(c){ return '<option value="' + c.id + '">' + esc(c.nome) + '</option>'; }).join('');

    box.innerHTML = ` <div style="background:linear-gradient(135deg,#0E5A7A,#1a8fb5);border-radius:16px;padding:20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:17px;font-weight:800;color:#fff;">🍽️ Menu Builder</div>
          <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;">Crea menu digitali con categorie, foto, food cost live, QR code e link pubblico</div>
        </div>
        <button id="btn-apri-menu-builder" style="background:#fff;color:#0E5A7A;border:none;border-radius:12px;padding:12px 22px;font-size:14px;font-weight:800;cursor:pointer;white-space:nowrap;">🚀 Apri Menu Builder</button>
      </div> <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:17px;font-weight:700;color:#0f172a;">📦 Catalogo prodotti</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Portate, servizi e menu — usati da preventivi, comande e menu digitale</div>
        </div>
        <button id="btn-nuovo-prodotto" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">+ Aggiungi prodotto</button>
      </div> <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">
        <input id="filtro-q" class="input" placeholder="🔍 Cerca..." style="flex:1;min-width:150px;max-width:220px;">
        <select id="filtro-canale" class="input" style="min-width:120px;">${canaliOpts}</select>
        <select id="filtro-tipo" class="input" style="min-width:130px;">${tipiOpts}</select>
        <button id="btn-applica-filtri" style="background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;">Filtra</button>
      </div> <div id="lista-prodotti-cat"></div> <div id="form-prodotto-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin-top:20px;">
        <div style="font-size:16px;font-weight:700;margin-bottom:16px;" id="form-prodotto-title">Nuovo prodotto</div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">Nome *</label>
            <input id="pv-nome" class="input" placeholder="Es. Risotto al tartufo" style="margin-top:4px;width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">Canale</label>
            <select id="pv-canale" class="input" style="margin-top:4px;width:100%;box-sizing:border-box;">
              <option value="tutti">Tutti</option>
              <option value="evento">Evento / Preventivi</option>
              <option value="ristorante">Ristorante</option>
              <option value="trattoria">Trattoria</option>
              <option value="bar">Bar</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">Tipo</label>
            <select id="pv-tipo" class="input" style="margin-top:4px;width:100%;box-sizing:border-box;">
              <option value="portata">Portata</option>
              <option value="servizio">Servizio</option>
              <option value="menu_fisso">Menu fisso</option>
              <option value="bevanda">Bevanda</option>
              <option value="altro">Altro</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">Categoria</label>
            <select id="pv-categoria" class="input" style="margin-top:4px;width:100%;box-sizing:border-box;">
              <option value="">— Nessuna —</option>
              ${catOpts}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">Prezzo base (€)</label>
            <input id="pv-prezzo" type="number" step="0.01" min="0" class="input" placeholder="Es. 15.00" style="margin-top:4px;width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">IVA (%)</label>
            <select id="pv-iva" class="input" style="margin-top:4px;width:100%;box-sizing:border-box;">
              <option value="10">10% (Ristorazione)</option>
              <option value="22">22% (Alcolici)</option>
              <option value="4">4% (Prima necessità)</option>
              <option value="0">Esente</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">Sede</label>
            <select id="pv-sede" class="input" style="margin-top:4px;width:100%;box-sizing:border-box;">
              ${(sedi || []).map(function(s){ return '<option value="' + s.id + '"' + (s.id === currentSedeId ? ' selected' : '') + '>' + esc(s.nome) + '</option>'; }).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">Ordinamento</label>
            <input id="pv-ordine" type="number" min="0" class="input" value="0" style="margin-top:4px;width:100%;box-sizing:border-box;">
          </div>
        </div>

        <div style="margin-top:12px;">
          <label style="font-size:12px;font-weight:600;color:#64748b;">Descrizione</label>
          <textarea id="pv-descrizione" class="input" rows="2" placeholder="Descrizione breve per menu e preventivi..." style="margin-top:4px;width:100%;box-sizing:border-box;"></textarea>
        </div>

        <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
            <input type="checkbox" id="pv-attivo" checked> Attivo
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
            <input type="checkbox" id="pv-visibile" checked> Visibile nel menu
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
            <input type="checkbox" id="pv-disponibile" checked> Disponibile oggi
          </label>
        </div>

        <div id="pv-esito" style="font-size:13px;min-height:16px;margin-top:12px;"></div>

        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
          <button id="btn-salva-prodotto" style="background:#0E5A7A;color:white;border:none;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">💾 Salva</button>
          <button id="btn-annulla-prodotto" style="background:#f1f5f9;color:#374151;border:none;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:14px;">Annulla</button>
        </div>
      </div> <div style="margin-top:32px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px;">
        ${[
          { icon:'🏷️', titolo:'Categorie', link:'bo-categorie', cta:'Gestisci categorie' },
          { icon:'📋', titolo:'Menu digitale', link:'bo-menu', cta:'Menu builder' },
          { icon:'📣', titolo:'Marketing', link:'campagne', cta:'Campagne' },
        ].map(c => cardLink({ ...c, desc: '' })).join('')}
      </div>
    `;

    let editingProdId = null;

    function renderListaProdotti() {
      const el = box.querySelector('#lista-prodotti-cat');
      if (!prodotti.length) {
        el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:12px 0;">Nessun prodotto trovato.</div>';
        return;
      }

      const CANALE_COLORS = { evento:'#dbeafe', ristorante:'#dcfce7', trattoria:'#fef3c7', bar:'#f3e8ff', tutti:'#f1f5f9' };
      const CANALE_TEXT = { evento:'#1d4ed8', ristorante:'#15803d', trattoria:'#92400e', bar:'#7e22ce', tutti:'#374151' };

      el.innerHTML = prodotti.map(p => {
        const catNome = p.categorie_vendita?.nome || '';
        return `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:180px;">
              <div style="font-weight:700;font-size:14px;color:#0f172a;">${esc(p.nome)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px;">
                ${catNome ? esc(catNome) + ' · ' : ''}${p.tipo || ''}
                ${p.prezzo_base ? ' · <strong>€' + Number(p.prezzo_base).toFixed(2) + '</strong>' : ''}
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              <span style="background:${CANALE_COLORS[p.canale]||'#f1f5f9'};color:${CANALE_TEXT[p.canale]||'#374151'};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;">${p.canale || 'tutti'}</span>
              ${!p.attivo ? '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:20px;font-size:11px;">Disattivo</span>' : ''}
              ${!p.disponibile ? '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-size:11px;">Non disponibile</span>' : ''}
              <button data-edit-prod="${p.id}" style="background:#f0f9ff;border:1px solid #bae6fd;padding:5px 12px;border-radius:8px;cursor:pointer;font-size:12px;color:#0E5A7A;">✏️</button>
              <button data-del-prod="${p.id}" style="background:#fee2e2;border:none;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>
            </div>
          </div>
        `;
      }).join('');

      el.querySelectorAll('[data-edit-prod]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = prodotti.find(x => x.id === btn.dataset.editProd);
          if (p) apriFormProdotto(p);
        });
      });
      el.querySelectorAll('[data-del-prod]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Eliminare questo prodotto?')) return;
          await supa().from('prodotti_vendita').delete().eq('id', btn.dataset.delProd);
          prodotti = prodotti.filter(x => x.id !== btn.dataset.delProd);
          renderListaProdotti();
          mostraToast('Prodotto eliminato', 'success');
        });
      });
    }

    function apriFormProdotto(p = null) {
      editingProdId = p?.id || null;
      box.querySelector('#form-prodotto-title').textContent = p ? 'Modifica prodotto' : 'Nuovo prodotto';
      box.querySelector('#pv-nome').value = p?.nome || '';
      box.querySelector('#pv-canale').value = p?.canale || 'tutti';
      box.querySelector('#pv-tipo').value = p?.tipo || 'portata';
      box.querySelector('#pv-categoria').value = p?.categoria_vendita_id || '';
      box.querySelector('#pv-prezzo').value = p?.prezzo_base || '';
      box.querySelector('#pv-iva').value = p?.iva || '10';
      box.querySelector('#pv-sede').value = p?.sede_id || currentSedeId || '';
      box.querySelector('#pv-ordine').value = p?.ordinamento || 0;
      box.querySelector('#pv-descrizione').value = p?.descrizione || '';
      box.querySelector('#pv-attivo').checked = p?.attivo ?? true;
      box.querySelector('#pv-visibile').checked = p?.visibile ?? true;
      box.querySelector('#pv-disponibile').checked = p?.disponibile ?? true;
      box.querySelector('#pv-esito').textContent = '';
      box.querySelector('#form-prodotto-wrap').style.display = '';
      box.querySelector('#pv-nome').focus();
    }

    renderListaProdotti();

    // Bind form
    box.querySelector('#btn-apri-menu-builder').addEventListener('click', () => { window.location.hash = '#/bo-menu'; });
    box.querySelector('#btn-nuovo-prodotto').addEventListener('click', () => apriFormProdotto(null));
    box.querySelector('#btn-annulla-prodotto').addEventListener('click', () => {
      box.querySelector('#form-prodotto-wrap').style.display = 'none';
    });
    box.querySelector('#btn-applica-filtri').addEventListener('click', async () => {
      const q = box.querySelector('#filtro-q').value.trim();
      const canale = box.querySelector('#filtro-canale').value;
      const tipo = box.querySelector('#filtro-tipo').value;
      await caricaProdotti(canale === 'tutti' ? '' : canale, tipo, q);
      renderListaProdotti();
    });
    box.querySelector('#filtro-q').addEventListener('keydown', async e => {
      if (e.key === 'Enter') box.querySelector('#btn-applica-filtri').click();
    });

    box.querySelector('#btn-salva-prodotto').addEventListener('click', async () => {
      const esito = box.querySelector('#pv-esito');
      const nome = box.querySelector('#pv-nome').value.trim();
      if (!nome) { esito.textContent = '❌ Nome obbligatorio'; esito.style.color = '#dc2626'; return; }
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';

      const payload = {
        azienda_id: aziendaId,
        sede_id: box.querySelector('#pv-sede').value || currentSedeId || null,
        nome,
        canale: box.querySelector('#pv-canale').value || 'tutti',
        tipo: box.querySelector('#pv-tipo').value || 'portata',
        categoria_vendita_id: box.querySelector('#pv-categoria').value || null,
        prezzo_base: parseFloat(box.querySelector('#pv-prezzo').value) || null,
        iva: parseFloat(box.querySelector('#pv-iva').value) || 10,
        ordinamento: parseInt(box.querySelector('#pv-ordine').value) || 0,
        descrizione: box.querySelector('#pv-descrizione').value.trim() || null,
        attivo: box.querySelector('#pv-attivo').checked,
        visibile: box.querySelector('#pv-visibile').checked,
        disponibile: box.querySelector('#pv-disponibile').checked,
      };

      let error;
      if (editingProdId) {
        ({ error } = await supa().from('prodotti_vendita').update(payload).eq('id', editingProdId));
      } else {
        ({ error } = await supa().from('prodotti_vendita').insert(payload));
      }

      if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }

      esito.textContent = '✅ Salvato'; esito.style.color = '#16a34a';
      await caricaProdotti();
      renderListaProdotti();
      setTimeout(() => { box.querySelector('#form-prodotto-wrap').style.display = 'none'; }, 600);
      mostraToast('"' + nome + '" salvato', 'success');
    });

    box.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => { window.location.hash = '#/' + btn.dataset.nav; });
    });
  }

  function cardLink({ icon, titolo, desc, link, cta }) {
    const disabled = !link;
    return `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px;${disabled?'opacity:0.65;':''}">
        <div style="font-size:28px;">${icon}</div>
        <div style="font-size:15px;font-weight:700;color:#0f172a;">${titolo}</div>
        <div style="font-size:13px;color:#64748b;flex:1;">${desc}</div>
        <button ${link ? 'data-nav="' + link + '"' : 'disabled'} style="
          padding:8px 14px;border:none;border-radius:10px;cursor:${disabled?'default':'pointer'};font-size:13px;font-weight:600;
          background:${disabled?'#f1f5f9':'#0E5A7A'};color:${disabled?'#94a3b8':'white'};
          align-self:flex-start;
        ">${cta}</button>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // CARICA DATI
  // ════════════════════════════════════════
  async function loadSettori() {
    try { const{data}=await supa().from('settori').select('*').eq('azienda_id',aziendaId).order('ordine'); settori=data||[]; } catch(e){settori=[];}
  }
  async function loadPostazioni() {
    try { const{data}=await supa().from('postazioni').select('*').eq('azienda_id',aziendaId).order('nome'); postazioni=data||[]; } catch(e){postazioni=[];}
  }
  async function loadProdotti() {
    try { let q=supa().from('prodotti_vendita').select('*').eq('azienda_id',aziendaId); if(currentSedeId)q=q.eq('sede_id',currentSedeId); const{data}=await q.order('nome'); prodottiVendita=data||[]; } catch(e){prodottiVendita=[];}
  }
  async function loadCategorie() {
    try { const{data}=await supa().from('categorie_vendita').select('*').eq('azienda_id',aziendaId).order('nome'); categorieVendita=data||[]; } catch(e){categorieVendita=[];}
  }
  async function loadRicette() {
    try { const{data}=await supa().from('ricette').select('*').eq('azienda_id',aziendaId); ricette=data||[]; } catch(e){ricette=[];}
  }

  // ════════════════════════════════════════
  // TOAST
  // ════════════════════════════════════════
  function mostraToast(msg, tipo='info') {
    const c={success:'#16a34a',error:'#dc2626',warning:'#f59e0b',info:'#0E5A7A'};
    const t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + c[tipo] + ';color:white;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);';
    t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3000);
  }



  // ════════════════════════════════════════
  // TAB: IDENTITÀ & BRAND
  // ════════════════════════════════════════
  async function renderTabIdentita(box) {
    // Carica identità esistente
    const { data: ident } = await supa()
      .from('azienda_identita')
      .select('*')
      .eq('azienda_id', aziendaId)
      .maybeSingle();

    const val = (campo) => ident?.[campo] || '';

    box.innerHTML = `
      <style>
        .id-card { background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px; }
        .id-label { font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px; }
        .id-desc { font-size:12px;color:#94a3b8;margin-bottom:8px;font-style:italic; }
        .id-ta { width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;resize:vertical;min-height:80px;line-height:1.6;box-sizing:border-box; }
        .id-ta:focus { border-color:#0E5A7A; }
        .id-input { width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box; }
        .id-input:focus { border-color:#0E5A7A; }
      </style>
      <div style="max-width:720px;padding-bottom:20px;">
        <div style="background:linear-gradient(135deg,#0E5A7A,#1a8fb5);color:white;border-radius:14px;padding:20px;margin-bottom:20px;">
          <div style="font-size:18px;font-weight:700;margin-bottom:4px;">🎯 Identità & Brand</div>
          <div style="font-size:13px;opacity:.85;line-height:1.5;">Definisci chi siete, dove volete arrivare e come volete essere percepiti.<br>Questi dati alimentano le campagne AI, la formazione del personale e i meeting aziendali.</div>
        </div>
        <div class="id-card">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">🌟 Vision & Mission</div>
          <div style="margin-bottom:16px;">
            <span class="id-label">Vision — Dove vogliamo arrivare</span>
            <div class="id-desc">Es. "Diventare il riferimento per la cucina laziale autentica nel Viterbese"</div>
            <textarea id="id-vision" class="id-ta" placeholder="Scrivi la vision...">${val('vision')}</textarea>
          </div>
          <div>
            <span class="id-label">Mission — Perché esistiamo</span>
            <div class="id-desc">Es. "Portare in tavola la tradizione laziale con ingredienti del territorio"</div>
            <textarea id="id-mission" class="id-ta" placeholder="Scrivi la mission...">${val('mission')}</textarea>
          </div>
        </div>
        <div class="id-card">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">📍 Posizionamento & Cliente ideale</div>
          <div style="margin-bottom:16px;">
            <span class="id-label">Posizionamento</span>
            <textarea id="id-posizionamento" class="id-ta" placeholder="Come vogliamo essere percepiti...">${val('posizionamento')}</textarea>
          </div>
          <div style="margin-bottom:16px;">
            <span class="id-label">Cliente ideale</span>
            <textarea id="id-cliente" class="id-ta" placeholder="Es. Coppie 35-55, famiglie, turisti...">${val('cliente_ideale')}</textarea>
          </div>
          <div>
            <span class="id-label">Differenziazione</span>
            <textarea id="id-diff" class="id-ta" placeholder="Cosa ci rende unici...">${val('differenziazione')}</textarea>
          </div>
        </div>
        <div class="id-card">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">💬 Valori & Comunicazione</div>
          <div style="margin-bottom:16px;">
            <span class="id-label">Valori aziendali</span>
            <textarea id="id-valori" class="id-ta" style="min-height:60px;" placeholder="Es. Qualità, territorio, accoglienza...">${val('valori')}</textarea>
          </div>
          <div style="margin-bottom:16px;">
            <span class="id-label">Tone of voice</span>
            <input id="id-tov" class="id-input" placeholder="Es. Caldo, familiare, autentico" value="${val('tone_of_voice')}">
          </div>
          <div>
            <span class="id-label">Parole chiave brand</span>
            <input id="id-kw" class="id-input" placeholder="Es. tradizione, territorio, famiglia, vino" value="${val('parole_chiave')}">
          </div>
        </div>
        <div class="id-card">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">🚀 Obiettivi business</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px;">
            <div>
              <span class="id-label">Breve termine (3-6 mesi)</span>
              <textarea id="id-obj-breve" class="id-ta" style="min-height:70px;" placeholder="Es. +20% prenotazioni pranzo">${val('obiettivo_breve')}</textarea>
            </div>
            <div>
              <span class="id-label">Lungo termine (1-3 anni)</span>
              <textarea id="id-obj-lungo" class="id-ta" style="min-height:70px;" placeholder="Es. Aprire seconda sede">${val('obiettivo_lungo')}</textarea>
            </div>
          </div>
        </div> <div class="id-card" style="border:2px solid #0E5A7A;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <div style="width:40px;height:40px;background:#0E5A7A;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🎯</div>
            <div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;">Golden Circle — Simon Sinek</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Le persone non comprano COSA fai. Comprano PERCHÉ lo fai.</div>
            </div>
          </div>
          <div style="background:#f0f9ff;border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;color:#0E5A7A;line-height:1.6;">
            Apple non vende computer — vende la sfida allo status quo. Il tuo ristorante non vende cibo — vende un'emozione, un ricordo, un territorio. 
            Definire il tuo <strong>WHY</strong> è il passo più importante: guiderà ogni campagna, ogni colloquio con i dipendenti, ogni scelta di comunicazione.
            Tony userà questi dati per generare copy più autentico e potente.
          </div>
          <div style="margin-bottom:16px;">
            <span class="id-label">❤️ WHY — Perché esistiamo</span>
            <div class="id-desc">Il motivo profondo, la causa, la convinzione. Non il profitto — quello è il risultato. Es. "Crediamo che ogni pasto debba raccontare un territorio e creare un ricordo indelebile"</div>
            <textarea id="id-why" class="id-ta" placeholder="Scrivi il vostro PERCHÉ profondo...">${val('gc_why')}</textarea>
          </div>
          <div style="margin-bottom:16px;">
            <span class="id-label">⚙️ HOW — Come lo facciamo</span>
            <div class="id-desc">I valori operativi e i processi che vi distinguono. Es. "Ingredienti locali a km0, ricette tramandate, servizio come ospiti a casa"</div>
            <textarea id="id-how" class="id-ta" placeholder="Scrivi come realizzate il vostro WHY...">${val('gc_how')}</textarea>
          </div>
          <div>
            <span class="id-label">🍽️ WHAT — Cosa offriamo</span>
            <div class="id-desc">Il prodotto o servizio — la parte più superficiale ma necessaria. Es. "Ristorante, catering per eventi, sala ricevimenti"</div>
            <textarea id="id-what" class="id-ta" placeholder="Scrivi cosa vendete concretamente...">${val('gc_what')}</textarea>
          </div>
        </div>

        <!-- ── TRACKING ── -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <span style="font-size:22px;">📊</span>
            <div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;">Tracking & Analytics</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Inserisci gli ID per tracciare le prenotazioni e le conversioni</div>
            </div>
          </div>
          <div style="margin-bottom:14px;">
            <span class="id-label">📘 Meta Pixel ID</span>
            <div class="id-desc">Trovi l'ID nel pannello Meta Business → Gestione eventi. Es. 1234567890123456</div>
            <input id="id-meta-pixel" class="id-input" placeholder="Es. 1234567890123456" value="${val('meta_pixel_id')}">
          </div>
          <div>
            <span class="id-label">🏷️ Google Tag Manager ID</span>
            <div class="id-desc">Trovi il Container ID in GTM → Admin. Formato GTM-XXXXXXX</div>
            <input id="id-gtm" class="id-input" placeholder="Es. GTM-XXXXXXX" value="${val('gtm_id')}">
          </div>
        </div>

        <div id="id-esito" style="font-size:13px;min-height:14px;margin-bottom:12px;"></div>
        <button id="btn-salva-identita" style="background:#0E5A7A;color:white;border:none;border-radius:12px;padding:13px 28px;cursor:pointer;font-size:15px;font-weight:700;width:100%;">💾 Salva identità aziendale</button>
      </div>
    `;

    // Carica colori sede
    const { data: sedeBrand } = await supa().from('sedi')
      .select('colore_brand,colore_secondario')
      .eq('id', currentSedeId || sedeId).maybeSingle();

    // Aggiungi card colori dopo il contenuto principale
    const colorCard = document.createElement('div');
    colorCard.style.cssText = 'max-width:720px;padding-bottom:20px;margin-top:-8px;';
    colorCard.innerHTML = `
      <div class="id-card" style="margin-bottom:16px;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">🎨 Colori brand sede</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:16px;line-height:1.5;">
          I colori vengono usati nel sito web, nel menu digitale e nel form prenotazione di questa sede.
          Puoi cambiarli per eventi speciali o stagioni.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div>
            <span class="id-label">Colore principale</span>
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px;">
              <input type="color" id="id-colore-brand" value="${sedeBrand?.colore_brand || '#794d01'}"
                style="width:48px;height:40px;border:none;border-radius:8px;cursor:pointer;padding:2px;">
              <input type="text" id="id-colore-brand-hex" class="id-input" style="flex:1;"
                value="${sedeBrand?.colore_brand || '#794d01'}" placeholder="#794d01">
            </div>
            <div style="margin-top:8px;height:32px;border-radius:8px;background:${sedeBrand?.colore_brand || '#794d01'};display:flex;align-items:center;justify-content:center;">
              <span style="color:white;font-size:12px;font-weight:700;" id="preview-btn-brand">Prenota ora</span>
            </div>
          </div>
          <div>
            <span class="id-label">Colore secondario / accenti</span>
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px;">
              <input type="color" id="id-colore-sec" value="${sedeBrand?.colore_secondario || '#c4892a'}"
                style="width:48px;height:40px;border:none;border-radius:8px;cursor:pointer;padding:2px;">
              <input type="text" id="id-colore-sec-hex" class="id-input" style="flex:1;"
                value="${sedeBrand?.colore_secondario || '#c4892a'}" placeholder="#c4892a">
            </div>
            <div style="margin-top:8px;height:32px;border-radius:8px;background:#f5efe4;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:12px;font-weight:700;color:" id="preview-accent-brand"
                style="color:${sedeBrand?.colore_secondario || '#c4892a'};">Testo accento</span>
            </div>
          </div>
        </div>
        <div id="colori-esito" style="font-size:13px;min-height:14px;margin-bottom:12px;"></div>
        <button id="btn-salva-colori" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:700;">🎨 Salva colori sede</button>
      </div>`;
    box.querySelector('div[style*="max-width:720px"]').after(colorCard);

    // Sync color picker ↔ hex input
    const syncColor = (pickerId, hexId, previewId, isBrand) => {
      const picker = box.querySelector('#' + pickerId);
      const hex    = box.querySelector('#' + hexId);
      const prev   = box.querySelector('#' + previewId);
      picker.oninput = () => {
        hex.value = picker.value;
        if (prev) isBrand ? prev.parentElement.style.background = picker.value : prev.style.color = picker.value;
      };
      hex.oninput = () => {
        if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) {
          picker.value = hex.value;
          if (prev) isBrand ? prev.parentElement.style.background = hex.value : prev.style.color = hex.value;
        }
      };
    };
    syncColor('id-colore-brand', 'id-colore-brand-hex', 'preview-btn-brand', true);
    syncColor('id-colore-sec', 'id-colore-sec-hex', 'preview-accent-brand', false);

    // Salva colori
    box.querySelector('#btn-salva-colori').addEventListener('click', async () => {
      const esito = box.querySelector('#colori-esito');
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
      const colore_brand      = box.querySelector('#id-colore-brand-hex').value.trim();
      const colore_secondario = box.querySelector('#id-colore-sec-hex').value.trim();
      const sedeTarget = currentSedeId || sedeId;
      if (!sedeTarget) { esito.textContent = '❌ Nessuna sede selezionata'; esito.style.color = '#dc2626'; return; }
      const { error } = await supa().from('sedi').update({ colore_brand, colore_secondario }).eq('id', sedeTarget);
      if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; }
      else { esito.textContent = '✅ Colori salvati!'; esito.style.color = '#15803d'; setTimeout(() => esito.textContent = '', 3000); }
    });

    box.querySelector('#btn-salva-identita').addEventListener('click', async () => {
      const esito = box.querySelector('#id-esito');
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
      const { error } = await supa().from('azienda_identita').upsert({
        azienda_id: aziendaId,
        vision: box.querySelector('#id-vision').value.trim() || null,
        mission: box.querySelector('#id-mission').value.trim() || null,
        posizionamento: box.querySelector('#id-posizionamento').value.trim() || null,
        cliente_ideale: box.querySelector('#id-cliente').value.trim() || null,
        differenziazione: box.querySelector('#id-diff').value.trim() || null,
        valori: box.querySelector('#id-valori').value.trim() || null,
        tone_of_voice: box.querySelector('#id-tov').value.trim() || null,
        parole_chiave: box.querySelector('#id-kw').value.trim() || null,
        obiettivo_breve: box.querySelector('#id-obj-breve').value.trim() || null,
        obiettivo_lungo: box.querySelector('#id-obj-lungo').value.trim() || null,
        meta_pixel_id: box.querySelector('#id-meta-pixel').value.trim() || null,
        gtm_id: box.querySelector('#id-gtm').value.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'azienda_id' });
      if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; }
      else { esito.textContent = '✅ Identità salvata!'; esito.style.color = '#15803d'; setTimeout(() => { esito.textContent = ''; }, 3000); }
    });
  }



  // ════════════════════════════════════════
  // TAB: SONDAGGI
  // ════════════════════════════════════════
  async function renderTabSondaggi(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

    const { data: sondaggiList } = await supa()
      .from('survey')
      .select('*')
      .eq('azienda_id', aziendaId)
      .order('created_at', { ascending: false });

    const TIPI_DOM = [
      { v:'scala',          l:'⭐ Valutazione (1-5)' },
      { v:'testo',          l:'📝 Risposta testo' },
      { v:'scelta_multipla',l:'☑️ Scelta multipla (con tag)' },
      { v:'valutazione',    l:'🎯 Valutazione categoria' },
    ];

    let domande = [];
    let sondaggioAttivo = null;

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:17px;font-weight:700;color:#0f172a;">📊 Sondaggi</div>
          <div style="font-size:13px;color:#64748b;">Crea sondaggi per raccogliere feedback e profilare i clienti</div>
        </div>
        <button id="btn-nuovo-sondaggio" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuovo sondaggio</button>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:16px;" class="sond-grid" id="sond-grid">
        <style>@media(max-width:640px){#sond-grid{grid-template-columns:1fr!important;}}</style> <div>
          <div id="lista-sondaggi"></div>
        </div> <div id="editor-sondaggio" style="display:none;">
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:12px;">
            <div style="font-size:15px;font-weight:700;margin-bottom:12px;" id="editor-title">Nuovo sondaggio</div>
            <input id="sond-titolo" class="input" placeholder="Titolo sondaggio *" style="width:100%;box-sizing:border-box;margin-bottom:8px;">
            <textarea id="sond-desc" class="input" rows="2" placeholder="Descrizione (opzionale)" style="width:100%;box-sizing:border-box;resize:vertical;"></textarea>
            <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="sond-nps" style="accent-color:#0E5A7A;">
              <label for="sond-nps" style="font-size:13px;cursor:pointer;">Prima domanda NPS globale (valutazione generale 1-5) — obbligatoria</label>
            </div>
          </div> <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-size:14px;font-weight:700;">Domande</div>
              <button id="btn-aggiungi-dom" style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:600;">+ Aggiungi domanda</button>
            </div>
            <div id="lista-domande"></div> <div id="form-domanda" style="display:none;background:#f8fafc;border-radius:10px;padding:14px;margin-top:10px;">
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px;margin-bottom:10px;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Tipo domanda</label>
                  <select id="dom-tipo" class="input" style="width:100%;box-sizing:border-box;">
                    ${TIPI_DOM.map(function(t){ return '<option value="' + t.v + '">' + t.l + '</option>'; }).join('')}
                  </select>
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Ordine</label>
                  <input id="dom-ordine" type="number" value="${domande.length+1}" min="1" class="input" style="width:100%;box-sizing:border-box;">
                </div>
              </div>
              <div style="margin-bottom:10px;">
                <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Testo domanda *</label>
                <input id="dom-testo" class="input" placeholder="Es. Come valuti la nostra cucina?" style="width:100%;box-sizing:border-box;">
              </div>
              <div id="dom-scala-wrap" style="margin-bottom:10px;">
                <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Mostra campo testo se risposta ≤</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input type="checkbox" id="dom-alert-attivo">
                  <select id="dom-alert-val" class="input" style="width:80px;">
                    <option value="1">1</option><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option>
                  </select>
                  <span style="font-size:12px;color:#64748b;">→ Mostra campo "Cosa non ti è piaciuto?"</span>
                </div>
              </div>
              <div id="dom-opzioni-wrap" style="display:none;margin-bottom:10px;">
                <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Opzioni (una per riga) — aggiungi tag dopo | es: Vegetariano|vegetariano</label>
                <textarea id="dom-opzioni" class="input" rows="4" placeholder="Sì, sono vegetariano|vegetariano\nSì, sono vegano|vegano\nSono celiaco|celiaco\nNessuna preferenza" style="width:100%;box-sizing:border-box;resize:vertical;font-size:12px;font-family:monospace;"></textarea>
              </div>
              <div style="display:flex;gap:8px;">
                <button id="btn-salva-dom" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:8px 18px;cursor:pointer;font-size:13px;font-weight:600;">Aggiungi</button>
                <button id="btn-annulla-dom" style="background:#f1f5f9;color:#374151;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;">Annulla</button>
              </div>
            </div>
          </div>

          <div id="sond-esito" style="font-size:13px;min-height:14px;margin-bottom:10px;"></div>
          <div style="display:flex;gap:8px;">
            <button id="btn-salva-sondaggio" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 24px;cursor:pointer;font-size:14px;font-weight:600;">💾 Salva sondaggio</button>
            <button id="btn-annulla-sondaggio" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 18px;cursor:pointer;font-size:14px;">Annulla</button>
          </div>
        </div>
      </div>
    `;

    function renderListaSondaggi() {
      const el = box.querySelector('#lista-sondaggi');
      if (!sondaggiList?.length) {
        el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">Nessun sondaggio. Creane uno.</div>';
        return;
      }
      el.innerHTML = sondaggiList.map(s => `
        <div data-sond="${s.id}" style="background:white;border:1px solid ${sondaggioAttivo?.id===s.id?'#0E5A7A':'#e5e7eb'};border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer;">
          <div style="font-weight:700;font-size:13px;">${esc(s.titolo)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${s.nps_globale?'✅ NPS globale · ':''}<span style="background:${s.stato==='attivo'?'#dcfce7':'#f1f5f9'};color:${s.stato==='attivo'?'#15803d':'#374151'};padding:2px 8px;border-radius:20px;">${s.stato||'bozza'}</span></div>
        </div>
      `).join('');
      el.querySelectorAll('[data-sond]').forEach(card => {
        card.addEventListener('click', () => apriEditor(sondaggiList.find(s=>s.id===card.dataset.sond)));
      });
    }

    async function apriEditor(sondaggio = null) {
      sondaggioAttivo = sondaggio;
      domande = [];
      box.querySelector('#editor-sondaggio').style.display = '';
      box.querySelector('#editor-title').textContent = sondaggio ? 'Modifica sondaggio' : 'Nuovo sondaggio';
      box.querySelector('#sond-titolo').value = sondaggio?.titolo || '';
      box.querySelector('#sond-desc').value = sondaggio?.descrizione || '';
      box.querySelector('#sond-nps').checked = sondaggio?.nps_globale ?? true;

      if (sondaggio) {
        const { data: domDB } = await supa().from('survey_domande').select('*').eq('survey_id', sondaggio.id).order('ordine');
        domande = domDB || [];
      }
      renderDomande();
    }

    function renderDomande() {
      const el = box.querySelector('#lista-domande');
      if (!domande.length) {
        el.innerHTML = '<div style="color:#94a3b8;font-size:12px;padding:8px 0;">Nessuna domanda aggiunta.</div>';
        return;
      }
      el.innerHTML = domande.map((d, idx) => `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
          <div style="font-size:18px;">${{scala:'⭐',testo:'📝',scelta_multipla:'☑️',valutazione:'🎯'}[d.tipo]||'❓'}</div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;">${esc(d.testo)}</div>
            <div style="font-size:11px;color:#64748b;">${TIPI_DOM.find(t=>t.v===d.tipo)?.l||d.tipo} · ordine ${d.ordine}</div>
          </div>
          <button data-del-dom="${idx}" style="background:#fee2e2;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;color:#dc2626;">✕</button>
        </div>
      `).join('');
      el.querySelectorAll('[data-del-dom]').forEach(btn => {
        btn.addEventListener('click', () => {
          domande.splice(parseInt(btn.dataset.delDom), 1);
          renderDomande();
        });
      });
    }

    // Tipo domanda → mostra/nascondi campi
    box.querySelector('#dom-tipo').addEventListener('change', (e) => {
      const tipo = e.target.value;
      box.querySelector('#dom-scala-wrap').style.display = tipo === 'scala' ? '' : 'none';
      box.querySelector('#dom-opzioni-wrap').style.display = tipo === 'scelta_multipla' ? '' : 'none';
    });

    box.querySelector('#btn-aggiungi-dom').addEventListener('click', () => {
      box.querySelector('#form-domanda').style.display = '';
      box.querySelector('#dom-ordine').value = domande.length + 1;
    });
    box.querySelector('#btn-annulla-dom').addEventListener('click', () => {
      box.querySelector('#form-domanda').style.display = 'none';
    });
    box.querySelector('#btn-salva-dom').addEventListener('click', () => {
      const testo = box.querySelector('#dom-testo').value.trim();
      if (!testo) { mostraToast('Inserisci il testo della domanda','warning'); return; }
      const tipo = box.querySelector('#dom-tipo').value;
      const alertAttivo = box.querySelector('#dom-alert-attivo').checked;
      const alertVal = parseInt(box.querySelector('#dom-alert-val').value)||3;
      const opzioniRaw = box.querySelector('#dom-opzioni').value.trim();
      
      const nuovaDom = {
        testo,
        tipo,
        ordine: parseInt(box.querySelector('#dom-ordine').value)||domande.length+1,
        scala_min: tipo==='scala' ? 1 : null,
        scala_max: tipo==='scala' ? 5 : null,
        alert_valori: tipo==='scala' && alertAttivo ? [alertVal] : null,
        opzioni: tipo==='scelta_multipla' && opzioniRaw ? opzioniRaw.split('\n').map(r=>r.split('|')[0].trim()).filter(Boolean) : null,
        tag_risposta: tipo==='scelta_multipla' && opzioniRaw
          ? Object.fromEntries(opzioniRaw.split('\n').filter(r=>r.includes('|')).map(r=>[r.split('|')[0].trim(), r.split('|')[1]?.trim()]))
          : null,
      };
      domande.push(nuovaDom);
      domande.sort((a,b)=>a.ordine-b.ordine);
      renderDomande();
      box.querySelector('#form-domanda').style.display='none';
      box.querySelector('#dom-testo').value='';
    });

    box.querySelector('#btn-nuovo-sondaggio').addEventListener('click', () => apriEditor(null));
    box.querySelector('#btn-annulla-sondaggio').addEventListener('click', () => {
      box.querySelector('#editor-sondaggio').style.display='none';
    });

    box.querySelector('#btn-salva-sondaggio').addEventListener('click', async () => {
      const esito = box.querySelector('#sond-esito');
      const titolo = box.querySelector('#sond-titolo').value.trim();
      if (!titolo) { esito.textContent='❌ Titolo obbligatorio'; esito.style.color='#dc2626'; return; }
      esito.textContent='Salvataggio...'; esito.style.color='#64748b';

      const payload = {
        azienda_id: aziendaId,
        titolo,
        descrizione: box.querySelector('#sond-desc').value.trim()||null,
        nps_globale: box.querySelector('#sond-nps').checked,
        stato: 'bozza',
      };

      let surveyId = sondaggioAttivo?.id;
      if (surveyId) {
        await supa().from('survey').update(payload).eq('id', surveyId);
      } else {
        const { data, error } = await supa().from('survey').insert(payload).select('*').single();
        if (error) { esito.textContent='❌ '+error.message; esito.style.color='#dc2626'; return; }
        surveyId = data.id;
        sondaggiList.unshift(data);
      }

      // Salva domande
      if (domande.length) {
        await supa().from('survey_domande').delete().eq('survey_id', surveyId);
        await supa().from('survey_domande').insert(domande.map(d=>({...d, survey_id: surveyId, azienda_id: aziendaId})));
      }

      esito.textContent='✅ Sondaggio salvato!'; esito.style.color='#15803d';
      renderListaSondaggi();
      mostraToast('Sondaggio salvato ✅','success');
    });

    renderListaSondaggi();
  }

  // ── TAB FORM PRENOTAZIONI ────────────────────────────────────────────────
  async function renderTabPrenotazioni(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';
    try {
      const { render } = await import('../booking/booking-form-builder.js');
      box.innerHTML = '';
      await render(box);
    } catch (e) {
      console.error('Errore caricamento booking-form-builder:', e);
      box.innerHTML = '<div style="color:#dc2626;padding:20px;">Errore caricamento form builder: ' + e.message + '</div>';
    }
  }

  // ── TAB PROFILO PUBBLICO ─────────────────────────────────────────────────
  async function renderTabProfilo(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

    const { data: profilo } = await supa()
      .from('azienda_profilo_pubblico')
      .select('*')
      .eq('azienda_id', aziendaId)
      .maybeSingle();

    const p = profilo || {};
    const intolleranze = p.intolleranze_gestite || [];
    const servizi = p.servizi || {};

    const toggleItem = (key, label, icon) => `
      <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;">
        <input type="checkbox" data-servizio="${key}" ${servizi[key] ? 'checked' : ''}
          style="width:18px;height:18px;accent-color:#0E5A7A;cursor:pointer;flex-shrink:0;">
        <span style="font-size:14px;">${icon} ${label}</span>
      </label>`;

    const intolleranzaItem = (key, label) => `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" data-intolleranza="${key}" ${intolleranze.includes(key) ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:#0E5A7A;cursor:pointer;">
        <span style="font-size:13px;">${label}</span>
      </label>`;

    box.innerHTML = `
      <div style="max-width:820px;">
        <div style="font-size:17px;font-weight:700;color:#0f172a;margin-bottom:4px;">🌐 Profilo Pubblico</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:20px;">
          Queste informazioni vengono usate dal chatbot WhatsApp per rispondere automaticamente ai clienti.
        </div> <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;">📍 Posizione e contatti</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Indirizzo completo</label>
              <input id="pp-indirizzo" class="input" value="${esc(p.indirizzo || '')}" placeholder="Via Roma 1, 00100 Roma">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Città</label>
              <input id="pp-citta" class="input" value="${esc(p.citta || '')}" placeholder="Roma">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Telefono principale</label>
              <input id="pp-telefono" class="input" value="${esc(p.telefono || '')}" placeholder="+39 02 1234567">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Email pubblica</label>
              <input id="pp-email" class="input" value="${esc(p.email || '')}" placeholder="info@mioristorante.it">
            </div>
          </div>
          <div style="margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Link Google Maps</label>
            <div style="display:flex;gap:8px;">
              <input id="pp-gmaps" class="input" style="flex:1;" value="${esc(p.google_maps_url || '')}"
                placeholder="https://maps.app.goo.gl/...">
              <button id="btn-test-maps" style="background:#e8f4f8;color:#0E5A7A;border:1px solid #0E5A7A;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
                🗺️ Testa
              </button>
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Vai su Google Maps → cerca il tuo locale → Condividi → Copia link</div>
          </div>
          <div style="margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Info parcheggio</label>
            <input id="pp-parcheggio" class="input" value="${esc(p.info_parcheggio || '')}"
              placeholder="Es: Parcheggio gratuito nel cortile interno">
          </div>
        </div> <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">✅ Servizi disponibili</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Il chatbot userà queste info per rispondere ai clienti</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
            ${toggleItem('accessibile_disabili', 'Accessibile disabili (rampe, ascensore)', '♿')}
            ${toggleItem('animali_ammessi', 'Animali ammessi', '🐾')}
            ${toggleItem('wifi_disponibile', 'WiFi disponibile', '📶')}
            ${toggleItem('area_esterna', 'Area esterna / giardino', '🌿')}
            ${toggleItem('parcheggio_privato', 'Parcheggio privato', '🅿️')}
            ${toggleItem('area_fumatori', 'Area fumatori', '🚬')}
            ${toggleItem('asporto', 'Asporto disponibile', '🥡')}
            ${toggleItem('delivery', 'Delivery / consegna a domicilio', '🛵')}
            ${toggleItem('eventi_privati', 'Sale per eventi privati', '🎉')}
            ${toggleItem('seggioloni', 'Seggioloni per bambini', '👶')}
            ${toggleItem('menu_bambini', 'Menu bambini', '🧒')}
            ${toggleItem('area_giochi', 'Area giochi bambini', '🎠')}
          </div>
        </div> <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">🥗 Intolleranze e allergie gestite</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:14px;">Spunta quelle che la cucina sa gestire — il chatbot lo comunica ai clienti</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
            ${intolleranzaItem('glutine', 'Senza glutine / Celiachia')}
            ${intolleranzaItem('lattosio', 'Senza lattosio')}
            ${intolleranzaItem('vegetariano', 'Vegetariano')}
            ${intolleranzaItem('vegano', 'Vegano')}
            ${intolleranzaItem('frutta_secca', 'Allergia frutta a guscio')}
            ${intolleranzaItem('crostacei', 'Allergia crostacei')}
            ${intolleranzaItem('uova', 'Allergia uova')}
            ${intolleranzaItem('pesce', 'Allergia pesce')}
            ${intolleranzaItem('soia', 'Allergia soia')}
            ${intolleranzaItem('sedano', 'Allergia sedano')}
            ${intolleranzaItem('senape', 'Allergia senape')}
            ${intolleranzaItem('halal', 'Halal')}
            ${intolleranzaItem('kosher', 'Kosher')}
          </div>
        </div> <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">💬 Domande post-prenotazione WhatsApp</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:14px;">Dopo la conferma prenotazione, il chatbot fa queste domande automaticamente</div>

          <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;">
            <input type="checkbox" id="pp-chiedi-intolleranze" ${p.chiedi_intolleranze ? 'checked' : ''}
              style="width:18px;height:18px;accent-color:#0E5A7A;cursor:pointer;flex-shrink:0;">
            <div>
              <span style="font-size:14px;font-weight:500;">🥗 Chiedi intolleranze/allergie</span>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">"Ci sono intolleranze alimentari o allergie tra i tuoi ospiti che dovremmo sapere?"</div>
            </div>
          </label>

          <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;">
            <input type="checkbox" id="pp-chiedi-bambini" ${p.chiedi_bambini ? 'checked' : ''}
              style="width:18px;height:18px;accent-color:#0E5A7A;cursor:pointer;flex-shrink:0;">
            <div>
              <span style="font-size:14px;font-weight:500;">👶 Chiedi seggioloni/bambini</span>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">"Ci sono bambini nel gruppo? Vuoi che prepariamo un seggiolone?"</div>
            </div>
          </label>

          <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;">
            <input type="checkbox" id="pp-chiedi-occasione" ${p.chiedi_occasione ? 'checked' : ''}
              style="width:18px;height:18px;accent-color:#0E5A7A;cursor:pointer;flex-shrink:0;">
            <div>
              <span style="font-size:14px;font-weight:500;">🎉 Chiedi occasione speciale</span>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">"È una ricorrenza speciale? (compleanno, anniversario, ecc.) Possiamo preparare qualcosa!"</div>
            </div>
          </label>

          <label style="display:flex;align-items:center;gap:10px;padding:10px 0;cursor:pointer;">
            <input type="checkbox" id="pp-chiedi-preferenze" ${p.chiedi_preferenze ? 'checked' : ''}
              style="width:18px;height:18px;accent-color:#0E5A7A;cursor:pointer;flex-shrink:0;">
            <div>
              <span style="font-size:14px;font-weight:500;">🪑 Chiedi preferenze tavolo</span>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">"Preferisci interno o esterno? Zona tranquilla o vivace?"</div>
            </div>
          </label>
        </div> <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">✍️ Testi personalizzati per il chatbot</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:14px;">Lascia vuoto per usare il testo default. Usa {nome_locale} come segnaposto.</div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🕐 Risposta "Info orari"</label>
              <textarea id="pp-txt-orari" class="input" rows="3" style="resize:none;"
                placeholder="Ciao! ⏰ Ecco i nostri orari:\n🍽️ Pranzo: 12:00-14:30\n🌙 Cena: 19:30-22:30\nChiusi il martedì.">${esc(p.testo_orari || '')}</textarea>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">📍 Risposta "Come raggiungerci"</label>
              <textarea id="pp-txt-sede" class="input" rows="3" style="resize:none;"
                placeholder="Ci trovi in Via Roma 1. Parcheggio gratuito nel cortile. 🗺️ [link maps]">${esc(p.testo_sede || '')}</textarea>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🍽️ Risposta "Piatto del giorno / cosa servite"</label>
              <textarea id="pp-txt-menu" class="input" rows="3" style="resize:none;"
                placeholder="Il nostro menu cambia stagionalmente con prodotti freschi e locali. Oggi il piatto forte è...">${esc(p.testo_menu || '')}</textarea>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🥗 Risposta "Intolleranze/allergie"</label>
              <textarea id="pp-txt-intolleranze" class="input" rows="3" style="resize:none;"
                placeholder="Gestiamo diverse intolleranze — avvisaci in anticipo e la cucina si organizza. 😊">${esc(p.testo_intolleranze || '')}</textarea>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">♿ Risposta "Accessibilità disabili"</label>
              <textarea id="pp-txt-accessibilita" class="input" rows="2" style="resize:none;"
                placeholder="Sì, il locale è completamente accessibile con rampe e bagno attrezzato. ♿">${esc(p.testo_accessibilita || '')}</textarea>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🐾 Risposta "Animali ammessi"</label>
              <textarea id="pp-txt-animali" class="input" rows="2" style="resize:none;"
                placeholder="Sì, gli animali sono benvenuti nell'area esterna! 🐾">${esc(p.testo_animali || '')}</textarea>
            </div>
          </div>
        </div>

        <button id="btn-salva-profilo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:700;cursor:pointer;width:100%;">
          💾 Salva profilo pubblico
        </button>
        <div id="msg-profilo" style="margin-top:12px;text-align:center;font-size:13px;"></div>
      </div>
    `;

    // Test Google Maps
    document.getElementById('btn-test-maps').onclick = () => {
      const url = document.getElementById('pp-gmaps').value.trim();
      if (url) window.open(url, '_blank');
      else alert('Inserisci prima il link Google Maps');
    };

    // ── SEZIONE RISTOFLOWBOOK ──────────────────────────────────────────────────
    // Carica sedi dell'azienda per il selettore
    const { data: sediRf } = await supa().from('sedi')
      .select('id,nome,attiva')
      .eq('azienda_id', aziendaId)
      .eq('attiva', true)
      .order('nome');

    // Sede selezionata: usa currentSedeId corrente o prima sede disponibile
    let rfSedeId = currentSedeId || (sediRf && sediRf[0]?.id) || null;

    // Funzione per caricare e renderizzare dati sede
    async function caricaRfSede(sid) {
      rfSedeId = sid;
      const { data: sedeDati } = await supa().from('sedi')
        .select('id,nome,logo_url,cover_url,fascia_prezzo,tipo_cucina,tags,descrizione,sito_web,telefono,instagram,orari_apertura')
        .eq('id', sid).single();
      const { data: azBase } = await supa().from('aziende')
        .select('nome,logo_url').eq('id', aziendaId).single();
      renderRfSection(sedeDati || {}, azBase || {});
    }

    function renderRfSection(sd, azBase) {
      // Rimuovi sezione precedente se esiste
      const existing = document.getElementById('rfb-section-wrap');
      if (existing) existing.remove();

      const TIPI_CUCINA = [
        {v:'italiana',l:'🍝 Italiana'},{v:'pizza',l:'🍕 Pizza'},{v:'pesce',l:'🐟 Pesce'},
        {v:'carne',l:'🥩 Carne'},{v:'bbq',l:'🔥 BBQ/Grill'},{v:'giapponese',l:'🍣 Giapponese'},
        {v:'cinese',l:'🥡 Cinese'},{v:'sushi',l:'🍱 Sushi'},{v:'argentina',l:'🥩 Argentina'},
        {v:'messicana',l:'🌮 Messicana'},{v:'indiana',l:'🍛 Indiana'},{v:'greca',l:'🫒 Greca'},
        {v:'mediterranea',l:'🌊 Mediterranea'},{v:'street_food',l:'🌯 Street Food'},
        {v:'pasticceria',l:'🍰 Pasticceria'},{v:'gelateria',l:'🍦 Gelateria'},
        {v:'cocktail_bar',l:'🍸 Cocktail Bar'},{v:'wine_bar',l:'🍷 Wine Bar'},
        {v:'catering',l:'🎪 Catering/Ricevimenti'},{v:'fusion',l:'🌍 Fusion'},
      ];

      const TAGS_DISPONIBILI = [
        {v:'vegano',l:'🌱 Vegano'},{v:'vegetariano',l:'🥗 Vegetariano'},
        {v:'senza_glutine',l:'🌾 Senza Glutine'},{v:'bio',l:'🌿 Bio/Biologico'},
        {v:'halal',l:'☪️ Halal'},{v:'kosher',l:'✡️ Kosher'},
        {v:'vista_mare',l:'🌊 Vista Mare'},{v:'vista_lago',l:'💧 Vista Lago'},
        {v:'giardino',l:'🌳 Giardino/Terrazza'},{v:'parcheggio',l:'🅿️ Parcheggio'},
        {v:'wifi',l:'📶 WiFi'},{v:'animali',l:'🐕 Animali ammessi'},
        {v:'bambini',l:'👶 Family/Bambini'},{v:'disabili',l:'♿ Accessibile'},
        {v:'romantico',l:'💑 Romantico'},{v:'business',l:'💼 Business'},
        {v:'musica_live',l:'🎵 Musica Live'},{v:'aperitivo',l:'🍹 Aperitivo'},
        {v:'brunch',l:'🥞 Brunch'},{v:'asporto',l:'🛍️ Asporto'},
        {v:'delivery',l:'🛵 Delivery'},{v:'prenotazione_obbligatoria',l:'📅 Prenota obbligatorio'},
      ];

      const GIORNI = [
        {k:'lun',l:'Lunedì'},{k:'mar',l:'Martedì'},{k:'mer',l:'Mercoledì'},
        {k:'gio',l:'Giovedì'},{k:'ven',l:'Venerdì'},{k:'sab',l:'Sabato'},{k:'dom',l:'Domenica'}
      ];

      const tc = sd.tipo_cucina || [];
      const tg = sd.tags || [];
      const orariSalvati = sd.orari_apertura || {};
      const nomeSede = sd.nome || azBase.nome || 'Il tuo locale';

      const rfSection = document.createElement('div');
      rfSection.id = 'rfb-section-wrap';
      rfSection.style.cssText = 'background:white;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px;';

      (function(){
        var h = '';

        // Header
        h += '<div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">📱 Profilo RistoflowBook</div>';
        h += '<div style="font-size:12px;color:#64748b;margin-bottom:16px;">Ogni sede ha la sua identit&#224;, orari e caratteristiche — il mockup si aggiorna in tempo reale</div>';

        // Layout due colonne
        h += '<div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start;">';

        // ── COLONNA SX ──
        h += '<div>';

        // Foto
        h += '<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:14px;">';
        h += '<div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📸 Foto della sede</div>';

        // Cover
        h += '<div style="margin-bottom:12px;">';
        h += '<label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Foto di copertina</label>';
        h += '<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">&#128208; 1200&#215;400px &#183; orizzontale 3:1 &#183; JPG/PNG &#183; max 5MB</div>';
        if (sd.cover_url) {
          h += '<img src="' + esc(sd.cover_url) + '" id="rfb-cover-preview" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px;display:block;border:1px solid #e5e7eb;"/>';
        } else {
          h += '<div id="rfb-cover-preview" style="width:100%;height:80px;background:linear-gradient(135deg,#0E5A7A,#1a8fb5);border-radius:8px;margin-bottom:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(255,255,255,.7);">Nessuna cover</div>';
        }
        h += '<input type="file" id="rfb-cover-input" accept="image/*" style="display:none"/>';
        h += '<button type="button" id="rfb-cover-btn" style="background:#f1f5f9;border:1px solid #e5e7eb;border-radius:7px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;color:#374151;">' + (sd.cover_url ? '&#128260; Cambia cover' : '&#128228; Carica cover') + '</button>';
        h += '<div id="rfb-cover-progress" style="display:none;font-size:11px;color:#0E5A7A;margin-top:4px;">&#9203; Caricamento...</div>';
        h += '</div>';

        // Logo
        h += '<div>';
        h += '<label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Logo / Foto profilo</label>';
        h += '<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">&#128208; 400&#215;400px &#183; quadrato &#183; JPG/PNG &#183; max 2MB</div>';
        h += '<div style="display:flex;align-items:center;gap:12px;">';
        if (sd.logo_url) {
          h += '<img src="' + esc(sd.logo_url) + '" id="rfb-logo-preview" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #0E5A7A;flex-shrink:0;"/>';
        } else {
          h += '<div id="rfb-logo-preview" style="width:60px;height:60px;border-radius:50%;background:#e8f2f7;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">&#127869;</div>';
        }
        h += '<div><input type="file" id="rfb-logo-input" accept="image/*" style="display:none"/>';
        h += '<button type="button" id="rfb-logo-btn" style="background:#f1f5f9;border:1px solid #e5e7eb;border-radius:7px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;color:#374151;">' + (sd.logo_url ? '&#128260; Cambia logo' : '&#128228; Carica logo') + '</button>';
        h += '<div id="rfb-logo-progress" style="display:none;font-size:11px;color:#0E5A7A;margin-top:4px;">&#9203; Caricamento...</div>';
        h += '</div></div></div></div>';

        // Descrizione
        h += '<div style="margin-bottom:12px;">';
        h += '<label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Descrizione sede</label>';
        h += '<textarea id="rfb-descrizione" class="input" style="min-height:70px;resize:vertical;" placeholder="Descrivi questa sede...">' + esc(sd.descrizione || '') + '</textarea>';
        h += '</div>';

        // Fascia + Instagram
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">';
        h += '<div><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Fascia di prezzo</label>';
        h += '<select id="rfb-fascia" class="input"><option value="">-- Seleziona --</option>';
        [['€','Economico'],['€€','Medio'],['€€€','Alto'],['€€€€','Fine dining']].forEach(function(f){
          h += '<option value="' + f[0] + '"' + (sd.fascia_prezzo === f[0] ? ' selected' : '') + '>' + f[0] + ' · ' + f[1] + '</option>';
        });
        h += '</select></div>';
        h += '<div><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Instagram</label>';
        h += '<input id="rfb-instagram" class="input" value="' + esc(sd.instagram || '') + '" placeholder="@nomeprofilo"/></div>';
        h += '</div>';

        // Orari
        h += '<div style="margin-bottom:14px;">';
        h += '<label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:8px;">&#128336; Orari di apertura</label>';
        h += '<div id="rfb-orari-wrap">';
        GIORNI.forEach(function(g){
          var o = orariSalvati[g.k] || {};
          var aperto = o.aperto !== false;
          var p1 = o.pranzo_inizio || '12:00';
          var p2 = o.pranzo_fine || '14:30';
          var c1 = o.cena_inizio || '19:30';
          var c2 = o.cena_fine || '22:30';
          var soloCena = o.solo_cena || false;
          h += '<div data-giorno="' + g.k + '" style="display:grid;grid-template-columns:90px 1fr;gap:8px;align-items:start;padding:8px 0;border-bottom:1px solid #f1f5f9;">';
          h += '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding-top:4px;">';
          h += '<input type="checkbox" data-aperto="' + g.k + '" ' + (aperto ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:#0E5A7A;cursor:pointer;">';
          h += '<span style="font-size:13px;font-weight:600;color:' + (aperto ? '#0f172a' : '#94a3b8') + '">' + g.l + '</span>';
          h += '</label>';
          h += '<div data-slot="' + g.k + '" style="' + (aperto ? '' : 'opacity:.3;pointer-events:none;') + '">';
          h += '<div style="display:flex;align-items:center;gap:5px;margin-bottom:5px;' + (soloCena ? 'opacity:.3;pointer-events:none;' : '') + '">';
          h += '<span style="font-size:10px;color:#94a3b8;width:36px;">Pranzo</span>';
          h += '<input type="time" data-p1="' + g.k + '" value="' + p1 + '" style="padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;font-family:inherit;"/>';
          h += '<span style="font-size:11px;color:#94a3b8;">&#8211;</span>';
          h += '<input type="time" data-p2="' + g.k + '" value="' + p2 + '" style="padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;font-family:inherit;"/>';
          h += '</div>';
          h += '<div style="display:flex;align-items:center;gap:5px;">';
          h += '<span style="font-size:10px;color:#94a3b8;width:36px;">Cena</span>';
          h += '<input type="time" data-c1="' + g.k + '" value="' + c1 + '" style="padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;font-family:inherit;"/>';
          h += '<span style="font-size:11px;color:#94a3b8;">&#8211;</span>';
          h += '<input type="time" data-c2="' + g.k + '" value="' + c2 + '" style="padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;font-family:inherit;"/>';
          h += '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;margin-left:6px;">';
          h += '<input type="checkbox" data-solocena="' + g.k + '" ' + (soloCena ? 'checked' : '') + ' style="width:13px;height:13px;accent-color:#0E5A7A;"/>';
          h += '<span style="font-size:10px;color:#64748b;">Solo cena</span>';
          h += '</label></div></div></div>';
        });
        h += '</div></div>';

        // Tipo cucina
        h += '<div style="margin-bottom:12px;">';
        h += '<label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:6px;">Tipo di cucina</label>';
        h += '<div style="display:flex;flex-wrap:wrap;gap:6px;" id="rfb-cucina-grid">';
        TIPI_CUCINA.forEach(function(t){
          var sel = tc.indexOf(t.v) >= 0;
          h += '<label style="display:flex;align-items:center;gap:5px;background:' + (sel ? '#e8f4f8' : '#f8fafc') + ';border:1.5px solid ' + (sel ? '#0E5A7A' : '#e5e7eb') + ';border-radius:999px;padding:5px 11px;cursor:pointer;font-size:12px;font-weight:600;color:' + (sel ? '#0E5A7A' : '#374151') + ';">';
          h += '<input type="checkbox" data-cucina="' + t.v + '"' + (sel ? ' checked' : '') + ' style="display:none;">' + t.l + '</label>';
        });
        h += '</div></div>';

        // Tags
        h += '<div style="margin-bottom:4px;">';
        h += '<label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:6px;">Caratteristiche e servizi</label>';
        h += '<div style="display:flex;flex-wrap:wrap;gap:6px;" id="rfb-tags-grid">';
        TAGS_DISPONIBILI.forEach(function(t){
          var sel = tg.indexOf(t.v) >= 0;
          h += '<label style="display:flex;align-items:center;gap:5px;background:' + (sel ? '#e8f4f8' : '#f8fafc') + ';border:1.5px solid ' + (sel ? '#0E5A7A' : '#e5e7eb') + ';border-radius:999px;padding:5px 11px;cursor:pointer;font-size:12px;font-weight:600;color:' + (sel ? '#0E5A7A' : '#374151') + ';">';
          h += '<input type="checkbox" data-tag="' + t.v + '"' + (sel ? ' checked' : '') + ' style="display:none;">' + t.l + '</label>';
        });
        h += '</div></div>';

        h += '</div>'; // fine colonna sx

        // ── COLONNA DX: mockup ──
        h += '<div style="position:sticky;top:20px;">';
        h += '<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;text-align:center;">Anteprima RistoflowBook</div>';
        h += '<div style="border:2px solid #1f2937;border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.15);background:#f5f7f9;">';

        // Top bar mockup
        h += '<div style="background:#0E5A7A;padding:8px 12px 6px;display:flex;align-items:center;gap:8px;">';
        h += '<div style="font-size:10px;color:#fff;font-weight:600;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" id="mock-nome-topbar">' + esc(nomeSede) + '</div>';
        h += '<span style="font-size:14px;color:#fff">&#128222;</span><span style="font-size:14px;color:#fff">&#128506;</span>';
        h += '</div>';

        // Cover
        if (sd.cover_url) {
          h += '<div id="mock-cover" style="width:100%;height:90px;overflow:hidden;position:relative;">';
          h += '<img id="mock-cover-img" src="' + esc(sd.cover_url) + '" style="width:100%;height:100%;object-fit:cover;display:block;"/>';
        } else {
          h += '<div id="mock-cover" style="width:100%;height:90px;background:linear-gradient(135deg,#0E5A7A,#1a8fb5);position:relative;">';
        }
        // Logo sovrapposto
        h += '<div style="position:absolute;bottom:-20px;left:10px;width:44px;height:44px;border-radius:50%;border:2.5px solid #fff;background:#e8f2f7;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.15);">';
        if (sd.logo_url) {
          h += '<img id="mock-logo-img" src="' + esc(sd.logo_url) + '" style="width:100%;height:100%;object-fit:cover;"/>';
        } else {
          h += '<div id="mock-logo-img" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;">&#127869;</div>';
        }
        h += '</div></div>';
        h += '<div style="height:28px;background:#fff;"></div>';

        // Info mockup
        h += '<div style="background:#fff;padding:8px 10px 0;">';
        h += '<div id="mock-nome" style="font-size:14px;font-weight:700;color:#0f172a;">' + esc(nomeSede) + '</div>';
        h += '<div id="mock-tipo" style="font-size:10px;color:#0E5A7A;font-weight:600;margin-top:2px;">' + (tc.length ? tc.slice(0,2).join(' · ') : 'Tipo cucina') + '</div>';
        h += '<div id="mock-fascia" style="font-size:10px;color:#64748b;margin-top:1px;">' + esc(sd.fascia_prezzo || '€€') + '</div>';
        h += '<div style="display:flex;gap:5px;margin-top:6px;">';
        h += '<div style="flex:2;padding:6px;background:#0E5A7A;color:#fff;border-radius:5px;font-size:10px;font-weight:700;text-align:center;">&#128197; Prenota</div>';
        h += '<div style="flex:1;padding:6px;background:#f1f5f9;border-radius:5px;font-size:10px;text-align:center;">&#128247;</div>';
        h += '</div>';

        // Tab mockup
        h += '<div style="display:flex;border-bottom:1px solid #e5e7eb;margin-top:8px;">';
        ['&#8505; Info','&#11088; Rec.','&#128226; News','&#128247; Foto'].forEach(function(t,i){
          h += '<div style="flex:1;text-align:center;padding:5px 0;font-size:9px;font-weight:' + (i===0?'700':'500') + ';color:' + (i===0?'#0E5A7A':'#94a3b8') + ';border-bottom:' + (i===0?'2px solid #0E5A7A':'2px solid transparent') + ';">' + t + '</div>';
        });
        h += '</div>';

        // Tags mockup
        h += '<div id="mock-tags" style="display:flex;flex-wrap:wrap;gap:3px;padding:8px 0 4px;">';
        tg.slice(0,4).forEach(function(t){ h += '<span style="background:#e8f2f7;color:#0E5A7A;border-radius:3px;padding:2px 6px;font-size:9px;">' + esc(t) + '</span>'; });
        if (!tg.length) h += '<span style="color:#94a3b8;font-size:9px;">I tag appariranno qui</span>';
        h += '</div>';

        // Orari mockup
        h += '<div style="padding:4px 10px 8px;border-top:1px solid #f1f5f9;">';
        h += '<div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Orari</div>';
        h += '<div id="mock-orari-grid">';
        GIORNI.forEach(function(g){
          var o = orariSalvati[g.k];
          var aperto = !o || o.aperto !== false;
          if (!aperto) {
            h += '<div style="display:flex;justify-content:space-between;font-size:9px;padding:1px 0;"><span style="color:#94a3b8;">' + g.l.substring(0,3) + '</span><span style="color:#dc2626;">Chiuso</span></div>';
          } else if (o) {
            var slot = o.solo_cena ? (o.cena_inizio+'-'+o.cena_fine) : (o.pranzo_inizio+'-'+o.pranzo_fine);
            h += '<div style="display:flex;justify-content:space-between;font-size:9px;padding:1px 0;"><span style="color:#374151;font-weight:600;">' + g.l.substring(0,3) + '</span><span style="color:#64748b;">' + slot + '</span></div>';
          } else {
            h += '<div style="display:flex;justify-content:space-between;font-size:9px;padding:1px 0;"><span style="color:#374151;font-weight:600;">' + g.l.substring(0,3) + '</span><span style="color:#64748b;">12:00-14:30</span></div>';
          }
        });
        h += '</div></div></div>';
        h += '</div>'; // fine phone frame
        h += '<div style="text-align:center;margin-top:8px;font-size:10px;color:#94a3b8;">&#8593; Anteprima scheda sede</div>';
        h += '</div>'; // fine colonna dx

        h += '</div>'; // fine grid

        rfSection.innerHTML = h;
      })();

      // ── Bind toggle cucina ──
      rfSection.querySelectorAll('[data-cucina]').forEach(cb => {
        cb.parentElement.addEventListener('click', () => {
          cb.checked = !cb.checked;
          const l = cb.parentElement;
          l.style.background = cb.checked ? '#e8f4f8' : '#f8fafc';
          l.style.borderColor = cb.checked ? '#0E5A7A' : '#e5e7eb';
          l.style.color = cb.checked ? '#0E5A7A' : '#374151';
          const sel = Array.from(rfSection.querySelectorAll('[data-cucina]:checked')).map(e => e.dataset.cucina);
          const m = rfSection.querySelector('#mock-tipo');
          if (m) m.textContent = sel.slice(0,2).join(' · ') || 'Tipo cucina';
        });
      });

      // ── Bind toggle tags ──
      rfSection.querySelectorAll('[data-tag]').forEach(cb => {
        cb.parentElement.addEventListener('click', () => {
          cb.checked = !cb.checked;
          const l = cb.parentElement;
          l.style.background = cb.checked ? '#e8f4f8' : '#f8fafc';
          l.style.borderColor = cb.checked ? '#0E5A7A' : '#e5e7eb';
          l.style.color = cb.checked ? '#0E5A7A' : '#374151';
          const sel = Array.from(rfSection.querySelectorAll('[data-tag]:checked')).map(e => e.dataset.tag);
          const m = rfSection.querySelector('#mock-tags');
          if (m) m.innerHTML = sel.slice(0,4).map(t => '<span style="background:#e8f2f7;color:#0E5A7A;border-radius:3px;padding:2px 6px;font-size:9px;">'+t+'</span>').join('') || '<span style="color:#94a3b8;font-size:9px;">I tag appariranno qui</span>';
        });
      });

      // ── Bind descrizione live ──
      rfSection.querySelector('#rfb-descrizione').addEventListener('input', function(){
        const m = rfSection.querySelector('#mock-fascia');
        if (m) m.textContent = (rfSection.querySelector('#rfb-fascia').value || '€€');
      });

      // ── Bind fascia live ──
      rfSection.querySelector('#rfb-fascia').addEventListener('change', function(){
        const m = rfSection.querySelector('#mock-fascia');
        if (m) m.textContent = this.value || '€€';
      });

      // ── Bind orari toggle ──
      setTimeout(function(){
        const ow = rfSection.querySelector('#rfb-orari-wrap');
        if (!ow) return;
        ow.querySelectorAll('[data-aperto]').forEach(function(cb){
          cb.addEventListener('change', function(){
            const g = this.dataset.aperto;
            const slot = ow.querySelector('[data-slot="'+g+'"]');
            const lbl = this.parentElement.querySelector('span');
            if (slot) { slot.style.opacity = this.checked ? '1' : '.3'; slot.style.pointerEvents = this.checked ? '' : 'none'; }
            if (lbl) lbl.style.color = this.checked ? '#0f172a' : '#94a3b8';
          });
        });
        ow.querySelectorAll('[data-solocena]').forEach(function(cb){
          cb.addEventListener('change', function(){
            const g = this.dataset.solocena;
            const pr = ow.querySelector('[data-p1="'+g+'"]')?.closest('div');
            if (pr) { pr.style.opacity = this.checked ? '.3' : '1'; pr.style.pointerEvents = this.checked ? 'none' : ''; }
          });
        });
      }, 100);

      // ── Upload cover ──
      rfSection.querySelector('#rfb-cover-btn').addEventListener('click', () => rfSection.querySelector('#rfb-cover-input').click());
      rfSection.querySelector('#rfb-cover-input').addEventListener('change', async function(){
        const file = this.files[0]; if (!file) return;
        const prog = rfSection.querySelector('#rfb-cover-progress');
        prog.style.display = '';
        const ext = file.name.split('.').pop();
        const path = aziendaId + '/sede-cover-' + rfSedeId + '-' + Date.now() + '.' + ext;
        const { error } = await supa().storage.from('loghi-aziende').upload(path, file, { upsert: true });
        prog.style.display = 'none';
        if (error) { alert('Errore upload: ' + error.message); return; }
        const { data: pub } = supa().storage.from('loghi-aziende').getPublicUrl(path);
        const url = pub.publicUrl;
        await supa().from('sedi').update({ cover_url: url }).eq('id', rfSedeId);
        const prev = rfSection.querySelector('#rfb-cover-preview');
        if (prev.tagName === 'IMG') { prev.src = url; } else { prev.outerHTML = '<img id="rfb-cover-preview" src="'+url+'" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px;display:block;border:1px solid #e5e7eb;"/>'; }
        const mc = rfSection.querySelector('#mock-cover');
        const mci = rfSection.querySelector('#mock-cover-img');
        if (mci) { mci.src = url; } else if (mc) { mc.innerHTML = '<img id="mock-cover-img" src="'+url+'" style="width:100%;height:100%;object-fit:cover;display:block;"/>'; }
        mostraToast('Cover sede aggiornata ✅', 'success');
      });

      // ── Upload logo ──
      rfSection.querySelector('#rfb-logo-btn').addEventListener('click', () => rfSection.querySelector('#rfb-logo-input').click());
      rfSection.querySelector('#rfb-logo-input').addEventListener('change', async function(){
        const file = this.files[0]; if (!file) return;
        const prog = rfSection.querySelector('#rfb-logo-progress');
        prog.style.display = '';
        const ext = file.name.split('.').pop();
        const path = aziendaId + '/sede-logo-' + rfSedeId + '-' + Date.now() + '.' + ext;
        const { error } = await supa().storage.from('loghi-aziende').upload(path, file, { upsert: true });
        prog.style.display = 'none';
        if (error) { alert('Errore upload: ' + error.message); return; }
        const { data: pub } = supa().storage.from('loghi-aziende').getPublicUrl(path);
        const url = pub.publicUrl;
        await supa().from('sedi').update({ logo_url: url }).eq('id', rfSedeId);
        const prev = rfSection.querySelector('#rfb-logo-preview');
        if (prev.tagName === 'IMG') { prev.src = url; } else { prev.innerHTML = '<img style="width:100%;height:100%;object-fit:cover;border-radius:50%;" src="'+url+'"/>'; }
        const ml = rfSection.querySelector('#mock-logo-img');
        if (ml && ml.tagName === 'IMG') { ml.src = url; } else if (ml) { ml.outerHTML = '<img id="mock-logo-img" src="'+url+'" style="width:100%;height:100%;object-fit:cover;"/>'; }
        mostraToast('Logo sede aggiornato ✅', 'success');
      });

      // Inserisci prima del btn-salva-profilo
      const btnSalva = document.getElementById('btn-salva-profilo');
      btnSalva.parentElement.insertBefore(rfSection, btnSalva);
    }

    // ── Selettore sede in cima ──
    const sedeSel = document.createElement('div');
    sedeSel.style.cssText = 'background:white;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px;';
    var sedeSelH = '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:10px;">&#127974; Stai configurando la sede</div>';
    sedeSelH += '<div style="font-size:12px;color:#64748b;margin-bottom:10px;">Ogni sede ha identit&#224;, orari e caratteristiche proprie — seleziona la sede da configurare</div>';
    sedeSelH += '<select id="rfb-sede-sel" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;background:#fff;">';
    (sediRf || []).forEach(function(s){
      sedeSelH += '<option value="' + s.id + '"' + (s.id === rfSedeId ? ' selected' : '') + '>' + esc(s.nome) + '</option>';
    });
    sedeSelH += '</select>';
    sedeSel.innerHTML = sedeSelH;

    const btnSalvaMain = document.getElementById('btn-salva-profilo');
    btnSalvaMain.parentElement.insertBefore(sedeSel, btnSalvaMain);

    // Bind cambio sede
    sedeSel.querySelector('#rfb-sede-sel').addEventListener('change', async function(){
      await caricaRfSede(this.value);
    });

    // Carica dati sede iniziale
    if (rfSedeId) await caricaRfSede(rfSedeId);

    // ── SALVA ──
    document.getElementById('btn-salva-profilo').onclick = async () => {
      if (!rfSedeId) { alert('Seleziona una sede'); return; }

      const tipoCucinaSelezionati = Array.from(document.querySelectorAll('[data-cucina]:checked')).map(el => el.dataset.cucina);
      const tagsSelezionati = Array.from(document.querySelectorAll('[data-tag]:checked')).map(el => el.dataset.tag);

      // Raccoglie orari
      const orariObj = {};
      const GIORNI_KEYS = ['lun','mar','mer','gio','ven','sab','dom'];
      const ow = document.getElementById('rfb-orari-wrap');
      if (ow) {
        GIORNI_KEYS.forEach(function(g){
          orariObj[g] = {
            aperto: ow.querySelector('[data-aperto="'+g+'"]')?.checked || false,
            pranzo_inizio: ow.querySelector('[data-p1="'+g+'"]')?.value || '12:00',
            pranzo_fine: ow.querySelector('[data-p2="'+g+'"]')?.value || '14:30',
            cena_inizio: ow.querySelector('[data-c1="'+g+'"]')?.value || '19:30',
            cena_fine: ow.querySelector('[data-c2="'+g+'"]')?.value || '22:30',
            solo_cena: ow.querySelector('[data-solocena="'+g+'"]')?.checked || false,
          };
        });
      }

      // Salva su sedi
      const { error: sedeErr } = await supa().from('sedi').update({
        fascia_prezzo: document.getElementById('rfb-fascia')?.value || null,
        descrizione: document.getElementById('rfb-descrizione')?.value?.trim() || null,
        instagram: document.getElementById('rfb-instagram')?.value?.trim() || null,
        tipo_cucina: tipoCucinaSelezionati,
        tags: tagsSelezionati,
        orari_apertura: orariObj,
      }).eq('id', rfSedeId);

      if (sedeErr) {
        const msg = document.getElementById('msg-profilo');
        if (msg) msg.innerHTML = '<span style="color:#dc2626;">Errore: ' + sedeErr.message + '</span>';
        return;
      }

      // Salva anche profilo pubblico chatbot (rimane su azienda)
      const serviziObj = {};
      document.querySelectorAll('[data-servizio]').forEach(el => { serviziObj[el.dataset.servizio] = el.checked; });
      const intolleranzeArr = [];
      document.querySelectorAll('[data-intolleranza]').forEach(el => { if (el.checked) intolleranzeArr.push(el.dataset.intolleranza); });

      const { error: profErr } = await supa().from('azienda_profilo_pubblico').upsert({
        azienda_id: aziendaId,
        indirizzo: document.getElementById('pp-indirizzo')?.value?.trim(),
        citta: document.getElementById('pp-citta')?.value?.trim(),
        telefono: document.getElementById('pp-telefono')?.value?.trim(),
        email: document.getElementById('pp-email')?.value?.trim(),
        google_maps_url: document.getElementById('pp-gmaps')?.value?.trim(),
        info_parcheggio: document.getElementById('pp-parcheggio')?.value?.trim(),
        servizi: serviziObj,
        intolleranze_gestite: intolleranzeArr,
        chiedi_intolleranze: document.getElementById('pp-chiedi-intolleranze')?.checked,
        chiedi_bambini: document.getElementById('pp-chiedi-bambini')?.checked,
        chiedi_occasione: document.getElementById('pp-chiedi-occasione')?.checked,
        chiedi_preferenze: document.getElementById('pp-chiedi-preferenze')?.checked,
        testo_orari: document.getElementById('pp-txt-orari')?.value?.trim(),
        testo_sede: document.getElementById('pp-txt-sede')?.value?.trim(),
        testo_menu: document.getElementById('pp-txt-menu')?.value?.trim(),
        testo_intolleranze: document.getElementById('pp-txt-intolleranze')?.value?.trim(),
        testo_accessibilita: document.getElementById('pp-txt-accessibilita')?.value?.trim(),
        testo_animali: document.getElementById('pp-txt-animali')?.value?.trim(),
      }, { onConflict: 'azienda_id' });

      const msg = document.getElementById('msg-profilo');
      if (profErr) {
        if (msg) msg.innerHTML = '<span style="color:#dc2626;">Errore: ' + profErr.message + '</span>';
      } else {
        if (msg) msg.innerHTML = '<span style="color:#059669;">✅ Profilo salvato correttamente</span>';
        setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
      }
    };
  }



  // ════════════════════════════════════════
  // TAB: MEDIA & LANDING
  // ════════════════════════════════════════
  async function renderTabMedia(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

    // Carica dati azienda
    const { data: az } = await supa()
      .from('aziende')
      .select('nome, logo_url, cover_url, foto_galleria, link_menu, colore_brand, tema_landing_id, font_family, font_size')
      .eq('id', aziendaId)
      .maybeSingle();

    const { data: temi } = await supa()
      .from('landing_temi')
      .select('*')
      .order('nome');

    const galleria = az?.foto_galleria || [];
    const colore = az?.colore_brand || '#0E5A7A';

    box.innerHTML = `
      <style>
        .media-card { background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px; }
        .media-section-title { font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px; }
        .media-section-sub { font-size:12px;color:#64748b;margin-bottom:16px; }
        .upload-zone {
          border:2px dashed #d1d5db;border-radius:14px;padding:28px 20px;text-align:center;
          cursor:pointer;transition:all .15s;background:#fafafa;
        }
        .upload-zone:hover { border-color:#0E5A7A;background:#f0f9ff; }
        .upload-zone-icon { font-size:32px;margin-bottom:8px; }
        .upload-zone-label { font-size:13px;font-weight:600;color:#374151; }
        .upload-zone-sub { font-size:11px;color:#94a3b8;margin-top:4px; }
        .preview-cover {
          width:100%;height:180px;border-radius:14px;object-fit:cover;
          border:1px solid #e5e7eb;display:block;
        }
        .preview-logo {
          width:90px;height:90px;border-radius:50%;object-fit:cover;
          border:3px solid #0E5A7A;display:block;
        }
        .profile-preview {
          position:relative;border-radius:16px;overflow:hidden;
          border:1px solid #e5e7eb;margin-bottom:20px;background:#f0f6fa;
        }
        .profile-preview-cover {
          width:100%;height:140px;object-fit:cover;display:block;background:#d1d5db;
        }
        .profile-preview-cover-empty {
          width:100%;height:140px;background:linear-gradient(135deg,#0E5A7A,#1a8fb5);display:flex;align-items:center;justify-content:center;font-size:32px;
        }
        .profile-preview-logo-wrap {
          position:absolute;left:16px;top:90px;
          width:80px;height:80px;border-radius:50%;
          border:4px solid white;overflow:hidden;background:#e5e7eb;
          display:flex;align-items:center;justify-content:center;font-size:28px;
        }
        .profile-preview-logo-wrap img { width:100%;height:100%;object-fit:cover; }
        .profile-preview-info {
          padding:12px 16px 16px 108px;min-height:60px;
        }
        .profile-preview-nome { font-size:16px;font-weight:800;color:#111827; }
        .profile-preview-sub { font-size:12px;color:#6b7280;margin-top:2px; }
        .gallery-grid {
          display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;
        }
        .gallery-item {
          position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1;background:#f3f4f6;
        }
        .gallery-item img { width:100%;height:100%;object-fit:cover;display:block; }
        .gallery-item-del {
          position:absolute;top:4px;right:4px;background:rgba(220,38,38,.85);color:white;
          border:none;border-radius:6px;width:22px;height:22px;font-size:12px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
        }
        .gallery-add {
          border-radius:10px;aspect-ratio:1;background:#f8fafc;border:2px dashed #d1d5db;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          cursor:pointer;gap:4px;font-size:11px;font-weight:600;color:#94a3b8;
        }
        .gallery-add:hover { border-color:#0E5A7A;color:#0E5A7A;background:#f0f9ff; }
        .tema-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px; }
        .tema-card {
          border:2px solid #e5e7eb;border-radius:12px;padding:12px;text-align:center;cursor:pointer;
          transition:all .15s;
        }
        .tema-card:hover { border-color:#0E5A7A; }
        .tema-card.selected { border-color:#0E5A7A;background:#f0f9ff; }
        .tema-emoji { font-size:28px;margin-bottom:6px; }
        .tema-nome { font-size:12px;font-weight:700;color:#374151; }
        .tema-date { font-size:10px;color:#94a3b8;margin-top:2px; }
        .color-row { display:flex;align-items:center;gap:12px; }
        .color-swatch {
          width:42px;height:42px;border-radius:10px;border:2px solid #e5e7eb;cursor:pointer;flex-shrink:0;
        }
      </style>

      <div style="max-width:720px;"> <div class="media-card">
          <div class="media-section-title">👁️ Anteprima landing</div>
          <div class="media-section-sub">Così appare la tua pagina di prenotazione</div>
          <div class="profile-preview" id="preview-box">
            ${az && az.cover_url
              ? '<img class="profile-preview-cover" id="prev-cover-img" src="' + esc(az.cover_url) + '" alt="Cover">'
              : '<div class="profile-preview-cover-empty" id="prev-cover-empty">&#127869;</div>'}
            <div class="profile-preview-logo-wrap" id="prev-logo-wrap">
              ${az && az.logo_url
                ? '<img src="' + esc(az.logo_url) + '" alt="Logo" id="prev-logo-img">'
                : '<span style="font-size:28px;">&#127869;</span>'}
            </div>
            <div class="profile-preview-info">
              <div class="profile-preview-nome" id="prev-nome">${esc(az?.nome || 'Il tuo ristorante')}</div>
              <div class="profile-preview-sub">Conferma di prenotazione</div>
            </div>
          </div>
        </div> <div class="media-card">
          <div class="media-section-title">🖼️ Foto di copertina</div>
          <div class="media-section-sub">Immagine orizzontale 1200×400px — come la cover di Facebook</div>
          ${az && az.cover_url ? '<img src="' + esc(az.cover_url) + '" class="preview-cover" id="cover-preview" style="margin-bottom:12px;">' : ''}
          <div class="upload-zone" id="cover-zone">
            <input type="file" id="cover-input" accept="image/*" style="display:none;">
            <div class="upload-zone-icon">🖼️</div>
            <div class="upload-zone-label">${az?.cover_url ? 'Cambia copertina' : 'Carica foto copertina'}</div>
            <div class="upload-zone-sub">JPG, PNG, WebP — max 5MB</div>
          </div>
          <div id="cover-progress" style="display:none;margin-top:8px;font-size:12px;color:#0E5A7A;font-weight:600;">⏳ Caricamento...</div>
        </div> <div class="media-card">
          <div class="media-section-title">🔵 Logo (foto profilo)</div>
          <div class="media-section-sub">Immagine quadrata o tonda — appare come foto profilo sulla landing</div>
          <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px;">
            ${az?.logo_url ? '<img src="' + esc(az.logo_url) + '" class="preview-logo" id="logo-preview">' : '<div style="width:90px;height:90px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:32px;" id="logo-preview-empty">🍽️</div>'}
            <div style="flex:1;">
              <div class="upload-zone" id="logo-zone">
                <input type="file" id="logo-input" accept="image/*" style="display:none;">
                <div class="upload-zone-icon">📷</div>
                <div class="upload-zone-label">${az?.logo_url ? 'Cambia logo' : 'Carica logo'}</div>
                <div class="upload-zone-sub">JPG, PNG — consigliato 400×400px</div>
              </div>
            </div>
          </div>
          <div id="logo-progress" style="display:none;font-size:12px;color:#0E5A7A;font-weight:600;">⏳ Caricamento...</div>
        </div> <div class="media-card">
          <div class="media-section-title">📸 Galleria foto</div>
          <div class="media-section-sub">Foto del locale, piatti, ambienti — visibili sulla landing. Trascina per riordinare.</div>
          <div class="gallery-grid" id="gallery-grid"></div>
          <input type="file" id="gallery-input" accept="image/*" multiple style="display:none;">
          <div id="gallery-progress" style="display:none;margin-top:8px;font-size:12px;color:#0E5A7A;font-weight:600;">⏳ Caricamento...</div>
        </div> <div class="media-card">
          <div class="media-section-title">📋 Link al menu</div>
          <div class="media-section-sub">URL del tuo menu digitale — apparirà sulla landing come pulsante "Vedi il menu"</div>
          <input id="link-menu" class="id-input" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;"
            placeholder="https://..." value="${esc(az?.link_menu || '')}">
          <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Es. link al menu su TheFork, tuo sito, PDF Google Drive, ecc.</div>
        </div> <div class="media-card">
          <div class="media-section-title">🔤 Font globale</div>
          <div class="media-section-sub">Applicato a landing prenotazione, menu digitale, tessera fidelity e schermo cassa cliente</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div>
              <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Famiglia font</label>
              <select id="font-family" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;">
                <option value="">Default sistema</option>
                <option value="'Playfair Display',serif">Playfair Display (elegante)</option>
                <option value="'Montserrat',sans-serif">Montserrat (moderno)</option>
                <option value="'Lato',sans-serif">Lato (pulito)</option>
                <option value="'Roboto',sans-serif">Roboto (digitale)</option>
                <option value="'Georgia',serif">Georgia (classico)</option>
                <option value="'Raleway',sans-serif">Raleway (sofisticato)</option>
                <option value="'Oswald',sans-serif">Oswald (impatto)</option>
                <option value="'Merriweather',serif">Merriweather (leggibile)</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Dimensione testo</label>
              <select id="font-size" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;">
                <option value="small">Piccolo</option>
                <option value="medium" selected>Medio (default)</option>
                <option value="large">Grande</option>
                <option value="xlarge">Molto grande</option>
              </select>
            </div>
          </div> <div id="font-preview" style="border:1.5px solid #e2e8f0;border-radius:12px;padding:16px;background:#fafafa;">
            <div id="font-preview-text" style="font-size:18px;font-weight:700;margin-bottom:4px;">Campo Antico Ricevimenti</div>
            <div id="font-preview-sub" style="font-size:14px;color:#64748b;">Prenotazione confermata per Mario Rossi</div>
            <div id="font-preview-price" style="font-size:22px;font-weight:800;color:#0E5A7A;margin-top:8px;">€ 45,00</div>
          </div>
        </div> <div class="media-card">
          <div class="media-section-title">🎨 Colore brand</div>
          <div class="media-section-sub">Colore principale della tua landing — header, pulsanti, accenti</div>
          <div class="color-row">
            <input type="color" id="colore-brand" value="${esc(colore)}"
              style="width:42px;height:42px;border:2px solid #e5e7eb;border-radius:10px;cursor:pointer;padding:2px;">
            <input id="colore-hex" style="width:120px;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:monospace;"
              value="${esc(colore)}" placeholder="#0E5A7A">
            <div id="colore-sample" style="flex:1;height:42px;border-radius:10px;background:${esc(colore)};"></div>
          </div>
        </div> <div class="media-card">
          <div class="media-section-title">🎭 Tema serata</div>
          <div class="media-section-sub">Attiva un tema stagionale per la landing — cambia colori e header automaticamente</div>
          <div class="tema-grid" id="tema-grid">
            ${(temi || []).map(function(t) { return '<div class="tema-card ' + (az && az.tema_landing_id === t.id ? 'selected' : '') + '" data-tema="' + esc(t.id) + '"><div class="tema-emoji">' + esc(t.emoji || '&#127869;') + '</div><div class="tema-nome">' + esc(t.nome) + '</div>' + (t.data_inizio ? '<div class="tema-date">' + formatTemaDate(t.data_inizio, t.data_fine) + '</div>' : '<div class="tema-date">Sempre</div>') + '</div>'; }).join('')}
            <div class="tema-card ${!az?.tema_landing_id ? 'selected' : ''}" data-tema="">
              <div class="tema-emoji">❌</div>
              <div class="tema-nome">Nessun tema</div>
              <div class="tema-date">Default</div>
            </div>
          </div>
        </div>

        <div id="media-esito" style="font-size:13px;min-height:14px;margin-bottom:12px;text-align:center;"></div>
        <button id="btn-salva-media" style="background:#0E5A7A;color:white;border:none;border-radius:12px;padding:13px 28px;cursor:pointer;font-size:15px;font-weight:700;width:100%;">
          💾 Salva impostazioni landing
        </button>
      </div>
    `;

    // ── Stato locale ──────────────────────────────────────────────
    let galleriaState = [...galleria];
    let temaSelezionato = az?.tema_landing_id || null;

    // Popola font
    const fontFamilySel = box.querySelector('#font-family');
    const fontSizeSel   = box.querySelector('#font-size');
    if (fontFamilySel) fontFamilySel.value = az?.font_family || '';
    if (fontSizeSel)   fontSizeSel.value   = az?.font_size || 'medium';

    // Preview font live
    function aggiornaPrevFont() {
      const ff = fontFamilySel?.value || 'inherit';
      const fs = fontSizeSel?.value || 'medium';
      const sizeMap = { small:'14px', medium:'18px', large:'22px', xlarge:'26px' };
      const subMap  = { small:'12px', medium:'14px', large:'16px', xlarge:'18px' };
      const priceMap= { small:'18px', medium:'22px', large:'26px', xlarge:'30px' };
      const pt = box.querySelector('#font-preview-text');
      const ps = box.querySelector('#font-preview-sub');
      const pp = box.querySelector('#font-preview-price');
      if (pt) { pt.style.fontFamily = ff; pt.style.fontSize = sizeMap[fs]||'18px'; }
      if (ps) { ps.style.fontFamily = ff; ps.style.fontSize = subMap[fs]||'14px'; }
      if (pp) { pp.style.fontFamily = ff; pp.style.fontSize = priceMap[fs]||'22px'; }
      // Carica Google Font se necessario
      if (ff && ff !== 'inherit' && ff !== '') {
        const fontName = ff.replace(/['"]/g,'').split(',')[0].trim().replace(/ /g,'+');
        const linkId = 'gfont-preview';
        let link = document.getElementById(linkId);
        if (!link) { link = document.createElement('link'); link.id = linkId; link.rel = 'stylesheet'; document.head.appendChild(link); }
        link.href = 'https://fonts.googleapis.com/css2?family=' + fontName + ':wght@400;700;800&display=swap';
      }
    }
    if (fontFamilySel) fontFamilySel.oninput = aggiornaPrevFont;
    if (fontSizeSel)   fontSizeSel.oninput   = aggiornaPrevFont;
    aggiornaPrevFont();

    // ── Render galleria ───────────────────────────────────────────
    function renderGalleria() {
      const grid = box.querySelector('#gallery-grid');
      grid.innerHTML = galleriaState.map(function(url, i) {
        return '<div class="gallery-item"><img src="' + esc(url) + '" alt="Foto ' + (i+1) + '"><button class="gallery-item-del" data-idx="' + i + '" title="Rimuovi">✕</button></div>';
      }).join('') + '<div class="gallery-add" id="gallery-add-btn"><span style="font-size:24px;">＋</span><span>Aggiungi</span></div>';
      grid.querySelectorAll('.gallery-item-del').forEach(btn => {
        btn.onclick = () => {
          galleriaState.splice(parseInt(btn.dataset.idx), 1);
          renderGalleria();
        };
      });
      grid.querySelector('#gallery-add-btn').onclick = () => box.querySelector('#gallery-input').click();
    }
    renderGalleria();

    // ── Upload cover ──────────────────────────────────────────────
    const coverZone = box.querySelector('#cover-zone');
    const coverInput = box.querySelector('#cover-input');
    coverZone.onclick = () => coverInput.click();
    coverZone.ondragover = (e) => { e.preventDefault(); coverZone.style.borderColor = '#0E5A7A'; };
    coverZone.ondragleave = () => { coverZone.style.borderColor = '#d1d5db'; };
    coverZone.ondrop = async (e) => {
      e.preventDefault();
      coverZone.style.borderColor = '#d1d5db';
      const file = e.dataTransfer.files[0];
      if (file) await uploadMedia(file, 'cover');
    };
    coverInput.onchange = async () => {
      if (coverInput.files[0]) await uploadMedia(coverInput.files[0], 'cover');
    };

    // ── Upload logo ───────────────────────────────────────────────
    const logoZone = box.querySelector('#logo-zone');
    const logoInput = box.querySelector('#logo-input');
    logoZone.onclick = () => logoInput.click();
    logoInput.onchange = async () => {
      if (logoInput.files[0]) await uploadMedia(logoInput.files[0], 'logo');
    };

    // ── Upload galleria ───────────────────────────────────────────
    const galleryInput = box.querySelector('#gallery-input');
    galleryInput.onchange = async () => {
      const files = Array.from(galleryInput.files);
      if (!files.length) return;
      const prog = box.querySelector('#gallery-progress');
      prog.style.display = '';
      for (const file of files) {
        const url = await uploadFile(file, 'galleria');
        if (url) galleriaState.push(url);
      }
      prog.style.display = 'none';
      renderGalleria();
    };

    // ── Colore brand ──────────────────────────────────────────────
    const colorePicker = box.querySelector('#colore-brand');
    const coloreHex = box.querySelector('#colore-hex');
    const coloreSample = box.querySelector('#colore-sample');
    colorePicker.oninput = () => {
      coloreHex.value = colorePicker.value;
      coloreSample.style.background = colorePicker.value;
    };
    coloreHex.oninput = () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(coloreHex.value)) {
        colorePicker.value = coloreHex.value;
        coloreSample.style.background = coloreHex.value;
      }
    };

    // ── Tema serata ───────────────────────────────────────────────
    box.querySelectorAll('.tema-card').forEach(card => {
      card.onclick = () => {
        box.querySelectorAll('.tema-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        temaSelezionato = card.dataset.tema || null;
        // Applica colore tema all'anteprima
        const tema = (temi || []).find(t => t.id === temaSelezionato);
        if (tema?.colore_primario) {
          colorePicker.value = tema.colore_primario;
          coloreHex.value = tema.colore_primario;
          coloreSample.style.background = tema.colore_primario;
        }
      };
    });

    // ── Upload file su Supabase Storage ──────────────────────────
    async function uploadFile(file, tipo) {
      const ext = file.name.split('.').pop();
      const path = aziendaId + '/' + tipo + '-' + Date.now() + '.' + ext;
      const { error } = await supa().storage.from('media-aziende').upload(path, file, { upsert: true, contentType: file.type });
      if (error) { console.error('Upload error:', error); return null; }
      const { data: pub } = supa().storage.from('media-aziende').getPublicUrl(path);
      return pub.publicUrl;
    }

    async function uploadMedia(file, tipo) {
      const prog = box.querySelector('#' + tipo + '-progress');
      prog.style.display = '';
      const url = await uploadFile(file, tipo);
      prog.style.display = 'none';
      if (!url) { mostraToast('Errore upload ' + tipo, 'error'); return; }

      if (tipo === 'cover') {
        // Aggiorna anteprima cover
        let prevImg = box.querySelector('#prev-cover-img');
        const prevEmpty = box.querySelector('#prev-cover-empty');
        if (prevEmpty) prevEmpty.remove();
        if (!prevImg) {
          prevImg = document.createElement('img');
          prevImg.id = 'prev-cover-img';
          prevImg.className = 'profile-preview-cover';
          box.querySelector('#preview-box').prepend(prevImg);
        }
        prevImg.src = url;
        // Anteprima grande
        let bigPrev = box.querySelector('#cover-preview');
        if (!bigPrev) {
          bigPrev = document.createElement('img');
          bigPrev.id = 'cover-preview';
          bigPrev.className = 'preview-cover';
          bigPrev.style.marginBottom = '12px';
          coverZone.before(bigPrev);
        }
        bigPrev.src = url;
        // Salva subito
        await supa().from('aziende').update({ cover_url: url }).eq('id', aziendaId);
        mostraToast('Cover salvata ✅', 'success');

      } else if (tipo === 'logo') {
        // Aggiorna anteprima logo
        let prevImg = box.querySelector('#prev-logo-wrap img');
        if (!prevImg) {
          prevImg = document.createElement('img');
          box.querySelector('#prev-logo-wrap').innerHTML = '';
          box.querySelector('#prev-logo-wrap').appendChild(prevImg);
        }
        prevImg.src = url;
        let logoPrev = box.querySelector('#logo-preview');
        if (logoPrev) logoPrev.src = url;
        // Salva subito
        await supa().from('aziende').update({ logo_url: url }).eq('id', aziendaId);
        mostraToast('Logo salvato ✅', 'success');
      }
    }

    // ── Salva tutto ───────────────────────────────────────────────
    box.querySelector('#btn-salva-media').onclick = async () => {
      const esito = box.querySelector('#media-esito');
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';

      const { error } = await supa().from('aziende').update({
        foto_galleria: galleriaState,
        link_menu: box.querySelector('#link-menu').value.trim() || null,
        colore_brand: box.querySelector('#colore-hex').value || '#0E5A7A',
        tema_landing_id: temaSelezionato || null,
        font_family: box.querySelector('#font-family').value || null,
        font_size: box.querySelector('#font-size').value || 'medium',
      }).eq('id', aziendaId);

      if (error) {
        esito.innerHTML = '<span style="color:#dc2626;">❌ ' + error.message + '</span>';
      } else {
        esito.innerHTML = '<span style="color:#059669;">✅ Landing aggiornata!</span>';
        mostraToast('Media & Landing salvati ✅', 'success');
        setTimeout(() => esito.textContent = '', 3000);
      }
    };
  }

  function formatTemaDate(ini, fin) {
    if (!ini) return 'Sempre';
    const fmt = (d) => { const p = d.split('-'); return p[2]+'/'+p[1]; };
    return fin ? fmt(ini)+' – '+fmt(fin) : 'Dal '+fmt(ini);
  }

  // ════════════════════════════════════════
  // TAB: PAGAMENTI STRIPE
  // ════════════════════════════════════════
  async function renderTabPagamenti(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

    // Carica config stripe per questa azienda
    const { data: cfg } = await supa()
      .from('stripe_config')
      .select('*')
      .eq('azienda_id', aziendaId)
      .maybeSingle();

    const c = cfg || {};
    const isAttivo = c.attivo === true;
    const isLive   = c.modalita === 'live';

    box.innerHTML = `
      <div style="max-width:720px;">

        <!-- HEADER -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="font-size:18px;font-weight:700;color:#0f172a;">💳 Pagamenti Stripe</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">
              Configura i pagamenti online per prenotazioni hotel, booking e ticketing
            </div>
            <button id="btn-guida-stripe" style="margin-top:8px;background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
              ❓ Come collegare Stripe
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span id="stripe-stato-badge" style="
              background:${isAttivo ? '#dcfce7' : '#fee2e2'};
              color:${isAttivo ? '#15803d' : '#dc2626'};
              padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;
            ">${isAttivo ? '✅ Attivo' : '⏸ Non attivo'}</span>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <div style="position:relative;width:44px;height:24px;">
                <input type="checkbox" id="stripe-toggle" ${isAttivo ? 'checked' : ''} style="opacity:0;position:absolute;width:100%;height:100%;cursor:pointer;margin:0;z-index:2;">
                <div id="stripe-toggle-track" style="
                  position:absolute;inset:0;border-radius:12px;transition:background 0.2s;
                  background:${isAttivo ? '#0E5A7A' : '#d1d5db'};
                "></div>
                <div id="stripe-toggle-thumb" style="
                  position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:white;
                  transition:left 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.2);
                  left:${isAttivo ? '23px' : '3px'};
                "></div>
              </div>
            </label>
          </div>
        </div>

        <!-- MODALITÀ TEST/LIVE -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:20px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;">🔧 Modalità</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <label id="mode-test-lbl" style="
              flex:1;min-width:140px;cursor:pointer;border-radius:10px;padding:14px;
              border:2px solid ${!isLive ? '#0E5A7A' : '#e5e7eb'};
              background:${!isLive ? '#f0f9ff' : '#fff'};transition:all 0.15s;
            ">
              <input type="radio" name="stripe-mode" value="test" ${!isLive ? 'checked' : ''} style="display:none;">
              <div style="font-size:15px;">🧪</div>
              <div style="font-weight:700;font-size:13px;margin-top:4px;color:${!isLive ? '#0E5A7A' : '#374151'};">Test</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Nessun addebito reale. Usa le card di test Stripe.</div>
            </label>
            <label id="mode-live-lbl" style="
              flex:1;min-width:140px;cursor:pointer;border-radius:10px;padding:14px;
              border:2px solid ${isLive ? '#0E5A7A' : '#e5e7eb'};
              background:${isLive ? '#f0f9ff' : '#fff'};transition:all 0.15s;
            ">
              <input type="radio" name="stripe-mode" value="live" ${isLive ? 'checked' : ''} style="display:none;">
              <div style="font-size:15px;">🟢</div>
              <div style="font-weight:700;font-size:13px;margin-top:4px;color:${isLive ? '#0E5A7A' : '#374151'};">Live</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Pagamenti reali. Assicurati che le chiavi siano quelle di produzione.</div>
            </label>
          </div>
          <div id="live-warning" style="display:${isLive ? 'flex' : 'none'};align-items:center;gap:8px;background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin-top:12px;font-size:12px;color:#92400e;">
            ⚠️ Modalità LIVE attiva — i pagamenti sono reali. Verifica le chiavi prima di salvare.
          </div>
        </div>

        <!-- CHIAVI API -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:20px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">🔑 Chiavi API</div>
          <div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">
            Trovale su <a href="https://dashboard.stripe.com/apikeys" target="_blank" style="color:#0E5A7A;">dashboard.stripe.com/apikeys</a>
          </div>

          <div style="display:grid;gap:14px;">

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">
                Chiave pubblicabile (pk_…)
              </label>
              <input id="stripe-pk" class="input" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;"
                placeholder="pk_test_…  oppure  pk_live_…"
                value="${esc(c.stripe_publishable_key || '')}">
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">
                Chiave segreta (sk_…)
              </label>
              <div style="position:relative;">
                <input id="stripe-sk" type="password" class="input" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;padding-right:80px;"
                  placeholder="sk_test_…  oppure  sk_live_…"
                  value="${esc(c.stripe_secret_key || '')}">
                <button id="btn-mostra-sk" type="button" style="
                  position:absolute;right:8px;top:50%;transform:translateY(-50%);
                  background:#f1f5f9;border:none;border-radius:6px;padding:4px 10px;
                  font-size:11px;cursor:pointer;color:#374151;font-weight:600;
                ">Mostra</button>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
                ⚠️ Non condividere mai questa chiave. Viene salvata in modo sicuro.
              </div>
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">
                Webhook Secret (whsec_…)
              </label>
              <div style="position:relative;">
                <input id="stripe-wh" type="password" class="input" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;padding-right:80px;"
                  placeholder="whsec_…"
                  value="${esc(c.stripe_webhook_secret || '')}">
                <button id="btn-mostra-wh" type="button" style="
                  position:absolute;right:8px;top:50%;transform:translateY(-50%);
                  background:#f1f5f9;border:none;border-radius:6px;padding:4px 10px;
                  font-size:11px;cursor:pointer;color:#374151;font-weight:600;
                ">Mostra</button>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
                Endpoint webhook Ristoflow:
                <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px;">
                  https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/stripe-webhook
                </code>
              </div>
            </div>

          </div>
        </div>

        <!-- IMPOSTAZIONI -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:20px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:16px;">⚙️ Impostazioni</div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px;">

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Valuta</label>
              <select id="stripe-valuta" class="input" style="width:100%;">
                <option value="eur" ${(c.valuta||'eur')==='eur' ? 'selected' : ''}>EUR — Euro</option>
                <option value="usd" ${c.valuta==='usd' ? 'selected' : ''}>USD — Dollaro</option>
                <option value="gbp" ${c.valuta==='gbp' ? 'selected' : ''}>GBP — Sterlina</option>
              </select>
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Acconto minimo (%)</label>
              <input id="stripe-acconto" type="number" min="0" max="100" step="1" class="input" style="width:100%;"
                placeholder="Es. 30"
                value="${c.acconto_percentuale != null ? c.acconto_percentuale : ''}">
              <div style="font-size:11px;color:#94a3b8;margin-top:3px;">0 = pagamento completo</div>
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Scadenza pagamento (ore)</label>
              <input id="stripe-scadenza" type="number" min="1" max="168" class="input" style="width:100%;"
                placeholder="Es. 24"
                value="${c.scadenza_ore != null ? c.scadenza_ore : ''}">
              <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Ore entro cui il cliente deve pagare</div>
            </div>

          </div>

          <div style="margin-top:14px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">
              URL di redirect dopo pagamento riuscito
            </label>
            <input id="stripe-success-url" class="input" style="width:100%;box-sizing:border-box;"
              placeholder="https://…/grazie.html"
              value="${esc(c.success_url || '')}">
          </div>

          <div style="margin-top:14px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">
              URL di redirect dopo annullamento
            </label>
            <input id="stripe-cancel-url" class="input" style="width:100%;box-sizing:border-box;"
              placeholder="https://…/prenotazione-annullata.html"
              value="${esc(c.cancel_url || '')}">
          </div>

        </div>

        <!-- STATO CONNESSIONE -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:24px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px;">🔌 Stato connessione</div>
          <div id="stripe-ping-wrap">
            <div style="font-size:13px;color:#94a3b8;">Clicca "Verifica connessione" per testare le chiavi.</div>
          </div>
          <button id="btn-ping-stripe" style="
            margin-top:12px;background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;
            padding:9px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;
          ">🔍 Verifica connessione</button>
        </div>

        <!-- ESITO + SALVA -->
        <div id="stripe-esito" style="font-size:13px;min-height:16px;margin-bottom:12px;"></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="btn-salva-stripe" style="background:#0E5A7A;color:white;border:none;padding:11px 28px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;">
            💾 Salva configurazione Stripe
          </button>
        </div>

      </div>
    `;

    // ── Modale guida Stripe ────────────────────────────────────────
    box.querySelector('#btn-guida-stripe').addEventListener('click', () => {
      // Rimuovi eventuale modale già aperto
      document.getElementById('stripe-guida-modal')?.remove();

      const modal = document.createElement('div');
      modal.id = 'stripe-guida-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
      modal.innerHTML = `
        <div style="background:white;border-radius:18px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          <div style="padding:24px 24px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
              <div style="font-size:18px;font-weight:800;color:#0f172a;">Come collegare Stripe 💳</div>
              <button id="chiudi-guida-stripe" style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
          </div>

          <div style="padding:0 24px 24px;font-size:13px;color:#374151;line-height:1.6;">

            <div style="background:#f0f9ff;border-left:4px solid #0E5A7A;border-radius:0 10px 10px 0;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#0f172a;">
              Stripe è il sistema di pagamento online più usato al mondo. È gratuito da attivare — paghi solo una commissione del <strong>1,5% + 0,25€</strong> per ogni transazione (carte europee).
            </div>

            <!-- STEP 1 -->
            <div style="display:flex;gap:14px;margin-bottom:18px;">
              <div style="flex-shrink:0;width:32px;height:32px;background:#0E5A7A;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">1</div>
              <div>
                <div style="font-weight:700;font-size:14px;margin-bottom:4px;">Crea un account Stripe gratuito</div>
                <div style="color:#64748b;">Vai su <a href="https://dashboard.stripe.com/register" target="_blank" style="color:#0E5A7A;font-weight:600;">dashboard.stripe.com/register</a> e registrati con la tua email aziendale. Ci vogliono 5 minuti.</div>
              </div>
            </div>

            <!-- STEP 2 -->
            <div style="display:flex;gap:14px;margin-bottom:18px;">
              <div style="flex-shrink:0;width:32px;height:32px;background:#0E5A7A;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">2</div>
              <div>
                <div style="font-weight:700;font-size:14px;margin-bottom:4px;">Completa la verifica dell'account</div>
                <div style="color:#64748b;">Stripe richiede i dati dell'azienda (P.IVA, codice fiscale, IBAN) per poter ricevere i pagamenti. Senza verifica i pagamenti restano bloccati.</div>
              </div>
            </div>

            <!-- STEP 3 -->
            <div style="display:flex;gap:14px;margin-bottom:18px;">
              <div style="flex-shrink:0;width:32px;height:32px;background:#0E5A7A;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">3</div>
              <div>
                <div style="font-weight:700;font-size:14px;margin-bottom:4px;">Copia le chiavi API</div>
                <div style="color:#64748b;margin-bottom:8px;">
                  Dalla dashboard Stripe vai su <strong>Sviluppatori → Chiavi API</strong>.<br>
                  Trovi due chiavi:
                </div>
                <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;font-size:12px;">
                  <div style="margin-bottom:6px;"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:600;">pk_live_…</span> <span style="color:#64748b;margin-left:6px;">→ Chiave pubblicabile (non è segreta)</span></div>
                  <div><span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:600;">sk_live_…</span> <span style="color:#64748b;margin-left:6px;">→ Chiave segreta (non condividere mai)</span></div>
                </div>
                <div style="margin-top:8px;background:#fef3c7;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e;">
                  💡 Inizia in modalità <strong>Test</strong> con le chiavi <code>pk_test_…</code> e <code>sk_test_…</code> per provare senza addebiti reali.
                </div>
              </div>
            </div>

            <!-- STEP 4 -->
            <div style="display:flex;gap:14px;margin-bottom:18px;">
              <div style="flex-shrink:0;width:32px;height:32px;background:#0E5A7A;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">4</div>
              <div>
                <div style="font-weight:700;font-size:14px;margin-bottom:4px;">Configura il Webhook</div>
                <div style="color:#64748b;margin-bottom:8px;">
                  Vai su <strong>Sviluppatori → Webhook</strong> e aggiungi un nuovo endpoint con questo URL:
                </div>
                <div style="background:#0f172a;border-radius:8px;padding:10px 14px;font-family:monospace;font-size:11px;color:#86efac;word-break:break-all;">
                  https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/stripe-webhook
                </div>
                <div style="margin-top:8px;color:#64748b;">Seleziona gli eventi: <strong>checkout.session.completed</strong>, <strong>payment_intent.payment_failed</strong>.<br>Poi copia il <strong>Signing secret</strong> (whsec_…) nel campo apposito qui sotto.</div>
              </div>
            </div>

            <!-- STEP 5 -->
            <div style="display:flex;gap:14px;margin-bottom:24px;">
              <div style="flex-shrink:0;width:32px;height:32px;background:#059669;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">✓</div>
              <div>
                <div style="font-weight:700;font-size:14px;margin-bottom:4px;">Incolla le chiavi in Ristoflow e salva</div>
                <div style="color:#64748b;">Usa il pulsante <strong>"Verifica connessione"</strong> per confermare che tutto funzioni, poi attiva i pagamenti con il toggle.</div>
              </div>
            </div>

            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px 16px;font-size:12px;color:#15803d;text-align:center;">
              🙋 Hai bisogno di aiuto? Scrivi a <strong>supporto@ristoflow-ai.com</strong>
            </div>

          </div>
        </div>
      `;

      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
      modal.querySelector('#chiudi-guida-stripe').addEventListener('click', () => modal.remove());
    });

    // ── Toggle on/off ──────────────────────────────────────────────
    const toggle = box.querySelector('#stripe-toggle');
    const track  = box.querySelector('#stripe-toggle-track');
    const thumb  = box.querySelector('#stripe-toggle-thumb');
    const badge  = box.querySelector('#stripe-stato-badge');
    toggle.addEventListener('change', () => {
      const on = toggle.checked;
      track.style.background  = on ? '#0E5A7A' : '#d1d5db';
      thumb.style.left        = on ? '23px' : '3px';
      badge.textContent       = on ? '✅ Attivo' : '⏸ Non attivo';
      badge.style.background  = on ? '#dcfce7' : '#fee2e2';
      badge.style.color       = on ? '#15803d' : '#dc2626';
    });

    // ── Modalità test/live ─────────────────────────────────────────
    box.querySelectorAll('input[name="stripe-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const live = radio.value === 'live';
        box.querySelector('#mode-test-lbl').style.borderColor = !live ? '#0E5A7A' : '#e5e7eb';
        box.querySelector('#mode-test-lbl').style.background  = !live ? '#f0f9ff' : '#fff';
        box.querySelector('#mode-live-lbl').style.borderColor = live  ? '#0E5A7A' : '#e5e7eb';
        box.querySelector('#mode-live-lbl').style.background  = live  ? '#f0f9ff' : '#fff';
        box.querySelector('#live-warning').style.display = live ? 'flex' : 'none';
      });
    });

    // ── Mostra/nascondi chiave segreta ─────────────────────────────
    box.querySelector('#btn-mostra-sk').addEventListener('click', function() {
      const inp = box.querySelector('#stripe-sk');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      this.textContent = show ? 'Nascondi' : 'Mostra';
    });
    box.querySelector('#btn-mostra-wh').addEventListener('click', function() {
      const inp = box.querySelector('#stripe-wh');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      this.textContent = show ? 'Nascondi' : 'Mostra';
    });

    // ── Verifica connessione (ping tramite Edge Function) ──────────
    box.querySelector('#btn-ping-stripe').addEventListener('click', async () => {
      const wrap = box.querySelector('#stripe-ping-wrap');
      const sk   = box.querySelector('#stripe-sk').value.trim();
      wrap.innerHTML = '<div style="color:#64748b;font-size:13px;">⏳ Verifica in corso...</div>';
      if (!sk) {
        wrap.innerHTML = '<div style="color:#dc2626;font-size:13px;">⚠️ Inserisci prima la chiave segreta.</div>';
        return;
      }
      try {
        // Chiamata all'Edge Function stripe-checkout per un ping
        const res = await fetch(
          'https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/stripe-checkout',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await supa().auth.getSession()).data.session?.access_token },
            body: JSON.stringify({ action: 'ping', azienda_id: aziendaId })
          }
        );
        if (res.ok) {
          wrap.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;color:#15803d;font-size:13px;font-weight:600;">
              ✅ Connessione Stripe OK
            </div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Le chiavi sono valide e l'account è raggiungibile.</div>
          `;
        } else {
          const err = await res.json().catch(() => ({}));
          wrap.innerHTML = `<div style="color:#dc2626;font-size:13px;">❌ Errore: ${esc(err.error || res.statusText)}</div>`;
        }
      } catch(e) {
        wrap.innerHTML = `<div style="color:#dc2626;font-size:13px;">❌ Errore di rete: ${esc(e.message)}</div>`;
      }
    });

    // ── Salva ──────────────────────────────────────────────────────
    box.querySelector('#btn-salva-stripe').addEventListener('click', async () => {
      const esito = box.querySelector('#stripe-esito');
      esito.innerHTML = '<span style="color:#64748b;">⏳ Salvataggio...</span>';

      const modalita = box.querySelector('input[name="stripe-mode"]:checked')?.value || 'test';
      const payload = {
        azienda_id:             aziendaId,
        attivo:                 box.querySelector('#stripe-toggle').checked,
        modalita,
        stripe_publishable_key: box.querySelector('#stripe-pk').value.trim() || null,
        stripe_secret_key:      box.querySelector('#stripe-sk').value.trim() || null,
        stripe_webhook_secret:  box.querySelector('#stripe-wh').value.trim() || null,
        valuta:                 box.querySelector('#stripe-valuta').value || 'eur',
        acconto_percentuale:    parseInt(box.querySelector('#stripe-acconto').value) || 0,
        scadenza_ore:           parseInt(box.querySelector('#stripe-scadenza').value) || 24,
        success_url:            box.querySelector('#stripe-success-url').value.trim() || null,
        cancel_url:             box.querySelector('#stripe-cancel-url').value.trim() || null,
        aggiornato_il:          new Date().toISOString(),
      };

      // Upsert su stripe_config
      const { error } = await supa()
        .from('stripe_config')
        .upsert(payload, { onConflict: 'azienda_id' });

      if (error) {
        esito.innerHTML = '<span style="color:#dc2626;">❌ ' + esc(error.message) + '</span>';
      } else {
        esito.innerHTML = '<span style="color:#059669;">✅ Configurazione Stripe salvata!</span>';
        mostraToast('Stripe configurato ✅', 'success');
        setTimeout(() => esito.textContent = '', 3000);
      }
    });
  }

  // ── Init ──
  switchTab('operativo');
}

function esc(s) {
  return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
