// js/views/bo/bo-configurazione.js
// Control room del ristorante — configurazione centralizzata
// Tab: Operativo | Sala | Menu & Comunicazione | Cassa | Integrazioni

import { createPageLayout } from "../../utils/pageLayout.js";

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
  const sedeId    = window.state?.sedeAttiva?.id;

  if (!aziendaId) { container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>'; return; }
  const authOk = await waitForAuth();
  if (!authOk) { container.innerHTML = '<section class="view"><h2>Sessione non disponibile.</h2></section>'; return; }

  let tabAttivo = 'operativo';
  let settori = [], postazioni = [], prodottiVendita = [], categorieVendita = [], ricette = [];
  let tavoli = [], sale = [];

  container.innerHTML = createPageLayout({
    title: "Configurazione",
    subtitle: "Control room — impostazioni operative del ristorante",
    content: `
      <!-- Tab nav -->
      <div style="display:flex;gap:0;overflow-x:auto;border-bottom:1px solid #e5e7eb;margin-bottom:24px;-webkit-overflow-scrolling:touch;">
        ${[
          { id:'operativo',    icon:'👨‍🍳', label:'Operativo'          },
          { id:'sala',         icon:'🪑', label:'Sala'                 },
          { id:'menu',         icon:'📋', label:'Menu'                 },
          { id:'cassa',        icon:'💳', label:'Cassa'                },
          { id:'integrazioni', icon:'🔗', label:'Integrazioni'         },
        ].map(t => `
          <button data-tab="${t.id}" style="
            padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;
            color:#64748b;border-bottom:3px solid transparent;white-space:nowrap;transition:all 0.15s;
          ">${t.icon} ${t.label}</button>
        `).join('')}
      </div>
      <!-- Contenuto tab -->
      <div id="tab-content"></div>
    `
  });

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
      case 'cassa':        renderTabCassa(box); break;
      case 'integrazioni': renderTabPresto(box,'🔗','Integrazioni',      'Connessione con sistemi POS, piattaforme delivery, Google, WhatsApp.');  break;
    }
  }

  container.querySelectorAll('[data-tab]').forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));

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

    const sediOpts = (sedi || []).map(s =>
      `<option value="${s.id}">${esc(s.nome)}</option>`
    ).join('');

    box.innerHTML = `
      <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <div style="font-size:18px;font-weight:700;color:#0f172a;">🖨️ Stampanti fiscali</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Registratori telematici collegati per sede</div>
          </div>
          <button id="btn-nuova-stampante" style="background:#0E5A7A;color:white;border:none;padding:9px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">+ Aggiungi stampante</button>
        </div>

        <div id="lista-stampanti"></div>

        <!-- Form nuova/modifica stampante -->
        <div id="form-stampante-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin-top:20px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;" id="form-stampante-title">Nuova stampante</div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;">

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Nome</label>
              <input id="sp-nome" class="input" style="width:100%;box-sizing:border-box;" placeholder="Es. Cassa principale" style="margin-top:4px;">
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
              <input id="sp-matricola" class="input" style="width:100%;box-sizing:border-box;" placeholder="Es. 99IEB040357" style="margin-top:4px;">
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Indirizzo IP</label>
              <input id="sp-ip" class="input" style="width:100%;box-sizing:border-box;" placeholder="Es. 192.168.0.102" style="margin-top:4px;">
            </div>

            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;">Porta HTTP</label>
              <input id="sp-porta" class="input" type="number" style="width:100%;box-sizing:border-box;" value="80" style="margin-top:4px;">
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
        const r = await fetch(`http://${ip}:${porta}/cgi-bin/fpmate.cgi`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><printerCommand><queryPrinterStatus/></printerCommand></s:Body></s:Envelope>',
          signal: AbortSignal.timeout(5000)
        });
        if (r.ok) { esito.textContent = '✅ Stampante raggiungibile!'; esito.style.color = '#16a34a'; }
        else { esito.textContent = `⚠️ Risposta HTTP ${r.status}`; esito.style.color = '#f59e0b'; }
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
    box.innerHTML = `
      <!-- Sezione: Settori -->
      <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;">🍕 Settori cucina</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Reparti operativi — ogni tablet display mostra il suo settore</div>
          </div>
          <button id="btn-nuovo-settore" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuovo settore</button>
        </div>
        <div id="lista-settori" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:12px;"></div>
        <!-- Form nuovo settore -->
        <div id="form-settore" style="display:none;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-top:12px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Nuovo settore</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
            <div style="flex:1;min-width:160px;">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Nome *</label>
              <input id="settore-nome" class="input" placeholder="es. Piscina, Antipasti, Pasticceria..." style="width:100%;box-sizing:border-box;padding:8px 12px;font-size:14px;">
            </div>
            <div style="min-width:120px;">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Colore</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;" id="colori-settore">
                ${COLORI_SETTORI.map(c => `<button data-col="${c}" style="width:28px;height:28px;border-radius:8px;border:2px solid transparent;background:${c};cursor:pointer;"></button>`).join('')}
              </div>
            </div>
            <div style="min-width:120px;">
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Ordine</label>
              <input id="settore-ordine" type="number" value="0" min="0" style="width:80px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;">
            </div>
            <div style="display:flex;gap:8px;">
              <button id="btn-salva-settore" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">Salva</button>
              <button id="btn-annulla-settore" style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px;">Annulla</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sezione: Postazioni -->
      <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;">📱 Postazioni display</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Tablet fissi — ogni postazione ha un URL dedicato e mostra il suo settore</div>
          </div>
          <button id="btn-nuova-postazione" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuova postazione</button>
        </div>
        <div id="lista-postazioni" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;"></div>
        <!-- Form nuova postazione -->
        <div id="form-postazione" style="display:none;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-top:12px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Nuova postazione</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:12px;">
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Nome postazione *</label>
              <input id="post-nome" class="input" placeholder="es. Tablet Cucina, Bar Piscina..." style="width:100%;box-sizing:border-box;padding:8px 12px;font-size:14px;">
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Settore (opzionale)</label>
              <select id="post-settore" style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;background:white;">
                <option value="">Tutti i settori</option>
                ${settori.map(s => `<option value="${s.nome.toLowerCase()}">${s.nome}</option>`).join('')}
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
      </div>

      <!-- Sezione: Prodotti → Settore -->
      <div style="margin-bottom:36px;">
        <div style="margin-bottom:16px;">
          <div style="font-size:17px;font-weight:700;color:#0f172a;">🍽️ Prodotti per settore</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Assegna ogni prodotto al settore che lo prepara — il display riceverà solo le sue portate</div>
        </div>
        <div id="lista-prodotti-settore" style="display:flex;flex-direction:column;gap:6px;"></div>
      </div>

      <!-- Sezione: Tempi & Alert -->
      <div style="margin-bottom:36px;">
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
      const { data, error } = await supa().from('settori').insert({ azienda_id:aziendaId, nome, colore:coloreSelezionato, ordine }).select('*').single();
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
      const url = s ? `#/display-cucina?settore=${s}` : '#/display-cucina';
      if (urlPreview) urlPreview.innerHTML = `URL tablet: <strong>${url}</strong> — <a href="${url}" target="_blank" style="color:#0E5A7A;font-size:12px;">Apri in nuova scheda →</a>`;
    };
    postSettore?.addEventListener('change', aggiornaUrl);
    container.querySelector('#btn-nuova-postazione').onclick = () => { container.querySelector('#form-postazione').style.display='block'; postNome?.focus(); };
    container.querySelector('#btn-annulla-postazione').onclick = () => container.querySelector('#form-postazione').style.display='none';
    container.querySelector('#btn-salva-postazione').onclick = async () => {
      const nome = postNome?.value.trim();
      if (!nome) { mostraToast('Inserisci il nome della postazione','warning'); return; }
      const settoreNome = postSettore?.value || null;
      const url = settoreNome ? `#/display-cucina?settore=${settoreNome}` : '#/display-cucina';
      const { data, error } = await supa().from('postazioni').insert({ azienda_id:aziendaId, sede_id:sedeId||null, nome, settore_nome:settoreNome, url_display:url }).select('*').single();
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
    box.innerHTML = settori.map((s,i) => `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:14px;height:14px;border-radius:50%;background:${s.colore||COLORI_SETTORI[i%COLORI_SETTORI.length]};flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">${esc(s.nome)}</div>
          <div style="font-size:11px;color:#94a3b8;">Ordine: ${s.ordine||0}</div>
        </div>
        <button data-del-settore="${s.id}" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;">Elimina</button>
      </div>
    `).join('');
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
    box.innerHTML = postazioni.map(p => {
      const url = p.url_display || '#/display-cucina';
      return `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
          <div style="font-size:24px;">📱</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;color:#0f172a;">${esc(p.nome)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">${p.settore_nome ? `Settore: ${esc(p.settore_nome)}` : 'Tutti i settori'}</div>
            <div style="font-size:12px;color:#0E5A7A;margin-top:2px;font-family:monospace;">${esc(url)}</div>
          </div>
          <a href="${url}" target="_blank" style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;">Apri →</a>
          <button data-del-post="${p.id}" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12px;">✕</button>
        </div>
      `;
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
    // Raggruppa per categoria
    const catMap = {};
    categorieVendita.forEach(c => catMap[c.id] = c.nome);
    const perCat = {};
    prodottiVendita.forEach(p => {
      const cn = catMap[p.categoria_vendita_id] || 'Senza categoria';
      if (!perCat[cn]) perCat[cn] = [];
      perCat[cn].push(p);
    });
    box.innerHTML = Object.entries(perCat).map(([cat, prods]) => `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:4px;">
        <div style="padding:10px 16px;background:#f8fafc;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">${esc(cat)}</div>
        ${prods.map(p => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #f1f5f9;">
            <div style="flex:1;font-size:13px;color:#0f172a;">${esc(p.nome)}</div>
            <select data-prod-settore="${p.id}" style="padding:5px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;background:white;min-width:140px;">
              <option value="">— Nessun settore —</option>
              ${settori.map(s => `<option value="${s.id}" ${p.settore_id===s.id?'selected':''}>${esc(s.nome)}</option>`).join('')}
            </select>
          </div>
        `).join('')}
      </div>
    `).join('');
    box.querySelectorAll('[data-prod-settore]').forEach(sel => {
      sel.onchange = async () => {
        const pid = sel.dataset.prodSettore;
        const sid = sel.value || null;
        await supa().from('prodotti_vendita').update({ settore_id: sid }).eq('id', pid);
        // Aggiorna comanda_righe: quando il prodotto viene aggiunto, usa il settore_id
        mostraToast('Settore aggiornato ✅','success');
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
      .from('tavoli').select('*')
      .eq('azienda_id', aziendaId)
      .order('numero');
    tavoli = tavoliData || [];

    box.innerHTML = `
      <!-- SALE -->
      <div style="margin-bottom:36px;">
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
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
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
      </div>

      <!-- TAVOLI -->
      <div style="margin-bottom:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;">🪑 Tavoli</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">Aggiungi tavoli con numero, coperti minimi/massimi e sala di appartenenza</div>
          </div>
          <button id="btn-nuovo-tavolo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuovo tavolo</button>
        </div>

        <!-- Filtro per sala -->
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <button data-filter-sala="" class="btn-filter-sala" style="padding:5px 14px;border-radius:20px;border:1px solid #0E5A7A;background:#0E5A7A;color:white;font-size:12px;cursor:pointer;font-weight:600;">Tutti</button>
          ${sale.map(s => `<button data-filter-sala="${s.id}" class="btn-filter-sala" style="padding:5px 14px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;font-size:12px;cursor:pointer;">${esc(s.nome)}</button>`).join('')}
        </div>

        <div id="lista-tavoli-conf" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:12px;"></div>

        <div id="form-tavolo" style="display:none;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-top:12px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:12px;" id="form-tavolo-title">Nuovo tavolo</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Numero / Nome *</label>
              <input id="tavolo-numero" class="input" placeholder="Es. 1, T1, Bar..." style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Sala</label>
              <select id="tavolo-sala" class="input" style="width:100%;box-sizing:border-box;">
                <option value="">— Nessuna sala —</option>
                ${sale.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join('')}
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
          </div>
          <div id="tavolo-esito" style="font-size:13px;min-height:16px;margin-top:10px;"></div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button id="btn-salva-tavolo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">💾 Salva</button>
            <button id="btn-annulla-tavolo" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px;">Annulla</button>
          </div>
        </div>
      </div>

      <!-- PRENOTAZIONI link -->
      <div>
        <div style="font-size:17px;font-weight:700;color:#0f172a;margin-bottom:12px;">📅 Prenotazioni e piantina</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
          ${[
            { icon:'📅', titolo:'Prenotazioni', desc:'Gestisci le prenotazioni e conferma gli arrivi.', link:'prenotazioni', cta:'Vai a Prenotazioni' },
            { icon:'🗺️', titolo:'Piantina sala', desc:'Visualizza e assegna i tavoli graficamente.', link:'prenotazioni-tavoli', cta:'Vai alla Piantina' },
          ].map(c => cardLink(c)).join('')}
        </div>
      </div>
    `;

    renderListaSale();
    renderListaTavoliConf();
    bindSala();
  }

  function renderListaSale() {
    const box = container.querySelector('#lista-sale');
    if (!box) return;
    if (!sale.length) {
      box.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">Nessuna sala. Creane una per organizzare i tavoli.</div>';
      return;
    }
    box.innerHTML = sale.map(s => `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">🏠 ${esc(s.nome)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">
            ${s.capienza_max ? `Capienza: ${s.capienza_max} posti` : ''}
            ${s.note ? ` · ${esc(s.note)}` : ''}
            · ${tavoli.filter(t => t.sala_id === s.id).length} tavoli
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button data-del-sala="${s.id}" style="background:#fee2e2;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>
        </div>
      </div>
    `).join('');

    box.querySelectorAll('[data-del-sala]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questa sala? I tavoli associati rimarranno.')) return;
        await supa().from('sale').delete().eq('id', btn.dataset.delSala);
        sale = sale.filter(s => s.id !== btn.dataset.delSala);
        renderListaSale();
        renderListaTavoliConf();
      });
    });
  }

  let filtroSalaAttivo = '';
  function renderListaTavoliConf() {
    const box = container.querySelector('#lista-tavoli-conf');
    if (!box) return;
    const filtered = filtroSalaAttivo
      ? tavoli.filter(t => t.sala_id === filtroSalaAttivo)
      : tavoli;
    if (!filtered.length) {
      box.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;grid-column:1/-1;">Nessun tavolo. Aggiungine uno.</div>';
      return;
    }
    box.innerHTML = filtered.map(t => {
      const salaNome = sale.find(s => s.id === t.sala_id)?.nome || '';
      return `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px;position:relative;">
          <div style="font-size:20px;font-weight:700;color:#0E5A7A;margin-bottom:4px;">T${esc(String(t.numero || t.nome || '?'))}</div>
          <div style="font-size:12px;color:#64748b;">${salaNome ? `🏠 ${esc(salaNome)}` : ''}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">👥 ${t.coperti_min||1}–${t.coperti_max||4} coperti${t.sedie ? ` · 🪑 ${t.sedie} sedie` : ''}</div>
          ${t.posizione ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${esc(t.posizione)}</div>` : ''}
          <button data-del-tavolo="${t.id}" style="position:absolute;top:8px;right:8px;background:#fee2e2;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;color:#dc2626;">🗑</button>
        </div>
      `;
    }).join('');

    box.querySelectorAll('[data-del-tavolo]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questo tavolo?')) return;
        await supa().from('tavoli').delete().eq('id', btn.dataset.delTavolo);
        tavoli = tavoli.filter(t => t.id !== btn.dataset.delTavolo);
        renderListaTavoliConf();
      });
    });
  }

  function bindSala() {
    // Sale
    let editingSalaId = null;
    container.querySelector('#btn-nuova-sala')?.addEventListener('click', () => {
      editingSalaId = null;
      container.querySelector('#form-sala-title').textContent = 'Nuova sala';
      container.querySelector('#sala-nome').value = '';
      container.querySelector('#sala-capienza').value = '';
      container.querySelector('#sala-note').value = '';
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
        sede_id: sedeId || null,
        nome,
        capienza_max: parseInt(container.querySelector('#sala-capienza').value) || null,
        note: container.querySelector('#sala-note').value.trim() || null,
      };
      const { data, error } = await supa().from('sale').insert(payload).select('*').single();
      if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }
      sale.push(data);
      container.querySelector('#form-sala').style.display = 'none';
      renderListaSale();
      mostraToast('Sala "' + nome + '" creata ✅', 'success');
    });

    // Tavoli
    container.querySelector('#btn-nuovo-tavolo')?.addEventListener('click', () => {
      container.querySelector('#form-tavolo-title').textContent = 'Nuovo tavolo';
      container.querySelector('#tavolo-numero').value = '';
      container.querySelector('#tavolo-sala').value = '';
      container.querySelector('#tavolo-min').value = '1';
      container.querySelector('#tavolo-max').value = '4';
      container.querySelector('#tavolo-sedie').value = '';
      container.querySelector('#form-tavolo').style.display = '';
      container.querySelector('#tavolo-numero').focus();
    });
    container.querySelector('#btn-annulla-tavolo')?.addEventListener('click', () => {
      container.querySelector('#form-tavolo').style.display = 'none';
    });
    container.querySelector('#btn-salva-tavolo')?.addEventListener('click', async () => {
      const esito = container.querySelector('#tavolo-esito');
      const numero = container.querySelector('#tavolo-numero').value.trim();
      const max = parseInt(container.querySelector('#tavolo-max').value);
      if (!numero || !max) { esito.textContent = '❌ Numero e coperti max obbligatori'; esito.style.color = '#dc2626'; return; }
      esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
      const payload = {
        azienda_id: aziendaId,
        sede_id: sedeId || null,
        sala_id: container.querySelector('#tavolo-sala').value || null,
        numero: isNaN(Number(numero)) ? null : Number(numero),
        nome: numero,
        coperti_min: parseInt(container.querySelector('#tavolo-min').value) || 1,
        coperti_max: max,
        sedie: parseInt(container.querySelector('#tavolo-sedie').value) || null,
        posizione: container.querySelector('#tavolo-posizione').value || null,
        attivo: true,
      };
      const { data, error } = await supa().from('tavoli').insert(payload).select('*').single();
      if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }
      tavoli.push(data);
      container.querySelector('#form-tavolo').style.display = 'none';
      renderListaTavoliConf();
      mostraToast('Tavolo ' + numero + ' aggiunto ✅', 'success');
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
  // TAB: MENU & CATALOGO PRODOTTI
  // ════════════════════════════════════════
  async function renderTabMenu(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

    const { data: categorie } = await supa()
      .from('categorie_vendita')
      .select('id, nome')
      .eq('azienda_id', aziendaId)
      .eq('sede_id', sedeId)
      .order('nome');

    const { data: sedi } = await supa()
      .from('sedi').select('id, nome')
      .eq('azienda_id', aziendaId).order('nome');

    let prodotti = [];
    const caricaProdotti = async (filtroCanale = '', filtroTipo = '', filtroQ = '') => {
      let q = supa().from('prodotti_vendita').select('*, categorie_vendita(nome)')
        .eq('azienda_id', aziendaId);
      if (sedeId) q = q.eq('sede_id', sedeId);
      if (filtroCanale) q = q.eq('canale', filtroCanale);
      if (filtroTipo) q = q.eq('tipo', filtroTipo);
      if (filtroQ) q = q.ilike('nome', `%${filtroQ}%`);
      const { data } = await q.order('ordinamento').order('nome');
      prodotti = data || [];
    };

    await caricaProdotti();

    const canaliOpts = ['tutti', 'evento', 'ristorante', 'trattoria', 'bar']
      .map(c => `<option value="${c}">${c}</option>`).join('');
    const tipiOpts = ['', 'portata', 'servizio', 'menu_fisso', 'bevanda', 'altro']
      .map(t => `<option value="${t}">${t || '— tutti i tipi —'}</option>`).join('');
    const catOpts = (categorie || []).map(c =>
      `<option value="${c.id}">${esc(c.nome)}</option>`).join('');

    box.innerHTML = `
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:17px;font-weight:700;color:#0f172a;">🍽️ Catalogo prodotti</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Portate, servizi e menu — usati da preventivi, comande e menu digitale</div>
        </div>
        <button id="btn-nuovo-prodotto" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">+ Aggiungi prodotto</button>
      </div>

      <!-- Filtri -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">
        <input id="filtro-q" class="input" placeholder="🔍 Cerca..." style="flex:1;min-width:150px;max-width:220px;">
        <select id="filtro-canale" class="input" style="min-width:120px;">${canaliOpts}</select>
        <select id="filtro-tipo" class="input" style="min-width:130px;">${tipiOpts}</select>
        <button id="btn-applica-filtri" style="background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;">Filtra</button>
      </div>

      <!-- Lista prodotti -->
      <div id="lista-prodotti-cat"></div>

      <!-- Form prodotto -->
      <div id="form-prodotto-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin-top:20px;">
        <div style="font-size:16px;font-weight:700;margin-bottom:16px;" id="form-prodotto-title">Nuovo prodotto</div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
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
              ${(sedi || []).map(s => `<option value="${s.id}" ${s.id === sedeId ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
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
      </div>

      <!-- Link utili -->
      <div style="margin-top:32px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
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
                ${catNome ? `${esc(catNome)} · ` : ''}${p.tipo || ''}
                ${p.prezzo_base ? ` · <strong>€${Number(p.prezzo_base).toFixed(2)}</strong>` : ''}
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
      box.querySelector('#pv-sede').value = p?.sede_id || sedeId || '';
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
        sede_id: box.querySelector('#pv-sede').value || sedeId || null,
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
      mostraToast(`"${nome}" salvato ✅`, 'success');
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
        <button ${link?`data-nav="${link}"`:'disabled'} style="
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
    try { let q=supa().from('prodotti_vendita').select('*').eq('azienda_id',aziendaId); if(sedeId)q=q.eq('sede_id',sedeId); const{data}=await q.order('nome'); prodottiVendita=data||[]; } catch(e){prodottiVendita=[];}
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
    t.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${c[tipo]};color:white;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);`;
    t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3000);
  }

  // ── Init ──
  switchTab('operativo');
}

function esc(s) {
  return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
