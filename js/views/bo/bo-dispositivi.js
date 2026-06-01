// js/views/bo/bo-dispositivi.js
// Gestione dispositivi cucina connessi — roner, forno, abbattitore, bilancia, sonda

const supa = () => window.supabaseClient || window.supabase;

const TIPI_DISPOSITIVO = [
  { id: 'roner',             label: 'Roner / Circolatore',    icon: '🌡️', colore: '#0E5A7A' },
  { id: 'forno',             label: 'Forno',                  icon: '🔥', colore: '#dc2626' },
  { id: 'abbattitore',       label: 'Abbattitore',            icon: '❄️', colore: '#0891b2' },
  { id: 'bilancia',          label: 'Bilancia',               icon: '⚖️', colore: '#16a34a' },
  { id: 'sonda_temperatura', label: 'Sonda temperatura',      icon: '📡', colore: '#f59e0b' },
  { id: 'altro',             label: 'Altro',                  icon: '🔧', colore: '#64748b' },
];

const PROTOCOLLI = [
  { id: 'bluetooth', label: 'Bluetooth' },
  { id: 'wifi',      label: 'Wi-Fi' },
  { id: 'lan',       label: 'LAN / Ethernet' },
  { id: 'mqtt',      label: 'MQTT' },
  { id: 'usb',       label: 'USB' },
  { id: 'manuale',   label: 'Manuale (no connessione)' },
];

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  const sedeId    = window.state?.sedeAttiva?.id;
  if (!aziendaId) { container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>'; return; }

  let dispositivi = [], settori = [], tariffe = [];
  let tabAttivo = 'dispositivi';
  let formAperto = false;
  let dispositivoInEdit = null;

  // ════════════════════════════════════════
  // SHELL
  // ════════════════════════════════════════
  container.innerHTML = `
  <div style="min-height:100vh;background:#f8fafc;">
    <div style="background:white;border-bottom:1px solid #e5e7eb;padding:20px 28px 0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <div style="width:40px;height:40px;background:#0E5A7A;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">🔌</div>
        <div>
          <div style="font-size:20px;font-weight:700;color:#0f172a;">Dispositivi connessi</div>
          <div style="font-size:13px;color:#64748b;">Gestione attrezzature, connessioni e costi energetici</div>
        </div>
      </div>
      <div style="display:flex;gap:0;">
        ${[
          {id:'dispositivi', label:'🔌 Dispositivi'},
          {id:'energia',     label:'⚡ Energia & Costi'},
          {id:'log',         label:'📋 Log eventi'},
        ].map(t=>`<button data-tab="${t.id}" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;white-space:nowrap;">${t.label}</button>`).join('')}
      </div>
    </div>
    <div id="tab-content" style="padding:28px;max-width:960px;"></div>
  </div>
  `;

  container.querySelectorAll('[data-tab]').forEach(btn => {
    btn.onclick = () => { tabAttivo = btn.dataset.tab; aggiornaTabs(); renderTab(); };
  });

  function aggiornaTabs() {
    container.querySelectorAll('[data-tab]').forEach(btn => {
      const att = btn.dataset.tab === tabAttivo;
      btn.style.color = att ? '#0E5A7A' : '#64748b';
      btn.style.borderBottomColor = att ? '#0E5A7A' : 'transparent';
      btn.style.background = att ? '#f0f9ff' : 'none';
    });
  }

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
      const { data } = await supa().from('tariffe_energia').select('*').eq('azienda_id', aziendaId).order('valida_dal', {ascending:false});
      tariffe = data || [];
    } catch(e) { tariffe = []; }
  }

  // ════════════════════════════════════════
  // TAB DISPOSITIVI
  // ════════════════════════════════════════
  function renderTabDispositivi(box) {
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-size:15px;font-weight:600;color:#374151;">${dispositivi.length} dispositivi registrati</div>
        <button id="btn-nuovo-dispositivo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">+ Aggiungi dispositivo</button>
      </div>

      <!-- Griglia tipi -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;" id="filtro-tipo">
        <button data-filtro="" style="padding:6px 14px;border:2px solid #0E5A7A;border-radius:20px;background:#f0f9ff;color:#0E5A7A;cursor:pointer;font-size:12px;font-weight:600;">Tutti</button>
        ${TIPI_DISPOSITIVO.map(t=>`<button data-filtro="${t.id}" style="padding:6px 14px;border:2px solid #e5e7eb;border-radius:20px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">${t.icon} ${t.label}</button>`).join('')}
      </div>

      <!-- Lista dispositivi -->
      <div id="lista-dispositivi"></div>

      <!-- Form nuovo/edit -->
      <div id="form-dispositivo" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin-top:16px;"></div>
    `;

    renderListaDispositivi('');

    box.querySelector('#btn-nuovo-dispositivo').onclick = () => apriForm(null);

    box.querySelectorAll('[data-filtro]').forEach(btn => btn.onclick = () => {
      box.querySelectorAll('[data-filtro]').forEach(b => {
        b.style.borderColor = '#e5e7eb'; b.style.background = 'white'; b.style.color = '#374151';
      });
      btn.style.borderColor = '#0E5A7A'; btn.style.background = '#f0f9ff'; btn.style.color = '#0E5A7A';
      renderListaDispositivi(btn.dataset.filtro);
    });
  }

  function renderListaDispositivi(filtroTipo) {
    const box = container.querySelector('#lista-dispositivi');
    if (!box) return;
    const lista = filtroTipo ? dispositivi.filter(d => d.tipo === filtroTipo) : dispositivi;
    if (!lista.length) {
      box.innerHTML = `<div style="color:#94a3b8;text-align:center;padding:40px;font-size:14px;">Nessun dispositivo${filtroTipo?' di questo tipo':''} — clicca "+ Aggiungi" per iniziare</div>`;
      return;
    }
    box.innerHTML = lista.map(d => {
      const tipo = TIPI_DISPOSITIVO.find(t => t.id === d.tipo) || TIPI_DISPOSITIVO.at(-1);
      const proto = PROTOCOLLI.find(p => p.id === d.protocollo);
      const settore = settori.find(s => s.id === d.settore_id);
      const kwh = d.potenza_w ? (d.potenza_w / 1000).toFixed(2) : null;
      return `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;gap:14px;">
          <div style="width:48px;height:48px;border-radius:12px;background:${tipo.colore}15;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${tipo.icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;">${esc(d.nome)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">
              ${tipo.label}
              ${d.marca ? ` · ${esc(d.marca)}` : ''}
              ${d.modello ? ` ${esc(d.modello)}` : ''}
              ${settore ? ` · ${esc(settore.nome)}` : ''}
            </div>
            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
              ${proto ? `<span style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:11px;color:#374151;">${proto.label}</span>` : ''}
              ${d.mac_address ? `<span style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:11px;color:#374151;font-family:monospace;">${esc(d.mac_address)}</span>` : ''}
              ${d.ip_address ? `<span style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:11px;color:#374151;font-family:monospace;">${esc(d.ip_address)}</span>` : ''}
              ${kwh ? `<span style="background:#fef3c7;padding:2px 8px;border-radius:6px;font-size:11px;color:#92400e;">⚡ ${kwh} kW</span>` : ''}
              ${!d.attivo ? `<span style="background:#fee2e2;padding:2px 8px;border-radius:6px;font-size:11px;color:#dc2626;">Disattivo</span>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            ${d.protocollo === 'bluetooth' ? `<button data-connect="${d.id}" style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;">🔵 Connetti</button>` : ''}
            <button data-edit="${d.id}" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;">Modifica</button>
            <button data-del="${d.id}" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12px;">✕</button>
          </div>
        </div>
      `;
    }).join('');

    box.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => apriForm(dispositivi.find(d => d.id === btn.dataset.edit)));
    box.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => eliminaDispositivo(btn.dataset.del));
    box.querySelectorAll('[data-connect]').forEach(btn => btn.onclick = () => connettiBluetooth(btn.dataset.connect));
  }

  function apriForm(dispositivo) {
    dispositivoInEdit = dispositivo;
    const box = container.querySelector('#form-dispositivo');
    if (!box) return;
    box.style.display = 'block';
    box.innerHTML = `
      <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:20px;">${dispositivo ? 'Modifica dispositivo' : 'Nuovo dispositivo'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Nome *</label>
          <input id="d-nome" class="input" value="${esc(dispositivo?.nome||'')}" placeholder="es. Roner Cucina 1" style="width:100%;box-sizing:border-box;padding:9px 12px;">
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Tipo *</label>
          <select id="d-tipo" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;background:white;">
            ${TIPI_DISPOSITIVO.map(t=>`<option value="${t.id}" ${dispositivo?.tipo===t.id?'selected':''}>${t.icon} ${t.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Marca</label>
          <input id="d-marca" class="input" value="${esc(dispositivo?.marca||'')}" placeholder="es. Rational, Unox, Ohaus..." style="width:100%;box-sizing:border-box;padding:9px 12px;">
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Modello</label>
          <input id="d-modello" class="input" value="${esc(dispositivo?.modello||'')}" placeholder="es. SCC61G" style="width:100%;box-sizing:border-box;padding:9px 12px;">
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Protocollo connessione</label>
          <select id="d-protocollo" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;background:white;">
            ${PROTOCOLLI.map(p=>`<option value="${p.id}" ${dispositivo?.protocollo===p.id?'selected':''}>${p.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Reparto / Settore</label>
          <select id="d-settore" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;background:white;">
            <option value="">— Nessuno —</option>
            ${settori.map(s=>`<option value="${s.id}" ${dispositivo?.settore_id===s.id?'selected':''}>${esc(s.nome)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">MAC Address <span style="color:#94a3b8;">(Bluetooth)</span></label>
          <input id="d-mac" class="input" value="${esc(dispositivo?.mac_address||'')}" placeholder="es. 00:1A:2B:3C:4D:5E" style="width:100%;box-sizing:border-box;padding:9px 12px;font-family:monospace;">
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">IP Address <span style="color:#94a3b8;">(Wi-Fi/LAN)</span></label>
          <input id="d-ip" class="input" value="${esc(dispositivo?.ip_address||'')}" placeholder="es. 192.168.1.100" style="width:100%;box-sizing:border-box;padding:9px 12px;font-family:monospace;">
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Potenza (Watt) <span style="color:#94a3b8;">— per costo energetico</span></label>
          <input id="d-potenza" class="input" type="number" value="${dispositivo?.potenza_w||''}" placeholder="es. 1200" style="width:100%;box-sizing:border-box;padding:9px 12px;">
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Numero di serie</label>
          <input id="d-seriale" class="input" value="${esc(dispositivo?.numero_serie||'')}" placeholder="es. SN123456" style="width:100%;box-sizing:border-box;padding:9px 12px;">
        </div>
      </div>
      <div style="margin-bottom:14px;">
        <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Note</label>
        <textarea id="d-note" class="input" rows="2" placeholder="Note tecniche, istruzioni di collegamento..." style="width:100%;box-sizing:border-box;padding:9px 12px;resize:vertical;">${esc(dispositivo?.note||'')}</textarea>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <input type="checkbox" id="d-attivo" ${!dispositivo||dispositivo.attivo?'checked':''} style="width:16px;height:16px;">
        <label for="d-attivo" style="font-size:13px;color:#374151;">Dispositivo attivo</label>
      </div>
      <div style="display:flex;gap:10px;">
        <button id="btn-salva-dispositivo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;">Salva</button>
        <button id="btn-annulla-form" style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:14px;">Annulla</button>
      </div>
    `;

    box.querySelector('#btn-annulla-form').onclick = () => { box.style.display='none'; dispositivoInEdit=null; };
    box.querySelector('#btn-salva-dispositivo').onclick = () => salvaDispositivo();
  }

  async function salvaDispositivo() {
    const nome = container.querySelector('#d-nome')?.value.trim();
    if (!nome) { mostraToast('Inserisci il nome del dispositivo','warning'); return; }
    const record = {
      azienda_id: aziendaId,
      sede_id: sedeId || null,
      nome,
      tipo: container.querySelector('#d-tipo')?.value,
      marca: container.querySelector('#d-marca')?.value.trim() || null,
      modello: container.querySelector('#d-modello')?.value.trim() || null,
      protocollo: container.querySelector('#d-protocollo')?.value || null,
      settore_id: container.querySelector('#d-settore')?.value || null,
      mac_address: container.querySelector('#d-mac')?.value.trim() || null,
      ip_address: container.querySelector('#d-ip')?.value.trim() || null,
      potenza_w: parseInt(container.querySelector('#d-potenza')?.value) || null,
      numero_serie: container.querySelector('#d-seriale')?.value.trim() || null,
      note: container.querySelector('#d-note')?.value.trim() || null,
      attivo: container.querySelector('#d-attivo')?.checked ?? true,
    };

    try {
      if (dispositivoInEdit) {
        await supa().from('dispositivi').update(record).eq('id', dispositivoInEdit.id);
        const idx = dispositivi.findIndex(d => d.id === dispositivoInEdit.id);
        if (idx >= 0) dispositivi[idx] = { ...dispositivoInEdit, ...record };
      } else {
        const { data } = await supa().from('dispositivi').insert(record).select('*').single();
        if (data) dispositivi.push(data);
      }
      container.querySelector('#form-dispositivo').style.display = 'none';
      dispositivoInEdit = null;
      renderListaDispositivi('');
      mostraToast(`Dispositivo "${nome}" salvato ✅`, 'success');
    } catch(e) { mostraToast('Errore salvataggio: ' + e.message, 'error'); }
  }

  async function eliminaDispositivo(id) {
    if (!confirm('Eliminare questo dispositivo?')) return;
    await supa().from('dispositivi').delete().eq('id', id);
    dispositivi = dispositivi.filter(d => d.id !== id);
    renderListaDispositivi('');
    mostraToast('Dispositivo eliminato','success');
  }

  // ════════════════════════════════════════
  // BLUETOOTH
  // ════════════════════════════════════════
  async function connettiBluetooth(dispositivoId) {
    const d = dispositivi.find(x => x.id === dispositivoId);
    if (!d) return;
    if (!navigator.bluetooth) { mostraToast('Bluetooth non supportato in questo browser (usa Chrome)','error'); return; }
    try {
      mostraToast('Ricerca dispositivo Bluetooth...','info');
      const filters = [];
      if (d.tipo === 'bilancia') filters.push({ services: ['weight_scale'] });
      else if (d.tipo === 'sonda_temperatura') filters.push({ services: ['health_thermometer'] });
      else filters.push({ acceptAllDevices: true });

      const device = await navigator.bluetooth.requestDevice(
        filters.length ? { filters } : { acceptAllDevices: true, optionalServices: ['battery_service'] }
      );
      mostraToast(`Connesso a ${device.name || d.nome} ✅`, 'success');
      // Salva GATT per uso futuro
      window._btDevices = window._btDevices || {};
      window._btDevices[dispositivoId] = device;
    } catch(e) {
      if (e.name !== 'NotFoundError') mostraToast('Errore Bluetooth: ' + e.message, 'error');
    }
  }

  // ════════════════════════════════════════
  // TAB ENERGIA
  // ════════════════════════════════════════
  function renderTabEnergia(box) {
    const tariffa = tariffe[0]?.tariffa_kwh_eur || 0.25;
    const dispositiviConPotenza = dispositivi.filter(d => d.potenza_w && d.attivo);

    box.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
        <!-- Tariffa corrente -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:16px;">⚡ Tariffa energia</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:6px;">€/kWh corrente</div>
          <div style="font-size:36px;font-weight:800;color:#0E5A7A;margin-bottom:16px;">€ ${tariffa.toFixed(4)}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="nuova-tariffa" type="number" step="0.001" value="${tariffa}" style="flex:1;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;">
            <button id="btn-salva-tariffa" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;">Aggiorna</button>
          </div>
        </div>

        <!-- Riepilogo dispositivi -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:16px;">🔌 Potenza installata</div>
          <div style="font-size:36px;font-weight:800;color:#f59e0b;margin-bottom:4px;">
            ${(dispositiviConPotenza.reduce((s,d)=>s+(d.potenza_w||0),0)/1000).toFixed(1)} kW
          </div>
          <div style="font-size:13px;color:#64748b;">${dispositiviConPotenza.length} dispositivi con potenza registrata</div>
        </div>
      </div>

      <!-- Calcola costo per dispositivo -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:16px;">📊 Costo per dispositivo</div>
        ${dispositiviConPotenza.length ? `
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin-bottom:8px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;padding:0 8px;">
            <div>Dispositivo</div><div>kW</div><div>€/ora</div><div>€/8h turno</div>
          </div>
          ${dispositiviConPotenza.map(d=>{
            const kw = (d.potenza_w/1000);
            const eOra = kw * tariffa;
            const eTurno = eOra * 8;
            const tipo = TIPI_DISPOSITIVO.find(t=>t.id===d.tipo);
            return `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;padding:10px 8px;background:#f8fafc;border-radius:8px;margin-bottom:4px;align-items:center;">
              <div style="font-size:13px;font-weight:500;">${tipo?.icon||''} ${esc(d.nome)}</div>
              <div style="font-size:13px;color:#374151;">${kw.toFixed(2)}</div>
              <div style="font-size:13px;color:#374151;">€ ${eOra.toFixed(3)}</div>
              <div style="font-size:13px;font-weight:600;color:#0E5A7A;">€ ${eTurno.toFixed(2)}</div>
            </div>`;
          }).join('')}
        ` : '<div style="color:#94a3b8;font-size:13px;">Nessun dispositivo con potenza registrata. Aggiungila nella scheda dispositivo.</div>'}
      </div>
    `;

    box.querySelector('#btn-salva-tariffa')?.addEventListener('click', async () => {
      const val = parseFloat(container.querySelector('#nuova-tariffa')?.value);
      if (isNaN(val) || val <= 0) { mostraToast('Inserisci una tariffa valida','warning'); return; }
      await supa().from('tariffe_energia').insert({ azienda_id:aziendaId, tariffa_kwh_eur:val });
      tariffe.unshift({ tariffa_kwh_eur: val });
      mostraToast(`Tariffa aggiornata: €${val}/kWh ✅`,'success');
      renderTab();
    });
  }

  // ════════════════════════════════════════
  // TAB LOG
  // ════════════════════════════════════════
  async function renderTabLog(box) {
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento log...</div>';
    let logs = [];
    try {
      const { data } = await supa()
        .from('dispositivo_log')
        .select('*, dispositivi(nome,tipo)')
        .eq('azienda_id', aziendaId)
        .order('created_at', {ascending:false})
        .limit(100);
      logs = data || [];
    } catch(e) {}

    if (!logs.length) { box.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:40px;">Nessun evento registrato ancora.</div>'; return; }

    const TIPO_EVENTO_COLOR = { avvio:'#16a34a', stop:'#dc2626', peso:'#0E5A7A', temperatura:'#f59e0b', allarme:'#dc2626', fine:'#64748b' };

    box.innerHTML = `
      <div style="font-size:14px;font-weight:600;color:#374151;margin-bottom:14px;">Ultimi 100 eventi</div>
      ${logs.map(l => {
        const d = l.dispositivi;
        const tipo = TIPI_DISPOSITIVO.find(t=>t.id===d?.tipo);
        const colore = TIPO_EVENTO_COLOR[l.tipo_evento] || '#64748b';
        return `<div style="display:flex;gap:12px;padding:10px 14px;background:white;border-radius:10px;margin-bottom:6px;border-left:3px solid ${colore};align-items:flex-start;">
          <div style="flex-shrink:0;font-size:11px;color:#94a3b8;min-width:140px;">${new Date(l.created_at).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;color:#0f172a;">${tipo?.icon||'🔌'} ${esc(d?.nome||'Dispositivo')}</div>
            <div style="font-size:12px;color:#374151;margin-top:2px;">
              <span style="color:${colore};font-weight:600;">${l.tipo_evento}</span>
              ${l.valore_numerico!=null ? ` · ${l.valore_numerico} ${l.valore_unita||''}` : ''}
              ${l.valore_target!=null ? ` (target: ${l.valore_target})` : ''}
              ${l.operatore_nome ? ` · ${esc(l.operatore_nome)}` : ''}
            </div>
            ${l.costo_energetico_eur ? `<div style="font-size:11px;color:#f59e0b;margin-top:2px;">⚡ Costo: €${Number(l.costo_energetico_eur).toFixed(4)}</div>` : ''}
            ${l.conforme===false ? `<div style="font-size:11px;color:#dc2626;margin-top:2px;">⚠️ Fuori parametri HACCP</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    `;
  }

  // ════════════════════════════════════════
  // RENDER TAB
  // ════════════════════════════════════════
  async function renderTab() {
    aggiornaTabs();
    const box = container.querySelector('#tab-content');
    switch(tabAttivo) {
      case 'dispositivi': renderTabDispositivi(box); break;
      case 'energia':     renderTabEnergia(box);     break;
      case 'log':         await renderTabLog(box);   break;
    }
  }

  function mostraToast(msg, tipo='info') {
    const c={success:'#16a34a',error:'#dc2626',warning:'#f59e0b',info:'#0E5A7A'};
    const t=document.createElement('div');
    t.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${c[tipo]};color:white;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);`;
    t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3000);
  }

  // ── Init ──
  await loadAll();
  renderTab();
}

function esc(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;"); }
