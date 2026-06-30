// home-agente.js — Home dedicata agli agenti vendita Ristoflow
// Agenda · I miei lead · Portafoglio · Mansionario · Materiali

// ── PORTAFOGLIO AGENTE ──────────────────────────────────────────────────────
const AG_RICORRENTE_PERCENT = 5;

const AG_PIANI_VALORE_ANNUO = {
  starter: 828,
  business: 1428,
  pro: 2028,
  hotel: 1188,
  full: 2388,
};

const AG_PIANI_VARIABILE_DEFAULT = {
  starter: 83,
  business: 143,
  pro: 203,
  hotel: 119,
  full: 239,
};

const AG_BONUS_FATTURATO_SOGLIE = [
  { soglia: 50000, bonus: 1500 },
  { soglia: 35000, bonus: 1000 },
  { soglia: 20000, bonus: 500 },
  { soglia: 10000, bonus: 200 },
];

function agEuro(v) {
  return `€${Math.round(Number(v || 0)).toLocaleString('it-IT')}`;
}

function agNormalizzaPiano(piano) {
  return String(piano || '').toLowerCase().trim();
}

function agValoreAnnuoLead(l) {
  const piano = agNormalizzaPiano(l?.piano);
  const valoreContratto = Number(l?.valore_contratto || l?.fatturato_annuo || l?.valore_annuo || 0);
  return valoreContratto > 0 ? valoreContratto : (AG_PIANI_VALORE_ANNUO[piano] || AG_PIANI_VALORE_ANNUO.business);
}

function agMrrLead(l) {
  return agValoreAnnuoLead(l) / 12;
}

function agBonusFatturato(fatturatoAnnuoVenduto) {
  const valore = Number(fatturatoAnnuoVenduto || 0);
  const soglia = AG_BONUS_FATTURATO_SOGLIE.find(s => valore >= s.soglia);
  return soglia ? soglia.bonus : 0;
}

function agBaseProvvigione(l, agente) {
  const salvata = Number(l?.provvigione_calcolata || 0);
  if (salvata > 0) return salvata;

  const piano = agNormalizzaPiano(l?.piano);
  const valoreAnnuo = agValoreAnnuoLead(l);

  if (agente?.tipo === 'segnalatore') {
    const perc = Number(agente?.perc_segnalatore || 10);
    return valoreAnnuo * perc / 100;
  }

  const varKey = piano === 'starter' || piano === 'hotel' ? 'var_starter' : piano === 'business' ? 'var_business' : piano === 'full' ? 'var_full' : 'var_pro';
  const variabile = Number(agente?.[varKey] || AG_PIANI_VARIABILE_DEFAULT[piano] || AG_PIANI_VARIABILE_DEFAULT.business);
  return variabile;
}

function agGuadagnoAContratto(l, agente) {
  if (!l || l.stato === 'perso') return 0;
  return agBaseProvvigione(l, agente);
}

function agRicorrenteAnnualeLead(l, agente) {
  if (!l || agente?.tipo === 'segnalatore') return 0;
  return agValoreAnnuoLead(l) * AG_RICORRENTE_PERCENT / 100;
}

function agPianoRowsGuadagni(agente) {
  return Object.entries(AG_PIANI_VALORE_ANNUO).map(([piano, valore]) => {
    const lead = { piano, valore_annuo: valore };
    return {
      piano,
      label: piano.charAt(0).toUpperCase() + piano.slice(1),
      valore,
      subito: agBaseProvvigione(lead, agente),
      ricorrente: agRicorrenteAnnualeLead(lead, agente),
    };
  });
}

