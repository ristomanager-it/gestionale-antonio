// js/views/bo/bo-bilancio.js
// Bilancio live — conto economico in tempo reale con export PDF
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

    // Costo del lavoro: timbrature x costo_orario (fallback su dipendenti).
    // È la quarta fonte del conto economico, mancava del tutto.
    let costoLavoro = 0;
    try {
      let qt = supa().from('timbrature')
        .select('dipendente_id, ore_lavorate, costo_orario')
        .eq('azienda_id', aziendaId)
        .eq('tipo', 'fine_turno');
      if (dataDa) qt = qt.gte('timestamp', dataDa).lte('timestamp', dataA + 'T23:59:59');
      const { data: timb } = await qt;
      if (timb?.length) {
        const { data: dips } = await supa().from('dipendenti')
          .select('id, costo_orario').eq('azienda_id', aziendaId);
        const costoDip = new Map((dips || []).map(d => [String(d.id), Number(d.costo_orario) || 0]));
        for (const r of timb) {
          const ore = Number(r.ore_lavorate) || 0;
          const co = Number(r.costo_orario) > 0
            ? Number(r.costo_orario)
            : (costoDip.get(String(r.dipendente_id)) || 0);
          costoLavoro += ore * co;
        }
      }
    } catch (e) { console.warn('Errore calcolo costo lavoro:', e); }

    // Ricavi da venduto (vendite_giornaliere / iPratico): mancavano del tutto nel
    // conto economico. Li aggancio alla categoria "Ricavi da corrispettivi" (id 32).
    let ricaviVenduto = 0;
    try {
      let qv = supa().from('vendite_giornaliere')
        .select('totale_incassato, totale_riga')
        .eq('azienda_id', aziendaId);
      if (dataDa) qv = qv.gte('data_vendita', dataDa);
      if (dataA) qv = qv.lte('data_vendita', dataA);
      const { data: vendite } = await qv;
      if (vendite?.length) {
        for (const v of vendite) {
          ricaviVenduto += Number(v.totale_incassato ?? v.totale_riga ?? 0);
        }
      }
    } catch (e) { console.warn('Errore lettura ricavi venduto:', e); }

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

    // Aggiungo il costo del lavoro sulla categoria 14 "Costo del lavoro"
    if (costoLavoro > 0) {
      const { data: catCL } = await supa().from('categorie_bilancio')
        .select('id,nome,codice_conto,tipo,ordine').eq('id', 14).maybeSingle();
      if (catCL) aggiungi(catCL, Math.round(costoLavoro * 100) / 100);
    }

    // Aggiungo il venduto sulla categoria 32 "Ricavi da corrispettivi"
    if (ricaviVenduto > 0) {
      const { data: catRic } = await supa().from('categorie_bilancio')
        .select('id,nome,codice_conto,tipo,ordine').eq('id', 32).maybeSingle();
      if (catRic) aggiungi(catRic, Math.round(ricaviVenduto * 100) / 100);
    }

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
          body { background:white !important; }
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
            <button id="btn-fascicolo-iva" style="background:#7c3aed;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">📋 Fascicolo IVA</button>
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

    // ── PDF via finestra separata ──
    // ── MODAL FASCICOLO IVA ──
    container.querySelector('#btn-fascicolo-iva')?.addEventListener('click', async () => {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;box-sizing:border-box;';
      
      modal.innerHTML = '<div style="background:white;border-radius:20px;max-width:700px;width:100%;margin:auto;"><div style="padding:20px;text-align:center;color:#64748b;">⏳ Caricamento fascicolo IVA...</div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

      try {
        const aziendaId = window.state?.azienda?.id;
        const sedeId = window.state?.sedeAttiva?.id;
        const anno = document.querySelector('#sel-anno')?.value || new Date().getFullYear();
        const mese = document.querySelector('#sel-mese')?.value;
        const periodo = document.querySelector('#sel-periodo')?.value;

        let dataInizio = `${anno}-01-01`;
        let dataFine = `${anno}-12-31`;
        if (periodo === 'mese' && mese) {
          dataInizio = `${anno}-${String(mese).padStart(2,'0')}-01`;
          const lastDay = new Date(anno, mese, 0).getDate();
          dataFine = `${anno}-${String(mese).padStart(2,'0')}-${lastDay}`;
        }

        // IVA ACQUISTI da fatture_acquisto — a livello AZIENDA
        // (le fatture di acquisto non hanno sede_id: sono aziendali)
        let qAcq = window.supabaseClient.from('fatture_acquisto')
          .select('data_documento, imponibile, iva, totale, aliquota_iva')
          .eq('azienda_id', aziendaId)
          .gte('data_documento', dataInizio)
          .lte('data_documento', dataFine)
          .order('data_documento');
        const { data: fatture } = await qAcq.limit(5000);

        // IVA VENDITE da comande_righe con iva su prodotto
        // Raggruppiamo per aliquota usando il campo iva su comande_righe
        let qVend = window.supabaseClient.from('comande_righe')
          .select('quantita, prezzo, totale, iva, prodotto_id, prodotti_vendita(iva, nome)')
          .eq('azienda_id', aziendaId)
          .gte('created_at', dataInizio + 'T00:00:00')
          .lte('created_at', dataFine + 'T23:59:59');
        if (sedeId) qVend = qVend.eq('sede_id', sedeId);
        const { data: righe } = await qVend.limit(10000);

        // IVA VENDITE anche dal venduto importato (vendite_giornaliere / iPratico):
        // l'aliquota si eredita agganciando il nome al prodotto_vendita.
        let qVendGiorn = window.supabaseClient.from('vendite_giornaliere')
          .select('nome_prodotto, nome_articolo, totale_incassato, totale_riga')
          .eq('azienda_id', aziendaId)
          .gte('data_vendita', dataInizio)
          .lte('data_vendita', dataFine);
        const { data: vendGiorn } = await qVendGiorn.limit(20000);

        // Mappa nome→iva dai prodotti_vendita (per agganciare il venduto iPratico)
        const { data: prodVend } = await window.supabaseClient.from('prodotti_vendita')
          .select('nome, iva').eq('azienda_id', aziendaId).limit(5000);
        const mapIva = new Map();
        for (const p of (prodVend || [])) {
          if (p.nome) mapIva.set(String(p.nome).trim().toLowerCase(), Number(p.iva) || 10);
        }

        // Funzione per trovare aliquota standard più vicina (4, 10, 22, 0)
        function aliquotaStandard(imponibile, totale) {
          if (!imponibile || !totale || totale <= imponibile) return 0;
          const ivaImporto = totale - imponibile;
          const percCalcolata = (ivaImporto / imponibile) * 100;
          // Trova l'aliquota standard più vicina
          const aliquote = [0, 4, 10, 22];
          return aliquote.reduce((a, b) => Math.abs(b - percCalcolata) < Math.abs(a - percCalcolata) ? b : a);
        }

        // Calcola IVA acquisti per aliquota standard
        const ivaAcqMap = {};
        let totImponibileAcq = 0, totIvaAcq = 0, totTotaleAcq = 0;
        for (const f of (fatture || [])) {
          const imp = parseFloat(f.imponibile) || 0;
          const tot = parseFloat(f.totale) || 0;
          const ivaImporto = Math.max(0, tot - imp);
          // Usa aliquota_iva se presente, altrimenti deducila
          const aliquota = f.aliquota_iva || aliquotaStandard(imp, tot);
          if (!ivaAcqMap[aliquota]) ivaAcqMap[aliquota] = { imponibile: 0, iva: 0, totale: 0 };
          ivaAcqMap[aliquota].imponibile += imp;
          ivaAcqMap[aliquota].iva += ivaImporto;
          ivaAcqMap[aliquota].totale += tot;
          totImponibileAcq += imp;
          totIvaAcq += ivaImporto;
          totTotaleAcq += tot;
        }

        // Calcola IVA vendite per aliquota
        const ivaVendMap = {};
        let totImponibileVend = 0, totIvaVend = 0, totTotaleVend = 0;
        for (const r of (righe || [])) {
          const aliquota = r.iva || r.prodotti_vendita?.iva || 10;
          if (!ivaVendMap[aliquota]) ivaVendMap[aliquota] = { imponibile: 0, iva: 0, totale: 0 };
          const totRiga = r.totale || (r.prezzo * r.quantita) || 0;
          const imponibile = totRiga / (1 + aliquota / 100);
          const ivaImporto = totRiga - imponibile;
          ivaVendMap[aliquota].imponibile += imponibile;
          ivaVendMap[aliquota].iva += ivaImporto;
          ivaVendMap[aliquota].totale += totRiga;
          totImponibileVend += imponibile;
          totIvaVend += ivaImporto;
          totTotaleVend += totRiga;
        }

        // Aggiungo il venduto importato (iPratico): aliquota per nome, default 10%
        for (const v of (vendGiorn || [])) {
          const nome = String(v.nome_prodotto || v.nome_articolo || '').trim().toLowerCase();
          const aliquota = mapIva.get(nome) ?? 10;
          if (!ivaVendMap[aliquota]) ivaVendMap[aliquota] = { imponibile: 0, iva: 0, totale: 0 };
          const totRiga = Number(v.totale_incassato ?? v.totale_riga ?? 0);
          if (!totRiga) continue;
          const imponibile = totRiga / (1 + aliquota / 100);
          const ivaImporto = totRiga - imponibile;
          ivaVendMap[aliquota].imponibile += imponibile;
          ivaVendMap[aliquota].iva += ivaImporto;
          ivaVendMap[aliquota].totale += totRiga;
          totImponibileVend += imponibile;
          totIvaVend += ivaImporto;
          totTotaleVend += totRiga;
        }
        const ivaDovuta = totIvaVend - totIvaAcq;
        const periodoLabel = periodo === 'mese' && mese
          ? `${new Date(anno, mese-1, 1).toLocaleString('it-IT',{month:'long',year:'numeric'})}`
          : `Anno ${anno}`;

        const fmt = n => `€ ${Number(n).toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

        const renderTabIva = (map, label) => {
          const rows = Object.entries(map).sort((a,b) => Number(a[0]) - Number(b[0]));
          if (!rows.length) return `<tr><td colspan="4" style="padding:10px;color:#94a3b8;text-align:center;">Nessun dato</td></tr>`;
          return rows.map(([aliq, v]) => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:9px 12px;font-weight:600;">${aliq}%</td>
              <td style="padding:9px 12px;text-align:right;">${fmt(v.imponibile)}</td>
              <td style="padding:9px 12px;text-align:right;font-weight:600;color:#dc2626;">${fmt(v.iva)}</td>
              <td style="padding:9px 12px;text-align:right;">${fmt(v.totale)}</td>
            </tr>
          `).join('');
        };

        modal.innerHTML = `
          <div style="background:white;border-radius:20px;max-width:700px;width:100%;margin:auto;">
            <div style="background:linear-gradient(135deg,#7c3aed,#9333ea);color:white;padding:20px 24px;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:18px;font-weight:700;">📋 Fascicolo IVA</div>
                <div style="font-size:13px;opacity:.85;">${periodoLabel} — ${window.state?.azienda?.nome || ''}</div>
              </div>
              <button id="btn-chiudi-iva" style="background:rgba(255,255,255,.2);border:none;color:white;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;">✕ Chiudi</button>
            </div>

            <div style="padding:20px;">

              <!-- IVA a debito (vendite) -->
              <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;">📤 IVA a debito — Vendite</div>
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
                <thead>
                  <tr style="background:#fdf4ff;border-bottom:2px solid #e9d5ff;">
                    <th style="padding:9px 12px;text-align:left;font-weight:700;color:#7c3aed;">Aliquota</th>
                    <th style="padding:9px 12px;text-align:right;font-weight:700;color:#7c3aed;">Imponibile</th>
                    <th style="padding:9px 12px;text-align:right;font-weight:700;color:#7c3aed;">IVA</th>
                    <th style="padding:9px 12px;text-align:right;font-weight:700;color:#7c3aed;">Totale</th>
                  </tr>
                </thead>
                <tbody>${renderTabIva(ivaVendMap, 'vendite')}</tbody>
                <tfoot>
                  <tr style="background:#fdf4ff;border-top:2px solid #e9d5ff;font-weight:700;">
                    <td style="padding:9px 12px;">TOTALE</td>
                    <td style="padding:9px 12px;text-align:right;">${fmt(totImponibileVend)}</td>
                    <td style="padding:9px 12px;text-align:right;color:#dc2626;">${fmt(totIvaVend)}</td>
                    <td style="padding:9px 12px;text-align:right;">${fmt(totTotaleVend)}</td>
                  </tr>
                </tfoot>
              </table>

              <!-- IVA a credito (acquisti) -->
              <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;">📥 IVA a credito — Acquisti</div>
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
                <thead>
                  <tr style="background:#f0fdf4;border-bottom:2px solid #bbf7d0;">
                    <th style="padding:9px 12px;text-align:left;font-weight:700;color:#15803d;">Aliquota</th>
                    <th style="padding:9px 12px;text-align:right;font-weight:700;color:#15803d;">Imponibile</th>
                    <th style="padding:9px 12px;text-align:right;font-weight:700;color:#15803d;">IVA</th>
                    <th style="padding:9px 12px;text-align:right;font-weight:700;color:#15803d;">Totale</th>
                  </tr>
                </thead>
                <tbody>${renderTabIva(ivaAcqMap, 'acquisti')}</tbody>
                <tfoot>
                  <tr style="background:#f0fdf4;border-top:2px solid #bbf7d0;font-weight:700;">
                    <td style="padding:9px 12px;">TOTALE</td>
                    <td style="padding:9px 12px;text-align:right;">${fmt(totImponibileAcq)}</td>
                    <td style="padding:9px 12px;text-align:right;color:#15803d;">${fmt(totIvaAcq)}</td>
                    <td style="padding:9px 12px;text-align:right;">${fmt(totTotaleAcq)}</td>
                  </tr>
                </tfoot>
              </table>

              <!-- Riepilogo IVA dovuta -->
              <div style="background:${ivaDovuta >= 0 ? '#fee2e2' : '#dcfce7'};border-radius:14px;padding:16px;text-align:center;">
                <div style="font-size:13px;color:#64748b;margin-bottom:4px;">IVA a debito − IVA a credito</div>
                <div style="font-size:28px;font-weight:800;color:${ivaDovuta >= 0 ? '#dc2626' : '#15803d'};">
                  ${ivaDovuta >= 0 ? '▲' : '▼'} ${fmt(Math.abs(ivaDovuta))}
                </div>
                <div style="font-size:13px;font-weight:600;color:${ivaDovuta >= 0 ? '#dc2626' : '#15803d'};margin-top:4px;">
                  ${ivaDovuta >= 0 ? 'IVA da versare' : 'IVA a credito'}
                </div>
              </div>

              <div style="margin-top:12px;font-size:11px;color:#94a3b8;text-align:center;">
                ⚠️ Dati indicativi — verificare sempre con il proprio commercialista.<br>
                Le vendite sono calcolate dalle comande, gli acquisti dalle fatture registrate.
              </div>

              <div style="display:flex;gap:8px;margin-top:16px;justify-content:center;">
                <button id="btn-stampa-iva" style="background:#7c3aed;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:600;">🖨️ Stampa</button>
                <button id="btn-chiudi-iva2" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;">Chiudi</button>
              </div>
            </div>
          </div>
        `;

        modal.querySelector('#btn-chiudi-iva')?.addEventListener('click', () => modal.remove());
        modal.querySelector('#btn-chiudi-iva2')?.addEventListener('click', () => modal.remove());
        modal.querySelector('#btn-stampa-iva')?.addEventListener('click', () => {
          const w = window.open('','_blank','width=800,height=600');
          w.document.write('<html><head><title>Fascicolo IVA</title><style>body{font-family:Arial,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;} th,td{padding:8px 12px;border:1px solid #e5e7eb;} th{background:#f8fafc;} </style></head><body>');
          w.document.write(modal.querySelector('div').innerHTML.replace(/<button[^>]*>.*?<\/button>/gs,''));
          w.document.write('</body></html>');
          w.document.close();
          w.print();
        });

      } catch(err) {
        modal.innerHTML = `<div style="background:white;border-radius:20px;padding:24px;max-width:400px;margin:auto;text-align:center;"><div style="color:#dc2626;">❌ Errore: ${err.message}</div><button onclick="this.closest('[style*=fixed]').remove()" style="margin-top:12px;padding:8px 16px;border:none;border-radius:8px;background:#f1f5f9;cursor:pointer;">Chiudi</button></div>`;
      }
    });

    container.querySelector('#btn-scarica-pdf')?.addEventListener('click', () => {
      const doc = container.querySelector('#documento-bilancio');
      const kpi = container.querySelector('.no-print:last-of-type');
      const aziendaNome = window.state?.azienda?.nome || '';

      const html = `<!DOCTYPE html><html lang="it"><head>
        <meta charset="UTF-8">
        <title>Bilancio_${aziendaNome}_${periodoLabel}</title>
        <style>
          * { box-sizing:border-box; margin:0; padding:0; }
          body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:white; padding:20px; color:#0f172a; }
          .bil-row { display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:0.5px solid #f1f5f9;font-size:13px; }
          .bil-totale { display:flex;justify-content:space-between;align-items:center;padding:12px;font-weight:700;font-size:14px;border-top:2px solid #0f172a; }
          @page { margin:1cm; size:A4 landscape; }
        </style>
      </head><body>
        <div style="font-size:11px;color:#64748b;margin-bottom:16px;">Situazione economica — ${aziendaNome} — ${periodoLabel} — Stampato il ${new Date().toLocaleDateString('it-IT')}</div>
        ${doc ? doc.outerHTML : ''}
      </body></html>`;

      const w = window.open('','_blank','width=1000,height=700');
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 500);
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
