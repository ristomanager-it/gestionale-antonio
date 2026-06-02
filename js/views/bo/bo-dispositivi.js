// js/views/bo/bo-dispositivi.js
// Gestione dispositivi cucina connessi — roner, forno, abbattitore, bilancia, sonda

import { createPageLayout, createCard } from '../../utils/pageLayout.js';

const supa = () => window.supabaseClient || window.supabase;

const TIPI_DISPOSITIVO = [
  { id: 'roner',             label: 'Roner / Circolatore', icon: '🌡️', colore: '#0E5A7A' },
  { id: 'forno',             label: 'Forno',               icon: '🔥', colore: '#dc2626' },
  { id: 'abbattitore',       label: 'Abbattitore',         icon: '❄️', colore: '#0891b2' },
  { id: 'bilancia',          label: 'Bilancia',            icon: '⚖️', colore: '#16a34a' },
  { id: 'sonda_temperatura', label: 'Sonda temperatura',   icon: '📡', colore: '#f59e0b' },
  { id: 'altro',             label: 'Altro',               icon: '🔧', colore: '#64748b' },
];

const PROTOCOLLI = [
  { id: 'bluetooth', label: 'Bluetooth'          },
  { id: 'wifi',      label: 'Wi-Fi'              },
  { id: 'lan',       label: 'LAN / Ethernet'     },
  { id: 'mqtt',      label: 'MQTT'               },
  { id: 'usb',       label: 'USB'                },
  { id: 'manuale',   label: 'Manuale (nessuna)'  },
];

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  const sedeId    = window.state?.sedeAttiva?.id;
  if (!aziendaId) {
    container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>';
    return;
  }

  let dispositivi = [], settori = [], tariffe = [];
  let tabAttivo = 'dispositivi';
  let dispositivoInEdit = null;

  // ════════════════════════════════════════
  // SHELL — usa pageLayout + CSS responsive
  // ════════════════════════════════════════
  container.innerHTML = createPageLayout({
    title: '🔌 Dispositivi connessi',
    subtitle: 'Attrezzature, connessioni e costi energetici',
    content: `
      <style>
        .disp-tabs { display:flex; overflow-x:auto; gap:0; margin:-16px -16px 20px; padding:0 16px;
                     background:white; border-bottom:1px solid #e5e7eb; }
        .disp-tab  { padding:12px 18px; border:none; background:none; cursor:pointer;
                     font-size:13px; font-weight:600; color:#64748b;
                     border-bottom:3px solid transparent; white-space:nowrap; flex-shrink:0; }
        .disp-tab.att { color:#0E5A7A; border-bottom-color:#0E5A7A; background:#f0f9ff; }

        .disp-filtri { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
        .disp-filtro { padding:6px 12px; border:2px solid #e5e7eb; border-radius:20px;
                       background:white; color:#374151; cursor:pointer; font-size:12px; font-weight:600; }
        .disp-filtro.att { border-color:#0E5A7A; background:#f0f9ff; color:#0E5A7A; }

        .disp-card { background:white; border:1px solid #e5e7eb; border-radius:14px;
                     padding:14px 16px; margin-bottom:10px; }
        .disp-card-inner { display:flex; align-items:flex-start; gap:12px; }
        .disp-icon { width:44px; height:44px; border-radius:12px; display:flex;
                     align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
        .disp-info { flex:1; min-width:0; }
        .disp-nome { font-size:15px; font-weight:700; color:#0f172a; }
        .disp-sub  { font-size:12px; color:#64748b; margin-top:2px; }
        .disp-tags { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
        .disp-tag  { background:#f1f5f9; padding:2px 8px; border-radius:6px; font-size:11px; color:#374151; }
        .disp-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
        .disp-btn { padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px;
                    font-weight:600; border:none; }

        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media(max-width:600px) {
          .form-grid { grid-template-columns:1fr; }
          .disp-card-inner { flex-wrap:wrap; }
        }

        .form-field label { font-size:12px; color:#64748b; display:block; margin-bottom:4px; }
        .form-field input, .form-field select, .form-field textarea {
          width:100%; box-sizing:border-box; padding:9px 12px;
          border:1px solid #e5e7eb; border-radius:8px; font-size:14px; background:white; }

        .energia-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        @media(max-width:600px) { .energia-grid { grid-template-columns:1fr; } }

        .stat-card { background:white; border:1px solid #e5e7eb; border-radius:14px; padding:18px; }
        .stat-val  { font-size:32px; font-weight:800; margin:8px 0 4px; }
        .stat-sub  { font-size:12px; color:#64748b; }

        .costi-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:8px;
                     padding:10px 8px; background:#f8fafc; border-radius:8px; margin-bottom:4px; align-items:center; }
        @media(max-width:600px) {
          .costi-row { grid-template-columns:1fr 1fr; }
          .costi-row span:nth-child(3) { display:none; }
        }

        .log-row { display:flex; gap:10px; padding:10px 12px; background:white;
                   border-radius:10px; margin-bottom:6px; border-left:3px solid #e5e7eb; align-items:flex-start; }
        .log-ts  { font-size:11px; color:#94a3b8; white-space:nowrap; min-width:110px; flex-shrink:0; }
        @media(max-width:600px) { .log-ts { min-width:80px; font-size:10px; } }
      </style>

      <!-- Tab bar -->
      <div class="disp-tabs">
        <button class="disp-tab att" data-tab="dispositivi">🔌 Dispositivi</button>
        <button class="disp-tab" data-tab="energia">⚡ Energia</button>
        <button class="disp-tab" data-tab="log">📋 Log</button>
      </div>

      <!-- Contenuto -->
      <div id="disp-content"></div>
    `
  });

  // Tab switching
  container.querySelectorAll('.disp-tab').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('.disp-tab').forEach(b => b.classList.remove('att'));
      btn.classList.add('att');
      tabAttivo = btn.dataset.tab;
      renderTab();
    };
  });

  // ════════════════════════════════════════
  // CARICA DATI
  // ════════════════════════════════════════
  async function loadAll() {
    try {
      let q = supa().from('dispositivi').select('*').eq('azienda_id', aziendaId);
      if (sedeId) q = q.eq('sede_id', sedeId);
      const { data } = await q.order('nome');
      dispositivi = data || [];
    } catch(e) { dispositivi = []; }

    try {
      const { data } = await supa().from('settori').select('*').eq('azienda_id', aziendaId).order('nome');
      settori = data || [];
    } catch(e) { settori = []; }

    try {
      const { data } = await supa().from('tariffe_energia').select('*')
        .eq('azienda_id', aziendaId).order('valida_dal', { ascending: false });
      tariffe = data || [];
    } catch(e) { tariffe = []; }
  }

  // ════════════════════════════════════════
  // TAB DISPOSITIVI
  // ════════════════════════════════════════
  function renderTabDispositivi(box) {
    box.innerHTML = `
      ${createCard({ title: '', body: `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <div style="font-size:14px;font-weight:600;color:#374151;">${dispositivi.length} dispositivi</div>
          <button id="btn-nuovo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">+ Aggiungi</button>
        </div>
        <div class="disp-filtri">
          <button class="disp-filtro att" data-filtro="">Tutti</button>
          ${TIPI_DISPOSITIVO.map(t => `<button class="disp-filtro" data-filtro="${t.id}">${t.icon} ${t.label}</button>`).join('')}
        </div>
        <div id="lista-disp"></div>
      `})}
      <div id="form-disp" style="display:none;margin-top:12px;"></div>
    `;

    renderLista('');

    box.querySelector('#btn-nuovo').onclick = () => apriForm(null);

    box.querySelectorAll('.disp-filtro').forEach(btn => {
      btn.onclick = () => {
        box.querySelectorAll('.disp-filtro').forEach(b => b.classList.remove('att'));
        btn.classList.add('att');
        renderLista(btn.dataset.filtro);
      };
    });
  }

  function renderLista(filtro) {
    const box = container.querySelector('#lista-disp');
    if (!box) return;
    const lista = filtro ? dispositivi.filter(d => d.tipo === filtro) : dispositivi;
    if (!lista.length) {
      box.innerHTML = `<div style="color:#94a3b8;text-align:center;padding:32px;font-size:13px;">
        Nessun dispositivo${filtro ? ' di questo tipo' : ''} — clicca "+ Aggiungi"</div>`;
      return;
    }
    box.innerHTML = lista.map(d => {
      const tipo  = TIPI_DISPOSITIVO.find(t => t.id === d.tipo) || TIPI_DISPOSITIVO.at(-1);
      const proto = PROTOCOLLI.find(p => p.id === d.protocollo);
      const sett  = settori.find(s => s.id === d.settore_id);
      const kwh   = d.potenza_w ? (d.potenza_w / 1000).toFixed(2) : null;
      return `
        <div class="disp-card">
          <div class="disp-card-inner">
            <div class="disp-icon" style="background:${tipo.colore}18;">${tipo.icon}</div>
            <div class="disp-info">
              <div class="disp-nome">${esc(d.nome)}</div>
              <div class="disp-sub">${tipo.label}${d.marca ? ' · ' + esc(d.marca) : ''}${d.modello ? ' ' + esc(d.modello) : ''}${sett ? ' · ' + esc(sett.nome) : ''}</div>
              <div class="disp-tags">
                ${proto ? `<span class="disp-tag">${proto.label}</span>` : ''}
                ${d.mac_address ? `<span class="disp-tag" style="font-family:monospace;">${esc(d.mac_address)}</span>` : ''}
                ${d.ip_address  ? `<span class="disp-tag" style="font-family:monospace;">${esc(d.ip_address)}</span>` : ''}
                ${kwh ? `<span class="disp-tag" style="background:#fef3c7;color:#92400e;">⚡ ${kwh} kW</span>` : ''}
                ${d.connesso ? `<span class="disp-tag" style="background:#dcfce7;color:#15803d;">🤖 Automatico</span>` : `<span class="disp-tag" style="background:#f1f5f9;color:#64748b;">✋ Manuale</span>`}
                ${d.temperatura_min != null ? `<span class="disp-tag" style="background:#fef3c7;color:#92400e;">🌡 ${d.temperatura_min}–${d.temperatura_max??'?'}°C</span>` : ''}
                ${!d.attivo ? `<span class="disp-tag" style="background:#fee2e2;color:#dc2626;">Disattivo</span>` : ''}
              </div>
            </div>
          </div>
          <div class="disp-actions">
            ${d.protocollo === 'bluetooth' ? `<button class="disp-btn" data-connect="${d.id}" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;">🔵 Connetti</button>` : ''}
            <button class="disp-btn" data-edit="${d.id}" style="background:#f1f5f9;color:#374151;">Modifica</button>
            <button class="disp-btn" data-del="${d.id}" style="background:#fee2e2;color:#dc2626;">Elimina</button>
          </div>
        </div>`;
    }).join('');

    box.querySelectorAll('[data-edit]').forEach(btn    => btn.onclick = () => apriForm(dispositivi.find(d => d.id === btn.dataset.edit)));
    box.querySelectorAll('[data-del]').forEach(btn     => btn.onclick = () => elimina(btn.dataset.del));
    box.querySelectorAll('[data-connect]').forEach(btn => btn.onclick = () => connettiBt(btn.dataset.connect));
  }

  function apriForm(dispositivo) {
    dispositivoInEdit = dispositivo;
    const box = container.querySelector('#form-disp');
    if (!box) return;
    box.style.display = 'block';
    box.innerHTML = createCard({ title: dispositivo ? 'Modifica dispositivo' : 'Nuovo dispositivo', body: `
      <div class="form-grid">
        <div class="form-field">
          <label>Nome *</label>
          <input id="d-nome" value="${esc(dispositivo?.nome||'')}" placeholder="es. Roner Cucina 1">
        </div>
        <div class="form-field">
          <label>Tipo *</label>
          <select id="d-tipo">
            ${TIPI_DISPOSITIVO.map(t => `<option value="${t.id}" ${dispositivo?.tipo===t.id?'selected':''}>${t.icon} ${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Marca</label>
          <input id="d-marca" value="${esc(dispositivo?.marca||'')}" placeholder="es. Rational, Unox, Ohaus...">
        </div>
        <div class="form-field">
          <label>Modello</label>
          <input id="d-modello" value="${esc(dispositivo?.modello||'')}" placeholder="es. SCC61G">
        </div>
        <div class="form-field">
          <label>Protocollo</label>
          <select id="d-protocollo">
            ${PROTOCOLLI.map(p => `<option value="${p.id}" ${dispositivo?.protocollo===p.id?'selected':''}>${p.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Settore</label>
          <select id="d-settore">
            <option value="">— Nessuno —</option>
            ${settori.map(s => `<option value="${s.id}" ${dispositivo?.settore_id===s.id?'selected':''}>${esc(s.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>MAC Address <span style="color:#94a3b8;">(Bluetooth)</span></label>
          <input id="d-mac" value="${esc(dispositivo?.mac_address||'')}" placeholder="00:1A:2B:3C:4D:5E" style="font-family:monospace;">
        </div>
        <div class="form-field">
          <label>IP Address <span style="color:#94a3b8;">(Wi-Fi/LAN)</span></label>
          <input id="d-ip" value="${esc(dispositivo?.ip_address||'')}" placeholder="192.168.1.100" style="font-family:monospace;">
        </div>
        <div class="form-field">
          <label>Potenza (Watt) <span style="color:#94a3b8;">— costo energetico</span></label>
          <input id="d-potenza" type="number" value="${dispositivo?.potenza_w||''}" placeholder="es. 1200">
        </div>
        <div class="form-field">
          <label>Numero di serie</label>
          <input id="d-seriale" value="${esc(dispositivo?.numero_serie||'')}" placeholder="es. SN123456">
        </div>
      </div>

      <!-- HACCP & Connettività -->
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">🌡️ HACCP & Connettività automatica</div>
        <div class="form-grid">
          <div class="form-field">
            <label>Temperatura min HACCP (°C)</label>
            <input id="d-temp-min" type="number" step="0.1" value="${dispositivo?.temperatura_min??''}" placeholder="es. 63">
          </div>
          <div class="form-field">
            <label>Temperatura max HACCP (°C)</label>
            <input id="d-temp-max" type="number" step="0.1" value="${dispositivo?.temperatura_max??''}" placeholder="es. 68">
          </div>
          <div class="form-field">
            <label>API Endpoint <span style="color:#94a3b8;">(se connesso automaticamente)</span></label>
            <input id="d-api-endpoint" value="${esc(dispositivo?.api_endpoint||'')}" placeholder="http://192.168.1.x/api/temp" style="font-family:monospace;">
          </div>
          <div class="form-field">
            <label>Topic MQTT <span style="color:#94a3b8;">(se usa MQTT)</span></label>
            <input id="d-topic-mqtt" value="${esc(dispositivo?.topic_mqtt||'')}" placeholder="ristoflow/roner1/temperatura" style="font-family:monospace;">
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px;">
          <input type="checkbox" id="d-connesso" ${dispositivo?.connesso?'checked':''} style="width:16px;height:16px;">
          <label for="d-connesso" style="font-size:13px;">
            🤖 <strong>Dispositivo automatico</strong> — i dati arrivano direttamente dal dispositivo (non servono inserimenti manuali in produzione)
          </label>
        </div>
        ${dispositivo?.connesso ? `
        <div style="background:#dcfce7;border-radius:8px;padding:8px 12px;font-size:12px;color:#15803d;margin-top:8px;">
          ✅ Automatico attivo — in app-produzione i dati di questa fase arriveranno dal dispositivo
        </div>` : `
        <div style="background:#fef3c7;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e;margin-top:8px;">
          ✋ Manuale — il cuoco inserirà i dati di questa fase in produzione
        </div>`}
      </div>
      <div class="form-field" style="margin-top:12px;">
        <label>Note</label>
        <textarea id="d-note" rows="2" placeholder="Note tecniche, istruzioni...">${esc(dispositivo?.note||'')}</textarea>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin:14px 0;">
        <input type="checkbox" id="d-attivo" ${!dispositivo||dispositivo.attivo?'checked':''} style="width:16px;height:16px;">
        <label for="d-attivo" style="font-size:13px;">Dispositivo attivo</label>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="btn-salva" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;">Salva</button>
        <button id="btn-annulla" style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:14px;">Annulla</button>
      </div>
    `});

    box.querySelector('#btn-annulla').onclick = () => { box.style.display='none'; dispositivoInEdit=null; };
    box.querySelector('#btn-salva').onclick   = () => salva();
    box.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  async function salva() {
    const nome = container.querySelector('#d-nome')?.value.trim();
    if (!nome) { toast('Inserisci il nome del dispositivo','warning'); return; }
    const rec = {
      azienda_id:   aziendaId,
      sede_id:      sedeId || null,
      nome,
      tipo:         container.querySelector('#d-tipo')?.value,
      marca:        container.querySelector('#d-marca')?.value.trim() || null,
      modello:      container.querySelector('#d-modello')?.value.trim() || null,
      protocollo:   container.querySelector('#d-protocollo')?.value || null,
      settore_id:   container.querySelector('#d-settore')?.value || null,
      mac_address:  container.querySelector('#d-mac')?.value.trim() || null,
      ip_address:   container.querySelector('#d-ip')?.value.trim() || null,
      potenza_w:    parseInt(container.querySelector('#d-potenza')?.value) || null,
      numero_serie: container.querySelector('#d-seriale')?.value.trim() || null,
      note:         container.querySelector('#d-note')?.value.trim() || null,
      attivo:       container.querySelector('#d-attivo')?.checked ?? true,
      connesso:     container.querySelector('#d-connesso')?.checked ?? false,
      temperatura_min: parseFloat(container.querySelector('#d-temp-min')?.value) || null,
      temperatura_max: parseFloat(container.querySelector('#d-temp-max')?.value) || null,
      api_endpoint: container.querySelector('#d-api-endpoint')?.value.trim() || null,
      topic_mqtt:   container.querySelector('#d-topic-mqtt')?.value.trim() || null,
    };
    try {
      if (dispositivoInEdit) {
        await supa().from('dispositivi').update(rec).eq('id', dispositivoInEdit.id);
        const i = dispositivi.findIndex(d => d.id === dispositivoInEdit.id);
        if (i >= 0) dispositivi[i] = { ...dispositivoInEdit, ...rec };
      } else {
        const { data } = await supa().from('dispositivi').insert(rec).select('*').single();
        if (data) dispositivi.push(data);
      }
      container.querySelector('#form-disp').style.display = 'none';
      dispositivoInEdit = null;
      renderLista('');
      toast(`"${nome}" salvato ✅`, 'success');
    } catch(e) { toast('Errore: ' + e.message, 'error'); }
  }

  async function elimina(id) {
    if (!confirm('Eliminare questo dispositivo?')) return;
    await supa().from('dispositivi').delete().eq('id', id);
    dispositivi = dispositivi.filter(d => d.id !== id);
    renderLista('');
    toast('Dispositivo eliminato', 'success');
  }

  // ════════════════════════════════════════
  // BLUETOOTH
  // ════════════════════════════════════════
  async function connettiBt(id) {
    const d = dispositivi.find(x => x.id === id);
    if (!d) return;
    if (!navigator.bluetooth) { toast('Bluetooth non supportato — usa Chrome', 'error'); return; }
    try {
      toast('Ricerca dispositivo...', 'info');
      const opts = d.tipo === 'bilancia'
        ? { filters: [{ services: ['weight_scale'] }] }
        : d.tipo === 'sonda_temperatura'
        ? { filters: [{ services: ['health_thermometer'] }] }
        : { acceptAllDevices: true, optionalServices: ['battery_service'] };
      const device = await navigator.bluetooth.requestDevice(opts);
      toast(`Connesso a ${device.name || d.nome} ✅`, 'success');
      window._btDevices = window._btDevices || {};
      window._btDevices[id] = device;
    } catch(e) {
      if (e.name !== 'NotFoundError') toast('Errore Bluetooth: ' + e.message, 'error');
    }
  }

  // ════════════════════════════════════════
  // TAB ENERGIA
  // ════════════════════════════════════════
  function renderTabEnergia(box) {
    const tariffa = tariffe[0]?.tariffa_kwh_eur || 0.25;
    const conPotenza = dispositivi.filter(d => d.potenza_w && d.attivo);
    const totKw = conPotenza.reduce((s, d) => s + (d.potenza_w || 0), 0) / 1000;

    box.innerHTML = `
      <div class="energia-grid">
        ${createCard({ title: '⚡ Tariffa energia', body: `
          <div class="stat-sub">€/kWh corrente</div>
          <div class="stat-val" style="color:#0E5A7A;">€ ${tariffa.toFixed(4)}</div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
            <input id="nuova-tariffa" type="number" step="0.001" value="${tariffa}"
              style="flex:1;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;">
            <button id="btn-tariffa" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;">Aggiorna</button>
          </div>
        `})}
        ${createCard({ title: '🔌 Potenza installata', body: `
          <div class="stat-sub">Dispositivi attivi con potenza</div>
          <div class="stat-val" style="color:#f59e0b;">${totKw.toFixed(1)} kW</div>
          <div class="stat-sub">${conPotenza.length} dispositivi</div>
        `})}
      </div>

      ${createCard({ title: '📊 Costo per dispositivo', body: conPotenza.length ? `
        <div class="costi-row" style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;">
          <span>Dispositivo</span><span>kW</span><span>€/ora</span><span>€/turno 8h</span>
        </div>
        ${conPotenza.map(d => {
          const kw = d.potenza_w / 1000;
          const tipo = TIPI_DISPOSITIVO.find(t => t.id === d.tipo);
          return `<div class="costi-row">
            <span style="font-size:13px;font-weight:500;">${tipo?.icon||''} ${esc(d.nome)}</span>
            <span style="font-size:13px;">${kw.toFixed(2)}</span>
            <span style="font-size:13px;">€ ${(kw*tariffa).toFixed(3)}</span>
            <span style="font-size:13px;font-weight:700;color:#0E5A7A;">€ ${(kw*tariffa*8).toFixed(2)}</span>
          </div>`;
        }).join('')}
      ` : '<div style="color:#94a3b8;font-size:13px;">Nessun dispositivo con potenza registrata.</div>' })}
    `;

    box.querySelector('#btn-tariffa')?.addEventListener('click', async () => {
      const val = parseFloat(container.querySelector('#nuova-tariffa')?.value);
      if (isNaN(val) || val <= 0) { toast('Inserisci una tariffa valida', 'warning'); return; }
      await supa().from('tariffe_energia').insert({ azienda_id: aziendaId, tariffa_kwh_eur: val });
      tariffe.unshift({ tariffa_kwh_eur: val });
      toast(`Tariffa aggiornata: €${val}/kWh ✅`, 'success');
      renderTab();
    });
  }

  // ════════════════════════════════════════
  // TAB LOG
  // ════════════════════════════════════════
  async function renderTabLog(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;text-align:center;">Caricamento...</div>';
    let logs = [];
    try {
      const { data } = await supa()
        .from('dispositivo_log')
        .select('*, dispositivi(nome,tipo)')
        .eq('azienda_id', aziendaId)
        .order('created_at', { ascending: false })
        .limit(100);
      logs = data || [];
    } catch(e) {}

    if (!logs.length) {
      box.innerHTML = createCard({ title: '📋 Log eventi', body: '<div style="color:#94a3b8;text-align:center;padding:32px;">Nessun evento registrato ancora.</div>' });
      return;
    }

    const COLORI = { avvio:'#16a34a', stop:'#dc2626', peso:'#0E5A7A', temperatura:'#f59e0b', allarme:'#dc2626', fine:'#64748b' };

    box.innerHTML = createCard({ title: `📋 Log eventi (${logs.length})`, body: logs.map(l => {
      const d = l.dispositivi;
      const tipo = TIPI_DISPOSITIVO.find(t => t.id === d?.tipo);
      const col  = COLORI[l.tipo_evento] || '#64748b';
      return `<div class="log-row" style="border-left-color:${col};">
        <div class="log-ts">${new Date(l.created_at).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;">${tipo?.icon||'🔌'} ${esc(d?.nome||'Dispositivo')}</div>
          <div style="font-size:12px;color:#374151;margin-top:2px;">
            <span style="color:${col};font-weight:600;">${l.tipo_evento}</span>
            ${l.valore_numerico!=null ? ` · ${l.valore_numerico} ${l.valore_unita||''}` : ''}
            ${l.valore_target!=null   ? ` (target: ${l.valore_target})` : ''}
            ${l.operatore_nome        ? ` · ${esc(l.operatore_nome)}` : ''}
          </div>
          ${l.costo_energetico_eur ? `<div style="font-size:11px;color:#f59e0b;">⚡ €${Number(l.costo_energetico_eur).toFixed(4)}</div>` : ''}
          ${l.conforme===false      ? `<div style="font-size:11px;color:#dc2626;">⚠️ Fuori parametri HACCP</div>` : ''}
        </div>
      </div>`;
    }).join('') });
  }

  // ════════════════════════════════════════
  // RENDER TAB + TOAST
  // ════════════════════════════════════════
  async function renderTab() {
    const box = container.querySelector('#disp-content');
    if (!box) return;
    box.innerHTML = '';
    switch(tabAttivo) {
      case 'dispositivi': renderTabDispositivi(box); break;
      case 'energia':     renderTabEnergia(box);     break;
      case 'log':         await renderTabLog(box);   break;
    }
  }

  function toast(msg, tipo='info') {
    const c = { success:'#16a34a', error:'#dc2626', warning:'#f59e0b', info:'#0E5A7A' };
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${c[tipo]};color:white;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);max-width:90vw;text-align:center;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── Init ──
  await loadAll();
  renderTab();
}

function esc(s) {
  return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
