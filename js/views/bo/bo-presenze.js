// js/views/bo/bo-presenze.js
// Schede presenze dipendenti — filtro per periodo e dipendente
// Export CSV per consulente del lavoro

const SUPABASE_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0';

const supa = () => window.supabaseClient || window.supabase;

function esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('it-IT', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit', timeZone:'Europe/Rome'
  });
}

function fmtOre(minuti) {
  if (!minuti || minuti <= 0) return '—';
  const h = Math.floor(minuti / 60);
  const m = minuti % 60;
  return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
}

function primoGiornoMese(anno, mese) {
  return `${anno}-${String(mese).padStart(2,'0')}-01`;
}

function ultimoGiornoMese(anno, mese) {
  const d = new Date(anno, mese, 0);
  return `${anno}-${String(mese).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
  let dataInizio = primoGiornoMese(filtroAnno, filtroMese);
  let dataFine = ultimoGiornoMese(filtroAnno, filtroMese);
  let modalitaFiltro = 'mese'; // 'mese' o 'custom'

  // Carica lista dipendenti
  const { data: dipendenti } = await supa()
    .from('dipendenti')
    .select('id, nome, cognome, mansione')
    .eq('azienda_id', aziendaId)
    .eq('attivo', true)
    .order('cognome');

  container.innerHTML = `
    <div style="min-height:100vh;background:#f8fafc;padding:16px;">
      <div style="max-width:1000px;margin:0 auto;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
          <div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">📋 Presenze & Timbrature</div>
            <div style="font-size:13px;color:#64748b;">Schede per il consulente del lavoro</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="btn-export-csv" style="background:#16a34a;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">⬇️ Esporta CSV</button>
            <button id="btn-export-csv-tutti" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">⬇️ CSV tutti i dipendenti</button>
          </div>
        </div>

        <!-- Filtri -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px;">🔍 Filtri</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">

            <!-- Dipendente -->
            <div style="flex:1;min-width:180px;">
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Dipendente</label>
              <select id="filtro-dip" style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:white;box-sizing:border-box;">
                <option value="">— Tutti —</option>
                ${(dipendenti || []).map(d => `<option value="${d.id}">${esc(d.cognome)} ${esc(d.nome)}${d.mansione ? ' — ' + esc(d.mansione) : ''}</option>`).join('')}
              </select>
            </div>

            <!-- Modalità filtro -->
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Periodo</label>
              <div style="display:flex;gap:6px;">
                <button id="btn-mode-mese" style="padding:7px 14px;border-radius:8px;border:1px solid #0E5A7A;background:#0E5A7A;color:white;cursor:pointer;font-size:12px;font-weight:600;">Per mese</button>
                <button id="btn-mode-custom" style="padding:7px 14px;border-radius:8px;border:1px solid #e5e7eb;background:white;color:#374151;cursor:pointer;font-size:12px;">Personalizzato</button>
              </div>
            </div>

            <!-- Selezione mese -->
            <div id="filtro-mese-wrap" style="display:flex;gap:8px;align-items:flex-end;">
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Mese</label>
                <select id="filtro-mese" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:white;">
                  ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1===filtroMese?'selected':''}>${new Date(2000,i,1).toLocaleString('it-IT',{month:'long'})}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Anno</label>
                <select id="filtro-anno" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:white;">
                  ${[2024,2025,2026,2027].map(a=>`<option value="${a}" ${a===filtroAnno?'selected':''}>${a}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Date personalizzate -->
            <div id="filtro-custom-wrap" style="display:none;gap:8px;align-items:flex-end;">
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Dal</label>
                <input type="date" id="filtro-dal" value="${dataInizio}" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Al</label>
                <input type="date" id="filtro-al" value="${dataFine}" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
              </div>
            </div>

            <button id="btn-applica" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;align-self:flex-end;">Applica</button>
          </div>
        </div>

        <!-- Riepilogo ore -->
        <div id="riepilogo-ore" style="margin-bottom:16px;"></div>

        <!-- Tabella timbrature -->
        <div id="tabella-timbrature" style="background:white;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"></div>

      </div>
    </div>
  `;

  let timbratureCorrente = [];

  async function caricaDati() {
    const tbl = container.querySelector('#tabella-timbrature');
    const riepilogo = container.querySelector('#riepilogo-ore');
    tbl.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center;">Caricamento...</div>';
    riepilogo.innerHTML = '';

    // Calcola date in base alla modalità
    if (modalitaFiltro === 'mese') {
      filtroMese = parseInt(container.querySelector('#filtro-mese').value);
      filtroAnno = parseInt(container.querySelector('#filtro-anno').value);
      dataInizio = primoGiornoMese(filtroAnno, filtroMese);
      dataFine = ultimoGiornoMese(filtroAnno, filtroMese);
    } else {
      dataInizio = container.querySelector('#filtro-dal').value;
      dataFine = container.querySelector('#filtro-al').value;
    }

    filtroDipId = container.querySelector('#filtro-dip').value;

    // Query timbrature
    let q = supa()
      .from('timbrature')
      .select('id, dipendente_id, dip_nome, tipo, timestamp, ore_lavorate, sede_id, canale, geo_esito')
      .eq('azienda_id', aziendaId)
      .gte('timestamp', `${dataInizio}T00:00:00`)
      .lte('timestamp', `${dataFine}T23:59:59`)
      .order('timestamp', { ascending: true });

    if (filtroDipId) q = q.eq('dipendente_id', filtroDipId);

    const { data: timbrature, error } = await q.limit(5000);

    if (error) {
      tbl.innerHTML = `<div style="padding:20px;color:#dc2626;">Errore: ${error.message}</div>`;
      return;
    }

    timbratureCorrente = timbrature || [];

    if (!timbratureCorrente.length) {
      tbl.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">Nessuna timbratura nel periodo selezionato.</div>';
      return;
    }

    // Calcola riepilogo ore per dipendente
    const riepilogoMap = {};
    const turniMap = {};

    for (const t of timbratureCorrente) {
      const dipId = t.dipendente_id;
      const nome = t.dip_nome || 'N/D';
      if (!riepilogoMap[dipId]) riepilogoMap[dipId] = { nome, minutiTotali: 0, giorni: new Set(), turniCompleti: 0 };
      if (!turniMap[dipId]) turniMap[dipId] = {};

      const giorno = t.timestamp?.slice(0, 10);
      if (giorno) riepilogoMap[dipId].giorni.add(giorno);

      // Calcola ore dai turni
      if (t.tipo === 'inizio_turno') {
        turniMap[dipId][t.id] = { inizio: new Date(t.timestamp), fine: null };
      } else if (t.tipo === 'fine_turno' && t.ore_lavorate) {
        riepilogoMap[dipId].minutiTotali += Math.round(t.ore_lavorate * 60);
        riepilogoMap[dipId].turniCompleti++;
      }
    }

    // Render riepilogo
    const dipRiepilogo = Object.values(riepilogoMap).sort((a, b) => a.nome.localeCompare(b.nome));
    const periodoLabel = modalitaFiltro === 'mese'
      ? `${new Date(filtroAnno, filtroMese-1, 1).toLocaleString('it-IT',{month:'long'})} ${filtroAnno}`
      : `${dataInizio} → ${dataFine}`;

    riepilogo.innerHTML = `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px;">📊 Riepilogo ore — ${esc(periodoLabel)}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:10px;">
          ${dipRiepilogo.map(d => `
            <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
              <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px;">${esc(d.nome)}</div>
              <div style="font-size:22px;font-weight:800;color:#0E5A7A;">${fmtOre(d.minutiTotali)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">${d.giorni.size} giorni lavorati · ${d.turniCompleti} turni</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Render tabella
    tbl.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
              <th style="padding:12px 16px;text-align:left;font-weight:700;color:#374151;">Dipendente</th>
              <th style="padding:12px 16px;text-align:left;font-weight:700;color:#374151;">Data e ora</th>
              <th style="padding:12px 16px;text-align:left;font-weight:700;color:#374151;">Tipo</th>
              <th style="padding:12px 16px;text-align:left;font-weight:700;color:#374151;">Ore turno</th>
              <th style="padding:12px 16px;text-align:left;font-weight:700;color:#374151;">Canale</th>
              <th style="padding:12px 16px;text-align:left;font-weight:700;color:#374151;">GPS</th>
            </tr>
          </thead>
          <tbody>
            ${timbratureCorrente.map((t, idx) => {
              const tipoColor = t.tipo === 'inizio_turno' ? '#dcfce7' : t.tipo === 'fine_turno' ? '#fee2e2' : '#fef3c7';
              const tipoText = t.tipo === 'inizio_turno' ? '#15803d' : t.tipo === 'fine_turno' ? '#dc2626' : '#92400e';
              const tipoLabel = t.tipo === 'inizio_turno' ? '▶️ Inizio turno' : t.tipo === 'fine_turno' ? '⏹ Fine turno' : t.tipo === 'inizio_pausa' ? '⏸ Inizio pausa' : '▶️ Fine pausa';
              return `
                <tr style="border-bottom:1px solid #f1f5f9;${idx%2===0?'':'background:#fafafa'}">
                  <td style="padding:10px 16px;font-weight:600;">${esc(t.dip_nome || 'N/D')}</td>
                  <td style="padding:10px 16px;color:#374151;">${fmt(t.timestamp)}</td>
                  <td style="padding:10px 16px;">
                    <span style="background:${tipoColor};color:${tipoText};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${tipoLabel}</span>
                  </td>
                  <td style="padding:10px 16px;font-weight:600;color:#0E5A7A;">${t.ore_lavorate ? fmtOre(Math.round(t.ore_lavorate * 60)) : '—'}</td>
                  <td style="padding:10px 16px;color:#64748b;">${esc(t.canale || '—')}</td>
                  <td style="padding:10px 16px;">
                    <span style="font-size:11px;color:${t.geo_esito === 'ok' ? '#15803d' : '#94a3b8'};">
                      ${t.geo_esito === 'ok' ? '✅ Ok' : t.geo_esito || '—'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:12px 16px;font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9;">
        ${timbratureCorrente.length} timbrature nel periodo
      </div>
    `;
  }

  function generaCSV(timbrature, nomeFile) {
    const dipendentiSelezionati = filtroDipId
      ? (dipendenti || []).filter(d => d.id === filtroDipId)
      : (dipendenti || []);

    // Riepilogo per dipendente
    const riepilogoMap = {};
    for (const t of timbrature) {
      const dipId = t.dipendente_id;
      if (!riepilogoMap[dipId]) riepilogoMap[dipId] = { nome: t.dip_nome || 'N/D', minutiTotali: 0, giorni: new Set(), turniCompleti: 0 };
      const giorno = t.timestamp?.slice(0, 10);
      if (giorno) riepilogoMap[dipId].giorni.add(giorno);
      if (t.tipo === 'fine_turno' && t.ore_lavorate) {
        riepilogoMap[dipId].minutiTotali += Math.round(t.ore_lavorate * 60);
        riepilogoMap[dipId].turniCompleti++;
      }
    }

    const periodoLabel = modalitaFiltro === 'mese'
      ? `${new Date(filtroAnno, filtroMese-1, 1).toLocaleString('it-IT',{month:'long'})} ${filtroAnno}`
      : `${dataInizio} - ${dataFine}`;

    let csv = `SCHEDA PRESENZE DIPENDENTI\n`;
    csv += `Azienda;${window.state?.azienda?.nome || ''}\n`;
    csv += `Periodo;${periodoLabel}\n`;
    csv += `Estratto il;${new Date().toLocaleDateString('it-IT')}\n\n`;

    // Sezione riepilogo
    csv += `RIEPILOGO ORE\n`;
    csv += `Dipendente;Ore totali;Giorni lavorati;Turni completati\n`;
    for (const [, d] of Object.entries(riepilogoMap)) {
      const h = Math.floor(d.minutiTotali / 60);
      const m = d.minutiTotali % 60;
      csv += `${d.nome};${h}:${String(m).padStart(2,'0')};${d.giorni.size};${d.turniCompleti}\n`;
    }

    csv += `\nDETTAGLIO TIMBRATURE\n`;
    csv += `Dipendente;Data;Ora;Tipo;Ore turno;Canale;GPS\n`;

    for (const t of timbrature) {
      const dt = t.timestamp ? new Date(t.timestamp) : null;
      const data = dt ? dt.toLocaleDateString('it-IT', {timeZone:'Europe/Rome'}) : '';
      const ora = dt ? dt.toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'}) : '';
      const tipo = t.tipo === 'inizio_turno' ? 'Inizio turno' : t.tipo === 'fine_turno' ? 'Fine turno' : t.tipo === 'inizio_pausa' ? 'Inizio pausa' : 'Fine pausa';
      const ore = t.ore_lavorate ? `${Math.floor(t.ore_lavorate)}:${String(Math.round((t.ore_lavorate % 1) * 60)).padStart(2,'0')}` : '';
      csv += `${t.dip_nome || ''};${data};${ora};${tipo};${ore};${t.canale || ''};${t.geo_esito || ''}\n`;
    }

    // Download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeFile; a.click();
    URL.revokeObjectURL(url);
  }

  // Bind filtri
  container.querySelector('#btn-mode-mese').addEventListener('click', () => {
    modalitaFiltro = 'mese';
    container.querySelector('#filtro-mese-wrap').style.display = 'flex';
    container.querySelector('#filtro-custom-wrap').style.display = 'none';
    container.querySelector('#btn-mode-mese').style.background = '#0E5A7A';
    container.querySelector('#btn-mode-mese').style.color = 'white';
    container.querySelector('#btn-mode-mese').style.borderColor = '#0E5A7A';
    container.querySelector('#btn-mode-custom').style.background = 'white';
    container.querySelector('#btn-mode-custom').style.color = '#374151';
    container.querySelector('#btn-mode-custom').style.borderColor = '#e5e7eb';
  });

  container.querySelector('#btn-mode-custom').addEventListener('click', () => {
    modalitaFiltro = 'custom';
    container.querySelector('#filtro-mese-wrap').style.display = 'none';
    container.querySelector('#filtro-custom-wrap').style.display = 'flex';
    container.querySelector('#btn-mode-custom').style.background = '#0E5A7A';
    container.querySelector('#btn-mode-custom').style.color = 'white';
    container.querySelector('#btn-mode-custom').style.borderColor = '#0E5A7A';
    container.querySelector('#btn-mode-mese').style.background = 'white';
    container.querySelector('#btn-mode-mese').style.color = '#374151';
    container.querySelector('#btn-mode-mese').style.borderColor = '#e5e7eb';
  });

  container.querySelector('#btn-applica').addEventListener('click', caricaDati);

  container.querySelector('#btn-export-csv').addEventListener('click', () => {
    if (!timbratureCorrente.length) { alert('Nessun dato da esportare. Applica i filtri prima.'); return; }
    const dipNome = filtroDipId
      ? (dipendenti || []).find(d => d.id === filtroDipId)?.cognome || 'dipendente'
      : 'tutti';
    const periodo = modalitaFiltro === 'mese' ? `${filtroAnno}-${String(filtroMese).padStart(2,'0')}` : `${dataInizio}_${dataFine}`;
    generaCSV(timbratureCorrente, `presenze_${dipNome}_${periodo}.csv`);
  });

  container.querySelector('#btn-export-csv-tutti').addEventListener('click', async () => {
    // Scarica tutti i dipendenti per il periodo corrente
    const periodoInizio = modalitaFiltro === 'mese' ? primoGiornoMese(filtroAnno, filtroMese) : dataInizio;
    const periodoFine = modalitaFiltro === 'mese' ? ultimoGiornoMese(filtroAnno, filtroMese) : dataFine;

    const { data: tutti } = await supa()
      .from('timbrature')
      .select('id, dipendente_id, dip_nome, tipo, timestamp, ore_lavorate, sede_id, canale, geo_esito')
      .eq('azienda_id', aziendaId)
      .gte('timestamp', `${periodoInizio}T00:00:00`)
      .lte('timestamp', `${periodoFine}T23:59:59`)
      .order('dip_nome')
      .order('timestamp')
      .limit(10000);

    if (!tutti?.length) { alert('Nessun dato nel periodo selezionato.'); return; }

    const periodo = modalitaFiltro === 'mese' ? `${filtroAnno}-${String(filtroMese).padStart(2,'0')}` : `${periodoInizio}_${periodoFine}`;
    generaCSV(tutti, `presenze_tutti_${periodo}.csv`);
  });

  // Carica dati iniziali
  await caricaDati();
}
