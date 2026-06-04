// js/views/bo/bo-bilancio.js
// Bilancio live — conto economico in tempo reale con export PDF
import { createPageLayout, createCard } from "../utils/pageLayout.js";
const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Azienda non selezionata.</div>';
    return;
  }

  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento bilancio...</div>';

  // Anni disponibili
  const annoCorrente = new Date().getFullYear();
  let annoSelezionato = annoCorrente;
  let periodoSelezionato = 'anno'; // 'anno' | 'mese' | 'custom'
  let meseSelezionato = new Date().getMonth() + 1;

  async function caricaDati() {
    // Filtro periodo
    let dataDa, dataA;
    if (periodoSelezionato === 'anno') {
      dataDa = `${annoSelezionato}-01-01`;
      dataA  = `${annoSelezionato}-12-31`;
    } else if (periodoSelezionato === 'mese') {
      const lastDay = new Date(annoSelezionato, meseSelezionato, 0).getDate();
      dataDa = `${annoSelezionato}-${String(meseSelezionato).padStart(2,'0')}-01`;
      dataA  = `${annoSelezionato}-${String(meseSelezionato).padStart(2,'0')}-${lastDay}`;
    }

    // Carica fatture classificate
    let q = supa().from('fatture_acquisto')
      .select('id, data_documento, imponibile, iva, totale, categoria_bilancio_id, classificazione_ok, classificazione_conf, categorie_bilancio(id,nome,codice_conto,tipo,ordine)')
      .eq('azienda_id', aziendaId)
      .not('categoria_bilancio_id', 'is', null);

    if (dataDa) q = q.gte('data_documento', dataDa).lte('data_documento', dataA);

    const { data: fatture } = await q;

    // Carica anche movimenti magazzino con categoria bilancio (acquisti merci)
    let qm = supa().from('magazzino_movimenti')
      .select('id, created_at, costo, quantita, categoria_bilancio_id, categorie_bilancio(id,nome,codice_conto,tipo,ordine)')
      .eq('azienda_id', aziendaId)
      .eq('tipo_movimento', 'carico')
      .gt('costo', 0)
      .not('categoria_bilancio_id', 'is', null);

    if (dataDa) qm = qm.gte('created_at', dataDa).lte('created_at', dataA + 'T23:59:59');

    const { data: movimenti } = await qm;

    // Carica spese extra
    const { data: speseExtra } = await supa().from('spese_extra')
      .select('id, data, importo, categoria_bilancio_id, categorie_bilancio(id,nome,codice_conto,tipo,ordine)')
      .eq('azienda_id', aziendaId)
      .not('categoria_bilancio_id', 'is', null)
      .gte('data', dataDa || '2000-01-01')
      .lte('data', dataA || '2099-12-31');

    // Aggrega per categoria
    const aggregato = {}; // { categoria_id: { cat, totale, n } }

    const aggiungi = (cat, importo) => {
      if (!cat?.id) return;
      if (!aggregato[cat.id]) aggregato[cat.id] = { cat, totale: 0, n: 0 };
      aggregato[cat.id].totale += importo || 0;
      aggregato[cat.id].n++;
    };

    (fatture || []).forEach(f => aggiungi(f.categorie_bilancio, f.imponibile || f.totale || 0));
    (movimenti || []).forEach(m => aggiungi(m.categorie_bilancio, (m.quantita || 0) * (m.costo || 0)));
    (speseExtra || []).forEach(s => aggiungi(s.categorie_bilancio, s.importo || 0));

    const costi  = Object.values(aggregato).filter(a => a.cat.tipo !== 'ricavo').sort((a,b) => (a.cat.ordine||99)-(b.cat.ordine||99));
    const ricavi = Object.values(aggregato).filter(a => a.cat.tipo === 'ricavo').sort((a,b) => (a.cat.ordine||99)-(b.cat.ordine||99));

    const totCosti  = costi.reduce((s,a) => s + a.totale, 0);
    const totRicavi = ricavi.reduce((s,a) => s + a.totale, 0);
    const utile     = totRicavi - totCosti;
    const nDaConf   = (fatture||[]).filter(f => !f.classificazione_ok).length;

    return { costi, ricavi, totCosti, totRicavi, utile, nDaConf, dataDa, dataA };
  }

  function fmt(n) {
    return new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR', minimumFractionDigits:2 }).format(n || 0);
  }

  const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  async function renderBilancio() {
    container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';
    const { costi, ricavi, totCosti, totRicavi, utile, nDaConf, dataDa, dataA } = await caricaDati();

    const periodoLabel = periodoSelezionato === 'anno'
      ? `Anno ${annoSelezionato}`
      : periodoSelezionato === 'mese'
      ? `${MESI[meseSelezionato-1]} ${annoSelezionato}`
      : `${dataDa} → ${dataA}`;

    container.innerHTML = `
      <style>
        .bil-row { display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:0.5px solid #f1f5f9;font-size:14px; }
        .bil-row:hover { background:#f8fafc; }
        .bil-totale { display:flex;justify-content:space-between;align-items:center;padding:12px;font-weight:700;font-size:15px;border-top:2px solid #0f172a; }
        .bil-sezione { font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;padding:16px 12px 6px; }
        @media print {
          .no-print { display:none !important; }
          body { background:white; }
        }
      </style>

      <div style="max-width:860px;margin:0 auto;padding:20px;" id="bilancio-root">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;" class="no-print">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:linear-gradient(135deg,#0E5A7A,#1a8fb5);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">📊</div>
            <div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;">Bilancio live</div>
              <div style="font-size:13px;color:#64748b;">${window.state?.azienda?.nome || ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="btn-scarica-pdf" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">📥 Scarica PDF</button>
            <button id="btn-scarica-csv" style="background:#f1f5f9;color:#374151;border:1px solid #e5e7eb;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px;">📊 CSV</button>
          </div>
        </div>

        <!-- Filtri periodo -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:16px;" class="no-print">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <select id="sel-periodo" style="border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;">
              <option value="anno" ${periodoSelezionato==='anno'?'selected':''}>Anno intero</option>
              <option value="mese" ${periodoSelezionato==='mese'?'selected':''}>Mese</option>
            </select>
            <select id="sel-anno" style="border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;">
              ${[annoCorrente, annoCorrente-1, annoCorrente-2].map(a => `<option value="${a}" ${a===annoSelezionato?'selected':''}>${a}</option>`).join('')}
            </select>
            <select id="sel-mese" style="border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;${periodoSelezionato!=='mese'?'display:none':''}">
              ${MESI.map((m,i) => `<option value="${i+1}" ${i+1===meseSelezionato?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>

        ${nDaConf > 0 ? `
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#92400e;" class="no-print">
            ⚠️ <strong>${nDaConf} fatture</strong> con classificazione AI non ancora confermata. I dati potrebbero non essere precisi al 100%. <a href="#/acquisti" style="color:#0E5A7A;font-weight:600;">Vai agli acquisti →</a>
          </div>
        ` : ''}

        <!-- Documento bilancio stampabile -->
        <div id="documento-bilancio" style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

          <!-- Intestazione documento -->
          <div style="background:#0E5A7A;color:white;padding:20px 24px;">
            <div style="font-size:18px;font-weight:700;">SITUAZIONE ECONOMICA ${annoSelezionato}</div>
            <div style="font-size:13px;opacity:.8;margin-top:4px;">${window.state?.azienda?.nome || ''} — Periodo: ${periodoLabel}</div>
            <div style="font-size:12px;opacity:.6;margin-top:2px;">Stampato il ${new Date().toLocaleDateString('it-IT')}</div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">

            <!-- COLONNA PERDITE/COSTI -->
            <div style="border-right:1px solid #e5e7eb;">
              <div style="background:#fee2e2;padding:12px 16px;font-weight:700;font-size:13px;color:#dc2626;border-bottom:1px solid #fca5a5;">
                PERDITE (COSTI)
              </div>
              ${costi.length === 0 ? '<div style="padding:20px;color:#94a3b8;font-size:13px;">Nessun costo classificato nel periodo.</div>' : ''}
              ${costi.map(a => `
                <div class="bil-row">
                  <div>
                    <div style="color:#374151;">${a.cat.nome}</div>
                    ${a.cat.codice_conto ? `<div style="font-size:10px;color:#94a3b8;">${a.cat.codice_conto}</div>` : ''}
                  </div>
                  <div style="font-weight:600;color:#0f172a;">${fmt(a.totale)}</div>
                </div>
              `).join('')}
              <div class="bil-totale" style="background:#fef2f2;">
                <span>TOTALE COSTI</span>
                <span style="color:#dc2626;">${fmt(totCosti)}</span>
              </div>
              ${utile >= 0 ? `
                <div class="bil-totale" style="background:#f0fdf4;">
                  <span>UTILE D'ESERCIZIO</span>
                  <span style="color:#15803d;">${fmt(utile)}</span>
                </div>
              ` : ''}
            </div>

            <!-- COLONNA PROFITTI/RICAVI -->
            <div>
              <div style="background:#dcfce7;padding:12px 16px;font-weight:700;font-size:13px;color:#15803d;border-bottom:1px solid #bbf7d0;">
                PROFITTI (RICAVI)
              </div>
              ${ricavi.length === 0 ? '<div style="padding:20px;color:#94a3b8;font-size:13px;">Nessun ricavo nel periodo.</div>' : ''}
              ${ricavi.map(a => `
                <div class="bil-row">
                  <div>
                    <div style="color:#374151;">${a.cat.nome}</div>
                    ${a.cat.codice_conto ? `<div style="font-size:10px;color:#94a3b8;">${a.cat.codice_conto}</div>` : ''}
                  </div>
                  <div style="font-weight:600;color:#0f172a;">${fmt(a.totale)}</div>
                </div>
              `).join('')}
              <div class="bil-totale" style="background:#f0fdf4;">
                <span>TOTALE RICAVI</span>
                <span style="color:#15803d;">${fmt(totRicavi)}</span>
              </div>
              ${utile < 0 ? `
                <div class="bil-totale" style="background:#fef2f2;">
                  <span>PERDITA D'ESERCIZIO</span>
                  <span style="color:#dc2626;">${fmt(Math.abs(utile))}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Totale a pareggio -->
          <div style="background:#f8fafc;border-top:2px solid #e5e7eb;display:grid;grid-template-columns:1fr 1fr;gap:0;">
            <div style="padding:12px 16px;font-weight:700;font-size:14px;border-right:1px solid #e5e7eb;">
              TOTALE A PAREGGIO: <span style="color:#0E5A7A;">${fmt(totCosti + Math.max(0,utile))}</span>
            </div>
            <div style="padding:12px 16px;font-weight:700;font-size:14px;">
              TOTALE A PAREGGIO: <span style="color:#0E5A7A;">${fmt(totRicavi + Math.max(0,-utile))}</span>
            </div>
          </div>

        </div>

        <!-- KPI sintetici -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:16px;" class="no-print">
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#dc2626;">${fmt(totCosti)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Totale costi</div>
          </div>
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#15803d;">${fmt(totRicavi)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Totale ricavi</div>
          </div>
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:${utile>=0?'#15803d':'#dc2626'};">${fmt(utile)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">${utile>=0?'Utile stimato':'Perdita stimata'}</div>
          </div>
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#0E5A7A;">${totRicavi>0?Math.round((utile/totRicavi)*100):0}%</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Margine netto</div>
          </div>
        </div>

      </div>
    `;

    // ── Event listeners ──
    container.querySelector('#sel-periodo')?.addEventListener('change', function() {
      periodoSelezionato = this.value;
      container.querySelector('#sel-mese').style.display = periodoSelezionato === 'mese' ? '' : 'none';
      renderBilancio();
    });
    container.querySelector('#sel-anno')?.addEventListener('change', function() {
      annoSelezionato = parseInt(this.value);
      renderBilancio();
    });
    container.querySelector('#sel-mese')?.addEventListener('change', function() {
      meseSelezionato = parseInt(this.value);
      renderBilancio();
    });

    // ── PDF via print ──
    container.querySelector('#btn-scarica-pdf')?.addEventListener('click', () => {
      const titolo = document.title;
      document.title = `Bilancio_${window.state?.azienda?.nome || ''}_${periodoLabel}`.replace(/\s+/g,'_');
      window.print();
      document.title = titolo;
    });

    // ── CSV ──
    container.querySelector('#btn-scarica-csv')?.addEventListener('click', () => {
      const rows = [['Tipo','Categoria','Codice conto','Importo']];
      ricavi.forEach(a => rows.push(['Ricavo', a.cat.nome, a.cat.codice_conto||'', String(a.totale.toFixed(2)).replace('.',',')]));
      costi.forEach(a => rows.push(['Costo', a.cat.nome, a.cat.codice_conto||'', String(a.totale.toFixed(2)).replace('.',',')]));
      rows.push(['', 'TOTALE RICAVI', '', String(totRicavi.toFixed(2)).replace('.',',')]);
      rows.push(['', 'TOTALE COSTI', '', String(totCosti.toFixed(2)).replace('.',',')]);
      rows.push(['', utile>=0?'UTILE':'PERDITA', '', String(Math.abs(utile).toFixed(2)).replace('.',',')]);
      const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n');
      const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download=`bilancio_${periodoLabel.replace(/\s+/g,'_')}.csv`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  await renderBilancio();
}