export async function render(container) {
  const supa = window.supabaseClient || window.supabase;
  const userId = window.state?.user?.id;
  const userEmail = window.state?.user?.email;

  container.innerHTML = `<div style="padding:30px;text-align:center;color:#94a3b8;">Caricamento...</div>`;

  // Trova l'agente collegato a questo utente
  let { data: agente } = await supa.from('agenti').select('*').eq('user_id', userId).maybeSingle();
  if (!agente && userEmail) {
    const r2 = await supa.from('agenti').select('*').eq('email', userEmail).maybeSingle();
    agente = r2.data;
  }

  if (!agente) {
    container.innerHTML = `
      <div style="max-width:480px;margin:60px auto;text-align:center;padding:30px;background:white;border-radius:16px;border:1px solid #e5e7eb;">
        <div style="font-size:40px;margin-bottom:12px;">🤝</div>
        <div style="font-size:16px;font-weight:700;color:#374151;margin-bottom:8px;">Profilo agente non trovato</div>
        <div style="font-size:13px;color:#64748b;">Il tuo utente non risulta collegato a nessun profilo agente. Contatta l'amministratore per essere associato.</div>
      </div>`;
    return;
  }

  const oggi = new Date().toISOString().split('T')[0];
  const meseCorrente = oggi.substring(0,7);

  const [{ data: appuntamenti }, { data: leads }] = await Promise.all([
    supa.from('agenti_appuntamenti').select('*').eq('agente_id', agente.id).order('data').order('ora'),
    supa.from('agenti_lead').select('*').eq('agente_id', agente.id).order('created_at', { ascending: false }),
  ]);

  const _appList = appuntamenti || [];
  const _leadList = leads || [];

  // KPI mese
  const leadMese = _leadList.filter(l => l.created_at?.substring(0,7) === meseCorrente);
  const paganti = _leadList.filter(l => l.stato === 'pagante');
  const paganteMese = paganti.filter(l => l.data_conversione?.substring(0,7) === meseCorrente);
  const provDaPagare = _leadList.filter(l => l.stato==='pagante' && !l.provvigione_pagata)
    .reduce((s,l)=>s+parseFloat(l.provvigione_calcolata||0),0);
  const provPagate = _leadList.filter(l => l.provvigione_pagata)
    .reduce((s,l)=>s+parseFloat(l.provvigione_calcolata||0),0);
  const leadAperti = _leadList.filter(l => !['pagante','perso'].includes(l.stato || ''));
  const guadagnoContrattiAperti = leadAperti.reduce((s,l)=>s+agGuadagnoAContratto(l, agente),0);
  const valoreContrattiAperti = leadAperti.reduce((s,l)=>s+agValoreAnnuoLead(l),0);
  const fatturatoVendutoMese = paganteMese.reduce((s,l)=>s+agValoreAnnuoLead(l),0);
  const fatturatoVendutoTotale = paganti.reduce((s,l)=>s+agValoreAnnuoLead(l),0);
  const mrrGeneratoMese = fatturatoVendutoMese / 12;
  const arrGeneratoTotale = fatturatoVendutoTotale;
  const renditaAnnuale = paganti.reduce((s,l)=>s+agRicorrenteAnnualeLead(l, agente),0);
  const bonusMaturato = agBonusFatturato(fatturatoVendutoMese);
  const targetFatturato = Number(agente.target_fatturato_mensile || agente.target_fatturato || 10000);
  const pctTarget = targetFatturato > 0 ? Math.min(100, Math.round(fatturatoVendutoMese / targetFatturato * 100)) : 0;

  const appOggi = _appList.filter(a => a.data === oggi && a.stato === 'programmato');
  const appDomani = _appList.filter(a => a.data === new Date(Date.now()+86400000).toISOString().split('T')[0] && a.stato === 'programmato');
  const appProssimi = _appList.filter(a => a.data > oggi && a.stato === 'programmato').slice(0,10);

  container.innerHTML = `
  <style>
    .ag-wrap{max-width:920px;margin:0 auto;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    .ag-hero{background:linear-gradient(135deg,#7C3AED,#9333ea);border-radius:18px;padding:22px 26px;color:white;margin-bottom:16px;}
    .ag-hero h1{font-size:20px;font-weight:800;margin-bottom:4px;}
    .ag-hero p{font-size:13px;opacity:.85;}
    .ag-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-top:14px;}
    .ag-kpi-box{background:rgba(255,255,255,.18);border-radius:10px;padding:10px;text-align:center;}
    .ag-kpi-val{font-size:20px;font-weight:800;}
    .ag-kpi-lbl{font-size:10px;opacity:.85;margin-top:2px;}
    .ag-tabs{display:flex;gap:4px;background:#f1f5f9;border-radius:10px;padding:3px;margin-bottom:14px;overflow-x:auto;}
    .ag-tab{padding:8px 14px;border-radius:8px;border:none;background:transparent;color:#64748b;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;}
    .ag-tab.active{background:white;color:#7C3AED;font-weight:700;}
    .ag-card{background:white;border-radius:12px;border:1px solid #e5e7eb;padding:14px 16px;margin-bottom:10px;}
    .ag-btn{border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;}
  </style>

  <div class="ag-wrap">
    <div class="ag-hero">
      <h1>👋 Ciao ${agente.nome}!</h1>
      <p>${agente.tipo === 'segnalatore' ? 'Segnalatore' : agente.tipo === 'area_manager' ? 'Area Manager' : 'Agente'} · ${(agente.zona||[]).join(', ') || 'Zona non assegnata'}</p>
      <div class="ag-kpi-row">
        <div class="ag-kpi-box"><div class="ag-kpi-val">${appOggi.length}</div><div class="ag-kpi-lbl">Appuntamenti oggi</div></div>
        <div class="ag-kpi-box"><div class="ag-kpi-val">${agEuro(fatturatoVendutoMese)}</div><div class="ag-kpi-lbl">Fatturato venduto mese</div></div>
        <div class="ag-kpi-box"><div class="ag-kpi-val">${agEuro(targetFatturato)}</div><div class="ag-kpi-lbl">Obiettivo fatturato</div></div>
        <div class="ag-kpi-box"><div class="ag-kpi-val">${agEuro(mrrGeneratoMese)}</div><div class="ag-kpi-lbl">MRR generato</div></div>
        <div class="ag-kpi-box"><div class="ag-kpi-val">${agEuro(bonusMaturato)}</div><div class="ag-kpi-lbl">Bonus fatturato</div></div>
        <div class="ag-kpi-box"><div class="ag-kpi-val">${agEuro(renditaAnnuale)}</div><div class="ag-kpi-lbl">Rendita annuale</div></div>
      </div>
      <div style="margin-top:10px;background:rgba(255,255,255,.2);border-radius:20px;height:8px;">
        <div style="height:100%;border-radius:20px;background:white;width:${pctTarget}%;transition:width .4s;"></div>
      </div>
      <div style="font-size:11px;opacity:.8;margin-top:4px;">${pctTarget}% dell'obiettivo fatturato raggiunto</div>
    </div>

    <div class="ag-card" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px;">
      <div>
        <div style="font-size:11px;color:#64748b;font-weight:700;">ARR venduto totale</div>
        <div style="font-size:20px;font-weight:800;color:#0E5A7A;margin-top:3px;">${agEuro(arrGeneratoTotale)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#64748b;font-weight:700;">Contratti aperti</div>
        <div style="font-size:20px;font-weight:800;color:#d97706;margin-top:3px;">${agEuro(valoreContrattiAperti)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#64748b;font-weight:700;">Provvigioni maturate</div>
        <div style="font-size:20px;font-weight:800;color:#059669;margin-top:3px;">${agEuro(provDaPagare + provPagate)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#64748b;font-weight:700;">Clienti chiusi</div>
        <div style="font-size:20px;font-weight:800;color:#7C3AED;margin-top:3px;">${paganti.length}</div>
      </div>
    </div>

    <div class="ag-tabs">
      <button class="ag-tab active" id="agt-agenda" onclick="agSwitchTab('agenda')">📅 Agenda</button>
      <button class="ag-tab" id="agt-lead" onclick="agSwitchTab('lead')">🎯 I miei lead</button>
      <button class="ag-tab" id="agt-provv" onclick="agSwitchTab('provv')">💼 Portafoglio</button>
      <button class="ag-tab" id="agt-mansionario" onclick="agSwitchTab('mansionario')">📖 Mansionario</button>
      <button class="ag-tab" id="agt-materiali" onclick="agSwitchTab('materiali')">📦 Materiali</button>
    </div>

    <div id="ag-content"></div>

    <!-- Modale nuovo appuntamento -->
    <div id="ag-app-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;padding:16px;">
      <div style="background:white;border-radius:16px;width:100%;max-width:480px;padding:22px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:15px;font-weight:800;" id="ag-app-title">Nuovo appuntamento</div>
          <button onclick="agChiudiModaleApp()" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 9px;cursor:pointer;">✕</button>
        </div>
        <div id="ag-app-body"></div>
      </div>
    </div>

    <!-- Modale quick lead -->
    <div id="ag-lead-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;padding:16px;">
      <div style="background:white;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:22px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:15px;font-weight:800;">📋 Registra visita appena fatta</div>
          <button onclick="agChiudiModaleLead()" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 9px;cursor:pointer;">✕</button>
        </div>
        <div id="ag-lead-body"></div>
      </div>
    </div>
  </div>`;

  // ── STATE ──
  window._agAgente = agente;
  window._agAppList = _appList;
  window._agLeadList = _leadList;
  window._agSupa = supa;
  window._agEditAppId = null;

  window.agSwitchTab = function(tab) {
    ['agenda','lead','provv','mansionario','materiali'].forEach(t => {
      document.getElementById(`agt-${t==='mansionario'?'mansionario':t==='materiali'?'materiali':t}`)?.classList.toggle('active', t===tab);
    });
    const cont = document.getElementById('ag-content');
    if (tab === 'agenda') renderAgAgenda(cont);
    if (tab === 'lead') renderAgLead(cont);
    if (tab === 'provv') renderAgProvvigioni(cont);
    if (tab === 'mansionario') renderAgMansionario(cont);
    if (tab === 'materiali') renderAgMateriali(cont);
  };

  function renderAgAgenda(el) {
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:#374151;">I tuoi prossimi appuntamenti</div>
        <button class="ag-btn" style="background:#7C3AED;color:white;" onclick="agApriModaleApp()">+ Nuovo appuntamento</button>
      </div>

      ${appOggi.length ? `
        <div class="ag-card" style="border-left:4px solid #DC2626;">
          <div style="font-size:11px;font-weight:700;color:#DC2626;text-transform:uppercase;margin-bottom:8px;">🔴 OGGI</div>
          ${appOggi.map(a => agAppRow(a)).join('')}
        </div>` : ''}

      ${appDomani.length ? `
        <div class="ag-card" style="border-left:4px solid #d97706;">
          <div style="font-size:11px;font-weight:700;color:#d97706;text-transform:uppercase;margin-bottom:8px;">🟡 DOMANI</div>
          ${appDomani.map(a => agAppRow(a)).join('')}
        </div>` : ''}

      <div class="ag-card">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">📅 Prossimi</div>
        ${appProssimi.length ? appProssimi.map(a => agAppRow(a)).join('') : '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">Nessun appuntamento programmato</div>'}
      </div>

      <div style="text-align:center;margin-top:16px;">
        <button class="ag-btn" style="background:#059669;color:white;padding:10px 20px;" onclick="agApriModaleLead()">📋 Registra una visita appena fatta</button>
      </div>`;
  }

  function agAppRow(a) {
    const tipoIcon = { visita:'🚪', follow_up:'💬', demo:'💻', chiamata:'📞' }[a.tipo] || '📌';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:13px;font-weight:700;color:#111827;">${tipoIcon} ${escAg(a.titolo)}</div>
          <div style="font-size:11px;color:#64748b;">${a.nome_locale ? escAg(a.nome_locale)+' · ' : ''}${a.data} ${a.ora?'· '+a.ora.substring(0,5):''}</div>
        </div>
        <div style="display:flex;gap:6px;">
          ${a.telefono ? `<a href="https://wa.me/39${a.telefono.replace(/\\D/g,'')}" target="_blank" style="background:#25d366;color:white;border-radius:6px;padding:4px 8px;font-size:11px;text-decoration:none;">💬</a>` : ''}
          <button onclick="agSegnaAppFatto('${a.id}')" style="background:#d1fae5;color:#059669;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">✓ Fatto</button>
          <button onclick="agApriModaleApp('${a.id}')" style="background:#f1f5f9;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">✏️</button>
        </div>
      </div>`;
  }

  function renderAgLead(el) {
    const list = window._agLeadList;
    el.innerHTML = `
      <div class="ag-card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:14px;">
          ${[
            ['Totali', list.length, '#374151'],
            ['Segnalati', list.filter(l=>l.stato==='segnalato').length, '#64748b'],
            ['Trial', list.filter(l=>l.stato==='trial').length, '#7C3AED'],
            ['Paganti', list.filter(l=>l.stato==='pagante').length, '#059669'],
            ['Persi', list.filter(l=>l.stato==='perso').length, '#DC2626'],
          ].map(([l,v,c]) => `<div style="text-align:center;background:#f8fafc;border-radius:8px;padding:8px;"><div style="font-size:18px;font-weight:800;color:${c};">${v}</div><div style="font-size:10px;color:#64748b;">${l}</div></div>`).join('')}
        </div>
        ${list.length ? list.map(l => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:#f8fafc;border-radius:8px;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-size:13px;font-weight:700;">${escAg(l.nome_locale)}</div>
              <div style="font-size:11px;color:#64748b;">${l.piano||'—'} · ${new Date(l.created_at).toLocaleDateString('it-IT')}</div>
            </div>
            <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:${l.stato==='pagante'?'#d1fae5':l.stato==='perso'?'#fee2e2':'#f1f5f9'};color:${l.stato==='pagante'?'#059669':l.stato==='perso'?'#DC2626':'#64748b'};">${l.stato}</span>
          </div>`).join('') : '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:20px;">Nessun lead ancora. Registra la tua prima visita!</div>'}
      </div>`;
  }

  function renderAgProvvigioni(el) {
    const list = window._agLeadList || [];
    const agente = window._agAgente || {};
    const aperti = list.filter(l => !['pagante','perso'].includes(l.stato || ''))
      .map(l => ({ ...l, guadagno_contratto: agGuadagnoAContratto(l, agente), ricorrente_annuo: agRicorrenteAnnualeLead(l, agente), valore_annuo: agValoreAnnuoLead(l) }))
      .sort((a,b) => b.guadagno_contratto - a.guadagno_contratto);
    const pagantiAttivi = list.filter(l => l.stato === 'pagante');
    const daPagare = pagantiAttivi.filter(l => !l.provvigione_pagata);
    const pagate = list.filter(l => l.provvigione_pagata);
    const totDaPagare = daPagare.reduce((s,l)=>s+agBaseProvvigione(l, agente),0);
    const totPagate = pagate.reduce((s,l)=>s+agBaseProvvigione(l, agente),0);
    const valorePortafoglio = pagantiAttivi.reduce((s,l)=>s+agValoreAnnuoLead(l),0);
    const renditaAnnuale = pagantiAttivi.reduce((s,l)=>s+agRicorrenteAnnualeLead(l, agente),0);
    const bonus = agBonusFatturato(valorePortafoglio);

    el.innerHTML = `
      <div class="ag-card" style="border-left:4px solid #7C3AED;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
          <div>
            <div style="font-size:15px;font-weight:800;color:#374151;">💼 Il mio portafoglio</div>
            <div style="font-size:12px;color:#64748b;margin-top:3px;">Qui vedi solo importi chiari: quanto guadagni a contratto concluso e la rendita annuale sui clienti mantenuti.</div>
          </div>
          <div style="font-size:12px;color:#64748b;background:#f8fafc;border-radius:999px;padding:6px 10px;">Ricorrente: ${AG_RICORRENTE_PERCENT}% del canone annuo</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
          <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#0E5A7A;">${pagantiAttivi.length}</div>
            <div style="font-size:11px;color:#64748b;">Clienti attivi</div>
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#7C3AED;">${agEuro(valorePortafoglio)}</div>
            <div style="font-size:11px;color:#64748b;">Valore portafoglio</div>
          </div>
          <div style="background:#fee2e2;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#DC2626;">${agEuro(totDaPagare)}</div>
            <div style="font-size:11px;color:#64748b;">Da liquidare</div>
          </div>
          <div style="background:#d1fae5;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#059669;">${agEuro(totPagate)}</div>
            <div style="font-size:11px;color:#64748b;">Già liquidato</div>
          </div>
          <div style="background:#ecfdf5;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#059669;">${agEuro(renditaAnnuale)}</div>
            <div style="font-size:11px;color:#64748b;">Rendita annuale</div>
          </div>
          <div style="background:#fef3c7;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#d97706;">${agEuro(bonus)}</div>
            <div style="font-size:11px;color:#64748b;">Bonus fatturato</div>
          </div>
        </div>
      </div>

      <div class="ag-card">
        <div style="font-size:14px;font-weight:800;color:#374151;margin-bottom:10px;">💰 Quanto guadagni per ogni contratto concluso</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px;">Importo pagato dopo il primo incasso del cliente. La rendita annuale matura dal rinnovo/mantenimento del cliente, se resta attivo e in regola.</div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px;text-align:left;color:#64748b;">Piano</th>
                <th style="padding:8px;text-align:right;color:#64748b;">Valore anno</th>
                <th style="padding:8px;text-align:right;color:#64748b;">Guadagno subito</th>
                <th style="padding:8px;text-align:right;color:#64748b;">Ogni anno</th>
              </tr>
            </thead>
            <tbody>
              ${agPianoRowsGuadagni(agente).map(r => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:9px;font-weight:700;color:#374151;">${r.label}</td>
                  <td style="padding:9px;text-align:right;color:#64748b;">${agEuro(r.valore)}</td>
                  <td style="padding:9px;text-align:right;font-weight:800;color:#7C3AED;">${agEuro(r.subito)}</td>
                  <td style="padding:9px;text-align:right;font-weight:800;color:#059669;">${agEuro(r.ricorrente)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="ag-card" style="border-left:4px solid #d97706;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap;">
          <div>
            <div style="font-size:12px;font-weight:800;color:#374151;">Contratti in lavorazione</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">Non è una previsione: è quanto prenderesti se questi contratti venissero conclusi.</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#d97706;">${agEuro(aperti.reduce((s,l)=>s+l.guadagno_contratto,0))}</div>
        </div>
        ${aperti.length ? aperti.map(l => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f1f5f9;gap:8px;flex-wrap:wrap;">
            <div>
              <div style="font-size:13px;font-weight:700;color:#111827;">${escAg(l.nome_locale)}</div>
              <div style="font-size:11px;color:#64748b;">${l.piano || 'Piano non indicato'} · ${l.stato || 'segnalato'} · valore ${agEuro(l.valore_annuo)}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px;font-weight:800;color:#7C3AED;">${agEuro(l.guadagno_contratto)}</div>
              <div style="font-size:10px;color:#059669;">+ ${agEuro(l.ricorrente_annuo)}/anno se resta cliente</div>
            </div>
          </div>`).join('') : '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;">Nessun contratto in lavorazione.</div>'}
      </div>

      <div class="ag-card">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;">Storico clienti chiusi</div>
        ${[...daPagare,...pagate].length ? [...daPagare,...pagate].map(l => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-bottom:1px solid #f1f5f9;">
            <div>
              <span style="font-size:13px;font-weight:600;">${escAg(l.nome_locale)}</span>
              <span style="font-size:11px;color:#94a3b8;margin-left:6px;">${l.piano||''}</span>
            </div>
            <span style="font-size:13px;font-weight:700;color:${l.provvigione_pagata?'#059669':'#DC2626'};">${agEuro(agBaseProvvigione(l, agente))} ${l.provvigione_pagata?'✓':'⏳'}</span>
          </div>`).join('') : '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;">Nessun cliente chiuso ancora</div>'}
      </div>`;
  }


function renderAgMansionario(el) {
    const tipoLabel = window._agAgente.tipo === 'segnalatore' ? 'Segnalatore' : window._agAgente.tipo === 'area_manager' ? 'Area Manager' : 'Agente';
    el.innerHTML = `
      <div class="ag-card" style="background:linear-gradient(135deg,#7C3AED,#9333ea);color:white;">
        <div style="font-size:15px;font-weight:800;margin-bottom:4px;">📖 Il tuo mansionario — ${tipoLabel}</div>
        <div style="font-size:12px;opacity:.85;">Consulta questa guida prima di ogni visita</div>
      </div>

      <div class="ag-card">
        <div style="font-size:13px;font-weight:800;color:#DC2626;margin-bottom:10px;">🎯 I 3 problemi universali</div>
        <div style="font-size:12.5px;color:#374151;line-height:1.7;">
          💰 <strong>I conti che non tornano</strong> — lavora 16 ore, locale pieno, ma a fine mese non sa dove sono finiti i soldi<br>
          😞 <strong>I dipendenti svogliati</strong> — investe tempo a formarli, poi se ne vanno o fanno il minimo<br>
          👥 <strong>I clienti non qualificati</strong> — il locale si riempie ma di chi spende poco e non torna
        </div>
      </div>

      <div class="ag-card">
        <div style="font-size:13px;font-weight:800;color:#7C3AED;margin-bottom:10px;">🔢 Le 5 fasi del processo</div>
        <div style="font-size:12.5px;color:#374151;line-height:2;">
          <strong>1. Approccio (30 sec)</strong> — "Sono [nome], ho un locale, non vendo niente, condivido una cosa che mi ha cambiato la gestione"<br>
          <strong>2. Qualifica (2 min)</strong> — Coperti? Pranzo o solo cena? Personale fisso o stagionale?<br>
          <strong>3. Il problema (3 min)</strong> — "A fine mese i numeri ti tornano?" → silenzio, ascolta<br>
          <strong>4. Demo (10 min)</strong> — Mostra UNA cosa sola che risolve il SUO problema<br>
          <strong>5. Chiusura (5 min)</strong> — "Risolve un problema che hai?" → 30 giorni gratis
        </div>
      </div>

      <div class="ag-card">
        <div style="font-size:13px;font-weight:800;color:#d97706;margin-bottom:10px;">🌡️ Pitch per temperatura</div>
        <div style="font-size:12.5px;color:#374151;line-height:1.8;">
          🟡 <strong>Tiepido</strong> — parti dal dolore dei conti, mostra il bilancio live<br>
          🔵 <strong>Freddo</strong> — parti dal risultato, mostra il briefing Tony AI<br>
          ❄️ <strong>Glaciale</strong> — parla di tempo recuperato, non di software
        </div>
      </div>

      <div class="ag-card">
        <div style="font-size:13px;font-weight:800;color:#059669;margin-bottom:10px;">🛡️ Obiezioni rapide</div>
        <div style="font-size:12.5px;color:#374151;line-height:1.9;">
          "Costa troppo" → <em>Quanto ti costa non sapere dove vanno i soldi?</em><br>
          "Ho già un gestionale" → <em>Che cosa ti manca di quello che hai?</em><br>
          "Ci penso" → <em>Cosa ti frena? Voglio capire se posso aiutarti</em><br>
          "Cucino bene" → <em>Si vede. Ma riesci a staccare un giorno a settimana?</em><br>
          "Sono piccolo" → <em>Ho iniziato con 40 coperti, il problema è uguale</em>
        </div>
      </div>

      <div class="ag-card">
        <div style="font-size:13px;font-weight:800;color:#0E5A7A;margin-bottom:10px;">💬 Follow-up</div>
        <div style="font-size:12.5px;color:#374151;line-height:1.9;">
          <strong>Giorno 1:</strong> WA con video demo<br>
          <strong>Giorno 4:</strong> "Hai visto il video?"<br>
          <strong>Giorno 10:</strong> Caso concreto di un altro cliente<br>
          <strong>Giorno 21:</strong> Rientri come cliente, non come venditore
        </div>
      </div>`;
  }

  function renderAgMateriali(el) {
    el.innerHTML = `
      <div class="ag-card">
        <div style="font-size:13px;font-weight:800;color:#374151;margin-bottom:12px;">📦 Materiali da condividere</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <a href="https://ristoflow-ai.com" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8fafc;border-radius:8px;text-decoration:none;color:#374151;">
            <span style="font-size:20px;">🌐</span>
            <div><div style="font-size:13px;font-weight:700;">Sito Ristoflow</div><div style="font-size:11px;color:#94a3b8;">ristoflow-ai.com</div></div>
          </a>
          <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8fafc;border-radius:8px;">
            <span style="font-size:20px;">📱</span>
            <div><div style="font-size:13px;font-weight:700;">Numero WhatsApp Ristoflow</div><div style="font-size:11px;color:#94a3b8;">Chiedi il link al tuo responsabile</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8fafc;border-radius:8px;">
            <span style="font-size:20px;">🎥</span>
            <div><div style="font-size:13px;font-weight:700;">Video demo 2 minuti</div><div style="font-size:11px;color:#94a3b8;">In arrivo</div></div>
          </div>
        </div>
      </div>

      <div class="ag-card">
        <div style="font-size:13px;font-weight:800;color:#374151;margin-bottom:10px;">💬 Messaggio WA post-visita</div>
        <div style="background:#f0f9ff;border-radius:8px;padding:12px;font-size:12px;color:#374151;line-height:1.6;white-space:pre-wrap;" id="ag-wa-template">Ciao [Nome], sono [Tuo nome] di Ristoflow 👋

Grazie per i due minuti di oggi.

Ti lascio qualcosa da guardare con calma — il sistema che ti ho mostrato:
👉 [link]

Se vuoi, possiamo vederci di nuovo per 20 minuti e ti mostro tutto sul tuo locale.

A presto 🤝</div>
        <button onclick="agCopiaTemplate()" style="margin-top:8px;background:#0E5A7A;color:white;border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;">📋 Copia testo</button>
      </div>`;
  }

  window.agCopiaTemplate = function() {
    const text = document.getElementById('ag-wa-template')?.textContent || '';
    navigator.clipboard.writeText(text).then(()=>alert('✅ Copiato!'));
  };

  // ── APPUNTAMENTI ──
  window.agApriModaleApp = function(id) {
    window._agEditAppId = id || null;
    const app = id ? window._agAppList.find(a=>a.id===id) : null;
    const modal = document.getElementById('ag-app-modal');
    const body = document.getElementById('ag-app-body');
    document.getElementById('ag-app-title').textContent = app ? 'Modifica appuntamento' : 'Nuovo appuntamento';
    const v = (f,d='') => app?.[f] ?? d;

    body.innerHTML = `
      <div style="display:grid;gap:10px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TITOLO *</label>
          <input id="aga-titolo" value="${escAg(v('titolo'))}" placeholder="Es. Visita Trattoria Da Mario" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOME LOCALE</label>
          <input id="aga-locale" value="${escAg(v('nome_locale'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">DATA *</label>
            <input id="aga-data" type="date" value="${v('data', new Date().toISOString().split('T')[0])}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">ORA</label>
            <input id="aga-ora" type="time" value="${v('ora')}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TIPO</label>
            <select id="aga-tipo" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
              ${['visita','follow_up','demo','chiamata'].map(t=>`<option ${v('tipo')===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TELEFONO</label>
            <input id="aga-tel" value="${escAg(v('telefono'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">INDIRIZZO</label>
          <input id="aga-indirizzo" value="${escAg(v('indirizzo'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOTE</label>
          <textarea id="aga-note" rows="2" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;">${escAg(v('note'))}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        ${app ? `<button onclick="agEliminaApp('${app.id}')" style="background:#fee2e2;color:#DC2626;border:none;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer;margin-right:auto;">🗑 Elimina</button>` : ''}
        <button onclick="agChiudiModaleApp()" style="background:#f1f5f9;border:none;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer;">Annulla</button>
        <button onclick="agSalvaApp()" style="background:#7C3AED;color:white;border:none;border-radius:8px;padding:9px 18px;font-size:12px;font-weight:700;cursor:pointer;">💾 Salva</button>
      </div>`;
    modal.style.display = 'flex';
  };

  window.agChiudiModaleApp = function() {
    document.getElementById('ag-app-modal').style.display = 'none';
    window._agEditAppId = null;
  };

  window.agSalvaApp = async function() {
    const payload = {
      agente_id: window._agAgente.id,
      titolo: document.getElementById('aga-titolo')?.value?.trim(),
      nome_locale: document.getElementById('aga-locale')?.value?.trim() || null,
      data: document.getElementById('aga-data')?.value,
      ora: document.getElementById('aga-ora')?.value || null,
      tipo: document.getElementById('aga-tipo')?.value,
      telefono: document.getElementById('aga-tel')?.value?.trim() || null,
      indirizzo: document.getElementById('aga-indirizzo')?.value?.trim() || null,
      note: document.getElementById('aga-note')?.value?.trim() || null,
    };
    if (!payload.titolo || !payload.data) { alert('Inserisci almeno titolo e data'); return; }

    if (window._agEditAppId) await window._agSupa.from('agenti_appuntamenti').update(payload).eq('id', window._agEditAppId);
    else await window._agSupa.from('agenti_appuntamenti').insert(payload);

    agChiudiModaleApp();
    location.reload();
  };

  window.agEliminaApp = async function(id) {
    if (!confirm('Eliminare questo appuntamento?')) return;
    await window._agSupa.from('agenti_appuntamenti').delete().eq('id', id);
    agChiudiModaleApp();
    location.reload();
  };

  window.agSegnaAppFatto = async function(id) {
    await window._agSupa.from('agenti_appuntamenti').update({ stato: 'fatto' }).eq('id', id);
    location.reload();
  };

  // ── QUICK LEAD ──
  window.agApriModaleLead = function() {
    const modal = document.getElementById('ag-lead-modal');
    const body = document.getElementById('ag-lead-body');
    body.innerHTML = `
      <div style="display:grid;gap:10px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOME LOCALE *</label>
          <input id="agl-nome" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">PIANO INTERESSE</label>
            <select id="agl-piano" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
              <option value="">—</option>
              ${['starter','business','pro','hotel','full'].map(p=>`<option>${p}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">STATO</label>
            <select id="agl-stato" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
              ${['segnalato','visitato','trial','pagante','perso'].map(s=>`<option>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOTE VISITA</label>
          <textarea id="agl-note" rows="3" placeholder="Temperatura cliente, problema emerso, prossimo step..." style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button onclick="agChiudiModaleLead()" style="background:#f1f5f9;border:none;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer;">Annulla</button>
        <button onclick="agSalvaQuickLead()" style="background:#059669;color:white;border:none;border-radius:8px;padding:9px 18px;font-size:12px;font-weight:700;cursor:pointer;">💾 Registra</button>
      </div>`;
    modal.style.display = 'flex';
  };

  window.agChiudiModaleLead = function() {
    document.getElementById('ag-lead-modal').style.display = 'none';
  };

  window.agSalvaQuickLead = async function() {
    const nome = document.getElementById('agl-nome')?.value?.trim();
    if (!nome) { alert('Inserisci il nome del locale'); return; }
    await window._agSupa.from('agenti_lead').insert({
      agente_id: window._agAgente.id,
      nome_locale: nome,
      piano: document.getElementById('agl-piano')?.value || null,
      stato: document.getElementById('agl-stato')?.value || 'segnalato',
      note: document.getElementById('agl-note')?.value?.trim() || null,
    });
    agChiudiModaleLead();
    location.reload();
  };

  function escAg(v) {
    return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Render iniziale
  renderAgAgenda(document.getElementById('ag-content'));
}
