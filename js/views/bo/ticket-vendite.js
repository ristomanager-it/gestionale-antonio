export async function render(container) {
  const supa = () => window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b;">Nessuna azienda selezionata.</div>`; return; }

  const fmt = n => Number(n||0).toLocaleString('it-IT');
  const fmtE = n => '€ ' + Number(n||0).toFixed(2).replace('.', ',');
  const fdt = ts => ts ? new Date(ts).toLocaleString('it-IT', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
  const colore = '#0E5A7A';

  // ── Layout ────────────────────────────────────────────────
  container.innerHTML = `
  <style>
    .tv-wrap{max-width:900px;margin:0 auto;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    .tv-title{font-size:20px;font-weight:800;color:#111827;margin:0 0 4px;}
    .tv-sub{font-size:13px;color:#64748b;margin:0 0 16px;}
    .tv-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center;}
    .tv-select{padding:8px 12px;border-radius:8px;border:1.5px solid #e5e7eb;background:white;font-size:13px;color:#374151;outline:none;cursor:pointer;}
    .tv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px;}
    @media(min-width:600px){.tv-grid{grid-template-columns:repeat(4,1fr);}}
    .tv-kpi{background:white;border-radius:14px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06);}
    .tv-kpi-val{font-size:24px;font-weight:800;color:#111827;margin-bottom:2px;}
    .tv-kpi-lab{font-size:12px;color:#64748b;font-weight:600;}
    .tv-kpi-sub{font-size:11px;color:#94a3b8;margin-top:2px;}
    .tv-card{background:white;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:12px;}
    .tv-card-title{font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;margin:0 0 14px;}
    .tv-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;}
    .tv-row:last-child{border-bottom:none;}
    .tv-badge{display:inline-block;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700;}
    .tv-table{width:100%;border-collapse:collapse;font-size:13px;}
    .tv-table th{text-align:left;padding:8px 10px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb;}
    .tv-table td{padding:10px;border-bottom:1px solid #f1f5f9;color:#374151;}
    .tv-table tr:last-child td{border-bottom:none;}
    .tv-table tr:hover td{background:#f8fafc;}
    .tv-loading{text-align:center;padding:40px;color:#94a3b8;font-size:14px;}
    .tv-empty{text-align:center;padding:30px;color:#94a3b8;font-size:13px;}
    .stato-pagato{background:#dcfce7;color:#16a34a;}
    .stato-in_attesa{background:#fef9c3;color:#854d0e;}
    .stato-annullato{background:#fee2e2;color:#dc2626;}
    .stato-rimborsato{background:#f3e8ff;color:#7e22ce;}
  </style>
  <div class="tv-wrap">
    <div style="margin-bottom:12px;">
      <div class="tv-title">🎫 Vendite Tasting</div>
      <div class="tv-sub">Report ordini, biglietti e incassi</div>
    </div>
    <div class="tv-toolbar">
      <select id="tv-evento" class="tv-select"><option value="">⏳ Caricamento eventi...</option></select>
      <select id="tv-stato" class="tv-select">
        <option value="">Tutti gli stati</option>
        <option value="pagato">Pagati</option>
        <option value="in_attesa">In attesa</option>
        <option value="annullato">Annullati</option>
        <option value="rimborsato">Rimborsati</option>
      </select>
    </div>
    <div id="tv-body"><div class="tv-loading">⏳ Seleziona un evento...</div></div>
  </div>`;

  // ── Carica eventi ─────────────────────────────────────────
  const { data: eventi } = await supa()
    .from('ticket_eventi')
    .select('id, nome, data_evento, stato')
    .eq('azienda_id', aziendaId)
    .order('data_evento', { ascending: false });

  const selEvento = document.getElementById('tv-evento');
  if (!eventi?.length) {
    selEvento.innerHTML = '<option value="">Nessun evento</option>';
    return;
  }
  selEvento.innerHTML = '<option value="">— Seleziona evento —</option>' +
    eventi.map(e => `<option value="${e.id}">${e.nome}${e.data_evento ? ' · ' + new Date(e.data_evento).toLocaleDateString('it-IT') : ''}</option>`).join('');

  selEvento.onchange = () => carica();
  document.getElementById('tv-stato').onchange = () => carica();

  async function carica() {
    const eventoId = selEvento.value;
    if (!eventoId) { document.getElementById('tv-body').innerHTML = '<div class="tv-loading">Seleziona un evento</div>'; return; }
    document.getElementById('tv-body').innerHTML = '<div class="tv-loading">⏳ Caricamento...</div>';

    const statoFiltro = document.getElementById('tv-stato').value;

    // Carica ordini
    let qOrdini = supa()
      .from('ticket_ordini')
      .select(`id, nome_acquirente, email, telefono, totale, stato, metodo_pagamento, quantita, created_at,
        ticket_categorie_prezzo(nome, tipo, prezzo)`)
      .eq('evento_id', eventoId)
      .eq('azienda_id', aziendaId)
      .order('created_at', { ascending: false });
    if (statoFiltro) qOrdini = qOrdini.eq('stato', statoFiltro);
    const { data: ordini } = await qOrdini;

    // Carica biglietti
    const { data: biglietti } = await supa()
      .from('ticket_biglietti')
      .select('id, stato, consumazioni_totali, consumazioni_usate, nome_partecipante, attivato_at, ordine_id')
      .eq('evento_id', eventoId)
      .eq('azienda_id', aziendaId);

    // Carica evento
    const { data: evento } = await supa()
      .from('ticket_eventi')
      .select('nome, data_evento, ticket_categorie_prezzo(nome, tipo, prezzo, quantita_venduta, quantita_disponibile)')
      .eq('id', eventoId)
      .single();

    renderVendite(ordini || [], biglietti || [], evento);
  }

  function renderVendite(ordini, biglietti, evento) {
    // ── KPI ──
    const pagati = ordini.filter(o => o.stato === 'pagato');
    const incasso = pagati.reduce((s, o) => s + parseFloat(o.totale || 0), 0);
    const bigliettiVenduti = pagati.reduce((s, o) => s + (o.quantita || 1), 0);
    const bigliettiEntrati = biglietti.filter(b => b.stato === 'usato').length;
    const consumazioniUsate = biglietti.reduce((s, b) => s + (b.consumazioni_usate || 0), 0);

    const kpiHtml = `
    <div class="tv-grid">
      <div class="tv-kpi">
        <div class="tv-kpi-val" style="color:#16a34a;">${fmtE(incasso)}</div>
        <div class="tv-kpi-lab">💰 Incasso totale</div>
        <div class="tv-kpi-sub">${fmt(pagati.length)} ordini pagati</div>
      </div>
      <div class="tv-kpi">
        <div class="tv-kpi-val">${fmt(bigliettiVenduti)}</div>
        <div class="tv-kpi-lab">🎫 Biglietti venduti</div>
        <div class="tv-kpi-sub">${fmt(ordini.length)} ordini totali</div>
      </div>
      <div class="tv-kpi">
        <div class="tv-kpi-val">${fmt(bigliettiEntrati)}</div>
        <div class="tv-kpi-lab">✅ Entrati</div>
        <div class="tv-kpi-sub">${bigliettiVenduti ? Math.round(bigliettiEntrati/bigliettiVenduti*100) : 0}% dei venduti</div>
      </div>
      <div class="tv-kpi">
        <div class="tv-kpi-val">${fmt(consumazioniUsate)}</div>
        <div class="tv-kpi-lab">🍸 Consumazioni usate</div>
        <div class="tv-kpi-sub">su ${fmt(biglietti.reduce((s,b)=>s+(b.consumazioni_totali||0),0))} totali</div>
      </div>
    </div>`;

    // ── Categorie ──
    const cats = evento?.ticket_categorie_prezzo || [];
    const catsHtml = cats.length ? `
    <div class="tv-card">
      <div class="tv-card-title">📊 Per categoria</div>
      ${cats.map(c => `
        <div class="tv-row">
          <div>
            <div style="font-weight:600;">${c.nome}</div>
            <div style="font-size:11px;color:#94a3b8;">${c.tipo} · ${fmtE(c.prezzo)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700;">${fmt(c.quantita_venduta || 0)} venduti</div>
            <div style="font-size:11px;color:#94a3b8;">${fmt(c.quantita_disponibile || 0)} disponibili</div>
          </div>
        </div>`).join('')}
    </div>` : '';

    // ── Metodi pagamento ──
    const metodi = {};
    pagati.forEach(o => {
      const m = o.metodo_pagamento || 'stripe';
      metodi[m] = (metodi[m] || 0) + parseFloat(o.totale || 0);
    });
    const metodiHtml = Object.keys(metodi).length ? `
    <div class="tv-card">
      <div class="tv-card-title">💳 Per metodo pagamento</div>
      ${Object.entries(metodi).map(([m, tot]) => `
        <div class="tv-row">
          <span style="font-weight:600;">${m === 'stripe' ? '💳 Stripe' : m === 'contanti' ? '💵 Contanti' : m}</span>
          <span style="font-weight:700;color:#16a34a;">${fmtE(tot)}</span>
        </div>`).join('')}
    </div>` : '';

    // ── Lista ordini ──
    const ordiniHtml = `
    <div class="tv-card">
      <div class="tv-card-title">📋 Ordini (${ordini.length})</div>
      ${ordini.length === 0 ? '<div class="tv-empty">Nessun ordine</div>' : `
      <div style="overflow-x:auto;">
        <table class="tv-table">
          <thead>
            <tr>
              <th>Acquirente</th>
              <th>Categoria</th>
              <th>Qty</th>
              <th>Totale</th>
              <th>Stato</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            ${ordini.map(o => `
            <tr>
              <td>
                <div style="font-weight:600;">${o.nome_acquirente || '—'}</div>
                <div style="font-size:11px;color:#94a3b8;">${o.telefono || o.email || ''}</div>
              </td>
              <td>${o.ticket_categorie_prezzo?.nome || '—'}</td>
              <td style="text-align:center;">${o.quantita || 1}</td>
              <td style="font-weight:700;">${fmtE(o.totale)}</td>
              <td><span class="tv-badge stato-${o.stato}">${o.stato}</span></td>
              <td style="color:#94a3b8;">${fdt(o.created_at)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;

    // ── Lista biglietti ──
    const bigliettiHtml = biglietti.length ? `
    <div class="tv-card">
      <div class="tv-card-title">🎫 Biglietti (${biglietti.length})</div>
      <div style="overflow-x:auto;">
        <table class="tv-table">
          <thead>
            <tr>
              <th>Partecipante</th>
              <th>Stato</th>
              <th>Consumazioni</th>
              <th>Entrato</th>
            </tr>
          </thead>
          <tbody>
            ${biglietti.map(b => `
            <tr>
              <td style="font-weight:600;">${b.nome_partecipante || '—'}</td>
              <td><span class="tv-badge stato-${b.stato === 'usato' ? 'pagato' : b.stato}">${b.stato}</span></td>
              <td style="text-align:center;">${b.consumazioni_usate || 0} / ${b.consumazioni_totali || 0}</td>
              <td style="color:#94a3b8;">${fdt(b.attivato_at)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : '';

    document.getElementById('tv-body').innerHTML =
      kpiHtml + catsHtml + metodiHtml + ordiniHtml + bigliettiHtml +
      `<div style="text-align:center;padding:16px;font-size:11px;color:#94a3b8;">
        ${ordini.length} ordini · ${biglietti.length} biglietti · aggiornato ora
      </div>`;
  }
}
