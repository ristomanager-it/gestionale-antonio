// js/views/bo/bo-presenze.js
// Schede presenze dipendenti — per buste paga e consulente del lavoro
// Filtri: sede, dipendente, periodo | Export: CSV, PDF, Stampa
// GPS: blocco timbratura se assente o oltre raggio sede

const supa = () => window.supabaseClient || window.supabase;

function esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtData(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Europe/Rome' });
}

function fmtOra(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Rome' });
}

function fmtOre(minuti) {
  if (!minuti || minuti <= 0) return '0h 00m';
  const h = Math.floor(minuti / 60);
  const m = minuti % 60;
  return `${h}h ${String(m).padStart(2,'0')}m`;
}

function primoGiornoMese(anno, mese) {
  return `${anno}-${String(mese).padStart(2,'0')}-01`;
}
function ultimoGiornoMese(anno, mese) {
  return `${anno}-${String(mese).padStart(2,'0')}-${String(new Date(anno, mese, 0).getDate()).padStart(2,'0')}`;
}

// Distanza in metri tra due coordinate GPS (formula Haversine)
function distanzaGps(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>';
    return;
  }

  const oggi = new Date();
  let filtroMese = oggi.getMonth() + 1;
  let filtroAnno = oggi.getFullYear();
  let filtroDipId = '';
  let filtroSedeId = window.state?.sedeAttiva?.id || '';
  let modalitaFiltro = 'mese';
  let dataInizio = primoGiornoMese(filtroAnno, filtroMese);
  let dataFine = ultimoGiornoMese(filtroAnno, filtroMese);
  let timbratureCorrente = [];
  let riepilogoCorrente = {};

  // Carica sedi con coordinate GPS
  const { data: sedi } = await supa()
    .from('sedi')
    .select('id, nome, latitudine, longitudine, raggio_geofence_m')
    .eq('azienda_id', aziendaId)
    .order('nome');

  const { data: dipendenti } = await supa()
    .from('dipendenti')
    .select('id, nome, cognome, mansione')
    .eq('azienda_id', aziendaId)
    .eq('attivo', true)
    .order('cognome');

  container.innerHTML = `
    <style>
      .pr-card { background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px; }
      .pr-btn { border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600; }
      @media(max-width:600px) {
        .pr-filtri-grid { flex-direction:column!important; }
        .pr-actions { flex-wrap:wrap; }
        .pr-table th, .pr-table td { padding:8px!important;font-size:12px!important; }
        .pr-riepilogo-grid { grid-template-columns:1fr!important; }
        .pr-hide-mobile { display:none!important; }
      }
      @media print {
        .pr-no-print { display:none!important; }
        body { background:white; }
        .pr-card { border:none;box-shadow:none; }
      }
    </style>

    <div style="min-height:100vh;background:#f8fafc;padding:12px;">
      <div style="max-width:1100px;margin:0 auto;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px;" class="pr-no-print">
          <div>
            <div style="font-size:18px;font-weight:700;color:#0f172a;">📋 Presenze & Timbrature</div>
            <div style="font-size:12px;color:#64748b;">Schede per consulente del lavoro — filtrate per sede</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;" class="pr-actions">
            <button id="btn-export-csv" class="pr-btn" style="background:#16a34a;color:white;">⬇️ CSV</button>
            <button id="btn-export-pdf" class="pr-btn" style="background:#dc2626;color:white;">📄 PDF</button>
            <button id="btn-stampa" class="pr-btn" style="background:#374151;color:white;">🖨️ Stampa</button>
            <button id="btn-cartellino" class="pr-btn" style="background:#0E5A7A;color:white;">📋 Cartellino ore</button>
          </div>
        </div>

        <!-- Filtri -->
        <div class="pr-card pr-no-print" style="margin-bottom:12px;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;" class="pr-filtri-grid">

            <!-- Sede -->
            <div style="min-width:160px;">
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Sede</label>
              <select id="filtro-sede" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:white;box-sizing:border-box;">
                <option value="">— Tutte —</option>
                ${(sedi || []).map(s => `<option value="${s.id}" ${s.id === filtroSedeId ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
              </select>
            </div>

            <!-- Dipendente -->
            <div style="flex:1;min-width:180px;">
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Dipendente</label>
              <select id="filtro-dip" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:white;box-sizing:border-box;">
                <option value="">— Tutti —</option>
                ${(dipendenti || []).map(d => `<option value="${d.id}">${esc(d.cognome)} ${esc(d.nome)}${d.mansione ? ' · ' + esc(d.mansione) : ''}</option>`).join('')}
              </select>
            </div>

            <!-- Tipo periodo -->
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Periodo</label>
              <div style="display:flex;gap:4px;">
                <button id="btn-mode-mese" class="pr-btn" style="background:#0E5A7A;color:white;font-size:12px;">Per mese</button>
                <button id="btn-mode-custom" class="pr-btn" style="background:#f1f5f9;color:#374151;font-size:12px;">Date libere</button>
              </div>
            </div>

            <!-- Mese/Anno -->
            <div id="wrap-mese" style="display:flex;gap:6px;align-items:flex-end;">
              <div>
                <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Mese</label>
                <select id="filtro-mese" style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:white;">
                  ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1===filtroMese?'selected':''}>${new Date(2000,i,1).toLocaleString('it-IT',{month:'long'})}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Anno</label>
                <select id="filtro-anno" style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:white;">
                  ${[2024,2025,2026,2027].map(a=>`<option value="${a}" ${a===filtroAnno?'selected':''}>${a}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Date personalizzate -->
            <div id="wrap-custom" style="display:none;gap:6px;align-items:flex-end;flex-wrap:wrap;">
              <div>
                <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Dal</label>
                <input type="date" id="filtro-dal" value="${dataInizio}" style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
              </div>
              <div>
                <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Al</label>
                <input type="date" id="filtro-al" value="${dataFine}" style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
              </div>
            </div>

            <button id="btn-applica" class="pr-btn" style="background:#0E5A7A;color:white;align-self:flex-end;">🔍 Applica</button>
          </div>
        </div>

        <!-- Intestazione stampa -->
        <div style="display:none;" id="print-header">
          <div style="font-size:18px;font-weight:700;margin-bottom:4px;">📋 Scheda Presenze — ${window.state?.azienda?.nome || ''}</div>
          <div id="print-periodo" style="font-size:13px;color:#64748b;margin-bottom:16px;"></div>
        </div>

        <!-- Riepilogo ore -->
        <div id="riepilogo-ore" style="margin-bottom:12px;"></div>

        <!-- Tabella dettaglio -->
        <div id="tabella-presenze" class="pr-card" style="overflow:hidden;"></div>

      </div>
    </div>
  `;

  // ── Funzione caricamento dati ──────────────────────────────
  async function caricaDati() {
    const tbl = container.querySelector('#tabella-presenze');
    const riepilogo = container.querySelector('#riepilogo-ore');
    tbl.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;">Caricamento...</div>';
    riepilogo.innerHTML = '';

    // Aggiorna date
    if (modalitaFiltro === 'mese') {
      filtroMese = parseInt(container.querySelector('#filtro-mese').value);
      filtroAnno = parseInt(container.querySelector('#filtro-anno').value);
      dataInizio = primoGiornoMese(filtroAnno, filtroMese);
      dataFine = ultimoGiornoMese(filtroAnno, filtroMese);
    } else {
      dataInizio = container.querySelector('#filtro-dal').value;
      dataFine = container.querySelector('#filtro-al').value;
    }

    filtroSedeId = container.querySelector('#filtro-sede').value;
    filtroDipId = container.querySelector('#filtro-dip').value;

    let q = supa()
      .from('timbrature')
      .select('id, dipendente_id, dip_nome, tipo, timestamp, ore_lavorate, sede_id, canale, geo_esito, geo_motivo, lat, lon, accuracy_m')
      .eq('azienda_id', aziendaId)
      .gte('timestamp', `${dataInizio}T00:00:00`)
      .lte('timestamp', `${dataFine}T23:59:59`)
      .order('dip_nome')
      .order('timestamp');

    if (filtroSedeId) q = q.eq('sede_id', filtroSedeId);
    if (filtroDipId) q = q.eq('dipendente_id', filtroDipId);

    const { data, error } = await q.limit(5000);
    if (error) { tbl.innerHTML = `<div style="padding:20px;color:#dc2626;">Errore: ${error.message}</div>`; return; }

    timbratureCorrente = data || [];

    if (!timbratureCorrente.length) {
      tbl.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">Nessuna timbratura nel periodo selezionato.</div>';
      return;
    }

    // ── Calcolo riepilogo per dipendente ──
    riepilogoCorrente = {};
    for (const t of timbratureCorrente) {
      const id = t.dipendente_id;
      if (!riepilogoCorrente[id]) {
        const dip = (dipendenti || []).find(d => d.id === id);
        riepilogoCorrente[id] = {
          nome: t.dip_nome || 'N/D',
          mansione: dip?.mansione || '',
          minutiTotali: 0,
          giorni: new Set(),
          turniCompleti: 0,
          gpsOk: 0,
          gpsKo: 0,
        };
      }
      const giorno = t.timestamp?.slice(0, 10);
      if (giorno) riepilogoCorrente[id].giorni.add(giorno);
      if (t.tipo === 'fine_turno' && t.ore_lavorate) {
        riepilogoCorrente[id].minutiTotali += Math.round(t.ore_lavorate * 60);
        riepilogoCorrente[id].turniCompleti++;
      }
      if (t.geo_esito === 'ok') riepilogoCorrente[id].gpsOk++;
      else if (t.geo_esito) riepilogoCorrente[id].gpsKo++;
    }

    // Trova sede selezionata per controllo GPS
    const sedeSelezionata = filtroSedeId ? (sedi || []).find(s => s.id === filtroSedeId) : null;

    const periodoLabel = modalitaFiltro === 'mese'
      ? `${new Date(filtroAnno, filtroMese-1, 1).toLocaleString('it-IT',{month:'long',year:'numeric'})}`
      : `${dataInizio} → ${dataFine}`;

    // Aggiorna header stampa
    container.querySelector('#print-periodo').textContent = periodoLabel;

    // ── Render riepilogo ──
    const dipList = Object.values(riepilogoCorrente).sort((a,b) => a.nome.localeCompare(b.nome));
    riepilogo.innerHTML = `
      <div class="pr-card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;">📊 Riepilogo ore — ${esc(periodoLabel)}</div>
          ${sedeSelezionata ? `<div style="font-size:12px;background:#f0f9ff;color:#0E5A7A;padding:4px 12px;border-radius:20px;font-weight:600;">📍 ${esc(sedeSelezionata.nome)} · raggio ${sedeSelezionata.raggio_geofence_m || 20}m</div>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:8px;" class="pr-riepilogo-grid">
          ${dipList.map(d => `
            <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;cursor:pointer;" data-dip-id="${Object.keys(riepilogoCorrente).find(k => riepilogoCorrente[k] === d)}" class="pr-dip-card">
              <div style="font-weight:700;font-size:13px;color:#0f172a;">${esc(d.nome)}</div>
              ${d.mansione ? `<div style="font-size:11px;color:#64748b;margin-bottom:6px;">${esc(d.mansione)}</div>` : '<div style="margin-bottom:6px;"></div>'}
              <div style="font-size:24px;font-weight:800;color:#0E5A7A;">${fmtOre(d.minutiTotali)}</div>
              <div style="font-size:11px;color:#64748b;margin-top:4px;">
                ${d.giorni.size} giorni · ${d.turniCompleti} turni
              </div>
              <div style="font-size:11px;margin-top:4px;">
                ${d.gpsOk > 0 ? `<span style="color:#15803d;">✅ GPS ok: ${d.gpsOk}</span>` : ''}
                ${d.gpsKo > 0 ? `<span style="color:#dc2626;margin-left:6px;">⚠️ Anomalie: ${d.gpsKo}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Click su card dipendente → filtra tabella
    riepilogo.querySelectorAll('.pr-dip-card').forEach(card => {
      card.addEventListener('click', () => {
        const dipId = card.dataset.dipId;
        container.querySelector('#filtro-dip').value = dipId;
        filtroDipId = dipId;
        renderTabella(timbratureCorrente.filter(t => t.dipendente_id === dipId));
        card.style.borderColor = '#0E5A7A';
        card.style.background = '#f0f9ff';
      });
    });

    renderTabella(timbratureCorrente);
  }

  // ── Render tabella ──────────────────────────────────────────
  function renderTabella(rows) {
    const tbl = container.querySelector('#tabella-presenze');
    if (!rows.length) {
      tbl.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8;">Nessuna timbratura.</div>';
      return;
    }

    const sedeSelezionata = filtroSedeId ? (sedi || []).find(s => s.id === filtroSedeId) : null;

    tbl.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;" class="pr-table">
          <thead>
            <tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
              <th style="padding:10px 14px;text-align:left;font-weight:700;color:#374151;">Dipendente</th>
              <th style="padding:10px 14px;text-align:left;font-weight:700;color:#374151;">Data</th>
              <th style="padding:10px 14px;text-align:left;font-weight:700;color:#374151;">Ora</th>
              <th style="padding:10px 14px;text-align:left;font-weight:700;color:#374151;">Tipo</th>
              <th style="padding:10px 14px;text-align:left;font-weight:700;color:#374151;">Ore turno</th>
              <th style="padding:10px 14px;text-align:left;font-weight:700;color:#374151;" class="pr-hide-mobile">GPS</th>
              <th style="padding:10px 14px;text-align:left;font-weight:700;color:#374151;" class="pr-hide-mobile">Distanza sede</th>
              <th style="padding:10px 14px;text-align:left;font-weight:700;color:#374151;" class="pr-hide-mobile">Canale</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((t, idx) => {
              const tipoLabel = { inizio_turno:'▶️ Inizio', fine_turno:'⏹ Fine', inizio_pausa:'⏸ Pausa in', fine_pausa:'▶️ Pausa out' }[t.tipo] || t.tipo;
              const tipoBg = t.tipo === 'inizio_turno' ? '#dcfce7' : t.tipo === 'fine_turno' ? '#fee2e2' : '#fef3c7';
              const tipoCol = t.tipo === 'inizio_turno' ? '#15803d' : t.tipo === 'fine_turno' ? '#dc2626' : '#92400e';

              // Calcola distanza dalla sede
              let distanzaHtml = '—';
              if (sedeSelezionata?.latitudine && sedeSelezionata?.longitudine && t.lat && t.lon) {
                const dist = Math.round(distanzaGps(t.lat, t.lon, sedeSelezionata.latitudine, sedeSelezionata.longitudine));
                const raggio = sedeSelezionata.raggio_geofence_m || 20;
                const ok = dist <= raggio;
                distanzaHtml = `<span style="color:${ok?'#15803d':'#dc2626'};font-weight:600;">${dist}m ${ok?'✅':'⚠️'}</span>`;
              }

              // GPS status
              const gpsHtml = t.geo_esito === 'ok'
                ? '<span style="color:#15803d;">✅ Ok</span>'
                : t.geo_esito
                  ? `<span style="color:#dc2626;" title="${esc(t.geo_motivo||'')}">⚠️ ${esc(t.geo_esito)}</span>`
                  : '<span style="color:#94a3b8;">—</span>';

              return `
                <tr style="border-bottom:1px solid #f1f5f9;${idx%2===0?'':'background:#fafafa'}">
                  <td style="padding:9px 14px;font-weight:600;">${esc(t.dip_nome||'N/D')}</td>
                  <td style="padding:9px 14px;color:#374151;">${fmtData(t.timestamp)}</td>
                  <td style="padding:9px 14px;font-weight:600;color:#0f172a;">${fmtOra(t.timestamp)}</td>
                  <td style="padding:9px 14px;">
                    <span style="background:${tipoBg};color:${tipoCol};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;">${tipoLabel}</span>
                  </td>
                  <td style="padding:9px 14px;font-weight:600;color:#0E5A7A;">${t.ore_lavorate ? fmtOre(Math.round(t.ore_lavorate*60)) : '—'}</td>
                  <td style="padding:9px 14px;" class="pr-hide-mobile">${gpsHtml}</td>
                  <td style="padding:9px 14px;" class="pr-hide-mobile">${distanzaHtml}</td>
                  <td style="padding:9px 14px;color:#64748b;" class="pr-hide-mobile">${esc(t.canale||'—')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:10px 14px;font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9;">
        ${rows.length} timbrature — ${Object.keys(riepilogoCorrente).length} dipendenti
      </div>
    `;
  }

  // ── Export CSV ──────────────────────────────────────────────
  function generaCSV(rows) {
    const periodoLabel = modalitaFiltro === 'mese'
      ? `${new Date(filtroAnno, filtroMese-1, 1).toLocaleString('it-IT',{month:'long',year:'numeric'})}`
      : `${dataInizio} - ${dataFine}`;

    let csv = `SCHEDA PRESENZE DIPENDENTI\n`;
    csv += `Azienda;${window.state?.azienda?.nome || ''}\n`;
    csv += `Periodo;${periodoLabel}\n`;
    csv += `Estratto il;${new Date().toLocaleDateString('it-IT')}\n\n`;

    // Riepilogo
    csv += `RIEPILOGO ORE\n`;
    csv += `Dipendente;Mansione;Ore totali;Giorni lavorati;Turni completati;GPS anomalie\n`;
    for (const d of Object.values(riepilogoCorrente).sort((a,b)=>a.nome.localeCompare(b.nome))) {
      const h = Math.floor(d.minutiTotali/60), m = d.minutiTotali%60;
      csv += `${d.nome};${d.mansione};${h}:${String(m).padStart(2,'0')};${d.giorni.size};${d.turniCompleti};${d.gpsKo}\n`;
    }

    csv += `\nDETTAGLIO TIMBRATURE\n`;
    csv += `Dipendente;Data;Ora;Tipo;Ore turno;GPS esito;Distanza sede (m);Canale\n`;

    for (const t of rows) {
      const dt = t.timestamp ? new Date(t.timestamp) : null;
      const data = dt ? dt.toLocaleDateString('it-IT',{timeZone:'Europe/Rome'}) : '';
      const ora = dt ? dt.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'}) : '';
      const tipo = {inizio_turno:'Inizio turno',fine_turno:'Fine turno',inizio_pausa:'Inizio pausa',fine_pausa:'Fine pausa'}[t.tipo] || t.tipo;
      const ore = t.ore_lavorate ? `${Math.floor(t.ore_lavorate)}:${String(Math.round((t.ore_lavorate%1)*60)).padStart(2,'0')}` : '';
      const sedeSelezionata = filtroSedeId ? (sedi||[]).find(s=>s.id===filtroSedeId) : null;
      let dist = '';
      if (sedeSelezionata?.latitudine && t.lat && t.lon) {
        dist = Math.round(distanzaGps(t.lat, t.lon, sedeSelezionata.latitudine, sedeSelezionata.longitudine));
      }
      csv += `${t.dip_nome||''};${data};${ora};${tipo};${ore};${t.geo_esito||''};${dist};${t.canale||''}\n`;
    }

    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const periodo = modalitaFiltro==='mese' ? `${filtroAnno}-${String(filtroMese).padStart(2,'0')}` : dataInizio;
    const dipNome = filtroDipId ? (dipendenti||[]).find(d=>d.id===filtroDipId)?.cognome||'dip' : 'tutti';
    a.href=url; a.download=`presenze_${dipNome}_${periodo}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Export PDF (via print CSS) ──────────────────────────────
  function generaPDF() {
    container.querySelector('#print-header').style.display = 'block';
    window.print();
    setTimeout(() => {
      container.querySelector('#print-header').style.display = 'none';
    }, 1000);
  }

  // ── Bind eventi ─────────────────────────────────────────────
  container.querySelector('#btn-mode-mese').addEventListener('click', () => {
    modalitaFiltro = 'mese';
    container.querySelector('#wrap-mese').style.display = 'flex';
    container.querySelector('#wrap-custom').style.display = 'none';
    container.querySelector('#btn-mode-mese').style.cssText = 'background:#0E5A7A;color:white;';
    container.querySelector('#btn-mode-custom').style.cssText = 'background:#f1f5f9;color:#374151;';
  });

  container.querySelector('#btn-mode-custom').addEventListener('click', () => {
    modalitaFiltro = 'custom';
    container.querySelector('#wrap-mese').style.display = 'none';
    container.querySelector('#wrap-custom').style.display = 'flex';
    container.querySelector('#btn-mode-custom').style.cssText = 'background:#0E5A7A;color:white;';
    container.querySelector('#btn-mode-mese').style.cssText = 'background:#f1f5f9;color:#374151;';
  });

  container.querySelector('#btn-applica').addEventListener('click', caricaDati);
  container.querySelector('#btn-export-csv').addEventListener('click', () => {
    if (!timbratureCorrente.length) { alert('Applica prima i filtri.'); return; }
    generaCSV(timbratureCorrente);
  });
  container.querySelector('#btn-export-pdf').addEventListener('click', generaPDF);
  container.querySelector('#btn-stampa').addEventListener('click', () => window.print());
  container.querySelector('#btn-cartellino').addEventListener('click', () => stampaCartellino());

  // ── Cartellino ore: giorno per giorno + totale mese, tutti i dipendenti ──
  function stampaCartellino() {
    if (!timbratureCorrente || !timbratureCorrente.length) {
      alert('Nessuna timbratura nel periodo selezionato.');
      return;
    }
    // aggrego per dipendente -> per giorno -> minuti totali (dai fine_turno)
    const perDip = {};
    for (const t of timbratureCorrente) {
      if (t.tipo !== 'fine_turno' || !t.ore_lavorate) continue;
      const nome = t.dip_nome || 'Senza nome';
      const dt = t.timestamp ? new Date(t.timestamp) : null;
      if (!dt) continue;
      const giorno = dt.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
      if (!perDip[nome]) perDip[nome] = {};
      perDip[nome][giorno] = (perDip[nome][giorno] || 0) + Math.round(t.ore_lavorate * 60);
    }
    const nomi = Object.keys(perDip).sort((a, b) => a.localeCompare(b));
    if (!nomi.length) { alert('Nessun turno completato nel periodo.'); return; }

    const periodoLabel = (modalitaFiltro === 'mese')
      ? new Date(filtroAnno, filtroMese - 1, 1).toLocaleString('it-IT', { month: 'long', year: 'numeric' })
      : `${dataInizio} — ${dataFine}`;
    const azienda = window.state?.azienda?.nome || '';

    const fmt = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

    let blocchi = '';
    for (const nome of nomi) {
      const giorni = Object.keys(perDip[nome]).sort((a, b) => {
        const [ga, ma, aa] = a.split('/').map(Number);
        const [gb, mb, ab] = b.split('/').map(Number);
        return new Date(aa, ma - 1, ga) - new Date(ab, mb - 1, gb);
      });
      let totMin = 0;
      const righe = giorni.map(g => {
        const min = perDip[nome][g];
        totMin += min;
        return `<tr><td>${g}</td><td style="text-align:right;">${fmt(min)}</td></tr>`;
      }).join('');
      blocchi += `
        <div class="dip">
          <h3>${nome}</h3>
          <table>
            <thead><tr><th>Giorno</th><th style="text-align:right;">Ore</th></tr></thead>
            <tbody>${righe}</tbody>
            <tfoot><tr><td>TOTALE MESE</td><td style="text-align:right;">${fmt(totMin)}</td></tr></tfoot>
          </table>
        </div>`;
    }

    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
      <title>Cartellino ore — ${periodoLabel}</title>
      <style>
        * { font-family: -apple-system, Arial, sans-serif; }
        body { margin: 24px; color: #111; }
        .head { border-bottom: 2px solid #0E5A7A; padding-bottom: 10px; margin-bottom: 20px; }
        .head h1 { margin: 0; font-size: 20px; color: #0E5A7A; }
        .head p { margin: 4px 0 0; color: #555; font-size: 13px; }
        .dip { margin-bottom: 26px; page-break-inside: avoid; }
        .dip h3 { margin: 0 0 8px; font-size: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
        thead th { background: #f1f5f9; text-align: left; }
        tfoot td { font-weight: 800; border-top: 2px solid #0E5A7A; border-bottom: none; color: #0E5A7A; }
        @media print { body { margin: 12mm; } }
      </style></head><body>
      <div class="head">
        <h1>Cartellino ore lavorate</h1>
        <p>${azienda ? azienda + ' · ' : ''}${periodoLabel} · estratto il ${new Date().toLocaleDateString('it-IT')}</p>
      </div>
      ${blocchi}
      <script>window.onload = function(){ window.print(); }<\/script>
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { alert('Consenti i popup per stampare il cartellino.'); return; }
    w.document.write(html);
    w.document.close();
  }

  // Carica dati iniziali
  await caricaDati();
}
