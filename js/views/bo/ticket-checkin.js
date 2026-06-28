export async function render(container) {
  const supa = () => window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b;">Nessuna azienda selezionata.</div>`; return; }

  const fdt = ts => ts ? new Date(ts).toLocaleString('it-IT', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
  const fmt = n => Number(n||0).toLocaleString('it-IT');

  container.innerHTML = `
  <style>
    .tc-wrap{max-width:900px;margin:0 auto;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    .tc-title{font-size:20px;font-weight:800;color:#111827;margin:0 0 4px;}
    .tc-sub{font-size:13px;color:#64748b;margin:0 0 16px;}
    .tc-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center;}
    .tc-select{padding:8px 12px;border-radius:8px;border:1.5px solid #e5e7eb;background:white;font-size:13px;color:#374151;outline:none;cursor:pointer;}
    .tc-search{flex:1;min-width:180px;padding:8px 12px;border-radius:8px;border:1.5px solid #e5e7eb;background:white;font-size:13px;color:#374151;outline:none;}
    .tc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
    @media(min-width:600px){.tc-grid{grid-template-columns:repeat(4,1fr);}}
    .tc-kpi{background:white;border-radius:12px;padding:14px;box-shadow:0 2px 12px rgba(0,0,0,.06);text-align:center;}
    .tc-kpi-val{font-size:22px;font-weight:800;color:#111827;}
    .tc-kpi-lab{font-size:11px;color:#64748b;font-weight:600;margin-top:2px;}
    .tc-card{background:white;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:12px;}
    .tc-card-title{font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;margin:0 0 14px;display:flex;align-items:center;justify-content:space-between;}
    .tc-table{width:100%;border-collapse:collapse;font-size:13px;}
    .tc-table th{text-align:left;padding:8px 10px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb;}
    .tc-table td{padding:10px;border-bottom:1px solid #f1f5f9;color:#374151;vertical-align:middle;}
    .tc-table tr:last-child td{border-bottom:none;}
    .badge{display:inline-block;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700;}
    .b-attivo{background:#dbeafe;color:#1d4ed8;}
    .b-usato{background:#dcfce7;color:#16a34a;}
    .b-annullato{background:#fee2e2;color:#dc2626;}
    .btn-checkin{padding:6px 12px;border-radius:8px;border:none;background:#0E5A7A;color:white;font-size:12px;font-weight:700;cursor:pointer;}
    .btn-checkin:hover{background:#0a4560;}
    .btn-checkin:disabled{background:#e5e7eb;color:#9ca3af;cursor:default;}
    .btn-scala-c{padding:5px 10px;border-radius:8px;border:1.5px solid #0E5A7A;background:white;color:#0E5A7A;font-size:12px;font-weight:700;cursor:pointer;}
    .cons-mini{font-size:12px;color:#64748b;}
    .tc-loading{text-align:center;padding:40px;color:#94a3b8;font-size:14px;}
    .tc-empty{text-align:center;padding:30px;color:#94a3b8;font-size:13px;}
    .pulse{animation:pulse .5s ease-in-out;}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
    .progress-bar{height:6px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin-top:4px;}
    .progress-fill{height:100%;background:#0E5A7A;border-radius:4px;transition:width .4s;}
  </style>
  <div class="tc-wrap">
    <div style="margin-bottom:12px;">
      <div class="tc-title">✅ Check-in Tasting</div>
      <div class="tc-sub">Gestione ingressi e consumazioni dall'ufficio</div>
    </div>
    <div class="tc-toolbar">
      <select id="tc-evento" class="tc-select"><option value="">⏳ Caricamento eventi...</option></select>
      <select id="tc-slot" class="tc-select"><option value="">Tutti gli slot</option></select>
      <select id="tc-stato" class="tc-select">
        <option value="">Tutti</option>
        <option value="attivo">Da fare check-in</option>
        <option value="usato">Già entrati</option>
        <option value="annullato">Annullati</option>
      </select>
      <input id="tc-search" class="tc-search" type="text" placeholder="🔍 Cerca nome...">
    </div>
    <div id="tc-body"><div class="tc-loading">Seleziona un evento per iniziare</div></div>
  </div>`;

  // ── Carica eventi ─────────────────────────────────────────
  const { data: eventi } = await supa()
    .from('ticket_eventi')
    .select('id, nome, data_evento')
    .eq('azienda_id', aziendaId)
    .order('data_evento', { ascending: false });

  const selEvento = document.getElementById('tc-evento');
  if (!eventi?.length) { selEvento.innerHTML = '<option value="">Nessun evento</option>'; return; }

  selEvento.innerHTML = '<option value="">— Seleziona evento —</option>' +
    eventi.map(e => `<option value="${e.id}">${e.nome}${e.data_evento ? ' · ' + new Date(e.data_evento).toLocaleDateString('it-IT') : ''}</option>`).join('');

  selEvento.onchange = async () => {
    await caricaSlots();
    carica();
  };
  document.getElementById('tc-slot').onchange = () => carica();
  document.getElementById('tc-stato').onchange = () => carica();
  document.getElementById('tc-search').oninput = () => filtra();

  let _biglietti = [];

  async function caricaSlots() {
    const eventoId = selEvento.value;
    const selSlot = document.getElementById('tc-slot');
    selSlot.innerHTML = '<option value="">Tutti gli slot</option>';
    if (!eventoId) return;
    const { data: slots } = await supa()
      .from('ticket_slot')
      .select('id, data, ora_inizio, ora_fine')
      .eq('evento_id', eventoId)
      .order('data').order('ora_inizio');
    if (slots?.length) {
      selSlot.innerHTML += slots.map(s =>
        `<option value="${s.id}">${s.data ? new Date(s.data+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'}) : ''} ${s.ora_inizio?.slice(0,5) || ''} – ${s.ora_fine?.slice(0,5) || ''}</option>`
      ).join('');
    }
  }

  async function carica() {
    const eventoId = selEvento.value;
    if (!eventoId) return;
    document.getElementById('tc-body').innerHTML = '<div class="tc-loading">⏳ Caricamento...</div>';

    const slotId = document.getElementById('tc-slot').value;
    const statoFiltro = document.getElementById('tc-stato').value;

    let q = supa()
      .from('ticket_biglietti')
      .select(`id, stato, nome_partecipante, consumazioni_totali, consumazioni_usate, attivato_at, slot_id,
        ticket_ordini(nome_acquirente, telefono, email, totale, metodo_pagamento),
        ticket_categorie_prezzo(nome, tipo)`)
      .eq('evento_id', eventoId)
      .eq('azienda_id', aziendaId)
      .order('created_at', { ascending: false });

    if (slotId) q = q.eq('slot_id', slotId);
    if (statoFiltro) q = q.eq('stato', statoFiltro);

    const { data } = await q;
    _biglietti = data || [];
    renderTabella(_biglietti);
  }

  function filtra() {
    const q = document.getElementById('tc-search').value.toLowerCase().trim();
    if (!q) { renderTabella(_biglietti); return; }
    renderTabella(_biglietti.filter(b =>
      (b.nome_partecipante || '').toLowerCase().includes(q) ||
      (b.ticket_ordini?.nome_acquirente || '').toLowerCase().includes(q) ||
      (b.ticket_ordini?.telefono || '').includes(q)
    ));
  }

  function renderTabella(lista) {
    const totale = lista.length;
    const entrati = lista.filter(b => b.stato === 'usato').length;
    const daFare = lista.filter(b => b.stato === 'attivo' || b.stato === 'pagato').length;
    const annullati = lista.filter(b => b.stato === 'annullato').length;
    const pctEntrati = totale ? Math.round(entrati/totale*100) : 0;

    const kpiHtml = `
    <div class="tc-grid">
      <div class="tc-kpi">
        <div class="tc-kpi-val">${fmt(totale)}</div>
        <div class="tc-kpi-lab">Biglietti totali</div>
      </div>
      <div class="tc-kpi">
        <div class="tc-kpi-val" style="color:#16a34a;">${fmt(entrati)}</div>
        <div class="tc-kpi-lab">✅ Entrati</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pctEntrati}%;background:#16a34a;"></div></div>
      </div>
      <div class="tc-kpi">
        <div class="tc-kpi-val" style="color:#d97706;">${fmt(daFare)}</div>
        <div class="tc-kpi-lab">⏳ Da fare</div>
      </div>
      <div class="tc-kpi">
        <div class="tc-kpi-val" style="color:#dc2626;">${fmt(annullati)}</div>
        <div class="tc-kpi-lab">❌ Annullati</div>
      </div>
    </div>`;

    if (!lista.length) {
      document.getElementById('tc-body').innerHTML = kpiHtml + '<div class="tc-card"><div class="tc-empty">Nessun biglietto trovato</div></div>';
      return;
    }

    const righe = lista.map(b => {
      const isConsumazione = b.ticket_categorie_prezzo?.tipo === 'consumazione';
      const usate = b.consumazioni_usate || 0;
      const tot = b.consumazioni_totali || 0;
      const rim = Math.max(0, tot - usate);
      const ordine = b.ticket_ordini;
      const statoClass = b.stato === 'usato' ? 'b-usato' : b.stato === 'annullato' ? 'b-annullato' : 'b-attivo';
      const puoEntrare = b.stato === 'attivo' || b.stato === 'pagato';

      return `<tr id="row-${b.id}">
        <td>
          <div style="font-weight:700;">${b.nome_partecipante || ordine?.nome_acquirente || '—'}</div>
          <div style="font-size:11px;color:#94a3b8;">${ordine?.telefono || ordine?.email || ''}</div>
        </td>
        <td>
          <div style="font-weight:600;">${b.ticket_categorie_prezzo?.nome || '—'}</div>
          <div style="font-size:11px;color:#94a3b8;">${b.ticket_categorie_prezzo?.tipo || ''}</div>
        </td>
        <td><span class="badge ${statoClass}">${b.stato}</span></td>
        <td style="color:#94a3b8;font-size:12px;">${fdt(b.attivato_at)}</td>
        <td>
          ${isConsumazione ? `
            <div class="cons-mini" id="cons-${b.id}">${rim} / ${tot} rimaste</div>
            ${rim > 0 && b.stato === 'usato' ? `<button class="btn-scala-c" onclick="scalaC('${b.id}',${usate},${tot})">🍸 Scala</button>` : ''}
          ` : ''}
        </td>
        <td>
          ${puoEntrare
            ? `<button class="btn-checkin" onclick="doCheckin('${b.id}')">✅ Check-in</button>`
            : b.stato === 'usato'
              ? `<span style="font-size:12px;color:#16a34a;font-weight:600;">✓ Entrato</span>`
              : `<span style="font-size:12px;color:#dc2626;">✗</span>`}
        </td>
      </tr>`;
    }).join('');

    document.getElementById('tc-body').innerHTML = kpiHtml + `
    <div class="tc-card">
      <div class="tc-card-title">
        <span>Lista biglietti</span>
        <span style="font-size:12px;color:#94a3b8;font-weight:400;">${lista.length} risultati</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="tc-table">
          <thead>
            <tr>
              <th>Partecipante</th>
              <th>Categoria</th>
              <th>Stato</th>
              <th>Entrato</th>
              <th>Consumazioni</th>
              <th>Azione</th>
            </tr>
          </thead>
          <tbody>${righe}</tbody>
        </table>
      </div>
    </div>`;
  }

  // ── Check-in manuale ──────────────────────────────────────
  window.doCheckin = async function(id) {
    const btn = document.querySelector(`#row-${id} .btn-checkin`);
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    const { error } = await supa()
      .from('ticket_biglietti')
      .update({ stato: 'usato', attivato_at: new Date().toISOString() })
      .eq('id', id);

    if (error) { alert('Errore: ' + error.message); if(btn){btn.disabled=false;btn.textContent='✅ Check-in';} return; }

    // Aggiorna riga in-place
    const row = document.getElementById('row-' + id);
    if (row) {
      row.classList.add('pulse');
      const badgeCell = row.cells[2];
      if (badgeCell) badgeCell.innerHTML = '<span class="badge b-usato">usato</span>';
      const dtCell = row.cells[3];
      if (dtCell) dtCell.textContent = fdt(new Date().toISOString());
      const azioneCell = row.cells[5];
      if (azioneCell) azioneCell.innerHTML = '<span style="font-size:12px;color:#16a34a;font-weight:600;">✓ Entrato</span>';
      // Aggiorna KPI
      const b = _biglietti.find(b => b.id === id);
      if (b) { b.stato = 'usato'; b.attivato_at = new Date().toISOString(); }
    }
  };

  // ── Scala consumazione ────────────────────────────────────
  window.scalaC = async function(id, usate, tot) {
    const nuove = usate + 1;
    await supa().from('ticket_biglietti').update({ consumazioni_usate: nuove }).eq('id', id);
    const rim = Math.max(0, tot - nuove);
    const el = document.getElementById('cons-' + id);
    if (el) el.textContent = rim + ' / ' + tot + ' rimaste';
    const row = document.getElementById('row-' + id);
    if (row) {
      const btn = row.querySelector('.btn-scala-c');
      if (btn) {
        if (rim <= 0) btn.remove();
        else btn.onclick = () => window.scalaC(id, nuove, tot);
      }
    }
    const b = _biglietti.find(b => b.id === id);
    if (b) b.consumazioni_usate = nuove;
  };
}
